// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Jeff Bryant and Housam Binous
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/proportional-temperature-control/main.js — the page: the original's Manipulate (shared/manipulate.js), five
// plain sliders above the plot; ContinuousAction -> False: the plot is computed when a slider is released.
import { Manipulate } from '../../shared/manipulate.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate } from './model.js';

Manipulate({
  name: 'proportional-temperature-control',
  ControlPlacement: 'Top',
  ContinuousAction: false,
  initial: initialState,
  body: evaluate,
  graphics: { id: 'graphic' },
  controls: [
    [['V', 100, 'tank volume'], 10, 100, 1],
    [['F', 10, 'water flow'], 1, 20, 1],
    [['Q0', 2500, 'heat input'], 1000, 3000, 1],
    [['TRset', 80, 'outlet temperature'], 20, 150, 1],
    [['T0', 20, 'initial tank temperature'], 20, 100, 1],
    ErrataControl(CORRECTIONS),
  ],
});
