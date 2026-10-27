// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dubins-reachability-3d/main.js — the page: the original's Manipulate (shared/manipulate.js). The body draws
// either the 3D set (Graphics3D, shared/graphics3d-view.js) or its 2D projection (a plot, SVG), as dim says; the two
// pictures are stacked in one place and only the current one is shown (N-D3-01).
import { Manipulate, Delimiter, None, PopupMenu, IntervalSlider } from '../../shared/manipulate.js';
import { Graphics, Style, Row, Italic } from '../../shared/graphics.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { SAVED, DIMS, PATHS, PLOT_RANGE_2D, SURFACE_COLORS, initialState, evaluate } from './model.js';
import { createAdjust3D } from './picture3d.js';

/** Image framing: the box drawn about as large as in snapshots 1 and 3 (View3D fits the box's sphere, D-D3-05). */
const ZOOM = 0.99;
const view3D = View3D({
  testid: 'scene-canvas', label: '3D reachability set of a Dubins car (3D, drag to rotate)', zoom: ZOOM,
  thickPx: 2, thinPx: 1, // the curves' AbsoluteThickness[2] (Thick) and the thin mesh lines
  tickClass: 'd3-tick', axisLabelClass: 'd3-axis-label', tickLabelOffset: 0.055, axisLabelOffset: 0.12, // as snapshot 1 places them
});
// the 3D picture when the body gives none (2D before any 3D evaluation): nothing to draw
const picture3D = Object.assign(Object.create(view3D), { draw: (g, ctx) => { if (g) view3D.draw(g, ctx); } });

// The picture the body does not draw (the other dimension) keeps its last frame: the 3D one its last Graphics3D (its
// parts are cached, nothing is redrawn), the 2D one its frame without content.
const last = [null, null];
const body = (state, opts) => {
  const r = evaluate(state, opts);
  const [g3, g2] = r.graphics;
  if (g3) last[0] = g3;
  if (g2) last[1] = g2;
  return { ...r, graphics: [g3 ?? last[0], g2 ?? (last[1] ? Graphics([], last[1].options) : [])] };
};

// after each drawing of the 3D picture: refit to a new plot range, the plot theme's lighting, the box behind the content
// (picture3d.js: where View3D draws differently from the snapshots, D-D3-03, D-D3-05, D-D3-07)
const adjust3D = createAdjust3D({ surfaceColors: SURFACE_COLORS, zoom: ZOOM });

Manipulate({
  name: 'dubins-reachability-3d',
  initial: initialState, // the notebook's saved state = the Manipulate's initial values
  body,
  ControlActive: true, // ControlActive[None, told = t; …]: the old values follow only when no slider is dragged
  throttle: 'frame', // at most one evaluation per frame while a slider moves (a new 3D plot takes tens of ms; Mathematica skips updates too)
  graphics: [
    { id: 'graphic', renderer: picture3D },
    // the 2D picture's first frame; the first 2D evaluation makes it again with the plot's frame and legend
    { id: 'graphic2', PlotRange: PLOT_RANGE_2D, PlotRangePadding: [0.05, 0.05], UpdateFrame: true, ImageSize: 440, testid: 'scene-2d', label: '2D projection of the reachability set of a Dubins car, with the car at progress p' },
  ],
  controls: [ // ControlPlacement -> Left; the text lines above the controls are the controls' labels (N-D3-03)
    [['dim', SAVED.dim, 'dimension'], DIMS],
    [['dimold', SAVED.dimold], None],
    '',
    [['r', SAVED.r, Row([Style('r', Italic), ' (m)'])], 0.5, 10, { Appearance: 'Labeled', ImageSize: 100 }],
    [['rold', SAVED.rold], None],
    [['t', SAVED.t, Row([Style('t', Italic), ' (s)'])], 0.1, 14, { Appearance: 'Labeled', ImageSize: 100 }],
    [['told', SAVED.told], None],
    [['plotReach', SAVED.plotReach], None],
    Delimiter,
    'move car', // Style["move car", 12]
    '',
    // six values: Mathematica makes a list of more than five values a PopupMenu (snapshots)
    [['path', SAVED.path, 'path type'], PATHS, { ControlType: PopupMenu }],
    '',
    [['τ', SAVED.τ, Row(['switching times ', Style('τ', Italic)])], 0, 1, 0.01, { ImageSize: 100, ControlType: IntervalSlider, Method: 'Push', look: 'mma' }],
    '',
    [['p', SAVED.p, 'path progress (%)'], 0, 100, 1, { Appearance: 'Labeled', ImageSize: 100 }],
  ],
  after: (ctx) => {
    const dim = ctx.state.dim;
    document.getElementById('graphic').hidden = dim !== '3D';
    document.getElementById('graphic2').hidden = dim !== '2D';
    if (dim === '3D') adjust3D(ctx.renderer(0));
  },
  hook: {
    inkFraction: (c) => () => c.renderer(0).inkFraction(),
    camera: (c) => () => c.renderer(0).camera(),
    pixelAt: (c) => (p) => c.renderer(0).pixelAt(p),
    themed: (c) => () => (c.renderer(0).groups[0]?.children ?? []).filter((o) => o.material?.userData.themeSurface !== undefined).length, // D-D3-03
  },
});
