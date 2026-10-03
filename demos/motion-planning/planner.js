// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/motion-planning/planner.js
//
// Line-by-line port of the Wolfram Language code in
// "Motion Planning for Robot Path around Obstacles"
// (Shreyas Poyrekar, Aaron T. Becker, Arifa Sultana; Wolfram Demonstrations Project).
//
// Pure functions only: no DOM, no SVG. Every function keeps the name of the
// Mathematica function it ports so the two can be compared side by side
// (readable original source: docs/original-source/motion-planning.txt).
// Licence: CC BY-NC-SA 3.0, as an adaptation of the original. The original's own upstream
// sources (LaValle, Wikipedia, UPenn notes, Stack Exchange) are credited in LICENSE.md.
//
// Indexing: Mathematica lists are 1-based, JS arrays 0-based. Wherever the
// original uses an index *value* (A* node ids, Position[...]) the port uses
// 0-based indices consistently; behaviour is otherwise unchanged.
//
// Quirks of the ORIGINAL code are reproduced deliberately and marked
// "ORIGINAL QUIRK" so that the port behaves like the original, not like an
// idealised textbook algorithm. Places where the port could NOT reproduce the
// original exactly are marked "PORT DEVIATION".

import {
  mEqual, mUnequal, mLess, mGreater, mLessEq, chop, arcTan, mod, roundHalfEven,
  circlePoints, sortMma, add, sub, scale, neg, dot, norm, dist, normalize, det2,
  mean, canonicalCompare, key, total, euclid,
} from '../../shared/mma.js';

const TWO_PI = 2 * Math.PI;

// ---------------------------------------------------------------------------
// Basic polygon helpers
// ---------------------------------------------------------------------------

/** lineList[list] := Partition[Join[list, {First[list]}], 2, 1] — closed edge list. */
export function lineList(list) {
  return list.map((p, i) => [p, list[(i + 1) % list.length]]);
}

/** vertexList[list] := Partition[Join[list, list[[1;;2]]], 3, 1] — triples (v_i, v_i+1, v_i+2). */
export function vertexList(list) {
  const n = list.length;
  return list.map((_, i) => [list[i], list[(i + 1) % n], list[(i + 2) % n]]);
}

/** normalVector[{{x2,y2},{x1,y1}}] := Normalize[{-y2 + y1, x2 - x1}] */
export function normalVector([[x2, y2], [x1, y1]]) {
  return normalize([-y2 + y1, x2 - x1]);
}

/** vector[{{x2,y2},{x1,y1}}] := {x2 - x1, y2 - y1} */
export function vector([[x2, y2], [x1, y1]]) {
  return [x2 - x1, y2 - y1];
}

/** areaCalculation[{{x1,y1},{x2,y2}}] := x1 y2 - x2 y1 */
const areaCalculation = ([[x1, y1], [x2, y2]]) => x1 * y2 - x2 * y1;

/** areaOfPoly[poly] — signed shoelace area. */
export function areaOfPoly(poly) {
  return 0.5 * total(lineList(poly).map(areaCalculation));
}

const centroidCal = ([[x1, y1], [x2, y2]]) => {
  const c = x1 * y2 - x2 * y1;
  return [(x1 + x2) * c, (y1 + y2) * c];
};

/** centroidOfPoly[poly] — polygon centroid, or the vertex mean for zero area. */
export function centroidOfPoly(poly) {
  const area = areaOfPoly(poly);
  if (mUnequal(area, 0.0)) {
    const t = lineList(poly).reduce((s, e) => add(s, centroidCal(e)), [0, 0]);
    return scale(t, 1 / (6.0 * area));
  }
  return mean(poly);
}

// ---------------------------------------------------------------------------
// Minkowski sum (configuration-space obstacle)
// ---------------------------------------------------------------------------

/**
 * ConvexMinkowskiSumRev3[robot, obstacle]
 * Edge-vector merge of the obstacle with the reflected robot, offset so the
 * reference point is the robot centroid. Both inputs must be convex and CCW.
 */
export function ConvexMinkowskiSumRev3(robot, obstacle) {
  const rl = robot.length, ol = obstacle.length;
  const rc = centroidOfPoly(robot);
  const robotVectors = lineList(robot).map((e) => ({
    n: rl >= 2 ? neg(normalVector(e)) : null,
    v: rl >= 2 ? neg(vector(e)) : null,
    flag: 0,
    edge: e,
  }));
  const obstacleVectors = lineList(obstacle).map((e) => ({
    n: ol >= 2 ? normalVector(e) : null,
    v: ol >= 2 ? vector(e) : null,
    flag: 1,
    edge: e,
  }));
  const withAngle = [...robotVectors, ...obstacleVectors].map((o) => ({
    ...o,
    ang: mUnequal(o.n, [0.0, 0.0]) ? arcTan(o.n[0], o.n[1]) : null,
  }));
  // Sort[..., #1[[1]] < #2[[1]] &]  (tie order matters, see sortMma)
  const sorted = sortMma(withAngle, (a, b) => mLess(a.ang, b.ang));
  // pos = SequencePosition[flags, {0, 1}][[1, 1]]
  let pos = -1;
  for (let i = 0; i + 1 < sorted.length; i++) {
    if (sorted[i].flag === 0 && sorted[i + 1].flag === 1) { pos = i; break; }
  }
  if (pos < 0) {
    // PORT DEVIATION: the original would raise Part::partw here (no robot edge
    // followed by an obstacle edge). Cannot happen for the regular polygons
    // this demo generates; return the obstacle unchanged rather than crash.
    return obstacle.slice();
  }
  // (rc + a) - b, evaluated left to right as in the original (rc + (a - b) rounds differently)
  let prev = sub(add(rc, sorted[pos + 1].edge[0]), sorted[pos].edge[0]);
  const rotated = [...sorted.slice(pos), ...sorted.slice(0, pos)]; // RotateLeft[sorted, pos - 1] (1-based pos)
  const out = rotated.map((o) => (prev = chop(sub(prev, o.v))));
  // DeleteDuplicates (exact structural comparison)
  const seen = new Set();
  return out.filter((p) => { const k = key(p); if (seen.has(k)) return false; seen.add(k); return true; });
}

// ---------------------------------------------------------------------------
// Point / segment predicates
// ---------------------------------------------------------------------------

/** testpoint[poly, pt] — winding-number "inside" test (points ON the boundary count as outside). */
export function testpoint(poly, pt) {
  const angles = poly.map((v) => {
    const d = sub(pt, v);
    return mUnequal(d, [0.0, 0.0]) ? arcTan(d[0], d[1]) : 0.0;
  });
  let total = 0;
  for (let i = 0; i < angles.length; i++) {
    const prevIdx = (i - 1 + angles.length) % angles.length; // RotateRight
    total += mod(angles[i] - angles[prevIdx], TWO_PI, -Math.PI);
  }
  return roundHalfEven(total / 2 / Math.PI) !== 0;
}

/** linelineInt — intersection of two infinite lines given by point pairs (Wikipedia formula). */
export function linelineInt([[x1, y1], [x2, y2]], [[x3, y3], [x4, y4]]) {
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  return [
    ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / den,
    ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / den,
  ];
}

/**
 * configBoundaryFunc[borderpoly, robotPoly, r] — the boundary polygon shrunk
 * by the robot's extent (configuration-space boundary).
 * `robotPoly` is the list of robot vertices (the original passes Polygon[...] and takes [[1]]),
 * `r1` is the robot reference point (the original uses r[[1]]).
 */
export function configBoundaryFunc(borderpoly, robotPoly, r1) {
  const n = borderpoly.length;
  const A = [...borderpoly, borderpoly[0]];
  const mids = borderpoly.map((_, i) => scale(add(A[i], A[i + 1]), 1 / 2.0));
  const normals = borderpoly.map((_, i) => normalize([A[i + 1][1] - A[i][1], A[i][0] - A[i + 1][0]]));
  const rel = robotPoly.map((p) => sub(p, r1));
  const offsets = normals.map((nv) => {
    // First[MaximalBy[rel, Dot[nv, #] &]]
    let best = rel[0], bestVal = dot(nv, rel[0]);
    for (const p of rel.slice(1)) {
      const v = dot(nv, p);
      if (v > bestVal) { best = p; bestVal = v; }
    }
    return best;
  });
  return borderpoly.map((_, i) => {
    const ip1 = i + 1 < n ? i + 1 : 0;
    return linelineInt(
      [sub(borderpoly[i], offsets[i]), sub(mids[i], offsets[i])],
      [sub(borderpoly[ip1], offsets[ip1]), sub(mids[ip1], offsets[ip1])],
    );
  });
}

/** reflex[p1, p2, p3] := Chop[Det[{{1,x1,y1},{1,x2,y2},{1,x3,y3}}]] > 0 (counter-clockwise turn). */
export function reflex([x1, y1], [x2, y2], [x3, y3]) {
  const d = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
  return chop(d) > 0.0;
}

const xor = (a, b) => a !== b;

/** biTangent[{p1,p2,p3},{p4,p5,p6}] — TRUE when the line p2–p5 is NOT a bitangent. */
export function biTangent([p1, p2, p3], [p4, p5, p6]) {
  return xor(reflex(p1, p2, p5), reflex(p3, p2, p5)) || xor(reflex(p4, p5, p2), reflex(p6, p5, p2));
}

/** glancingBlow[a, {p1,p2,p3}] — TRUE when the line from a through p2 cuts into the polygon at p2. */
export function glancingBlow(a, [p1, p2, p3]) {
  return xor(reflex(p1, p2, a), reflex(p3, p2, a));
}

/** λ[{a,b}][p] — parameter of the projection of p on line a→b (0 at a, 1 at b). */
export function lambda([a, b], p) {
  const ab = sub(a, b);
  return dot(sub(a, p), ab) / dot(ab, ab);
}

/** LineIntersectionPoint[{{a,b},{c,d}}] — intersection of the infinite lines ab and cd. */
export function LineIntersectionPoint([[a, b], [c, d]]) {
  const num = sub(scale(sub(c, d), det2(a, b)), scale(sub(a, b), det2(c, d)));
  return scale(num, 1 / det2(sub(a, b), sub(c, d)));
}

/**
 * SegmentIntersectionQ[{{a,b},{c,d}}] — proper intersection of two segments.
 * Parallel segments (Det == 0) never intersect; an intersection exactly at
 * any endpoint does NOT count (original comment: "ignore the end points").
 */
export function SegmentIntersectionQ([p1, p2]) {
  const [a, b] = p1, [c, d] = p2;
  if (mEqual(det2(sub(a, b), sub(c, d)), 0.0)) return false;
  const e = chop(LineIntersectionPoint([p1, p2]));
  const l1 = lambda(p1, e), l2 = lambda(p2, e);
  return mLessEq(0.0, l1) && mLessEq(l1, 1.0) && mLessEq(0.0, l2) && mLessEq(l2, 1.0) &&
    !(mEqual(e, a) || mEqual(e, b) || mEqual(e, c) || mEqual(e, d));
}

/** getAngle[{p1, p2}] — direction angle of p1→p2 in [0, 2π). */
export function getAngle([[x1, y1], [x2, y2]]) {
  const d = [x2 - x1, y2 - y1];
  return mUnequal(d, [0.0, 0.0]) ? mod(arcTan(d[0], d[1]), TWO_PI) : 0.0;
}

/** pointOnSegmentQ[{p1, p2}, p3] — p3 strictly inside segment p1p2. */
export function pointOnSegmentQ([[x1, y1], [x2, y2]], [x3, y3]) {
  const AB = [x2 - x1, y2 - y1], AC = [x3 - x1, y3 - y1];
  const crossZ = AB[0] * AC[1] - AB[1] * AC[0];
  if (chop(crossZ) !== 0) return false;
  const Kac = dot(AB, AC), Kab = dot(AB, AB);
  if (mLess(Kac, 0.0)) return false;
  if (mGreater(Kac, Kab)) return false;
  return mLess(0.0, Kac) && mLess(Kac, Kab);
}

function vectorAngle(a, b) {
  const c = dot(a, b) / (norm(a) * norm(b));
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

/** getClockwiseAngle[p1, p2, p3] — angle from (p3 - p2) to (p1 - p2), in [0, 2π). */
export function getClockwiseAngle(p1, p2, p3) {
  const a = chop(sub(p3, p2)), b = chop(sub(p1, p2));
  // ORIGINAL QUIRK: the angle is forced to 0 whenever the two vectors agree in
  // either coordinate (the original tests a-b component-wise with And).
  const angle = (mUnequal(a[0] - b[0], 0.0) && mUnequal(a[1] - b[1], 0.0)) ? vectorAngle(a, b) : 0;
  const crossZ = a[0] * b[1] - a[1] * b[0];
  return crossZ < 0.0 ? TWO_PI - angle : angle;
}

/** intersectInteriorQRev2[p, {w1,w2,w3}] — w2 is an "interior" vertex as seen from p. */
export function intersectInteriorQRev2(p, [w1, w2, w3]) {
  return mGreater(getClockwiseAngle(w1, w2, w3), getClockwiseAngle(p, w2, w3));
}

/** angleSortCond[point, l1, l2] — sweep order of vertex triples around `point`. */
export function angleSortCond(point, l1, l2) {
  const a = getAngle([point, l1[1]]), b = getAngle([point, l2[1]]);
  const c = norm(sub(point, l1[1]));
  // ORIGINAL QUIRK: the tie-break compares the distance c with the ANGLE b
  // (`c < b`); the evident intent was `c < d` (distance vs distance).
  return mLess(a, b) || (mEqual(a, b) && mLess(c, b));
}

/** distSortCond — distance along the sweep ray (only reorders jList; has no effect on results). */
export function distSortCond(line, l1, l2, point) {
  const a = dist(LineIntersectionPoint(chop([line, l1])), point);
  const b = dist(LineIntersectionPoint(chop([line, l2])), point);
  return a < b;
}

const sameSeg = (s, t) => key(s) === key(t);

/**
 * visiblePolys[polys, p] — rotational-sweep visibility (after D.-T. Lee):
 * returns the polygon vertices visible from p along tangent (non-glancing) lines.
 */
export function visiblePolys(polys, p) {
  const listofAllLines = polys.flatMap((poly) => lineList(poly));
  const maxX = Math.max(...polys.flat().map((v) => v[0]));
  const infiniteLine = [p, [1.0 + maxX, p[1]]];
  const orderedList = polys.map((poly) => (testpoint(poly, p) ? poly.slice().reverse() : poly));
  const sortedList = sortMma(orderedList.flatMap((poly) => vertexList(poly)),
    (t1, t2) => angleSortCond(p, t1, t2));
  let jList = listofAllLines.filter((e) => SegmentIntersectionQ([infiniteLine, e]));
  jList = sortMma(jList, (l1, l2) => distSortCond(infiniteLine, l1, l2, p));

  const visible = [];
  let wi, wip;
  sortedList.forEach(([a, b, c], idx) => {
    const i = idx + 1; // 1-based like the original loop
    if (intersectInteriorQRev2(p, [a, b, c])) {
      wi = false;
    } else if (i === 1 || !pointOnSegmentQ([p, b], a)) {
      wi = !jList.some((e) => SegmentIntersectionQ([[p, b], e]));
    } else if (!wip) {
      wi = false;
    } else {
      // ORIGINAL QUIRK: the original calls SegmentIntersectionQ with the wrong
      // argument shape here (SegmentIntersectionQ[{{a,b}}, #]); that call never
      // evaluates, the If[] is left unevaluated and wi keeps its previous value
      // (which equals wip == True). Reproduced as a no-op.
    }
    if (wi && !glancingBlow(p, [a, b, c])) visible.push(b);
    wip = wi;
    jList.push([a, b]);
    jList = jList.filter((e) => !sameSeg(e, [b, c]));
  });
  return visible;
}

/** biTangents2polyRev1[poly1, poly2] — all bitangent vertex pairs between two polygons. */
export function biTangents2polyRev1(poly1, poly2) {
  const triple = (poly, i) => {
    const n = poly.length;
    return [poly[(i - 1 + n) % n], poly[i], poly[(i + 1) % n]]; // RotateLeft[poly, i-2][[1;;3]]
  };
  const out = [];
  for (let i = 0; i < poly1.length; i++) {
    for (let j = 0; j < poly2.length; j++) {
      if (biTangent(triple(poly1, i), triple(poly2, j)) === false) out.push([poly1[i], poly2[j]]);
    }
  }
  return out;
}

/** visBiLineRev2[configpoly] — visible bitangent lines between C-obstacle vertices. */
export function visBiLineRev2(configpoly) {
  const bitangentKeys = new Set();
  for (let a = 0; a < configpoly.length; a++) {
    for (let b = a + 1; b < configpoly.length; b++) {
      for (const line of biTangents2polyRev1(configpoly[a], configpoly[b])) bitangentKeys.add(key(line));
    }
  }
  const out = [];
  configpoly.forEach((poly) => {
    const n = poly.length;
    poly.forEach((v, i) => {
      const nxt = poly[(i + 1) % n], prv = poly[(i - 1 + n) % n];
      // Look from a point nudged 0.001 outward from the vertex.
      const q = sub(v, scale(sub(add(nxt, prv), scale(v, 2)), 0.001));
      const lines = visiblePolys(configpoly, q).map((pt) => [pt, v]);
      // Intersection[lines, bitangentLine]: unique, canonical order
      const hit = [];
      const seen = new Set();
      for (const l of lines) {
        const k = key(l);
        if (bitangentKeys.has(k) && !seen.has(k)) { seen.add(k); hit.push(l); }
      }
      hit.sort(canonicalCompare);
      out.push(...hit);
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Graph search
// ---------------------------------------------------------------------------

/** getAdjListRev2[pts, edges] — adjacency lists (indices into pts). */
export function getAdjListRev2(pts, edges) {
  const index = new Map(pts.map((p, i) => [key(p), i]));
  const adj = pts.map(() => []);
  for (const [p, q] of edges) {
    const i = index.get(key(p)), j = index.get(key(q));
    // Cannot happen: dpoints filtering keeps every remaining endpoint in pts. (In the original a
    // half-replaced edge would put a raw point into the adjacency list.)
    if (i === undefined || j === undefined) continue;
    if (i === j) { adj[i].push(j); continue; }
    adj[i].push(j);
    adj[j].push(i);
  }
  return adj;
}

/**
 * myAstarRev2[adjL, verts, si, fi] — returns a list of node indices or -1.
 * ORIGINAL QUIRK: the heuristic term for neighbours is
 * EuclideanDistance[verts[[nbr]], verts[[nbr]]] (always 0), so the search is
 * effectively Dijkstra's algorithm. It still finds a shortest path in the graph.
 */
export function myAstarRev2(adjL, verts, si, fi) {
  let openSet = [si];
  const cameFrom = verts.map(() => -1);
  const gScore = verts.map(() => Infinity);
  const fScore = verts.map(() => Infinity);
  gScore[si] = 0;
  fScore[si] = euclid(verts[si], verts[fi]);
  while (openSet.length > 0) {
    const currentF = Math.min(...openSet.map((k) => fScore[k]));
    // Position[fScore[[openSet]], currentfscore] matches with Mathematica's tolerant equality
    const current = openSet[openSet.findIndex((k) => mEqual(fScore[k], currentF))];
    if (current === fi) {
      const path = [fi];
      while (path[0] !== si) path.unshift(cameFrom[path[0]]);
      return path;
    }
    openSet = openSet.filter((k) => k !== current);
    for (const nbr of adjL[current]) {
      const tentative = gScore[current] + euclid(verts[current], verts[nbr]);
      if (mLess(tentative, gScore[nbr])) {
        cameFrom[nbr] = current;
        gScore[nbr] = tentative;
        fScore[nbr] = gScore[nbr] + euclid(verts[nbr], verts[nbr]); // ORIGINAL QUIRK (see above)
        if (!openSet.includes(nbr)) openSet.push(nbr);
      }
    }
  }
  return -1;
}

/** discretizeLineRev1[{p1, p2}, step] — points every `step` along the segment (end point excluded unless it lands exactly). */
export function discretizeLineRev1([p1, p2], step) {
  const d = euclid(p1, p2); // N@EuclideanDistance
  if (d === 0) return [p1];
  const h = step * (1 / d); // Mathematica evaluates step/d as step * d^-1
  const count = Math.floor(1 / h + 1e-12);
  const out = [];
  for (let k = 0; k <= count; k++) {
    const t = k * h;
    out.push([p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The Manipulate body
// ---------------------------------------------------------------------------

/** Initial control values of the original Manipulate. */
export const DEFAULTS = Object.freeze({
  configOrWork: 'workspace',
  x: 4, // boundary sides
  n: 3, // robot sides
  s: 1, // progress (1-based index into discretePath)
  r1: [-2.0, 2.75],
  r2: [0.5, -3.0],
  o1: [2.0, 2.5],
  o2: [-1.0, -0.5],
  o3: [-2.0, -2.4],
  o4: [2.0, -1.0],
});

/** Locator ranges from the Manipulate control specs. */
export const LOCATOR_RANGES = Object.freeze({
  r1: [[-4.25, -4.25], [4.15, 4.15]],
  r2: [[-4.25, -4.25], [4.15, 4.15]],
  o1: [[-3.75, -3.75], [3.75, 3.75]],
  o2: [[-3.75, -3.75], [3.75, 3.75]],
  o3: [[-3.75, -3.75], [3.75, 3.75]],
  o4: [[-3.75, -3.75], [3.75, 3.75]],
});

export const PLOT_RANGE = 4.65;
export const DISCRETIZE_STEP = 0.09;

/** Centered boundary polygon for `x` sides. */
export function borderPolygon(x) {
  const R = x < 5 ? 5.0 : 4.75;
  const pts = circlePoints(x).map((p) => scale(p, R));
  const ys = pts.map((p) => p[1]);
  const shift = (Math.max(...ys) + Math.min(...ys)) / 2.0;
  return pts.map((p) => [p[0], p[1] - shift]);
}

/** Regular n-gon of radius 0.5 centred at c (robot or obstacle shape). */
export function regularPolygon(c, sides) {
  return circlePoints(sides).map((p) => add(c, scale(p, 0.5)));
}

/**
 * Full computation of the Manipulate body for one set of control values.
 * Returns every quantity the original draws, so the renderer and the tests
 * can both use it.
 */
export function computeScene(state) {
  const { x, n } = state;
  const r = [state.r1, state.r2];
  const o = [state.o1, state.o2, state.o3, state.o4];
  const borderpoly = borderPolygon(x);

  const robotStartPoly = regularPolygon(r[0], n);
  const robotEndPoly = regularPolygon(r[1], n);
  // Obstacle i is a regular (i+2)-gon: triangle, square, pentagon, hexagon.
  const obstaclepoly = o.map((c, i) => regularPolygon(c, i + 3));
  const robotobstconfig = obstaclepoly.map((ob) => ConvexMinkowskiSumRev3(robotStartPoly, ob));
  const verticestoVertices = visBiLineRev2(robotobstconfig);

  const configBoundary = configBoundaryFunc(borderpoly, robotStartPoly, r[0]);
  const configadd = [...configBoundary, configBoundary[0]];

  const obstCollision = r.map((rj) => robotobstconfig.map((cob) => testpoint(cob, rj)));
  const robotinsideobstcond = r.map((rj, j) => !testpoint(configadd, rj) || obstCollision[j].some(Boolean));

  const linesStarttoObstacles = obstCollision[0].some(Boolean) ? []
    : visiblePolys(robotobstconfig, r[0]).map((pt) => [r[0], pt]);
  const linesEndtoObstacles = obstCollision[1].some(Boolean) ? []
    : visiblePolys(robotobstconfig, r[1]).map((pt) => [r[1], pt]);

  let path = [];
  let discretePath = [];
  let graph = null;
  const diagnostics = [];

  if (!robotinsideobstcond.some(Boolean)) {
    const allminkowsegs = robotobstconfig.flatMap((cob) => lineList(cob));
    const directBlocked = allminkowsegs.some((seg) => SegmentIntersectionQ([[r[0], r[1]], seg]));
    if (directBlocked) {
      // Keep only C-obstacle edges that do not cross any other C-obstacle edge.
      const noInterConfig = allminkowsegs.filter((seg) => {
        const firstPos = allminkowsegs.findIndex((t) => sameSeg(t, seg)); // Drop[..., {First@Position[...]}]
        return allminkowsegs.every((other, k) => k === firstPos || !SegmentIntersectionQ([seg, other]));
      });
      let allLines = [...linesStarttoObstacles, ...linesEndtoObstacles, ...verticestoVertices, ...noInterConfig];
      // DeleteDuplicates@Flatten[allLines, 1]
      const seen = new Set();
      let allPoints = [];
      for (const pt of allLines.flat()) {
        const k = key(pt);
        if (!seen.has(k)) { seen.add(k); allPoints.push(pt); }
      }
      const dpoints = allPoints.filter((pt) => !testpoint(configBoundary, pt));
      const dkeys = new Set(dpoints.map(key));
      // Complement[allPoints, dpoints] — NB: Complement also sorts (canonical order).
      allPoints = allPoints.filter((pt) => !dkeys.has(key(pt))).sort(canonicalCompare);
      allLines = allLines.filter(([p, q]) => !dkeys.has(key(p)) && !dkeys.has(key(q)));

      const startPoint = allPoints.findIndex((pt) => mEqual(pt, r[0]));
      const endPoint = allPoints.findIndex((pt) => mEqual(pt, r[1]));
      const adjList = getAdjListRev2(allPoints, allLines);
      graph = { allPoints, allLines, adjList, startPoint, endPoint, noInterConfig };
      if (startPoint < 0 || endPoint < 0) {
        // PORT DEVIATION: the original evaluates First@@{} here (an error,
        // silenced by Quiet) and its behaviour is undefined. The port reports "no path".
        diagnostics.push(startPoint < 0 ? 'start not connected to graph' : 'goal not connected to graph');
        path = [];
      } else {
        const idx = myAstarRev2(adjList, allPoints, startPoint, endPoint);
        path = idx === -1 ? [] : idx.map((k) => allPoints[k]);
      }
    } else {
      path = [r[0], r[1]];
    }
    // With an empty path the original still appends r2 (discretePath = {r2}).
    discretePath = [];
    for (let k = 0; k + 1 < path.length; k++) discretePath.push(...discretizeLineRev1([path[k], path[k + 1]], DISCRETIZE_STEP));
    discretePath.push(r[1]);
  }

  return {
    borderpoly, robotStartPoly, robotEndPoly, obstaclepoly, robotobstconfig,
    verticestoVertices, configBoundary, obstCollision, robotinsideobstcond,
    linesStarttoObstacles, linesEndtoObstacles, path, discretePath, graph, diagnostics,
  };
}

/** Path length helper used by tests and the on-screen readout. */
export function pathLength(path) {
  let L = 0;
  for (let k = 0; k + 1 < path.length; k++) L += dist(path[k], path[k + 1]);
  return L;
}
