// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/art-gallery/visibility.js — pure port of the Initialization code of "Art Gallery Problem"
// (docs/original-source/art-gallery.txt): the rotational-sweep visibility polygon `visiblePolys` and its helpers.
// No DOM. Every function keeps the original's name, argument order, constants and order of operations, so the two
// can be compared side by side.
//
// Numbers: Mathematica's tolerant comparisons (shared/mma.js) wherever the original compares reals; Det, ArcTan and
// VectorAngle as Mathematica computes them on machine numbers (shared/mma-exact.js, measured for the motion-planning
// port of the same authors); Norm = classic BLAS dnrm2 scaling (confirmed by extra-checks.wls on Mathematica 15.0.1:
// Norm[{1.5, 2.5}] = 2.91547594742265); a/b = a·b⁻¹ as Mathematica evaluates it.
// Normalize: two models (NORMALIZE_MODELS, DESIGN.md K-AG-03). The default multiplies by the reciprocal of the
// CORRECTLY ROUNDED length; it reproduces the 2019 snapshots and the owner's Mathematica 15.0.1 state bit for bit.
// 'viaNorm' (v · 1/Norm[v] with the dnrm2 Norm) reproduces the state saved by Mathematica 14.1 bit for bit.
//
// Quirks of the ORIGINAL are reproduced and marked "ORIGINAL QUIRK (Q-AG-nn)"; places where the port cannot do what
// the original does are marked "PORT DEVIATION (D-AG-nn)". See demos/art-gallery/DESIGN.md §7.
import { mEqual, mUnequal, mLess, mGreater, mLessEq, mGreaterEq, chop, mod, roundHalfEven, roundTo, sortMma, total, euclid } from '../../shared/mma.js';
import { det, norm as normDnrm2, fma, arcTan, vectorAngle as VectorAngle } from '../../shared/mma-exact.js';

const PI = Math.PI;
const TWO_PI = 2 * Math.PI; // 2 Pi, numericised (6.283185307179586)

// ---- Norm and Normalize ----------------------------------------------------------------------------------------
const twoSum = (a, b) => { const s = a + b, bb = s - a; return [s, (a - (s - bb)) + (b - bb)]; };
const twoProd = (a, b) => { const p = a * b; return [p, fma(a, b, -p)]; };
const ddAdd = (A, B) => { const [s, e0] = twoSum(A[0], B[0]); const e = e0 + A[1] + B[1]; const t = s + e; return [t, e - (t - s)]; };
/** Correctly rounded sqrt(x² + y²) (double-double; exact except in near-halfway cases). */
export function normCorrectlyRounded([x, y]) {
  const s = ddAdd(twoProd(x, x), twoProd(y, y));
  if (s[0] === 0) return 0;
  const r = Math.sqrt(s[0]);
  const [p, pe] = twoProd(r, r);
  const res = (s[0] - p) - pe + s[1]; // s - r² (the first difference is exact: r² is within an ulp of s)
  return r + res / (2 * r);
}
/** Norm[v] of a machine vector: classic BLAS dnrm2 scaling (K-AG-03, resolved). */
const Norm = normDnrm2;
const scaleBy = (v, n) => { if (n === 0) return v.slice(); const r = 1 / n; return [v[0] * r, v[1] * r]; };
/**
 * Normalize[v] (zero vector unchanged; Mathematica multiplies by the reciprocal of the length).
 * PORT DEVIATION (D-AG-08): which length Mathematica's Normalize uses is not documented. 'correctlyRounded' (default)
 * matches the 2019 snapshots and the owner's 15.0.1 state; 'viaNorm' (the dnrm2 Norm) matches the 14.1 saved state.
 */
export const NORMALIZE_MODELS = Object.freeze({
  correctlyRounded: (v) => scaleBy(v, normCorrectlyRounded(v)),
  viaNorm: (v) => scaleBy(v, Norm(v)),
});
let Normalize = NORMALIZE_MODELS.correctlyRounded;
/** Run f with another Normalize model (tests and comparisons only); restores the default afterwards. */
export function withNormalizeModel(name, f) {
  const old = Normalize;
  Normalize = NORMALIZE_MODELS[name];
  try { return f(); } finally { Normalize = old; }
}

// ---- small helpers with Mathematica semantics ---------------------------------------------------------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const times = (s, v) => [s * v[0], s * v[1]];
/** Dot of two 2-vectors (plain multiply-add). */
const dot = (u, v) => u[0] * v[0] + u[1] * v[1];
/** SameQ of two machine reals: equal if they differ in at most their last binary digit (Wolfram Language reference,
 *  SameQ; confirmed for SameQ, MatchQ and Position by extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06). */
const dvA = new DataView(new ArrayBuffer(8));
const ordinal = (x) => { dvA.setFloat64(0, x + 0); const b = dvA.getBigInt64(0); return b < 0n ? -(b & 0x7fffffffffffffffn) : b; };
const sameReal = (x, y) => x === y || (Number.isFinite(x) && Number.isFinite(y) && Math.abs(Number(ordinal(x) - ordinal(y))) <= 1);
/** SameQ / literal-pattern match of two points (Position, DeleteCases): component-wise sameReal. */
export const sameQ = (u, v) => u.length === v.length && u.every((x, i) => sameReal(x, v[i]));
/** Third component of Cross[{a1,a2,0},{b1,b2,0}]. */
const cross3 = (a, b) => a[0] * b[1] - a[1] * b[0];

// ---- Initialization code, function by function ---------------------------------------------------------------

/** testpoint[poly, pt] — true if pt is inside poly (winding number:
 *  Round[Total@Mod[(# - RotateRight[#])&@(ArcTan @@ (pt - #) & /@ poly), 2 Pi, -Pi]/(2 Pi)] != 0). */
export function testpoint(poly, pt) {
  const ang = poly.map((v) => { const d = sub(pt, v); return arcTan(d[0], d[1]); });
  const diffs = ang.map((t, i) => mod(t - ang[(i - 1 + ang.length) % ang.length], TWO_PI, -PI));
  return roundHalfEven(total(diffs) * (1 / TWO_PI)) !== 0;
}

/** lineList[list] := Partition[Append[list, First[list]], 2, 1] — the closed polygon's edges. */
export const lineList = (list) => list.map((p, i) => [p, list[(i + 1) % list.length]]);

/** vector[{{x1,y1},{x2,y2}}] := {x2 - x1, y2 - y1} (defined in the original, not used by it). */
export const vector = ([[x1, y1], [x2, y2]]) => [x2 - x1, y2 - y1];

/** vertexList[list] := Partition[Join[list, list[[1;;2]]], 3, 1] — triples (v_i, v_i+1, v_i+2). */
export const vertexList = (list) => list.map((_, i) => [list[i], list[(i + 1) % list.length], list[(i + 2) % list.length]]);

/** getAngle[{{x1,y1},{x2,y2}}] := Mod[ArcTan[x2 - x1, y2 - y1], 2 Pi] — direction in [0, 2π). */
export function getAngle([[x1, y1], [x2, y2]]) {
  return mod(arcTan(x2 - x1, y2 - y1), TWO_PI);
}

/** angleSortCond[point, l1, l2] — by angle around point; equal angles by distance (c < d here; the
 *  motion-planning version of this function compares c < b). */
export function angleSortCond(point, l1, l2) {
  const a = getAngle([point, l1[1]]), b = getAngle([point, l2[1]]);
  const c = Norm(sub(point, l1[1])), d = Norm(sub(point, l2[1]));
  return mLess(a, b) || (mEqual(a, b) && mLess(c, d));
}

/** λ[{a, b}][p] := ((a - p).(a - b))/((a - b).(a - b)) — parameter of p along a→b. */
export const λ = ([a, b]) => (p) => { const ab = sub(a, b); return dot(sub(a, p), ab) * (1 / dot(ab, ab)); };
export const lambda = λ;

/** LineIntersectionPoint[{{a,b},{c,d}}] := (Det[{a,b}] (c - d) - Det[{c,d}] (a - b))/(Det[{a - b, c - d}]) */
export function LineIntersectionPoint([[a, b], [c, d]]) {
  const dab = det([a, b]), dcd = det([c, d]);
  const cd = sub(c, d), ab = sub(a, b);
  const r = 1 / det([ab, cd]);
  return [(dab * cd[0] - dcd * ab[0]) * r, (dab * cd[1] - dcd * ab[1]) * r];
}

const ROUNDOFF = 0.0000001;
/**
 * SegmentIntersectionQ[{p1:{a,b}, p2:{c,d}}] — proper crossing of two segments:
 * False when Chop@Det[{a-b, c-d}] == 0 (parallel; absolute tolerance 1e-10); otherwise the intersection point is
 * rounded to multiples of 1e-7 and must lie strictly inside both segments (0 < λ < 1) and must not equal any of the
 * four end points rounded the same way. (The motion-planning version uses 0 <= λ <= 1 and no rounding.)
 * ORIGINAL QUIRK (Q-AG-08): these thresholds (1e-7 rounding, absolute Chop 1e-10) decide near-degenerate cases.
 */
export function SegmentIntersectionQ([p1, p2]) {
  const [a, b] = p1, [c, d] = p2;
  if (chop(det([sub(a, b), sub(c, d)])) === 0) return false;
  const p = roundTo(LineIntersectionPoint([p1, p2]), ROUNDOFF);
  const l1 = λ(p1)(p), l2 = λ(p2)(p);
  return mLess(0, l1) && mLess(l1, 1) && mLess(0, l2) && mLess(l2, 1) &&
    !(mEqual(p, roundTo(a, ROUNDOFF)) || mEqual(p, roundTo(b, ROUNDOFF)) || mEqual(p, roundTo(c, ROUNDOFF)) || mEqual(p, roundTo(d, ROUNDOFF)));
}

/** distSortCond[line, l1, l2, point] — order of lines by the distance of their crossing with `line` from point. */
export function distSortCond(line, l1, l2, point) {
  const a = euclid(LineIntersectionPoint(chop([line, l1])), point);
  const b = euclid(LineIntersectionPoint(chop([line, l2])), point);
  return mLess(a, b);
}

/** getClockwiseAngle[p1, p2, p3] — 2π - VectorAngle when Cross[p3 - p2, p1 - p2] (z) < 0, else VectorAngle;
 *  Chop'ed (an angle below 1e-10 becomes 0). The motion-planning version differs (it forces some angles to 0).
 *  shared/mma-exact.js VectorAngle is bit-identical with Mathematica in only about 87 % of calls (motion-planning port,
 *  K-MP-02); here the angle only feeds tolerant comparisons (intersectInteriorQRev2, pbaAngle vs pbcAngle, Pi/3, Pi). */
export function getClockwiseAngle(p1, p2, p3) {
  const a = sub(p3, p2), b = sub(p1, p2); // AppendTo[a, 0]; AppendTo[b, 0] — the zero z changes nothing
  if (cross3(a, b) < 0) return chop(TWO_PI - VectorAngle(a, b));
  return chop(VectorAngle(a, b));
}

/** intersectInteriorQRev2[p, {w1, w2, w3}] — True if w2 is an "interior" vertex as seen from p.
 *  If[b == 0, b = 6.28319] uses the 6-digit literal 6.28319, not 2π. */
export function intersectInteriorQRev2(p, [w1, w2, w3]) {
  const a = getClockwiseAngle(w1, w2, w3);
  let b = getClockwiseAngle(p, w2, w3);
  if (mEqual(b, 0)) b = 6.28319;
  return mGreater(a, b);
}

/** pointOnSegmentQ[{{x1,y1},{x2,y2}}, {x3,y3}] — True only if the point lies strictly between the end points
 *  (collinear by Chop of the cross product, absolute 1e-10; then 0 < Kac < Kab). */
export function pointOnSegmentQ([[x1, y1], [x2, y2]], [x3, y3]) {
  const AB = [x2 - x1, y2 - y1], AC = [x3 - x1, y3 - y1];
  if (chop(AB[0] * AC[1] - AB[1] * AC[0]) !== 0) return false; // And@@((Chop@# == 0)& /@ Cross[ABv, ACv])
  const Kac = dot(AB, AC), Kab = dot(AB, AB);
  if (mLess(Kac, 0)) return false;
  if (mGreater(Kac, Kab)) return false;
  return mLess(0, Kac) && mLess(Kac, Kab);
}

/** reflex[{x1,y1},{x2,y2},{x3,y3}] := Chop[Det[{{1,x1,y1},{1,x2,y2},{1,x3,y3}}]] > 0 (counter-clockwise turn). */
export function reflex([x1, y1], [x2, y2], [x3, y3]) {
  return chop(det([[1, x1, y1], [1, x2, y2], [1, x3, y3]])) > 0;
}

/** glancingBlow[a, {p1, p2, p3}] := Xor[reflex[p1, p2, a], reflex[p3, p2, a]] */
export const glancingBlow = (a, [p1, p2, p3]) => reflex(p1, p2, a) !== reflex(p3, p2, a);

/** extendedLine[p1, p2] := {p1, p1 + 40 Normalize[p2 - p1]} (length 40; the motion-planning version uses 20). */
export const extendedLine = (p1, p2) => [p1, add(p1, times(40, Normalize(sub(p2, p1))))];

/** leftOrRight[a:{x1,y1}, b:{x2,y2}, p:{x,y}] := ((x - x1)(y2 - y1) - (y - y1)(x2 - x1)) >= 0
 *  (the original's comment: "True if the point p lies on the right side"). */
export const leftOrRight = ([x1, y1], [x2, y2], [x, y]) => mGreaterEq((x - x1) * (y2 - y1) - (y - y1) * (x2 - x1), 0);

/** noIntersection[p1, p2, linelist] := Nor @@ (SegmentIntersectionQ[{{p1, p2}, #}]& /@ linelist) */
export const noIntersection = (p1, p2, linelist) => !linelist.some((l) => SegmentIntersectionQ([[p1, p2], l]));

/** normalVector[{{x2,y2},{x1,y1}}] := Normalize[{(-y2 + y1), x2 - x1}] */
export const normalVector = ([[x2, y2], [x1, y1]]) => Normalize([-y2 + y1, x2 - x1]);

// ---- visiblePolys ----------------------------------------------------------------------------------------------

/** Stands for a result the original leaves symbolic (D-AG-01). */
export const UNEVALUATED = null;

/**
 * visiblePolys[polys, pm] — the region visible from pm in the environment `polys` (list of polygons, machine
 * numbers; the last one is the invisible 7-square). Returns the points of the visibility polygon in the order the
 * original builds them, or UNEVALUATED (null) where the original's result is a symbolic expression (D-AG-01).
 * `trace` (optional object) receives what happened: p (the shifted guard), nudgedOnEdge, nudgedOnVertex, partError,
 * deferredTb (Q-AG-02, first sweep step: tb chosen once pbaAngle has the current vertex's angle), staleTb (Q-AG-02,
 * later steps: tb chosen with the previous vertex's angle).
 */
export function visiblePolys(polys, pm, trace = {}) {
  const length = polys.length;
  const y = pm[1]; // pm:{x_, y_}
  let jList = [];
  const visibleList = [];
  let wi = false, wip = false, gFlag = false;
  let lvLine;
  let pbaAngle; // ORIGINAL QUIRK (Q-AG-02): read in the `tb = …` line BEFORE its assignment in the same iteration
  let pbcAngle;
  let deferred = false; // Q-AG-02, first sweep step

  // Check if point p lies on any of the lines in the environment, if so then shift it by a very small offset.
  let p = pm;
  for (let k = 0; k < length; k++) {
    for (const e of lineList(polys[k])) {
      if (pointOnSegmentQ(e, pm)) { p = sub(pm, times(0.00001, normalVector(e))); trace.nudgedOnEdge = true; }
    }
  }
  // Check if point p lies on any of the vertices of the polygons in the environment, if so then shift it.
  // ORIGINAL QUIRK (Q-AG-01): `index` is overwritten for EVERY vertex of EVERY polygon (the Map evaluates all of them
  // before Or), so it ends as the position of the last vertex of the LAST polygon (the invisible square: {4}); and
  // the shift uses polys[[1, index-1]] + polys[[1, index+1]] — always vertices 3 and 5 of polygon 1, whichever
  // vertex the guard is on.
  let onVertex = false, index = 0;
  for (let k = 0; k < length; k++) {
    for (const v of polys[k]) {
      index = polys[k].findIndex((w) => sameQ(w, v)) + 1; // Flatten@Position[polys[[k]], #] (SameQ, Q-AG-08)
      if (mEqual(pm, v)) onVertex = true;
    }
  }
  if (onVertex) {
    trace.nudgedOnVertex = true;
    const P1 = polys[0];
    if (index - 1 < 1 || index + 1 > P1.length) {
      // polys[[1, {index+1}]] does not exist (environment "movable obstacles": polygon 1 is the 4-vertex square):
      // the original prints Part::partw and continues with an unevaluated Part[…] inside p, so everything computed
      // from p is symbolic. PORT DEVIATION (D-AG-01): the port returns UNEVALUATED and no region is drawn.
      trace.partError = true;
      return UNEVALUATED;
    }
    p = add(pm, times(0.00001, add(P1[index - 2], P1[index])));
  }
  trace.p = p;
  // get a line parallel to x axis — ORIGINAL QUIRK (Q-AG-03): its far end uses the UNSHIFTED y of pm.
  let maxX = -Infinity;
  for (const poly of polys) for (const v of poly) if (v[0] > maxX) maxX = v[0]; // MaximalBy[Flatten[polys,1], First][[1,1]]
  const infiniteLine = [p, [0.11 + maxX, 0 + y]];
  // reverse the order of the list representing a polygon if point p is inside the polygon
  const orderedList = polys.map((poly) => (testpoint(poly, p) ? poly.slice().reverse() : poly));
  // make a list of all lines
  const listofAllLines = orderedList.flatMap(lineList);
  // sort the vertex triples by angle w.r.t. point p (angleSortCond; its two keys are computed once per triple)
  const keyed = orderedList.flatMap(vertexList).map((t) => ({ t, ang: getAngle([p, t[1]]), dist: Norm(sub(p, t[1])) }));
  const sortedList = sortMma(keyed, (u, v) => mLess(u.ang, v.ang) || (mEqual(u.ang, v.ang) && mLess(u.dist, v.dist))).map((k) => k.t);
  const m = sortedList.length;
  // get the intersection of lines for the infiniteLine
  for (const l of listofAllLines) if (SegmentIntersectionQ([infiniteLine, l])) jList.push([l[1], l[0]]);
  jList = sortMma(jList, (l1, l2) => distSortCond(infiniteLine, l1, l2, p));
  lvLine = jList[0];
  // find the line which is closest and also visible
  for (let i = 0, n = jList.length; i < n; i++) {
    if (SegmentIntersectionQ([lvLine, jList[i]])) {
      const startJlistInt = LineIntersectionPoint([lvLine, jList[i]]);
      if (noIntersection(p, startJlistInt, listofAllLines)) {
        visibleList.push(startJlistInt);
        if (mGreater(startJlistInt[1], p[1])) lvLine = jList[i];
      }
    }
  }
  // loop around all the vertices of all the polygons
  for (let i = 1; i <= m; i++) {
    const [a, b, c] = sortedList[i - 1];
    const [prevA, prevB, prevC] = i !== 1 ? sortedList[i - 2] : sortedList[m - 1];
    const [postA, postB, postC] = i !== m ? sortedList[i] : sortedList[0];
    const pbAngle = getAngle([p, b]), pprevbAngle = getAngle([p, prevB]);
    // for collinearity between current vertex, next vertex and point p make them non-collinear
    let tb = b;
    if (pointOnSegmentQ([p, postB], b)) {
      if (mEqual(postB, a)) tb = add(b, times(0.00001, normalVector([a, p])));
      else if (pbaAngle === undefined) {
        // ORIGINAL QUIRK (Q-AG-02), first sweep step: pbaAngle has no value yet, so `pbaAngle <= Pi/3` stays symbolic
        // and tb holds the unevaluated If. Mathematica re-evaluates that stored If whenever tb or abcList is used,
        // and pbaAngle is assigned (below) before any use: the If resolves with the CURRENT vertex's angle.
        deferred = true;
        trace.deferredTb = true;
      } else {
        // ORIGINAL QUIRK (Q-AG-02): pbaAngle still holds the angle of the PREVIOUS vertex (iteration i-1).
        trace.staleTb = true;
        tb = mLessEq(pbaAngle, PI / 3) ? add(b, times(0.00001, normalVector([a, p]))) : sub(b, times(0.00001, normalVector([postB, p])));
      }
    }
    // get all the angles and the lists
    const ba = [b, a], bc = [b, c], pb = [p, b];
    pbaAngle = getClockwiseAngle(p, b, a); // Re@ of a real number: unchanged
    pbcAngle = getClockwiseAngle(p, b, c);
    if (deferred) { // Q-AG-02: the held If of the first sweep step, resolved at its first use
      tb = mLessEq(pbaAngle, PI / 3) ? add(b, times(0.00001, normalVector([a, p]))) : sub(b, times(0.00001, normalVector([postB, p])));
      deferred = false;
    }
    const abcList = [a, tb, c];
    // conditions to determine whether a vertex is visible or not
    if (intersectInteriorQRev2(p, abcList)) wi = false;
    else if (i === 1 || !pointOnSegmentQ(pb, a)) {
      if (noIntersection(p, b, jList)) {
        if (i !== 1) {
          if (mUnequal(pbAngle, pprevbAngle)) wi = true;
          else wi = mEqual(b, prevA) || mEqual(b, prevC) || mEqual(b, postA) || mEqual(b, postC) || gFlag;
        } else wi = true;
      } else wi = false;
    } else wi = wip ? noIntersection(b, a, jList) : false;
    // if the vertex is visible
    if (wi) {
      // Check if there is an intersection of the latest visible line with the bc line.
      if (SegmentIntersectionQ([lvLine, bc])) {
        const bcVisiInt = LineIntersectionPoint([lvLine, bc]);
        if (noIntersection(p, bcVisiInt, listofAllLines)) visibleList.push(bcVisiInt);
      }
      // Glancing blow condition (gFlag = True when it is NOT a glancing blow).
      gFlag = !glancingBlow(p, abcList);
      if (gFlag && !pointOnSegmentQ(pb, prevB)) {
        // extend the glancing line pb; the intersection nearest to p
        const gLine = extendedLine(p, tb);
        const candidates = [];
        for (const l of listofAllLines) {
          // DeleteCases[DeleteCases[listofAllLines, {b,_}], {_,b}] (literal patterns match like SameQ, Q-AG-08)
          if (sameQ(l[0], b) || sameQ(l[1], b)) continue;
          if (SegmentIntersectionQ([gLine, l])) candidates.push([LineIntersectionPoint([gLine, l]), l]);
          else if (mUnequal(b, l[1]) && pointOnSegmentQ(gLine, l[1])) candidates.push([l[1], l]);
          else if (mUnequal(b, l[0]) && pointOnSegmentQ(gLine, l[0])) candidates.push([l[0], l]);
          // otherwise Null, removed by DeleteCases[…, Null]
        }
        const giList = sortMma(candidates, (u, v) => mLess(euclid(p, u[0]), euclid(p, v[0])));
        // ORIGINAL QUIRK (Q-AG-05): with an empty giList neither b nor any point is appended.
        if (giList.length > 0) {
          const [giPoint, giLine] = giList[0];
          // condition to decide the order of appending the vertex and the intersection point
          if ((pointOnSegmentQ(lvLine, giPoint) && chop(getAngle(pb)) !== 0) || (i === 1 && mLessEq(pbaAngle, PI / 2)) ||
              (SegmentIntersectionQ([gLine, lvLine]) && mEqual(LineIntersectionPoint([gLine, lvLine]), giPoint)) || mEqual(giPoint, lvLine[1])) {
            visibleList.push(giPoint, b);
            lvLine = ba;
          } else {
            visibleList.push(b, giPoint);
            lvLine = giLine;
          }
        }
      } else {
        // if not glancing blow then just append the vertex
        if (mUnequal(pbAngle, pprevbAngle)) visibleList.push(b);
        lvLine = ba;
        // intersections of line ba with the lines in jList (the Table's own i; the For loop's i is restored after it)
        for (let k = 0, n = jList.length; k < n; k++) {
          if (SegmentIntersectionQ([ba, jList[k]])) {
            const abNotGlaInt = LineIntersectionPoint([ba, jList[k]]);
            if (noIntersection(p, abNotGlaInt, listofAllLines)) {
              visibleList.push(abNotGlaInt);
              lvLine = jList[k];
            }
          }
        }
      }
    } else if (SegmentIntersectionQ([pb, lvLine])) {
      // not a visible vertex, and pb crosses the latest visible line
      if (mLess(pbaAngle, pbcAngle) && !leftOrRight(p, b, a) && SegmentIntersectionQ([lvLine, ba])) {
        const abNotVisInt = LineIntersectionPoint([lvLine, ba]);
        if (noIntersection(p, abNotVisInt, listofAllLines)) { visibleList.push(abNotVisInt); lvLine = ba; }
      }
      if (mLess(pbcAngle, pbaAngle) && !leftOrRight(p, b, c) && SegmentIntersectionQ([lvLine, bc])) {
        const bcNotVisInt = LineIntersectionPoint([lvLine, bc]);
        if (noIntersection(p, bcNotVisInt, listofAllLines)) { visibleList.push(bcNotVisInt); lvLine = bc; }
      }
    } else {
      // search jList for a line crossing the latest visible line (lvLine changes during the Map)
      for (const l of jList.slice()) {
        if (SegmentIntersectionQ([l, lvLine])) { visibleList.push(LineIntersectionPoint([l, lvLine])); lvLine = l; }
      }
    }
    // Update the jList & wip
    wip = wi;
    if (mLess(pbaAngle, PI)) jList.push(ba);
    if (mLess(pbcAngle, PI)) jList.push(bc);
    jList = jList.filter((l) => !sameQ(l[1], b)); // DeleteCases[jList, {_, b}] (SameQ, Q-AG-08)
  }
  return visibleList;
}
