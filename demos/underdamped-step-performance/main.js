// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Housam Binous, Mohammad Mozahar Hossain and Ahmed Bellagi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/underdamped-step-performance/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on
// the left; the picture is the response or the table of characteristics (setter "response | performance").
import { Manipulate, Rule } from '../../shared/manipulate.js';
import { Row, Style, Italic, Subscript } from '../../shared/graphics.js';
import { initialState, evaluate } from './model.js';

const T = { Appearance: 'Labeled', ImageSize: 'Tiny' };
Manipulate({
  name: 'underdamped-step-performance',
  initial: initialState,
  body: evaluate,
  graphics: { id: 'graphic' },
  controls: [
    [['Kg', 5, Row(['steady‐state gain ', Subscript(Style('K', Italic), 'g')])], 0.1, 10, 0.1, T],
    [['τ', 1, 'time constant τ'], 0.5, 1.5, 0.1, T],
    [['ζ', 0.2, 'damping coefficient ζ'], 0.05, 0.3, 0.01, T],
    [['M', 5, Row(['step magnitude ', Style('M', Italic)])], 5, 10, 0.5, T],
    '',
    [['ctrl', 1, ''], [Rule(1, 'response'), Rule(2, 'performance')]],
  ],
});
