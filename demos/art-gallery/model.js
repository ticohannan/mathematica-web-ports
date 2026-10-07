// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/art-gallery/model.js — pure port of the Manipulate body of "Art Gallery Problem": the three environments,
// the Manipulate variables and one evaluation of the body with the original's caching of the visible regions
// (ptsOld / sOld / prevReg). No DOM. The geometry is in visibility.js.
import { circlePoints, mUnequal } from '../../shared/mma.js';
import { visiblePolys } from './visibility.js';

/** {{reg, "cubicle", "environment"}, {"movable obstacles", "irregular", "cubicle"}, ControlType -> Setter} */
export const ENVIRONMENTS = ['movable obstacles', 'irregular', 'cubicle'];
/** {{s, 1, "number of guards"}, Range@8, ControlType -> Setter} */
export const GUARD_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8];

/** irregularPoly = Reverse@{…} (ControlType -> None variable of the original) */
export const IRREGULAR_POLY = Object.freeze([[-1.2, -2.8], [-3.5, 0.5], [-1, 2.3], [-3.3, 3.2], [0.75, 3], [-0.9, 1],
  [-1.3, 1.35], [-1.2, -1], [0.5, 0.5], [2.6, 1], [2.1, -2.7]].reverse());
/** cubiclePoly = Reverse@{…} */
export const CUBICLE_POLY = Object.freeze([[-2, -3.5], [-2, -2], [-3.5, -2], [-3.5, 0], [-1.5, 0], [-1.5, 0.5], [-3.5, 0.5],
  [-3.5, 3.5], [-1.5, 3.5], [-1.5, 2], [0.5, 2], [0.5, 2.5], [-1, 2.5], [-1, 3.5], [3.5, 3.5], [3.5, 2.5], [1.5, 2.5],
  [1.5, 2], [3.5, 2], [3.5, -0.5], [1.5, -0.5], [1.5, -1.5], [2, -1.5], [2, -1], [3.5, -1], [3.5, -3.5], [2, -3.5],
  [2, -3], [1.5, -3], [1.5, -3.5], [-0.5, -3.5], [-0.5, -1], [0, -1], [0, -0.5], [-1, -0.5], [-1, -3.5]].reverse());

/** pts: 1 = centre of the movable square, 2 = centre of the movable triangle, 3…10 = guards 1…8. */
export const INITIAL_PTS = Object.freeze([[1, 0], [2, 2], [0, 0], [0, -1.5], [-2, -1], [-1.5, 0.5], [-0.6, -1], [-2.5, 0.5],
  [-2, 1], [-1.25, 3]]);
/** Locator range 4{-1,-1} … 4{1,1} */
export const PTS_RANGE = Object.freeze([[-4, -4], [4, 4]]);
/** Graphics PlotRange -> 4{{-1,1},{-1,1}}, ImageSize -> {450, 450} */
export const PLOT_RANGE = Object.freeze([[-4, 4], [-4, 4]]);
export const IMAGE_SIZE = 450;
export const GUARD_RADIUS = 0.1; // Disk[pts[[i+2]], 0.1]
/**
 * cval = ColorData[100, "ColorList"] (guard i and its region use colour i; s <= 8, so only the first eight are used).
 * Exact RGBColor values from extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06 (K-AG-04 resolved).
 */
export const GUARD_COLORS = Object.freeze([
  [0.0684356, 0.645252, 0.782123], [0.98993, 0.699651, 0.0271887], [0.450866, 0.379481, 1], [0.369422, 0.7, 0.229826],
  [0.942659, 0.463296, 0.151884], [0.214511, 0.528391, 0.957413], [0.827693, 0.730855, 0], [0.546532, 0.322857, 0.883671],
]);

const CP4 = circlePoints(4), CP3 = circlePoints(3);
/** bound = 5 CirclePoints@4 (N@ applied, as listofPoly does) */
export const BOUND = Object.freeze(CP4.map(([x, y]) => [5 * x, 5 * y]));
/** invisiblePoly = 7 CirclePoints@4 — the invisible outer boundary of every environment */
export const INVISIBLE_POLY = Object.freeze(CP4.map(([x, y]) => [7 * x, 7 * y]));

/** Initial values of the Manipulate variables (the first value of each control specification). */
export function initialState() {
  return {
    s: 1,
    reg: 'cubicle',
    prevReg: '',
    sOld: -1,
    visibleRegion: Array.from({ length: 8 }, () => [[10, 10], [10, 10]]), // ConstantArray[10, {8, 2, 2}]
    ptsOld: Array.from({ length: 10 }, () => [-10, -10]), // ConstantArray[-10, {10, 2}]
    pts: INITIAL_PTS.map((p) => [...p]),
  };
}

/** Clamp a locator position to its range (Locator controls stay inside 4{-1,-1} … 4{1,1}). */
export const clampPt = ([x, y]) => [Math.min(Math.max(x, -4), 4), Math.min(Math.max(y, -4), 4)];

/**
 * The polygons of the Module: poly1 = (pts[[1]] + #)& /@ CirclePoints[4], poly2 = (pts[[2]] + #)& /@ CirclePoints[3],
 * bound, invisiblePoly, and listofPoly = N@(the environment's list of polygons).
 */
export function environment(reg, pts) {
  const poly1 = CP4.map((c) => [pts[0][0] + c[0], pts[0][1] + c[1]]);
  const poly2 = CP3.map((c) => [pts[1][0] + c[0], pts[1][1] + c[1]]);
  let listofPoly;
  if (reg === 'movable obstacles') listofPoly = [poly1, poly2, BOUND, INVISIBLE_POLY];
  else if (reg === 'irregular') listofPoly = [IRREGULAR_POLY, INVISIBLE_POLY];
  else listofPoly = [CUBICLE_POLY, INVISIBLE_POLY]; // If[reg == "irregular", …, {cubiclePoly, invisiblePoly}]: any other value
  return { poly1, poly2, bound: BOUND, invisiblePoly: INVISIBLE_POLY, listofPoly };
}

const copyState = (st) => ({
  ...st,
  pts: st.pts.map((p) => [...p]),
  ptsOld: st.ptsOld.map((p) => [...p]),
  visibleRegion: st.visibleRegion.slice(), // regions are never mutated, only replaced
});

/**
 * One evaluation of the Manipulate body (Mathematica re-evaluates it after every change of a control).
 * Only the visible regions the original recomputes are recomputed:
 *   Table[If[pts[[i]] != ptsOld[[i]] || pts[[1]] != ptsOld[[1]] || pts[[2]] != ptsOld[[2]] || sOld < i-2 ||
 *            prevReg != reg, visibleRegion[[i-2]] = visiblePolys[listofPoly, pts[[i]]]; ptsOld[[i]] = pts[[i]]],
 *         {i, 3, s+2}]
 * then ptsOld[[1;;2]], sOld and prevReg are updated.
 * ORIGINAL QUIRK (Q-AG-04): moving an obstacle locator (pts[[1]], pts[[2]]) recomputes every guard in every
 * environment, also where no obstacle is drawn.
 * Returns { state, view } where view = { env, recomputed: [guard numbers], traces: {guard: trace}, ms }.
 */
export function evaluate(stateIn) {
  const st = copyState(stateIn);
  const { s, reg, pts, ptsOld } = st;
  const env = environment(reg, pts);
  const recomputed = [];
  const traces = {};
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  for (let i = 3; i <= s + 2; i++) {
    if (mUnequal(pts[i - 1], ptsOld[i - 1]) || mUnequal(pts[0], ptsOld[0]) || mUnequal(pts[1], ptsOld[1]) || st.sOld < i - 2 || st.prevReg !== reg) {
      const trace = {};
      st.visibleRegion[i - 3] = visiblePolys(env.listofPoly, pts[i - 1], trace);
      ptsOld[i - 1] = [...pts[i - 1]];
      recomputed.push(i - 2);
      traces[i - 2] = trace;
    }
  }
  // update the Old variables
  if (mUnequal(pts[0], ptsOld[0]) || mUnequal(pts[1], ptsOld[1])) {
    ptsOld[0] = [...pts[0]];
    ptsOld[1] = [...pts[1]];
  }
  st.sOld = s;
  st.prevReg = reg;
  const ms = typeof performance !== 'undefined' ? performance.now() - t0 : 0;
  return { state: st, view: { env, recomputed, traces, ms } };
}
