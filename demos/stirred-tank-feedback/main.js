// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by R. Ricardo Sánchez
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/stirred-tank-feedback/main.js — the page: the original's Manipulate (shared/manipulate.js), labelled sliders on
// the left (ControlPlacement -> Left), the two plots one above the other (Multicolumn[…, 1]).
import { Manipulate } from '../../shared/manipulate.js';
import { Row, Superscript } from '../../shared/graphics.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate } from './model.js';

const T = { Appearance: 'Labeled', ImageSize: 'Tiny' };
Manipulate({
  name: 'stirred-tank-feedback',
  initial: initialState,
  body: evaluate,
  graphics: [{ id: 'graphic' }, { id: 'graphic2' }],
  controls: [
    'proportional control constant (KJ/h °C)',
    [['Kp', 10, ''], 0, 20, 0.1, T],
    'integral control constant (h)',
    [['τI', 4, ''], 1, 20, 0.1, T],
    'heat input (KJ/h)',
    [['Q0', 100, ''], 0, 500, 1, T],
    'inlet temperature of water (°C)',
    [['inletT', 20, ''], 5, 30, 0.1, T],
    'disturbance at 120 h (°C)',
    [['pertur', 40, ''], 30, 60, 0.1, T],
    Row(['water flow (m', Superscript('', '3'), '/h)']),
    [['Flu', 3, ''], 1, 45, 0.1, T],
    ErrataControl(CORRECTIONS),
  ],
});
