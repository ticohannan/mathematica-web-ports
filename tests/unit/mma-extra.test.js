// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/mma-extra.test.js — the additions to shared/mma-extra.js: the two Normalize models, EngineeringForm and
// N[x, n] text. Expected values: exact rational arithmetic (BigInt here; Python fractions/decimal for the quoted
// constants), the netlib dnrm2 algorithm, and the formats quoted in the drafts (rrt T-RT-13, torus-chart T-TC-07,
// manipulability-ellipsoid T-ME-18 / snapshots, arm-configurations §6.4).
import { describe, it, expect } from 'vitest';
import { lengthCR, normalizeCR, normalizeDnrm2, engineeringForm, engineeringParts, nDigits, mmaNumberString, nearest } from '../../shared/mma-extra.js';

// a double as m · 2^e exactly (BigInt m, integer e)
function bits(x) {
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, x);
  const hi = dv.getUint32(0), lo = dv.getUint32(4), ex = (hi >>> 20) & 0x7ff;
  let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  if (ex) m |= 1n << 52n;
  return { m, e: (ex || 1) - 1075 };
}
// is r = M·2^E the double nearest sqrt(S), S = the exact sum of squares of v? Exact bracket:
// ((2M − 1)·2^(E−1))² <= S <= ((2M + 1)·2^(E−1))², all scaled to one power of two.
function isCorrectlyRounded(v, r) {
  const parts = v.filter((x) => x !== 0).map((x) => bits(Math.abs(x)));
  const { m: M, e: E } = bits(r);
  const e0 = Math.min(E - 1, ...parts.map((p) => p.e));
  const S = parts.reduce((acc, p) => acc + (p.m << BigInt(p.e - e0)) ** 2n, 0n); // S · 4^-e0
  const lo = ((2n * M - 1n) << BigInt(E - 1 - e0)) ** 2n, hi = ((2n * M + 1n) << BigInt(E - 1 - e0)) ** 2n;
  return lo <= S && S <= hi;
}

describe('Normalize models', () => {
  // T-RT-13 (rrt): snapshot 2's newest node; constants from Python (fractions + 50-digit decimal sqrt; netlib dnrm2)
  it('Normalize multiplies by the reciprocal of the dnrm2 length by default (model switch available)', () => {
    const p = [-19.56, 6.3], nv = [-1.8898591462436376, -2.38593178139027];
    const v = [p[0] - nv[0], p[1] - nv[1]];
    expect(lengthCR(v)).toBe(19.689573095995634);
    const viaDnrm2 = normalizeDnrm2(v), viaCR = normalizeCR(v);
    expect([nv[0] + viaDnrm2[0], nv[1] + viaDnrm2[1]]).toEqual([-2.7872956100819533, -1.944788048154288]); // the saved node
    expect(nv[1] + viaCR[1]).toBe(-1.9447880481542879);
  });
  // T-TC-07 (torus-chart)
  it('Normalize puts the dial point on the unit circle, the zero vector stays zero', () => {
    expect(normalizeCR([3, 4])).toEqual([3 * (1 / 5), 0.8]); // v·(1/5): 0.6000000000000001 in machine arithmetic
    const [x, y] = normalizeCR([-0.2, 0.1]);
    expect([x, y]).toEqual([-0.8944271909999157, 0.44721359549995787]); // Python, correctly rounded length 0.223606797749979
    expect(Math.hypot(x, y)).toBeCloseTo(1, 15);
    expect(normalizeCR([0, 0])).toEqual([0, 0]);
    expect(normalizeDnrm2([0, 0, 0])).toEqual([0, 0, 0]);
  });
  it('lengthCR is the correctly rounded Euclidean length (exact bracket check on 3000 vectors)', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const bad = [];
    for (let i = 0; i < 3000; i++) {
      const n = 2 + (i % 3);
      const v = Array.from({ length: n }, () => (rand() - 0.5) * 2 ** Math.floor(rand() * 30 - 15));
      const r = lengthCR(v);
      if (!isCorrectlyRounded(v, r)) bad.push(v);
    }
    expect(bad.slice(0, 3)).toEqual([]);
    expect(isCorrectlyRounded([1, 1], Math.SQRT2)).toBe(true);
    expect(isCorrectlyRounded([1, 1], Math.SQRT2 * (1 + 2 ** -52))).toBe(false); // the check can fail
    expect(lengthCR([3, 4])).toBe(5);
    expect(lengthCR([0, -2])).toBe(2);
  });
  it('the two lengths differ in last bits only (here dnrm2 is one ulp above)', () => {
    const v = [-17.67014085375636, 8.68593178139027];
    expect(normalizeDnrm2(v)).not.toEqual(normalizeCR(v));
  });
  it('existing exports are unchanged', () => {
    expect(mmaNumberString(0.15000000000000002)).toBe('0.15');
    expect(nearest([[0, 0], [1, 0]], [0.9, 0])).toEqual([[1, 0]]);
  });
});

describe('EngineeringForm and N[x, n] text', () => {
  // T-ME-18 (manipulability-ellipsoid): snapshots 1–4 for the first two, the EngineeringForm reference for the rest
  it('EngineeringForm display: 0.6718917 gives 671.892×10^-3, 1.2071068 gives 1.20711, 0.5 gives 500.×10^-3, 0 gives 0.', () => {
    expect(engineeringForm(0.6718917273402976)).toBe('671.892×10^-3');
    expect(engineeringForm(1.2071067811865472)).toBe('1.20711');
    expect(engineeringForm(0.49999999999999994)).toBe('500.×10^-3');
    expect(engineeringForm(0.012)).toBe('12.×10^-3');
    expect(engineeringForm(0)).toBe('0.');
    expect(engineeringForm(2.7944208223697744e-16)).toBe('279.442×10^-18');
  });
  it('engineeringParts gives mantissa and exponent for a superscript rendering', () => {
    expect(engineeringParts(0.6718917273402976)).toEqual({ mantissa: '671.892', exponent: -3 });
    expect(engineeringParts(1.2071067811865472)).toEqual({ mantissa: '1.20711', exponent: 0 });
  });
  // arm-configurations §6.4: exact H entries printed with N[…, 2]
  it('nDigits(x, 2) shows two significant digits with trailing zeros kept: 1.0, 0.098, -0.71, 2.8', () => {
    expect(nDigits(1, 2)).toBe('1.0');
    expect(nDigits(0.098, 2)).toBe('0.098');
    expect(nDigits(-1 / Math.sqrt(2), 2)).toBe('-0.71');
    expect(nDigits(2.8, 2)).toBe('2.8');
    expect(nDigits(0.5, 2)).toBe('0.50');
    expect(nDigits(0, 2)).toBe('0'); // N of an exact 0 stays 0
    expect(nDigits(-1 / Math.sqrt(2), 2, { minus: '−' })).toBe('−0.71');
  });
});
