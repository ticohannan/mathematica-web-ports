// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Benedict Isichei
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/three-parametrizations/main.js — the Manipulate: progress (top), method, the Euler ZYZ, axis/angle and
// roll-pitch-yaw controls (left) and the teapots with their frames (a three.js scene, the picture's renderer), on
// shared/manipulate.js (browser only).
// On the shared Manipulate layer since v0.1.21; lighting as the other 3D ports since then (owner decision 2026-10-23,
// DEC-36, D-TP-06).
import { Manipulate, Delimiter, Rule, Control } from '../../shared/manipulate.js';
import { THREE, createViewer, surface, fatLine, label, inkFraction } from '../../shared/three-helpers.js';
import { addMathematicaLighting } from '../../shared/mma-lighting.js';
import { Controls } from '../../shared/ui.js';
import { DEFAULTS, evaluate } from './rotations.js';
import { matVec } from '../../shared/linalg.js';
import { TEAPOT_VERTICES, TEAPOT_QUADS } from './teapot-data.js';

const PR = 1.45; // PlotRange -> 1.45 {{-1,1},{-1,1},{-1,1}}
const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const sub = (s) => `${s.replace(/(\w)(\d)$/, '$1<sub>$2</sub>')}`;

/**
 * The picture: Graphics3D[{{Opacity[0.2], Green, teapot}, GeometricTransformation[teapot, Rprog], {Opacity[0.2], Red,
 * GeometricTransformation[teapot, R]}, red fixed frame, blue current frame, purple axis}, Axes -> True, PlotRange -> 1.45]
 * as a three.js scene; draw({R, Rprog, k}) places the teapots and rebuilds the current frame and the axis (the renderer
 * of the Manipulate's picture).
 */
function Teapots(element) {
  const viewer = createViewer(element, {
    box: [[-PR, PR], [-PR, PR], [-PR, PR]],
    viewPoint: [1.3, -2.4, 2.0], // Mathematica's default ViewPoint
    size: 375, maxSize: 520,
  });
  // Lighting -> Automatic as View3D draws it (D-TP-06, owner decision 2026-10-23, DEC-36): Mathematica's documented
  // default lights (shared/mma-lighting.js) on the displayed colour values (linear output, no sRGB encoding)
  viewer.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  addMathematicaLighting(viewer.camera);

  // teapot geometry (the original's GraphicsComplex)
  const pos = new Float32Array(TEAPOT_VERTICES.flat());
  const idx = [];
  for (const [a, b, c, d] of TEAPOT_QUADS) idx.push(a, b, c, a, c, d);
  const teapotGeo = new THREE.BufferGeometry();
  teapotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  teapotGeo.setIndex(idx);
  teapotGeo.computeVertexNormals();
  const startTeapot = new THREE.Mesh(teapotGeo, surface([0, 1, 0], { opacity: 0.2, side: THREE.DoubleSide })); // {Opacity[0.2], Green, teapot}
  const progTeapot = new THREE.Mesh(teapotGeo, surface([1, 1, 1], { side: THREE.DoubleSide })); // GeometricTransformation[teapot, Rprog]
  const endTeapot = new THREE.Mesh(teapotGeo, surface([1, 0, 0], { opacity: 0.2, side: THREE.DoubleSide })); // {Opacity[0.2], Red, ... R}
  startTeapot.renderOrder = 2; endTeapot.renderOrder = 3;
  viewer.scene.add(startTeapot, progTeapot, endTeapot);

  // fixed frame (red); the current frame (blue) and the axis of rotation (purple) are rebuilt by draw
  const fixedFrame = new THREE.Group();
  ['x0', 'y0', 'z0'].forEach((name, i) => {
    fixedFrame.add(fatLine(viewer, [[0, 0, 0], E[i]], [1, 0, 0], 2));
    fixedFrame.add(label(sub(name), E[i].map((c) => c * 1.1), [1, 0, 0], { html: true }));
  });
  viewer.scene.add(fixedFrame);
  let currentFrame = new THREE.Group();
  let axisLine = new THREE.Group();
  viewer.scene.add(currentFrame, axisLine);

  // axes + bounding box (Axes -> True, Boxed by default)
  const g = new THREE.Group();
  const corners = [];
  for (const x of [-PR, PR]) for (const y of [-PR, PR]) for (const z of [-PR, PR]) corners.push([x, y, z]);
  corners.forEach((a, i) => corners.forEach((b, j) => {
    if (j > i && a.filter((v, n) => v !== b[n]).length === 1) g.add(fatLine(viewer, [a, b], [0.6, 0.6, 0.6], 1));
  }));
  const axisDefs = [
    { name: 'x0', at: (t) => [t, -PR, -PR], off: [0, -0.18, -0.12] },
    { name: 'y0', at: (t) => [PR, t, -PR], off: [0.18, 0, -0.12] },
    { name: 'z0', at: (t) => [-PR, -PR, t], off: [-0.15, -0.15, 0] },
  ];
  for (const a of axisDefs) {
    for (const t of [-1, -0.5, 0, 0.5, 1]) g.add(label(String(t), a.at(t).map((v, n) => v + a.off[n]), [0.25, 0.25, 0.25], { cls: 'tick' }));
    g.add(label(sub(a.name), a.at(1.35).map((v, n) => v + a.off[n] * 2.2), [0.15, 0.15, 0.15], { html: true }));
  }
  viewer.scene.add(g);

  const toMatrix4 = (R) => new THREE.Matrix4().set(R[0][0], R[0][1], R[0][2], 0, R[1][0], R[1][1], R[1][2], 0, R[2][0], R[2][1], R[2][2], 0, 0, 0, 0, 1);
  return {
    viewer, progTeapot, endTeapot,
    draw: ({ R, Rprog, k }) => {
      progTeapot.matrixAutoUpdate = false; progTeapot.matrix.copy(toMatrix4(Rprog));
      endTeapot.matrixAutoUpdate = false; endTeapot.matrix.copy(toMatrix4(R));
      // current frame: lines from R.{0,0,0} to R.(0.9 e_i), labels at R.e_i, in world coordinates (as the original)
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
    },
  };
}

const teapots = Teapots(document.getElementById('graphic')); // made before the controls, as before the migration
const { viewer } = teapots;
const top = new Controls(document.getElementById('top-controls'));
/** the progress slider sits above the picture (ControlPlacement -> Top for it), outside the left column */
const topSlider = (_, o) => top.slider({ name: o.name, label: o.label, min: 0, max: 1, step: 0.01, value: o.value, onInput: o.onInput });
const ang = (name, label, enabledFor) => [[name, 0, label], -3.15, 3.15, 0.01, { Appearance: 'Labeled', steps: undefined, Enabled: (s) => s.typeRot === enabledFor }];

Manipulate({
  name: 'three-parametrizations',
  initial: () => ({ ...DEFAULTS, axis: [...DEFAULTS.axis] }),
  // converted parameters are written back into the disabled controls, as in the original
  body: (s) => { const r = evaluate(s); return { state: r.state, view: r, graphics: r }; },
  graphics: { id: 'graphic', renderer: teapots },
  // the sliders keep the port's own steps and number fields (steps: undefined)
  controls: [
    [['progress', 1, 'progress'], Control(topSlider)],
    [['typeRot', 1, 'method'], [Rule(1, 'Euler ZYZ'), Rule(2, 'axis/angle'), Rule(3, 'roll pitch yaw')]],
    Delimiter, 'Euler ZYZ',
    ang('phi', 'φ', 1), ang('theta', 'θ', 1), ang('psi', 'ψ', 1),
    Delimiter, 'axis angle',
    [['axis', [0, 0], 'axis\nlat/long'], [-3.15, -1.58], [3.15, 1.58], { Enabled: (s) => s.typeRot === 2 }],
    [['angle', 0, 'angle'], -3.15, 3.15, 0.1, { Appearance: 'Labeled', steps: undefined, Enabled: (s) => s.typeRot === 2 }],
    Delimiter, 'roll γ  pitch β  yaw α',
    ang('alpha', 'R x₀, α', 3), ang('beta', 'R y₀, β', 3), ang('gamma', 'R z₀, γ', 3),
  ],
  hook: {
    copy: (x) => JSON.parse(JSON.stringify(x)),
    matrices: (c) => () => JSON.parse(JSON.stringify({ R: c.view.R, Rprog: c.view.Rprog, k: c.view.k })),
    /** rotation actually applied to the red (final) and solid (progress) teapots in the three.js scene */
    renderedMatrices: () => () => {
      const m = (o) => { const e = o.matrix.elements; return [[e[0], e[4], e[8]], [e[1], e[5], e[9]], [e[2], e[6], e[10]]]; };
      return { R: m(teapots.endTeapot), Rprog: m(teapots.progTeapot) };
    },
    controlsEnabled: (c) => () => Object.fromEntries(['phi', 'theta', 'psi', 'angle', 'alpha', 'beta', 'gamma'].map((n) => [n, !c.controls.get(n).row.classList.contains('is-disabled')])),
    renderNow: () => () => { viewer.renderer.render(viewer.scene, viewer.camera); viewer.labelRenderer.render(viewer.scene, viewer.camera); },
    inkFraction: () => () => inkFraction(viewer.renderer),
    frames: () => () => viewer.frames,
  },
});
document.getElementById('reset-view').addEventListener('click', () => viewer.resetView());
