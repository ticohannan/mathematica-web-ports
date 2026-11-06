// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/lowpass-filter-design/main.js — the page: the original's Manipulate (shared/manipulate.js) with its two plots
// (Row) as Graphics data; the poles are invisible auto-created locators on the pole plot.
import { Manipulate, Locator, None } from '../../shared/manipulate.js';
import { Row, Style, Italic } from '../../shared/graphics.js';
import { initialState, evaluate, TYPES } from './model.js';

Manipulate({
  name: 'lowpass-filter-design',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: [{ id: 'graphic' }, { id: 'graphic2' }],
  // Enabled -> If[type == "manual", False, True] is evaluated once: the sliders are always enabled (Q-LF-01)
  controls: [
    [['type', 'vertical line', 'type'], TYPES],
    [['n', 3, Row([Style('n', Italic), ', number of poles'])], 1, 20, 1, { Appearance: 'Labeled' }],
    [['α', -1, 'α, real component'], -2, -1 / 100, { Appearance: 'Labeled' }],
    [['p', [[-1, -1], [-1, 1]]], Locator, { LocatorAutoCreate: true, Appearance: None }],
  ],
  locators: { describe: (n) => `pole ${n.replace('p-', '')}; arrow keys move it (type "manual"); Alt/⌘-click on the pole plot adds or deletes a pole` },
});
