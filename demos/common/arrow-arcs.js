// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Lillian Lin; Aaron T. Becker and Benedict Isichei; Aaron T. Becker and Haoran Zhao; Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala; Aaron T. Becker and Shiva Shahrokhi; Shiva Shahrokhi and Aaron T. Becker; Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/arrow-arcs.js — circular arcs with arrowheads as the Demonstrations define them in their
// Initialization code: `myArrowArc` / `myArrowArc2` ("Forward and Inverse Kinematics for Two-Link Arm", Aaron T.
// Becker and Lillian Lin; "Distance Norms in Robot Workspace and Phase Space", Aaron T. Becker and Benedict Isichei;
// "Configuration Space for Four-Bar Linkage", Aaron T. Becker and Shiva Shahrokhi; "Measuring Distance and
// Orientation Using Camera and Lasers", Shiva Shahrokhi and Aaron T. Becker; "Manipulability Ellipsoid of a Robot Arm",
// Aaron T. Becker and Mary Burbage) and `arrowArc[s_Circle]` ("Robot Motion with Obstacles" and "Chart for a Torus",
// Aaron T. Becker and Haoran Zhao; "Breadth-First Search Robot Motion Planning", Aaron T. Becker, Benedict Isichei
// and Praveen Reddy Padala; the camera-lasers Demonstration). Owner: two-link-kinematics (COMMON-DECISIONS §3).
// Pure: no DOM, importable in Node. Results are drawing data; SVG drawing is the caller's (dial-control.js draws
// its own with drawArcArrow).
//
//   myArrowArc[c_, r_, {start_, end_}] := If[start == end, Point[c + r{Cos[start], Sin[start]}],
//     Arrow[BSplineCurve[Table[c + r{Cos[t], Sin[t]}, {t, start, end, (end - start)/(11)}]]]]
//   myArrowArc2 — the same with SameQ (start === end)
//   arrowArc[s_Circle] := s /. Circle[a_, r_, {start_, end_}] :>
//     ({s, Arrow[{# - r/10^6 {-Sin@end, Cos@end}, #}]} &[a + r {Cos@end, Sin@end}])
import { mEqual } from '../../shared/mma.js';
import { sameReal } from './prm-core.js';

/**
 * The iterator values of Table[…, {t, start, end, (end - start)/n}] (n = 11 in the originals): step =
 * (end − start)·(1/n) (machine division a/b = a·(1/b)), t_k = start + k·step, k = 0 … n — n + 1 values, the last
 * one within rounding of end (lead K-TK-07: the port assumes Mathematica's iterator tolerance always gives n + 1
 * values). A zero step (start = end) gives n + 1 copies of start.
 */
export function tableStep(start, end, n = 11) {
  const step = (end - start) * (1 / n);
  const out = [];
  for (let k = 0; k <= n; k++) out.push(start + k * step);
  return out;
}

/** The clamped uniform knot vector of BSplineCurve's defaults (SplineDegree -> d, SplineClosed -> False). */
function clampedKnots(nPts, d) {
  const inner = nPts - d - 1;
  const knots = [];
  for (let i = 0; i <= d; i++) knots.push(0);
  for (let i = 1; i <= inner; i++) knots.push(i / (inner + 1));
  for (let i = 0; i <= d; i++) knots.push(1);
  return knots;
}

/**
 * The point at parameter u ∈ [0, 1] of BSplineCurve[points] with Mathematica's defaults (SplineDegree -> 3, or
 * fewer points − 1; clamped uniform knots, open), by de Boor's algorithm. The curve starts at the first and ends at
 * the last control point; its end tangent points along the last control leg.
 */
export function bsplinePoint(points, u, { degree = 3 } = {}) {
  const n = points.length;
  if (n === 0) throw new RangeError('bsplinePoint: no control points');
  const d = Math.min(degree, n - 1);
  if (d === 0) return points[0].slice();
  const t = clampedKnots(n, d);
  // knot span k with t[k] <= u < t[k+1] (the last span for u = 1)
  let k = d;
  while (k < n - 1 && u >= t[k + 1]) k++;
  const dim = points[0].length;
  const P = [];
  for (let j = 0; j <= d; j++) P.push(points[k - d + j].slice());
  for (let r = 1; r <= d; r++) {
    for (let j = d; j >= r; j--) {
      const i = k - d + j;
      const den = t[i + d - r + 1] - t[i];
      const a = den === 0 ? 0 : (u - t[i]) / den;
      for (let c = 0; c < dim; c++) P[j][c] = (1 - a) * P[j - 1][c] + a * P[j][c];
    }
  }
  return P[d];
}

/**
 * BSplineCurve[points] sampled as a polyline of `samples` points at equal parameter steps from u = 0 to u = 1
 * (PORT DEVIATION D-TK-04: Mathematica renders the curve adaptively; 48 samples by default).
 */
export function bsplineCurve(points, { samples = 48, degree = 3 } = {}) {
  const m = Math.max(2, samples);
  const out = [];
  for (let i = 0; i < m; i++) out.push(bsplinePoint(points, i === m - 1 ? 1 : i / (m - 1), { degree }));
  return out;
}

/** Direction of the arrowhead of Arrow[BSplineCurve[control]]: the last non-zero control leg, +x if none (Q-TK-05). */
function endDirection(control) {
  const tip = control[control.length - 1];
  for (let i = control.length - 2; i >= 0; i--) {
    const dx = tip[0] - control[i][0], dy = tip[1] - control[i][1];
    const len = Math.hypot(dx, dy);
    if (len > 0) return [dx / len, dy / len];
  }
  return [1, 0];
}

const arcPointsOf = (c, r, ts) => ts.map((t) => [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]);

function arrowOf(c, r, start, end, samples) {
  const control = arcPointsOf(c, r, tableStep(start, end, 11));
  return { kind: 'Arrow', control, curve: bsplineCurve(control, { samples }), tip: control[control.length - 1].slice(), direction: endDirection(control) };
}
const pointOf = (c, r, start) => ({ kind: 'Point', at: [c[0] + r * Math.cos(start), c[1] + r * Math.sin(start)] });

/**
 * myArrowArc[c, r, {start, end}]: {kind: 'Point', at} when start == end (tolerant Equal), otherwise
 * {kind: 'Arrow', control (12 B-spline control points c + r{Cos[t], Sin[t]}), curve (sampled polyline), tip (the
 * last control point = the curve's end), direction (unit end tangent = last control leg; +x for a zero-length curve)}.
 * Options: samples (curve polyline points, default 48).
 */
export function myArrowArc(c, r, [start, end], { samples } = {}) {
  return mEqual(start, end) ? pointOf(c, r, start) : arrowOf(c, r, start, end, samples);
}

/**
 * myArrowArc2: the same with SameQ (start === end: equal, or machine reals differing in the last bit only).
 * Option endIsDynamic (default false): the dials call it with end = ang = Dynamic[ArcTan[…]], a Dynamic object that
 * is never SameQ to the start 0, so the Point branch never runs and at ang = 0 the arrow has zero length with its
 * head along +x (Q-TK-05, Q-CL-10, Q-ME-03). JS cannot tell an exact 0 from a machine 0. (SameQ[0, 0.] is False in
 * Mathematica); a caller that needs that distinction passes endIsDynamic: true.
 */
export function myArrowArc2(c, r, [start, end], { samples, endIsDynamic = false } = {}) {
  return !endIsDynamic && sameReal(start, end) ? pointOf(c, r, start) : arrowOf(c, r, start, end, samples);
}

const TWO_PI = 2 * Math.PI;
/** Circle[c, r, {a0, a1}] sampled from a0 to a1 (either direction; the rule of shared/svg-plot.js arcPoints). */
export function circleArcPoints([cx, cy], r, a0, a1, n) {
  const k = n ?? Math.max(8, Math.ceil((Math.abs(a1 - a0) / TWO_PI) * 96));
  const out = [];
  for (let i = 0; i <= k; i++) {
    const a = a0 + ((a1 - a0) * i) / k;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

/**
 * arrowArc[Circle[a, r, {start, end}]]: the arc itself plus an arrow whose shaft is r/10^6 long, ending at the arc's
 * end point a + r{Cos[end], Sin[end]} along the COUNTER-CLOCKWISE tangent {−Sin[end], Cos[end]} there (only the head
 * is visible). For end < start the arc runs clockwise and the head points back along it (Q-TC-01, Q-BF-12).
 * circle: {center, r, start, end} or the Mathematica-like [center, r, [start, end]].
 * Returns {kind: 'ArrowArc', circle: {center, r, start, end}, arc (sampled polyline from start to end), tail, tip,
 * direction}.
 */
export function arrowArc(circle) {
  const { center, r, start, end } = Array.isArray(circle) ? { center: circle[0], r: circle[1], start: circle[2][0], end: circle[2][1] } : circle;
  const tip = [center[0] + r * Math.cos(end), center[1] + r * Math.sin(end)];
  const direction = [0 - Math.sin(end), Math.cos(end)]; // 0 − x: no negative zero (Mathematica has none)
  const s = r / 1e6;
  const tail = [tip[0] - s * direction[0], tip[1] - s * direction[1]];
  return { kind: 'ArrowArc', circle: { center: center.slice(), r, start, end }, arc: circleArcPoints(center, r, start, end), tail, tip, direction };
}
