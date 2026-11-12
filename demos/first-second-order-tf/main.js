// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann, Adam J. Johnston and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/first-second-order-tf/main.js — the page: the original's Manipulate (shared/manipulate.js): a Grid of controls
// above the plot (the popup menu, then rows of two sliders); ζ is shown only for SOPDT (PaneSelector).
import { Manipulate, Rule, PopupMenu, Row } from '../../shared/manipulate.js';
import { Style, Italic } from '../../shared/graphics.js';
import { initialState, evaluate, MODELS } from './model.js';

const S = { Appearance: 'Labeled', ImageSize: 'Small' };
Manipulate({
  name: 'first-second-order-tf',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: { id: 'graphic' },
  controls: [
    [['tab', 1, 'transfer function model'], MODELS.map(([v, l]) => Rule(v, l)), { ControlType: PopupMenu }],
    Row([
      [['τ', 7, 'time constant, τ'], 1, 10, 0.1, S],
      [['k', 10, Row(['process gain, ', Style('K', Italic)])], 1, 13, 1, S],
    ], { name: 'first' }),
    Row([
      [['θ', 2, 'dead time, θ'], 1, 10, 0.1, S],
      [['ζ', 0.2, 'damping coefficient, ζ'], -0.05, 2, 0.05, { ...S, Visible: (s) => s.tab === 2 }],
    ], { name: 'second' }),
  ],
});
