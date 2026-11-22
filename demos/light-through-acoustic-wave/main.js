// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Brendon O'Leary
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/light-through-acoustic-wave/main.js — the page: the original's Manipulate (shared/manipulate.js), controls
// above the plot (Mathematica's default ControlPlacement); the maximum of m follows n (n − .1).
import { Manipulate } from '../../shared/manipulate.js';
import { Row, Subscript, Style, Italic } from '../../shared/graphics.js';
import { initialState, evaluate } from './model.js';

const L = { Appearance: 'Labeled' };
Manipulate({
  name: 'light-through-acoustic-wave',
  initial: initialState,
  body: evaluate,
  ControlPlacement: 'Top',
  controls: [
    [['n', 1, Row(['index of refraction of air ', Subscript('n', 'air')])], 0.8, 5, L],
    [['m', 0.7, 'sound volume m'], 0, (s) => s.n - 0.1, L],
    [['w', 0.5, 'frequency of sound w'], 0.3, 2, L],
    [['θ', 0.01, Row(['initial angle of light ', Style('θ', Italic)])], -0.02, 0.02, L],
  ],
});
