// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/truss-method-of-joints/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on top:
// the setter bar of the two steps, then (PaneSelector on steps) the popup menu of the reaction-force views or the joint
// setter bar with the checkbox "focus on joint" (joints A … D). Two pictures in a Column: the truss, and under a joint
// in focus its balances.
import { Manipulate, Rule, Checkbox, SetterBar, PopupMenu, Row } from '../../shared/manipulate.js';
import { Style, Italic } from '../../shared/graphics.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate } from './model.js';

Manipulate({
  name: 'truss-method-of-joints',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: [{ id: 'graphic' }, { id: 'graphic2' }],
  controls: [
    Row([
      [['steps', 1, ''], [Rule(1, ' reaction forces '), Rule(2, ' balances at joints ')], { ControlType: SetterBar }],
      [['opt', 0, ''], [Rule(0, 'truss'), Rule(1, 'calculate moment'), Rule(2, Row([Style('x', Italic), '-force balance'])), Rule(3, Row([Style('y', Italic), '-force balance'])), Rule(4, 'solved')],
        { ControlType: PopupMenu, Visible: (s) => s.steps === 1 }],
      [['joints', 1, 'joints'], [Rule(1, ' A '), Rule(2, ' B '), Rule(3, ' C '), Rule(4, ' D '), Rule(5, ' solved ')], { ControlType: SetterBar, Visible: (s) => s.steps === 2 }],
      [['focus', false, 'focus on joint'], [true, false], { ControlType: Checkbox, Visible: (s) => s.steps === 2 && s.joints <= 4 }],
    ], { name: 'views' }),
    ErrataControl(CORRECTIONS),
  ],
  // Column[{picture, If[steps == 2 && focus && joints < 5, equations, Nothing]}]: without the equations the second picture
  // takes no room; it stays laid out (not display: none), so that its texts can be measured when they are drawn
  after: (ctx) => { const e = document.getElementById('graphic2'); if (e) e.classList.toggle('collapsed', !ctx.view.showEquations); },
});
