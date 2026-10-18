// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/robot-motion-obstacles/main.js — page: the Q slider, the three locators, the SVG Graphics (arm, obstacles,
// phase-space inset, texts, configuration glyph) and ControlActive tracking (browser only).
import { Controls } from '../../shared/ui.js';
import { createPlot, addLocators } from '../../shared/svg-plot.js';
import { NAMED, darker } from '../../shared/mma-colors.js';
import { PLOT_RANGE, IMAGE_SIZE, W, OBS_RANGE, CONFIG_RANGE, clampTo, arrayPlotColors } from '../common/arm-grid.js';
import { drawArm, drawObstacles, drawGridInset, drawInsetFrame, drawThetaLabel, locIcon, obstacleGlyph, FONT, FONT_FAMILY } from '../common/arm-view.js';
import { initialState, evaluate, blockedCount } from './model.js';

let state = initialState();
let view = null;
let controlActive = false; // Mathematica's ControlActive[]: true while the Q slider or a locator is dragged with the mouse

// Graphics[{…}, PlotRange -> {{-2.2, 7.1}, {-2.4, 2.4}}, ImageSize -> {600, 320}] — no plot-range padding (D-RM-05)
const graphicEl = document.getElementById('graphic');
const plot = createPlot(graphicEl, {
  plotRange: PLOT_RANGE, imageSize: IMAGE_SIZE[0], padding: 0,
  label: 'Left: the robot workspace with the two-link arm and two obstacles. Right: the robot phase space (θ1, θ2) with the configurations that collide in black',
});
const Lyr = { arm: plot.layer('arm'), obstacles: plot.layer('obstacles'), inset: plot.layer('inset'), frame: plot.layer('frame'), text: plot.layer('text'), glyph: plot.layer('glyph') };
const GRAY = NAMED.Gray;

let gridDrawn = null; // the freeConfigSpace array last drawn (the image is rebuilt only when it changes)
let gridImage = null;
function draw() {
  for (const k of ['arm', 'obstacles', 'frame', 'text', 'glyph']) Lyr[k].replaceChildren();
  const edge = view.inCollision ? NAMED.Red : NAMED.Black; // If[inCollision, EdgeForm[Red], EdgeForm[Black]]
  drawArm(plot, Lyr.arm, view.geometry, view.arcs, { edge, link2Fill: GRAY });
  drawObstacles(plot, Lyr.obstacles, view.pObsV, W, edge);
  if (state.freeConfigSpace !== gridDrawn) {
    Lyr.inset.replaceChildren();
    gridImage = Array.isArray(state.freeConfigSpace) ? drawGridInset(plot, Lyr.inset, arrayPlotColors(state.freeConfigSpace)) : null;
    gridDrawn = state.freeConfigSpace;
  }
  drawInsetFrame(plot, Lyr.frame);
  // Text[θ1, {4.8, -2.2}], Text[θ2, {2.8, 0}], "robot phase space", "robot workspace" — in Gray (the list's first directive)
  drawThetaLabel(plot, Lyr.text, '1', [4.8, -2.2], { color: GRAY, testid: 'text-theta1' });
  drawThetaLabel(plot, Lyr.text, '2', [2.8, 0], { color: GRAY, testid: 'text-theta2' });
  plot.text(Lyr.text, 'robot phase space', [4.8, 2.25], { fontPx: FONT.text, color: GRAY, family: FONT_FAMILY, testid: 'text-phase' });
  plot.text(Lyr.text, 'robot workspace', [0, 2.25], { fontPx: FONT.text, color: GRAY, family: FONT_FAMILY, testid: 'text-workspace' });
  // Locator[pConfig, If[inCollision, loc[Red], loc[Darker[Green]]]]
  const g = locIcon(plot, view.inCollision ? NAMED.Red : darker(NAMED.Green));
  g.setAttribute('transform', `translate(${state.pConfig[0]},${state.pConfig[1]})`);
  g.setAttribute('data-testid', 'glyph-config');
  g.setAttribute('data-color', view.glyph);
  Lyr.glyph.append(g);
  locators.redraw();
}

function run() {
  const r = evaluate(state, { controlActive });
  state = r.state;
  view = r.view;
  draw();
}

// ---- locators: {{pObs, {1.1, 1.1}}, {-2, -2}, {2, 2}, Locator}, the same for pObs2, and
//      {{pConfig, {5, 0}}, {xMin - .1, yMin - .1}, {xMax + .1, yMax + .1}, Locator, Appearance -> None}
const RANGE = { pObs: OBS_RANGE, pObs2: OBS_RANGE, pConfig: CONFIG_RANGE };
const DESCR = { pObs: 'obstacle 1', pObs2: 'obstacle 2', pConfig: 'configuration (phase space)' };
const locators = addLocators(plot, {
  names: ['pObs', 'pObs2', 'pConfig'],
  get: (n) => state[n],
  appearance: (n) => (n === 'pConfig' ? null : obstacleGlyph(plot)),
  pickAnywhere: true, // the Manipulate's Locator controls form one LocatorPane: a press goes to the nearest locator (F-RM-04)
  keyStep: 0.05,
  describe: (n) => `${DESCR[n]} locator; arrow keys move it`,
  onStart: () => { controlActive = true; },
  onMove: (n, p) => { state[n] = clampTo(p, RANGE[n]); run(); },
});

// ---- controls (ControlPlacement -> Top): {{Quality, 2, Style["Q", Italic]}, 1, 10, 1, Appearance -> "Labeled"} -------
const controls = new Controls(document.getElementById('controls'));
const qualityCtl = controls.slider({
  name: 'Quality', label: 'Q', min: 1, max: 10, step: 1, steps: 'mma', value: state.Quality,
  onInput: (v) => { state.Quality = v; run(); },
});
qualityCtl.row.querySelector('.ctl-label').innerHTML = '<i>Q</i>';
qualityCtl.row.querySelector('input[type=range]').addEventListener('pointerdown', () => { controlActive = true; });

// ControlActive becomes False when the mouse is released: the body is evaluated once more (full-resolution grid)
const release = () => { if (controlActive) { controlActive = false; run(); } };
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  qualityCtl.set(state.Quality, { moved: false });
  run();
});

run();

// ---- test / automation hook (port addition A-RM-03) ----------------------------------------------------------------
const copy = (x) => JSON.parse(JSON.stringify(x));
window.__demo = {
  name: 'robot-motion-obstacles',
  getState: () => copy(state),
  /** replace any Manipulate variables (e.g. a snapshot's Settings, Quality 5.31) and evaluate once */
  setState: (partial) => { state = { ...state, ...copy(partial) }; qualityCtl.set(state.Quality); run(); return copy(state); },
  view: () => copy({
    Theta1: view.Theta1, Theta2: view.Theta2, inCollision: view.inCollision, glyph: view.glyph, gridSize: view.gridSize,
    blocked: blockedCount(state.freeConfigSpace), recomputed: view.recomputed, resolution: view.resolution ?? null,
    theta1Label: view.geometry.theta1Label.visible, theta2Label: view.geometry.theta2Label.visible, highRes: state.highRes,
  }),
  /** move a locator (pObs, pObs2, pConfig) to world point p as one front-end update (its range applies) */
  moveLocator: (n, p) => { state[n] = clampTo(p, RANGE[n]); run(); return copy(state); },
  worldToClient: (p) => plot.worldToClient(p),
  gridImageSize: () => (gridImage ? [Number(gridImage.getAttribute('data-width')), Number(gridImage.getAttribute('data-height'))] : null),
  controlActive: () => controlActive,
  ready: true,
};
