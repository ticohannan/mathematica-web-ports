// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/dh-parameters.golden.test.js — the port against values the ORIGINAL stored or drew:
//  * the live state (states[0], raw notebook line 809), the initial settings (specs, line 868) and the five snapshot
//    cells' Settings (lines 2748, 4328, 5794, 7441, 8974) in tests/golden/dh-parameters.original-states.json (written by
//    `python3 tools/extract_state.py --snapshots <notebook> …`; read lexically, so 1.0 is a machine real and 1 exact);
//  * what only the pictures docs/original-snapshots/dh-parameters-1.png … -5.png show: the slider labels and the width
//    of the ground disc (pixels of the snapshots at 2 px per pt);
//  * the Mathematica-harness records H-DH-01 … H-DH-10 (tests/golden/dh-parameters.harness.json, read through
//    tests/support/harness-json.js). These SKIP with the documented reason until the owner's harness run exists.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { parseLexical } from '../../tools/lib/json-lexical.mjs';
import { harnessCase, captureOf, toJS, exactDouble, isMachineReal, sameDouble, g3dPrimitiveDifferences } from '../support/harness-json.js';
import {
  initialState, evaluate, stateFromSettings, fitCamera, groundWidthFraction, DH_ZOOM, angleOf,
} from '../../demos/dh-parameters/model.js';
import { drawGripper } from '../../demos/common/robot-draw.js';
import { flatten } from '../../shared/graphics3d.js';
import { piFraction } from '../../shared/mma-text.js';
import { mmaSliderText } from '../../shared/ui.js';

const fx = parseLexical(fs.readFileSync('tests/golden/dh-parameters.original-states.json', 'utf8'));
const snap = (k) => stateFromSettings(fx.snapshots[k]);
/** the 13 value fields as the port shows them, in the order of the controls (θ, d, r, α per joint, then grip) */
function labels(st) {
  const len = (v, exact) => mmaSliderText(v, { moved: !exact, realValues: true });
  const out = [];
  for (let i = 0; i < 3; i++) {
    out.push(piFraction(st.theta[i], 32), len(st.d[i], st.exact.d[i]), len(st.r[i], st.exact.r[i]), piFraction(st.alpha[i], 32));
  }
  out.push(len(st.g, st.exact.g));
  return out.map((s) => s.replace(/−/g, '-'));
}

describe('dh-parameters golden: saved state and snapshots', () => {
  it('dh parameters: the live state (= the initial settings) is the opening state of the port', () => {
    const live = stateFromSettings(fx.states[0]);
    expect(live).toEqual(initialState());
    expect(stateFromSettings(fx.specs)).toEqual(initialState());
    expect(snap(1)).toEqual(initialState());
    expect(fx.states[0]['θ1'].wl).toBe('5*Pi/32');
    expect(initialState().theta).toEqual([5, 8, -12]);
    expect(initialState().alpha).toEqual([16, 0, 0]);
  });
  it('dh parameters: the five snapshot Settings load as port states with exact θ and α and the stored machine d, r and g', () => {
    const want = {
      1: [[5, 8, -12], [16, 0, 0]], 2: [[-26, 7, 0], [0, 32, 0]], 3: [[-6, 0, 0], [0, -16, 0]],
      4: [[0, -9, -6], [0, 0, -16]], 5: [[5, 5, 27], [-16, 16, 0]],
    };
    for (const k of [1, 2, 3, 4, 5]) {
      const st = snap(k);
      expect([st.theta, st.alpha], `snapshot ${k}`).toEqual(want[k]);
      for (const v of [...st.theta, ...st.alpha]) expect(Number.isInteger(v)).toBe(true);
      // one evaluation changes nothing (the body assigns no Manipulate variable)
      const before = JSON.stringify(st);
      evaluate(st);
      expect(JSON.stringify(st)).toBe(before);
    }
    const s2 = snap(2);
    expect([s2.d[0], s2.r[0], s2.d[1], s2.d[2], s2.r[2], s2.g]).toEqual([1, 1, 0, 0.81, 0, 0.52]);
    expect([s2.exact.d, s2.exact.r, s2.exact.g]).toEqual([[false, false, false], [false, false, false], false]);
    expect(s2.j).toEqual(['Revolute', 'Revolute', 'Prismatic']);
  });
  it('dh parameters: snapshot 1 labels read 5π/32, 1, 0, π/2, π/4, 0, 1, 0, -3π/8, 0, 1, 0 and grip 1', () => {
    expect(labels(snap(1))).toEqual(['5π/32', '1', '0', 'π/2', 'π/4', '0', '1', '0', '-3π/8', '0', '1', '0', '1']);
    expect(snap(1).j).toEqual(['Revolute', 'Revolute', 'Revolute']);
  });
  it('dh parameters: snapshot 2 (SCARA) labels read -13π/16, 1., 1., 0, 7π/32, 0., 1., π, 0, 0.81, 0., 0 and grip 0.52 with j3 Prismatic', () => {
    expect(labels(snap(2))).toEqual(['-13π/16', '1.', '1.', '0', '7π/32', '0.', '1.', 'π', '0', '0.81', '0.', '0', '0.52']);
    expect(snap(2).j).toEqual(['Revolute', 'Revolute', 'Prismatic']);
    // r3 = 0.: the gripper points along z (palm in the x-z plane below z = 0)
    const palm = flatten(drawGripper(snap(2).g, snap(2).r[2])).filter((p) => p.type === 'cuboid')[0];
    expect([palm.min, palm.max]).toEqual([[-0.2, -0.05, -0.1], [0.2, 0.05, 0]]);
  });
  it('dh parameters: snapshot 3 (cylindrical) labels read -3π/16, 1., 0., 0, 0, 0.74, 0., -π/2, 0, 0.89, 0., 0 and grip 1 with j2 and j3 Prismatic', () => {
    expect(labels(snap(3))).toEqual(['-3π/16', '1.', '0.', '0', '0', '0.74', '0.', '-π/2', '0', '0.89', '0.', '0', '1']);
    expect(snap(3).j).toEqual(['Revolute', 'Prismatic', 'Prismatic']);
  });
  it('dh parameters: snapshot 4 (planar) labels read 0, 0., 0.8, 0, -9π/32, 0., 0.8, 0, -3π/16, 0., 0.5, -π/2 and grip 1', () => {
    expect(labels(snap(4))).toEqual(['0', '0.', '0.8', '0', '-9π/32', '0.', '0.8', '0', '-3π/16', '0.', '0.5', '-π/2', '1']);
    expect(snap(4).j).toEqual(['Revolute', 'Revolute', 'Revolute']);
  });
  it('dh parameters: snapshot 5 (spherical wrist) labels read 5π/32, 1, 0, -π/2, 5π/32, 0., 0., π/2, 27π/32, 0.77, 0., 0 and grip 0.49', () => {
    expect(labels(snap(5))).toEqual(['5π/32', '1', '0', '-π/2', '5π/32', '0.', '0.', 'π/2', '27π/32', '0.77', '0.', '0', '0.49']);
  });
  it('dh parameters: with one zoom fitted to the five snapshots the ground disc widths (347.5, 370.5, 349.5, 402.5, 345.5 pt) are reproduced within 4 %', () => {
    // snapshot pixels (2 px per pt): 695, 741, 699, 805, 691 px; ImageSize 425 pt
    const want = [347.5, 370.5, 349.5, 402.5, 345.5];
    const got = [1, 2, 3, 4, 5].map((k) => groundWidthFraction(fitCamera(evaluate(snap(k)).box, { zoom: DH_ZOOM })) * 425);
    got.forEach((w, i) => expect(Math.abs(w / want[i] - 1), `snapshot ${i + 1}: ${w.toFixed(1)} pt vs ${want[i]}`).toBeLessThanOrEqual(0.04));
    // calibrating on snapshot 1 alone leaves the flat planar arm (snapshot 4) more than 4 % too small (K-DH-03)
    let z = 1;
    const f1 = (zz) => groundWidthFraction(fitCamera(evaluate(snap(1)).box, { zoom: zz })) * 425;
    for (let lo = 1, hi = 2, it = 0; it < 60; it++) { z = (lo + hi) / 2; if (f1(z) < want[0]) lo = z; else hi = z; }
    const w4 = groundWidthFraction(fitCamera(evaluate(snap(4)).box, { zoom: z })) * 425;
    expect(w4 / want[3] - 1).toBeLessThan(-0.04);
  });
});

// ------------------------------------------------------------------------------------------- Mathematica harness
/** replay a scenario through the port (start: the initial settings); scenario values → port state */
function portSet(st, set) {
  const next = JSON.parse(JSON.stringify(st));
  for (const [k, raw] of Object.entries(set)) {
    const m = k.match(/^(j|θ|d|r|α|g)(\d?)$/);
    if (!m) throw new Error(`unknown variable ${k}`);
    const i = m[2] ? Number(m[2]) - 1 : null;
    if (m[1] === 'j') { next.j[i] = raw; continue; }
    if (m[1] === 'θ' || m[1] === 'α') {
      const w = String(raw).replace(/^wl:/, '').replace(/\s/g, '');
      const mm = w.match(/^(-?)(\d*)\*?Pi(?:\/(\d+))?$/);
      if (!mm) throw new Error(`angle ${raw}`);
      const n = ((mm[2] === '' ? 1 : Number(mm[2])) * (mm[1] ? -1 : 1) * 32) / (mm[3] ? Number(mm[3]) : 1);
      (m[1] === 'θ' ? next.theta : next.alpha)[i] = n;
      continue;
    }
    const exact = !raw.isReal;
    if (m[1] === 'g') { next.g = toJS(raw); next.exact.g = exact; } else { next[m[1]][i] = toJS(raw); next.exact[m[1]][i] = exact; }
  }
  return next;
}
function replay(scenario) {
  let st = initialState();
  const runs = [];
  for (const step of scenario.steps) {
    if (step.setFrom) st = stateFromSettings(fx.snapshots[Number(String(step.setFrom).split(':')[1])]);
    else st = portSet(st, step.set ?? {});
    runs.push({ st, view: evaluate(st) });
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
const boxOf = (rec) => toJS(rec);

/**
 * A recorded TransformationFunction against the port's matrix: machine entries bit for bit (the fused machine Dot,
 * F-DH-09), exact entries within 4e-16 (the port computes exact entries in doubles: D-DH-08).
 */
function sameT(rec, M, what) {
  expect(rec.h, what).toBe('TransformationFunction');
  rec.a[0].forEach((row, i) => row.forEach((e, j) => {
    if (isMachineReal(e)) expect(sameDouble(exactDouble(e), M[i][j]), `${what}[${i + 1},${j + 1}]: ${exactDouble(e)} vs ${M[i][j]}`).toBe(true);
    else expect(Math.abs(exactDouble(e) - M[i][j]), `${what}[${i + 1},${j + 1}] (exact ${e.wl ?? e})`).toBeLessThanOrEqual(4e-16);
  }));
}

function check(ctx, id, extra = () => {}) {
  const h = harnessCase('dh-parameters', id);
  if (h.status !== 'ok') return ctx.skip(h.reason);
  const runs = replay(h.scenario);
  const last = runs[runs.length - 1].view;
  for (const name of h.scenario.capture) {
    if (['T1', 'T2', 'T3'].includes(name)) sameT(captureOf(h.record, name), last[name], name);
    if (name === 'wl:T1.T2.T3') sameT(captureOf(h.record, name), last.T123, name);
    if (name === '%plotRange') {
      // one record per graphic {head, value, method, …} (HW-50): PlotRange -> All computed by the kernel = the bounds of
      // all primitives without padding, as the port's box (K-DH-03: the box is not the cause of the framing difference)
      const [pr] = captureOf(h.record, name);
      expect([pr.head, pr.method, toJS(pr.storedOption)]).toEqual(['Graphics3D', 'AbsoluteOptions', { sym: 'All' }]);
      closeM(last.box, boxOf(pr.value), id === 'H-DH-01' ? 4e-16 : 0, 'PlotRange'); // H-DH-01: exact bounds, D-DH-08
    }
    if (name === '%g3d') {
      const [g] = captureOf(h.record, name);
      expect(g.h).toBe('Graphics3D');
      expect(g3dPrimitiveDifferences(g.a[0], last.graphic.content).differences).toEqual([]);
    }
  }
  extra(runs, h);
  return undefined;
}

describe('dh-parameters golden: Mathematica harness records', () => {
  // one test per scenario, titled harness "H-DH-nn" (HW-65); they skip until tests/golden/dh-parameters.harness.json exists
  it('harness "H-DH-01"', (ctx) => check(ctx, 'H-DH-01'));
  it('harness "H-DH-02"', (ctx) => check(ctx, 'H-DH-02'));
  it('harness "H-DH-03"', (ctx) => check(ctx, 'H-DH-03'));
  it('harness "H-DH-04"', (ctx) => check(ctx, 'H-DH-04'));
  it('harness "H-DH-05"', (ctx) => check(ctx, 'H-DH-05'));
  it('harness "H-DH-06"', (ctx) => check(ctx, 'H-DH-06', (runs, h) => {
    // DrawGripper[g, r3] for r3 = 0, 0. and 0.01: the r != 0 branch only for 0.01
    runs.forEach((r, k) => {
      const palm = flatten(drawGripper(r.st.g, r.st.r[2])).filter((p) => p.type === 'cuboid')[0];
      expect(palm.min[2] === -0.2, `step ${k + 1}`).toBe(k === 2);
      expect(g3dPrimitiveDifferences(captureOf(h.record, 'wl:DrawGripper[g, r3]', { step: k + 1 }), drawGripper(r.st.g, r.st.r[2])).differences, `step ${k + 1}`).toEqual([]);
    });
  }));
  it('harness "H-DH-07"', (ctx) => check(ctx, 'H-DH-07'));
  it('harness "H-DH-08"', (ctx) => check(ctx, 'H-DH-08', (runs) => {
    // exact extreme angles: the port's transforms have exact 0 and ±1 where Mathematica's are exact
    const v = runs[0].view;
    expect(v.T1[2][1]).toBe(0); // sin(-π) exactly 0
    expect(angleOf(runs[0].st.theta[0])).toBe(Math.PI);
  }));
  it('harness "H-DH-09"', (ctx) => check(ctx, 'H-DH-09'));
  it('harness "H-DH-10"', (ctx) => check(ctx, 'H-DH-10', (runs, h) => {
    // finger cuboids for g = 0 and g = 1 (corner order as written, N-DH-06)
    runs.forEach((r, k) => expect(g3dPrimitiveDifferences(captureOf(h.record, 'wl:DrawGripper[g, r3]', { step: k + 1 }), drawGripper(r.st.g, r.st.r[2])).differences, `step ${k + 1}`).toEqual([]));
  }));
});
