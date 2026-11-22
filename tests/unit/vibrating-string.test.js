// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alain Goriely and Mark Robertson-Tessi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/vibrating-string.test.js — the model of "The Vibrating String" against values from outside the port: hand
// derivations (the Hermite cubic of the opening state, closed forms of the Fourier coefficients), the Fourier series of
// the tent (d'Alembert's solution summed independently), and the notebook's saved states and snapshot settings.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  initialState, evaluate, cleanPoints, ptsrtOf, ptsrt2Of, MyPiecewise, PeriodicExtension, OddExtension, F,
} from '../../demos/vibrating-string/model.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/vibrating-string.original-states.json', 'utf8'));
const num = (v) => (v && typeof v === 'object' && 'n' in v ? v.n : v);
const settings = (s) => ({ ...s, points: s.points.map((p) => p.map(num)) });
const PI = Math.PI;

describe('vibrating-string model', () => {
  it('the opening state is the live state of the notebook and its initial settings', () => {
    expect(initialState()).toEqual(settings(fx.specs));
    expect(initialState()).toEqual(settings(fx.states[0]));
  });

  it('the Hermite data of the opening state (by hand: chord slopes 2 and −2 at the ends, 0 at the point)', () => {
    const { view } = evaluate(initialState());
    expect(view.ptsrt).toEqual([[1e-8, 0], [0.5, 1], [1, 0]]);
    expect(view.ptsrt2).toEqual([[[0], 0, 2], [[0.5], 1, 0], [[1], 0, -2]]);
  });

  it('the polynomial string of the opening state is −s³ + s² + s with s = 2x, mirrored about x = 1/2', () => {
    const { view } = evaluate(initialState());
    const hand = (x) => { const s = 2 * Math.min(x, 1 - x); return -(s ** 3) + s * s + s; };
    for (const [x, initial, evolving] of view.samples.slice(0, -1)) { // x = 1: no value in the original (E-VS-04)
      expect(initial, `x = ${x}`).toBeCloseTo(hand(x), 12);
      expect(evolving, `x = ${x}`).toBeCloseTo(hand(x), 12); // t = 0: the evolving string is the initial string
    }
    expect(view.samples.at(-1)[1]).toBeNaN();
  });

  it('Fourier coefficients of the opening state: closed forms 192/π⁴ − 32/π³, 0, −64/(27π⁴) − 32/(27π³)', () => {
    const { Bn } = evaluate(initialState()).view;
    expect(Bn[0]).toBeCloseTo(192 / PI ** 4 - 32 / PI ** 3, 8);
    expect(Bn[1]).toBeCloseTo(0, 8);
    expect(Bn[2]).toBeCloseTo(-64 / (27 * PI ** 4) - 32 / (27 * PI ** 3), 8);
  });

  it('Fourier coefficients of the piecewise-linear tent: 8 sin(mπ/2)/(m²π²)', () => {
    const { Bn } = evaluate({ ...initialState(), idpolynom: 2 }).view;
    [1, 2, 3].forEach((m, i) => expect(Bn[i], `m = ${m}`).toBeCloseTo((8 * Math.sin((m * PI) / 2)) / (m * m * PI * PI), 6));
  });

  it('the evolving string is the Fourier series Σ Bm sin(mπx) cos(mπct) (the tent, c = 0.5, t = 0.7 and 2.9)', () => {
    for (const t of [0.7, 2.9]) {
      const { view } = evaluate({ ...initialState(), idpolynom: 2, t });
      const series = (x) => {
        let u = 0;
        for (let m = 1; m <= 20000; m += 2) u += ((8 * Math.sin((m * PI) / 2)) / (m * m * PI * PI)) * Math.sin(m * PI * x) * Math.cos(m * PI * 0.5 * t);
        return u;
      };
      for (const [x, , evolving] of view.samples.slice(1, -1)) expect(evolving, `t = ${t}, x = ${x}`).toBeCloseTo(series(x), 3);
    }
  });

  it('the snapshot 2 Hermite data (by hand: chords at the ends, central differences inside)', () => {
    const P = ptsrtOf([[0.251, 1.87], [0.725, -1.47]]);
    expect(P).toEqual([[1e-8, 0], [0.251, 1.87], [0.725, -1.47], [1, 0]]);
    const D = ptsrt2Of(P);
    expect(D.map((d) => d[0][0])).toEqual([0, 0.251, 0.725, 1]);
    expect(D[0][2]).toBeCloseTo(1.87 / 0.251, 12);
    expect(D[1][2]).toBeCloseTo(-1.47 / (0.725 - 1e-8), 12);
    expect(D[2][2]).toBeCloseTo(-1.87 / (1 - 0.251), 12);
    expect(D[3][2]).toBeCloseTo(1.47 / 0.275, 12);
  });

  it('the points: one per x (the later one stays) and a point at either end of the range (0.001, 0.999) removed', () => {
    expect(cleanPoints([[0.3, 1], [0.6, 0.5], [0.3, -1]])).toEqual([[0.6, 0.5], [0.3, -1]]);
    expect(cleanPoints([[0.001, 1], [0.4, 0.2], [1 - 0.001, -1]])).toEqual([[0.4, 0.2]]);
    expect(cleanPoints([[0.2, 1]])).toEqual([[0.2, 1]]);
  });

  it('F is odd with period 2, built from the initial data on [0, 1)', () => {
    // the line from (10⁻⁸, 0) to (0.3, 0.8): 0.4 at x = 0.15 up to 10⁻⁸
    const P = ptsrtOf([[0.3, 0.8]]), f = F(P, ptsrt2Of(P), 2);
    expect(f(0.15)).toBeCloseTo(0.4, 7);
    expect(f(-0.15)).toBeCloseTo(-0.4, 7);
    expect(f(2.15)).toBeCloseTo(0.4, 7);
    expect(f(-1.85)).toBeCloseTo(0.4, 7);
    expect(f(1.85)).toBeCloseTo(-0.4, 7);
    expect(f(1001.85)).toBeCloseTo(-0.4, 7);
    expect(OddExtension((x) => x * x, -2)).toBe(-4);
  });

  it('MyPiecewise has open intervals: 0 at the data points (E-VS-03); PeriodicExtension has no value at ±1 (E-VS-04)', () => {
    const P = [[1e-8, 0], [0.5, 1], [1, 0]];
    expect(MyPiecewise(P, 0.25)).toBeCloseTo(0.5, 7);
    expect(MyPiecewise(P, 0.5)).toBe(0);
    expect(PeriodicExtension((x) => x, 1)).toBeNaN();
    expect(PeriodicExtension((x) => x, -3)).toBeNaN();
    expect(PeriodicExtension((x) => x, 2.5)).toBeCloseTo(0.5, 15);
    const { view } = evaluate({ ...initialState(), idpolynom: 2 });
    expect(view.atData).toEqual([0]);
    expect(view.F1).toBeNaN();
  });

  it('each snapshot settings: the initial string passes through the points, the evolving string is the sum of the two waves', () => {
    for (const [k, snap] of Object.entries(fx.snapshots)) {
      const s = settings(snap);
      const { view } = evaluate({ ...s, ltw: true, rtw: true });
      expect(view.points.length, `snapshot ${k}`).toBe(s.points.length);
      view.points.forEach(([, y], i) => expect(view.atData[i], `snapshot ${k}, point ${i + 1}`).toBeCloseTo(y, 12));
      for (const [x, , evolving, left, right] of view.samples) {
        if (Number.isNaN(left + right)) expect(evolving).toBeNaN(); // F(±1) (E-VS-04)
        else expect(evolving, `snapshot ${k}, x = ${x}`).toBeCloseTo(left + right, 12);
      }
      // a graphics list with the plot and the three mode plots; the plot shows only the checked curves
      const g = evaluate(s).graphics;
      expect(g).toHaveLength(4);
      expect(g[0].list.length, `snapshot ${k}`).toBe([s.id, s.string, s.ltw, s.rtw].filter(Boolean).length);
    }
  });

  it('snapshot 4 (t = 4.156…, c = 0.5): the string has gone round once (period 2/c = 4) and moved on by c(t − 4)', () => {
    const s = settings(fx.snapshots[4]);
    const { view } = evaluate(s);
    const P = ptsrtOf(view.points), f = F(P, ptsrt2Of(P), 1), d = 0.5 * (s.t - 4);
    for (const [x, , evolving] of view.samples) expect(evolving).toBeCloseTo((f(x - d) + f(x + d)) / 2, 9);
  });
});

describe('corrected mode (E-VS)', () => {
  it('E-VS-03: with closed intervals the piecewise-linear string passes through the points; Bn unchanged', () => {
    const kept = evaluate({ ...initialState(), idpolynom: 2 }).view;
    const corr = evaluate({ ...initialState(), idpolynom: 2, errata: 'corrected' }).view;
    expect(kept.atData).toEqual([0]);
    expect(corr.atData[0]).toBeCloseTo(1, 12);
    corr.Bn.forEach((b, i) => expect(b).toBeCloseTo(kept.Bn[i], 9));
  });
  it('E-VS-04: the extension stops at |x| ≤ 1, so the string is 0 at its ends x = ±1', () => {
    expect(evaluate(initialState()).view.F1).toBeNaN();
    expect(evaluate({ ...initialState(), errata: 'corrected' }).view.F1).toBeCloseTo(0, 12);
    expect(PeriodicExtension((x) => x, 3, true)).toBe(1);
    expect(PeriodicExtension((x) => x, -1, true)).toBe(-1);
  });
});
