// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/graphics3d-view.test.js — the pure parts behind shared/graphics3d-view.js (v0.1.21, in shared/graphics3d.js):
// GraphicsComplex, Group3D and groupsOf, explicit-PlotRange clipping planes, BoxRatios, automatic ticks, the box frame
// and the PointSize image width. Expected values are written by hand from Mathematica's documented semantics and the
// definitions in the file headers, never by running the code under test for the expected value.
import { describe, it, expect } from 'vitest';
import {
  Graphics3D, GraphicsComplex, Group3D, Polygon, Line, Sphere, Red, Opacity, EdgeForm, flatten, primitiveBounds, groupsOf,
  clipPlaneData, boxRatioTransform, niceTicks, frameData, imageWidth, GeometricTransformation, affine,
} from '../../shared/graphics3d.js';

describe('GraphicsComplex and Group3D', () => {
  const pts = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [2, 0, 0], [2, 1, 0]];
  it('a Polygon of several index lists flattens to one mesh (0-based polygons) with the current style', () => {
    const [m] = flatten(Graphics3D([EdgeForm(), Red, Opacity(0.5), GraphicsComplex(pts, Polygon([[1, 2, 3, 4], [2, 5, 6, 3]]))]));
    expect(m.type).toBe('mesh');
    expect(m.polygons).toEqual([[0, 1, 2, 3], [1, 4, 5, 2]]);
    expect(m.points).toEqual(pts);
    expect([m.color, m.opacity, m.edgeForm]).toEqual([[1, 0, 0], 0.5, 'None']);
  });
  it('a single Polygon or a Line inside resolves its indices to coordinates; a transform applies to the points', () => {
    const p = flatten(GeometricTransformation(GraphicsComplex(pts, [Polygon([1, 2, 3]), Line([4, 1])]), affine([[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 5])));
    expect(p.map((q) => q.type)).toEqual(['polygon', 'line']);
    expect(p[0].points).toEqual([[0, 0, 5], [1, 0, 5], [1, 1, 5]]);
    expect(p[1].points).toEqual([[0, 1, 5], [0, 0, 5]]);
  });
  it('primitiveBounds of a mesh are the bounds of its points', () => {
    expect(primitiveBounds(flatten(GraphicsComplex(pts, Polygon([[1, 2, 3], [4, 5, 6]]))))).toEqual([[0, 2], [0, 1], [0, 0]]);
  });
  it('flatten sees through Group3D (styles inside stay inside)', () => {
    const g = Graphics3D([Group3D([Red, Sphere([0, 0, 0], 1)], { key: 'a' }), Sphere([3, 0, 0], 1)]);
    expect(flatten(g).map((q) => q.color)).toEqual([[1, 0, 0], null]);
    expect(primitiveBounds(flatten(g))).toEqual([[-1, 4], [-1, 1], [-1, 1]]);
  });
  it('groupsOf: each top-level Group3D is a part (with its key), runs of other content one part each', () => {
    const s1 = Sphere([0, 0, 0], 1), s2 = Sphere([1, 0, 0], 1), s3 = Sphere([2, 0, 0], 1);
    const parts = groupsOf(Graphics3D([Red, s1, Group3D([s2], { key: 7 }), s3]));
    expect(parts).toEqual([{ content: [Red, s1], key: undefined }, { content: [s2], key: 7 }, { content: [s3], key: undefined }]);
    expect(groupsOf(Graphics3D([s1, s2]))).toEqual([{ content: [s1, s2], key: undefined }]);
  });
});

describe('clipping planes, BoxRatios', () => {
  it('clipPlaneData: normal·p + constant >= 0 keeps x0 <= x <= x1 for every axis, lower plane first', () => {
    expect(clipPlaneData([[-1, 2], [-3, 4], [0, 5]])).toEqual([
      [[1, 0, 0], 1], [[-1, 0, 0], 2], [[0, 1, 0], 3], [[0, -1, 0], 4], [[0, 0, 1], -0], [[0, 0, -1], 5],
    ]);
  });
  it("clipPlaneData: padding widens the box, order 'max-first' puts each axis' upper plane first", () => {
    expect(clipPlaneData([[-0.5, 0.5], [-0.5, 0.5], [-0.5, 0.5]], { padding: 0.25 })[1]).toEqual([[-1, 0, 0], 0.75]);
    expect(clipPlaneData([[-3.5, 3.5], [-4, 4], [-1, 5]], { order: 'max-first' }).slice(0, 2)).toEqual([[[-1, 0, 0], 3.5], [[1, 0, 0], 3.5]]);
  });
  it('BoxRatios {1, 1, 1}: the plot range box maps onto the unit cube centred at the origin', () => {
    const t = boxRatioTransform([[0, 1], [-2, 2], [-4, 4]], [1, 1, 1]);
    expect(t.worldBox).toEqual([[-0.5, 0.5], [-0.5, 0.5], [-0.5, 0.5]]);
    expect(t.scale).toEqual([1, 0.25, 0.125]);
    // the corners of the plot range land on the cube's corners
    expect([0, 1, 2].map((k) => t.scale[k] * [0, -2, -4][k] + t.position[k])).toEqual([-0.5, -0.5, -0.5]);
    expect([0, 1, 2].map((k) => t.scale[k] * [1, 2, 4][k] + t.position[k])).toEqual([0.5, 0.5, 0.5]);
  });
  it('BoxRatios {1, 2, 1}: the longest side is 1', () => {
    expect(boxRatioTransform([[0, 1], [0, 1], [0, 1]], [1, 2, 1]).worldBox).toEqual([[-0.25, 0.25], [-0.5, 0.5], [-0.25, 0.25]]);
  });
});

describe('ticks and the box frame', () => {
  it('niceTicks [-3.15, 3.15]: majors -2, 0, 2 (step 2), minors every 0.5 inside the range', () => {
    const t = niceTicks([-3.15, 3.15]);
    expect(t.map(([v]) => v)).toEqual([-3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3]);
    expect(t.filter(([, l]) => l).map(([v, l, len]) => [v, l, len])).toEqual([[-2, '-2', 0.035], [0, '0', 0.035], [2, '2', 0.035]]);
    expect(t[0][2]).toBe(0.018);
  });
  it('niceTicks [0, 1]: majors 0.0, 0.5, 1.0 (step 0.5), minors k/10 exactly (0.3 is 3/10)', () => {
    const t = niceTicks([0, 1]);
    expect(t.map(([v]) => v)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    expect(Object.is(t[0][0], 0)).toBe(true); // no -0
    expect(t.filter(([, l]) => l).map(([, l]) => l)).toEqual(['0.0', '0.5', '1.0']);
  });
  it('niceTicks [0, 2π]: majors 0, 2, 4, 6, minors every 0.5', () => {
    const t = niceTicks([0, 2 * Math.PI]);
    expect(t.filter(([, l]) => l).map(([v]) => v)).toEqual([0, 2, 4, 6]);
    expect(t.length).toBe(13);
  });
  it('frameData: 12 box edges (x edges first) and the axes on the default AxesEdge edges, ticks pointing outwards', () => {
    const unit = [[-0.5, 0.5], [-0.5, 0.5], [-0.5, 0.5]];
    const f = frameData({ box: [[0, 1], [0, 1], [0, 1]], worldBox: unit, ticks: [[[0, 'a', 0.1]], [[1, '', 0.1]], [[0.5, 'c', 0.1], [2, 'out', 0.1]]] });
    expect(f.edges.length).toBe(12);
    expect(f.edges[0]).toEqual([[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5]]);
    expect(f.edges[11]).toEqual([[0.5, 0.5, -0.5], [0.5, 0.5, 0.5]]);
    const r = Math.SQRT1_2;
    // x axis on the front-bottom edge (y = -1/2, z = -1/2), outward direction {0, -1, -1}/√2
    expect(f.axes[0].ticks[0][0]).toEqual([-0.5, -0.5, -0.5]);
    f.axes[0].ticks[0][1].forEach((v, i) => expect(v).toBeCloseTo([-0.5, -0.5 - 0.1 * r, -0.5 - 0.1 * r][i], 15));
    expect(f.axes[0].tickLabels.map((t) => t.text)).toEqual(['a']);
    // y axis on the top-left edge (x = -1/2, z = +1/2); its unlabelled tick has no label
    expect(f.axes[1].ticks[0][0]).toEqual([-0.5, 0.5, 0.5]);
    expect(f.axes[1].tickLabels).toEqual([]);
    // z axis on the front-left edge; a tick outside the range is left out; the axis label at the middle
    expect(f.axes[2].ticks.map((t) => t[0])).toEqual([[-0.5, -0.5, 0]]);
    f.axes[2].label.pos.forEach((v, i) => expect(v).toBeCloseTo([-0.5 - 0.14 * r, -0.5 - 0.14 * r, 0][i], 15));
  });
  it('frameData without BoxRatios works in data coordinates (lengths × the longest side)', () => {
    const S = 2 * Math.PI;
    const f = frameData({ box: [[0, S], [0, S], [0, S]], ticks: [[[2, '2', 0.035]], [], []], tickLabelOffset: 0.07 });
    expect(f.axes[0].ticks[0][0]).toEqual([2, 0, 0]);
    expect(f.axes[0].ticks[0][1][1]).toBeCloseTo(-0.035 * S * Math.SQRT1_2, 14);
    expect(f.axes[0].tickLabels[0].pos[2]).toBeCloseTo(-0.07 * S * Math.SQRT1_2, 14);
  });
  it('imageWidth: 2 |ViewPoint| L tan(ViewAngle/2) w/h', () => {
    expect(imageWidth([[0, 2], [0, 1], [0, 1]], { viewPoint: [0, 0, 3], viewAngle: Math.PI / 2, imageSize: [400, 200] })).toBeCloseTo(2 * 3 * 2 * 1 * 2, 12);
    expect(imageWidth([[0, 1], [0, 1], [0, 1]], { viewPoint: [3, 4, 0], viewAngle: Math.PI / 2, imageSize: 300 })).toBeCloseTo(10, 12);
  });
});
