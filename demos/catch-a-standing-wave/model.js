// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by D. Meliga, S. Z. Lavagnino and A. Ratti
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/catch-a-standing-wave/model.js — one evaluation of the Manipulate body of "How to Catch a Standing Wave": the
// state in, { state, view, graphics } out (pure, no DOM). The body is
//   LocatorPane[Dynamic[pt], Dynamic[Column[{Plot[{Sin[a f x - t], Sin[a f x + t]}, {x, 0, 20}, …],
//     ListLinePlot[sin6[a f, N[First[pt]], t], …]}]], Appearance -> None]
// with the Initialization sin6[f_, n_, t_] := Table[{x, Sin[f x + t]} + {0, Sin[f x - t]}, {x, 0, n, .001}].
import { Graphics, Annotation, Thick, Line, Point, PointSize, Red, Green } from '../../shared/graphics.js';
import { Plot, ListLinePlot } from '../../shared/plot.js';
import { Table } from '../../shared/wl.js';

/** PlotRange -> {{-1, 20}, {-2.1, 2.1}} of both plots (also the range of the cavity locator, K-CA-01). */
export const PLOT_RANGE = Object.freeze([[-1, 20], [-2.1, 2.1]]);
/** {{f, .18, "frequency"}, 1.4, .18, .01, ControlType -> VerticalSlider}: min 1.4 (bottom), max 0.18 (top). */
export const F_SLIDER = Object.freeze({ min: 1.4, max: 0.18, step: 0.01 });
/** The value of pt that the Manipulate starts with: the expression {π/f, 0} (unevaluated: it follows f, F-CA-05). */
export const PI_OVER_F = 'Pi/f';

/** The slider's values 1.4 − k·0.01, k = 0 … 122 (Mathematica's grid min + k·step; the top end is max = 0.18). */
export const fAt = (k) => (k >= 122 ? F_SLIDER.max : k <= 0 ? F_SLIDER.min : F_SLIDER.min - k * F_SLIDER.step);
/** The grid index of a frequency (nearest grid value). */
export const fIndex = (f) => Math.min(122, Math.max(0, Math.round((F_SLIDER.min - f) / F_SLIDER.step)));

/** The opening state (the notebook's live state = the initial settings): pt holds the expression {π/f, 0}. */
export const initialState = () => ({ f: 0.18, t: 1, a: 1, pt: [Math.PI / 0.18, 0], ptExpr: PI_OVER_F });

/** pt's value: the expression {π/f, 0} evaluated at the current f while pt holds it, otherwise the point itself. */
export const ptValue = (s) => (s.ptExpr === PI_OVER_F ? [Math.PI / s.f, 0] : s.pt);

/**
 * Is this pt the expression {π/f, 0}? Accepts the saved-state form of the notebook ({π/f, 0} as
 * Times[Power[f, -1], Pi], with Pi as {wl: "Pi"} or already as its number), {wl: "Pi/f"} or the text "Pi/f".
 */
export function isPiOverF(pt) {
  if (!Array.isArray(pt) || pt.length !== 2) return false;
  const x = pt[0];
  if (x === PI_OVER_F || (x && x.wl === PI_OVER_F)) return true;
  if (!x || x.head !== 'Times' || !Array.isArray(x.args) || x.args.length !== 2) return false;
  const isPi = (v) => v === Math.PI || (v && v.wl === 'Pi');
  const isInvF = (v) => v && v.head === 'Power' && v.args?.[0]?.sym === 'f' && v.args?.[1] === -1;
  return x.args.some(isPi) && x.args.some(isInvF);
}

/** The "first harmonic" setter's value Dynamic[{{π/f, 0} -> "first harmonic"}]: {π/f, 0} at the current f (F-CA-07). */
export const firstHarmonic = (f) => [Math.PI / f, 0];

/** sin6[f_, n_, t_] := Table[{x, Sin[f x + t]} + {0, Sin[f x - t]}, {x, 0, n, .001}] (the Initialization). */
export function sin6(f, n, t) {
  const m = n >= 0 ? Math.floor(n / 0.001 + 1e-9) : -1; // {x, 0, n, .001}: 0, .001, …, ≤ n (none for n < 0)
  const out = new Array(m + 1);
  for (let i = 0; i <= m; i++) {
    const x = i * 0.001;
    out[i] = [x, Math.sin(f * x + t) + Math.sin(f * x - t)];
  }
  return out;
}

/**
 * The node points Table[{i (π/(a f)), 0}, {i, 1, N[(First[pt] a) (f/π)]}]. The iterator runs i = 1, 2, … up to the
 * bound with the tolerance of shared/wl.js Range (1e-12): at an exact resonance the bound can come out a few units in the
 * last place below the whole number (0.9999999999999998), and the node at the cavity end is still drawn, as
 * Mathematica's iterator does near whole counts (K-CA-04).
 */
export const nodeBound = (pt1, a, f) => pt1 * a * (f / Math.PI);
export const nodes = (pt1, a, f) => {
  const bound = nodeBound(pt1, a, f);
  return bound >= 1 - 1e-12 ? Table((i) => [i * (Math.PI / (a * f)), 0], [1, bound]) : [];
};

// AxesLabel and ImageSize of both plots. Mathematica's automatic ticks at this size are 5, 10, 15, 20 and 1, 2, −1, −2
// with minor ticks between (the snapshots): the y step 1 is given here, as the port's automatic ticks would pick 0.5.
// ImagePadding stands in for Mathematica's automatic padding, which leaves room for the label "length" (D-CA-03).
const LABELS = { AxesLabel: ['length', 'amplitude'], ImageSize: [300, 200], Ticks: ['Automatic', 1], ImagePadding: [[24, 44], [12, 20]] };

/** One evaluation of the body: the two plots of the Column, and pt's value written back (it follows f, F-CA-05). */
export function evaluate(state) {
  const { f, t, a } = state;
  const pt = ptValue(state);
  const pt1 = pt[0];
  const k = a * f;
  // Plot[{Sin[a f x - t], Sin[a f x + t]}, {x, 0, 20}, …, Epilog -> {Thick, Line[{{First[pt], -1}, {First[pt], 1}}]}]
  const waves = Plot([(x) => Math.sin(k * x - t), (x) => Math.sin(k * x + t)], [0, 20], {
    PlotRange: PLOT_RANGE, ...LABELS, PlotLabel: 'forward and backward waves',
    Epilog: [Thick, Annotation(Line([[pt1, -1], [pt1, 1]]), 'cavity-line-top')],
    label: 'Forward and backward waves with the cavity end', testid: 'waves-plot',
  });
  // ListLinePlot[sin6[a f, N[First[pt]], t], …, Epilog -> {Thick, Line[…], {PointSize[Large], Point[nodes], {Red,
  // Point[{0, 0}]}, {Red, Point[{π/f, 0}]}}}, PlotStyle -> Green]
  const data = sin6(k, pt1, t);
  const nodePts = nodes(pt1, a, f);
  const standing = ListLinePlot(data, {
    PlotRange: PLOT_RANGE, ...LABELS, PlotLabel: 'standing wave', PlotStyle: Green,
    Epilog: [Thick, Annotation(Line([[pt1, -2], [pt1, 2]]), 'cavity-line'),
      [PointSize('Large'), Annotation(Point(nodePts), 'nodes'), [Red, Annotation(Point([0, 0]), 'end-0')], [Red, Annotation(Point([Math.PI / f, 0]), 'end-1')]]],
    label: 'Standing wave between the fixed end and the cavity end', testid: 'standing-plot',
  });
  const fh = firstHarmonic(f);
  return {
    state: { ...state, pt },
    view: {
      pt, cavity: pt1, k, wavelength: (2 * Math.PI) / k, firstHarmonicEnd: Math.PI / f,
      nodes: nodePts.map((p) => p[0]), nodeBound: nodeBound(pt1, a, f), samples: data.length,
      // the SetterBar shows "first harmonic" pressed while pt is its value {π/f, 0} at the current f (F-CA-07)
      firstHarmonicPressed: pt[0] === fh[0] && pt[1] === fh[1],
      standingAtEnd: data.length ? data[data.length - 1][1] : null,
    },
    graphics: [waves, standing].map((g) => Graphics(g.list, g.options)),
  };
}
