// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Sergio Hannibal Mejía and Simon Lorimer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/planetary-atmosphere-single-layer/main.js — the page: the original's Manipulate (shared/manipulate.js) with
// ControlPlacement -> Left, the Column of the two pictures (the planet's energy flows, the temperature plot).
import { Manipulate, Rule, Checkbox } from '../../shared/manipulate.js';
import { Row, Style, Italic } from '../../shared/graphics.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate } from './model.js';

Manipulate({
  name: 'planetary-atmosphere-single-layer',
  ControlPlacement: 'Left',
  initial: initialState,
  body: evaluate,
  graphics: [
    // Graphics[…, PlotRange -> {{-5, 5}, {0, 8.5}}, ImageSize -> 360]
    { id: 'scene', PlotRange: [[-5, 5], [0, 8.5]], PlotRangePadding: 0, ImageSize: 360, testid: 'scene-svg', label: 'The planet, its atmosphere layer and the energy flows' },
    // Show[{Plot[…, ImageSize -> {360, 160}], Graphics[Point]}, ImageSize -> {380, 170}]
    { id: 'plot', testid: 'plot-svg', label: 'Planetary temperature against the emissivity' },
  ],
  controls: [
    'albedo α',
    [['α', 0.3, ''], 0, 1, 0.01, { ImageSize: 'Tiny', Appearance: 'Labeled', name: 'alpha' }],
    'emissivity ϵ',
    [['ϵ', 0.742, ''], 0, 1, 0.01, { ImageSize: 'Tiny', Appearance: 'Labeled', name: 'eps' }],
    Row(['solar distance ', Style('d', Italic), ' (AU)']),
    [['d', 1, ''], 0.3, 10, 0.1, { ImageSize: 'Tiny', Appearance: 'Labeled' }],
    [['planet', 1, 'planet'], [Rule(1, 'Earth'), Rule(2, 'Mars'), Rule(3, 'Venus'), Rule(4, 'my own')]],
    // {{reset, False, "reset"}, {True, False}}: a checkbox that the body sets back to False
    [['reset', false, 'reset'], [true, false], { ControlType: Checkbox }],
    [['scale', 'DegreesCelsius', 'scale'], [Rule('DegreesCelsius', '°C'), Rule('DegreesFahrenheit', '°F')]],
    ErrataControl(CORRECTIONS),
  ],
});
