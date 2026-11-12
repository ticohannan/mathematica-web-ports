// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Simon M. Lane
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/first-order-process-control/model.js — "First-Order Transfer Functions in Process Control": one evaluation of
// the Manipulate body, the state in, { view, graphics } out (pure, no DOM). Simple mode: the original's closed forms,
// shared/numeric.js FindMaximum, shared/plot.js Plot, shared/graphics.js Grid tables.
import {
  Graphics, Annotation, Line, Text, Style, Row, Superscript, Italic, Grid, Inset, Black, Blue, Green, White, Thick,
  Thickness, AbsoluteThickness, RGBColor, Fraction,
} from '../../shared/graphics.js';
import { Plot } from '../../shared/plot.js';
import { FindMaximum } from '../../shared/numeric.js';
import { NumberForm } from '../../shared/number-form.js';
import { isCorrected } from '../../shared/errata.js';

export const INPUTS = Object.freeze([[1, 'step'], [2, 'ramp'], [3, 'sinusoidal']]);
export const initialState = () => ({ W: 3, T: 5, α: 3, w: 1 });

const I = (s) => Style(s, Italic);
const exp = Math.exp, Log = Math.log;
/** The sinusoidal response (K = 1): a ω T/(ω²T² + 1) e^(−t/T) + a/√(ω²T² + 1) sin(ω t + Φ), Φ = −ArcTan[ω T]. */
export const sineResponse = (α, T, w) => { const Φ = -Math.atan(w * T); return (t) => ((α * w * T) / (w * w * T * T + 1)) * exp(-t / T) + (α / Math.sqrt(w * w * T * T + 1)) * Math.sin(w * t + Φ); };
export const stepResponse = (α, T) => (t) => α * (1 - exp(-t / T));
export const rampResponse = (α, T) => (t) => α * T * (exp(-t / T) - 1) + α * t;

/** The Module's numbers (Θ = 0, K = 1), as the original computes them. */
export function quantities({ T, α, w }) {
  const Φ = -Math.atan(w * T);
  const Yτ = α * 0.632;
  const Xτ = -T * Log(-Yτ / α + 1);
  const YΔSS = α * (1 - exp(-24 / T));
  const line = α * (1 - exp(-Xτ / T));
  const yline = α * T * (exp(-(10 / α) / T) - 1) + α * (10 / α);
  // FindMaximum[{response, 0.05 <= t <= 10}, {t, 0.05}]: the first maximum after t = 0.05
  const [time2, time1] = FindMaximum(sineResponse(α, T, w), 0.05, { bounds: [0.05, 10] });
  return { Φ, Yτ, Xτ, YΔSS, line, timeconstant: Xτ, yline, τramp: 10 - yline, time1, time2, x: 1.5 / w };
}

// the tables PTV, PTV1, PTV2: Grid[…, Frame -> {False, All}, Alignment -> {{"=", ".", Center}}] in a Graphics inset
const table = (rows, size) => Text(Style(Grid(rows, { Frame: [false, 'All'], Alignment: [['=', '.', 'Center']], Spacings: [0.5, 0.25] }), size), null);
const at = (g, [sx, sy], [[x0, x1], [y0, y1]]) => ({ ...g, pos: [x0 + sx * (x1 - x0), y0 + sy * (y1 - y0)] });
const label = (s, pos, extra = []) => Text(Style(s, 12, ...extra, { Background: White }), pos);
const e = (sup) => Superscript(I('e'), sup);
const LABELS = {
  1: Row(['response = ', I('K'), ' ', I('a'), ' (1 − ', e(Row(['−', I('t'), '/', I('τ')])), ')']),
  2: Row(['response = ', I('K'), ' ', I('a'), ' ', I('τ'), ' (', e(Row(['−', I('t'), '/', I('τ')])), ' − 1) + ', I('K'), ' ', I('a'), ' ', I('t')]),
  // the sinusoidal label written on one line (the original's built-up fractions, D-FO-02)
  3: Row(['response = ', I('K'), ' ', I('a'), ' ω ', I('τ'), ' ', e(Row(['−', I('t'), '/', I('τ')])), '/(ω²', I('τ'), '² + 1) + ', I('K'), ' ', I('a'),
    ' sin(ω ', I('t'), ' + ϕ)/√(ω²', I('τ'), '² + 1)']),
};

/** The Manipulate body: Switch[W, 1, plot4, 2, plot5, 3, plot6]. */
export function evaluate(state) {
  const { W, T, α, w } = state;
  const corrected = isCorrected(state);
  const q = quantities(state);
  const common = { Frame: true, FrameLabel: ['time (min)', 'response'], ImageSize: 500, AspectRatio: 0.7, LabelStyle: [14] };
  let plot, view;
  if (W === 1) {
    const R = [[0, 25], [0, 10]];
    // plot1: the input step, an inset plot
    const input = Plot((x) => (x < 0 ? 0 : x > 0 ? α : 0), [-5, 5], {
      PlotStyle: [[Thick, Green]], PlotRange: [[-5, 5], [-1, 6]], Axes: false, Frame: true, ImageSize: 200,
      FrameLabel: ['time (min)', Row([I('x'), '(', I('t'), ')'])], PlotLabel: Style('input', 16), Exclusions: [0], ExclusionsStyle: [Thick, Green],
    });
    const ptv = table([[Row(['gain ', I('K'), ' =']), NumberForm(1, 2), ''], ['time constant  τ  =', NumberForm(q.timeconstant, 2), '']], 15);
    plot = Plot(stepResponse(α, T), [0, 25], {
      ...common, PlotStyle: [[Thickness(0.007)]], PlotRange: R, PlotLabel: Style(LABELS[1], 17),
      Epilog: [Black, Line([[q.Xτ, 0], [q.Xτ, q.line]]), Line([[24, 0], [24, q.YΔSS]]), at(ptv, [0.72, 0.8], R),
        label('0.632 × ΔSS', [q.Xτ, q.line / 2]), label('ΔSS', [24, α / 2]), Inset(input, [R[0][0] + 0.22 * 25, 0.7 * 10])],
    });
    view = { W, timeconstant: q.timeconstant, ΔSS: q.YΔSS };
  } else if (W === 2) {
    const R = [[0, 20], [0, 20]];
    const τShown = corrected ? T : q.τramp; // E-FO-02
    const ptv2 = table([[Row(['gain ', I('K'), ' =']), NumberForm(1, 2), ''], ['time constant  τ  =', NumberForm(τShown, 2), 'min']], 15);
    const resp = rampResponse(α, T);
    // the τ marker: the original's vertical gap at t = 10/a; corrected, the horizontal lag at the response's value at t = 10
    const y10 = resp(10), tIn = y10 / α;
    const marker = corrected
      ? [Line([[tIn, y10], [10, y10]]), label('τ', [(tIn + 10) / 2, y10])]
      : [Line([[10 / α, 10], [10 / α, q.yline]]), label('τ', [10 / α, (α * (10 / α) - q.yline) / 2 + q.yline])];
    plot = Plot([resp, (t) => α * t], [0, 10], {
      ...common, PlotStyle: [[Thick, Blue], [Thick, Green]], PlotRange: R, PlotLabel: Style(LABELS[2], 17),
      Epilog: [Black, ...marker, label('input', [3, 3 * α]), label('response', [6, resp(6)]), at(ptv2, [0.77, 0.81], R)],
    });
    view = { W, τramp: q.τramp, τShown, yline: q.yline };
  } else {
    const R = [[0, 10], [-6, 10]];
    const resp = sineResponse(α, T, w);
    // E-FO-03 / E-FO-01: the original's B is the first maximum (transient included) and its phase is −Φ labelled "min"
    const B = corrected ? α / Math.sqrt(w * w * T * T + 1) : q.time2;
    const rows = [
      ['amplitude output ', I('B'), '  =', NumberForm(B, 2), ''],
      ['amplitude ratio ', Fraction(I('B'), I('A')), ' =', NumberForm(B / α, 2), ''],
      corrected ? ['phase shift ϕ  =', '', '', NumberForm(-q.Φ, 2), 'rad'] : ['phase shift ϕ  =', '', '', NumberForm(-q.Φ, 2), 'min'],
    ];
    if (corrected) rows.push(['time lag ϕ/ω  =', '', '', NumberForm(-q.Φ / w, 2), 'min']);
    const ptv1 = table(rows, 12);
    plot = Plot([resp, (t) => α * Math.sin(w * t)], [0, 10], {
      ...common, PlotStyle: [[Thick, Blue], [Thick, Green]], PlotRange: R, PlotRangeClipping: false, PlotLabel: Style(LABELS[3], 14),
      Epilog: [Black, Line([[q.x, 0], [q.x, α]]), Line([[q.time1, 0], [q.time1, q.time2]]), Line([[q.x, q.time2], [q.time1, q.time2]]),
        label('ϕ', [(q.time1 - q.x) / 2 + q.x, q.time2]), label(I('A'), [q.x, α / 2]), label(I('B'), [q.time1, q.time2 / 2]),
        at(ptv1, [0.75, 0.85], R), label('input', [8, α * Math.sin(w * 8)]), label('response', [6, resp(6)])],
    });
    view = { W, B, ratio: B / α, phase: -q.Φ, time1: q.time1, time2: q.time2, x: q.x };
  }
  return { view: { ...view, corrected }, graphics: Graphics([Annotation(plot.list, `response-plot-${W}`)], plot.options) };
}
