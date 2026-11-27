// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Neil Hendren and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/batch-distillation.test.js — the model of "Batch Distillation": the Rayleigh solution against its defining
// integral, the mass balances of a run of collections, the body's assignments (the end of a collection, the guard
// against boiling dry, inProg), and the snapshots' saved settings against the stored xt and the numbers printed in the
// snapshot pictures (docs/original-snapshots/batch-distillation-*.png).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, evaluate, step, compute, reset, eqdata, eqtempdata, rayleigh, findRootRange, modfuncx, modfuncy, superScript,
} from '../../demos/batch-distillation/model.js';
import { annotation } from '../../shared/graphics.js';

const golden = JSON.parse(readFileSync(new URL('../golden/batch-distillation.original-states.json', import.meta.url), 'utf8'));
/** A saved state with xb = z (the symbol z of the stored "Variables") made a number. */
const saved = (s) => ({ ...s, xb: s.xb?.sym === 'z' ? s.z : s.xb });
/** ∫_a^b f by Simpson's rule on many points (an independent check of the model's quadrature). */
const simpson = (f, a, b, n = 20000) => {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
  return (s * h) / 3;
};
/** Collect once: the Trigger runs evapProg from 0 to 1 (two of its steps), then the body ends the collection. */
const collect = (s) => evaluate({ ...evaluate({ ...s, evapProg: 0.5 }).state, evapProg: 1 }).state;

describe('batch-distillation model', () => {
  it('the opening state is the notebook live state', () => {
    expect(initialState()).toEqual(saved(golden.specs));
    expect(initialState()).toEqual(saved(golden.states[0]));
    // the stored xt is the vapour in equilibrium with z = 0.5 (compt = eqdata[compb] while molt < 0.01)
    expect(evaluate(initialState()).state).toEqual(initialState());
  });

  it('the invented equilibrium data and the azeotropes the FindRoot ranges keep apart', () => {
    expect(eqdata(0, 1)).toBe(0);
    expect(eqdata(1, 1)).toBeCloseTo(1, 14);
    expect(eqtempdata(0, 1) - 273.15).toBeCloseTo(105.85, 12);
    expect(eqdata(0.61517, 2) - 0.61517).toBeCloseTo(0, 4); // minimum-boiling azeotrope
    expect(eqdata(0.45717, 3) - 0.45717).toBeCloseTo(0, 4); // maximum-boiling azeotrope
    expect(findRootRange(2, 0.7)).toEqual([0.61518, 0.9999]);
    expect(findRootRange(2, 0.5)).toEqual([0.0001, 0.61516]);
    expect(findRootRange(3, 0.46)).toEqual([0.45718, 0.999]);
    expect(findRootRange(3, 0.45717)).toEqual([0.0001, 0.45716]);
  });

  it('the Rayleigh solution satisfies its integral equation (an independent quadrature)', () => {
    for (const [x0, ratio, az, z] of [[0.5, 1 / 0.9, 1, 0.5], [0.4, 0.8 / 0.5, 1, 0.5], [0.5, 1 / 0.87, 2, 0.5], [0.3, 1 / 0.75, 3, 0.3], [0.8, 1 / 0.6, 2, 0.8]]) {
      const xbf = rayleigh(x0, Math.log(ratio), az, z);
      const lhs = simpson((u) => 1 / (eqdata(u, az) - u), xbf, x0);
      expect(lhs, `${x0} ${az}`).toBeCloseTo(Math.log(ratio), 6);
    }
    // no evaporation: the still keeps its composition
    expect(rayleigh(0.37, 0, 1, 0.37)).toBe(0.37);
    // the maximum-boiling azeotrope: below it the vapour is poorer in B, so the still moves toward x = 0.457 …
    const up = rayleigh(0.3, Math.log(2), 3, 0.3);
    expect(up).toBeGreaterThan(0.3);
    expect(up).toBeLessThan(0.45716);
    // the minimum-boiling azeotrope above it: the still moves away from x = 0.615 … toward 1
    expect(rayleigh(0.8, Math.log(1.5), 2, 0.8)).toBeGreaterThan(0.8);
  });

  it('a run of collections keeps the mass balances, and the still empties to 0.2 mol', () => {
    let s = initialState();
    const xs = [];
    while (!s.inProg) {
      s = collect(s);
      const c = compute(s);
      const k = s.stage - 1;
      // overall and component balances (1) and (2): F = 1 mol, F z = B xB + Σ D_i xD,i
      expect(c.molb + c.collectedVol).toBeCloseTo(1, 12);
      expect(c.molb * s.xb + c.collectedB).toBeCloseTo(s.z, 10);
      expect(s.flasksMol[k - 1]).toBeCloseTo(k < 8 ? 0.1 : s.flasksMol[k - 1], 12);
      xs.push(s.flasksFrac[k - 1]);
      if (s.stage > 12) throw new Error('no end');
    }
    // the distillate gets poorer in B flask after flask (B is the more volatile component)
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeLessThan(xs[i - 1]);
    expect(compute(s).molb).toBeCloseTo(0.2, 12);
    expect(s.stage).toBe(9);
    expect(xs.map((x) => x.toFixed(3)).slice(0, 6)).toEqual(['0.733', '0.708', '0.678', '0.642', '0.596', '0.538']);
  });

  it('the end of a collection stores the flask, sets evapProg = 0 and moves to the next stage', () => {
    const s = step({ ...initialState(), evapProg: 1 });
    expect([s.stage, s.evapProg, s.flasksMol[0]]).toEqual([2, 0, 0.1]);
    // the flask's mole fraction is the mass balance of the run (compt), (z − xb molb)/molt
    expect(s.flasksFrac[0]).toBeCloseTo((0.5 - s.xb * 0.9) / 0.1, 12);
    expect(s.flasksFrac[0]).toBeCloseTo(0.733, 3);
    // while evapProg > 0 the controls are disabled (inProg) and the receiver fills
    const mid = evaluate({ ...initialState(), evapProg: 0.5 });
    expect(mid.state.inProg).toBe(true);
    expect(mid.view.molt).toBeCloseTo(0.05, 15);
    expect(mid.view.labels.receiverMol).toBe('0.05 mol');
  });

  it('the guard against boiling dry lowers the amount to evaporate to what leaves 0.2 mol', () => {
    let s = initialState();
    for (let k = 0; k < 5; k++) s = collect({ ...s, molesToEvap: 0.12 });
    // 1 − 5 × 0.12 = 0.4 mol left: 0.25 would leave 0.15 < 0.2, so molesToEvap = molb − 0.2 (boilDry = True); the
    // body runs again (molesToEvap is tracked) and, with 0.2 mol left exactly or within rounding, sets boilDry again
    const first = { ...s, molesToEvap: 0.25 };
    expect(compute(first).molb - first.molesToEvap).toBeLessThan(0.2);
    const g = evaluate(first).state;
    expect(g.molesToEvap).toBeCloseTo(0.2, 12);
    expect(compute(g).molb - g.molesToEvap).toBeCloseTo(0.2, 12);
    expect(evaluate({ ...s, molesToEvap: 0.05 }).state).toMatchObject({ boilDry: false, molesToEvap: 0.05 });
  });

  it('reset empties the flasks and goes back to stage 1 with z = 0.5', () => {
    const s = collect(collect({ ...initialState(), z: 0.3 }));
    expect(s.stage).toBe(3);
    const r = evaluate(reset(s)).state;
    expect(r).toEqual({ ...initialState(), xb: 0.5, xt: initialState().xt });
  });

  it('the flasks set aside sit in two columns of the inset, numbered with their ordinal', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(modfuncx)).toEqual([5, 11.8, 5, 11.8, 5, 11.8, 5, 11.8]);
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(modfuncy)).toEqual([9.5, 9.5, 5.5, 5.5, 1.5, 1.5, -2.5, -2.5]) // odd n left, even n right, a row per pair;
    expect([1, 2, 3, 4, 11].map(superScript)).toEqual(['st', 'nd', 'rd', 'th', 'th']);
    const s = collect(collect(initialState()));
    const { graphics } = evaluate(s);
    const inset = annotation(graphics, 'inset-1').g.graphics;
    expect(inset.options.PlotRange).toEqual([[7.7, 22], [-2, 13]]);
    expect(annotation(inset, 'flask-1')).toBeTruthy();
    expect(annotation(inset, 'flask-2')).toBeTruthy();
    expect(annotation(inset, 'flask-3')).toBeFalsy();
  });

  it('the snapshot settings give the stored xt and the numbers printed in the snapshot pictures', () => {
    const printed = {
      1: { T: '86.4° C', still: '0.50', stillMol: '1.00 mol', vapor: '0.74', receiver: '0.74', receiverMol: '0.00 mol' },
      2: { T: '81.9° C', still: '0.50', stillMol: '1.00 mol', vapor: '0.59', receiver: '0.59', receiverMol: '0.00 mol' },
      3: { T: '104.0° C', still: '0.50', stillMol: '1.00 mol', vapor: '0.54', receiver: '0.54', receiverMol: '0.00 mol' },
      4: { T: '86.9° C', still: '0.48', stillMol: '1.00 mol', vapor: '0.73', receiver: '0.73', receiverMol: '0.00 mol' },
    };
    for (const [k, want] of Object.entries(printed)) {
      const g = saved(golden.snapshots[k]);
      const { view, state, graphics } = evaluate(g);
      expect(view.labels, `snapshot ${k}`).toEqual(want);
      expect(state.xt, `snapshot ${k}`).toBeCloseTo(g.xt, 12);
      expect(annotation(graphics, `inset-${g.graph}`), `snapshot ${k}`).toBeTruthy();
    }
  });
});
