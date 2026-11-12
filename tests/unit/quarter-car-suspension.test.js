// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Erik Mahieu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/quarter-car-suspension.test.js — the model of "Simulating Vehicle Suspension with a Simplified Quarter-Car Model". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/quarter-car-suspension-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, outputOf, resonantOriginal, resonantCorrected, spring } from '../../demos/quarter-car-suspension/model.js';
import { NumberForm } from '../../shared/number-form.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/quarter-car-suspension.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

describe('quarter-car-suspension model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it('the output solves m x″ + c x′ + k x = c y′ + k y for the road y = h sin(2π fb t), from rest', () => {
    const s = { c: 0.5, k: 0.2, m: 0.8, h: 0.1, fb: 0.7 }, x = outputOf(s), y = (t) => s.h * Math.sin(2 * Math.PI * s.fb * t);
    const d = (f, t, e = 1e-4) => (f(t + e) - f(t - e)) / (2 * e), d2 = (f, t, e = 1e-3) => (f(t + e) - 2 * f(t) + f(t - e)) / (e * e);
    expect(x(0)).toBeCloseTo(0, 12);
    for (const t of [1, 4.5, 13]) expect(s.m * d2(x, t) + s.c * d(x, t) + s.k * x(t)).toBeCloseTo(s.c * d(y, t) + s.k * y(t), 4);
  });
  it('the labels of the four snapshots: ζ 1.05, 2.00, 1.00, 0.66; resonant frequency 0.00, 0.00, 0.00, 0.34', () => {
    const want = [['1.05', '0.00'], ['2.00', '0.00'], ['1.00', '0.00'], ['0.66', '0.34']];
    ['1', '2', '3', '4'].forEach((k, i) => {
      const v = evaluate(snap(k)).view;
      expect(NumberForm(v.ζ, [3, 2])).toBe(want[i][0]); expect(NumberForm(v.resonant, [3, 2])).toBe(want[i][1]);
    });
  });
  it('the coil: six turns from the wheel up to the car', () => {
    const pts = spring(1.2, -1, 0.05)[3].g.pts;
    expect(pts[0][1]).toBeCloseTo(-1, 12); expect(pts.at(-1)[1]).toBeCloseTo(1.2, 12);
    let turns = 0; for (let i = 1; i < pts.length; i++) if (pts[i - 1][0] < 0 && pts[i][0] >= 0) turns++;
    expect(turns).toBe(6);
  });
});

describe('corrected mode (E-QC)', () => {
  it('E-QC-01: the peak of |G(iω)| found by a grid search', () => {
    for (const s of [initialState(), snap('4')]) {
      const G = (w) => Math.hypot(s.k, s.c * w) / Math.hypot(s.k - s.m * w * w, s.c * w);
      let best = 0; for (let w = 0.0001; w < 3; w += 0.0001) if (G(w) > G(best || 1e-9)) best = w;
      expect(resonantCorrected(s)).toBeCloseTo(best, 3);
    }
    expect(resonantOriginal(initialState())).toBe(0);
    expect(evaluate({ ...initialState(), errata: 'corrected' }).view.resonant).toBeCloseTo(0.28289, 4);
  });
});
