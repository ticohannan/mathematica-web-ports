// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mable Wan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/time-shifting-scaling/main.js — the page: the original's Manipulate (shared/manipulate.js) with its two plots
// (Column) as Graphics data.
import { Manipulate, None, Row, Rule, CheckboxBar } from '../../shared/manipulate.js';
import { Style, Italic, Fraction } from '../../shared/graphics.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { initialState, evaluate, SIGNAL_NAMES, LEGEND } from './model.js';

const it = (t) => Style(t, Italic);
// T is always a machine real in the original (τ = 1.0 b/a): shown "2." (Q-TS-02)
const real = (v) => mmaNumberString(v, { isReal: true });

Manipulate({
  name: 'time-shifting-scaling',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: [{ id: 'graphic' }, { id: 'graphic2' }],
  // Grid[{{signal, b}, {a, T}}] (D-TS-01: two rows of the shared layer), the hidden bOld, aOld, TOld, the checkbox bar
  controls: [
    Row([
      [['signal', 'RampDown', 'signal'], SIGNAL_NAMES],
      [['β', 4, it('b')], -10, 20, 0.1, { ImageSize: 'Small', Appearance: 'Labeled' }],
    ], { name: 'grid-1' }),
    Row([
      [['α', 2, it('a')], -4, 4, 0.1, { ImageSize: 'Medium', Appearance: 'Labeled' }],
      [['τ', 2, Row([it('T'), ' = ', Fraction(it('b'), it('a'))])], -10, 20, 0.1, { ImageSize: 'Small', Appearance: 'Labeled', format: real }],
    ], { name: 'grid-2' }),
    [['bOld', 0], None],
    [['aOld', 0], None],
    [['TOld', 0], None],
    [['checked', [1, 2], 'display: '], LEGEND.map((l, i) => Rule(i + 1, l)), { ControlType: CheckboxBar }],
  ],
});
