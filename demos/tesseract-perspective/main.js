// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alexander Perepelitsa
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/tesseract-perspective/main.js — the page: the original's Manipulate (shared/manipulate.js) with its one slider
// on top (Mathematica's default placement) and the Graphics3D picture (shared/graphics3d-view.js; the tubes drawn by
// picture3d.js with CapForm["Round"] and Specularity[White, 20]).
import { Manipulate } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { initialState, evaluate } from './model.js';
import { drawTubes } from './picture3d.js';

/** The tesseract's size in the image as in the snapshots: 4.3% larger than the shared SphericalRegion fit (all four
 *  snapshots, ink extent 269/258 and 297/285 px at a = 0; D-TT-02). */
const ZOOM = 1.043;

Manipulate({
  name: 'tesseract-perspective',
  initial: initialState, // a = 0: the Manipulate's initial value and the notebook's live state
  body: evaluate,
  ControlPlacement: 'Top',
  graphics: {
    id: 'graphic',
    renderer: View3D({ ImageSize: 440, zoom: ZOOM, draw: drawTubes, testid: 'scene-canvas', label: 'the tesseract projected to 3-space (3D, drag to rotate)' }),
  },
  controls: [
    // {{a, 0, "rotate"}, 0, 2*3.1416, .0001, Appearance -> "Labeled"}
    [['a', 0, 'rotate'], 0, 2 * 3.1416, 0.0001, { Appearance: 'Labeled' }],
  ],
  hook: {
    inkFraction: (c) => () => c.renderer().inkFraction(),
    pixelAt: (c) => (p) => c.renderer().pixelAt(p),
    worldToClient: (c) => (p) => c.renderer().worldToClient(p),
    camera: (c) => () => c.renderer().camera(),
    meshCount: (c) => () => c.renderer().group.children.length,
  },
});
