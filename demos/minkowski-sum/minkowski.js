// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/minkowski-sum/minkowski.js — pure port of "Minkowski Sum of Convex Robot and Obstacle"
// (docs/original-source/minkowski-sum.txt): the Initialization functions under their original names and one
// evaluation of the Manipulate body, which also returns the picture as shared/graphics.js data. No DOM.
//
// Numbers follow the original's Mathematica semantics (DESIGN.md §6.4): tolerant <, <=, ==, != (shared/mma.js);
// Sort[list, p] as shared/mma.js sortMma (ties in reverse input order, Q-MS-04; a comparison with the angle None is
// never True, K-MS-01); ArcTan correctly rounded without signed zero (shared/mma-exact.js); Normalize with the
// correctly rounded length (shared/mma-extra.js normalizeCR, K-MS-02); DeleteDuplicates with the 1-ulp SameQ
// (K-MS-03); a/b = a·(1/b); sums of several terms in written order.
// Quirks of the ORIGINAL are reproduced and marked "ORIGINAL QUIRK (Q-MS-nn)"; places where the port cannot do what
// the original does are marked "PORT DEVIATION (D-MS-nn)".
import { mLess, mGreater, mLessEq, mEqual, chop, sortMma } from '../../shared/mma.js';
import { arcTan } from '../../shared/mma-exact.js';
import { normalizeCR } from '../../shared/mma-extra.js';
import {
  Annotation, Polygon, Line, Point, Disk, Text, Style, Subscript, Italic, EdgeForm, Opacity, AbsoluteThickness, AbsolutePointSize,
  ScriptSizeMultipliers, ScriptBaselineShifts, Black, White, Red, Blue, LightRed, LightBlue, LightGreen,
} from '../../shared/graphics.js';
import { plotUnitsPerPx, notchedArrowhead } from '../../shared/graphics-extras.js';
import {
  lineList, vector, areaCalulation, areaOfPoly, centroidCal, centroidOfPoly, discretizeLineRev1, sameQ, meanMma as mean,
} from '../common/polygon-core.js';

export { lineList, vector, areaCalulation, areaOfPoly, centroidCal, centroidOfPoly, discretizeLineRev1 };

// ---- constants ------------------------------------------------------------------------------------------------
/** offset = {2.298, -2.298}: where the static view draws the Minkowski sum (shifted by -oc). */
export const OFFSET = Object.freeze([2.298, -2.298]);
/** {step, 0.01, ControlType -> None}: spacing of the discretised boundary. */
export const STEP = 0.01;
/** The clamp line: robot vertices x >= 1.34704, obstacle vertices x <= -1.34704. */
export const X_LIMIT = 1.34704;
/** Locator range {{-3.249, 1.489}, {3.249, 3.298}}. */
export const LOCATOR_BOX = Object.freeze([[-3.249, 1.489], [3.249, 3.298]]);
/** Half side of the frame square 7 CirclePoints[4]: exact 7/Sqrt[2], whose machine value N[7/Sqrt[2]] =
 *  7·(1/√2) = 4.949747468305832 in 15.0.1 (harness run 2: the recorded %g's {"wl": "7/Sqrt[2]", "n": 4.949747468305832}
 *  and the recorded PlotRange of H-MS-01 and H-MS-22), one ulp below the correctly rounded 4.949747468305833. */
export const FRAME_HALF = 7 * (1 / Math.sqrt(2));
/** The frame square 7 CirclePoints[4] in CirclePoints order (first vertex at -45 degrees). */
export const FRAME_SQUARE = Object.freeze([[FRAME_HALF, -FRAME_HALF], [FRAME_HALF, FRAME_HALF], [-FRAME_HALF, FRAME_HALF], [-FRAME_HALF, -FRAME_HALF]]);
/** The plot range Mathematica takes from all primitives: the square (DESIGN §6.5, K-MS-07). */
export const PLOT_RANGE = Object.freeze([[-FRAME_HALF, FRAME_HALF], [-FRAME_HALF, FRAME_HALF]]);
/** ImageSize -> .9{620, 450} */
export const IMAGE_SIZE = Object.freeze([558, 405]);
export const VIEWS = Object.freeze(['static', 'move around Minkowski']);
export const MOVE_VIEW = 'move around Minkowski';
/** Default locators (Input cell; pts[[7]] = {-1.347, 2.607} is clamped by the first evaluation, N-MS-04). */
export const DEFAULT_PTS = Object.freeze([[2.885, 1.489], [3.249, 2.6], [2.298, 3.298], [1.348, 2.607], [1.71, 1.489],
  [-1.71, 1.489], [-1.347, 2.607], [-2.298, 3.298], [-3.249, 2.607], [-2.885, 1.489]].map((p) => Object.freeze(p)));
const SORTED_CENTRE = [-2.3, -1.5];

const copyPts = (pts) => pts.map((p) => [p[0], p[1]]);
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const neg2 = (a) => [-a[0], -a[1]];
const times2 = (k, a) => [k * a[0], k * a[1]];

/** The Manipulate's initial settings (the output cell's stored "Variables": unclamped pts, dl, rl, ol Null). */
export function initialSettings() {
  return { stableOrMove: 'static', a: false, c: true, m: 3, n: 5, s: 1, step: STEP, dl: null, rl: null, ol: null, pts: copyPts(DEFAULT_PTS) };
}
/** The opening (live, saved) state: the first evaluation of the initial settings (F-MS-17). */
export function openingState() {
  return evaluate(initialSettings()).state;
}
/** Locator[...] range: a dragged locator is limited to the box {-3.249, 1.489} … {3.249, 3.298}. */
export const clampToBox = ([x, y]) => [
  Math.min(Math.max(x, LOCATOR_BOX[0][0]), LOCATOR_BOX[1][0]),
  Math.min(Math.max(y, LOCATOR_BOX[0][1]), LOCATOR_BOX[1][1]),
];

// ---- Initialization functions ----------------------------------------------------------------------------------

/** clockwiseQ[{x1,y1},{x2,y2},{x3,y3}] := Chop[(x2 - x1)(y3 - y1) - (y2 - y1)(x3 - x1)] */
export function clockwiseQ([x1, y1], [x2, y2], [x3, y3]) {
  return chop((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1));
}

/**
 * convexHullGrahamScan[pts] exactly as written (DESIGN F-MS-10): Sort by y (tolerant Less, Mathematica's tie order),
 * the rest sorted by ArcTan from the first point, then the For/While loop with clockwiseQ <= 0,
 * If[m > 2, m = m - 1, If[i == n, Break[], i += 1]], the swap p[[{i, m}]] = p[[{m, i}]], result p[[1;;m]].
 * ORIGINAL QUIRK (Q-MS-05): collinear points leave the loop through Break[] unchanged (a zero-area "hull").
 */
export function convexHullGrahamScan(pts) {
  const n = pts.length;
  const sortedP = sortMma(pts, (a, b) => mLess(a[1], b[1]));
  const [x0, y0] = sortedP[0];
  const ang = (q) => arcTan(q[0] - x0, q[1] - y0);
  const p = [null, sortedP[0], ...sortMma(sortedP.slice(1, n), (a, b) => mLess(ang(a), ang(b)))]; // 1-based
  let m = 2;
  for (let i = 1; i <= n; i++) {
    while (mLessEq(clockwiseQ(p[m - 1], p[m], p[i]), 0)) {
      if (m > 2) m = m - 1;
      else if (i === n) break;
      else i += 1;
    }
    m += 1;
    const t = p[i]; p[i] = p[m]; p[m] = t; // p[[{i, m}]] = p[[{m, i}]]
  }
  return p.slice(1, m + 1);
}

/** discretizePolyRev1[poly, step] := Append[Flatten[discretizeLineRev1[#, step] & /@ lineList[poly], 1], First@poly] */
export function discretizePolyRev1(poly, step) {
  return [...lineList(poly).flatMap((e) => discretizeLineRev1(e, step)), poly[0]];
}

/** normalVector[{{x2,y2},{x1,y1}}] := Normalize[{(-y2 + y1), x2 - x1}] — the outward normal of a counter-clockwise
 *  edge. Normalize = v·(1/correctly rounded length) (K-MS-02). */
export function normalVector([[x2, y2], [x1, y1]]) {
  return normalizeCR([-y2 + y1, x2 - x1]);
}

/** DeleteDuplicates with the default test SameQ (1-ulp tolerance for machine reals, K-MS-03): first occurrences. */
export function deleteDuplicates(list) {
  const out = [];
  for (const p of list) if (!out.some((q) => sameQ(q, p))) out.push(p);
  return out;
}

/** RotateLeft[list, k] (k may be negative). */
export function rotateLeft(list, k) {
  const n = list.length;
  if (!n) return [];
  const r = ((k % n) + n) % n;
  return [...list.slice(r), ...list.slice(0, r)];
}

const keyText = (sym, i) => `${sym}${i}`;

/**
 * {Chop[prev = prev - #[[3]]], #[[4]]} & /@ entries — the walk along the sorted edge vectors. ORIGINAL QUIRK (Q-MS-06):
 * Chop applies to the stored vertex; the running sum `prev` keeps values below 1e-10 (motion-planning chops the sum).
 * entries: [{vec, side}], prev0: the start point. Returns [{point, side}].
 */
export function minkowskiWalk(prev0, entries) {
  let prev = prev0;
  const out = entries.map((r) => {
    prev = sub2(prev, r.vec);
    return { point: chop(prev), side: r.side };
  });
  out.prevEnd = prev; // the value of the local `prev` when the body's Module ends
  return out;
}

// ---- one evaluation of the Manipulate body ------------------------------------------------------------------

/**
 * evaluate(state) — one evaluation of the Manipulate body. state: {stableOrMove, a, c, m, n, s, step, dl, rl, ol, pts}.
 * Returns {state, view, graphics}: the new Manipulate variables (the body writes pts, rl, ol, dl, c and s), every
 * computed local (original names) and the picture (picture(state, view): shared/graphics.js data in the original's order).
 */
export function evaluate(stateIn) {
  const st = { ...stateIn, pts: copyPts(stateIn.pts) };
  const { m, n, pts } = st;
  const step = st.step;

  // (*constrain vertices of robot and obstacle*) — ORIGINAL QUIRK (Q-MS-01): oldpts = {} on every evaluation, so the
  // clamp always runs; ORIGINAL QUIRK (Q-MS-02): only the m robot and n obstacle locators in use are clamped.
  for (let i = 1; i <= m; i++) if (mLess(pts[i - 1][0], X_LIMIT)) pts[i - 1][0] = X_LIMIT;
  for (let i = 6; i <= n + 5; i++) if (mGreater(pts[i - 1][0], -X_LIMIT)) pts[i - 1][0] = -X_LIMIT;

  const robopts = deleteDuplicates(pts.slice(0, m));
  const obopts = deleteDuplicates(pts.slice(5, n + 5));
  const rltemp = robopts.length, oltemp = obopts.length;
  const robot = rltemp >= 3 ? rotateLeft(convexHullGrahamScan(robopts), -1) : robopts;
  const obstacle = oltemp >= 3 ? rotateLeft(convexHullGrahamScan(obopts), -1) : obopts;
  const rl = robot.length, ol = obstacle.length;
  st.rl = rl; st.ol = ol;

  const rc = rl >= 3 ? centroidOfPoly(robot) : mean(robot);
  const oc = ol >= 3 ? centroidOfPoly(obstacle) : mean(obstacle);

  // {normal, vec, "Alpha"/"Beta", edge}: robot normals inward, robot vectors forward; obstacle normals outward
  const robotNormal = lineList(robot).map((e) => ({
    normal: rl >= 2 ? neg2(normalVector(e)) : [0, 0], vec: rl >= 2 ? neg2(vector(e)) : [0, 0], side: 'Alpha', edge: e,
  }));
  const obstacleNormal = lineList(obstacle).map((e) => ({
    normal: ol >= 2 ? normalVector(e) : [0, 0], vec: ol >= 2 ? vector(e) : [0, 0], side: 'Beta', edge: e,
  }));
  const arrowOf = (r) => [mean(r.edge), add2(times2(0.45, r.normal), mean(r.edge))];
  const robotArrows = robotNormal.map(arrowOf);
  const obstacleArrows = obstacleNormal.map(arrowOf);
  // AssociationThread[Subscript[α, i] -> …], Join[robot…, obstacle…]
  const assoc = [
    ...robotNormal.map((r, i) => ({ key: keyText('α', i + 1), ...r })),
    ...obstacleNormal.map((r, i) => ({ key: keyText('β', i + 1), ...r })),
  ];
  // {If[!(n1 == 0 && n2 == 0), ArcTan[n1, n2], None], normal, vec, side, edge}, sorted by #1[[1]] < #2[[1]]
  const withAngle = assoc.map((r) => ({
    ...r, angle: !(mEqual(r.normal[0], 0) && mEqual(r.normal[1], 0)) ? arcTan(r.normal[0], r.normal[1]) : null,
  }));
  // K-MS-01: a comparison with None stays unevaluated, i.e. not True
  const orderOfNormals = sortMma(withAngle, (a, b) => a.angle !== null && b.angle !== null && mLess(a.angle, b.angle));
  const sides = orderOfNormals.map((r) => r.side);
  let pos = null;
  for (let i = 0; i + 1 < sides.length; i++) if (sides[i] === 'Alpha' && sides[i + 1] === 'Beta') { pos = i + 1; break; }

  // labels that do not depend on the sum
  const robotlabel = rl >= 2
    ? robotNormal.map((r, i) => ({ key: keyText('α', i + 1), at: add2(mean(r.edge), times2(-1 * (rl === 2 ? -0.65 : 0.2), r.normal)) })) : [];
  const obstaclelabel = ol >= 2
    ? obstacleNormal.map((r, i) => ({ key: keyText('β', i + 1), at: add2(mean(r.edge), times2(-1 * (ol === 2 ? -0.65 : 0.2), r.normal)) })) : [];
  const sortedNormalRobot = rl >= 2 ? robotNormal.map((r, i) => ({ key: keyText('α', i + 1), at: add2(SORTED_CENTRE, times2(1.2, r.normal)) })) : [];
  const sortedNormalObstacle = ol >= 2 ? obstacleNormal.map((r, i) => ({ key: keyText('β', i + 1), at: add2(SORTED_CENTRE, times2(1.2, r.normal)) })) : [];
  const sortedArrows = orderOfNormals.map((r) => [SORTED_CENTRE, add2(SORTED_CENTRE, r.normal)]);

  const view = {
    robopts, obopts, robot, obstacle, rl, ol, rc, oc, robotNormal, obstacleNormal, robotArrows, obstacleArrows,
    orderOfNormals, pos, robotlabel, obstaclelabel, sortedNormalRobot, sortedNormalObstacle, sortedArrows,
    orderOfNormalsKeys: null, prev: null, minkowskiPointswithSide: [], minkowskiPoints: [], shiftedMinkwithSide: [],
    shiftedMink: [], minkRobotlinelist: [], minkObstlinelist: [], minkowskiSidesNormalArrows: [],
    minkowskiRobotSidesLabels: [], minkowskiObstacleSidesLabels: [], discretPolygon: null, sumOk: pos !== null,
  };

  if (pos !== null) {
    const keys = orderOfNormals.map((r) => r.key);
    view.orderOfNormalsKeys = rotateLeft(keys, pos);
    // prev = rc + sortedVectors[[pos+1]][[5]][[1]] - sortedVectors[[pos]][[5]][[1]]
    // Plus[rc, a, -b] of three 2-vectors: the order of addition is EMPIRICAL (K-MS-11, harness run 2): (rc + a) - b
    // (written) when the robot's point list robopts (before the hull) has 4 or 5 points — also when the hull then has
    // only 3 vertices (H-MS-16) — and (a - b) + rc when it has at most 3. This reproduces 14 of the 15 recorded sums
    // (all but H-MS-22). Hypothesis (not checked): Plus adds its packed-array operands first; which operands are packed
    // depends on how the hull was built.
    const a = orderOfNormals[pos].edge[0], b = orderOfNormals[pos - 1].edge[0];
    const prev = rltemp >= 4 ? sub2(add2(rc, a), b) : add2(sub2(a, b), rc);
    view.prev = prev;
    // ORIGINAL QUIRK (Q-MS-06): Chop applies to the stored vertex; the running sum keeps its small values.
    // ORIGINAL QUIRK (Q-MS-07): no DeleteDuplicates of the sum's vertices.
    const minkowskiPointswithSide = minkowskiWalk(prev, rotateLeft(orderOfNormals, pos - 1));
    view.prevEnd = minkowskiPointswithSide.prevEnd;
    const minkowskiPoints = minkowskiPointswithSide.map((x) => x.point);
    // {-oc + offset + #[[1]], #[[2]]}; AppendTo[…, first]
    const shiftedMinkwithSide = minkowskiPointswithSide.map((x) => ({ point: add2(add2(neg2(oc), OFFSET), x.point), side: x.side }));
    shiftedMinkwithSide.push(shiftedMinkwithSide[0]);
    const shiftedMink = shiftedMinkwithSide.map((x) => x.point);
    const minkRobotlinelist = [], minkObstlinelist = [];
    for (let i = 2; i <= shiftedMinkwithSide.length; i++) {
      const seg = [shiftedMinkwithSide[i - 2].point, shiftedMinkwithSide[i - 1].point];
      if (shiftedMinkwithSide[i - 1].side === 'Alpha') minkRobotlinelist.push(seg); else minkObstlinelist.push(seg);
    }
    const minkowskiSidesNormalArrows = [...minkRobotlinelist, ...minkObstlinelist]
      .map((l) => [mean(l), add2(times2(0.5, normalVector(l)), mean(l))]);
    const shiftedMinkLineList = lineList(shiftedMink);
    const posOf = (key) => view.orderOfNormalsKeys.indexOf(key) + 1;
    const roboPosMink = []; for (let k = 1; k <= rl; k++) { const q = posOf(keyText('α', k)); if (q > 0) roboPosMink.push(q); }
    const obosPosMink = []; for (let k = 1; k <= ol; k++) { const q = posOf(keyText('β', k)); if (q > 0) obosPosMink.push(q); }
    // ORIGINAL QUIRK (Q-MS-09): the two 0.7 conditions are not symmetric
    const kR = rl === 2 && (ol === 1 || ol === 2) ? -0.7 : 0.25;
    const kO = (rl === 1 || rl === 2) && ol === 2 ? -0.7 : 0.25;
    const sideLabel = (j, k) => {
      const L = shiftedMinkLineList[j - 1];
      return { key: view.orderOfNormalsKeys[j - 1], at: add2(times2(-1 * k, normalVector(L)), mean(L)) };
    };
    Object.assign(view, {
      minkowskiPointswithSide, minkowskiPoints, shiftedMinkwithSide, shiftedMink, minkRobotlinelist, minkObstlinelist,
      minkowskiSidesNormalArrows, shiftedMinkLineList, roboPosMink, obosPosMink,
      minkowskiRobotSidesLabels: rl >= 2 ? roboPosMink.map((j) => sideLabel(j, kR)) : [],
      minkowskiObstacleSidesLabels: ol >= 2 ? obosPosMink.map((j) => sideLabel(j, kO)) : [],
    });
    view.discretPolygon = discretizePolyRev1(minkowskiPoints, step);
    st.dl = view.discretPolygon.length;
  }
  // PORT DEVIATION (D-MS-05, provisional): without an α–β pair the original's Part fails (K-MS-01); the port leaves
  // dl unchanged and draws no sum.

  // View logic inside the Graphics: the static view sets c = True and s = 1 (Q-MS-03, Q-MS-08); the move view c = False
  if (st.stableOrMove !== MOVE_VIEW) { st.c = true; st.s = 1; } else st.c = false;
  return { state: st, view, graphics: picture(st, view) };
}

// ---- the Graphics as shared/graphics.js data ----------------------------------------------------------------------
// Graphics[{…}, ImageSize -> .9{620, 450}]: no PlotRange, so Mathematica takes the square 7 CirclePoints[4] (§6.5) with
// the default padding; the 558 × 405 image shows that square centred, white left and right. The port widens the x range
// so that the SVG has the original's 558 × 405 shape with the square in the middle.
const [IW, IH] = IMAGE_SIZE;
export const RANGE = Object.freeze([[-(FRAME_HALF * IW) / IH, (FRAME_HALF * IW) / IH], [-FRAME_HALF, FRAME_HALF]]);
const PX = plotUnitsPerPx(RANGE, IW); // world units per pixel
// PORT DEVIATION (D-MS-02): Mathematica's sizes approximated. PointSize[0.01] of the 405-pixel plot width; default line
// width 1 px; Thin 0.5 px; default arrowheads about 12 px long (0.0215 of the image width, as four-bar-linkage); text 12 px.
const POINT = AbsolutePointSize(0.01 * IH), THIN = AbsoluteThickness(0.5), HEAD = [12, 4.6];

/** Arrow[{a, b}] with the notched head: the shaft to the notch, then the head (shorter arrows get smaller heads) */
function arrow([a, b], id) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  if (L === 0) return Annotation([], id, { class: 'arrow' });
  const len = Math.min(HEAD[0] * PX, L);
  const { head, notch } = notchedArrowhead(b, [dx / L, dy / L], len, HEAD[1] * PX * (len / (HEAD[0] * PX)));
  return Annotation([Line([a, notch]), head], id, { class: 'arrow' });
}
const arrows = (list, id) => [Black, ...list.map((a) => arrow(a, `arrow-${id}`))];
const points = (pts, id) => Annotation(pts.map(Point), id);
/** Text[Subscript[α, i], pos]: italic letter, subscript 0.35em down at 75 % (snapshot 1) */
const SUB = [ScriptSizeMultipliers('75%'), ScriptBaselineShifts(['0.35em', '0.35em'])];
const labels = (col, list, id) => list.map((l) => [col,
  Annotation(Text(Style(Subscript(Style(l.key.slice(0, 1), Italic), l.key.slice(1)), ...SUB), l.at), `label-${id}`, { 'data-key': l.key })]);
const text = (str, pos, id) => [Black, Annotation(Text(str, pos), `text-${id}`)];
const lines = (col, segs, id) => [col, Annotation(segs.map((q) => Line(q)), id)];
const frame = [EdgeForm(THIN), White, Annotation(Polygon(FRAME_SQUARE.map((p) => [...p])), 'frame')]; // {EdgeForm[Thin], White, Polygon@(7CirclePoints[4])}

/** If[stableOrMove != "move around Minkowski", …]: the static view (the sum drawn only when it exists, D-MS-05) */
const staticView = (v, { a, m, n, pts }) => [
  v.sumOk && [[Opacity(0.5), LightGreen, Annotation(Polygon(v.shiftedMink), 'mink-polygon')],
    lines(Blue, v.minkRobotlinelist, 'mink-robot-lines'), lines(Red, v.minkObstlinelist, 'mink-obstacle-lines'), [Black, points(v.shiftedMink, 'mink-points')]],
  text('Minkowski sum', [2.3, -4.75], 'mink-text'),
  v.sumOk && [a && arrows(v.minkowskiSidesNormalArrows, 'mink-arrows'),
    labels(Blue, v.minkowskiRobotSidesLabels, 'mink-label'), labels(Red, v.minkowskiObstacleSidesLabels, 'mink-label')],
  [[EdgeForm(Red), LightRed, Annotation(Polygon(v.obstacle), 'obstacle-polygon')], [Red, points(pts.slice(5, n + 5), 'obstacle-locator-points')],
    [Black, points(v.obstacle, 'obstacle-points'), points([v.oc], 'obstacle-centroid')], a && arrows(v.obstacleArrows, 'obstacle-arrows'),
    labels(Red, v.obstaclelabel, 'obstacle-label'), text('obstacle', [-2.3, 0.8], 'obstacle-text')],
  [[EdgeForm(Blue), LightBlue, Annotation(Polygon(v.robot), 'robot-polygon')], [Blue, points(pts.slice(0, m), 'robot-locator-points')],
    [Black, points(v.robot, 'robot-points'), points([v.rc], 'robot-centroid')], a && arrows(v.robotArrows, 'robot-arrows'),
    labels(Blue, v.robotlabel, 'robot-label'), text('robot', [2.3, 0.8], 'robot-text')],
  [arrows(v.sortedArrows, 'sorted-arrows'), [EdgeForm(THIN), White, Annotation(Disk(SORTED_CENTRE, 0.5), 'sorted-disk')],
    labels(Blue, v.sortedNormalRobot, 'sorted-label'), labels(Red, v.sortedNormalObstacle, 'sorted-label'), text('sorted normals', [-2.3, -3.2], 'sorted-text')],
];

/** The move view's robot placement: robot vertices discretPolygon[[s]] - rc - oc + v, centroid discretPolygon[[s]] - oc. */
export function robotAt(v, s) {
  const d = v.discretPolygon && v.discretPolygon[s - 1];
  if (!d) return null;
  return {
    vertices: v.robot.map((q) => add2(sub2(sub2(d, v.rc), v.oc), q)),
    centroid: sub2(d, v.oc),
  };
}

/** the move view: the sum and the obstacle around the origin, the robot at discretPolygon[[s]] */
const moveView = (v, { s }) => {
  const moc = neg2(v.oc), sum = v.minkowskiPoints.map((p) => add2(moc, p)), obst = v.obstacle.map((p) => add2(moc, p));
  const back = (l) => [add2(neg2(OFFSET), l[0]), add2(neg2(OFFSET), l[1])];
  const r = v.sumOk ? robotAt(v, s) : null;
  return [
    v.sumOk && [[Opacity(0.5), LightGreen, Annotation(Polygon(sum), 'mink-polygon')], [Black, points(sum, 'mink-points')],
      lines(Blue, v.minkRobotlinelist.map(back), 'mink-robot-lines'), lines(Red, v.minkObstlinelist.map(back), 'mink-obstacle-lines')],
    text('Minkowski sum', [0, 1.1], 'mink-text'),
    [EdgeForm(Red), LightRed, Annotation(Polygon(obst), 'obstacle-polygon')], [Black, points(obst, 'obstacle-points')], text('obstacle', [0, 0], 'obstacle-text'),
    // K-MS-10: {EdgeForm[Blue], Opacity[0.5], LightBlue, Polygon} — the port draws the edge opaque
    r && [[EdgeForm(Blue), Opacity(0.5), LightBlue, Annotation(Polygon(r.vertices), 'robot-polygon')], [Black, points(r.vertices, 'robot-points')],
      [Red, points([r.centroid], 'robot-centroid')], text('robot', add2(r.centroid, [0.2, 0.2]), 'robot-text')],
  ];
};

/** The Graphics list of one evaluation (state after the evaluation, view): the frame, then the static or the move view. */
export const picture = (st, v) => [POINT, frame, st.stableOrMove !== MOVE_VIEW ? staticView(v, st) : moveView(v, st)];
