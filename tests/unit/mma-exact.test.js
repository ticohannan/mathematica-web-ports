// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/mma-exact.test.js — bit-exact Mathematica numerics (shared/mma-exact.js, design P-MP-01):
// fast paths against exact BigInt arithmetic, and results recorded from Mathematica 15.0.1
// (fixtures/mma-exact.recorded.json, extracted from `npm run compare:original -- --trace`).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { fma, det, norm, arcTan, vectorAngle, _fmaExactSlow, _arcTanExactSlow } from '../../shared/mma-exact.js';

const recorded = JSON.parse(fs.readFileSync(new URL('./fixtures/mma-exact.recorded.json', import.meta.url), 'utf8'));
let seed = 20261003;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const randNum = () => (rand() - 0.5) * 2 ** Math.floor(rand() * 40 - 20);
const firstMismatches = (cases, f) => cases.filter(([args, r]) => !Object.is(f(...args), r)).slice(0, 3);

describe('fma (correctly rounded a*b + c)', () => {
  it('matches exact BigInt arithmetic on random and near-cancelling inputs', () => {
    const bad = [];
    for (let i = 0; i < 30000; i++) {
      const a = randNum(), b = randNum();
      const c = i % 3 === 0 ? -(a * b) * (1 + (rand() - 0.5) * 2 ** -40) : i % 3 === 1 ? 2 ** Math.floor(rand() * 10 - 5) - a * b : randNum();
      if (!Object.is(fma(a, b, c), _fmaExactSlow(a, b, c))) bad.push([a, b, c]);
    }
    expect(bad.slice(0, 3)).toEqual([]);
  });
  it('keeps the low-order bits a plain a*b + c loses', () => {
    const a = 1 + 2 ** -30, b = 1 - 2 ** -30;           // a*b = 1 - 2^-60 exactly
    expect(a * b - 1).toBe(0);
    expect(fma(a, b, -1)).toBe(-(2 ** -60));
  });
  it('handles zeros and powers of two', () => {
    expect(fma(0, 5, 3)).toBe(3);
    expect(fma(2, 0.5, -1)).toBe(0);
    expect(fma(2 ** 30, 2 ** 30, 2 ** -60)).toBe(2 ** 60);
  });
});

describe('arcTan (Mathematica ArcTan[x, y], correctly rounded)', () => {
  it('matches the exact BigInt computation, including near-diagonal inputs', () => {
    const bad = [];
    for (let i = 0; i < 20000; i++) {
      const x = randNum(), y = i % 5 ? randNum() : x * (rand() < 0.5 ? 1 : -1) * (1 + (rand() - 0.5) * 1e-12);
      if (!Object.is(arcTan(x, y), _arcTanExactSlow(x, y))) bad.push([x, y]);
    }
    expect(bad.slice(0, 3)).toEqual([]);
  });
  it('takes x first and has no signed zero', () => {
    expect(arcTan(0, 1)).toBe(Math.PI / 2);
    expect(arcTan(-1, 0)).toBe(Math.PI);
    expect(arcTan(-1, -0)).toBe(Math.PI);
    expect(arcTan(1, 1)).toBe(Math.PI / 4);
  });
  it(`reproduces ${recorded.ArcTan.length} results recorded from Mathematica`, () => {
    expect(firstMismatches(recorded.ArcTan, arcTan)).toEqual([]);
  });
  it('differs from Math.atan2 in some recorded cases (why the exact version is needed)', () => {
    expect(recorded.ArcTan.some(([[x, y], r]) => Math.atan2(y, x) !== r)).toBe(true);
  });
});

describe('det (Mathematica Det on machine numbers)', () => {
  it(`reproduces ${recorded.Det.length} results recorded from Mathematica, mostly near-degenerate`, () => {
    expect(firstMismatches(recorded.Det, det)).toEqual([]);
  });
  it('differs from the cofactor formula in the near-degenerate recorded cases', () => {
    const cof = ([[a, b, c], [d, e, f], [g, h, k]]) => a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g);
    expect(recorded.Det.filter(([[M], r]) => cof(M) !== r).length).toBeGreaterThan(50);
  });
  it('gives exact results for simple matrices', () => {
    expect(det([[1, 2], [3, 4]])).toBe(-2);
    expect(det([[2, 0, 0], [0, 3, 0], [0, 0, 4]])).toBe(24);
    expect(det([[1, 2, 3], [4, 5, 6], [7, 8, 9]])).toBeCloseTo(0, 12);
    expect(det([[0, 0], [1, 2]])).toBe(0);
  });
  it('the unrolled 2x2 path follows the general algorithm (LU of the transpose, one entry below the pivot: division)', () => {
    const general = ([[a, b], [c, d]]) => { // column-major rows: [a, c], [b, d]
      let p = [a, c], q = [b, d], sign = 1;
      if (Math.abs(q[0]) > Math.abs(p[0])) { [p, q] = [q, p]; sign = -1; }
      if (p[0] === 0) return 0;
      const l = q[0] / p[0];
      return sign * (p[0] * fma(-l, p[1], q[1])) + 0;
    };
    for (let i = 0; i < 5000; i++) {
      const M = [[randNum(), randNum()], [randNum(), randNum()]];
      expect(Object.is(det(M), general(M)), JSON.stringify(M)).toBe(true);
    }
  });
});

describe('extreme ranges and special values (independent review, v0.1.7)', () => {
  it('fma rounds subnormal results correctly', () => {
    expect(fma(1e-300, 1e-20, 0)).toBe(1e-320);
    expect(fma(3 * 2 ** -540, 2 ** -536, 0)).toBe(2 ** -1074); // 0.75 of the smallest subnormal
    expect(fma(2 ** -540, 2 ** -535, 0)).toBe(0);               // exactly half: ties to even (0)
    expect(fma(3 * 2 ** -540, 2 ** -535, 0)).toBe(2 ** -1073);  // 1.5 ulp: ties to even (2 ulp)
  });
  it('fma follows IEEE for zeros and non-finite inputs', () => {
    expect(Object.is(fma(0, 1, -0), 0)).toBe(true);
    expect(fma(NaN, 1, 0)).toBeNaN();
    expect(fma(Infinity, 1, 0)).toBe(Infinity);
  });
  it('arcTan is exact for tiny and huge ratios and tiny inputs', () => {
    expect(arcTan(1, 1e-300)).toBe(1e-300);
    expect(arcTan(1e305, 1)).toBe(1.0000000000000001e-305); // = 1 / 1e305 correctly rounded
    expect(arcTan(1e-300, 1e-300)).toBe(Math.PI / 4);
    expect(arcTan(-1e-300, -2e-300)).toBe(-2.0344439357957027);
    expect(arcTan(2 ** 113, 3 * 2 ** -962)).toBe(2 ** -1074); // ratio 1.5 ulp, atan just below the tie
    expect(_arcTanExactSlow(1, 1e-60)).toBe(1e-60);
    const x = 1.2406041525261202, y = 1.240604152526121; // needs the exact fallback
    for (const k of [0, -200, -700]) expect(arcTan(x * 2 ** k, y * 2 ** k)).toBe(_arcTanExactSlow(x, y));
  });
  it('det has no signed zero (Mathematica has none)', () => {
    for (const M of [[[1, 2], [2, 4]], [[-1, 1], [-1, 1]], [[1, 1, 1], [1, 1, 1], [1, 2, 3]], [[2, 0, 0], [0, -1, 0], [0, 0, 0]]]) expect(Object.is(det(M), 0), JSON.stringify(M)).toBe(true);
  });
});

describe('norm and vectorAngle', () => {
  it(`norm reproduces ${recorded.Norm.length} recorded results`, () => {
    expect(firstMismatches(recorded.Norm, norm)).toEqual([]);
  });
  it('norm does not overflow or underflow', () => {
    expect(norm([3e200, 4e200])).toBeCloseTo(5e200, -187);
    expect(norm([3e-200, 4e-200])).toBeCloseTo(5e-200, 212);
  });
  it('vectorAngle matches at least 80 % of recorded results bit for bit and the rest within 2 ulp (K-MP-02)', () => {
    let same = 0;
    for (const [[u, v], r] of recorded.VectorAngle) {
      const a = vectorAngle(u, v);
      if (a === r) same++;
      else expect(Math.abs(a - r), JSON.stringify([u, v])).toBeLessThanOrEqual(2 * Math.abs(r) * 2 ** -52);
    }
    expect(same / recorded.VectorAngle.length).toBeGreaterThanOrEqual(0.8);
  });
});
