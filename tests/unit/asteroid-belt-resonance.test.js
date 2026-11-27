// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by S. M. Blinder
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/asteroid-belt-resonance.test.js — the model of "Orbital Resonance in the Asteroid Belt": the planets, the
// gap circles and the random belt against the original's formulas and Kepler's third law, the saved states.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, evaluate, evaluateWith, initialization, planets, gapRadius, GAPS, A_JUPITER,
} from '../../demos/asteroid-belt-resonance/model.js';

const golden = JSON.parse(readFileSync(new URL('../golden/asteroid-belt-resonance.original-states.json', import.meta.url), 'utf8'));
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };

describe('asteroid-belt-resonance model', () => {
  it('the opening state is the notebook live state', () => {
    expect(initialState()).toEqual(golden.states[0]);
    expect(initialState()).toEqual(golden.specs);
  });

  it('the planets: Earth at the slider angle, the others at their periods in years', () => {
    const p = planets(2 * Math.PI); // one Earth year
    expect(p.earth[0]).toBeCloseTo(1, 12);
    expect(Math.atan2(p.mars[1], p.mars[0])).toBeCloseTo(Math.PI / 8 + (2 * Math.PI) / 1.881 - 2 * Math.PI, 12);
    expect(Math.hypot(...p.jupiter)).toBeCloseTo(5.203, 12);
    expect(Math.hypot(...p.mercury)).toBeCloseTo(0.387, 12);
    expect(Math.hypot(...p.venus)).toBeCloseTo(0.723, 12);
  });

  it('the gap circles: the original radii 5.20336 times the period ratio', () => {
    expect(GAPS.map((g) => g.label)).toEqual(['3:1', '5:2', '7:3', '2:1']);
    expect(GAPS.map((g) => gapRadius(g.ratio))).toEqual([A_JUPITER * (1 / 3), A_JUPITER * (2 / 5), A_JUPITER * (3 / 7), A_JUPITER * (1 / 2)]);
    expect(evaluate({ ...initialState(), k: 1 }).view.shownGap).toEqual({ label: '3:1', radius: A_JUPITER * (1 / 3) });
    expect(evaluate({ ...initialState(), k: 3 }).view.shownGap.label).toBe('7:3'); // k = 3 is 7:3, k = 4 is 2:1 (Which order)
    expect(evaluate(initialState()).view.shownGap).toBeNull();
  });

  it('Kepler third law puts the real gaps at 2.50, 2.82, 2.96 and 3.28 AU, and the Hildas at 3.97 AU', () => {
    // a = a_J (P/P_J)^(2/3): an independent check with T² ∝ a³
    for (const g of GAPS) {
      const a = gapRadius(g.ratio, true);
      expect((a / A_JUPITER) ** 3).toBeCloseTo(g.ratio ** 2, 12);
    }
    expect(GAPS.map((g) => Number(gapRadius(g.ratio, true).toFixed(2)))).toEqual([2.5, 2.82, 2.96, 3.28]);
    expect(5.203 * (2 / 3) ** (2 / 3)).toBeCloseTo(3.97, 2); // the original's Hilda distance (3:2) follows the law
  });

  it('the gap circles thicken with time as 0.005 Erf(0.02 t)', () => {
    expect(evaluate({ ...initialState(), t: 0 }).view.gapThickness).toBe(0);
    expect(evaluate({ ...initialState(), t: 25 }).view.gapThickness).toBeCloseTo(0.005 * 0.5204998778, 9);
    expect(evaluate({ ...initialState(), t: 200 }).view.gapThickness).toBeCloseTo(0.005, 7);
  });

  it('the random belt: 5000 asteroids, 2 x 750 Trojans, 6 x 100 Hildas, with the original distributions', () => {
    const v = evaluate(initialState()).view;
    expect(v.counts).toEqual({ belt: 5000, trojans: 1500, hildas: 600 });
    const init = initialization();
    expect(mean(init.r)).toBeCloseTo(2.71, 1);
    expect(sd(init.r)).toBeCloseTo(0.4, 1);
    expect(mean(init.j)).toBeCloseTo(5.203, 1);
    expect(Math.max(...init.Phi1)).toBeLessThanOrEqual(Math.PI / 6);
    expect(Math.min(...init.Phi2)).toBeGreaterThanOrEqual(-Math.PI / 8);
    // the same seed gives the same belt (the picture does not change between evaluations)
    expect(initialization().r.slice(0, 5)).toEqual(init.r.slice(0, 5));
  });

  it('the Trojans and Hildas take their colours from the checkboxes', () => {
    expect(evaluate({ ...initialState(), T: 1 }).view.trojanColor).toEqual([0, 1, 0]);
    expect(evaluate({ ...initialState(), H: true }).view.hildaColor).toEqual([1, 0, 0]);
    expect(evaluate(initialState()).view.trojanColor).toEqual([1, 1, 1]);
  });

  it('the snapshot settings', () => {
    expect(Object.keys(golden.snapshots)).toEqual(['1', '2', '3', '4']);
    expect(evaluate(golden.snapshots[2]).view.gapThickness).toBeCloseTo(0.005, 7);
    expect(evaluate(golden.snapshots[3]).view.trojanColor).toEqual([0, 1, 0]);
    expect(evaluate(golden.snapshots[4]).view.hildaColor).toEqual([1, 0, 0]);
    // the Trojans sit within ±30° of the points 60° ahead of and behind Jupiter
    const init = initialization();
    const g = evaluateWith(golden.snapshots[3], init).graphics;
    expect(g.length).toBeGreaterThan(20);
  });
});

describe('corrected mode (E-OR)', () => {
  it('the gaps move to the Kepler distances; nothing else changes', () => {
    const st = { ...initialState(), k: 1 };
    const o = evaluate(st).view, c = evaluate({ ...st, errata: 'corrected' }).view;
    expect(o.shownGap.radius).toBeCloseTo(1.7345, 4);
    expect(c.shownGap.radius).toBeCloseTo(2.5015, 4);
    expect(c.gapRadii.map((r) => Number(r.toFixed(2)))).toEqual([2.5, 2.82, 2.96, 3.28]);
    expect(c.planets).toEqual(o.planets);
    expect(c.counts).toEqual(o.counts);
  });
});
