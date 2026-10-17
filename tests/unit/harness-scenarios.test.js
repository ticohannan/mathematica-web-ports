// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/harness-scenarios.test.js — the Mathematica-harness scenario files (tests/harness/*.scenarios.json):
// schema and lint (HW-61), the extractor on sample TESTPLAN lines (HW-60), and "every TESTPLAN line is in the file
// and vice versa" when the private TESTPLAN drafts are present (HARNESS_DESIGN_ROOT or _internal/batch-ab/design).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseLexical, stringifyLexical, isLexReal, isLexInteger } from '../../tools/lib/json-lexical.mjs';
import { validateScenarioFile, scenarioErrors, scenarioSha256, SCENARIO_SCHEMA, STEP_KINDS } from '../../tools/harness/scenario-schema.mjs';
import { readTestplan, scenarioFileFromTestplan, formatScenarioFile, motionPlanningParityFile, stripWl, MP_CAPTURES } from '../../tools/harness/extract-scenarios.mjs';
import { HARNESS_APPS, appByDir } from '../../tools/harness/apps.mjs';

const DIR = 'tests/harness';
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.scenarios.json')).sort();
const load = (f) => parseLexical(fs.readFileSync(path.join(DIR, f), 'utf8'));

describe('committed scenario files', () => {
  it('exist for the 16 batch A/B apps and the motion-planning parity set', () => {
    const want = HARNESS_APPS.filter((a) => !a.structureOnly).map((a) => `${a.dir}.scenarios.json`).sort();
    expect(files).toEqual(want);
  });
  it('hold the 314 TESTPLAN scenarios (+5 parity scenarios)', () => {
    const n = files.map(load).reduce((s, f) => s + f.scenarios.length, 0);
    expect(n).toBe(319);
  });
  it.each(files)('%s is valid (schema, lint, unique ids, prefix)', (f) => {
    const file = load(f);
    const app = appByDir(file.app);
    expect(app, `app ${file.app} in tools/harness/apps.mjs`).toBeTruthy();
    expect(f).toBe(`${file.app}.scenarios.json`);
    expect(file.notebook).toBe(app.notebook);
    expect(validateScenarioFile(file, { prefix: app.prefix })).toEqual([]);
  });
  it.each(files)('%s: every "source" line re-parses to the scenario itself (verbatim TESTPLAN line, HW-60)', (f) => {
    const file = load(f);
    for (const sc of file.scenarios) {
      if (!('source' in sc)) { expect(file.app).toBe('motion-planning'); continue; }
      const { source, ...rest } = sc;
      expect(stringifyLexical(parseLexical(source)), sc.id).toBe(stringifyLexical(rest));
    }
  });
  it.each(files)('%s is formatted as the extractor writes it', (f) => {
    const text = fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\r\n/g, '\n');
    expect(formatScenarioFile(parseLexical(text))).toBe(text);
  });
  it('licence marking: prm-3d (definitions) and motion-planning (fixture coordinates) are partly CC (HW §7.1)', () => {
    const partlyCC = ['prm-3d.scenarios.json', 'motion-planning.scenarios.json'];
    const reuse = fs.readFileSync('REUSE.toml', 'utf8');
    const licence = fs.readFileSync('LICENSE.md', 'utf8');
    for (const f of files) {
      const file = load(f);
      if (partlyCC.includes(f)) {
        expect(file.licence, f).toBe('MIT AND CC-BY-NC-SA-3.0');
        expect(reuse, f).toContain(`tests/harness/${f}`);
        expect(licence, f).toContain(`tests/harness/${f}`);
      } else expect(file.licence, f).toBeUndefined();
      if (file.definitions) expect(partlyCC).toContain(f);
    }
    expect(load('prm-3d.scenarios.json').definitions.length).toBe(5);
    expect(load('prm-3d.scenarios.json').definitions.every((d) => !d.startsWith('wl:'))).toBe(true);
  });
  it('numbers keep their lexical kind: reals in H-RT-01 verts, integers in finalGoal', () => {
    const sc = load('rrt.scenarios.json').scenarios.find((s) => s.id === 'H-RT-01');
    const set = sc.steps[0].set;
    expect(isLexReal(set.verts[0][0])).toBe(true);
    expect(isLexInteger(set.finalGoal[0])).toBe(true);
  });
  it('two-link-kinematics H-TK-02…22 start from the live state (HARNESS-WL §11.2)', () => {
    const scs = load('two-link-kinematics.scenarios.json').scenarios;
    const live = scs.filter((s) => s.start === 'live').map((s) => s.id);
    expect(live.length).toBe(21);
    expect(live).not.toContain('H-TK-01');
  });
  it('step kinds in use are all known', () => {
    const kinds = new Set(files.flatMap((f) => load(f).scenarios.flatMap((s) => s.steps.flatMap((st) => Object.keys(st)))));
    for (const k of kinds) expect([...STEP_KINDS, 'controlActive', 'evaluate', 'maxEvaluations']).toContain(k);
  });
});

describe('schema and lint (HW-61)', () => {
  const ok = { id: 'H-XX-01', steps: [{ set: {} }], capture: ['a'], why: 'w' };
  const lex = (o) => parseLexical(JSON.stringify(o));
  it('the documented schema lists the step kinds', () => {
    expect(SCENARIO_SCHEMA.$defs.step.oneOf.map((o) => o.required[0])).toEqual(STEP_KINDS);
  });
  it('accepts a minimal scenario', () => expect(scenarioErrors(lex(ok))).toEqual([]));
  it.each([
    ['two kinds in one step', { ...ok, steps: [{ set: {}, press: 'x' }] }, /exactly one step kind/],
    ['no kind', { ...ok, steps: [{ controlActive: true }] }, /exactly one step kind/],
    ['settle false', { ...ok, steps: [{ settle: false }] }, /settle: must be true/],
    ['seed real', { ...parseLexical('{"id":"H-XX-01","steps":[{"seed":1.0}],"capture":[],"why":""}') }, /seed: integer/],
    ['bad setFrom', { ...ok, steps: [{ setFrom: 'snapshot:0' }] }, /setFrom/],
    ['evaluate on set', { ...ok, steps: [{ set: {}, evaluate: false }] }, /evaluate/],
    ['bad id', { ...ok, id: 'H-X-1' }, /id must match/],
    ['unknown key', { ...ok, foo: 1 }, /unknown key "foo"/],
    ['bad ctl', { ...ok, steps: [{ set: { a: 'ctl:a' } }] }, /bad ctl/],
    ['drag index 0', { ...ok, steps: [{ drag: { pts: { index: 0, to: [1, 2] } } }] }, /index/],
    ['duplicate capture', { ...ok, capture: ['a', 'a'] }, /duplicate/],
    ['null value', { ...ok, steps: [{ set: { a: null } }] }, /value must be/],
  ])('rejects %s', (_, sc, re) => {
    const v = sc.id && typeof sc.id === 'string' && !(sc.steps?.[0]?.seed) ? lex(sc) : sc;
    expect(scenarioErrors(v).join('\n')).toMatch(re);
  });
  it('file level: duplicate ids and wrong prefix', () => {
    const f = lex({ schema: 'manipulate-harness/scenarios-1', app: 'rrt', notebook: 'x.nb', scenarios: [ok, ok] });
    const e = validateScenarioFile(f, { prefix: 'RT' }).join('\n');
    expect(e).toMatch(/duplicate id/);
    expect(e).toMatch(/prefix must be H-RT-/);
  });
  it('the scenario hash ignores "why" and "source" but not steps, captures, start or definitions', () => {
    const file = lex({ schema: 'manipulate-harness/scenarios-1', app: 'a', notebook: 'x.nb', scenarios: [ok] });
    const h = scenarioSha256(file, file.scenarios[0]);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(scenarioSha256(file, { ...file.scenarios[0], why: 'other', source: 'x' })).toBe(h);
    expect(scenarioSha256(file, { ...file.scenarios[0], capture: ['b'] })).not.toBe(h);
    expect(scenarioSha256(file, { ...file.scenarios[0], start: 'live' })).not.toBe(h);
    expect(scenarioSha256({ ...file, definitions: ['x=1'] }, file.scenarios[0])).not.toBe(h);
    // 1 and 1.0 hash differently: the number kind is part of the input
    const a = lex({ ...ok, steps: [{ set: { x: 1 } }] });
    const b = parseLexical('{"id":"H-XX-01","steps":[{"set":{"x":1.0}}],"capture":["a"],"why":"w"}');
    expect(scenarioSha256(file, a)).not.toBe(scenarioSha256(file, b));
  });
});

describe('extract-scenarios.mjs (HW-60)', () => {
  const tp = [
    '# TESTPLAN', '',
    'Some text {"id":"H-RT-99"} in prose is not a scenario.',
    '```json',
    '{"definitions": [',
    '  "wl:ptsI={{0.11,1.15,4.74}};",',
    '  "badPtsI={};"',
    ']}',
    '```',
    '{"id":"H-RT-01","steps":[{"set":{"verts":[[0.0,0.0],0,1,0,[]],"goalRadius":1}},{"set":{}}],"captureEachStep":true,"capture":["verts","%text"],"why":"w1"}',
    '{"id":"H-RT-02","steps":[{"seed":101},{"press":"1"},{"settle":true}],"capture":["$RandomDraws"],"why":"w2"}',
  ].join('\n');
  it('reads scenario lines and the multi-line definitions block', () => {
    const r = readTestplan(tp);
    expect(r.errors).toEqual([]);
    expect(r.scenarios.map((s) => s.value.id)).toEqual(['H-RT-01', 'H-RT-02']);
    expect(r.definitions.value.definitions.map(stripWl)).toEqual(['ptsI={{0.11,1.15,4.74}};', 'badPtsI={};']);
  });
  it('builds a valid file that keeps 0.0 as a real and the verbatim line', () => {
    const f = scenarioFileFromTestplan(tp, { dir: 'rrt', sourceName: 'x/TESTPLAN.md' });
    expect(f.licence).toBe('MIT AND CC-BY-NC-SA-3.0');
    expect(f.scenarios[0].source).toBe(tp.split('\n')[9]);
    expect(f.scenarios[0].steps[0].set.verts[0][0].text).toBe('0.0');
    expect(f.scenarios[0].steps[0].set.goalRadius.text).toBe('1');
    const text = formatScenarioFile(f);
    expect(validateScenarioFile(parseLexical(text), { prefix: 'RT' })).toEqual([]);
  });
  it('reports invalid lines with their line number', () => {
    const bad = `${tp}\n{"id":"H-RT-03","steps":[{"settle":false}],"capture":[],"why":""}`;
    expect(() => scenarioFileFromTestplan(bad, { dir: 'rrt', sourceName: 'x' })).toThrow(/line 12: .*settle/);
  });
  it('motion-planning parity scenarios: reals stay reals, x/n integers, 18 captures (HW-72)', () => {
    const f = motionPlanningParityFile(fs.readFileSync('tests/golden/motion-planning.original-states.json', 'utf8'));
    expect(f.scenarios.length).toBe(5);
    for (const sc of f.scenarios) {
      const set = sc.steps[0].set;
      expect(isLexInteger(set.x) && isLexInteger(set.n)).toBe(true);
      for (const k of ['r1', 'r2', 'o1', 'o2', 'o3', 'o4']) expect(set[k].every(isLexReal), `${sc.id} ${k}`).toBe(true);
      expect(sc.capture).toEqual(MP_CAPTURES);
    }
    expect(formatScenarioFile(f)).toBe(fs.readFileSync('tests/harness/motion-planning.scenarios.json', 'utf8').replace(/\r\n/g, '\n'));
  });
});

// HW-60: the committed files equal a fresh extraction from the TESTPLANs (only where the private drafts exist)
const designRoot = [process.env.HARNESS_DESIGN_ROOT, '_internal/batch-ab/design'].find((d) => d && fs.existsSync(d));
describe.skipIf(!designRoot)('scenario files vs the TESTPLAN drafts', () => {
  const apps = HARNESS_APPS.filter((a) => !a.structureOnly && !a.parity && fs.existsSync(path.join(designRoot ?? '', a.dir, 'TESTPLAN.md')));
  it.each(apps.map((a) => a.dir))('%s: every TESTPLAN H- line is in the file and vice versa', (dir) => {
    const text = fs.readFileSync(path.join(designRoot, dir, 'TESTPLAN.md'), 'utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.startsWith('{"id":"H-'));
    const file = load(`${dir}.scenarios.json`);
    expect(file.scenarios.map((s) => s.source)).toEqual(lines);
    const fresh = scenarioFileFromTestplan(text, { dir, sourceName: file.source });
    expect(formatScenarioFile(fresh)).toBe(fs.readFileSync(path.join(DIR, `${dir}.scenarios.json`), 'utf8').replace(/\r\n/g, '\n'));
  });
});
