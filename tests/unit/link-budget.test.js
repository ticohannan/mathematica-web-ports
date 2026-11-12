// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Victor S. Frost
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/link-budget.test.js — the model of "Link Budget for Communication Systems". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/link-budget-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, snr, antennaGain, pathLoss, noiseDensity, wavelength } from '../../demos/link-budget/model.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/link-budget.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

describe('link-budget model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it('the link budget term by term (Details): gains, path loss, noise', () => {
    expect(wavelength(1000)).toBeCloseTo(0.3, 15);
    expect(antennaGain(1, 1000)).toBeCloseTo(20 * Math.log10(Math.PI / 0.3), 12); // (π D/λ)² in dB
    expect(pathLoss(1, 1000, 2)).toBeCloseTo(20 * Math.log10((4 * Math.PI) / 0.3), 12); // free space at d = 1 m
    expect(pathLoss(100, 1000, 3) - pathLoss(10, 1000, 3)).toBeCloseTo(30, 12); // 10 n dB per decade
    expect(noiseDensity(290, 0)).toBeCloseTo(10 * Math.log10(1.38e-23 * 290), 12); // F = 0 dB: k T0
    // S/N falls by 10 n dB per decade of distance
    const s = initialState();
    expect(snr(s, 100) - snr(s, 1000)).toBeCloseTo(20, 10);
  });
  it('the antenna gains of the four snapshots (their plot labels)', () => {
    const want = { 1: ['20.4', '20.4'], 2: ['6.067', '1.984'], 3: ['12.44', '6.421'], 4: ['14.38', '20.4'] };
    for (const k of ['1', '2', '3', '4']) {
      const { graphics } = evaluate(snap(k));
      const label = textOf(graphics.options.PlotLabel);
      expect(label).toContain(`transmit antenna gain = ${want[k][0]} dB`);
      expect(label).toContain(`receive antenna gain = ${want[k][1]} dB`);
    }
  });
  it('the plotted range starts at 0 and reaches the curve (snapshot 1: 0 … 117)', () => {
    const { view } = evaluate(snap('1'));
    expect(view.range[0]).toBe(0);
    expect(view.range[1]).toBeCloseTo(117.33, 2);
    expect(view.snrMax).toBeCloseTo(77.33, 2);
  });
});
