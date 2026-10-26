// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Yitong Lu and Daniel Biediger
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/graham-scan/main.js — the page: the original's Manipulate (shared/manipulate.js) with its picture as Graphics data.
import { Manipulate, Locator, Button, Row, None } from '../../shared/manipulate.js';
import { Style, Italic } from '../../shared/graphics.js';
import { RandomReal } from '../../shared/wl.js';
import { initialState, evaluate } from './model.js';

Manipulate({
  name: 'graham-scan',
  initial: initialState,
  body: evaluate,
  random: true, // ?seed=N in the URL makes "generate n new points" reproducible
  graphics: { label: 'Graham scan: points, sorted rays and the convex hull so far' },
  controls: [
    [['Allpts', initialState().Allpts], [-1, -1], [1, 1], Locator, { Appearance: None }],
    [['iMax', 1, 'step'], 1, (s) => s.Allpts.length - 1, 1, { Appearance: 'Labeled', ImageSize: 120 }],
    ' ',
    'number of points',
    [['n', 20, Style('n', Italic)], 2, 200, 1, { Appearance: 'Labeled', ImageSize: 120 }],
    ' ',
    Button(Row(['generate ', Style('n', Italic), ' new points']), (s, { rng }) => { s.Allpts = RandomReal([-1, 1], [s.n, 2], rng); }, { name: 'generate' }),
  ],
});
