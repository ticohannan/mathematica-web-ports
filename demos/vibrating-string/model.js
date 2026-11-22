// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alain Goriely and Mark Robertson-Tessi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/vibrating-string/model.js — one evaluation of the Manipulate body of "The Vibrating String": the state in,
// { state, view, graphics } out (pure, no DOM). The original's Initialization functions (MyPiecewise,
// PeriodicExtension, OddExtension, F, FB) keep their names; the body's steps follow the original's order: the three
// replacement rules on the points, ptsrt, ptsrt2, Bn, the Plot; the three mode plots of the control column's Dynamic.
import { Plot } from '../../shared/plot.js';
import { Interpolation, NIntegrate } from '../../shared/numeric.js';
import { Equal, Sin, Cos, Pi } from '../../shared/wl.js';
import { isCorrected } from '../../shared/errata.js';

export const XMIN = 0.001, XMAX = 1 - 0.001; // the locators' range {0.001, −2} … {1 − .001, 2}

/** The Manipulate's initial values (the notebook's live state is the same). */
export const initialState = () => ({
  idpolynom: 1, c: 0.5, a: 0, points: [[0.5, 1]], id: true, string: true, ltw: false, rtw: false, t: 0, modedisp: false,
});

// Pattern matching compares machine reals as SameQ does (equal up to the last bits): Equal of shared/wl.js.
const same = (u, v) => Equal(u, v);

/**
 * The body's first three lines, applied with //. (repeatedly until nothing changes):
 *   {left___, {x1_, y1_}, middle___, {x1_, y2_}, right___} :> {left, middle, {x1, y2}, right}   (one point per x: the
 *   later one stays, at its own place), then every point with x = 0.001 or x = 1 − 0.001 (the ends of the locators'
 *   range) is removed.
 */
export function cleanPoints(points) {
  let p = points.map((q) => [...q]);
  for (let changed = true; changed;) {
    changed = false;
    outer: for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        if (same(p[i][0], p[j][0])) { p = p.filter((_, k) => k !== i); changed = true; break outer; }
      }
    }
  }
  p = p.filter(([x]) => !same(x, 0.001));
  p = p.filter(([x]) => !same(x, 1 - 0.001));
  return p;
}

/** ptsrt = Union[{{10^-8, 0}}, points, {{1, 0}}]: sorted by x (then y), duplicates removed. */
export function ptsrtOf(points) {
  const all = [[1e-8, 0], ...points, [1, 0]].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  return all.filter((p, i) => i === 0 || !(same(p[0], all[i - 1][0]) && same(p[1], all[i - 1][1])));
}

/**
 * ptsrt2: Hermite data {{x}, y, dy} — at 0 the slope of the chord to the first point, inside the central differences
 * (y_{i+1} − y_{i−1})/(x_{i+1} − x_{i−1}), at 1 the slope of the chord from the last point.
 */
export function ptsrt2Of(P) {
  const n = P.length;
  const out = [[[0], 0, P[1][1] / P[1][0]]];
  for (let i = 1; i <= n - 2; i++) out.push([[P[i][0]], P[i][1], (P[i + 1][1] - P[i - 1][1]) / (P[i + 1][0] - P[i - 1][0])]);
  out.push([[1], 0, -P[n - 2][1] / (1 - P[n - 2][0])]);
  return out;
}

/**
 * MyPiecewise[P, x] = Piecewise[{{line through P_i and P_{i+1}, P_i,x < x < P_{i+1},x}, …}]: open intervals, so the value
 * at a data point is Piecewise's default 0 (E-VS-03); corrected: closed intervals (the data value).
 */
export function MyPiecewise(P, x, corrected = false) {
  for (let i = 0; i + 1 < P.length; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[i + 1];
    if (corrected ? x0 <= x && x <= x1 : x0 < x && x < x1) return ((y1 - y0) / (x1 - x0)) * (x - x0) + y0;
  }
  return 0;
}

/**
 * PeriodicExtension[g, x] := If[Abs[x] < 1, g[x], PeriodicExtension[g, x − 2 Sign[x]]]. At x = ±1 (every odd integer)
 * the original never ends (1 → −1 → 1 …; Mathematica stops the chain with a message and the value is not a number):
 * NaN here (E-VS-04); corrected: Abs[x] <= 1. Many periods are taken off at once (same result up to rounding).
 */
export function PeriodicExtension(g, x, corrected = false) {
  if (!Number.isFinite(x)) return NaN;
  const ax = Math.abs(x);
  if (ax > 3) x -= 2 * Math.sign(x) * Math.floor((ax - 1) / 2);
  for (let k = 0; k < 4; k++) {
    if (Math.abs(x) < 1 || (corrected && Math.abs(x) <= 1)) return g(x);
    x -= 2 * Math.sign(x);
  }
  return NaN;
}

/** OddExtension[g, x] := If[x >= 0, g[x], −g[−x]] */
export const OddExtension = (g, x) => (x >= 0 ? g(x) : -g(-x));

/** The interpolating function of the initial data: MyPiecewise (idpolynom 2) or Interpolation[ptsrt2] (Hermite). */
export function initialData(pts, pts2, idpolynom, corrected = false) {
  if (idpolynom === 2) return (s) => MyPiecewise(pts, s, corrected);
  const ip = Interpolation(pts2);
  return (s) => ip(s);
}

/** F[pts, pts2, x, idpolynom]: the periodic (period 2) odd extension of the initial data. Returns x ↦ F. */
export function F(pts, pts2, idpolynom, corrected = false) {
  const g = initialData(pts, pts2, idpolynom, corrected);
  return (x) => PeriodicExtension((ss) => OddExtension(g, ss), x, corrected);
}
/** FB[pts, pts2, x, idpolynom]: the initial data itself (for the Fourier coefficients). Returns x ↦ FB. */
export const FB = (pts, pts2, idpolynom, corrected = false) => initialData(pts, pts2, idpolynom, corrected);

/** Bn = Table[NIntegrate[2 FB[…] Sin[m Pi x], {x, 0, 1}, AccuracyGoal -> 6], {m, 3}] */
export function BnOf(fb, pts) {
  const breakpoints = pts.map((p) => p[0]); // the kinks of the piecewise-linear data (Mathematica's NIntegrate finds them itself)
  return [1, 2, 3].map((m) => NIntegrate((x) => 2 * fb(x) * Sin(m * Pi * x), [0, 1], { AccuracyGoal: 6, PrecisionGoal: 8, breakpoints }));
}

const LABELS = ['First mode', 'Second mode', 'Third mode'];
/** The Dynamic in the control column: Plot[Bn[[m]] Sin[m Pi x] Cos[m Pi c t], {x, 0, 1}, Frame -> True, Axes -> False, …] */
export function modePlot(m, Bn, c, t) {
  return Plot((x) => Bn[m - 1] * Sin(m * Pi * x) * Cos(t * Pi * c * m), [0, 1], {
    Frame: true, Axes: false, ImageSize: 160, PlotRange: [[0, 1], [-2, 2]], PlotLabel: LABELS[m - 1], testid: `mode-svg-${m}`,
    FrameTicks: [{ major: 0.2, minor: 0.05 }, { major: 1, minor: 0.2 }], // as the main plot's (no snapshot shows the modes: K-VS-02)
    label: `${LABELS[m - 1]} (Fourier mode ${m} of the string)`,
  });
}

/** The string's four curves at x: initial string, evolving string, left wave, right wave (NaN = not shown: If[False, …] is Null). */
export function curvesAt(s, f) {
  const ct = s.c * s.t;
  return (x) => [
    s.id ? f(x) : NaN,
    s.string ? f(x - ct) / 2 + f(x + ct) / 2 : NaN,
    s.ltw ? f(x + ct) / 2 : NaN,
    s.rtw ? f(x - ct) / 2 : NaN,
  ];
}

const X_TICKS = { 0: { major: 0.2, minor: 0.05 }, 1: { major: 0.5, minor: 0.1 }, 2: { major: 1, minor: 0.2 } };
const SAMPLE_X = Array.from({ length: 11 }, (_, i) => i / 10);

/** One evaluation: the body (points cleaned, ptsrt, ptsrt2, Bn, the Plot) and the three mode plots. */
export function evaluate(state) {
  const corrected = isCorrected(state);
  const num = (v) => (v && typeof v === 'object' && 'n' in v ? v.n : v); // an exact number of the saved states ({wl, n})
  const points = cleanPoints(state.points.map((p) => p.map(num)));
  const ptsrt = ptsrtOf(points);
  const ptsrt2 = ptsrt2Of(ptsrt);
  const idp = state.idpolynom;
  const Bn = BnOf(FB(ptsrt, ptsrt2, idp, corrected), ptsrt);
  const f = F(ptsrt, ptsrt2, idp, corrected);
  const curves = curvesAt(state, f);
  const a = state.a;
  const plot = Plot(curves, [-a, 1 + a], {
    PlotRange: [[-a, 1 + a], [-2, 2]], ImageSize: [400, 300], testid: 'scene-svg', label: 'The Vibrating String: the string u(x, t)',
    // Mathematica's automatic ticks and image padding of this plot, as the snapshots show them (D-VS-02)
    Ticks: [X_TICKS[a] ?? 'Automatic', { major: 1, minor: 0.2 }], ImagePadding: [[16, 11], [8, 8]],
  });
  const view = {
    points, ptsrt, ptsrt2, Bn,
    // values for the tests: the four curves at x = 0, 0.1, …, 1 and F at the data points and at x = 1
    samples: SAMPLE_X.map((x) => [x, ...curves(x)]),
    atData: points.map(([x]) => f(x)),
    F1: f(1),
  };
  const modes = [1, 2, 3].map((m) => modePlot(m, Bn, state.c, state.t));
  return { state: { ...state, points }, view, graphics: [plot, ...modes] };
}
