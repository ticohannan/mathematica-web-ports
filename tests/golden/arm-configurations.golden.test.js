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
import { harnessCase, captureOf, toJS, isMachineReal } from '../support/harness-json.js';
import {
  ROBOTS, initialState, evaluate, stateFromSettings, valueText, fixedCamera, groundWidthPt, piValue, fracValue, exactInt,
  machine, origin,
} from '../../demos/arm-configurations/model.js';
import { dhTableRows, cellText } from '../../demos/arm-configurations/robots.js';
import { cuboidCorners } from '../../demos/common/g3d.js';
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
  if (v && v.head === 'TransformationFunction') return toJS(v.args[0]);
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

function check(ctx, id, extra = () => {}) {
  const h = harnessCase('arm-configurations', id);
  if (h.status !== 'ok') return ctx.skip(h.reason);
  const runs = replay(h.scenario);
  const last = runs[runs.length - 1].view;
  for (const name of h.scenario.capture) {
    if (name === 'dof') expect(toJS(captureOf(h.record, name))).toBe(last.dof);
    if (name === 'wl:Table[Td[i],{i,1,dof}]') toJS(captureOf(h.record, name)).forEach((T, i) => closeM(last.Td[i], matrixOf(T), 1e-15, `Td[${i + 1}]`));
    if (name === 'wl:Td[dof]') closeM(last.H, matrixOf(captureOf(h.record, name)), 1e-15, 'Td[dof]');
    if (name === 'wl:Map[Precision, First[Td[dof]], {2}]') {
      const P = toJS(captureOf(h.record, name));
      P.forEach((row, i) => row.forEach((p, j) => {
        const k = last.HKinds[i][j] === 'machine' ? 'machine' : 'exact';
        expect(precisionKind(p), `Precision H[${i + 1},${j + 1}]`).toBe(k);
      }));
    }
    if (name === 'wl:N[Chop[Td[dof]],2]') closeM(last.H, matrixOf(captureOf(h.record, name)), 0.01, 'N[H, 2]');
    if (name === '%plotRange') closeM(last.box, toJS(captureOf(h.record, name)), 1e-12, 'PlotRange');
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
  it('harness "H-AC-10"', (ctx) => check(ctx, 'H-AC-10'));
  it('harness "H-AC-11"', (ctx) => check(ctx, 'H-AC-11'));
  it('harness "H-AC-12"', (ctx) => check(ctx, 'H-AC-12', (runs, h, last) => {
    expect(last.HKinds.flat().includes('machine')).toBe(false); // exact two-digit display (Q-AC-06)
  }));
  it('harness "H-AC-13"', (ctx) => check(ctx, 'H-AC-13'));
  it('harness "H-AC-14"', (ctx) => check(ctx, 'H-AC-14', (runs, h) => {
    // K-AC-01: Chop leaves a TransformationFunction unchanged (the port does not chop Td)
    expect(toJS(captureOf(h.record, 'wl:Chop[Td[dof]] === Td[dof]'))).toEqual({ sym: 'True' });
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
