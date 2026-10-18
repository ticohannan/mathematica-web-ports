// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/exact-pi.test.js — shared/exact-pi.js: Cos/Sin of exact multiples of π with Mathematica's first-octant
// rewriting. Expected values: manipulability-ellipsoid T-ME-06 (Mathematica's automatic simplification, Settings
// p1 = {−Sin[3π/32], Cos[3π/32]} = {Cos[19π/32], Sin[19π/32]}; 1/√2 as cached in the motion-planning original),
// exact trigonometric values (Cos[π/2] = 0, Sin[π/6] = 1/2), doubles computed in Python's math module.
import { describe, it, expect } from 'vitest';
import { reducePi, trigPi, cosPi, sinPi, cosSinPi, octantForm, piOver, piFrac } from '../../shared/exact-pi.js';

describe('first-octant reduction', () => {
  it('octant table of shared/exact-pi.js: cos 19π/32 is the double of -sin 3π/32 and cos π/4 = sin π/4 = 0.7071067811865475 (bits provisional until H-ME-12)', () => { // T-ME-06
    expect(cosPi(19, 32)).toBe(-sinPi(3, 32));
    expect(cosPi(19, 32)).toBe(-0.29028467725446233); // = -Math.sin(3π/32); PROVISIONAL (K-ME-02)
    expect(Math.cos((19 * Math.PI) / 32)).toBe(-0.29028467725446216); // plain trig is 7 ulp off
    expect(cosPi(8, 32)).toBe(0.7071067811865475);
    expect(sinPi(8, 32)).toBe(0.7071067811865475);
    expect(cosPi(20, 32)).toBe(-cosPi(12, 32));
    expect(cosSinPi(16, 32)).toEqual([0, 1]);
    expect(cosSinPi(32, 32)).toEqual([-1, 0]);
  });
  it('Mathematica\'s rewritten forms: Cos[19π/32] → −Sin[3π/32], Cos[3π/8] → Sin[π/8]', () => {
    expect(octantForm(19, 32).cos).toEqual({ fn: 'sin', sign: -1, base: { num: 3, den: 32 } });
    expect(octantForm(3, 8).cos).toEqual({ fn: 'sin', sign: 1, base: { num: 1, den: 8 } });
    expect(octantForm(-5, 8).sin).toEqual({ fn: 'cos', sign: -1, base: { num: 1, den: 8 } }); // Sin[-5π/8] = -Cos[π/8]
  });
  it('π/8 uses the radicals ½√(2+√2), ½√(2−√2) in machine arithmetic (manipulability-ellipsoid §6.4)', () => {
    expect(cosPi(1, 8)).toBe(0.9238795325112867);
    expect(sinPi(1, 8)).toBe(0.3826834323650897); // Python: sqrt(2 - sqrt(2))/2 (math.sin(π/8) is 1 ulp larger)
    expect(cosPi(12, 32)).toBe(sinPi(4, 32));
  });
});

describe('exact values', () => {
  it('multiples of π/2 give exact 0 and ±1 without signed zeros', () => {
    for (let k = -8; k <= 8; k++) {
      const { cos, sin } = trigPi(k, 2);
      const exp = [[1, 0], [0, 1], [-1, 0], [0, -1]][((k % 4) + 4) % 4];
      expect([cos, sin]).toEqual(exp);
      expect(Object.is(cos, -0) || Object.is(sin, -0)).toBe(false);
    }
  });
  it('sin π/6 is exactly 1/2 and marked rational; cos π/6 is √3/2 and irrational', () => {
    expect(trigPi(1, 6)).toMatchObject({ sin: 0.5, sinRational: true, cos: 0.8660254037844386, cosRational: false });
    expect(trigPi(2, 3)).toMatchObject({ cos: -0.5, cosRational: true }); // Cos[2π/3] = -1/2
    expect(trigPi(5, 32)).toMatchObject({ cosRational: false, sinRational: false });
    expect(trigPi(0, 1)).toMatchObject({ cos: 1, sin: 0, cosRational: true, sinRational: true });
  });
  it('symmetries hold bit for bit on the whole π/32 grid', () => {
    for (let k = -64; k <= 64; k++) {
      const [c, s] = cosSinPi(k, 32);
      expect(cosSinPi(-k, 32)).toEqual([c, s === 0 ? 0 : -s]); // cos even, sin odd
      expect(cosPi(k + 64, 32)).toBe(c); // period 2π
      expect(cosPi(32 - k, 32)).toBe(c === 0 ? 0 : -c); // cos(π − a) = −cos a
      expect(sinPi(16 - k, 32)).toBe(c); // sin(π/2 − a) = cos a
      expect(Math.abs(c - Math.cos((k * Math.PI) / 32))).toBeLessThan(1e-15);
    }
  });
  it('reducePi gives the reduced fraction with a positive denominator', () => {
    expect(reducePi(-26, 32)).toEqual({ num: -13, den: 16 });
    expect(reducePi(6, -8)).toEqual({ num: -3, den: 4 });
    expect(reducePi(0, 5)).toEqual({ num: 0, den: 1 });
    expect(() => reducePi(1.5, 2)).toThrow();
  });
});

describe('piOver: N[Pi/n] for an exact integer n', () => {
  it('is the correctly rounded π/n (n = 3: 1.0471975511965979 where Math.PI/3 gives 1.0471975511965976)', () => {
    expect(Math.PI / 3).toBe(1.0471975511965976);
    expect(piOver(3)).toBe(1.0471975511965979);
    expect(piOver(48)).toBe(0.06544984694978737); // Math.PI·(1/48) = 0.06544984694978735
    expect(piOver(1)).toBe(Math.PI);
    for (const k of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) expect(piOver(2 ** k)).toBe(Math.PI / 2 ** k); // exact halvings
    expect(() => piOver(2.5)).toThrow();
    expect(() => piOver(0)).toThrow();
  });
});

describe('piFrac: N[num Pi/den] for exact integers num, den', () => {
  // an independent π: Machin's formula π = 16·arctan(1/5) − 4·arctan(1/239) in BigInt fixed point, 400 bits + 20 guard bits
  const atanInv = (x, one) => {
    let sum = 0n, term = one / x, k = 1n, sgn = 1n;
    const x2 = x * x;
    while (term !== 0n) { sum += (sgn * term) / k; term /= x2; k += 2n; sgn = -sgn; }
    return sum;
  };
  const ONE = 1n << 420n;
  const PI_2_400 = (16n * atanInv(5n, ONE) - 4n * atanInv(239n, ONE)) >> 20n; // π·2^400, error a few units
  // the correctly rounded double of kπ/32 = k·π·2^400 / 2^405: Number(BigInt) rounds to nearest, 2^-405 scales exactly
  const nearestKPi32 = (k) => Number(BigInt(k) * PI_2_400) * 2 ** -405;

  it('is the correctly rounded kπ/32 for k = -64 … 64 against an independent π (Machin formula, 400 bits); k·Math.PI/32 is 1 ulp off for 30 of them', () => {
    let off = 0;
    for (let k = -64; k <= 64; k++) {
      expect(piFrac(k, 32), `k = ${k}`).toBe(nearestKPi32(k) + 0);
      if ((k * Math.PI) / 32 !== nearestKPi32(k)) off++;
    }
    expect(off).toBe(30);
    expect(nearestKPi32(32)).toBe(Math.PI); // the independent π rounds to Math.PI
  });
  it('gives the doubles of tools/extract_state.py (Python Fraction, correctly rounded) for the snapshot angles: 19π/32 = 1.8653206380689398, 59π/32 = 5.792311455056181', () => {
    expect(piFrac(19, 32)).toBe(1.8653206380689398);
    expect((19 * Math.PI) / 32).toBe(1.8653206380689396);
    expect(piFrac(59, 32)).toBe(5.792311455056181);
  });
  it('agrees with piOver, is odd in num and den, and rejects non-integers', () => {
    for (const n of [1, 2, 3, 7, 48, 1000]) expect(piFrac(1, n)).toBe(piOver(n));
    expect(piFrac(-19, 32)).toBe(-piFrac(19, 32));
    expect(piFrac(19, -32)).toBe(-piFrac(19, 32));
    expect(Object.is(piFrac(0, 32), 0)).toBe(true);
    expect(() => piFrac(1.5, 2)).toThrow();
    expect(() => piFrac(1, 0)).toThrow();
  });
});
