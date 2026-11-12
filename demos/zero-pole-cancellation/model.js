// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Hugo Tadashi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/zero-pole-cancellation/model.js — "Zero-Pole Cancellation in Transfer Functions": one evaluation of the
// Manipulate body, the state in, { view, graphics } out (pure, no DOM). Simple mode: shared/control-plots.js
// RootLocusPlot.
import { Graphics, Annotation } from '../../shared/graphics.js';
import { RootLocusPlot } from '../../shared/control-plots.js';
import { TransferFunctionModel } from '../../shared/control.js';
import { polyMul } from '../../shared/poly.js';
import { isCorrected } from '../../shared/errata.js';

export const CHOICES = Object.freeze([[1, 'without compensation'], [2, 'precise pole‐zero cancellation'], [3, 'imprecise pole‐zero cancellation']]);
export const initialState = () => ({ gain: 0, tf: 1 });
const den3 = polyMul(polyMul([0.5, 1], [1, 1]), [-0.1, 1]);
/** funcs = {1/((s + 0.5)(s + 1)(s − 0.1)), 1/((s + 0.5)(s + 1)), (s − 0.3)/((s + 0.5)(s + 1)(s − 0.1))} */
export const FUNCS = Object.freeze([
  TransferFunctionModel([1], den3),
  TransferFunctionModel([1], polyMul([0.5, 1], [1, 1])),
  TransferFunctionModel([-0.3, 1], den3),
]);

/** RootLocusPlot[k funcs[[tf]], {k, 0, 1}, PlotRange -> All, AspectRatio -> 1, PoleZeroMarkers -> {Automatic, "ParameterValues" -> gain}]. */
export function evaluate(state) {
  const corrected = isCorrected(state);
  // E-ZP-01: the original's markers at the gain are not drawn (the snapshots at gain 0.628 and 0.634 show none)
  const plot = RootLocusPlot(FUNCS[state.tf - 1], [0, 1], { AspectRatio: 1, ImageSize: 450, ParameterValues: corrected ? [state.gain] : [], label: 'Root locus' });
  return {
    view: { tf: state.tf, gain: state.gain, parameterPoints: corrected ? plot.branches.length : 0, poles: plot.poles, zeros: plot.zeros, ends: plot.branches.map((b) => b.at(-1)), corrected },
    graphics: Graphics([Annotation(plot.list, 'root-locus')], plot.options),
  };
}
