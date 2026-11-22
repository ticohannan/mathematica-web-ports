// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alain Goriely and Mark Robertson-Tessi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/vibrating-string/main.js — the page: the original's Manipulate (shared/manipulate.js). ControlPlacement ->
// {Top, Top, Top, Left, …}: the setter bar and the two sliders above the picture (#controls-top, control option
// `parent`), the checkboxes, the Trigger and the Dynamic with the three mode plots in the left column; the points as a
// Locator list with LocatorAutoCreate -> {All, {1, 10}}.
import { Manipulate, Locator, Rule, Trigger, All } from '../../shared/manipulate.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate, XMIN, XMAX } from './model.js';

const top = document.getElementById('controls-top');
const modes = document.getElementById('modes');

Manipulate({
  name: 'vibrating-string',
  initial: initialState,
  body: evaluate,
  graphics: [{ id: 'graphic' }, { id: 'mode1' }, { id: 'mode2' }, { id: 'mode3' }],
  controls: [
    [['idpolynom', 1, 'initial data'], [Rule(1, 'piecewise polynomial'), Rule(2, 'piecewise linear')], { parent: top }],
    [['c', 0.5, 'velocity'], 0, 3, { Appearance: 'Labeled', parent: top }],
    [['a', 0, 'x interval'], 0, 2, 1, { Appearance: 'Labeled', parent: top }],
    [['points', [[0.5, 1]]], [XMIN, -2], [XMAX, 2], Locator, { LocatorAutoCreate: [All, [1, 10]] }],
    [['id', true, 'initial string'], [false, true]],
    [['string', true, 'evolving string'], [false, true]],
    [['ltw', false, 'left wave'], [false, true]],
    [['rtw', false, 'right wave'], [false, true]],
    [['t', 0, 'run'], 0, Infinity, { ControlType: Trigger }],
    [['modedisp', false, 'display modes'], [false, true]],
    ErrataControl(CORRECTIONS),
  ],
  locators: { describe: (n) => `point ${n.replace('points-', '')}; arrow keys move it; a click beside the points adds one, Alt/⌘-click on a point deletes it` },
  // Dynamic[If[modedisp, GraphicsGrid[{{first mode}, {second mode}, {third mode}}], " "]]
  after: (ctx) => { modes.hidden = !ctx.state.modedisp; },
});
