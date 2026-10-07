// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/prm-core.test.js — the functions both PRM Demonstrations define identically (demos/common/prm-core.js).
// Expected values are derived by hand from the originals' formulas (R-16).
import { describe, it, expect } from 'vitest';
import {
  TWO_PI, toroidDist, angtest, ptInPoly, ptInPolys, pathOKT, myAstar, toroidLine, toroidLines, toroidPt, connectPoints,
  planQuery, progressOnPath, LOC_ICON, circlePoints,
} from '../../demos/common/prm-core.js';


describe('prm-core: toroidDist', () => {
  it('toroidDist is the plain distance when no coordinate wraps', () => {
    expect(toroidDist([1, 1], [3, 2.5])).toBe(2.5); // sqrt(4 + 2.25)
  });
  it('toroidDist wraps each coordinate across 2π independently', () => {
    expect(toroidDist([0.1, 0.1], [6.2, 0.1])).toBeCloseTo(TWO_PI - 6.1, 14);
    expect(toroidDist([0.2, 6.0], [6.0, 0.2])).toBeCloseTo(Math.SQRT2 * (TWO_PI - 5.8), 14);
    expect(toroidDist([1, 0.1], [4, 6.2])).toBeCloseTo(Math.hypot(3, TWO_PI - 6.1), 14);
  });
  it('toroidDist is symmetric', () => {
    expect(toroidDist([5.9, 0.3], [0.4, 2.0])).toBe(toroidDist([0.4, 2.0], [5.9, 0.3]));
  });
});

describe('prm-core: point in polygon', () => {
  const square = [[0, 0], [1, 0], [1, 1], [0, 1]]; // counter-clockwise, like CirclePoints
  it('angtest is p1.{{0,-1},{1,0}}.p2 > 0 (= y1 x2 - x1 y2 > 0)', () => {
    expect(angtest([0, 1], [1, 0])).toBe(true); // 1*1 - 0*0 = 1
    expect(angtest([1, 0], [0, 1])).toBe(false); // 0*0 - 1*1 = -1
    expect(angtest([1, 1], [2, 2])).toBe(false); // 0 is not > 0
  });
  it('ptInPoly: inside and outside of a convex polygon, either orientation', () => {
    expect(ptInPoly(square, [0.5, 0.5])).toBe(true);
    expect(ptInPoly(square, [1.5, 0.5])).toBe(false);
    expect(ptInPoly([...square].reverse(), [0.5, 0.5])).toBe(true);
  });
  it('ptInPoly: a point ON an edge of a counter-clockwise polygon counts as inside (all tests False), of a clockwise one as outside', () => {
    // v = poly - {0.5, 0}: the four angle tests are 0>0, -0.5>0, -1>0, -0.5>0 -> all False -> Equal -> True
    expect(ptInPoly(square, [0.5, 0])).toBe(true);
    expect(ptInPoly([...square].reverse(), [0.5, 0])).toBe(false);
  });
  it('ptInPolys is true when the point is in any of the polygons', () => {
    const far = square.map(([x, y]) => [x + 3, y]);
    expect(ptInPolys([far, square], [0.5, 0.5])).toBe(true);
    expect(ptInPolys([far], [0.5, 0.5])).toBe(false);
  });
});

describe('prm-core: pathOKT (local planner)', () => {
  it('pathOKT accepts a segment not longer than delta WITHOUT testing anything (original quirk)', () => {
    const calls = [];
    expect(pathOKT([1, 1], [1.05, 1], (p) => { calls.push(p); return true; }, 0.1)).toBe(true);
    expect(calls).toEqual([]);
  });
  it('pathOKT tests n = Ceiling[dist/delta] interior samples ps + d i/(n+1), never the end points', () => {
    const calls = [];
    expect(pathOKT([1, 1], [2, 1], (p) => { calls.push(p); return false; }, 0.1)).toBe(true);
    expect(calls.length).toBe(10); // dist 1, 1/0.1 = 10
    calls.forEach((p, k) => { expect(p[0]).toBe(1 + 1 * ((k + 1) / 11)); expect(p[1]).toBe(1); });
    // end points in collision do not matter
    expect(pathOKT([1, 1], [2, 1], (p) => p[0] <= 1 || p[0] >= 2, 0.1)).toBe(true);
    // an interior collision does
    expect(pathOKT([1, 1], [2, 1], (p) => Math.abs(p[0] - 1.5) < 0.05, 0.1)).toBe(false);
  });
  it('pathOKT goes the short way round the torus and wraps each sample once', () => {
    const calls = [];
    pathOKT([6.2, 1], [0.1, 1], (p) => { calls.push(p); return false; }, 0.1);
    const d = 0.1 - 6.2 + TWO_PI; // 0.1832 > delta -> n = 2
    expect(calls.length).toBe(2);
    expect(calls[0][0]).toBeCloseTo(6.2 + d / 3, 14);
    expect(calls[1][0]).toBeCloseTo(6.2 + (2 * d) / 3 - TWO_PI, 14);
  });
  it('pathOKT stops at the first colliding sample (Or)', () => {
    let n = 0;
    expect(pathOKT([1, 1], [3, 1], () => { n++; return true; }, 0.1)).toBe(false);
    expect(n).toBe(1);
  });
});

describe('prm-core: myAstar', () => {
  it('myAstar finds the shortest path and returns 1-based node lists, or -1', () => {
    const verts = [[1, 1], [2, 1], [3, 1], [2, 1.5]];
    const adj = [[2, 4], [1, 3], [2, 4], [1, 3]];
    expect(myAstar(adj, verts, 1, 3)).toEqual([1, 2, 3]); // 1 + 1 < 2 * sqrt(1.25)
    expect(myAstar([[2], [1], [], []], verts, 1, 3)).toBe(-1);
    expect(myAstar(adj, verts, 2, 2)).toEqual([2]);
  });
  it('myAstar expands by gScore only (heuristic only on the start node): Dijkstra tie result, not A*', () => {
    // S=[1,1] -> b=[2.5,1] -> G=[3,1] and S -> a=[1.5,1] -> G, both of length 2 (exact).
    // Dijkstra (fScore = g + 0) expands a (g 0.5) first and keeps G's predecessor a.
    // A real A* (f = g + dist to G) would tie b and a at f = 2, expand b first (first in openSet) and return S-b-G.
    const verts = [[1, 1], [2.5, 1], [1.5, 1], [3, 1]];
    const adj = [[2, 3], [1, 4], [1, 4], [2, 3]];
    expect(myAstar(adj, verts, 1, 4)).toEqual([1, 3, 4]);
  });
  it('myAstar ties between equal gScores go to the node first in openSet (insertion order)', () => {
    const verts = [[1, 1], [2, 1.5], [2, 0.5], [3, 1]];
    expect(myAstar([[2, 3], [1, 4], [1, 4], [2, 3]], verts, 1, 4)).toEqual([1, 2, 4]);
    expect(myAstar([[3, 2], [1, 4], [1, 4], [3, 2]], verts, 1, 4)).toEqual([1, 3, 4]);
  });
});

describe('prm-core: drawing helpers', () => {
  it('toroidLine draws a plain edge in color2 (color1 when color2 is -1)', () => {
    expect(toroidLine([[1, 1], [2, 2]], 'LightBlue', 'Blue')).toEqual([{ color: 'Blue', wrapped: false, line: [[1, 1], [2, 2]] }]);
    expect(toroidLine([[1, 1], [2, 2]], 'Magenta')).toEqual([{ color: 'Magenta', wrapped: false, line: [[1, 1], [2, 2]] }]);
  });
  it('toroidLine draws a wrapping edge as two pieces in color1 that leave the square', () => {
    const d = 6.2 - 0.1 - TWO_PI; // -0.1832
    const pieces = toroidLine([[0.1, 1], [6.2, 1]], 'LightBlue', 'Blue');
    expect(pieces.length).toBe(2);
    expect(pieces.every((p) => p.color === 'LightBlue')).toBe(true);
    expect(pieces[0].line[1][0]).toBeCloseTo(0.1 + d, 14);
    expect(pieces[1].line[1][0]).toBeCloseTo(6.2 - d, 14);
    expect(toroidLines([[[1, 1], [2, 2]], [[0.1, 1], [6.2, 1]]], 'LightBlue', 'Blue').length).toBe(3);
  });
  it('toroidPt interpolates along the short way and wraps back into [0, 2π]', () => {
    expect(toroidPt([[1, 1], [2, 3]], 0.5)).toEqual([1.5, 2]);
    expect(toroidPt([[6.2, 1], [0.1, 1]], 0.5)[0]).toBeCloseTo(6.2 + (0.1 - 6.2 + TWO_PI) / 2 - TWO_PI, 14);
    expect(toroidPt([[2, 2], [2, 2]], 0.7)).toEqual([2, 2]);
  });
  it('the locator icon loc[col] has cross hairs from 2 to 10 units and circles of radius 5 and 3 at {-0.5, 0.5}', () => {
    expect(LOC_ICON.pxPerUnit).toBe(17 / 16);
    expect(LOC_ICON.lines).toContainEqual([[0, 2], [0, 10]]);
    expect(LOC_ICON.circles.map((c) => [c.r, c.thicknessPx, c.opacity])).toEqual([[5, 1, 1], [3, 3, 0.3]]);
  });
});

describe('prm-core: connectPoints', () => {
  const pts = [[1, 1], [1.2, 1], [1.5, 1]];
  it('connectPoints adds each pair once, in Nearest order, with 1-based adjacency lists', () => {
    const [adj, edges] = connectPoints(pts, [[], [], []], () => true, [], 1, 1);
    expect(edges).toEqual([[pts[0], pts[1]], [pts[0], pts[2]], [pts[1], pts[2]]]);
    expect(adj).toEqual([[2, 3], [1, 3], [1, 2]]);
  });
  it('connectPoints only connects points within radius r', () => {
    const [adj, edges] = connectPoints(pts, [[], [], []], () => true, [], 1, 0.25);
    expect(edges).toEqual([[pts[0], pts[1]]]);
    expect(adj).toEqual([[2], [1], []]);
  });
  it('connectPoints tries a refused pair again from the other side (the planner is directional)', () => {
    const leftward = (ps, pe) => ps[0] > pe[0];
    const [adj, edges] = connectPoints(pts, [[], [], []], leftward, [], 1, 1);
    expect(edges).toEqual([[pts[1], pts[0]], [pts[2], pts[1]], [pts[2], pts[0]]]);
    expect(adj).toEqual([[2, 3], [1, 3], [2, 1]]);
  });
  it('connectPoints from point2start only lets the new points look for neighbours', () => {
    const [adj, edges] = connectPoints(pts, [[2], [1], []], () => true, [[pts[0], pts[1]]], 3, 1);
    expect(edges).toEqual([[pts[0], pts[1]], [pts[2], pts[1]], [pts[2], pts[0]]]);
    expect(adj).toEqual([[2, 3], [1, 3], [2, 1]]);
  });
  it('connectPoints takes at most the 10 nearest points', () => {
    const many = Array.from({ length: 13 }, (_, k) => [1 + 0.01 * k, 1]);
    const [adj] = connectPoints(many, many.map(() => []), () => true, [], 1, 1);
    expect(adj[0]).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});

describe('prm-core: query and progress', () => {
  const goodPts = [[1.5, 1], [2, 1], [2.5, 1], [3, 1], [3.5, 1], [4, 1]];
  const adj = [[2], [1, 3], [2, 4], [3, 5], [4, 6], [5]];
  const base = { goodPts, edgesNNadj: adj, pathOK: () => true, qsFree: () => true, qfFree: () => true };
  it('planQuery gives path -2 when qs and qf are closer than r and the planner accepts the segment', () => {
    expect(planQuery({ ...base, qs: [1, 1], qf: [1.3, 1], r: 0.5 }).path).toBe(-2);
  });
  it('planQuery connects qs and qf to their nearest good points and searches the roadmap', () => {
    const q = planQuery({ ...base, qs: [1.4, 1], qf: [4.2, 1], r: 0.5 });
    expect(q.qsn).toEqual([1.5, 1]);
    expect(q.qfn).toEqual([4, 1]);
    expect(q.path).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('planQuery gives -1 when the start is in collision or there are at most 5 good points', () => {
    expect(planQuery({ ...base, qsFree: () => false, qs: [1.4, 1], qf: [4.2, 1], r: 0.5 })).toEqual({ path: -1, qsn: null, qfn: [4, 1] });
    expect(planQuery({ ...base, goodPts: goodPts.slice(0, 5), qs: [1.4, 1], qf: [4.2, 1], r: 0.5 }).path).toBe(-1);
  });
  it('planQuery tries only the single nearest good point for qs and qf (original quirk)', () => {
    // the nearest good point to qs = {1.45, 1} is {1.5, 1}; the planner refuses it, {2, 1} would be fine
    const pathOK = (a, b) => !(b[0] === 1.5 || a[0] === 1.5);
    const q = planQuery({ ...base, pathOK, qs: [1.45, 1], qf: [4.2, 1], r: 0.01 });
    expect(q.qsn).toBe(null);
    expect(q.path).toBe(-1);
  });
  it('progressOnPath walks qs -> path -> qf by arc length', () => {
    const p = { qs: [1, 1], qf: [4, 1], goodPts: [[2, 1], [3, 1]], path: [1, 2] };
    expect(progressOnPath({ ...p, progress: 0 }).point).toEqual([1, 1]);
    const half = progressOnPath({ ...p, progress: 0.5 });
    expect(half.totdist).toBe(3);
    expect(half.point).toEqual([2.5, 1]);
    expect(progressOnPath({ ...p, progress: 1 }).point).toEqual([4, 1]);
    expect(progressOnPath({ ...p, path: -1, progress: 0.5 })).toBe(null);
    const direct = progressOnPath({ ...p, path: -2, progress: 0.25 });
    expect(direct.totdist).toBe(3);
    expect(direct.point).toEqual([1.75, 1]);
  });
  it('progressOnPath stops at a segment end that progress reaches within Mathematica tolerance (tolerant Less)', () => {
    // dists {1, 1, 1}; progress = two doubles above 1/3 makes progress*totdist = 1.0000000000000002.
    // Plain < would move on to segment 2 (1 < 1.0000000000000002); Mathematica's Less treats them as equal.
    const p = { qs: [1, 1], qf: [4, 1], goodPts: [[2, 1], [3, 1]], path: [1, 2], progress: 0.3333333333333334 };
    expect(p.progress * 3).toBe(1.0000000000000002);
    const r = progressOnPath(p);
    expect(r.segment).toBe(1);
    expect(r.point[0]).toBeCloseTo(2, 14);
    expect(progressOnPath({ ...p, progress: 0.334 }).segment).toBe(2); // clearly past the end of segment 1
  });
  it('progressOnPath at progress 1 ends on qf for irrational segment lengths', () => {
    const p = { qs: [0.3, 0.7], qf: [2.9, 2.2], goodPts: [[1.1, 1.3], [1.7, 2.9], [2.3, 1.1]], path: [1, 2, 3], progress: 1 };
    const r = progressOnPath(p);
    expect(r.segment).toBe(4);
    expect(r.point[0]).toBeCloseTo(2.9, 12);
    expect(r.point[1]).toBeCloseTo(2.2, 12);
  });
});


describe('prm-core: CirclePoints', () => {
  it('circlePoints(7) gives the correctly rounded unit-circle values, first vertex at -π/2 + π/7, counter-clockwise', () => {
    // values from a 50-digit computation (mpmath) of {Cos, Sin}[-π/2 + π/7 + 2π k/7], rounded to doubles
    expect(circlePoints(7)).toEqual([
      [0.4338837391175581, -0.9009688679024191], [0.9749279121818236, -0.2225209339563144],
      [0.7818314824680298, 0.6234898018587335], [0, 1], [-0.7818314824680298, 0.6234898018587335],
      [-0.9749279121818236, -0.2225209339563144], [-0.4338837391175581, -0.9009688679024191],
    ]);
  });
  it('circlePoints(5) is the correctly rounded table too, circlePoints(4) is Mathematica 1/Sqrt[2] (1 ulp below)', () => {
    expect(circlePoints(5)[0]).toEqual([0.5877852522924731, -0.8090169943749475]);
    expect(circlePoints(5)[1]).toEqual([0.9510565162951535, 0.30901699437494745]);
    expect(circlePoints(4)[0]).toEqual([0.7071067811865475, -0.7071067811865475]);
  });
});
