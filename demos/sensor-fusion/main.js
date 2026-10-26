// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/sensor-fusion/main.js — the page: the original's Manipulate (shared/manipulate.js) with its picture as Graphics data.
import { Manipulate, Locator, None } from '../../shared/manipulate.js';
import { Text, Style, Subscript, Superscript, RGBColor } from '../../shared/graphics.js';
import { initialState, evaluate, rg, MY_COLORS } from './model.js';

const σLabel = (k) => Superscript(Subscript('σ', k), 2);
// Appearance -> If[u > k − 1, Style["⊙", MyColors[[k]], 24], Style[""]]: an empty locator when measurement k is unused
const circleDot = (k) => (s) => (s.u >= k ? [Text(Style('⊙', RGBColor(...s.MyColors[k - 1]), 24), [0, 0])] : []);
const variance = (k, init) => [[`σSq${k}`, init, σLabel(k)], 0.1, 20, { Appearance: 'Labeled', ...(k > 1 && { Enabled: (s) => s.u > k - 1 }) }];
const locator = (k, x) => [[`z${k}`, [x, 0]], [-rg, 0], [rg, 0], Locator, { Appearance: circleDot(k) }];

Manipulate({
  ControlPlacement: 'Top', // Mathematica's default placement, as in the snapshots
  name: 'sensor-fusion',
  initial: initialState,
  body: evaluate,
  graphics: { label: 'Sensor fusion: measurement densities and the combined estimate' },
  controls: [
    [['rg', rg], None],
    [['MyColors', MY_COLORS.map((c) => [...c])], None],
    [['u', 2, 'number of measurements'], [1, 2, 3, 4]],
    'measurement variances',
    variance(1, 5), variance(2, 10), variance(3, 10), variance(4, 10),
    locator(1, 2), locator(2, 4), locator(3, 6), locator(4, 8),
  ],
});
