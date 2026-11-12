// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Enrique Zeleny
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/active-shock-absorbers/model.js — "Active Shock Absorbers": one evaluation of the Manipulate body, the state
// in, { view, graphics } out (pure, no DOM). Simple mode: shared/ode.js NDSolve, shared/plot.js Plot and ParametricPlot,
// shared/numeric.js TriangleWave for the spring.
import { Graphics, Annotation, Line, Translate, Rotate, Gray, Brown, Red, Blue, Thickness, Style, Row, Italic, Superscript, RGBColor, AbsoluteThickness } from '../../shared/graphics.js';
import { Plot, ParametricPlot, COLOR_DATA_97 } from '../../shared/plot.js';
import { NDSolve } from '../../shared/ode.js';
import { TriangleWave } from '../../shared/numeric.js';

export const initialState = () => ({ f: 2, y0: 0.1, yp0: 0.2, m: 0.1, k: 1, tf: 35 });
const I = (s) => Style(s, Italic);
const y = Row([I('y'), '(', I('t'), ')']);
/** The damping coefficient γ(y): Which[f == 1, y^4, f == 2, 1 − Exp[−10 y²], f == 3, ArcTan[y]]. */
export const DAMPING = Object.freeze({ 1: (u) => u ** 4, 2: (u) => 1 - Math.exp(-10 * u * u), 3: (u) => Math.atan(u) });
// the menu's labels (TraditionalForm in the original; a menu shows plain text)
export const DAMPING_LABELS = Object.freeze([[1, 'y(t)⁴'], [2, '1 − exp(−10 y(t)²)'], [3, 'tan⁻¹(y(t))']]);

/** NDSolve[{m y'' + γ(y) y' + k y == 0, y[0] == y0, y'[0] == yp0}, y, {t, 0, 50}]: y and y' as functions of t. */
export function solve({ f, y0, yp0, m, k }) {
  const g = DAMPING[f];
  return NDSolve((t, [u, v]) => [v, -(g(u) * v + k * u) / m], [y0, yp0], [0, 50]);
}
// gr = Plot[.05 TriangleWave[6 x], {x, 0, 2}][[1]]: the corners of the triangle wave, in the plot's default style
const GR = (() => { const pts = []; for (let i = 0; i <= 48; i++) { const x = i / 24; pts.push([x, 0.05 * TriangleWave(6 * x)]); } return pts; })();

/** The shock absorber at time tf: the base, the rods, the spring of length max + y and the blue frame. */
export function absorber(ytf) {
  const max = 1.2, s = 0.5 * (max + ytf);
  // Translate[Rotate[Scale[gr, {.5 (max + y), 1}, {0, 0}], π/2, {0, 0}], {−.1, 0}]
  const spring = GR.map(([x, v]) => [-v - 0.1, x * s]);
  return Graphics([
    Thickness(0.04), Gray, Line([[-0.4, 0], [0.45, 0]]),
    Brown, Line([[0.2, 0], [0.2, max + ytf]]),
    Red, Thickness(0.08), Line([[0.2, 0], [0.2, 0.65 * max + ytf]]),
    [RGBColor(...COLOR_DATA_97[0]), AbsoluteThickness(1.6), Annotation(Line(spring), 'spring')],
    Blue, Thickness(0.04), Line([[-0.3, max + ytf], [0.4, max + ytf], [0.4, ytf + 2 * max]]),
  ], { PlotRange: [[-0.4, 0.45], [-0.1, 1.6 + 2 * max]], ImageSize: [150, 250], PlotRangePadding: 0 });
}

/** The Manipulate body: Column[{Row[{the absorber, the phase plane}], y(t)}]. */
export function evaluate(state) {
  const sol = solve(state), tf = state.tf;
  const yt = sol.component(0), ypt = sol.component(1);
  const phase = ParametricPlot((t) => [yt(t), ypt(t)], [0, tf], {
    Frame: true, ImageSize: 270, PlotRange: 'All', AspectRatio: 1, Axes: false, ImagePadding: [[52, 12], [40, 12]],
    FrameLabel: [y, Row([I('y'), '′(', I('t'), ')'])], label: 'The phase plane',
  });
  const time = Plot(yt, [0, tf], { PlotRange: 'All', AspectRatio: 1 / 3, ImageSize: 405, AxesLabel: [I('t'), y], label: 'y(t)' });
  return {
    view: { y: yt(tf), yp: ypt(tf), steps: sol.steps },
    graphics: [
      absorber(yt(tf)),
      Graphics([Annotation(phase.list, 'phase-plot')], phase.options),
      Graphics([Annotation(time.list, 'time-plot')], time.options),
    ],
  };
}
