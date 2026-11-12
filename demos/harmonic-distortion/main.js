// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Carsten Roppel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/harmonic-distortion/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on the left,
// GraphicsColumn of the two plots; the level slider is shown only while clipping is on (PaneSelector).
import { Manipulate, Delimiter, Rule } from '../../shared/manipulate.js';
import { Style, Bold, Italic, Subscript } from '../../shared/graphics.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate } from './model.js';

const T = { Appearance: 'Labeled', ImageSize: 'Tiny' };
Manipulate({
  name: 'harmonic-distortion',
  initial: initialState,
  body: evaluate,
  graphics: [{ id: 'graphic' }, { id: 'graphic2' }],
  controls: [
    Style('coefficients', Bold),
    [['c1', 0, Subscript(Style('c', Italic), '1')], -0.5, 0.5, 0.01, T],
    [['c2', 0, Subscript(Style('c', Italic), '2')], -0.5, 0.5, 0.01, T],
    Delimiter,
    Style('clipping', Bold),
    [['clipping', false, ''], [true, false]],
    [['level', 0.8, 'level'], 0.5, 1, 0.01, { ...T, Visible: (s) => s.clipping === true }],
    Delimiter,
    Style('DFT', Bold),
    [['scale', 1, 'scale'], [Rule(1, 'linear'), Rule(2, 'decibel')]],
    ErrataControl(CORRECTIONS),
  ],
});
