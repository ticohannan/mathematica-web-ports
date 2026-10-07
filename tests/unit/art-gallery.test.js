// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/art-gallery.test.js — visibility geometry and Manipulate body of the art gallery port. Expected values
// are derived by hand from the original's formulas, or computed by an INDEPENDENT reference below (angular ray casting
// of the true visibility polygon), never by the code under test (R-16).
import { describe, it, expect } from 'vitest';
import {
  testpoint, lineList, vertexList, getAngle, λ, LineIntersectionPoint, SegmentIntersectionQ, pointOnSegmentQ,
  getClockwiseAngle, intersectInteriorQRev2, reflex, glancingBlow, extendedLine, leftOrRight, normalVector,
  noIntersection, visiblePolys, normCorrectlyRounded, NORMALIZE_MODELS, sameQ,
} from '../../demos/art-gallery/visibility.js';
import {
  initialState, evaluate, environment, clampPt, CUBICLE_POLY, IRREGULAR_POLY, INVISIBLE_POLY, BOUND, INITIAL_PTS,
} from '../../demos/art-gallery/model.js';

// ---- independent reference: the true visibility polygon by angular ray casting --------------------------------
function referenceVisibility(polys, p) {
  const segs = polys.flatMap((poly) => poly.map((v, i) => [v, poly[(i + 1) % poly.length]]));
  const angles = [];
  for (const poly of polys) for (const v of poly) { const a = Math.atan2(v[1] - p[1], v[0] - p[0]); angles.push(a - 1e-9, a, a + 1e-9); }
  angles.sort((x, y) => x - y);
  return angles.map((a) => {
    const d = [Math.cos(a), Math.sin(a)];
    let best = Infinity;
    for (const [s, e] of segs) {
      const ex = e[0] - s[0], ey = e[1] - s[1], den = d[0] * ey - d[1] * ex;
      if (Math.abs(den) < 1e-15) continue;
      const wx = s[0] - p[0], wy = s[1] - p[1];
      const t = (wx * ey - wy * ex) / den, u = (wx * d[1] - wy * d[0]) / den;
      if (t > 1e-12 && u >= -1e-12 && u <= 1 + 1e-12 && t < best) best = t;
    }
    return [p[0] + best * d[0], p[1] + best * d[1]];
  });
}
const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - a[1] * b[0]; } return Math.abs(s / 2); };
const has = (list, q, tol = 1e-12) => list.some((r) => Math.abs(r[0] - q[0]) <= tol && Math.abs(r[1] - q[1]) <= tol);
const env = (reg) => environment(reg, INITIAL_PTS).listofPoly;
const S2 = 0.7071067811865475; // N[1/Sqrt[2]] as it appears in the original's saved data

describe('art-gallery geometry helpers', () => {
  it('lineList closes the polygon and vertexList gives consecutive triples', () => {
    const t = [[0, 0], [1, 0], [0, 1]];
    expect(lineList(t)).toEqual([[[0, 0], [1, 0]], [[1, 0], [0, 1]], [[0, 1], [0, 0]]]);
    expect(vertexList(t)).toEqual([[[0, 0], [1, 0], [0, 1]], [[1, 0], [0, 1], [0, 0]], [[0, 1], [0, 0], [1, 0]]]);
  });
  it('getAngle returns the direction in [0, 2 Pi)', () => {
    expect(getAngle([[0, 0], [1, 0]])).toBe(0);
    expect(getAngle([[0, 0], [0, 1]])).toBeCloseTo(Math.PI / 2, 15);
    expect(getAngle([[0, 0], [-1, 0]])).toBeCloseTo(Math.PI, 15);
    expect(getAngle([[1, 1], [1, 0]])).toBeCloseTo(1.5 * Math.PI, 14);
  });
  it('testpoint: inside and outside, in either orientation', () => {
    const sq = [[0, 0], [2, 0], [2, 2], [0, 2]];
    expect(testpoint(sq, [1, 1])).toBe(true);
    expect(testpoint(sq.slice().reverse(), [1, 1])).toBe(true);
    expect(testpoint(sq, [3, 1])).toBe(false);
    expect(testpoint(CUBICLE_POLY, [0, 0])).toBe(true);
    expect(testpoint(CUBICLE_POLY, [-2.5, 0.25])).toBe(false); // inside the left wall arm
  });
  it('LineIntersectionPoint of the diagonals of a square is its centre', () => {
    expect(LineIntersectionPoint([[[0, 0], [2, 2]], [[0, 2], [2, 0]]])).toEqual([1, 1]);
  });
  it('lambda is the parameter of the projection along the segment', () => {
    expect(λ([[0, 0], [2, 0]])([0.5, 3])).toBe(0.25);
    expect(λ([[0, 0], [2, 0]])([2, 0])).toBe(1);
  });
  it('SegmentIntersectionQ: a proper crossing counts', () => {
    expect(SegmentIntersectionQ([[[0, 0], [2, 2]], [[0, 2], [2, 0]]])).toBe(true);
  });
  it('SegmentIntersectionQ: end points, T-junctions, parallel and collinear segments do not count', () => {
    expect(SegmentIntersectionQ([[[0, 0], [1, 0]], [[1, -1], [1, 1]]])).toBe(false); // at an end point (strict 0 < λ < 1)
    expect(SegmentIntersectionQ([[[0, 0], [2, 0]], [[1, 0], [1, 1]]])).toBe(false); // T-junction
    expect(SegmentIntersectionQ([[[0, 0], [2, 0]], [[0, 1], [2, 1]]])).toBe(false); // parallel
    expect(SegmentIntersectionQ([[[0, 0], [2, 0]], [[1, 0], [3, 0]]])).toBe(false); // collinear, overlapping
  });
  it('SegmentIntersectionQ rounds the crossing to multiples of 1e-7 before testing the end points', () => {
    expect(SegmentIntersectionQ([[[0, 0], [1, 0]], [[1 - 1e-8, -1], [1 - 1e-8, 1]]])).toBe(false); // rounds onto (1, 0)
    expect(SegmentIntersectionQ([[[0, 0], [1, 0]], [[1 - 1e-6, -1], [1 - 1e-6, 1]]])).toBe(true);
    expect(SegmentIntersectionQ([[[0, 0], [1, 0]], [[0.5, -1], [0.5 + 1e-11, 1]]])).toBe(true);
    // nearly parallel: Chop of the determinant (absolute 1e-10) makes them parallel
    expect(SegmentIntersectionQ([[[0, 0], [1, 0]], [[0.5, -1e-11], [1.5, 1e-11]]])).toBe(false);
  });
  it('pointOnSegmentQ is true only strictly between the end points', () => {
    expect(pointOnSegmentQ([[0, 0], [2, 2]], [1, 1])).toBe(true);
    expect(pointOnSegmentQ([[0, 0], [2, 2]], [0, 0])).toBe(false);
    expect(pointOnSegmentQ([[0, 0], [2, 2]], [2, 2])).toBe(false);
    expect(pointOnSegmentQ([[0, 0], [2, 2]], [3, 3])).toBe(false);
    expect(pointOnSegmentQ([[0, 0], [2, 2]], [1, 1.1])).toBe(false);
    expect(pointOnSegmentQ([[0, 0], [2, 2]], [1, 1 + 1e-11])).toBe(true); // cross product 2e-11 is Chop'ed to 0
  });
  it('getClockwiseAngle: right angles in both turning directions and zero for the same direction', () => {
    // a = p3 - p2, b = p1 - p2; z of a x b < 0 gives 2 Pi - VectorAngle
    expect(getClockwiseAngle([1, 0], [0, 0], [0, 1])).toBeCloseTo(1.5 * Math.PI, 14);
    expect(getClockwiseAngle([0, 1], [0, 0], [1, 0])).toBeCloseTo(Math.PI / 2, 15);
    expect(getClockwiseAngle([2, 0], [0, 0], [1, 0])).toBe(0);
  });
  it('intersectInteriorQRev2 is False when p lies on the ray from w2 through w3 (0 becomes the literal 6.28319)', () => {
    // getClockwiseAngle(w1, w2, w3) = 3 Pi/2; with p = (1, 1) the second angle is Pi/4, with p = (2, 0) it is 0
    expect(intersectInteriorQRev2([1, 1], [[0, -1], [0, 0], [1, 0]])).toBe(true);
    expect(intersectInteriorQRev2([2, 0], [[0, -1], [0, 0], [1, 0]])).toBe(false); // 3 Pi/2 > 6.28319 is False
  });
  it('reflex is a counter-clockwise turn and glancingBlow compares the two neighbours', () => {
    expect(reflex([0, 0], [1, 0], [0, 1])).toBe(true);
    expect(reflex([0, 0], [0, 1], [1, 0])).toBe(false);
    // V-shaped corner at (0,0) with neighbours (-1,1) and (1,1): seen from below the line through it separates them
    expect(glancingBlow([0, -2], [[-1, 1], [0, 0], [1, 1]])).toBe(true);
    expect(glancingBlow([-2, 0], [[-1, 1], [0, 0], [1, 1]])).toBe(false);
  });
  it('extendedLine has length 40 (the motion-planning version uses 20)', () => {
    expect(extendedLine([1, 1], [1, 2])).toEqual([[1, 1], [1, 41]]);
    expect(extendedLine([0, 0], [0, -5])).toEqual([[0, 0], [0, -40]]); // -5 (1/5) rounds to -1
  });
  it('leftOrRight, normalVector and noIntersection', () => {
    expect(leftOrRight([0, 0], [1, 0], [0.5, -1])).toBe(true); // right of a->b
    expect(leftOrRight([0, 0], [1, 0], [0.5, 1])).toBe(false);
    expect(leftOrRight([0, 0], [1, 0], [3, 0])).toBe(true); // on the line: >= 0
    expect(normalVector([[0, 0], [2, 0]])).toEqual([0, -1]); // Normalize[{-0 + 0, 0 - 2}]
    expect(normalVector([[0, 0], [0, 3]])).toEqual([1, 0]);
    expect(noIntersection([0, 0], [2, 2], [[[0, 2], [2, 0]]])).toBe(false);
    expect(noIntersection([0, 0], [2, 2], [[[3, 0], [3, 1]]])).toBe(true);
  });
  it('Normalize models: correctly rounded length and dnrm2 Norm differ in the last bit for {1.5, 2.5} (regression pin, K-AG-10)', () => {
    // REGRESSION PIN: the Normalize expectations below use the same formula as the code (v * (1/length)); they pin
    // the port's behaviour until Normalize[{1.5, 2.5}] // InputForm is read in Mathematica (extra-checks.wls, K-AG-10).
    // Independent part: 1.5² + 2.5² = 8.5 exactly, so Math.sqrt(8.5) (IEEE: correctly rounded) checks the length.
    expect(normCorrectlyRounded([1.5, 2.5])).toBe(Math.sqrt(8.5));
    expect(normCorrectlyRounded([3, 4])).toBe(5);
    const r = 1 / Math.sqrt(8.5), rd = 1 / (Math.sqrt(8.5) - 2 ** -51); // dnrm2 gives one ulp less (Norm[{1.5, 2.5}] = 2.91547594742265 in 15.0.1)
    expect(NORMALIZE_MODELS.correctlyRounded([1.5, 2.5])).toEqual([1.5 * r, 2.5 * r]);
    expect(NORMALIZE_MODELS.viaNorm([1.5, 2.5])).toEqual([1.5 * rd, 2.5 * rd]);
  });
  it('sameQ accepts reals differing in the last binary digit, as SameQ, MatchQ and Position do', () => {
    // a 1-ulp difference is SameQ in Mathematica 15.0.1 (extra-checks.wls, owner run 2026-10-06, K-AG-08)
    expect(sameQ([1.5, -2], [1.5 + 2 ** -52, -2])).toBe(true);
    expect(sameQ([0.1 + 0.2, 1], [0.3, 1])).toBe(true); // the case checked in Mathematica
    expect(sameQ([0, 3], [0, 3])).toBe(true);
  });
  it('sameQ rejects a 2-ulp difference (regression pin, K-AG-08)', () => {
    // REGRESSION PIN: only the 1-ulp case was checked in Mathematica; SameQ[1.5, 1.5 + 2^-51] is queued in
    // extra-checks.wls (K-AG-08). The documentation says "differ in at most their last binary digit".
    expect(sameQ([1.5, -2], [1.5 + 2 ** -51, -2])).toBe(false);
  });
});

// vertex lists as written in the original's Manipulate (docs/original-source/art-gallery.txt), before Reverse@
const IRREGULAR_SRC = [[-1.2, -2.8], [-3.5, 0.5], [-1, 2.3], [-3.3, 3.2], [0.75, 3], [-0.9, 1], [-1.3, 1.35], [-1.2, -1], [0.5, 0.5], [2.6, 1], [2.1, -2.7]];
const CUBICLE_SRC = [[-2, -3.5], [-2, -2], [-3.5, -2], [-3.5, 0], [-1.5, 0], [-1.5, 0.5], [-3.5, 0.5], [-3.5, 3.5], [-1.5, 3.5], [-1.5, 2],
  [0.5, 2], [0.5, 2.5], [-1, 2.5], [-1, 3.5], [3.5, 3.5], [3.5, 2.5], [1.5, 2.5], [1.5, 2], [3.5, 2], [3.5, -0.5], [1.5, -0.5], [1.5, -1.5],
  [2, -1.5], [2, -1], [3.5, -1], [3.5, -3.5], [2, -3.5], [2, -3], [1.5, -3], [1.5, -3.5], [-0.5, -3.5], [-0.5, -1], [0, -1], [0, -0.5],
  [-1, -0.5], [-1, -3.5]];
// 7 CirclePoints[4] and 5 CirclePoints[4] (CirclePoints[4] starts at angle -Pi/4), N[1/Sqrt[2]] = 0.7071067811865475
const R7 = 4.949747468305832, R5 = 3.5355339059327373;
const INVISIBLE_SRC = [[R7, -R7], [R7, R7], [-R7, R7], [-R7, -R7]];
const BOUND_SRC = [[R5, -R5], [R5, R5], [-R5, R5], [-R5, -R5]];

describe('art-gallery environments', () => {
  it('the environments list their polygons in the original order, ending with the invisible 7-square', () => {
    expect(env('cubicle')).toEqual([CUBICLE_SRC.slice().reverse(), INVISIBLE_SRC]);
    expect(env('irregular')).toEqual([IRREGULAR_SRC.slice().reverse(), INVISIBLE_SRC]);
    const m = env('movable obstacles');
    expect(m.length).toBe(4);
    expect(m[2]).toEqual(BOUND_SRC);
    expect(m[3]).toEqual(INVISIBLE_SRC);
    expect(R7).toBe(7 * S2);
    expect(R5).toBe(5 * S2);
  });
  it('the square and the triangle follow pts 1 and 2 (CirclePoints[4] and CirclePoints[3])', () => {
    const e = environment('movable obstacles', [[1, 0], [2, 2], ...INITIAL_PTS.slice(2)]);
    expect(e.poly1).toEqual([[1 + S2, -S2], [1 + S2, S2], [1 - S2, S2], [1 - S2, -S2]]);
    const h = Math.sqrt(3) / 2; // 0.8660254037844386
    expect(e.poly2).toEqual([[2 + h, 1.5], [2, 3], [2 - h, 1.5]]);
  });
  it('irregular and cubicle polygons are the reversed vertex lists of the original', () => {
    expect(IRREGULAR_POLY[0]).toEqual([2.1, -2.7]);
    expect(IRREGULAR_POLY[10]).toEqual([-1.2, -2.8]);
    expect(CUBICLE_POLY.length).toBe(36);
    expect(CUBICLE_POLY.slice(0, 5)).toEqual([[-1, -3.5], [-1, -0.5], [0, -0.5], [0, -1], [-0.5, -1]]);
  });
});

describe('art-gallery visiblePolys', () => {
  it('a guard in a square room sees exactly the four corners', () => {
    const r = visiblePolys([BOUND, INVISIBLE_POLY], [0.3, 0.2]);
    expect(r.length).toBe(4);
    for (const c of BOUND) expect(has(r, c, 0)).toBe(true);
    expect(area(r)).toBeCloseTo(50, 12); // side 5 Sqrt[2]
  });
  it('first sweep step at the exact centre of the square room: tb waits for the current angle and all four corners stay (original quirk)', () => {
    // the first vertex swept (angle Pi/4) is the corner of bound with the corner of the invisible square straight
    // behind it: pointOnSegmentQ[{p, postB}, b] in the first step, while pbaAngle has no value yet
    const trace = {};
    const r = visiblePolys([BOUND, INVISIBLE_POLY], [0, 0], trace);
    expect(trace.deferredTb).toBe(true);
    expect(r.length).toBe(4);
    for (const c of BOUND_SRC) expect(has(r, c, 1e-12)).toBe(true);
    expect(area(r)).toBeCloseTo(50, 9);
  });
  it('a guard inside a convex obstacle sees only that obstacle (original quirk)', () => {
    const m = env('movable obstacles');
    const r = visiblePolys(m, [1, 0.1]); // inside the square centred at pts 1 = (1, 0)
    expect(r.length).toBe(4);
    for (const c of m[0]) expect(has(r, c, 0)).toBe(true);
  });
  it('a guard outside the gallery sees the outside up to the invisible square', () => {
    const r = visiblePolys(env('irregular'), [-3.8, -3.8]);
    expect(has(r, [-4.949747468305832, -4.949747468305832])).toBe(true);
    for (const q of r) expect(Math.max(Math.abs(q[0]), Math.abs(q[1]))).toBeLessThanOrEqual(4.949747468305834);
    expect(area(r)).toBeCloseTo(area(referenceVisibility(env('irregular'), [-3.8, -3.8])), 6);
  });
  it('for generic guard positions the region is the true visibility polygon in all three environments', () => {
    const cases = [
      ['cubicle', [0.3, 0.2]], ['cubicle', [2.75, -2.2]], ['cubicle', [-2.5, 1.7]], ['cubicle', [2.6, 3.1]],
      ['irregular', [0.3, -1.4]], ['irregular', [-2.9, 2.9]], ['irregular', [3.3, 3.1]],
      ['movable obstacles', [-2.2, 2.9]], ['movable obstacles', [3.8, -0.3]], ['movable obstacles', [-1.1, -2.6]],
    ];
    for (const [reg, p] of cases) expect(area(visiblePolys(env(reg), p)), `${reg} ${p}`).toBeCloseTo(area(referenceVisibility(env(reg), p)), 6);
  });
  it('guards in the cubicle corridors and doorways see the true visibility polygon', () => {
    for (const p of [[-1.25, 3], [-0.75, -2], [1.75, -3.25]]) { // default guard 8; bottom corridor; bottom notch
      // within 5e-5: slivers left by the 1e-5 shifts of collinear vertices
      expect(area(visiblePolys(env('cubicle'), p)), `${p}`).toBeCloseTo(area(referenceVisibility(env('cubicle'), p)), 4);
    }
  });
  it('guard on an edge: shifted by 1e-5 along the edge normal (default guard 6 of the cubicle)', () => {
    const trace = {};
    const r = visiblePolys(env('cubicle'), [-2.5, 0.5], trace);
    // edge {-3.5, 0.5} -> {-1.5, 0.5}: normalVector = Normalize[{0, -2}] = {0, -1}; p = pm - 0.00001 {0, -1}
    expect(trace.nudgedOnEdge).toBe(true);
    expect(trace.p).toEqual([-2.5, 0.5 + 0.00001]);
    for (const c of [[-3.5, 0.5], [-3.5, 3.5], [-1.5, 3.5], [-1.5, 2], [-1.5, 0.5]]) expect(has(r, c, 0)).toBe(true);
    expect(area(r)).toBeCloseTo(area(referenceVisibility(env('cubicle'), trace.p)), 6);
  });
  it('guard on a cubicle vertex: shifted by 1e-5 times vertices 3 and 5 of polygon 1 into the wall (original quirk)', () => {
    const trace = {};
    const r = visiblePolys(env('cubicle'), [-1.5, 0.5], trace); // default guard 4
    // index ends as {4} (last vertex of the invisible square): polys[[1,3]] + polys[[1,5]] = {0,-0.5} + {-0.5,-1}
    expect(trace.nudgedOnVertex).toBe(true);
    expect(trace.p).toEqual([-1.5 + 0.00001 * -0.5, 0.5 + 0.00001 * -1.5]);
    expect(testpoint(CUBICLE_POLY, trace.p)).toBe(false); // the guard now stands inside the wall arm
    for (const q of r) expect(q[0]).toBeLessThanOrEqual(-1.5); // it sees along the arm and out of the gallery
    expect(has(r, [-1.5, 0], 0) && has(r, [-1.5, 0.5], 0)).toBe(true);
    expect(r.some((q) => q[0] === -4.949747468305832)).toBe(true);
    expect(area(r)).toBeCloseTo(area(referenceVisibility(env('cubicle'), trace.p)), 6);
  });
  it('guard on an irregular vertex: shifted by 1e-5 times vertices 3 and 5 of the irregular polygon (original quirk)', () => {
    const trace = {};
    visiblePolys(env('irregular'), [-3.5, 0.5], trace);
    // vertices 3 and 5 of Reverse@{…}: {0.5, 0.5} + {-1.3, 1.35} = {-0.8, 1.85}
    expect(trace.p).toEqual([-3.5 + 0.00001 * -0.8, 0.5 + 0.00001 * 1.85]);
  });
  it('guard on a vertex in movable obstacles: no region, as the original only has a symbolic result (port deviation)', () => {
    const m = env('movable obstacles');
    for (const v of [m[0][0], m[1][1], BOUND[1]]) { // square vertex, triangle apex {2, 3}, corner of bound
      const trace = {};
      expect(visiblePolys(m, v, trace)).toBe(null);
      expect(trace.partError).toBe(true); // polys[[1, {5}]] of the 4-vertex square
    }
  });
  it('first sweep step with a collinear successor: the vertex is kept, tb resolved with the current angle (original quirk)', () => {
    // from (1.235, -1.5) the vertices (1.5, -1.5) and (2, -1.5) lie on the ray of angle 0, the first ones swept.
    // The current pbaAngle at b = (1.5, -1.5) (a = (1.5, -0.5)) is Pi/2 > Pi/3, so tb = b - 1e-5 normalVector[{postB, p}]
    // = (1.5, -1.50001), and the glancing line from p through tb meets the wall x = 3.5 just below y = -1.5.
    const p = [1.235, -1.5];
    const trace = {};
    const r = visiblePolys(env('cubicle'), p, trace);
    expect(trace.deferredTb).toBe(true);
    expect(r[1]).toEqual([1.5, -1.5]);
    expect(r[0][0]).toBeCloseTo(3.5, 12);
    expect(r[0][1]).toBeCloseTo(-1.5 - 0.00001 * (3.5 - p[0]) / (1.5 - p[0]), 12);
    expect(area(r)).toBeCloseTo(area(referenceVisibility(env('cubicle'), p)), 3); // slivers of the 1e-5 shifts
  });
  it('the first sweep step also takes the vertex for the default guards 2 and 3 of the cubicle', () => {
    for (const p of [[0, -1.5], [-2, -1]]) {
      const trace = {};
      const r = visiblePolys(env('cubicle'), p, trace);
      expect(trace.deferredTb, `${p}`).toBe(true);
      expect(area(r), `${p}`).toBeCloseTo(area(referenceVisibility(env('cubicle'), p)), 3);
    }
    // guard 2 at (0, -1.5): the region starts {3.5, -1.5 - 1e-5 3.5/1.5}, {1.5, -1.5}, {1.5, -0.5}
    const r2 = visiblePolys(env('cubicle'), [0, -1.5]);
    expect(r2[0][0]).toBeCloseTo(3.5, 12);
    expect(r2[0][1]).toBeCloseTo(-1.5 - 0.00001 * 3.5 / 1.5, 12);
    expect(r2.slice(1, 3)).toEqual([[1.5, -1.5], [1.5, -0.5]]);
  });
  it('stale tb: a guard collinear with two later vertices takes the previous vertex angle (original quirk)', () => {
    // (-0.15, -1.3), (0, -1) and (1.5, 2) are collinear: (0.15, 0.3) and (1.65, 3.3) = 11 (0.15, 0.3)
    const trace = {};
    const r = visiblePolys(env('cubicle'), [-0.15, -1.3], trace);
    expect(trace.staleTb).toBe(true);
    // the glancing line through the shifted vertex ends a few 1e-5 next to (1.5, 2)
    expect(r.some((q) => Math.abs(q[0] - 1.5) < 1e-12 && Math.abs(q[1] - 2) > 1e-6 && Math.abs(q[1] - 2) < 2e-4)).toBe(true);
    expect(Math.abs(area(referenceVisibility(env('cubicle'), [-0.15, -1.3])) - area(r))).toBeGreaterThan(0.5);
  });
  it('a guard on the cubicle vertex (1.5, -3.5) is shifted below the wall and gets a self-crossing region (original quirk)', () => {
    const trace = {};
    const r = visiblePolys(env('cubicle'), [1.5, -3.5], trace);
    expect(trace.p).toEqual([1.5 + 0.00001 * -0.5, -3.5 + 0.00001 * -1.5]); // Q-AG-01 shift, outside the gallery
    const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    let crossings = 0;
    for (let i = 0; i < r.length; i++) {
      for (let j = i + 2; j < r.length; j++) {
        if (i === 0 && j === r.length - 1) continue;
        const [a, b, c, d] = [r[i], r[(i + 1) % r.length], r[j], r[(j + 1) % r.length]];
        if (orient(a, b, c) * orient(a, b, d) < -1e-12 && orient(c, d, a) * orient(c, d, b) < -1e-12) crossings++;
      }
    }
    expect(crossings).toBeGreaterThan(0);
  });
  it('a guard vertically aligned with a cubicle edge (0.5, -2.5) also differs from the true visibility polygon', () => {
    const trace = {};
    const r = visiblePolys(env('cubicle'), [0.5, -2.5], trace); // (0.5, 2) and (0.5, 2.5) straight above
    expect(trace.staleTb).toBe(true);
    expect(area(referenceVisibility(env('cubicle'), [0.5, -2.5])) - area(r)).toBeGreaterThan(1);
  });
  it('the default guard 1 at (0, 0) is shifted only in its collinear vertices: slivers of width 7e-5', () => {
    const r = visiblePolys(env('cubicle'), [0, 0]);
    // tb = (0, -0.5) + 1e-5 (1, 0): the extended line from (0,0) reaches y = -3.5 at x = 7 1e-5
    expect(has(r, [7e-5, -3.5], 1e-15)).toBe(true);
    expect(area(referenceVisibility(env('cubicle'), [0, 0])) - area(r)).toBeLessThan(1e-3);
  });
});

describe('art-gallery Manipulate body', () => {
  const run = (st) => evaluate(st);
  it('the first evaluation computes only guard 1 and records ptsOld, sOld and prevReg', () => {
    const { state, view } = run(initialState());
    expect(view.recomputed).toEqual([1]);
    expect(state.sOld).toBe(1);
    expect(state.prevReg).toBe('cubicle');
    expect(state.ptsOld.slice(0, 3)).toEqual([[1, 0], [2, 2], [0, 0]]);
    expect(state.ptsOld[3]).toEqual([-10, -10]);
  });
  it('raising the number of guards computes only the new guards', () => {
    const a = run(initialState()).state;
    const b = run({ ...a, s: 3 });
    expect(b.view.recomputed).toEqual([2, 3]);
  });
  it('lowering and raising the number of guards again recomputes the guards above the old count', () => {
    let st = run({ ...initialState(), s: 3 }).state;
    st = run({ ...st, s: 1 }).state;
    expect(run({ ...st, s: 3 }).view.recomputed).toEqual([2, 3]); // sOld = 1 < i - 2 for i = 4, 5
  });
  it('moving a guard recomputes only that guard', () => {
    const st = run({ ...initialState(), s: 3 }).state;
    st.pts[3] = [0.25, -1.75];
    const r = run(st);
    expect(r.view.recomputed).toEqual([2]);
    expect(r.state.ptsOld[3]).toEqual([0.25, -1.75]);
  });
  it('a guard moved by less than the Equal tolerance is not recomputed', () => {
    const st = run({ ...initialState(), s: 1, pts: INITIAL_PTS.map((p, k) => (k === 2 ? [1, 1] : [...p])) }).state;
    st.pts[2] = [1 + 2 ** -52, 1]; // differs in the last bit: == is True in Mathematica
    expect(run(st).view.recomputed).toEqual([]);
  });
  it('changing the environment recomputes every shown guard', () => {
    const st = run({ ...initialState(), s: 4 }).state;
    expect(run({ ...st, reg: 'irregular' }).view.recomputed).toEqual([1, 2, 3, 4]);
  });
  it('moving an obstacle locator recomputes every guard, also in the cubicle where no obstacle is drawn (original quirk)', () => {
    const st = run({ ...initialState(), s: 2 }).state;
    const before = st.visibleRegion.slice(0, 2);
    st.pts[0] = [-2, -2];
    const r = run(st);
    expect(r.view.recomputed).toEqual([1, 2]);
    expect(r.state.visibleRegion.slice(0, 2)).toEqual(before);
    expect(r.state.ptsOld[0]).toEqual([-2, -2]);
    expect(run(r.state).view.recomputed).toEqual([]);
  });
  it('in movable obstacles, moving the square changes the regions of the guards', () => {
    const st = run({ ...initialState(), reg: 'movable obstacles', s: 1 }).state;
    st.pts[0] = [0, 1.5]; // the square now stands between guard 1 at (0, 0) and the top
    const r = run(st);
    expect(r.view.recomputed).toEqual([1]);
    expect(area(r.state.visibleRegion[0])).toBeCloseTo(area(referenceVisibility(environment('movable obstacles', st.pts).listofPoly, [0, 0])), 6);
  });
  it('evaluate does not modify its input state', () => {
    const st = initialState();
    const copy = JSON.parse(JSON.stringify(st));
    run(st);
    expect(st).toEqual(copy);
  });
  it('clampPt keeps locators inside 4{-1,-1} to 4{1,1}', () => {
    expect(clampPt([5, -7])).toEqual([4, -4]);
    expect(clampPt([0.5, 3.9])).toEqual([0.5, 3.9]);
  });
  it('eight guards in the cubicle: time of a full computation (reported)', () => {
    const st = { ...initialState(), s: 8 };
    run({ ...st, reg: 'irregular' }); // warm-up
    const t0 = performance.now();
    const r = run(st);
    const ms = performance.now() - t0;
    expect(r.view.recomputed).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    console.log(`art-gallery: 8 guards in the cubicle (default positions) computed in ${ms.toFixed(1)} ms (Node)`);
    expect(ms).toBeLessThan(2000);
  });
});
