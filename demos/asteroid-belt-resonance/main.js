// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by S. M. Blinder
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/asteroid-belt-resonance/main.js — the page: the original's Manipulate (shared/manipulate.js), ControlPlacement
// Top with its two rows of controls, the picture as Graphics data.
import { Manipulate, Row, Rule, Checkbox } from '../../shared/manipulate.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate } from './model.js';

Manipulate({
  name: 'asteroid-belt-resonance',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  // Graphics[…, PlotRange -> 7.7, ImageSize -> .95{575, 450}]: with AspectRatio Automatic Mathematica draws the square
  // range 427.5 px high in the middle of the 546-px-wide image (white at the sides); the port draws the square (D-OR-02)
  graphics: { id: 'graphic', PlotRange: [[-7.7, 7.7], [-7.7, 7.7]], ImageSize: [0.95 * 450, 0.95 * 450], label: 'The inner solar system with the asteroid belt' },
  controls: [
    Row([
      [['θ', 0, 'planetary orbits'], 0, 50, { Appearance: 'Labeled', name: 'theta' }],
      [['t', 0, 'time (Gyr)'], 0, 200, { Appearance: 'Labeled' }],
    ], { name: 'row-sliders' }),
    Row([
      [['k', 0, 'show Kirkwood gaps'], [Rule(0, 'none'), Rule(1, '3:1'), Rule(2, '5:2'), Rule(3, '7:3'), Rule(4, '2:1')]],
      [['T', 0, 'show Trojan asteroids'], [0, 1], { ControlType: Checkbox }],
      [['H', 0, 'show Hilda asteroids'], [0, 1], { ControlType: Checkbox }],
    ], { name: 'row-show' }),
    ErrataControl(CORRECTIONS),
  ],
});
