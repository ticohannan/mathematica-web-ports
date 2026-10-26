// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Javier Garcia
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/steering-rc-cars/main.js — the page: the original's Manipulate (shared/manipulate.js) with its picture as
// Graphics data. The body reads the clock (AbsoluteTime[]) and keeps evaluating itself while it moves the cars.
import { Manipulate, Locator, None } from '../../shared/manipulate.js';
import { Style, Italic } from '../../shared/graphics.js';
import { SPECS, initialState, initialSettings, evaluate, settles } from './model.js';

Manipulate({
  name: 'steering-rc-cars',
  initial: initialState, // the notebook's saved state
  initialSettings, // Initial settings: the Manipulate's own initial values (new random robots, as in Mathematica)
  body: evaluate,
  random: true, // ?seed=N in the URL makes new robots (n changed, Initial settings) reproducible
  clock: true, // the body reads AbsoluteTime[]
  settle: settles, // running: the body moves the runner and evaluates again until it reaches the locator
  controls: [
    [['n', SPECS.n, Style('n', Italic)], 2, 10, 1, { Appearance: 'Labeled', Enabled: (s) => s.mode === 'setup', ImageSize: 100 }],
    [['nold', SPECS.nold], None], // number of robots, old number of robots
    [['rad', SPECS.rad, 'radius'], 0.01, 0.5, 0.0001, { ImageSize: 100, Appearance: 'Labeled' }], // radius of a robot
    [['ps', SPECS.ps], None], // position of position locators
    [['psold', SPECS.psold], None],
    [['pθs', SPECS.pθs], None], // position of orientation locators
    [['loc', SPECS.loc], Locator], // the positions and orientation handles (setup) or the joystick (running)
    [['θs', SPECS.θs], None], // orientation of robots
    [['runnerθ', SPECS.runnerθ], None],
    [['mode', SPECS.mode, 'mode'], ['setup', 'running']],
    [['modeP', SPECS.modeP], None],
    [['runPath', SPECS.runPath], None], // array of xy positions of the vehicle
    [['runner', SPECS.runner], None],
    ['robot', ['RC car', 'cell', 'particle']],
    [['range', SPECS.range], 1, 2, 0.001, { Appearance: 'Labeled', ImageSize: 100 }],
    [['offset', SPECS.offset], [-1, -1], [1, 1]],
    [['lastTime', SPECS.lastTime], None],
  ],
});
