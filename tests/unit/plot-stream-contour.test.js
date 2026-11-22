// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/plot-stream-contour.test.js — shared/plot.js StreamPlot and ContourPlot of an equation (v0.1.41), against
// fields and curves known in closed form.
import { describe, it, expect } from 'vitest';
import { StreamPlot, ContourPlot, Equation, streamlines, implicitCurves, StreamGradient, STREAM_GRADIENT } from '../../shared/plot.js';
import { annotation, Black, RGBColor, Thickness } from '../../shared/graphics.js';

const linesOf = (g, id) => annotation(g.list, id).g.flatMap((part) => part.filter((d) => d.head === 'Line' || d.type === 'Line' || d.pts)).flatMap((l) => (Array.isArray(l.pts[0][0]) ? l.pts : [l.pts]));

describe('StreamPlot', () => {
  it('streamlines of a rotation are circles about the centre, traced in the field direction', () => {
    const lines = streamlines((u, v) => [-(v - 0.5), u - 0.5], { dsep: 0.08 });
    expect(lines.length).toBeGreaterThan(3);
    for (const line of lines) {
      const r = line.map(([u, v]) => Math.hypot(u - 0.5, v - 0.5));
      expect(Math.max(...r) - Math.min(...r)).toBeLessThan(1e-3);
      // counter-clockwise: the cross product of radius and step is positive
      const [a, b] = line;
      expect((a[0] - 0.5) * (b[1] - a[1]) - (a[1] - 0.5) * (b[0] - a[0])).toBeGreaterThan(0);
    }
  });
  it('lines keep at least half the separation from each other', () => {
    const dsep = 0.06, lines = streamlines((u, v) => [1, 0.3 * Math.sin(6 * u)], { dsep });
    for (let i = 0; i < lines.length; i++) for (let j = 0; j < i; j++) {
      for (const p of lines[i].filter((_, k) => k % 5 === 0)) {
        const d = Math.min(...lines[j].map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])));
        expect(d).toBeGreaterThan(dsep / 2 - dsep / 6); // the test distance less one step
      }
    }
  });
  it('a plot of a uniform field: frame, plot range, lines and arrowheads pointing along the field', () => {
    const g = StreamPlot(() => [1, 0], [0, 2], [0, 1], { StreamPoints: 9 });
    expect(g.options.Frame).toBe(true);
    expect(g.options.PlotRange).toEqual([[0, 2], [0, 1]]);
    expect(g.options.PlotRangePadding).toEqual([0.055, 0.055]);
    const lines = linesOf(g, 'stream-lines');
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) for (const p of l) expect(p[1]).toBeCloseTo(l[0][1], 9); // horizontal
    const heads = annotation(g.list, 'stream-arrows').g.flatMap((part) => part.filter((d) => d.pts)).flatMap((p) => p.pts);
    expect(heads.length).toBeGreaterThan(0);
    for (const [tip, b1, b2] of heads) { expect(tip[0]).toBeGreaterThan(b1[0]); expect(tip[0]).toBeGreaterThan(b2[0]); }
  });
  it('StreamPoints -> n: fewer lines for a smaller n; Automatic: short lines', () => {
    const f = (x, y) => [x - 0.5, -(y - 0.5)];
    const few = streamlines(f, { dsep: 0.3 / Math.sqrt(9) }), many = streamlines(f, { dsep: 0.3 / Math.sqrt(64) });
    expect(few.length).toBeLessThan(many.length);
    const short = streamlines((u, v) => [1, 0], { dsep: 0.042, maxLen: 0.22 });
    for (const l of short) expect(Math.hypot(l.at(-1)[0] - l[0][0], l.at(-1)[1] - l[0][1])).toBeLessThan(0.22 + 0.01);
  });
  it('colours by speed through the stream gradient; StreamColorFunction -> None: black', () => {
    expect(StreamGradient(0).rgb).toEqual([...STREAM_GRADIENT[0][1]]);
    expect(StreamGradient(1).rgb).toEqual([...STREAM_GRADIENT.at(-1)[1]]);
    expect(StreamGradient(2).rgb).toEqual(StreamGradient(1).rgb);
    const g = StreamPlot(() => [0, 1], [0, 1], [0, 1], { StreamPoints: 9, StreamColorFunction: 'None' });
    expect(annotation(g.list, 'stream-lines').g.every((part) => part[0] === Black)).toBe(true);
  });
});

describe('ContourPlot of an equation', () => {
  it('x² + y² == 1/4 is the circle of radius 1/2', () => {
    const curves = implicitCurves((x, y) => x * x + y * y - 0.25, [-1, 1], [-1, 1]);
    expect(curves).toHaveLength(1);
    for (const [x, y] of curves[0]) expect(Math.abs(Math.hypot(x, y) - 0.5)).toBeLessThan(1e-3);
    const c = curves[0];
    expect(Math.hypot(c[0][0] - c.at(-1)[0], c[0][1] - c.at(-1)[1])).toBeLessThan(1e-9); // closed
  });
  it('a list on the left side gives one curve set per entry; ContourStyle cycles over them', () => {
    const brown = RGBColor(0.63, 0.24, 0.18);
    const g = ContourPlot(Equation((x, y) => [x - 0.3, y - 0.6], 0), [0, 1], [0, 1], { ContourStyle: [Thickness(0.006), brown] });
    const c1 = annotation(g.list, 'contour-1').g, c2 = annotation(g.list, 'contour-2').g;
    for (const [x] of c1.at(-1).pts) expect(x).toBeCloseTo(0.3, 3);
    for (const [, y] of c2.at(-1).pts) expect(y).toBeCloseTo(0.6, 3);
    expect(c1).toContain(c1.find((d) => d.dir === 'thickness' && d.value === 0.006));
    expect(c2).toContain(brown);
    expect(g.options.PlotRange).toEqual([[0, 1], [0, 1]]);
  });
  it('a zero along the edge of the domain draws no line there', () => {
    const curves = implicitCurves((x, y) => x * (1 - x - y), [0, 1], [0, 1]);
    for (const c of curves) for (const [x, y] of c) expect(Math.abs(1 - x - y)).toBeLessThan(1e-3);
  });
  it('only the equation form is supported', () => {
    expect(() => ContourPlot((x, y) => x * y, [0, 1], [0, 1])).toThrow(/equation/);
  });
});
