// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Victor S. Frost
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/gaussian-autocorrelation-conditional/model.js — "Linking Autocorrelation of Gaussian Random Process to
// Conditional Probabilities": one evaluation of the Manipulate body, the state in, { view, graphics } out (pure, no
// DOM). Simple mode: the original's four plots of the Grid (correlation coefficient, power spectral density,
// conditional probability with its legend, conditional pdf with its three lines of numbers) as six pictures.
import { Annotation, Text, Row, Style, Italic, Subscript, Line, Red, Black, AbsoluteThickness, FontSize } from '../../shared/graphics.js';
import { Plot, ColorData } from '../../shared/plot.js';
import { Erf } from '../../shared/wl.js';
import { numberFormString } from '../../shared/number-form.js';

export const initialState = () => ({ fun: 'f1', t: 0.05, y: 1, L: 1 });

/** Sinc[x] = Sin[x]/x, Sinc[0] = 1. */
export const Sinc = (x) => (x === 0 ? 1 : Math.sin(x) / x);
/** UnitTriangle[x] = 1 − |x| for |x| ≤ 1, else 0. */
export const UnitTriangle = (x) => Math.max(0, 1 - Math.abs(x));

/** The three autocorrelation functions of the setter and their power spectral densities (the original's PSD[f]). */
export const FUNCTIONS = Object.freeze({
  f1: Object.freeze({ R: (t) => 10 * Sinc(10 * Math.PI * t), psd: (f) => 0.5 * (Math.sign(5 - f) + Math.sign(5 + f)), label: '10 sinc(10πτ) correlation time=0.1' }),
  f2: Object.freeze({ R: (t) => 10 * UnitTriangle(t), psd: (f) => 10 * Sinc(f * Math.PI) ** 2, label: '10 tri(τ) correlation time=1.0' }),
  f3: Object.freeze({ R: (t) => 10 * Math.exp(-10 * Math.abs(t)), psd: (f) => 5.06605918211689 / (2.533029591058445 + f ** 2), label: '10 e^(−10|τ|) correlation time=0.2' }),
});

/** Q[z] = Probability[x > z, x ~ NormalDistribution[0, 1]] = Erfc[z/√2]/2. */
export const Q = (z) => 0.5 * (1 - Erf(z / Math.SQRT2));
/** PDF[NormalDistribution[μ, σ], x]. */
export const normalPdf = (mu, sigma) => (x) => Math.exp(-(((x - mu) / sigma) ** 2) / 2) / (sigma * Math.sqrt(2 * Math.PI));

/** The conditional statistics of X(t + τ) | X(t) = y at the lag τ. */
export function conditional({ fun, t, y, L }) {
  const R = FUNCTIONS[fun].R, varx = R(0);
  const rho = R(t) / varx;
  const mean = rho * y;
  const variance = varx * (1 - rho ** 2);
  const sd = Math.sqrt(variance);
  return { varx, rho, mean, variance, sd, probability: Q((L - mean) / sd), unconditional: Q(L / Math.sqrt(varx)) };
}

const ti = (s) => Style(s, Italic);
/** NumberForm[Chop[x], 4] as printed: four significant digits, trailing zeros dropped. */
export const nf4 = (x) => (Math.abs(x) < 1e-10 ? '0' : numberFormString(x, 4, { minus: '\u2212' })); // Chop gives the exact 0
const FRAME = { Frame: true, GridLines: 'Automatic', ImageSize: [270, 190] };

export function evaluate(state) {
  const { fun, y, L } = state;
  const F = FUNCTIONS[fun];
  const c = conditional(state);
  const R = F.R, varx = c.varx;
  const condMean = (tau) => (R(tau) / varx) * y;
  const condSd = (tau) => Math.sqrt(varx * (1 - (R(tau) / varx) ** 2));
  // Plot[R(t)/varx, {t, 0.00001, 1.1}, …]
  const rplot = Plot((tau) => R(tau) / varx, [0.00001, 1.1], {
    ...FRAME, PlotLabel: 'correlation coefficient', FrameLabel: ['lag τ', 'ρ(τ)'], PlotRange: [[0, 1.1], [-0.3, 1]],
  });
  // Plot[PSD[f], {f, -6, 6}, ExclusionsStyle -> Automatic, PlotRange -> All]
  const psd = Plot(F.psd, [-6, 6], {
    ...FRAME, PlotRange: 'All', PlotLabel: ' power spectral density',
    FrameLabel: [Row(['frequency ', ti('f')]), Row([Subscript(ti('S'), ti('X')), '(', ti('f'), ')'])],
    ...(fun === 'f1' ? { Exclusions: [-5, 5], ExclusionsStyle: [ColorData(97, 1), AbsoluteThickness(1.6)] } : {}),
  });
  const condLabel = Row([ti('P'), '(', ti('X'), '(', ti('t'), '+τ)>', ti('L'), '|', ti('X'), '(', ti('t'), ')=', ti('y'), ')']);
  // Plot[{Q[L/√varx], Q[(L − ρ y)/√(varx (1 − ρ²))]}, {t, 0, 1.1}, …]: the second is 0/0 at t = 0 (not drawn there)
  const pplot = Plot([() => c.unconditional, (tau) => Q((L - condMean(tau)) / condSd(tau))], [0, 1.1], {
    ...FRAME, PlotLabel: 'conditional probability', FrameLabel: ['lag τ', condLabel], PlotRange: [[0, 1.1], [0, 1]],
  });
  const legendG = [
    // LineLegend placed Below the plot, LabelStyle -> {FontSize -> 10}; coordinates in px of a 270 × 44 picture
    FontSize(10),
    ColorData(97, 1), AbsoluteThickness(1.6), Annotation(Line([[12, 32], [32, 32]]), 'legend-line-1'),
    Black, Annotation(Text(Row([ti('P'), '(', ti('X'), '(', ti('t'), '+τ)>', ti('L'), ') assuming ', ti('X'), '(', ti('t'), ') and ', ti('X'), '(', ti('t'), '+τ) SI']), [38, 32], [-1, 0]), 'legend-1'),
    ColorData(97, 2), Annotation(Line([[12, 12], [32, 12]]), 'legend-line-2'),
    Black, Annotation(Text(condLabel, [38, 12], [-1, 0]), 'legend-2'),
  ];
  // Plot[{PDF[…, x], UnitStep[L − x] PDF[…, x]}, {x, -7, 7}, Filling -> {1 -> {2}}, Epilog -> {Red, Line[{{L, 0}, {L, 10}}]}]
  const pdf = normalPdf(c.mean, c.sd);
  const pdfPlot = Plot([pdf, (x) => (L - x >= 0 ? 1 : 0) * pdf(x)], [-7, 7], {
    ...FRAME, Filling: { 1: [2] }, PlotRange: 'All', PlotLabel: 'conditional pdf', Exclusions: [L],
    ExclusionsStyle: [ColorData(97, 2), AbsoluteThickness(1.6)],
    FrameLabel: [ti('x'), Row([Subscript(ti('f'), ti('X')), '(', ti('X'), '(', ti('t'), '+τ)>', ti('L'), '|', ti('X'), '(', ti('t'), ')=', ti('y'), ')'])],
    Epilog: [Red, Annotation(Line([[L, 0], [L, 10]]), 'threshold-line')],
  });
  const lines = {
    mean: `conditional expected value = ${nf4(c.mean)}`,
    variance: `conditional variance = ${nf4(c.variance)}`,
    probability: `conditional probability = ${nf4(c.probability)}`,
  };
  // the Grid's three rows of text (BaseStyle -> 10), in px of a 270 × 48 picture
  const textG = [
    FontSize(10),
    Annotation(Text(lines.mean, [135, 40]), 'text-mean'),
    Annotation(Text(lines.variance, [135, 25]), 'text-variance'),
    Annotation(Text(lines.probability, [135, 10]), 'text-probability'),
  ];
  const view = { ...c, lines, psdAt0: F.psd(0) };
  return { view, graphics: [rplot, psd, pplot, legendG, pdfPlot, textG] };
}
