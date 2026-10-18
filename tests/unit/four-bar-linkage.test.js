// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/four-bar-linkage.test.js — the model of the four-bar port (demos/four-bar-linkage/fourbar.js).
// Expected values: by hand from the source lines, from the design's independent reference scripts (ref/fb_bounds.py:
// exact domain boundaries with mpmath; ref/fb_model.py: the source formulas in Python), or from independent geometry
// in this file (law of cosines) — never from the port. The interval-slider tests T-FB-21 … T-FB-23 are in
// tests/unit/ui-interval.test.js.
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import * as F from '../../demos/four-bar-linkage/fourbar.js';
import { bsplinePoint } from '../../demos/common/arrow-arcs.js';
import { mmaGrid } from '../../shared/ui.js';
import { mulberry32 } from '../../shared/random.js';

F.useRecordedSamples(JSON.parse(fs.readFileSync('demos/four-bar-linkage/recorded-samples.json', 'utf8')));
const { Phipos, Phineg, lenlengthsOf, mod2pi } = F;
const L0 = lenlengthsOf([1.35, 2], 0.75);
const PI = Math.PI;
const curves = (s) => [s.records.slice(0, s.curve1).map((r) => r[0]), s.records.slice(s.curve1).map((r) => r[1])];
const thetas = (pts) => pts.map((p) => p[0]).sort((a, b) => a - b);
const gaps = (ts) => ts.slice(1).map((t, i) => t - ts[i]);

describe('four-bar-linkage model', () => {
  it('lenlengths: L1 = links1, L2 = links2 - links1, L3 = 2.5 - links2, L4 = spacing', () => {
    expect(lenlengthsOf([1.35, 2], 0.75)).toEqual([1.35, 0.6499999999999999, 0.5, 0.75]);
    expect(lenlengthsOf([1.0, 2.0], 0.5)).toEqual([1.0, 1.0, 0.5, 0.5]);
  });
  it('Phipos and Phineg close the loop: the coupler length is L2 for every returned angle', () => {
    const rand = mulberry32(4);
    let checked = 0;
    for (let k = 0; k < 2000; k++) {
      const a = rand() * 2.39, b = a + 0.1 + rand() * (2.49 - a - 0.1);
      const l = lenlengthsOf([a, b], rand() * 1.5);
      const t = -PI + rand() * 2 * PI;
      for (const p of [Phipos(t, l), Phineg(t, l)]) {
        if (p === null) continue;
        const d = Math.hypot(l[3] + l[2] * Math.cos(p) - l[0] * Math.cos(t), l[2] * Math.sin(p) - l[0] * Math.sin(t));
        expect(Math.abs(d - l[1])).toBeLessThan(1e-9);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(500);
  });
  it('Phipos and Phineg are Null exactly where gamma^2 >= alpha^2 + beta^2', () => {
    expect(Phipos(1.0184, L0)).toBe(1.598377079513071);
    expect(Phineg(1.0184, L0)).toBe(1.6156096530728743);
    expect([Phipos(1.0185, L0), Phineg(1.0185, L0)]).toEqual([null, null]);
    expect(Phipos(0, L0)).toBe(-1.2529726228670157);
    expect(Phineg(0, L0)).toBe(1.2529726228670157);
    const l2 = lenlengthsOf([1, 2], 0.5);
    for (const t of [0, PI, -PI]) expect([Phipos(t, l2), Phineg(t, l2)]).toEqual([null, null]);
  });
  it('a result within tolerance of -pi becomes exactly pi', () => {
    const l2 = lenlengthsOf([1, 2], 0.5);
    for (const t of [-2, -1, -0.1]) expect(Phipos(t, l2)).toBe(3.141592653589793);
    for (const t of [0.1, 1, 2]) expect(Phineg(t, l2)).toBe(3.141592653589793);
  });
  it('mod2pi maps into (-pi, pi]: -pi stays -pi, 3pi/2 becomes -pi/2', () => {
    expect(mod2pi(-PI)).toBe(-3.141592653589793);
    expect(mod2pi(1.5 * PI)).toBe(-1.5707963267948968);
    expect(mod2pi(PI)).toBe(3.141592653589793);
    expect([-0.9, -1].map(mod2pi)).toEqual([-0.9, -1.0]);
  });
  it('impossibleLinks: the four conditions as written, the third never true while L1 + L2 > 0', () => {
    expect(F.impossibleLinksOf([0.05, 0.1, 2.35, 0.75])).toBe(false);
    expect(F.impossibleLinksOf([2.3, 0.15, 0.05, 0.1])).toBe(true);
    expect(F.impossibleLinksOf([0, 0, 1, 1])).toBe(true);
  });
  const CASES = [[[1.25, 2.0], 0], [[0.5, 2.0], 0.5], [[2.0, 2.25], 1.5], [[2.3000000000000003, 2.45], 0.1]];
  it('Piecewise pnear: {0, 0}, {pi, 0} and {pi/2, pi/2} for the three reachable cases', () => {
    const got = CASES.map(([links, sp]) => {
      const l = lenlengthsOf(links, sp);
      expect(F.impossibleLinksOf(l)).toBe(true);
      return F.piecewisePnear(l);
    });
    expect(got).toEqual([[0, 0], [PI, 0], [0, 0], [PI / 2, PI / 2]]);
  });
  it('invalid lengths give Alpha 0 and the invalid-lengths text, one configuration gives the other text', () => {
    const ev = ([links, spacing]) => F.evaluate({ ...F.initialSettings(), links, spacing });
    const [a, b, c, d] = CASES.map(ev);
    expect(a.view.Alpha).toBe(PI);
    expect(a.state.plot.text).toBe('only one configuration possible');
    expect(Math.abs(b.view.Alpha)).toBeLessThan(1e-16);
    expect(b.state.plot.text).toBe('only one configuration possible');
    expect(c.state.plot.text).toBe('only one configuration possible');
    expect(d.view.Alpha).toBe(0);
    expect(d.state.plot.text).toBe('invalid link lengths,\nno configuration possible');
    expect(d.state.pnear).toEqual([PI / 2, PI / 2]);
    expect(d.state.plot.lines).toEqual([[], []]);
  });

  // ---- the sampler (D-FB-01) ----
  it('the sampler records both functions at every evaluated theta, curve 1 first, real results only', () => {
    const s = F.plotSamples(L0);
    expect(s.curve1).toBeGreaterThan(0);
    expect(s.records.length).toBeGreaterThan(s.curve1);
    for (const [[t1, a], [t2, b]] of s.records) {
      expect(t1).toBe(t2);
      expect(a).toBe(Phipos(t1, L0));
      expect(b).toBe(Phineg(t1, L0));
      expect(a).not.toBe(null);
      expect(b).not.toBe(null);
    }
    // the first records are Plot's grid points inside the domain, in grid order (as records 1–7 of the saved state)
    expect(s.records.slice(0, 7).map((r) => r[0][0])).toEqual(F.plotGrid().slice(9, 16));
  });
  it('the sampler finds the domain edges within 2e-3 inside the true boundary', () => {
    for (const [links, sp, edge] of [[[1.35, 2], 0.75, 1.0184438111156382], [[1.55, 2.1], 1.35, 0.6535887566362116],
      [[1.2000000000000002, 1.7000000000000002], 0.9, 1.3085411679190395]]) {
      const ts = thetas(F.plotSamples(lenlengthsOf(links, sp)).records.map((r) => r[0]));
      expect(-ts[0]).toBeLessThan(edge);
      expect(ts[ts.length - 1]).toBeLessThan(edge);
      expect(edge + ts[0]).toBeLessThan(2e-3);
      expect(edge - ts[ts.length - 1]).toBeLessThan(2e-3);
    }
  });
  it('the sampler gives 40 to 60 evaluations per curve and a largest gap of at most 0.27 at the defaults', () => {
    for (const c of curves(F.plotSamples(L0))) {
      expect(c.length).toBeGreaterThanOrEqual(40);
      expect(c.length).toBeLessThanOrEqual(60);
      const g = gaps(thetas(c));
      expect(Math.max(...g)).toBeLessThanOrEqual(0.27);
      expect(Math.min(...g.slice(1, -1))).toBeGreaterThanOrEqual(0.03); // interior gaps (not next to an edge sample)
    }
  });
  it('the sampler splits the curves at gaps: two loops for links {0.55, 0.7} and separation 1.45', () => {
    const s = F.plotSamples(lenlengthsOf([0.55, 0.7000000000000001], 1.4500000000000002));
    const [a, b] = [1.7711945100429548, 2.6386657002986896];
    for (const [[t]] of s.records) expect((t > -b && t < -a) || (t > a && t < b)).toBe(true);
    expect(F.plotLines(s).map((c) => c.length)).toEqual([2, 2]);
  });
  it('Grashof crank: samples cover the whole range -pi to pi', () => {
    const s = F.plotSamples(lenlengthsOf([0.4, 1.5], 0.9));
    expect(s.nulls).toEqual([[], []]);
    for (const c of curves(s)) {
      const ts = thetas(c);
      expect(ts[0] + PI).toBeLessThan(0.02);
      expect(PI - ts[ts.length - 1]).toBeLessThan(0.02);
    }
    expect(F.plotLines(s).map((c) => c.length)).toEqual([1, 1]);
  });
  it('no configuration at all: no records, plot and pvals keep their previous values', () => {
    const st0 = F.evaluate(F.initialSettings()).state;
    expect(F.plotSamples(lenlengthsOf([0.05, 0.15000000000000002], 0.75)).records.length).toBe(0);
    const { state, view } = F.evaluate({ ...st0, links: [0.05, 0.15000000000000002] });
    expect(view.impossibleLinks).toBe(false); // Q-FB-01: the too-long L3 is not detected
    expect(view.resampled.count).toBe(0);
    expect(state.plot).toBe(st0.plot);
    expect(state.pvals).toBe(st0.pvals);
    expect(state.pnear).toEqual([-0.8877458382200738, -0.9960977669686768]);
    expect(state.spacingOld).toBe(0.75);
    expect(state.linksOld).toEqual([0.05, 0.15000000000000002]);
  });
  it('the cache: changing only p does not resample, changing spacing or links does', () => {
    const spy = vi.fn(F.plotSamples);
    const st0 = F.evaluate(F.initialSettings(), { sampler: spy }).state;
    expect(spy).toHaveBeenCalledTimes(0);
    const a = F.evaluate({ ...st0, p: [0.5, 1.0] }, { sampler: spy }).state;
    expect(spy).toHaveBeenCalledTimes(0);
    F.evaluate({ ...a, spacing: 0.8 }, { sampler: spy });
    expect(spy).toHaveBeenCalledTimes(1);
    F.evaluate({ ...a, links: [1.3, 2] }, { sampler: spy });
    expect(spy).toHaveBeenCalledTimes(2);
  });
  it('Nearest: Euclidean, no wrap-around, first of equally near in record order', () => {
    expect(F.nearestSample([[[0, 3.1], [0.4, -2.9]]], [0, -3.14])).toEqual([0.4, -2.9]);
    expect(F.nearestSample([[[1, 0], [-1, 0]]], [0, 0])).toEqual([1, 0]);
  });
  it('Alpha points the coupler from the crank tip to the rocker tip (default 1.3066234498934552)', () => {
    const { view } = F.evaluate(F.initialSettings());
    expect(Math.abs(view.Alpha - 1.3066234498934552)).toBeLessThanOrEqual(1e-15);
    const g = view.linkage;
    expect(Math.abs(g.crankTip[0] - 0.8520687964251353)).toBeLessThan(1e-15);
    expect(Math.abs(g.crankTip[1] - -1.0471288202311222)).toBeLessThan(1e-15);
    expect(Math.abs(g.rockerTip[0] - 1.0217908998529512)).toBeLessThan(1e-15);
    expect(Math.abs(g.rockerTip[1] - -0.41967809897244224)).toBeLessThan(1e-15);
    expect(Math.abs(Math.hypot(g.rockerTip[0] - g.crankTip[0], g.rockerTip[1] - g.crankTip[1]) - 0.6499999999999999)).toBeLessThan(1e-15);
    expect(Math.abs(g.couplerEnd[0] - g.rockerTip[0])).toBeLessThan(1e-15);
    expect(Math.abs(g.couplerEnd[1] - g.rockerTip[1])).toBeLessThan(1e-15);
  });
  it('myArrowArc: 12 control points from 0 to the angle, a Point when the angle is 0', () => {
    const ang = -0.8877458382200738;
    const a = F.myArrowArc([0, 0], 0.45, [0, ang]);
    expect(a.kind).toBe('Arrow');
    expect(a.control.length).toBe(12);
    const h = ang * (1 / 11);
    a.control.forEach((p, k) => { expect(p[0]).toBe(0 + 0.45 * Math.cos(k * h)); expect(p[1]).toBe(0 + 0.45 * Math.sin(k * h)); });
    expect(Math.abs(11 * h - ang)).toBeLessThan(1e-15);
    const z = F.myArrowArc([0, 0], 0.45, [0, 0]);
    expect(z).toEqual({ kind: 'Point', at: [0.45, 0] });
  });
  it('B-spline evaluation: clamped cubic from the first to the last control point', () => {
    const P = [[0, 0], [1, 1], [2, 0], [3, 1]];
    expect(bsplinePoint(P, 0)).toEqual([0, 0]);
    expect(bsplinePoint(P, 1)).toEqual([3, 1]);
    const m = bsplinePoint(P, 0.5);
    expect(Math.abs(m[0] - 1.5)).toBeLessThan(1e-15);
    expect(Math.abs(m[1] - 0.5)).toBeLessThan(1e-15);
  });
  it('Times multiplies in ascending order: 2 l1 l4 Cos(theta) at theta -0.7935945728098851 is 1.4201068987776944', () => {
    const c = Math.cos(-0.7935945728098851);
    expect(F.timesAscending(2, 1.35, 0.75, c)).toBe(1.4201068987776944);
    expect(((2 * 1.35) * 0.75) * c).toBe(1.4201068987776946); // the written order
  });
  it('slider values are min + k step: separation 0.15 is 0.15000000000000002', () => {
    const g = mmaGrid(0, 1.5, 0.05);
    expect(g.valueAt(3)).toBe(0.15000000000000002);
    expect(g.valueAt(18)).toBe(0.9);
    expect(g.valueAt(27)).toBe(1.35);
    expect(g.valueAt(10)).toBe(0.5);
    expect(g.valueAt(15)).toBe(0.75);
  });
});
