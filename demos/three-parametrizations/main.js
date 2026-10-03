// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Benedict Isichei
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/three-parametrizations/main.js — page wiring + three.js scene (browser only).
import { THREE, createViewer, surface, fatLine, label, inkFraction } from '../../shared/three-helpers.js';
import { Controls } from '../../shared/ui.js';
import { DEFAULTS, evaluate } from './rotations.js';
import { matVec } from '../../shared/linalg.js';
import { TEAPOT_VERTICES, TEAPOT_QUADS } from './teapot-data.js';

const PR = 1.45; // PlotRange -> 1.45 {{-1,1},{-1,1},{-1,1}}
let state = { ...DEFAULTS, axis: [...DEFAULTS.axis] };
let current = evaluate(state);

const viewer = createViewer(document.getElementById('graphic'), {
  box: [[-PR, PR], [-PR, PR], [-PR, PR]],
  viewPoint: [1.3, -2.4, 2.0], // Mathematica's default ViewPoint
  size: 375,
  maxSize: 520,
});

// ---- teapot geometry (the original's GraphicsComplex) ----------------------
function teapotGeometry() {
  const pos = new Float32Array(TEAPOT_VERTICES.flat());
  const idx = [];
  for (const [a, b, c, d] of TEAPOT_QUADS) idx.push(a, b, c, a, c, d);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const teapotGeo = teapotGeometry();
const startTeapot = new THREE.Mesh(teapotGeo, surface([0, 1, 0], { opacity: 0.2, side: THREE.DoubleSide })); // {Opacity[0.2], Green, teapot}
const progTeapot = new THREE.Mesh(teapotGeo, surface([1, 1, 1], { side: THREE.DoubleSide })); // GeometricTransformation[teapot, Rprog]
const endTeapot = new THREE.Mesh(teapotGeo, surface([1, 0, 0], { opacity: 0.2, side: THREE.DoubleSide })); // {Opacity[0.2], Red, ... R}
startTeapot.renderOrder = 2; endTeapot.renderOrder = 3;
viewer.scene.add(startTeapot, progTeapot, endTeapot);

// ---- fixed frame (red), current frame (blue), axis of rotation (purple) ---
const sub = (s) => `${s.replace(/(\w)(\d)$/, '$1<sub>$2</sub>')}`;
const fixedFrame = new THREE.Group();
const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
['x0', 'y0', 'z0'].forEach((name, i) => {
  fixedFrame.add(fatLine(viewer, [[0, 0, 0], E[i]], [1, 0, 0], 2));
  fixedFrame.add(label(sub(name), E[i].map((c) => c * 1.1), [1, 0, 0], { html: true }));
});
viewer.scene.add(fixedFrame);

// Current frame: lines from R.{0,0,0} to R.(0.9 e_i), labels at R.e_i. Built in
// world coordinates each update (not via a parent transform) to mirror the original.
let currentFrame = new THREE.Group();
let axisLine = new THREE.Group();
viewer.scene.add(currentFrame, axisLine);

// ---- axes + bounding box (Axes -> True, Boxed by default) -----------------
function addAxesAndBox() {
  const g = new THREE.Group();
  const corners = [];
  for (const x of [-PR, PR]) for (const y of [-PR, PR]) for (const z of [-PR, PR]) corners.push([x, y, z]);
  const edges = [];
  corners.forEach((a, i) => corners.forEach((b, j) => {
    if (j > i && a.filter((v, k) => v !== b[k]).length === 1) edges.push([a, b]);
  }));
  for (const [a, b] of edges) g.add(fatLine(viewer, [a, b], [0.6, 0.6, 0.6], 1));
  const ticks = [-1, -0.5, 0, 0.5, 1];
  const axisDefs = [
    { name: 'x0', at: (t) => [t, -PR, -PR], off: [0, -0.18, -0.12] },
    { name: 'y0', at: (t) => [PR, t, -PR], off: [0.18, 0, -0.12] },
    { name: 'z0', at: (t) => [-PR, -PR, t], off: [-0.15, -0.15, 0] },
  ];
  for (const a of axisDefs) {
    for (const t of ticks) {
      const p = a.at(t);
      g.add(label(String(t), p.map((v, k) => v + a.off[k]), [0.25, 0.25, 0.25], { cls: 'tick' }));
    }
    const mid = a.at(1.35).map((v, k) => v + a.off[k] * 2.2);
    g.add(label(sub(a.name), mid, [0.15, 0.15, 0.15], { html: true }));
  }
  viewer.scene.add(g);
}
addAxesAndBox();

function toMatrix4(R) {
  return new THREE.Matrix4().set(R[0][0], R[0][1], R[0][2], 0, R[1][0], R[1][1], R[1][2], 0, R[2][0], R[2][1], R[2][2], 0, 0, 0, 0, 1);
}

function draw() {
  const { R, Rprog, k } = current;
  progTeapot.matrixAutoUpdate = false; progTeapot.matrix.copy(toMatrix4(Rprog));
  endTeapot.matrixAutoUpdate = false; endTeapot.matrix.copy(toMatrix4(R));
  viewer.scene.remove(currentFrame, axisLine);
  for (const o of [currentFrame, axisLine]) o.traverse((c) => { if (c.element) c.element.remove(); });
  currentFrame = new THREE.Group();
  ['x1', 'y1', 'z1'].forEach((name, i) => {
    currentFrame.add(fatLine(viewer, [matVec(R, [0, 0, 0]), matVec(R, E[i].map((c) => 0.9 * c))], [0, 0, 1], 2));
    currentFrame.add(label(sub(name), matVec(R, E[i]), [0, 0, 1], { html: true }));
  });
  axisLine = new THREE.Group();
  axisLine.add(fatLine(viewer, [[0, 0, 0], k.map((c) => 1.3 * c)], [0.5, 0, 0.5], 3.75)); // Purple, Thickness[0.01]
  viewer.scene.add(currentFrame, axisLine);
  viewer.render();
}

// ---- controls ---------------------------------------------------------------
const top = new Controls(document.getElementById('top-controls'));
const left = new Controls(document.getElementById('controls'));
const C = {};
C.progress = top.slider({ name: 'progress', label: 'progress', min: 0, max: 1, step: 0.01, value: state.progress, onInput: (v) => update({ progress: v }) });
C.typeRot = left.setterBar({
  name: 'typeRot', label: 'method', value: state.typeRot,
  options: [{ value: 1, label: 'Euler ZYZ' }, { value: 2, label: 'axis/angle' }, { value: 3, label: 'roll pitch yaw' }],
  onChange: (v) => update({ typeRot: v }),
});
left.delimiter();
left.heading('Euler ZYZ');
const ang = { min: -3.15, max: 3.15, step: 0.01 };
C.phi = left.slider({ name: 'phi', label: 'φ', ...ang, value: state.phi, onInput: (v) => update({ phi: v }) });
C.theta = left.slider({ name: 'theta', label: 'θ', ...ang, value: state.theta, onInput: (v) => update({ theta: v }) });
C.psi = left.slider({ name: 'psi', label: 'ψ', ...ang, value: state.psi, onInput: (v) => update({ psi: v }) });
left.delimiter();
left.heading('axis angle');
C.axis = left.slider2D({ name: 'axis', label: 'axis\nlat/long', min: [-3.15, -1.58], max: [3.15, 1.58], value: state.axis, onInput: (v) => update({ axis: v }) });
C.angle = left.slider({ name: 'angle', label: 'angle', min: -3.15, max: 3.15, step: 0.1, value: state.angle, onInput: (v) => update({ angle: v }) });
left.delimiter();
left.heading('roll γ  pitch β  yaw α');
C.alpha = left.slider({ name: 'alpha', label: 'R x₀, α', ...ang, value: state.alpha, onInput: (v) => update({ alpha: v }) });
C.beta = left.slider({ name: 'beta', label: 'R y₀, β', ...ang, value: state.beta, onInput: (v) => update({ beta: v }) });
C.gamma = left.slider({ name: 'gamma', label: 'R z₀, γ', ...ang, value: state.gamma, onInput: (v) => update({ gamma: v }) });

function syncControls() {
  for (const name of ['progress', 'phi', 'theta', 'psi', 'axis', 'angle', 'alpha', 'beta', 'gamma']) C[name].set(state[name]);
  C.typeRot.set(state.typeRot);
  const t = state.typeRot;
  for (const n of ['phi', 'theta', 'psi']) C[n].setEnabled(t === 1);
  C.axis.setEnabled(t === 2); C.angle.setEnabled(t === 2);
  for (const n of ['alpha', 'beta', 'gamma']) C[n].setEnabled(t === 3);
}

function update(partial) {
  state = { ...state, ...partial };
  current = evaluate(state);
  state = current.state; // converted parameters are written back, as in the original
  syncControls();
  draw();
}

document.getElementById('reset').addEventListener('click', () => update({ ...DEFAULTS, axis: [...DEFAULTS.axis] }));
document.getElementById('reset-view').addEventListener('click', () => viewer.resetView());

update({});

window.__demo = {
  name: 'three-parametrizations',
  getState: () => JSON.parse(JSON.stringify(state)),
  setState: (partial) => update(partial),
  matrices: () => JSON.parse(JSON.stringify({ R: current.R, Rprog: current.Rprog, k: current.k })),
  /** rotation actually applied to the red (final) and solid (progress) teapots in the three.js scene */
  renderedMatrices: () => {
    const m = (o) => { const e = o.matrix.elements; return [[e[0], e[4], e[8]], [e[1], e[5], e[9]], [e[2], e[6], e[10]]]; };
    return { R: m(endTeapot), Rprog: m(progTeapot) };
  },
  controlsEnabled: () => Object.fromEntries(['phi', 'theta', 'psi', 'angle', 'alpha', 'beta', 'gamma'].map((n) => [n, !C[n].row.classList.contains('is-disabled')])),
  renderNow: () => { viewer.renderer.render(viewer.scene, viewer.camera); viewer.labelRenderer.render(viewer.scene, viewer.camera); },
  inkFraction: () => inkFraction(viewer.renderer),
  frames: () => viewer.frames,
  ready: true,
};
