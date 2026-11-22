// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alain Goriely
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/rectangular-membrane/model.js — one evaluation of the Manipulate body of "Vibrations of a Rectangular
// Membrane": the state in, { view, graphics } out (pure, no DOM). Simple mode: plain arithmetic, the body's Plot3D with
// its options (shared/graphics3d.js Plot3D).
// Variable names (N-RA-01): the original's B[1,1], B[2,1], B[1,2], B[2,2] (indexed variables of the Manipulate) are
// B11, B21, B12, B22 here (Bmn = B[m,n]: m half-waves along the length a, n along the width b).
import { Plot3D, Hue, niceTicks } from '../../shared/graphics3d.js';
import { Pi, Sin, Cos, Sqrt, Abs } from '../../shared/wl.js';

/** The Manipulate's initial values (the notebook's live state stores a, b, c, t, zrange with these values). */
export const initialState = () => ({ a: 4, b: 4, B11: 0.5, B21: 0, B12: 0, B22: 0, t: 0, c: 1, zrange: 0 });

/** The snapshots' Settings name the four amplitudes $9 … $12, in the order of their controls. */
export const SNAPSHOT_NAMES = { $9: 'B11', $10: 'B21', $11: 'B12', $12: 'B22' };

/** ImageSize -> {390, 350} */
export const IMAGE_SIZE = [390, 350];

/**
 * The body's function of x and y: B[1,1] Cos[Sqrt[1/a^2 + 1/b^2] c π t] Sin[π x/a] Sin[π y/b] + B[2,1] Cos[Sqrt[4/a^2 +
 * 1/b^2] c π t] Sin[2 π x/a] Sin[π y/b] + B[1,2] Cos[Sqrt[1/a^2 + 4/b^2] c π t] Sin[π x/a] Sin[2 π y/b] + B[2,2]
 * Cos[Sqrt[4/a^2 + 4/b^2] c π t] Sin[2 π x/a] Sin[2 π y/b] (the time factors do not depend on x, y: computed once).
 */
export function membrane({ a, b, B11, B21, B12, B22, t, c }) {
  const c11 = Cos(Sqrt(1 / a ** 2 + 1 / b ** 2) * c * Pi * t), c21 = Cos(Sqrt(4 / a ** 2 + 1 / b ** 2) * c * Pi * t);
  const c12 = Cos(Sqrt(1 / a ** 2 + 4 / b ** 2) * c * Pi * t), c22 = Cos(Sqrt(4 / a ** 2 + 4 / b ** 2) * c * Pi * t);
  return (x, y) => B11 * c11 * Sin((Pi * x) / a) * Sin((Pi * y) / b) + B21 * c21 * Sin((2 * Pi * x) / a) * Sin((Pi * y) / b)
    + B12 * c12 * Sin((Pi * x) / a) * Sin((2 * Pi * y) / b) + B22 * c22 * Sin((2 * Pi * x) / a) * Sin((2 * Pi * y) / b);
}

/** Abs[B[1,1]] + Abs[B[2,1]] + Abs[B[1,2]] + Abs[B[2,2]] — the colour scale and the box half-height. */
export const amplitudeSum = ({ B11, B21, B12, B22 }) => Abs(B11) + Abs(B21) + Abs(B12) + Abs(B22);

/** ColorFunction -> Function[{x, y, z}, Hue[z/(Abs[B[1,1]] + …)]] (with ColorFunctionScaling -> False). */
export const colorFunction = (S) => (x, y, z) => Hue(z / S);

/** The z part of the PlotRange as written: {-(Abs[B[1,1]] + …) + zrange, Abs[B[1,1]] + … - zrange}. */
export const zPlotRange = (s) => { const S = amplitudeSum(s); return [-S + s.zrange, S - s.zrange]; };

/**
 * Ticks for one axis of the box, as Mathematica's automatic ticks come out in the four snapshots (D-RA-04): the major
 * step is the smallest of {1, 2, 5}·10^n with (hi − lo)/step < 5; minor ticks at step/5 (step/4 when the mantissa is 2);
 * labels with the step's decimals ("0.0", "0.5"); lengths as View3D's automatic ticks (0.035, 0.018 of the box side).
 * A range of zero width gets its one value.
 */
export function boxTicks([lo, hi]) {
  if (!(hi > lo)) return niceTicks([lo, hi]);
  const L = hi - lo;
  let e = Math.floor(Math.log10(L)) - 2, step = null, mant = 1;
  for (; step === null; e++) for (const m of [1, 2, 5]) { const s = m * 10 ** e; if (L / s < 5) { step = s; mant = m; break; } }
  const minor = step / (mant === 2 ? 4 : 5);
  const val = (k, s) => (s < 1 ? k / Math.round(1 / s) : k * s);
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const isMajor = (v) => Math.abs(v / step - Math.round(v / step)) < 1e-9;
  const out = [];
  for (let k = Math.ceil(lo / minor - 1e-9); val(k, minor) <= hi + 1e-12; k++) {
    const v = val(k, minor) + 0;
    out.push(isMajor(v) ? [v, v.toFixed(decimals), 0.035] : [v, '', 0.018]);
  }
  return out;
}

/** Plot3D's sample grid (D-RA-01): 65 × 65 points, so the 15 mesh lines of each direction lie on grid lines. */
export const PLOT_POINTS = 65;

/** One evaluation of the body: Plot3D[…, {x, 0, a}, {y, 0, b}, ColorFunction …, PlotRange …, ClippingStyle -> None, …]. */
export function evaluate(state) {
  const { a, b } = state;
  const S = amplitudeSum(state);
  const u = membrane(state);
  const zRange = zPlotRange(state);
  const box = [[0, a], [0, b], zRange[0] <= zRange[1] ? zRange : [zRange[1], zRange[0]]]; // a reversed pair is used sorted (K-RA-02)
  const graphics = Plot3D(u, [0, a], [0, b], {
    ColorFunction: colorFunction(S),
    ColorFunctionScaling: false,
    PlotRange: [[0, a], [0, b], zRange],
    ClippingStyle: 'None',
    ImageSize: IMAGE_SIZE,
    BoxRatios: 'Automatic',
    PlotPoints: PLOT_POINTS,
    Ticks: box.map(boxTicks),
  });
  const surface = graphics.content[0];
  const colored = surface.colors.filter((x) => x).length;
  return {
    view: {
      S, zRange, box,
      center: u(a / 2, b / 2),
      vertices: surface.points.length, triangles: surface.triangles.length, meshLines: surface.meshLines.length,
      uncolored: surface.colors.length - colored,
    },
    graphics,
  };
}
