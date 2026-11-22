// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Stephen Wilkerson, Frank A. Wattenberg and Russell Park
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/solar-energy-earth-surface/main.js — the page: one Manipulate (shared/manipulate.js) with the original's three
// pictures in its Grid[{{globe, Column[{plt, engtot}]}}]: the globe (shared/graphics3d-view.js, #graphic), the energy
// plot (#graphic2, its legend below it in the page) and the accumulated-energy plot (#graphic3).
import { Manipulate } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { imageWidth } from '../../shared/graphics3d.js';
import { ErrataControl } from '../../shared/errata.js';
import { initialState, evaluate } from './model.js';
import { CORRECTIONS } from './errata-mode.js';

// the globe's options: those of `earth`, the first graphic of the original's Show (ViewAngle -> 20 Degree, PlotRange ->
// ±1.5 in each direction, Boxed -> False, Axes -> False, ImageSize -> .95 {350, 350}); default ViewPoint and lighting
const OPTIONS_3D = { ImageSize: 0.95 * 350, ViewAngle: (20 * Math.PI) / 180, PlotRange: [[-1.5, 1.5], [-1.5, 1.5], [-1.5, 1.5]], Boxed: false, Axes: false };

Manipulate({
  name: 'solar-energy-earth-surface',
  initial: initialState,
  body: evaluate,
  graphics: [
    {
      id: 'graphic',
      renderer: View3D({
        ...OPTIONS_3D, testid: 'scene-canvas', label: "the Earth with the point, its normal and the Sun's direction (3D, drag to rotate)",
        // Arrowheads[s]: s × the width the picture shows (as Mathematica's arrowheads, a fraction of the image width)
        size: (box) => imageWidth(box, { viewPoint: [1.3, -2.4, 2], viewAngle: OPTIONS_3D.ViewAngle, imageSize: OPTIONS_3D.ImageSize }),
        resetView: true,
      }),
    },
    { id: 'graphic2', testid: 'plot-energy', label: 'energy over the time of day at the equator, the latitude and the north pole' },
    { id: 'graphic3', testid: 'plot-total', label: 'energy accumulated over the day' },
  ],
  ControlPlacement: 'Top',
  controls: [
    [['sea', 0, 'season'], 0, 1, { Appearance: 'Labeled' }],
    [['lat', 51.47885, 'latitude'], 0, 90, { Appearance: 'Labeled' }],
    [['h', 12, 'time of day'], 0, 24, { Appearance: 'Labeled' }],
    ErrataControl(CORRECTIONS),
  ],
  hook: {
    inkFraction: (c) => () => c.renderer().inkFraction(),
    /** RGB of the 3D canvas where world point p is drawn */
    pixelAt: (c) => (p) => c.renderer().pixelAt(p),
    /** the client position of world point p on the 3D canvas */
    worldToClient3D: (c) => (p) => c.renderer().worldToClient(p),
  },
});
