#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/publish-tested.mjs — push to GitHub ONLY if every test the change can affect passes (selective testing since
// v0.1.39, tools/affected.mjs; before: every test on every release).
//
//   npm run publish:tested                     unit + golden tests (always all), the browser tests the change can affect
//                                              in Firefox, Chromium AND WebKit (all of them when a full run is due), then
//                                              tag + push
//   npm run publish:tested -- --full           every browser test
//   npm run publish:tested -- --retest-failed  after a failed run and a fix in test files only: the unit tests and only
//                                              the browser tests that failed (Playwright --last-failed)
//   npm run publish:tested -- --plan           print the plan and stop
//   npm run publish:tested -- --dry            run every check, do not tag or push
//
// Steps: refuse if private files are tracked or there are uncommitted changes; `npm test`; the plan (against the newest
// tested-* tag reachable from HEAD; a full run when tools/affected.mjs says so or the schedule is due: weekly, every 5th
// release, a new Playwright or Node version); Playwright with one retry (a test that passes on its retry is reported as
// flaky and does not block); an annotated tag "tested-YYYYMMDD-HHMM" whose message records the plan, the counts, the
// flaky tests and the Playwright and Node versions; push the branch and the tag.
// A failed browser run is recorded in test-output/publish-failure.json (its tree, its plan, the failed tests and
// Playwright's .last-run.json) for --retest-failed, which accepts only changes to the failed tests' spec files, unit
// tests and documentation since that run.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { plan as makePlan, describePlan, testedTags, fullRunSchedule, envLine, classify, registry } from './affected.mjs';

const args = process.argv.slice(2);
const has = (k) => args.includes(k);
const dry = has('--dry');
const OUT = 'test-output';
// PUBLISH_PROJECTS (comma-separated) narrows the engines for trying this script where not all three are installed (the
// authoring sandbox); a publish always uses all three
const PROJECTS = (process.env.PUBLISH_PROJECTS || 'firefox,chromium,webkit').split(',').map((x) => `--project=${x}`).join(' ');
const RESULTS = `${OUT}/publish-results.json`, FAILURE = `${OUT}/publish-failure.json`, LAST_RUN = `${OUT}/e2e-artifacts/.last-run.json`;
const run = (cmd, opts = {}) => {
  const r = spawnSync(cmd, { shell: true, stdio: opts.capture ? 'pipe' : 'inherit', encoding: 'utf8', env: { ...process.env, ...opts.env } });
  return { ok: r.status === 0, out: (r.stdout || '').trim() };
};
const git = (...a) => { const r = spawnSync('git', a, { encoding: 'utf8' }); return { ok: r.status === 0, out: (r.stdout || '').trim() }; };
const fail = (msg) => { console.error(`\n✘ ${msg}\nNothing was published.`); process.exit(1); };
const step = (msg) => console.log(`\n== ${msg} ==`);

/** the Playwright JSON report → { expected, unexpected, flaky, skipped, failedFiles, failedTitles, flakyTitles } */
function readResults(file) {
  if (!fs.existsSync(file)) return null;
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = { ...j.stats, failedFiles: new Set(), failedTitles: [], flakyTitles: [] };
  const walk = (suite, trail) => {
    for (const s of suite.suites ?? []) walk(s, [...trail, s.title].filter(Boolean));
    for (const spec of suite.specs ?? []) for (const t of spec.tests ?? []) {
      const title = `[${t.projectName}] ${spec.file} › ${[...trail.slice(1), spec.title].join(' › ')}`;
      if (t.status === 'unexpected') { out.failedFiles.add(path.basename(spec.file)); out.failedTitles.push(title); }
      if (t.status === 'flaky') out.flakyTitles.push(title);
    }
  };
  for (const s of j.suites ?? []) walk(s, [s.title]);
  return out;
}

step('Private files must not be tracked');
const tracked = run('git ls-files _internal', { capture: true }).out;
if (tracked) fail(`these private files are tracked by git:\n${tracked}\nRun: git rm -r --cached _internal`);

step('Working tree must be clean (commit first)');
if (run('git status --porcelain', { capture: true }).out) fail('there are uncommitted changes (see `git status`).');

const env = envLine();
const tags = testedTags();
const tree = git('rev-parse', 'HEAD^{tree}').out;
let mode, p = null, note = '', retestOf = null;

if (has('--retest-failed')) {
  if (!fs.existsSync(FAILURE)) fail(`--retest-failed needs the record of a failed run (${FAILURE}); there is none.`);
  retestOf = JSON.parse(fs.readFileSync(FAILURE, 'utf8'));
  const changed = git('diff', '--name-only', '--no-renames', retestOf.tree, tree).out.split('\n').filter(Boolean);
  const reg = await registry();
  const bad = changed.filter((f) => !(retestOf.failedFiles.includes(path.basename(f)) && f.startsWith('tests/e2e/'))
    && !['D', 'T'].includes(classify(f, reg).cls));
  if (bad.length) fail(`--retest-failed allows only changes to the failed tests' spec files, unit tests and documentation since the failed run; changed:\n  ${bad.join('\n  ')}\nRun npm run publish:tested instead.`);
  if (!retestOf.lastRun?.failedTests?.length) fail('the record of the failed run has no failed tests to rerun.');
  mode = retestOf.mode;
  console.log(`retest of ${retestOf.failedTitles.length} failed test(s) of the ${mode} run at tree ${retestOf.tree.slice(0, 12)}…; changed since: ${changed.join(', ') || 'nothing'}`);
} else {
  p = await makePlan();
  const sched = fullRunSchedule(tags, { env });
  mode = has('--full') ? 'full' : p.full ? 'full' : sched.due ? 'full' : 'selective';
  step('Plan');
  console.log(describePlan(p));
  console.log(has('--full') ? 'FULL run requested (--full)' : sched.due && !p.full ? `FULL run due: ${sched.why}` : `schedule: ${sched.why}`);
  if (has('--plan')) process.exit(0);
}

step('Unit + golden tests (all)');
if (!run('npm test').ok) fail('unit/golden tests failed.');

let results = null;
const selected = mode === 'full' || retestOf || p.grep;
if (!selected) console.log('\nNo browser test can be affected by this change (documentation and unit tests only).');
else {
  step(`Browser tests (Firefox + Chromium + WebKit): ${retestOf ? 'the failed ones' : mode === 'full' ? 'all' : 'selected'}`);
  if (fs.existsSync(RESULTS)) fs.rmSync(RESULTS);
  if (retestOf) { fs.mkdirSync(path.dirname(LAST_RUN), { recursive: true }); fs.writeFileSync(LAST_RUN, JSON.stringify(retestOf.lastRun)); }
  const envs = { PW_RETRIES: '1', PW_JSON: RESULTS, ...(mode === 'selective' && !retestOf ? { PW_GREP: p.grep } : {}) };
  const ok = run(`npx playwright test ${PROJECTS}${retestOf ? ' --last-failed' : ''}`, { env: envs }).ok;
  results = readResults(RESULTS);
  if (!ok || !results || results.unexpected > 0) {
    if (results && !retestOf) {
      const lastRun = fs.existsSync(LAST_RUN) ? JSON.parse(fs.readFileSync(LAST_RUN, 'utf8')) : null;
      fs.writeFileSync(FAILURE, JSON.stringify({ tree, mode, date: new Date().toISOString(), base: p.base, grep: mode === 'selective' ? p.grep : '',
        expected: results.expected, failedFiles: [...results.failedFiles], failedTitles: results.failedTitles, lastRun }, null, 1));
      fail(`browser tests failed (${results.unexpected} failed, ${results.expected} passed).\nIf the fix changes only the failing tests' spec files, after committing it run: npm run publish:tested -- --retest-failed`);
    }
    fail('browser tests failed.');
  }
  if (results.flaky) console.log(`\n⚠ ${results.flaky} flaky test(s) (failed once, passed on the retry):\n  ${results.flakyTitles.join('\n  ')}`);
}

const branch = run('git rev-parse --abbrev-ref HEAD', { capture: true }).out;
const d = new Date();
const pad = (n) => String(n).padStart(2, '0');
const tag = `tested-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
const lines = [];
if (retestOf) {
  lines.push(`All automated tests passed (${mode === 'full' ? 'full, retest' : 'selective, retest'}): the ${mode} run of tree ${retestOf.tree.slice(0, 12)} passed ${retestOf.expected} browser tests and failed ${retestOf.failedTitles.length}; those were fixed in their spec files and passed on a rerun (--retest-failed)`);
  lines.push(...retestOf.failedTitles.map((t) => `retested: ${t}`));
} else if (mode === 'full') lines.push(`All automated tests passed (full): unit and golden; ${results ? results.expected + results.flaky : 0} browser tests in Firefox, Chromium and WebKit`);
else lines.push(`All automated tests passed (selective): unit and golden (all); ${results ? `${results.expected + results.flaky} browser tests` : 'no browser test affected'}`, describePlan(p));
if (results?.flaky) lines.push(...results.flakyTitles.map((t) => `flaky (passed on retry): ${t}`));
lines.push(env);
const message = lines.join('\n');
if (dry) { console.log(`\n✔ All checks passed. (dry run: would tag ${tag} and push ${branch})\n--- tag message ---\n${message}`); process.exit(0); }

step(`Tag ${tag} and push ${branch}`);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/tag-message.txt`, message + '\n');
if (!git('tag', '-a', tag, '-F', `${OUT}/tag-message.txt`).ok) fail('could not create tag.');
if (!run(`git push origin ${branch}`).ok) fail('git push failed (tag was created locally).');
if (!run(`git push origin ${tag}`).ok) fail('pushing the tag failed.');
if (retestOf) fs.rmSync(FAILURE, { force: true });
console.log(`\n✔ Published ${branch} (tag ${tag}, ${mode}${retestOf ? ', retest' : ''}). GitHub Pages updates within a minute or two.`);
