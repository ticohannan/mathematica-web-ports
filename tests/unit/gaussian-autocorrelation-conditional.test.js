// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Victor S. Frost
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/gaussian-autocorrelation-conditional.test.js — the model of "Linking Autocorrelation of Gaussian Random
// Process to Conditional Probabilities": the power spectral densities and correlation times against numerical Fourier
// integrals of the autocorrelations, the conditional probability against a numerical integral of the pdf, and the
// numbers printed in the four snapshot pictures at their saved settings.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { initialState, evaluate, conditional, FUNCTIONS, Q, normalPdf, nf4 } from '../../demos/gaussian-autocorrelation-conditional/model.js';

const golden = JSON.parse(readFileSync(new URL('../golden/gaussian-autocorrelation-conditional.original-states.json', import.meta.url), 'utf8'));
// the notebook stores fun as the symbol f1, f2 or f3
const fromNotebook = (s) => ({ ...s, fun: s.fun.sym });
const integrate = (f, a, b, n = 200000) => { const h = (b - a) / n; let s = (f(a) + f(b)) / 2; for (let i = 1; i < n; i++) s += f(a + i * h); return s * h; };

describe('gaussian-autocorrelation-conditional model', () => {
  it('the opening state is the notebook live state', () => {
    expect(initialState()).toEqual(fromNotebook(golden.states[0]));
    expect(initialState()).toEqual(fromNotebook(golden.specs));
  });

  it('each power spectral density is the Fourier transform of its autocorrelation', () => {
    for (const [k, span] of [['f2', 1], ['f3', 8]]) {
      const { R, psd } = FUNCTIONS[k];
      for (const f of [0, 0.3, 1.7]) {
        const ft = 2 * integrate((tau) => R(tau) * Math.cos(2 * Math.PI * f * tau), 0, span);
        expect(psd(f), `${k} at f = ${f}`).toBeCloseTo(ft, 3);
      }
    }
    // the sinc: a rectangle of height 1 for |f| < 5 (its transform; checked at the edges and inside)
    expect([FUNCTIONS.f1.psd(0), FUNCTIONS.f1.psd(4.9), FUNCTIONS.f1.psd(5.1), FUNCTIONS.f1.psd(-5.1)]).toEqual([1, 1, 0, 0]);
  });

  it('the correlation times of the labels are the integral of R over R(0)', () => {
    expect(2 * integrate(FUNCTIONS.f2.R, 0, 1) / 10).toBeCloseTo(1.0, 6);
    expect(2 * integrate(FUNCTIONS.f3.R, 0, 5) / 10).toBeCloseTo(0.2, 6);
    expect(FUNCTIONS.f1.psd(0) / 10).toBeCloseTo(0.1, 12); // ∫R = S(0) = 1 for the sinc
  });

  it('the conditional probability is the area of the conditional pdf above L', () => {
    for (const st of [initialState(), { fun: 'f2', t: 0.3, y: -1, L: 0.5 }, { fun: 'f3', t: 0.02, y: 2, L: 3 }]) {
      const c = conditional(st);
      const area = integrate(normalPdf(c.mean, c.sd), st.L, c.mean + 12 * c.sd, 400000);
      expect(c.probability).toBeCloseTo(area, 6);
    }
    expect(Q(0)).toBe(0.5);
  });

  it('the four snapshot settings give the numbers printed in the snapshot pictures', () => {
    const want = {
      1: ['0.6366', '5.947', '0.4408'], 2: ['0.7444', '4.459', '0.3086'], 3: ['0.95', '0.975', '0.4798'], 4: ['0.6065', '6.321', '0.4378'],
    };
    for (const [k, [m, v, p]] of Object.entries(want)) {
      const { lines } = evaluate(fromNotebook(golden.snapshots[k])).view;
      expect(lines, `snapshot ${k}`).toEqual({
        mean: `conditional expected value = ${m}`, variance: `conditional variance = ${v}`, probability: `conditional probability = ${p}`,
      });
    }
  });

  it('for long lags the conditional probability tends to the unconditional one', () => {
    const c = conditional({ fun: 'f3', t: 1.1, y: 3, L: 1 });
    expect(c.probability).toBeCloseTo(c.unconditional, 4);
    expect(nf4(1e-12)).toBe('0');
  });

  it('the six pictures: the four plots, the legend and the three lines', () => {
    const g = evaluate(initialState()).graphics;
    expect(g).toHaveLength(6);
    for (const k of [0, 1, 2, 4]) expect(g[k].head).toBe('Graphics');
  });
});
