// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alain Goriely
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/rectangular-membrane/main.js — the page: the original's Manipulate (shared/manipulate.js) with its labelled
// sliders on the left (ControlPlacement -> Left) and the Plot3D picture (shared/graphics3d-view.js).
import { Manipulate, Delimiter } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { fitViewer } from '../../shared/graphics3d-three.js';
import { initialState, evaluate } from './model.js';

const T = { Appearance: 'Labeled', ImageSize: 'Tiny' };
/** The box drawn a little smaller than its corners' fit, leaving room for the tick labels as Mathematica does (D-RA-03). */
const ZOOM = 0.86;

// Mathematica draws every new Plot3D fitted to the image (SphericalRegion -> False, its default); View3D fits a
// fixed PlotRange once, so the camera is fitted again here whenever the box changes (length, width, the amplitudes,
// reduce box height), keeping the reader's viewing direction (D-RA-03).
let fitted = null;
const refit = (R) => {
  if (!R.viewer || !R.box) return;
  const key = R.box.map(([lo, hi]) => `${lo},${hi}`).join(';');
  if (fitted !== null && key !== fitted) fitViewer(R.viewer, { box: R.box, zoom: ZOOM, SphericalRegion: false });
  fitted = key;
};

Manipulate({
  name: 'rectangular-membrane',
  initial: initialState,
  body: evaluate,
  graphics: { id: 'graphic', renderer: View3D({ SphericalRegion: false, zoom: ZOOM, tickClass: 'ra-tick', testid: 'scene-canvas', label: 'the membrane (3D, drag to rotate)' }) },
  controls: [ // ControlPlacement -> Left (the page's default placement); AutorunSequencing is not used (N-RA-04)
    [['a', 4, 'length'], 1, 10, 0.01, T],
    [['b', 4, 'width'], 1, 10, 0.01, T],
    Delimiter,
    '   mode',
    [['B11', 0.5, 'm=1, n=1'], -2, 2, 0.01, T],
    [['B21', 0, 'm=2, n=1'], -2, 2, 0.01, T],
    [['B12', 0, 'm=1, n=2'], -2, 2, 0.01, T],
    [['B22', 0, 'm=2, n=2'], -2, 2, 0.01, T],
    Delimiter,
    [['t', 0, 'time'], 0, 10, 0.01, T],
    [['c', 1, 'wave speed'], 0, 2, 0.01, T],
    Delimiter,
    [['zrange', 0, 'reduce box height'], 0, 2, 0.1, T],
  ],
  after: (ctx) => refit(ctx.renderer()),
  hook: {
    inkFraction: (c) => () => c.renderer().inkFraction(),
    camera: (c) => () => c.renderer().camera(),
    pixelAt: (c) => (p) => c.renderer().pixelAt(p),
    sceneToClient: (c) => (p) => c.renderer().worldToClient(p), // page coordinates of a 3D point (tests)
  },
});
