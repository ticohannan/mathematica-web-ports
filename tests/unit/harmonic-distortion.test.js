// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Carsten Roppel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/harmonic-distortion.test.js — the model of "Harmonic Distortion of Nonlinear Transfer Function". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/harmonic-distortion-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, output, spectrum, X, NBR, FREQ, T } from '../../demos/harmonic-distortion/model.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/harmonic-distortion.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

describe('harmonic-distortion model', () => {
  it('the opening state and the Initialization data', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
    expect(X).toHaveLength(4096);
    expect(X[4]).toBeCloseTo(1, 15); // sin(2π·1000·4/16000) = sin(π/2)
    expect(T).toHaveLength(81); expect(FREQ).toHaveLength(2048);
    expect(FREQ[256]).toBe(1000);
  });
  it('the spectrum of the pure sine is 1 at 1 kHz and 0 elsewhere (snapshots 1 and 2)', () => {
    const sp = spectrum(output(initialState()));
    expect(sp[256]).toBeCloseTo(1, 12);
    expect(Math.max(...sp.filter((_, k) => k !== 256))).toBeLessThan(1e-12);
  });
  it('c1 gives even harmonics, c2 odd ones (trigonometric identities)', () => {
    // x + c1 x² + c2 x³ = c1/2 + (1 + 3 c2/4) sin − (c1/2) cos 2 − (c2/4) sin 3
    const sp = spectrum(output({ c1: 0.4, c2: 0.2, clipping: false, level: 0.8 }));
    expect(sp[256]).toBeCloseTo(1.15, 12); expect(sp[512]).toBeCloseTo(0.2, 12); expect(sp[768]).toBeCloseTo(0.05, 12);
    expect(sp[0]).toBeCloseTo(0.4, 12); // the original's DC bin: twice the mean 0.2 (E-HD-01)
  });
  it('clipping at 0.7 (snapshots 3 and 4): odd harmonics only, the fundamental about 0.82', () => {
    const { view } = evaluate(snap('3'));
    expect(view.peak).toBe(0.7); expect(view.trough).toBe(-0.7);
    expect(view.harmonics[0]).toBeGreaterThan(0.8); expect(view.harmonics[0]).toBeLessThan(0.85);
    expect(view.harmonics[1]).toBeLessThan(1e-12); expect(view.harmonics[3]).toBeLessThan(1e-12);
    expect(view.harmonics[2]).toBeGreaterThan(0.05);
  });
});

describe('corrected mode (E-HD)', () => {
  it('E-HD-01: the DC bin is the mean of the signal', () => {
    const z = output({ c1: 0.5, c2: 0, clipping: false, level: 0.8 });
    const mean = z.reduce((a, b) => a + b, 0) / NBR; // 0.25: ½ c1 over whole periods
    expect(mean).toBeCloseTo(0.25, 12);
    expect(spectrum(z, true)[0]).toBeCloseTo(0.25, 12);
    expect(spectrum(z, false)[0]).toBeCloseTo(0.5, 12);
    expect(evaluate({ ...initialState(), c1: 0.5, errata: 'corrected' }).view.dc).toBeCloseTo(0.25, 12);
  });
});
