// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Victor M. Baez and Nikhil Navkar
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/segment-distance.test.js — the model of "Shortest Distance between Two Line Segments": the original's
// functions on hand-made segments (expected values derived by hand), the body's branches and picture, the notebook's
// opening state and four snapshot settings, and the distance checked against an independent closest-points routine
// (shared/geometry.js SegmentsClosestPoints), which exposes the original's clamping error (DESIGN.md §11 E-SD-01).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, evaluate, drawShortestLineSeg, drawPerpLineSeg, drawClosestPointLineSegment, findClosestPointLineSegment,
  drawClosestDistanceBetweenLines, closestDistanceBetweenLines, segmentsData, roundedText, infinitePlane,
} from '../../demos/segment-distance/model.js';
import { flatten } from '../../shared/graphics3d.js';
import { SegmentsClosestPoints } from '../../shared/geometry.js';
import { Cross, Norm, Subtract } from '../../shared/wl.js';

const saved = JSON.parse(readFileSync(new URL('../golden/segment-distance.original-states.json', import.meta.url), 'utf8'));
const RED = [1, 0, 0], GREEN = [0, 1, 0], BLUE = [0, 0, 1], YELLOW = [1, 1, 0], WHITE = [1, 1, 1];
const close = (p, q) => p.forEach((x, k) => expect(x).toBeCloseTo(q[k], 12));
const ofType = (g, t) => flatten(g).filter((p) => p.type === t);

describe('segment-distance model', () => {
  it('the opening state equals the notebook\'s initial settings', () => {
    expect(initialState()).toEqual(saved.specs);
    expect(saved.states[0]).toEqual(saved.specs);
  });
  it('drawShortestLineSeg: red spheres 0.4 at both ends and a red tube 0.05', () => {
    const [s1, s2, t] = flatten(drawShortestLineSeg([0, 0, 0], [1, 2, 3]));
    expect(s1).toMatchObject({ type: 'sphere', centers: [[0, 0, 0]], radius: 0.4, color: RED });
    expect(s2.centers).toEqual([[1, 2, 3]]);
    expect(t).toMatchObject({ type: 'tube', points: [[0, 0, 0], [1, 2, 3]], radius: 0.05, color: RED });
  });
  it('drawPerpLineSeg: yellow segment, squares of side 0.5 along ua/uba at a and ub/−uba at b', () => {
    const g = drawPerpLineSeg([0, 0, 0], [0, 0, 2], [1, 0, 0], [0, 1, 0], true, true);
    const polys = ofType(g, 'polygon');
    expect(polys.map((p) => p.points)).toEqual([
      [[0, 0, 0], [0.5, 0, 0], [0.5, 0, 0.5], [0, 0, 0.5]],
      [[0, 0, 2], [0, 0.5, 2], [0, 0.5, 1.5], [0, 0, 1.5]],
    ]);
    expect(polys[0].color).toEqual(YELLOW);
    expect(ofType(g, 'tube')[0].radius).toBe(0.04);
    // only the mark at b, and none for a segment of length 0
    expect(ofType(drawPerpLineSeg([0, 0, 0], [0, 0, 2], null, [0, 1, 0], false, true), 'polygon').length).toBe(1);
    expect(ofType(drawPerpLineSeg([1, 1, 1], [1, 1, 1], [1, 0, 0], [0, 1, 0], true, true), 'polygon').length).toBe(0);
  });
  it('findClosestPointLineSegment: the projection, clamped to the segment', () => {
    expect(findClosestPointLineSegment([0, 1, 0], [-1, 0, 0], [1, 0, 0])).toEqual([0, 0, 0]);
    expect(findClosestPointLineSegment([3, 1, 0], [-1, 0, 0], [1, 0, 0])).toEqual([1, 0, 0]);
    expect(findClosestPointLineSegment([-3, 1, 5], [-1, 0, 0], [1, 0, 0])).toEqual([-1, 0, 0]);
    expect(findClosestPointLineSegment([2, 2, 2], [1, 1, 1], [1, 1, 1])).toEqual([1, 1, 1]);
  });
  it('drawClosestPointLineSegment: yellow to the projection on the line (beyond the end), red to the clamped point', () => {
    const g = drawClosestPointLineSegment([3, 1, 0], [-1, 0, 0], [1, 0, 0]);
    const tubes = ofType(g, 'tube');
    expect(tubes[0]).toMatchObject({ points: [[3, 1, 0], [3, 0, 0]], color: YELLOW });
    expect(tubes[1]).toMatchObject({ points: [[3, 1, 0], [1, 0, 0]], color: RED });
    // t = 2 > 0.5: the mark at the projection points along +lu and back along the yellow segment
    expect(ofType(g, 'polygon')[0].points).toEqual([[3, 0, 0], [3.5, 0, 0], [3.5, 0.5, 0], [3, 0.5, 0]]);
  });
  it('skew segments, closest points inside: distance 1 between (0,0,0) and (0,0,1)', () => {
    const a0 = [-1, 0, 0], a1 = [1, 0, 0], b0 = [0, -1, 1], b1 = [0, 1, 1];
    const s = segmentsData(a0, a1, b0, b1);
    expect(s.parallel).toBe(null);
    expect(s.t0).toBeCloseTo(1, 15); expect(s.t1).toBeCloseTo(1, 15);
    close(s.pAc, [0, 0, 0]); close(s.pBc, [0, 0, 1]);
    expect(closestDistanceBetweenLines(a0, a1, b0, b1)).toBeCloseTo(1, 15);
    const tubes = ofType(drawClosestDistanceBetweenLines(a0, a1, b0, b1), 'tube');
    expect(tubes.map((t) => t.color)).toEqual([RED, YELLOW]);
  });
  it('parallel segments: B before A, B after A (nearest end points, √5) and overlapping (line distance 2, red polygon)', () => {
    const a0 = [0, 0, 0], a1 = [1, 0, 0];
    expect(segmentsData(a0, a1, [-3, 1, 0], [-2, 1, 0])).toMatchObject({ parallel: 'before', d0: -3, d1: -2 });
    expect(closestDistanceBetweenLines(a0, a1, [-3, 1, 0], [-2, 1, 0])).toBeCloseTo(Math.sqrt(5), 15);
    expect(segmentsData(a0, a1, [3, 1, 0], [4, 1, 0]).parallel).toBe('after');
    expect(closestDistanceBetweenLines(a0, a1, [3, 1, 0], [4, 1, 0])).toBeCloseTo(Math.sqrt(5), 15);
    // anti-parallel, overlapping: projs = Sort[{0, 0.5, 3, 1}] = {0, 0.5, 1, 3}
    const b0 = [0.5, 2, 0], b1 = [3, 2, 0];
    expect(segmentsData(a0, a1, b0, b1).parallel).toBe('overlap');
    expect(closestDistanceBetweenLines(a0, a1, b0, b1)).toBe(2);
    const g = drawClosestDistanceBetweenLines(a0, a1, b0, b1);
    const [poly] = ofType(g, 'polygon');
    expect(poly).toMatchObject({ points: [[0.5, 0, 0], [0.5, 2, 0], [1, 2, 0], [1, 0, 0]], color: RED, opacity: 0.5 });
    expect(ofType(g, 'tube')[0].points).toEqual([[0.5, 0, 0], [0.5, 2, 0]]);
  });
  it('the planes: through AB and CD, both normal to the common perpendicular; nothing for a degenerate pair of vectors', () => {
    const { graphics } = evaluate(initialState());
    const planes = ofType(graphics, 'infinitePlane');
    expect(planes.map((p) => [p.color, p.opacity])).toEqual([[GREEN, 0.4], [BLUE, 0.4]]);
    const n = Cross([4, -2, 1], [6, 2, -1]); // (b − a) × (d − c)
    for (const p of planes) {
      const normal = Cross(Subtract(p.points[1], p.points[0]), Subtract(p.points[2], p.points[0]));
      expect(Norm(Cross(normal, n)) / (Norm(normal) * Norm(n))).toBeLessThan(1e-12);
    }
    expect(planes[0].points[0]).toEqual([-3, 3, 1]);
    expect(planes[1].points[0]).toEqual([4, -2, -2]);
    expect(infinitePlane([0, 0, 0], [[1, 0, 0], [0, 0, 0]])).toBe(null);
  });
  it('the other branches of the body: A = B, both segments points, intersecting segments (no planes)', () => {
    const base = { ...initialState() };
    const ab = evaluate({ ...base, axy: [0, 0], az: 3, bxy: [0, 0], bz: 3, cxy: [-2, 0], cz: 0, dxy: [2, 0], dz: 0 }).view;
    expect(ab).toMatchObject({ kind: 'A=B', dist: 3, planes: [false, false], label: 'minimum distance is 3.' });
    const cd = evaluate({ ...base, cxy: [0, 0], cz: 3, dxy: [0, 0], dz: 3, axy: [0, -2], az: 0, bxy: [0, 2], bz: 0 }).view;
    expect(cd).toMatchObject({ kind: 'C=D', dist: 3 });
    const pts = evaluate({ ...base, axy: [0, 0], az: 0, bxy: [0, 0], bz: 0, cxy: [3, 4], cz: 0, dxy: [3, 4], dz: 0 }).view;
    expect(pts).toMatchObject({ kind: 'points', dist: 5, label: 'minimum distance is 5.' });
    const x = evaluate({ ...base, axy: [-1, 0], az: 0, bxy: [1, 0], bz: 0, cxy: [0, -1], cz: 0, dxy: [0, 1], dz: 0 });
    expect(x.view).toMatchObject({ dist: 0, planes: [false, false], label: 'minimum distance is 0.' });
    // A = B draws no segment AB (no InfiniteLine, no tube of AB)
    const g = evaluate({ ...base, axy: [0, 0], az: 3, bxy: [0, 0], bz: 3 }).graphics;
    expect(ofType(g, 'infiniteLine').length).toBe(1);
  });
  it('the picture: green and blue end points, infinite lines, white labels A–D (FontSize 14), options of the original', () => {
    const { graphics, view } = evaluate(initialState());
    const prims = flatten(graphics);
    expect(prims[0]).toMatchObject({ type: 'sphere', centers: [[-3, 3, 1]], radius: 0.4, color: GREEN });
    expect(prims.filter((p) => p.type === 'sphere' && p.color.join() === BLUE.join()).map((p) => p.centers[0])).toEqual([[-2, -4, -1], [4, -2, -2]]);
    expect(ofType(graphics, 'infiniteLine').map((p) => p.color)).toEqual([GREEN, BLUE]);
    const texts = ofType(graphics, 'text');
    expect(texts.map((t) => [t.expr, t.pos, t.color, t.fontSize])).toEqual([
      ['A', [-3, 3, 1], WHITE, 14], ['B', [1, 1, 2], WHITE, 14], ['C', [-2, -4, -1], WHITE, 14], ['D', [4, -2, -2], WHITE, 14],
    ]);
    expect(graphics.options).toMatchObject({ Axes: true, PlotRange: [[-5.2, 5.2], [-5.2, 5.2], [-5.2, 5.2]], ImageSize: [450, 400] });
    expect(graphics.options.AxesLabel).toEqual(['<i>x</i>', '<i>y</i>', '<i>z</i>']);
    expect(graphics.options.PlotLabel).toBe(view.label);
  });
  it('roundedText: Round[dist, 0.01] as a machine real', () => {
    expect(roundedText(5.5079)).toBe('5.51');
    expect(roundedText(Math.sqrt(200))).toBe('14.14');
    expect(roundedText(4.999)).toBe('5.');
    expect(roundedText(0)).toBe('0.');
  });
  it('the distance never undercuts the true segment distance and equals it when no clamping is needed (seeded random cases)', () => {
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const pt = () => [0, 1, 2].map(() => Math.round((rnd() * 10 - 5) * 100) / 100);
    let inside = 0;
    for (let i = 0; i < 2000; i++) {
      const a = pt(), b = pt(), c = pt(), d = pt();
      const ours = closestDistanceBetweenLines(a, b, c, d), truth = SegmentsClosestPoints([a, b], [c, d]).distance;
      expect(ours).toBeGreaterThan(truth - 1e-9);
      const s = segmentsData(a, b, c, d);
      if (s.t0 >= 0 && s.t0 <= s.magA && s.t1 >= 0 && s.t1 <= s.magB) { inside++; expect(ours).toBeCloseTo(truth, 9); }
    }
    expect(inside).toBeGreaterThan(50);
  });
  const shown = { 1: '5.51', 2: '5.35', 3: '14.14', 4: '3.42' }; // the PlotLabels of the snapshot pictures
  for (const [k, s] of Object.entries(saved.snapshots)) {
    it(`snapshot ${k}: evaluates without error and shows the original's minimum distance ${shown[k]}`, () => {
      const { view, graphics } = evaluate(s);
      expect(view.label).toBe(`minimum distance is ${shown[k]}`);
      expect(ofType(graphics, 'text').length).toBe(4);
      expect(view.planes).toEqual([s.showPlaneAB, s.showPlaneCD]);
      const truth = SegmentsClosestPoints([view.a, view.b], [view.c, view.d]).distance;
      // E-SD-01: at snapshots 1 and 2 the original's clamping gives more than the true distance (5.2684 shown as 5.51 (5.5067);
      // 5.3463 vs 5.3472, both shown as 5.35); at 3 and 4 it is exact
      if (k === '1') { expect(truth).toBeCloseTo(5.2684, 4); expect(view.dist).toBeCloseTo(5.50669, 5); }
      else if (k === '2') { expect(truth).toBeCloseTo(5.34629, 5); expect(view.dist).toBeCloseTo(5.34720, 5); }
      else expect(view.dist).toBeCloseTo(truth, 9);
      if (k === '3') {
        expect(view.kind).toBe('overlap');
        expect(view.dist).toBeCloseTo(Math.sqrt(200), 12);
        const [poly] = ofType(graphics, 'polygon');
        expect(poly.opacity).toBe(0.5);
        poly.points.forEach((p, i) => close(p, [[-0.7, 5, 5], [-0.7, -5, -5], [5, -5, -5], [5, 5, 5]][i]));
      } else expect(view.kind).toBe('skew');
    });
  }
});
