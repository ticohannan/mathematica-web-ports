// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm/main.js — page: controls, SVG drawing, locator dragging (browser only).
import { Controls } from '../../shared/ui.js';
import { addButton, addCheckbox } from '../../shared/ui-extra.js';
import { createPlot, addLocators, svgNode } from '../../shared/svg-plot.js';
import { NAMED, darker, lighter, css } from '../../shared/mma-colors.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { createRng, replayRng } from '../../shared/random.js';
import { initialState, evaluate, clampLoc, TWO_PI } from './model.js';
import { LOC_ICON } from '../common/prm-core.js';

/** loc[col]: the original's locator icon (LOC_ICON data), in world units of `plot`. */
function locIcon(plot, color) {
  const u = plot.unitsPerPx * LOC_ICON.pxPerUnit; // world units per icon unit
  const g = svgNode('g', { class: 'loc-icon' });
  for (const [[a, b], [c, d]] of LOC_ICON.lines) {
    g.append(svgNode('line', { x1: a * u, y1: b * u, x2: c * u, y2: d * u, stroke: css(color), 'stroke-width': plot.unitsPerPx }));
  }
  for (const { c, r, thicknessPx, opacity } of LOC_ICON.circles) {
    g.append(svgNode('circle', { cx: c[0] * u, cy: c[1] * u, r: r * u, fill: 'none', stroke: css(color), 'stroke-opacity': opacity, 'stroke-width': thicknessPx * plot.unitsPerPx }));
  }
  return g;
}

// ---- random source (A-PR-07): unseeded like the original; ?seed=N for reproducible runs ----------------
const seedParam = new URLSearchParams(location.search).get('seed');
let rng = createRng({ seed: seedParam !== null && /^\d+$/.test(seedParam) ? Number(seedParam) : null });

let state = initialState();
let view = null;

// ---- the picture: Graphics[..., Axes -> True, AxesOrigin -> {0,0}, PlotRange -> {{0,2π},{0,2π}}] --------
// PORT DEVIATION (D-PR-01): ImageSize ≈ 380 px estimated from the snapshots. The axes span exactly 0…2π (as in
// prm-2.png); around the plot range the image keeps a margin of about 2 % of the range plus a few px (measured in
// prm-1.png) that holds the tick labels and the PlotLabel. PlotRangeClipping -> False (Mathematica's default):
// wrapped edges and polygons may extend beyond the plot range into that margin, up to the image edge.
const IMAGE = 380;
const PAD = 0.02 * TWO_PI;
const MARGIN_PX = { left: 6, right: 0, bottom: 8, top: 10 }; // as measured in snapshot prm-1.png (labels overlap the padding)
const plotW = TWO_PI + 2 * PAD;
const upx = plotW / (IMAGE - MARGIN_PX.left - MARGIN_PX.right); // world units per nominal px
const X0 = -PAD - MARGIN_PX.left * upx, X1 = TWO_PI + PAD + MARGIN_PX.right * upx;
const Y0 = -PAD - MARGIN_PX.bottom * upx, Y1 = TWO_PI + PAD + MARGIN_PX.top * upx;
const plot = createPlot(document.getElementById('graphic'), {
  plotRange: [[X0, X1], [Y0, Y1]], padding: 0, imageSize: IMAGE,
  label: 'Configuration space (two joint angles, a torus) with obstacles, sampled vertices, roadmap and path',
});
// Thickness[t] / PointSize[d] are fractions of the total width of the graphic (= this plot range width)
const L = {
  axes: plot.layer('axes'), obs: plot.layer('obs'), edges: plot.layer('edges'), path: plot.layer('path'),
  pts: plot.layer('pts'), glyphs: plot.layer('glyphs'), text: plot.layer('text'),
};
const COLOR = {
  Magenta: NAMED.Magenta, LightBlue: NAMED.LightBlue, Blue: NAMED.Blue, Green: NAMED.Green, LighterGreen: lighter(NAMED.Green),
};
const GREEN_DARK = darker(NAMED.Green);
const MEDIUM = { abs: 5.5 }; // PointSize[Medium], estimated from the snapshots (D-PR-02)
const DEFAULT_POINT = 0.008; // default 2D point size

function drawAxes() {
  const g = L.axes;
  const gray = [0.6, 0.6, 0.6];
  // axes and ticks only on 0…2π: major ticks 0…6, minor ticks every 0.2 up to 6.2
  plot.line(g, [[0, 0], [TWO_PI, 0]], { stroke: gray, thickness: { abs: 1 }, cap: 'butt', testid: 'axis-x' });
  plot.line(g, [[0, 0], [0, TWO_PI]], { stroke: gray, thickness: { abs: 1 }, cap: 'butt', testid: 'axis-y' });
  for (let k = 0; k <= 31; k++) {
    const t = k * 0.2;
    if (t > TWO_PI) break;
    const major = k % 5 === 0;
    const len = (major ? 4 : 2.5) * upx;
    plot.line(g, [[t, 0], [t, len]], { stroke: gray, thickness: { abs: 0.75 }, cap: 'butt', testid: 'tick-x' });
    plot.line(g, [[0, t], [len, t]], { stroke: gray, thickness: { abs: 0.75 }, cap: 'butt' });
    if (major) {
      plot.text(g, String(k / 5), [t, -9 * upx], { fontPx: 11, testid: `tick-x-${k / 5}` });
      plot.text(g, String(k / 5), [-7 * upx, t], { fontPx: 11, anchor: 'middle' });
    }
  }
}
drawAxes();

function drawPieces(g, pieces, thickness, testid) {
  for (const p of pieces) plot.line(g, p.line, { stroke: COLOR[p.color], thickness, cap: 'butt', testid });
}

function draw() {
  for (const k of ['obs', 'edges', 'path', 'pts', 'glyphs', 'text']) L[k].replaceChildren();
  // If[showConfigObs, {Pink, Polygon[polys]}]
  if (state.showConfigObs) state.polys.forEach((poly, i) => plot.polygon(L.obs, poly, { fill: NAMED.Pink, testid: `obstacle-${i + 1}` }));
  // toroidLines[edgesNN, LightBlue, Blue]
  drawPieces(L.edges, view.edges, null, 'roadmap-edge');
  // path, connectors, progress point
  const thick = 0.02;
  if (view.direct) drawPieces(L.path, view.direct, thick, 'direct-line');
  drawPieces(L.path, view.connectors, view.thickConnectors ? thick : null, 'connector');
  drawPieces(L.path, view.pathEdges, thick, 'path-edge');
  if (view.endPoints) for (const q of [state.qs, state.qf]) plot.point(L.path, q, DEFAULT_POINT, NAMED.Black);
  if (view.progressPoint) plot.point(L.path, view.progressPoint, 0.04, NAMED.Purple, 'progress-point');
  // Darker[Green], PointSize[Medium], Point[goodPts], Red, Point[badPts]
  for (const p of state.goodPts) plot.point(L.pts, p, MEDIUM, GREEN_DARK, 'good-point');
  for (const p of state.badPts) plot.point(L.pts, p, MEDIUM, NAMED.Red, 'bad-point');
  // Locator[qs, If[ptInPolys[polys, qs], loc[Red], loc[Darker[Green]]]], then qf
  for (const [name, q, bad] of [['qs', state.qs, view.qsInObstacle], ['qf', state.qf, view.qfInObstacle]]) {
    const g = locIcon(plot, bad ? NAMED.Red : GREEN_DARK);
    g.setAttribute('transform', `translate(${q[0]},${q[1]})`);
    g.setAttribute('data-testid', `icon-${name}`);
    g.setAttribute('data-color', bad ? 'red' : 'green');
    L.glyphs.append(g);
  }
  // PlotLabel
  const text = view.label === 'no path possible' ? view.label : `${view.label.prefix}${mmaNumberString(view.label.value)}`;
  plot.text(L.text, text, [TWO_PI / 2, TWO_PI + PAD - 3 * upx], { fontPx: 13, color: [0.35, 0.35, 0.35], testid: 'plot-label' });
  locators.redraw();
  progressCtl.setEnabled(view.progressEnabled);
}

function run() {
  const r = evaluate(state, rng);
  state = r.state;
  view = r.view;
  draw();
}

// Locators: {{qf, {5,5}}, {-.1,-.1}, {2.1π,2.1π}, Locator, Appearance -> None}, then qs (same range)
const locators = addLocators(plot, {
  names: ['qf', 'qs'],
  get: (n) => state[n],
  pickAnywhere: true, // Manipulate Locator controls = LocatorPane: a press goes to the nearest locator
  appearance: () => null, // Appearance -> None; the visible icons are the Locator[...] primitives (layer glyphs)
  keyStep: 0.05,
  describe: (n) => (n === 'qs' ? 'start configuration locator; arrow keys move it' : 'goal configuration locator; arrow keys move it'),
  onMove: (n, p) => { state[n] = clampLoc(p); run(); },
});

// ---- controls (ControlPlacement -> Left) ---------------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
addButton(controls, { name: 'add-vertices', label: 'add 50 vertices', onClick: () => { state.addPoints = true; run(); } });
const radiusCtl = controls.slider({ name: 'radius', label: 'radius', min: 0, max: 1, step: 0.01, value: state.r, onInput: (v) => { state.r = v; run(); } });
const progressCtl = controls.slider({ name: 'progress', label: 'progress', min: 0, max: 1, step: 0.01, value: state.progress, enabled: false, onInput: (v) => { state.progress = v; run(); } });
const obsCtl = addCheckbox(controls, { name: 'show-obstacles', label: 'show obstacles', value: state.showConfigObs, onChange: (v) => { state.showConfigObs = v; run(); } });
addButton(controls, { name: 'restart', label: 'restart', onClick: () => { state.restart = true; run(); } });

function syncControls() {
  radiusCtl.set(state.r);
  progressCtl.set(state.progress);
  obsCtl.set(state.showConfigObs);
}

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  syncControls();
  run();
});

run();

// ---- test / automation hook (port addition A-PR-03) ------------------------------------------------------
const copy = (x) => JSON.parse(JSON.stringify(x));
window.__demo = {
  name: 'prm',
  getState: () => copy(state),
  view: () => copy(view),
  /** replace the random source: {seed: n} (generated) or {integers: [...], reals: [...]} (replay) */
  setRng: (spec) => { rng = spec && (spec.reals || spec.integers) ? replayRng(spec) : createRng({ seed: spec?.seed ?? null }); },
  /** load (part of) a Manipulate state, e.g. the original's saved state, and evaluate once */
  loadState: (partial) => { state = { ...state, ...copy(partial) }; syncControls(); run(); return copy(state); },
  moveLocator: (n, p) => { state[n] = clampLoc(p); run(); return copy(state); },
  worldToClient: (p) => plot.worldToClient(p),
  ready: true,
};
