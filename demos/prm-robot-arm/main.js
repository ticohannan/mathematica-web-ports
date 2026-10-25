// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-robot-arm/main.js — the Manipulate: obstacle pads and heights, view angle, show obstacles, add vertices,
// restart, progress, radius, the two configuration locators; picture 1 the outer Graphics (phase-space inset, texts,
// locator icons; SVG), picture 2 the 3D workspace inset (three.js, workspace3d.js), on shared/manipulate.js (browser only).
// On the shared Manipulate layer since v0.1.21 (behaviour unchanged: tests and 3D parity of scene graph and pixels).
import { Manipulate, Locator, Button, None, Row, Slider, VerticalSlider } from '../../shared/manipulate.js';
import {
  Annotation, Polygon, Line, Point, Text, Translate, Circle, Clip, Raw, Style, Subscript, render, cachedGraphics,
  AbsoluteThickness, AbsoluteDashing, AbsolutePointSize, Thickness, PointSize, CapForm, Opacity, FontSize, Italic,
  ScriptSizeMultipliers, ScriptBaselineShifts, RGBColor, Lighter, Darker, Black, Red, Blue, Green, Magenta, Orange, Brown,
} from '../../shared/graphics.js';
import { svgNode } from '../../shared/svg-plot.js';
import { NAMED, css } from '../../shared/mma-colors.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { LOC_ICON, TWO_PI } from '../common/prm-core.js';
import { initialState, evaluate, xMin, yMin, xMax, yMax, toOuter, regionPolygons } from './model.js';
import { createWorkspace } from './workspace3d.js';

// ---- the outer Graphics[{Inset[3D], Inset[phase space], Text..., Locator...}, PlotRange -> {{-2.2,7.1},{-2.4,2.4}},
//      ImageSize -> {600, 320}] -------------------------------------------------------------------------------------
// createPlot's default 2 % PlotRangePadding is kept for this outer picture: in prm-robot-arm-1.png the phase
// frame (3.8 units) is 231.8 of the 600 image px = 61.0 px per unit; with the padding the {600, 320} image gives
// 61.7, without it 64.5. The phase-space inset itself has PlotRangePadding -> None: its frame and ticks span
// exactly 0…2π (minor ticks up to 6.2).
const OUTER = { range: [[-2.2, 7.1], [-2.4, 2.4]], pad: 0.02, imagePx: 600 };
const OUTER_W = (OUTER.range[0][1] - OUTER.range[0][0]) * (1 + 2 * OUTER.pad); // image width in outer units
const OUTER_X0 = OUTER.range[0][0] - OUTER.pad * (OUTER.range[0][1] - OUTER.range[0][0]); // left image edge
const OUTER_Y = OUTER.pad * (OUTER.range[1][1] - OUTER.range[1][0]); // vertical padding
const upx = OUTER_W / OUTER.imagePx; // outer units per nominal px (svg-plot's arithmetic)
// Inset[Graphics3D[..., ImageSize -> 280], {0, 0}]: centred on outer {0, 0}, 280 of the 600 px image width (square)
const INSET_FRAC = 280 / OUTER.imagePx;
const INSET_HALF = (INSET_FRAC * OUTER_W) / 2; // half side of the 3D inset in outer units

// The 3D inset is a canvas under the SVG (texts are drawn over the workspace, as in the original), placed on the stage
// in percentages from the same constants as the press-area hole below. The SVG lets pointer events through except on
// the press area and the locators (index.html).
const box3d = document.getElementById('workspace-3d');
Object.assign(box3d.style, { left: `${((0 - OUTER_X0) / OUTER_W - INSET_FRAC / 2) * 100}%`, width: `${INSET_FRAC * 100}%` });
const workspace = createWorkspace(box3d); // made before the controls, as before the migration (same canvas size)

// The Manipulate's Locator controls make the whole outer Graphics a LocatorPane: a press anywhere moves the nearest
// locator there (pickAnywhere, A-/F-PA-09). The press area is the whole picture EXCEPT the 3D inset, which keeps the
// mouse for rotating the view (whether the original's LocatorPane also takes presses on the 3D inset is not known:
// K-PA-05): the image rectangle and, with opposite orientation, the inset square (a hole under the nonzero rule).
const [ax0, ax1, ay0, ay1, h] = [OUTER_X0, OUTER_X0 + OUTER_W, OUTER.range[1][0] - OUTER_Y, OUTER.range[1][1] + OUTER_Y, INSET_HALF];
const PRESS_AREA = [[ax0, ay0], [ax1, ay0], [ax1, ay1], [ax0, ay1], [ax0, ay0], [-h, -h], [-h, h], [h, h], [h, -h], [-h, -h]];

// ---- the phase-space Inset: RegionPlot coordinates (θ1, θ2) in [0, 2π]², its {0,0} at {xMin, yMin}, width xMax - xMin
const W = TWO_PI; // the inset graphic's width in its own units: Thickness / PointSize fractions refer to it
const K = (xMax - xMin) / W; // outer units per radian
const ipx = upx / K; // radians per nominal px (inside the inset)
/**
 * Inset[Graphics[list, PlotRange -> {{0, 2π}, {0, 2π}}, PlotRangePadding -> None], {xMin, yMin}, {0, 0}, xMax - xMin]:
 * the list drawn by shared/graphics.js in phase coordinates; Thickness and PointSize are fractions of 2π, absolute sizes
 * px of the page. ESCAPE HATCH (Raw): graphics.js's Inset draws only Line and Circle so far (gap reported, v0.1.21).
 */
const strokeIn = (t) => (t == null ? ipx : typeof t === 'number' ? t * W : t.abs * ipx);
const phasePlot = (plot) => ({
  ...plot, unitsPerPx: ipx, plotRange: [[0, W], [0, W]], strokeWidth: strokeIn,
  line: (g, pts, st) => g.appendChild(svgNode('polyline', {
    points: pts.map((p) => `${p[0]},${p[1]}`).join(' '), fill: 'none', stroke: css(st.stroke), 'stroke-opacity': st.opacity,
    'stroke-width': strokeIn(st.thickness), 'stroke-dasharray': st.dash?.map((d) => d * ipx).join(' '), 'stroke-linecap': st.cap ?? 'round',
  })),
  point: (g, [cx, cy], size, color) => g.appendChild(svgNode('circle', { cx, cy, r: (typeof size === 'number' ? size * W : size.abs * ipx) / 2, fill: css(color) })),
});
const phaseInset = (list) => Raw((plot, g) => {
  const grp = plot.group(g, { transform: `translate(${xMin},${yMin}) scale(${K})`, 'data-testid': 'phase-space' });
  render(phasePlot(plot), grp, list);
  return grp;
});

const COLOR = { Magenta, Orange, Green, Brown, LighterBrown: Lighter(Brown) };
const MEDIUM = AbsolutePointSize(4.5); // PointSize[Medium] inside the inset (D-PA-04)
/** toroidLines pieces: Line[…] in each piece's colour. */
const pieces = (list, id) => list.map((p) => [COLOR[p.color], Annotation(Line(p.line), id)]);

/** FrameStyle -> {{Red, Directive[Red, Dashed]}, {Blue, Directive[Blue, Dashed]}}: left, right, bottom, top; ticks every
 * 0.2 rad (longer every 1) inward on all four sides. Static: drawn once (cachedGraphics). */
const frame = cachedGraphics();
function frameGraphics() {
  const dashed = AbsoluteDashing([4, 2.7]);
  const ticks = [];
  for (let k = 1; k <= 31 && k * 0.2 < W; k++) {
    const t = k * 0.2, len = (k % 5 === 0 ? 3 : 1.8) * ipx;
    ticks.push(Blue, Line([[t, 0], [t, len]]), Line([[t, W], [t, W - len]]), Red, Line([[0, t], [len, t]]), Line([[W, t], [W - len, t]]));
  }
  return [AbsoluteThickness(0.75), CapForm('Butt'),
    Red, Annotation(Line([[0, 0], [0, W]]), 'frame-left'), [dashed, Annotation(Line([[W, 0], [W, W]]), 'frame-right')],
    Blue, Annotation(Line([[0, 0], [W, 0]]), 'frame-bottom'), [dashed, Annotation(Line([[0, W], [W, W]]), 'frame-top')], ticks];
}

// ---- the RegionPlot of the C-obstacles (path data cached by obstacle positions and quality) --------------------------
const regionCache = new Map();
const f4 = (v) => Math.round(v * 1e4) / 1e4;
function regionPaths(desc) {
  const key = JSON.stringify(desc);
  if (!regionCache.has(key)) {
    if (regionCache.size > 6) regionCache.clear();
    const n = desc.quality === 'speed' ? 48 : 160; // PlotPoints stand-in (D-PA-01)
    regionCache.set(key, desc.pObs3.map((c) => {
      const { polys, segs } = regionPolygons(c, n);
      return {
        fill: polys.map((p) => `M${p.map((q) => `${f4(q[0])},${f4(q[1])}`).join('L')}Z`).join(''),
        edge: segs.map(([a, b]) => `M${f4(a[0])},${f4(a[1])}L${f4(b[0])},${f4(b[1])}`).join(''),
      };
    }));
  }
  return regionCache.get(key);
}
const BOUNDARY = [[0.368417, 0.506779, 0.709798], [0.880722, 0.611041, 0.142051]]; // RegionPlot BoundaryStyle Automatic
/**
 * RegionPlot[…] of the two C-obstacles (RegionPlot[False, …] = nothing): one SVG path per region, filled, with a hairline
 * stroke in the fill colour that hides the seams between grid cells, and its boundary. ESCAPE HATCH (Raw): a Polygon
 * list would be one element per grid cell, with visible seams (no FilledCurve / single-path polygon in graphics.js).
 */
const region = (desc) => Raw((plot, g) => {
  const grp = plot.group(g, { 'data-layer': 'region' });
  if (!desc || !desc.pObs3) return grp;
  const fills = [NAMED.LightBlue, NAMED.LightOrange];
  regionPaths(desc).forEach(({ fill, edge }, i) => {
    grp.append(svgNode('path', { d: fill, fill: css(fills[i]), stroke: css(fills[i]), 'stroke-width': 0.6 * ipx, 'data-testid': `c-obstacle-${i === 0 ? 'blue' : 'orange'}` }));
    grp.append(svgNode('path', { d: edge, fill: 'none', stroke: css(BOUNDARY[i]), 'stroke-width': 1.2 * ipx, 'stroke-linecap': 'round' }));
  });
  return grp;
});

/** loc[col] at p: the original's 17 px locator icon (LOC_ICON data) in outer units; test id icon-<name>, data-color. */
function locIcon(name, p, bad) {
  const u = upx * LOC_ICON.pxPerUnit;
  return Annotation(Translate([bad ? Red : Darker(Green), AbsoluteThickness(1), CapForm('Butt'),
    Line(LOC_ICON.lines.map(([[a, b], [c, d]]) => [[a * u, b * u], [c * u, d * u]])),
    LOC_ICON.circles.map(({ c, r, thicknessPx, opacity }) => [AbsoluteThickness(thicknessPx), Opacity(opacity), Circle([c[0] * u, c[1] * u], r * u)]),
  ], p), `icon-${name}`, { class: 'loc-icon', 'data-color': bad ? 'red' : 'green' });
}
/** Text[Style[Subscript[θ, k], Italic, 13]] (the subscript 9 px, 3 px down, as measured). */
const thetaLabel = (k, pos) => Annotation(Text(Style(Subscript('θ', k), Italic, FontSize(13), ScriptSizeMultipliers({ abs: 9 }),
  ScriptBaselineShifts([{ abs: 3 }, 0])), pos), `text-theta${k}`);

const NAME = { pConfig: 'start', pConfigf: 'goal' };
const I = initialState();
const copy = (x) => JSON.parse(JSON.stringify(x));

const m = Manipulate({
  name: 'prm-robot-arm',
  initial: initialState,
  random: true, // A-PA-07: unseeded like the original; ?seed=N for reproducible runs
  ControlActive: true, // the RegionPlot uses fewer points while a control or locator is dragged (D-PA-01)
  body: (s, { rng, controlActive }) => evaluate(s, rng, { controlActive }),
  draw: (v, s) => [[
    [Opacity(0), Annotation(Polygon(PRESS_AREA), 'press-area', { style: 'pointer-events:fill', 'data-layer': 'press-area' })],
    phaseInset([
      Clip([
        region(s.freeConfigSpace),
        [CapForm('Butt'), v.direct && [Thickness(0.02), pieces(v.direct, 'direct-line')],
          [v.thickConnectors ? Thickness(0.02) : AbsoluteThickness(1), pieces(v.connectors, 'connector')],
          [Thickness(0.02), pieces(v.pathEdges, 'path-edge')],
          v.endPoints && [Black, Point(v.qs), Point(v.qf)]], // default PointSize 0.008 of the inset width
        // Darker[Green], PointSize[Medium], Point[goodPts], Red, Point[badPts]
        [Darker(Green), MEDIUM, s.goodPts.map((p) => Annotation(Point(p), 'good-point')), Red, s.badPts.map((p) => Annotation(Point(p), 'bad-point'))],
        // toroidLines[edgesNN, Lighter[Brown], Brown] — drawn AFTER the points in this Demonstration
        [CapForm('Butt'), AbsoluteThickness(1), pieces(v.edges, 'roadmap-edge')],
        [Blue, PointSize(0.04), Annotation(Point(v.robotq), 'robot-progress')], // {Blue, PointSize[0.04], Point[robotq]}
      ], [[0, W], [0, W]], 'phase-clip'),
      frame([], frameGraphics),
    ]),
    [FontSize(12), Annotation(Text('robot workspace', [0, 2.25]), 'text-workspace'), Annotation(Text('robot phase space', [4.8, 2.25]), 'text-phase'),
      Annotation(Text(Style(v.label === 'No path possible' ? v.label : `${v.label.prefix}${mmaNumberString(v.label.value)}`, Italic), [4.8, 2]), 'path-label')],
    thetaLabel('1', [4.8, -2.2]), thetaLabel('2', [2.8, 0]),
    // Locator[pConfig, If[inCollision, loc[Red], loc[Darker[Green]]]], Locator[pConfigf, …]
    locIcon('start', s.pConfig, v.inCollision), locIcon('goal', s.pConfigf, v.inCollisionf),
  ], { qs: v.qs, qf: v.qf, robotq: v.robotq, inCollision: v.inCollision, pObs3: v.pObs3, viewAng: s.viewAng }],
  graphics: [
    { id: 'stage', PlotRange: OUTER.range, ImageSize: OUTER.imagePx, PlotRangePadding: OUTER.pad, label: 'Left: robot workspace in 3D. Right: robot phase space (joint angles θ1, θ2) with samples, roadmap and path' },
    { id: 'workspace-3d', renderer: workspace }, // Inset[Graphics3D[…], {0, 0}] (workspace3d.js)
  ],
  // ControlPlacement -> Top, Rows as in the original; `label` keeps the controls' accessible names, `name` their test ids
  controls: [
    Row([
      [['obstaxy', I.obstaxy, Subscript('blue', 'xy')], [-1, -1], [1, 1], { name: 'blue-xy', label: 'blue_xy' }],
      [['obstaz', I.obstaz, Subscript('blue', 'z')], 0, 2, { ControlType: VerticalSlider, name: 'blue-z', label: 'blue_z' }],
      [['obstbxy', I.obstbxy, Subscript('orange', 'xy')], [-1, -1], [1, 1], { name: 'orange-xy', label: 'orange_xy' }],
      [['Obstbz', I.Obstbz, Subscript('orange', 'z')], 0, 2, { ControlType: VerticalSlider, name: 'orange-z', label: 'orange_z' }],
      [['viewAng', I.viewAng, 'view angle'], -Math.PI / 2, 1.5 * Math.PI, { ControlType: Slider, name: 'view-angle' }],
      [['showConfigObs', false, 'show obstacles'], [false, true], { name: 'show-obstacles' }],
    ], { name: 'obstacles' }),
    Row([
      Button('add 100 vertices', (s) => { s.addPoints = true; }, { name: 'add-vertices' }),
      Button('restart', (s) => { s.restart = true; }),
      [['progress', 0], 0, 1, { ControlType: Slider }],
    ], { name: 'roadmap' }),
    // PORT DEVIATION: the radius slider keeps the port's own steps and number field (steps: undefined)
    [['r', I.r, 'radius'], 0, 2, 0.01, { Appearance: 'Labeled', name: 'radius', steps: undefined }],
    // {{pConfig, {5,0}}, {xMin-.1, yMin-.1}, {xMax+.1, yMax+.1}, Locator, Appearance -> None}, pConfigf
    [['pConfig', I.pConfig], [xMin - 0.1, yMin - 0.1], [xMax + 0.1, yMax + 0.1], Locator, { Appearance: None }],
    [['pConfigf', I.pConfigf], [xMin - 0.1, yMin - 0.1], [xMax + 0.1, yMax + 0.1], Locator, { Appearance: None }],
  ],
  // the visible icons are the Locator[…] primitives above; the locators keep their test ids locator-start / locator-goal
  locators: { testid: (n) => `locator-${NAME[n]}`, describe: (n) => `${NAME[n]} configuration locator; arrow keys move it` },
  hook: { // port addition A-PA-03
    copy,
    loadState: (c) => (partial) => copy(c.setState(copy(partial))),
    moveLocator: (c) => (n, p) => { c.moveLocator(n === 'start' ? 'pConfig' : 'pConfigf', p); return copy(c.state); },
    phaseToClient: (c) => (q) => c.plot.worldToClient(toOuter(q)),
    webgl: () => workspace.ok,
    inkFraction: () => () => workspace.inkFraction(),
    camera: () => () => workspace.cameraPosition(),
    robotColor: () => () => workspace.robotColor(),
  },
});
// VerticalSlider shows no value; the progress track as wide as in the original; the radius row not wider than its track
for (const n of ['obstaz', 'Obstbz']) m.controls.get(n).row.querySelector('.ctl-vvalue').hidden = true;
m.controls.get('progress').row.querySelector('input').style.minWidth = '200px';
m.controls.get('r').row.style.maxWidth = '460px';
