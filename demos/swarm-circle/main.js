// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Haoran Zhao and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/swarm-circle/main.js — the page: the original's Manipulate (shared/manipulate.js) with its five pictures as
// Graphics data (model.js); the controls in one row above them (ControlPlacement -> Top).
import { Manipulate, Row, Checkbox } from '../../shared/manipulate.js';
import { Style, Italic } from '../../shared/graphics.js';
import { initialState, evaluate } from './model.js';

Manipulate({
  name: 'swarm-circle',
  initial: initialState,
  body: evaluate,
  ControlActive: true, // PlotPoints -> ControlActive[9, Automatic]
  ControlPlacement: 'Top',
  graphics: [
    { id: 'graphic', label: 'mean x and mean y against β' },
    { id: 'graphic2', label: 'correlation against β' },
    { id: 'graphic3', label: 'covariance against β' },
    { id: 'graphic4', label: 'the circular workplace, the swarm under gravity β, its mean and covariance ellipse' },
    { id: 'graphic5', label: 'variance of x and y against β' },
  ],
  controls: [
    Row([
      [['β', 4.712, 'β'], 0, 6.28, 0.01, { Appearance: 'Labeled', ImageSize: 100 }], // ImageSize -> Small (≈ 100 px in the snapshots)
      [['h', 0.66, Style('h', Italic)], 0.001, 2, 0.001, { Appearance: 'Labeled', ImageSize: 100 }], // ImageSize -> Small (≈ 100 px in the snapshots)
      [['showParticles', false, 'show particles'], [true, false], { ControlType: Checkbox }],
      [['showStats', false, 'show values'], [true, false], { ControlType: Checkbox }],
    ], { name: 'controls' }),
  ],
});
