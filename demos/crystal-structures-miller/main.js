// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Yunfeng Shi and Adam Bross
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/crystal-structures-miller/main.js — the page: the original's Manipulate (shared/manipulate.js) with its
// controls on the left (Mathematica's default placement for this layout) and the 3D picture (shared/graphics3d-view.js).
import { Manipulate, PopupMenu, Row } from '../../shared/manipulate.js';
import { Style, Italic } from '../../shared/graphics.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { fitViewer } from '../../shared/graphics3d-three.js';
import { boxRatioTransform } from '../../shared/graphics3d.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate, CRYSTAL_TYPES, MILLER_VALUES } from './model.js';

const T = { ImageSize: 'Tiny', Appearance: 'Labeled' };
/** The box drawn a little smaller than View3D's SphericalRegion fit, as the snapshots show it (D-CM-05). */
const ZOOM = 0.92;

// View3D fits an explicit PlotRange once; with BoxRatios (always given here, D-CM-03) the box drawn is {1, 1, 1} or,
// with Plot3D planes, {1, 1, 0.4} (Q-CM-05): the camera is fitted again (SphericalRegion) when that box changes,
// keeping the reader's viewing direction.
let fitted = null;
const refit = (R, ratios) => {
  if (!R.viewer || !R.box) return;
  const key = ratios.join(',');
  if (fitted !== null && key !== fitted) fitViewer(R.viewer, { box: boxRatioTransform(R.box, ratios).worldBox, zoom: ZOOM });
  fitted = key;
};

/** a point of the plot range → the scene's coordinates (boxRatioTransform: world = p · scale + position) */
const toWorld = (c, p) => { const T = boxRatioTransform(c.renderer().box, c.view.boxRatios); return p.map((x, k) => x * T.scale[k] + T.position[k]); };

Manipulate({
  name: 'crystal-structures-miller',
  initial: initialState,
  body: evaluate,
  graphics: { id: 'graphic', renderer: View3D({ ImageSize: 400, zoom: ZOOM, thickPx: 2, testid: 'scene-canvas', label: 'the crystal (3D, drag to rotate)' }) },
  controls: [
    [['CrystalType', 'SC', 'crystal structure'], CRYSTAL_TYPES, { ControlType: PopupMenu }],
    [['rp', 1, 'repeats'], 0, 5, 1, T],
    [['radius', 0.1, 'radius (red)'], 0.1, 1, 0, T],
    [['radius2', 0.1, 'radius (blue)'], 0.1, 1, 0, T],
    '',
    'cell shifts',
    // {{sx, 0, Style["x", Italic]}, 0, rp - 1, 1, …}: the range follows rp (a negative range for rp = 0 is kept at {0, 0}, D-CM-04)
    [['sx', 0, Style('x', Italic)], 0, (s) => Math.max(0, s.rp - 1), 1, T],
    [['sy', 0, Style('y', Italic)], 0, (s) => Math.max(0, s.rp - 1), 1, T],
    [['sz', 0, Style('z', Italic)], 0, (s) => Math.max(0, s.rp - 1), 1, T],
    '',
    [['DrawCell', false, 'unit cell'], [true, false]],
    [['DrawCubeFace', false, 'unit cell face'], [true, false], { Enabled: (s) => s.DrawCell }],
    '',
    [['DrawPlanes', false, 'Miller planes'], [true, false]],
    // nine values: Mathematica draws a popup menu (N-CM-02)
    [['m', 1, Row(['Miller ', Style('h', Italic)])], MILLER_VALUES, { ControlType: PopupMenu, Enabled: (s) => s.DrawPlanes }],
    [['n', 1, Row(['Miller ', Style('k', Italic)])], MILLER_VALUES, { ControlType: PopupMenu, Enabled: (s) => s.DrawPlanes }],
    [['r', 1, Row(['Miller ', Style('l', Italic)])], MILLER_VALUES, { ControlType: PopupMenu, Enabled: (s) => s.DrawPlanes }],
    ErrataControl(CORRECTIONS),
  ],
  after: (ctx) => {
    // the layer builds a popup menu enabled whatever its Enabled says and updates it only when Enabled changes: the
    // Miller popups are set here after every evaluation (app-local workaround, D-CM-06)
    for (const v of ['m', 'n', 'r']) ctx.controls.get(v)?.setEnabled?.(!!ctx.state.DrawPlanes);
    refit(ctx.renderer(), ctx.view.boxRatios);
  },
  hook: {
    inkFraction: (c) => () => c.renderer().inkFraction(),
    camera: (c) => () => c.renderer().camera(),
    // points in the picture's coordinates (the content is drawn in a BoxRatios group; tests)
    pixelAt: (c) => (p) => c.renderer().pixelAt(toWorld(c, p)),
    sceneToClient: (c) => (p) => c.renderer().worldToClient(toWorld(c, p)),
  },
});
