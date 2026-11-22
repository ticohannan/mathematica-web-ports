// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Harley H. Hartman
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/induction-motor-rotor-design/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on
// top (the default placement of a Manipulate without ControlPlacement), the torque–speed plot as Graphics data.
import { Manipulate, Button } from '../../shared/manipulate.js';
import { Row, Subscript } from '../../shared/graphics.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate, NEMA } from './model.js';

// Button[" A ", r = 0.065; x = 0.3263; e = 150]: the button assigns r, x and e
const nema = (k) => Button(` ${k} `, (s) => { Object.assign(s, NEMA[k]); }, { name: k });

Manipulate({
  name: 'induction-motor-rotor-design',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: { id: 'graphic', label: 'AC Induction Motor Rotor Design: torque against speed' },
  controls: [
    [['e', 150, Row(['blocked rotor voltage (', Subscript('E', 'BR'), ')'])], 130, 240, { Appearance: 'Labeled' }],
    [['r', 0.107, Row(['rotor resistance (', Subscript('R', 'R'), ')'])], 0.01, 1.0, { Appearance: 'Labeled' }],
    [['x', 0.422, Row(['rotor reactance (', Subscript('X', 'R'), ')'])], 0.2, 0.85, { Appearance: 'Labeled' }],
    Row(['         NEMA design ', nema('A'), nema('B'), nema('D')], { name: 'nema' }),
    ErrataControl(CORRECTIONS),
  ],
});
