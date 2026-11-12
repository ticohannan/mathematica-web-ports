// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Hugo Tadashi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/zero-pole-cancellation.test.js — the model of "Zero-Pole Cancellation in Transfer Functions". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/zero-pole-cancellation-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, FUNCS } from '../../demos/zero-pole-cancellation/model.js';
import { rootLocusData } from '../../shared/control-plots.js';
import { polyAdd, polyScale, polyEvalC } from '../../shared/poly.js';
import { Abs, Complex } from '../../shared/complex.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/zero-pole-cancellation.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

describe('zero-pole-cancellation model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it('the root locus: every point is a root of den + k num, the branches start at the poles and are continuous', () => {
    for (const G of FUNCS) {
      const data = rootLocusData(G, [0, 1]);
      for (const d of data.filter((_, i) => i % 7 === 0)) for (const [x, y] of d.roots) expect(Abs(polyEvalC(polyAdd(G.den, polyScale(G.num, d.k)), Complex(x, y)))).toBeLessThan(1e-9);
      for (let i = 1; i < data.length; i++) for (let j = 0; j < data[i].roots.length; j++) {
        const [a, b] = [data[i - 1].roots[j], data[i].roots[j]];
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(0.05);
      }
    }
  });
  it('the snapshots’ pictures: the poles −1, −0.5, 0.1 (and the zero 0.3); the branch ends at k = 1', () => {
    const v1 = evaluate(snap('1')).view;
    expect(v1.poles.map((p) => +p[0].toFixed(10))).toEqual([-1, -0.5, 0.1]);
    expect(v1.ends[0][0]).toBeCloseTo(-1.5644, 4); expect(Math.abs(v1.ends[1][1])).toBeCloseTo(0.7749, 4);
    const v3 = evaluate(snap('3')).view; // precise cancellation: the branches meet at −0.75 and go vertical
    expect(v3.ends[0][0]).toBeCloseTo(-0.75, 9);
    expect(evaluate(snap('4')).view.zeros).toEqual([[0.3, 0]]);
  });
  it('the gain draws nothing in the original (E-ZP-01)', () => {
    expect(evaluate(snap('2')).view.parameterPoints).toBe(0);
  });
});

describe('corrected mode (E-ZP)', () => {
  it('E-ZP-01: the closed-loop poles at the gain, as the roots of den + 0.628 num', () => {
    const r = evaluate({ ...snap('2'), errata: 'corrected' });
    expect(r.view.parameterPoints).toBe(3);
    const pts = Cases(annotation(r.graphics.list, 'parameter-values').g, 'Point').map((p) => (Array.isArray(p.pts[0]) ? p.pts[0] : p.pts));
    expect(pts.map((p) => +p[0].toFixed(3)).sort((a, b) => a - b)).toEqual([-1.436, 0.018, 0.018]);
  });
});
