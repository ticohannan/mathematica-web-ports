// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Erik Mahieu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/quarter-car-suspension/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on the
// left with a Trigger (start / pause / reset) on `time`, the two pictures in a column.
import { Manipulate, Delimiter, Trigger } from '../../shared/manipulate.js';
import { Style, Bold, Column } from '../../shared/graphics.js';
import { NumberForm } from '../../shared/number-form.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate } from './model.js';

const T = { Appearance: 'Labeled', ImageSize: 'Tiny' };
Manipulate({
  name: 'quarter-car-suspension',
  initial: initialState,
  body: evaluate,
  graphics: [{ id: 'graphic' }, { id: 'graphic2' }],
  controls: [
    Style(Column(['car suspension', 'animation']), Bold),
    'start / pause / reset',
    [['time', 0, ''], 0, 20, 0.25, { ControlType: Trigger, AnimationRate: 1 }],
    'elapsed time in sec = 0',
    Delimiter,
    Style('suspension parameters', Bold),
    'damping coefficient: c',
    [['c', 0.85, ''], 0, 1, 0.001, T],
    'spring constant: k',
    [['k', 0.165, ''], 0.01, 0.25, 0.001, T],
    'mass: m',
    [['m', 1, ''], 0.25, 1, 0.001, T],
    Delimiter,
    Style('road condition', Bold),
    'road bump height',
    [['h', 0.1, ''], 0, 0.2, 0.01, T],
    'bump frequency: fb',
    [['fb', 1, ''], 0.1, 2, 0.01, T],
    ErrataControl(CORRECTIONS),
  ],
  // Row[{"elapsed time in sec = ", Dynamic[NumberForm[time, {3, 1}]]}]: the heading follows the variable
  after: (ctx) => {
    const h = [...document.querySelectorAll('#controls *')].find((e) => e.children.length === 0 && /^elapsed time in sec = /.test(e.textContent));
    if (h) { h.textContent = `elapsed time in sec = ${NumberForm(ctx.state.time, [3, 1], { exact: Number.isInteger(ctx.state.time) && ctx.state.time === 0 })}`; h.setAttribute('data-testid', 'elapsed-time'); }
  },
});
