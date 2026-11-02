// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original (ECE 6311 Lecture 18 notebook) by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/line-parameterization/main.js — the page: one Manipulate (shared/manipulate.js) with its picture as Graphics
// data (model.js) and the notebook's dial (demos/common/dial-control.js).
import { Manipulate, Control } from '../../shared/manipulate.js';
import { Style, Italic, Blue, Red } from '../../shared/graphics.js';
import { NAMED } from '../../shared/mma-colors.js';
import { makeDialControl } from '../common/dial-control.js';
import { initialState, evaluate } from './model.js';

// makeDialControl[Dynamic[pt_], cent_, color_] as saved with the output cell: the Nearest-π/32 setter, myArrowArc2 in
// the dial's colour, no ImageSize (automatic: 180 px, as manipulability-ellipsoid; the dial circle measures about 172 px on the owner's screenshot)
const DIAL_OPTIONS = { color: NAMED.Red, imageSize: 'automatic', setter: 'nearest32', arc: 'myArrowArc2', keyStep: 'grid', labels: 'stacked' };

Manipulate({
  name: 'line-parameterization',
  initial: initialState,
  body: evaluate,
  // Graphics[{…}, Axes -> True, AxesLabel -> {x, y} (italic), PlotRange -> {{-3, 3}, {-3, 3}}]; default ImageSize (D-LP-02)
  graphics: {
    PlotRange: [[-3, 3], [-3, 3]], ImageSize: 360, Axes: true, AxesLabel: [Style('x', Italic), Style('y', Italic)],
    label: 'The line x cos θ + y sin θ = ρ with its normal, the angle θ and the distance ρ',
  },
  // test hook: the dial's client point of a world point of the dial (real-mouse tests)
  hook: { dialToClient: (c) => (q) => c.controls.get('p1').plot.worldToClient(q) },
  controls: [
    // {{ρ, 1, Style["ρ", Blue]}, 0, 3, 0.1, Appearance -> "Labeled", ImageSize -> 120}
    [['rho', 1, Style('ρ', Blue)], 0, 3, 0.1, { Appearance: 'Labeled', ImageSize: 120 }],
    // {{p1, {1, 0}, Style["θ", Red]}, (makeDialControl[#1, {0, 0}, Red] &)}
    [['p1', [1, 0], Style('θ', Red)], Control(makeDialControl, DIAL_OPTIONS)],
  ],
});
