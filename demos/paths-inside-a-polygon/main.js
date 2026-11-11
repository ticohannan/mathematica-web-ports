// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Stan Wagon and Karen Saxe
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/paths-inside-a-polygon/main.js — the page: the original's Manipulate (shared/manipulate.js) with its picture as
// Graphics data and the two points as locators.
import { Manipulate, Locator, SetterBar, Rule } from '../../shared/manipulate.js';
import { initialState, evaluate } from './model.js';

Manipulate({
  name: 'paths-inside-a-polygon',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  controls: [
    [['i', 1, 'polygon type'], [Rule(1, 'random'), Rule(2, 'orthogonal')], { ControlType: SetterBar }],
    [['pt', [[500, 100], [500, 910]]], Locator],
  ],
  locators: { describe: (n) => `${n === 'pt-1' ? 'start' : 'finish'} point; arrow keys move it` },
});
