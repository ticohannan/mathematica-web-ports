// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Carsten Roppel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/harmonic-distortion/model.js — "Harmonic Distortion of Nonlinear Transfer Function": one evaluation of the
// Manipulate body, the state in, { view, graphics } out (pure, no DOM). Simple mode: shared/numeric.js Fourier,
// shared/plot.js ListPlot.
import { Graphics, Annotation, RGBColor } from '../../shared/graphics.js';
import { ListPlot } from '../../shared/plot.js';
import { Fourier } from '../../shared/numeric.js';
import { Abs } from '../../shared/complex.js';
import { isCorrected } from '../../shared/errata.js';

export const initialState = () => ({ c1: 0, c2: 0, clipping: false, level: 0.8, scale: 1 });

// Initialization: nbr = 4096; f0 = 1000; fs = 16000; x = Table[Sin[2 π f0 i], {i, 0, (nbr − 1)/fs, 1/fs}]
export const NBR = 4096, F0 = 1000, FS = 16000;
export const X = Object.freeze(Array.from({ length: NBR }, (_, k) => Math.sin(2 * Math.PI * F0 * (k / FS))));

/** y = x + c1 x² + c2 x³, then Clip[y, {−level, level}] when clipping is on. */
export const output = ({ c1, c2, clipping, level }) => X.map((x) => {
  const y = x + c1 * x * x + c2 * x * x * x;
  return clipping ? Math.min(level, Math.max(-level, y)) : y;
});
/**
 * spectrum = (2/nbr) Take[Abs[Fourier[z, FourierParameters -> {1, −1}]], nbr/2]. The corrected mode (E-HD-01) scales
 * the DC bin by 1/nbr: the mean of z, not twice it.
 */
export function spectrum(z, corrected = false) {
  const F = Fourier(z, { FourierParameters: [1, -1] });
  return F.slice(0, NBR / 2).map((c, k) => ((k === 0 && corrected ? 1 : 2) / NBR) * Abs(c));
}
// t = Table[t, {t, 0, 80/fs, 1/fs}] (81 times); f = Table[f, {f, 0, fs (nbr − 1)/(2 nbr), fs/nbr}] (2048 frequencies)
export const T = Object.freeze(Array.from({ length: 81 }, (_, k) => k / FS));
export const FREQ = Object.freeze(Array.from({ length: NBR / 2 }, (_, k) => (k * FS) / NBR));

/** The Manipulate body: GraphicsColumn[{time plot, spectrum plot}]. */
export function evaluate(state) {
  const z = output(state);
  const corrected = isCorrected(state);
  const sp = spectrum(z, corrected);
  const shown = state.scale === 1 ? sp : sp.map((v) => 20 * Math.log10(v + 2e-5));
  const time = ListPlot(T.map((t, k) => [t, z[k]]), {
    PlotRange: [-2, 2], Joined: true, PlotStyle: [[RGBColor(0, 0, 1)]], Frame: true, FrameLabel: ['time[s]'], PlotLabel: 'signal', FrameTicks: ['Automatic', { major: 1, minor: 0.2 }],
    AspectRatio: 0.4, ImageSize: 400, label: 'The output signal',
  });
  const freq = ListPlot(FREQ.map((f, k) => [f, shown[k]]), {
    Joined: true, Frame: true, Axes: true, PlotRange: state.scale === 1 ? [-0.1, 1.5] : [-100, 3],
    FrameLabel: ['frequency[Hz]'], PlotLabel: 'magnitude spectrum (DFT)',
    FrameTicks: ['Automatic', state.scale === 1 ? { major: 0.5, minor: 0.1 } : { major: 20, minor: 5 }], AspectRatio: 0.4, ImageSize: 400,
    label: 'The magnitude spectrum',
  });
  const harmonics = [1, 2, 3, 4, 5].map((h) => sp[(h * F0 * NBR) / FS]);
  return {
    view: { dc: sp[0], harmonics, peak: Math.max(...z), trough: Math.min(...z), corrected },
    graphics: [
      Graphics([Annotation(time.list, 'signal-plot')], time.options),
      Graphics([Annotation(freq.list, 'spectrum-plot')], freq.options),
    ],
  };
}
