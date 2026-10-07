// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-seven-link/main.js — page: controls, SVG drawing, locator dragging (browser only).
import { Controls } from '../../shared/ui.js';
import { addButton } from '../../shared/ui-extra.js';
import { createPlot, addLocators, locatorGlyph } from '../../shared/svg-plot.js';
import { NAMED, darker } from '../../shared/mma-colors.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { initialState, evaluate, restart, OBS, ORIGIN, MIN_X, MIN_Y, MAX_X, MAX_Y, roundTenth } from './model.js';

let state = initialState();
let view = null;

// Graphics[..., ImageSize -> 400]; automatic PlotRange: x from the workspace (obstacle 4 starts at x = 16, 2 units
// left of it — negligible, not reproduced), y up to the first text line at maxY + 50
const plot = createPlot(document.getElementById('graphic'), {
  plotRange: [[MIN_X, MAX_X], [MIN_Y, MAX_Y + 50]], imageSize: 400,
  label: 'Workspace with the seven-link robot (brown), the goal configuration (green) and the obstacles (blue)',
});
// layers in the order of the original's Graphics list: the two Text lines come first
const L = { text: plot.layer('text'), bg: plot.layer('bg'), obs: plot.layer('obs'), goal: plot.layer('goal'), robot: plot.layer('robot'), glyphs: plot.layer('glyphs') };
const NAMES = ['1', '2', '3', '4', '5', '6', '7'];
// PointSize[Large]: measured on the original's snapshot as about 1.8 % of the plot width (D-SL-03)
const GOAL_POINT_SIZE = 0.018;

function draw() {
  for (const g of Object.values(L)) g.replaceChildren();
  const { og, worstError, success } = view;
  // Black, Style[Text[StringForm["`` collisions, worst error = ``", ...]], Medium]
  plot.text(L.text, `${state.collisions} collisions, worst error = ${mmaNumberString(roundTenth(worstError), { isReal: true })}`, [(MIN_X + MAX_X) / 2, MAX_Y + 50], { fontPx: 13, testid: 'status-text' });
  if (success) plot.text(L.text, `Congratulations! You solved goal ${state.goal} in only ${state.collisions} collisions!`, [(MIN_X + MAX_X) / 2, MAX_Y + 20], { fontPx: 13, testid: 'success-text' });
  // White, EdgeForm[Directive[Thick, Black]], Rectangle[{minX,minY},{maxX,maxY}]
  plot.rect(L.bg, [MIN_X, MIN_Y], [MAX_X, MAX_Y], { fill: NAMED.White, stroke: NAMED.Black, thickness: 'Thick', testid: 'workspace' });
  // Blue, Polygon[obs] (the thick black EdgeForm is still active)
  OBS.forEach((o, i) => plot.polygon(L.obs, o, { fill: NAMED.Blue, stroke: NAMED.Black, thickness: 'Thick', testid: `obstacle-${i + 1}` }));
  // PointSize[Large], {Opacity[6], Darker[Green], Line[og], Point[og]}
  const green = darker(NAMED.Green);
  plot.line(L.goal, og, { stroke: green, testid: 'goal-line' });
  og.forEach((p) => plot.point(L.goal, p, GOAL_POINT_SIZE, green));
  // Thickness[0.005], If[isCollide, Red, Brown], Line[Prepend[locOld, origin]]
  plot.line(L.robot, [ORIGIN, ...state.locOld], { stroke: state.isCollide ? NAMED.Red : NAMED.Brown, thickness: 0.005, testid: 'robot' });
  // Locator /@ locOld (glyphs only; the draggable Manipulate locators are invisible, at loc)
  for (const p of state.locOld) {
    const g = locatorGlyph(plot, { ringFill: [0.75, 0.75, 0.75], ringOpacity: 0.8 });
    g.setAttribute('transform', `translate(${p[0]},${p[1]})`);
    L.glyphs.append(g);
  }
  locators.redraw();
  movementCtl.row.querySelectorAll('button').forEach((b) => { b.disabled = state.isCollide; });
  movementCtl.row.classList.toggle('is-disabled', state.isCollide);
}

function run() {
  const r = evaluate(state);
  state = r.state;
  view = r.view;
  if (r.view.beep) beeps++;
  draw();
}
let beeps = 0;

// Locators: {{loc, locstart}, {18, 7}, {884, 884}, Locator, Appearance -> None}
const clampLoc = ([x, y]) => [Math.min(Math.max(x, MIN_X), MAX_X), Math.min(Math.max(y, MIN_Y), MAX_Y)];
const locators = addLocators(plot, {
  names: NAMES,
  get: (n) => state.loc[Number(n) - 1],
  pickAnywhere: true, // Manipulate Locator controls = LocatorPane: a press goes to the nearest locator
  appearance: () => null, // Appearance -> None
  keyStep: 5,
  describe: (n) => `joint ${n} locator; arrow keys move it`,
  onMove: (n, p) => {
    state.loc[Number(n) - 1] = clampLoc(p);
    run();
  },
});

// ---- controls (ControlPlacement -> Left) ------------------------------------
const controls = new Controls(document.getElementById('controls'));
addButton(controls, { name: 'restart', label: 'restart', onClick: () => { state = restart(state); run(); } });
const movementCtl = controls.setterBar({
  name: 'movement', label: 'movement', value: state.movement,
  options: [{ value: 'relative' }, { value: 'absolute' }],
  onChange: (v) => { state.movement = v; run(); },
});
const goalCtl = controls.setterBar({
  name: 'goal', label: 'goal', value: state.goal,
  options: [1, 2, 3, 4, 5, 6, 7].map((v) => ({ value: v })),
  onChange: (v) => { state.goal = v; run(); },
});

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  movementCtl.set(state.movement);
  goalCtl.set(state.goal);
  run();
});

run();

// ---- test / automation hook (port addition A-SL-03) ----------------------------
window.__demo = {
  name: 'prm-seven-link',
  getState: () => JSON.parse(JSON.stringify(state)),
  view: () => JSON.parse(JSON.stringify(view)),
  beeps: () => beeps,
  /** move locator n (1..7) to world point p, as one front-end update */
  moveLocator: (n, p) => { state.loc[n - 1] = clampLoc(p); run(); return JSON.parse(JSON.stringify(state)); },
  setState: (partial) => { state = { ...state, ...JSON.parse(JSON.stringify(partial)) }; movementCtl.set(state.movement); goalCtl.set(state.goal); run(); },
  worldToClient: (p) => plot.worldToClient(p),
  ready: true,
};
