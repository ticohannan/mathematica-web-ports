// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/manipulability-ellipsoid.test.js — model of "Manipulability Ellipsoid of a Robot Arm" (TESTPLAN T-ME-01 …
// T-ME-23). Expected values are hand-derived, come from an independent formula written here (closed-form trigonometry,
// central differences, robot-singularities' own transcription of the other Demonstration) or are the NumPy values of the
// TESTPLAN — never the port's output.
import { describe, it, expect } from 'vitest';
import {
  JvRRRanthro, points, evaluate, settle, updateAngles, manipulability, robotContent, splineArcAngles, initialState,
  SOURCE_DEFAULTS, ZERO_TOL, unequalA, muText,
} from '../../demos/manipulability-ellipsoid/model.js';
import { cosPi, sinPi, cosSinPi } from '../../shared/exact-pi.js';
import { det } from '../../shared/mma-exact.js';
import { engineeringForm } from '../../shared/mma-extra.js';
import { svd3 } from '../../demos/common/svd3.js';
import { flatten, apply4 } from '../../demos/common/g3d.js';
import { DIAL_TABLE_32, nearest32Index, dialPointer, dialGraphics } from '../../demos/common/dial-control.js';
import { myJacob } from '../../demos/robot-singularities/robots.js';
import { createRng } from '../../shared/random.js';

const PI = Math.PI;
const ulps = (a, b) => (a === b ? 0 : Math.abs(a - b) / (Number.EPSILON * Math.max(Math.abs(a), Math.abs(b))));
const withinUlps = (a, b, n, what = '') => expect(ulps(a, b), `${what}: ${a} vs ${b}`).toBeLessThanOrEqual(n);
const close = (a, b, tol, what = '') => expect(Math.abs(a - b), `${what}: ${a} vs ${b}`).toBeLessThanOrEqual(tol);
const closeV = (a, b, tol, what = '') => b.forEach((v, i) => close(a[i], v, tol, `${what}[${i}]`));
const st = (k) => ({ k: k.slice(), kprev: k.slice(), m: k.map((x) => ((((x + 31) % 64) + 64) % 64) - 31) });
const col = (A, j) => A.map((r) => r[j]);
const machine = (k) => k.map((x) => ({ r: (x * PI) / 32 }));
/** closed-form oc of the source with machine trigonometry (independent of the port) */
const ocClosed = ([t1, t2, t3]) => {
  const a = Math.cos(t2) + Math.cos(t2 + t3);
  return [Math.cos(t1) * a, Math.sin(t1) * a, 2 + Math.sin(t2) + Math.sin(t2 + t3)];
};
/** 200 seeded grid configurations k1 0 … 63, k2, k3 −31 … 32 */
function gridSample() {
  const rng = createRng({ seed: 6311 });
  return Array.from({ length: 200 }, () => [rng.randomInteger([0, 63]), rng.randomInteger([-31, 32]), rng.randomInteger([-31, 32])]);
}
const BLUE = [0, 0, 1], RED = [1, 0, 0], GREEN = [0, 1, 0];
const sameColor = (c, d) => c && c.every((v, i) => Math.abs(v - d[i]) < 1e-12);

describe('manipulability-ellipsoid: the velocity Jacobian and the joint points', () => {
  it('JvRRRanthro at zero is {{0,0,0},{2,0,0},{0,2,1}} with singular values √5, 2, 0', () => {
    const J = JvRRRanthro([0, 0, 0]);
    expect(J.map((r) => r.map((x) => x + 0))).toEqual([[0, 0, 0], [2, 0, 0], [0, 2, 1]]);
    const { S, U, rank } = manipulability(J);
    withinUlps(S[0], Math.sqrt(5), 2, 'σ1');
    expect(S[1]).toBe(2);
    expect(S[2]).toBe(0);
    expect(rank).toBe(2);
    // J·Jᵀ = diag(0, 4, 5): U columns ±z, ±y, ±x
    close(Math.abs(U[2][0]), 1, 1e-15, 'U column 1 = ±z');
    close(Math.abs(U[1][1]), 1, 1e-15, 'U column 2 = ±y');
    close(Math.abs(U[0][2]), 1, 1e-15, 'U column 3 = ±x');
  });

  it('JvRRRanthro equals the numerical derivative of oc (central differences, 200 random grid configurations)', () => {
    const h = 1e-6;
    let worst = 0;
    for (const k of gridSample()) {
      const J = JvRRRanthro(k);
      const t = k.map((x) => (x * PI) / 32);
      for (let j = 0; j < 3; j++) {
        const tp = t.slice(), tm = t.slice();
        tp[j] += h; tm[j] -= h;
        const a = ocClosed(tp), b = ocClosed(tm);
        for (let i = 0; i < 3; i++) worst = Math.max(worst, Math.abs((a[i] - b[i]) / (2 * h) - J[i][j]));
      }
    }
    expect(worst).toBeLessThan(1e-8);
  });

  it('JvRRRanthro equals robot-singularities myJacob of the elbow arm (sum-to-product form) within 2e-15', () => {
    let worst = 0;
    for (const k of gridSample()) {
      const t = k.map((x) => (x * PI) / 32);
      const A = JvRRRanthro(machine(k)), B = myJacob(2, ...t);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) worst = Math.max(worst, Math.abs(A[i][j] - B[i][j]));
    }
    expect(worst).toBeLessThan(2e-15);
  });

  it('det J = -(cos θ2 + cos(θ2+θ3)) sin θ3 (Details formula with r2 = r3 = 1)', () => {
    const detail = ([, t2, t3]) => -(Math.cos(t2) + Math.cos(t2 + t3)) * Math.sin(t3);
    withinUlps(det(JvRRRanthro([19, 18, -21])), 0.6718917273402975, 4, 'saved state');
    withinUlps(det(JvRRRanthro([0, 0, 8])), -1.2071067811865475, 4, 'source defaults');
    for (const k of gridSample()) close(det(JvRRRanthro(k)), detail(k.map((x) => (x * PI) / 32)), 1e-14, `k = ${k}`);
  });

  it('o1, o2, oc and z1 at the saved state (oc = (-0.221153, 0.729045, 2.690501))', () => {
    const p = points([19, 18, -21]);
    expect(p.o0).toEqual([0, 0, 0]);
    expect(p.o1).toEqual([0, 0, 2]);
    closeV(p.o2, [0.0566317, -0.1866898, 2.9807853], 1e-7, 'o2');
    closeV(p.oc, [-0.2211534, 0.7290450, 2.6905006], 1e-7, 'oc');
    closeV(p.z1, [0.9569403, 0.2902847, 0], 1e-7, 'z1');
    closeV(p.oc, ocClosed([19, 18, -21].map((x) => (x * PI) / 32)), 1e-15, 'oc closed form');
  });
});

describe('manipulability-ellipsoid: exact angles (shared/exact-pi.js)', () => {
  it('octant table of shared/exact-pi.js: cos 19π/32 is the double of -sin 3π/32 and cos π/4 = sin π/4 = 0.7071067811865475 (bits provisional until H-ME-12)', () => {
    expect(cosPi(19, 32)).toBe(-sinPi(3, 32));
    expect(cosPi(19, 32)).toBe(-0.29028467725446233); // the stored Settings' p1 = {−Sin[3π/32], …} (PROVISIONAL bits)
    expect(Math.cos((19 * PI) / 32)).not.toBe(cosPi(19, 32)); // plain trigonometry is 7 ulp off
    withinUlps(Math.cos((19 * PI) / 32), -0.29028467725446216, 0, 'plain Math.cos');
    expect(cosPi(8, 32)).toBe(0.7071067811865475);
    expect(sinPi(8, 32)).toBe(0.7071067811865475);
    expect(cosPi(20, 32)).toBe(-cosPi(12, 32));
    expect(cosSinPi(16, 32)).toEqual([0, 1]);
    expect(cosSinPi(32, 32)).toEqual([-1, 0]);
  });

  it('exact zero columns at θ2 + θ3/2 = π/2 (rank 2) and at θ3 = π (two zero columns, rank 1): the zero singular values are exactly 0 and no ellipsoid is drawn', () => {
    // k = (0, 12, 8): Cos[3π/8] + Cos[5π/8] = 0 exactly
    let v = evaluate(st([0, 12, 8]));
    expect(col(v.J, 0)).toEqual([0, 0, 0]);
    withinUlps(v.S[0], 2.0731321849709863, 2, 'σ1');
    withinUlps(v.S[1], 0.34108137740210887, 2, 'σ2');
    expect(v.S[2]).toBe(0);
    expect(v.rank).toBe(2);
    let prims = flatten(v.ellipsoid.graphics);
    expect(prims.some((p) => p.type === 'ellipsoid')).toBe(false);
    expect(prims.some((p) => sameColor(p.color, GREEN))).toBe(false);
    // k = (0, 8, 32): the folded arm, Sin[θ2 + π] = −Sin[θ2]
    v = evaluate(st([0, 8, 32]));
    expect(col(v.J, 0)).toEqual([0, 0, 0]);
    expect(col(v.J, 1)).toEqual([0, 0, 0]);
    expect(v.S).toEqual([1, 0, 0]);
    expect(v.rank).toBe(1);
    prims = flatten(v.ellipsoid.graphics);
    expect(prims.filter((p) => p.type === 'arrow' && sameColor(p.color, BLUE))).toHaveLength(2);
    expect(prims.filter((p) => p.type === 'circle')).toHaveLength(1);
    expect(prims.some((p) => p.type === 'ellipsoid' || sameColor(p.color, RED))).toBe(false);
  });

  it('θ3 = 0 gives exactly proportional columns 2 and 3, the SVD tolerance sets σ3 to 0 and the rank is 2', () => {
    const J = JvRRRanthro([5, 8, 0]);
    expect(col(J, 1)).toEqual(col(J, 2).map((x) => 2 * x));
    const raw = svd3(J); // without the tolerance: a rounding-level σ3
    expect(raw.S[2]).toBeLessThan(1e-15 * raw.S[0]);
    const v = evaluate(st([5, 8, 0]));
    expect(v.S[2]).toBe(0);
    expect(v.rank).toBe(2);
    expect(v.mu).toBe(0);
    expect(v.text).toBe('0.');
  });

  it('rank 1 at (π/4, π/2, 0): only the blue arrows and the degenerate blue ring are drawn', () => {
    const v = evaluate(st([8, 16, 0]));
    withinUlps(v.S[0], 2.2360679774997902, 2, 'σ1 = √5');
    expect(v.S.slice(1)).toEqual([0, 0]);
    expect(v.points.oc.map((x) => x + 0)).toEqual([0, 0, 4]);
    const prims = flatten(v.ellipsoid.graphics);
    const arrows = prims.filter((p) => p.type === 'arrow');
    expect(arrows).toHaveLength(2);
    for (const a of arrows) {
      expect(sameColor(a.color, BLUE)).toBe(true);
      closeV(a.points[0], [0, 0, 4], 1e-15, 'tail at oc');
      const d = a.points[1].map((x, i) => x - a.points[0][i]);
      close(Math.hypot(...d), Math.sqrt(5), 1e-14, 'length √5');
      // J = √5-scaled rank-1 map: its column space is (c1, s1, 0)·… = ±(1, 1, 0)/√2 (the arm stands straight up)
      closeV(d.map(Math.abs), [Math.sqrt(5) * Math.SQRT1_2, Math.sqrt(5) * Math.SQRT1_2, 0], 1e-14, 'along ±(1, 1, 0)/√2');
    }
    // the direction lies in the vertical plane of θ1 = π/4: equal x and y parts
    const d0 = arrows[0].points[1].map((x, i) => x - arrows[0].points[0][i]);
    close(d0[0], d0[1], 1e-14, 'x = y');
    expect(prims.filter((p) => p.type === 'circle')).toHaveLength(1);
    expect(prims.some((p) => p.type === 'ellipsoid' || sameColor(p.color, RED) || sameColor(p.color, GREEN))).toBe(false);
  });

  it('rank scan: all 12032 exactly singular configurations of the π/32 grid have rank at most 2 and all others rank 3', () => {
    let singular = 0, rank1 = 0, wrong = 0, minRatio = Infinity;
    for (let k1 = 0; k1 < 64; k1++) for (let k2 = -31; k2 <= 32; k2++) for (let k3 = -31; k3 <= 32; k3++) {
      const expected = k3 === 0 || k3 === 32 || ((((2 * k2 + k3 - 32) % 64) + 64) % 64) === 0;
      const { S, rank } = manipulability(JvRRRanthro([k1, k2, k3]));
      if (rank <= 2) { singular++; if (rank === 1) rank1++; } else minRatio = Math.min(minRatio, S[2] / S[0]);
      if (expected !== (rank <= 2)) wrong++;
    }
    expect(wrong).toBe(0);
    expect(singular).toBe(12032);
    expect(rank1).toBe(4224);
    close(minRatio, 0.0048, 0.0001, 'smallest σ3/σ1 of a regular configuration');
  }, 60_000); // 262144 SVDs: about 2 s on an idle machine

  it('SVD tolerance: singular values at most 100·10^-p·σ1 (1.1e-14 relative) are set to 0, so μ reads 0. at every singular grid configuration', () => {
    expect(ZERO_TOL).toBe(100 * 2 ** -53);
    expect(svd3([[1, 0, 0], [0, 1e-13, 0], [0, 0, 0.5]], { zeroTol: ZERO_TOL }).S).toEqual([1, 0.5, 1e-13]);
    expect(svd3([[1, 0, 0], [0, 1e-15, 0], [0, 0, 0.5]], { zeroTol: ZERO_TOL }).S).toEqual([1, 0.5, 0]);
    let bad = 0, n = 0;
    for (let k2 = -31; k2 <= 32; k2++) for (let k3 = -31; k3 <= 32; k3++) {
      if (!(k3 === 0 || k3 === 32 || ((((2 * k2 + k3 - 32) % 64) + 64) % 64) === 0)) continue;
      for (let k1 = 0; k1 < 64; k1++) {
        n++;
        const { S, mu } = manipulability(JvRRRanthro([k1, k2, k3]));
        if (S[2] !== 0 || muText(mu) !== '0.') bad++;
      }
    }
    expect(n).toBe(12032);
    expect(bad).toBe(0);
  }, 60_000); // 12032 SVDs
});

describe('manipulability-ellipsoid: the θ / θprev / p bookkeeping', () => {
  it('the prev mechanism: the first evaluation of the source defaults sets p2 = {1,0}, p3 = {1/√2,1/√2}, θ = (0, 0, π/4) and leaves θ1prev = 0', () => {
    expect(SOURCE_DEFAULTS).toEqual({ k: [0, 0, 8], kprev: [0, -8, -24], m: [0, 0, 8] }); // θ2prev = −π/4, θ3prev = −3π/4
    const v = evaluate(SOURCE_DEFAULTS);
    expect(v.state).toEqual({ k: [0, 0, 8], kprev: [0, 0, 8], m: [0, 0, 8] });
    withinUlps(v.mu, 1.2071067811865472, 2, 'μ');
  });

  it('a dial change updates θi at once and θiprev only at the next evaluation (original quirk)', () => {
    const s = initialState();
    s.m[0] = 13;
    const s1 = evaluate(s).state;
    expect(s1.k[0]).toBe(13);
    expect(s1.kprev[0]).toBe(19);
    const s2 = evaluate(s1).state;
    expect(s2.kprev[0]).toBe(13);
    expect(s2.m[0]).toBe(13);
  });

  it('a dial change followed by the re-evaluations of the front end (settle) keeps the new angle, and a second dial change is not undone', () => {
    let s = initialState();
    s.m[1] = 19;
    let v = settle(s);
    expect(v.state).toEqual({ k: [19, 19, -21], kprev: [19, 19, -21], m: [19, 19, -21] });
    expect(v.evaluations).toBe(3); // θ2 changes, θ2prev catches up, nothing changes
    s = v.state;
    s.m[1] = 20;
    v = settle(s);
    expect(v.state.k[1]).toBe(20);
    // with a single evaluation per change the stale θ2prev would put p2 back: the reason for settling (D-ME-10)
    const once = evaluate({ k: [19, 19, -21], kprev: [19, 18, -21], m: [19, 20, -21] }).state;
    expect(once.m[1]).toBe(19);
  });

  it('θ1 below zero is moved up by 2π (dial at -π/8 gives θ1 = 15π/8), θ2 and θ3 stay in (-π, π]', () => {
    const s = initialState();
    s.m = [-4, -16, 32];
    let r = updateAngles(s);
    expect(r.k).toEqual([60, -16, 32]);
    s.m = [-4, -16, -32]; // ArcTan[−1, 0] = π
    r = updateAngles(s);
    expect(r.k).toEqual([60, -16, 32]);
  });

  it('machine dial values: θ = ArcTan[p] bit-exact and the prev comparison tolerant (one ulp counts as equal)', () => {
    const s = { k: [{ r: 0.8929626109272769 }, 0, 8], kprev: [{ r: 0.8929626109272768 }, 0, 8], m: [{ p: [0.6271071064982527, 0.7789330375451982] }, 0, 8] };
    expect(unequalA(s.kprev[0], s.k[0])).toBe(false);
    const r = updateAngles(s);
    expect(r.k[0]).toEqual({ r: 0.8929626109272769 });
    expect(r.m[0]).toEqual({ p: [0.6271071064982527, 0.7789330375451982] });
    expect(r.kprev[0]).toEqual({ r: 0.8929626109272768 });
  });
});

describe('manipulability-ellipsoid: dials (demos/common/dial-control.js options)', () => {
  it('dial snapping (Nearest-π/32 option of dial-control.js): a press at (0.3, 0.95) gives 13π/32 and a press at (-1.2, 0) gives π', () => {
    const snap = (p) => nearest32Index(dialPointer(p, { setter: 'nearest32' }));
    expect(snap([0.3, 0.95])).toBe(13); // 72.47° = 12.88 steps
    expect(dialPointer([-1.2, 0], { setter: 'nearest32' })).toEqual([-1, 0]); // θ = π (table index −32, the same point as 32)
    expect(Math.abs(snap([-1.2, 0]))).toBe(32);
    expect(snap([0.5, -0.5])).toBe(-8);
    expect(snap([0.02, 1.5])).toBe(16);
  });

  it('the dial table has 65 points, the first and last both {-1, 0}', () => {
    expect(DIAL_TABLE_32).toHaveLength(65);
    expect(DIAL_TABLE_32[0]).toEqual([-1, 0]);
    expect(DIAL_TABLE_32[64]).toEqual([-1, 0]);
    expect(DIAL_TABLE_32[32]).toEqual([1, 0]);
    expect(DIAL_TABLE_32[48]).toEqual([0, 1]);
  });

  it('dial arrow arc is always an arrow: 12 B-spline control points from 0 to ang, also at ang = 0', () => {
    const ang = (19 * PI) / 32;
    let g = dialGraphics(cosSinPi(19, 32));
    expect(g.arc.kind).toBe('Arrow');
    expect(g.arc.control).toHaveLength(12);
    g.arc.control.forEach((q, k) => closeV(q, [0.3 * Math.cos((k * ang) / 11), 0.3 * Math.sin((k * ang) / 11)], 1e-15, `control ${k}`));
    g = dialGraphics([1, 0]);
    expect(g.ang).toBe(0);
    expect(g.arc.kind).toBe('Arrow');
    expect(g.arc.control).toEqual(Array.from({ length: 12 }, () => [0.3, 0]));
    expect(g.arc.direction).toEqual([1, 0]);
  });
});

describe('manipulability-ellipsoid: μ, the ellipsoid and the robot drawing', () => {
  it('EngineeringForm display: 0.6718917 gives 671.892×10^-3, 1.2071068 gives 1.20711, 0.5 gives 500.×10^-3, 0 gives 0.', () => {
    expect([0.6718917273402976, 1.2071067811865472, 0.49999999999999994, 0.012, 0, 2.7944208223697744e-16].map(engineeringForm))
      .toEqual(['671.892×10^-3', '1.20711', '500.×10^-3', '12.×10^-3', '0.', '279.442×10^-18']);
    expect(evaluate(initialState()).text).toBe('671.892×10^-3');
  });

  it('Det of the diagonal Σfull equals the product of the singular values (bit-exact Det of shared/mma-exact.js)', () => {
    const v = evaluate(initialState());
    withinUlps(v.mu, 0.6718917273402976, 2, 'μ'); // NumPy (TESTPLAN)
    // closed form, independent of any SVD: μ = σ1 σ2 σ3 = |det J| = r2 r3 |sin θ3| |r2 cos θ2 + r3 cos(θ2 + θ3)|
    const t2 = (9 * Math.PI) / 16, t3 = (-21 * Math.PI) / 32;
    close(v.mu, Math.abs(Math.sin(t3)) * Math.abs(Math.cos(t2) + Math.cos(t2 + t3)), 1e-15, 'μ = |det J|');
    // Det of a diagonal matrix of the NumPy singular values: the product in written order, bit for bit
    const [a, b, c] = [1.248190625108838, 0.7618500137160805, 0.7065597566649363];
    expect(det([[a, 0, 0], [0, b, 0], [0, 0, c]])).toBe((a * b) * c);
  });

  it('manipEllip with scale 1: arrows ±σi along the columns of U, rings, ellipsoid semi-axes σi at oc (saved state σ = 1.248191, 0.761850, 0.706560)', () => {
    const v = evaluate(initialState());
    closeV(v.S, [1.248190625108838, 0.7618500137160805, 0.7065597566649363], 1e-14, 'σ');
    expect(v.Sigma).toEqual(v.S); // Σ = Σfull/1
    const prims = flatten(v.ellipsoid.graphics);
    const oc = v.points.oc;
    const arrows = prims.filter((p) => p.type === 'arrow');
    expect(arrows).toHaveLength(6);
    for (const [j, c] of [[0, BLUE], [1, RED], [2, GREEN]]) {
      const pair = arrows.filter((a) => sameColor(a.color, c));
      expect(pair).toHaveLength(2);
      for (const a of pair) {
        closeV(a.points[0], oc, 1e-15, 'tail');
        const d = a.points[1].map((x, i) => x - oc[i]);
        close(Math.hypot(...d), v.S[j], 1e-14, `|arrow ${j}|`);
        close(Math.abs(d[0] * v.U[0][j] + d[1] * v.U[1][j] + d[2] * v.U[2][j]), v.S[j], 1e-14, `along U column ${j}`);
      }
    }
    expect(prims.filter((p) => p.type === 'circle')).toHaveLength(3);
    const e = prims.filter((p) => p.type === 'ellipsoid');
    expect(e).toHaveLength(1);
    expect(e[0].opacity).toBe(0.5);
    closeV(apply4(e[0].matrix, e[0].center), oc, 1e-15, 'centre');
    [0, 1, 2].forEach((j) => close(Math.sqrt(e[0].Sigma[j][j]), v.S[j], 1e-15, `semi-axis ${j}`));
    const h = Math.hypot(v.U[2][0] * v.S[0], v.U[2][1] * v.S[1], v.U[2][2] * v.S[2]);
    close(oc[2] - h, 1.467328, 1e-6, 'bottom');
    close(oc[2] + h, 3.913673, 1e-6, 'top');
  });

  it('robot drawing: base cylinder radius 3/8 to z = 1/2, shaft radius 1/8 to z = 2, joint cylinders radius 1/4 along z1, floor points at θ1, θ1 - .05 Sign θ1, θ1 - .12 Sign θ1', () => {
    const v = evaluate(initialState());
    const robot = flatten(robotContent(v.angles, v.points));
    const cyl = robot.filter((p) => p.type === 'cylinder');
    expect(cyl).toHaveLength(6);
    const [base, shaft, link1, joint2, link2, joint3] = cyl;
    expect([base.p1, base.p2, base.radius]).toEqual([[0, 0, 0], [0, 0, 0.5], 0.375]);
    expect(base.color).toEqual(RED);
    expect([shaft.p1, shaft.p2, shaft.radius]).toEqual([[0, 0, 0], [0, 0, 2], 0.125]);
    expect([link1.p1, link1.p2, link1.radius]).toEqual([v.points.o1, v.points.o2, 0.125]);
    expect([link2.p1, link2.p2, link2.radius]).toEqual([v.points.o2, v.points.oc, 0.125]);
    for (const [j, o, c] of [[joint2, v.points.o1, BLUE], [joint3, v.points.o2, GREEN]]) {
      expect(j.radius).toBe(0.25);
      expect(j.color).toEqual(c);
      closeV(j.p1, o.map((x, i) => x - v.points.z1[i] / 4), 1e-15, 'joint start');
      closeV(j.p2, o.map((x, i) => x + v.points.z1[i] / 4), 1e-15, 'joint end');
    }
    expect(cyl.every((p) => JSON.stringify(p.edgeForm) === '[0,0,0]')).toBe(true); // EdgeForm[Black]
    const pts = robot.filter((p) => p.type === 'point');
    expect(pts).toHaveLength(3);
    [1.865321, 1.815321, 1.745321].forEach((a, i) => closeV(pts[i].points[0], [Math.cos(a), Math.sin(a), 0], 1e-6, `point ${i}`));
    expect(pts.map((p) => p.pointSize)).toEqual([null, 0.01, 0.013]);
    // θ1 = 0: Sign is 0 and the three points coincide at (1, 0, 0)
    const z = evaluate(st([0, 18, -21]));
    const zp = flatten(robotContent(z.angles, z.points)).filter((p) => p.type === 'point');
    for (const p of zp) expect(p.points[0]).toEqual([1, 0, 0]);
  });

  it('splineCircle arcs: equal start and end draw a full circle, a negative sweep goes the long way (θ3 = -21π/32 gives 43π/32)', () => {
    expect(splineArcAngles([0, 0])).toEqual({ start: 0, end: 2 * PI });
    const b = splineArcAngles([0, -PI / 2]);
    expect(b.start).toBe(0);
    close(b.end, 1.5 * PI, 1e-15, 'three quarters');
    const g = splineArcAngles([(9 * PI) / 16, (9 * PI) / 16 - (21 * PI) / 32]);
    close(g.start, 1.767146, 1e-6, 'start');
    close(g.end, 5.988661, 1e-6, 'end');
    close(g.end - g.start, (43 * PI) / 32, 1e-14, 'sweep 43π/32');
    // the drawn green arc of the saved state
    const v = evaluate(initialState());
    const lines = flatten(robotContent(v.angles, v.points)).filter((p) => p.type === 'line');
    expect(lines).toHaveLength(3); // red floor arc, blue and green joint arcs
    expect(lines.map((l) => l.thickness)).toEqual(['Large', 'Large', 'Large']);
    const green = lines[2];
    for (const q of green.points) close(Math.hypot(...q.map((x, i) => x - v.points.o2[i])), 0.5, 1e-14, 'radius 1/2 about o2');
  });
});
