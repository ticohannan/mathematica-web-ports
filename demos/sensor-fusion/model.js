// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/sensor-fusion/model.js — one evaluation of the Manipulate body of "Sensor Fusion with Normally Distributed
// Noise": the state in, { view, graphics } out (pure, no DOM). Simple mode: plain arithmetic.
import { Graphics, RGBColor, Dashed, Purple, Annotation } from '../../shared/graphics.js';
import { Plot, ListPlot, Show } from '../../shared/plot.js';
import { PDF, NormalDistribution, Sqrt, Pi, Table } from '../../shared/wl.js';

/** {rg, 10, None}: the half-width of the measurement axis. */
export const rg = 10;
/** {MyColors, {…}, None}: the four measurement colours (ColorData[97]'s first four), as RGB triples. */
export const MY_COLORS = [
  [0.368417, 0.506779, 0.709798], [0.880722, 0.611041, 0.142051],
  [0.560181, 0.691569, 0.194885], [0.922526, 0.385626, 0.209179],
];
/** Mathematica's default plot width; the legend outside is added to it (the snapshots are about 545 px wide). */
export const IMAGE_SIZE = 360;
/** The Manipulate's initial settings (the notebook's stored "Variables"). */
export const initialState = () => ({
  rg, MyColors: MY_COLORS.map((c) => [...c]), u: 2,
  σSq1: 5, σSq2: 10, σSq3: 10, σSq4: 10,
  z1: [2, 0], z2: [4, 0], z3: [6, 0], z4: [8, 0],
});

/**
 * The scalar Kalman filter of the body: start from measurement 1, then for n = 2 … u
 *   k = σEst/(σSq[[n]] + σEst); zEst += k (z[[n]] − zEst); σEst = (1 − k) σEst.
 * Returns { zEst, σEst (a variance), gains: [k2, …] }.
 */
export function fuse(z, σSq, u) {
  let zEst = z[0], σEst = σSq[0];
  const gains = [];
  for (let n = 2; n <= u; n++) {
    const k = σEst / (σSq[n - 1] + σEst);
    zEst = zEst + k * (z[n - 1] - zEst);
    σEst = (1 - k) * σEst;
    gains.push(k);
  }
  return { zEst, σEst, gains };
}

/** Manipulate[Module[{σSq, z, zEst, σEst, n, k}, For[…]; Show[Plot[…], ListPlot[…]]], …] */
export function evaluate(state) {
  const { u } = state;
  const range = state.rg ?? rg;
  const colors = (state.MyColors ?? MY_COLORS).map((c) => RGBColor(...c));
  const σSq = [state.σSq1, state.σSq2, state.σSq3, state.σSq4];
  const z = [state.z1[0], state.z2[0], state.z3[0], state.z4[0]];
  const { zEst, σEst, gains } = fuse(z, σSq, u);
  const ns = Table((n) => n, [1, u]);
  const plot = Plot((x) => [...ns.map((n) => PDF(NormalDistribution(z[n - 1], Sqrt(σSq[n - 1])), x)), PDF(NormalDistribution(zEst, Sqrt(σEst)), x)],
    [-range, range], {
      Filling: 0,
      PlotStyle: [...ns.map((n) => [colors[n - 1]]), [Dashed, Purple]],
      PlotLegends: [...ns.map((n) => `measurement ${n}`), 'combined\n\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0estimate'],
      PlotRange: ['All', [0, 1]],
      FrameLabel: ['measurement value(s)\nDrag locators to change measurements', 'probability'],
      Frame: [true, true, false, false], AxesOrigin: [-range, 0],
      ImageSize: IMAGE_SIZE, testid: 'scene-svg', label: 'probability densities of the measurements and of the combined estimate',
    });
  // the peak of measurement n: 1/(Sqrt[2 π] Sqrt[σSq[[n]]])
  const peaks = ns.map((n) => 1 / (Sqrt(2 * Pi) * Sqrt(σSq[n - 1])));
  const stems = ListPlot(ns.map((n) => [[z[n - 1], peaks[n - 1]]]), { Filling: 0, PlotStyle: ns.map((n) => [colors[n - 1]]) });
  const shown = Show(plot, stems);
  const graphics = Graphics([Annotation(shown.list[0], 'curves'), Annotation(shown.list[1], 'peaks')], shown.options);
  return {
    view: { u, z: z.slice(0, u), σSq: σSq.slice(0, u), zEst, σEst, gains, peaks, estimatePeak: 1 / Sqrt(2 * Pi * σEst) },
    graphics,
  };
}
