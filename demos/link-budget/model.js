// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Victor S. Frost
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/link-budget/model.js — "Link Budget for Communication Systems": one evaluation of the Manipulate body, the
// state in, { view, graphics } out (pure, no DOM). Simple mode: plain arithmetic, shared/plot.js LogLinearPlot.
import { Graphics, Annotation, Row, Column, Subscript, Style } from '../../shared/graphics.js';
import { LogLinearPlot } from '../../shared/plot.js';
import { NumberForm } from '../../shared/number-form.js';

export const initialState = () => ({ fc: 1000, Dtt: 1, Dr: 1, Pt: 10, n: 2, F: 2, Ta: 290, Be: 2, dmin: 100, dmax: 10000 });

const log10 = Math.log10, π = Math.PI;
/** λ = c/f with c = 3.×10^8 m/s and f = fc MHz (the original's (3.*10^8)/(fc*10^6)). */
export const wavelength = (fc) => 3e8 / (fc * 1e6);
/** Antenna gain in dB: 20 Log10[π D/λ] (a parabolic dish, gain (π D/λ)²). */
export const antennaGain = (D, fc) => 20 * log10((π * D) / wavelength(fc));
/** Path loss in dB: 20 Log10[4π/λ] + 10 n Log10[d]. */
export const pathLoss = (d, fc, n) => 20 * log10((4 * π) / wavelength(fc)) + 10 * n * log10(d);
/** Noise power density in dB: 10 Log10[1.38×10^−23 (Ta + 290 (10^(F/10) − 1))]. */
export const noiseDensity = (Ta, F) => 10 * log10(1.38e-23 * (Ta + 290 * (10 ** (F / 10) - 1)));
/** (S/N) in dB at distance d (m) — the plotted function, term by term as the original writes it. */
export function snr({ fc, Dtt, Dr, Pt, n, F, Ta, Be }, d) {
  return Pt + antennaGain(Dtt, fc) - pathLoss(d, fc, n) + antennaGain(Dr, fc) - 10 * log10(Be * 1e6) - noiseDensity(Ta, F);
}

const SN_LABEL = Subscript('(S/N', Row([')', Style('dB')]));
/** The Manipulate body: LogLinearPlot[…, {d, dmin, dmax}, PlotRange -> All, AxesOrigin -> {0, 0}, …]. */
export function evaluate(state) {
  const { fc, Dtt, Dr, dmin, dmax } = state;
  const gT = antennaGain(Dtt, fc), gR = antennaGain(Dr, fc);
  // the curve is a straight line in Log[d] (−10 n log10 d): its ends are its extremes; Axes -> True with AxesOrigin
  // {0, 0} puts y = 0 into the automatic range (the snapshots' vertical axes all start at 0, D-LB-01)
  const y0 = snr(state, dmin), y1 = snr(state, dmax);
  const lo = Math.min(0, y0, y1), hi = Math.max(0, y0, y1);
  const label = Column([`transmit antenna gain = ${NumberForm(gT, 4)} dB`, `receive antenna gain = ${NumberForm(gR, 4)} dB`]);
  const plot = LogLinearPlot((d) => snr(state, d), [dmin, dmax], {
    PlotRange: ['All', [lo, hi]], PlotRangePadding: [0.02, 0.04], Frame: true, Axes: true, AxesOrigin: [Math.log(dmin), 0],
    GridLines: 'Full', ImageSize: 400, AspectRatio: 350 / 400 * 0.86, PlotLabel: label,
    FrameLabel: ['distance (m)', SN_LABEL], label: 'S/N against distance',
  });
  return {
    view: { gT, gR, snrMin: y0, snrMax: y1, range: [lo, hi] },
    graphics: Graphics([Annotation(plot.list, 'snr-curve')], plot.options),
  };
}
