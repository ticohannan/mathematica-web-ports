// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/graphics3d-plot3d.test.js — Plot3D, Hue and colorRGB of shared/graphics3d.js (v0.1.41). Expected values
// are derived by hand (planes and linear functions, whose samples, normals and cuts are known exactly) or from
// Mathematica's documented semantics (Hue is periodic in h; Plot3D's defaults).
import { describe, it, expect } from 'vitest';
import { Plot3D, Hue, hueRGB, colorRGB, flatten, Rotate, niceTicks, primitiveBounds, Opacity, Red } from '../../shared/graphics3d.js';
import { Hue as Hue2D } from '../../shared/graphics.js';

const surfaceOf = (g) => g.content[0];
/** area of the triangles projected on the xy plane */
const xyArea = (s) => s.triangles.reduce((sum, [i, j, k]) => {
  const [a, b, c] = [s.points[i], s.points[j], s.points[k]];
  return sum + Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
}, 0);

describe('Hue (3D)', () => {
  it('Hue is periodic in h with period 1: red at 0, 1 and -1; the primaries at thirds; negative values wrap', () => {
    expect(hueRGB(0)).toEqual([1, 0, 0]);
    expect(hueRGB(1)).toEqual([1, 0, 0]);
    expect(hueRGB(-1)).toEqual([1, 0, 0]);
    hueRGB(2 / 3).forEach((v, k) => expect(v).toBeCloseTo([0, 0, 1][k], 14)); // 2/3 is not exact in binary
    expect(hueRGB(0.5)).toEqual([0, 1, 1]);
    expect(hueRGB(1.5)).toEqual([0, 1, 1]);
    expect(hueRGB(-0.5)).toEqual([0, 1, 1]); // Hue[-1/2] = Hue[1/2]
    expect(hueRGB(-0.25)).toEqual([0.5, 0, 1]); // Hue[-1/4] = Hue[3/4]
    expect(hueRGB(0.75)).toEqual([0.5, 0, 1]);
    const g = hueRGB(1 / 3);
    expect(g[0]).toBeCloseTo(0, 12); expect(g[1]).toBe(1); expect(g[2]).toBe(0);
    expect(hueRGB(0.5, 0.5, 0.8)).toEqual([0.4, 0.8, 0.8]); // HSB: p = b (1 - s)
  });
  it('Hue of something that is not a finite number is not a colour (null)', () => {
    for (const h of [NaN, Infinity, -Infinity, undefined]) { expect(hueRGB(h)).toBeNull(); expect(Hue(h)).toBeNull(); }
    expect(Hue(0)).toEqual({ directive: 'color', value: [1, 0, 0] });
  });
  it('colorRGB reads RGB lists, 3D colour directives and shared/graphics.js colours; anything else is null', () => {
    expect(colorRGB([0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.3]);
    expect(colorRGB(Red)).toEqual([1, 0, 0]);
    expect(colorRGB(Hue2D(0.5))).toEqual([0, 1, 1]);
    for (const c of [null, undefined, NaN, [NaN, 0, 0], 'Red', Opacity(0.5)]) expect(colorRGB(c)).toBeNull();
  });
});

describe('Plot3D', () => {
  it('a plane on a 3 × 3 grid: nine points, eight triangles, the plane\'s normal, the automatic z range and the defaults', () => {
    const g = Plot3D((x, y) => x + y, [0, 1], [0, 1], { PlotPoints: 3, Mesh: 'None' });
    const s = surfaceOf(g);
    expect(s.prim).toBe('plotSurface');
    expect(s.points).toHaveLength(9);
    expect(s.triangles).toHaveLength(8);
    for (const n of s.normals) { expect(n[0]).toBeCloseTo(-1 / Math.sqrt(3), 14); expect(n[1]).toBeCloseTo(-1 / Math.sqrt(3), 14); expect(n[2]).toBeCloseTo(1 / Math.sqrt(3), 14); }
    expect(xyArea(s)).toBeCloseTo(1, 14);
    expect(g.options).toEqual({ PlotRange: [[0, 1], [0, 1], [0, 2]], Axes: true, Boxed: true, BoxRatios: [1, 1, 0.4] });
    expect(s.colors).toBeNull();
    expect(s.meshLines).toEqual([]);
  });
  it('BoxRatios -> Automatic leaves the option out; other options pass through; a constant function gets {z - 1, z + 1}', () => {
    const g = Plot3D(() => 2, [0, 1], [0, 3], { PlotPoints: 2, BoxRatios: 'Automatic', ImageSize: [390, 350], Mesh: 0 });
    expect(g.options).toEqual({ PlotRange: [[0, 1], [0, 3], [1, 3]], Axes: true, Boxed: true, ImageSize: [390, 350] });
  });
  it('ClippingStyle -> None: the surface is cut exactly at the plot range, nothing drawn outside', () => {
    // f = x on the unit square, z range {0, 1/2}: the part x <= 1/2 stays, with its edge on the plane z = 1/2
    const s = surfaceOf(Plot3D((x) => x, [0, 1], [0, 1], { PlotPoints: 2, PlotRange: [0, 0.5], Mesh: 'None' }));
    for (const p of s.points) { expect(p[2]).toBeLessThanOrEqual(0.5); expect(p[2]).toBeGreaterThanOrEqual(0); expect(p[0]).toBeCloseTo(p[2], 15); }
    expect(s.points.filter((p) => p[2] === 0.5).length).toBeGreaterThanOrEqual(2);
    expect(xyArea(s)).toBeCloseTo(0.5, 14);
  });
  it('a plot range pair given high-first is used sorted; PlotRange for x and y clips too', () => {
    const g = Plot3D((x) => x, [0, 1], [0, 1], { PlotPoints: 5, PlotRange: [[0, 0.5], [0.25, 1], [1, -1]], Mesh: 'None' });
    expect(g.options.PlotRange).toEqual([[0, 0.5], [0.25, 1], [-1, 1]]);
    const s = surfaceOf(g);
    for (const p of s.points) { expect(p[0]).toBeLessThanOrEqual(0.5); expect(p[1]).toBeGreaterThanOrEqual(0.25); }
    expect(xyArea(s)).toBeCloseTo(0.5 * 0.75, 14);
  });
  it('ColorFunction gets the coordinates scaled to 0…1 over the plot range, or the coordinates themselves with ColorFunctionScaling -> False', () => {
    const f = (x, y) => 2 * x;
    const scaled = surfaceOf(Plot3D(f, [0, 1], [0, 4], { PlotPoints: 2, PlotRange: [0, 2], Mesh: 'None', ColorFunction: (x, y, z) => [x, y, z] }));
    const raw = surfaceOf(Plot3D(f, [0, 1], [0, 4], { PlotPoints: 2, PlotRange: [0, 2], Mesh: 'None', ColorFunction: (x, y, z) => [x, y, z], ColorFunctionScaling: false }));
    scaled.points.forEach((p, k) => expect(scaled.colors[k]).toEqual([p[0], p[1] / 4, p[2] / 2]));
    raw.points.forEach((p, k) => expect(raw.colors[k]).toEqual(p));
  });
  it('a ColorFunction result that is not a colour leaves the vertex without a colour (null); Lighting becomes Neutral with a ColorFunction', () => {
    const g = Plot3D(() => 0, [0, 1], [0, 1], { PlotPoints: 2, ColorFunction: (x, y, z) => Hue(z / 0), ColorFunctionScaling: false });
    expect(surfaceOf(g).colors).toEqual([null, null, null, null]);
    expect(g.options.Lighting).toBe('Neutral');
    expect(Plot3D(() => 0, [0, 1], [0, 1], { PlotPoints: 2 }).options.Lighting).toBeUndefined();
    expect(Plot3D(() => 0, [0, 1], [0, 1], { PlotPoints: 2, ColorFunction: () => Red, Lighting: 'Automatic' }).options.Lighting).toBe('Automatic');
  });
  it('Mesh -> Automatic: 15 lines each way at x0 + k (x1 - x0)/16, on the surface', () => {
    const f = (x, y) => x * y;
    const s = surfaceOf(Plot3D(f, [0, 2], [0, 1], { PlotPoints: 33 }));
    expect(s.meshLines).toHaveLength(30);
    const xs = s.meshLines.slice(0, 15).map((l) => l[0][0]), ys = s.meshLines.slice(15).map((l) => l[0][1]);
    xs.forEach((x, k) => expect(x).toBeCloseTo((2 * (k + 1)) / 16, 15));
    ys.forEach((y, k) => expect(y).toBeCloseTo((k + 1) / 16, 15));
    for (const l of s.meshLines) for (const [x, y, z] of l) expect(z).toBeCloseTo(f(x, y), 14);
    expect(surfaceOf(Plot3D(f, [0, 2], [0, 1], { PlotPoints: 9, Mesh: [2, [0.5]] })).meshLines.map((l) => l[0])).toEqual([[2 / 3, 0, 0], [4 / 3, 0, 0], [0, 0.5, 0]]);
  });
  it('mesh lines are cut at the plot range like the surface', () => {
    const s = surfaceOf(Plot3D((x) => x, [0, 1], [0, 1], { PlotPoints: 17, PlotRange: [0, 0.5], Mesh: 3 }));
    // the three lines x = 1/4, 1/2 (on the top face) and the part x <= 1/2 of the three lines y = const
    expect(s.meshLines.map((l) => [l[0][0], l.at(-1)[0]])).toEqual([[0.25, 0.25], [0.5, 0.5], [0, 0.5], [0, 0.5], [0, 0.5]]);
    expect(Plot3D((x) => x, [0, 1], [0, 1], { PlotPoints: 5, Mesh: 2, PlotRange: [0, 0.5] }).content[0].meshLines.every((l) => l.every((p) => p[2] <= 0.5))).toBe(true);
  });
  it('a sample that is not a finite number leaves a hole', () => {
    const s = surfaceOf(Plot3D((x) => Math.sqrt(x - 0.5), [0, 1], [0, 1], { PlotPoints: 5, Mesh: 'None' }));
    for (const p of s.points) expect(p[0]).toBeGreaterThanOrEqual(0.5);
    expect(xyArea(s)).toBeCloseTo(0.5, 14);
  });
  it('ClippingStyle other than None is not implemented', () => {
    expect(() => Plot3D((x) => x, [0, 1], [0, 1], { ClippingStyle: 'Automatic' })).toThrow(/ClippingStyle/);
  });
  it('flatten: the PlotStyle colour, the mesh style, normals turned with the primitive, bounds', () => {
    const g = Plot3D((x) => x, [0, 1], [0, 1], { PlotPoints: 2, Mesh: 1, PlotStyle: Red, MeshStyle: Opacity(0.3) });
    const [p] = flatten(g);
    expect(p).toMatchObject({ type: 'plotSurface', color: [1, 0, 0], meshStyle: { color: [0, 0, 0], opacity: 0.3 } });
    const [q] = flatten(Rotate(g.content, Math.PI / 2, [0, 0, 1]));
    // the normal (-1, 0, 1)/√2 turned by 90° about z is (0, -1, 1)/√2
    expect(q.normals[0][0]).toBeCloseTo(0, 14); expect(q.normals[0][1]).toBeCloseTo(-1 / Math.sqrt(2), 14); expect(q.normals[0][2]).toBeCloseTo(1 / Math.sqrt(2), 14);
    expect(primitiveBounds([p])).toEqual([[0, 1], [0, 1], [0, 1]]);
  });
  it('niceTicks of a range of zero width gives its one value; reversed gives none; ordinary ranges as before', () => {
    expect(niceTicks([0, 0])).toEqual([[0, '0', 0.035]]);
    expect(niceTicks([1, -1])).toEqual([]);
    expect(niceTicks([0, 4]).filter((t) => t[1] !== '').map((t) => t[1])).toEqual(['0', '2', '4']);
  });
});
