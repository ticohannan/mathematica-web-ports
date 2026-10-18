// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Lillian Lin
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/two-link-kinematics.test.js — the pure parts of demos/two-link-kinematics (model.js, velocity-pad.js's
// padSetter). Expected values are derived by hand or from an independent formula written next to each case (the
// TESTPLAN rows T-TK-01 … T-TK-19, T-TK-25 … T-TK-29, T-TK-83 of the design draft); never from the port. The tests of the
// common modules this app owns (two-link.js, arrow-arcs.js, dial-control.js: T-TK-20 … T-TK-24, T-TK-30, T-TK-86,
// T-TK-87) are in tests/unit/two-link.test.js, arrow-arcs.test.js and dial-control.test.js.
import { describe, it, expect } from 'vitest';
import {
  INITIAL, initialState, evaluate, scene, Theta2inv, Theta1inv, reArcTanD, theta2D, jacobian, svd2, pseudoInverse2,
  matMul, transpose, SVD_ZERO_TOL,
} from '../../demos/two-link-kinematics/model.js';
import { padSetter, padPointer } from '../../demos/two-link-kinematics/velocity-pad.js';
import { matrixRank } from '../../demos/robot-singularities/svd3.js';
import { arcTan } from '../../shared/mma-exact.js';

const ulps = (a, b) => (a === b ? 0 : Math.abs(a - b) / (Number.EPSILON * Math.max(Math.abs(a), Math.abs(b))));
const near = (p, q, n = 2) => p.forEach((v, i) => expect(ulps(v, q[i]), `${v} vs ${q[i]}`).toBeLessThanOrEqual(n));
const close = (p, q, tol = 1e-15) => p.forEach((v, i) => expect(Math.abs(v - q[i]), `${v} vs ${q[i]}`).toBeLessThanOrEqual(tol));
const live = () => evaluate(initialState()).state; // the saved state (T-TK-31)
const step = (s, partial) => evaluate({ ...s, ...partial });
const ikAt11 = () => step(live(), { pEnd: [1, 1] }); // "state of T-TK-07"

describe('two-link-kinematics: inverse kinematics', () => {
  it('Theta2inv: on or beyond the outer circle theta2 is exactly 0 (tolerant >=)', () => {
    const x = 1.414213562373095;
    expect(x * x + x * x).toBe(3.999999999999999); // below 4 by 2.2e-16 relative < 2^-46
    expect(Theta2inv(x, x, 1, 1, true)).toBe(0);
    expect(Theta2inv(1.5, 1.5, 1, 1, true)).toBe(0);
    // a plain >= would go on to D = 0.9999999999999996 and θ2 = −2.98e-8
    const D = theta2D(x, x, 1, 1);
    expect(D).toBe(0.9999999999999996);
    expect(reArcTanD(D, -1)).toBeCloseTo(-2.98e-8, 9);
  });
  it('Theta2inv: D = 0 gives -pi/2 elbow up and +pi/2 elbow down', () => {
    expect(theta2D(1, 1, 1, 1)).toBe(0); // (−1 − 1 + 1 + 1)/2
    expect(Theta2inv(1, 1, 1, 1, true)).toBe(-1.5707963267948966);
    expect(Theta2inv(1, 1, 1, 1, false)).toBe(1.5707963267948966);
  });
  it('Theta2inv: D = -1 gives +pi for both elbow settings (no negative zero)', () => {
    expect(theta2D(0.6, 0.8, 1.5, 0.5)).toBe(-1); // (0.36 + 0.64 − 2.25 − 0.25)/1.5, every summation order
    expect(Theta2inv(0.6, 0.8, 1.5, 0.5, true)).toBe(3.141592653589793); // ArcTan[−1, −1·Sqrt[0.]] = ArcTan[−1, 0] = π
    expect(Theta2inv(0.6, 0.8, 1.5, 0.5, false)).toBe(3.141592653589793);
  });
  it('Theta2inv: Re of the complex ArcTan is 0 for D > 1 and pi for D < -1', () => {
    // ArcTan[x, y] = −i Log[(x + i y)/√(x² + y²)]; y = ±i√(D² − 1): a positive real ratio (Re 0) for D > 1 and a
    // negative real ratio (Log = ln + iπ, Re π) for D < −1 (Wolfram reference, complex arguments)
    for (const sign of [-1, 1]) {
      expect(reArcTanD(1 + 2 ** -52, sign)).toBe(0);
      expect(reArcTanD(-1 - 2 ** -52, sign)).toBe(Math.PI);
    }
  });
  it('Theta1inv: theta1 = ArcTan[x, y] - ArcTan[r1 + r2 Cos[theta2], r2 Sin[theta2]]', () => {
    // ArcTan[1, 1] = π/4; ArcTan[1 + cos(∓π/2), ∓1] = ∓π/4
    near([Theta1inv(1, 1, 1, 1, -Math.PI / 2)], [1.5707963267948966]);
    expect(Math.abs(Theta1inv(1, 1, 1, 1, Math.PI / 2))).toBeLessThanOrEqual(2 * Number.EPSILON);
  });
  it('the clamp puts pEnd on the circle of radius 2 and on the inner circle abs(r1 - r2)', () => {
    // 2 (pEnd/Norm[pEnd]) = 2·((2, 2)·(1/√8)); Abs[r1 - r2] (pEnd/Norm[pEnd]) = 1·((0.3, 0.4)·(1/0.5)) (N-TK-01)
    const a = step(live(), { pEnd: [2, 2] });
    expect(a.locals.clamp).toBe('outer');
    expect(a.state.pEnd).toEqual([1.414213562373095, 1.414213562373095]);
    const b = step(live(), { r1: 1.5, pEnd: [0.3, 0.4] });
    expect(b.locals.clamp).toBe('inner');
    expect(b.state.pEnd).toEqual([0.6, 0.8]);
  });
  it('IK writes p1 and p2 but leaves pEnd as dragged', () => {
    const r = ikAt11();
    expect(r.locals.kinematics).toBe('IK');
    expect(r.state.pEnd).toEqual([1, 1]);
    expect(r.state.p1).toEqual([6.123233995736766e-17, 1]); // cos and sin of the double π/2
    expect(r.state.p2).toEqual([6.123233995736766e-17, -1]);
    expect(r.state.IsElbowUp).toBe(true);
  });
  it('the elbow checkbox switches to the other IK solution', () => {
    const r = step(ikAt11().state, { IsElbowUp: false });
    expect(r.locals.kinematics).toBe('IK');
    expect(r.locals.Theta1).toBe(0); // π/4 − π/4
    expect(r.locals.Theta2).toBe(1.5707963267948966);
    expect(r.state.p1).toEqual([1, 0]);
    expect(r.state.p2).toEqual([6.123233995736766e-17, 1]);
    expect(r.state.IsElbowUp).toBe(false);
    expect(r.state.pEnd).toEqual([1, 1]);
  });
  it('tolerant Unequal: a 1-ulp change of pEnd does not start IK', () => {
    const s = ikAt11().state;
    expect(step(s, { pEnd: [1 + 2 ** -52, 1] }).locals.kinematics).toBe('FK'); // Unequal on lists is tolerant (K-SL-04)
    expect(step(s, { pEnd: [1.001, 1] }).locals.kinematics).toBe('IK');
  });
});

describe('two-link-kinematics: forward kinematics', () => {
  it('FK from the dials: theta from ArcTan of p1 and p2, pEnd = tip', () => {
    const r = step(live(), { p1: [0, 1] });
    expect(r.locals.kinematics).toBe('FK');
    expect(r.locals.Theta1).toBe(1.5707963267948966);
    expect(r.locals.Theta2).toBe(0);
    expect(r.state.pEnd).toEqual([1.2246467991473532e-16, 2]); // (cos θ1 + cos θ1, sin θ1 + sin θ1)
    expect(r.state.IsElbowUp).toBe(true);
  });
  it('IsElbowUp follows the sign of theta2 and is kept at theta2 = 0', () => {
    for (const before of [true, false]) {
      const s = { ...live(), IsElbowUp: before, IsElbowUpp: before };
      expect(step(s, { p2: [0, -1] }).state.IsElbowUp).toBe(true); // θ2 = −π/2
      expect(step(s, { p2: [0, 1] }).state.IsElbowUp).toBe(false); // θ2 = +π/2
      expect(step(s, { p2: [1, 0] }).state.IsElbowUp).toBe(before); // θ2 = 0: neither If fires
    }
  });
  it('r1 change keeps the joint angles unless the old tip is inside the new hole', () => {
    // (a) straight arm: FK, the tip moves with r1 + r2 = 2
    const a = step(live(), { r1: 1.5 });
    expect(a.locals.kinematics).toBe('FK');
    expect([a.locals.Theta1, a.locals.Theta2]).toEqual([0, 0]);
    expect(a.state.pEnd).toEqual([2, 0]);
    // (b) folded arm: the tip at rounding distance from the origin, then r1 = 1.4 pushes it to the inner circle
    // abs(1.4 − 0.6000000000000001) = 0.7999999999999998 along pEnd·(1/n) = (0, 1)
    const b1 = step(live(), { p2: [-1, 0] });
    expect(b1.state.pEnd).toEqual([0, 1.2246467991473532e-16]);
    const b2 = step(b1.state, { r1: 1.4 });
    expect(b2.state.pEnd).toEqual([0, 0.7999999999999998]);
    expect(b2.locals.kinematics).toBe('IK');
    expect(b2.locals.Theta2).toBe(Math.PI);
    near([b2.locals.Theta1], [Math.PI / 2]);
    expect(b2.state.IsElbowUp).toBe(false);
  });
});

describe('two-link-kinematics: Jacobian and SVD', () => {
  it('Jacobian at theta1 = pi/2, theta2 = -pi/2 has singular values (sqrt 5 +- 1)/2', () => {
    const J = jacobian(1, 1, Math.PI / 2, -Math.PI / 2);
    close(J.flat(), [-1, 0, 1, 1], 2e-16);
    // J Jᵀ = {{1, −1}, {−1, 2}}: eigenvalues (3 ± √5)/2, so σ = (√5 ± 1)/2
    near(svd2(J).S, [1.618033988749895, 0.6180339887498949]);
    expect(ikAt11().locals.S[0]).toBe(svd2(J).S[0]);
  });
  it('svd2: J = U S V^T, orthogonal U and V, S descending', () => {
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const mats = [];
    for (let i = 0; i < 1000; i++) mats.push([[4 * rnd() - 2, 4 * rnd() - 2], [4 * rnd() - 2, 4 * rnd() - 2]]);
    for (const r1 of [0, 0.5, 1, 1.5, 2]) for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) mats.push(jacobian(r1, 2 - r1, -Math.PI + (i * 2 * Math.PI) / 20, -Math.PI + (j * 2 * Math.PI) / 20));
    const fro = (M) => Math.hypot(...M.flat());
    for (const J of mats) {
      const { U, S, V } = svd2(J);
      const R = matMul(matMul(U, [[S[0], 0], [0, S[1]]]), transpose(V));
      const nJ = fro(J);
      expect(fro([[R[0][0] - J[0][0], R[0][1] - J[0][1]], [R[1][0] - J[1][0], R[1][1] - J[1][1]]])).toBeLessThanOrEqual(1.2e-14 * nJ);
      for (const Q of [U, V]) {
        const G = matMul(transpose(Q), Q);
        expect(fro([[G[0][0] - 1, G[0][1]], [G[1][0], G[1][1] - 1]])).toBeLessThanOrEqual(4e-16);
      }
      expect(S[0]).toBeGreaterThanOrEqual(S[1]);
      expect(S[1]).toBeGreaterThanOrEqual(0);
      // trace and determinant of JᵀJ (independent of the SVD code)
      if (nJ > 0) expect(Math.abs(S[0] ** 2 + S[1] ** 2 - nJ ** 2)).toBeLessThanOrEqual(1e-15 * nJ ** 2 * 2);
      expect(Math.abs(S[0] * S[1] - Math.abs(J[0][0] * J[1][1] - J[0][1] * J[1][0]))).toBeLessThanOrEqual(1.2e-14 * nJ ** 2);
    }
  });
  it('svd2: an exactly singular J has S22 exactly 0 (straight arm with r1 = r2)', () => {
    const s = Math.sin(0.7), c = Math.cos(0.7);
    for (const J of [[[-2 * s, -s], [2 * c, c]], [[0, 0], [2, 1]]]) {
      const { S } = svd2(J);
      expect(S[1]).toBe(0); // det = −2sc + 2sc = 0 exactly (doubling is exact)
      near([S[0]], [2.23606797749979], 1); // ‖J‖_F = √5
    }
    const { U } = svd2([[0, 0], [2, 1]]);
    expect(Math.abs(U[0][0])).toBe(0);
    expect(Math.abs(U[1][0])).toBe(1); // u1 = ±(0, 1) exactly
  });
  it('svd2 zeroes singular values at or below 100 times 2^-53 of the largest', () => {
    expect(SVD_ZERO_TOL).toBe(100 * 2 ** -53);
    // σ2 = abs(det)/σ1 = 1e-14/√2 = 7.07e-15 <= 100·2^-53·√2 = 1.57e-14 → 0; 7.07e-14 → kept
    expect(svd2([[1, 0], [1, 1e-14]]).S).toEqual([1.4142135623730951, 0]);
    const k = svd2([[1, 0], [1, 1e-13]]).S;
    expect(k[0]).toBe(1.4142135623730951);
    near([k[1]], [7.071067811865475e-14], 4);
  });
  it('matrixRank of Sigma: 2 for the regular arm, 1 at theta2 = 0', () => {
    expect(matrixRank(svd2(jacobian(1, 1, Math.PI / 2, -Math.PI / 2)).S)).toBe(2);
    expect(matrixRank(svd2([[0, 0], [2, 1]]).S)).toBe(1);
  });
  it('the second If of the singular branch never runs (Sigma11 > 0 for every r1 in 0..2)', () => {
    // σ1 >= the length of J's second column (r2), and = r1 = 2 when r2 = 0; grid minimum from the JᵀJ eigenvalue formula
    let min = Infinity, minOwn = Infinity;
    for (let i = 0; i <= 8; i++) {
      const r1 = i * 0.25;
      for (let j = 0; j < 64; j++) for (let k = 0; k < 64; k++) {
        const J = jacobian(r1, 2 - r1, (j * 2 * Math.PI) / 64, (k * 2 * Math.PI) / 64);
        const [[a, b], [c, d]] = J;
        const p = a * a + c * c, q = a * b + c * d, r = b * b + d * d;
        min = Math.min(min, Math.sqrt((p + r) / 2 + Math.hypot((p - r) / 2, q)));
        minOwn = Math.min(minOwn, svd2(J).S[0]);
      }
    }
    expect(minOwn).toBeGreaterThan(0);
    expect(Math.abs(min - 0.8838874555028114)).toBeLessThan(1e-14); // at r1 = 1.25
    expect(Math.abs(minOwn - min)).toBeLessThan(1e-14);
  });
});

describe('two-link-kinematics: velocity kinematics', () => {
  it('inverse velocity inside the ellipse: jointVel = J^-1 (pVel - pEnd)', () => {
    const r = step(ikAt11().state, { pVel: [1.2, 1.3] });
    expect(r.locals.velocity).toBe('inverse');
    expect(r.locals.velocityBranch).toBe('regular');
    near([r.locals.vNorm], [0.5385164807134504]); // √0.29 = ‖J⁻¹ d‖
    expect(r.state.pVel).toEqual([1.2, 1.3]);
    close(r.state.jointVel, [-0.2, 0.5]); // J⁻¹ = {{−1, 0}, {1, 1}}, d = (0.2, 0.3)
  });
  it('inverse velocity outside the ellipse scales pVel - pEnd radially to the ellipse', () => {
    const r = step(ikAt11().state, { pVel: [3, 1] });
    near([r.locals.vNorm], [2.8284271247461903]); // J⁻¹ (2, 0) = (−2, 2)
    expect(r.state.pVel).toEqual([1.7071067811865475, 1]); // (2, 0)/(2√2) + (1, 1)
    close(r.state.jointVel, [-0.7071067811865476, 0.7071067811865476]);
    expect(Math.hypot(...r.state.jointVel)).toBeCloseTo(1, 15);
  });
  it('singular branch projects pVel onto the long axis and caps it at Sigma11', () => {
    const r = step(live(), { pVel: [2.5, 4] });
    expect(r.locals.velocityBranch).toBe('singular');
    // u1 = (0, 1): q1 = 4 > σ1 = √5, factor √5/4
    expect(r.state.pVel).toEqual([2, 2.23606797749979]);
    near(r.state.jointVel, [0.894427190999916, 0.447213595499958]); // J⁺ = Jᵀ/5: (2√5, √5)/5
  });
  it('PseudoInverse of the rank-1 Jacobian gives 2/5 and 1/5 at the initial settings', () => {
    const J = [[0, 0], [2, 1]];
    const P = pseudoInverse2(J);
    const v = [P[0][0] * 0 + P[0][1] * 1, P[1][0] * 0 + P[1][1] * 1];
    expect(v).toEqual([0.4, 0.2]); // Jᵀ d/‖J‖²_F = (2, 1)/5; the notebook's Rational[2, 5], Rational[1, 5]
  });
  it('forward velocity pVel = J.jointVel + pEnd', () => {
    const r = step(ikAt11().state, { jointVel: [0, 1] });
    expect(r.locals.velocity).toBe('forward');
    close(r.state.pVel, [1, 2], 2e-16); // J (0, 1) = (−sin 0, cos 0) at θ1 + θ2 = 0
  });
  it('velocity pad setter clamps to the unit disk', () => {
    expect(padSetter([0.3, 0.4])).toEqual([0.3, 0.4]);
    expect(padSetter([3, 4])).toEqual([0.6000000000000001, 0.8]); // (3, 4)·(1/5)
    expect(padSetter([1, 0])).toEqual([1, 0]);
    expect(padSetter([1.0000000000000002, 0])).toEqual([1.0000000000000002, 0]); // Norm > 1 is tolerant (Q-TK-09)
    // the LocatorPane limits the pointer to the pad's plot range first (±1.04): the far corner gives 45° (K-TK-13)
    const p = padPointer([100, 3]);
    expect(arcTan(p[0], p[1])).toBe(0.7853981633974483);
  });
});

describe('two-link-kinematics: drawing data', () => {
  it('manipulability ellipse geometry: semi-axes Sigma11 and Sigma22 along U columns centred at pEnd', () => {
    const r = ikAt11();
    const sc = scene(r.state, r.locals);
    const ell = sc.find((d) => d.role === 'ellipse');
    expect(ell.center).toEqual([1, 1]);
    near(ell.radii, [1.618033988749895, 0.6180339887498949]);
    // the eigenvector (1, −φ)/‖·‖ of J Jᵀ for (3 + √5)/2, up to its sign
    const s = Math.sign(ell.axis[0]);
    close(ell.axis.map((v) => s * v), [0.5257311121191336, -0.8506508083520399]);
    const tips = ['sigma1-plus', 'sigma1-minus'].map((role) => sc.find((d) => d.role === role).to);
    const want = [[1.8506508083520399, -0.3763819204711736], [0.14934919164796, 2.3763819204711734]];
    const sorted = tips.slice().sort((a, b) => b[0] - a[0]);
    close(sorted[0], want[0]);
    close(sorted[1], want[1]);
  });
  it('the drawing order follows the Graphics list; no ellipse at rank 1 and the hole only for r1 != 1', () => {
    const r = evaluate(initialState());
    const roles = scene(r.state, r.locals).map((d) => d.role);
    expect(roles).toEqual([
      'workspace', 'workspace-label', 'sigma1-plus', 'sigma1-minus', 'sigma2-plus', 'sigma2-minus', 'link1', 'base',
      'jointVel1', 'theta1-arc', 'link2', 'robot-arm', 'elbow', 'jointVel2', 'theta2-arc', 'loc-pVel', 'loc-pEnd', 'velocity',
    ]);
    const r2 = step(r.state, { r1: 1.5 });
    const hole = scene(r2.state, r2.locals).find((d) => d.role === 'hole');
    expect(hole.r).toBe(1);
  });
  it('the initial settings are the stored Variables', () => {
    expect(INITIAL).toEqual({
      r1: 1, pEnd: [2, 0], pEndp: [2, 0], pVel: [2, 1], pVelp: [1, 1], p1: [1, 0], p2: [1, 0], IsElbowUp: true, IsElbowUpp: true, jointVel: [1, 0],
    });
  });
  it('pEnd exactly at the origin is Indeterminate in the original: the port keeps the state (D-TK-07)', () => {
    const r = step(live(), { pEnd: [0, 0] });
    expect(r.indeterminate).toBe(true);
    expect(r.state).toEqual({ ...live(), pEnd: [0, 0] });
  });
});
