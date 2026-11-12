// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Jon Neades
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/quarter-car-double-spring.test.js — the model of "Quarter-Car Suspension Model with Double Spring". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/quarter-car-double-spring-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, solve, modal, CalcPulse, CalcForce, CalcGround } from '../../demos/quarter-car-double-spring/model.js';
import { NumberForm } from '../../shared/number-form.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/quarter-car-double-spring.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

const n2 = (x) => NumberForm(x, [3, 2]);
describe('quarter-car-double-spring model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it('the input: a half-sine bump of the given height and duration from t = 2, or a sine', () => {
    expect(CalcPulse(2.5, 2, 1, 0.15)).toBeCloseTo(0.15, 15); expect(CalcPulse(1.9, 2, 1, 0.15)).toBe(0); expect(CalcPulse(3.01, 2, 1, 0.15)).toBe(0);
    expect(CalcForce(2.5, 1, 80000, 1, 0.15, 1)).toBeCloseTo(12000, 9); expect(CalcGround(2, 0.25, 1, 0.1, 1)).toBeCloseTo(-1.9, 12);
  });
  it('the labels of snapshot 1: ζ1 0.35, ω1 6.12, f1 0.97, ζ2 0.00, ω2 51.60, f2 8.22', () => {
    const s = snap('1'), a = modal(s.m1, s.k1, s.c1), b = modal(s.m2, s.k2, s.c2);
    expect([n2(a.ζ), n2(a.ω), n2(a.f), n2(b.ζ), n2(b.ω), n2(b.f)]).toEqual(['0.35', '6.12', '0.97', '0.00', '51.60', '8.22']);
    const c = snap('3'), m = modal(c.m1, c.k1, c.c1);
    expect([n2(m.ζ), n2(m.ω), n2(m.f)]).toEqual(['0.11', '6.99', '1.11']);
  });
  it('the solution satisfies both equations (central differences)', () => {
    const s = initialState(), sol = solve(s);
    const x1 = (t) => sol(t)[0], x2 = (t) => sol(t)[2];
    const d = (f, t, e = 1e-4) => (f(t + e) - f(t - e)) / (2 * e), d2 = (f, t, e = 1e-3) => (f(t + e) - 2 * f(t) + f(t - e)) / (e * e);
    for (const t of [2.3, 2.7, 5]) {
      expect(s.m1 * d2(x1, t) + s.k1 * (x1(t) - x2(t)) + s.c1 * (d(x1, t) - d(x2, t))).toBeCloseTo(0, 0);
    }
    expect(sol(1.9)).toEqual([0, 0, 0, 0]); // nothing moves before the bump
  });
  it('snapshot 2 (t = 2.5): both masses lifted by the bump', () => {
    const v = evaluate(snap('2')).view;
    expect(v.xu).toBeGreaterThan(0.1); expect(v.xs).toBeGreaterThan(0.1);
  });
});

describe('corrected mode (E-QD)', () => {
  it('E-QD-01: ω2 is labelled rad/s', () => {
    expect(JSON.stringify(evaluate({ ...initialState(), errata: 'corrected' }).graphics[1])).toContain('" rad/s"');
    const kept = JSON.stringify(evaluate(initialState()).graphics[1]);
    expect(kept.match(/rad\/s/g)).toHaveLength(1);
  });
});
