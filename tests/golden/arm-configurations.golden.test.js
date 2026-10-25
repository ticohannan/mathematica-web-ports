// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/arm-configurations.golden.test.js — the port against values the ORIGINAL stored or drew:
//  * the live state (states[0], raw notebook line 1948), the initial settings (specs) and the six snapshot cells'
//    Settings (lines 5256, 7471, 9130, 10505, 12137, 13574) in tests/golden/arm-configurations.original-states.json
//    (written by `python3 tools/extract_state.py --snapshots <notebook> …`; read lexically, so 0.5 is a machine real
//    and 1 exact);
//  * what only the pictures docs/original-snapshots/arm-configurations-1.png … -6.png show: value texts, check box,
//    popup, DH table, the H strings and the width of the ground disc (716 px at 2 px per pt in pictures 2–6);
//  * the Mathematica-harness records H-AC-01 … H-AC-18 (tests/golden/arm-configurations.harness.json, read through
//    tests/support/harness-json.js). These SKIP with the documented reason until the owner's harness run exists.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { parseLexical } from '../../tools/lib/json-lexical.mjs';
import { harnessCase, captureOf, toJS, isMachineReal, exactDouble, sameDouble, g3dPrimitiveDifferences } from '../support/harness-json.js';
import {
  ROBOTS, initialState, evaluate, stateFromSettings, valueText, fixedCamera, groundWidthPt, piValue, fracValue, exactInt,
  machine, origin,
} from '../../demos/arm-configurations/model.js';
import { dhTableRows, cellText } from '../../demos/arm-configurations/robots.js';
import { cuboidCorners } from '../../shared/graphics3d.js';
import { mmaSliderText } from '../../shared/ui.js';

const fx = parseLexical(fs.readFileSync('tests/golden/arm-configurations.original-states.json', 'utf8'));
const snap = (k) => stateFromSettings(fx.snapshots[k]);
const ascii = (s) => s.replace(/−/g, '-');
/** what the controls show for a state: joint value texts, grip text, show robot, popup label, DH table, H */
function shown(st) {
  const v = evaluate(st);
  return {
    values: st.params.slice(0, v.dof).map((p) => ascii(valueText(p))),
    grip: mmaSliderText(st.g.v, { moved: !st.g.exact, realValues: true }),
    showRobot: st.showRobot,
    popup: ROBOTS[st.robot].name,
    table: dhTableRows(ROBOTS[st.robot]).map((r) => r.map((c) => ascii(cellText(c)))),
    H: v.hStrings.map((r) => r.map(ascii).join(' ')).join(' / '),
  };
}

describe('arm-configurations golden: saved state and snapshots', () => {
  it('arm configurations: the live state (= the initial settings) is the opening state of the port', () => {
    expect(stateFromSettings(fx.states[0])).toEqual(initialState());
    expect(stateFromSettings(fx.specs)).toEqual(initialState());
    expect(snap(1)).toEqual(initialState());
    const T = fx.states[0].DHParameters;
    expect(T[2].map((e) => (e.wl ?? String(toJS(e))))).toEqual(['Pi/2', '0', 'Pi/2', 'Pi/2', '-Pi/2', '0']);
    expect(T[3].map((e) => [Number(e.text), isMachineReal(e)])).toEqual([[1.5, true], [0, false], [0, false], [0.75, true], [0, false], [0.5, true]]);
    expect(fx.states[0].params).toHaveLength(20);
    expect(fx.states[0].params.every((p) => p.text === '0')).toBe(true);
    expect([toJS(fx.states[0].dof), fx.states[0].g.text, fx.states[0].showRobot]).toEqual([6, '1', true]);
  });

  it('arm configurations: the six snapshot Settings load as port states and are fixed points of one evaluation', () => {
    const want = { robot: ['anthropomorphic', 'anthropomorphic', 'anthropomorphic', 'planar elbow', 'elbow robot', 'CNC robot'], dof: [6, 6, 6, 2, 3, 3], g: [1, 1, 0.62, 1, 1, 1], show: [true, true, false, true, true, true] };
    for (const k of [1, 2, 3, 4, 5, 6]) {
      const st = snap(k);
      expect(ROBOTS[st.robot].name, `snapshot ${k}`).toBe(want.robot[k - 1]);
      expect([st.dof, st.g.v, st.showRobot], `snapshot ${k}`).toEqual([want.dof[k - 1], want.g[k - 1], want.show[k - 1]]);
      const before = JSON.stringify(st);
      evaluate(st); // the body re-assigns dof to the same value
      expect(JSON.stringify(st), `snapshot ${k}`).toBe(before);
    }
    expect(snap(6).params.slice(0, 4)).toEqual([machine(0.5), machine(0.5), machine(0.5), exactInt(0)]);
    expect(snap(3).g).toEqual({ v: 0.62, exact: false });
    expect(snap(1).g).toEqual({ v: 1, exact: true });
  });

  it('arm configurations: picture 2 (anthropomorphic) shows the six θ* sliders at 0, the DH table and H = 1. 0. 0. 2. / 0. -1. 0. 0. / 0. 0. -1. 0.25 / 0. 0. 0. 1.', () => {
    const s = shown(snap(2));
    expect(s.values).toEqual(['0', '0', '0', '0', '0', '0']);
    expect([s.grip, s.showRobot, s.popup]).toEqual(['1', true, 'anthropomorphic']);
    expect(s.table).toEqual([
      ['joint', 'type', 'r', 'α', 'd', '0'], ['1', 'r', '0', 'π/2', '1.5', 'θ*1'], ['2', 'r', '1', '0', '0', 'θ*2'],
      ['3', 'r', '1', 'π/2', '0', 'θ*3'], ['4', 'r', '0', 'π/2', '0.75', 'θ*4'], ['5', 'r', '0', '-π/2', '0', 'θ*5'], ['6', 'r', '0', '0', '0.5', 'θ*6'],
    ]);
    expect(s.H).toBe('1. 0. 0. 2. / 0. -1. 0. 0. / 0. 0. -1. 0.25 / 0. 0. 0. 1.');
    expect(shown(snap(1))).toEqual(s); // picture 1 = picture 2 (N-AC-01)
  });

  it('arm configurations: picture 3 (grip 0.62, show robot off) shows only joint 1 and the gripper at (2, 0, 0.25)', () => {
    const st = snap(3);
    const s = shown(st);
    expect([s.grip, s.showRobot]).toEqual(['0.62', false]);
    expect(s.H).toBe('1. 0. 0. 2. / 0. -1. 0. 0. / 0. 0. -1. 0.25 / 0. 0. 0. 1.');
    const v = evaluate(st);
    expect(v.parts[2]).toEqual([]); // joints 2 … 6 not drawn, drawShaft never drawn
    expect(v.parts[0].map((p) => p.type)).toEqual(['cylinder']);
    const grip = v.parts[3].filter((p) => p.type === 'cuboid');
    expect(grip).toHaveLength(3);
    const o = origin(grip[0].matrix);
    [2, 0, 0.25].forEach((x, i) => expect(Math.abs(o[i] - x)).toBeLessThan(1e-15));
    // the fingers stand 0.062 … 0.162 from the palm centre (g = 0.62)
    const f = cuboidCorners(grip[1]);
    expect(f.min[0]).toBeCloseTo(0.062, 15);
    expect(f.max[0]).toBeCloseTo(0.162, 15);
  });

  it('arm configurations: picture 4 (planar elbow) shows H = 1. 0. 0. 2.5 / 0. 1. 0. 0. / 0. 0. 1. 0. / 0. 0. 0. 1.', () => {
    const s = shown(snap(4));
    expect(s.values).toEqual(['0', '0']);
    expect(s.table.slice(1)).toEqual([['1', 'r', '1', '0', '0', 'θ*1'], ['2', 'r', '1.5', '0', '0', 'θ*2']]);
    expect(s.H).toBe('1. 0. 0. 2.5 / 0. 1. 0. 0. / 0. 0. 1. 0. / 0. 0. 0. 1.');
  });

  it('arm configurations: picture 5 (elbow robot) shows H = 1.0 0 0 2.0 / 0 0 -1.0 0 / 0 1.0 0 1.0 / 0 0 0 1.0', () => {
    const s = shown(snap(5));
    expect(s.values).toEqual(['0', '0', '0']);
    expect(s.table.slice(1)).toEqual([['1', 'r', '0', 'π/2', '1', 'θ*1'], ['2', 'r', '1', '0', '0', 'θ*2'], ['3', 'r', '1', '0', '0', 'θ*3']]);
    expect(s.H).toBe('1.0 0 0 2.0 / 0 0 -1.0 0 / 0 1.0 0 1.0 / 0 0 0 1.0');
  });

  it("arm configurations: picture 6 (CNC robot) shows d* sliders at 0.5, the table's θ column -π/2, -π/2, 0 and H = 0. 1. 0. 0.5 / 0. 0. 1. 0.5 / 1. 0. 0. 0.5 / 0. 0. 0. 1.", () => {
    const s = shown(snap(6));
    expect(s.values).toEqual(['0.5', '0.5', '0.5']);
    expect(s.table.slice(1)).toEqual([['1', 'p', '0', '-π/2', 'd*1', '-π/2'], ['2', 'p', '0', 'π/2', 'd*2', '-π/2'], ['3', 'p', '0', '0', 'd*3', '0']]);
    expect(s.H).toBe('0. 1. 0. 0.5 / 0. 0. 1. 0.5 / 1. 0. 0. 0.5 / 0. 0. 0. 1.');
  });

  it('arm configurations: fixed framing, the ground disc is 716 px wide in all five pictures (camera model 719 px)', () => {
    // pictures 2–6 (measured on the snapshots, 2 px per pt): 716 px; the framing does not depend on the robot
    const w = groundWidthPt(fixedCamera());
    expect(Math.abs(w * 2 / 716 - 1)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(w - 359.6)).toBeLessThan(1);
    for (const k of [2, 3, 4, 5, 6]) expect(evaluate(snap(k)).box).toEqual([[-3, 3], [-3, 3], [-3, 3]]);
  });
});

// ------------------------------------------------------------------------------------------- Mathematica harness
/** a scenario value → a port joint value (the slider-grid reset is front-end behaviour; scenarios set params) */
function paramOf(raw, prismatic) {
  if (raw && typeof raw === 'object' && 'text' in raw) return raw.isReal ? machine(Number(raw.text)) : exactInt(Number(raw.text));
  const w = String(raw).replace(/^wl:/, '').replace(/\s/g, '');
  if (w === '0') return exactInt(0);
  let m = w.match(/^(-?)(\d*)\*?Pi(?:\/(\d+))?$/);
  if (m) return piValue(((m[2] === '' ? 1 : Number(m[2])) * (m[1] ? -1 : 1) * 32) / (m[3] ? Number(m[3]) : 1));
  m = w.match(/^(-?\d+)\/(\d+)$/);
  if (m && prismatic) return fracValue((Number(m[1]) * 20) / Number(m[2]));
  if (/^-?\d*\.\d*$/.test(w)) return machine(Number(w));
  throw new Error(`param ${raw}`);
}
/** "wl:ReplacePart[ConstantArray[0,20],{2->3 Pi/8,3->Pi/4}]" / "wl:Join[{…} Pi/32, ConstantArray[0,14]]" → params */
function paramsOf(raw, types) {
  const w = String(raw).replace(/^wl:/, '');
  const params = Array.from({ length: 20 }, () => exactInt(0));
  const pr = (i) => i < types.length && types[i] === 'p';
  let m = w.match(/^ReplacePart\[ConstantArray\[0,20\],\{?(.*?)\}?\]$/);
  if (m) {
    for (const rule of m[1].split(',')) {
      const [i, val] = rule.split('->');
      params[Number(i) - 1] = paramOf(val.trim(), pr(Number(i) - 1));
    }
    return params;
  }
  m = w.match(/^Join\[\{(.*?)\}\s*Pi\/32,/);
  if (m) { m[1].split(',').forEach((n, i) => { params[i] = piValue(Number(n)); }); return params; }
  throw new Error(`params ${raw}`);
}
/** the DHParameters of a scenario → the robot index (matched by joint types and the first numeric rows) */
function robotOf(raw) {
  const w = String(raw).replace(/^wl:/, '').replace(/\s/g, '');
  const types = [...w.matchAll(/"([rp])"/g)].map((x) => x[1]);
  const cands = ROBOTS.map((R, i) => [R, i]).filter(([R]) => R.jointtype.join('') === types.join(''));
  if (cands.length !== 1) throw new Error(`robot ${raw}`);
  return cands[0][1];
}
function replay(scenario) {
  let st = initialState();
  const runs = [];
  for (const step of scenario.steps) {
    if (step.setFrom) st = stateFromSettings(fx.snapshots[Number(String(step.setFrom).split(':')[1])]);
    else {
      const set = step.set ?? {};
      if (set.DHParameters) { st.robot = robotOf(set.DHParameters); st.dof = ROBOTS[st.robot].jointtype.length; }
      if (set.params) st.params = paramsOf(set.params, ROBOTS[st.robot].jointtype);
    }
    runs.push({ st: JSON.parse(JSON.stringify(st)), view: evaluate(st) });
  }
  return runs;
}
/** a captured TransformationFunction or matrix → 4x4 numbers */
const matrixOf = (rec) => {
  const v = toJS(rec);
  if (Array.isArray(v)) return v;
  if (v && v.h === 'TransformationFunction') return v.a[0]; // HW-45 compound encoding {"h": head, "a": args}
  throw new Error(`not a transform: ${JSON.stringify(v).slice(0, 80)}`);
};
const closeM = (A, B, tol, what) => A.forEach((r, i) => r.forEach((x, j) => expect(Math.abs(x - B[i][j]), `${what}[${i}][${j}]`).toBeLessThanOrEqual(tol)));
/** Precision of a captured entry: 'machine' (MachinePrecision) or 'exact' (Infinity) */
const precisionKind = (p) => {
  const v = toJS(p);
  if (v && v.sym === 'Infinity') return 'exact';
  if ((v && v.sym === 'MachinePrecision') || (typeof v === 'number' && Math.abs(v - 15.954589770191003) < 1e-9)) return 'machine';
  return 'other';
};

/** a recorded matrix entry: its double and whether it is a machine real (HW-45: exact numbers are {"wl", "n"}) */
const entryOf = (e) => ({ d: exactDouble(e), machine: isMachineReal(e) });
/**
 * Td entries against the record: machine entries bit for bit (Mathematica's packed Dot, mul4Fma), exact entries
 * (the port computes them in doubles, D-AC-05) within 1e-15; the port's kind ('machine' or exact) as recorded.
 */
function sameTd(rec, port, kinds, what) {
  rec.forEach((row, i) => row.forEach((e, j) => {
    const r = entryOf(e);
    expect(kinds[i][j] === 'machine', `${what}[${i + 1},${j + 1}] machine?`).toBe(r.machine);
    if (r.machine) expect(sameDouble(port[i][j], r.d), `${what}[${i + 1},${j + 1}] ${port[i][j]} vs ${r.d}`).toBe(true);
    else expect(Math.abs(port[i][j] - r.d), `${what}[${i + 1},${j + 1}]`).toBeLessThanOrEqual(1e-15);
  }));
}
/** the 4 x 4 grid of number strings of the recorded ToBoxes[MatrixForm[N[Chop[Td[dof]], 2]]] ("-" RowBoxes joined) */
function boxGrid(rec) {
  const txt = (b) => (typeof b === 'string' ? b : b.h === 'RowBox' ? b.a[0].map(txt).join('') : JSON.stringify(b));
  const outer = rec.a[0]; // TagBox[RowBox[{"TransformationFunction", "[", RowBox[{"(", TagBox[GridBox[…], …], ")"}], "]"}], …]
  expect(outer.a[0][0]).toBe('TransformationFunction');
  const grid = outer.a[0][2].a[0][1].a[0];
  expect(grid.h).toBe('GridBox');
  return grid.a[0].map((row) => row.map(txt));
}
/**
 * What the front end shows for a number box string (independent of the port, R-16): a machine real "x`" with six
 * significant digits, trailing zeros dropped, the point kept ("0.`" -> "0.", "0.0980171403295606`" -> "0.0980171");
 * a precision-2 real "x`2." with two significant digits ("1.`2." -> "1.0"); an integer as written. null when the
 * digits alone do not decide it (a two-digit tie such as "2.35`2.", K-AC-04, or another precision, P-AC-01).
 */
function shownText(box) {
  if (/^-?\d+$/.test(box)) return box;
  let m = box.match(/^(-?[\d.]+)`$/);
  if (m) {
    const x = Number(m[1]);
    if (x !== 0 && Math.abs(x) < 1e-5) return null;
    let t = x.toPrecision(6);
    if (t.includes('e')) return null;
    t = t.replace(/0+$/, '');
    return t;
  }
  m = box.match(/^(-?)(\d+)\.(\d*)`2\.$/);
  if (m) {
    const digits = (m[2] + m[3]).replace(/^0+/, '');
    if (digits.length > 2 && digits.slice(2) === '5') return null; // a decimal tie: the front end's rounding decides
    return Number(`${m[1]}${m[2]}.${m[3]}`).toPrecision(2);
  }
  return null;
}

function check(ctx, id, extra = () => {}) {
  const h = harnessCase('arm-configurations', id);
  if (h.status !== 'ok') return ctx.skip(h.reason);
  const runs = replay(h.scenario);
  const last = runs[runs.length - 1].view;
  for (const name of h.scenario.capture) {
    if (name === 'dof') expect(toJS(captureOf(h.record, name))).toBe(last.dof);
    if (name === 'wl:Table[Td[i],{i,1,dof}]') captureOf(h.record, name).forEach((T, i) => { expect(T.h).toBe('TransformationFunction'); sameTd(T.a[0], last.Td[i], last.TdKinds[i], `Td[${i + 1}]`); });
    if (name === 'wl:Td[dof]') { const T = captureOf(h.record, name); expect(T.h).toBe('TransformationFunction'); sameTd(T.a[0], last.H, last.HKinds, 'Td[dof]'); }
    if (name === 'wl:ToBoxes[MatrixForm[N[Chop[Td[dof]],2]]]') {
      const grid = boxGrid(captureOf(h.record, name));
      let compared = 0;
      grid.forEach((row, i) => row.forEach((b, j) => {
        const want = shownText(b);
        if (want !== null) { compared++; expect(ascii(last.hStrings[i][j]), `H[${i + 1},${j + 1}] (box ${b})`).toBe(want); }
      }));
      expect(compared, 'entries decided by the boxes').toBeGreaterThanOrEqual(id === 'H-AC-10' ? 8 : 15);
    }
    if (name === 'wl:Map[Precision, First[Td[dof]], {2}]') {
      const P = toJS(captureOf(h.record, name));
      P.forEach((row, i) => row.forEach((p, j) => {
        const k = last.HKinds[i][j] === 'machine' ? 'machine' : 'exact';
        expect(precisionKind(p), `Precision H[${i + 1},${j + 1}]`).toBe(k);
      }));
    }
    if (name === 'wl:N[Chop[Td[dof]],2]') closeM(last.H, matrixOf(captureOf(h.record, name)), 0.01, 'N[H, 2]');
    if (name === '%g3d') {
      // the Column's Graphics3D: Cuboids, Cylinders and Lines bit for bit (K-AC-10: -1+d-jr-.01 in written order)
      const [g] = captureOf(h.record, name);
      expect(g.h).toBe('Graphics3D');
      expect(g3dPrimitiveDifferences(g.a[0], last.graphic.content).differences).toEqual([]);
    }
    if (name === '%plotRange') {
      // %plotRange is one record per graphic: {head, value, method, tried, storedOption} (HW-50)
      const recs = captureOf(h.record, name);
      expect(recs.map((r) => r.head)).toEqual(['Graphics3D']);
      closeM(last.box, toJS(recs[0].value), 0, 'PlotRange');
    }
  }
  extra(runs, h, last);
  return undefined;
}

describe('arm-configurations golden: Mathematica harness records', () => {
  it('every harness scenario replays through the port (its inputs are understood)', () => {
    const file = JSON.parse(fs.readFileSync('tests/harness/arm-configurations.scenarios.json', 'utf8'));
    expect(file.scenarios).toHaveLength(18);
    const lex = parseLexical(fs.readFileSync('tests/harness/arm-configurations.scenarios.json', 'utf8'));
    const robotsAt = {};
    for (const sc of lex.scenarios) {
      const runs = replay(sc);
      robotsAt[sc.id] = ROBOTS[runs[runs.length - 1].st.robot].name;
    }
    expect(robotsAt['H-AC-04']).toBe('Stanford robot');
    expect(robotsAt['H-AC-08']).toBe('Cartesian robot');
    expect(robotsAt['H-AC-13']).toBe('cylindrical robot');
    // H-AC-13: z = 1 + 27/20 = 47/20 (exact), H-AC-17: z = 3.5
    const r13 = replay(lex.scenarios.find((s) => s.id === 'H-AC-13'));
    expect(r13[0].view.H[2][3]).toBeCloseTo(2.35, 14);
    expect(r13[0].view.hStrings[2][3]).toBe('2.4'); // the port's two-digit rounding of the double 2.35000000000000009 (K-AC-04)
    const r11 = replay(lex.scenarios.find((s) => s.id === 'H-AC-11'));
    expect(r11[0].st.params.slice(0, 6).map((p) => p.pi)).toEqual([-11, -27, 19, 0, -8, 8]);
  });
  // one test per scenario, titled harness "H-AC-nn" (HW-65); they skip until tests/golden/arm-configurations.harness.json exists
  it('harness "H-AC-01"', (ctx) => check(ctx, 'H-AC-01'));
  it('harness "H-AC-02"', (ctx) => check(ctx, 'H-AC-02'));
  it('harness "H-AC-03"', (ctx) => check(ctx, 'H-AC-03'));
  it('harness "H-AC-04"', (ctx) => check(ctx, 'H-AC-04'));
  it('harness "H-AC-05"', (ctx) => check(ctx, 'H-AC-05'));
  it('harness "H-AC-06"', (ctx) => check(ctx, 'H-AC-06'));
  it('harness "H-AC-07"', (ctx) => check(ctx, 'H-AC-07'));
  it('harness "H-AC-08"', (ctx) => check(ctx, 'H-AC-08'));
  it('harness "H-AC-09"', (ctx) => check(ctx, 'H-AC-09'));
  it('harness "H-AC-10"', (ctx) => check(ctx, 'H-AC-10', (runs, h, last) => {
    // RECORDED DIFFERENCE (P-AC-01, K-AC-03): N[Chop[Td[dof]], 2] of this exact H does not give two-digit numbers in
    // 15.0.1: N cannot certify the unsimplified zero H[1,4] (N::meprec, $MaxExtraPrecision = 50) and every
    // non-integer entry comes back with precision ≈ 51 (shown with ~51 digits), the zero as 0``51.41 (accuracy 51.4).
    // The port shows two-digit entries and "0" there; matching is proposal P-AC-01.
    const grid = boxGrid(captureOf(h.record, 'wl:ToBoxes[MatrixForm[N[Chop[Td[dof]],2]]]'));
    expect(grid[0][3]).toBe('0``51.41433341922468');
    expect(grid[0][0]).toMatch(/^-0\.38268343236508977\d+`51\.0878212339189$/);
    expect(grid[1][2]).toBe('-1.`52.');
    expect(captureOf(h.record, '%messages').map((m) => m.name)).toEqual(['N::meprec']);
    expect(ascii(last.hStrings[0][3])).toBe('0');
    expect(last.hStrings.map((r) => r.map(ascii))).toEqual([['-0.38', '-0.92', '0', '0'], ['0', '0', '-1.0', '0'], ['0.92', '-0.38', '0', '2.8'], ['0', '0', '0', '1.0']]);
  }));
  it('harness "H-AC-11"', (ctx) => check(ctx, 'H-AC-11'));
  it('harness "H-AC-12"', (ctx) => check(ctx, 'H-AC-12', (runs, h, last) => {
    expect(last.HKinds.flat().includes('machine')).toBe(false); // exact two-digit display (Q-AC-06)
  }));
  it('harness "H-AC-13"', (ctx) => check(ctx, 'H-AC-13', (runs, h, last) => {
    // K-AC-04 stays open: the kernel's box is "2.35`2." (N[47/20, 2]); which of "2.3"/"2.4" the front end draws for it
    // is front-end formatting the record does not contain (manual check M-AC-07). The port shows "2.4".
    expect(boxGrid(captureOf(h.record, 'wl:ToBoxes[MatrixForm[N[Chop[Td[dof]],2]]]'))[2][3]).toBe('2.35`2.');
    expect(ascii(last.hStrings[2][3])).toBe('2.4');
  }));
  it('harness "H-AC-14"', (ctx) => check(ctx, 'H-AC-14', (runs, h) => {
    // K-AC-01: Chop leaves a TransformationFunction unchanged (the port does not chop Td)
    // K-AC-01 resolved: Chop DOES act inside a TransformationFunction (1.*^-17 -> 0), and the matrix stays machine (0.)
    const c = captureOf(h.record, 'wl:Chop[TransformationFunction[{{1.,0.,0.,1.*^-17},{0.,1.,0.,0.},{0.,0.,1.,0.},{0.,0.,0.,1.}}]]');
    expect(c.h).toBe('TransformationFunction');
    expect(isMachineReal(c.a[0][0][3]) && exactDouble(c.a[0][0][3]) === 0).toBe(true);
    expect(captureOf(h.record, 'wl:Chop[Td[dof]] === Td[dof]')).toBe(true); // True is JSON true (HW-45); nothing to chop here
  }));
  it('harness "H-AC-15"', (ctx) => check(ctx, 'H-AC-15', (runs) => {
    expect(runs[0].view.parts[2]).toEqual([]);
  }));
  it('harness "H-AC-16"', (ctx) => check(ctx, 'H-AC-16'));
  it('harness "H-AC-17"', (ctx) => check(ctx, 'H-AC-17', (runs, h, last) => {
    expect(origin(last.H)[2]).toBeCloseTo(3.5, 15);
  }));
  it('harness "H-AC-18"', (ctx) => check(ctx, 'H-AC-18'));
});
