// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Jeff Bryant and Housam Binous
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/proportional-temperature-control.test.js — the model of "Proportional Temperature Control". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/proportional-temperature-control-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, solve } from '../../demos/proportional-temperature-control/model.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/proportional-temperature-control.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

describe('proportional-temperature-control model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it('the steady state: TR = Tsens, Q = Q0 + Kp (TRset − TR) and the heat balance F ρ cp (T0 − TR) + Q = 0', () => {
    const s = initialState(), end = solve(s)(150);
    const TR = (s.F * 4.19 * s.T0 + s.Q0 + 300 * s.TRset) / (s.F * 4.19 + 300); // solved by hand
    expect(end[0]).toBeCloseTo(TR, 5); expect(end[2]).toBeCloseTo(TR, 5); expect(end[1]).toBeCloseTo(s.Q0 + 300 * (s.TRset - TR), 3);
  });
  it('snapshot 1: TR overshoots to about 122 °C within 10 h; snapshot 4: starts at 100 °C', () => {
    const sol = solve(snap('1'));
    let peak = 0; for (let t = 0; t < 20; t += 0.01) peak = Math.max(peak, sol(t)[0]);
    expect(peak).toBeGreaterThan(118); expect(peak).toBeLessThan(126);
    expect(solve(snap('4'))(0)[0]).toBe(100);
  });
});

describe('corrected mode (E-PT)', () => {
  it('E-PT-01: only the label’s units change', () => {
    const a = evaluate(initialState()), b2 = evaluate({ ...initialState(), errata: 'corrected' });
    expect(b2.view.TR150).toBe(a.view.TR150);
    expect(textOf(b2.graphics.options.PlotLabel)).toContain('water flow = 10 L/h');
    expect(textOf(a.graphics.options.PlotLabel)).toContain('water flow = 10 m3/h');
  });
});
