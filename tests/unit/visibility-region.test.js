// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/visibility-region.test.js — the model of "Visibility Region of a Polygon": the original's helper
// definitions, the opening state from the notebook, the sweep's intermediate steps as the snapshot pictures show them
// (sorted vertices, active edge, J list, partial region), the region itself against an independent ray-casting
// visibility polygon, and the original's nudges and quirks. Expected values derived by hand (rays from p through the
// polygon's corners) or read off the snapshot pictures.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  lineList, vector, normalVector, vertexList, λ, LineIntersectionPoint, SegmentIntersectionQ, getAngle,
  intersectInteriorQRev2, getClockwiseAngle, testpoint, glancingBlow, reflex, extendedLine, pointOnSegmentQ,
  leftOrRight, noIntersection, angleSortCond, distSortCond, visibility, evaluate, initialState, POLYGON, SAVED_PTS,
} from '../../demos/visibility-region/model.js';
import { annotation, Cases } from '../../shared/graphics.js';

const saved = JSON.parse(readFileSync(new URL('../golden/visibility-region.original-states.json', import.meta.url), 'utf8'));
const close = (a, b, d = 9) => { expect(a.length).toBe(b.length); a.forEach((x, i) => (Array.isArray(x) ? close(x, b[i], d) : expect(x).toBeCloseTo(b[i], d))); };
const withP = (p) => SAVED_PTS.map((v, i) => (i === 12 ? p : [...v]));
const P1 = [-1.83, 0.47]; // the saved state and snapshot 1
const P2 = saved.snapshots['2'].pts[12]; // snapshots 2–5: (−1.69, 0.65)
const W = 6 * (2 * 0.707107) / Math.SQRT2; // the workspace's corners: 8.485284/√2 = 6.0000019

// an independent visibility polygon: rays from p a hair (1e-10) to either side of every corner, each ending at the
// nearest wall (polygon and workspace edges) — the textbook construction, not the original's sweep
const area = (P) => Math.abs(P.reduce((s, v, i) => { const q = P[(i + 1) % P.length]; return s + v[0] * q[1] - q[0] * v[1]; }, 0)) / 2;
function rayCastRegion(p) {
  const poly = POLYGON.map(([x, y]) => [1.5 * x, 1.5 * y]), ws = [[W, -W], [W, W], [-W, W], [-W, -W]];
  const edges = [ws, poly].flatMap((P) => P.map((v, i) => [v, P[(i + 1) % P.length]]));
  const hit = (t) => {
    const d = [Math.cos(t), Math.sin(t)];
    let best = Infinity;
    for (const [a, b] of edges) {
      const e = [b[0] - a[0], b[1] - a[1]], den = d[0] * e[1] - d[1] * e[0];
      if (Math.abs(den) < 1e-15) continue;
      const ap = [a[0] - p[0], a[1] - p[1]];
      const s = (ap[0] * e[1] - ap[1] * e[0]) / den, u = (ap[0] * d[1] - ap[1] * d[0]) / den;
      if (s > 1e-12 && u >= 0 && u <= 1) best = Math.min(best, s);
    }
    return [p[0] + best * d[0], p[1] + best * d[1]];
  };
  const ts = [...ws, ...poly].flatMap(([x, y]) => { const t = Math.atan2(y - p[1], x - p[0]); return [t - 1e-10, t + 1e-10]; });
  return ts.sort((a, b) => a - b).map(hit);
}

describe('visibility-region model: the original helper definitions', () => {
  it('lineList, vertexList, vector, normalVector, λ: edges, vertex triples, the right-hand normal, the line parameter', () => {
    const tri = [[0, 0], [1, 0], [0, 1]];
    expect(lineList(tri)).toEqual([[[0, 0], [1, 0]], [[1, 0], [0, 1]], [[0, 1], [0, 0]]]);
    expect(vertexList(tri)).toEqual([[[0, 0], [1, 0], [0, 1]], [[1, 0], [0, 1], [0, 0]], [[0, 1], [0, 0], [1, 0]]]);
    expect(vector([[1, 2], [4, 6]])).toEqual([3, 4]);
    expect(normalVector([[0, 0], [2, 0]])).toEqual([0, -1]); // right of the direction +x
    expect(normalVector([[1, 1], [1, 4]])).toEqual([1, 0]);
    expect(λ([[0, 0], [4, 0]])([1, 5])).toBe(0.25);
  });
  it('LineIntersectionPoint: (Det[{a, b}](c − d) − Det[{c, d}](a − b))/Det[{a − b, c − d}]', () => {
    expect(LineIntersectionPoint([[[0, 0], [2, 2]], [[0, 2], [2, 0]]])).toEqual([1, 1]);
    close(LineIntersectionPoint([[[1, 0], [1, 5]], [[-3, 2], [7, 2]]]), [1, 2], 14); // also beyond the segments' ends
  });
  it('SegmentIntersectionQ: a crossing inside both; touching at an end point, parallel or beyond an end is no intersection', () => {
    expect(SegmentIntersectionQ([[[0, 0], [2, 2]], [[0, 2], [2, 0]]])).toBe(true);
    expect(SegmentIntersectionQ([[[0, 0], [1, 1]], [[1, 1], [2, 0]]])).toBe(false); // common end point
    expect(SegmentIntersectionQ([[[0, 0], [2, 0]], [[1, 0], [1, 1]]])).toBe(false); // T: one ends on the other
    expect(SegmentIntersectionQ([[[0, 0], [2, 0]], [[0, 1], [2, 1]]])).toBe(false); // parallel
    expect(SegmentIntersectionQ([[[0, 0], [1, 0]], [[2, -1], [2, 1]]])).toBe(false); // λ = 2
    // the crossing is rounded to 1e-7 first: 3e-8 from an end point counts as the end point (Q-VR-05)
    expect(SegmentIntersectionQ([[[0, 0], [1, 0]], [[1 - 3e-8, -1], [1 - 3e-8, 1]]])).toBe(false);
    expect(SegmentIntersectionQ([[[0, 0], [1, 0]], [[1 - 3e-7, -1], [1 - 3e-7, 1]]])).toBe(true);
  });
  it('getAngle in [0, 2π); getClockwiseAngle is the angle turned counter-clockwise from p3 − p2 to p1 − p2', () => {
    expect(getAngle([[0, 0], [1, 0]])).toBe(0);
    expect(getAngle([[1, 1], [0, 1]])).toBeCloseTo(Math.PI, 15);
    expect(getAngle([[0, 0], [0, -1]])).toBeCloseTo(1.5 * Math.PI, 15);
    expect(getClockwiseAngle([0, 1], [0, 0], [1, 0])).toBeCloseTo(Math.PI / 2, 15);
    expect(getClockwiseAngle([0, -1], [0, 0], [1, 0])).toBeCloseTo(1.5 * Math.PI, 15);
    expect(getClockwiseAngle([2, 0], [0, 0], [1, 0])).toBe(0); // Chop
    expect(getClockwiseAngle([-1, 0], [0, 0], [1, 0])).toBeCloseTo(Math.PI, 15);
  });
  it('intersectInteriorQRev2: p inside the wedge turned from w3 to w1 at w2; an angle 0 counts as 6.28319', () => {
    const w = [[0, 1], [0, 0], [1, 0]]; // the wedge of angle π/2 from (1, 0) to (0, 1)
    expect(intersectInteriorQRev2([1, 1], w)).toBe(true);
    expect(intersectInteriorQRev2([-1, -1], w)).toBe(false);
    expect(intersectInteriorQRev2([2, 0], w)).toBe(false); // along w3: b = 0 → 6.28319
  });
  it('reflex: Chop[Det[{{1, x1, y1}, {1, x2, y2}, {1, x3, y3}}]] > 0; glancingBlow: the neighbours on different sides of the ray', () => {
    expect(reflex([0, 0], [1, 0], [0, 1])).toBe(true); // counter-clockwise, determinant 1
    expect(reflex([0, 1], [1, 0], [0, 0])).toBe(false);
    expect(reflex([0, 0], [1, 1], [2, 2])).toBe(false); // collinear: 0
    // p = (0, 0), vertex (2, 0): neighbours above and below the ray → True (the ray crosses the wall, no glancing blow)
    expect(glancingBlow([0, 0], [[2, 1], [2, 0], [2, -1]])).toBe(true);
    expect(glancingBlow([0, 0], [[3, 1], [2, 0], [1, 1]])).toBe(false); // both above: the ray grazes the corner
  });
  it('testpoint: winding number about pt not 0, for either orientation', () => {
    const sq = [[0, 0], [1, 0], [1, 1], [0, 1]];
    expect(testpoint(sq, [0.5, 0.5])).toBe(true);
    expect(testpoint([...sq].reverse(), [0.5, 0.5])).toBe(true);
    expect(testpoint(sq, [2, 0.5])).toBe(false);
  });
  it('pointOnSegmentQ: |cross| < 1e-10 and strictly between the end points', () => {
    const s = [[0, 0], [2, 0]];
    expect(pointOnSegmentQ(s, [1, 0])).toBe(true);
    expect(pointOnSegmentQ(s, [0, 0])).toBe(false);
    expect(pointOnSegmentQ(s, [2, 0])).toBe(false);
    expect(pointOnSegmentQ(s, [3, 0])).toBe(false);
    expect(pointOnSegmentQ(s, [1, 1e-11])).toBe(true); // cross 2e-11 is Chopped
    expect(pointOnSegmentQ(s, [1, 1e-9])).toBe(false);
  });
  it('leftOrRight (True on the right or on the line), noIntersection, extendedLine', () => {
    expect(leftOrRight([0, 0], [1, 0], [0.5, -1])).toBe(true);
    expect(leftOrRight([0, 0], [1, 0], [0.5, 1])).toBe(false);
    expect(leftOrRight([0, 0], [1, 0], [3, 0])).toBe(true);
    expect(noIntersection([0, 0], [2, 2], [[[0, 2], [2, 0]]])).toBe(false);
    expect(noIntersection([0, 0], [2, 2], [[[3, 0], [3, 1]], [[1, 1], [2, 0]]])).toBe(true); // touching an end point is no crossing
    expect(noIntersection([0, 0], [2, 2], [])).toBe(true);
    expect(extendedLine([1, 1], [4, 5])).toEqual([[1, 1], [25, 33]]); // 40 along (3, 4)/5
  });
  it('angleSortCond (by angle, ties by distance) and distSortCond (by distance of the crossing)', () => {
    const o = [0, 0], t = (v) => [[9, 9], v, [9, 9]];
    expect(angleSortCond(o, t([1, 1]), t([-1, 1]))).toBe(true);
    expect(angleSortCond(o, t([-1, 1]), t([1, 1]))).toBe(false);
    expect(angleSortCond(o, t([1, 1]), t([2, 2]))).toBe(true); // the same angle: the nearer first
    expect(angleSortCond(o, t([2, 2]), t([1, 1]))).toBe(false);
    const ray = [[0, 0], [10, 0]];
    expect(distSortCond(ray, [[3, -1], [3, 1]], [[5, -1], [5, 1]], o)).toBe(true);
    expect(distSortCond(ray, [[5, -1], [5, 1]], [[3, -1], [3, 1]], o)).toBe(false);
  });
});

describe('visibility-region model: the Manipulate', () => {
  it("the opening state is the notebook's saved state, which is also its stored initial settings (step 3, m = 40)", () => {
    const num = (x) => (Array.isArray(x) ? x.map(num) : x);
    expect(initialState()).toEqual({ s: saved.states[0].s, m: saved.states[0].m, pts: num(saved.states[0].pts) });
    expect(saved.specs).toEqual(saved.states[0]);
    const s = initialState(); s.pts[12][0] = 99;
    expect(initialState().pts[12][0]).toBe(-1.83); // a copy each time
  });
  it('the polygons: the workspace 8.485284 CirclePoints[4] (corners ±6.0000019) and the 36-vertex building 1.5 Reverse@{…}', () => {
    const r = visibility(withP([3.1, -3.3])); // a point inside the building: both lists reversed (clockwise)
    expect(r.inside).toBe(true);
    expect(r.workspace).toHaveLength(4);
    for (const v of r.workspace) { expect(Math.abs(v[0])).toBeCloseTo(6.0000018567, 9); expect(Math.abs(v[1])).toBe(Math.abs(v[0])); }
    expect(r.complexPoly).toHaveLength(36);
    expect(r.complexPoly[0]).toEqual([-3, -5.25]); // 1.5 {−2, −3.5}: Reverse twice
    // signed areas: 1.5 Reverse@{…} is counter-clockwise; reversed again for a point inside, clockwise
    const signed = (P) => P.reduce((s, v, i) => { const q = P[(i + 1) % P.length]; return s + v[0] * q[1] - q[0] * v[1]; }, 0) / 2;
    expect(signed(r.complexPoly)).toBeLessThan(0);
    expect(signed(r.workspace)).toBeLessThan(0);
    // hand: the square 7 × 7 less the seven cut-outs 2.25 + 1 + 1.5 + 1 + 1.25 + 0.25 + 1.75 = 9 → 40, times 1.5²
    expect(signed(POLYGON.map(([x, y]) => [1.5 * x, 1.5 * y]).reverse())).toBeCloseTo(1.5 * 1.5 * 40, 9);
    expect(r.m).toBe(40);
  });
  it('the saved state: p = (−1.83, 0.47) inside; the first ray meets the wall x = 5.25; 40 vertices sorted by angle from p', () => {
    const r = visibility(withP(P1));
    expect(r.p).toEqual(P1);
    expect(r.inside).toBe(true);
    close(r.fvPoint, [5.25, 0.47], 14);
    const mid = r.sortedList.map((t) => t[1]);
    expect(mid).toHaveLength(42); // {p, fvPoint}, the 40 triples, {p, fvPoint}
    // angles from p by hand: (5.25, 3) 0.3427, (5.25, 3.75) 0.4338, (2.25, 3) 0.5554, (5.25, 5.25) 0.5936, (W, W) 0.6149
    close(mid.slice(1, 6), [[5.25, 3], [5.25, 3.75], [2.25, 3], [5.25, 5.25], [W, W]], 12);
    close(mid.slice(-3, -1), [[5.25, -1.5], [5.25, -0.75]], 12); // the last ones just below the first ray
    const angles = mid.slice(1, -1).map((v) => getAngle([P1, v]));
    for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeGreaterThanOrEqual(angles[i - 1]);
    // one tie: (0, −0.75) and (2.25, −2.25) lie on one ray from p (slope −1.22/1.83 = −2.72/4.08 = −2/3): nearer first
    expect(mid.slice(34, 36)).toEqual([[0, -0.75], [2.25, -2.25]]);
    expect(angles[33]).toBe(angles[34]);
    // the first J list: the two walls the ray crosses, nearest first, as reversed edges
    close(r.JlineList[0], [[[5.25, -0.75], [5.25, 3]], [[W, -W], [W, W]]], 12);
    expect(r.JlineList[1]).toEqual(r.JlineList[0]);
  });
  it('step 3 (snapshot 1): the vertex (5.25, 3.75) hidden behind y = 3; orange triangle p, fv, (5.25, 3); J list after vertex 1 (Q-VR-03)', () => {
    const { view, graphics, state } = evaluate(initialState());
    expect(state.m).toBe(40);
    expect(view.step).toBe(3);
    expect(view.vertex).toEqual([5.25, 3.75]);
    expect(view.angle).toBeCloseTo(Math.atan2(3.28, 7.08), 14);
    close(view.partial, [P1, [5.25, 0.47], [5.25, 3], P1], 12);
    expect(view.activeEdge).toEqual([[5.25, 3], [2.25, 3]]);
    close(view.jList, [[[W, -W], [W, W]], [[5.25, 3], [2.25, 3]]], 12); // the edge x = 5.25 left at its end (5.25, 3)
    // the picture: the step's ray and arc, the orange edge, two green lines, 21 red points
    expect(annotation(graphics, 'sweep-ray').g.pts).toEqual([P1, [5.25, 3.75]]);
    expect(annotation(graphics, 'angle-arc').g.angles[1]).toBeCloseTo(view.angle, 15);
    expect(annotation(graphics, 'active-edge').g.pts).toEqual([[5.25, 3], [2.25, 3]]);
    expect(annotation(graphics, 'j-list').g.pts).toHaveLength(2);
    expect(annotation(graphics, 'visible-points').g.pts).toHaveLength(21);
    expect(Cases(graphics, 'Polygon')).toHaveLength(4);
  });
  it('the region of the saved state: the 21 corners of snapshot 1, where rays from p through corners meet the walls', () => {
    const r = visibility(withP(P1));
    // e.g. through (2.25, 3.75) to y = 5.25: x = −1.83 + 4.08 · 4.78/3.28 = 4.11585; through (−2.25, 0.75) to x = −5.25:
    // y = 0.47 + 0.28 · 3.42/0.42 = 2.75; through (−2.25, 0) to y = −3: x = −1.83 − 0.42 · 3.47/0.47 = −4.93085
    // (2.25, −2.25) is the glancing ray past (0, −0.75) — the two are on one ray from p — moved off the line by the
    // original's 0.00001 nudge (tb): it meets the wall x = 2.25 a little above the corner
    close(r.visibleList, [[5.25, 3], [2.25, 3], [2.25, 3.75], [4.11585, 5.25], [3.04447, 5.25], [0.75, 3], [-2.25, 3],
      [-2.62352, 5.25], [-5.25, 5.25], [-5.25, 2.75], [-2.25, 0.75], [-2.25, 0], [-4.93085, -3], [-3, -3], [-3, -5.25],
      [-1.5, -5.25], [-1.5, -0.75], [0, -0.75], [2.25, -2.25], [2.25, -0.75], [5.25, -0.75]], 4);
    expect(r.visibleList[18][1]).toBeGreaterThan(-2.25);
    expect(area(r.visibleList)).toBeCloseTo(area(rayCastRegion(P1)), 3); // the nudge's sliver: 3e-5
  });
  it('snapshots 2–5 (p = (−1.69, 0.65)): the left wall at 1.2857 and the strip to the lower right corner; steps 10, 38 and 42', () => {
    const r = visibility(withP(P2));
    expect(r.visibleList).toHaveLength(23);
    // through (−2.25, 0.75) to x = −5.25: 0.65 + 0.1 · 3.56/0.56; through (0, −0.75) and (2.25, −2.25) to x = 5.25
    close(r.visibleList[9], [-5.25, 0.65 + (0.1 * 3.56) / 0.56], 12);
    close(r.visibleList.slice(18, 20), [[5.25, 0.65 - (1.4 * 6.94) / 1.69], [5.25, 0.65 - (2.9 * 6.94) / 3.94]], 12);
    expect(area(r.visibleList)).toBeCloseTo(area(rayCastRegion(P2)), 6);
    const at = (s) => evaluate({ s, m: 40, pts: withP(P2) }).view;
    // snapshot 3 (step 10): the ray to (−1.5, 3.75); four green lines (top wall, y = 5.25, y = 3.75, y = 3), orange y = 3
    const v10 = at(10);
    expect(v10.vertex).toEqual([-1.5, 3.75]);
    expect(v10.activeEdge).toEqual([[0.75, 3], [-2.25, 3]]);
    close(v10.jList, [[[5.25, 5.25], [-1.5, 5.25]], [[W, W], [-W, W]], [[0.75, 3], [-2.25, 3]], [[0.75, 3.75], [-1.5, 3.75]]], 12);
    expect(v10.partial).toHaveLength(9);
    // snapshot 4 (step 38): the ray to (3, −1.5); orange x = 2.25; green: right wall, x = 5.25, x = 2.25, x = 3
    const v38 = at(38);
    expect(v38.vertex).toEqual([3, -1.5]);
    expect(v38.activeEdge).toEqual([[2.25, -2.25], [2.25, -0.75]]);
    close(v38.jList, [[[W, -W], [W, W]], [[5.25, -5.25], [5.25, -1.5]], [[2.25, -2.25], [2.25, -0.75]], [[3, -2.25], [3, -1.5]]], 12);
    // snapshot 5 (step 42): the whole region, no orange edge, the ray back to fv and a full circle (N-VR-03)
    const v42 = at(42);
    expect(v42.partial).toEqual(r.visibleList);
    expect(v42.activeEdge).toEqual([[], []]);
    close(v42.vertex, [5.25, 0.65], 12);
    expect(v42.angle).toBeCloseTo(2 * Math.PI, 15); // fvPoint a hair below p's line
    close(v42.jList, [[[W, -W], [W, W]], [[5.25, -0.75], [5.25, 3]]], 12);
  });
  it("every step of the notebook's snapshot point evaluates: the orange region grows to the whole region", () => {
    let last = 0;
    for (let s = 1; s <= 42; s++) {
      const { view, graphics } = evaluate({ s, m: 40, pts: withP(P2) });
      expect(view.step).toBe(s);
      const a = view.partial.length > 2 ? area(view.partial) : 0;
      expect(a).toBeGreaterThanOrEqual(last - 1e-9);
      last = a;
      expect(annotation(graphics, 'sweep-ray').g.pts[1]).toEqual(view.vertex);
    }
    expect(last).toBeCloseTo(area(rayCastRegion(P2)), 6);
  });
  it('the region equals a ray-casting visibility polygon at points inside the building and between its walls', () => {
    // inside: the rooms; outside (the building then is an obstacle, the workspace the boundary): the corridor between
    // the right wall and the workspace, the corner outside, the two slots below y = 3.75 and the notch at the bottom
    const inside = [[3.1, -3.3], [-4, 4.1], [0.3, -1.1], [4.4, 1.3], [1.1, 4.4], [-0.3, 2.6], [-4.5, -1.2]];
    const outside = [[5.6, 0.2], [-5.7, -5.5], [-0.3, 3.2], [4, 3.3], [2.6, -5]];
    for (const [p, ins] of [...inside.map((p) => [p, true]), ...outside.map((p) => [p, false])]) {
      const r = visibility(withP(p));
      expect(r.inside).toBe(ins);
      expect(area(r.visibleList)).toBeCloseTo(area(rayCastRegion(r.p)), 6);
    }
  });
  it('the nudges: p beyond ±6 is clamped; on an edge it moves 0.00001 inward; on any vertex by 0.00001 (v35 − v1) (E-VR-01)', () => {
    expect(visibility(withP([7, -9])).p).toEqual([6, -6]); // the locator's own range already keeps it inside
    close(visibility(withP([0, 3])).p, [0, 3 - 0.00001], 15); // the wall y = 3 from (−2.25, 3) to (0.75, 3): below is inside
    // vertices: always (−0.000015, +0.0000225), the bisector of none of them
    for (const v of [[2.25, 3], [5.25, 3], [-3, -5.25]]) close(visibility(withP(v)).p, [v[0] - 0.000015, v[1] + 0.0000225], 15);
    expect(visibility(withP([2.25, 3])).inside).toBe(true); // a reflex corner: still inside
    expect(visibility(withP([5.25, 3])).inside).toBe(false); // a convex corner: pushed out into the slot
  });
  it('level with two corners (E-VR-02): p = (−1.69, 0.75) misses the triangle (−5.25, 5.25), (−5.25, 0.75), (−2.25, 0.75)', () => {
    const p = [-1.69, 0.75]; // two arrow-key steps (0.05) above snapshot 2's point reach 0.7500000000000004: the same
    const r = visibility(withP(p));
    const missing = 0.5 * 3 * 4.5;
    expect(area(rayCastRegion(p)) - area(r.visibleList)).toBeCloseTo(missing, 6);
    close(r.visibleList.slice(8, 10), [[-5.25, 5.25], [-2.25, 0.75]], 12); // straight from the corner to (−2.25, 0.75)
    const r2 = visibility(withP([P2[0], 0.6500000000000004 + 0.05 + 0.05]));
    expect(area(r2.visibleList)).toBeCloseTo(area(r.visibleList), 6);
  });
  it('the picture of the opening state: outlines, region, step, point, arc, ray, edges and points in the original order and styles', () => {
    const { graphics } = evaluate(initialState());
    const ids = ['polygon', 'workspace', 'visibility-region', 'partial-region', 'reference-point', 'angle-arc', 'sweep-ray', 'active-edge', 'j-list', 'visible-points'];
    const found = ids.map((id) => annotation(graphics, id));
    expect(found.every(Boolean)).toBe(true);
    const st = Object.fromEntries(ids.map((id, i) => [id, found[i].style]));
    expect(st.polygon.face).toBe(null); // Transparent
    expect(st.polygon.edge.thickness).toEqual({ abs: 0.25 }); // Thin
    expect(st['visibility-region'].color).toEqual([1, 1, 0]);
    expect(st['visibility-region'].opacity).toBe(0.5);
    close(st['visibility-region'].edge.color, [0.9, 0.8, 0.9], 12); // Lighter[Purple, 0.8]
    expect(st['partial-region'].opacity).toBe(0.3);
    expect(st['reference-point'].pointSize).toEqual({ abs: 4.4 }); // Medium (N-VR-02)
    expect(st['sweep-ray'].opacity).toBe(0.4);
    expect(st['active-edge'].thickness).toBe(0.01);
    expect(st['j-list'].thickness).toBe(0.005);
    expect(st['j-list'].color).toEqual([0, 1, 0]);
    expect(st['visible-points'].color).toEqual([1, 0, 0]);
    expect(annotation(graphics, 'angle-arc').g.r).toBe(0.2);
  });
  it('step 1 of the saved point: the arc {0, 0} is empty (fvPoint exactly on p’s line) and the region of step 1 has two points', () => {
    const { view, graphics } = evaluate({ ...initialState(), s: 1 });
    expect(view.angle).toBe(0);
    expect(annotation(graphics, 'angle-arc')).toBe(null);
    expect(view.partial).toHaveLength(2); // Polygon[{p, fvPoint}]
    close(view.vertex, [5.25, 0.47], 14);
  });
});
