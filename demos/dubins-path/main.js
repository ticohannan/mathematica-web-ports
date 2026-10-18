// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dubins-path/main.js — page: controls, SVG drawing, locator dragging (browser only).
import { Controls } from '../../shared/ui.js';
import { createPlot, addLocators, locatorGlyph, svgNode } from '../../shared/svg-plot.js';
import { NAMED, darker, lighter, css } from '../../shared/mma-colors.js';
import { drawCar, drawCarSvg } from '../common/car-icon.js';
import { initialState, evaluate, WORD_COLOURS, PLOT_RANGE, GOAL_RANGE } from './dubins.js';

let state = initialState();
let view = null;

// Graphics[{…}, PlotRange -> {{-15, 15}, {-10, 10}}, ImageSize -> 600, Background -> Lighter[Gray, .92]]
const graphicEl = document.getElementById('graphic');
const plot = createPlot(graphicEl, {
  plotRange: PLOT_RANGE, imageSize: 600, padding: 0, // no plot-range padding (measured on snapshot 1, D-DP-08)
  label: 'Plane with the start car (green), the goal car (red), the six candidate paths, the shortest path (thick) and the moving car (blue)',
});
// layers in the order of the original's Graphics list (the locator layer is added last, on top)
const L = {
  bg: plot.layer('background'), start: plot.layer('start-car'), goal: plot.layer('goal-car'), glyph: plot.layer('heading-glyph'),
  circles: plot.layer('turning-circles'), words: plot.layer('candidates'), label: plot.layer('label'),
  path: plot.layer('shortest-path'), car: plot.layer('moving-car'),
};
plot.rect(L.bg, [PLOT_RANGE[0][0], PLOT_RANGE[1][0]], [PLOT_RANGE[0][1], PLOT_RANGE[1][1]], { fill: lighter(NAMED.Gray, 0.92) });

const COLOUR = { ...WORD_COLOURS, DarkerYellow: darker(NAMED.Yellow), DarkerGreen: darker(NAMED.Green) };
const THIN = { abs: 0.25 }; // Thin = AbsoluteThickness[0.25] (D-DP-03)
const DASHED = [4, 4]; // Dashed, measured on snapshot 1: dashes and gaps of about 4 px at ImageSize 600 (D-DP-03)
const CAR = { lights: true, beam: 4, headlightEdge: null }; // headlights with EdgeForm[None] (F-DP-15)

/** One word's drawing: Circle[c, r, {a1, a2}] between its two angles, Line[{from, to}]. */
function drawWord(g, drawing, thickness, testid) {
  const grp = plot.group(g, { 'data-testid': testid, 'data-word': drawing.word });
  for (const p of drawing.pieces) {
    if (p.kind === 'arc') plot.arc(grp, p.c, p.r, p.a1, p.a2, { stroke: COLOUR[drawing.colour], thickness });
    else plot.line(grp, [p.from, p.to], { stroke: COLOUR[drawing.colour], thickness });
  }
  return grp;
}

/** Locator[goalThetaloc, Graphics[{Red, …four reticle arms, CircleBox[{-0.5, 0.5}, 5]…}, ImageSize -> 17, PlotRange -> {{-8, 8}, {-8, 8}}]] */
function headingGlyph() {
  const k = (17 / 16) * plot.unitsPerPx; // world units per glyph unit
  const g = svgNode('g', { class: 'heading-glyph', transform: `scale(${k})` });
  const c = css(NAMED.Red), w1 = 1 / (17 / 16);
  // AbsoluteThickness[1], LineBox arms from ±2 to ±10, clipped to the glyph's PlotRange ±8
  for (const [x1, y1, x2, y2] of [[0, -8, 0, -2], [0, 2, 0, 8], [-8, 0, -2, 0], [2, 0, 8, 0]]) {
    g.append(svgNode('line', { x1, y1, x2, y2, stroke: c, 'stroke-width': w1 }));
  }
  g.append(svgNode('circle', { cx: -0.5, cy: 0.5, r: 5, fill: 'none', stroke: c, 'stroke-width': w1 }));
  // {AbsoluteThickness[3], Opacity[0.3], CircleBox[{-0.5, 0.5}, 3]}
  g.append(svgNode('circle', { cx: -0.5, cy: 0.5, r: 3, fill: 'none', stroke: c, 'stroke-opacity': 0.3, 'stroke-width': 3 / (17 / 16) }));
  return g;
}

function draw() {
  for (const [k, g] of Object.entries(L)) if (k !== 'bg') g.replaceChildren();
  const r = state.minRadius;
  // {Green, drawCar[{0,0},0,0,0.2]}, {Red, drawCar[goalXY,Theta,0,0.2]}
  drawCarSvg(plot, L.start, drawCar([0, 0], 0, 0, 0.2, CAR), { colour: NAMED.Green, testid: 'start-car' });
  drawCarSvg(plot, L.goal, drawCar(state.goalXY, state.Theta, 0, 0.2, CAR), { colour: NAMED.Red, testid: 'goal-car' });
  const holder = svgNode('g', { transform: `translate(${state.goalThetaloc[0]},${state.goalThetaloc[1]})`, 'data-testid': 'heading-glyph' });
  holder.append(headingGlyph());
  L.glyph.append(holder);
  // {Thin, Gray, Dashed, Circle[csL, r], Circle[csR, r], Circle[ceL, r], Circle[ceR, r]}
  for (const [name, c] of [['csL', view.csL], ['csR', view.csR], ['ceL', view.ceL], ['ceR', view.ceR]]) {
    plot.disk(L.circles, c, r, { stroke: NAMED.Gray, thickness: THIN, dash: DASHED, cap: 'butt', testid: `turning-circle-${name}` });
  }
  // {Thin, dLSL[[2]], dLSR[[2]], dRSR[[2]], dRSL[[2]], dLRL[[2]], dRLR[[2]]} (a word that does not exist draws nothing)
  for (const [len, drawing] of view.words) if (Number.isFinite(len) && drawing) drawWord(L.words, drawing, THIN, `candidate-${drawing.word}`);
  // {Black, Style[Text[StringForm["`` path length, `` distance", …], {0, 8}], FontSize -> 14]}
  plot.text(L.label, view.label, [0, 8], { fontPx: 14, color: NAMED.Black, testid: 'plot-label' });
  // {Thickness[0.005], shortestPath[[2]]}
  drawWord(L.path, view.shortestPath[1], 0.005, 'shortest-path');
  // {Blue, drawCar[xyP, angP, Alpha, 0.8]}
  drawCarSvg(plot, L.car, drawCar(view.car.xyP, view.car.angP, view.car.Alpha, 0.8, CAR), { colour: NAMED.Blue, testid: 'moving-car' });
  locators.redraw();
}

function run() {
  const res = evaluate(state);
  state = res.state;
  view = res.view;
  draw();
}

// Locators: {{goalXY, {2, 2}}, {-13, -8}, {13, 8}, Locator} (visible) and {{goalThetaloc, …}, Locator, Appearance -> None}
const clamp = ([x, y], [[x0, y0], [x1, y1]]) => [Math.min(Math.max(x, x0), x1), Math.min(Math.max(y, y0), y1)];
const PLOT_BOX = [[PLOT_RANGE[0][0], PLOT_RANGE[1][0]], [PLOT_RANGE[0][1], PLOT_RANGE[1][1]]];
const RANGE = { goalXY: GOAL_RANGE, goalThetaloc: PLOT_BOX }; // the heading locator: the plot range (D-DP-06)
const DESCR = { goalXY: 'goal position', goalThetaloc: 'goal heading' };
const moveLocator = (name, p) => { state[name] = clamp(p, RANGE[name]); run(); };
const locators = addLocators(plot, {
  names: ['goalXY', 'goalThetaloc'],
  get: (n) => state[n],
  appearance: (n) => (n === 'goalXY' ? locatorGlyph(plot) : null),
  // two Locator controls picked as in a LocatorPane (D-DP-05, K-DP-04): a press within 12 px grabs the nearer one in
  // place, a press elsewhere makes the nearer one jump there; ties go to the goal locator (first name)
  pickAnywhere: true,
  keyStep: 0.1,
  describe: (n) => `${DESCR[n]} locator; arrow keys move it`,
  onMove: (n, p) => moveLocator(n, p),
});

// ---- controls (ControlPlacement -> Top) ------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
// {{progress, 0.25}, 0, 1, Appearance -> "Labeled", ImageSize -> 400}
const progressCtl = controls.slider({
  name: 'progress', label: 'progress', min: 0, max: 1, step: 0, steps: 'mma', value: state.progress,
  onInput: (v) => { state.progress = v; run(); },
});
// {{minRadius, 3, Subscript[r, min]}, 0.001, 5, Appearance -> "Labeled", ImageSize -> 400}
const minRadiusCtl = controls.slider({
  name: 'minRadius', label: 'r min', min: 0.001, max: 5, step: 0, steps: 'mma', value: state.minRadius,
  onInput: (v) => { state.minRadius = v; run(); },
});
minRadiusCtl.row.querySelector('.ctl-label').innerHTML = '<i>r</i><sub>min</sub>';

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  progressCtl.set(state.progress, { moved: false });
  minRadiusCtl.set(state.minRadius, { moved: false });
  run();
});

run();

// ---- test / automation hook (port addition A-DP-03) ----------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
window.__demo = {
  name: 'dubins-path',
  getState: () => clone(state),
  view: () => clone({
    lengths: Object.fromEntries(Object.entries(view.lengths).map(([k, v]) => [k, Number.isFinite(v) ? v : null])),
    word: view.word, label: view.label, pathLength: view.pathLength, distance: view.distance,
    csL: view.csL, csR: view.csR, ceL: view.ceL, ceR: view.ceR, car: view.car, shortestPath: view.shortestPath[1],
  }),
  labelText: () => view.label,
  /** move a locator ('goalXY' | 'goalThetaloc') to world point p, as one front-end update (its range applies) */
  moveLocator: (name, p) => { moveLocator(name, p); return clone(state); },
  setState: (partial) => {
    state = { ...state, ...clone(partial) };
    progressCtl.set(state.progress);
    minRadiusCtl.set(state.minRadius);
    run();
  },
  worldToClient: (p) => plot.worldToClient(p),
  ready: true,
};
