// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/traditional-form.test.js — shared/traditional-form.js: exact cos/sin entries in Mathematica's first-octant
// form, their values and texts, and shared/mma-lighting.js MMA_NEUTRAL_LIGHTS (v0.1.38). Expected forms are written by
// hand from the trigonometric identities (cos x = sin(π/2 − x), cos(π + x) = −cos x, …) and Mathematica's documented
// automatic evaluation (exact values at multiples of π/4; Cos[π/8], Sin[3π/32] stay unevaluated).
import { describe, it, expect } from 'vitest';
import { trigEntry, intEntry, entryValue, entryText } from '../../shared/traditional-form.js';
import { MMA_NEUTRAL_LIGHTS, MMA_DEFAULT_LIGHTS } from '../../shared/mma-lighting.js';

const t = (fn, n, d, s) => entryText(trigEntry(fn, n, d, s), { minus: '-' });

describe('trigEntry: the first-octant form', () => {
  it('examples written by hand', () => {
    expect(t('cos', 5, 16)).toBe('sin(3π/16)'); // cos(5π/16) = sin(π/2 − 5π/16)
    expect(t('sin', 5, 16, -1)).toBe('-cos(3π/16)');
    expect(t('cos', 7, 32)).toBe('cos(7π/32)'); // already in the first octant
    expect(t('cos', 17, 16)).toBe('-cos(π/16)'); // cos(π + x) = −cos x
    expect(t('sin', 17, 16, -1)).toBe('sin(π/16)'); // −sin(π + x) = sin x
    expect(t('cos', -9, 32)).toBe('sin(7π/32)');
    expect(t('sin', -9, 32, -1)).toBe('cos(7π/32)');
    expect(t('cos', -3, 8)).toBe('sin(π/8)');
    expect(t('cos', 25, 32)).toBe('-cos(7π/32)');
    expect(t('sin', 15, 32, -1)).toBe('-cos(π/32)');
  });
  it('exact values at multiples of π/4 (0, ±1, ±1/√2), no negative zero', () => {
    expect(trigEntry('cos', 1, 2)).toEqual(intEntry(0));
    expect(trigEntry('sin', 1, 2, -1)).toEqual(intEntry(-1));
    expect(trigEntry('cos', 0, 1)).toEqual(intEntry(1));
    expect(trigEntry('sin', 0, 1, -1)).toEqual({ kind: 'int', value: 0 });
    expect(Object.is(entryValue(trigEntry('sin', 0, 1, -1)), -0)).toBe(false);
    expect(t('cos', 1, 4)).toBe('1/√2');
    expect(t('cos', 3, 4)).toBe('-1/√2');
    expect(t('sin', 5, 4)).toBe('-1/√2');
  });
  it('every multiple of π/32 in −4π … 4π: the value agrees with cos/sin, the base lies in (0, π/4), the sign rule holds', () => {
    for (let k = -128; k <= 128; k++) {
      for (const fn of ['cos', 'sin']) for (const sg of [1, -1]) {
        const e = trigEntry(fn, k, 32, sg);
        expect(entryValue(e)).toBeCloseTo(sg * Math[fn]((k * Math.PI) / 32), 14);
        if (e.kind === 'trig') { expect(e.base.num / e.base.den).toBeGreaterThan(0); expect(e.base.num / e.base.den).toBeLessThan(0.25); }
      }
    }
  });
  it('bases Mathematica turns into radicals are refused', () => {
    expect(() => trigEntry('cos', 1, 12)).toThrow(RangeError);
    expect(() => trigEntry('sin', 1, 5)).toThrow(RangeError);
    expect(() => trigEntry('tan', 1, 8)).toThrow(RangeError);
  });
  it('texts: integers with the minus sign U+2212 by default', () => {
    expect(entryText(intEntry(-1))).toBe('−1');
    expect(entryText(intEntry(20))).toBe('20');
    expect(entryText(trigEntry('cos', 17, 16))).toBe('−cos(π/16)');
  });
});

describe('Lighting -> "Neutral" (shared/mma-lighting.js)', () => {
  it('the documented white lights: ambient 0.35, three directional 0.37 at ImageScaled {2,0,2}, {2,2,2}, {0,2,2}', () => {
    expect(MMA_NEUTRAL_LIGHTS).toEqual([
      { kind: 'Ambient', color: [0.35, 0.35, 0.35] },
      { kind: 'Directional', color: [0.37, 0.37, 0.37], imageScaled: [2, 0, 2] },
      { kind: 'Directional', color: [0.37, 0.37, 0.37], imageScaled: [2, 2, 2] },
      { kind: 'Directional', color: [0.37, 0.37, 0.37], imageScaled: [0, 2, 2] },
    ]);
    expect(MMA_DEFAULT_LIGHTS).toHaveLength(5); // the default lights are unchanged
  });
});
