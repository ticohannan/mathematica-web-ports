// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/even-odd-synthesis/main.js — the page: the original's Manipulate (shared/manipulate.js) with its two plots as
// Graphics data (GraphicsColumn: one above the other).
import { Manipulate, SetterBar, Row } from '../../shared/manipulate.js';
import { Style, Italic } from '../../shared/graphics.js';
import { initialState, evaluate, SIGNALS } from './model.js';

Manipulate({
  name: 'even-odd-synthesis',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: [{ id: 'graphic' }, { id: 'graphic2' }],
  // Grid[{{Control@{{signal, "StairStep"}, {…}, ControlType -> Setter}, Control@{{τ, 0, Style["T", Italic]}, -10, 10, 0.1, …}}}]
  controls: [
    Row([
      [['signal', 'StairStep', 'signal'], SIGNALS, { ControlType: SetterBar }],
      [['τ', 0, Style('T', Italic)], -10, 10, 0.1, { ImageSize: 180, Appearance: 'Labeled' }],
    ], { name: 'controls' }),
  ],
});
