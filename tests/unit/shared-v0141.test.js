// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// The shared additions of v0.1.41: Interpolation (shared/numeric.js), the TogglerBar control and the Trigger options
// AppearanceElements and AnimationRepetitions, the Animator control (shared/manipulate.js; the buttons themselves: browser tests of
// longitudinal-standing-waves and catch-a-standing-wave).
import { describe, it, expect } from 'vitest';
import { Interpolation } from '../../shared/numeric.js';
import { parseControl, TogglerBar, CheckboxBar, Trigger, Animator, Rule } from '../../shared/manipulate.js';
import { Tooltip } from '../../shared/graphics.js';

describe('Interpolation with derivative data {{x}, y, dy} (piecewise cubic Hermite)', () => {
  it('passes through the data with the given slopes', () => {
    const f = Interpolation([[[0], 0, 1], [[1], 1, 0], [[3], -2, 2]]);
    expect(f(0)).toBe(0);
    expect(f(1)).toBe(1);
    expect(f(3)).toBe(-2);
    const h = 1e-6;
    expect((f(h) - f(-h)) / (2 * h)).toBeCloseTo(1, 6);
    expect((f(1 + h) - f(1 - h)) / (2 * h)).toBeCloseTo(0, 5);
    expect((f(3 + h) - f(3 - h)) / (2 * h)).toBeCloseTo(2, 5);
  });
  it('reproduces a cubic exactly from its values and derivatives', () => {
    const p = (x) => x ** 3 - 2 * x + 1, dp = (x) => 3 * x * x - 2;
    const f = Interpolation([0, 0.5, 1.5, 2].map((x) => [[x], p(x), dp(x)]));
    for (const x of [0.1, 0.7, 1.2, 1.9]) expect(f(x)).toBeCloseTo(p(x), 12);
  });
  it('is the documented Hermite cubic on one interval: value at the midpoint (y0 + y1)/2 + h (d0 − d1)/8', () => {
    const [y0, d0, y1, d1, x0, x1] = [2, -1, 5, 3, 1, 3];
    const f = Interpolation([[[x0], y0, d0], [[x1], y1, d1]]);
    const h = x1 - x0;
    expect(f(2)).toBeCloseTo((y0 + y1) / 2 + (h * (d0 - d1)) / 8, 12);
  });
  it('accepts the data in any order (sorted by x)', () => {
    const f = Interpolation([[[1], 1, 0], [[0], 0, 1]]);
    expect(f(0.5)).toBeCloseTo(0.625, 12);
  });
});

describe('Interpolation of values {{x, y}, …} (order 3: local cubic through 4 points)', () => {
  it('is exact for a cubic', () => {
    const p = (x) => 2 * x ** 3 - x + 4;
    const f = Interpolation([0, 1, 2, 3, 4, 5].map((x) => [x, p(x)]));
    for (const x of [0.3, 1.5, 2.25, 4.8]) expect(f(x)).toBeCloseTo(p(x), 10);
  });
  it('order 1 is piecewise linear', () => {
    const f = Interpolation([[0, 0], [1, 2], [2, 0]], { InterpolationOrder: 1 });
    expect(f(0.5)).toBe(1);
    expect(f(1.5)).toBe(1);
  });
  it('a single point gives a constant', () => {
    expect(Interpolation([[3, 7]])(10)).toBe(7);
  });
});

describe('TogglerBar and the Trigger options in parseControl', () => {
  it('TogglerBar parses as the CheckboxBar value rule with the toggler look', () => {
    const c = parseControl([['options', [1, 4]], [Rule(1, Tooltip(' + ', 'standing wave')), Rule(4, 'contours')], { ControlType: TogglerBar }]);
    expect(c.kind).toBe('checkboxbar');
    expect(c.toggler).toBe(true);
    expect(c.values.map((v) => v.value)).toEqual([1, 4]);
    const plain = parseControl([['options', []], [1, 2, 3], { ControlType: CheckboxBar }]);
    expect(plain.kind).toBe('checkboxbar');
    expect(plain.toggler).toBeUndefined();
  });
  it('a Trigger keeps AppearanceElements and AnimationRepetitions in its options', () => {
    const c = parseControl([['t', 0, 'time'], 0, 1, { ControlType: Trigger, AnimationRepetitions: Infinity, AppearanceElements: ['PlayPauseButton', 'FasterSlowerButtons'] }]);
    expect(c.kind).toBe('trigger');
    expect(c.opts.AnimationRepetitions).toBe(Infinity);
    expect(c.opts.AppearanceElements).toEqual(['PlayPauseButton', 'FasterSlowerButtons']);
  });
  it('a Trigger over an infinite range parses with max Infinity', () => {
    const c = parseControl([['t', 1, 'time'], 0, Infinity, { ControlType: Trigger }]);
    expect(c.max).toBe(Infinity);
  });
});

describe('Animator in parseControl', () => {
  it('parses {{a, 0, "animate"}, 0, 2π, .01, ControlType -> Animator, …} with its options', () => {
    const c = parseControl([['a', 0, 'animate'], 0, 2 * Math.PI, 0.01, { ControlType: Animator, AnimationRate: 30, AnimationRunning: false, AppearanceElements: ['PlayPauseButton', 'FasterSlowerButtons'] }]);
    expect(c.kind).toBe('animator');
    expect([c.min, c.max, c.step]).toEqual([0, 2 * Math.PI, 0.01]);
    expect(c.opts.AnimationRunning).toBe(false);
    expect(c.opts.AnimationRate).toBe(30);
  });
  it('a DefaultDuration may be a function of the state (the hypercube\'s duration slider)', () => {
    const c = parseControl([['c', 0, ''], 0, 2 * Math.PI, { ControlType: Animator, DefaultDuration: (s) => s.dur }]);
    expect(c.opts.DefaultDuration({ dur: 20 })).toBe(20);
  });
});
