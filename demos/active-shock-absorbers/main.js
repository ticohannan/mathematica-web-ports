// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Enrique Zeleny
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/active-shock-absorbers/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on the
// left; three pictures: the absorber and the phase plane side by side, y(t) below them.
import { Manipulate, Rule, PopupMenu } from '../../shared/manipulate.js';
import { Style, Italic, Subscript, Row } from '../../shared/graphics.js';
import { initialState, evaluate, DAMPING_LABELS } from './model.js';

const T = { Appearance: 'Labeled', ImageSize: 'Tiny' };
Manipulate({
  name: 'active-shock-absorbers',
  initial: initialState,
  body: evaluate,
  graphics: [{ id: 'graphic' }, { id: 'graphic2' }, { id: 'graphic3' }],
  controls: [
    [['f', 2, 'γ'], DAMPING_LABELS.map(([v, l]) => Rule(v, l)), { ControlType: PopupMenu, ImageSize: 'Small' }],
    [['y0', 0.1, Subscript(Style('y', Italic), '0')], 0.1, 1, 0.001, T],
    [['yp0', 0.2, Row([Subscript(Style('y', Italic), '0'), '′'])], 0, 1, 0.001, T],
    [['m', 0.1, Style('m', Italic)], 0.1, 5, 0.01, T],
    [['k', 1, Style('k', Italic)], 0.1, 10, 0.01, T],
    [['tf', 35, Style('t', Italic)], 1, 50, 0.01, T],
  ],
});
