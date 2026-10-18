// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei, Muhammad Sultan and Maruthi S. Chemudupati
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/manipulator-workspaces/main.js — page: the Manipulate controls at the left (joint slider grid, three
// IntervalSliders, the robot popup menu), the three.js picture of the robot and the nine translucent workspace
// surfaces drawn from the model's data (browser only).
import { THREE, createViewer, fatLine, surface, inkFraction } from '../../shared/three-helpers.js';
import { Controls, el } from '../../shared/ui.js';
import { addPopup } from '../../shared/ui-extra.js';
import { addIntervalSlider } from '../../shared/ui-interval.js';
import { addMathematicaLighting } from '../../shared/mma-lighting.js';
import { NAMED } from '../../shared/mma-colors.js';
import { addPrims, disposeGroup, fitViewer } from '../common/g3d-three.js';
import {
  TYPE_NAMES, initialState, initialSettings, cloneState, selectType, evaluate, jointLabels, VIEWPOINT, MW_ZOOM,
} from './model.js';

const IMAGE_SIZE = 425; // ImageSize -> 425
const THICK_PX = 3; // Thickness[Large] (Thick), as robot-singularities D-RS-03 (D-MW-05)
const RANGE = { min: -3.1, max: 3.1, step: 0.1, minIntervalSize: 0.1, method: 'Push' };

let state = initialState();
let cache = null;
let view = null;
let evaluations = 0, recomputes = 0, computes = 0;

// ---- the viewer ---------------------------------------------------------------------------------------------
const viewEl = document.getElementById('view');
const viewer = createViewer(viewEl, { box: [[-2.2, 2.2], [-2.2, 2.2], [-0.4, 1]], viewPoint: VIEWPOINT, size: IMAGE_SIZE, maxSize: IMAGE_SIZE });
viewer.renderer.domElement.setAttribute('data-testid', 'scene-canvas-workspace');
viewer.renderer.domElement.setAttribute('aria-label', 'Robot arm and its workspace (3D, drag to rotate)');
// D-MW-02 (as D-RS-02): Mathematica lights and blends the displayed colour values directly; its documented lights
viewer.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
addMathematicaLighting(viewer.camera);

const robotGroup = new THREE.Group();
const wsGroup = new THREE.Group();
viewer.scene.add(robotGroup, wsGroup);
let boxKey = null;

/** one translucent surface of the 11 × 11 grid, smooth-shaded (the saved graphic carries VertexNormals) */
function surfaceMesh(grid) {
  const n = grid.length, m = grid[0].length;
  const pos = new Float32Array(n * m * 3);
  let k = 0;
  for (const row of grid) for (const q of row) { pos[k++] = q[0]; pos[k++] = q[1]; pos[k++] = q[2]; }
  const idx = [];
  for (let i = 0; i + 1 < n; i++) for (let j = 0; j + 1 < m; j++) {
    const a = i * m + j, b = a + 1, c = a + m, d = c + 1;
    idx.push(a, c, d, a, d, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // PlotStyle -> Directive[LightBlue, Opacity[.5]], both faces blended (D-MW-03)
  return new THREE.Mesh(geo, surface(NAMED.LightBlue, { opacity: 0.5, side: THREE.DoubleSide }));
}

function drawWorkspace() {
  disposeGroup(wsGroup, [viewer]);
  for (const s of view.ws.surfaces) {
    wsGroup.add(surfaceMesh(s.grid));
    // BoundaryStyle -> Blue and the mesh lines (GrayLevel[0.2]) 1 px wide (D-MW-05)
    wsGroup.add(fatLine(viewer, s.boundary, [0, 0, 1], 1));
    for (const line of s.mesh) wsGroup.add(fatLine(viewer, line, [0.2, 0.2, 0.2], 1));
  }
}

function draw() {
  const box = view.box;
  if (view.computed) { drawWorkspace(); computes++; }
  disposeGroup(robotGroup, [viewer]);
  const size = Math.hypot(...box.map(([a, b]) => b - a)); // ~ the width the graphic spans (PointSize of the wrist centre)
  addPrims(robotGroup, view.robotPrims, { viewer, clip: null, box, size, thickPx: THICK_PX });
  // SphericalRegion: refit when the bounds change, keeping the user's rotation (D-MW-04, D-MW-07)
  const key = box.map(([a, b]) => `${a.toFixed(6)},${b.toFixed(6)}`).join(';');
  if (key !== boxKey) { fitViewer(viewer, { box, zoom: MW_ZOOM, viewPoint: VIEWPOINT }); boxKey = key; }
  viewer.render();
}

function run() {
  const r = evaluate(state, cache);
  state = r.state;
  cache = r.cache;
  view = r.view;
  evaluations++;
  if (view.recomputed) recomputes++;
  draw();
}

// ---- controls (ControlPlacement -> Left) ------------------------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
const gridBox = el('div', { class: 'mw-joints', 'data-testid': 'joint-grid' });
controls.root.append(gridBox);
let jointCtl = [];

/**
 * Dynamic[Grid[Table[{Subscript["d" | "Theta", i], Slider[params[[i]] = 0.5; Dynamic[params[[i]]], {0, 1, 0.01},
 * ImageSize -> 160]}, {i, dof}]]]: plain sliders (no value, no ⊕), values 0 + k·0.01. Built for the current robot; the
 * model resets params to 0.5 when the robot changes (selectType, Q-MW-01).
 */
function buildJointGrid() {
  gridBox.replaceChildren();
  const gc = new Controls(gridBox);
  jointCtl = jointLabels(state.Type).map((lab, i) => {
    const c = gc.slider({
      name: `params-${i + 1}`, label: lab, min: 0, max: 1, step: 0.01, steps: 'mma', labeled: false, plus: false,
      value: state.params[i],
      onInput: (v) => { state.params = state.params.slice(); state.params[i] = v; run(); },
    });
    const lbl = c.row?.querySelector('.ctl-label') ?? gridBox.querySelectorAll('.ctl-label')[i];
    if (lbl) {
      lbl.innerHTML = `<span class="${lab[0] === 'θ' ? 'mw-theta' : ''}">${lab[0]}</span><sub>${i + 1}</sub>`;
    }
    return c;
  });
}

controls.delimiter();
const SUB = ['₁', '₂', '₃'];
const rangeCtl = ['r1', 'r2', 'r3'].map((name, i) => addIntervalSlider(controls, {
  name, label: `r${SUB[i]}`, ...RANGE, steps: 'mma', value: state[name], labeled: false, look: 'mma',
  onInput: (v) => { state[name] = v.slice(); run(); },
}));
controls.delimiter();
const typeCtl = addPopup(controls, {
  name: 'Type',
  options: TYPE_NAMES.map((n, i) => ({ value: i + 1, label: n })),
  value: state.Type,
  onChange: (v) => {
    const changed = v !== state.Type;
    state = selectType(state, v);
    if (changed) buildJointGrid();
    run();
  },
});

/** show `state` in every control (programmatic: no evaluation) */
function syncControls(rebuild) {
  typeCtl.set(state.Type);
  if (rebuild) buildJointGrid();
  else jointCtl.forEach((c, i) => c.set(state.params[i], false));
  rangeCtl.forEach((c, i) => c.set(state[`r${i + 1}`], { exact: [false, false] }));
}

document.getElementById('reset').addEventListener('click', () => {
  state = initialSettings();
  syncControls(true);
  viewer.resetView();
  boxKey = null;
  run();
});

buildJointGrid();
run();

// ---- test / automation hook (port addition A-MW-03) ------------------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
window.__demo = {
  name: 'manipulator-workspaces',
  getState: () => cloneState(state),
  /**
   * setState(partial state of model.js): Type (through selectType, as the popup: a new robot resets the joints first),
   * then params, r1, r2, r3 (and, for tests, TypeOld, r1old…); one evaluation.
   */
  setState: (partial) => {
    const p = clone(partial);
    const newType = p.Type !== undefined && p.Type !== state.Type;
    if (p.Type !== undefined) state = selectType(state, p.Type);
    for (const k of ['params', 'r1', 'r2', 'r3', 'r1old', 'r2old', 'r3old']) if (p[k]) state[k] = p[k].slice();
    if (p.TypeOld !== undefined) state.TypeOld = p.TypeOld;
    syncControls(newType);
    run();
    return cloneState(state);
  },
  view: () => clone({
    pm: view.pm, o3: view.o3, Td: view.Td, box: view.box, recomputed: view.recomputed,
    surfaces: view.ws.surfaces.map((s) => ({ vertices: s.grid.flat().length, quads: s.quads.length, boundary: s.boundary.length, mesh: s.mesh.map((l) => l.length) })),
    robotFrames: view.robotPrims.filter((p) => p.type === 'line' && p.thickness === 'Large' && p.color && p.color[0] === 1 && p.color[1] === 0).length / 5,
    options: view.graphic.options,
  }),
  primitives: () => clone(view.robotPrims),
  labels: () => [...gridBox.querySelectorAll('.ctl-label')].map((l) => l.textContent),
  recomputes: () => recomputes,
  computes: () => computes,
  evaluations: () => evaluations,
  inkFraction: () => {
    viewer.renderer.render(viewer.scene, viewer.camera);
    return inkFraction(viewer.renderer);
  },
  cameraPosition: () => viewer.camera.position.toArray(),
  camera: () => ({ position: viewer.camera.position.toArray(), target: viewer.controls.target.toArray(), fov: viewer.camera.fov }),
  /** RGB of the pixel where world point p is drawn (colour checks against the snapshots) */
  pixelAt: (p) => {
    viewer.renderer.render(viewer.scene, viewer.camera);
    const s = new THREE.Vector3(...p).project(viewer.camera);
    const gl = viewer.renderer.getContext();
    const x = Math.round(((s.x + 1) / 2) * gl.drawingBufferWidth), y = Math.round(((s.y + 1) / 2) * gl.drawingBufferHeight);
    const px = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return [px[0], px[1], px[2]];
  },
  ready: true,
};
