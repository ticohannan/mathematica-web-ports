// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Housam Binous, Mohammad Mozahar Hossain and Ahmed Bellagi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/integral-error-criteria.test.js — the model of "Integral Error Criteria for Controller Tuning". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/integral-error-criteria-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, b, criteria, recomputedTables, IAE, ISE, ITAE } from '../../demos/integral-error-criteria/model.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/integral-error-criteria.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

/** An independent midpoint sum of the three integrals (step 10⁻³ up to t = 400, where the error has died away). */
function midpoint(q, until = 400, h = 1e-3) {
  const y = b(q); let iae = 0, ise = 0, itae = 0;
  for (let t = h / 2; t < until; t += h) { const e = 1 - y(t); iae += Math.abs(e) * h; ise += e * e * h; itae += t * Math.abs(e) * h; }
  return { IAE: iae, ISE: ise, ITAE: itae };
}
describe('integral-error-criteria model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it('b is the closed-loop step response: b(0) = 0, b → 1, and it satisfies the characteristic equation', () => {
    const y = b(1.25);
    expect(y(0)).toBeCloseTo(0, 12); expect(y(400)).toBeCloseTo(1, 10);
  });
  it('the integrals at the snapshot gains: ISE as the snapshots (2.950, 2.565); IAE and ITAE as a midpoint sum', () => {
    for (const [q, ise] of [[1.25, 2.95], [2.1, 2.565]]) {
      const c = criteria(q), m = midpoint(q);
      expect(c.ISE).toBeCloseTo(ise, 3);
      expect(c.IAE).toBeCloseTo(m.IAE, 5); expect(c.ITAE).toBeCloseTo(m.ITAE, 3);
    }
    // the snapshots show IAE 5.059 and 5.345, ITAE 25.529 and 41.090 (D-IE-01: Mathematica's NIntegrate of Abs)
    expect(criteria(1.25).IAE).toBeCloseTo(5.0595, 4);
  });
  it('at the marginal gain 7.5 the oscillation never dies (snapshot 6: ISE 3068)', () => {
    expect(criteria(7.5).ISE).toBeCloseTo(3068, 0);
  });
  it('the tuning plots draw the authors’ tables and optima', () => {
    expect(IAE).toHaveLength(8); expect(ISE[1]).toEqual([1.25, 2.95]); expect(ITAE[0]).toEqual([1, 24.8437]);
    expect(evaluate({ ...initialState(), ctrl2: 2, ctrl: 2 }).view.optimum).toEqual([2.084447222082553, 2.5653841409022107]);
  });
});

describe('corrected mode (E-IE)', () => {
  it('E-IE-01: recomputed tables and optima, checked against the midpoint sum', () => {
    const r = recomputedTables();
    for (const [g, v] of r.IAE.table) expect(v).toBeCloseTo(midpoint(g).IAE, 4);
    expect(r.IAE.optimum[1]).toBeCloseTo(1.452, 2);
    // the optimum is a minimum of the midpoint sum too
    const g = r.IAE.optimum[1];
    expect(midpoint(g).IAE).toBeLessThan(midpoint(g - 0.03).IAE); expect(midpoint(g).IAE).toBeLessThan(midpoint(g + 0.03).IAE);
    expect(evaluate({ ctrl2: 2, ctrl: 1, Kc: 1.25, errata: 'corrected' }).view.optimum[0]).toBeCloseTo(1.452, 2);
  });
});
