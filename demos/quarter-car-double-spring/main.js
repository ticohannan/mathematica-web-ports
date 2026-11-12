// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Jon Neades
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/quarter-car-double-spring/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on the
// left: a Trigger "play" and a slider "time" on the same variable `run`, the parameters, the input type as vertical
// radio buttons; the two pictures in a column.
import { Manipulate, Delimiter, Trigger, RadioButton, Rule } from '../../shared/manipulate.js';
import { Style, Bold, Italic, Subscript } from '../../shared/graphics.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate, MAXTIME } from './model.js';

const T = { Appearance: 'Labeled', ImageSize: 'Tiny' };
const sub = (a, i) => Subscript(Style(a, Italic), i);
Manipulate({
  name: 'quarter-car-double-spring',
  initial: initialState,
  body: evaluate,
  graphics: [{ id: 'graphic' }, { id: 'graphic2' }],
  controls: [
    [['run', 0, 'play'], 0, MAXTIME, 0.05, { ControlType: Trigger, AnimationRate: 1 }],
    [['run', 0, 'time'], 0, MAXTIME, 0.05, T],
    Delimiter,
    Style('mass', Bold),
    [['m1', 400, sub('m', '1')], 200, 1000, 1, T],
    [['m2', 30, sub('m', '2')], 5, 100, 1, T],
    '',
    Style('stiffness', Bold),
    [['k1', 20000, sub('k', '1')], 10000, 200000, 1000, T],
    [['k2', 80000, sub('k', '2')], 10000, 200000, 1000, T],
    '',
    Style('damping', Bold),
    [['c1', 2000, sub('c', '1')], 0, 10000, 100, T],
    [['c2', 0, sub('c', '2')], 0, 10000, 100, T],
    Delimiter,
    Style('input', Bold),
    [['type', 1, 'type'], [Rule(1, 'single bump'), Rule(2, 'sinusoidal')], { ControlType: RadioButton, Appearance: 'Vertical' }],
    [['h', 0.15, 'height'], 0, 0.2, 0.01, T],
    [['wid', 1, 'duration'], 0.1, 5, 0.1, T],
    [['ω', 1, 'frequency'], 0, 3, 0.1, T],
    ErrataControl(CORRECTIONS),
  ],
});
