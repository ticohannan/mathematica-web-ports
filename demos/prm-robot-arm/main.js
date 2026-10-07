// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-robot-arm/main.js — page: controls, the outer Graphics (SVG) with the phase-space inset and the
// three.js workspace inset, locator dragging (browser only).
import { Controls, el } from '../../shared/ui.js';
import { addButton, addCheckbox, addVerticalSlider, addRow } from '../../shared/ui-extra.js';
import { createPlot, addLocators, svgNode } from '../../shared/svg-plot.js';
import { NAMED, darker, lighter, css } from '../../shared/mma-colors.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { createRng, replayRng } from '../../shared/random.js';
import { LOC_ICON, TWO_PI } from '../common/prm-core.js';
import { initialState, evaluate, clampLoc, xMin, yMin, xMax, toOuter, regionPolygons } from './model.js';
import { createWorkspace } from './workspace3d.js';

// ---- random source (A-PA-07): unseeded like the original; ?seed=N for reproducible runs ----------------------
const seedParam = new URLSearchParams(location.search).get('seed');
let rng = createRng({ seed: seedParam !== null && /^\d+$/.test(seedParam) ? Number(seedParam) : null });

let state = initialState();
let view = null;
let controlActive = false; // Mathematica's ControlActive: a slider, pad or locator is being dragged

// ---- the outer Graphics[{Inset[3D], Inset[phase space], Text..., Locator...}, PlotRange -> {{-2.2,7.1},{-2.4,2.4}},
//      ImageSize -> {600, 320}] -------------------------------------------------------------------------------------
const graphic = document.getElementById('graphic');
// a positioned stage exactly as large as the picture: the 3D inset is placed on it in percentages
const stage = el('div', { class: 'stage', style: 'position:relative;max-width:750px' });
graphic.append(stage);
// createPlot's default 2 % PlotRangePadding is kept for this outer picture: in prm-robot-arm-1.png the phase
// frame (3.8 units) is 231.8 of the 600 image px = 61.0 px per unit; with the padding the {600, 320} image gives
// 61.7, without it 64.5. The phase-space inset itself has PlotRangePadding -> None: its frame and ticks span
// exactly 0…2π (minor ticks up to 6.2).
const OUTER = { range: [[-2.2, 7.1], [-2.4, 2.4]], pad: 0.02, imagePx: 600 };
const OUTER_W = (OUTER.range[0][1] - OUTER.range[0][0]) * (1 + 2 * OUTER.pad); // image width in outer units
const OUTER_X0 = OUTER.range[0][0] - OUTER.pad * (OUTER.range[0][1] - OUTER.range[0][0]); // left image edge
const OUTER_Y = OUTER.pad * (OUTER.range[1][1] - OUTER.range[1][0]); // vertical padding
// Inset[Graphics3D[..., ImageSize -> 280], {0, 0}]: centred on outer {0, 0}, 280 of the 600 px image width (square)
const INSET_FRAC = 280 / OUTER.imagePx;
const INSET_HALF = (INSET_FRAC * OUTER_W) / 2; // half side of the 3D inset in outer units
const plot = createPlot(stage, {
  plotRange: OUTER.range, imageSize: OUTER.imagePx, padding: OUTER.pad,
  label: 'Left: robot workspace in 3D. Right: robot phase space (joint angles θ1, θ2) with samples, roadmap and path',
});
// The SVG lies ON TOP of the 3D canvas (texts are drawn over the workspace inset, as in the original) but lets
// pointer events through, except on the phase-space panel and the locators.
plot.svg.style.position = 'relative';
plot.svg.style.zIndex = '1';
plot.svg.style.pointerEvents = 'none';
const upx = plot.unitsPerPx; // outer units per nominal px

// Phase-space Inset: RegionPlot coordinates (θ1, θ2) in [0, 2π]², its {0,0} at {xMin, yMin}, width xMax - xMin
const K = (xMax - xMin) / TWO_PI; // outer units per radian
const defs = svgNode('defs');
const clip = svgNode('clipPath', { id: 'phase-clip' });
clip.append(svgNode('rect', { x: 0, y: 0, width: TWO_PI, height: TWO_PI }));
defs.append(clip);
plot.svg.prepend(defs);
const phaseOuter = plot.layer('phase');
const phase = svgNode('g', { transform: `translate(${xMin},${yMin}) scale(${K})`, 'data-testid': 'phase-space' });
phaseOuter.append(phase);
const hit = svgNode('rect', { x: 0, y: 0, width: TWO_PI, height: TWO_PI, fill: 'transparent', style: 'pointer-events:all' });
// The Manipulate's Locator controls make the whole outer Graphics a LocatorPane: a press anywhere moves the nearest
// locator there (shared/svg-plot.js pickAnywhere, A-/F-PA-09). The press area is the whole picture EXCEPT the 3D inset,
// which keeps the mouse for rotating the view (whether the original's LocatorPane also takes presses on the 3D
// inset is not known: K-PA-05).
{
  const [ax0, ax1] = [OUTER_X0, OUTER_X0 + OUTER_W];
  const [ay0, ay1] = [OUTER.range[1][0] - OUTER_Y, OUTER.range[1][1] + OUTER_Y];
  const h = INSET_HALF; // the same square as the 3D canvas below
  const pressArea = svgNode('path', {
    d: `M${ax0},${ay0}H${ax1}V${ay1}H${ax0}Z M${-h},${-h}H${h}V${h}H${-h}Z`, fill: 'transparent', 'fill-rule': 'evenodd',
    style: 'pointer-events:fill', 'data-layer': 'press-area',
  });
  plot.world.prepend(pressArea);
}
const phaseClipped = svgNode('g', { 'clip-path': 'url(#phase-clip)' });
const P = {
  region: svgNode('g', { 'data-layer': 'region' }), path: svgNode('g'), pts: svgNode('g'), edges: svgNode('g'), robot: svgNode('g'),
};
phaseClipped.append(P.region, P.path, P.pts, P.edges, P.robot);
const frame = svgNode('g', { 'data-layer': 'frame' });
phase.append(hit, phaseClipped, frame);
const T = { text: plot.layer('text'), glyphs: plot.layer('glyphs') };

const ipx = upx / K; // radians per nominal px (inside the inset)
const W = TWO_PI; // the inset graphic's width in its own units: Thickness / PointSize fractions refer to it
const COLOR = {
  Magenta: NAMED.Magenta, Orange: NAMED.Orange, Green: NAMED.Green, Brown: NAMED.Brown, LighterBrown: lighter(NAMED.Brown),
};
const GREEN_DARK = darker(NAMED.Green);
const MEDIUM_PX = 4.5; // PointSize[Medium] inside the inset (D-PA-04)
const DEFAULT_POINT = 0.008; // default 2D point size, fraction of the width
const BOUNDARY = [[0.368417, 0.506779, 0.709798], [0.880722, 0.611041, 0.142051]]; // RegionPlot BoundaryStyle Automatic

const seg = (g, [a, b], color, widthRad, extra = {}) => g.append(svgNode('line', {
  x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: css(color), 'stroke-width': widthRad, 'stroke-linecap': 'butt', ...extra,
}));
const dot = (g, [x, y], diamRad, color, testid) => g.append(svgNode('circle', { cx: x, cy: y, r: diamRad / 2, fill: css(color), 'data-testid': testid }));

function drawFrame() {
  // FrameStyle -> {{Red, Directive[Red, Dashed]}, {Blue, Directive[Blue, Dashed]}}: left, right, bottom, top
  const w = 0.75 * ipx;
  const dash = `${4 * ipx} ${2.7 * ipx}`;
  seg(frame, [[0, 0], [0, W]], NAMED.Red, w, { 'data-testid': 'frame-left' });
  seg(frame, [[W, 0], [W, W]], NAMED.Red, w, { 'stroke-dasharray': dash, 'data-testid': 'frame-right' });
  seg(frame, [[0, 0], [W, 0]], NAMED.Blue, w, { 'data-testid': 'frame-bottom' });
  seg(frame, [[0, W], [W, W]], NAMED.Blue, w, { 'stroke-dasharray': dash, 'data-testid': 'frame-top' });
  for (let k = 1; k <= 31; k++) {
    const t = k * 0.2;
    if (t >= W) break;
    const len = (k % 5 === 0 ? 3 : 1.8) * ipx;
    seg(frame, [[t, 0], [t, len]], NAMED.Blue, w);
    seg(frame, [[t, W], [t, W - len]], NAMED.Blue, w);
    seg(frame, [[0, t], [len, t]], NAMED.Red, w);
    seg(frame, [[W, t], [W - len, t]], NAMED.Red, w);
  }
}
drawFrame();

// ---- the RegionPlot of the C-obstacles (cached by obstacle positions and quality) ---------------------------------
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
let regionKey = null;
function drawRegion() {
  const desc = state.freeConfigSpace;
  const key = JSON.stringify(desc);
  if (key === regionKey) return; // unchanged (the original keeps freeConfigSpace too)
  regionKey = key;
  P.region.replaceChildren();
  if (!desc || !desc.pObs3) return; // RegionPlot[False, ...]: frame only
  const fills = [NAMED.LightBlue, NAMED.LightOrange];
  regionPaths(desc).forEach(({ fill, edge }, i) => {
    // one path per region; a hairline stroke in the fill colour hides the seams between grid cells
    P.region.append(svgNode('path', { d: fill, fill: css(fills[i]), stroke: css(fills[i]), 'stroke-width': 0.6 * ipx, 'data-testid': `c-obstacle-${i === 0 ? 'blue' : 'orange'}` }));
    P.region.append(svgNode('path', { d: edge, fill: 'none', stroke: css(BOUNDARY[i]), 'stroke-width': 1.2 * ipx, 'stroke-linecap': 'round' }));
  });
}

/** loc[col]: the original's locator icon (LOC_ICON data), in outer units. */
function locIcon(color) {
  const u = upx * LOC_ICON.pxPerUnit;
  const g = svgNode('g', { class: 'loc-icon' });
  for (const [[a, b], [c, d]] of LOC_ICON.lines) g.append(svgNode('line', { x1: a * u, y1: b * u, x2: c * u, y2: d * u, stroke: css(color), 'stroke-width': upx }));
  for (const { c, r, thicknessPx, opacity } of LOC_ICON.circles) {
    g.append(svgNode('circle', { cx: c[0] * u, cy: c[1] * u, r: r * u, fill: 'none', stroke: css(color), 'stroke-opacity': opacity, 'stroke-width': thicknessPx * upx }));
  }
  return g;
}

function drawPieces(g, pieces, widthRad, testid) {
  for (const p of pieces) seg(g, p.line, COLOR[p.color], widthRad, { 'data-testid': testid });
}

// ---- 3D workspace inset (three.js; WebGL 2) --------------------------------------------------------------------------
const box3d = el('div', { class: 'workspace-3d', 'data-testid': 'workspace-3d' });
// placed from the same constants as the press-area hole (OUTER, INSET_FRAC)
const fx = (0 - OUTER_X0) / OUTER_W; // fraction of the image width at outer x = 0
Object.assign(box3d.style, { position: 'absolute', left: `${(fx - INSET_FRAC / 2) * 100}%`, width: `${INSET_FRAC * 100}%`, top: '50%', transform: 'translateY(-50%)', zIndex: '0' });
stage.append(box3d);
const workspace = createWorkspace(box3d);

function draw() {
  for (const g of Object.values(P)) if (g !== P.region) g.replaceChildren();
  for (const g of Object.values(T)) g.replaceChildren();
  drawRegion();
  const thick = 0.02 * W;
  const thin = 1 * ipx;
  if (view.direct) drawPieces(P.path, view.direct, thick, 'direct-line');
  drawPieces(P.path, view.connectors, view.thickConnectors ? thick : thin, 'connector');
  drawPieces(P.path, view.pathEdges, thick, 'path-edge');
  if (view.endPoints) for (const q of [view.qs, view.qf]) dot(P.path, q, DEFAULT_POINT * W, NAMED.Black);
  // Darker[Green], PointSize[Medium], Point[goodPts], Red, Point[badPts]
  for (const p of state.goodPts) dot(P.pts, p, MEDIUM_PX * ipx, GREEN_DARK, 'good-point');
  for (const p of state.badPts) dot(P.pts, p, MEDIUM_PX * ipx, NAMED.Red, 'bad-point');
  // toroidLines[edgesNN, Lighter[Brown], Brown] — drawn AFTER the points in this Demonstration
  drawPieces(P.edges, view.edges, thin, 'roadmap-edge');
  // {Blue, PointSize[0.04], Point[robotq]}
  dot(P.robot, view.robotq, 0.04 * W, NAMED.Blue, 'robot-progress');
  // texts of the outer Graphics
  plot.text(T.text, 'robot workspace', [0, 2.25], { fontPx: 12, testid: 'text-workspace' });
  plot.text(T.text, 'robot phase space', [4.8, 2.25], { fontPx: 12, testid: 'text-phase' });
  const label = view.label === 'No path possible' ? view.label : `${view.label.prefix}${mmaNumberString(view.label.value)}`;
  plot.text(T.text, label, [4.8, 2], { fontPx: 12, italic: true, testid: 'path-label' });
  thetaLabel('1', [4.8, -2.2]);
  thetaLabel('2', [2.8, 0]);
  // Locator[pConfig, If[inCollision, loc[Red], loc[Darker[Green]]]], Locator[pConfigf, ...]
  for (const [name, p, bad] of [['start', state.pConfig, view.inCollision], ['goal', state.pConfigf, view.inCollisionf]]) {
    const g = locIcon(bad ? NAMED.Red : GREEN_DARK);
    g.setAttribute('transform', `translate(${p[0]},${p[1]})`);
    g.setAttribute('data-testid', `icon-${name}`);
    g.setAttribute('data-color', bad ? 'red' : 'green');
    T.glyphs.append(g);
  }
  locators.redraw();
  workspace.update({ qs: view.qs, qf: view.qf, robotq: view.robotq, inCollision: view.inCollision, pObs3: view.pObs3, viewAng: state.viewAng });
}

function thetaLabel(sub, pos) {
  const t = plot.text(T.text, '', pos, { fontPx: 13, italic: true, testid: `text-theta${sub}` });
  t.append(document.createTextNode('θ'));
  const s = svgNode('tspan', { 'font-size': 9 * upx, dy: 3 * upx });
  s.textContent = sub;
  t.append(s);
}

function run() {
  const r = evaluate(state, rng, { controlActive });
  state = r.state;
  view = r.view;
  draw();
}

// ---- locators {{pConfig, {5,0}}, {xMin-.1, yMin-.1}, {xMax+.1, yMax+.1}, Locator, Appearance -> None}, pConfigf -----
const KEY = { start: 'pConfig', goal: 'pConfigf' };
const locators = addLocators(plot, {
  names: ['start', 'goal'],
  get: (n) => state[KEY[n]],
  appearance: () => null,
  pickAnywhere: true, // Manipulate Locator controls = LocatorPane: a press goes to the nearest locator
  keyStep: 0.05,
  describe: (n) => `${n} configuration locator; arrow keys move it`,
  onStart: () => { controlActive = true; },
  onMove: (n, p) => { state[KEY[n]] = clampLoc(p); run(); },
});
for (const node of Object.values(locators.nodes)) node.style.pointerEvents = 'all';

// ---- controls (ControlPlacement -> Top, Rows as in the original) ----------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
const setLabelHtml = (api, html) => { const lab = api.row.querySelector('.ctl-label'); if (lab) lab.innerHTML = html; };
const markActive = (node) => node.addEventListener('pointerdown', () => { controlActive = true; });

/** Control[{..., ControlType -> Slider}]: a plain slider without value field and without the ⊕ panel. */
function plainSlider(parent, { name, label, min, max, value, onInput }) {
  const range = el('input', { type: 'range', min, max, step: 'any', value, 'data-testid': `slider-${name}`, 'aria-label': label });
  range.addEventListener('input', () => onInput(Number(range.value)));
  markActive(range);
  const row = el('div', { class: 'ctl ctl-slider', 'data-testid': `ctl-${name}` }, el('label', { class: 'ctl-label' }, label), el('div', { class: 'ctl-line' }, range));
  parent.append(row);
  return { row, get: () => Number(range.value), set: (v) => { range.value = String(v); } };
}

const row1 = addRow(controls, { name: 'obstacles' });
const blueXY = controls.slider2D({ name: 'blue-xy', label: 'blue_xy', min: [-1, -1], max: [1, 1], value: state.obstaxy, onInput: (v) => { state.obstaxy = v; run(); } });
row1.append(blueXY.row); setLabelHtml(blueXY, 'blue<sub>xy</sub>'); markActive(blueXY.row.querySelector('svg'));
const blueZ = addVerticalSlider(controls, { name: 'blue-z', label: 'blue_z', min: 0, max: 2, value: state.obstaz, parent: row1, onInput: (v) => { state.obstaz = v; run(); } });
setLabelHtml(blueZ, 'blue<sub>z</sub>'); markActive(blueZ.row.querySelector('input'));
const orangeXY = controls.slider2D({ name: 'orange-xy', label: 'orange_xy', min: [-1, -1], max: [1, 1], value: state.obstbxy, onInput: (v) => { state.obstbxy = v; run(); } });
row1.append(orangeXY.row); setLabelHtml(orangeXY, 'orange<sub>xy</sub>'); markActive(orangeXY.row.querySelector('svg'));
const orangeZ = addVerticalSlider(controls, { name: 'orange-z', label: 'orange_z', min: 0, max: 2, value: state.Obstbz, parent: row1, onInput: (v) => { state.Obstbz = v; run(); } });
setLabelHtml(orangeZ, 'orange<sub>z</sub>'); markActive(orangeZ.row.querySelector('input'));
for (const api of [blueZ, orangeZ]) api.row.querySelector('.ctl-vvalue').hidden = true; // VerticalSlider shows no value
const viewCtl = plainSlider(row1, { name: 'view-angle', label: 'view angle', min: -Math.PI / 2, max: 1.5 * Math.PI, value: state.viewAng, onInput: (v) => { state.viewAng = v; run(); } });
const obsCtl = addCheckbox(controls, { name: 'show-obstacles', label: 'show obstacles', value: state.showConfigObs, parent: row1, onChange: (v) => { state.showConfigObs = v; run(); } });

const row2 = addRow(controls, { name: 'roadmap' });
addButton(controls, { name: 'add-vertices', label: 'add 100 vertices', parent: row2, onClick: () => { state.addPoints = true; run(); } });
addButton(controls, { name: 'restart', label: 'restart', parent: row2, onClick: () => { state.restart = true; run(); } });
const progressCtl = plainSlider(row2, { name: 'progress', label: 'progress', min: 0, max: 1, value: state.progress, onInput: (v) => { state.progress = v; run(); } });
progressCtl.row.querySelector('input').style.minWidth = '200px';
const radiusCtl = controls.slider({ name: 'radius', label: 'radius', min: 0, max: 2, step: 0.01, value: state.r, onInput: (v) => { state.r = v; run(); } });
radiusCtl.row.style.maxWidth = '460px';
markActive(radiusCtl.row.querySelector('input[type=range]'));

// ControlActive becomes False when the mouse is released: Mathematica evaluates the body once more
window.addEventListener('pointerup', () => { if (controlActive) { controlActive = false; run(); } });
window.addEventListener('pointercancel', () => { if (controlActive) { controlActive = false; run(); } });

function syncControls() {
  blueXY.set(state.obstaxy); blueZ.set(state.obstaz); orangeXY.set(state.obstbxy); orangeZ.set(state.Obstbz);
  for (const api of [blueZ, orangeZ]) api.row.querySelector('.ctl-vvalue').hidden = true;
  viewCtl.set(state.viewAng); obsCtl.set(state.showConfigObs); progressCtl.set(state.progress); radiusCtl.set(state.r);
}

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  syncControls();
  run();
});

run();

// ---- test / automation hook (port addition A-PA-03) -------------------------------------------------------------
const copy = (x) => JSON.parse(JSON.stringify(x));
window.__demo = {
  name: 'prm-robot-arm',
  getState: () => copy(state),
  view: () => copy(view),
  setRng: (spec) => { rng = spec && (spec.reals || spec.integers) ? replayRng(spec) : createRng({ seed: spec?.seed ?? null }); },
  loadState: (partial) => { state = { ...state, ...copy(partial) }; syncControls(); run(); return copy(state); },
  moveLocator: (n, p) => { state[KEY[n]] = clampLoc(p); run(); return copy(state); },
  worldToClient: (p) => plot.worldToClient(p),
  phaseToClient: (q) => plot.worldToClient(toOuter(q)),
  webgl: workspace.ok,
  inkFraction: () => workspace.inkFraction(),
  camera: () => workspace.cameraPosition(),
  robotColor: () => workspace.robotColor(),
  ready: true,
};
