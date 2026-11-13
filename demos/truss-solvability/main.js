// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/truss-solvability/main.js — the page: the original's Manipulate (shared/manipulate.js), controls below the
// picture: the two checkboxes, then the setter bars of the supports (PaneSelector on ADTR: joint B's only with the
// support at B; the last joint is F with it and E without it); the picture as Graphics data.
import { Manipulate, Rule, Checkbox, SetterBar, Row } from '../../shared/manipulate.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate } from './model.js';

const SUPPORT = [Rule(1, ' roller '), Rule(2, ' pinned ')];
const withB = (s) => s.ADTR === true, withoutB = (s) => s.ADTR !== true;
Manipulate({
  name: 'truss-solvability',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: { id: 'graphic' },
  controls: [
    Row([
      [['ADTR', true, 'support at joint B'], [true, false], { ControlType: Checkbox }],
      [['labels', false, 'joint labels'], [true, false], { ControlType: Checkbox }],
    ], { name: 'toggles' }),
    Row([
      [['SA', 1, 'joint A'], SUPPORT, { ControlType: SetterBar }],
      [['SB', 1, 'joint B'], SUPPORT, { ControlType: SetterBar, Visible: withB }],
      [['SF', 1, 'joint F'], SUPPORT, { ControlType: SetterBar, Visible: withB }],
      [['SF', 1, 'joint E'], SUPPORT, { ControlType: SetterBar, Visible: withoutB }],
    ], { name: 'supports' }),
    ErrataControl(CORRECTIONS),
  ],
});
