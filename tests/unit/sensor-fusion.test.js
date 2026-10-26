// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/sensor-fusion.test.js — the model of "Sensor Fusion with Normally Distributed Noise": the opening state
// from the notebook, the scalar Kalman update against hand-derived values and the closed form (inverse variances add),
// the picture's curves, stems and legend, and the notebook's four snapshot settings.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { initialState, evaluate, fuse, MY_COLORS, rg } from '../../demos/sensor-fusion/model.js';
import { annotation, Cases } from '../../shared/graphics.js';

const saved = JSON.parse(readFileSync(new URL('../golden/sensor-fusion.original-states.json', import.meta.url), 'utf8'));
const fromSaved = ({ MyColors, ...s }) => ({ ...s, MyColors: MyColors.map((c) => c.args) });
const lines = (g) => { const out = []; Cases(g, (q, st) => { if (q.head === 'Line') out.push({ q, color: [...st.color], dash: st.dash }); return false; }); return out; };

describe('sensor-fusion model', () => {
  it('the opening state: the notebook\'s initial settings (u = 2, variances 5, 10, 10, 10, z = 2, 4, 6, 8)', () => {
    expect(initialState()).toEqual(fromSaved(saved.specs));
    expect(rg).toBe(10);
    expect(MY_COLORS).toEqual(saved.specs.MyColors.map((c) => c.args));
  });
  it('the Kalman update by hand: z = 2, 4 with variances 5, 10 gives k = 1/3, estimate 8/3, variance 10/3', () => {
    const { zEst, σEst, gains } = fuse([2, 4, 6, 8], [5, 10, 10, 10], 2);
    expect(gains).toEqual([1 / 3]);
    expect(zEst).toBeCloseTo(8 / 3, 14);
    expect(σEst).toBeCloseTo(10 / 3, 14);
  });
  it('one measurement: the combined estimate is the measurement itself (the For loop does not run)', () => {
    expect(fuse([3, 0, 0, 0], [7, 1, 1, 1], 1)).toEqual({ zEst: 3, σEst: 7, gains: [] });
  });
  it('equal variances: the estimate is the mean and the variance is σ²/u', () => {
    const { zEst, σEst } = fuse([1, 2, 3, 6], [4, 4, 4, 4], 4);
    expect(zEst).toBeCloseTo(3, 14);
    expect(σEst).toBeCloseTo(1, 14);
  });
  it('the recursion equals the closed form: 1/σ̂² = Σ 1/σᵢ², x̂ = σ̂² Σ zᵢ/σᵢ² (order does not matter)', () => {
    const z = [-3, 0.5, 7, 2], v = [0.4, 12, 3, 19.5];
    const inv = v.reduce((a, s) => a + 1 / s, 0);
    const { zEst, σEst } = fuse(z, v, 4);
    expect(σEst).toBeCloseTo(1 / inv, 12);
    expect(zEst).toBeCloseTo(z.reduce((a, x, i) => a + x / v[i], 0) / inv, 12);
    const r = fuse([...z].reverse(), [...v].reverse(), 4);
    expect(r.zEst).toBeCloseTo(zEst, 12);
  });
  it('the picture: u solid curves in MyColors and the dashed purple estimate, filled to 0; stems at the peaks', () => {
    const { graphics, view } = evaluate({ ...initialState(), u: 3 });
    const curves = lines(annotation(graphics, 'curves').g);
    expect(curves.length).toBe(4);
    curves.slice(0, 3).forEach((c, i) => { expect(c.color).toEqual(MY_COLORS[i]); expect(c.dash).toBeFalsy(); });
    expect(curves[3].color).toEqual([0.5, 0, 0.5]);
    expect(curves[3].dash).toBeTruthy();
    expect(Cases(annotation(graphics, 'curves').g, 'Polygon').length).toBe(4);
    // the stem of measurement n reaches 1/(Sqrt[2 π] Sqrt[σSq[[n]]]) at z_n
    expect(view.peaks[0]).toBeCloseTo(1 / Math.sqrt(2 * Math.PI * 5), 14);
    const stems = Cases(annotation(graphics, 'peaks').g, 'Point').flatMap((p) => p.pts);
    expect(stems).toEqual([[2, view.peaks[0]], [4, view.peaks[1]], [6, view.peaks[2]]]);
    const o = graphics.options;
    expect(o.PlotRange[1]).toEqual([0, 1]);
    expect(o.PlotRange[0][0]).toBeLessThanOrEqual(-10);
    expect(o.PlotRange[0][1]).toBeGreaterThanOrEqual(10);
    expect(o.Frame).toEqual([true, true, false, false]);
    expect(o.PlotLegends.items.map((it) => it.label.replace(/ /g, ' ').replace(/\s+/g, ' '))).toEqual(['measurement 1', 'measurement 2', 'measurement 3', 'combined estimate']);
    expect(o.PlotLegends.items.every((it) => !it.filled)).toBe(true);
  });
  it('the estimate density peaks at the estimate with height 1/Sqrt[2 π σ̂²]', () => {
    const { view } = evaluate(initialState());
    expect(view.estimatePeak).toBeCloseTo(1 / Math.sqrt(2 * Math.PI * 10 / 3), 14);
    expect(view.zEst).toBeCloseTo(8 / 3, 14);
  });
  const expected = { // hand-derived: σ̂² = 1/Σ(1/σᵢ²), x̂ = σ̂² Σ zᵢ/σᵢ²; peak = 1/Sqrt[2 π σ̂²] (read off the snapshot pictures)
    1: { zEst: 8 / 3, σEst: 10 / 3, peak: 0.2185 },
    2: { σEst: 1 / (1 / 2.22 + 1 / 11.58 + 1 / 0.92 + 1 / 13.44), peak: 0.520 },
    3: { zEst: 2, σEst: 2.22, peak: 0.268 },
    4: { σEst: 1 / (1 / 2.22 + 1 / 11.58 + 1 / 0.38 + 1 / 13.44), peak: 0.718 },
  };
  for (const [id, s] of Object.entries(saved.snapshots)) {
    it(`snapshot ${id} (u = ${s.u}): evaluates and gives the hand-derived estimate`, () => {
      const st = fromSaved(s);
      const { view, graphics } = evaluate(st);
      const e = expected[id];
      expect(view.σEst).toBeCloseTo(e.σEst, 12);
      const zs = [st.z1[0], st.z2[0], st.z3[0], st.z4[0]].slice(0, s.u), vs = [st.σSq1, st.σSq2, st.σSq3, st.σSq4].slice(0, s.u);
      expect(view.zEst).toBeCloseTo(e.zEst ?? e.σEst * zs.reduce((a, z, i) => a + z / vs[i], 0), 12);
      expect(view.estimatePeak).toBeCloseTo(e.peak, 3);
      expect(lines(annotation(graphics, 'curves').g).length).toBe(s.u + 1);
    });
  }
});
