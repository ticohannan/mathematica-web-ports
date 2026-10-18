// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/harness-json.test.js — the golden-test helper for harness results (tests/support/harness-json.js) on a
// synthetic record: skip without data, stale detection by scenario hash, captures per step, exact doubles.
import { describe, it, expect } from 'vitest';
import { parseLexical } from '../../tools/lib/json-lexical.mjs';
import { scenarioSha256 } from '../../tools/harness/scenario-schema.mjs';
import { harnessCase, captureOf, stepRecord, randomDraws, exactDouble, realOf, intOf, sameDouble, toJS, isExact,
  isMachineReal, isInteger, isNotEvaluated, isUnassignedLocal, firstDifference, NO_DATA, loadHarnessGolden } from '../support/harness-json.js';

const FILE = parseLexical(`{"schema":"manipulate-harness/scenarios-1","app":"rrt","notebook":"N.nb","scenarios":[
  {"id":"H-RT-01","steps":[{"seed":101},{"press":"1"}],"captureEachStep":true,"capture":["verts","nodestoadd","cost","$RandomDraws"],"why":"w"},
  {"id":"H-RT-02","steps":[{"set":{}}],"capture":["x"],"why":"w"}]}`);
const sha = scenarioSha256(FILE, FILE.scenarios[0]);
const GOLDEN = parseLexical(`{"schema":"manipulate-harness/results-1","wolframVersion":"15.0.1 for Microsoft Windows (64-bit)","scenarios":[
  {"id":"H-RT-01","status":"ok","scenarioSha256":"${sha}",
   "steps":[{"step":1,"kind":"seed","seed":101,"evaluations":0,"capture":{"verts":[[[0.0,0.0],0,1,0,[]]],"nodestoadd":0,"cost":{"notEvaluated":true}}},
            {"step":2,"kind":"press","label":"1","evaluations":1,"randomDrawRecords":[{"fn":"RandomReal","args":[],"value":0.7}],
             "capture":{"verts":[[[0.0,0.0],0,1,0,[]],[[0.13,-0.98],1,2,0.9899494936611665,[]]],"nodestoadd":0,"cost":{"wl":"7/10","n":0.7}}}],
   "capture":{"verts":[[[0.0,0.0],0,1,0,[]],[[0.13,-0.98],1,2,0.9899494936611665,[]]],"nodestoadd":0,"cost":{"wl":"7/10","n":0.7},
     "$RandomDraws":[{"fn":"RandomReal","args":[],"value":0.7,"step":2,"evaluation":1,"nested":false}]}},
  {"id":"H-RT-02","status":"ok","scenarioSha256":"${'f'.repeat(64)}","capture":{"x":1}}]}`);

describe('harnessCase', () => {
  it('skips with the documented reason when there is no golden file (HW-67)', () => {
    const h = harnessCase('rrt', 'H-RT-01', { scenarioFile: FILE, golden: null, file: '/nonexistent/x.harness.json' });
    expect(h.status).toBe('skip');
    expect(h.reason).toBe(NO_DATA);
  });
  it('returns the record when the scenario hash matches', () => {
    const h = harnessCase('rrt', 'H-RT-01', { scenarioFile: FILE, golden: GOLDEN });
    expect(h.status).toBe('ok');
    expect(h.version).toMatch(/^15\.0\.1/);
  });
  it('reports stale data: "rerun H-XX-nn"', () => {
    const h = harnessCase('rrt', 'H-RT-02', { scenarioFile: FILE, golden: GOLDEN });
    expect(h.status).toBe('stale');
    expect(h.reason).toMatch(/rerun H-RT-02/);
  });
  it('throws for an id that is not in the scenario file', () => {
    expect(() => harnessCase('rrt', 'H-RT-77', { scenarioFile: FILE, golden: GOLDEN })).toThrow(/not in tests\/harness/);
  });
  it('the accepted golden files of harness run 2 load (16 apps); an app without one gives null', () => {
    expect(loadHarnessGolden('rrt').schema).toBe('manipulate-harness/results-1');
    expect(loadHarnessGolden('no-such-app')).toBe(null);
  });
});

describe('captures and values (HW-45, HW-47)', () => {
  const { record } = harnessCase('rrt', 'H-RT-01', { scenarioFile: FILE, golden: GOLDEN });
  it('final capture and per-step capture', () => {
    expect(captureOf(record, 'verts').length).toBe(2);
    expect(captureOf(record, 'verts', { step: 1 }).length).toBe(1);
    expect(isNotEvaluated(captureOf(record, 'cost', { step: 1 }))).toBe(true);
    expect(stepRecord(record, 2).label).toBe('1');
    expect(() => captureOf(record, 'nope')).toThrow(/no capture "nope"/);
  });
  it('1.0 vs 1: machine reals and exact integers stay apart', () => {
    const root = captureOf(record, 'verts')[0];
    expect(isMachineReal(root[0][0])).toBe(true);
    expect(isInteger(root[1])).toBe(true);
    expect(realOf(root[0][0])).toBe(0);
    expect(intOf(root[2])).toBe(1n);
    expect(() => realOf(root[2])).toThrow(/integer 1/);
    expect(() => intOf(root[0][0])).toThrow(/real 0.0/);
  });
  it('exact values carry their double', () => {
    const c = captureOf(record, 'cost');
    expect(isExact(c)).toBe(true);
    expect(exactDouble(c)).toBe(0.7);
    expect(toJS(c)).toBe(0.7);
  });
  it('bit-exact comparison helpers', () => {
    expect(sameDouble(0.1 + 0.2, 0.30000000000000004)).toBe(true);
    expect(sameDouble(0.1 + 0.2, 0.3)).toBe(false);
    expect(sameDouble(-0, 0)).toBe(true);
    const port = [[[0, 0], 0, 1, 0, []], [[0.13, -0.98], 1, 2, 0.9899494936611665, []]];
    expect(firstDifference(captureOf(record, 'verts'), port)).toBe(null);
    port[1][3] = 0.9899494936611666;
    expect(firstDifference(captureOf(record, 'verts'), port)).toMatch(/\[1\]\[3\]: 0\.9899494936611665 \(recorded\) vs 0\.9899494936611666/);
  });
  it('exact values: "n" or legacy "value", compared by value not by text', async () => {
    const { sameValue } = await import('../support/harness-json.js');
    const a = parseLexical('{"wl":"1/2","n":0.5}');
    const b = parseLexical('{"wl":"Rational[1, 2]","value":0.5}');
    expect(exactDouble(b)).toBe(0.5);
    expect(sameValue(a, b)).toBe(true);
    expect(sameValue(a, parseLexical('0.5'))).toBe(true);
    expect(sameValue(a, parseLexical('{"wl":"1/3","n":0.3333333333333333}'))).toBe(false);
    expect(sameValue(parseLexical('{"wl":"9007199254740993"}'), parseLexical('{"wl":"9007199254740993"}'))).toBe(true);
    expect(sameValue(parseLexical('{"wl":"9007199254740993"}'), parseLexical('{"wl":"9007199254740992"}'))).toBe(false);
    expect(isInteger(parseLexical('{"wl":"9007199254740993"}'))).toBe(true);
    expect(firstDifference(parseLexical('[{"wl":"1/2","n":0.5}]'), [b])).toBe(null);
  });
  it('random draws for replay (HW-53)', () => {
    expect(randomDraws(record).map((d) => d.fn)).toEqual(['RandomReal']);
    expect(exactDouble(randomDraws(record)[0].value)).toBe(0.7);
  });
});

describe('run-2 additions: numeric symbols and typeset strings', () => {
  it('exactSymbols turns {"sym": "Pi"} into an exact number compared by value; other symbols stay', async () => {
    const { exactSymbols, firstDifference: fd, sameValue: sv } = await import('../support/harness-json.js');
    const rec = parseLexical('[[1.5, {"sym": "Pi"}], {"sym": "Automatic"}, {"h": "Rule", "a": [{"sym": "E"}, 2]}]');
    const x = exactSymbols(rec);
    expect(x[0][1]).toEqual({ wl: 'Pi', n: 3.141592653589793 });
    expect(x[1]).toEqual({ sym: 'Automatic' });
    expect(x[2].a[0]).toEqual({ wl: 'E', n: 2.718281828459045 });
    expect(fd(x[0], [1.5, Math.PI])).toBe(null);
    expect(sv(x[0][1], parseLexical('3.141592653589793'))).toBe(true);
    expect(fd(rec[0], [1.5, Math.PI])).not.toBe(null); // without the conversion the symbol does not compare
  });
  it('kernelBoxString writes the linear box syntax with the private-use characters the kernel stores', async () => {
    const { kernelBoxString } = await import('../support/harness-json.js');
    expect(kernelBoxString('\\!\\(\\*SuperscriptBox[\\(RRT\\), \\(*\\)]\\)'))
      .toBe('SuperscriptBox[RRT, *]'); // the RRT H-RT-06 input echo
    expect(kernelBoxString('RRT')).toBe('RRT');
  });
});

describe('isUnassignedLocal (HW-45: an unassigned Module local is recorded as null)', () => {
  const rec = parseLexical(`{"id":"H-XX-01","resolved":{"resolution":{"kind":"local","name":"resolution","scope":1},"v":{"kind":"manipulate","name":"v"},"r2":{"kind":"local","name":"r2","scope":1}},
    "capture":{"resolution":null,"v":null,"r2":2.0},"steps":[{"step":1,"capture":{"resolution":3,"v":null,"r2":null}}]}`);
  it('null of a captured local is "unassigned"; null of a Manipulate variable is Null, not unassigned', () => {
    expect(isUnassignedLocal(rec, 'resolution')).toBe(true);
    expect(isUnassignedLocal(rec, 'v')).toBe(false);
    expect(isUnassignedLocal(rec, 'r2')).toBe(false);
  });
  it('per step with { step }', () => {
    expect(isUnassignedLocal(rec, 'resolution', { step: 1 })).toBe(false);
    expect(isUnassignedLocal(rec, 'r2', { step: 1 })).toBe(true);
  });
});
