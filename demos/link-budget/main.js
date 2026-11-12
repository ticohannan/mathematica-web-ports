// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Victor S. Frost
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/link-budget/main.js — the page: the original's Manipulate (shared/manipulate.js): a Column of labels and
// labelled sliders on the left (ControlPlacement -> Left), the plot as Graphics data.
import { Manipulate } from '../../shared/manipulate.js';
import { Row, Style, Italic, Subscript } from '../../shared/graphics.js';
import { initialState, evaluate } from './model.js';

const T = { Appearance: 'Labeled', ImageSize: 'Tiny' };
Manipulate({
  name: 'link-budget',
  initial: initialState,
  body: evaluate,
  graphics: { id: 'graphic' },
  controls: [
    'carrier frequency (MHz)',
    [['fc', 1000, ''], 2, 40000, T],
    'transmit antenna diameter (m)',
    [['Dtt', 1, ''], 0.001, 40, 0.0001, T],
    'receive antenna diameter (m)',
    [['Dr', 1, ''], 0.001, 40, 0.0001, T],
    Row(['transmit power (', Subscript('dB', 'W'), ')']),
    [['Pt', 10, ''], -20, 30, 0.1, T],
    'path‐loss exponent',
    [['n', 2, ''], 2, 6, 0.1, T],
    'system noise figure (dB)',
    [['F', 2, ''], 0.01, 15, 0.1, T],
    'antenna noise temperature',
    [['Ta', 290, ''], 2, 500, 5, T],
    'bandwidth (MHz)',
    [['Be', 2, ''], 0.01, 2500, 0.1, T],
    // the two distance sliders limit each other: dmin ≤ dmax − 1, dmax ≥ dmin + 1 (Dynamic ranges)
    [['dmin', 100, Row([Subscript(Style('d', Italic), 'min'), ' (m)'])], 10, (s) => s.dmax - 1, 1, T],
    [['dmax', 10000, Row([Subscript(Style('d', Italic), 'max'), ' (m)'])], (s) => s.dmin + 1, 36000000, 1, T],
  ],
});
