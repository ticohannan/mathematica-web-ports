// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/ensemble-control/main.js — the page: the original's Manipulate (shared/manipulate.js) with its two pictures
// (the robots and the error plot, side by side as in its Grid) as Graphics data.
import { Manipulate, Button, None } from '../../shared/manipulate.js';
import { r, SAVED, initialState, evaluate, turnCounterClockwise } from './model.js';

Manipulate({
  name: 'ensemble-control',
  initial: initialState,
  body: evaluate,
  random: true, // ?seed=N in the URL makes new robots (n changed) and the turns reproducible
  ControlPlacement: 'Top',
  graphics: [{ id: 'graphic' }, { id: 'graphic2' }],
  controls: [
    [['n', 2, 'number of robots'], 2, 15, 1, { Appearance: 'Labeled' }],
    // the body's hidden variables (ControlType -> None); their opening values are the notebook's
    ['nold', SAVED.nold, None],
    ...['θinit', 'xinit', 'yinit', 'xGoal', 'yGoal', 'xpath', 'ypath'].map((v) => [[v, SAVED[v]], None]),
    [['vin', 0, 'forward command'], -r, r, { Appearance: 'Labeled' }],
    Button('turn counter‐clockwise', (s, { rng }) => { turnCounterClockwise(s, rng); }, { name: 'turn' }),
  ],
});
