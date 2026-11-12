// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Erik Mahieu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/quarter-car-suspension/model.js — "Simulating Vehicle Suspension with a Simplified Quarter-Car Model": one
// evaluation of the Manipulate body, the state in, { view, graphics } out (pure, no DOM). Simple mode: shared/control.js
// TransferFunctionModel and OutputResponse (the exact response to the sine input), shared/plot.js Plot.
import {
  Graphics, Annotation, Line, Arrow, Rectangle, Circle, Polygon, Text, Style, Row, Column, Italic, Black, Blue, Red, Brown,
  Darker, Green, LightGray, Thickness, Thin, Thick, Opacity, AbsoluteThickness,
} from '../../shared/graphics.js';
import { Plot } from '../../shared/plot.js';
import { TransferFunctionModel, OutputResponse, Signal } from '../../shared/control.js';
import { NumberForm } from '../../shared/number-form.js';
import { isCorrected } from '../../shared/errata.js';

export const initialState = () => ({ time: 0, c: 0.85, k: 0.165, m: 1, h: 0.1, fb: 1 });
const I = (s) => Style(s, Italic);

/** output = Re[OutputResponse[(k + c s)/(k + c s + m s²), h Sin[2π fb t], t]] (zero initial state). */
export const outputOf = ({ c, k, m, h, fb }) => OutputResponse(TransferFunctionModel([k, c], [k, c, m]), Signal.sin(2 * Math.PI * fb, h));
/** Re[Sqrt[1 − c²/(2 k m)] Sqrt[k/m]] — the original's "resonant frequency" (0 where the root is imaginary). */
export const resonantOriginal = ({ c, k, m }) => { const a = 1 - (c * c) / (2 * k * m); return a < 0 ? 0 : Math.sqrt(a) * Math.sqrt(k / m); };
/**
 * The corrected mode (E-QC-01): the frequency of the peak of |(k + c s)/(k + c s + m s²)| at s = iω, the plotted model:
 * ω_n √((√(1 + 8ζ²) − 1)/(4ζ²)) (ω_n for ζ = 0).
 */
export const resonantCorrected = ({ c, k, m }) => {
  const ωn = Math.sqrt(k / m), ζ = c / 2 / Math.sqrt(m * k);
  return ζ === 0 ? ωn : ωn * Math.sqrt((Math.sqrt(1 + 8 * ζ * ζ) - 1) / (4 * ζ * ζ));
};

// coil[th] := Rotate[Plot[.5 Sin[6 t], {t, −π, π}, PlotStyle -> {Red, Opacity[.55], Thickness[th]}, Axes -> False][[1]], π/2, {0, 0}]
// spring[t, b, s] := {Translate[Scale[coil[s], {1, (t − b)/2/π}, {0, −π}], {0, π + b}]}: the coil stretched from b up to t
export function spring(top, bottom, th) {
  const pts = [];
  for (let i = 0; i <= 400; i++) { const u = -Math.PI + (2 * Math.PI * i) / 400; pts.push([-0.5 * Math.sin(6 * u), bottom + ((u + Math.PI) * (top - bottom)) / (2 * Math.PI)]); }
  // Thickness[th] of the coil's own Plot: drawn about 170·th px wide in the snapshots (7 px at k = 0.165, D-QC-02)
  return [Red, Opacity(0.55), AbsoluteThickness(170 * th), Annotation(Line(pts), 'spring')];
}

const TICKS = [[0.75, '-0.25'], [1, '0.'], [1.25, '0.25'], [-1.25, '-0.25'], [-1, '0.'], [-0.75, '0.25']];
/** The Manipulate body: Column[{the input and output over five seconds, the suspension at `time`}]. */
export function evaluate(state) {
  const { time, c, k, m, h, fb } = state;
  const corrected = isCorrected(state);
  const output = outputOf(state);
  const top = 1 + output(time), bottom = -1 + h * Math.sin(2 * Math.PI * fb * time);
  const ζ = c / 2 / Math.sqrt(m * k), Ωp = corrected ? resonantCorrected(state) : resonantOriginal(state);
  const signals = Plot([(t) => h * Math.sin(2 * Math.PI * fb * t), output], [time, time + 5], {
    PlotRange: [-0.2, 0.2], Background: LightGray, PlotStyle: [Blue, [Thick, Red]], Axes: [true, false], Ticks: 'None',
    AspectRatio: 0.2, ImageSize: 400, label: 'Road and car body over five seconds',
  });
  // the road: Plot[−1.74 + h Sin[2 t + 2π fb time], {t, −3, 3}, PlotStyle -> Darker[Green], Filling -> −2.5, FillingStyle -> Brown][[1]]
  const road = [];
  for (let i = 0; i <= 300; i++) { const t = -3 + (6 * i) / 300; road.push([t, -1.74 + h * Math.sin(2 * t + 2 * Math.PI * fb * time)]); }
  const picture = [
    Black, Arrow([[0, top], [-1.25, top]]),
    Thickness(0.01), Line([[0, bottom], [0, bottom + 1]]), Rectangle([-0.15, bottom + 0.8], [0.15, bottom + 1 + c / 5]),
    Blue, Line([[0, top], [0, top - 0.5]]), Line([[-0.2, top - 0.5], [0.2, top - 0.5]]), Line([[-0.2, top - 0.5], [-0.2, top - 1.5]]), Line([[0.2, top - 0.5], [0.2, top - 1.5]]),
    Black, Line([[0, bottom], [0, bottom - 0.48]]), Thin, Arrow([[0, bottom], [-1.25, bottom]]), spring(top, bottom, 0.25 * k),
    Thickness(0.02), Line([[-0.1, bottom], [0.1, bottom]]), Circle([0, bottom - 0.5], 0.15), Thickness(0.01),
    Annotation(Rectangle([-0.75, top], [0.75, top + m]), 'mass'),
    Text(Column([Style(Row(['damping ratio ζ = ', NumberForm(ζ, [3, 2])]), 14), Style(Row(['resonant frequency = ', NumberForm(Ωp, [3, 2])]), 14)]), [1.75, 0]),
    Text(Style(Row([I('y'), '(', I('t'), ')']), 14, Blue), [-1.75, -1]), Text(Style(Row([I('x'), '(', I('t'), ')']), Red, 14), [-1.75, 1]),
    [Brown, Polygon([[-3, -2.5], ...road, [3, -2.5]])], [Darker(Green), Line(road)],
  ];
  return {
    view: { top, bottom, ζ, resonant: Ωp, x: output(time), corrected },
    graphics: [
      Graphics([Annotation(signals.list, 'signals-plot')], signals.options),
      Graphics(picture, { PlotRange: [[-3, 3], [-2.5, 2]], Axes: [false, true], Ticks: ['None', TICKS], AxesOrigin: [-1.25, 0], ImageSize: 475, PlotRangePadding: 0 }),
    ],
  };
}
