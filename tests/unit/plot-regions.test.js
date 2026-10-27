// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/plot-regions.test.js — the v0.1.26 additions to shared/plot.js, shared/graphics.js and
// shared/graphics-extras.js: RegionPlot, ParametricPlot regions, DensityPlot and DensityGradient, BSplineCurve (also in
// Arrow), LabelStyle and the layout of an Inset of a framed plot (hand-derived values).
import { describe, it, expect } from 'vitest';
import { RegionPlot, ParametricPlot, DensityPlot, DensityGradient, DENSITY_GRADIENT_STOPS, ColorData, COLOR_DATA_97 } from '../../shared/plot.js';
import {
  Cases, annotation, BSplineCurve, Arrow, bsplinePoints, bounds, scaleGraphics, FilledPolygons, ImageRaster, Point, Red, Blue,
  Black, Bold, Directive, Opacity, None,
} from '../../shared/graphics.js';
import { insetLayout, plotDecorations, labelDirectives } from '../../shared/graphics-extras.js';

const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
const faces = (g) => Cases(g, 'FilledPolygons');
const runs = (line) => (Array.isArray(line.pts[0][0]) ? line.pts : [line.pts]);
const styleOf = (g, head) => { let s = null; Cases(g, (q, st) => { if (!s && q.head === head) s = st; return false; }); return s; };

describe('RegionPlot', () => {
  it('a disk: Mathematica\'s defaults, one face of area πr² (within 1 %), the boundary on the circle as one closed line', () => {
    const g = RegionPlot((x, y) => x * x + y * y < 1, [-1.5, 1.5], [-1.5, 1.5]);
    expect(g.options).toMatchObject({ Frame: true, Axes: false, AxesInFrame: false, AspectRatio: 1, PlotRange: [[-1.5, 1.5], [-1.5, 1.5]], PlotRangePadding: [0.02, 0.02], UpdateFrame: true }); // Scaled[0.02] (v0.1.26)
    const [face] = faces(g);
    expect(face.pts).toHaveLength(1);
    expect(Math.abs(area(face.pts[0]) - Math.PI) / Math.PI).toBeLessThan(0.01);
    const [line] = Cases(g, 'Line');
    const [run] = runs(line);
    expect(run[0]).toEqual(run.at(-1)); // closed
    for (const [x, y] of run) expect(Math.abs(Math.hypot(x, y) - 1)).toBeLessThan(1e-3); // 10 bisections of a 0.06 cell
    // MaxRecursion 0: only the crossings on the cell edges; the default (1) halves every chord onto the circle; at most 2
    const pointsWith = (opts) => runs(Cases(RegionPlot((x, y) => x * x + y * y < 1, [-1.5, 1.5], [-1.5, 1.5], opts), 'Line')[0])[0].length - 1;
    const [n0, n2, n5] = [pointsWith({ MaxRecursion: 0 }), pointsWith({ MaxRecursion: 2 }), pointsWith({ MaxRecursion: 5 })];
    expect([2 * n0, 4 * n0, 4 * n0]).toEqual([run.length - 1, n2, n5]);
  });
  it('a hole is a loop of the opposite orientation (an annulus: area π(R² − r²)); two boundary curves', () => {
    const g = RegionPlot((x, y) => x * x + y * y < 1 && x * x + y * y > 0.25, [-1, 1], [-1, 1]);
    const loops = faces(g)[0].pts;
    expect(loops).toHaveLength(2);
    expect(loops.map(area).map(Math.sign).sort()).toEqual([-1, 1]);
    const total = loops.reduce((s, l) => s + area(l), 0);
    expect(Math.abs(total - Math.PI * 0.75) / (Math.PI * 0.75)).toBeLessThan(0.01);
    expect(runs(Cases(g, 'Line')[0])).toHaveLength(2);
  });
  it('a region cut by the plot range: the face runs along the edge, the boundary only where the predicate changes', () => {
    const g = RegionPlot((x, y) => y > x * x, [-1, 1], [0, 1]);
    const [loop] = faces(g)[0].pts;
    expect(Math.abs(area(loop) - 4 / 3) / (4 / 3)).toBeLessThan(0.01);
    const [run] = runs(Cases(g, 'Line')[0]);
    for (const [x, y] of run) expect(Math.abs(y - x * x)).toBeLessThan(1e-3);
    expect(run[0][1]).toBeCloseTo(1, 6); // from the top edge …
    expect(run.at(-1)[1]).toBeCloseTo(1, 6); // … to the top edge
  });
  it('a saddle cell is resolved by its centre: x y > 0 gives two separate quadrants', () => {
    const g = RegionPlot((x, y) => x * y > 0, [-1, 1], [-1, 1], { PlotPoints: 49 });
    const loops = faces(g)[0].pts;
    expect(loops).toHaveLength(2);
    for (const l of loops) expect(area(l)).toBeCloseTo(1, 2);
  });
  it('an empty region draws only the frame (the Epilog stays)', () => {
    const g = RegionPlot((x) => x < -3, [-1, 1], [-1, 1], { Epilog: [Point([0, 0])], FrameLabel: ['a', 'b'], ImageSize: 230 });
    expect(faces(g)).toHaveLength(0);
    expect(Cases(g, 'Line')).toHaveLength(0);
    expect(Cases(g, 'Point')).toHaveLength(1);
    expect(g.options).toMatchObject({ Frame: true, FrameLabel: ['a', 'b'], ImageSize: 230, PlotRange: [[-1, 1], [-1, 1]] });
  });
  it('face: PlotStyle colour at Opacity 0.3, no edge; boundary: opaque, 1 px, ColorData[97, 1] unless BoundaryStyle', () => {
    const disk = (opts) => RegionPlot((x, y) => x * x + y * y < 1, [-2, 2], [-2, 2], opts);
    const a = disk({ PlotStyle: Red });
    expect(styleOf(a, 'FilledPolygons')).toMatchObject({ color: [1, 0, 0], opacity: 0.3, edge: null });
    expect(styleOf(a, 'Line')).toMatchObject({ color: COLOR_DATA_97[0], thickness: { abs: 1 } });
    expect(styleOf(a, 'Line').opacity).toBeUndefined();
    expect(styleOf(disk({ PlotStyle: [Blue, Opacity(0.5)] }), 'FilledPolygons')).toMatchObject({ color: [0, 0, 1], opacity: 0.5 });
    expect(styleOf(disk({ BoundaryStyle: Red }), 'Line').color).toEqual([1, 0, 0]);
    expect(Cases(disk({ BoundaryStyle: None }), 'Line')).toHaveLength(0);
    expect(styleOf(disk(), 'FilledPolygons').color).toEqual(ColorData(97, 1).rgb);
    expect(annotation(disk(), 'region-face')).not.toBe(null);
    expect(annotation(disk(), 'region-boundary')).not.toBe(null);
  });
});

describe('ParametricPlot regions', () => {
  const polar = (opts) => ParametricPlot((u, v) => [u * Math.cos(v), u * Math.sin(v)], [0, 1], [0, 2 * Math.PI], opts);
  it('{u cos v, u sin v}: plot range [−1, 1]² (automatic), padded 5 % with a frame and axes, AspectRatio Automatic, face area π', () => {
    const g = polar();
    const [[x0, x1], [y0, y1]] = g.options.PlotRange;
    for (const [v, e] of [[x0, -1], [x1, 1], [y0, -1], [y1, 1]]) expect(v).toBeCloseTo(e, 12);
    expect(g.options.PlotRangePadding).toEqual([0.05, 0.05]); // a region ParametricPlot's defaults (v0.1.26): Scaled[0.05] …
    expect(g.options.Frame).toBe(true); // … with a Frame and Axes, as a saved notebook shows
    expect(g.options.Axes).toBe(true);
    expect(g.options.AspectRatio).toBeUndefined();
    const fs = faces(g);
    expect(fs).toHaveLength(1); // the map keeps the orientation: one shape
    const total = fs[0].pts.reduce((s, l) => s + area(l), 0);
    expect(Math.abs(total - Math.PI) / Math.PI).toBeLessThan(0.01); // a 40-gon: 20 sin(9°) = 3.1287
  });
  it('the boundary is the image of the domain\'s edge: inside the unit disk, the u = 1 edge on the circle', () => {
    const [line] = Cases(polar(), 'Line');
    const [run] = runs(line);
    expect(run).toHaveLength(4 * 40 + 1); // closed
    for (const [x, y] of run) expect(Math.hypot(x, y)).toBeLessThanOrEqual(1 + 1e-12);
    for (const [x, y] of run.slice(40, 81)) expect(Math.hypot(x, y)).toBeCloseTo(1, 12); // u = 1, v from 0 to 2π
    expect(run[0]).toEqual([0, 0]);
  });
  it('a map that folds: the turned-over quads are a second shape, so the doubly covered part is drawn twice', () => {
    const g = ParametricPlot((u, v) => [u, v * (1 - v)], [0, 1], [0, 1]);
    const fs = faces(g);
    expect(fs).toHaveLength(2);
    for (const f of fs) expect(f.pts.reduce((s, l) => s + area(l), 0)).toBeCloseTo(0.25, 2); // each covers [0, 1] × [0, ¼]
  });
  it('several regions: PlotStyle for the faces, boundaries in ColorData[97, i] (as the drone snapshots), test ids per region', () => {
    const g = ParametricPlot((u, v) => [[u, v], [-u, v]], [0, 1], [0, 1], { PlotStyle: Blue });
    const fill = [], edge = [];
    Cases(g, (q, st) => { if (q.head === 'FilledPolygons') fill.push(st.color); if (q.head === 'Line') edge.push(st.color); return false; });
    expect(fill).toEqual([[0, 0, 1], [0, 0, 1]]);
    expect(edge).toEqual([COLOR_DATA_97[0], COLOR_DATA_97[1]]);
    for (const id of ['region-face-1', 'region-face-2', 'region-boundary-1', 'region-boundary-2']) expect(annotation(g, id)).not.toBe(null);
    const d = []; Cases(ParametricPlot((u, v) => [[u, v], [-u, v]], [0, 1], [0, 1]), (q, st) => { if (q.head === 'FilledPolygons') d.push(st.color); return false; });
    expect(d).toEqual([COLOR_DATA_97[0], COLOR_DATA_97[1]]);
  });
  it('Mesh -> n draws n lines each way in the darker face colour; Mesh defaults to None', () => {
    expect(annotation(polar(), 'region-mesh-1')).toBe(null);
    const m = annotation(polar({ Mesh: 2 }), 'region-mesh-1');
    expect(runs(Cases(m.g, 'Line')[0])).toHaveLength(4);
  });
  it('the curve form is unchanged: a third argument that is an object or absent', () => {
    const a = ParametricPlot((t) => [Math.cos(t), Math.sin(t)], [0, Math.PI]);
    const b = ParametricPlot((t) => [Math.cos(t), Math.sin(t)], [0, Math.PI], { PlotStyle: Red });
    for (const g of [a, b]) { expect(Cases(g, 'Line')).toHaveLength(1); expect(faces(g)).toHaveLength(0); }
    expect(styleOf(b, 'Line').color).toEqual([1, 0, 0]);
  });
});

describe('DensityPlot and DensityGradient', () => {
  const pixel = (g, k) => [...Cases(g, 'ImageRaster')[0].image.data.slice(4 * k, 4 * k + 4)];
  const bytes = (rgb) => [...rgb.map((c) => Math.round(255 * c)), 255];
  it('a PlotPoints² image over the plot range, drawn smoothed; Frame, AspectRatio 1, the given ranges', () => {
    const g = DensityPlot((x, y) => x + y, [0, 2], [-1, 1]);
    const r = Cases(g, 'ImageRaster')[0];
    expect([r.image.width, r.image.height, r.smooth]).toEqual([150, 150, true]);
    expect(r.box).toEqual([[0, -1], [2, 1]]);
    expect(g.options).toMatchObject({ Frame: true, Axes: false, AspectRatio: 1, PlotRange: [[0, 2], [-1, 1]], PlotRangePadding: [0, 0] });
    expect(annotation(g, 'density-raster')).not.toBe(null);
  });
  it('samples at the cell centres, scaled by the z range: the colours at 0, ½ and 1', () => {
    const g = DensityPlot((x) => x, [0, 1], [0, 1], { PlotPoints: 3 }); // x = 1/6, 1/2, 5/6 → 0, 0.5, 1
    expect(pixel(g, 0)).toEqual(bytes(DENSITY_GRADIENT_STOPS[0][1]));
    expect(pixel(g, 1)).toEqual(bytes(DENSITY_GRADIENT_STOPS[10][1]));
    expect(pixel(g, 2)).toEqual(bytes(DENSITY_GRADIENT_STOPS[20][1]));
  });
  it('ColorFunctionScaling -> False: the raw value, clipped to 0…1 by the gradient; a PlotRange z entry sets the scaling', () => {
    const raw = DensityPlot((x) => 2 * x - 0.5, [0, 1], [0, 1], { PlotPoints: 3, ColorFunctionScaling: false }); // −1/6, 1/2, 7/6
    expect([0, 1, 2].map((k) => pixel(raw, k))).toEqual([0, 10, 20].map((i) => bytes(DENSITY_GRADIENT_STOPS[i][1])));
    const z = DensityPlot((x) => x, [0, 1], [0, 1], { PlotPoints: 3, PlotRange: [[0, 1], [0, 1], [0, 1 / 3]] }); // 1/6 → ½, beyond → 1
    expect([0, 1, 2].map((k) => pixel(z, k))).toEqual([10, 20, 20].map((i) => bytes(DENSITY_GRADIENT_STOPS[i][1])));
  });
  it('row 1 is the top (largest y); a non-number is transparent; ColorFunction gets the scaled value', () => {
    const g = DensityPlot((x, y) => (x < 0.5 ? NaN : y), [0, 1], [0, 1], { PlotPoints: 2, ColorFunction: (v) => [v, 0, 1 - v] });
    expect(pixel(g, 0)[3]).toBe(0); // top left: NaN
    expect(pixel(g, 1)).toEqual([255, 0, 0, 255]); // top right: the largest y → 1
    expect(pixel(g, 3)).toEqual([0, 0, 255, 255]); // bottom right → 0
  });
  it('DensityGradient: the stops, linear between them, clipped to 0…1', () => {
    expect(DensityGradient(0).rgb).toEqual([0.2, 0.231, 0.498]);
    expect(DensityGradient(0.5).rgb).toEqual([0.922, 0.504, 0.351]);
    expect(DensityGradient(1).rgb).toEqual([1, 0.959, 0.769]);
    expect(DensityGradient(-2).rgb).toEqual(DensityGradient(0).rgb);
    expect(DensityGradient(3).rgb).toEqual(DensityGradient(1).rgb);
    const mid = DensityGradient(0.025).rgb;
    [0.269, 0.239, 0.482].forEach((c, i) => expect(mid[i]).toBeCloseTo(c, 12));
    expect(DENSITY_GRADIENT_STOPS).toHaveLength(21);
  });
});

describe('BSplineCurve', () => {
  const hullContains = (hull, p) => hull.every((a, i) => { const b = hull[(i + 1) % hull.length]; return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= -1e-12; });
  it('clamped uniform knots: starts at the first and ends at the last control point; a cubic Bézier for four points', () => {
    const pts = bsplinePoints([[0, 0], [1, 2], [3, 2], [4, 0]]);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts.at(-1)).toEqual([4, 0]);
    expect(pts).toHaveLength(25); // one span, 24 samples + the end
    expect(pts[12][0]).toBeCloseTo(2, 12); expect(pts[12][1]).toBeCloseTo(1.5, 12); // (P0 + 3 P1 + 3 P2 + P3) / 8
  });
  it('symmetric control points give a symmetric curve, inside the convex hull of the control points', () => {
    const cp = [[-3, 0], [-2, 2], [0, 3], [2, 2], [3, 0]];
    const pts = bsplinePoints(cp);
    const n = pts.length;
    for (let k = 0; k < n; k++) { expect(pts[k][0]).toBeCloseTo(-pts[n - 1 - k][0], 12); expect(pts[k][1]).toBeCloseTo(pts[n - 1 - k][1], 12); }
    const zig = [[0, 0], [1, 3], [2, -1], [4, 2], [5, 0]], hull = [[0, 0], [2, -1], [5, 0], [4, 2], [1, 3]];
    for (const p of bsplinePoints(zig)) expect(hullContains(hull, p)).toBe(true);
    expect(bsplinePoints([[0, 0], [1, 1], [2, 0]], { SplineDegree: 1 }).filter((p, i) => i % 24 === 0)).toEqual([[0, 0], [1, 1], [2, 0]]); // degree 1: the polygon
  });
  it('SplineClosed: a closed curve; bounds are the control points; scaleGraphics maps the control points', () => {
    const sq = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const c = bsplinePoints(sq, { SplineClosed: true });
    expect(c.at(-1)).toEqual(c[0]);
    expect(c[0][0]).toBeCloseTo(5 / 6, 12); expect(c[0][1]).toBeCloseTo(1 / 6, 12); // (P0 + 4 P1 + P2) / 6 of the wrapped points
    const b = BSplineCurve([[0, 0], [1, 3], [2, 0]]);
    expect(bounds([b])).toEqual([[0, 0], [2, 3]]);
    expect(scaleGraphics([b], [2, 0.5])[0].pts).toEqual([[0, 0], [2, 1.5], [4, 0]]);
  });
  it('Arrow[BSplineCurve[…]]: the arrow follows the curve and its last leg points along the end tangent', () => {
    const cp = [[0, 0], [1, 2], [3, 2], [4, 1]];
    const a = Arrow(BSplineCurve(cp));
    expect(a.pts[0]).toEqual([0, 0]);
    expect(a.pts.at(-1)).toEqual([4, 1]);
    const [p, q] = a.pts.slice(-2), dir = Math.atan2(q[1] - p[1], q[0] - p[0]);
    expect(Math.abs(dir - Math.atan2(1 - 2, 4 - 3))).toBeLessThan(0.05); // P3 − P2
    expect(a.curve.head).toBe('BSplineCurve');
  });
});

describe('FilledPolygons and smooth ImageRaster (data)', () => {
  it('FilledPolygons keeps its loops; scaleGraphics maps every point; ImageRaster without options is unchanged', () => {
    const f = FilledPolygons([[[0, 0], [1, 0], [0, 1]]]);
    expect(scaleGraphics([f], [2, 3])[0].pts).toEqual([[[0, 0], [2, 0], [0, 3]]]);
    expect(bounds([f])).toEqual([[0, 0], [1, 1]]);
    const img = { width: 1, height: 1, data: new Uint8ClampedArray(4) };
    expect(Object.keys(ImageRaster(img, [[0, 0], [1, 1]]))).toEqual(['head', 'image', 'box']);
    expect(ImageRaster(img, [[0, 0], [1, 1]], { smooth: true }).smooth).toBe(true);
  });
});

describe('LabelStyle and the layout of an Inset of a framed plot', () => {
  it('LabelStyle: directives after the labels\' defaults (tick labels, frame labels, plot label); none: as before', () => {
    expect(labelDirectives(Directive(Black, Bold))).toEqual([Black, Bold]);
    expect(labelDirectives([Black])).toEqual([Black]);
    expect(labelDirectives(14)[0].value).toBe(14);
    const o = { Frame: true, FrameLabel: ['x', 'y'], PlotLabel: 't' }, at = { range: [[0, 1], [0, 1]], visible: [[-0.2, 1.1], [-0.2, 1.1]], unitsPerPx: 0.005 };
    const plain = plotDecorations(o, at), styled = plotDecorations({ ...o, LabelStyle: Directive(Black, Bold) }, at);
    const frameOf = (d) => annotation(d.below, 'frame').g;
    expect(frameOf(plain).includes(Bold)).toBe(false);
    expect(frameOf(styled).length).toBe(frameOf(plain).length + 2);
    const ticks = frameOf(styled).indexOf(Bold), firstText = frameOf(styled).findIndex((q) => q.head === 'Text');
    expect(ticks).toBeLessThan(firstText); // after the lines and FontSize, before the tick labels
    for (const id of ['frame-label-bottom', 'frame-label-left', 'plot-label']) expect(annotation(styled.above, id).g).toContain(Bold);
  });
  it('a framed RegionPlot inset: ImageSize = the width with the labels, the whole box centred at pos, the frame where the margins put it', () => {
    const u = 2.08 / 520; // outer units per px: PlotRange width 2 with Scaled[0.02] padding, ImageSize 520
    const g = RegionPlot((x) => x < -3, [-1, 1], [-1, 1], { FrameLabel: ['Δx', 'Δy'], LabelStyle: Directive(Black, Bold), ImageSize: 230 });
    const L = insetLayout(g, [1.38, 0.45], u);
    // margins (px): left 34 + 26 (frame label), right 10, bottom 18 + 24, top 8 → plot area 160 × 160 (AspectRatio 1)
    const near = (a, b) => a.flat().forEach((v, i) => expect(v).toBeCloseTo(b.flat()[i], 12));
    near(L.box, [[1.38 - 115 * u, 0.45 - 105 * u], [1.38 + 115 * u, 0.45 + 105 * u]]);
    near(L.frame, [[1.38 - 55 * u, 0.45 - 63 * u], [1.38 + 105 * u, 0.45 + 97 * u]]);
    near([L.toOuter([-1.04, -1.04]), L.toOuter([1.04, 1.04])], L.frame); // Scaled[0.02] padding (v0.1.26): the frame 2 % outside the data
    expect(L.k).toBeCloseTo(u / L.unitsPerPx, 15);
    expect(L.clip).not.toBe(null); // PlotRangeClipping of plots
    expect(annotation(L.below, 'frame').g).toContain(Bold);
    expect(annotation(L.above, 'frame-label-left')).not.toBe(null);
  });
  it('AspectRatio and a Graphics without decorations: the box keeps the ratio; an undecorated PlotRange spans ImageSize px', () => {
    const g = RegionPlot((x, y) => x < y, [0, 2], [0, 1], { AspectRatio: 0.5, Frame: false, ImageSize: 200 });
    const L = insetLayout(g, [0, 0], 1);
    expect(L.box[1][0] - L.box[0][0]).toBeCloseTo(200, 9);
    expect(L.box[1][1] - L.box[0][1]).toBeCloseTo(100, 9);
    const plain = insetLayout({ head: 'Graphics', list: [], options: { PlotRange: [[-8, 8], [-8, 8]], ImageSize: 17 } }, [5, 5], 0.01);
    expect(plain.k).toBeCloseTo((17 * 0.01) / 16, 15); // as the plain insets (locator icons) are drawn
    expect(plain.box[0][0]).toBeCloseTo(5 - 0.085, 12);
  });
});
