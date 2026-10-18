// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Haoran Zhao; Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/arm-grid.js — the configuration-space grid code that "Robot Motion with Obstacles" (Aaron T. Becker and
// Haoran Zhao) and "Breadth-First Search Robot Motion Planning" (Aaron T. Becker, Benedict Isichei and Praveen Reddy
// Padala) define identically, or with only exact-vs-machine constants, in their Initialization and Manipulate code.
// It composes `armSegments` of demos/common/two-link.js (owner two-link-kinematics, after "Forward and Inverse
// Kinematics for Two-Link Arm" by Aaron T. Becker and Lillian Lin). Owner: robot-motion-obstacles
// (COMMON-DECISIONS §3). Pure: no DOM, importable in Node. "Probabilistic Roadmap Method for Robot Arm" keeps its
// own copies of the overlay constants (I-RM-05).
//
// Numerics: machine divisions of the stored code a/b are computed as a·(1/b) (Mathematica's Times[a, Power[b, -1]];
// COMMON-DECISIONS §4, K-RM-06); comparisons of reals are Mathematica's tolerant ones (shared/mma.js).
import { mLess, mGreater } from '../../shared/mma.js';
import { armSegments } from './two-link.js';
import { piOver } from '../../shared/exact-pi.js';

// ---- constants "to space the overlay plot": xMin = 2.9; yMin = -2; xMax = xMin + 3.8; yMax = yMin + 3.8 ----------------
export const xMin = 2.9;
export const yMin = -2;
export const xMax = xMin + 3.8; // 6.699999999999999 (the stored Initialization assigns this literal)
export const yMax = yMin + 3.8; // 1.7999999999999998
/** Module locals w = 1/8 (half-width of a link, radius of an obstacle disk) and l = 1 (link length). */
export const W = 1 / 8;
export const L = 1;
/** Graphics[…, PlotRange -> {{-2.2, 7.1}, {-2.4, 2.4}}, ImageSize -> {600, 320}] */
export const PLOT_RANGE = [[-2.2, 7.1], [-2.4, 2.4]];
export const IMAGE_SIZE = [600, 320];
/** Locator ranges: obstacles {-2, -2}…{2, 2}; configurations {xMin - .1, yMin - .1}…{xMax + .1, yMax + .1}. */
export const OBS_RANGE = [[-2, -2], [2, 2]];
export const CONFIG_RANGE = [[xMin - 0.1, yMin - 0.1], [xMax + 0.1, yMax + 0.1]];
/** A dragged locator stays inside its range (the Manipulate limits only dragging; loaded states are used as they are). */
export const clampTo = ([x, y], [[x0, y0], [x1, y1]]) => [Math.min(Math.max(x, x0), x1), Math.min(Math.max(y, y0), y1)];

const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

/**
 * pointsegdis2[{seg, pointlist}] — "returns the shortest distance between line segment 'seg' and a list of points":
 *   u = Subtract @@ seg, mean = Plus @@ seg/2,
 *   t = -(2 (p - mean).u)/u.u, closest = mean - u Sign[t] Min[1, Abs[t]]/2, Min over p of EuclideanDistance[p, closest].
 * (The BFS original writes the constants as 2.0, 1.0, 2.0: the same doubles.)
 */
export function pointsegdis2([seg, pointlist]) {
  const [a, b] = seg;
  const u = [a[0] - b[0], a[1] - b[1]];
  const mean = [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5];
  const inv = 1 / (u[0] * u[0] + u[1] * u[1]);
  let best = Infinity;
  for (const p of pointlist) {
    const t = -2 * ((p[0] - mean[0]) * u[0] + (p[1] - mean[1]) * u[1]) * inv;
    const c = sign(t) * Math.min(1, Math.abs(t)) * 0.5;
    const q = [mean[0] - u[0] * c, mean[1] - u[1] * c];
    const dx = p[0] - q[0], dy = p[1] - q[1];
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < best) best = d;
  }
  return best;
}

/**
 * The originals' collision test of the arm with link 1 at theta1 and link 2 at the ABSOLUTE angle phi2:
 *   pointsegdis2[{{{0,0}, l{Cos[θ1], Sin[θ1]}}, pObsV}] < 2w || pointsegdis2[{{elbow, l{Cos[θ1] + Cos[φ2], …}}, pObsV}] < 2w
 * (tolerant Less; Or stops at the first True). φ2 = θ1 + θ2 for the drawn arm, a1 − a2 in the tables.
 */
export function armHits(theta1, phi2, obs, margin = 2 * W) {
  const [link1, link2] = armSegments(theta1, phi2, L, L);
  return mLess(pointsegdis2([link1, obs]), margin) || mLess(pointsegdis2([link2, obs]), margin);
}

/**
 * The iterator {a, Pi/res, 2 Pi - Pi/res, 2 (Pi/res)} of the originals' Table in machine arithmetic: min = π·(1/res),
 * step = 2·min, max = 2π − min. Count = Floor[(max − min)·(1/step) + 1e-10] + 1 (the tolerance is the port's guess,
 * K-RM-03): res for a whole res, Floor[res] otherwise (169 for 169.92). Values min + k·step.
 * Option `exactPi` (BF: the stored Body's `1. (Pi/resolution)` with an exact integer resolution, K-BF-09): for a whole
 * res, min is the correctly rounded π/res (shared/exact-pi.js piOver) instead of π·(1/res); other res as above.
 */
const tableMin = (res, exactPi) => (exactPi && Number.isInteger(res) && res > 0 ? piOver(res) : Math.PI * (1 / res));
export function tableCount(res, { exactPi = false } = {}) {
  const min = tableMin(res, exactPi), step = 2 * min, max = 2 * Math.PI - min;
  return Math.floor((max - min) * (1 / step) + 1e-10) + 1;
}
export function tableAngles(res, { exactPi = false } = {}) {
  const min = tableMin(res, exactPi), step = 2 * min;
  const n = tableCount(res, { exactPi });
  const out = new Array(n);
  for (let k = 0; k < n; k++) out[k] = min + k * step;
  return out;
}

/**
 * The configuration-space table: rows a2, columns a1 (both from tableAngles), each cell `hit` when the arm with link 1 at
 * a1 and link 2 at a1 − a2 touches an obstacle, else `free` (robot-motion-obstacles 1/0, the BFS original −1/0).
 * `options` as tableAngles.
 */
export function cSpaceTable(obs, res, hit = 1, free = 0, options = {}) {
  const angs = tableAngles(res, options);
  return angs.map((a2) => angs.map((a1) => (armHits(a1, a1 - a2, obs) ? hit : free)));
}

/**
 * applyTorus[pConfigI] ("enable torus property"; the BFS original's function, the motion original's inline code is the
 * same rule): x < xMin → xMax, x > xMax → xMin, the same for y with yMin/yMax (tolerant comparisons; the opposite edge is
 * assigned, the overshoot is lost: Q-RM-01). Returns a new point.
 */
export function applyTorus(p) {
  const o = [p[0], p[1]];
  if (mLess(p[0], xMin)) o[0] = xMax;
  if (mGreater(p[0], xMax)) o[0] = xMin;
  if (mLess(p[1], yMin)) o[1] = yMax;
  if (mGreater(p[1], yMax)) o[1] = yMin;
  return o;
}

/** Locator → angles: Theta1 = (((x - xMin)/(xMax - xMin)) 2) Pi, Theta2 the same with y (division as a·(1/b)). */
export function locatorToAngles([x, y]) {
  return [(((x - xMin) * (1 / (xMax - xMin))) * 2) * Math.PI, (((y - yMin) * (1 / (yMax - yMin))) * 2) * Math.PI];
}

/** Named colours that can stand in an ArrayPlot array (the BFS original sets path cells Green and the current one Blue). */
export const ARRAY_COLORS = { Green: [0, 1, 0], Blue: [0, 0, 1], Red: [1, 0, 0], Black: [0, 0, 0], White: [1, 1, 1] };
/** ArrayPlot's colour for an entry with no colour (Infinity): a dark red, measured (127, 0, 0) in the BFS snapshots. */
export const NO_COLOR_BYTES = [127, 0, 0];

/**
 * ArrayPlot's default colouring as RGBA bytes (row 1 first, as ArrayPlot draws row 1 at the top): a number v →
 * GrayLevel[1 − Abs[v]/max] with max = the largest Abs of the finite numbers in the array (0 → white; an all-zero array
 * is white), a colour entry (a name of ARRAY_COLORS or an RGB triple) → that colour, anything else (Infinity) → dark
 * red (127, 0, 0). Grey byte = round(255 (1 − Abs[v]/max)) (D-BF-01; Mathematica's exact Raster bytes: K-BF-02).
 * Returns { width, height, data: Uint8ClampedArray }.
 */
export function arrayPlotColors(array) {
  const h = array.length, w = h ? array[0].length : 0;
  let max = 0;
  for (const row of array) for (const v of row) if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) > max) max = Math.abs(v);
  const data = new Uint8ClampedArray(w * h * 4);
  let o = 0;
  for (const row of array) {
    for (const v of row) {
      let rgb;
      if (typeof v === 'number' && Number.isFinite(v)) {
        const g = Math.round(255 * (max === 0 ? 1 : 1 - Math.abs(v) / max));
        rgb = [g, g, g];
      } else if (typeof v === 'string' && ARRAY_COLORS[v]) rgb = ARRAY_COLORS[v].map((c) => Math.round(255 * c));
      else if (Array.isArray(v) && v.length === 3) rgb = v.map((c) => Math.round(255 * c));
      else rgb = NO_COLOR_BYTES;
      data[o] = rgb[0]; data[o + 1] = rgb[1]; data[o + 2] = rgb[2]; data[o + 3] = 255;
      o += 4;
    }
  }
  return { width: w, height: h, data };
}
