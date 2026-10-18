// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Lillian Lin
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/two-link-kinematics.golden.test.js — the port against values the ORIGINAL computed:
//  * the saved state (states[0]) and the four snapshot cells' Settings in tests/golden/two-link-kinematics.original-states.json
//    (written by `python tools/extract_state.py --snapshots <notebook> …`; raw notebook lines 3580, 5050, 6589, 8110);
//  * the drawing of snapshot 1 where Settings cannot hold it (docs/original-snapshots/two-link-kinematics-1.png);
//  * the Mathematica-harness records H-TK-01 … H-TK-24 (tests/golden/two-link-kinematics.harness.json, read through
//    tests/support/harness-json.js). These SKIP with the documented reason until the owner's harness run exists.
import { describe, it, expect } from 'vitest';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import { harnessCase, captureOf, stepRecord, toJS } from '../support/harness-json.js';
import {
  INITIAL, initialState, cloneState, evaluate, scene, VAR_NAMES, svd2, pseudoInverse2, matMul,
} from '../../demos/two-link-kinematics/model.js';
import { matrixRank } from '../../demos/robot-singularities/svd3.js';
import { normalizeCR } from '../../shared/mma-extra.js';

const FIXTURE = 'tests/golden/two-link-kinematics.original-states.json';
const fx = loadStates(FIXTURE);
const live = plain(fx.live), specs = plain(fx.specs);
const snap = (k) => plain(fx.snapshots[k - 1]);
const ulps = (a, b) => (a === b ? 0 : Math.abs(a - b) / (Number.EPSILON * Math.max(Math.abs(a), Math.abs(b))));
const withinUlps = (a, b, n, what) => expect(ulps(a, b), `${what}: ${a} vs ${b}`).toBeLessThanOrEqual(n);
const sameStateWithin = (a, b, n) => {
  for (const k of VAR_NAMES) {
    if (Array.isArray(a[k])) a[k].forEach((v, i) => withinUlps(v, b[k][i], n, `${k}[${i}]`));
    else expect(a[k], k).toBe(b[k]);
  }
};

describe('two-link-kinematics golden: saved state and snapshots', () => {
  it('two-link-kinematics: the initial settings in the fixture are the port\'s INITIAL', () => {
    expect(specs).toEqual({ ...INITIAL });
  });
  it('two-link-kinematics: evaluating the initial values once gives the saved state', () => {
    const r = evaluate(initialState());
    expect(r.locals.kinematics).toBe('FK');
    expect(r.locals.velocity).toBe('inverse'); // pVelp {1, 1} != pVel {2, 1} (Q-TK-01)
    expect(r.locals.velocityBranch).toBe('singular'); // J = {{0, 0}, {2, 1}}
    // every variable exactly; jointVel {Rational[2, 5], Rational[1, 5]} as the nearest doubles (D-TK-01)
    for (const k of VAR_NAMES) expect(r.state[k], k).toEqual(live[k]);
    expect(fx.live.jointVel.map((v) => v.wl)).toEqual(['2/5', '1/5']);
  });
  it('two-link-kinematics: evaluating the saved state again changes nothing', () => {
    const r = evaluate(live);
    expect([r.locals.kinematics, r.locals.velocity]).toEqual(['FK', 'forward']);
    for (const k of VAR_NAMES) expect(r.state[k], k).toEqual(live[k]); // J (0.4, 0.2) + (2, 0) = (2, 1) exactly
    expect(snap(1)).toEqual(live); // snapshot 1 = the saved state
  });
  it('two-link-kinematics: snapshot 1 shows blue axis arrows of length sqrt 5 and no pink ellipse', () => {
    // snapshot 1 picture: light-blue arrow pixels at x = 2 reach y = +2.228 and −2.228 (±0.015); no light-red pixels
    const r = evaluate(live);
    const sc = scene(r.state, r.locals);
    expect(sc.some((d) => d.kind === 'ellipse')).toBe(false); // MatrixRank[Σ] = 1
    const tips = ['sigma1-plus', 'sigma1-minus'].map((role) => sc.find((d) => d.role === role).to).sort((a, b) => b[1] - a[1]);
    expect(tips[0][0]).toBe(2);
    expect(tips[1][0]).toBe(2);
    withinUlps(tips[0][1], 2.2360679774997896, 2, 'top tip');
    withinUlps(tips[1][1], -2.2360679774997896, 2, 'bottom tip');
    expect(Math.abs(tips[0][1] - 2.228)).toBeLessThan(0.015 + 0.01);
    for (const role of ['sigma2-plus', 'sigma2-minus']) expect(sc.find((d) => d.role === role).to).toEqual([2, 0]); // length 0
  });
  it('two-link-kinematics: snapshot 2 Settings: the singular branch with the cap gives jointVel = v1', () => {
    const s = snap(2);
    // the evidence the Settings hold: ‖pVel − pEnd‖ = Σ11 = √5 and jointVel = v1 = (2, 1)/√5 (J exactly singular)
    withinUlps(Math.hypot(s.pVel[0] - s.pEnd[0], s.pVel[1] - s.pEnd[1]), 2.2360679774997885, 4, '|pVel - pEnd|');
    withinUlps(s.jointVel[0], 2 / Math.sqrt(5), 2, 'v1x');
    withinUlps(s.jointVel[1], 1 / Math.sqrt(5), 2, 'v1y');
    withinUlps(Math.hypot(...s.jointVel), 1, 4, '|jointVel|');
    // the port reaches the same jointVel from that pVel through its singular branch (J⁺ = Jᵀ/‖J‖²_F)
    const r = evaluate({ ...s, pVelp: [0, 0] });
    expect(r.locals.velocityBranch).toBe('singular');
    r.state.jointVel.forEach((v, i) => withinUlps(v, s.jointVel[i], 2, `jointVel[${i}]`));
    // one evaluate of the Settings: FK, forward velocity, every variable unchanged within 1 ulp
    const f = evaluate(s);
    expect([f.locals.kinematics, f.locals.velocity]).toEqual(['FK', 'forward']);
    sameStateWithin(f.state, s, 1);
    // REGRESSION PIN (not from the original): the port's own value today; the saved pVel[1] is matched within 1 ulp above
    expect(f.state.pVel[1]).toBe(-1.6139931569274149);
  });
  it('two-link-kinematics: snapshot 3 Settings are a fixed point and show the near-singular squash', () => {
    const s = snap(3);
    const r = evaluate(s);
    expect([r.locals.kinematics, r.locals.velocity]).toEqual(['FK', 'forward']);
    expect(r.locals.Theta2).toBe(Math.PI);
    expect(r.state.pEnd).toEqual(s.pEnd); // the tip of p1, p2 is the saved pEnd exactly
    r.state.pVel.forEach((v, i) => withinUlps(v, s.pVel[i], 1, `pVel[${i}]`));
    sameStateWithin(r.state, s, 1);
    const hole = scene(r.state, r.locals).find((d) => d.role === 'hole');
    withinUlps(hole.r, 1.18, 4, 'hole radius'); // abs(1.59 − 0.41); picture: 159 px = 1.19 ± 0.015 at 133.3 px/unit
    // recorded evidence of Q-TK-04 (inverse velocity just above the SVD tolerance in an earlier update)
    expect(Math.hypot(s.pVel[0] - s.pEnd[0], s.pVel[1] - s.pEnd[1])).toBeCloseTo(2.9287693743556824e-7, 20);
    expect(Math.hypot(...s.jointVel)).toBeCloseTo(1.0000000086469834, 15);
  });
  it('two-link-kinematics: snapshot 4 Settings (r1 = 2.) are a forward-velocity fixed point', () => {
    const s = snap(4);
    const r = evaluate(s);
    expect([r.locals.kinematics, r.locals.velocity]).toEqual(['FK', 'forward']);
    r.state.pEnd.forEach((v, i) => withinUlps(v, 2 * s.p1[i], 1, `pEnd[${i}] = 2 p1`));
    r.state.pEnd.forEach((v, i) => withinUlps(v, s.pEnd[i], 1, `pEnd[${i}]`));
    // pVel x = −1.364… + 1.041… cancels: the draft's "within 1 ulp" holds for the summands, not for the small sum
    // (port −0.3231340149497999 vs saved −0.32313401494979965, 3 ulps of the sum, 0.8 ulp of |pEnd x|; N-TK-08)
    r.state.pVel.forEach((v, i) => expect(Math.abs(v - s.pVel[i]), `pVel[${i}]`).toBeLessThanOrEqual(Number.EPSILON * Math.abs(s.pEnd[i])));
    withinUlps(r.locals.S[0], 2, 1, 'Σ11');
    expect(r.locals.S[1]).toBe(0); // set to 0 by the SVD tolerance
    const sc = scene(r.state, r.locals);
    const hole = sc.find((d) => d.role === 'hole');
    expect(hole.r).toBe(2); // white disk of radius 2: no light-blue area
    expect(sc.find((d) => d.role === 'robot-arm').rotate.about).toEqual([0, 0]); // "Robot Arm" on link 1 (r2 = 0 < 1)
  });
});

// ------------------------------------------------------------------------------------------- Mathematica harness
// Replay of a scenario through the port: start state (initial settings or the live state), then each step.
function replay(scenario) {
  let state = scenario.start === 'live' ? cloneState(live) : initialState();
  const out = [];
  for (const st of scenario.steps) {
    let r;
    if (st.setFrom) r = evaluate(snap(Number(String(st.setFrom).split(':')[1])));
    else r = evaluate({ ...state, ...toJS(st.set) });
    if (!r.indeterminate) state = r.state;
    out.push({ ...r, state: r.indeterminate ? state : r.state });
  }
  return out;
}
const SIGMA = '\\[CapitalSigma]';
const portValue = (r, name) => {
  if (VAR_NAMES.includes(name)) return r.state[name];
  if (name === SIGMA) return r.locals.Sigma;
  if (['Theta1', 'Theta2', 'r2', 'J', 'vNorm'].includes(name)) return r.locals[name];
  return undefined; // U, V, q (signs arbitrary, D-TK-03), %g, %messages, wl: … — compared case by case
};
const asJS = (v) => {
  const x = toJS(v);
  if (x && typeof x === 'object' && !Array.isArray(x) && 'sym' in x) return x.sym === 'True' ? true : x.sym === 'False' ? false : x;
  return x;
};
/** recorded vs port: booleans equal, numbers within n ulps (absolute 4e-16 near zero, K-TK-08) */
function expectClose(rec, port, what, n = 4) {
  const a = asJS(rec);
  if (typeof a === 'boolean' || typeof port === 'boolean') { expect(port, what).toBe(a); return; }
  if (Array.isArray(a)) { expect(Array.isArray(port), what).toBe(true); a.forEach((v, i) => expectClose(v, port[i], `${what}[${i}]`, n)); return; }
  if (typeof a === 'number') {
    if (Math.abs(a) < 1e-15 || Math.abs(port) < 1e-15) expect(Math.abs(a - port), what).toBeLessThanOrEqual(4e-16);
    else withinUlps(port, a, n, what);
    return;
  }
  throw new Error(`${what}: cannot compare ${JSON.stringify(a)}`);
}
function compareRecord(h, { bits = [] } = {}) {
  const runs = replay(h.scenario);
  const each = h.scenario.captureEachStep;
  for (const name of h.scenario.capture) {
    for (let k = each ? 1 : runs.length; k <= runs.length; k++) {
      const pv = portValue(runs[k - 1], name);
      if (pv === undefined || pv === null) continue; // not compared, or a local the step did not assign (vNorm)
      const rec = each ? captureOf(h.record, name, { step: k }) : captureOf(h.record, name);
      if (bits.includes(name)) expect(toJS(rec), `${name} bit for bit (K-TK-10)`).toEqual(pv);
      else expectClose(rec, pv, `${h.scenario.id} step ${k} ${name}`);
    }
  }
  return runs;
}

describe('two-link-kinematics golden: Mathematica harness records', () => {
  const plainCase = (id, extra = () => {}, opts) => (ctx) => {
    const h = harnessCase('two-link-kinematics', id);
    if (h.status !== 'ok') return ctx.skip(h.reason);
    const runs = compareRecord(h, opts);
    extra(runs, h);
  };
  it('two-link-kinematics: harness H-TK-01 (first evaluation of the initial settings, then the fixed point)', plainCase('H-TK-01', (runs) => {
    expect(runs[0].locals.velocityBranch).toBe('singular');
    expect(runs[0].state.jointVel).toEqual([0.4, 0.2]);
  }));
  it('two-link-kinematics: harness H-TK-02 (IK at D = 0, then one more evaluation)', plainCase('H-TK-02', (runs) => {
    expect(runs[0].locals.kinematics).toBe('IK');
    expect(runs[1].locals.kinematics).toBe('FK');
  }));
  it('two-link-kinematics: harness H-TK-03 (the check box starts IK with the other root)', plainCase('H-TK-03'));
  it('two-link-kinematics: harness H-TK-04 (outer clamp, exact theta2 = 0)', plainCase('H-TK-04', (runs) => expect(runs[0].locals.Theta2).toBe(0)));
  it('two-link-kinematics: harness H-TK-05 (inverse velocity on the outer boundary, singular branch)', plainCase('H-TK-05'));
  it('two-link-kinematics: harness H-TK-06 (inner boundary with elbow up, K-TK-03)', plainCase('H-TK-06'));
  it('two-link-kinematics: harness H-TK-07 (inner boundary with elbow down)', plainCase('H-TK-07'));
  it('two-link-kinematics: harness H-TK-08 (FK from a dial value)', plainCase('H-TK-08'));
  it('two-link-kinematics: harness H-TK-09 (folded arm, then an r1 change pushes the tip out of the hole)', plainCase('H-TK-09'));
  it('two-link-kinematics: harness H-TK-10 (r2 = 0)', plainCase('H-TK-10'));
  it('two-link-kinematics: harness H-TK-11 (r1 = 0)', plainCase('H-TK-11'));
  it('two-link-kinematics: harness H-TK-12 (pEnd at the origin: Indeterminate, decides D-TK-07)', (ctx) => {
    const h = harnessCase('two-link-kinematics', 'H-TK-12');
    if (h.status !== 'ok') return ctx.skip(h.reason);
    // the port ignores the update (D-TK-07); the record shows what Mathematica did instead (messages expected)
    expect(replay(h.scenario)[0].indeterminate).toBe(true);
    expect(JSON.stringify(captureOf(h.record, '%messages'))).toMatch(/Indeterminate|Power::infy|Infinity::indet/);
  });
  it('two-link-kinematics: harness H-TK-13 (a dial press exactly at its centre: ArcTan[0., 0.])', (ctx) => {
    const h = harnessCase('two-link-kinematics', 'H-TK-13');
    if (h.status !== 'ok') return ctx.skip(h.reason);
    expect(JSON.stringify(captureOf(h.record, '%messages'))).toMatch(/ArcTan::indet|Indeterminate/);
  });
  it('two-link-kinematics: harness H-TK-14 (inverse velocity inside the ellipse; jointVel bit for bit)', plainCase('H-TK-14', () => {}, { bits: ['jointVel'] }));
  it('two-link-kinematics: harness H-TK-15 (inverse velocity outside the ellipse; jointVel bit for bit)', plainCase('H-TK-15', () => {}, { bits: ['jointVel'] }));
  it('two-link-kinematics: harness H-TK-16 (forward velocity from the pad)', plainCase('H-TK-16'));
  it('two-link-kinematics: harness H-TK-17 (zero joint velocities: Points instead of arc arrows)', plainCase('H-TK-17', (runs) => {
    const r = runs[0];
    const kinds = scene(r.state, r.locals).filter((d) => d.kind === 'arc').map((d) => d.data.kind);
    expect(kinds).toEqual(['Point', 'Point', 'Point', 'Point']);
  }));
  it('two-link-kinematics: harness H-TK-18 (straight arm with r1 = 1.5: the SVD tolerance decides the branch)', plainCase('H-TK-18'));
  it('two-link-kinematics: harness H-TK-19 (folded arm: singular branch predicted)', plainCase('H-TK-19'));
  it('two-link-kinematics: harness H-TK-20 (typed r1 = 2.5, decides D-TK-05 / K-TK-09)', plainCase('H-TK-20'));
  it('two-link-kinematics: harness H-TK-21 (elbow toggle with the arm straight)', plainCase('H-TK-21'));
  it('two-link-kinematics: harness H-TK-22 (velocity arcs with 12 B-spline control points)', plainCase('H-TK-22', (runs) => {
    const r = runs[0];
    const arcs = scene(r.state, r.locals).filter((d) => d.role === 'jointVel1' || d.role === 'jointVel2');
    for (const a of arcs) expect(a.data.control).toHaveLength(12);
  }));
  it('two-link-kinematics: harness H-TK-23 (SVD, PseudoInverse, MatrixRank, Dot order and Normalize)', (ctx) => {
    const h = harnessCase('two-link-kinematics', 'H-TK-23');
    if (h.status !== 'ok') return ctx.skip(h.reason);
    const cap = (i) => asJS(stepRecord(h.record, 1).capture?.[h.scenario.capture[i]] ?? captureOf(h.record, h.scenario.capture[i]));
    const sv1 = cap(0), sv2 = cap(1);
    expect(sv1[1][1][1]).toBe(svd2([[1, 0], [1, 1e-14]]).S[1]); // exactly 0 (K-TK-01)
    expectClose(sv2[1][1][1], svd2([[1, 0], [1, 1e-13]]).S[1], 'Σ22 kept');
    expectClose(cap(2), pseudoInverse2([[1, 0], [1, 1e-14]]), 'PseudoInverse');
    expect(cap(3)).toEqual([matrixRank([1, 1e-14]), matrixRank([1, 1e-13])]);
    const a = [[0.3, 0.7], [-0.2, 0.9]], b = [[1.1, 0], [0, 3.7]], c = [[0.6, -0.8], [0.8, 0.6]], d = [0.123, -0.456];
    const m = matMul(matMul(a, b), c);
    expect(cap(4)[0]).toEqual([m[0][0] * d[0] + m[0][1] * d[1], m[1][0] * d[0] + m[1][1] * d[1]]); // left to right (K-TK-10)
    expect(cap(5)).toEqual([[3, 4.1], [-0.7, 0.31], [1e-3, 2.5]].map(normalizeCR)); // K-TK-11
  });
  it('two-link-kinematics: harness H-TK-24 (snapshot Settings re-evaluated are fixed points)', plainCase('H-TK-24'));
});
