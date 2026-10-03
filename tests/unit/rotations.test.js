// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Adapted from Wolfram Demonstrations Project content (see LICENSE.md)
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/rotations.test.js — rotation parametrizations + Euler gyroscope model
import { describe, it, expect } from 'vitest';
import * as R from '../../demos/three-parametrizations/rotations.js';
import { rotationMatrix, matMul, transpose, matVec } from '../../shared/linalg.js';
import * as E from '../../demos/euler-angles/model.js';

const maxDiff = (A, B) => Math.max(...A.flat().map((v, i) => Math.abs(v - B.flat()[i])));
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const ang = () => -3.15 + 6.3 * rnd();

describe('rotationMatrix', () => {
  it('Rz(90°) sends x to y (right-handed)', () => {
    const v = matVec(rotationMatrix(Math.PI / 2, [0, 0, 1]), [1, 0, 0]);
    expect(v[0]).toBeCloseTo(0, 15); expect(v[1]).toBeCloseTo(1, 15);
  });
  it('is orthonormal for random axes/angles', () => {
    for (let i = 0; i < 50; i++) {
      const M = rotationMatrix(ang(), [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]);
      expect(maxDiff(matMul(transpose(M), M), [[1, 0, 0], [0, 1, 0], [0, 0, 1]])).toBeLessThan(1e-12);
    }
  });
  it('normalises the axis like Mathematica', () => {
    expect(maxDiff(rotationMatrix(0.7, [0, 0, 5]), rotationMatrix(0.7, [0, 0, 1]))).toBeLessThan(1e-15);
  });
});

describe('composite rotations match the formulas in the Details section', () => {
  it('R_ZYZ entries', () => {
    const [f, t, p] = [0.3, -1.1, 2.0];
    const M = R.rotZYZ(f, t, p);
    const c = Math.cos, s = Math.sin;
    expect(M[0][0]).toBeCloseTo(c(f) * c(t) * c(p) - s(f) * s(p), 14);
    expect(M[0][2]).toBeCloseTo(c(f) * s(t), 14);
    expect(M[2][0]).toBeCloseTo(-s(t) * c(p), 14);
    expect(M[2][2]).toBeCloseTo(c(t), 14);
  });
  it('R_ZYX entries', () => {
    const [g, b, a] = [0.4, 0.2, -0.9];
    const M = R.rotZYX(g, b, a);
    const c = Math.cos, s = Math.sin;
    expect(M[0][0]).toBeCloseTo(c(b) * c(g), 14);
    expect(M[2][0]).toBeCloseTo(-s(b), 14);
    expect(M[2][1]).toBeCloseTo(c(b) * s(a), 14);
  });
});

describe('conversions round-trip (error bounded by the 0.001 rounding)', () => {
  it.each([...Array(200).keys()])('random rotation %i', () => {
    const M = R.rotZYZ(ang(), ang(), ang());
    const [p, t, s] = R.findZYZEuler(M);
    expect(maxDiff(R.rotZYZ(p, t, s), M)).toBeLessThan(0.0025);
    const [a, b, g] = R.findRollPitchYaw(M);
    expect(maxDiff(R.rotZYX(g, b, a), M)).toBeLessThan(0.0025);
    const { angle, k } = R.findAxisAngle(M);
    expect(maxDiff(rotationMatrix(angle, k), M)).toBeLessThan(0.004);
  });
});

describe('evaluate (Manipulate body)', () => {
  it('the final orientation is the same whichever method produced it (caption claim)', () => {
    const a = R.evaluate({ ...R.DEFAULTS, typeRot: 1, phi: 0.4, theta: 1.0, psi: -0.6 });
    const b = R.evaluate({ ...a.state, typeRot: 2 });
    const c = R.evaluate({ ...a.state, typeRot: 3 });
    expect(maxDiff(b.R, a.R)).toBeLessThan(0.004);
    expect(maxDiff(c.R, a.R)).toBeLessThan(0.004);
  });
  it('progress = 0 gives the identity, progress = 1 gives R (all methods)', () => {
    for (const typeRot of [1, 2, 3]) {
      const st = { ...R.DEFAULTS, typeRot, phi: 0.5, theta: 0.7, psi: 0.9, angle: 1.2, axis: [0.3, 0.4], alpha: 0.2, beta: -0.3, gamma: 1.1 };
      expect(maxDiff(R.evaluate({ ...st, progress: 0 }).Rprog, [[1, 0, 0], [0, 1, 0], [0, 0, 1]])).toBeLessThan(1e-12);
      const one = R.evaluate({ ...st, progress: 1 });
      expect(maxDiff(one.Rprog, one.R)).toBeLessThan(1e-12);
    }
  });
  it('Euler progress: first third turns only phi about z', () => {
    const out = R.evaluate({ ...R.DEFAULTS, typeRot: 1, phi: 0.9, theta: 0.5, psi: 0.3, progress: 1 / 6 });
    expect(maxDiff(out.Rprog, rotationMatrix(0.45, [0, 0, 1]))).toBeLessThan(1e-12);
  });
});

describe('Euler gyroscope model', () => {
  it('orientation is Rz(a1).Ry(a2).Rz(a3) — a ZYZ (3-2-3) sequence', () => {
    const o = E.orientations({ a1: 45, a2: 30, a3: 15 });
    expect(maxDiff(o.rotor, R.rotZYZ(45 * E.DEG, 30 * E.DEG, 15 * E.DEG))).toBeLessThan(1e-14);
  });
  it('spin axis: tilted by the nutation angle from Z, in the direction set by precession', () => {
    const [x, y, z] = E.spinAxis({ a1: 45, a2: 30, a3: 77 });
    expect(z).toBeCloseTo(Math.cos(30 * E.DEG), 14);
    expect(Math.atan2(y, x)).toBeCloseTo(45 * E.DEG, 14);
  });
  it('spin does not move the spin axis', () => {
    const a = E.spinAxis({ a1: 10, a2: 20, a3: 0 }), b = E.spinAxis({ a1: 10, a2: 20, a3: 200 });
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 14));
  });
  it('bookmark interpolation hits pos0..pos6 at the ends of each segment', () => {
    expect(E.bookmarkAt(0)).toEqual({ a1: 0, a2: 0, a3: 0 });
    expect(E.bookmarkAt(3 / 6)).toEqual({ a1: 45, a2: 30, a3: 15 });
    expect(E.bookmarkAt(1)).toEqual({ a1: 0, a2: 0, a3: 0 });
  });
});
