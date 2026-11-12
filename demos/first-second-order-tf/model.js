// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann, Adam J. Johnston and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/first-second-order-tf/model.js — "First- and Second-Order Transfer Functions": one evaluation of the Manipulate
// body, the state in, { view, graphics } out (pure, no DOM). Simple mode: shared/control.js TransferFunctionModel and
// OutputResponse (dead time Exp[−θ s]), shared/plot.js Plot.
import {
  Graphics, Annotation, Line, Text, Style, Row, Superscript, Italic, Inset, Rectangle, Arrow, Arrowheads, EdgeForm, FaceForm,
  GrayLevel, Black, Blue, White, Purple, Thick, Dashed, RGBColor,
} from '../../shared/graphics.js';
import { Plot } from '../../shared/plot.js';
import { TransferFunctionModel, OutputResponse, Signal } from '../../shared/control.js';
import { NumberForm } from '../../shared/number-form.js';

export const MODELS = Object.freeze([[1, ' first order plus dead time (FOPDT)'], [2, ' second order plus dead time (SOPDT)']]);
export const initialState = () => ({ tab: 1, τ: 7, k: 10, θ: 2, ζ: 0.2 });

const I = (s) => Style(s, Italic);
const GREEN = RGBColor(0, 0.6, 0), MAGENTA = RGBColor(1, 0, 1);
/** Gp = K e^(−θ s)/(τ s + 1) or K e^(−θ s)/(τ² s² + 2 ζ τ s + 1). */
export const plantOf = ({ tab, τ, k, θ, ζ }) => (tab === 1
  ? TransferFunctionModel([k], [1, τ], { delay: θ })
  : TransferFunctionModel([k], [1, 2 * ζ * τ, τ * τ], { delay: θ }));
/** response = OutputResponse[system, 1, {t, 0, 100}]: the response to a unit step. */
export const responseOf = (s) => OutputResponse(plantOf(s), Signal.step(1));

/** The block diagram (the original's `block`): five boxes and arrows, ImageSize {560, 75}, AspectRatio -> Full. */
export function blockDiagram(tab, size = 560) {
  const w1 = 0.75, w2 = 2.1, w3 = 1.15, h = 1;
  // AspectRatio -> Full stretches {0 … 7.4} × {0 … 1} to 560 × 75 px: y is scaled by 75/560 · 7.4 so the drawing keeps
  // those proportions in a picture with equal units
  const W = 4 * w1 + w2 + 2 * w3, ky = (75 / 560) * W, Y = (y) => y * ky, P = ([x, y]) => [x, Y(y)];
  const T = (expr, pos, off) => Text(Style(expr, 17, ...(off ? [{ Background: White }] : [])), P(pos), off);
  const fracY = Y(h / 2);
  const den = tab === 1 ? Row(['τ ', I('s'), ' + 1']) : Row(['(τ ', I('s'), ')²', ' + 2 ζ τ ', I('s'), ' + 1']);
  return Graphics([
    Thick,
    Arrow([P([0, h / 2]), P([w1, h / 2])]), Arrow([P([w1 + w3, h / 2]), P([2 * w1 + w3, h / 2])]),
    Arrow([P([2 * w1 + w2 + w3, h / 2]), P([3 * w1 + w2 + w3, h / 2])]), Arrow([P([3 * w1 + w2 + 2 * w3, h / 2]), P([4 * w1 + w2 + 2 * w3, h / 2])]),
    [EdgeForm([Thick]), FaceForm(GrayLevel(0.8)), Rectangle(P([w1, 0]), P([w1 + w3, h])), Rectangle(P([2 * w1 + w3, 0]), P([2 * w1 + w2 + w3, h])),
      Rectangle(P([3 * w1 + w2 + w3, 0]), P([3 * w1 + w2 + 2 * w3, h]))],
    T('step = 1', [w1 / 2, h / 2], [0.1, -1.5]),
    T('ℒ(1)', [w1 + w3 / 2, h / 2]),
    T(Row(['1/', I('s')]), [1.5 * w1 + w3, h / 2], [0, -1.5]),
    // K e^(−θ s) over the denominator: a built-up fraction (D-FS-02)
    Text(Style(Row([I('K e'), Superscript('', Row(['−θ ', I('s')]))]), 17), [2 * w1 + w3 + w2 / 2, fracY + 0.17], [0, -1]),
    Line([[2 * w1 + w3 + 0.25, fracY], [2 * w1 + w3 + w2 - 0.25, fracY]]),
    Text(Style(den, 17), [2 * w1 + w3 + w2 / 2, fracY - 0.17], [0, 1]),
    T(Row([I('Y'), '(', I('s'), ')']), [2.5 * w1 + w2 + w3, h / 2], [0, -1.5]),
    T(Row([Superscript('ℒ', '−1'), '(', I('Y'), '(', I('s'), '))']), [3 * w1 + w2 + 1.5 * w3, h / 2]),
    T(Row([I('y'), '(', I('t'), ')']), [3.5 * w1 + w2 + 2 * w3, h / 2], [0, -1.5]),
  ], { PlotRange: [[-0.05, W + 0.05], [-0.05 * ky, 1.05 * ky]], ImageSize: size });
}

/** The Manipulate body. */
export function evaluate(state) {
  const { tab, τ, k, θ } = state;
  const response = responseOf(state);
  const step = 1; // OutputResponse[TransferFunctionModel[{{1}}, s], 1, {t, 0, 100}][[1]]
  const τ0 = 0.632 * k;
  const fo = tab === 1 ? [
    [Dashed, MAGENTA, Line([[τ + θ, 0], [τ + θ, τ0], [θ, τ0]]),
      Text(Style(Row(['time constant, τ = ', NumberForm(τ, [3, 1], { exact: Number.isInteger(τ) })]), 17, { Background: White }), [θ + τ, τ0 / 2], [-1.1, 0]),
      Arrowheads([-0.03, 0.03]), Arrow([[θ, τ0 / 2], [θ + τ, τ0 / 2]]),
      Text(Style(Row(['0.632 ', I('K'), ' = ', NumberForm(τ0, [4, 1])]), 17, { Background: White }), [τ + θ, τ0], [-0.5, -1.2])],
  ] : [];
  const plot = Plot(response, [0, 100], {
    PlotStyle: [[Thick, Black]], PlotRange: [[-1, 100], [0, 20]], PlotRangePadding: [0, 0.01], Frame: true,
    FrameLabel: [Row(['dimensionless time ', I('t')]), Row(['time‐domain response ', I('y'), '(', I('t'), ')'])],
    LabelStyle: [17, Black], ImageSize: 605, AspectRatio: 380 / 605,
    Epilog: [
      [Thick, Blue, Line([[0, 0], [θ, 0], [θ, step], [100, step]])],
      [Dashed, GREEN, Line([[0, k], [100, k]]), Purple, Line([[θ, 0], [θ, 20]])],
      ...fo,
      Text(Style('step input = 1', 17, Blue), [50, step], [0, -1.2]),
      Text(Style(Row(['gain ', I('K'), ' = ', String(k)]), 17, GREEN, { Background: White }), [75, k], [0, -1.2]),
      Text(Style(Row(['dead time θ = ', NumberForm(θ, [4, 1], { exact: Number.isInteger(θ) })]), 17, Purple, { Background: White }), [θ, 13.5], [-1.1, 0]),
      Inset(blockDiagram(tab, 520), [50, 17.5]), // 560 px in the original: there the plot area is about as wide (D-FS-03)
    ],
    label: 'The step response',
  });
  return {
    view: { y: [10, 25, 50, 99].map((t) => response(t)), τ0, final: response(100) },
    graphics: Graphics([Annotation(plot.list, 'response-plot')], plot.options),
  };
}
