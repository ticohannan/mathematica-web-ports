// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Hiroki Sayama
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/predator-prey-agents/main.js — the page: the original's Manipulate (shared/manipulate.js) with
// ControlPlacement -> Left: five sliders, the checkbox "run simulation" and the button "Reset"; while the box is
// checked the body is evaluated again on every frame (Refresh[…, UpdateInterval -> If[moving, 0, Infinity]]).
import { Manipulate, Checkbox, Button, None } from '../../shared/manipulate.js';
import { initialState, evaluate, initialAgents } from './model.js';

Manipulate({
  name: 'predator-prey-agents',
  ControlPlacement: 'Left',
  initial: initialState,
  body: evaluate,
  random: true, // the page's random source (?seed=N for reproducible runs)
  settle: (s) => s.moving === true,
  // Show[…, ImageSize -> {375, 375}, PlotRange -> {{0, 1}, {0, 1}}, Frame -> False, Axes -> False]
  graphics: { id: 'graphic', PlotRange: [[0, 1], [0, 1]], PlotRangePadding: 0, ImageSize: [375, 375], label: 'Foxes (orange) and rabbits (purple) in the square habitat' },
  controls: [
    [['rabbitGrowthRate', 0.5, 'growth rate of rabbits'], 0, 1, { ImageSize: 'Tiny' }],
    [['rabbitMobility', 0.03, 'mobility of rabbits'], 0, 0.05, { ImageSize: 'Tiny' }],
    [['foxGrowthRate', 0.5, 'growth rate of foxes'], 0, 1, { ImageSize: 'Tiny' }],
    [['foxMobility', 0.05, 'mobility of foxes'], 0, 0.05, { ImageSize: 'Tiny' }],
    [['foxEndurance', 10, 'number of steps\nfoxes can survive\nwithout food'], 1, 20, 1, { Appearance: 'Labeled', ImageSize: 'Tiny' }],
    ' ',
    [['moving', false, 'run simulation'], [true, false], { ControlType: Checkbox }],
    [['ag', initialState().ag], None],
    ' ',
    // Button["Reset", moving = False; ag = initialAgents[], ImageSize -> Medium]
    Button('Reset', (s) => { s.moving = false; s.ag = initialAgents(); }, { name: 'reset-agents' }),
  ],
});
