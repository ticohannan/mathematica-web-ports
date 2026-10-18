// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations "Denavit-Hartenberg Parameters for a Three-Link Robot" by Aaron T. Becker and Mary Burbage and "Robot Singularities in Three-Link Manipulators" by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/dh-parameters.test.js — model of "Denavit-Hartenberg Parameters for a Three-Link Robot" and the DH-family
// modules it owns (demos/common/dh-chain.js, robot-draw.js, g3d.js, svd3.js). Expected values: hand formulas of the
// source (the A_i matrix of the Details, DrawJoint / DrawGripper), the closed form of the elbow arm, an independent
// DH product written in this file, the TESTPLAN's Python DH product, and robot-singularities' values recorded BEFORE the
// move (tests/unit/fixtures/robot-singularities.pre-move.json) — never the code under test.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import {
  initialState, evaluate, origin, angleOf, jointT, stateFromSettings, fitCamera, groundWidthFraction,
} from '../../demos/dh-parameters/model.js';
import { dhTransform, computeTd, joints, makeO3coords } from '../../demos/common/dh-chain.js';
import { drawJoint, drawGripper, drawCoordAxes, GROUND } from '../../demos/common/robot-draw.js';
import { flatten, cuboidCorners, EdgeForm, Cuboid, Gray } from '../../demos/common/g3d.js';
import { svd3, manipEllip } from '../../demos/common/svd3.js';
import { piFraction } from '../../shared/mma-text.js';
import { mmaGrid, mmaSliderText } from '../../shared/ui.js';
import { NAMED } from '../../shared/mma-colors.js';
import { parseLexical } from '../../tools/lib/json-lexical.mjs';
import * as RS_ROBOTS from '../../demos/robot-singularities/robots.js';
import * as RS_MODEL from '../../demos/robot-singularities/model.js';
import * as RS_SVD from '../../demos/robot-singularities/svd3.js';
import * as RS_G3D from '../../demos/robot-singularities/g3d.js';

const π = Math.PI;
const fx = parseLexical(fs.readFileSync('tests/golden/dh-parameters.original-states.json', 'utf8'));
const snapState = (k) => stateFromSettings(fx.snapshots[k]);
const close = (a, b, tol, what = '') => expect(Math.abs(a - b), `${what} ${a} vs ${b}`).toBeLessThanOrEqual(tol);
const closeV = (a, b, tol, what = '') => a.forEach((x, i) => close(x, b[i], tol, `${what}[${i}]`));
const closeM = (A, B, tol) => A.forEach((r, i) => closeV(r, B[i], tol, `row ${i}`));
/** the A_i matrix printed in the Details (hand formula, independent of dhTransform) */
const Ai = (d, r, t, a) => [
  [Math.cos(t), -Math.sin(t) * Math.cos(a), Math.sin(t) * Math.sin(a), r * Math.cos(t)],
  [Math.sin(t), Math.cos(t) * Math.cos(a), -Math.cos(t) * Math.sin(a), r * Math.sin(t)],
  [0, Math.sin(a), Math.cos(a), d], [0, 0, 0, 1]];
const mm = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, x, k) => s + x * B[k][j], 0)));
const byType = (prims, type) => prims.filter((p) => p.type === type);

describe('DH transform and kinematics', () => {
  it('DHTransform is Rot_z(θ).Trans_z(d).Trans_x(r).Rot_x(α) and equals the matrix A_i of the Details text', () => {
    for (const [d, r, n, m] of [[0.3, 0.7, 5, 16], [1, 0, -12, -16], [0, 1, 32, 32]]) {
      const M = dhTransform(d, r, angleOf(n), angleOf(m), { exact: { theta: n, alpha: m } });
      closeM(M, Ai(d, r, angleOf(n), angleOf(m)), 1e-15);
      closeM(dhTransform(d, r, angleOf(n), angleOf(m)), Ai(d, r, angleOf(n), angleOf(m)), 1e-15);
    }
  });
  it('default anthropomorphic arm: frame origins (0,0,1), (0.623613, 0.333328, 1.707107), (1.438402, 0.768842, 1.324423) equal the closed form', () => {
    const v = evaluate(initialState());
    closeV(origin(v.T1), [0, 0, 1], 1e-6);
    closeV(origin(v.T12), [0.623613, 0.333328, 1.707107], 1e-6);
    closeV(origin(v.T123), [1.438402, 0.768842, 1.324423], 1e-6);
    const [t1, t2, t3] = [5 * π / 32, π / 4, -3 * π / 8];
    const end = [Math.cos(t1) * (Math.cos(t2) + Math.cos(t2 + t3)), Math.sin(t1) * (Math.cos(t2) + Math.cos(t2 + t3)), 1 + Math.sin(t2) + Math.sin(t2 + t3)];
    closeV(origin(v.T123), end, 1e-14);
    closeV(end, [1.438401511911257, 0.768841626085022, 1.3244233488214576], 1e-14);
    closeM(v.T123.slice(0, 3).map((r) => r.slice(0, 3)), [[0.814789, 0.337497, 0.471397], [0.435514, 0.180396, -0.881921], [-0.382683, 0.923880, 0]], 1e-6);
  });
  it('the joint type changes only the drawing: T1, T2, T3 do not depend on j1, j2, j3', () => {
    const base = evaluate(initialState());
    for (let m = 0; m < 8; m++) {
      const st = initialState();
      st.j = [0, 1, 2].map((i) => ((m >> i) & 1 ? 'Prismatic' : 'Revolute'));
      const v = evaluate(st);
      expect([v.T1, v.T2, v.T3]).toEqual([base.T1, base.T2, base.T3]);
      if (m) expect(v.prims).not.toEqual(base.prims);
    }
  });
  it('exact right angles: α1 = π/2 gives exact 0 and ±1 entries in T1 (no 6.1e-17)', () => {
    const T1 = evaluate(initialState()).T1;
    const c = Math.cos(5 * π / 32), s = Math.sin(5 * π / 32);
    // A_1 with α = π/2: [[c, 0, s, 0], [s, 0, -c, 0], [0, 1, 0, 1]] — the zeros exactly 0
    expect(T1[0][1]).toBe(0); expect(T1[1][1]).toBe(0); expect(T1[2][0]).toBe(0); expect(T1[2][2]).toBe(0);
    expect(T1[2][1]).toBe(1); expect(T1[2][3]).toBe(1);
    close(T1[0][0], c, 1e-16); close(T1[0][2], s, 1e-16); close(T1[1][0], s, 1e-16); close(T1[1][2], -c, 1e-16);
    // the machine path keeps the residue of Math.cos(N[π/2]) = 6.123233995736766e-17 (−sin θ · cos α)
    const m01 = dhTransform(1, 0, angleOf(5), Math.PI / 2, { alphaConst: false })[0][1];
    expect(m01).not.toBe(0);
    expect(Math.abs(m01)).toBeLessThan(1e-16);
  });
  it('frame origins of the snapshot settings 2-5 equal an independent DH product', () => {
    const want = { 2: [-1.121754, -1.512511, 0.19], 3: [0.494458, 0.740008, 1.74], 4: [1.356523, -1.116001, 0], 5: [0.320116, 0.171105, 1.679079] };
    for (const k of [2, 3, 4, 5]) {
      const st = snapState(k);
      const v = evaluate(st);
      closeV(origin(v.T123), want[k], 1e-6, `snapshot ${k}`);
      const P = [0, 1, 2].map((i) => Ai(st.d[i], st.r[i], angleOf(st.theta[i]), angleOf(st.alpha[i]))).reduce(mm);
      closeV(origin(v.T123), origin(P), 1e-14, `snapshot ${k} (product)`);
    }
  });
  it('dhTransform keeps the machine path of robot-singularities: a machine angle equal to the double of -π gives sin -1.2246467991473532e-16, exact angles only through the explicit argument', () => {
    // robot-singularities' slider values at k = 1 and k = 26 (-1.01π + k·0.01π) are the doubles -π and -24π/32
    expect(-π * 1.01 + 1 * (0.01 * π)).toBe(-π);
    const M = dhTransform(0, 0, -π, 0);
    expect(M[1][0]).toBe(-1.2246467991473532e-16);
    expect(M[0][0]).toBe(-1);
    const E = dhTransform(0, 0, -π, 0, { exact: { theta: -32 } });
    expect(E[1][0]).toBe(0);
    expect(E[0][0]).toBe(-1);
    // the explicit form of robot-singularities (thetaIsConst = true for a table entry) recognises the five constants
    expect(dhTransform(0, 0, -π, 0, true)[1][0]).toBe(0);
  });
});

describe('the drawing (DrawJoint, DrawGripper, ground)', () => {
  const jr = 1 / 5, ar = 1 / 20;
  it('DrawJoint revolute: gray translucent axis cylinder from Min[-ar, d-jr]-.01 to Max[ar, d]+.01 radius 1/20, opaque light-blue cylinder ±1/5 radius 1/5, link cuboid {-ar,-ar,d-ar}-{r,ar,d+ar} turned by θ', () => {
    const P = flatten(drawJoint('Revolute', 1, 0.7, π / 4, { variant: 'dh' }));
    expect(byType(P, 'line')).toHaveLength(15); // coordinate axes first
    expect(P.slice(0, 15).every((p) => p.type === 'line')).toBe(true);
    const [axis, body] = byType(P, 'cylinder');
    closeV(axis.p1, [0, 0, -0.06], 1e-15); closeV(axis.p2, [0, 0, 1.01], 1e-15);
    expect(axis.radius).toBe(ar); expect(axis.opacity).toBe(0.5); expect(axis.color).toEqual(NAMED.Gray);
    expect(body.p1).toEqual([0, 0, -jr]); expect(body.p2).toEqual([0, 0, jr]); expect(body.radius).toBe(jr);
    expect(body.opacity).toBe(1); expect(body.color).toEqual(NAMED.LightBlue);
    const [link] = byType(P, 'cuboid');
    closeV(link.min, [-0.05, -0.05, 0.95], 1e-15); closeV(link.max, [0.7, 0.05, 1.05], 1e-15);
    expect(link.opacity).toBe(0.5); expect(link.color).toEqual(NAMED.Gray);
    closeM(link.matrix.slice(0, 3).map((r) => r.slice(0, 3)), [[Math.SQRT1_2, -Math.SQRT1_2, 0], [Math.SQRT1_2, Math.SQRT1_2, 0], [0, 0, 1]], 1e-15);
  });
  it('DrawJoint prismatic: axis cuboid from -1+d-jr-.01 to d+.01, light-blue cube of half-width 1/5', () => {
    for (const [d, z0, z1] of [[0.81, -0.4, 0.82], [0, -1.21, 0.01]]) {
      const [axis, body] = byType(flatten(drawJoint('Prismatic', d, 0, 0, { variant: 'dh' })), 'cuboid');
      closeV(axis.min, [-0.05, -0.05, z0], 1e-15); closeV(axis.max, [0.05, 0.05, z1], 1e-15);
      close(axis.max[2] - axis.min[2], 1.22, 1e-15);
      expect(axis.opacity).toBe(0.5);
      expect(body.min).toEqual([-jr, -jr, -jr]); expect(body.max).toEqual([jr, jr, jr]); expect(body.color).toEqual(NAMED.LightBlue);
    }
  });
  it('DrawJoint prismatic axis: -1+d-jr-.01 added in written order, ((-1 + d) + -1/5) + -0.01 (H-DH-02, H-DH-03, H-DH-07); an exact d joins the exact terms', () => {
    // the recorded values (harness H-DH-02, H-DH-03, H-DH-07, Mathematica 15.0.1); the reading of COMMON-DECISIONS §7
    // used before v0.1.17, (d + -0.01) + N[-6/5], gives -0.3999999999999999, -0.47, -0.31999999999999995, -0.20999999999999996
    const z0 = (d, dExact = null) => byType(flatten(drawJoint('Prismatic', d, 0, 0, { variant: 'dh', dExact })), 'cuboid')[0].min[2];
    expect(z0(0.81)).toBe(-0.39999999999999997);
    expect(z0(0.74)).toBe(-0.47000000000000003);
    expect(z0(0.89)).toBe(-0.32);
    expect(z0(0.5)).toBe(-0.71);
    expect(z0(1)).toBe(-0.21000000000000002); // machine 1.: ((-1 + 1.) + -0.2) + -0.01
    expect(z0(0, [0, 1])).toBe(-1.21); // exact 0: -0.01 + N[-6/5] (H-DH-07)
    expect(z0(1, [1, 1])).toBe(-0.21000000000000002); // exact 1: -0.01 + N[-1/5]
    // through the model: the exact default d1 = 1 against the machine 1. after a move
    const st = initialState();
    st.j[0] = 'Prismatic';
    const axisZ = (s) => byType(evaluate(s).parts[1], 'cuboid')[0].min[2];
    expect(axisZ(st)).toBe(-0.21000000000000002);
    st.exact.d[0] = false;
    expect(axisZ(st)).toBe(-0.21000000000000002); // the machine 1. gives the same double here
    // robot-singularities' variant has no such sum: its prismatic axis starts at -jr-.01 for every d
    expect(byType(flatten(drawJoint('p', 1.2, 0, 0)), 'cuboid')[0].min[2]).toBe(-0.2 - 0.01);
  });
  it('DrawJoint with r = 0 still draws the small link cuboid {-1/20,-1/20,d-1/20}-{0,1/20,d+1/20}', () => {
    const cub = byType(flatten(drawJoint('Revolute', 0, 0, 0, { variant: 'dh' })), 'cuboid');
    expect(cub).toHaveLength(1);
    expect(cub[0].min).toEqual([-ar, -ar, -ar]); expect(cub[0].max).toEqual([0, ar, ar]);
    // robot-singularities' variant omits it (If[r != 0, …])
    expect(byType(flatten(drawJoint('r', 0, 0, 0)), 'cuboid')).toHaveLength(0);
  });
  it('DrawGripper: r3 ≠ 0 gives the hand along x (fingers at z = ±g/10 … ±(1+g)/10), r3 = 0 along z (fingers at x = ±g/10 …)', () => {
    const boxes = (g, r) => byType(flatten(drawGripper(g, r)), 'cuboid').map(cuboidCorners);
    let [palm, f1, f2] = boxes(1, 1);
    closeV(palm.min, [-0.1, -0.05, -0.2], 1e-15); closeV(palm.max, [0, 0.05, 0.2], 1e-15);
    closeV(f1.min, [0, -0.05, 0.1], 1e-15); closeV(f1.max, [0.2, 0.05, 0.2], 1e-15);
    closeV(f2.min, [0, -0.05, -0.2], 1e-15); closeV(f2.max, [0.2, 0.05, -0.1], 1e-15);
    [palm, f1, f2] = boxes(0.52, 0);
    closeV(palm.min, [-0.2, -0.05, -0.1], 1e-15); closeV(palm.max, [0.2, 0.05, 0], 1e-15);
    closeV(f1.min, [0.052, -0.05, 0], 1e-15); closeV(f1.max, [0.152, 0.05, 0.2], 1e-15);
    closeV(f2.min, [-0.152, -0.05, 0], 1e-15); closeV(f2.max, [-0.052, 0.05, 0.2], 1e-15);
    [palm, f1, f2] = boxes(0, 0.5); // closed: the fingers touch
    closeV([f1.min[2], f1.max[2], f2.min[2], f2.max[2]], [0, 0.1, -0.1, 0], 1e-15);
    expect(byType(flatten(drawGripper(1, 1)), 'line')).toHaveLength(15); // DrawCoordAxes[jr]
  });
  it('DrawZArrow and DrawCoordAxes are those of robot-singularities (identical code, shared module)', () => {
    expect(RS_MODEL.drawCoordAxes).toBe(drawCoordAxes);
    const P = flatten(drawCoordAxes(jr));
    expect(P).toHaveLength(15);
    expect(P.every((p) => p.thickness === 'Large')).toBe(true);
    const red = P.slice(0, 5);
    // the original's jr = 1/5 is exact: 2 jr = 2/5, 3/2 jr = 3/10, whose doubles are 0.4 and 0.3; the shared code
    // computes (3/2)·0.2 = 0.3 + 1 ulp (D-DH-09, kept bit-identical for robot-singularities): within one ulp of 0.3
    const want = [[[0, 0, 0], [0, 0, 0.4]], [[0, 0, 0.4], [1 / 32, 0, 0.3]], [[0, 0, 0.4], [-1 / 32, 0, 0.3]],
      [[0, 0, 0.4], [0, 1 / 32, 0.3]], [[0, 0, 0.4], [0, -1 / 32, 0.3]]];
    red.forEach((p, k) => p.points.forEach((q, i) => closeV(q, want[k][i], 2 ** -54, `stroke ${k} point ${i}`)));
    expect(red.map((p) => p.points.length)).toEqual([2, 2, 2, 2, 2]);
    expect(red[0].color).toEqual(NAMED.Red);
    closeV(P[5].points[1], [0.4, 0, 0], 1e-15); expect(P[5].color).toEqual(NAMED.Blue); // z turned π/2 about y → x
    closeV(P[10].points[1], [0, 0.4, 0], 1e-15); expect(P[10].color).toEqual(NAMED.Green); // z turned -π/2 about x → y
  });
  it('ground: light-brown cylinder radius 2.2 from z = -2/5 to -1/4', () => {
    const [g] = flatten(GROUND());
    expect(g).toMatchObject({ type: 'cylinder', p1: [0, 0, -0.4], p2: [0, 0, -0.25], radius: 2.2, color: [0.94, 0.91, 0.88] });
    expect(evaluate(initialState()).parts[0]).toEqual([g]);
  });
  it('plot range = bounds of all primitives and changes with the arm (snapshot 4 smaller than snapshot 1)', () => {
    const b1 = evaluate(snapState(1)).box, b4 = evaluate(snapState(4)).box;
    for (const b of [b1, b4]) { expect(b[0]).toEqual([-2.2, 2.2]); expect(b[1]).toEqual([-2.2, 2.2]); expect(b[2][0]).toBe(-0.4); }
    close(b4[2][1], 0.4, 1e-12); // planar arm: the frame arrows reach 2 jr = 0.4 above z = 0
    expect(b1[2][1]).toBeGreaterThan(1.9); // above the joint-2 frame (origin z = 1.707)
    expect(b1[2][1]).toBeLessThan(2.2);
    const r = (b) => Math.hypot(...b.map(([a, c]) => c - a));
    expect(r(b4)).toBeLessThan(r(b1));
    // the parts in order flatten to the whole graphic
    const v = evaluate(snapState(2));
    expect(v.prims).toEqual(flatten(v.graphic));
  });
});

describe('slider values and labels', () => {
  it('π-fraction labels: 5π/32, -13π/16, π/2, π, -π/2, 0 (exact slider values)', () => {
    const n = [5, -26, 16, 32, -16, 0, 1, -32, 27, -12];
    expect(n.map((k) => piFraction(k, 32).replace('−', '-'))).toEqual(['5π/32', '-13π/16', 'π/2', 'π', '-π/2', '0', 'π/32', '-π', '27π/32', '-3π/8']);
  });
  it('θ and α sliders take the exact values -π + kπ/32 (k = 0..64), d, r and grip the machine values 0.01 k', () => {
    const a = mmaGrid(-32, 32, 1);
    expect(a.n).toBe(64);
    for (let k = 0; k <= 64; k++) expect(a.valueAt(k)).toBe(k - 32); // the integer n of nπ/32, exact
    const d = mmaGrid(0, 1, 0.01);
    expect(d.n).toBe(100);
    expect(d.valueAt(81)).toBe(0.81); // 81 × 0.01
    expect(d.valueAt(81)).toBe(81 * 0.01);
    expect(d.valueAt(100)).toBe(1); // the right end is max
    expect(d.valueAt(52)).toBe(0.52);
  });
  it('value display: exact defaults 1 and 0, machine values after a move 1., 0., 0.81, 0.52', () => {
    expect(mmaSliderText(1)).toBe('1');
    expect(mmaSliderText(1, { moved: true })).toBe('1.');
    expect(mmaSliderText(0, { moved: true })).toBe('0.');
    expect(mmaSliderText(mmaGrid(0, 1, 0.01).valueAt(81), { moved: true })).toBe('0.81');
    expect(mmaSliderText(mmaGrid(0, 1, 0.01).valueAt(52), { moved: true })).toBe('0.52');
  });
});

describe('framing helpers (D-DH-01)', () => {
  it('fitCamera puts the camera on the ViewPoint direction at |ViewPoint| × the longest side from the box centre', () => {
    const box = [[-2.2, 2.2], [-2.2, 2.2], [-0.4, 0.4]];
    const c = fitCamera(box, { zoom: 1 });
    expect(c.target).toEqual([0, 0, 0]);
    close(Math.hypot(...c.position), Math.hypot(1.3, -2.4, 2) * 4.4, 1e-12);
    const r = 0.5 * Math.hypot(4.4, 4.4, 0.8), dist = Math.hypot(1.3, -2.4, 2) * 4.4;
    close(c.fovDeg, (2 * Math.atan(Math.tan(Math.asin(r / dist) * 1.04)) * 180) / π, 1e-12); // the half angle of the sphere × 1.04
    // a camera whose half angle just covers the disc sees it about as wide as the image
    expect(groundWidthFraction(c)).toBeGreaterThan(0.6);
    expect(groundWidthFraction(c)).toBeLessThan(1);
  });
});

describe('DH-family modules (moved from robot-singularities, v0.1.16)', () => {
  // the recording procedure of tests/unit/fixtures/robot-singularities.pre-move.json (run on the code before the move)
  const enc = (x) => JSON.parse(JSON.stringify(x, (k, v) => (Object.is(v, -0) ? '-0' : typeof v === 'function' ? undefined : v)));
  const H = (x) => createHash('sha256').update(JSON.stringify(enc(x))).digest('hex').slice(0, 32);
  const primData = (prims) => prims.map((p) => {
    const q = { ...p };
    if (p.type === 'parametricCurve') q.samples = RS_G3D.sampleCurve(p, 21);
    if (p.type === 'parametricSurface') q.samples = RS_G3D.sampleSurface(p, 7, 7);
    if (p.type === 'circle') q.samples = RS_G3D.sampleCircle(p, 9);
    delete q.f;
    return q;
  });
  const pre = JSON.parse(fs.readFileSync('tests/unit/fixtures/robot-singularities.pre-move.json', 'utf8'));

  it("the moved modules reproduce robot-singularities' Td and o3coords bit for bit through its re-export shims", () => {
    const { typeOf, computeAd, computeTd: TdRS, jacobianFor, makeO3coords: o3RS } = RS_ROBOTS;
    expect(pre.robots).toHaveLength(16);
    for (const rob of pre.robots) {
      const Type = typeOf(rob.iType);
      const o3 = o3RS(Type);
      for (const row of rob.rows) {
        const c = row.c;
        const Ad = computeAd(Type, c), Td = TdRS(Ad);
        expect(enc(o3(...c)), `${rob.iType} o3 ${c}`).toEqual(row.o3);
        expect(enc(Td), `${rob.iType} Td ${c}`).toEqual(row.Td);
        const JL = jacobianFor(rob.iType, 'Linear', c), JA = jacobianFor(rob.iType, 'Angular', c);
        const sv = RS_SVD.svd3(JL);
        const me = RS_SVD.manipEllip(JL, o3(...c));
        expect(RS_SVD.matrixRank(sv.S)).toBe(row.rank);
        expect({ Ad: H(Ad), JL: H(JL), JA: H(JA), svd: H(sv), manip: H(primData(RS_G3D.flatten(me.graphics))) }, `${rob.iType} ${c}`).toEqual(row.sha);
      }
      let st = RS_MODEL.selectType({ ...RS_MODEL.initialState(), showRobot: true, showManipulability: true }, rob.iType);
      st = { ...st, params: rob.rows[0].c.slice() };
      for (const e of rob.ev) {
        const r = RS_MODEL.evaluate({ ...st, isJLinearVel: e.lin });
        expect(enc(r.view.workspaceBox)).toEqual(e.box);
        expect({ state: H(r.state), ws: H(primData(r.view.workspacePrims)), phase: H(primData(RS_G3D.flatten(r.view.phase))) }, `${rob.iType} ${e.lin}`).toEqual(e.sha);
      }
    }
    for (const { args, M } of pre.dh) expect(enc(RS_ROBOTS.dhTransform(...args))).toEqual(M);
    // the shims are the common modules
    expect(RS_ROBOTS.dhTransform).toBe(dhTransform);
    expect(RS_SVD.svd3).toBe(svd3);
    expect(RS_G3D.flatten).toBe(flatten);
    expect(RS_MODEL.drawJoint).toBe(drawJoint);
  });
  it('computeTd chops by default and keeps the raw products with {chop: false}', () => {
    const Ad = [dhTransform(0, 1, π / 2, 0), dhTransform(0, 1, π / 2, 0)]; // Math.cos(π/2) = 6.1e-17
    expect(computeTd(Ad)[1][0][0]).toBe(-1);
    expect(computeTd(Ad)[1][1][1]).toBe(-1);
    const raw = computeTd(Ad, { chop: false })[1];
    expect(raw[0][1]).not.toBe(0); // the 1.2e-16 residue survives
    expect(Math.abs(raw[0][1])).toBeLessThan(1e-15);
    expect(joints([['r', 'p'], [1, 0], [0, 0], [0, 0.5], [0, 0]], 2)).toHaveLength(2);
    closeV(makeO3coords([['r', 'r'], [1, 1], [0, 0], [0, 0], ['q1', 'q2']], 2)(0, π / 2), [1, 1, 0], 1e-15);
  });
  it('svd3 zeroTol: singular values at or below zeroTol·σ1 become 0; the default 0 changes nothing', () => {
    const A = [[1, 0, 0], [0, 1e-15, 0], [0, 0, 0.5]];
    expect(svd3(A).S).toEqual([1, 0.5, 1e-15]);
    const z = svd3(A, { zeroTol: 100 * 2 ** -53 });
    expect(z.S).toEqual([1, 0.5, 0]);
    // U stays orthonormal (the null direction completed)
    const U = z.U;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) close(U[0][i] * U[0][j] + U[1][i] * U[1][j] + U[2][i] * U[2][j], i === j ? 1 : 0, 1e-15);
    expect(manipEllip(A, [0, 0, 0]).Sigma).toEqual([0.5, 0.25, 5e-16]);
    expect(manipEllip(A, [0, 0, 0], { scale: 1, zeroTol: 100 * 2 ** -53 })).toMatchObject({ Sigma: [1, 0.5, 0], rank: 2 });
  });
  it('drawJoint variant ac: translucent axis by MemberQ of the four prismatic names, the joint body of robot-singularities, the link always', () => {
    const P = flatten(drawJoint('P', 0.5, 0, 0, { variant: 'ac' }));
    const cub = byType(P, 'cuboid');
    expect(cub[0].min[2]).toBeCloseTo(-1 + 0.5 - 0.2 - 0.01, 15); // axis from -1+d-jr-.01 ('P' counts as prismatic)
    expect(cub[0].opacity).toBe(0.5);
    expect(byType(P, 'cylinder')).toHaveLength(1); // body: j == "p" is false for "P" → RS's cylinder of radius .7 jr
    expect(byType(P, 'cylinder')[0].radius).toBeCloseTo(0.14, 15);
    expect(cub[cub.length - 1].max).toEqual([0, 1 / 20, 0.55]); // link drawn for r = 0
    expect(byType(flatten(drawJoint('p', 0.5, 0, 0, { variant: 'ac' })), 'cuboid')).toHaveLength(4); // axis, two body cuboids, link
    expect(() => drawJoint('r', 0, 0, 0, { variant: 'xx' })).toThrow();
  });
  it('g3d additions: EdgeForm reaches the flattened primitive only when given; cuboidCorners orders reversed corners', () => {
    const [plain] = flatten([Gray, Cuboid([0, 0, 0], [1, 1, 1])]);
    expect('edgeForm' in plain).toBe(false);
    const [none] = flatten([EdgeForm(), Cuboid([0, 0, 0], [1, 1, 1])]);
    expect(none.edgeForm).toBe('None');
    const [rev] = flatten([Cuboid([0, -1, 0.4], [1, 1, -0.2])]);
    expect(rev.min).toEqual([0, -1, 0.4]); // data as written
    expect(cuboidCorners(rev)).toEqual({ min: [0, -1, -0.2], max: [1, 1, 0.4] });
  });
  it('the opening state evaluates T1 with the exact-angle path (jointT)', () => {
    const st = initialState();
    expect(jointT(st, 0)).toEqual(dhTransform(1, 0, 0, 0, { exact: { theta: 5, alpha: 16 } }));
  });
});
