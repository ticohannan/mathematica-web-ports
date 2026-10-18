// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/minkowski-sum/main.js — page: controls, SVG drawing, the ten locators, the move animation (browser only).
import { Controls } from '../../shared/ui.js';
import { addCheckbox, addRow } from '../../shared/ui-extra.js';
import { createPlot, addLocators, svgNode } from '../../shared/svg-plot.js';
import { NAMED } from '../../shared/mma-colors.js';
import {
  evaluate, initialSettings, clampToBox, robotAt, FRAME_HALF, IMAGE_SIZE, VIEWS, MOVE_VIEW,
} from './minkowski.js';

let state = evaluate(initialSettings()).state; // the opening (live) state, F-MS-17
let view = null;

// Graphics[{…}, ImageSize -> .9{620, 450}]: no PlotRange, so Mathematica takes the square 7 CirclePoints[4] (§6.5) with
// the default padding; the 558 × 405 image shows that square centred, white left and right. The port widens the x range
// so that the SVG has the original's 558 × 405 shape with the square in the middle.
const [IW, IH] = IMAGE_SIZE;
const XH = (FRAME_HALF * IW) / IH;
const graphicEl = document.getElementById('graphic');
const plot = createPlot(graphicEl, {
  plotRange: [[-XH, XH], [-FRAME_HALF, FRAME_HALF]], imageSize: IW, padding: 0.02,
  label: 'Obstacle (red), robot (blue), their sorted edge normals and the Minkowski sum (green)',
});
const scene = plot.layer('scene');
const PX = plot.unitsPerPx; // world units per nominal pixel
// PORT DEVIATION (D-MS-02): Mathematica's sizes approximated. PointSize[0.01] of the 405-pixel plot width; default line
// width 1 px; Thin 0.5 px; default arrowheads about 12 px long; default text 12 px.
const POINT = { abs: 0.01 * IH };
const THIN = { abs: 0.5 };
const HEAD = { len: 12, half: 4.6, notch: 0.72 }; // about 0.0215 of the image width, as four-bar-linkage
const colour = (name) => NAMED[name];

/** Arrow[{a, b}]: a line and Mathematica's default (notched) arrowhead at b. */
function arrow(g, [a, b], col, testid) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  const grp = plot.group(g, { 'data-testid': testid, class: 'arrow' });
  if (L === 0) return grp;
  const ux = dx / L, uy = dy / L;
  const len = Math.min(HEAD.len * PX, L), half = HEAD.half * PX * (len / (HEAD.len * PX));
  const base = [b[0] - len * ux, b[1] - len * uy];
  const notch = [b[0] - HEAD.notch * len * ux, b[1] - HEAD.notch * len * uy];
  plot.line(grp, [a, notch], { stroke: colour(col) });
  plot.polygon(grp, [b, [base[0] - half * uy, base[1] + half * ux], notch, [base[0] + half * uy, base[1] - half * ux]], { fill: colour(col) });
  return grp;
}

/** Text[Subscript[α, i], pos]: the Greek letter in italics with a subscript index (snapshot 1). */
function label(g, key, at, col, testid) {
  const t = plot.text(g, '', at, { fontPx: 12, color: colour(col), testid });
  const sym = key.slice(0, 1), idx = key.slice(1);
  const a = svgNode('tspan', { 'font-style': 'italic' }); a.textContent = sym;
  const b = svgNode('tspan', { dy: '0.35em', 'font-size': '75%' }); b.textContent = idx;
  t.append(a, b);
  t.setAttribute('data-key', key);
  return t;
}

function draw() {
  scene.replaceChildren();
  for (const item of view.scene) {
    const id = item.role;
    if (item.kind === 'polygon') {
      plot.polygon(scene, item.pts, {
        fill: colour(item.fill), fillOpacity: item.fillOpacity,
        stroke: item.edge === 'Thin' ? colour('Black') : item.edge ? colour(item.edge) : undefined,
        thickness: item.edge === 'Thin' ? THIN : undefined, testid: id,
      });
    } else if (item.kind === 'lines') {
      const grp = plot.group(scene, { 'data-testid': id });
      for (const s of item.segs) plot.line(grp, s, { stroke: colour(item.color) });
    } else if (item.kind === 'points') {
      const grp = plot.group(scene, { 'data-testid': id });
      for (const p of item.pts) plot.point(grp, p, POINT, colour(item.color));
    } else if (item.kind === 'arrows') {
      for (const a of item.arrows) arrow(scene, a, item.color, `arrow-${id}`);
    } else if (item.kind === 'disk') {
      plot.disk(scene, item.c, item.r, { fill: colour(item.fill), stroke: colour('Black'), thickness: THIN, testid: id });
    } else if (item.kind === 'text') {
      if (item.sub) label(scene, item.text, item.at, item.color, `label-${id}`);
      else plot.text(scene, item.text, item.at, { fontPx: 12, color: colour(item.color), testid: `text-${id}` });
    }
  }
  plot.svg.dataset.view = state.stableOrMove;
  locators.redraw();
}

function run() {
  const r = evaluate(state);
  state = r.state;
  view = r.view;
  // the body's assignments show in the controls (c, s) and dl sets the move slider's maximum (Dynamic)
  cCtl.set(state.c);
  aCtl.set(state.a);
  if (Number.isInteger(state.dl) && state.dl !== sMax) { sMax = state.dl; sCtl.setRange(1, sMax); }
  if (sCtl.get() !== state.s) sCtl.set(state.s);
  draw();
}

// ---- the ten locators: {{pts, …}, {-3.249, 1.489}, {3.249, 3.298}, Locator, Appearance -> None, Enabled -> c} ----
// ORIGINAL QUIRK (Q-MS-02): all ten are active, also those not in use. PORT DEVIATION (D-MS-04): LocatorPane picking
// (a press within 12 px grabs a locator, elsewhere the nearest one jumps to the press). PORT DEVIATION (D-MS-01): one
// evaluation per animation frame while dragging.
const NAMES = Array.from({ length: 10 }, (_, k) => `pts-${k + 1}`);
const index = (name) => Number(name.slice(4)) - 1;
const locators = addLocators(plot, {
  names: NAMES,
  get: (n) => state.pts[index(n)],
  appearance: () => null,
  keyStep: 0.05,
  pickAnywhere: true,
  describe: (n) => `${index(n) < 5 ? 'robot' : 'obstacle'} vertex locator ${index(n) + 1}; arrow keys move it`,
  onMove: (n, p) => {
    if (!state.c) return; // Enabled -> c: inactive in the move view
    state.pts[index(n)] = clampToBox(p);
    run();
  },
});

// ---- controls: the view setter, then Dynamic@If[static, Row[{a, c, m, n}], s] ----------------------------------
const controls = new Controls(document.getElementById('controls'));
const viewCtl = controls.setterBar({
  name: 'stableOrMove', label: 'view', value: state.stableOrMove,
  options: VIEWS.map((v) => ({ value: v })),
  onChange: (v) => { state.stableOrMove = v; showControls(); run(); animate(); },
});
const row = addRow(controls, { name: 'static' });
const rowCtl = new Controls(row);
const aCtl = addCheckbox(rowCtl, { name: 'a', label: 'show normals', value: state.a, onChange: (v) => { state.a = v; run(); } });
const cCtl = addCheckbox(rowCtl, { name: 'c', label: 'enable locators', value: state.c, onChange: (v) => { state.c = v; run(); } });
for (const ctl of [aCtl, cCtl]) ctl.row.classList.add('label-first');
const mCtl = rowCtl.setterBar({
  name: 'm', label: 'number of robot edges', value: state.m, options: [1, 2, 3, 4, 5].map((v) => ({ value: v })),
  onChange: (v) => { state.m = v; run(); },
});
const nCtl = rowCtl.setterBar({
  name: 'n', label: 'number of obstacle edges', value: state.n, options: [1, 2, 3, 4, 5].map((v) => ({ value: v })),
  onChange: (v) => { state.n = v; run(); },
});
// Control@{{s, 1, "move"}, 1, dl, 1, AnimationRunning -> True, Appearance -> "Open"} (D-MS-03)
const moveBox = document.createElement('div');
moveBox.className = 'move-box';
controls.root.append(moveBox);
let sMax = state.dl;
const sCtl = new Controls(moveBox).slider({
  name: 's', label: 'move', min: 1, max: sMax, step: 1, steps: 'mma', value: state.s,
  onInput: (v) => { state.s = v; run(); },
});
const sPlus = sCtl.row.querySelector('[data-testid=plus-s]');
const sPanel = sCtl.row.querySelector('[data-testid=anim-s]');
const sPlay = sCtl.row.querySelector('[data-testid=play-s]');

/** Dynamic@If: the four static-view controls or the move slider (both stay in the page, one is hidden). */
function showControls() {
  const move = state.stableOrMove === MOVE_VIEW;
  row.hidden = move;
  moveBox.hidden = !move;
}
/** AnimationRunning -> True, Appearance -> "Open": the panel is open and the animation runs whenever the slider appears. */
function animate() {
  if (state.stableOrMove === MOVE_VIEW) {
    if (sPanel.hidden) sPlus.click();
    if (sPlay.getAttribute('aria-pressed') !== 'true') sPlay.click();
  } else sCtl.stop();
}

document.getElementById('reset').addEventListener('click', () => {
  sCtl.stop();
  state = initialSettings();
  viewCtl.set(state.stableOrMove);
  mCtl.set(state.m);
  nCtl.set(state.n);
  showControls();
  run();
});

showControls();
run();

// ---- test / automation hook (port addition A-MS-03) --------------------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
window.__demo = {
  name: 'minkowski-sum',
  getState: () => clone(state),
  view: () => clone({
    robot: view.robot, obstacle: view.obstacle, rc: view.rc, oc: view.oc, rl: view.rl, ol: view.ol, pos: view.pos,
    order: view.orderOfNormals.map((r) => r.key), keys: view.orderOfNormalsKeys, minkowskiPoints: view.minkowskiPoints,
    shiftedMink: view.shiftedMink, sumOk: view.sumOk, robotAt: view.sumOk ? robotAt(view, state.s) : null,
  }),
  /** move locator n (1…10 = pts[[n]]) to world point p, as one front-end update (inactive while c is False) */
  moveLocator: (n, p) => { if (state.c) { state.pts[n - 1] = clampToBox(p); run(); } return clone(state); },
  setState: (partial) => {
    state = { ...state, ...clone(partial) };
    viewCtl.set(state.stableOrMove); mCtl.set(state.m); nCtl.set(state.n);
    showControls(); run(); animate();
  },
  /** pause the move animation (tests, screenshots) */
  stopAnimation: () => sCtl.stop(),
  worldToClient: (p) => plot.worldToClient(p),
  ready: true,
};
