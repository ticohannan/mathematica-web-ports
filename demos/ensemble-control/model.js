// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/ensemble-control/model.js — one evaluation of the Manipulate body of "Ensemble Control of Robots with Unicycle
// Kinematics": the state in, { state, view, graphics } out (pure, no DOM). Simple mode: plain arithmetic.
import { Graphics, Line, Disk, Circle, Point, Rectangle, White, Red, Blue, Hue, Thick, Dashed, Opacity, PointSize, Annotation } from '../../shared/graphics.js';
import { Plot } from '../../shared/plot.js';
import { Pi, Cos, Sin, Total, Table, RandomReal, Transpose } from '../../shared/wl.js';

/** Initialization: r = 10 (the size of the workspace and of everything drawn). */
export const r = 10;

/** DrawRobot[x, y, θ]: a white disk, a thick circle and a short heading line. */
export const DrawRobot = (x, y, Theta) => [
  [White, Disk([x, y], r / 25)], Thick, Circle([x, y], r / 20),
  Line([[x, y], [x + (r / 15) * Cos(Theta), y + (r / 15) * Sin(Theta)]]),
];

/** The goals: n points on the circle of radius r, Table[r Cos[θ 2π/n], {θ, 0, n − 1}] (and Sin). */
export const goalsOf = (n) => ({
  xGoal: Table((t) => r * Cos((t * 2 * Pi) / n), [0, n - 1]),
  yGoal: Table((t) => r * Sin((t * 2 * Pi) / n), [0, n - 1]),
});

/** (1/n) Σ (xᵢ + v cos θᵢ − x_Goal,ᵢ)² + (yᵢ + v sin θᵢ − y_Goal,ᵢ)²: the plotted mean squared distance after moving v. */
export const meanSquaredError = ({ xinit, yinit, θinit, xGoal, yGoal }, v) =>
  Total(xinit.map((x, i) => (x + v * Cos(θinit[i]) - xGoal[i]) ** 2 + (yinit[i] + v * Sin(θinit[i]) - yGoal[i]) ** 2)) / xinit.length;

/** distBest = (1/n) Σ (x_Goal − x) cos θ + (y_Goal − y) sin θ: the forward command that minimizes the error. */
export const bestCommand = ({ xinit, yinit, θinit, xGoal, yGoal }) =>
  Total(xinit.map((x, i) => (xGoal[i] - x) * Cos(θinit[i]) + (yGoal[i] - yinit[i]) * Sin(θinit[i]))) / xinit.length;

/** The Manipulate variables saved in the notebook (its "specs": n = 2 and the positions drawn at publication). */
export const SAVED = Object.freeze({
  n: 2, nold: 2, vin: 0,
  θinit: [-1.1817563603419359, 1.0809739284172863],
  xinit: [7.5207903382145105, -3.759919324172401],
  yinit: [4.733755422165956, 5.036397078624361],
  xGoal: [10, -10],
  yGoal: [0, 0],
  xpath: [[7.5207903382145105, -3.759919324172401]],
  ypath: [[4.733755422165956, 5.036397078624361]],
});
export const initialState = () => structuredClone({ ...SAVED });

/** If[nold != n, …]: new random headings and positions, goals on the circle, paths reset (the body's assignments). */
export function rerandomize(state, rng) {
  const { n } = state;
  const θinit = RandomReal([-Pi, Pi], n, rng);
  const xinit = RandomReal([-r, r], n, rng);
  const yinit = RandomReal([-r, r], n, rng);
  return { ...state, nold: n, θinit, xinit, yinit, ...goalsOf(n), xpath: [xinit], ypath: [yinit] };
}

/** Button["turn counter-clockwise", …]: move by vin, append to the paths, vin = 0, turn by π/3 + RandomReal[{0, π/3}]. */
export function turnCounterClockwise(s, rng) {
  s.xinit = s.xinit.map((x, i) => x + s.vin * Cos(s.θinit[i]));
  s.yinit = s.yinit.map((y, i) => y + s.vin * Sin(s.θinit[i]));
  s.xpath = [...s.xpath, s.xinit];
  s.ypath = [...s.ypath, s.yinit];
  s.vin = 0;
  const turn = RandomReal([0, Pi / 3], s.n, rng);
  s.θinit = s.θinit.map((t, i) => t + Pi / 3 + turn[i]);
  return s;
}

export function evaluate(state0, { rng } = {}) {
  const state = state0.nold !== state0.n ? rerandomize(state0, rng) : state0;
  const { n, vin, θinit, xinit, yinit, xGoal, yGoal, xpath, ypath } = state;
  const distBest = bestCommand(state);
  const robots = Table((k) => {
    const i = k - 1, c = Cos(θinit[i]), s = Sin(θinit[i]);
    return Annotation([Hue(k / n),
      [Opacity(0.3), Thick, Line(Transpose([xpath.map((p) => p[i]), ypath.map((p) => p[i])]))],
      Disk([xGoal[i], yGoal[i]], r / 20),
      [Dashed, Line([[xinit[i] - 1.1 * r * c, yinit[i] - 1.1 * r * s], [xinit[i] + 1.1 * r * c, yinit[i] + 1.1 * r * s]])],
      [Opacity(0.3), DrawRobot(xinit[i], yinit[i], θinit[i])],
      DrawRobot(xinit[i] + vin * c, yinit[i] + vin * s, θinit[i]),
    ], `robot-${k}`);
  }, [1, n]);
  const field = Graphics([Annotation([White, Rectangle([-1.1 * r, -1.1 * r], [1.1 * r, 1.1 * r])], 'workspace'), robots],
    { ImageSize: 360, PlotRange: [[-1.3 * r, 1.3 * r], [-1.3 * r, 1.3 * r]], PlotRangePadding: 0, label: 'Robots, their paths, headings and goals' });
  const errBest = meanSquaredError(state, distBest), errIn = meanSquaredError(state, vin);
  const Epilog = [PointSize('Large'),
    Red, Annotation(Line([[distBest, 0], [distBest, 10 ** 12]]), 'best-line'),
    Annotation(Point([distBest, errBest]), 'best-point'),
    Blue, Annotation(Point([vin, errIn]), 'command-point')];
  // the Epilog's red line reaching up to 10^12 is clipped at the plot range, as in Mathematica (PlotRangeClipping)
  const plot = Plot((v) => meanSquaredError(state, v), [-r, r], {
    ImageSize: [220, 300], PlotStyle: Thick, AspectRatio: 2, Epilog,
    Frame: [true, true, false, false], FrameLabel: ['forward command', 'sum squared error'],
    label: 'Mean squared error against the forward command',
  });
  return {
    state,
    view: { n, distBest, errBest, errIn, plotRange: plot.options.PlotRange,
      moved: xinit.map((x, i) => [x + vin * Cos(θinit[i]), yinit[i] + vin * Sin(θinit[i])]) },
    graphics: [field, Graphics([Annotation(plot.list, 'error-plot')], plot.options)],
  };
}
