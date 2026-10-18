// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dh-parameters/main.js — page: the 16 Manipulate controls (3 setter bars, 13 labelled sliders with ⊕ panels,
// 3 delimiters) at the left, the three.js picture drawn from the model's Graphics3D data (browser only).
import { THREE, createViewer, inkFraction } from '../../shared/three-helpers.js';
import { Controls, mmaSliderText } from '../../shared/ui.js';
import { piFraction, parsePiFraction } from '../../shared/mma-text.js';
import { addMathematicaLighting } from '../../shared/mma-lighting.js';
import { addPrims, disposeGroup, fitViewer } from '../common/g3d-three.js';
import {
  initialState, cloneState, evaluate, origin, ANGLE_DEN, N_MIN, N_MAX, VIEWPOINT, DH_ZOOM,
} from './model.js';

const IMAGE_SIZE = 425; // ImageSize -> 425
const THICK_PX = 3; // Thickness[Large] (Thick), as robot-singularities D-RS-03 (D-DH-03)

let state = initialState();
let view = evaluate(state);
let evaluations = 1;

// ---- the viewer ---------------------------------------------------------------------------------------------
const viewEl = document.getElementById('view');
const viewer = createViewer(viewEl, { box: view.box, viewPoint: VIEWPOINT, size: IMAGE_SIZE, maxSize: IMAGE_SIZE });
viewer.renderer.domElement.setAttribute('data-testid', 'scene-canvas-workspace');
viewer.renderer.domElement.setAttribute('aria-label', 'Robot arm with its DH frames (3D, drag to rotate)');
// D-DH-02 (as D-RS-02): Mathematica lights and blends the displayed colour values directly; its documented lights
viewer.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
addMathematicaLighting(viewer.camera);

const group = new THREE.Group();
viewer.scene.add(group);
let boxKey = null;

function draw() {
  const box = view.box;
  disposeGroup(group, [viewer]);
  const size = Math.hypot(...box.map(([a, b]) => b - a)); // ~ the width the graphic spans (no points or arrows here)
  addPrims(group, view.prims, { viewer, clip: null, box, size, thickPx: THICK_PX });
  // automatic PlotRange with SphericalRegion: refit when the bounds change, keeping the user's rotation (D-DH-01, D-DH-05)
  const key = box.map(([a, b]) => `${a.toFixed(6)},${b.toFixed(6)}`).join(';');
  if (key !== boxKey) { fitViewer(viewer, { box, zoom: DH_ZOOM, viewPoint: VIEWPOINT }); boxKey = key; }
  viewer.render();
}

function run() {
  view = evaluate(state);
  evaluations++;
  draw();
}

// ---- controls (the source sets no ControlPlacement; the snapshots show them at the left, N-DH-03) -------------
const controls = new Controls(document.getElementById('controls'));
const SUB = ['₁', '₂', '₃'];
const ctl = {};
const movedShown = {}; // what the d, r, g value fields show: exact default ("1") or moved machine value ("1.")

/** a typed angle: "5π/32", "5 Pi/32", "-π/2" (exact), or a number (radians) → the slider's integer n of nπ/32 */
function parseAngle(text) {
  const p = parsePiFraction(text);
  if (p) return (p.num * ANGLE_DEN) / p.den;
  const t = String(text).trim().replace(/[−–]/g, '-');
  if (t === '' || !Number.isFinite(Number(t))) return null;
  return (Number(t) * ANGLE_DEN) / Math.PI;
}

function angleSlider(name, label, value, onInput) {
  // {{Theta1, 5π/32, "θ1"}, -π, π, π/32, Appearance -> "Labeled"}: the positions are the exact values nπ/32
  return controls.slider({
    name, label, min: N_MIN, max: N_MAX, step: 1, steps: 'mma', realValues: false, value,
    format: (n) => piFraction(n, ANGLE_DEN), parse: parseAngle, animSeconds: 8, onInput,
  });
}

function lengthSlider(name, label, value, onInput) {
  // {{d1, 1, "d1"}, 0, 1, 0.01, Appearance -> "Labeled"}: min + k·0.01; exact default "1", moved "1." (Q-DH-05)
  return controls.slider({
    name, label, min: 0, max: 1, step: 0.01, steps: 'mma', value,
    format: (v, { moved }) => { movedShown[name] = moved; return mmaSliderText(v, { moved, realValues: true }); },
    onInput,
  });
}

for (let i = 0; i < 3; i++) {
  const k = i + 1;
  ctl[`j${k}`] = controls.setterBar({
    name: `j${k}`, label: `j${SUB[i]}`, value: state.j[i],
    options: [{ value: 'Revolute' }, { value: 'Prismatic' }],
    onChange: (v) => { state.j[i] = v; run(); },
  });
  ctl[`theta${k}`] = angleSlider(`theta${k}`, `θ${SUB[i]}`, state.theta[i], (n) => { state.theta[i] = n; run(); });
  ctl[`d${k}`] = lengthSlider(`d${k}`, `d${SUB[i]}`, state.d[i], (v) => { state.d[i] = v; state.exact.d[i] = !movedShown[`d${k}`]; run(); });
  ctl[`r${k}`] = lengthSlider(`r${k}`, `r${SUB[i]}`, state.r[i], (v) => { state.r[i] = v; state.exact.r[i] = !movedShown[`r${k}`]; run(); });
  ctl[`alpha${k}`] = angleSlider(`alpha${k}`, `α${SUB[i]}`, state.alpha[i], (n) => { state.alpha[i] = n; run(); });
  controls.delimiter();
}
ctl.g = lengthSlider('g', 'grip', state.g, (v) => { state.g = v; state.exact.g = !movedShown.g; run(); });

/** show `state` in every control (programmatic: no evaluation) */
function syncControls() {
  for (let i = 0; i < 3; i++) {
    const k = i + 1;
    for (const c of ['theta', 'd', 'r', 'alpha']) ctl[`${c}${k}`].stop();
    ctl[`j${k}`].set(state.j[i]);
    ctl[`theta${k}`].set(state.theta[i]);
    ctl[`alpha${k}`].set(state.alpha[i]);
    ctl[`d${k}`].set(state.d[i], { moved: !state.exact.d[i] });
    ctl[`r${k}`].set(state.r[i], { moved: !state.exact.r[i] });
  }
  ctl.g.stop();
  ctl.g.set(state.g, { moved: !state.exact.g });
}

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  syncControls();
  run();
});

draw();

// ---- test / automation hook (port addition A-DH-02) ------------------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
const PARTS = ['ground', 'joint1', 'joint2', 'joint3', 'gripper'];
function summary() {
  const counts = {};
  for (const p of view.prims) counts[p.type] = (counts[p.type] || 0) + 1;
  return counts;
}
window.__demo = {
  name: 'dh-parameters',
  getState: () => cloneState(state),
  /** setState(partial state of model.js: j, theta, d, r, alpha, g, exact): like the controls, one evaluation */
  setState: (partial) => {
    const next = cloneState(state);
    for (const k of ['j', 'theta', 'd', 'r', 'alpha']) if (partial[k]) next[k] = partial[k].slice();
    if (partial.g !== undefined) next.g = partial.g;
    if (partial.exact) next.exact = { d: (partial.exact.d ?? next.exact.d).slice(), r: (partial.exact.r ?? next.exact.r).slice(), g: partial.exact.g ?? next.exact.g };
    state = next;
    syncControls();
    run();
    return cloneState(state);
  },
  /** T1, T2, T3, T1.T2, T1.T2.T3 and the frame origins */
  transforms: () => clone({ T1: view.T1, T2: view.T2, T3: view.T3, T12: view.T12, T123: view.T123, origins: [view.T1, view.T12, view.T123].map(origin) }),
  /** the flattened primitives of one part (ground, joint1, joint2, joint3, gripper), as data */
  primitives: (part) => clone(view.parts[PARTS.indexOf(part)]),
  view: () => clone({ box: view.box, counts: summary(), parts: PARTS.map((p, i) => ({ part: p, count: view.parts[i].length })) }),
  inkFraction: () => {
    viewer.renderer.render(viewer.scene, viewer.camera);
    return inkFraction(viewer.renderer);
  },
  cameraPosition: () => viewer.camera.position.toArray(),
  camera: () => ({ position: viewer.camera.position.toArray(), target: viewer.controls.target.toArray(), fov: viewer.camera.fov }),
  evaluations: () => evaluations,
  ready: true,
};
