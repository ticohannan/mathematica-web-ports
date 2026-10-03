#!/usr/bin/env node
// tools/publish-tested.mjs — push to GitHub ONLY if all automated tests pass.
//
//   npm run publish:tested            (unit + golden + Firefox browser tests, then tag + push)
//   npm run publish:tested -- --dry   (run every check, do not tag or push)
//
// Steps: refuse if private files are tracked or there are uncommitted changes;
// run `npm test`; run Playwright (Firefox); create an annotated tag
// "tested-YYYYMMDD-HHMM" on the current commit; push the branch and the tag.
import { spawnSync } from 'node:child_process';

const dry = process.argv.includes('--dry');
const run = (cmd, opts = {}) => {
  const r = spawnSync(cmd, { shell: true, stdio: opts.capture ? 'pipe' : 'inherit', encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '').trim() };
};
const fail = (msg) => { console.error(`\n✘ ${msg}\nNothing was published.`); process.exit(1); };
const step = (msg) => console.log(`\n== ${msg} ==`);

step('Private files must not be tracked');
const tracked = run('git ls-files _internal', { capture: true }).out;
if (tracked) fail(`these private files are tracked by git:\n${tracked}\nRun: git rm -r --cached _internal`);

step('Working tree must be clean (commit first)');
if (run('git status --porcelain', { capture: true }).out) fail('there are uncommitted changes (see `git status`).');

step('Unit + golden parity tests');
if (!run('npm test').ok) fail('unit/golden tests failed.');

step('Browser tests (Firefox)');
if (!run('npx playwright test --project=firefox').ok) fail('browser tests failed.');

const branch = run('git rev-parse --abbrev-ref HEAD', { capture: true }).out;
const d = new Date();
const pad = (n) => String(n).padStart(2, '0');
const tag = `tested-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
if (dry) { console.log(`\n✔ All checks passed. (dry run: would tag ${tag} and push ${branch})`); process.exit(0); }

step(`Tag ${tag} and push ${branch}`);
if (!run(`git tag -a ${tag} -m "All automated tests passed (unit, golden, Firefox e2e)"`).ok) fail('could not create tag.');
if (!run(`git push origin ${branch}`).ok) fail('git push failed (tag was created locally).');
if (!run(`git push origin ${tag}`).ok) fail('pushing the tag failed.');
console.log(`\n✔ Published ${branch} (tag ${tag}). GitHub Pages updates within a minute or two.`);
