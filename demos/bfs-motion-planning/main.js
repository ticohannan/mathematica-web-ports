// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/bfs-motion-planning/main.js — page: the Q and P sliders, the four locators, the SVG Graphics (arm, obstacles,
// cost-map inset with path, texts, start and goal glyphs) and ControlActive tracking (browser only).
import { Controls } from '../../shared/ui.js';
import { createPlot, addLocators } from '../../shared/svg-plot.js';
import { NAMED, darker } from '../../shared/mma-colors.js';
import { PLOT_RANGE, IMAGE_SIZE, W, OBS_RANGE, CONFIG_RANGE, clampTo, arrayPlotColors } from '../common/arm-grid.js';
import { drawArm, drawObstacles, drawGridInset, drawInsetFrame, drawThetaLabel, locIcon, obstacleGlyph, FONT, FONT_FAMILY } from '../common/arm-view.js';
import { initialState, evaluate, blockedCount } from './model.js';

let state = initialState();
let view = null;
let controlActive = false; // ControlActive[]: true while a slider or a locator is dragged with the mouse
let searches = 0, walks = 0; // how often bfsTorus and getShortestPath ran (automation hook)

// Graphics[{…}, PlotRange -> {{-2.2, 7.1}, {-2.4, 2.4}}, ImageSize -> {600, 320}] — no plot-range padding (D-BF-04)
const graphicEl = document.getElementById('graphic');
const plot = createPlot(graphicEl, {
  plotRange: PLOT_RANGE, imageSize: IMAGE_SIZE[0], padding: 0,
  label: 'Left: the robot workspace with the two-link arm and two obstacles. Right: the robot phase space with the cost map, the shortest path in green and the current cell in blue',
});
const Lyr = { arm: plot.layer('arm'), obstacles: plot.layer('obstacles'), inset: plot.layer('inset'), frame: plot.layer('frame'), text: plot.layer('text'), glyph: plot.layer('glyph') };
const BLACK = NAMED.Black;

let insetKey = null, gridImage = null;
function draw() {
  for (const k of ['arm', 'obstacles', 'frame', 'text', 'glyph']) Lyr[k].replaceChildren();
  const edge = view.inCollision ? NAMED.Red : NAMED.Black; // If[inCollision, EdgeForm[Red], EdgeForm[Black]]
  drawArm(plot, Lyr.arm, view.geometry, view.arcs, { edge, link2Fill: NAMED.LightGray });
  drawObstacles(plot, Lyr.obstacles, view.pObsV, W, edge);
  // ArrayPlot[costmapcolor, …]: rebuilt only when the cost map, the path or the current cell changed
  const key = [state.costmap, state.path, view.ccord[0], view.ccord[1]];
  if (!insetKey || key.some((k, i) => k !== insetKey[i])) {
    Lyr.inset.replaceChildren();
    gridImage = drawGridInset(plot, Lyr.inset, arrayPlotColors(view.costmapcolor));
    insetKey = key;
  }
  drawInsetFrame(plot, Lyr.frame);
  // {Black, Text[θ1, {4.8, -2.2}], Text[θ2, {2.8, 0}], Text[StringForm["robot phase space, path length = `` rads", …], {4.8, 2.2}], Text["robot workspace", {0, 2.2}]}
  drawThetaLabel(plot, Lyr.text, '1', [4.8, -2.2], { color: BLACK, testid: 'text-theta1' });
  drawThetaLabel(plot, Lyr.text, '2', [2.8, 0], { color: BLACK, testid: 'text-theta2' });
  plot.text(Lyr.text, view.label.text, [4.8, 2.2], { fontPx: FONT.text, color: BLACK, family: FONT_FAMILY, testid: 'text-phase' });
  plot.text(Lyr.text, 'robot workspace', [0, 2.2], { fontPx: FONT.text, color: BLACK, family: FONT_FAMILY, testid: 'text-workspace' });
  // Locator[pConfigI, If[inCollision, loc[Red], loc[Darker[Green]]]], the same at pConfigF (Q-BF-06)
  for (const [name, p] of [['start', state.pConfigI], ['goal', state.pConfigF]]) {
    const g = locIcon(plot, view.inCollision ? NAMED.Red : darker(NAMED.Green));
    g.setAttribute('transform', `translate(${p[0]},${p[1]})`);
    g.setAttribute('data-testid', `glyph-${name}`);
    g.setAttribute('data-color', view.glyph);
    Lyr.glyph.append(g);
  }
  locators.redraw();
}

function run() {
  const r = evaluate(state, { controlActive });
  state = r.state;
  view = r.view;
  if (view.searched) searches++;
  if (view.walked) walks++;
  draw();
}

// ---- locators: obstacles {-2.0, -2.0}…{2.0, 2.0}; start and goal {xMin - .1, yMin - .1}…{xMax + .1, yMax + .1},
//      Appearance -> None (the glyphs drawn at them are the Graphics' own Locator primitives)
const RANGE = { pObs: OBS_RANGE, pObs2: OBS_RANGE, pConfigI: CONFIG_RANGE, pConfigF: CONFIG_RANGE };
const DESCR = { pObs: 'obstacle 1', pObs2: 'obstacle 2', pConfigI: 'start configuration', pConfigF: 'goal configuration' };
const locators = addLocators(plot, {
  names: ['pObs', 'pObs2', 'pConfigI', 'pConfigF'],
  get: (n) => state[n],
  appearance: (n) => (n.startsWith('pConfig') ? null : obstacleGlyph(plot)),
  pickAnywhere: true, // one LocatorPane: a press goes to the nearest of the four locators (F-BF-05)
  keyStep: 0.05,
  describe: (n) => `${DESCR[n]} locator; arrow keys move it`,
  onStart: () => { controlActive = true; },
  onMove: (n, p) => { state[n] = clampTo(p, RANGE[n]); run(); },
});

// ---- controls (ControlPlacement -> Top) ---------------------------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
// {{Quality, 2, Style["Q", Italic]}, 1, 10, 1, Appearance -> "Labeled"}
const qualityCtl = controls.slider({
  name: 'Quality', label: 'Q', min: 1, max: 10, step: 1, steps: 'mma', value: state.Quality,
  onInput: (v) => { state.Quality = v; run(); },
});
// {{progress, 1, Style["P", Italic]}, 0.0, 1.0, 0.01, Appearance -> "Labeled"}
const progressCtl = controls.slider({
  name: 'progress', label: 'P', min: 0, max: 1, step: 0.01, steps: 'mma', value: state.progress,
  onInput: (v) => { state.progress = v; run(); },
});
for (const [api, l] of [[qualityCtl, 'Q'], [progressCtl, 'P']]) {
  api.row.querySelector('.ctl-label').innerHTML = `<i>${l}</i>`;
  api.row.querySelector('input[type=range]').addEventListener('pointerdown', () => { controlActive = true; });
}

// ControlActive becomes False when the mouse is released: the body is evaluated once more (fine grid)
const release = () => { if (controlActive) { controlActive = false; run(); } };
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  qualityCtl.set(state.Quality, { moved: false });
  progressCtl.set(state.progress, { moved: false });
  run();
});

run();

// ---- test / automation hook (port addition A-BF-03) ----------------------------------------------------------------
const copy = (x) => JSON.parse(JSON.stringify(x, (k, v) => (v === Infinity ? 'Infinity' : v)));
window.__demo = {
  name: 'bfs-motion-planning',
  getState: () => copy(state),
  /** replace any Manipulate variables (snapshot Settings, a synthetic grid; Infinity may be given as "Infinity") */
  setState: (partial) => {
    const fix = (v) => (v === 'Infinity' ? Infinity : Array.isArray(v) ? v.map(fix) : v);
    state = { ...state, ...Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(partial))).map(([k, v]) => [k, fix(v)])) };
    qualityCtl.set(state.Quality); progressCtl.set(state.progress);
    run();
    return copy(state);
  },
  view: () => copy({
    lS: state.lS, lE: state.lE, path: state.path, ccord: view.ccord, Theta1: view.Theta1, Theta2: view.Theta2,
    inCollision: view.inCollision, glyph: view.glyph, label: view.label.text, gridSize: view.gridSize,
    blocked: blockedCount(state.freeConfigSpace), searches, walks, highRes: state.highRes,
    theta1Label: view.geometry.theta1Label.visible, theta2Label: view.geometry.theta2Label.visible,
  }),
  costmap: () => copy(state.costmap),
  moveLocator: (n, p) => { state[n] = clampTo(p, RANGE[n]); run(); return copy(state); },
  worldToClient: (p) => plot.worldToClient(p),
  gridImageSize: () => (gridImage ? [Number(gridImage.getAttribute('data-width')), Number(gridImage.getAttribute('data-height'))] : null),
  ready: true,
};
