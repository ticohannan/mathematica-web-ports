// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Sergio Hannibal Mejía and Simon Lorimer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/planetary-atmosphere-single-layer.test.js — the model of "Single-Layer Model for Planetary Atmospheres":
// the temperatures against the energy balances of the caption, the body's assignments (planet, reset), and the numbers
// printed in the five snapshot pictures at their saved settings.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, evaluate, assigned, quantities, Tplanet, Tatmosphere, temperatureText, SIGMA,
} from '../../demos/planetary-atmosphere-single-layer/model.js';

const golden = JSON.parse(readFileSync(new URL('../golden/planetary-atmosphere-single-layer.original-states.json', import.meta.url), 'utf8'));

describe('planetary-atmosphere-single-layer model', () => {
  it('the opening state is the notebook live state', () => {
    expect(initialState()).toEqual(golden.states[0]);
    expect(initialState()).toEqual(golden.specs);
  });

  it('the temperatures satisfy the two energy balances of the caption', () => {
    for (const [alpha, eps, S] of [[0.3, 0.742, 342], [0.25, 0.3, 148], [0.64, 0.94, 13.68], [0, 1, 500]]) {
      const Tp = Tplanet(alpha, eps, S), Ta = Tatmosphere(Tp);
      // the layer: absorbed ε σ Tp⁴ = emitted 2 ε σ Ta⁴
      expect(eps * SIGMA * Tp ** 4).toBeCloseTo(2 * eps * SIGMA * Ta ** 4, 9);
      // the planet: S̄ (1 − α) = (1 − ε) σ Tp⁴ + ε σ Ta⁴
      expect(S * (1 - alpha)).toBeCloseTo((1 - eps) * SIGMA * Tp ** 4 + eps * SIGMA * Ta ** 4, 9);
    }
  });

  it('without an atmosphere (emissivity 0) Earth is at 255 K = -18 C, as the caption says', () => {
    expect(temperatureText(Tplanet(0.3, 0, 342), 'DegreesCelsius')).toBe('255 K = −18 °C');
  });

  it('the five snapshot settings give the temperatures and numbers of the snapshot pictures', () => {
    const want = {
      1: ['286 K = 13 °C', '241 K = −32 °C', [342, 103, 239, 381, 98, 141]],
      2: ['293 K = 20 °C', '246 K = −27 °C', [342, 103, 239, 417, 62, 178]],
      3: ['219 K = −54 °C', '184 K = −89 °C', [148, 37, 111, 131, 91, 20]],
      4: ['113 K = −160 °C', '95 K = −178 °C', [14, 9, 5, 9, 1, 4]],
      5: ['113 K = −160 °C', '95 K = −178 °C', [14, 9, 5, 9, 1, 4]],
    };
    for (const [k, [tp, ta, nums]] of Object.entries(want)) {
      const l = evaluate(golden.snapshots[k]).view.labels;
      expect([l.Tp, l.Ta], `snapshot ${k}`).toEqual([tp, ta]);
      expect([l.S, l.reflected, l.transmitted, l.emitted, l.planetUp, l.layer], `snapshot ${k}`).toEqual(nums);
    }
    expect(evaluate(golden.snapshots[3]).view.labels.distance).toBe('1.52');
  });

  it('only Earth sets the distance: the three tests of the Which all ask for planet 1', () => {
    expect(assigned({ ...initialState(), d: 3 }).d).toBe(1); // Earth: d = 1 whatever the slider says
    expect(assigned({ ...initialState(), planet: 2, d: 3 }).d).toBe(3); // Mars keeps the slider's d
    expect(assigned({ ...initialState(), planet: 3, d: 0.5 }).d).toBe(0.5); // Venus too
  });

  it('reset sets the planet presets of emissivity and albedo, then clears itself', () => {
    expect(assigned({ ...initialState(), planet: 2, reset: true })).toMatchObject({ 'ϵ': 0.3, 'α': 0.25, reset: false });
    expect(assigned({ ...initialState(), planet: 3, reset: true })).toMatchObject({ 'ϵ': 0.8, 'α': 0.75, reset: false });
    expect(assigned({ ...initialState(), planet: 4, 'ϵ': 0.5, reset: true })).toMatchObject({ 'ϵ': 0.5, 'α': 0.3, reset: false });
    expect(evaluate({ ...initialState(), planet: 2, reset: true }).state.reset).toBe(false);
  });

  it('the scale converts to degrees Fahrenheit', () => {
    expect(temperatureText(286.2349, 'DegreesFahrenheit')).toBe('286 K = 56 °F');
    expect(evaluate({ ...initialState(), scale: 'DegreesFahrenheit' }).view.labels.Ta).toBe('241 K = −26 °F');
  });

  it('the intensities: S = 342/d squared, the planet emits sigma Tp^4', () => {
    const q = quantities({ ...initialState(), d: 2 });
    expect(q.S).toBeCloseTo(85.5, 12);
    expect(q.emitted).toBeCloseTo(SIGMA * q.Tp ** 4, 9);
  });
});

describe('corrected mode (E-AT)', () => {
  it('Mars and Venus set their distances; the units label says W/m2', () => {
    const venus = { ...initialState(), planet: 3, 'ϵ': 0.8, 'α': 0.75, d: 1 };
    const o = evaluate(venus).view, c = evaluate({ ...venus, errata: 'corrected' }).view;
    expect(o.labels.Tp).toBe('224 K = −49 °C');
    expect(c.d).toBe(0.72);
    expect(c.labels.S).toBe(660);
    expect(c.labels.Tp).toBe('264 K = −9 °C');
    expect(evaluate({ ...initialState(), planet: 2, d: 3, errata: 'corrected' }).view.d).toBe(1.52);
    expect(o.labels.units).toBe('kW/m²');
    expect(c.labels.units).toBe('W/m²');
    // Earth and "my own" are unchanged
    expect(evaluate({ ...initialState(), errata: 'corrected' }).view.labels.Tp).toBe(evaluate(initialState()).view.labels.Tp);
    expect(evaluate({ ...initialState(), planet: 4, d: 2, errata: 'corrected' }).view.d).toBe(2);
  });
});
