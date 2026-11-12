// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Housam Binous, Mohammad Mozahar Hossain and Ahmed Bellagi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/integral-error-criteria/model.js — "Integral Error Criteria for Controller Tuning": one evaluation of the
// Manipulate body, the state in, { view, graphics } out (pure, no DOM). Simple mode: shared/control.js
// InverseLaplaceTransform, shared/numeric.js NIntegrate, shared/plot.js Plot and ListPlot.
import { Graphics, Annotation, Point, PointSize, Style, Row, Blue, Red, Green, Gray, Darker, Thick, Dashed, Opacity } from '../../shared/graphics.js';
import { Plot, ListPlot } from '../../shared/plot.js';
import { InverseLaplaceTransform } from '../../shared/control.js';
import { NIntegrate, FindMinimum } from '../../shared/numeric.js';
import { isCorrected } from '../../shared/errata.js';
import { NumberForm } from '../../shared/number-form.js';

export const initialState = () => ({ ctrl2: 1, Kc: 1.25, ctrl: 1 });

/** b[q] = InverseLaplaceTransform[1/s (q (1 + s))/(q + 5 s (1 + 3 s + 2 s²)), s, t]: the closed-loop step response. */
export const b = (q) => InverseLaplaceTransform([q, q], [0, q, 5, 15, 10]);
const memo = new Map();
/** f1, f2, f3: IAE, ISE and ITAE = NIntegrate[Abs[1 − b], (1 − b)², t Abs[1 − b], {t, 0, 5000}] (memoised by gain). */
export function criteria(q) {
  if (memo.has(q)) return memo.get(q);
  const y = b(q), e = (t) => 1 - y(t), opts = { PrecisionGoal: 8, AccuracyGoal: 10, MaxSubintervals: 40000 };
  const r = {
    IAE: NIntegrate((t) => Math.abs(e(t)), [0, 5000], opts),
    ISE: NIntegrate((t) => e(t) ** 2, [0, 5000], opts),
    ITAE: NIntegrate((t) => t * Math.abs(e(t)), [0, 5000], opts),
  };
  if (memo.size > 200) memo.clear();
  memo.set(q, r);
  return r;
}
// the Initialization's tables (values computed by the authors) and optima w1, w2, w3
export const IAE = [[1, 5.3547], [1.25, 5.05889], [1.5, 5.00968], [1.75, 5.09285], [2, 5.25657], [2.25, 5.49275], [2.5, 5.78598], [2.75, 6.13584]];
export const ISE = [[1, 3.34615], [1.25, 2.95], [1.5, 2.72917], [1.75, 2.61335], [2, 2.56818], [2.25, 2.5754], [2.5, 2.625], [2.75, 2.71172]];
export const ITAE = [[1, 24.8437], [1.25, 25.529], [1.5, 28.0479], [1.75, 31.3496], [2, 35.4364], [2.25, 40.3886], [2.5, 46.2944], [2.75, 53.2584]];
export const OPTIMA = { IAE: [5.00816, 1.48845], ISE: [2.5653841409022107, 2.084447222082553], ITAE: [24.807852220081998, 1.0347352871788122] };

/**
 * The corrected mode (E-IE-01): the tables and optima recomputed by this port's integration (Mathematica's NIntegrate of
 * Abs over {t, 0, 5000} gave the authors' IAE and ITAE values with errors up to 10 %), the optimum by FindMinimum.
 */
let recomputed = null;
export function recomputedTables() {
  if (recomputed) return recomputed;
  const gains = IAE.map(([g]) => g);
  const out = {};
  for (const name of ['IAE', 'ISE', 'ITAE']) {
    const table = gains.map((g) => [g, criteria(g)[name]]);
    const best = table.reduce((a, r) => (r[1] < a[1] ? r : a));
    const [v, g] = FindMinimum((q) => criteria(Math.min(2.75, Math.max(1, q)))[name], best[0], { bounds: [1, 2.75] });
    out[name] = { table, optimum: [v, g] };
  }
  recomputed = out;
  return out;
}

const lab = (s, c, size = 16) => (c ? Style(s, size, c) : Style(s, size));
/** The Manipulate body: Switch[ctrl2, 1, the response, 2, Switch[ctrl, the IAE, ISE or ITAE tuning plot]]. */
export function evaluate(state) {
  if (state.ctrl2 === 1) {
    const y = b(state.Kc), c = criteria(state.Kc);
    // PlotPoints 500: the original's {t, 0, 500} with 50 initial points would alias the oscillation at K_c = 7.5 in the
    // port's sampler (Mathematica's resolves it; D-IE-03)
    const plot = Plot([() => 1, y], [0, 500], {
      PlotPoints: 500,
      PlotRange: [[0, 50], [-0.2, 2.4]], Frame: true, AspectRatio: 1, ImageSize: 350, GridLines: 'Automatic',
      PlotStyle: [[Thick, Darker(Red), Dashed], [Thick, Darker(Green)]], Filling: { 1: [2] }, FillingStyle: [Darker(Gray), Opacity(0.2)],
      FrameLabel: [lab('time'), lab('response')],
      // the label at size 14 (16 in the original): the port's font is wider and the label must fit the picture (D-IE-04)
      PlotLabel: Row([lab('IAE: ', Darker(Gray), 14), lab(NumberForm(c.IAE, [4, 3]), Darker(Gray), 14), '  ', lab('ISE: ', Darker(Green), 14),
        lab(NumberForm(c.ISE, [4, 3]), Darker(Green), 14), '  ', lab('ITAE: ', Blue, 14), lab(NumberForm(c.ITAE, [6, 3]), Blue, 14)]),
      label: 'The closed-loop response',
    });
    return { view: { ctrl2: 1, Kc: state.Kc, ...c }, graphics: Graphics([Annotation(plot.list, 'response-plot')], plot.options) };
  }
  const name = ['IAE', 'ISE', 'ITAE'][state.ctrl - 1];
  const corrected = isCorrected(state);
  const data = corrected ? recomputedTables()[name].table : { IAE, ISE, ITAE }[name];
  const [v, g] = corrected ? recomputedTables()[name].optimum : OPTIMA[name];
  // ListPlot's automatic range takes in y = 0 when the data lie closer to 0 than their own spread (ITAE 24.8 … 53.3 is
  // drawn from 0, IAE 5.0 … 6.1 and ISE 2.6 … 3.3 are not — the snapshots; D-IE-02)
  const ys = data.map((r) => r[1]), y0 = Math.min(...ys, v), y1 = Math.max(...ys, v);
  const plot = ListPlot(data, {
    PlotRange: ['All', y0 > 0 && y0 < y1 - y0 ? [0, y1] : 'All'], Frame: true, AspectRatio: 1, GridLines: 'Automatic', ImageSize: 350,
    PlotStyle: [[Thick, PointSize(0.0175), Darker(Red)]], Epilog: [Blue, PointSize(0.025), Point([g, v])],
    PlotLabel: Row([lab(`${name}: `, Darker(Blue)), lab(NumberForm(v, [4, 3]), Darker(Blue)), '        ', lab('Gain: ', Darker(Blue)), lab(NumberForm(g, [4, 3]), Darker(Blue))]),
    FrameLabel: [lab('gain'), lab(name)], label: `The ${name} tuning plot`,
  });
  return { view: { ctrl2: 2, criterion: name, optimum: [g, v], corrected }, graphics: Graphics([Annotation(plot.list, 'tuning-plot')], plot.options) };
}
