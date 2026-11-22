// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Richard Cangelosi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/lotka-volterra-competition/main.js — the page: the original's Manipulate (shared/manipulate.js) with
// ControlPlacement -> Left and ControlType -> Slider; two pictures: the phase portrait (#graphic) and the time plot of
// the Dynamic in the control column (#graphic2, placed there by index.html).
import { Manipulate, Delimiter, Button, Slider } from '../../shared/manipulate.js';
import { ErrataControl } from '../../shared/errata.js';
import { initialState, evaluate, SPECS, RESET } from './model.js';
import { CORRECTIONS } from './errata-mode.js';

const S = { Appearance: 'Labeled', ImageSize: 70, ControlType: Slider };
Manipulate({
  name: 'lotka-volterra-competition',
  initial: initialState,
  body: evaluate,
  throttle: 'frame', // a drag evaluates at most once per frame (the separatrices take a few tens of ms)
  graphics: [
    { id: 'graphic', testid: 'phase-svg', label: 'the phase portrait' },
    { id: 'graphic2', testid: 'time-svg', label: 'the population densities in time' },
  ],
  controls: [
    'Lotka–Volterra competition model',
    Delimiter, 'competition coefficients',
    [['α', SPECS.α, 'species 1'], 0.01, 2, 0.01, S],
    [['β', SPECS.β, 'species 2'], 0.01, 2, 0.01, S],
    Delimiter, 'intrinsic growth rates',
    [['r1', SPECS.r1, 'species 1'], 0, 2, 0.01, S],
    [['r2', SPECS.r2, 'species 2'], 0, 2, 0.01, S],
    Delimiter, 'carrying capacities',
    [['k1', SPECS.k1, 'species 1'], 10, 300, 1, S],
    [['k2', SPECS.k2, 'species 2'], 10, 300, 1, S],
    Delimiter,
    // Button[Style["reset"], Alpha = .63; Beta = .53; k1 = 120; k2 = 120; r1 = 0.15; r2 = 0.15] (Q-LV-01)
    Button('reset', (s) => { Object.assign(s, RESET); }, { name: 'reset-button' }),
    ErrataControl(CORRECTIONS), // port addition: the switch "errors of the original" (E-LV-01)
  ],
});
