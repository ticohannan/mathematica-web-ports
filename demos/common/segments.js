// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Li Huang; Shiva Shahrokhi and Aaron T. Becker; Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/segments.js — segment geometry that several Demonstrations define identically in their Initialization
// code: "Rapidly Exploring Random Tree (RRT) and RRT*" (Aaron T. Becker and Li Huang: λ, lineIntersectionPoint,
// segmentIntersectionQ), "Measuring Distance and Orientation Using Camera and Lasers" (Shiva Shahrokhi and Aaron T.
// Becker: Gamma, LineIntersectionPoint, SegmentIntersectionQ) and "Probabilistic Roadmap Method with Seven-Link
// Articulated Robot" (Aaron T. Becker and Yitong Lu: Gamma, lineIntersectionPoint, segmentIntersectionQ — that app
// keeps its own copy with plain `/` until its golden tests settle the difference, COMMON-DECISIONS §3).
// Owner: rrt (COMMON-DECISIONS §3). Export names are prm-seven-link's. Pure: no DOM, importable in Node.
//
//   λ[{a_, b_}][p_] := ((a - p).(a - b))/((a - b).(a - b))
//   lineIntersectionPoint[{{a_, b_}, {c_, d_}}] := (Det[{a, b}] (c - d) - Det[{c, d}] (a - b))/(Det[{a - b, c - d}])
//   segmentIntersectionQ[{p1 : {a_, b_}, p2 : {c_, d_}}] := If[Det[{a - b, c - d}] == 0, False,
//     Module[{p = lineIntersectionPoint[{p1, p2}]}, 0 <= λ[p1][p] <= 1 && 0 <= λ[p2][p] <= 1]]
//
// Numerics (COMMON-DECISIONS §3, §4):
//   * a/b with machine numbers is Times[a, Power[b, -1]] = a·(1/b) (both quotients above);
//   * Dot of two 2-vectors is x1·y1 + x2·y2 (plain multiply and add; the rrt lead K-RT-08 notes a possible fused
//     multiply-add in Mathematica);
//   * Det of a 2×2 matrix of exact integers is exact; of machine numbers Mathematica's LU-based Det
//     (shared/mma-exact.js det, bit-exact). JavaScript cannot tell an integral machine real (18.) from the exact
//     integer 18, so the callers say which segment is exact: option `exact: [e1, e2]` (segment 1, segment 2). Det[{a, b}]
//     is exact when e1, Det[{c, d}] when e2, Det[{a − b, c − d}] when both. The default (prm-seven-link's rule) takes a
//     segment as exact when all four of its coordinates are integers.
//   * `Det[…] == 0` is a test for exact zero (Equal with 0 has no tolerance); `0 <= λ <= 1` uses Mathematica's tolerant
//     LessEqual (shared/mma.js), so both end points count (inclusive).
// ORIGINAL QUIRK (rrt Q-RT-01, camera-lasers Q-CL-09, prm-seven-link Q-SL-02): parallel or collinear overlapping
// segments never intersect.
import { mEqual, mLessEq } from '../../shared/mma.js';
import { det } from '../../shared/mma-exact.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const isInt2 = (v) => Number.isInteger(v[0]) && Number.isInteger(v[1]);

/** Whether the segment [a, b] counts as exact by default: all four coordinates are integers. */
export const isExactSegment = ([a, b]) => isInt2(a) && isInt2(b);

/** Det[{u, v}] of two 2-vectors: exact (integer arithmetic) when `exact`, else Mathematica's machine Det. */
export function det2(u, v, exact = isInt2(u) && isInt2(v)) {
  return exact ? u[0] * v[1] - u[1] * v[0] : det([u, v]);
}

/** λ[{a, b}][p] = ((a − p).(a − b)) · (1/((a − b).(a − b))) — the parameter of p along a + λ(b − a). */
export const Gamma = ([a, b]) => (p) => {
  const ab = sub(a, b);
  return dot(sub(a, p), ab) * (1 / dot(ab, ab));
};

const exactFlags = (p1, p2, exact) => exact ?? [isExactSegment(p1), isExactSegment(p2)];

/**
 * lineIntersectionPoint[{{a, b}, {c, d}}] = (Det[{a, b}] (c − d) − Det[{c, d}] (a − b)) · (1/Det[{a − b, c − d}]).
 * opts.exact: [segment 1 exact, segment 2 exact] (see the header).
 */
export function lineIntersectionPoint([p1, p2], { exact } = {}) {
  const [a, b] = p1, [c, d] = p2;
  const [e1, e2] = exactFlags(p1, p2, exact);
  const dab = det2(a, b, e1), dcd = det2(c, d, e2), den = det2(sub(a, b), sub(c, d), e1 && e2);
  const r = 1 / den;
  return [(dab * (c[0] - d[0]) - dcd * (a[0] - b[0])) * r, (dab * (c[1] - d[1]) - dcd * (a[1] - b[1])) * r];
}

/**
 * segmentIntersectionQ[{p1, p2}]: False for parallel segments (Det exactly 0), else 0 <= λ <= 1 on both segments
 * (tolerant, inclusive). opts.exact as lineIntersectionPoint.
 */
export function segmentIntersectionQ([p1, p2], { exact } = {}) {
  const [a, b] = p1, [c, d] = p2;
  const flags = exactFlags(p1, p2, exact);
  if (mEqual(det2(sub(a, b), sub(c, d), flags[0] && flags[1]), 0)) return false;
  const p = lineIntersectionPoint([p1, p2], { exact: flags });
  const g1 = Gamma(p1)(p);
  if (!(mLessEq(0, g1) && mLessEq(g1, 1))) return false;
  const g2 = Gamma(p2)(p);
  return mLessEq(0, g2) && mLessEq(g2, 1);
}
