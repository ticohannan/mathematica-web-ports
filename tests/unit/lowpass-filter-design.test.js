// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/lowpass-filter-design.test.js — the model of "Lowpass Filter Design by Pole Placement". Expected values
// derived by hand from the Manipulate's definitions and the notebook's saved states.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { initialState, evaluate, polesOf, absH, poleState, scaleOf, peakOf, TYPES } from '../../demos/lowpass-filter-design/model.js';
import { annotation, Cases } from '../../shared/graphics.js';
import { numbersOf } from '../../shared/manipulate.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/lowpass-filter-design.original-states.json', 'utf8'));

describe('lowpass-filter-design model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual({ type: 'vertical line', n: 3, α: -1, p: [[-1, -1], [-1, 1]] });
    // the body sets p to the three poles at once (the notebook's saved state)
    expect(evaluate(initialState()).state).toEqual(fx.states[0]);
  });
  it('the poles of each arrangement (the saved snapshots 2 and 3)', () => {
    expect(TYPES).toEqual(['vertical line', 'triangle', 'Butterworth', 'elliptical', 'manual']);
    for (const k of ['2', '3']) {
      const s = numbersOf(fx.snapshots[k]);
      const got = polesOf(s.type, s.n, s.α);
      got.forEach(([x, y], i) => { expect(x).toBeCloseTo(s.p[i][0], 14); expect(y).toBeCloseTo(s.p[i][1], 14); });
    }
    expect(polesOf('vertical line', 1, -0.3)).toEqual([[-0.3, 0]]);
    for (const [x, y] of polesOf('Butterworth', 7, -1)) { expect(Math.hypot(x, y)).toBeCloseTo(1, 14); expect(x).toBeLessThan(0); }
  });
  it('manual mode takes the poles from p (n = their number, α = the smallest real part)', () => {
    const r = poleState({ type: 'manual', n: 3, α: -1, p: [[-0.2, 0.5], [-1.4, -0.1]] });
    expect([r.n, r.α, r.poles]).toEqual([2, -1.4, [[-0.2, 0.5], [-1.4, -0.1]]]);
    // no pole left: one at {α, 0}
    expect(poleState({ type: 'manual', n: 3, α: -0.7, p: [] }).poles).toEqual([[-0.7, 0]]);
    // another type: p follows the computed poles
    expect(poleState({ type: 'Butterworth', n: 2, α: -1, p: [[-1, 0]] }).p).toHaveLength(2);
  });
  it('the magnitude response at the snapshot settings', () => {
    // |H(jω)| = Π 1/|jω − p|: one pole at −1 gives 1/√(1 + ω²)
    expect(absH([[-1, 0]], 1)).toBeCloseTo(1 / Math.SQRT2, 15);
    // snapshot 1: poles −1 ± j, −1; s = max(|H(0)|, |H(1)|, |H(Im p_2)|) = |H(0)| = 1/2
    const { view } = evaluate(numbersOf({ ...fx.snapshots['1'], type: 'vertical line' }));
    expect(view.s).toBeCloseTo(0.5, 15);
    // Butterworth: |H(ω)|² = 1/(1 + ω^(2n)), so the scale is |H(0)| = 1 and |H(1)|/s = 1/√2
    const b = poleState({ type: 'Butterworth', n: 5, α: -1, p: [] });
    const s = scaleOf(b.poles, 5);
    expect(s).toBeCloseTo(1, 12);
    expect(absH(b.poles, 1) / s).toBeCloseTo(1 / Math.SQRT2, 12);
    // E-LF-03: the plotted peak exceeds 1 (the probe 1.034 for vertical line, n = 4, α = −0.3)
    const v = poleState({ type: 'vertical line', n: 4, α: -0.3, p: [] });
    expect(peakOf(v.poles, scaleOf(v.poles, 4))).toBeCloseTo(1.034, 3);
    // the four snapshots' plots: one × marker per pole, the ideal filter's two dashed jumps
    for (const k of ['1', '2', '3', '4']) {
      const st = numbersOf({ ...fx.snapshots[k] });
      if (Array.isArray(st.type)) st.type = st.type[0];
      const r = evaluate(st);
      expect(Cases(annotation(r.graphics[0], 'pole-plot').g, 'Inset')).toHaveLength(r.view.n);
      const ls = Cases(annotation(r.graphics[1], 'magnitude-plot').g, 'Line');
      expect(ls).toHaveLength(3);
      expect(ls[2].pts).toEqual([[[-1, 0], [-1, 1]], [[1, 1], [1, 0]]]);
    }
  });
});
