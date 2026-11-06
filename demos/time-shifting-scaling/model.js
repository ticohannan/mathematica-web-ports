// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mable Wan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/time-shifting-scaling/model.js — "Time Shifting and Time Scaling in Signal Processing": one evaluation of the
// Manipulate body, the state in, { state, view, graphics } out (pure, no DOM). Simple mode: shared/plot.js, plain
// arithmetic.
import { Graphics, Point, PointSize, Text, Style, Italic, Red, RGBColor, Thickness, Row, Annotation } from '../../shared/graphics.js';
import { ListLinePlot, Placed } from '../../shared/plot.js';

// ---- the initialization cell ------------------------------------------------------------------------------------
/** UHsignal[t, f]: the initials U H drawn as a signal (f = ±1 alternates the sampled values: the letters' strokes). */
export function UHsignal(t, f) {
  if (t < 0) return 0;
  if (t < 1) return (3 / 2) * f + 5 / 2;
  if (t < 2) return (1 / 4) * f + 5 / 4;
  if (t < 3) return (3 / 2) * f + 5 / 2;
  if (t < 4) return 0;
  if (t < 5) return (3 / 2) * f + 5 / 2;
  if (t < 6) return (1 / 4) * f + 5 / 2;
  if (t < 7) return (3 / 2) * f + 5 / 2;
  return 0;
}
// uhT = Append[Prepend[Range[0, 7, 1/9], -10000], 10000]; uhX = Table[UHsignal[uhT[[n]], (-1)^n], {n, 1, Length[uhT]}]
// (the second definitions; the first, hand-written lists are overwritten, N-TS-02)
const uhT = [-10000, ...Array.from({ length: 64 }, (_, k) => k / 9), 10000];
const uhX = uhT.map((t, i) => UHsignal(t, (-1) ** (i + 1)));
/** The five signals as break-point lists {T, X} (F-TS-01). */
export const SIGNALS = Object.freeze({
  RampDown: { T: [-10000, 0, 0, 5, 10000], X: [0, 0, 4, 0, 0] },
  TopHat: { T: [-10000, 0, 1, 3, 4, 10000], X: [0, 1, 4, 1, 0, 0] },
  StairStep: { T: [-10000, 1, 2, 3, 4, 10000], X: [0, 1, 2, 3, 0, 0] },
  Triangle: { T: [-10000, 0, 3, 6, 10000], X: [0, 0, 4, 0, 0] },
  UH: { T: uhT, X: uhX },
});
export const SIGNAL_NAMES = Object.freeze(Object.keys(SIGNALS));
/** RampDown and Triangle are joined by straight lines, the others drawn as steps (InterpolationOrder). */
export const orderOf = (signal) => (signal === 'RampDown' || signal === 'Triangle' ? 1 : 0);

export const initialState = () => ({ signal: 'RampDown', β: 4, α: 2, τ: 2, bOld: 0, aOld: 0, TOld: 0, checked: [1, 2] });

// ---- the coupling of b, a and T (F-TS-05) -------------------------------------------------------------------------
/**
 * One pass of the body's assignments to β, τ and the hidden bOld, aOld, TOld (α ≠ 0):
 *   If[β != bOld, bOld = β; τ = 1.0 β/α; TOld = τ]; If[τ != TOld, TOld = τ; β = 1.0 τ α; bOld = β];
 *   If[α != aOld, aOld = α, τ = 1.0 β/α; TOld = τ]
 * (the third If's last part is its "else": a changed a is only recorded; the evaluation it triggers sets T = b/a).
 */
function couplePass(s) {
  if (s.β !== s.bOld) { s.bOld = s.β; s.τ = (1.0 * s.β) / s.α; s.TOld = s.τ; }
  if (s.τ !== s.TOld) { s.TOld = s.τ; s.β = 1.0 * s.τ * s.α; s.bOld = s.β; }
  if (s.α !== s.aOld) s.aOld = s.α; else { s.τ = (1.0 * s.β) / s.α; s.TOld = s.τ; }
}
const HIDDEN = ['β', 'τ', 'bOld', 'aOld', 'TOld'];
/**
 * The variables after Mathematica's evaluations: the body changes Manipulate variables it reads, so the front end
 * evaluates it again until nothing changes (at most a few passes). With α = 0 nothing is coupled (E-TS-01).
 */
export function couple(state) {
  const s = { ...state };
  if (s.α === 0) return s;
  for (let i = 0; i < 6; i++) {
    const before = HIDDEN.map((k) => s[k]);
    couplePass(s);
    if (HIDDEN.every((k, j) => s[k] === before[j])) break;
  }
  return s;
}

// ---- the plots (F-TS-07, F-TS-08) ----------------------------------------------------------------------------------
const it = (t) => Style(t, Italic);
const call = (f, ...arg) => Row([it(f), '(', ...arg, ')']);
export const LEGEND = Object.freeze([
  call('x', it('t')),
  Row([call('y', it('t')), ' = ', call('x', it('a'), ' ', it('t'), ' − ', it('b')), ' = ', call('x', it('a'), '(', it('t'), ' − ', it('T'), ')')]),
  Row([call('z', it('t')), ' = ', call('x', it('t'), ' − ', it('b'))]),
  Row([call('w', it('t')), ' = ', call('x', it('a'), ' ', it('t'))]),
]);
/** ColorData[3, "ColorList"][[4]]: the colour of the point b, measured on the snapshots (D-TS-02). */
export const B_COLOR = RGBColor(138 / 255, 182 / 255, 7 / 255);
const IM = [600, 200];
// Mathematica's automatic image padding of these plots (left, right; bottom, top px): room for the tick labels and the
// axes labels at the ends of the axes
const PADDING = [[24, 60], [18, 14]];
const frame = (axesLabel) => ({
  ImageSize: IM, AspectRatio: IM[1] / IM[0], PlotRange: [[-10, 20], [-1 / 2, 9 / 2]], AxesLabel: axesLabel, ImagePadding: PADDING,
});
const epilog = (τ, β) => [
  [Red, PointSize(0.02), Annotation(Point([τ, 0]), 'point-T'), Text(Style('T', 18, Italic), [τ - 1 / 2, 0.5])],
  [B_COLOR, PointSize('Large'), Annotation(Point([β, 0]), 'point-b'), Text(Style('b', 18, Italic), [β - 1 / 2, 0.25])],
];
const pairs = (T, X) => T.map((t, i) => [t, X[i]]);

/** The Manipulate body: the coupled variables, then the input plot and the plot of the chosen signals. */
export function evaluate(state) {
  const s = couple(state);
  const { signal, α, β, τ, checked } = s;
  const { T: Tx, X: χ } = SIGNALS[signal];
  // transformed times: y at (t + b)/a, z at t + b, w at t/a; a = 0: y and w at 10000 t (E-TS-01)
  const Ty = α === 0 ? Tx.map((t) => 10000 * t) : Tx.map((t) => (1.0 * (t + β)) / α);
  const Tb = Tx.map((t) => t + β);
  const Tw = α === 0 ? Tx.map((t) => 10000 * t) : Tx.map((t) => (1.0 * t) / α);
  // an unchecked curve is moved off the real axis (30 + t i): not drawn; its legend entry stays (Q-TS-01)
  const shown = (k, T) => (checked.includes(k) ? T : T.map(() => NaN));
  const order = orderOf(signal);
  const top = ListLinePlot([pairs(Tx, χ)], {
    ...frame(['time (s)', 'signal']), PlotStyle: [Thickness(0.005)], InterpolationOrder: order,
    PlotLegends: Placed([LEGEND[0]], [0.1, 0.6]), Epilog: epilog(τ, β), label: 'The input signal x(t)',
  });
  const bottom = ListLinePlot([pairs(shown(1, Tx), χ), pairs(shown(2, Ty), χ), pairs(shown(3, Tb), χ), pairs(shown(4, Tw), χ)], {
    // Directive[{ColorData[3][[3]], Thickness[0.005]}]: ColorData[3][[3]] is not a colour, so z keeps the default third
    // colour (measured on the snapshots)
    ...frame(['time (s)', '']), PlotStyle: [Thickness(0.005), [Red, Thickness(0.005)], Thickness(0.005), Thickness(0.005)],
    InterpolationOrder: order, PlotLegends: Placed(LEGEND, [[0, 0.6], [0, 0.5]]) /* centred at 0.15 in Mathematica: its left edge at the plot's left; ours is wider (fonts) and a legend is clipped to the plot range here */, Epilog: epilog(τ, β),
    label: 'The chosen signals x(t), y(t), z(t) and w(t)',
  });
  const at = (T, t) => { // the signal value of a break-point list at t (steps or lines)
    for (let i = T.length - 2; i >= 0; i--) if (t >= T[i]) return order === 0 || T[i + 1] === T[i] ? χ[i] : χ[i] + ((χ[i + 1] - χ[i]) * (t - T[i])) / (T[i + 1] - T[i]);
    return χ[0];
  };
  return {
    state: s,
    view: { signal, α, β, τ, checked: [...checked], Ty, Tb, Tw, x2: at(Tx, 2) },
    graphics: [
      Graphics([Annotation(top.list, 'input-plot')], top.options),
      Graphics([Annotation(bottom.list, 'output-plot')], bottom.options),
    ],
  };
}
