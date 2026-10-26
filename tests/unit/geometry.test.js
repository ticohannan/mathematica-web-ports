// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/geometry.test.js — shared/geometry.js and the v0.1.23 additions to shared/wl.js (distributions, Erf,
// Binomial) and shared/graphics.js (Hue, Ellipsoid, scaleGraphics), against hand-derived values.
import { describe, it, expect } from 'vitest';
import * as Geo from '../../shared/geometry.js';
import * as W from '../../shared/wl.js';
import { Hue, Ellipsoid, scaleGraphics, Disk, Circle, Rotate, Rectangle, Text, Line, Point, Translate } from '../../shared/graphics.js';
import { createRng } from '../../shared/random.js';

const close = (a, b, d = 12) => { expect(a.length).toBe(b.length); a.forEach((x, i) => (Array.isArray(x) ? close(x, b[i], d) : expect(x).toBeCloseTo(b[i], d))); };

describe('geometry.js', () => {
  it('ConvexHull: counter-clockwise from the lowest point; interior, duplicate and collinear points dropped', () => {
    const pts = [[0, 0], [2, 0], [1, 1], [2, 2], [0, 2], [1, 0], [0, 0], [1, 2.5]];
    expect(Geo.ConvexHull(pts)).toEqual([[0, 0], [2, 0], [2, 2], [1, 2.5], [0, 2]]);
    expect(Geo.ConvexHull([[1, 1], [0, 0]])).toEqual([[0, 0], [1, 1]]);
  });
  it('PolygonArea is signed; RegionMember inside, outside and on the edge; SignedArea turns', () => {
    expect(Geo.PolygonArea([[0, 0], [2, 0], [2, 1], [0, 1]])).toBe(2);
    expect(Geo.PolygonArea([[0, 0], [0, 1], [2, 1], [2, 0]])).toBe(-2);
    const sq = [[0, 0], [2, 0], [2, 2], [0, 2]];
    expect(Geo.RegionMember(sq, [1, 1])).toBe(true);
    expect(Geo.RegionMember(sq, [3, 1])).toBe(false);
    expect(Geo.RegionMember(sq, [2, 1])).toBe(true);
    expect(Geo.SignedArea([0, 0], [1, 0], [0, 1])).toBe(0.5);
    expect(Geo.SignedArea([0, 0], [0, 1], [1, 0])).toBe(-0.5);
  });
  it('segments: intersection, nearest point and distance (2D and 3D)', () => {
    expect(Geo.SegmentIntersection([[0, 0], [2, 2]], [[0, 2], [2, 0]])).toEqual([1, 1]);
    expect(Geo.SegmentIntersection([[0, 0], [1, 1]], [[2, 0], [3, 1]])).toBeNull();
    expect(Geo.RegionNearest([[0, 0], [2, 0]], [1, 5])).toEqual([1, 0]);
    expect(Geo.RegionDistance([[0, 0, 0], [0, 0, 2]], [3, 4, 5])).toBe(Math.hypot(3, 4, 3));
  });
  it('SegmentsClosestPoints: skew, crossing, parallel and degenerate segments', () => {
    const a = Geo.SegmentsClosestPoints([[0, 0, 0], [2, 0, 0]], [[1, -1, 1], [1, 1, 1]]);
    close(a.pA, [1, 0, 0]); close(a.pB, [1, 0, 1]); expect(a.distance).toBeCloseTo(1, 12);
    const b = Geo.SegmentsClosestPoints([[0, 0, 0], [1, 0, 0]], [[3, 1, 0], [4, 1, 0]]); // parallel, apart: ends
    expect(b.distance).toBeCloseTo(Math.hypot(2, 1), 12);
    const c = Geo.SegmentsClosestPoints([[0, 0, 0], [0, 0, 0]], [[1, 1, 0], [1, -1, 0]]);
    expect(c.distance).toBeCloseTo(1, 12); close(c.pB, [1, 0, 0]);
    const d = Geo.SegmentsClosestPoints([[0, 0], [2, 2]], [[0, 2], [2, 0]]);
    expect(d.distance).toBeCloseTo(0, 12);
  });
  it('Eigensystem2, CircumCircle, RollPitchYawMatrix', () => {
    const e = Geo.Eigensystem2([[2, 1], [1, 2]]);
    close(e.values, [3, 1]); close(e.vectors[0], [Math.SQRT1_2, Math.SQRT1_2]);
    close(Geo.Eigensystem2([[1, 0], [0, 4]]).vectors[0], [0, 1]);
    const c = Geo.CircumCircle([0, 0], [2, 0], [0, 2]);
    close(c.center, [1, 1]); expect(c.radius).toBeCloseTo(Math.SQRT2, 12);
    expect(Geo.CircumCircle([0, 0], [1, 1], [2, 2])).toBeNull();
    close(Geo.RollPitchYawMatrix([Math.PI / 2, 0, 0]), [[0, -1, 0], [1, 0, 0], [0, 0, 1]]);
    close(Geo.RollPitchYawMatrix([0, Math.PI / 2, 0]), [[0, 0, 1], [0, 1, 0], [-1, 0, 0]]);
  });
});

describe('wl.js statistics (v0.1.23)', () => {
  it('Erf against tabulated values; Binomial', () => {
    expect(W.Erf(0.5)).toBeCloseTo(0.5204998778130465, 14);
    expect(W.Erf(1)).toBeCloseTo(0.8427007929497149, 14);
    expect(W.Erf(-2)).toBeCloseTo(-0.9953222650189527, 14);
    expect(W.Erf(3.5)).toBeCloseTo(0.9999992569016276, 14);
    expect(W.Binomial(5, 2)).toBe(10); expect(W.Binomial(5, 7)).toBe(0); expect(W.Binomial(30, 15)).toBe(155117520);
  });
  it('PDF, CDF, Mean and Variance of the normal, uniform and triangular distributions', () => {
    const N = W.NormalDistribution(2, 3);
    expect(W.PDF(N, 2)).toBeCloseTo(1 / (3 * Math.sqrt(2 * Math.PI)), 15);
    expect(W.CDF(N, 2)).toBeCloseTo(0.5, 15);
    expect(W.CDF(W.NormalDistribution(), 1.96)).toBeCloseTo(0.9750021048517795, 13);
    expect(W.Mean(N)).toBe(2); expect(W.Variance(N)).toBe(9);
    const U = W.UniformDistribution([1, 3]);
    expect(W.PDF(U, 2)).toBe(0.5); expect(W.CDF(U, 2.5)).toBe(0.75); expect(W.Variance(U)).toBeCloseTo(1 / 3, 15);
    const T = W.TriangularDistribution([0, 2], 1);
    expect(W.PDF(T, 1)).toBe(1); expect(W.PDF(T, 0.5)).toBe(0.5); expect(W.CDF(T, 1)).toBe(0.5); expect(W.Mean(T)).toBe(1);
    expect(W.Variance([1, 2, 3, 4])).toBeCloseTo(5 / 3, 15);
  });
  it('RandomVariate: reproducible with a seeded source, and the sample mean near the mean', () => {
    const a = W.RandomVariate(W.NormalDistribution(5, 2), 2000, createRng({ seed: 7 }));
    const b = W.RandomVariate(W.NormalDistribution(5, 2), 2000, createRng({ seed: 7 }));
    expect(a).toEqual(b);
    expect(Math.abs(W.Mean(a) - 5)).toBeLessThan(0.2);
    const t = W.RandomVariate(W.TriangularDistribution([0, 1], 0.2), 1000, createRng({ seed: 3 }));
    expect(t.every((x) => x >= 0 && x <= 1)).toBe(true);
    expect(Math.abs(W.Mean(t) - 0.4)).toBeLessThan(0.03);
  });
});

describe('graphics.js additions (v0.1.23)', () => {
  it('Hue[h]: red at 0 and 1, green at 1/3, cyan at 1/2; s and b', () => {
    close(Hue(0).rgb, [1, 0, 0]); close(Hue(1).rgb, [1, 0, 0]); close(Hue(1 / 3).rgb, [0, 1, 0]); close(Hue(0.5).rgb, [0, 1, 1]);
    close(Hue(0, 0.5, 0.5).rgb, [0.5, 0.25, 0.25]);
  });
  it('Ellipsoid[c, Σ] in 2D: semi-axes √eigenvalues, rotated to the first eigenvector', () => {
    const e = Ellipsoid([1, 2], [[2, 1], [1, 2]]);
    expect(e.head).toBe('Rotate'); expect(e.angle).toBeCloseTo(Math.PI / 4, 14);
    close(e.g.r, [Math.sqrt(3), 1]);
    expect(Ellipsoid([0, 0], [[1, 0], [0, 4]]).angle).toBe(Math.PI / 2);
  });
  it('scaleGraphics: positions scaled, disks and circles become ellipses, Rotate and Translate applied first', () => {
    const g = scaleGraphics([Disk([1, 1], 1), Circle([0, 0], 2), Text('a', [1, 2]), Line([[0, 0], [1, 1]]), Point([[1, 1]]),
      Rotate(Rectangle([0, 0], [1, 1]), Math.PI / 2, [0, 0]), Translate(Point([0, 1]), [1, 0])], [1, 10]);
    expect(g[0]).toMatchObject({ c: [1, 10], r: [1, 10] });
    expect(g[1].r).toEqual([2, 20]);
    expect(g[2].pos).toEqual([1, 20]);
    expect(g[3].pts).toEqual([[0, 0], [1, 10]]);
    expect(g[5].head).toBe('Polygon');
    close(g[5].pts, [[0, 0], [0, 10], [-1, 10], [-1, 0]]);
    expect(g[6].pts).toEqual([[1, 10]]);
    expect(scaleGraphics(g, [1, 1])).toBe(g);
    // a rotated ellipse keeps its rotation: drawn as a sampled outline
    const e = scaleGraphics([Ellipsoid([0, 0], [[4, 1], [1, 1]])], [1, 2])[0];
    expect(e.head).toBe('Polygon');
    const far = e.pts.reduce((a, p) => (Math.hypot(...p) > Math.hypot(...a) ? p : a));
    expect(Math.abs(far[1] / far[0])).toBeGreaterThan(0.3); // the long axis is tilted, not along x
  });
});
