// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Housam Binous, Mohammad Mozahar Hossain and Ahmed Bellagi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/underdamped-step-performance/model.js — "Performance Characteristics for Step Response of an Underdamped
// Process": one evaluation of the Manipulate body, the state in, { view, graphics } out (pure, no DOM). Simple mode: the
// original's closed form yanal, shared/numeric.js FindRoot and FindMaximum, shared/graphics.js Grid.
import {
  Graphics, Annotation, Line, Text, Style, Row, Subscript, Italic, Arrow, Arrowheads, Grid, Blue, Red, Black, Green, Gray,
  Darker, Lighter, Blend, Thickness, Dashed, White,
} from '../../shared/graphics.js';
import { Plot, Show } from '../../shared/plot.js';
import { FindRoot, FindMaximum } from '../../shared/numeric.js';
import { NumberForm } from '../../shared/number-form.js';

export const initialState = () => ({ Kg: 5, τ: 1, ζ: 0.2, M: 5, ctrl: 1 });
const I = (s) => Style(s, Italic);

/** The Module: yanal[t], tp, the rise time, the first two maxima, overshoot, decay ratio and period. */
export function characteristics({ Kg, τ, ζ, M }) {
  const InvTau = 1 / τ, Ω = Math.sqrt(InvTau ** 2 - (InvTau * ζ) ** 2);
  const yanal = (t) => Kg * M + (-2 * Kg * M * InvTau * ζ / Ω + Kg * M * InvTau * ζ / Ω) * Math.exp(-ζ * InvTau * t) * Math.sin(Ω * t)
    - Kg * M * Math.exp(-ζ * InvTau * t) * Math.cos(Ω * t);
  const tp = (Math.PI * τ) / Math.sqrt(1 - ζ * ζ);
  const tr = FindRoot((t) => yanal(t) - M * Kg, [0, tp]); // FindRoot[yanal[t] == M Kg, {t, 0, tp}]
  const [peak1, tPeak1] = FindMaximum(yanal, [tp, tp + 0.2]); // FindMaximum[yanal[t], {t, tp, tp + 0.2}]
  const P = (2 * Math.PI) / Ω;
  const [peak2, tPeak2] = FindMaximum(yanal, tp + P); // FindMaximum[yanal[t], {t, tp + P}]
  return {
    yanal, Ω, tp, tr, P, peak1, tPeak1, peak2, tPeak2,
    Overshoot: Math.exp((-Math.PI * ζ) / Math.sqrt(1 - ζ * ζ)), DecayRatio: Math.exp((-2 * Math.PI * ζ) / Math.sqrt(1 - ζ * ζ)),
  };
}

/** The Manipulate body: Pane[Switch[ctrl, 1, the response with its arrows, 2, the table of characteristics]]. */
export function evaluate(state) {
  const c = characteristics(state);
  const { Kg, M } = state, MK = M * Kg;
  if (state.ctrl === 2) {
    const rows = [
      ['property', 'value'],
      [Row(['overshoot ', I('a'), '/', I('b')]), NumberForm(c.Overshoot, [5, 4])],
      [Row(['decay ratio ', I('c'), '/', I('a')]), NumberForm(c.DecayRatio, [5, 4])],
      [Row(['period ', I('P')]), NumberForm(c.P, [5, 4])],
      [Row(['rise time ', Subscript(I('t'), 'r')]), NumberForm(c.tr, [5, 4])],
      [Row(['time to first peak ', Subscript(I('t'), 'p')]), NumberForm(c.tp, [5, 4])],
    ];
    const bg = [Lighter(Blend([Blue, Red]), 0.8), [Lighter(Blend([Blue, Darker(Green)]), 0.8), Lighter(Green, 0.9)]];
    const grid = Grid(rows, { Frame: 'All', Background: [null, bg], ItemSize: [9.3, 3.3], FrameStyle: Darker(Gray, 0.6), ItemStyle: 14, Spacings: [null, 0.8] });
    return {
      view: { ctrl: 2, ...pick(c) },
      graphics: Graphics([Annotation(Text(Style(grid, 16), [0, 0]), 'performance-table')], { PlotRange: [[-175, 175], [-200, 200]], PlotRangePadding: 0, ImageSize: 350, AspectRatio: 400 / 350, UpdateFrame: true }),
    };
  }
  const p1 = Plot(c.yanal, [0, 3 * c.P], {
    Frame: true, GridLines: 'Automatic', AspectRatio: 1.5, FrameLabel: [Style('time', 16), Style('output', 16)],
    // PlotRange -> All of Show[p1, Graphics[…]]: the range of everything shown, the P arrow and its label included
    PlotRange: [[0, 3 * c.P], [Math.min(0, ...[0, 0.5, 1].map((k) => c.yanal(k * c.P))), c.peak1 * 1.1]], PlotRangePadding: [0.02, 0.04],
    PlotStyle: [[Red, { dir: 'thickness', value: { abs: 2 } }]], ImageSize: 267, label: 'The step response',
  });
  const arrows = [
    [Dashed, Thickness(0.01), Blue, Line([[0, MK], [3 * c.P, MK]])],
    Darker(Green), Arrowheads([-0.05, 0.05]), Arrow([[c.tp, 0], [c.tp, MK]]),
    Red, Arrowheads([-0.05, 0.05]), Arrow([[c.tp, MK], [c.tp, c.peak1]]),
    Blue, Arrowheads([-0.05, 0.05]), Arrow([[c.tp, c.peak1 * 1.05], [c.tPeak2, c.peak1 * 1.05]]),
    Text(Style(I('P'), Blue, 14, { Background: White }), [(c.tPeak2 + c.tp) / 2, c.peak1 * 1.1]),
    Text(Style(I('b'), Darker(Green), 14, { Background: White }), [c.tp * 1.2, MK / 2]),
    Text(Style(I('a'), Red, 14, { Background: White }), [c.tp * 1.2, MK / 2 + c.peak1 / 2]),
    Text(Style(I('c'), Black, 14, { Background: White }), [c.tPeak2 * 1.1, MK / 2 + c.peak2 / 2]),
    Black, Arrowheads([-0.03, 0.03]), Arrow([[c.tPeak2, MK], [c.tPeak2, c.peak2]]),
  ];
  const g = Show(p1, Graphics(arrows));
  return { view: { ctrl: 1, ...pick(c) }, graphics: Graphics([Annotation(g.list, 'response-plot')], g.options) };
}
const pick = (c) => ({ tp: c.tp, tr: c.tr, P: c.P, peak1: c.peak1, tPeak1: c.tPeak1, peak2: c.peak2, tPeak2: c.tPeak2, Overshoot: c.Overshoot, DecayRatio: c.DecayRatio });
