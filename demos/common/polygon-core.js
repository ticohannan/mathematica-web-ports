// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana; Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/polygon-core.js — polygon helpers that the Demonstrations of the same authors define (nearly) identically
// in their Initialization code, ported once: "Motion Planning for Robot Path around Obstacles" (Shreyas Poyrekar, Aaron
// T. Becker, Arifa Sultana; lineList, vector, areaOfPoly, centroidOfPoly, discretizeLineRev1 — moved here unchanged
// from demos/motion-planning/planner.js), "Art Gallery Problem" (Shreyas Poyrekar, Arifa Sultana, Aaron T. Becker;
// sameQ — moved here unchanged from demos/art-gallery/visibility.js) and "Minkowski Sum of Convex Robot and Obstacle"
// (Shreyas Poyrekar, Arifa Sultana, Aaron T. Becker), whose port owns this module (COMMON-DECISIONS §3).
// Pure: no DOM, importable in Node. The functions keep the originals' names, argument patterns and order of
// operations; motion-planning's and art-gallery's golden tests guard that the move changed no result.
//
// Differences between the originals' texts that do not change a result (minkowski-sum DESIGN §6.3):
//   lineList  motion-planning Partition[Join[list, {First[list]}], 2, 1], the others Partition[Append[list,
//             First[list]], 2, 1];
//   areaOfPoly  0.5*Total@… vs 1/2*Total@… (exact 1/2 times a machine number = 0.5 times it);
//   centroidOfPoly  motion-planning wraps the parts in N[…, 3] (no effect on machine reals) and compares area != 0.0,
//             minkowski-sum area != 0 (both decide alike for a machine real: Mathematica's tolerant != against zero is
//             true for every non-zero number);
//   discretizeLineRev1  N@EuclideanDistance vs EuclideanDistance of machine points (same number).
// art-gallery's own `vector` takes its edge as {{x1,y1},{x2,y2}} (second minus first) and stays in visibility.js.
// v0.1.17 (minkowski-sum harness run 2, K-MS-08): the vector Total of centroidOfPoly is pairwise (totalPairwise) and its
// Mean a true division (meanMma), as Mathematica 15.0.1 computes them; motion-planning's and art-gallery's tests unchanged.
import { mUnequal, add, scale, total, euclid } from '../../shared/mma.js';

/** lineList[list] := Partition[Append[list, First[list]], 2, 1] — the closed polygon's edges. */
export function lineList(list) {
  return list.map((p, i) => [p, list[(i + 1) % list.length]]);
}

/** vector[{{x2,y2},{x1,y1}}] := {x2 - x1, y2 - y1} — the FIRST point minus the second (the reversed edge vector). */
export function vector([[x2, y2], [x1, y1]]) {
  return [x2 - x1, y2 - y1];
}

/** areaCalulation[{{x1,y1},{x2,y2}}] := (x1 y2) - (x2 y1) (the Minkowski original's spelling; motion-planning:
 *  areaCalculation). */
export const areaCalulation = ([[x1, y1], [x2, y2]]) => x1 * y2 - x2 * y1;

/** areaOfPoly[poly] := 1/2 * Total@(areaCalulation /@ lineList@poly) — signed shoelace area (Total compensated). */
export function areaOfPoly(poly) {
  return 0.5 * total(lineList(poly).map(areaCalulation));
}

/** centroidCal[{{x1,y1},{x2,y2}}] := {(x1 + x2)((x1 y2) - (x2 y1)), (y1 + y2)((x1 y2) - (x2 y1))} */
export const centroidCal = ([[x1, y1], [x2, y2]]) => {
  const c = x1 * y2 - x2 * y1;
  return [(x1 + x2) * c, (y1 + y2) * c];
};

/**
 * Total of a list of machine numbers or of equal-length vectors, added as Mathematica 15.0.1 adds them: pairwise, the
 * list split at ceil(n/2) (n = 3: (x1 + x2) + x3; 4: (x1 + x2) + (x3 + x4); 5: ((x1 + x2) + x3) + (x4 + x5)).
 * Evidence: harness run 2 of minkowski-sum, the 12 recorded centroids rc/oc (polygons of 3, 4 and 5 vertices) bit for
 * bit; left-to-right addition gives 7 of 9 non-degenerate ones, compensated summation 4 (K-MS-08).
 */
export function totalPairwise(xs) {
  if (xs.length === 1) return xs[0];
  const k = Math.ceil(xs.length / 2);
  const a = totalPairwise(xs.slice(0, k)), b = totalPairwise(xs.slice(k));
  return Array.isArray(a) ? add(a, b) : a + b;
}
/** Mean[list] = Total[list]/Length[list] with a true division (harness run 2: Mean of three collinear vertices,
 *  H-MS-11, H-MS-12; v·(1/n) is 1 ulp off there) and the pairwise Total. */
export function meanMma(xs) {
  const t = totalPairwise(xs);
  return Array.isArray(t) ? t.map((x) => x / xs.length) : t / xs.length;
}

/** centroidOfPoly[poly] := If[area != 0, Total@(centroidCal /@ lineList@poly)/(6 area), Mean@poly] — the polygon
 *  centroid, or the vertex mean for zero area. The vector Total is pairwise (totalPairwise, K-MS-08), `a/b` = a·(1/b). */
export function centroidOfPoly(poly) {
  const area = areaOfPoly(poly);
  if (mUnequal(area, 0.0)) {
    const t = totalPairwise(lineList(poly).map(centroidCal));
    return scale(t, 1 / (6.0 * area));
  }
  return meanMma(poly);
}

/**
 * discretizeLineRev1[{{x1,y1},{x2,y2}}, step] := Module[{d = EuclideanDistance[…]}, If[d != 0,
 *   ({x1 + (x2 - x1) #, y1 + (y2 - y1) #}) & /@ Range[0, 1, step/d], {{x1, y1}}]]
 * Points every `step` along the segment; the end point only when the step divides the length. Range[0, 1, h] with a
 * machine h has Floor[1/h + 1e-12] + 1 elements (the rule that reproduces the original's saved results).
 */
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

/** SameQ of two machine reals: equal if they differ in at most their last binary digit (Wolfram Language reference,
 *  SameQ; confirmed for SameQ, MatchQ and Position by extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06). */
const dvA = new DataView(new ArrayBuffer(8));
const ordinal = (x) => { dvA.setFloat64(0, x + 0); const b = dvA.getBigInt64(0); return b < 0n ? -(b & 0x7fffffffffffffffn) : b; };
export const sameRealQ = (x, y) => x === y || (Number.isFinite(x) && Number.isFinite(y) && Math.abs(Number(ordinal(x) - ordinal(y))) <= 1);
/** SameQ / literal-pattern match of two points (Position, DeleteCases, DeleteDuplicates): component-wise sameRealQ. */
export const sameQ = (u, v) => u.length === v.length && u.every((x, i) => sameRealQ(x, v[i]));
