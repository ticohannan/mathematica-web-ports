// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/prm-core.js — the functions that "Probabilistic Roadmap Method", "Probabilistic Roadmap
// Method for Robot Arm" and "Probabilistic Roadmap Method in 3D" (all by Aaron T. Becker and Yitong Lu) define
// IDENTICALLY (up to the number of coordinates) in their Initialization code, ported once. Pure: no DOM, importable in Node. Names follow the originals; indexes into goodPts that
// the originals store (adjacency lists, A* paths) stay 1-based, as in Mathematica, so the state can be
// compared with the originals' saved states directly.
//
// Generalisations (needed so that both apps can share the code; each app's model keeps the original's own
// signatures as thin wrappers):
//   * pathOKT takes a collision PREDICATE instead of the PRM's `polys` (the robot app's pathOKTrobot is the same
//     code with detCollision as the predicate);
//   * connectPoints takes the local planner (ps, pe) -> boolean instead of polys / pObs3, obsRad, widtha.
//   * n dimensions (v0.1.16, owner prm-3d): toroidDist, pathOKT, toroidLine and toroidPt loop over the coordinates
//     of their arguments (2 in the 2D Demonstrations, 3 in "Probabilistic Roadmap Method in 3D", whose code repeats
//     every 2D line once more for the third coordinate). Sums are formed left to right starting from the first term,
//     so every 2D result is the same double as before (guarded by the prm and prm-robot-arm unit and golden
//     replays). The 3D-only differences are options: toroidPt's zero test (`zeroTest`, N-P3-03) and its wrap;
//     myAstar, connectPoints, planQuery and progressOnPath take an optional distance function / toroidPt.
import { mLess, mLessEq, mGreater, mEqual, total, circlePoints as circlePointsShared } from '../../shared/mma.js';
import { nearest, positionOf } from '../../shared/mma-extra.js';

/** 2π as a machine number (Mathematica's N[2 Pi]). */
export const TWO_PI = 2 * Math.PI;

/**
 * toroidDist := Sqrt[Min[(#1[[1]]-#2[[1]])^2, (2π-Abs[#1[[1]]-#2[[1]]])^2] + Min[(#1[[2]]-#2[[2]])^2, (2π-Abs[#1[[2]]-#2[[2]]])^2]] &
 * (the 3D Demonstration adds + Min[(#1[[3]]-#2[[3]])^2, (2π-Abs[#1[[3]]-#2[[3]]])^2]).
 * Torus distance on [0, 2π)^n, n = the length of a; symmetric in its arguments. The terms are added in coordinate
 * order, left to right (lead K-P3-02).
 */
export function toroidDist(a, b) {
  const d0 = a[0] - b[0], w0 = TWO_PI - Math.abs(d0);
  let s = Math.min(d0 * d0, w0 * w0);
  for (let k = 1; k < a.length; k++) {
    const d = a[k] - b[k], w = TWO_PI - Math.abs(d);
    s += Math.min(d * d, w * w);
  }
  return Math.sqrt(s);
}

/**
 * The shorter way from p to q along one coordinate of the torus: q - p + If[Abs[q-p] < 2π - Abs[q-p], 0,
 * If[q > p, -2π, +2π]] (tolerant Less / Greater), as every toroid function of the originals writes it.
 */
const shortDiff = (p, q) => {
  const d = Math.abs(q - p);
  return q - p + (mLess(d, TWO_PI - d) ? 0 : mGreater(q, p) ? -TWO_PI : TWO_PI);
};

/** wrapto0to2π[x_] := If[x > 2π, x - 2π, If[x < 0, x + 2π, x]] (the 3D Demonstration; tolerant comparisons) */
export const wrapto0to2pi = (x) => (mGreater(x, TWO_PI) ? x - TWO_PI : mLess(x, 0) ? x + TWO_PI : x);

/** angtest[p1:{x1_,y1_}, p2:{x2_,y2_}] := p1.{{0,-1},{1,0}}.p2 > 0   (= y1 x2 - x1 y2 > 0) */
export function angtest(p1, p2) {
  return mGreater(p1[1] * p2[0] - p1[0] * p2[1], 0);
}

/**
 * ptInPoly[poly, pt]: translate poly so that pt is the origin; pt is inside if the angle tests of all adjacent
 * vertex pairs (RotateLeft) are all True or all False (Equal @@ ...). Convex polygons only (the original's comment).
 * ORIGINAL QUIRK (Q-PR-08): a point exactly on an edge of a counter-clockwise polygon (CirclePoints) counts as inside.
 */
export function ptInPoly(poly, pt) {
  const v = poly.map((q) => [q[0] - pt[0], q[1] - pt[1]]);
  const n = v.length;
  const first = angtest(v[0], v[1 % n]);
  for (let k = 1; k < n; k++) if (angtest(v[k], v[(k + 1) % n]) !== first) return false;
  return true;
}

/** ptInPolys[polys, pt] := Or @@ (ptInPoly[#, pt] & /@ polys) */
export const ptInPolys = (polys, pt) => polys.some((poly) => ptInPoly(poly, pt));

/**
 * pathOKT[ps, pe, <obstacles>, delta] with the obstacle test as a predicate `collides(pt) -> boolean`.
 * "Primitive collision checking that checks every delta distance along a line from ps to pe ... uses toroid
 * assumption." Kept exactly:
 *   - the shorter way round the torus is chosen per coordinate (dx < 2π-dx, tolerant Less);
 *   - dist <= delta -> True WITHOUT any test (ORIGINAL QUIRK Q-PR-04: neither end point is ever tested, and a
 *     segment shorter than delta is always accepted);
 *   - otherwise n = Ceiling[dist/delta] interior samples pt = ps + {dx,dy} i/(n+1), i = 1..n;
 *   - each sample is wrapped ONCE by ±2π per coordinate (If[pt<0, pt+2π]; If[pt>2π, pt-2π]).
 * Numerics: Mathematica forms {dx,dy}*(i)/(n+1) as {dx,dy} * Rational[i, n+1], i.e. one multiplication by the
 * machine value of i/(n+1); the port does the same.
 */
//
// n dimensions (pathOKTrobot of the 3D Demonstration: dx, dy, dz, `dist = Sqrt[dx^2 + dy^2 + dz^2]`, each sample
// coordinate wrapped by wrapto0to2π, i.e. `> 2π` tested first, nested): the 2D wrap (`< 0` then `> 2π`, sequential)
// and wrapto0to2π give the same double for every x in (-2π, 4π) (a sample is never further out), so one wrap serves
// both (unit test "wrapto0to2π and the 2D wrap give the same result on (-2π, 4π)").
export function pathOKT(ps, pe, collides, delta) {
  const n0 = ps.length;
  const d = new Array(n0);
  for (let k = 0; k < n0; k++) d[k] = shortDiff(ps[k], pe[k]);
  let s = d[0] * d[0];
  for (let k = 1; k < n0; k++) s += d[k] * d[k];
  const dist = Math.sqrt(s);
  if (mLessEq(dist, delta)) return true;
  const n = Math.ceil(dist / delta);
  for (let i = 1; i <= n; i++) {
    const f = i / (n + 1);
    const pt = new Array(n0);
    for (let k = 0; k < n0; k++) pt[k] = wrapto0to2pi(ps[k] + d[k] * f);
    if (collides(pt)) return false; // !Or @@ Table[...] — Or stops at the first True
  }
  return true;
}

/**
 * CirclePoints[n] for the polygons of the PRM Demonstration (n = 3…7, RandomInteger[{3, 7}]). shared/mma.js
 * circlePoints has closed forms for n = 3…6 (n = 5 is correctly rounded, n = 4 is 1/Sqrt[2] in machine arithmetic,
 * 1 ulp below the correctly rounded value, as Mathematica evaluates it); for n = 7 it falls back to Math.cos /
 * Math.sin, which are off in the last bit. Mathematica's machine values for n = 7 are the correctly rounded ones
 * (computed with mpmath at 50 digits; reproduces the 7-gon of owner state 1 bit for bit), in the same vertex order
 * (first vertex at angle -π/2 + π/7, counter-clockwise).
 */
const CIRCLE_POINTS_7 = [
  [0.4338837391175581, -0.9009688679024191], [0.9749279121818236, -0.2225209339563144],
  [0.7818314824680298, 0.6234898018587335], [0, 1], [-0.7818314824680298, 0.6234898018587335],
  [-0.9749279121818236, -0.2225209339563144], [-0.4338837391175581, -0.9009688679024191],
];
export const circlePoints = (n) => (n === 7 ? CIRCLE_POINTS_7.map((p) => p.slice()) : circlePointsShared(n));

/**
 * loc[col] — "a colored locator icon", as data: GraphicsBox[{col, {AbsoluteThickness[1], LineBox[cross hairs from
 * 2 to 10 units off centre], CircleBox[{-0.5, 0.5}, 5]}, {AbsoluteThickness[3], Opacity[0.3], CircleBox[{-0.5, 0.5},
 * 3]}}, ImageSize -> 17, PlotRange -> {{-8, 8}, {-8, 8}}]. Coordinates in icon units; pxPerUnit = 17/16.
 * The cross hairs reach beyond the icon's PlotRange (10 > 8) and are drawn unclipped, as in the snapshots.
 */
export const LOC_ICON = {
  pxPerUnit: 17 / 16,
  lines: [[[0, -10], [0, -2]], [[0, 2], [0, 10]], [[-10, 0], [-2, 0]], [[2, 0], [10, 0]]],
  circles: [{ c: [-0.5, 0.5], r: 5, thicknessPx: 1, opacity: 1 }, { c: [-0.5, 0.5], r: 3, thicknessPx: 3, opacity: 0.3 }],
};

/** Mathematica SameQ for machine reals: equal, or differing only in the last binary digit (used by Position). */
export const sameReal = (a, b) => a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= Number.EPSILON * Math.max(Math.abs(a), Math.abs(b)));

/**
 * myAstar[adjL, verts, si, fi]: "A*" from node si to node fi (1-based), returns the node list {si, ..., fi} or -1.
 * ORIGINAL QUIRKS kept (Q-PR-01): only the start node gets the heuristic (fScore[si] = toroidDist[verts[si],
 * verts[fi]]); every other node gets fScore = gScore + toroidDist[verts[nbr], verts[nbr]] = gScore + 0, so the
 * search is Dijkstra's algorithm. The node with the lowest fScore is the FIRST one in openSet order
 * (First@Position[...]); openSet is a list in insertion order (AppendTo), with no closed set, so a node can be
 * opened again when a cheaper path to it is found. `tentativegScore < gScore[nbr]` is Mathematica's tolerant Less.
 */
export function myAstar(adjL, verts, si, fi, dist = toroidDist) {
  const N = verts.length;
  let openSet = [si];
  const cameFrom = new Array(N + 1).fill(-1);
  const gScore = new Array(N + 1).fill(Infinity);
  gScore[si] = 0;
  const fScore = new Array(N + 1).fill(Infinity);
  fScore[si] = dist(verts[si - 1], verts[fi - 1]);
  while (openSet.length > 0) {
    let currentfscore = Infinity;
    for (const k of openSet) if (fScore[k] < currentfscore) currentfscore = fScore[k];
    // current = openSet[[First@@Position[fScore[[openSet]], currentfscore]]]. With one lowest value this is its
    // position; with two equal lowest values First@@ gives First[{k1}, {k2}] (k1, First's default-value form); with
    // three or more it is First[{k1}, {k2}, {k3}], an error in the original, after which the search cannot finish
    // (it runs until Manipulate's time-out). The port takes the first of the ties in all cases (Q-PR-01).
    let idx = openSet.findIndex((k) => sameReal(fScore[k], currentfscore));
    if (idx < 0) idx = 0;
    const current = openSet[idx];
    if (current === fi) {
      const path = [fi];
      while (path[0] !== si) path.unshift(cameFrom[path[0]]);
      return path;
    }
    openSet = openSet.filter((k) => k !== current); // DeleteCases
    for (const nbr of adjL[current - 1]) {
      const tentativegScore = gScore[current] + dist(verts[current - 1], verts[nbr - 1]);
      if (mLess(tentativegScore, gScore[nbr])) {
        cameFrom[nbr] = current;
        gScore[nbr] = tentativegScore;
        fScore[nbr] = gScore[nbr] + dist(verts[nbr - 1], verts[nbr - 1]);
        if (!openSet.includes(nbr)) openSet.push(nbr); // If[FreeQ[openSet, nbr], AppendTo[openSet, nbr]]
      }
    }
  }
  return -1; // Failure
}

/**
 * toroidLine[e, color1, color2] AS DATA: the line pieces the original draws for the edge e = {p, q}.
 * If the edge is shorter going round the torus in x or y (dx > 2π-dx || dy > 2π-dy; in 3D also || dz > 2π-dz), two
 * pieces in color1 that leave the square (cube): {p, p+{dx,dy}} and {q, q-{dx,dy}}; otherwise one piece {p, q} in
 * color2 (color1 when color2 is -1, the default). Returns [{ color, line: [[x,y],[x,y]] }, ...].
 */
export function toroidLine(e, color1 = 'Blue', color2 = -1) {
  const [p, q] = e;
  let wrapped = false;
  for (let k = 0; k < p.length; k++) {
    const d = Math.abs(q[k] - p[k]);
    if (mGreater(d, TWO_PI - d)) { wrapped = true; break; } // Or stops at the first True
  }
  if (wrapped) {
    const d = p.map((_, k) => shortDiff(p[k], q[k]));
    return [
      { color: color1, wrapped: true, line: [p, p.map((v, k) => v + d[k])] },
      { color: color1, wrapped: true, line: [q, q.map((v, k) => v - d[k])] },
    ];
  }
  return [{ color: color2 === -1 ? color1 : color2, wrapped: false, line: [p, q] }];
}

/** toroidLines[pts, color1, color2] := Table[toroidLine[e, color1, color2], {e, pts}] (flattened to pieces) */
export const toroidLines = (edges, color1 = 'Blue', color2 = -1) => edges.flatMap((e) => toroidLine(e, color1, color2));

/**
 * toroidPt[e, frac]: the point at fraction frac along the (torus-shortest) edge e = {p, q}, wrapped back into
 * [0, 2π] once per coordinate; p itself when the edge has length 0.
 * zeroTest 'shortest' (default; the 2D Demonstrations): dist = Sqrt[dx2^2 + dy2^2] of the shortest-way differences,
 *   wrap `pt + If[pt > 2π, -2π, If[pt < 0, 2π, 0]]`;
 * zeroTest 'absolute' (the 3D Demonstration, N-P3-03): dist = Sqrt[dx^2 + dy^2 + dz^2] of the ABSOLUTE differences,
 *   wrap wrapto0to2π. The two differ only for points exactly 2π apart in a coordinate.
 */
export function toroidPt(e, frac, { zeroTest = 'shortest' } = {}) {
  const [p, q] = e;
  const n0 = p.length;
  const ad = p.map((v, k) => Math.abs(q[k] - v));
  const d2 = p.map((v, k) => shortDiff(v, q[k]));
  const z = zeroTest === 'absolute' ? ad : d2;
  let s = z[0] * z[0];
  for (let k = 1; k < n0; k++) s += z[k] * z[k];
  const dist = Math.sqrt(s);
  if (mEqual(dist, 0)) return p.slice();
  const pt = p.map((v, k) => v + frac * d2[k]);
  for (let k = 0; k < n0; k++) {
    pt[k] = zeroTest === 'absolute' ? wrapto0to2pi(pt[k]) : pt[k] + (mGreater(pt[k], TWO_PI) ? -TWO_PI : mLess(pt[k], 0) ? TWO_PI : 0);
  }
  return pt;
}

/**
 * connectPoints core ("augments the list of edges in a graph of points"): for i = point2start .. Length[goodPts]
 * (1-based), try the up to 10 nearest other good points within radius r (Nearest[Drop[goodPts, {i}], ps, {10, r},
 * DistanceFunction -> toroidDist], nearest first) and add the edge {ps, pe} when pe is not yet in i's adjacency
 * list and the local planner `pathOK(ps, pe)` accepts it. Adjacency lists hold 1-based indexes (Position[goodPts,
 * pe, 1, 1]: the FIRST point with exactly these coordinates). Returns [edgesNNadj, edgesNN] (new arrays).
 * Notes: the planner is called from ps towards pe; when it refuses, the pair can be tried again later from pe's
 * side (ORIGINAL QUIRK Q-PR-05: pathOKT is not symmetric). Nearest's order for equal distances is not documented
 * (lead K-PR-01); shared/mma-extra.js keeps the input order. `dist` = Nearest's DistanceFunction (toroidDist).
 * The 3D Demonstration's connectPoints is text-identical. The callers pass one list per good point (the body joins
 * empty lists for new samples), or a LONGER list after an obstacle move that left at most 5 free samples (Q-P3-07: the
 * old lists stay, stale, and are used as they are, as in the original). DEFENSIVE GUARD (K-P3-05, not reachable by the
 * documented steps): an adjacency list SHORTER than goodPts, where the original would hit Part errors, is first filled
 * with empty lists up to goodPts.length (a dense array, no holes); a longer one is not touched.
 */
export function connectPoints(goodPts, edgesNNadjin, pathOK, edgesNNin, point2start, r, dist = toroidDist) {
  const edgesNNadj = edgesNNadjin.map((a) => a.slice());
  while (edgesNNadj.length < goodPts.length) edgesNNadj.push([]); // defensive guard (K-P3-05)
  const edgesNN = edgesNNin.slice();
  for (let i = point2start; i <= goodPts.length; i++) {
    const ps = goodPts[i - 1];
    const others = goodPts.filter((_, k) => k !== i - 1); // Drop[goodPts, {i}]
    for (const pe of nearest(others, ps, { n: 10, r }, dist)) {
      const pei = positionOf(goodPts, pe) + 1;
      if (edgesNNadj[i - 1].filter((x) => x === pei).length < 1) {
        if (pathOK(ps, pe)) {
          edgesNN.push([ps, pe]);
          edgesNNadj[i - 1].push(pei);
          edgesNNadj[pei - 1].push(i);
        }
      }
    }
  }
  return [edgesNNadj, edgesNN];
}

/**
 * The query part of both Manipulate bodies (inline code in the originals):
 *   path = -1;
 *   If[toroidDist[qs,qf] < r && pathOK[qs,qf], path = -2,
 *     If[qsFree && Length[goodPts] > 5, qsn = the nearest good point if pathOK[qs, it]];
 *     If[qfFree && Length[goodPts] > 5, qfn = the nearest good point if pathOK[qf, it]]];
 *   If[qfn != {} && qsn != {} && Length[edgesNNadj] > 1, path = myAstar[edgesNNadj, goodPts, qsni, qfni]]
 * qsFree / qfFree: the app's "start / goal not in collision" tests; dist: toroidDist (default). Returns
 * { path, qsn, qfn } (qsn/qfn null = {}).
 */
export function planQuery({ qs, qf, r, goodPts, edgesNNadj, pathOK, qsFree, qfFree, dist = toroidDist }) {
  let path = -1, qsn = null, qfn = null;
  if (mLess(dist(qs, qf), r) && pathOK(qs, qf)) {
    path = -2;
  } else {
    if (qsFree() && goodPts.length > 5) {
      for (const pe of nearest(goodPts, qs, { n: 1 }, dist)) if (pathOK(qs, pe)) { qsn = pe; break; }
    }
    if (qfFree() && goodPts.length > 5) {
      for (const pe of nearest(goodPts, qf, { n: 1 }, dist)) if (pathOK(qf, pe)) { qfn = pe; break; }
    }
  }
  if (qfn !== null && qsn !== null && edgesNNadj.length > 1) {
    const qsni = positionOf(goodPts, qsn) + 1;
    const qfni = positionOf(goodPts, qfn) + 1;
    path = myAstar(edgesNNadj, goodPts, qsni, qfni, dist);
  }
  return { path, qsn, qfn };
}

/**
 * Where the "progress" slider puts the robot (inline code of both bodies):
 *   path == -2: totdist = toroidDist[qs, qf]; point = toroidPt[{qs, qf}, progress]
 *   path a list: mypath = Append[Prepend[goodPts[[path]], qs], qf]; dists = toroidDist of consecutive points;
 *     totdist = Total[dists]; distT = 0; c = 1; While[distT + dists[[c]] < progress totdist, distT += dists[[c]]; c++];
 *     point = toroidPt[{mypath[[c]], mypath[[c+1]]}, (progress totdist - distT)/dists[[c]]]
 *   otherwise: null (no path; totdist stays unassigned).
 * The While test is Mathematica's tolerant Less, which keeps c in range at progress = 1.
 * dist / pt: the app's toroidDist and toroidPt (defaults: this module's, 2D zero test).
 */
export function progressOnPath({ qs, qf, goodPts, path, progress, dist = toroidDist, pt = toroidPt }) {
  if (path === -2) return { totdist: dist(qs, qf), point: pt([qs, qf], progress), mypath: [qs, qf] };
  if (!Array.isArray(path) || path.length === 0) return null;
  const mypath = [qs, ...path.map((k) => goodPts[k - 1]), qf];
  const dists = [];
  for (let i = 0; i < mypath.length - 1; i++) dists.push(dist(mypath[i], mypath[i + 1]));
  const totdist = total(dists);
  let distT = 0, c = 1;
  // `c < dists.length` is a guard only: in the original a c past the end would be a Part error, which the tolerant
  // Less already prevents for progress <= 1 (the tolerance itself is tested at a segment end in prm-core.test.js)
  while (c < dists.length && mLess(distT + dists[c - 1], progress * totdist)) { distT += dists[c - 1]; c++; }
  const point = pt([mypath[c - 1], mypath[c]], (progress * totdist - distT) / dists[c - 1]);
  return { totdist, point, mypath, dists, segment: c };
}
