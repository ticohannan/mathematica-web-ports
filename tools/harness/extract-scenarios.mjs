#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/harness/extract-scenarios.mjs — build tests/harness/<dir>.scenarios.json from an app's TESTPLAN (HW-60).
//
//   node tools/harness/extract-scenarios.mjs <dir>|--all [--testplan=FILE] [--design-root=DIR] [--out=DIR] [--check]
//
// Every TESTPLAN line that starts with {"id":"H- is one scenario. It is read with the lexical JSON reader
// (tools/lib/json-lexical.mjs) so numbers keep their text (`1.0` = machine real, `1` = exact integer, HW-06), checked
// against the schema (tools/harness/scenario-schema.mjs) and written unchanged, with the verbatim line in "source".
// A TESTPLAN block that starts with {"definitions": (possibly over several lines) becomes the file-level
// "definitions"; a leading "wl:" of each entry is stripped (COMMON-DECISIONS §6).
//
// Where the TESTPLAN is looked for, in order: --testplan=FILE (one app), <design-root>/<dir>/TESTPLAN.md,
// demos/<dir>/TESTPLAN.md, _internal/batch-ab/design/<dir>/TESTPLAN.md (the owner's private drafts).
// "motion-planning" is special: its parity scenarios (HW-72) are generated from
// tests/golden/motion-planning.original-states.json, the five states mp-original.wls reproduces.
//
// --check   write nothing; exit 1 if a generated file differs from the committed one.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLexical, stringifyLexical, LexNumber, lexInt } from '../lib/json-lexical.mjs';
import { validateScenarioFile, scenarioErrors, SCENARIO_SCHEMA_ID } from './scenario-schema.mjs';
import { HARNESS_APPS, appByDir } from './apps.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GENERATOR = 'tools/harness/extract-scenarios.mjs';
const LICENCE_WITH_DEFINITIONS = 'MIT AND CC-BY-NC-SA-3.0';

/** Pull the scenario lines and the definitions block out of a TESTPLAN text. */
export function readTestplan(text) {
  const lines = text.split(/\r?\n/);
  const scenarios = [];
  const errors = [];
  let definitions = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('{"id":"H-')) {
      let sc;
      try { sc = parseLexical(line); } catch (e) { errors.push(`line ${i + 1}: ${e.message}`); continue; }
      scenarios.push({ value: sc, line, lineNo: i + 1 });
    } else if (/^\{\s*"definitions"\s*:/.test(line)) {
      let buf = '';
      let ok = false;
      for (let j = i; j < lines.length && j < i + 2000; j++) {
        buf += (buf ? '\n' : '') + lines[j];
        try {
          const v = parseLexical(buf);
          if (definitions) errors.push(`line ${i + 1}: a second definitions block`);
          definitions = { value: v, lineNo: i + 1 };
          i = j; ok = true; break;
        } catch { /* keep reading lines */ }
      }
      if (!ok) errors.push(`line ${i + 1}: the definitions block is not valid JSON`);
    }
  }
  return { scenarios, definitions, errors };
}

/** Strip the optional "wl:" prefix of a definitions entry. */
export const stripWl = (s) => (typeof s === 'string' && s.startsWith('wl:') ? s.slice(3) : s);

/** Order of keys in a written scenario: the TESTPLAN line's own order, then "source". */
function withSource(sc, line) {
  const out = {};
  for (const k of Object.keys(sc)) if (k !== 'source') out[k] = sc[k];
  out.source = line;
  return out;
}

/** Build the scenario-file object for one app from TESTPLAN text. Throws with all errors when invalid. */
export function scenarioFileFromTestplan(text, { dir, sourceName }) {
  const app = appByDir(dir);
  if (!app) throw new Error(`unknown app "${dir}" (add it to tools/harness/apps.mjs)`);
  const { scenarios, definitions, errors } = readTestplan(text);
  const errs = [...errors];
  if (!scenarios.length) errs.push('no {"id":"H-…} lines found');
  for (const s of scenarios) errs.push(...scenarioErrors(s.value).map((e) => `line ${s.lineNo}: ${e}`));
  const file = { schema: SCENARIO_SCHEMA_ID, app: dir, notebook: app.notebook };
  if (app.sha256) file.notebookSha256 = app.sha256;
  file.source = sourceName;
  file.generatedBy = GENERATOR;
  if (app.start) file.start = app.start;
  if (definitions) {
    const d = definitions.value;
    if (!d || typeof d !== 'object' || !Array.isArray(d.definitions) || Object.keys(d).length !== 1 || d.definitions.some((s) => typeof s !== 'string')) {
      errs.push(`line ${definitions.lineNo}: the definitions block must be {"definitions": [strings]}`);
    } else {
      file.licence = LICENCE_WITH_DEFINITIONS;
      file.definitions = d.definitions.map(stripWl);
    }
  }
  file.scenarios = scenarios.map((s) => withSource(s.value, s.line));
  if (!errs.length) errs.push(...validateScenarioFile(file, { prefix: app.prefix }));
  if (errs.length) throw new Error(`${dir}: ${errs.length} problem(s)\n  ${errs.join('\n  ')}`);
  return file;
}

/** HW-72: scenarios equivalent to mp-original.wls's five golden scenes (motion planning, author notebook). */
export const MP_CACHES = ['oldLocatorsO', 'oldLocatorsR', 'nPrev', 'prevRobotobstconfig', 'prevObstaclepoly', 'prevRobotStartPoly',
  'prevRobotEndPoly', 'prevVerticestoVertices', 'prevLinesStarttoObstacles', 'prevLinesEndtoObstacles', 'prevLineStarttoEnd',
  'linesStarttoObstacles', 'linesEndtoObstacles', 'verticestoVertices', 'discretePath'];
export const MP_CAPTURES = ['path', 'robotinsideobstcond', 'obstCollision', 'configBoundary', 'robotobstconfig', 'obstaclepoly',
  'robotStartPoly', 'robotEndPoly', 'borderpoly', 'allPoints', 'allLines', 'startPoint', 'endPoint', 'noInterConfig',
  'discretePath', 'linesStarttoObstacles', 'linesEndtoObstacles', 'verticestoVertices'];
export function motionPlanningParityFile(goldenText) {
  const golden = parseLexical(goldenText);
  const asReal = (v) => (v instanceof LexNumber && !v.isReal ? new LexNumber(`${v.text}.0`) : v);
  const asInt = (v) => lexInt(Math.round(v.value));
  const scenarios = golden.states.map((st, i) => {
    const set = { configOrWork: 'workspace', x: asInt(st.x), n: asInt(st.n), s: lexInt(1) };
    for (const k of ['r1', 'r2', 'o1', 'o2', 'o3', 'o4']) set[k] = st[k].map(asReal);
    for (const k of MP_CACHES) set[k] = 'wl:Null';
    return {
      id: `H-MP-${String(i + 1).padStart(2, '0')}`,
      steps: [{ set }],
      capture: MP_CAPTURES,
      why: `HW-72 parity: equals mp-original.wls scene golden-${i} (saved state ${i} of the author notebook, caches cleared); the 18 values must be bit-identical to mp-original's on the same machine`,
    };
  });
  const app = appByDir('motion-planning');
  // the coordinates are copied from the CC BY-NC-SA golden fixture (values of the original), so the file is partly CC
  const file = { schema: SCENARIO_SCHEMA_ID, app: 'motion-planning', notebook: app.notebook,
    source: 'tests/golden/motion-planning.original-states.json', generatedBy: GENERATOR, licence: LICENCE_WITH_DEFINITIONS, scenarios };
  const errs = validateScenarioFile(file, { prefix: 'MP' });
  if (errs.length) throw new Error(`motion-planning: ${errs.join('; ')}`);
  return file;
}

/** Text of a scenario file: one key per line at the top, each scenario's fields on their own lines. */
export function formatScenarioFile(file) {
  const top = [];
  for (const [k, v] of Object.entries(file)) {
    if (k === 'scenarios') continue;
    if (k === 'definitions') top.push(`  "definitions": [\n${v.map((s) => `    ${JSON.stringify(s)}`).join(',\n')}\n  ]`);
    else top.push(`  ${JSON.stringify(k)}: ${stringifyLexical(v)}`);
  }
  const scs = file.scenarios.map((sc) => `    {\n${Object.entries(sc).map(([k, v]) => `      ${JSON.stringify(k)}: ${stringifyLexical(v)}`).join(',\n')}\n    }`);
  top.push(`  "scenarios": [\n${scs.join(',\n')}\n  ]`);
  return `{\n${top.join(',\n')}\n}\n`;
}

/** Locate an app's TESTPLAN. */
export function findTestplan(dir, { testplan, designRoot } = {}) {
  const cands = [];
  if (testplan) cands.push(path.resolve(testplan));
  if (designRoot) cands.push(path.resolve(designRoot, dir, 'TESTPLAN.md'));
  cands.push(path.join(ROOT, 'demos', dir, 'TESTPLAN.md'), path.join(ROOT, '_internal', 'batch-ab', 'design', dir, 'TESTPLAN.md'));
  return cands.find((f) => fs.existsSync(f)) ?? null;
}

/** Name recorded in "source": repo-relative when inside the repository, else the owner's private-draft location. */
export function sourceNameFor(file, dir) {
  const rel = path.relative(ROOT, file);
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) return rel.split(path.sep).join('/');
  return `_internal/batch-ab/design/${dir}/TESTPLAN.md`;
}

function main(argv) {
  const opt = (name) => {
    const a = argv.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
    return a === undefined ? undefined : a.includes('=') ? a.slice(a.indexOf('=') + 1) : true;
  };
  const dirs = argv.filter((a) => !a.startsWith('--'));
  const unknown = argv.filter((a) => a.startsWith('--') && !/^--(all|testplan|design-root|out|check|help)(=|$)/.test(a));
  if (opt('help') || unknown.length || (!dirs.length && !opt('all'))) {
    if (unknown.length) console.error(`unknown option(s): ${unknown.join(' ')}`);
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(2, 19).map((l) => l.slice(3)).join('\n'));
    return unknown.length ? 2 : (opt('help') ? 0 : 2);
  }
  const outDir = path.resolve(ROOT, opt('out') || 'tests/harness');
  const list = opt('all') ? HARNESS_APPS.filter((a) => !a.structureOnly).map((a) => a.dir) : dirs;
  if (opt('testplan') && list.length !== 1) { console.error('--testplan needs exactly one app'); return 2; }
  let bad = 0;
  for (const dir of list) {
    let file;
    try {
      if (dir === 'motion-planning') {
        file = motionPlanningParityFile(fs.readFileSync(path.join(ROOT, 'tests/golden/motion-planning.original-states.json'), 'utf8'));
      } else {
        const tp = findTestplan(dir, { testplan: opt('testplan'), designRoot: opt('design-root') });
        if (!tp) { console.log(`${dir}: no TESTPLAN found (skipped)`); continue; }
        file = scenarioFileFromTestplan(fs.readFileSync(tp, 'utf8'), { dir, sourceName: sourceNameFor(tp, dir) });
      }
    } catch (e) { console.error(e.message); bad++; continue; }
    const text = formatScenarioFile(file);
    const target = path.join(outDir, `${dir}.scenarios.json`);
    if (opt('check')) {
      const same = fs.existsSync(target) && fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') === text;
      console.log(`${dir}: ${same ? 'up to date' : 'DIFFERS from the committed file'} (${file.scenarios.length} scenarios)`);
      if (!same) bad++;
    } else {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(target, text);
      console.log(`${dir}: ${file.scenarios.length} scenarios -> ${path.relative(ROOT, target).split(path.sep).join('/')}`);
    }
  }
  return bad ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
