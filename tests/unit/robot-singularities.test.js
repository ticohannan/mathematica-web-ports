// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/robot-singularities.test.js — model of "Robot Singularities in Three-Link Manipulators".
// Expected values are derived by hand from the Denavit–Hartenberg parameters, from the Details text, or by
// an independent method (numerical derivatives, determinants, reconstruction) — never by running the code
// under test for the expected value (R-16).
import { describe, it, expect } from 'vitest';
import {
  TYPES, TYPE_NAMES, typeOf, dhTransform, makeO3coords, myJacob, myJacobAngular, wrapParams, defaultParams,
  sliderSpec, phaseOpt, joints, computeAd, computeTd,
} from '../../demos/robot-singularities/robots.js';
import { singularspace3D, singularphasespace3D } from '../../demos/robot-singularities/singular-sets.js';
import { svd3, matrixRank, manipEllip } from '../../demos/robot-singularities/svd3.js';
import {
  flatten, Show, Graphics3D, Red, Thick, Opacity, Sphere, Line, Rotate, infinitePlanePolygon, sampleSurface,
  sampleCurve, sampleCircle, primitiveBounds,
} from '../../demos/robot-singularities/g3d.js';
import * as THREE from 'three';
import { MMA_DEFAULT_LIGHTS, addMathematicaLighting, imageScaledDirection } from '../../shared/mma-lighting.js';
import { initialState, evaluate, selectType, drawJoint, drawCoordAxes } from '../../demos/robot-singularities/model.js';

const π = Math.PI;
const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
const close3 = (a, b, d = 12) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], d));
const sub = (a, b) => a.map((v, i) => v - b[i]);
const norm = (a) => Math.hypot(...a);
const CONFIGS = [[0.3, -0.7, 0.5], [1.1, 0.4, -2.0], [-2.5, 1.9, 0.8], [0.6, 0.25, 0.7], [3.0, -3.0, 0.05]];
/** closed-form DH matrix of a joint (independent of dhTransform): revolute θ = v, prismatic d = v */
function dh(J, v) {
  const [t, d] = J.jointtype === 'r' ? [v, J.d] : [J.theta, v];
  const ct = Math.cos(t), st = Math.sin(t), ca = Math.cos(J.alpha), sa = Math.sin(J.alpha);
  return [[ct, -st * ca, st * sa, J.a * ct], [st, ct * ca, -ct * sa, J.a * st], [0, sa, ca, d], [0, 0, 0, 1]];
}

describe('robot table and kinematics', () => {
  it('the Type table has the 16 robots of the popup menu with the joint types of the original', () => {
    expect(TYPE_NAMES).toHaveLength(16);
    expect(TYPE_NAMES[1]).toBe('elbow robot arm');
    const jt = TYPES.map((t) => t[0].join(''));
    expect(jt).toEqual(['rrr', 'rrr', 'rrr', 'rrr', 'rrp', 'rpp', 'rrp', 'rrp', 'rrp', 'rrp', 'rpr', 'ppp', 'ppp', 'ppp', 'rrr', 'rrr']);
  });
  it('the planar arm theta row lists q2 twice (original quirk, harmless)', () => {
    expect(typeOf(1)[4]).toEqual(['q1', 'q2', 'q2']);
  });
  it('dhTransform is Rot_z(theta).Trans_z(d).Trans_x(r).Rot_x(alpha)', () => {
    // hand: Rz(90°) Tz(2) Tx(1) Rx(90°) = [[0,0,1,0],[1,0,0,1],[0,1,0,2],[0,0,0,1]]
    expect(dhTransform(2, 1, π / 2, π / 2, true)).toEqual([[0, 0, 1, 0], [1, 0, 0, 1], [0, 1, 0, 2], [0, 0, 0, 1]]);
    // general angles: compare with the closed form of the DH matrix
    const [t, a] = [0.7, -1.2];
    const M = dhTransform(0.5, 0.3, t, a);
    const ref = [[Math.cos(t), -Math.sin(t) * Math.cos(a), Math.sin(t) * Math.sin(a), 0.3 * Math.cos(t)],
      [Math.sin(t), Math.cos(t) * Math.cos(a), -Math.cos(t) * Math.sin(a), 0.3 * Math.sin(t)], [0, Math.sin(a), Math.cos(a), 0.5]];
    for (let i = 0; i < 3; i++) close3(M[i], ref[i], 14);
  });
  it('o3coords of the elbow arm: (2,0,2) stretched, (0,0,4) straight up, (0,0,2) folded', () => {
    const o3 = makeO3coords(typeOf(2));
    close3(o3(0, 0, 0), [2, 0, 2]);
    close3(o3(0, π / 2, 0), [0, 0, 4]);
    close3(o3(0, 0, π), [0, 0, 2]);
    close3(o3(π / 2, 0, 0), [0, 2, 2]);
  });
  it('o3coords of the planar, SCARA and Stanford arms (hand-derived)', () => {
    close3(makeO3coords(typeOf(1))(0, 0, 0), [3, 0, 0]);
    close3(makeO3coords(typeOf(1))(π / 2, 0, 0), [0, 3, 0]);
    close3(makeO3coords(typeOf(10))(0, 0, 0.3), [1.8, 0, 1.2]); // a = 1.2 + 0.6, z = 1.5 - d3 (alpha2 = π flips z)
    close3(makeO3coords(typeOf(5))(0, 0, 0.4), [0, 1, 1.4]); // d1 = 1 up, d2 = 1 along y, then d3 up
  });
  it('Td of the elbow arm at zero is the hand-derived chain of frames (shoulder at height 2, x along the links)', () => {
    // hand: Td1 = Tz(2).Rx(π/2), Td2 = Td1.Tx(1), Td3 = Td2.Tx(1)
    const Rx90z2 = [[1, 0, 0], [0, 0, -1], [0, 1, 0]];
    const frame = (x) => [[...Rx90z2[0], x], [...Rx90z2[1], 0], [...Rx90z2[2], 2], [0, 0, 0, 1]];
    expect(computeTd(computeAd(typeOf(2), [0, 0, 0])).map((M) => M.map((r) => r.map((v) => v + 0)))).toEqual([frame(0), frame(1), frame(2)]);
  });
  it('Td end column equals the hand-derived elbow end point (cos q1 r, sin q1 r, 2 + sin q2 + sin(q2+q3)), r = cos q2 + cos(q2+q3)', () => {
    for (const [a, b, c] of CONFIGS) {
      const Td = computeTd(computeAd(typeOf(2), [a, b, c]));
      const r = Math.cos(b) + Math.cos(b + c);
      close3([Td[2][0][3], Td[2][1][3], Td[2][2][3]], [Math.cos(a) * r, Math.sin(a) * r, 2 + Math.sin(b) + Math.sin(b + c)]);
    }
  });
});

describe('joint variables', () => {
  it('wrapParams: a revolute angle beyond π jumps by 6.28, not 2π (original quirk)', () => {
    const w = wrapParams([1.01 * π, -1.01 * π, 0.5]);
    expect(w[0]).toBe(1.01 * π - 6.28);
    expect(w[1]).toBe(-1.01 * π + 6.28);
    expect(w[2]).toBe(0.5);
  });
  it('wrapParams: π itself and 1 ulp above are not wrapped (tolerant Greater)', () => {
    expect(wrapParams([π, 3.141592653589794, -π])).toEqual([π, 3.141592653589794, -π]);
  });
  it('defaultParams: 0 for revolute and 0.5 for prismatic joints (the slider grid initial values)', () => {
    expect(defaultParams(typeOf(2))).toEqual([0, 0, 0]);
    expect(defaultParams(typeOf(10))).toEqual([0, 0, 0.5]);
    expect(defaultParams(typeOf(6))).toEqual([0, 0.5, 0.5]);
    expect(defaultParams(typeOf(12))).toEqual([0.5, 0.5, 0.5]);
  });
  it('sliderSpec: revolute -1.01π to 1.01π in steps of 0.01π, prismatic 0 to 1 in steps of 0.01', () => {
    expect(sliderSpec(typeOf(10), 0)).toMatchObject({ label: 'θ', min: -π * 1.01, max: π * 1.01, step: 0.01 * π });
    expect(sliderSpec(typeOf(10), 2)).toMatchObject({ label: 'd', min: 0, max: 1, step: 0.01 });
  });
  it('phaseOpt: PlotRange ±3.15 for revolute and {0, 1} for prismatic joints, axes labels θ_i / d_i', () => {
    const o = phaseOpt(typeOf(10));
    expect(o.PlotRange).toEqual([[-3.15, 3.15], [-3.15, 3.15], [0, 1]]);
    expect(o.AxesLabel.map((l) => l.sym + l.sub)).toEqual(['θ1', 'θ2', 'd3']);
    expect(o).toMatchObject({ Axes: true, BoxRatios: [1, 1, 1], ImageSize: 280, PlotLabel: 'Phase Space' });
  });
});

describe('velocity Jacobians (transcribed)', () => {
  it('myJacob of the elbow arm at zero is {{0,0,0},{2,0,0},{0,2,1}} (hand-derived)', () => {
    const J = myJacob(2, 0, 0, 0).map((r) => r.map((v) => v + 0));
    expect(J).toEqual([[0, 0, 0], [2, 0, 0], [0, 2, 1]]);
  });
  it('every linear Jacobian equals the numerical derivative of o3coords (all 16 robots)', () => {
    const h = 1e-6;
    for (let t = 1; t <= 16; t++) {
      const o3 = makeO3coords(typeOf(t));
      for (const q of CONFIGS) {
        const J = myJacob(t, ...q);
        for (let j = 0; j < 3; j++) {
          const qp = q.slice(), qm = q.slice(); qp[j] += h; qm[j] -= h;
          const fp = o3(...qp), fm = o3(...qm);
          for (let r = 0; r < 3; r++) expect(Math.abs((fp[r] - fm[r]) / (2 * h) - J[r][j]), `type ${t} J[${r}][${j}]`).toBeLessThan(1e-7);
        }
      }
    }
  });
  it('angular Jacobians: columns are the joint z axes (0 for prismatic) except the spherical wrist, whose entry (3,3) has the opposite sign', () => {
    const mul = (A, B) => A.map((row) => [0, 1, 2, 3].map((j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
    for (let t = 1; t <= 16; t++) {
      for (const q of CONFIGS) {
        const JA = myJacobAngular(t, ...q);
        const Js = joints(typeOf(t));
        let M = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
        for (let j = 0; j < 3; j++) {
          const z = Js[j].jointtype === 'r' ? [M[0][2], M[1][2], M[2][2]] : [0, 0, 0];
          if (t === 15 && j === 2) z[2] = -z[2]; // K-RS-01: the original's spherical-wrist entry is -Cos[q2]
          for (let r = 0; r < 3; r++) expect(JA[r][j], `type ${t} JA[${r}][${j}]`).toBeCloseTo(z[r], 12);
          M = mul(M, dh(Js[j], q[j]));
        }
      }
    }
  });
  it('elbow determinant equals -4cos(θ2+θ3/2)cos²(θ3/2)sin(θ3/2) from the Details text', () => {
    for (const [a, b, c] of CONFIGS) {
      const ref = -4 * Math.cos(b + c / 2) * Math.cos(c / 2) ** 2 * Math.sin(c / 2);
      expect(det(myJacob(2, a, b, c))).toBeCloseTo(ref, 12);
    }
  });
  it('the elbow angular Jacobian has determinant 0 everywhere (Details text)', () => {
    for (const q of CONFIGS) expect(det(myJacobAngular(2, ...q))).toBeCloseTo(0, 14);
  });
});

describe('Graphics3D data (g3d)', () => {
  it('flatten applies directives in order and scopes them to lists', () => {
    const p = flatten(Graphics3D([Red, Sphere([[0, 0, 0], [0, 0, 2]], 0.15), Thick, Opacity(0.4), Line([[0, 0, 0], [0, 0, 4]]), [Opacity(0.3), Sphere([0, 0, 2], 2)], Line([[1, 1, 1], [2, 2, 2]])]));
    expect(p.map((x) => [x.type, x.opacity, x.thickness])).toEqual([['sphere', 1, 'Normal'], ['line', 0.4, 'Large'], ['sphere', 0.3, 'Large'], ['line', 0.4, 'Large']]);
    expect(p.every((x) => x.color.join() === '1,0,0')).toBe(true);
  });
  it('Show keeps the styles of each graphic separate and takes options from the first', () => {
    const g = Show(Graphics3D([Red, Opacity(0.5)], { PlotLabel: 'a' }), Graphics3D([Sphere([0, 0, 0], 1)], { PlotLabel: 'b', Axes: true }));
    expect(g.options).toEqual({ PlotLabel: 'a', Axes: true });
    const [s] = flatten(g);
    expect(s.color).toBe(null);
    expect(s.opacity).toBe(1);
  });
  it('Rotate turns about an axis through the origin (π/2 about y maps z to x)', () => {
    const [l] = flatten(Rotate(Line([[0, 0, 0], [0, 0, 1]]), π / 2, [0, 1, 0]));
    close3(l.points[1], [1, 0, 0], 15);
  });
  it('infinitePlanePolygon clips the plane θ2 + θ3/2 = π/2 to the plot range box', () => {
    const box = [[-3.15, 3.15], [-3.15, 3.15], [-3.15, 3.15]];
    const poly = infinitePlanePolygon([[1, 0, π], [0, 1.5 * π, -2 * π], [0, π / 2, 0]], box);
    expect(poly).toHaveLength(4);
    // hand: x = ±3.15, z = ±3.15, y = π/2 - z/2
    const want = [[3.15, π / 2 - 1.575, 3.15], [-3.15, π / 2 - 1.575, 3.15], [3.15, π / 2 + 1.575, -3.15], [-3.15, π / 2 + 1.575, -3.15]];
    for (const w of want) expect(poly.some((q) => norm(sub(q, w)) < 1e-9)).toBe(true);
  });
  it('infinitePlanePolygon of a plane lying on a face of the box is that face', () => {
    const poly = infinitePlanePolygon([[1, 0, 0], [1, 1, 0], [0, 1, 0]], [[-3.15, 3.15], [-3.15, 3.15], [0, 1]]);
    expect(poly).toHaveLength(4);
    for (const q of poly) expect(q[2]).toBe(0);
  });
});

/** points on every drawn phase-space primitive (inside the plot range) */
function phasePoints(prims, box) {
  const pts = [];
  const lerp = (a, b, s) => a.map((v, i) => v + (b[i] - v) * s);
  for (const p of prims) {
    if (p.type === 'line') for (let k = 0; k <= 8; k++) pts.push(lerp(p.points[0], p.points[1], k / 8));
    if (p.type === 'infinitePlane' || p.type === 'polygon') {
      const poly = p.type === 'polygon' ? p.points : infinitePlanePolygon(p.points, box);
      const c = poly.reduce((s, q) => s.map((v, i) => v + q[i] / poly.length), [0, 0, 0]);
      for (const v of poly) for (let k = 0; k <= 4; k++) pts.push(lerp(c, v, k / 4));
    }
    if (p.type === 'parametricSurface') for (const row of sampleSurface(p, 9, 9)) for (const q of row) pts.push(q);
  }
  return pts.filter((q) => q.every((v, i) => v >= box[i][0] - 1e-9 && v <= box[i][1] + 1e-9));
}

describe('singular sets (the original hand-written graphics)', () => {
  it('elbow Linear workspace set: red spheres r=0.15 at z=0,2,4, a thick red line with opacity 0.4 and a red sphere r=2 with opacity 0.3', () => {
    const p = flatten(singularspace3D(2, 'Linear', makeO3coords(typeOf(2))));
    expect(p).toHaveLength(3);
    expect(p[0]).toMatchObject({ type: 'sphere', centers: [[0, 0, 0], [0, 0, 2], [0, 0, 4]], radius: 0.15, opacity: 1, color: [1, 0, 0] });
    expect(p[1]).toMatchObject({ type: 'line', points: [[0, 0, 0], [0, 0, 4]], opacity: 0.4, thickness: 'Large' });
    expect(p[2]).toMatchObject({ type: 'sphere', centers: [[0, 0, 2]], radius: 2, opacity: 0.3 });
  });
  it('the Linear phase-space sets satisfy det J = 0 (all 16 robots)', () => {
    for (let t = 1; t <= 16; t++) {
      const opt = phaseOpt(typeOf(t));
      const pts = phasePoints(flatten(singularphasespace3D(t, 'Linear', opt)), opt.PlotRange);
      for (const q of pts) expect(Math.abs(det(myJacob(t, ...q))), `type ${t} at ${q}`).toBeLessThan(1e-12);
    }
  });
  it('cuboid phase-space sets mark robots whose Jacobian is singular everywhere', () => {
    for (const lv of ['Linear', 'Angular']) {
      for (let t = 1; t <= 16; t++) {
        const opt = phaseOpt(typeOf(t));
        const Jf = lv === 'Linear' ? myJacob : myJacobAngular;
        for (const c of flatten(singularphasespace3D(t, lv, opt)).filter((p) => p.type === 'cuboid')) {
          for (let k = 0; k < 20; k++) {
            const q = c.min.map((a, i) => a + (c.max[i] - a) * (((k * 7 + i * 3) % 11) / 10));
            expect(Math.abs(det(Jf(t, ...q))), `${lv} type ${t}`).toBeLessThan(1e-12);
          }
        }
      }
    }
  });
  it('the elbow phase-space set is the five planes θ3 = 0, ±π and θ2 + θ3/2 = ±π/2 of the Details text', () => {
    const planes = flatten(singularphasespace3D(2, 'Linear', phaseOpt(typeOf(2)))).filter((p) => p.type === 'infinitePlane');
    expect(planes).toHaveLength(5);
    const onPlane = (f) => planes.some((p) => p.points.every((q) => Math.abs(f(q)) < 1e-12));
    expect(onPlane((q) => q[2])).toBe(true);
    expect(onPlane((q) => q[2] - π)).toBe(true);
    expect(onPlane((q) => q[2] + π)).toBe(true);
    expect(onPlane((q) => q[1] + q[2] / 2 - π / 2)).toBe(true);
    expect(onPlane((q) => q[1] + q[2] / 2 + π / 2)).toBe(true);
  });
  it('elbow: singular configurations map onto the drawn sphere of radius 2 or the vertical line', () => {
    const o3 = makeO3coords(typeOf(2));
    for (const [a, b] of [[0.2, 0.9], [-1.3, 2.2], [2.9, -0.4]]) {
      expect(norm(sub(o3(a, b, 0), [0, 0, 2]))).toBeCloseTo(2, 12); // θ3 = 0: stretched arm on the sphere
      const p = o3(a, π / 2 - 0.35, 0.7); // θ2 + θ3/2 = π/2: end point above the shoulder
      expect(Math.hypot(p[0], p[1])).toBeLessThan(1e-12);
    }
  });
  it('spherical wrist Linear: the drawn translucent sphere has radius 0.2 while the end point moves on the unit sphere (lead)', () => {
    const p = flatten(singularspace3D(15, 'Linear', makeO3coords(typeOf(15))));
    expect(p.find((x) => x.opacity === 0.3)).toMatchObject({ type: 'sphere', centers: [[0, 0, 1]], radius: 0.2 });
    const o3 = makeO3coords(typeOf(15));
    for (const q of CONFIGS) expect(norm(sub(o3(...q), [0, 0, 1]))).toBeCloseTo(1, 12);
  });
  it('the CNC arm has no singular set (Linear) and its phase graphic is empty', () => {
    expect(flatten(singularspace3D(12, 'Linear', makeO3coords(typeOf(12))))).toEqual([]);
    expect(flatten(singularphasespace3D(12, 'Linear', phaseOpt(typeOf(12))))).toEqual([]);
  });
  it('twisted spherical: the only surfaces keeping the default mesh (original quirk)', () => {
    const meshed = [];
    for (const lv of ['Linear', 'Angular']) for (let t = 1; t <= 16; t++) {
      const opt = phaseOpt(typeOf(t));
      for (const p of [...flatten(singularspace3D(t, lv, makeO3coords(typeOf(t)))), ...flatten(singularphasespace3D(t, lv, opt))]) {
        if (p.type === 'parametricSurface' && p.mesh !== 'None') meshed.push(`${lv}${t}`);
      }
    }
    expect([...new Set(meshed)]).toEqual(['Linear9']);
  });
  it('offset spherical wrist Linear workspace curves are the thick circles o3coords(a, 0 or π, -π/2)', () => {
    const p = flatten(singularspace3D(16, 'Linear', makeO3coords(typeOf(16)))).filter((x) => x.type === 'parametricCurve');
    expect(p).toHaveLength(2);
    expect(p.every((x) => x.thickness === 'Large')).toBe(true);
    const pts = sampleCurve(p[0], 9);
    close3(pts[4], [0, -1, 2]); // hand: Tz(1) Rx(90°), then Tz(1/2) Rx(-90°), then Rz(-90°) Tz(1) Tx(1/2) from the origin
  });
});

describe('SVD and manipulability ellipsoid', () => {
  const reconstruct = ({ U, S, V }) => U.map((r) => [0, 1, 2].map((j) => r.reduce((s, u, k) => s + u * S[k] * V[j][k], 0)));
  const orthogonal = (Q) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(Q.reduce((s, r) => s + r[i] * r[j], 0)).toBeCloseTo(i === j ? 1 : 0, 12); };
  it('svd3 of the elbow Jacobian at zero: singular values √5, 2, 0 with U columns ±z, ±y, ±x (hand-derived)', () => {
    const d = svd3([[0, 0, 0], [2, 0, 0], [0, 2, 1]]);
    expect(d.S[0]).toBeCloseTo(Math.sqrt(5), 14);
    expect(d.S[1]).toBeCloseTo(2, 14);
    expect(d.S[2]).toBeCloseTo(0, 14);
    close3(d.U.map((r) => Math.abs(r[0])), [0, 0, 1], 14);
    close3(d.U.map((r) => Math.abs(r[1])), [0, 1, 0], 14);
    close3(d.U.map((r) => Math.abs(r[2])), [1, 0, 0], 14);
  });
  it('svd3 reconstructs A = U Σ Vᵀ with orthogonal U and V and descending singular values', () => {
    const mats = [[[1, 2, 3], [4, 5, 6], [7, 8, 10]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[1, 1, 1], [1, 1, 1], [1, 1, 1]], [[0, 0, 0], [0, 0, 0], [0, 0, 0]], myJacob(16, 0.3, -1, 2)];
    for (const A of mats) {
      const d = svd3(A);
      const R = reconstruct(d);
      for (let i = 0; i < 3; i++) close3(R[i], A[i], 12);
      orthogonal(d.U); orthogonal(d.V);
      expect(d.S[0] >= d.S[1] && d.S[1] >= d.S[2] && d.S[2] >= 0).toBe(true);
    }
  });
  it('svd3 singular values are the square roots of the eigenvalues of AᵀA (trace and determinant check)', () => {
    const A = myJacob(4, 0.7, -0.2, 1.3);
    const { S } = svd3(A);
    const AtA = [0, 1, 2].map((i) => [0, 1, 2].map((j) => A.reduce((s, r) => s + r[i] * r[j], 0)));
    expect(S.reduce((s, x) => s + x * x, 0)).toBeCloseTo(AtA[0][0] + AtA[1][1] + AtA[2][2], 12);
    expect(S[0] * S[1] * S[2]).toBeCloseTo(Math.abs(det(A)), 12);
  });
  it('matrixRank uses the relative tolerance 3 eps of the largest singular value', () => {
    // REGRESSION PIN of the port's choice (K-RS-05): Mathematica's data only bound the tolerance between 1e-17 and 1e-13
    const eps = 2 ** -52;
    expect(matrixRank([1, 0.5, 2 * eps])).toBe(2);
    expect(matrixRank([1, 0.5, 4 * eps])).toBe(3);
    expect(matrixRank([1e-10, 0.5e-10, 1e-27])).toBe(2); // relative, not absolute
    expect(matrixRank([1e-10, 0.5e-10, 1e-20])).toBe(3);
    expect(matrixRank([0, 0, 0])).toBe(0);
  });
  it('svd3 orders repeated singular values by the dominant axis of their singular vectors', () => {
    const d = svd3([[0, 0, 2], [2, 0, 0], [0, 2, 0]]); // columns 2 e_y, 2 e_z, 2 e_x
    expect(d.S).toEqual([2, 2, 2]);
    expect(d.U.map((r) => r.map(Math.abs))).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  });
  it('manipEllip halves the singular values, draws arrows and rings only for Σ_ii > 0.1 and the ellipsoid only at full rank', () => {
    const e0 = manipEllip([[0, 0, 0], [2, 0, 0], [0, 2, 1]], [2, 0, 2]);
    close3(e0.Sigma, [Math.sqrt(5) / 2, 1, 0], 14);
    const t0 = flatten(e0.graphics).map((p) => p.type);
    expect(t0.filter((x) => x === 'arrow')).toHaveLength(4);
    expect(t0.filter((x) => x === 'circle')).toHaveLength(2);
    expect(t0).not.toContain('ellipsoid');
    const e1 = manipEllip(myJacob(2, 0.3, 0.4, 1.0), [0, 0, 0]);
    expect(e1.rank).toBe(3);
    expect(flatten(e1.graphics).map((p) => p.type).filter((x) => x === 'ellipsoid')).toHaveLength(1);
  });
  it('manipEllip for a hand-made Jacobian with singular values 3, 2, 0.5: blue arrows ±1.5 z, red ±1 x, green ±0.25 y, rings in those planes', () => {
    // J maps e1 -> 3 e_z, e3 -> 2 e_x, e2 -> 0.5 e_y: singular values 3, 2, 0.5 with u1 = ±e_z, u2 = ±e_x, u3 = ±e_y
    const o3 = [0.5, -0.2, 1.7];
    const e = manipEllip([[0, 0, 2], [0, 0.5, 0], [3, 0, 0]], o3);
    close3(e.Sigma, [1.5, 1, 0.25], 14);
    expect(e.rank).toBe(3);
    const prims = flatten(e.graphics);
    const arrows = prims.filter((p) => p.type === 'arrow');
    expect(arrows.map((a) => a.color.join())).toEqual(['0,0,1', '0,0,1', '1,0,0', '1,0,0', '0,1,0', '0,1,0']);
    const tips = (k) => arrows.slice(2 * k, 2 * k + 2).map((a) => sub(a.points[1], o3).map((v) => Math.round(v * 1e12) / 1e12 + 0)).sort();
    for (const a of arrows) close3(a.points[0], o3, 14);
    expect(tips(0)).toEqual([[0, 0, -1.5], [0, 0, 1.5]]);
    expect(tips(1)).toEqual([[-1, 0, 0], [1, 0, 0]]);
    expect(tips(2)).toEqual([[0, -0.25, 0], [0, 0.25, 0]]);
    // rings: blue in the z-x plane (semi-axes 1.5, 1), red in the x-y plane (1, 0.25), darker green in the z-y plane (1.5, 0.25)
    const rings = prims.filter((p) => p.type === 'circle').map((p) => ({ color: p.color, pts: sampleCircle(p, 17).map((q) => sub(q, o3)) }));
    expect(rings.map((r) => r.color.map((v) => Math.round(v * 1000) / 1000).join())).toEqual(['0,0,1', '1,0,0', '0,0.667,0']);
    const onEllipse = (pts, [i, ai], [j, aj], k) => { for (const q of pts) { expect((q[i] / ai) ** 2 + (q[j] / aj) ** 2).toBeCloseTo(1, 12); expect(q[k]).toBeCloseTo(0, 12); } };
    onEllipse(rings[0].pts, [2, 1.5], [0, 1], 1);
    onEllipse(rings[1].pts, [0, 1], [1, 0.25], 2);
    onEllipse(rings[2].pts, [2, 1.5], [1, 0.25], 0);
  });
});

describe('Manipulate body', () => {
  it('initial state: the values saved in the original notebook (elbow, zeros, Linear, iTypeOld 2, label phase space)', () => {
    expect(initialState()).toEqual({ iType: 2, params: [0, 0, 0], showRobot: false, showManipulability: false, isJLinearVel: 'Linear', iTypeOld: 2, isJLinearVelOld: 'Linear', singularLabel: 'phase space' });
  });
  it('opening state: the singular sets are not recomputed, so the stale label phase space stays (original quirk)', () => {
    const { view } = evaluate(initialState());
    expect(view.recomputed).toBe(false);
    expect(view.phaseOpt.PlotLabel).toBe('phase space');
  });
  it('changing the robot or Linear/Angular recomputes the singular sets and the label becomes Phase Space, a slider move does not', () => {
    let { state } = evaluate(initialState());
    let r = evaluate({ ...state, params: [0.3, 0, 0] });
    expect(r.view.recomputed).toBe(false);
    r = evaluate({ ...r.state, isJLinearVel: 'Angular' });
    expect(r.view.recomputed).toBe(true);
    expect(r.view.phaseOpt.PlotLabel).toBe('Phase Space');
    r = evaluate(selectType(r.state, 10));
    expect(r.view.recomputed).toBe(true);
    expect(r.state.iTypeOld).toBe(10);
    state = r.state;
    expect(evaluate(state).view.recomputed).toBe(false);
  });
  it('selectType resets the joint values to the slider defaults, selecting the same robot keeps them (original quirk)', () => {
    const st = { ...initialState(), params: [1, 2, -1] };
    expect(selectType(st, 10).params).toEqual([0, 0, 0.5]);
    expect(selectType(st, 3).params).toEqual([0, 0, 0]);
    expect(selectType(st, 2).params).toEqual([1, 2, -1]);
  });
  it('evaluate wraps the joint values by 6.28 and stores them', () => {
    const { state } = evaluate({ ...initialState(), params: [1.01 * π, 0, -1.01 * π] });
    expect(state.params[0]).toBeCloseTo(1.01 * π - 6.28, 14);
    expect(state.params[2]).toBeCloseTo(-1.01 * π + 6.28, 14);
  });
  it('drawCoordAxes: red z, blue x and green y arrows of length 2jr = 0.4 with thick lines', () => {
    const p = flatten(drawCoordAxes(1 / 5));
    const shaft = (c) => p.find((x) => x.color.join() === c && x.points[0].every((v) => v === 0));
    close3(shaft('1,0,0').points[1], [0, 0, 0.4], 15);
    close3(shaft('0,0,1').points[1], [0.4, 0, 0], 15);
    close3(shaft('0,1,0').points[1], [0, 0.4, 0], 15);
    expect(p).toHaveLength(15);
    expect(p.every((x) => x.thickness === 'Large')).toBe(true);
  });
  it('drawJoint: revolute = gray axis cylinder, light-blue joint cylinder r = 0.14, gray link rotated by Theta, prismatic = gray cuboid and two light-blue cuboids', () => {
    const r = flatten(drawJoint('r', 2, 1, π / 2)).filter((x) => x.type !== 'line');
    expect(r.map((x) => x.type)).toEqual(['cylinder', 'cylinder', 'cuboid']);
    expect(r[0]).toMatchObject({ color: [0.5, 0.5, 0.5], radius: 1 / 20, p1: [0, 0, Math.min(-1 / 20, 2 - 1 / 5) - 0.01], p2: [0, 0, 2 + 0.01] });
    expect(r[1]).toMatchObject({ color: [0.87, 0.94, 1], radius: 0.7 / 5 });
    expect(r[2]).toMatchObject({ min: [-1 / 20, -1 / 20, 2 - 1 / 20], max: [1, 1 / 20, 2 + 1 / 20] });
    // rotated by π/2 about z: the link's far end (1, 0, 2) goes to (0, 1, 2)
    const M = r[2].matrix;
    close3([M[0][0] * 1 + M[0][3], M[1][0] * 1 + M[1][3], 2], [0, 1, 2], 15);
    const p = flatten(drawJoint('p', 0.5, 0, 0)).filter((x) => x.type !== 'line');
    expect(p.map((x) => x.type)).toEqual(['cuboid', 'cuboid', 'cuboid']);
    expect(p[0]).toMatchObject({ min: [-1 / 20, -1 / 20, -1 / 5 - 0.01], max: [1 / 20, 1 / 20, 0.5 + 0.01] });
  });
  it('the robot: wrist centre point at the end point, ground cylinder radius 2.2', () => {
    const st = { ...initialState(), showRobot: true, params: [0.4, 0.3, -0.8] };
    const { view } = evaluate(st);
    const pts = view.workspacePrims.filter((x) => x.type === 'point');
    expect(pts).toHaveLength(1);
    const r = Math.cos(0.3) + Math.cos(0.3 - 0.8); // hand-derived elbow end point
    close3(pts[0].points[0], [Math.cos(0.4) * r, Math.sin(0.4) * r, 2 + Math.sin(0.3) + Math.sin(0.3 - 0.8)], 12);
    expect(view.workspacePrims[0]).toMatchObject({ type: 'cylinder', radius: 2.2, color: [0.94, 0.91, 0.88] });
  });
  it('workspace plot range covers all shown objects (ground ±2.2, top sphere to z = 4.15)', () => {
    const { view } = evaluate(initialState());
    const b = view.workspaceBox;
    close3(b.flat(), [-2.2, 2.2, -2.2, 2.2, -0.4, 4.15], 12);
    expect(primitiveBounds([])).toBe(null);
  });
  it('phase graphic: blue sphere radius 0.2 at params, plus a light-blue sphere radius 1/2 with the ellipsoid', () => {
    const st = { ...initialState(), params: [0.5, -1, 2] };
    const extra = (v) => flatten(v.phase).slice(flatten(v.singPhase).length);
    const a = extra(evaluate(st).view);
    expect(a).toEqual([expect.objectContaining({ type: 'sphere', centers: [[0.5, -1, 2]], radius: 0.2, color: [0, 0, 1] })]);
    const b = extra(evaluate({ ...st, showManipulability: true }).view);
    expect(b[1]).toMatchObject({ type: 'sphere', radius: 0.5, opacity: 0.5, color: [0.87, 0.94, 1] });
  });
});

describe('shared/mma-lighting.js', () => {
  it('mma-lighting: the documented default lights of Lighting -> Automatic', () => {
    // https://reference.wolfram.com/language/ref/Lighting.html
    expect(MMA_DEFAULT_LIGHTS).toEqual([
      { kind: 'Ambient', color: [0.4, 0.2, 0.2] },
      { kind: 'Directional', color: [0, 0.18, 0.5], imageScaled: [2, 0, 2] },
      { kind: 'Directional', color: [0.18, 0.5, 0.18], imageScaled: [2, 2, 3] },
      { kind: 'Directional', color: [0.5, 0.18, 0], imageScaled: [0, 2, 2] },
      { kind: 'Directional', color: [0, 0, 0.18], imageScaled: [0, 0, 2] },
    ]);
    expect(imageScaledDirection([0, 2, 2])).toEqual([-0.5, 1.5, 2]); // orange from the top left, toward the viewer
  });
  it('mma-lighting: replaces the lights of a camera with one ambient and four directional lights', () => {
    const cam = new THREE.PerspectiveCamera();
    cam.add(new THREE.AmbientLight(0xffffff, 1), new THREE.DirectionalLight(0xffffff, 1));
    addMathematicaLighting(cam);
    const lights = cam.children.filter((o) => o.isLight);
    expect(lights.map((l) => l.type)).toEqual(['AmbientLight', 'DirectionalLight', 'DirectionalLight', 'DirectionalLight', 'DirectionalLight']);
    expect(lights[4].color.toArray()).toEqual([0, 0, 0.18]);
    expect(lights[2].position.toArray()).toEqual([1.5, 1.5, 3]);
    expect(lights[1].intensity).toBeCloseTo(Math.PI, 14);
  });
});
