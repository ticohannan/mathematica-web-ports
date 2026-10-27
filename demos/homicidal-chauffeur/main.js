// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Javier Garcia
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/homicidal-chauffeur/main.js — the page: the original's Manipulate (shared/manipulate.js) with its picture as
// Graphics data. The body reads the clock (AbsoluteTime[], Clock[1, .3]) and keeps evaluating itself while running.
import { Manipulate, Locator, None, Row } from '../../shared/manipulate.js';
import { Style, Subscript, Italic } from '../../shared/graphics.js';
import { Pi } from '../../shared/wl.js';
import { SAVED, LOCATOR_LOOK, initialState, evaluate, settles } from './model.js';

const setup = (s) => s.state === 'setup'; // Enabled -> (state === "setup")

Manipulate({
  name: 'homicidal-chauffeur',
  initial: initialState, // the notebook's saved state (= the Manipulate's stored initial values: Initial settings)
  body: evaluate,
  clock: true, // the body reads AbsoluteTime[] (and Clock[1, .3] for the pedestrian's arms)
  settle: settles, // running: the body moves the pedestrian and the car and evaluates again
  settleInterval: 0.01, // the body's Pause[0.01]: at least 10 ms between those evaluations
  ControlPlacement: 'Top',
  graphics: { label: 'The Homicidal Chauffeur Problem: the car, the pedestrian, their paths and the turning circles' },
  controls: [
    [['minRadius', SAVED.minRadius, Row([Subscript(Style('r', Italic), 'min')])], 0.001, 5, { Enabled: setup, Appearance: 'Labeled', ImageSize: 400 }],
    [['runner', SAVED.runner], None],
    [['vcar', SAVED.vcar, Row([Subscript(Style('v', Italic), 'car'), '/', Subscript(Style('v', Italic), 'pedestrian')])], 1.1, 5, { Enabled: setup, Appearance: 'Labeled', ImageSize: 400 }],
    [['state', SAVED.state, 'mode'], ['setup', 'running']],
    [['stateP', SAVED.stateP], None],
    [['timer', SAVED.timer], 0, None],
    [['runPath', SAVED.runPath], None], // array of xy positions of the pedestrian
    [['carPath', SAVED.carPath], None], // array of xy positions of the car
    // Appearance -> None, with Locator[#, Graphics[…]] & /@ loc in the picture: that Graphics as the locators' look
    [['loc', SAVED.loc], [-15, -9], [15, 10], Locator, { Appearance: LOCATOR_LOOK }],
    [['carXYold', SAVED.carXYold], None],
    [['carθ', SAVED.carθ], -Pi, Pi, None],
    [['lastTime', SAVED.lastTime], None],
  ],
});
