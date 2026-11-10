// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Adapted from Wolfram Demonstrations Project content (see LICENSE.md)
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/planner.test.js — motion-planning port, hand-derived and property-based checks.
// Every expected value below is derived independently (by hand, or by the
// independent oracle in tests/support/reference-planner.js), never by
// trusting the port's own output.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import * as P from '../../demos/motion-planning/planner.js';
import { referencePlan, referenceCObstacle, convexOverlap, strictlyInsideConvex } from '../support/reference-planner.js';

const unitSquare = [[0, 0], [1, 0], [1, 1], [0, 1]]; // CCW
const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const samePointSet = (A, B, tol = 1e-9) =>
  A.length === B.length && A.every((p) => B.some((q) => close(p[0], q[0], tol) && close(p[1], q[1], tol)));

describe('polygon helpers', () => {
  it('lineList closes the polygon; vertexList gives consecutive triples', () => {
    expect(P.lineList(unitSquare)).toEqual([[[0, 0], [1, 0]], [[1, 0], [1, 1]], [[1, 1], [0, 1]], [[0, 1], [0, 0]]]);
    expect(P.vertexList(unitSquare)[3]).toEqual([[0, 1], [0, 0], [1, 0]]);
  });
  it('area and centroid of the unit square', () => {
    expect(P.areaOfPoly(unitSquare)).toBe(1);
    expect(P.centroidOfPoly(unitSquare)).toEqual([0.5, 0.5]);
  });
  it('normalVector of a CCW edge points outward', () => {
    expect(P.normalVector([[0, 0], [1, 0]])).toEqual([0, -1]); // bottom edge -> outward is -y
  });
});

describe('testpoint (winding number)', () => {
  it('inside / outside', () => {
    expect(P.testpoint(unitSquare, [0.5, 0.5])).toBe(true);
    expect(P.testpoint(unitSquare, [1.5, 0.5])).toBe(false);
  });
  it('a point exactly on an edge counts as OUTSIDE (Round[1/2] = 0)', () => {
    expect(P.testpoint(unitSquare, [1, 0.5])).toBe(false);
  });
  it('works for clockwise polygons too', () => {
    expect(P.testpoint(unitSquare.slice().reverse(), [0.5, 0.5])).toBe(true);
  });
});

describe('SegmentIntersectionQ', () => {
  it('detects a proper crossing', () => {
    expect(P.SegmentIntersectionQ([[[0, 0], [2, 2]], [[0, 2], [2, 0]]])).toBe(true);
  });
  it('touching at an endpoint does not count', () => {
    expect(P.SegmentIntersectionQ([[[0, 0], [1, 1]], [[1, 1], [2, 0]]])).toBe(false);
    expect(P.SegmentIntersectionQ([[[0, 0], [2, 0]], [[1, 0], [1, 1]]])).toBe(false); // T-junction at an endpoint of the 2nd segment
  });
  it('parallel / collinear segments never intersect', () => {
    expect(P.SegmentIntersectionQ([[[0, 0], [1, 0]], [[0, 1], [1, 1]]])).toBe(false);
    expect(P.SegmentIntersectionQ([[[0, 0], [2, 0]], [[1, 0], [3, 0]]])).toBe(false);
  });
});

describe('ConvexMinkowskiSumRev3 (configuration-space obstacle)', () => {
  it('square robot (half-side h) + square obstacle (half-side g) = square of half-side h+g', () => {
    const robot = P.regularPolygon([0, 0], 4); // radius 0.5 -> half-side 0.5/sqrt2
    const obst = P.regularPolygon([2, 1], 4);
    const h = 0.5 / Math.SQRT2;
    const cob = P.ConvexMinkowskiSumRev3(robot, obst);
    for (const c of [[2 + 2 * h, 1 + 2 * h], [2 - 2 * h, 1 + 2 * h], [2 - 2 * h, 1 - 2 * h], [2 + 2 * h, 1 - 2 * h]]) {
      expect(cob.some((p) => close(p[0], c[0]) && close(p[1], c[1]))).toBe(true);
    }
  });
  it('uses the REFLECTED robot: triangle robot vs triangle obstacle gives a hexagon matching the hull of o + (c - r)', () => {
    for (const [rc, oc] of [[[0, 0], [1, 1]], [[-2, 2.75], [2, 2.5]], [[1.3, -0.7], [-1, -0.5]]]) {
      const robot = P.regularPolygon(rc, 3), obst = P.regularPolygon(oc, 3);
      const port = P.ConvexMinkowskiSumRev3(robot, obst);
      const ref = referenceCObstacle(robot, rc, obst);
      // the port may keep extra collinear vertices; every hull vertex must be present
      expect(ref.every((p) => port.some((q) => close(p[0], q[0]) && close(p[1], q[1])))).toBe(true);
    }
  });
  it('property: robot overlaps obstacle  <=>  robot centre strictly inside the C-obstacle (300 random centres)', () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const nR of [3, 4, 5]) {
      for (const nO of [3, 4, 5, 6]) {
        const obst = P.regularPolygon([0, 0], nO);
        const cob = P.ConvexMinkowskiSumRev3(P.regularPolygon([5, 5], nR), obst); // built with the robot elsewhere,
        const shift = [0, 0]; // the C-obstacle is expressed in robot-centre coordinates, so it does not depend on where the robot was
        for (let k = 0; k < 25; k++) {
          const c = [-1.5 + 3 * rnd(), -1.5 + 3 * rnd()];
          const overlaps = convexOverlap(P.regularPolygon(c, nR), obst, 1e-6);
          const inside = strictlyInsideConvex([c[0] + shift[0], c[1] + shift[1]], cob, 1e-6);
          const touching = !overlaps && convexOverlap(P.regularPolygon(c, nR), obst, -1e-6);
          if (!touching) expect(inside).toBe(overlaps);
        }
      }
    }
  });
});

describe('configBoundaryFunc (boundary shrunk by the robot)', () => {
  it('square boundary, triangle robot: each side moves in by the robot extent in that direction', () => {
    const border = P.borderPolygon(4); // square, half-side 5/sqrt2
    const a = 5 / Math.SQRT2;
    const robot = P.regularPolygon([0, 0], 3); // vertices (±0.433, -0.25), (0, 0.5)
    const cb = P.configBoundaryFunc(border, robot, [0, 0]);
    const xs = cb.map((p) => p[0]), ys = cb.map((p) => p[1]);
    expect(Math.max(...xs)).toBeCloseTo(a - Math.sqrt(3) / 4, 12);
    expect(Math.min(...xs)).toBeCloseTo(-a + Math.sqrt(3) / 4, 12);
    expect(Math.max(...ys)).toBeCloseTo(a - 0.5, 12);
    expect(Math.min(...ys)).toBeCloseTo(-a + 0.25, 12);
  });
  it('boundary polygons are centred vertically (as in the original)', () => {
    for (const x of [3, 4, 5]) {
      const ys = P.borderPolygon(x).map((p) => p[1]);
      expect(Math.max(...ys) + Math.min(...ys)).toBeCloseTo(0, 12);
    }
  });
});

describe('myAstarRev2 / discretizeLineRev1', () => {
  it('finds the shorter of two routes', () => {
    const verts = [[0, 0], [10, 10], [20, 0], [10, -2]];
    const adj = [[1, 3], [0, 2], [1, 3], [0, 2]];
    expect(P.myAstarRev2(adj, verts, 0, 2)).toEqual([0, 3, 2]);
  });
  it('returns -1 when the goal is unreachable', () => {
    expect(P.myAstarRev2([[], []], [[0, 0], [1, 1]], 0, 1)).toBe(-1);
  });
  it('discretises a segment every 0.09 units (end point excluded unless it lands exactly)', () => {
    const pts = P.discretizeLineRev1([[0, 0], [1, 0]], 0.09);
    expect(pts.length).toBe(12); // 0, 0.09, ..., 0.99
    expect(pts[1][0]).toBeCloseTo(0.09, 12);
    expect(pts[11][0]).toBeCloseTo(0.99, 12);
  });
});

describe('computeScene: behaviour checks', () => {
  const base = { ...P.DEFAULTS };
  it('direct line when nothing is in the way', () => {
    const st = { ...base, r1: [-3, 3.0], r2: [-1.5, 3.0], o1: [3, 3], o2: [3, 0], o3: [3, -3], o4: [0, -3] };
    const sc = P.computeScene(st);
    expect(sc.path).toEqual([st.r1, st.r2]);
    expect(sc.graph).toBe(null);
  });
  it('start inside an obstacle -> invalid, no path, empty progress path', () => {
    const sc = P.computeScene({ ...base, r1: [...base.o2] });
    expect(sc.robotinsideobstcond[0]).toBe(true);
    expect(sc.path).toEqual([]);
    expect(sc.discretePath).toEqual([]);
  });
  it('robot partly outside the boundary -> invalid', () => {
    const sc = P.computeScene({ ...base, r2: [4.15, 4.15] });
    expect(sc.robotinsideobstcond[1]).toBe(true);
  });
  it('default scene: path is the hand-checkable two-segment detour (length 6.3775)', () => {
    const sc = P.computeScene(base);
    expect(sc.path.length).toBe(3);
    expect(P.pathLength(sc.path)).toBeCloseTo(6.377537640662713, 9);
  });
  it('regression: last-bit rounding of the Minkowski start point decides visibility (path 5.1479, not 6.3775)', () => {
    // Found by an independent code review: computing rc + (a - b) instead of (rc + a) - b
    // dropped one visibility line in this scene and gave a longer path. Expected length from
    // the independent reference planner.
    const st = { ...base, r1: [2, -2.5], r2: [-0.5, 2], o1: [-1, -3.5], o2: [2, -1], o3: [-1.5, 3.5], o4: [2, 2] };
    expect(P.pathLength(P.computeScene(st).path)).toBeCloseTo(referencePlan(st).length, 9);
  });
  it('discretePath starts at r1 and ends at r2', () => {
    const sc = P.computeScene(base);
    expect(sc.discretePath[0]).toEqual(base.r1);
    expect(sc.discretePath[sc.discretePath.length - 1]).toEqual(base.r2);
  });
});

describe('computeScene vs independent reference planner (seeded random scenes)', () => {
  // Scenes where obstacles are spread out (no overlapping C-obstacles) and both
  // ends are valid. Here the port is expected to agree with the reference.
  // Disagreements in harder scenes are explored by tools/explore-motion.mjs.
  let seed = 2024;
  const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  const scenes = [];
  while (scenes.length < 25) {
    const st = { ...P.DEFAULTS, n: 3 + Math.floor(rnd() * 3), x: 4,
      o1: [-2 + rnd() * 0.6, 1.6 + rnd() * 0.6], o2: [1.4 + rnd() * 0.6, 1.6 + rnd() * 0.6],
      o3: [-2 + rnd() * 0.6, -2.2 + rnd() * 0.6], o4: [1.4 + rnd() * 0.6, -2.2 + rnd() * 0.6],
      r1: [-2.8 + rnd() * 5.6, -2.8 + rnd() * 5.6], r2: [-2.8 + rnd() * 5.6, -2.8 + rnd() * 5.6] };
    const ref = referencePlan(st);
    if (ref.startOk && ref.goalOk) scenes.push({ st, ref });
  }
  it.each(scenes.map((s, i) => [i, s]))('scene %i: same validity, collision-free path, optimal length', (_i, { st, ref }) => {
    const sc = P.computeScene(st);
    expect(sc.robotinsideobstcond).toEqual([false, false]);
    expect(sc.path.length).toBeGreaterThan(1);
    // collision-free according to the independent geometry
    for (let k = 0; k + 1 < sc.path.length; k++) {
      const [p, q] = [sc.path[k], sc.path[k + 1]];
      for (let j = 1; j < 100; j++) {
        const pt = [p[0] + ((q[0] - p[0]) * j) / 100, p[1] + ((q[1] - p[1]) * j) / 100];
        expect(ref.freePoint(pt)).toBe(true);
      }
    }
    expect(P.pathLength(sc.path)).toBeCloseTo(ref.length, 6);
  });
});

export { samePointSet };

describe('configuration-space boundary vs the original run in Mathematica 15.0.1', () => {
  // configBoundary recorded by `npm run compare:original -- --trace=C2,C3,R016` (owner's run, v0.1.6).
  // Before v0.1.8 the port divided with `/`; Mathematica computes a/b as a * b^-1, so the last bits differed.
  const cases = [
    ['C2', { r1: [2.28, -2.71], n: 5, x: 4 }, [[3.0600056477851605, 3.0355339059327373], [-3.060005647785161, 3.0355339059327373], [-3.060005647785161, -3.1310254087452636], [3.0600056477851605, -3.1310254087452636]]],
    ['C3', { r1: [2.77, -3.17], n: 3, x: 4 }, [[3.102521204040518, 3.0355339059327373], [-3.1025212040405177, 3.0355339059327373], [-3.1025212040405177, -3.285533905932737], [3.102521204040518, -3.285533905932737]]],
    ['R016', { r1: [1.42, -0.05], n: 5, x: 4 }, [[3.0600056477851605, 3.0355339059327373], [-3.060005647785161, 3.0355339059327373], [-3.060005647785161, -3.1310254087452636], [3.0600056477851605, -3.1310254087452636]]],
  ];
  it.each(cases)('scene %s: configBoundaryFunc reproduces the original bit for bit', (id, { r1, n, x }, expected) => {
    const robot = P.regularPolygon(r1, n);
    expect(P.configBoundaryFunc(P.borderPolygon(x), robot, r1)).toEqual(expected);
  });
});

// The switch "errors of the original: kept | corrected" (shared/errata.js). Expected values: the independent
// reference planner (tests/support/reference-planner.js: a textbook visibility graph tested by sampling) and geometry
// worked out by hand in each test.
describe('corrected mode (E-MP)', () => {
  const named = JSON.parse(fs.readFileSync('tools/data/motion-scenes.json', 'utf8')).scenes;
  const scene = (id) => { const { id: _i, title: _t, ...st } = named.find((s) => s.id === id); return st; };
  const fix = (st) => ({ ...st, errata: 'corrected' });
  const enters = (path, ref) => path.slice(1).some((q, i) => {
    const p = path[i];
    for (let j = 1; j < 200; j++) if (!ref.freePoint([p[0] + ((q[0] - p[0]) * j) / 200, p[1] + ((q[1] - p[1]) * j) / 200])) return true;
    return false;
  });
  it('kept: errata = "original" gives exactly the scene without the variable', () => {
    for (const st of [P.DEFAULTS, scene('B1'), scene('C2')]) expect(P.computeScene({ ...st, errata: 'original' })).toEqual(P.computeScene(st));
  });
  it.each(['B1', 'B2', 'B3'])('E-MP-06: scene %s — the original goes straight through the obstacle; corrected takes the shortest way round (reference planner)', (id) => {
    const st = scene(id), ref = referencePlan(st);
    const o = P.computeScene(st), c = P.computeScene(fix(st));
    expect(o.path).toHaveLength(2); // the straight line
    expect(enters(o.path, ref)).toBe(true);
    expect(enters(c.path, ref)).toBe(false);
    expect(c.path.length).toBeGreaterThan(2);
    expect(P.pathLength(c.path)).toBeCloseTo(ref.length, 9);
    expect(P.pathLength(c.path)).toBeGreaterThan(P.pathLength(o.path));
  });
  it('E-MP-06: B1 by hand — the square C-obstacle spans the height of start and goal, so the straight line of length 4 is blocked; the detour is 4.3615', () => {
    const st = scene('B1');
    expect([st.r1, st.r2]).toEqual([[-3, -0.5], [1, -0.5]]);
    expect(P.pathLength(P.computeScene(st).path)).toBe(4);
    expect(P.pathLength(P.computeScene(fix(st)).path)).toBeCloseTo(4.3615, 4);
  });
  it('E-MP-06: crossesInterior — through two corners of a square: yes; along an edge, touching a corner, passing outside: no', () => {
    const sq = [[0, 0], [2, 0], [2, 2], [0, 2]];
    for (const poly of [sq, sq.slice().reverse()]) {
      expect(P.crossesInterior([[-1, -1], [3, 3]], [poly])).toBe(true); // the diagonal, through (0,0) and (2,2)
      expect(P.crossesInterior([[-1, 1], [3, 1]], [poly])).toBe(true); // through the middle
      expect(P.crossesInterior([[1, 1], [5, 1]], [poly])).toBe(true); // starts inside
      expect(P.crossesInterior([[0, 0], [2, 0]], [poly])).toBe(false); // an edge of the polygon itself
      expect(P.crossesInterior([[-1, 0], [3, 0]], [poly])).toBe(false); // along an edge, beyond both corners
      expect(P.crossesInterior([[-1, 1], [1, -1]], [poly])).toBe(false); // touches the corner (0, 0) only
      expect(P.crossesInterior([[-1, 3], [3, 3]], [poly])).toBe(false); // outside
      expect(P.crossesInterior([[0, 0], [2, 2]], [poly])).toBe(true); // corner to opposite corner
    }
  });
  it('the other named scenes keep their path length, and no corrected path enters a C-obstacle', () => {
    for (const s of named) {
      const { id, title: _t, ...st } = s;
      const o = P.computeScene(st), c = P.computeScene(fix(st));
      expect(c.robotinsideobstcond, id).toEqual(o.robotinsideobstcond);
      if (c.path.length > 1) expect(c.path.slice(1).some((q, i) => P.crossesInterior([c.path[i], q], c.robotobstconfig)), id).toBe(false);
      if (!['B1', 'B2', 'B3'].includes(id)) expect(P.pathLength(c.path), id).toBeCloseTo(P.pathLength(o.path), 9);
    }
  });
  it('seeded random scenes: corrected is collision-free and gives the length of the original', () => {
    let seed = 4242;
    const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
    const pick = (k) => { const [[x0, y0], [x1, y1]] = P.LOCATOR_RANGES[k]; return [Math.round((x0 + rnd() * (x1 - x0)) * 100) / 100, Math.round((y0 + rnd() * (y1 - y0)) * 100) / 100]; };
    let valid = 0;
    for (let i = 0; i < 60; i++) {
      const st = { ...P.DEFAULTS, n: 3 + Math.floor(rnd() * 3), x: 3 + Math.floor(rnd() * 3) };
      for (const k of ['r1', 'r2', 'o1', 'o2', 'o3', 'o4']) st[k] = pick(k);
      const o = P.computeScene(st), c = P.computeScene(fix(st));
      if (o.robotinsideobstcond.some(Boolean)) { expect(c.path).toEqual([]); continue; }
      valid++;
      if (c.path.length > 1) expect(c.path.slice(1).some((q, k) => P.crossesInterior([c.path[k], q], c.robotobstconfig))).toBe(false);
      expect(P.pathLength(c.path)).toBeCloseTo(P.pathLength(o.path), 9); // no degenerate alignment in random scenes
    }
    expect(valid).toBeGreaterThan(5);
  }, 60_000);
  it('E-MP-01: the corrected search is A* — the same shortest path on a hand-made graph and the same lengths as the reference on every named scene the original gets right', () => {
    const verts = [[0, 0], [1, 0], [2, 0], [1, 5]]; // start, on the way, goal, a detour
    const adj = P.getAdjListRev2(verts, [[verts[0], verts[1]], [verts[1], verts[2]], [verts[0], verts[3]], [verts[3], verts[2]]]);
    expect(P.myAstarRev2(adj, verts, 0, 2)).toEqual([0, 1, 2]);
    expect(P.myAstarRev2(adj, verts, 0, 2, true)).toEqual([0, 1, 2]);
    expect(P.myAstarRev2([[1], [0], []], [[0, 0], [1, 0], [5, 5]], 0, 2, true)).toBe(-1);
  });
  it('E-MP-02: two vertices on one ray (angle 3 rad, distances 1 and 2) — the original puts each before the other; corrected the nearer first', () => {
    const T = (v) => [[9, 9], v, [8, 8]];
    const far = [2 * Math.cos(3), 2 * Math.sin(3)], near = [Math.cos(3), Math.sin(3)];
    expect([P.angleSortCond([0, 0], T(far), T(near)), P.angleSortCond([0, 0], T(near), T(far))]).toEqual([true, true]);
    expect([P.angleSortCond([0, 0], T(far), T(near), true), P.angleSortCond([0, 0], T(near), T(far), true)]).toEqual([false, true]);
    // different angles: the angle decides in both modes
    const other = [Math.cos(1), Math.sin(1)];
    for (const corrected of [false, true]) expect([P.angleSortCond([0, 0], T(other), T(far), corrected), P.angleSortCond([0, 0], T(far), T(other), corrected)]).toEqual([true, false]);
  });
  it('E-MP-04: directions (1, 0) and (1, 1) are 45° apart; the original gives 0 because they agree in x', () => {
    expect(P.getClockwiseAngle([1, 1], [0, 0], [1, 0])).toBe(0);
    expect(P.getClockwiseAngle([1, 1], [0, 0], [1, 0], true)).toBeCloseTo(Math.PI / 4, 12);
    expect(P.getClockwiseAngle([1, -1], [0, 0], [1, 0], true)).toBeCloseTo(2 * Math.PI - Math.PI / 4, 12);
    expect(P.getClockwiseAngle([1, 0], [0, 0], [1, 0], true)).toBe(0); // equal directions
    // no shared coordinate: the same in both modes
    expect(P.getClockwiseAngle([1, 2], [0, 0], [3, 1], true)).toBe(P.getClockwiseAngle([1, 2], [0, 0], [3, 1]));
  });
  it('E-MP-03/04: from (0, 0) the square (1,0) (2,0) (2,1) (1,1) shows (1,0), (2,0) along its bottom edge and (1,1); a bar across that edge hides (2,0)', () => {
    const sq = [[1, 0], [2, 0], [2, 1], [1, 1]], bar = [[1.4, -0.5], [1.6, -0.5], [1.6, 0.5], [1.4, 0.5]];
    expect(P.visiblePolys([sq], [0, 0])).toEqual([[1, 1]]); // the original misses the two vertices at the height of the sweep point
    expect(P.visiblePolys([sq], [0, 0], true)).toEqual([[1, 0], [2, 0], [1, 1]]);
    expect(P.visiblePolys([sq, bar], [0, 0], true)).toEqual([[1, 0], [1, 1], [1.4, -0.5]]);
  });
});

