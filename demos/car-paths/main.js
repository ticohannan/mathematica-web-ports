// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Francesco Bernardini and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/car-paths/main.js — the Manipulate: progress, the row of r_min, type and swap, the four locators and the
// Graphics (path, start, goal and moving cars, locator glyphs) with its PlotLabel, on shared/manipulate.js (browser only).
import { Manipulate, Locator, Button, Row, None, hookCopy } from '../../shared/manipulate.js';
import {
  Annotation, Line, Disk, Translate, Raw, Style, Subscript, Italic, Opacity, EdgeForm, FaceForm, CapForm, GrayLevel, Darker,
  cssColor, White, Green, Red,
} from '../../shared/graphics.js';
import { svgNode } from '../../shared/svg-plot.js';
import { el } from '../../shared/ui.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { initialState, evaluate, picture, swapStartGoal, PLOT_RANGE, LOCATOR_RANGE, TYPES, LOCS0 } from './carpaths.js';

const DESCR = { 1: 'start position', 2: 'start orientation', 3: 'goal position', 4: 'goal orientation' };
/** Locator[p] as a primitive: the default glyph (shared/svg-plot.js locatorGlyph as data: ring and cross hairs, 17 px). */
const R = (17 / 2.4) * ((30 * 1.04) / 620); // ring radius in world units (world units per px: the padded range / 620)
const HAIRS = [[-1.6, -0.45], [0.45, 1.6]].flatMap(([a, b]) => [[[a * R, 0], [b * R, 0]], [[0, a * R], [0, b * R]]]);
const locator = (p) => Translate([GrayLevel(0.25), [FaceForm(White), Opacity(0.55), EdgeForm(GrayLevel(0.25)), Disk([0, 0], R)],
  CapForm('Butt'), Line(HAIRS)], p);
/**
 * Rotate[colorLocatorOrient[colour], θ]: a locator with only vertical reticles (ImageSize 17, PlotRange ±8). Raw (the
 * old SVG code): the browser tests read the glyph as an element .orient-glyph with transform "rotate(θ°) scale(k)";
 * as data (Rotate[Inset[Graphics[…]], θ, p]) the pixels are the same but the element structure differs.
 */
const orientGlyph = (colour, theta, p) => Raw((plot, g) => {
  const k = (17 / 16) * plot.unitsPerPx, w = (px) => px / (17 / 16), c = cssColor(colour); // world units per glyph unit
  const holder = plot.group(g, { transform: `translate(${p[0]},${p[1]})` });
  const n = plot.group(holder, { class: 'locator-glyph orient-glyph', transform: `rotate(${(theta * 180) / Math.PI}) scale(${k})` });
  // AbsoluteThickness[0.8], LineBox {{0,-10},{0,-2}}, {{0,2},{0,10}} (clipped to the glyph's PlotRange ±8), CircleBox[{-0.5, 0.5}, 5]
  for (const [y1, y2] of [[-8, -2], [2, 8]]) n.append(svgNode('line', { x1: 0, y1, x2: 0, y2, stroke: c, 'stroke-width': w(0.8) }));
  n.append(svgNode('circle', { cx: -0.5, cy: 0.5, r: 5, fill: 'none', stroke: c, 'stroke-width': w(0.8) }));
  // {AbsoluteThickness[3], Opacity[0.3], CircleBox[{-0.5, 0.5}, 3]}
  n.append(svgNode('circle', { cx: -0.5, cy: 0.5, r: 3, fill: 'none', stroke: c, 'stroke-opacity': 0.3, 'stroke-width': w(3) }));
  return holder;
});

let labelEl = null;
const m = Manipulate({
  name: 'car-paths',
  initial: initialState,
  // the body's input corrections (progress, minRadius) are written back into the controls; the path and the three cars
  // are Graphics data from carpaths.js picture, followed by Locator[locsOld[[1]]],
  // Locator[locsOld[[2]], Rotate[colorLocatorOrient[Darker[Green]], sTheta]], … (glyphs only)
  body: (st) => {
    const { state: s, view } = evaluate(st);
    return { state: s, view, graphics: [picture(s, view),
      Annotation(locator(s.locsOld[0]), 'glyph-1'), Annotation(orientGlyph(Darker(Green), view.sTheta, s.locsOld[1]), 'glyph-2'),
      Annotation(locator(s.locsOld[2]), 'glyph-3'), Annotation(orientGlyph(Red, view.gTheta, s.locsOld[3]), 'glyph-4')] };
  },
  // Graphics[…, PlotRange -> {{-15, 15}, {-10, 10}}, ImageSize -> {620, Automatic}, PlotLabel -> …]
  graphics: { PlotRange: PLOT_RANGE, ImageSize: 620, label: 'Plane with the start car (green), the goal car (red), the shortest path (orange) and the moving car (blue)' },
  controls: [ // ControlPlacement -> Top (the Manipulate default); the sliders keep the port's own steps (steps: undefined)
    // {{locs, …}, {-14, -9}, {14, 9}, Locator, Appearance -> None}: four invisible locators at locs
    [['locs', LOCS0.map((p) => [...p])], ...LOCATOR_RANGE, Locator, { Appearance: None }],
    [['progress', 0], 0, 1, 0.001, { Appearance: 'Labeled', steps: undefined }], // ImageSize -> 500 (below)
    // Row[{Control@{{minRadius, 3, Subscript[Style["r", Italic], min]}, 0.001, 10, 0.001, …}, Control@{type, …}, Button[…]}]
    Row([
      [['minRadius', 3, Subscript(Style('r', Italic), 'min')], 0.001, 10, 0.001, { Appearance: 'Labeled', steps: undefined }],
      [['type', 'Reeds-Shepp'], TYPES],
      Button('swap start and goal', (s, ctx) => { ctx.state = swapStartGoal(s); }, { name: 'swap' }),
    ], { name: 'settings' }),
  ],
  // LocatorPane: a press within 12 px grabs a locator in place, anywhere else the nearest jumps there (D-CP-06)
  // the locators keep their test ids locator-1 … locator-4 (the layer names a list's locators locs-1 … locs-4)
  locators: { keyStep: 0.1, testid: (n) => `locator-${n.slice(5)}`, describe: (n) => `${DESCR[n.slice(5)]} locator; arrow keys move it` },
  after: (ctx) => { // PlotLabel -> Style[Row[{"path length: ", …, "   distance: ", …}], 14, Black], above the plot area
    if (!labelEl) {
      labelEl = el('div', { class: 'plot-label', 'data-testid': 'plot-label', style: 'text-align:center;font-size:14px;color:#000;white-space:pre;padding-top:4px' });
      ctx.plot.svg.before(labelEl);
    }
    labelEl.textContent = `path length: ${mmaNumberString(ctx.view.pathLengthValue, { isReal: true })}   distance: ${mmaNumberString(ctx.view.distanceValue, { isReal: true })}`;
  },
  hook: { // port addition A-CP-03
    view: (v) => ({ ...v, paths: v.paths ? v.paths.length : null }),
    labelText: () => () => labelEl.textContent,
    /** move locator n (1..4) to world point p, as one front-end update (the locator range applies) */
    moveLocator: (ctx) => (n, p) => { ctx.moveLocator(`locs-${n}`, p); return hookCopy(ctx.state); },
  },
});
// slider widths of the original (ImageSize -> 500 and 150, shrinking with the window) and the button's ImageSize -> 160
const width = (n, px) => Object.assign(m.controls.get(n).row.querySelector('input[type=range]').style, { flex: `0 1 ${px}px`, width: `${px}px` });
width('progress', 500);
width('minRadius', 150);
document.querySelector('[data-testid="button-swap"]').style.minWidth = '160px';
