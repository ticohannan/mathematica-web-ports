// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Li Huang
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/rrt/main.js — page: controls, SVG drawing, goal locator, the self-triggered re-evaluations (browser only).
import { Controls } from '../../shared/ui.js';
import { addPopup, addButton, addRow } from '../../shared/ui-extra.js';
import { createPlot, addLocators, svgNode, darkLocatorGlyph } from '../../shared/svg-plot.js';
import { NAMED, darker } from '../../shared/mma-colors.js';
import { createRng, replayRng } from '../../shared/random.js';
import {
  initialSettings, evaluate, fromSaved, TREE_TYPES, OBSTACLE_TYPES, PLOT_RANGE, GOAL_RANGE, STYLE,
} from './model.js';

// ---- random source (A-RT-07): unseeded like the original; ?seed=N for reproducible trees ----------------
const seedParam = new URLSearchParams(location.search).get('seed');
let rng = createRng({ seed: seedParam !== null && /^\d+$/.test(seedParam) ? Number(seedParam) : null });

let state = initialSettings();
let view = null;

// Graphics[{…}, ImageSize -> 400, PlotRange -> {{-21, 21}, {-21, 23}}] (no padding, measured in the snapshots)
const graphicEl = document.getElementById('graphic');
const plot = createPlot(graphicEl, {
  plotRange: PLOT_RANGE, imageSize: STYLE.imageSize, padding: 0,
  label: 'Workspace with obstacles (blue), the tree (red nodes, black edges), the goal disk and the path (dark green)',
});
const L = {
  back: plot.layer('back'), obstacles: plot.layer('obstacles'), edges: plot.layer('edges'), newest: plot.layer('newest'),
  nodes: plot.layer('nodes'), newrand: plot.layer('newrand'), path: plot.layer('path'), label: plot.layer('label'),
};
const abs = (px) => ({ abs: px });
const C = { White: NAMED.White, Yellow: NAMED.Yellow, Green: NAMED.Green, Blue: NAMED.Blue, Black: NAMED.Black, Red: NAMED.Red, DarkGreen: darker(NAMED.Green) };

/** {White, Rectangle[-20{1,1}, 20{1,1}]}, the goal disk and point, the walls and the obstacles */
function drawBack() {
  L.back.replaceChildren();
  L.obstacles.replaceChildren();
  plot.rect(L.back, view.workspace[0], view.workspace[1], { fill: C.White, testid: 'workspace' });
  plot.disk(L.back, view.goal.center, view.goal.r, { fill: C[view.goal.color], testid: 'goal-disk' });
  plot.point(L.back, view.goalPoint, abs(STYLE.largePointPx), C.Yellow, 'goal-point');
  for (const [a, b] of view.walls) plot.rect(L.obstacles, a, b, { fill: C.Blue, testid: 'wall' });
  for (const poly of view.obstacles) plot.polygon(L.obstacles, poly, { fill: C.Blue, testid: 'obstacle' });
}
/** {Thin, Black, edges}, Red PointSize[Medium] nodes with Tooltip (SVG <title>, D-RT-05) */
function drawTree() {
  L.edges.replaceChildren();
  L.nodes.replaceChildren();
  for (const e of view.edges) plot.line(L.edges, e, { stroke: C.Black, thickness: abs(STYLE.thinPx), testid: 'edge' });
  const r = (STYLE.mediumPointPx / 2) * plot.unitsPerPx;
  const frag = document.createDocumentFragment();
  for (const n of view.nodes) {
    const c = svgNode('circle', { cx: n.at[0], cy: n.at[1], r, fill: 'rgb(255,0,0)', 'data-testid': 'node' });
    const t = svgNode('title');
    t.textContent = n.tooltip;
    c.append(t);
    frag.append(c);
  }
  L.nodes.append(frag);
}
/** newest-node marks, the green sample, the path and the label */
function drawFront() {
  L.newest.replaceChildren();
  L.newrand.replaceChildren();
  L.path.replaceChildren();
  L.label.replaceChildren();
  if (view.newest) {
    if (view.newest.line) plot.line(L.newest, view.newest.line, { stroke: C.Black, thickness: 'Normal', dash: STYLE.dashPx, cap: 'butt', testid: 'newest-line' });
    plot.point(L.newest, view.newest.point, abs(STYLE.largePointPx), C.Blue, 'newest-point');
  }
  if (view.newrand) plot.point(L.newrand, view.newrand, abs(STYLE.largePointPx), C.Green, 'newrand-point');
  if (view.path) plot.line(L.path, view.path, { stroke: C.DarkGreen, thickness: abs(STYLE.thickPx), testid: 'path' });
  plot.text(L.label, view.label.text, view.label.at, { fontPx: view.label.fontPx, color: C.Black, family: 'Arial, Helvetica, sans-serif', testid: 'plot-label' });
}

let pending = 0;
/** One evaluation of the Manipulate body, then the picture; the body changed nodestoadd and left it above 0: the front
 *  end evaluates again (F-RT-17) — here on the next animation frame (D-RT-02). */
function run({ redrawAll = false } = {}) {
  const r = evaluate(state, rng);
  state = r.state;
  view = r.view;
  drawBack();
  if (r.treeChanged || redrawAll) drawTree();
  drawFront();
  locators.redraw();
  if (state.nodestoadd > 0 && !pending) pending = requestAnimationFrame(() => { pending = 0; run(); });
}

// ---- goal locator: {{finalGoal, {18, -18}}, {-19, -19}, {19, 19}, ControlType -> Locator} ------------------
const clampGoal = ([x, y]) => [Math.min(Math.max(x, GOAL_RANGE[0][0]), GOAL_RANGE[1][0]), Math.min(Math.max(y, GOAL_RANGE[0][1]), GOAL_RANGE[1][1])];
const locators = addLocators(plot, {
  names: ['finalGoal'],
  get: () => state.finalGoal,
  appearance: () => darkLocatorGlyph(plot), // the default glyph as measured (black lines, dark ring; F-RT-06)
  pickAnywhere: true, // LocatorPane: a press anywhere moves the goal there (D-RT-06)
  keyStep: 0.1,
  describe: () => 'goal locator; arrow keys move it',
  onMove: (_n, p) => { state.finalGoal = clampGoal(p); run(); },
});

// ---- controls (ControlPlacement -> Left) -------------------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
controls.heading('tree type');
const treeCtl = controls.setterBar({
  name: 'treeType', value: state.treeType, options: TREE_TYPES.map((t) => ({ value: t })),
  onChange: (v) => { state.treeType = v; run(); },
});
treeCtl.row.querySelector('[data-testid="setter-treeType-RRT*"]').innerHTML = 'RRT<sup>*</sup>';
controls.heading('obstacle type');
const obstaclesCtl = addPopup(controls, {
  name: 'obstacles', options: OBSTACLE_TYPES.map((o) => ({ value: o })), value: state.obstacles,
  onChange: (v) => { state.obstacles = v; run(); },
});
controls.heading('number of nodes to add:');
const bar = addRow(controls, { name: 'add' });
bar.classList.add('button-bar');
const barCtl = new Controls(bar);
for (const k of [1, 10, 100, 200, 500]) {
  addButton(barCtl, { name: `add-${k}`, label: String(k), parent: bar, onClick: () => { state.nodestoadd += k; run(); } });
}
controls.heading('exploration bias');
// {{explorationBias, 0, ""}, 0, .9, 0.05, ControlType -> Slider, ImageSize -> 80, Appearance -> "Labeled"}
const biasCtl = controls.slider({
  name: 'explorationBias', min: 0, max: 0.9, step: 0.05, value: 0, plus: false, steps: 'mma',
  onInput: (v) => { state.explorationBias = v; run(); },
});
controls.heading('goal radius');
const radiusCtl = controls.slider({
  name: 'goalRadius', min: 0, max: 5, step: 0.1, value: 1, plus: false, steps: 'mma',
  onInput: (v) => { state.goalRadius = v; run(); },
});
for (const c of [biasCtl, radiusCtl]) Object.assign(c.row.querySelector('input[type=range]').style, { flex: '0 0 80px', width: '80px', minWidth: '80px' });

/** the controls show the state's values; `moved`: Mathematica shows a moved (machine) slider value with a point */
function syncControls(moved) {
  treeCtl.set(state.treeType);
  obstaclesCtl.set(state.obstacles);
  biasCtl.set(state.explorationBias, { moved });
  radiusCtl.set(state.goalRadius, { moved });
}

document.getElementById('reset').addEventListener('click', () => {
  if (pending) { cancelAnimationFrame(pending); pending = 0; }
  state = initialSettings();
  syncControls(false);
  run({ redrawAll: true });
});

run({ redrawAll: true });

// ---- test / automation hook (A-RT-03) ------------------------------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
window.__demo = {
  name: 'rrt',
  getState: () => clone(state),
  view: () => clone(view),
  labelText: () => view.label.text,
  /** replace the random source: {seed: n} (generated) or {reals: [...], integers: [...]} (replayed draws) */
  setRng: (spec) => { rng = spec && (spec.reals || spec.integers) ? replayRng(spec) : createRng({ seed: spec?.seed ?? null }); },
  /** load a state (the port's form, or a saved one with plain numbers: the typeset RRT* is mapped), then evaluate once */
  loadState: (s) => { if (pending) { cancelAnimationFrame(pending); pending = 0; } state = fromSaved(clone(s)); syncControls(true); run({ redrawAll: true }); return clone(state); },
  /** one more evaluation of the body (what the front end does after a control change) */
  evaluate: () => { run(); return clone(state); },
  /** move the goal locator to world point p (the locator range applies), as one front-end update */
  moveLocator: (p) => { state.finalGoal = clampGoal(p); run(); return clone(state); },
  worldToClient: (p) => plot.worldToClient(p),
  ready: true,
};
