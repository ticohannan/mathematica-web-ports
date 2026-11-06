// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/even-odd-synthesis/model.js — "Synthesis with Even and Odd Functions": one evaluation of the Manipulate body,
// the state in, { view, graphics } out (pure, no DOM). Simple mode: shared/wl.js, shared/plot.js, plain arithmetic.
import { Graphics, Text, Point, PointSize, Row, Style, Subscript, Italic, Annotation, Thin, Dashed } from '../../shared/graphics.js';
import { UnitStep, HeavisidePi, Sin, Cos } from '../../shared/wl.js';
import { Plot, Placed } from '../../shared/plot.js';

// the initialization cell: u, r, rect (δ is defined and never used, N-EO-01)
const u = (t) => UnitStep(t);
const r = (t) => t * UnitStep(t);
const rect = (t) => HeavisidePi(t);

export const SIGNALS = Object.freeze(['Step', 'RampUp', 'Cos', 'Sin', 'TopHat', 'StairStep', 'Triangle']);
export const initialState = () => ({ signal: 'StairStep', τ: 0 });

/** X[t, τ] of the Manipulate (F-EO-03): the signal shifted by τ. */
export function X(signal, t, τ) {
  const s = t - τ;
  switch (signal) {
    case 'Step': return u(s);
    case 'RampUp': return (r(s) - r(s - 5)) / 5;
    case 'Cos': return Cos(s);
    case 'Sin': return Sin(s);
    case 'TopHat': return rect(s / 3) / 4 + (3 / 4) * rect(s);
    case 'StairStep': return (u(s) + u(s - 1) + u(s - 2) + u(s - 3) - 4 * u(s - 4)) / 4;
    case 'Triangle': return (r(s) - 2 * r(s - 2) + r(s - 4)) / 2;
    default: return rect(s);
  }
}
/**
 * Where X[t, τ] jumps (Mathematica finds these symbolically for its automatic Exclusions; D-EO-02): the jumps of u and
 * rect, shifted by τ.
 */
export function jumpsOf(signal, τ) {
  const j = { Step: [0], TopHat: [-1.5, -0.5, 0.5, 1.5], StairStep: [0, 1, 2, 3, 4], RampUp: [], Cos: [], Sin: [], Triangle: [] }[signal] ?? [-0.5, 0.5];
  return j.map((x) => x + τ);
}

const RANGE = [[-10, 10], [-1, 1]];
// Mathematica's automatic image padding leaves room for the tick labels at the ends of the axes (left, right; bottom,
// top px); the shared layer adds none for a plot with axes only
const PADDING = [[30, 14], [16, 10]];
const PART_LABEL = (part) => Row([`${part}: `, Subscript(Style('x', Italic), part), '(', Style('t', Italic), ' − ', Style('T', Italic), ')']);
export const LEGEND = Object.freeze(['', PART_LABEL('even'), PART_LABEL('odd')]);

/** The Manipulate body (F-EO-04 … F-EO-06): the input plot and the plot of the input with its even and odd parts. */
export function evaluate({ signal, τ }) {
  const x = (t) => X(signal, t, τ);
  const jumps = jumpsOf(signal, τ);
  const top = Plot(x, [-10, 10], {
    ImageSize: 500, AspectRatio: 1 / 3, PlotRange: RANGE, ImagePadding: PADDING, Exclusions: jumps, ExclusionsStyle: Dashed,
    Prolog: [Text('input signal', [-8, 1 / 2])],
    Epilog: [PointSize('Large'), Annotation(Point([τ, 0]), 'shift-point'), Text('T', [τ, 0.1])],
    label: 'The input signal x(t − T)',
  });
  // the bottom plot at the top plot's width (D-EO-01, owner decision Q-1); X[−t] jumps at the mirrored points
  const bottom = Plot((t) => [x(t), (x(t) + x(-t)) / 2, (x(t) - x(-t)) / 2], [-10, 10], {
    ImageSize: 500, AspectRatio: 1 / 3, PlotRange: RANGE, ImagePadding: PADDING, Exclusions: [...jumps, ...jumps.map((v) => -v)],
    Filling: { 1: [1], 2: 'Axis', 3: 'Axis' }, PlotStyle: [Thin, 'Automatic', 'Automatic'],
    PlotLegends: Placed(LEGEND, [0.1, 0.9]),
    label: 'The input signal with its even and odd parts',
  });
  return {
    view: { signal, τ, jumps, x0: x(0) },
    graphics: [
      Graphics([Annotation(top.list, 'input-plot')], top.options),
      Graphics([Annotation(bottom.list, 'parts-plot')], bottom.options),
    ],
  };
}
