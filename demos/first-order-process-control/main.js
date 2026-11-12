// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Simon M. Lane
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/first-order-process-control/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on
// top (the default placement of a Manipulate without ControlPlacement), the plot as Graphics data.
import { Manipulate, Rule } from '../../shared/manipulate.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate, INPUTS } from './model.js';

Manipulate({
  name: 'first-order-process-control',
  ControlPlacement: 'Top',
  initial: initialState,
  // the notebook was saved with the sinusoidal input chosen; the controls' own initial values (Initial Settings) have the step
  initialSettings: () => ({ ...initialState(), W: 1, errata: 'original' }),
  body: evaluate,
  graphics: { id: 'graphic' },
  controls: [
    [['W', 1, 'choose input'], INPUTS.map(([v, l]) => Rule(v, l)), { ControlType: { controlType: 'SetterBar' } }],
    [['T', 5, 'time constant, τ'], 1, 10, 1, { Appearance: 'Labeled' }],
    [['α', 3, 'input step size, a'], 1, 5, 0.5, { Appearance: 'Labeled' }],
    [['w', 1, 'angular frequency ω'], 0.5, 5, 0.5, { Appearance: 'Labeled', Enabled: (s) => s.W === 3 }],
    ErrataControl(CORRECTIONS),
  ],
});
