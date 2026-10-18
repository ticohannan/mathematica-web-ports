// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/camera-lasers/model.js — pure port of "Measuring Distance and Orientation Using Camera and Lasers"
// (Initialization code and one evaluation of the Manipulate body). No DOM. Function names and the order of
// operations follow the original (docs/original-source/camera-lasers.txt). Both pictures are returned as lists of
// primitives (data) in the original's drawing order; main.js draws them.
//
// Numbers: the original computes exactly in its opening state and symbolically after dial moves; the port computes
// with machine numbers (D-CL-01). Exactness that the display needs is carried by hand: the reticule scale sc and the
// tick values are exact rationals {num, den} where the original's are exact (F-CL-18).
import { mLess, mGreater, mLessEq, mGreaterEq, roundHalfEven } from '../../shared/mma.js';
import { arcTan } from '../../shared/mma-exact.js';
import { rational } from '../../shared/mma-text.js';
import { NAMED } from '../../shared/mma-colors.js';
import { Gamma, lineIntersectionPoint, segmentIntersectionQ } from '../common/segments.js';
import { arrowArc } from '../common/arrow-arcs.js';

/** The original's names of the shared segment geometry (demos/common/segments.js). */
export const γ = Gamma;
export const LineIntersectionPoint = (segs) => lineIntersectionPoint(segs);
export const SegmentIntersectionQ = (segs) => segmentIntersectionQ(segs);

// ------------------------------------------------------------------------------------------------ constants
export const PLOT_RANGE = [[-1, 15], [-4, 4]]; // plotRange (top view)
export const IMSZ = 450;
export const CAM_WIDTH = 0.8;
export const CAM_RANGE = [[-CAM_WIDTH, CAM_WIDTH], [-CAM_WIDTH / 2, CAM_WIDTH / 2]];
/** The dial: {{p1, {1, 0}, "θ"}, makeDialControl[#1, {0, 0}, Red] &, ImageSize -> {120, 120}} (dial-control.js options). */
export const DIAL_OPTIONS = Object.freeze({ name: 'p1', label: 'θ', color: NAMED.Red, imageSize: 120, setter: 'nearest32', arc: 'myArrowArc2', keyStep: 'grid' });
/** Drawing sizes (D-CL-02): px at ImageSize 450. */
export const STYLE = { thinPx: 0.25, normalPx: 1, thickPx: 2, largePointPx: 7.5, mediumFontPx: 12, textFontPx: 12, arrowheads: 0.025 };
const BROWN = [0.6, 0.4, 0.2], ORANGE = NAMED.Orange, DARKER_GRAY = [1 / 3, 1 / 3, 1 / 3];
const OBJECT = [[-1 / 2, -2], [1 / 2, -2], [1 / 2, 2], [-1 / 2, 2]];
const MAJOR = [0.8, 1, 1.2, 1.5, 2, 3, 5, 10]; // integers are exact in the original, the others machine
const MINOR = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 50, 100, 200];

// ------------------------------------------------------------------------------------------------ drawing helper
/**
 * Clips a polyline to the box [[x0, x1], [y0, y1]] (Liang–Barsky per segment, D-CL-08). Returns the visible runs as
 * {pts, offset}: `offset` is the polyline length before the run's first point, so a dashed run keeps its dash phase
 * (stroke-dashoffset). Used by main.js only for drawing: the model's primitive lists keep the original's points
 * (e.g. a missing laser's beam to x = 10000, Q-CL-04).
 */
export function clipPolyline(pts, [[x0, x1], [y0, y1]]) {
  const runs = [];
  let cur = null, before = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let t0 = 0, t1 = 1, ok = [ax, ay, bx, by].every(Number.isFinite);
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
      if (!ok) break;
      if (p === 0) { if (q < 0) ok = false; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) ok = false; else if (r > t0) t0 = r; } else if (r < t0) ok = false; else if (r < t1) t1 = r;
    }
    if (ok) {
      const a = t0 === 0 ? pts[i] : [ax + t0 * dx, ay + t0 * dy], b = t1 === 1 ? pts[i + 1] : [ax + t1 * dx, ay + t1 * dy];
      if (cur && t0 === 0) cur.pts.push(b);
      else { cur = { pts: [a, b], offset: before + t0 * len }; runs.push(cur); }
      if (t1 !== 1) cur = null;
    } else cur = null;
    before += len;
  }
  return runs;
}

// ------------------------------------------------------------------------------------------------ exact numbers
/** An exact rational {num, den} (reduced). */
export const Q = (num, den = 1) => rational(num, den);
export const isExact = (x) => x !== null && typeof x === 'object';
/** The machine value of a number (exact rationals as their correctly rounded double). */
export const N = (x) => (isExact(x) ? x.num / x.den : x);
/** sc · x: exact · exact integer stays exact, exact · machine is machine (sc converted first). */
export const times = (sc, x) => (Number.isInteger(x) ? Q(sc.num * x, sc.den) : N(sc) * x);
/** −x (exact or machine) */
export const negate = (x) => (isExact(x) ? Q(-x.num, x.den) : -x);
/** λ/i = λ·(1/i): for an exact i the reciprocal is exact (den/num), then converted. */
const over = (lam, i) => lam * (isExact(i) ? i.den / i.num : 1 / i);

/** sc = Piecewise[{{1/50, λ s < 1/10}, {1/10, λ s < 1/4}, {1/2, λ s < 1/2}, {1, True}}] (tolerant Less). */
export function reticuleScale(lambda, s) {
  const ls = lambda * s;
  if (mLess(ls, 0.1)) return Q(1, 50);
  if (mLess(ls, 0.25)) return Q(1, 10);
  if (mLess(ls, 0.5)) return Q(1, 2);
  return Q(1, 1);
}
/** The major and minor tick values sc {.8, 1, …} and sc {.5, .6, …} with their exactness. */
export const majorTicks = (sc) => MAJOR.map((x) => times(sc, x));
export const minorTicks = (sc) => MINOR.map((x) => times(sc, x));

// ------------------------------------------------------------------------------------------------ Initialization
/** Convert3DtoCam[λ, pt3d] := Module[{k = λ/Max[0.001, pt3d[[3]]]}, k {-pt3d[[1]], pt3d[[2]]}] */
export function Convert3DtoCam(lambda, [x, y, z]) {
  const k = lambda * (1 / Math.max(0.001, z));
  return [k * -x + 0, k * y + 0];
}
/** θ = ArcTan[p1[[1]], p1[[2]]]; If[θ < 0, θ = θ + 2π] */
export function orientation(p1) {
  const t = arcTan(p1[0], p1[1]);
  return t < 0 ? t + 2 * Math.PI : t;
}
/** objectPts = (RotationMatrix[θ].# + p) & /@ {{-1/2, -2}, {1/2, -2}, {1/2, 2}, {-1/2, 2}} */
export function objectPoints(theta, p) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return OBJECT.map(([x, y]) => [c * x + -s * y + p[0], s * x + c * y + p[1]]);
}
/** Partition[pts, 2, 1] */
const pairs = (pts) => pts.slice(1).map((q, i) => [pts[i], q]);

/**
 * The laser hits: InterPt = {10000, ±s}; for each edge of the closed object, laser 1 then laser 2: if the beam
 * segment {L, {10000, ±s}} meets the edge, the nearer intersection (tolerant Greater) replaces InterPt.
 */
export function laserHits(objectPtsClosed, s) {
  const L1 = [0, s], L2 = [0, -s];
  let InterPt1 = [10000, L1[1]], InterPt2 = [10000, L2[1]];
  const sl1 = [L1, InterPt1], sl2 = [L2, InterPt2];
  for (const edge of pairs(objectPtsClosed)) {
    if (SegmentIntersectionQ([sl1, edge])) { const T = LineIntersectionPoint([sl1, edge]); if (mGreater(InterPt1[0], T[0])) InterPt1 = T; }
    if (SegmentIntersectionQ([sl2, edge])) { const T = LineIntersectionPoint([sl2, edge]); if (mGreater(InterPt2[0], T[0])) InterPt2 = T; }
  }
  return { L1, L2, InterPt1, InterPt2 };
}

/**
 * The visible faces: for each edge {P, Q}, If[P.y/P.x > Q.y/Q.x, Polygon[...]] (a/b = a·(1/b), tolerant Greater).
 * A ratio that divides by zero gives no face (PORT DEVIATION D-CL-07, regression pin until K-CL-03 is answered).
 */
export function visibleFaces(lambda, objectPtsTwiceClosed) {
  const faces = [];
  for (const [P, Qp] of pairs(objectPtsTwiceClosed)) {
    const a = P[1] * (1 / P[0]), b = Qp[1] * (1 / Qp[0]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (mGreater(a, b)) {
      faces.push([Convert3DtoCam(lambda, [P[1], -1, P[0]]), Convert3DtoCam(lambda, [P[1], 1, P[0]]),
        Convert3DtoCam(lambda, [Qp[1], 1, Qp[0]]), Convert3DtoCam(lambda, [Qp[1], -1, Qp[0]])]);
    }
  }
  return faces;
}

// ------------------------------------------------------------------------------------------------ state, evaluation
/** The stored "Variables" (= the live state): p = pFixed = {3, -1/5}, p1 = {1, 0}, s = 1, λ = 0.5. */
export function initialSettings() {
  return { p: [3, -0.2], pFixed: [3, -0.2], p1: [1, 0], s: 1, lambda: 0.5 };
}
/** A saved state (plain numbers; λ under its own name or "lambda") as the port's state. */
export function fromSaved(saved) {
  return { p: saved.p.slice(), pFixed: saved.pFixed.slice(), p1: saved.p1.slice(), s: saved.s, lambda: saved['λ'] ?? saved.lambda };
}

const prim = (kind, o) => ({ kind, ...o });

/**
 * One evaluation of the Manipulate body. Returns {state (a new object), view}; view = {sc, theta, objectPts (6 points:
 * the closing point appended twice, Q-CL-01), InterPt1, InterPt2, InterPt3D1, InterPt3D2, faces, gridCounts, top
 * (primitives of the top view), cam (primitives of the camera image)}.
 */
export function evaluate(stateIn) {
  const st = { p: stateIn.p.slice(), pFixed: stateIn.pFixed.slice(), p1: stateIn.p1.slice(), s: stateIn.s, lambda: stateIn.lambda };
  const { s, lambda: lam } = st;
  const sc = reticuleScale(lam, s);
  const theta = orientation(st.p1);
  if (mLessEq(st.p[1], PLOT_RANGE[1][0])) st.p = st.pFixed.slice();
  st.pFixed = st.p.slice();
  const objectPts = objectPoints(theta, st.p);
  objectPts.push(objectPts[0]);
  const { L1, L2, InterPt1, InterPt2 } = laserHits(objectPts, s);
  const InterPt3D1 = Convert3DtoCam(lam, [InterPt1[1], 0, InterPt1[0]]);
  const InterPt3D2 = Convert3DtoCam(lam, [InterPt2[1], 0, InterPt2[0]]);
  const p = st.p, cw = CAM_WIDTH;

  // ---- top view, in the original's order
  const top = [];
  top.push(prim('polygon', { pts: [[0, 0], [10000 * lam, 10000 * -cw], [10000 * lam, 10000 * cw]], fill: NAMED.Blue, opacity: 0.2, role: 'field-of-view' }));
  top.push(prim('polygon', { pts: objectPts.slice(), fill: BROWN, edge: NAMED.Black, role: 'object' }));
  const aa = arrowArc({ center: p, r: 1, start: Math.PI / 2, end: Math.PI / 2 + theta });
  top.push(prim('arc', { pts: aa.arc, stroke: NAMED.Black, role: 'orientation-arc' }));
  top.push(prim('arrow', { pts: [aa.tail, aa.tip], tip: aa.tip, direction: aa.direction, stroke: NAMED.Black, head: STYLE.arrowheads, role: 'orientation-arrow' }));
  top.push(prim('line', { pts: [[p[0], p[1] + 1], p.slice(), [p[0] + 1.6 * -Math.sin(theta), p[1] + 1.6 * Math.cos(theta)]], stroke: NAMED.Black, role: 'orientation-lines' }));
  if (mGreaterEq(Math.abs(theta), Math.PI / 16)) {
    top.push(prim('text', { text: 'θ', at: [p[0] + 1.5 * -Math.sin(theta / 2), p[1] + 1.5 * Math.cos(theta / 2)], fontPx: STYLE.mediumFontPx, italic: true, color: NAMED.Black, role: 'theta-label' }));
  }
  top.push(prim('line', { pts: [[0, 0], [500, 0]], stroke: NAMED.Black, role: 'optical-axis' }));
  top.push(prim('rect', { from: [-1.5 * lam, -cw], to: [0, cw], fill: DARKER_GRAY, role: 'camera' }));
  for (const [L, role] of [[L1, 'laser-1'], [L2, 'laser-2']]) {
    top.push(prim('rect', { from: [L[0] - 1 / 2, L[1] - 1 / 8], to: [L[0] + 0, L[1] + 1 / 8], fill: ORANGE, edge: NAMED.Black, role }));
  }
  top.push(prim('line', { pts: [L1, InterPt1], stroke: NAMED.Red, role: 'beam-1' }));
  top.push(prim('line', { pts: [L2, InterPt2], stroke: NAMED.Red, role: 'beam-2' }));
  top.push(prim('line', { pts: [InterPt1, [0, 0]], stroke: NAMED.Red, dashed: true, role: 'reflection-1' }));
  top.push(prim('line', { pts: [InterPt2, [0, 0]], stroke: NAMED.Red, dashed: true, role: 'reflection-2' }));
  top.push(prim('line', { pts: [[lam, -cw], [lam, cw]], stroke: NAMED.Blue, thicknessPx: STYLE.thickPx, role: 'image-plane' }));
  top.push(prim('line', { pts: [[-lam, -cw], [-lam, cw]], stroke: NAMED.Blue, thicknessPx: STYLE.thickPx, role: 'image-plane-back' }));
  top.push(prim('point', { at: [0, 0], sizePx: STYLE.largePointPx, color: NAMED.Blue, role: 'pinhole' }));
  top.push(prim('text', { text: 'top view', at: [7, 3.5], fontPx: STYLE.mediumFontPx, color: NAMED.Black, role: 'title' }));
  top.push(prim('arrow', { pts: [[lam + 1 / 2, 2 * cw], [lam, 2 * cw]], stroke: NAMED.Black, head: STYLE.arrowheads, role: 'lambda-arrow-1' }));
  top.push(prim('arrow', { pts: [[-1 / 2, 2 * cw], [0, 2 * cw]], stroke: NAMED.Black, head: STYLE.arrowheads, role: 'lambda-arrow-2' }));
  top.push(prim('text', { text: 'λ', at: [lam / 2, 2 * cw], fontPx: STYLE.textFontPx, italic: true, color: NAMED.Black, role: 'lambda-label' }));
  top.push(prim('line', { pts: [[lam, 0], [lam, 2.2 * cw]], stroke: NAMED.Blue, thicknessPx: STYLE.thinPx, role: 'lambda-guide-1' }));
  top.push(prim('line', { pts: [[0, 0], [0, 2.2 * cw]], stroke: NAMED.Blue, thicknessPx: STYLE.thinPx, role: 'lambda-guide-2' }));
  top.push(prim('polygon', { pts: [[0, 0], [-lam, -cw], [-lam, cw]], fill: NAMED.Blue, opacity: 0.2, role: 'inner-cone' }));
  top.push(prim('arrow', { pts: [[-1 / 4, 1 / 2], [-1 / 4, 0]], stroke: NAMED.Black, head: STYLE.arrowheads, role: 's-arrow-1' }));
  top.push(prim('arrow', { pts: [[-1 / 4, -s - 1 / 2], [-1 / 4, -s]], stroke: NAMED.Black, head: STYLE.arrowheads, role: 's-arrow-2' }));
  top.push(prim('text', { text: 's', at: [-1 / 4, -s / 2], fontPx: STYLE.textFontPx, italic: true, color: NAMED.Black, role: 's-label' }));
  top.push(prim('loc', { at: p.slice(), color: NAMED.Black, role: 'locator-icon' }));

  // ---- camera image
  const R = roundHalfEven(20 * lam), M = roundHalfEven(3 * (1 / lam));
  const cam = [];
  for (let i = 1; i <= R; i++) cam.push(prim('line', { pts: [Convert3DtoCam(lam, [-50, -1, i]), Convert3DtoCam(lam, [50, -1, i])], stroke: NAMED.Gray, thicknessPx: STYLE.thinPx, role: 'ground-row' }));
  for (let i = -M; i <= M; i++) cam.push(prim('line', { pts: [Convert3DtoCam(lam, [i, -1, 0]), Convert3DtoCam(lam, [i, -1, R + 1])], stroke: NAMED.Gray, thicknessPx: STYLE.thinPx, role: 'ground-ray' }));
  cam.push(prim('rect', { from: [-cw, Convert3DtoCam(lam, [-50, -1, R + 1])[1]], to: [cw, 0], fill: NAMED.LightGray, role: 'horizon-band' }));
  cam.push(prim('rect', { from: [-cw, -cw], to: [cw, 0], fill: NAMED.Blue, opacity: 0.2, role: 'ground' }));
  const objectPts2 = objectPts.concat([objectPts[0]]);
  const faces = visibleFaces(lam, objectPts2);
  for (const f of faces) cam.push(prim('polygon', { pts: f, fill: BROWN, edge: NAMED.Black, role: 'face' }));
  for (const [ip, ip3, role] of [[InterPt1, InterPt3D1, 'dot-1'], [InterPt2, InterPt3D2, 'dot-2']]) {
    const size = lam * (0.2 * (1 / ip[0]));
    if (Number.isFinite(size) && ip3.every(Number.isFinite)) cam.push(prim('point', { at: ip3, size, color: NAMED.Red, role }));
  }
  cam.push(prim('line', { pts: [[-cw, 0], [cw, 0]], stroke: NAMED.Black, thicknessPx: STYLE.thinPx, role: 'reticule' }));
  for (const i of majorTicks(sc)) {
    const u = s * over(lam, i), un = -s * over(lam, i);
    cam.push(prim('line', { pts: [[u, -0.025], [u, 0.05]], stroke: NAMED.Black, thicknessPx: STYLE.thinPx, role: 'major-tick' }));
    cam.push(prim('label', { value: i, at: [u, -0.05], fontPx: STYLE.textFontPx, color: NAMED.Black, role: 'tick-label' }));
    cam.push(prim('line', { pts: [[un, -0.025], [un, 0.05]], stroke: NAMED.Black, thicknessPx: STYLE.thinPx, role: 'major-tick' }));
    cam.push(prim('label', { value: negate(i), at: [un, -0.05], fontPx: STYLE.textFontPx, color: NAMED.Black, role: 'tick-label' }));
  }
  for (const i of minorTicks(sc)) {
    const u = s * over(lam, i), un = -s * over(lam, i);
    cam.push(prim('line', { pts: [[u, -0.025], [u, 0]], stroke: NAMED.Black, thicknessPx: STYLE.thinPx, role: 'minor-tick' }));
    cam.push(prim('line', { pts: [[un, -0.025], [un, 0]], stroke: NAMED.Black, thicknessPx: STYLE.thinPx, role: 'minor-tick' }));
  }
  cam.push(prim('text', { text: 'camera image', at: [0, 0.4 * cw], fontPx: STYLE.mediumFontPx, color: NAMED.Black, role: 'title' }));

  return {
    state: st,
    view: { sc, theta, objectPts: objectPts2, InterPt1, InterPt2, InterPt3D1, InterPt3D2, faces, gridCounts: [R, 2 * M + 1], top, cam },
  };
}
