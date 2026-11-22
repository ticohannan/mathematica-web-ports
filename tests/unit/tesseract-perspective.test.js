// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alexander Perepelitsa
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/tesseract-perspective.test.js — the model of "Rotating a Tesseract in Perspective". Expected values from
// outside the port: the tesseract's edges written out by hand, the projection derived by hand
// (P = (x, y, z cos a − w sin a) / (3 − z sin a − w cos a) for a vertex (x, y, z, w)), the notebook's saved states.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  initialState, evaluate, edges, styledTubes, Sqr, myCube, Tes, IncDim, ConnectPoints, PersPoint, Lighter, PLOT_RANGE,
} from '../../demos/tesseract-perspective/model.js';
import { RGBColor, flatten } from '../../shared/graphics3d.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/tesseract-perspective.original-states.json', 'utf8'));
const num = (x) => (typeof x === 'number' ? x : x.n);

/** the 16 vertices {±1}^4 and the 32 pairs that differ in one coordinate, independent of UpDimShape */
const VERTICES = [];
for (let i = 0; i < 16; i++) VERTICES.push([0, 1, 2, 3].map((k) => ((i >> (3 - k)) & 1 ? 1 : -1)));
const EDGES4 = [];
for (const p of VERTICES) for (const q of VERTICES) {
  const diff = p.filter((x, k) => x !== q[k]).length;
  if (diff === 1 && p.join() < q.join()) EDGES4.push([p, q]);
}
/** the hand-derived projection of a vertex at angle a */
const project = ([x, y, z, w], a) => {
  const z1 = z * Math.cos(a) - w * Math.sin(a), w1 = z * Math.sin(a) + w * Math.cos(a);
  return [x, y, z1].map((c) => c / (3 - w1));
};
const key = (seg) => seg.map((p) => p.map((c) => c.toFixed(9)).join(',')).sort().join(' | ');
const sameSegments = (A, B) => expect(A.map(key).sort()).toEqual(B.map(key).sort());

describe('tesseract-perspective: the edges (UpDimShape)', () => {
  it('Sqr, myCube and Tes have 4, 12 and 32 edges; Sqr in the original\'s order (Join, then Union)', () => {
    expect(Sqr).toEqual([[[-1, -1], [1, -1]], [[-1, 1], [1, 1]], [[-1, -1], [-1, 1]], [[1, -1], [1, 1]]]);
    expect(myCube.length).toBe(12);
    expect(Tes.length).toBe(32);
  });
  it('Tes is the tesseract: the 32 pairs of the 16 vertices {±1}^4 that differ in one coordinate, each once', () => {
    sameSegments(Tes, EDGES4);
    for (const [p, q] of Tes) expect(Math.hypot(...p.map((x, k) => x - q[k]))).toBe(2); // edge 2, not a unit cube (E-TT-01)
    const degree = new Map();
    for (const seg of Tes) for (const p of seg) degree.set(p.join(), (degree.get(p.join()) ?? 0) + 1);
    expect(degree.size).toBe(16);
    expect([...degree.values()].every((d) => d === 4)).toBe(true);
  });
  it('IncDim appends a coordinate; ConnectPoints pairs the flattened points in order (duplicates kept before Union)', () => {
    expect(IncDim([[[1], [2]]], -1)).toEqual([[[1, -1], [2, -1]]]);
    expect(ConnectPoints([[[0, -1], [1, -1]], [[1, -1], [2, -1]]], [[[0, 1], [1, 1]], [[1, 1], [2, 1]]]))
      .toEqual([[[0, -1], [0, 1]], [[1, -1], [1, 1]], [[1, -1], [1, 1]], [[2, -1], [2, 1]]]);
    // the cube's 4 joining edges come from 8 flattened points, sorted and without duplicates
    expect(myCube.slice(8)).toEqual([
      [[-1, -1, -1], [-1, -1, 1]], [[-1, 1, -1], [-1, 1, 1]], [[1, -1, -1], [1, -1, 1]], [[1, 1, -1], [1, 1, 1]]]);
  });
});

describe('tesseract-perspective: rotation and perspective', () => {
  it('PersPoint scales a point so that its last coordinate is d', () => {
    expect(PersPoint([1, 2, 3, -4], -1)).toEqual([0.25, 0.5, 0.75, -1]);
  });
  it('a = 0 (the opening state, snapshot 1): two nested cubes of half-sides 1/2 (w = 1) and 1/4 (w = −1), joined at the corners', () => {
    const E = edges(0);
    expect(E.length).toBe(32);
    const pts = new Set(E.flat().map((p) => p.join()));
    expect(pts.size).toBe(16);
    for (const s of [-0.5, 0.5]) for (const t of [-0.5, 0.5]) for (const u of [-0.5, 0.5]) expect(pts.has([s, t, u].join())).toBe(true);
    for (const s of [-0.25, 0.25]) for (const t of [-0.25, 0.25]) for (const u of [-0.25, 0.25]) expect(pts.has([s, t, u].join())).toBe(true);
  });
  it('the edges at each snapshot\'s angle are the hand-derived projection of the tesseract', () => {
    for (const k of Object.keys(fx.snapshots)) {
      const a = num(fx.snapshots[k].a);
      sameSegments(edges(a), EDGES4.map(([p, q]) => [project(p, a), project(q, a)]));
    }
  });
  it('a half turn gives the same picture as a = 0 (the two cubes change places); the slider\'s end 2·3.1416 is 1.5e-5 past a full turn', () => {
    sameSegments(edges(Math.PI), edges(0));
    const end = edges(2 * 3.1416), start = edges(0);
    let worst = 0;
    end.forEach((seg, i) => seg.forEach((p, j) => p.forEach((c, m) => { worst = Math.max(worst, Math.abs(c - start[i][j][m])); })));
    expect(worst).toBeGreaterThan(1e-7);
    expect(worst).toBeLessThan(1e-5);
  });
  it('the picture stays inside the plot range ±0.7 for every a: |x|, |y| ≤ 1/(3 − √2), |z| ≤ √14/7 (the tube radius 0.04 included)', () => {
    let mx = 0, mz = 0;
    for (let i = 0; i <= 2000; i++) {
      for (const p of edges((i / 2000) * 2 * 3.1416).flat()) { mx = Math.max(mx, Math.abs(p[0]), Math.abs(p[1])); mz = Math.max(mz, Math.abs(p[2])); }
    }
    expect(mx).toBeCloseTo(1 / (3 - Math.SQRT2), 6);
    expect(mz).toBeLessThanOrEqual(Math.sqrt(14) / 7 + 1e-12);
    expect(mz).toBeGreaterThan(Math.sqrt(14) / 7 - 1e-4);
    expect(mx + 0.04).toBeLessThan(0.7);
  });
});

describe('tesseract-perspective: the picture and the states', () => {
  it('the opening state is the notebook\'s live state and the Manipulate\'s initial value a = 0', () => {
    expect(initialState()).toEqual(fx.states[0]);
    expect(initialState()).toEqual(fx.specs);
  });
  it('the picture: 32 tubes of radius 0.04 in Lighter@Blue = RGBColor[1/3, 1/3, 1], CapForm["Round"], Specularity[White, 20]', () => {
    const { graphics, view } = evaluate({ a: num(fx.snapshots['2'].a) });
    const tubes = styledTubes(graphics);
    expect(tubes.length).toBe(32);
    for (const t of tubes) {
      expect(t.radius).toBe(0.04);
      expect(t.capForm).toBe('Round');
      expect(t.specularity).toEqual({ color: [1, 1, 1], exponent: 20 });
      t.color.forEach((c, k) => expect(c).toBeCloseTo([1 / 3, 1 / 3, 1][k], 15));
    }
    expect(tubes.map((t) => t.points)).toEqual(view.edges);
    expect(Lighter(RGBColor(1, 0, 0)).value.map((c) => +c.toFixed(12))).toEqual([1, +(1 / 3).toFixed(12), +(1 / 3).toFixed(12)]);
    // the shared flatten reads the same tubes (the two directives are ignored there)
    expect(flatten(graphics).filter((p) => p.type === 'tube').length).toBe(32);
  });
  it('the Graphics3D options of the original', () => {
    const { graphics } = evaluate(initialState());
    expect(graphics.options).toEqual({ PlotRange: PLOT_RANGE, Boxed: false, Lighting: 'Neutral', ImageSize: 440, SphericalRegion: true });
    expect(PLOT_RANGE).toEqual([[-0.7, 0.7], [-0.7, 0.7], [-0.7, 0.7]]);
  });
});
