// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Victor S. Frost
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/gaussian-autocorrelation-conditional/main.js — the page: the original's Manipulate (shared/manipulate.js) with
// ControlPlacement -> Top: the row of three sliders and the setter of the autocorrelation function; the Grid of the four
// plots (Frame -> All) as six pictures in a 2 × 2 grid of cells.
import { Manipulate, Row, Rule } from '../../shared/manipulate.js';
import { Row as RowG, Style, Italic, Subscript, Superscript } from '../../shared/graphics.js';
import { initialState, evaluate } from './model.js';

const ti = (s) => Style(s, Italic);

Manipulate({
  name: 'gaussian-autocorrelation-conditional',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: [
    { id: 'rplot', testid: 'rplot-svg', label: 'Correlation coefficient against the lag' },
    { id: 'psd', testid: 'psd-svg', label: 'Power spectral density' },
    { id: 'pplot', testid: 'pplot-svg', label: 'Conditional probability against the lag' },
    { id: 'pplot-legend', PlotRange: [[0, 270], [0, 44]], PlotRangePadding: 0, ImageSize: [270, 44], testid: 'legend-svg', label: 'Legend of the conditional probability plot' },
    { id: 'pdf', testid: 'pdf-svg', label: 'Conditional probability density' },
    { id: 'pdf-text', PlotRange: [[0, 270], [0, 48]], PlotRangePadding: 0, ImageSize: [270, 48], testid: 'pdf-text-svg', label: 'Conditional expected value, variance and probability' },
  ],
  controls: [
    Row([
      // Control@{{t, 0.05, "lag τ"}, 0.0001, 1.1, .001, Appearance -> "Labeled", ImageSize -> Tiny}
      [['t', 0.05, 'lag τ'], 0.0001, 1.1, 0.001, { Appearance: 'Labeled', ImageSize: 'Tiny' }],
      [['y', 1, ti('y')], -4, 4, 0.1, { Appearance: 'Labeled', ImageSize: 'Tiny' }],
      [['L', 1, RowG(['threshold ', ti('L')])], -4, 4, 0.05, { Appearance: 'Labeled', ImageSize: 'Tiny' }],
    ], { name: 'sliders' }),
    // {{fun, f1, "autocorrelation function R_XX(τ) = "}, {f1 -> …, f2 -> …, f3 -> …}}
    [['fun', 'f1', RowG(['autocorrelation function ', Subscript(ti('R'), 'XX'), '(τ) = '])], [
      Rule('f1', '10 sinc(10πτ) correlation time=0.1'),
      Rule('f2', '10 tri(τ) correlation time=1.0'),
      Rule('f3', RowG(['10 ', Superscript(ti('e'), '−10|τ|'), ' correlation time=0.2'])),
    ]],
  ],
});
