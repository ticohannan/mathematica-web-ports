// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/arm-configurations/main.js — page: the joint-slider grid (rebuilt when the robot changes), the grip slider
// with its ⊕ panel, "show robot", the popup of the nine robots and the DH table at the left; the model's Graphics3D
// (fixed PlotRange ±3 with clipping, ViewAngle 12°, 420 × 350) drawn by shared/graphics3d-view.js and the H display
// at the right (browser only).
// On the shared Manipulate layer since v0.1.21 (behaviour unchanged: tests and 3D parity of scene graph and pixels).
import { Manipulate, Control, Rule, PopupMenu } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { Controls, mmaSliderText } from '../../shared/ui.js';
import { dhTableRows } from './robots.js';
import { ROBOTS, initialState, cloneState, selectRobot, evaluate, isPrismatic, valueText, sliderPosition, piValue, fracValue, REV, PRIS, origin } from './model.js';

// ---- the DH table and H -----------------------------------------------------------------------------------------
const tableEl = document.getElementById('dh-table');
const hEl = document.getElementById('h-matrix');

function cellNode(c, varItalic) {
  const td = document.createElement('td');
  if (typeof c === 'string') { td.textContent = c; return td; }
  // Subsuperscript["θ", i, "*"] / Subsuperscript["d", i, "*"]
  const s = document.createElement(varItalic ? 'i' : 'span');
  s.textContent = c.sym;
  const sub = document.createElement('sub'); sub.textContent = String(c.i);
  const sup = document.createElement('sup'); sup.textContent = '*';
  td.append(s, sub, sup);
  return td;
}

function renderTable(state) {
  tableEl.replaceChildren();
  for (const row of dhTableRows(ROBOTS[state.robot])) {
    const tr = document.createElement('tr');
    for (const c of row) tr.append(cellNode(c, typeof c !== 'string' && c.sym === 'θ'));
    tableEl.append(tr);
  }
}

function renderH(view) {
  hEl.replaceChildren();
  view.hStrings.forEach((row, i) => {
    const tr = document.createElement('tr');
    if (i === 3) tr.className = 'last-row';
    row.forEach((s, j) => {
      const td = document.createElement('td');
      td.textContent = s;
      if (j === 3) td.className = 'last-col';
      tr.append(td);
    });
    hEl.append(tr);
  });
}

// ---- the slider grid (F-AC-01) and the DH table: rebuilt when the robot changes and by a reset or setState ---------
const gridEl = document.getElementById('grid');
let gridSliders = [], builtRobot = null, gridInput = null, M = null;

function buildGrid(state) {
  for (const s of gridSliders) s.stop();
  gridEl.replaceChildren();
  const grid = new Controls(gridEl);
  const R = ROBOTS[state.robot];
  builtRobot = state.robot;
  gridSliders = R.jointtype.map((j, i) => {
    const prismatic = isPrismatic(j);
    const shown = valueText(state.params[i]); // the value when the grid is built (the reset value "0" / "0.5")
    const s = grid.slider({
      name: `params-${i + 1}`,
      label: `${prismatic ? 'd' : 'θ'}*${i + 1}`,
      min: prismatic ? PRIS.min : REV.min,
      max: prismatic ? PRIS.max : REV.max,
      step: 1,
      steps: 'mma',
      realValues: false,
      value: sliderPosition(state.params[i], prismatic),
      labeled: 'text', // Dynamic[params[[i]]]: plain text, no field
      plus: false, // a bare Slider (no Appearance -> "Labeled")
      format: (k, { moved }) => (moved ? valueText(prismatic ? fracValue(k) : piValue(k)) : shown),
      onInput: (k) => { const p = M.state.params.slice(); p[i] = prismatic ? fracValue(k) : piValue(k); gridInput(p); },
    });
    // Subsuperscript[Style["d", Italic], i, "*"] / Subsuperscript["θ", i, "*"]
    const lab = s.row.querySelector('.ctl-label');
    lab.innerHTML = `<i>${prismatic ? 'd' : 'θ'}</i><sub>${i + 1}</sub><sup>*</sup>`;
    return s;
  });
  renderTable(state);
}
const jointGrid = (controls, { onInput }) => {
  gridInput = onInput;
  return { get: () => M.state.params, set: () => buildGrid(M.state), stop: () => gridSliders.forEach((s) => s.stop()) };
};

let evaluations = 0;
// Control@{{g, 1, "grip"}, 0, 1, 0.01, ImageSize -> Small, Appearance -> "Labeled"}: exact default "1", moved "0.62", "1."
let gripShownMoved = false; // what the value field shows: the exact default ("1") or a moved machine value ("1.")
const PARTS = ['ground', 'joint1', 'joints', 'gripper'];
const clone = (x) => JSON.parse(JSON.stringify(x));
function counts(prims) {
  const c = {};
  for (const p of prims) c[p.type] = (c[p.type] || 0) + 1;
  return c;
}

M = Manipulate({
  name: 'arm-configurations',
  initial: initialState,
  body: (st) => { evaluations++; const view = evaluate(st); return { view, graphics: view.graphic }; },
  // fixed framing (ViewAngle, ImageSize {420, 350}), clipping at the PlotRange (D-AC-01, F-AC-14): the graphic's own
  // options; the camera is not refitted, a user rotation is kept (D-AC-06); Thick 3 px (D-AC-03); Mathematica's
  // documented lights (D-AC-02)
  graphics: { id: 'view', renderer: View3D({ thickPx: 3, testid: 'scene-canvas-workspace', label: 'Robot arm with its DH frames (3D, drag to rotate)' }) },
  elements: { controls: 'grip' },
  controls: [
    [['params', null], Control(jointGrid)],
    [['g.v', 1, 'grip'], 0, 1, 0.01, {
      Appearance: 'Labeled', name: 'g',
      format: (v, { moved }) => { gripShownMoved = moved; return mmaSliderText(v, { moved, realValues: true }); },
      Assign: (s, v) => { s.g = { v, exact: !gripShownMoved }; },
      Moved: (s) => !s.g.exact,
    }],
    [['showRobot', true, 'show robot'], [false, true], { parent: document.getElementById('show') }],
    [['robot', 0, ''], ROBOTS.map((R, i) => Rule(i, R.name)),
      { ControlType: PopupMenu, name: 'DHParameters', parent: document.getElementById('popup'), Assign: (s, i) => Object.assign(s, selectRobot(s, i)) }],
  ],
  resetStops: true,
  after: (ctx) => { if (ctx.state.robot !== builtRobot) buildGrid(ctx.state); renderH(ctx.view); },
  /**
   * setState(partial state of model.js: robot, params (array of joint values {v, exact[, pi | frac]}), g ({v, exact}),
   * showRobot): assigned directly as Manipulate variables (no grid reset), then one evaluation.
   */
  merge: (state, partial) => {
    const next = cloneState(state);
    if (partial.robot !== undefined) { next.robot = partial.robot; next.dof = ROBOTS[partial.robot].jointtype.length; }
    if (partial.params) partial.params.forEach((p, i) => { if (p) next.params[i] = { ...p }; });
    if (partial.g) next.g = { ...partial.g };
    if (partial.showRobot !== undefined) next.showRobot = partial.showRobot;
    return next;
  },
  hook: { // port addition A-AC-02
    view: (view) => ({ dof: view.dof, counts: counts(view.prims), parts: PARTS.map((p, i) => ({ part: p, count: view.parts[i].length, counts: counts(view.parts[i]) })) }),
    /** Td[1] … Td[dof], the frame origins and H */
    transforms: (c) => () => clone({ Td: c.view.Td, origins: c.view.Td.map(origin), H: c.view.H }),
    /** the 16 strings of the H display, in rows */
    hStrings: (c) => () => clone(c.view.hStrings),
    /** the exactness of every entry of H: 'zero' | 'plain' | 'symbolic' | 'machine' */
    exactness: (c) => () => clone(c.view.HKinds),
    /** the flattened primitives of one part (ground, joint1, joints, gripper), as data */
    primitives: (c) => (part) => clone(c.view.parts[PARTS.indexOf(part)]),
    /** the clipping planes of the PlotRange: [normal, constant] */
    clipping: (c) => () => c.renderer().clip.map((p) => [p.normal.toArray(), p.constant]),
    inkFraction: (c) => () => c.renderer().inkFraction(),
    cameraPosition: (c) => () => c.renderer().viewer.camera.position.toArray(),
    camera: (c) => () => ({ ...c.renderer().camera(), aspect: c.renderer().viewer.camera.aspect }),
    evaluations: () => () => evaluations,
  },
});
