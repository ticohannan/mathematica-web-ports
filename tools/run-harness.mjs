#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/run-harness.mjs — run the Mathematica harness (tools/wolfram/manipulate-harness.wls) on original notebooks.
//
//   npm run harness -- <dir>|--all [options]          (same as: node tools/run-harness.mjs ...)
//
// Modes
//   (default)        run the app's scenarios (tests/harness/<dir>.scenarios.json) -> test-output/harness/<dir>.harness.json
//   --smoke          structure report + Initialization + one initial-settings evaluation per notebook (first run)
//   --self-check     + one evaluation of the live state and of every snapshot; lists what changed (HW-73, HW-74)
//   --parity         motion planning only: harness vs tools/wolfram/mp-original.wls on the five saved states (HW-72)
//   --accept         copy test-output/harness/<dir>.harness.json to tests/golden/ (needs a passed self-check, HW-64)
//   --diff[=FILE]    compare test-output/harness/<dir>.harness.json with FILE (default tests/golden/<dir>.harness.json)
// Options
//   --only=H-XX-nn,...  only these scenarios            --nb=PATH          the notebook (one app only)
//   --originals=DIR     extra folder to search for notebooks (default: _internal/originals, _internal/originals/batch-ab)
//   --wolframscript=PATH                                --time-limit=SEC   seconds per Body evaluation (default 60)
//   --app-timeout=MIN   wall-clock limit per app; the kernel is killed and the next app starts
//                       (default: smoke 15, self-check 30, scenarios: #scenarios x time limit + 10 min)
//   --init-time-limit=SEC   time limit of the notebook's Initialization (default 600; reported, not a crash)
//   --jobs=N            kernels in parallel (apps, or scenarios with --fresh-kernel; your licence must allow N)
//   --fresh-kernel      one kernel per scenario (HW-71)  --images            PNG of each scenario's final value
//   --out=DIR           output folder (default test-output/harness)
//   --dry-run           write the wire files and print the commands, do not start Mathematica
//   --allow-multiple, --use-copy=n, --front-end         passed to the harness (HW-31, HW-34, HW-50)
//
// Every run writes <dir>.<mode>.log (the harness's console output) next to the results; send the whole
// test-output/harness folder back when something fails.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseLexical, stringifyLexical, LexNumber } from './lib/json-lexical.mjs';
import { validateScenarioFile } from './harness/scenario-schema.mjs';
import { HARNESS_APPS, appByDir } from './harness/apps.mjs';
import { wireFile, wireText, findNotebook, findWolframscript, readResults, checkInputEcho, summarize, diffResults, parityCompare } from './harness/runner-lib.mjs';
import { MP_CAPTURES } from './harness/extract-scenarios.mjs';
import { sceneForWolfram } from './lib/motion-compare.mjs';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WLS = path.join(ROOT, 'tools', 'wolfram', 'manipulate-harness.wls');
const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const a = argv.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  if (a === undefined) return dflt;
  return a.includes('=') ? a.slice(a.indexOf('=') + 1) : true;
};
const KNOWN = /^--(all|smoke|self-check|parity|accept|diff|only|nb|originals|wolframscript|time-limit|app-timeout|init-time-limit|jobs|fresh-kernel|images|out|dry-run|allow-multiple|use-copy|front-end|help)(=|$)/;
const unknown = argv.filter((a) => a.startsWith('--') && !KNOWN.test(a));
const dirsArg = argv.filter((a) => !a.startsWith('--'));
if (opt('help') || unknown.length || (!dirsArg.length && !opt('all'))) {
  if (unknown.length) console.error(`unknown option(s): ${unknown.join(' ')}`);
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(2, 26).map((l) => l.slice(3)).join('\n'));
  process.exit(opt('help') ? 0 : 2);
}
const mode = opt('smoke') ? 'smoke' : opt('self-check') ? 'self-check' : 'run';
console.log(`MODE: ${opt('parity') ? 'parity' : opt('accept') ? 'accept' : opt('diff') ? 'diff' : mode}   (${argv.join(' ')})`);
const outDir = path.resolve(ROOT, opt('out', 'test-output/harness'));
fs.mkdirSync(outDir, { recursive: true });
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const originals = argv.filter((a) => a.startsWith('--originals=')).map((a) => a.slice('--originals='.length));

// ---------------------------------------------------------------- which apps
const scenarioPath = (dir) => path.join(ROOT, 'tests', 'harness', `${dir}.scenarios.json`);
let apps;
if (opt('all')) {
  apps = HARNESS_APPS.filter((a) => (mode === 'run' ? fs.existsSync(scenarioPath(a.dir)) && !a.parity : true)).map((a) => a.dir);
} else apps = dirsArg;
for (const d of apps) if (!appByDir(d)) { console.error(`unknown app "${d}" (known: ${HARNESS_APPS.map((a) => a.dir).join(', ')})`); process.exit(2); }
if (opt('nb') && apps.length !== 1) { console.error('--nb needs exactly one app'); process.exit(2); }

/** The scenario file of an app (or a minimal one for --smoke/--self-check of apps without scenarios). */
function loadScenarioFile(dir) {
  const p = scenarioPath(dir);
  const app = appByDir(dir);
  if (!fs.existsSync(p)) {
    return { schema: 'manipulate-harness/scenarios-1', app: dir, notebook: app.notebook, scenarios: [], structureOnly: true };
  }
  const file = parseLexical(fs.readFileSync(p, 'utf8'));
  const errs = validateScenarioFile(file, { prefix: app.prefix });
  if (errs.length) throw new Error(`${rel(p)} is invalid:\n  ${errs.join('\n  ')}`);
  return file;
}

// ---------------------------------------------------------------- --accept and --diff (no Mathematica needed)
const resultPath = (dir) => path.join(outDir, `${dir}.harness.json`);
const goldenPath = (dir) => path.join(ROOT, 'tests', 'golden', `${dir}.harness.json`);
function readMaybeGz(file) {
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  if (fs.existsSync(`${file}.gz`)) return zlib.gunzipSync(fs.readFileSync(`${file}.gz`)).toString('utf8');
  return null;
}
if (opt('accept') || opt('diff')) {
  let bad = 0;
  for (const dir of apps) {
    const text = readMaybeGz(resultPath(dir));
    if (!text) { console.error(`${dir}: no ${rel(resultPath(dir))} (run the scenarios first)`); bad++; continue; }
    const res = parseLexical(text);
    if (opt('diff')) {
      const other = typeof opt('diff') === 'string' ? opt('diff') : goldenPath(dir);
      const otherText = readMaybeGz(path.resolve(ROOT, other));
      if (!otherText) { console.error(`${dir}: nothing to compare with (${rel(path.resolve(ROOT, other))})`); bad++; continue; }
      const d = diffResults(parseLexical(otherText), res);
      const ids = Object.keys(d);
      console.log(`${dir}: ${ids.length ? `${ids.length} scenario(s) differ` : 'identical (timings ignored)'}`);
      for (const id of ids) for (const l of d[id].slice(0, 10)) console.log(`  ${l}`);
      if (ids.length) bad++;
      continue;
    }
    // --accept: a passed self-check with the same tool, notebook and Mathematica version is required (HW-64)
    const scText = readMaybeGz(path.join(outDir, `${dir}.self-check.json`));
    const sc = scText ? parseLexical(scText) : null;
    const same = sc && !sc.fatal && sc.toolSha256 === res.toolSha256 && sc.notebook?.sha256 === res.notebook?.sha256 &&
      String(sc.versionNumber) === String(res.versionNumber) && sc.numberFormatSelfTest === true;
    if (!same) { console.error(`${dir}: refused — run --self-check with the same harness, notebook and Mathematica version first`); bad++; continue; }
    const file = loadScenarioFile(dir);
    const echo = checkInputEcho(file, res);
    if (echo.length) { console.error(`${dir}: refused — input echo differs:\n  ${echo.slice(0, 10).join('\n  ')}`); bad++; continue; }
    const target = goldenPath(dir);
    if (Buffer.byteLength(text) > 10 * 1024 * 1024) {
      fs.writeFileSync(`${target}.gz`, zlib.gzipSync(text, { level: 9 }));
      if (fs.existsSync(target)) fs.rmSync(target);
      console.log(`${dir}: accepted -> ${rel(target)}.gz`);
    } else {
      fs.writeFileSync(target, text);
      if (fs.existsSync(`${target}.gz`)) fs.rmSync(`${target}.gz`);
      console.log(`${dir}: accepted -> ${rel(target)}`);
    }
  }
  process.exit(bad ? 1 : 0);
}

// ---------------------------------------------------------------- run Mathematica
const wsExplicit = opt('wolframscript', null);
let ws = null;
if (!opt('dry-run')) {
  ws = findWolframscript(typeof wsExplicit === 'string' ? wsExplicit : null);
  if (!ws) {
    console.error('Could not start wolframscript. Find it with  where wolframscript  (Command Prompt) or\n' +
      'Get-Command wolframscript  (PowerShell), then pass it, for example\n' +
      '  npm run harness -- --all --smoke --wolframscript="C:\\Program Files\\Wolfram Research\\WolframScript\\wolframscript.exe"');
    process.exit(2);
  }
  console.log(`wolframscript: ${ws.path}${ws.version ? ` (${ws.version})` : ''}`);
}

function harnessArgs(nb, wire, out, extra) {
  const a = ['-file', WLS, nb, wire, out];
  if (mode === 'smoke') a.push('--smoke');
  if (mode === 'self-check') a.push('--self-check');
  for (const k of ['allow-multiple', 'front-end']) if (opt(k)) a.push(`--${k}`);
  if (typeof opt('use-copy') === 'string') a.push(`--use-copy=${opt('use-copy')}`);
  return [...a, ...extra];
}
/** Spawn without a shell (cmd.exe would eat ^ and quotes); stream lines with a prefix; keep a log. */
/** Kill a process and its children (wolframscript starts a WolframKernel). */
function killTree(child) {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
    else process.kill(-child.pid, 'SIGKILL');
  } catch { try { child.kill('SIGKILL'); } catch { /* already gone */ } }
}
/** Run with a wall-clock limit (ms, 0 = none). Resolves {code, error, tail, timedOut, reachedRead, modeEcho}. */
function runProcess(cmd, args, label, logFile, timeoutMs = 0) {
  return new Promise((resolve) => {
    const log = fs.createWriteStream(logFile);
    log.write(`$ ${cmd} ${args.map((x) => (/\s/.test(x) ? `"${x}"` : x)).join(' ')}\n`);
    const child = spawn(cmd, args, { windowsHide: true, detached: process.platform !== 'win32' });
    const tail = [];
    const seen = { reachedRead: false, modeEcho: null };
    let timedOut = false;
    const timer = timeoutMs > 0 ? setTimeout(() => {
      timedOut = true;
      const msg = `${label}TIMEOUT: no result after ${(timeoutMs / 60000).toFixed(1)} min — killing the kernel and going on`;
      console.log(msg); log.write(`${msg}\n`);
      killTree(child);
    }, timeoutMs) : null;
    const note = (l) => {
      if (/^\[harness\] read notebook/.test(l)) seen.reachedRead = true;
      const m = /^HARNESS-MODE: (\S+)/.exec(l);
      if (m && !seen.modeEcho) seen.modeEcho = m[1];
    };
    const relay = (stream, dest) => {
      let buf = '';
      stream.on('data', (d) => {
        buf += d.toString();
        const lines = buf.split(/\r?\n/); buf = lines.pop();
        for (const l of lines) { note(l); dest.write(`${label}${l}\n`); log.write(`${l}\n`); tail.push(l); if (tail.length > 40) tail.shift(); }
      });
      stream.on('end', () => { if (buf) { dest.write(`${label}${buf}\n`); log.write(`${buf}\n`); tail.push(buf); } });
    };
    relay(child.stdout, process.stdout); relay(child.stderr, process.stderr);
    child.on('error', (e) => { if (timer) clearTimeout(timer); log.end(); resolve({ error: e, tail, timedOut, ...seen }); });
    child.on('close', (code) => { if (timer) clearTimeout(timer); log.end(); resolve({ code, tail, timedOut, ...seen }); });
  });
}
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

// HW-73: changes the survey expects when a start state is evaluated once; any other change is a finding
const HW73_EXPECTED = {
  rrt: { initial: 'treeTypeOld = 0 differs from treeType: the tree is reset' },
  'minkowski-sum': { initial: 'pts clamped; dl, rl, ol set' },
  'two-link-kinematics': { initial: 'pVelp differs from pVel: the inverse-velocity branch runs' },
  'prm-3d': { '*': 'freeConfigSpacea/b rebuilt as RegionPlot3D[False, …] when showConfigObs is False' },
};
const jobs = Math.max(1, Number(opt('jobs', 1)) || 1);
const only = typeof opt('only') === 'string' ? opt('only').split(',').filter(Boolean) : null;
const timeLimit = opt('time-limit') ? Number(opt('time-limit')) : null;
const initTimeLimit = opt('init-time-limit') ? Number(opt('init-time-limit')) : null;
/** Wall-clock limit for one kernel run in ms (HW-63 robustness): smoke 15 min, self-check 30, scenarios n x limit + 10. */
function appTimeoutMs(file, ids) {
  if (opt('app-timeout')) return Number(opt('app-timeout')) * 60000;
  if (mode === 'smoke') return 15 * 60000;
  if (mode === 'self-check') return 30 * 60000;
  const tl = timeLimit ?? (file.timeLimit ? Number(file.timeLimit.value ?? file.timeLimit) : 60);
  return ((ids?.length ?? file.scenarios.length) * tl + 600) * 1000;
}
const summaries = [];

async function runApp(dir) {
  const app = appByDir(dir);
  const sum = { app: dir, mode };
  let file;
  try { file = loadScenarioFile(dir); } catch (e) { console.error(e.message); return { ...sum, status: 'invalid-scenarios' }; }
  if (mode === 'run' && file.structureOnly) return { ...sum, status: 'no-scenarios' };
  const nb = findNotebook(file.notebook, { root: ROOT, nb: typeof opt('nb') === 'string' ? opt('nb') : null, originals });
  if (!nb) {
    console.log(`${dir}: notebook ${file.notebook} not found in _internal/originals (or --originals=DIR) — skipped`);
    return { ...sum, status: 'notebook-missing', notebook: file.notebook };
  }
  const nbSha = sha256(nb);
  if (app.sha256 && nbSha !== app.sha256) console.log(`${dir}: WARNING the notebook's SHA-256 differs from the one the scenarios were written for`);
  const tag = mode === 'run' ? 'harness' : mode;
  const ids = only ?? (mode === 'run' ? file.scenarios.map((s) => s.id) : null);
  const groups = mode === 'run' && opt('fresh-kernel') ? ids.map((id) => [id]) : [ids];
  const results = await pool(groups, opt('fresh-kernel') ? jobs : 1, async (g, gi) => {
    const suffix = groups.length > 1 ? `.k${gi + 1}` : '';
    const wire = path.join(outDir, `${dir}${suffix}.wire.json`);
    const out = path.join(outDir, `${dir}${suffix}.${tag}.json`);
    const partial = path.join(outDir, `${dir}${suffix}.${tag}.partial.jsonl`);
    for (const f of [out, partial]) if (fs.existsSync(f)) fs.rmSync(f);
    fs.writeFileSync(wire, wireText(wireFile(file, { only: g, timeLimit, initTimeLimit })));
    const extra = [`--partial=${partial}`];
    if (g && mode === 'run' && only) extra.push(`--only=${g.join(',')}`);
    if (opt('images')) extra.push(`--images=${path.join(outDir, 'images', dir)}`);
    const args = harnessArgs(nb, wire, out, extra);
    if (opt('dry-run')) { console.log(`[dry-run] wolframscript ${args.join(' ')}`); return null; }
    const t0 = Date.now();
    const r = await runProcess(ws.path, args, apps.length > 1 || groups.length > 1 ? `[${dir}${suffix}] ` : '', path.join(outDir, `${dir}${suffix}.${tag}.log`),
      appTimeoutMs(file, g ?? null));
    return { r, out, partial, seconds: (Date.now() - t0) / 1000 };
  });
  if (opt('dry-run')) return { ...sum, status: 'dry-run' };
  // merge
  const recs = [];
  let head = null;
  let exitProblem = null;
  sum.reachedRead = results.some((x) => x.r.reachedRead);
  for (const x of results) {
    if (x.r.error) exitProblem = `could not start wolframscript: ${x.r.error.message}`;
    else if (x.r.timedOut) { exitProblem = 'killed after the wall-clock limit (--app-timeout)'; sum.timedOut = true; }
    else if (x.r.code !== 0) exitProblem = `wolframscript exited with status ${x.r.code}`;
    // the harness prints the mode it runs in first: a swallowed option must not go unnoticed
    if (x.r.modeEcho && x.r.modeEcho !== mode) sum.modeMismatch = `the harness ran in mode "${x.r.modeEcho}", not "${mode}"`;
    if (!x.r.modeEcho && !x.r.error) sum.modeMismatch = sum.modeMismatch ?? 'the harness never printed its mode (HARNESS-MODE line missing)';
    const got = readResults(x.out, x.partial);
    if (!got) continue;
    head = head ?? got.results;
    recs.push(...(got.results.scenarios ?? []));
    if (got.from === 'partial') sum.assembledFromPartial = true;
  }
  if (sum.modeMismatch) console.log(`${dir}: MODE MISMATCH — ${sum.modeMismatch}`);
  if (!head) {
    console.log(`${dir}: no output at all${exitProblem ? ` (${exitProblem})` : ''}. Last console lines:`);
    for (const l of results.flatMap((x) => x.r.tail).slice(-25)) console.log(`   | ${l}`);
    return { ...sum, status: sum.timedOut ? 'timed-out' : 'no-output', problem: exitProblem };
  }
  const merged = { ...head, scenarios: recs };
  const finalOut = path.join(outDir, `${dir}.${tag}.json`);
  if (groups.length > 1 || sum.assembledFromPartial) fs.writeFileSync(finalOut, stringifyLexical(merged, { ascii: true }));
  sum.fatal = head.fatal ?? null;
  sum.phase = head.phase;
  sum.wolframVersion = head.wolframVersion;
  sum.preliminaryOnly = head.preliminary === true;
  sum.selfTestFailures = Object.entries(head.internalSelfTest ?? {}).filter(([, v]) => v !== true).map(([k]) => k);
  sum.numberFormatSelfTest = head.numberFormatSelfTest;
  sum.exitProblem = exitProblem;
  const st = head.structure ?? {};
  sum.structure = { variables: (st.variables ?? []).length, scopes: (st.scopes ?? []).length, snapshots: (st.snapshots ?? []).length,
    buttons: st.buttons ?? [], copies: st.copies, initMessages: (st.initializationMessages ?? []).map((m) => m.name),
    undefinedHeads: st.bodyHeadsUndefined ?? [], initializationProblem: st.initializationProblem ?? null,
    definitionProblems: st.definitions?.problems ?? [] };
  if (mode !== 'run') {
    sum.evaluations = (head.evaluations ?? []).map((e) => ({ state: e.state, status: e.status, head: e.head, seconds: e.seconds instanceof LexNumber ? e.seconds.value : e.seconds,
      changed: e.changed ?? [], messages: (e.messages ?? []).map((m) => m.name), note: e.note }));
    sum.leads = head.leads ?? null;
  } else {
    sum.summary = summarize(file, merged, { expectedIds: ids });
    sum.echoProblems = checkInputEcho(file, merged);
    sum.status = sum.fatal ? 'fatal' : sum.timedOut ? 'timed-out' : exitProblem ? 'exit-error' : sum.echoProblems.length ? 'echo-mismatch'
      : sum.summary.missing.length ? 'incomplete' : 'done';
  }
  sum.status = sum.status ?? (sum.fatal ? 'fatal' : sum.timedOut ? 'timed-out' : exitProblem ? 'exit-error' : 'done');
  if (sum.modeMismatch) sum.status = 'mode-mismatch';
  return sum;
}

// ---------------------------------------------------------------- HW-72 parity (motion planning)
async function runParity() {
  const dir = 'motion-planning';
  const file = loadScenarioFile(dir);
  const nb = findNotebook(file.notebook, { root: ROOT, nb: typeof opt('nb') === 'string' ? opt('nb') : null, originals });
  if (!nb) { console.error(`notebook ${file.notebook} not found`); process.exit(2); }
  const golden = parseLexical(fs.readFileSync(path.join(ROOT, 'tests/golden/motion-planning.original-states.json'), 'utf8')).states;
  const plain = (v) => (v instanceof LexNumber ? v.value : Array.isArray(v) ? v.map(plain) : v);
  const scenes = golden.map((s, i) => sceneForWolfram({ id: `golden-${i}`, x: Math.round(plain(s.x)), n: Math.round(plain(s.n)),
    r1: plain(s.r1), r2: plain(s.r2), o1: plain(s.o1), o2: plain(s.o2), o3: plain(s.o3), o4: plain(s.o4) }));
  const mpIn = path.join(outDir, 'motion-planning.parity-scenes.json');
  const mpOut = path.join(outDir, 'motion-planning.parity-mp-original.json');
  fs.writeFileSync(mpIn, JSON.stringify({ timeLimit: 120, scenes }, null, 1));
  if (opt('dry-run')) { console.log('[dry-run] parity: mp-original.wls and the harness'); return 0; }
  const r1 = await runProcess(ws.path, ['-file', path.join(ROOT, 'tools/wolfram/mp-original.wls'), nb, mpIn, mpOut], '[mp-original] ', path.join(outDir, 'motion-planning.parity-mp-original.log'), 20 * 60000);
  const wire = path.join(outDir, 'motion-planning.wire.json');
  const out = path.join(outDir, 'motion-planning.harness.json');
  fs.writeFileSync(wire, wireText(wireFile(file, { timeLimit: 120 })));
  const extra = [`--partial=${path.join(outDir, 'motion-planning.harness.partial.jsonl')}`];
  if (!opt('use-copy')) extra.push('--allow-multiple');
  const r2 = await runProcess(ws.path, harnessArgs(nb, wire, out, extra), '[harness] ', path.join(outDir, 'motion-planning.harness.log'), appTimeoutMs(file, null));
  if (r1.code !== 0 || r2.code !== 0 || !fs.existsSync(mpOut) || !fs.existsSync(out)) { console.error('parity: one of the two runs failed (see the logs)'); return 1; }
  const mp = parseLexical(fs.readFileSync(mpOut, 'utf8'));
  const hw = parseLexical(fs.readFileSync(out, 'utf8'));
  const rows = parityCompare(mp.scenes, hw.scenarios, MP_CAPTURES);
  fs.writeFileSync(path.join(outDir, 'motion-planning.parity.json'), JSON.stringify(rows, null, 1));
  console.log('\nHW-72 parity (harness vs mp-original.wls, 18 values per saved state):');
  for (const r of rows) console.log(`  ${r.id} (${r.mp}): ${r.ok ? 'identical' : `DIFFERENT: ${Object.entries(r.fields).filter(([, v]) => v !== 'identical').map(([k]) => k).join(', ')}`} [status ${r.status}]`);
  return rows.every((r) => r.ok) ? 0 : 1;
}

// ---------------------------------------------------------------- main
if (opt('parity')) {
  const code = await runParity();
  process.exit(code);
}
const t0 = Date.now();
const runAll = async () => {
  if (jobs > 1 && !opt('fresh-kernel')) return pool(apps, jobs, runApp);
  const out = [];
  for (const d of apps) {
    const s = await runApp(d);
    out.push(s);
    // a failure before the notebook is even read is a problem of the script, not of this notebook: stop early
    const ran = !['notebook-missing', 'no-scenarios', 'dry-run', 'invalid-scenarios'].includes(s.status);
    if (ran && s.reachedRead === false && apps.length > 1) {
      console.log('\nThe harness failed before reading the notebook; not starting the other apps. Send the log in test-output/harness/.');
      break;
    }
  }
  return out;
};
summaries.push(...await runAll());
const seconds = (Date.now() - t0) / 1000;

// ---------------------------------------------------------------- summary
const lines = [];
const P = (s = '') => { lines.push(s); console.log(s); };
P('');
P(`Mathematica harness — ${mode}, ${summaries.length} app(s), ${seconds.toFixed(0)} s`);
for (const s of summaries) {
  if (['notebook-missing', 'no-scenarios', 'dry-run', 'invalid-scenarios'].includes(s.status)) { P(`  ${s.app.padEnd(26)} ${s.status}`); continue; }
  if (s.status === 'no-output' || (s.status === 'timed-out' && !s.structure)) { P(`  ${s.app.padEnd(26)} ${s.status === 'timed-out' ? 'TIMED OUT' : 'NO OUTPUT'} ${s.problem ?? ''}`); continue; }
  const st = s.structure ?? {};
  const head = `  ${s.app.padEnd(26)} ${s.fatal ? `FATAL in "${s.phase}": ${s.fatal}` : 'ok'}`;
  P(head);
  if (s.selfTestFailures?.length) P(`      internal self-test FAILED: ${s.selfTestFailures.join(', ')}`);
  if (s.numberFormatSelfTest === false) P('      number format self-test FAILED (bit-exact data unreliable)');
  if (s.exitProblem) P(`      ${s.exitProblem}`);
  if (s.modeMismatch) P(`      MODE MISMATCH: ${s.modeMismatch}`);
  if (s.preliminaryOnly) P('      only the preliminary result file was written (the kernel stopped after the structure report)');
  if (st.initializationProblem) P(`      INITIALIZATION PROBLEM: ${st.initializationProblem}`);
  if (st.definitionProblems?.length) P(`      DEFINITIONS PROBLEM (every scenario prelude-failed): ${st.definitionProblems.join('; ')}`);
  if (st.variables !== undefined) P(`      variables ${st.variables}, Body scopes ${st.scopes}, snapshots ${st.snapshots}, buttons ${st.buttons?.length ?? 0}, Initialization messages ${st.initMessages?.length ?? 0}${st.initMessages?.length ? ` (${[...new Set(st.initMessages)].join(', ')})` : ''}${st.undefinedHeads?.length ? `, Body heads without definitions: ${st.undefinedHeads.join(', ')}` : ''}`);
  for (const e of s.evaluations ?? []) {
    const exp = HW73_EXPECTED[s.app]?.[e.state] ?? HW73_EXPECTED[s.app]?.['*'];
    if (e.changed.length && mode === 'self-check') e.note = `${e.note ? `${e.note}; ` : ''}${exp ? `expected (HW-73): ${exp}` : 'FINDING: not expected by HW-73/74'}`;
    P(`      ${String(e.state).padEnd(12)} ${String(e.status).padEnd(15)} ${String(e.head ?? '').padEnd(11)} ${e.seconds != null ? `${Number(e.seconds).toFixed(2)} s` : ''}  changed: ${e.changed.length ? e.changed.join(', ') : '—'}${e.messages.length ? `  messages: ${[...new Set(e.messages)].join(', ')}` : ''}${e.note ? `  ${e.note}` : ''}`);
  }
  if (s.summary) {
    const sm = s.summary;
    P(`      scenarios ${sm.total}: ${Object.entries(sm.statuses).map(([k, v]) => `${k} ${v}`).join(', ')}${sm.missing.length ? `; MISSING ${sm.missing.join(', ')}` : ''}`);
    for (const n of sm.notOk.slice(0, 12)) P(`        ${n.id} ${n.status}: ${n.notes.join('; ').slice(0, 300)}`);
    if (sm.slowest.length) P(`      slowest: ${sm.slowest.map((x) => `${x.id} ${x.seconds.toFixed(1)} s`).join(', ')}`);
    if (sm.feTimeoutRisk.length) P(`      evaluations over 5 s (front-end timeout risk): ${sm.feTimeoutRisk.join(', ')}`);
    if (Object.keys(sm.messages).length) P(`      messages: ${Object.entries(sm.messages).map(([k, v]) => `${k} ×${v}`).join(', ')}`);
    if (Object.keys(sm.aliases).length) P(`      aliases used: ${Object.entries(sm.aliases).map(([k, v]) => `${k} → ${v}`).join(', ')}`);
    if (s.echoProblems?.length) P(`      INPUT ECHO MISMATCH (HW-08): ${s.echoProblems.slice(0, 5).join('; ')}`);
  }
}
fs.writeFileSync(path.join(outDir, `summary.${mode}.txt`), `${lines.join('\n')}\n`);
fs.writeFileSync(path.join(outDir, `summary.${mode}.json`), JSON.stringify(summaries, (k, v) => (v instanceof LexNumber ? v.value : v), 1));
P('');
P(`Summary written to ${rel(path.join(outDir, `summary.${mode}.txt`))}. Send the whole ${rel(outDir)} folder (zip) back.`);
const failed = summaries.some((s) => s.fatal || ['no-output', 'exit-error', 'echo-mismatch', 'invalid-scenarios', 'incomplete', 'timed-out', 'mode-mismatch'].includes(s.status));
process.exit(failed ? 1 : 0);
