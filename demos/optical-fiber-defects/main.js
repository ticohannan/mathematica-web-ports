// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Hoang Nguyen
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/optical-fiber-defects/main.js — the page: the original's Manipulate (shared/manipulate.js) with its picture as
// Graphics data.
import { Manipulate, Locator, Row } from '../../shared/manipulate.js';
import { Subscript } from '../../shared/graphics.js';
import { initialState, evaluate, LEN } from './model.js';

const angle = (k) => Row(['light angle ', Subscript('θ', String(k))]);

Manipulate({
  name: 'optical-fiber-defects',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: { PlotRange: [[-LEN + 0.1, LEN], [-2, 4]], ImageSize: 576, label: 'An optical fiber with a triangular defect and two light rays' },
  // the sliders have no value field (no Appearance -> "Labeled"; Q-OF-03)
  controls: [
    Row([[['h', 3 * 0.135, 'defect height'], 0, 1], [['w', 3 * 0.26, 'defect width'], 1 / 32, 2]], { name: 'defect' }),
    Row([[['θ1', (-4 * Math.PI) / 64, angle(1)], -Math.PI, Math.PI], [['θ2', (-4 * Math.PI) / 64, angle(2)], -Math.PI, Math.PI]], { name: 'angles' }),
    [['p', [[-1.8, 1 / 2], [-3.8, 1 / 2]]], Locator],
  ],
  locators: { describe: (n) => `light source ${n.replace('p-', '')}; arrow keys move it` },
});
