// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/arm-configurations/main.js — page: the joint-slider grid (rebuilt when the robot changes), the grip slider
// with its ⊕ panel, "show robot", the popup of the nine robots and the DH table at the left; the three.js picture
// (fixed PlotRange ±3, ViewAngle 12°, 420 × 350) and the H display at the right (browser only).
import { THREE, createViewer, inkFraction } from '../../shared/three-helpers.js';
import { Controls, mmaSliderText } from '../../shared/ui.js';
import { addCheckbox, addPopup } from '../../shared/ui-extra.js';
import { addMathematicaLighting } from '../../shared/mma-lighting.js';
import { addPrims, disposeGroup } from '../common/g3d-three.js';
import { dhTableRows } from './robots.js';
import {
  ROBOTS, initialState, cloneState, selectRobot, evaluate, isPrismatic, valueText, sliderPosition, piValue, fracValue,
  REV, PRIS, PLOT_RANGE, IMAGE_SIZE, VIEW_ANGLE, VIEWPOINT, origin,
} from './model.js';

const THICK_PX = 3; // Thick, as robot-singularities D-RS-03 (D-AC-03)

let state = initialState();
let view = evaluate(state);
let evaluations = 1;

// ---- the viewer (D-AC-01: fixed framing, non-square image, clipping at the PlotRange) ---------------------------
const viewEl = document.getElementById('view');
const viewer = createViewer(viewEl, { box: PLOT_RANGE, viewPoint: VIEWPOINT, viewAngle: VIEW_ANGLE, imageSize: IMAGE_SIZE, maxSize: IMAGE_SIZE[0] });
viewer.renderer.domElement.setAttribute('data-testid', 'scene-canvas-workspace');
viewer.renderer.domElement.setAttribute('aria-label', 'Robot arm with its DH frames (3D, drag to rotate)');
// D-AC-02 (as D-RS-02): Mathematica lights and blends the displayed colour values directly; its documented lights
viewer.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
addMathematicaLighting(viewer.camera);
viewer.renderer.localClippingEnabled = true;
// PlotRange -> 3{{-1,1},{-1,1},{-1,1}}: everything beyond ±3 is clipped (F-AC-14)
const CLIP = [
  new THREE.Plane(new THREE.Vector3(1, 0, 0), 3), new THREE.Plane(new THREE.Vector3(-1, 0, 0), 3),
  new THREE.Plane(new THREE.Vector3(0, 1, 0), 3), new THREE.Plane(new THREE.Vector3(0, -1, 0), 3),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), 3), new THREE.Plane(new THREE.Vector3(0, 0, -1), 3),
];

const group = new THREE.Group();
viewer.scene.add(group);
const SIZE = Math.hypot(6, 6, 6);

function draw() {
  disposeGroup(group, [viewer]);
  addPrims(group, view.prims, { viewer, clip: CLIP, box: PLOT_RANGE, size: SIZE, thickPx: THICK_PX });
  viewer.render(); // the camera is not refitted: fixed PlotRange (the user's rotation is kept, D-AC-06)
}

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

function renderTable() {
  tableEl.replaceChildren();
  for (const row of dhTableRows(ROBOTS[state.robot])) {
    const tr = document.createElement('tr');
    for (const c of row) tr.append(cellNode(c, typeof c !== 'string' && c.sym === 'θ'));
    tableEl.append(tr);
  }
}

function renderH() {
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

function run() {
  view = evaluate(state);
  evaluations++;
  renderH();
  draw();
}

// ---- the slider grid (F-AC-01): rebuilt when the robot changes --------------------------------------------------
const gridEl = document.getElementById('grid');
let gridSliders = [];

function buildGrid() {
  for (const s of gridSliders) s.stop();
  gridEl.replaceChildren();
  const grid = new Controls(gridEl);
  const R = ROBOTS[state.robot];
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
      onInput: (k) => { state.params[i] = prismatic ? fracValue(k) : piValue(k); run(); },
    });
    // Subsuperscript[Style["d", Italic], i, "*"] / Subsuperscript["θ", i, "*"]
    const lab = s.row.querySelector('.ctl-label');
    lab.innerHTML = `<i>${prismatic ? 'd' : 'θ'}</i><sub>${i + 1}</sub><sup>*</sup>`;
    return s;
  });
}

// ---- the other controls -------------------------------------------------------------------------------------------
const controls = new Controls(document.getElementById('grip'));
// Control@{{g, 1, "grip"}, 0, 1, 0.01, ImageSize -> Small, Appearance -> "Labeled"}: exact default "1", moved "0.62", "1."
let gripShownMoved = false; // what the value field shows: the exact default ("1") or a moved machine value ("1.")
const grip = controls.slider({
  name: 'g', label: 'grip', min: 0, max: 1, step: 0.01, steps: 'mma', value: state.g.v,
  format: (v, { moved }) => { gripShownMoved = moved; return mmaSliderText(v, { moved, realValues: true }); },
  onInput: (v) => { state.g = { v, exact: !gripShownMoved }; run(); },
});
const showCtl = addCheckbox(controls, {
  name: 'showRobot', label: 'show robot', value: state.showRobot, parent: document.getElementById('show'),
  onChange: (v) => { state.showRobot = v; run(); },
});
const popup = addPopup(controls, {
  name: 'DHParameters', label: '', value: state.robot, parent: document.getElementById('popup'),
  options: ROBOTS.map((R, i) => ({ value: i, label: R.name })),
  onChange: (i) => {
    const before = state.robot;
    state = selectRobot(state, i);
    if (state.robot !== before) { buildGrid(); renderTable(); }
    run();
  },
});

/** show `state` in every control (programmatic: no evaluation) */
function syncControls() {
  grip.stop();
  grip.set(state.g.v, { moved: !state.g.exact });
  showCtl.set(state.showRobot);
  popup.set(state.robot);
  buildGrid();
  renderTable();
}

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  syncControls();
  run();
});

buildGrid();
renderTable();
renderH();
draw();

// ---- test / automation hook (port addition A-AC-02) ----------------------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
const PARTS = ['ground', 'joint1', 'joints', 'gripper'];
function counts(prims) {
  const c = {};
  for (const p of prims) c[p.type] = (c[p.type] || 0) + 1;
  return c;
}
window.__demo = {
  name: 'arm-configurations',
  getState: () => cloneState(state),
  /**
   * setState(partial state of model.js: robot, params (array of joint values {v, exact[, pi | frac]}), g ({v, exact}),
   * showRobot): assigned directly as Manipulate variables (no grid reset), then one evaluation.
   */
  setState: (partial) => {
    const next = cloneState(state);
    if (partial.robot !== undefined) { next.robot = partial.robot; next.dof = ROBOTS[partial.robot].jointtype.length; }
    if (partial.params) partial.params.forEach((p, i) => { if (p) next.params[i] = { ...p }; });
    if (partial.g) next.g = { ...partial.g };
    if (partial.showRobot !== undefined) next.showRobot = partial.showRobot;
    state = next;
    syncControls();
    run();
    return cloneState(state);
  },
  /** Td[1] … Td[dof], the frame origins and H */
  transforms: () => clone({ Td: view.Td, origins: view.Td.map(origin), H: view.H }),
  /** the 16 strings of the H display, in rows */
  hStrings: () => clone(view.hStrings),
  /** the exactness of every entry of H: 'zero' | 'plain' | 'symbolic' | 'machine' */
  exactness: () => clone(view.HKinds),
  /** the flattened primitives of one part (ground, joint1, joints, gripper), as data */
  primitives: (part) => clone(view.parts[PARTS.indexOf(part)]),
  view: () => clone({ dof: view.dof, counts: counts(view.prims), parts: PARTS.map((p, i) => ({ part: p, count: view.parts[i].length, counts: counts(view.parts[i]) })) }),
  /** the clipping planes of the PlotRange: [normal, constant] */
  clipping: () => CLIP.map((p) => [p.normal.toArray(), p.constant]),
  inkFraction: () => {
    viewer.renderer.render(viewer.scene, viewer.camera);
    return inkFraction(viewer.renderer);
  },
  cameraPosition: () => viewer.camera.position.toArray(),
  camera: () => ({ position: viewer.camera.position.toArray(), target: viewer.controls.target.toArray(), fov: viewer.camera.fov, aspect: viewer.camera.aspect }),
  evaluations: () => evaluations,
  ready: true,
};
