#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/compare-with-original.mjs — automated comparison of the motion-planning port with the
// ORIGINAL Wolfram Demonstration, run headless in a local Mathematica / Wolfram Engine.
//
//   npm run compare:original -- [options]
//
// 1. Builds a scene list: the original's 5 saved states (harness self-check), the named scenes in
//    tools/data/motion-scenes.json, and seeded random scenes.
// 2. Runs tools/wolfram/mp-original.wls with wolframscript: it evaluates the code stored in the
//    original notebook for every scene and writes the original's numbers to JSON.
// 3. Runs the port (planner.js) on the same scenes and compares field by field
//    (validity, C-obstacles, visibility/bitangent lines, path, trajectory), and checks both
//    against the independent reference planner (tests/support/reference-planner.js), so every
//    problem can be labelled "port differs from original" or "original has it too (inherited)".
// 4. Writes test-output/compare-original/report.md (+ report.json, and with --images a
//    side-by-side page of the original's picture and the port's picture).
//
// Options
//   --wolframscript=PATH  wolframscript executable (default: "wolframscript" on PATH)
//   --nb=PATH             original notebook (default: _internal/originals/MotionPlanningForRobotPathAroundObstacles-author.nb)
//   --random=N            number of random scenes (default 40)   --seed=S  random seed (default 1)
//   --history             also run every named/random scene "after a drag" (see report)
//   --scenes=FILE         extra scenes (JSON: {"scenes":[{id,title,x,n,r1,r2,o1..o4}]})
//   --only=ID,ID          run only these scene ids
//   --images              save the original's pictures (needs the Wolfram front end) and port screenshots
//   --browser=firefox|chromium   browser for port screenshots (default firefox)
//   --no-run              do not start Mathematica; reuse <out>/original-results.json
//   --time-limit=SEC      per-scene time limit inside Mathematica (default 60)
//   --base=URL            base of the scene links in the report (default: the live site)
//   --out=DIR             output folder (default test-output/compare-original)

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  clampScene, sceneForWolfram, sceneUrl, randomScenes, withHistory, portRecord, compareScene,
  referenceFor, referenceFlags, goldenSelfCheck, pathLen,
} from './lib/motion-compare.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const a = argv.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  if (!a) return dflt;
  return a.includes('=') ? a.slice(a.indexOf('=') + 1) : true;
};
const unknown = argv.filter((a) => !/^--(wolframscript|nb|random|seed|history|scenes|only|images|browser|no-run|time-limit|base|out|help)(=|$)/.test(a));
if (opt('help') || unknown.length) {
  if (unknown.length) console.error(`unknown option(s): ${unknown.join(' ')}`);
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split("\n").filter((l) => l.startsWith("//")).slice(3, 31).map((l) => l.slice(3)).join('\n'));
  process.exit(unknown.length ? 2 : 0);
}

const outDir = path.resolve(root, opt('out', 'test-output/compare-original'));
const nbFile = path.resolve(root, opt('nb', '_internal/originals/MotionPlanningForRobotPathAroundObstacles-author.nb'));
const wolframscript = opt('wolframscript', 'wolframscript');
const base = String(opt('base', 'https://ticohannan.github.io/mathematica-web-ports')).replace(/\/$/, '');
const wantImages = !!opt('images', false);
const imagesDir = path.join(outDir, 'images');
const resultsFile = path.join(outDir, 'original-results.json');
const scenesFile = path.join(outDir, 'scenes.json');
fs.mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------- 1. scenes
const golden = JSON.parse(fs.readFileSync(path.join(root, 'tests/golden/motion-planning.original-states.json'), 'utf8')).states;
const pickState = (s) => ({ x: Math.round(s.x), n: Math.round(s.n), r1: s.r1, r2: s.r2, o1: s.o1, o2: s.o2, o3: s.o3, o4: s.o4 });
let scenes = golden.map((s, i) => ({ id: `golden-${i}`, title: `original's saved state ${i}`, group: 'golden', ...pickState(s) }));
const named = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/motion-scenes.json'), 'utf8')).scenes;
scenes.push(...named.map((s) => ({ group: 'named', ...s })));
const extraFile = opt('scenes', null);
if (extraFile) scenes.push(...JSON.parse(fs.readFileSync(path.resolve(extraFile), 'utf8')).scenes.map((s) => ({ group: 'extra', title: s.id, ...s })));
const nRandom = Number(opt('random', 40));
scenes.push(...randomScenes(nRandom, Number(opt('seed', 1))).map((s) => ({ group: 'random', ...s })));
if (opt('history', false)) scenes.push(...scenes.filter((s) => s.group !== 'golden').map((s) => ({ ...withHistory(s), group: `${s.group}-history` })));
const only = opt('only', null);
if (only) { const ids = new Set(String(only).split(',')); scenes = scenes.filter((s) => ids.has(s.id)); }
scenes = scenes.map((s) => ({ ...s, ...clampScene(s) }));
const ids = new Set();
for (const s of scenes) { if (ids.has(s.id)) throw new Error(`duplicate scene id ${s.id}`); ids.add(s.id); }

fs.writeFileSync(scenesFile, JSON.stringify({ timeLimit: Number(opt('time-limit', 60)), scenes: scenes.map(sceneForWolfram) }, null, 1));
console.log(`${scenes.length} scenes -> ${path.relative(root, scenesFile)}`);

// ---------------------------------------------------------------- 2. the original, in Mathematica
if (!opt('no-run', false)) {
  if (!fs.existsSync(nbFile)) {
    console.error(`Original notebook not found: ${nbFile}\nPass --nb=PATH to the author notebook (MotionPlanningForRobotPathAroundObstacles-author.nb).`);
    process.exit(2);
  }
  if (wantImages) fs.mkdirSync(imagesDir, { recursive: true });
  const wls = path.join(root, 'tools/wolfram/mp-original.wls');
  const wsArgs = ['-file', wls, nbFile, scenesFile, resultsFile, ...(wantImages ? [imagesDir] : [])];
  console.log(`Running the original in Mathematica: ${wolframscript} -file tools/wolfram/mp-original.wls …`);
  const t0 = Date.now();
  const r = spawnSync(wolframscript, wsArgs, { stdio: 'inherit', windowsHide: true });
  if (r.error) {
    console.error(`Could not start "${wolframscript}": ${r.error.message}\n` +
      'Find it with  where wolframscript  (Command Prompt) or  Get-Command wolframscript  (PowerShell), then pass\n' +
      '  --wolframscript="C:\\Program Files\\Wolfram Research\\WolframScript\\wolframscript.exe"   (example path)');
    process.exit(2);
  }
  if (r.status !== 0) { console.error(`wolframscript exited with status ${r.status}`); process.exit(2); }
  console.log(`Mathematica finished in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
if (!fs.existsSync(resultsFile)) { console.error(`No results file ${resultsFile} (run without --no-run first).`); process.exit(2); }
const original = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
const origById = new Map(original.scenes.map((r) => [r.id, r]));

// ---------------------------------------------------------------- 3. compare
const rows = [];
for (const s of scenes) {
  const orig = origById.get(s.id);
  const port = portRecord(s);
  const cmp = compareScene(orig, port);
  const ref = referenceFor(s);
  const fo = referenceFlags(s, ref, orig?.status === 'ok' ? orig : null);
  const fp = referenceFlags(s, ref, port);
  const issues = [...new Set([...fo, ...fp])].map((f) => ({
    flag: f, where: fo.includes(f) && fp.includes(f) ? 'inherited (original and port)' : fo.includes(f) ? 'original only' : 'port only',
  }));
  const row = {
    id: s.id, title: s.title, group: s.group, verdict: cmp.verdict, notes: cmp.notes, issues,
    fields: Object.fromEntries(Object.entries(cmp.fields).map(([k, v]) => [k, v.status])),
    validity: { original: orig?.robotinsideobstcond, port: port.robotinsideobstcond, ref: [!ref.startOk, !ref.goalOk] },
    length: { original: orig ? pathLen(orig.path) : null, port: pathLen(port.path), ref: Number.isFinite(ref.length) ? ref.length : null },
    seconds: orig?.seconds, messages: orig?.messages ?? [], link: sceneUrl(base, s),
    image: wantImages && fs.existsSync(path.join(imagesDir, `${s.id}.png`)) ? `images/${s.id}.png` : null,
  };
  if (s.group === 'golden') row.selfCheck = goldenSelfCheck(orig, golden[Number(s.id.split('-')[1])]);
  rows.push(row);
}

// ---------------------------------------------------------------- 4. port screenshots (optional)
if (wantImages) await portScreenshots(rows.filter((r) => r.image));

// ---------------------------------------------------------------- 5. report
const count = (pred) => rows.filter(pred).length;
const goldenRows = rows.filter((r) => r.group === 'golden');
const selfOk = goldenRows.length > 0 && goldenRows.every((r) => r.selfCheck.ok);
const fmtLen = (v) => (v == null ? '—' : v.toFixed(4));
const fmtValid = (v) => (Array.isArray(v) ? v.map((b) => (b ? 'invalid' : 'ok')).join('/') : '—');
const md = [];
md.push('# Port vs original — automated comparison (motion planning)', '');
md.push(`Generated ${new Date().toISOString()} by \`tools/compare-with-original.mjs\`.`, '');
md.push(`- Original: \`${path.basename(original.notebook || nbFile)}\`, evaluated in **${original.wolframVersion ?? '?'}**`);
md.push(`- Stored code copies in the notebook: Initialization ${original.initCopies} (distinct ${original.initDistinct}), Body ${original.bodyCopies} (distinct ${original.bodyDistinct})`);
md.push(`- Number transfer self-test: ${original.numberFormatSelfTest === true ? 'passed' : 'FAILED (bit-exact comparison unreliable)'}`);
md.push(`- Scenes: ${rows.length} (${['golden', 'named', 'random', 'extra'].map((g) => `${g} ${count((r) => r.group === g)}`).join(', ')}${count((r) => /history/.test(r.group)) ? `, history ${count((r) => /history/.test(r.group))}` : ''})`);
md.push(`- Port: \`demos/motion-planning/planner.js\` in this working copy. Reference: \`tests/support/reference-planner.js\`.`, '');

md.push('## 1. Harness self-check', '');
md.push('The original notebook contains results that the original code computed when it was saved. If running the stored code in your Mathematica gives the same numbers, the harness (and your Mathematica version) reproduces the original faithfully.', '');
md.push(`**${selfOk ? 'PASS' : 'FAIL'}** — ${count((r) => r.group === 'golden' && r.selfCheck.ok)}/${goldenRows.length} saved states reproduced.`, '');
for (const r of goldenRows) {
  md.push(`- ${r.id}: ${Object.entries(r.selfCheck.fields).map(([k, v]) => `${k} ${v.status}`).join(', ')}`);
}
md.push('');

md.push('## 2. Summary: port vs original', '');
md.push('| verdict | meaning | scenes |', '|---|---|---|');
md.push(`| identical | every compared number bit-identical | ${count((r) => r.verdict === 'identical')} |`);
md.push(`| last-bit | same results; some numbers differ only in the last bits (≤ 1e-12) | ${count((r) => r.verdict === 'last-bit')} |`);
md.push(`| **DIFFERENT** | validity, route, lines or shapes differ | ${count((r) => r.verdict === 'DIFFERENT')} |`);
md.push(`| original-error | the original did not finish (timeout/error) | ${count((r) => r.verdict === 'original-error')} |`, '');
const fieldNames = Object.keys(rows.find((r) => Object.keys(r.fields).length)?.fields ?? {});
if (fieldNames.length) {
  md.push('Fields that differ (DIFFERENT), by scene count:', '');
  md.push(fieldNames.map((f) => `${f} ${count((r) => r.fields[f] === 'DIFFERENT')}`).join(' · '), '');
}

md.push('## 3. Scenes where the port differs from the original', '');
const diffRows = rows.filter((r) => r.verdict === 'DIFFERENT' || r.verdict === 'original-error');
if (!diffRows.length) md.push('None.', '');
for (const r of diffRows) {
  md.push(`### ${r.id} — ${r.title}`, '');
  md.push(`- [open in the port](${r.link})`);
  md.push(`- validity (start/goal): original ${fmtValid(r.validity.original)}, port ${fmtValid(r.validity.port)}, reference ${fmtValid(r.validity.ref)}`);
  md.push(`- path length: original ${fmtLen(r.length.original)}, port ${fmtLen(r.length.port)}, reference ${fmtLen(r.length.ref)}`);
  md.push(`- differing fields: ${Object.entries(r.fields).filter(([, v]) => v === 'DIFFERENT').map(([k]) => k).join(', ') || '—'}`);
  for (const n of r.notes) md.push(`- ${n}`);
  for (const i of r.issues) md.push(`- reference check: ${i.flag} — ${i.where}`);
  md.push('');
}

md.push('## 4. Checks against the independent reference planner', '');
md.push('Flags: `crosses-obstacle` (a path segment enters a C-obstacle), `longer-than-shortest` (path longer than the reference shortest path), `no-path-but-one-exists`, `path-undefined` (the result is not a list of points, e.g. an unevaluated expression), `start-validity`/`goal-validity` (validity differs from the reference). "inherited" = the original shows the same problem, so the port reproduces it faithfully.', '');
const issueRows = rows.filter((r) => r.issues.length);
if (!issueRows.length) md.push('No flags.', '');
else {
  md.push('| scene | flag | where | lengths o / p / ref | link |', '|---|---|---|---|---|');
  for (const r of issueRows) for (const i of r.issues) md.push(`| ${r.id} | ${i.flag} | ${i.where} | ${fmtLen(r.length.original)} / ${fmtLen(r.length.port)} / ${fmtLen(r.length.ref)} | [open](${r.link}) |`);
  md.push('');
}

md.push('## 5. Messages produced by the original', '');
const msgRows = rows.filter((r) => r.messages.length);
if (!msgRows.length) md.push('None.', '');
else for (const r of msgRows) md.push(`- ${r.id}: ${r.messages.join(', ')}`);
md.push('');

md.push('## 6. Slow scenes in the original', '');
md.push('Kernel time per scene. The Wolfram front end aborts a Manipulate update that takes longer than about 5–6 s (DynamicEvaluationTimeout), so scenes above that would not display in the interactive original. Times include message formatting, so treat them as upper bounds.', '');
const slow = rows.filter((r) => r.seconds != null && r.seconds > 5);
md.push(slow.length ? slow.map((r) => `- ${r.id}: ${r.seconds.toFixed(1)} s — [open](${r.link})`).join('\n') : 'None above 5 s.', '');
const maxT = Math.max(0, ...rows.map((r) => r.seconds ?? 0));
md.push(`Slowest: ${maxT.toFixed(2)} s.`, '');

md.push('## 7. All scenes', '');
md.push('| scene | group | verdict | valid o / p | length o / p / ref | flags | time (s) | link |', '|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  md.push(`| ${r.id} | ${r.group} | ${r.verdict} | ${fmtValid(r.validity.original)} / ${fmtValid(r.validity.port)} | ${fmtLen(r.length.original)} / ${fmtLen(r.length.port)} / ${fmtLen(r.length.ref)} | ${r.issues.map((i) => i.flag).join(', ')} | ${r.seconds != null ? r.seconds.toFixed(2) : '—'} | [open](${r.link}) |`);
}
md.push('');
md.push('Notes: scene links open the port with the exact scene. "history" scenes (option `--history`) first place the obstacles while the robot stands at the default start and then move the robot, as a user would by dragging; the original keeps the C-obstacles from that moment (it only recomputes them when obstacles or the robot shape change), the port always recomputes. A history row that differs while its plain row does not means the interactive original's result depends on how the user arrived at the scene.', '');
fs.writeFileSync(path.join(outDir, 'report.md'), md.join('\n'));
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ original: { ...original, scenes: undefined }, selfCheck: selfOk, rows }, null, 1));
if (wantImages) writeSideBySide(rows.filter((r) => r.image));

console.log(`Harness self-check: ${selfOk ? 'PASS' : 'FAIL'}`);
console.log(`identical ${count((r) => r.verdict === 'identical')}, last-bit ${count((r) => r.verdict === 'last-bit')}, DIFFERENT ${count((r) => r.verdict === 'DIFFERENT')}, original-error ${count((r) => r.verdict === 'original-error')}`);
console.log(`Report: ${path.relative(root, path.join(outDir, 'report.md'))}`);
process.exit(selfOk ? 0 : 1);

// ---------------------------------------------------------------- helpers
async function portScreenshots(list) {
  if (!list.length) { console.log('No original pictures were saved, so no port screenshots taken.'); return; }
  const pw = await import('@playwright/test');
  const which = String(opt('browser', 'firefox'));
  const launchOpts = which === 'chromium' && process.env.PW_CHROMIUM_PATH
    ? { executablePath: process.env.PW_CHROMIUM_PATH, args: (process.env.PW_CHROMIUM_ARGS || '').split(' ').filter(Boolean) } : {};
  const port = 8095;
  const server = spawn(process.execPath, [path.join(root, 'tools/serve.mjs'), String(port)], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${port}/index.html`); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
    const browser = await pw[which].launch(launchOpts);
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    for (const r of list) {
      const local = r.link.replace(base, `http://127.0.0.1:${port}`);
      await page.goto(local);
      await page.waitForFunction(() => window.__demo && window.__demo.ready === true);
      await page.locator('[data-testid="scene-svg"]').screenshot({ path: path.join(imagesDir, `${r.id}.port.png`) });
      r.portImage = `images/${r.id}.port.png`;
    }
    await browser.close();
  } finally { server.kill(); }
}

function writeSideBySide(list) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const html = `<!doctype html><meta charset="utf-8"><title>Original vs port</title>
<style>body{font:14px system-ui,sans-serif;margin:16px}figure{display:inline-block;margin:0 12px 0 0}img{width:425px;border:1px solid #ccc}
section{margin:0 0 28px}h2{font-size:16px;margin:0 0 6px}.DIFFERENT{color:#b00}</style>
<h1>Original (Mathematica) vs port (browser)</h1>
<p>Generated by tools/compare-with-original.mjs. Pictures are for side-by-side review by a person; they are not compared automatically.</p>
${list.map((r) => `<section><h2 class="${esc(r.verdict)}">${esc(r.id)} — ${esc(r.title)} — ${esc(r.verdict)}</h2>
<figure><img src="${esc(r.image)}" alt="original"><figcaption>original</figcaption></figure>
<figure>${r.portImage ? `<img src="${esc(r.portImage)}" alt="port">` : '(no screenshot)'}<figcaption>port — <a href="${esc(r.link)}">open</a></figcaption></figure></section>`).join('\n')}`;
  fs.writeFileSync(path.join(outDir, 'side-by-side.html'), html);
  console.log(`Side by side: ${path.relative(root, path.join(outDir, 'side-by-side.html'))}`);
}
