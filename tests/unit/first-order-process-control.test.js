// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Simon M. Lane
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/first-order-process-control.test.js — the model of "First-Order Transfer Functions in Process Control". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/first-order-process-control-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, quantities, sineResponse, rampResponse, stepResponse } from '../../demos/first-order-process-control/model.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/first-order-process-control.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

describe('first-order-process-control model', () => {
  it('the opening state (the notebook was saved with the sinusoidal input)', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it('the three responses solve τ y′ + y = x(t) with y(0) = 0', () => {
    const T = 5, a = 3, w = 1;
    for (const [y, x] of [[stepResponse(a, T), () => a], [rampResponse(a, T), (t) => a * t], [sineResponse(a, T, w), (t) => a * Math.sin(w * t)]]) {
      expect(y(0)).toBeCloseTo(0, 14);
      for (const t of [0.5, 2, 7]) { const d = (y(t + 1e-6) - y(t - 1e-6)) / 2e-6; expect(T * d + y(t)).toBeCloseTo(x(t), 5); }
    }
  });
  it('the numbers of the four snapshots', () => {
    // snapshot 1 (sinusoidal): B = 0.91, B/A = 0.3, phase shift 1.4
    let v = evaluate(snap('1')).view;
    expect(v.B).toBeCloseTo(0.912, 3); expect(v.ratio).toBeCloseTo(0.304, 3); expect(v.phase).toBeCloseTo(1.3734, 4);
    // snapshot 2 (step): τ = 5. (0.632 ΔSS reached at −τ log(1 − 0.632))
    v = evaluate(snap('2')).view;
    expect(v.timeconstant).toBeCloseTo(-5 * Math.log(0.368), 12);
    // snapshot 3 (ramp): "time constant τ = 7.3 min" — the gap 10 − y(10/a)
    v = evaluate(snap('3')).view;
    expect(v.τramp).toBeCloseTo(10 - rampResponse(3, 5)(10 / 3), 12); expect(v.τramp).toBeCloseTo(7.3, 1);
    // snapshot 4 (ω = 3.5): the phase shift 1.5; the snapshot's B = 0.27, B/A = 0.09 are the SECOND maximum (t = 2.667,
    // 0.27129), which Mathematica's FindMaximum reached there; the port climbs to the first, 0.3146 at t = 0.8675 (D-FO-03)
    v = evaluate(snap('4')).view;
    expect(v.phase).toBeCloseTo(Math.atan(17.5), 12);
    expect(v.B).toBeCloseTo(0.3146, 4); expect(v.time1).toBeCloseTo(0.8675, 3);
    expect(sineResponse(3, 5, 3.5)(2.667)).toBeCloseTo(0.2713, 4);
  });
  it('FindMaximum finds the first maximum after t = 0.05', () => {
    const q = quantities({ T: 5, α: 3, w: 1 }), y = sineResponse(3, 5, 1);
    const d = (t) => (y(t + 1e-6) - y(t - 1e-6)) / 2e-6;
    expect(d(q.time1)).toBeCloseTo(0, 5);
    for (let t = 0.05; t < q.time1 - 0.01; t += 0.01) expect(d(t)).toBeGreaterThan(0);
  });
});

describe('corrected mode (E-FO)', () => {
  it('E-FO-03: B is the steady amplitude a/√(ω²τ² + 1)', () => {
    const v = evaluate({ ...initialState(), errata: 'corrected' }).view;
    expect(v.B).toBeCloseTo(3 / Math.sqrt(26), 12); expect(v.ratio).toBeCloseTo(1 / Math.sqrt(26), 12);
  });
  it('E-FO-02: the ramp table shows τ', () => {
    expect(evaluate({ ...initialState(), W: 2, errata: 'corrected' }).view.τShown).toBe(5);
    expect(evaluate({ ...initialState(), W: 2 }).view.τShown).toBeCloseTo(7.3, 1);
  });
  it('E-FO-01: the phase is labelled rad and the lag ϕ/ω is added', () => {
    const g = evaluate({ ...initialState(), w: 3.5, errata: 'corrected' }).graphics;
    const text = JSON.stringify(g);
    expect(text).toContain('rad'); expect(text).toContain('time lag');
    expect(Math.atan(17.5) / 3.5).toBeCloseTo(0.4325, 4);
  });
});
