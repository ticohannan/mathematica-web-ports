// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/lowpass-filter-design/model.js — "Lowpass Filter Design by Pole Placement": one evaluation of the Manipulate
// body, the state in, { state, view, graphics } out (pure, no DOM). Simple mode: shared/wl.js, shared/plot.js, plain
// arithmetic (the magnitude of the transfer function in closed form).
import { Graphics, Line, Red, Thick, Row, Style, Italic, Subscript, Fraction, Annotation, Dashed } from '../../shared/graphics.js';
import { HeavisidePi, Cos, Sin, Pi, Ceiling } from '../../shared/wl.js';
import { Plot, ListPlot } from '../../shared/plot.js';

export const TYPES = Object.freeze(['vertical line', 'triangle', 'Butterworth', 'elliptical', 'manual']);
export const initialState = () => ({ type: 'vertical line', n: 3, α: -1, p: [[-1, -1], [-1, 1]] });

/** The imaginary parts of the vertical line and the triangle: equally spaced from −1 to 1 (0 for one pole). */
const imV = (i, n) => (n === 1 ? 0 : ((i - 1) * 2) / (n - 1) - 1);
/** The poles of type (F-LF-05), i = 1 … n; θ = π/n. "manual" and unknown types: none (the body takes p). */
export function polesOf(type, n, α) {
  const θ = Pi / n, idx = Array.from({ length: n }, (_, k) => k + 1);
  switch (type) {
    case 'triangle': return idx.map((i) => { const v = imV(i, n); return [α * (1 - Math.abs(v) * 0.95), v]; });
    case 'vertical line': return idx.map((i) => [α, imV(i, n)]);
    case 'Butterworth': return idx.map((i) => [Cos(Pi / 2 + (i - 1 / 2) * θ), Sin(Pi / 2 + (i - 1 / 2) * θ)]);
    case 'elliptical': return idx.map((i) => [-α * Cos(Pi / 2 + (i - 1 / 2) * θ), Sin(Pi / 2 + (i - 1 / 2) * θ)]);
    default: return null;
  }
}
/** |H(ω)| = Π 1/|jω − p_k| for poles p_k = {Re, Im} (Hfilter[ω] = Times @@ Table[1/(I ω − p[[i, 1]] − I p[[i, 2]]), …]). */
export const absH = (poles, ω) => poles.reduce((h, [re, im]) => h / Math.hypot(re, ω - im), 1);

/**
 * The body's assignments (F-LF-04, F-LF-05): p = {{α, 0}} when empty; in "manual" the poles are p, n = Length[p] and
 * α = the smallest real part; otherwise p = the computed poles (the invisible locators follow them, Q-LF-02).
 */
export function poleState({ type, n, α, p }) {
  if (p.length < 1) p = [[α, 0]];
  if (type === 'manual') return { type, poles: p, n: p.length, α: Math.min(...p.map((q) => q[0])), p };
  const poles = polesOf(type, n, α) ?? p;
  return { type, poles, n, α, p: poles };
}
/** s = Max[|H(0)|, |H(1)|, |H(Im p_⌈n/2⌉)|] (F-LF-06; E-LF-03). */
export const scaleOf = (poles, n) => Math.max(absH(poles, 0), absH(poles, 1), absH(poles, poles[Ceiling(n / 2) - 1][1]));

// ---- the two plots (F-LF-07, F-LF-08) -------------------------------------------------------------------------
const ωc = Subscript(Style('ω'), 'c');
const half = Fraction('1', '2');
const X_TICKS = [[-2, Row(['−2', ωc])], [-3 / 2, Row(['−', Fraction('3', '2'), ωc])], [-1, Row(['−', ωc])], [-1 / 2, Row(['−', half, ωc])]];
const Y_TICKS = [[-1, Row(['−', Style('j', Italic), ' ', ωc])], [-1 / 2, Row(['−', half, Style('j', Italic), ' ', ωc])],
  [1 / 2, Row([half, Style('j', Italic), ' ', ωc])], [1, Row([Style('j', Italic), ' ', ωc])]];
const Ω_TICKS = [[-2, Row(['−2', ωc])], [-1, Row(['−', ωc])], [1, ωc], [2, Row(['2', ωc])]];
/** PlotMarkers -> {Graphics[{Red, Thick, Line[{{-0.5, -0.5}, {0.5, 0.5}}], Line[{{-0.5, 0.5}, {0.5, -0.5}}]}], 0.06} */
const CROSS = Graphics([Red, Thick, Line([[-0.5, -0.5], [0.5, 0.5]]), Line([[-0.5, 0.5], [0.5, -0.5]])]);
const H_LABEL = Row(['|', Style('H', Italic), '(ω)|']);

/** The largest plotted magnitude |H(ω)|/s on −2.5 … 2.5 (a grid of 5001 points; for tests and E-LF-03). */
export const peakOf = (poles, s) => { let m = 0; for (let k = 0; k <= 5000; k++) m = Math.max(m, absH(poles, -2.5 + k / 1000) / s); return m; };

/** The Manipulate body. */
export function evaluate(state) {
  const { type, poles, n, α, p } = poleState(state);
  const s = scaleOf(poles, n);
  const polePlot = ListPlot(poles, {
    AspectRatio: 1, PlotRange: [[-2.1, 0.2], [-1.1, 1.1]], PlotMarkers: [CROSS, 0.06], ImageSize: [220, 350],
    Ticks: [X_TICKS, Y_TICKS], ImagePadding: [[34, 8], [18, 8]], label: 'The poles in the complex plane',
  });
  // the ideal filter jumps at ω = ±1 (D-LF-01): dashed vertical lines, as ExclusionsStyle -> Dashed draws them
  const magnitude = Plot((ω) => [HeavisidePi(ω / 2), absH(poles, ω) / s], [-2.5, 2.5], {
    PlotRange: 'All', AxesLabel: ['ω', H_LABEL], ImageSize: [350, 350], Exclusions: [-1, 1], ExclusionsStyle: Dashed,
    Ticks: [Ω_TICKS, 'Automatic'], label: 'The magnitude response and the ideal lowpass filter',
  });
  return {
    state: { ...state, type, n, α, p },
    view: { type, n, α, poles, s, peak: peakOf(poles, s) },
    graphics: [
      Graphics([Annotation(polePlot.list, 'pole-plot')], polePlot.options),
      Graphics([Annotation(magnitude.list, 'magnitude-plot')], magnitude.options),
    ],
  };
}
