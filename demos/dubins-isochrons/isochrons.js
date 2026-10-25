// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dubins-isochrons/isochrons.js — pure port of "Isochrons for a Dubins Car" (Initialization code + one
// evaluation of the Manipulate body). No DOM. Names and order of operations follow the original
// (docs/original-source/dubins-isochrons.txt): mRS, mLS, mRL, mLR; the Piecewise of the car state and path graphics;
// the plot cache; Table and ParametricPlot (fixed sampling, D-DI-01/D-DI-02). Greek names spelled out (τ → tau as the
// slider variable, the formulas' first argument s; α → Alpha, β → Beta, θ → Theta).
//
// Path pieces as shared/graphics.js data: Circle[c, r, {a1, a2}] and Line[{from, to}] (v0.1.21; before, { kind, … }
// records); epiGraphics(r, view), the Manipulate's own Graphics, as data.
// Numerics (DESIGN §6): a/b of machine numbers as a·(1/b), p/100 t as (p/100)·t, the products ∓t(τ−1)X from left to
// right, (t·(s−1))·X, as Mathematica 15.0.1 evaluates them (harness run 2, K-DI-04, N-DI-07), tolerant comparisons of
// reals (shared/mma.js).
import { mLess, mLessEq, mUnequal } from '../../shared/mma.js';
import { Annotation, Circle, Line, AbsoluteDashing, CapForm, Thick, Gray, Blue, Orange, Red, Green } from '../../shared/graphics.js';
import { pxSize } from '../../shared/graphics-extras.js';
import { drawCar } from '../common/car-icon.js';

const PI = Math.PI;

// ---- Initialization: the four isochron formulas -------------------------------------------------

/** mRS[τ, t, r]: turn right for τ·t, then straight. */
export function mRS(s, t, r) {
  const Alpha = (s * t) * (1 / r);
  return [r * (1 - Math.cos(Alpha)) - (t * (s - 1)) * Math.sin(Alpha), r * Math.sin(Alpha) - (t * (s - 1)) * Math.cos(Alpha)];
}
/** mLS[τ, t, r]: turn left for τ·t, then straight. */
export function mLS(s, t, r) {
  const Alpha = (s * t) * (1 / r);
  return [-(r * (1 - Math.cos(Alpha))) + (t * (s - 1)) * Math.sin(Alpha), r * Math.sin(Alpha) - (t * (s - 1)) * Math.cos(Alpha)];
}
/** mRL[τ, t, r]: turn right for τ·t, then left. */
export function mRL(s, t, r) {
  const Alpha = (s * t) * (1 / r), Beta = ((1 - s) * t) * (1 / r);
  return [r * ((1 - 2 * Math.cos(Alpha)) + Math.cos(Alpha - Beta)), r * (2 * Math.sin(Alpha) - Math.sin(Alpha - Beta))];
}
/** mLR[τ, t, r]: turn left for τ·t, then right. */
export function mLR(s, t, r) {
  const Alpha = (s * t) * (1 / r), Beta = ((1 - s) * t) * (1 / r);
  return [r * ((-1 + 2 * Math.cos(Alpha)) - Math.cos(Alpha - Beta)), r * (2 * Math.sin(Alpha) - Math.sin(Alpha - Beta))];
}
export const FORMULAS = { RS: mRS, LS: mLS, LR: mLR, RL: mRL };
/** ParametricPlot's list order {mRS, mLS, mLR, mRL} = ColorData[97] colours 1–4 (N-DI-03). */
export const PLOT_ORDER = ['RS', 'LS', 'LR', 'RL'];
export const PLOT_COLOURS = {
  RS: [0.368417, 0.506779, 0.709798], LS: [0.880722, 0.611041, 0.142051],
  LR: [0.560181, 0.691569, 0.194885], RL: [0.922526, 0.385626, 0.209179],
};

// ---- the car state and path graphics (the Piecewise) ------------------------------------------

/**
 * {cxy, cTheta, cAlpha, pathGraphics} of the Piecewise for path "RS" | "LS" | "RL" | otherwise LR, with the Module's
 * fs = Max[0, If[p/100 t <= τ, 1, τ/(p/100 t)]] and maxα = Min[t, τ]/r.
 */
export function carState(path, r, t, tau, p) {
  const pt = (p / 100) * t;
  const fs = Math.max(0, mLessEq(pt, tau) ? 1 : tau * (1 / pt)); // Q-DI-08: Max[0, …] is redundant
  const maxAlpha = Math.min(t, tau) * (1 / r);
  const turned = Math.min(pt, tau) * (1 / r), after = Math.max(pt - tau, 0) * (1 / r);
  const before = mLess(pt, tau); // ORIGINAL QUIRK (Q-DI-04): strict < here, <= in fs
  const ca = Math.cos(maxAlpha), sa = Math.sin(maxAlpha);
  const straight = Math.max(0, t - tau), second = Math.max(t - tau, 0) * (1 / r);
  let cxy, cTheta, cAlpha, pathGraphics;
  if (path === 'RS') {
    cxy = mRS(fs, pt, r);
    cTheta = PI / 2 - turned;
    cAlpha = before ? -r : 0;
    const p0 = [r * (1 - ca), r * sa];
    pathGraphics = { colour: 'Blue', path, pieces: [
      Circle([r, 0], r, [PI + 0, PI + -maxAlpha]), Line([p0, [p0[0] + straight * sa, p0[1] + straight * ca]])] };
  } else if (path === 'LS') {
    cxy = mLS(fs, pt, r);
    cTheta = PI / 2 + turned;
    cAlpha = before ? r : 0;
    const p0 = [r * (-1 + ca), r * sa];
    pathGraphics = { colour: 'Orange', path, pieces: [
      Circle([-r, 0], r, [0, maxAlpha]), Line([p0, [p0[0] + straight * -sa, p0[1] + straight * ca]])] };
  } else if (path === 'RL') {
    cxy = mRL(fs, pt, r);
    cTheta = PI / 2 - turned + after;
    cAlpha = before ? -r : r;
    pathGraphics = { colour: 'Red', path, pieces: [
      Circle([r, 0], r, [PI + 0, PI + -maxAlpha]), Circle([r * (1 - 2 * ca), r * (2 * sa)], r, [-maxAlpha + 0, -maxAlpha + second])] };
  } else { // True: LR
    cxy = mLR(fs, pt, r);
    cTheta = PI / 2 + turned - after;
    cAlpha = before ? r : -r;
    // ORIGINAL QUIRK (Q-DI-05): the first arc twice
    pathGraphics = { colour: 'Green', path: 'LR', pieces: [
      Circle([-r, 0], r, [0, maxAlpha]), Circle([-r, 0], r, [0, maxAlpha]),
      Circle([r * (-1 + 2 * ca), r * (2 * sa)], r, [PI + maxAlpha - 0, PI + maxAlpha - second])] };
  }
  return { fs, maxAlpha, cxy, cTheta, cAlpha, pathGraphics };
}

// ---- Table, the grey band, the sampled curves and regions --------------------------------------

/** polySteps = If[t < 10, 0.05, 0.02] If[r < 1, r^2, 1]. */
export const polySteps = (t, r) => (mLess(t, 10) ? 0.05 : 0.02) * (mLess(r, 1) ? r * r : 1);

/** Mathematica's iterator {s, min, max, step}: Floor[(max - min)/step] + 1 values min + k·step (K-DI-01). */
export function tableValues(min, max, step) {
  const n = Math.floor((max - min) / step) + 1;
  return Array.from({ length: Math.max(0, n) }, (_, k) => min + k * step);
}

/**
 * The Prolog's two polygons: P1 = Table[mLS, {s, 1, 0, -polySteps}] ⧺ Table[mRS, {s, 0, 1, polySteps}] ⧺
 * Table[mRL, {s, 0, 1, polySteps}], P2 = … ⧺ Table[mLR, {s, 1, 0, -polySteps}] (Q-DI-02, Q-DI-03).
 */
export function greyPolygons(t, r) {
  const st = polySteps(t, r);
  const down = tableValues(1, 0, -st), up = tableValues(0, 1, st);
  const ls = down.map((s) => mLS(s, t, r)), rs = up.map((s) => mRS(s, t, r));
  return [[...ls, ...rs, ...up.map((s) => mRL(s, t, r))], [...ls, ...rs, ...down.map((s) => mLR(s, t, r))]];
}

/** Number of curve steps: at most 1° of heading change per step, at least 400 (D-DI-01). */
export const curveSteps = (t, r) => Math.max(400, Math.ceil((t / r) * (180 / PI)));

/** The four "=" curves sampled at s = k/N, k = 0 … N (the end points exactly 0 and 1). */
export function isochronCurves(t, r) {
  const N = curveSteps(t, r);
  const ss = Array.from({ length: N + 1 }, (_, k) => (k === N ? 1 : k / N));
  return Object.fromEntries(PLOT_ORDER.map((w) => [w, ss.map((s) => FORMULAS[w](s, t, r))]));
}

/** Grid of the "≤" regions: Ns × Nt cells over [0, 1] × [0, t] (D-DI-02). */
export function regionGrid(t, r) {
  const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
  return { Ns: clamp(Math.ceil((8 * t) / r), 40, 200), Nt: clamp(Math.ceil(4 * t), 20, 56) };
}
const area2 = (q) => {
  let a = 0;
  for (let i = 0; i < q.length; i++) { const [x1, y1] = q[i], [x2, y2] = q[(i + 1) % q.length]; a += x1 * y2 - x2 * y1; }
  return a / 2;
};
/**
 * The four "≤" regions: per path type the images of the grid cells as counter-clockwise quads (drawn together as one
 * non-zero-filled path, so a folded region is one translucent union), and the boundary = the images of the
 * rectangle's edges s = 0 (t1: 0 → t), t1 = t (s: 0 → 1), s = 1 (t1: t → 0); t1 = 0 maps to the origin.
 */
export function reachRegions(t, r) {
  const { Ns, Nt } = regionGrid(t, r);
  const N = curveSteps(t, r);
  const out = {};
  for (const w of PLOT_ORDER) {
    const f = FORMULAS[w];
    const P = [];
    for (let j = 0; j <= Nt; j++) {
      const t1 = j === Nt ? t : (j / Nt) * t;
      const row = [];
      for (let i = 0; i <= Ns; i++) row.push(f(i === Ns ? 1 : i / Ns, t1, r));
      P.push(row);
    }
    const quads = [];
    for (let j = 0; j < Nt; j++) {
      for (let i = 0; i < Ns; i++) {
        const q = [P[j][i], P[j][i + 1], P[j + 1][i + 1], P[j + 1][i]];
        quads.push(area2(q) < 0 ? q.reverse() : q);
      }
    }
    const lin = (n) => Array.from({ length: n + 1 }, (_, k) => (k === n ? 1 : k / n));
    const Nb = Math.max(Nt * 8, 200);
    const boundary = [
      ...lin(Nb).map((u) => f(0, u * t, r)),
      ...lin(N).slice(1).map((s) => f(s, t, r)),
      ...lin(Nb).slice(1).map((u) => f(1, (1 - u) * t, r)),
    ];
    out[w] = { quads, boundary };
  }
  return out;
}

/** The cached plot of the "If": the "=" isochrons with the grey band, or the "≤" regions. */
export function computePlot(set, t, r) {
  if (set === '=') return { set, t, r, curves: isochronCurves(t, r), polygons: greyPolygons(t, r) };
  return { set, t, r, regions: reachRegions(t, r) };
}

// ---- the Manipulate's state and body ---------------------------------------------------------
export const SHOW_RANGE = [[-15, 15], [-16, 16]]; // Show[…, PlotRange -> {{-15, 15}, {-16, 16}}]
export const SETS = ['=', '≤'];
export const PATHS = ['RS', 'LS', 'LR', 'RL'];

/**
 * The live state = the initial settings (stored "Variables", F-DI-14): r 2, rold 2, t 10, told 10, set "=",
 * setold "=", path "RS", tau 0.5, p 100, and plotReach = the plot for (2, 10, "=") computed here (D-DI-10).
 */
export function initialState() {
  return { r: 2, rold: 2, t: 10, told: 10, set: '=', setold: '=', path: 'RS', tau: 0.5, p: 100, plotReach: computePlot('=', 10, 2) };
}
/** The Input cell's values of the hidden variables ({rold, 1, None}, …): they force a first computation (N-DI-08). */
export const inputCellState = () => ({ ...initialState(), rold: 1, told: 1, plotReach: 1, setold: 1 });

/**
 * If[t != told ∨ plotReach == 1 ∨ setold != set ∨ rold != r, …] (tolerant != on reals; Q-DI-07: plotReach == 1 is
 * only ever True for the Input cell's 1).
 */
export const needsPlot = (st) => mUnequal(st.t, st.told) || st.plotReach === 1 || st.setold !== st.set || mUnequal(st.rold, st.r);

// ---- epiGraphics as data (shared/graphics.js) ------------------------------------------------------
const PATH_COLOUR = { Blue, Orange, Red, Green };
const DASHED = AbsoluteDashing([4, 4]); // Dashed: about 4 px dashes and gaps at ImageSize 440 (D-DI-04)
// drawCar[xy, θ, α, opac, .5, lights] (F-DI-19); Arrowheads[.02] of the 440 px wide picture, padding 0.05 included
const ARROW = 0.02 * pxSize(SHOW_RANGE, 440, 0.05) * 440;
const carIcon = (xy, theta, alpha, opac, lights, id) => drawCar(xy, theta, alpha, opac, { lights, beam: 8, headlightEdge: null, id, arrowSize: ARROW });

/**
 * epiGraphics = {{Dashed, Gray, Circle[{r, 0}, r], Circle[{-r, 0}, r]}, {Thick, pathGraphics},
 *   Red, drawCar[{0, 0}, π/2, 0, .5, .5, False], Green, drawCar[cxy, cθ, cα, .8, .5, True]} (F-DI-18)
 */
export const epiGraphics = (r, v) => [
  [DASHED, Gray, CapForm('Butt'), Annotation(Circle([r, 0], r), 'turning-circle-right'), Annotation(Circle([-r, 0], r), 'turning-circle-left')],
  [Thick, PATH_COLOUR[v.pathGraphics.colour], Annotation(v.pathGraphics.pieces, 'path-graphics', { 'data-path': v.pathGraphics.path })],
  [Red, carIcon([0, 0], Math.PI / 2, 0, 0.5, false, 'start-car')],
  [Green, carIcon(v.cxy, v.cTheta, v.cAlpha, 0.8, true, 'moving-car')],
];

/** One evaluation of the Manipulate body. Returns { state, view } (view.recomputed: whether the plot was recomputed). */
export function evaluate(stateIn) {
  const st = { ...stateIn };
  const car = carState(st.path, st.r, st.t, st.tau, st.p);
  let recomputed = false;
  if (needsPlot(st)) {
    // ControlActive[None, told = t; rold = r] — not modelled: told and rold are set on every evaluation (D-DI-08)
    st.told = st.t; st.rold = st.r;
    st.setold = st.set;
    st.plotReach = computePlot(st.set, st.t, st.r);
    recomputed = true;
  }
  const view = { ...car, polySteps: polySteps(st.t, st.r), recomputed };
  return { state: st, view };
}
