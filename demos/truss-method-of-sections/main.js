// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/truss-method-of-sections/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on top:
// the setter bar of the two steps, then (PaneSelector on steps) the three reaction views or the cut sections with the
// checkboxes "make cut" (cuts 1 … 6) and "solve moment" (cuts 2 … 5, with a cut made); the member width and height
// sliders. Two pictures in a Column: the truss, and under a zoomed cut its equations.
import { Manipulate, Rule, Checkbox, SetterBar, Row } from '../../shared/manipulate.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate } from './model.js';

const opts = (labels) => labels.map((l, i) => Rule(i + 1, ` ${l} `));
Manipulate({
  name: 'truss-method-of-sections',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: [{ id: 'graphic' }, { id: 'graphic2' }],
  controls: [
    Row([
      [['steps', 1, ''], opts(['solve for reaction forces', 'make cuts']), { ControlType: SetterBar }],
      [['opt', 1, ''], opts(['calculate moment', 'force balance', 'reactions']), { ControlType: SetterBar, Visible: (s) => s.steps === 1 }],
      [['cuts', 1, 'cut sections'], opts(['1', '2', '3', '4', '5', '6', 'solved']), { ControlType: SetterBar, Visible: (s) => s.steps === 2 }],
      [['zoom', false, 'make cut'], [true, false], { ControlType: Checkbox, Visible: (s) => s.steps === 2 && s.cuts <= 6 }],
      [['moment', false, 'solve moment'], [true, false], { ControlType: Checkbox, Visible: (s) => s.steps === 2 && s.zoom === true && s.cuts >= 2 && s.cuts <= 5 }],
    ], { name: 'views' }),
    Row([
      [['w', 8, 'member width (m)'], 6, 8, 0.1, { Appearance: 'Labeled', ImageSize: 'Small' }],
      [['h', 8, 'member height (m)'], 6, 8, 0.1, { Appearance: 'Labeled', ImageSize: 'Small' }],
    ], { name: 'sizes' }),
    ErrataControl(CORRECTIONS),
  ],
  // Column[{picture, If[steps == 2 && zoom && cuts < 7, equations, Nothing]}]: without the equations the second picture
  // takes no room; it stays laid out (not display: none), so that its texts can be measured when they are drawn
  after: (ctx) => { const e = document.getElementById('graphic2'); if (e) e.classList.toggle('collapsed', !ctx.view.showEquations); },
});
