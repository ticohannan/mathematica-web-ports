// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Victor M. Baez and Nikhil Navkar
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/segment-distance/main.js — the page: the original's Manipulate (shared/manipulate.js) with its Graphics3D picture
// (shared/graphics3d-view.js). ControlPlacement -> {Top, Left}: the four xy sliders in #controls (above the picture), the
// z sliders and the checkboxes in the left column of index.html (control option `parent`).
import { Manipulate, VerticalSlider } from '../../shared/manipulate.js';
import { Style, Italic, Subscript } from '../../shared/graphics.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { initialState, evaluate } from './model.js';

const zColumn = document.getElementById('controls-z');
const checks = document.getElementById('controls-checks');
const xy = (name, init, P) => [[name, init, Subscript(P, Style('xy', Italic))], [-5, -5], [5, 5], { Appearance: 'Tiny' }];
const z = (name, init, P) => [[name, init, Subscript(P, Style('z', Italic))], -5, 5, { ControlType: VerticalSlider, Appearance: 'Tiny', parent: zColumn }];

Manipulate({
  name: 'segment-distance',
  initial: initialState,
  body: evaluate,
  graphics: {
    id: 'graphic',
    // clipPadding: the spheres (radius 0.4) of points on the slider limits ±5 stay whole, as in the snapshots (D-SD-05)
    renderer: View3D({ clipPadding: 0.21, testid: 'scene-canvas', label: 'Shortest Distance between Two Line Segments (3D, drag to rotate)', plotLabelElement: '[data-testid=plot-label]' }),
  },
  controls: [
    xy('axy', [-3, 3], 'A'), xy('bxy', [1, 1], 'B'), xy('cxy', [-2, -4], 'C'), xy('dxy', [4, -2], 'D'),
    z('az', 1, 'A'), z('bz', 2, 'B'), z('cz', -1, 'C'), z('dz', -2, 'D'),
    [['showPlaneAB', true, 'show plane for AB'], [false, true], { parent: checks }],
    [['showPlaneCD', true, 'show plane for CD'], [false, true], { parent: checks }],
  ],
  hook: {
    inkFraction: (c) => () => c.renderer().inkFraction(),
  },
});
