// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/graphics3d.test.js — shared/graphics3d.js (Graphics3D as data). Expected values are written by hand
// from Mathematica's documented semantics, never by running the code under test for the expected value.
import { describe, it, expect } from 'vitest';
import {
  flatten, Show, Graphics3D, Red, Blue, Thick, Opacity, Sphere, Line, Rotate, Cuboid, EdgeForm, Gray,
  infinitePlanePolygon, cuboidCorners, primitiveBounds, mul4, mul4Fma, GeometricTransformation, affine, apply4,
} from '../../shared/graphics3d.js';

const π = Math.PI;
const close3 = (a, b, d = 12) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], d));

describe('shared/graphics3d.js', () => {
  it('flatten applies directives in order and scopes them to lists', () => {
    const p = flatten(Graphics3D([Red, Sphere([[0, 0, 0], [0, 0, 2]], 0.15), Thick, Opacity(0.4), Line([[0, 0, 0], [0, 0, 4]]), [Opacity(0.3), Sphere([0, 0, 2], 2)], Line([[1, 1, 1], [2, 2, 2]])]));
    expect(p.map((x) => [x.type, x.opacity, x.thickness])).toEqual([['sphere', 1, 'Normal'], ['line', 0.4, 'Large'], ['sphere', 0.3, 'Large'], ['line', 0.4, 'Large']]);
    expect(p.every((x) => x.color.join() === '1,0,0')).toBe(true);
  });
  it('a colour set inside a nested list does not leak out of it', () => {
    const p = flatten(Graphics3D([Red, [Blue, Sphere([0, 0, 0], 1)], Sphere([1, 0, 0], 1)]));
    expect(p.map((x) => x.color)).toEqual([[0, 0, 1], [1, 0, 0]]);
  });
  it('Show keeps the styles of each graphic separate and takes options from the first', () => {
    const g = Show(Graphics3D([Red, Opacity(0.5)], { PlotLabel: 'a' }), Graphics3D([Sphere([0, 0, 0], 1)], { PlotLabel: 'b', Axes: true }));
    expect(g.options).toEqual({ PlotLabel: 'a', Axes: true });
    const [s] = flatten(g);
    expect(s.color).toBe(null);
    expect(s.opacity).toBe(1);
  });
  it('Rotate turns about an axis through the origin (π/2 about y maps z to x)', () => {
    const [l] = flatten(Rotate(Line([[0, 0, 0], [0, 0, 1]]), π / 2, [0, 1, 0]));
    close3(l.points[1], [1, 0, 0], 15);
  });
  it('GeometricTransformation with {m, b} maps points by m.p + b', () => {
    const [l] = flatten(GeometricTransformation(Line([[1, 0, 0], [0, 1, 0]]), affine([[0, -1, 0], [1, 0, 0], [0, 0, 1]], [0, 0, 5])));
    expect(l.points).toEqual([[0, 1, 5], [-1, 0, 5]]);
    expect(apply4(affine([[2, 0, 0], [0, 2, 0], [0, 0, 2]], [1, 1, 1]), [1, 2, 3])).toEqual([3, 5, 7]);
  });
  it('infinitePlanePolygon of a plane lying on a face of the box is that face', () => {
    const poly = infinitePlanePolygon([[1, 0, 0], [1, 1, 0], [0, 1, 0]], [[-3.15, 3.15], [-3.15, 3.15], [0, 1]]);
    expect(poly).toHaveLength(4);
    for (const q of poly) expect(q[2]).toBe(0);
  });
  it('Cuboid[p, q] with corners in any order: cuboidCorners gives min and max; flatten keeps them as written; EdgeForm only when given', () => {
    const [c, e] = flatten(Graphics3D([Gray, Cuboid([1, -1, 2], [0, 1, 0]), EdgeForm(), Cuboid([0, 0, 0], [1, 1, 1])]));
    expect(cuboidCorners(c)).toEqual({ min: [0, -1, 0], max: [1, 1, 2] });
    expect([c.min, c.max]).toEqual([[1, -1, 2], [0, 1, 0]]);
    expect('edgeForm' in c).toBe(false);
    expect(e.edgeForm).toBe('None');
    expect(primitiveBounds([c])).toEqual([[0, 1], [-1, 1], [0, 2]]);
  });
  it('mul4 and mul4Fma agree with the exact product of small integer matrices; mul4Fma has no -0', () => {
    const A = [[1, 2, 0, 1], [0, 1, 3, 0], [2, 0, 1, 1], [0, 0, 0, 1]];
    const B = [[0, 1, 0, 2], [1, 0, 0, 0], [0, 0, 1, 3], [0, 0, 0, 1]];
    const want = [[2, 1, 0, 3], [1, 0, 3, 9], [0, 2, 1, 8], [0, 0, 0, 1]]; // by hand
    expect(mul4(A, B)).toEqual(want);
    expect(mul4Fma(A, B)).toEqual(want);
    const Z = mul4Fma([[-1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    expect(Z.flat().some((x) => Object.is(x, -0))).toBe(false);
  });
  it('mul4Fma rounds once per term (fused): (1 + 2^-30)(1 - 2^-30) + (-1) is -2^-60, not 0', () => {
    const e = 2 ** -30;
    const A = [[1 + e, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const B = [[1 - e, 0, 0, 0], [-1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    expect(mul4(A, B)[0][0]).toBe(0); // the product rounds to 1 first
    expect(mul4Fma(A, B)[0][0]).toBe(0); // a0*b0 is rounded before the first fma (the dgemm order), so also 0
    const B2 = [[-1, 0, 0, 0], [1 - e, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const A2 = [[1, 1 + e, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    expect(mul4(A2, B2)[0][0]).toBe(0);
    expect(mul4Fma(A2, B2)[0][0]).toBe(-(2 ** -60)); // fma(a1, b1, a0*b0) keeps the exact product
  });
});

describe('graphics3d v0.1.23 primitives: Tube, Cone, InfiniteLine, Text', () => {
  it('flatten keeps their geometry and style; Text takes FontSize and the colour', async () => {
    const G = await import('../../shared/graphics3d.js');
    const prims = G.flatten(G.Graphics3D([G.Red, G.Tube([[0, 0, 0], [1, 0, 0], [1, 1, 0]], 0.1), G.Cone([[0, 0, 0], [0, 0, 2]], 0.5),
      G.InfiniteLine([[0, 0, 0], [1, 1, 1]]), [G.FontSize(14), G.White, G.Text('A', [1, 2, 3])]]));
    expect(prims.map((p) => p.type)).toEqual(['tube', 'cone', 'infiniteLine', 'text']);
    expect(prims[0]).toMatchObject({ radius: 0.1, color: [1, 0, 0] });
    expect(prims[3]).toMatchObject({ expr: 'A', pos: [1, 2, 3], fontSize: 14, color: [1, 1, 1] });
    const b = G.primitiveBounds(prims.slice(0, 2));
    expect(b).toEqual([[-0.5, 1.1], [-0.5, 1.1], [-0.5, 2]]); // a conservative box (radii added in every direction)
  });
  it('infiniteLineSegment clips the line to the box; a line outside gives nothing', async () => {
    const G = await import('../../shared/graphics3d.js');
    const box = [[-1, 1], [-1, 1], [-1, 1]];
    expect(G.infiniteLineSegment([[0, 0, 0], [1, 0, 0]], box)).toEqual([[-1, 0, 0], [1, 0, 0]]);
    expect(G.infiniteLineSegment([[0, 0, 0], [1, 1, 1]], box)).toEqual([[-1, -1, -1], [1, 1, 1]]);
    expect(G.infiniteLineSegment([[0, 5, 0], [1, 5, 0]], box)).toEqual([]);
  });
});

describe('graphics3d v0.1.26: Texture and Polygon with VertexTextureCoordinates', () => {
  const img = { width: 2, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 0]) };
  const square = [[0, 0, 5], [1, 0, 5], [1, 1, 5], [0, 1, 5]];
  const unit = [[0, 0], [1, 0], [1, 1], [0, 1]];
  it('a textured polygon carries the image and its texture coordinates; Opacity and EdgeForm stay as for any polygon', async () => {
    const G = await import('../../shared/graphics3d.js');
    const [p] = G.flatten(G.Graphics3D([G.Texture(img), G.EdgeForm(), G.Opacity(0.5), G.Polygon(square, { VertexTextureCoordinates: unit })]));
    expect(p).toMatchObject({ type: 'polygon', points: square, opacity: 0.5, edgeForm: 'None', textureCoordinates: unit });
    expect(p.texture).toBe(img); // the same image object (the renderer keeps one texture per image)
  });
  it('without a Texture, or without VertexTextureCoordinates, a polygon flattens exactly as before', async () => {
    const G = await import('../../shared/graphics3d.js');
    const [a, b] = G.flatten(G.Graphics3D([G.Polygon(square, { VertexTextureCoordinates: unit }), G.Texture(img), G.Polygon(square)]));
    const plain = { type: 'polygon', points: square, color: null, opacity: 1, thickness: 'Normal', pointSize: null, arrowheads: null };
    expect(a).toEqual(plain);
    expect(b).toEqual(plain);
    expect(G.Polygon(square)).toEqual({ prim: 'polygon', points: square }); // the data shape of v0.1.25
  });
  it('the Texture directive is scoped like any directive and follows transforms', async () => {
    const G = await import('../../shared/graphics3d.js');
    const g = G.Graphics3D([[G.Texture(img), G.Polygon(square, { VertexTextureCoordinates: unit })], G.Polygon(square, { VertexTextureCoordinates: unit }),
      G.Texture(img), G.Rotate(G.Polygon([[1, 0, 0], [0, 1, 0], [0, 0, 1]], { VertexTextureCoordinates: [[0, 0], [1, 0], [0, 1]] }), π / 2, [0, 0, 1])]);
    const [inside, outside, turned] = G.flatten(g);
    expect('texture' in inside).toBe(true);
    expect('texture' in outside).toBe(false);
    close3(turned.points[0], [0, 1, 0], 15); // the points turn, the texture coordinates stay with their vertices
    expect(turned.textureCoordinates).toEqual([[0, 0], [1, 0], [0, 1]]);
  });
});
