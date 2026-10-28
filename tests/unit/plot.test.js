// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/plot.test.js — shared/plot.js: sampling, gaps, plot ranges and their padding, styles, fillings, legends,
// ListPlot, ParametricPlot and Show (hand-derived values).
import { describe, it, expect } from 'vitest';
import { Plot, ListPlot, ListLinePlot, ParametricPlot, Show, Placed, ColorData, COLOR_DATA_97, sample, segments } from '../../shared/plot.js';
import { Cases, Dashed, Purple, Red, Point, Thick } from '../../shared/graphics.js';

describe('plot.js sampling', () => {
  it('samples on PlotPoints equally spaced points and refines where the curve bends; both ends exact', () => {
    const lin = sample((x) => 2 * x + 1, [0, 1]);
    expect(lin.xs.length).toBe(50); // a straight line is never refined
    expect(lin.xs[0]).toBe(0); expect(lin.xs.at(-1)).toBe(1);
    const sq = sample((x) => Math.sin(10 * x), [0, 3]);
    expect(sq.xs.length).toBeGreaterThan(50);
    for (let i = 1; i < sq.xs.length; i++) expect(sq.xs[i]).toBeGreaterThan(sq.xs[i - 1]);
  });
  it('a non-number leaves a gap, and the edge of the gap is refined', () => {
    const s = sample((x) => (x < 0 ? NaN : Math.sqrt(x)), [-1, 1]);
    const runs = segments(s.xs, s.ys[0]);
    expect(runs.length).toBe(1);
    expect(runs[0][0][0]).toBeGreaterThanOrEqual(0);
    expect(runs[0][0][0]).toBeLessThan(0.002); // refined towards 0 (6 halvings of 2/49)
  });
});

describe('Plot', () => {
  it('automatic range: x the domain, y the sampled values, padded by Scaled[0.02] and Scaled[0.05]; axes at 0', () => {
    const g = Plot((x) => x * x, [-1, 2]);
    expect(g.options.PlotRange[0]).toEqual([-1, 2]);
    expect(g.options.PlotRange[1][0]).toBeCloseTo(0, 6);
    expect(g.options.PlotRange[1][1]).toBe(4);
    expect(g.options.PlotRangePadding).toEqual([0.02, 0.05]); // y: Scaled[0.05]
    expect(g.options.AspectRatio).toBeCloseTo(0.618034, 6);
    expect(g.options.AxesOrigin).toEqual([0, 0]);
    expect(g.options.Axes).toBe(true);
  });
  it('explicit ranges have no padding; {ymin, ymax} sets y only; the axes origin is clamped into the range', () => {
    const a = Plot((x) => x, [0, 1], { PlotRange: [[0, 1], [-1, 1]] });
    expect(a.options.PlotRangePadding).toEqual([0, 0]);
    const b = Plot((x) => 200 + x, [-10, 10], { PlotRange: ['All', [0, 1]] });
    expect(b.options.PlotRange).toEqual([[-10, 10], [0, 1]]);
    expect(b.options.PlotRangePadding).toEqual([0.02, 0]);
    const c = Plot((x) => 200 + x * x, [1, 10]);
    expect(c.options.AxesOrigin).toEqual([1, 201]);
  });
  it('several curves get ColorData[97] colours and AbsoluteThickness[1.6]; PlotStyle per curve or for all', () => {
    const g = Plot((x) => [x, 2 * x], [0, 1], { PlotStyle: [[Red], [Dashed, Purple]] });
    const lines = Cases(g, 'Line');
    expect(lines.length).toBe(2);
    const colours = [];
    Cases(g, (q, st) => { if (q.head === 'Line') colours.push([...st.color]); return false; });
    expect(colours).toEqual([[1, 0, 0], [0.5, 0, 0.5]]);
    const cyc = []; Cases(Plot((x) => [x, 2 * x, 3 * x], [0, 1], { PlotStyle: [Red, Purple] }), (q, st) => { if (q.head === 'Line') cyc.push([...st.color]); return false; });
    expect(cyc).toEqual([[1, 0, 0], [0.5, 0, 0.5], [1, 0, 0]]); // a list of styles is used cyclically
    const h = Plot((x) => [x, 2 * x], [0, 1], { PlotStyle: Thick });
    const th = []; Cases(h, (q, st) => { if (q.head === 'Line') th.push(st.thickness); return false; });
    expect(th).toEqual([{ abs: 2 }, { abs: 2 }]);
    const d = []; Cases(Plot((x) => [x, -x], [0, 1]), (q, st) => { if (q.head === 'Line') d.push([...st.color]); return false; });
    expect(d).toEqual([COLOR_DATA_97[0], COLOR_DATA_97[1]]);
  });
  it('Filling -> 0 closes each curve down to y = 0; Filling -> {1 -> {2}} fills between two curves', () => {
    const g = Plot((x) => 1 + x, [0, 1], { Filling: 0 });
    const poly = Cases(g, 'Polygon')[0].pts;
    expect(poly[0]).toEqual([0, 0]);
    expect(poly.at(-1)).toEqual([1, 0]);
    const b = Plot((x) => [2, 1], [0, 1], { Filling: { 1: [2] } });
    const p2 = Cases(b, 'Polygon')[0].pts;
    expect(p2.filter(([, y]) => y === 2).length).toBe(p2.length / 2);
    expect(p2.filter(([, y]) => y === 1).length).toBe(p2.length / 2);
  });
  it('a gap splits the curve into several lines', () => {
    const g = Plot((x) => (Math.abs(x) < 0.5 ? NaN : x), [-1, 1]);
    expect(Cases(g, 'Line')[0].pts.length).toBe(2); // Line[{run1, run2}]
  });
  it('PlotLegends: one entry per label with the curve style; Placed puts it inside', () => {
    const g = Plot((x) => [x, x * x], [0, 1], { PlotLegends: ['a', 'b'], PlotStyle: [null, [Dashed]] });
    expect(g.options.PlotLegends.position).toBe('right');
    expect(g.options.PlotLegends.items.map((i) => i.label)).toEqual(['a', 'b']);
    expect(g.options.PlotLegends.items[1].dash).toEqual([3, 3]);
    expect(Plot((x) => x, [0, 1], { PlotLegends: Placed(['a'], [0.6, 0.8]) }).options.PlotLegends.position).toEqual([0.6, 0.8]);
  });
  it('Epilog and Prolog go after and before the curves; a Frame turns the axes off unless asked', () => {
    const g = Plot((x) => x, [0, 1], { Epilog: [Point([0.5, 0.5])], Prolog: [Point([0, 0])], Frame: true });
    expect(g.list[0].head).toBe('Point');
    expect(g.list.at(-1).head).toBe('Point');
    expect(g.options.Axes).toBe(false);
    expect(g.options.UpdateFrame).toBe(true);
  });
});

describe('ListPlot, ParametricPlot, Show, ColorData', () => {
  it('ListPlot of values uses x = 1, 2, …; Filling -> 0 gives stems; Joined draws a line', () => {
    const g = ListPlot([3, 1, 2], { Filling: 0 });
    expect(Cases(g, 'Point')[0].pts).toEqual([[1, 3], [2, 1], [3, 2]]);
    expect(Cases(g, 'Line')[0].pts).toEqual([[[1, 0], [1, 3]], [[2, 0], [2, 1]], [[3, 0], [3, 2]]]);
    expect(Cases(ListLinePlot([[0, 0], [1, 1]]), 'Line')[0].pts).toEqual([[0, 0], [1, 1]]);
    expect(Cases(ListPlot([[1, 2, 3], [4, 5, 6]]), 'Point').map((p) => p.pts.length)).toEqual([3, 3]); // two data sets
  });
  it('ParametricPlot keeps the aspect of the data (AspectRatio Automatic)', () => {
    const g = ParametricPlot((t) => [Math.cos(t), Math.sin(t)], [0, 2 * Math.PI]);
    expect(g.options.AspectRatio).toBeUndefined();
    expect(g.options.PlotRange[0][0]).toBeCloseTo(-1, 3);
    expect(Cases(g, 'Line').length).toBe(1);
  });
  it('Show combines primitives and keeps the first options, its plot range included (as Mathematica)', () => {
    const a = Plot((x) => x, [0, 1]), b = ListPlot([[0.5, 3]]);
    const s = Show(a, b);
    expect(s.list.length).toBe(2);
    expect(s.options.PlotRange).toEqual(a.options.PlotRange);
    const c = Show(Plot((x) => x, [0, 1], { PlotRange: [[0, 1], [0, 1]] }), b);
    expect(c.options.PlotRange).toEqual([[0, 1], [0, 1]]);
  });
  it('ColorData[97] colours and ColorList', () => {
    expect(ColorData(97, 1).rgb).toEqual([0.368417, 0.506779, 0.709798]);
    expect(ColorData(97, 11).rgb).toEqual(ColorData(97, 1).rgb);
    expect(ColorData(97, 'ColorList').length).toBe(10);
  });
});

describe('plot v0.1.27: Automatic in a PlotStyle list', () => {
  it('PlotStyle -> {Automatic, Dashed}: the first curve keeps its default style, the second is dashed', () => {
    const g = Plot((x) => [x, 2 * x], [0, 1], { PlotStyle: ['Automatic', Dashed] });
    const lines = Cases(g.list, 'Line');
    expect(lines.length).toBeGreaterThan(1);
    expect(JSON.stringify(g.list)).not.toContain('"Automatic"');
    expect(g.options.PlotLegends).toBeUndefined();
  });
});

describe('plot v0.1.27: PlotRangePadding', () => {
  it('an explicit range has no padding unless the option gives it (a number or {px, py})', () => {
    expect(Plot((x) => x, [0, 1], { PlotRange: [[0, 1], [0, 1]] }).options.PlotRangePadding).toEqual([0, 0]);
    expect(Plot((x) => x, [0, 1], { PlotRange: [[0, 1], [0, 1]], PlotRangePadding: [0.02, 0.03] }).options.PlotRangePadding).toEqual([0.02, 0.03]);
    expect(Plot((x) => x, [0, 1], { PlotRangePadding: 0.1 }).options.PlotRangePadding).toEqual([0.1, 0.1]);
  });
});
