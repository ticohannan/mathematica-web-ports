// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/manipulability-ellipsoid/main.js — page: the three dials θ1, θ2, θ3 at the left (ControlPlacement -> Left), the
// μ label and the three.js picture (fixed PlotRange with clipping, ViewAngle 18°, ImageSize {440, 420}) drawn from the
// model's Graphics3D data, the test hook (browser only).
import { THREE, createViewer, inkFraction } from '../../shared/three-helpers.js';
import { Controls } from '../../shared/ui.js';
import { NAMED } from '../../shared/mma-colors.js';
import { addMathematicaLighting } from '../../shared/mma-lighting.js';
import { makeDialControl, nearest32Index } from '../common/dial-control.js';
import { addPrims, disposeGroup } from '../common/g3d-three.js';
import {
  initialState, cloneState, evaluate, settle, ellipsoidSummary, pointXY, wrapK, pointOfAngle, PLOT_RANGE, IMAGE_SIZE, VIEW_ANGLE, VIEWPOINT,
  POINT_SIZE,
} from './model.js';

const THICK_PX = 3; // Thickness[Large] (Thick), as robot-singularities D-RS-03 (D-ME-03)
// Arrowheads[s]: s × the PlotRange box diagonal (D-ME-03); PointSize[s]: s × the width the image shows at the centre
const BOX_DIAGONAL = Math.hypot(...PLOT_RANGE.map(([a, b]) => b - a));
const longest = Math.max(...PLOT_RANGE.map(([a, b]) => b - a));
const IMAGE_WIDTH_WORLD = 2 * Math.hypot(...VIEWPOINT) * longest * Math.tan(VIEW_ANGLE / 2) * (IMAGE_SIZE[0] / IMAGE_SIZE[1]);

let state = initialState();
let view = evaluate(state);
state = view.state;
let evaluations = 1;

// ---- the μ label (D-ME-09) ----------------------------------------------------------------------------------------
const muEl = document.querySelector('[data-testid=mu-label]');
function drawMu() {
  const [mant, exp] = view.text.split('×10^');
  muEl.textContent = '';
  muEl.append(mant.replace('-', '−'));
  if (exp !== undefined) {
    muEl.append('×10');
    const sup = document.createElement('sup');
    sup.textContent = exp.replace('-', '−');
    muEl.append(sup);
  }
  muEl.dataset.text = view.text;
}

// ---- the 3D picture ---------------------------------------------------------------------------------------------------
function webgl2Available() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
const viewEl = document.getElementById('view');
const viewer = webgl2Available()
  ? createViewer(viewEl, { box: PLOT_RANGE, viewPoint: VIEWPOINT, viewAngle: VIEW_ANGLE, imageSize: IMAGE_SIZE })
  : null;
const group = new THREE.Group();
// PlotRange clipping (F-ME-11): everything outside {{-3.5,3.5},{-4,4},{-1,5}} is cut away
const CLIP = [
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), PLOT_RANGE[0][1]), new THREE.Plane(new THREE.Vector3(1, 0, 0), -PLOT_RANGE[0][0]),
  new THREE.Plane(new THREE.Vector3(0, -1, 0), PLOT_RANGE[1][1]), new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLOT_RANGE[1][0]),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), PLOT_RANGE[2][1]), new THREE.Plane(new THREE.Vector3(0, 0, 1), -PLOT_RANGE[2][0]),
];
if (viewer) {
  viewer.renderer.domElement.setAttribute('data-testid', 'scene-canvas-workspace');
  viewer.renderer.domElement.setAttribute('aria-label', 'Elbow arm with its manipulability ellipsoid (3D, drag to rotate)');
  // D-ME-02 (as D-RS-02): Mathematica lights and blends the displayed colour values directly; its documented lights
  viewer.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  viewer.renderer.localClippingEnabled = true;
  addMathematicaLighting(viewer.camera);
  viewer.scene.add(group);
}

function draw() {
  drawMu();
  if (!viewer) return;
  disposeGroup(group, [viewer]);
  const pointsOnly = [], rest = [];
  for (const p of view.prims) {
    if (p.type === 'point') pointsOnly.push(p.pointSize == null ? { ...p, pointSize: POINT_SIZE.Default } : p);
    else rest.push(p);
  }
  addPrims(group, rest, { viewer, clip: CLIP, box: PLOT_RANGE, size: BOX_DIAGONAL, thickPx: THICK_PX });
  addPrims(group, pointsOnly, { viewer, clip: CLIP, box: PLOT_RANGE, size: IMAGE_WIDTH_WORLD, thickPx: THICK_PX });
  viewer.render(); // the camera is fixed by the PlotRange: a user rotation is kept (D-ME-08)
}

// ---- the three dials --------------------------------------------------------------------------------------------------
// Control@{{p1, {1,0}, "θ1"}, (makeDialControl[#1, {0,0}, Red] &)}, p2 Blue, p3 Green; the stored makeDialControl has no
// ImageSize (automatic size, F-ME-01) and the Nearest-π/32 setter (F-ME-02)
const controls = new Controls(document.getElementById('controls'));
const DIAL_OPTIONS = { imageSize: 'automatic', setter: 'nearest32', arc: 'myArrowArc2', keyStep: 'grid', labels: 'stacked' };
const DIAL_COLORS = [NAMED.Red, NAMED.Blue, NAMED.Green];
const SUB = ['₁', '₂', '₃'];
const dials = [0, 1, 2].map((i) => makeDialControl(controls, {
  ...DIAL_OPTIONS, name: `p${i + 1}`, label: `θ${SUB[i]}`, color: DIAL_COLORS[i], value: pointXY(state.m[i]),
  onInput: (pt) => { state.m[i] = wrapK(nearest32Index(pt)); run(); },
}));

function syncDials() { for (let i = 0; i < 3; i++) dials[i].set(pointXY(state.m[i])); }

/**
 * A change, then evaluations of the body until it no longer changes a variable (D-ME-10): the body assigns θi itself
 * (Theta1 = ArcTan[…]), which makes the front end evaluate it again; that second evaluation brings θiprev up to date
 * (Q-ME-06). With a single evaluation the next dial move would be undone by the stale θiprev.
 */
function run() {
  view = settle(state);
  state = view.state;
  evaluations += view.evaluations;
  syncDials();
  draw();
}

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  run();
});

draw();

// ---- test / automation hook (port addition A-ME-03) ---------------------------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
window.__demo = {
  name: 'manipulability-ellipsoid',
  webgl: !!viewer,
  getState: () => cloneState(state),
  /**
   * setState({k, kprev, m}) — assigns the given variables, then one evaluation (as the harness's "set"). Only k given:
   * a consistent state (kprev = k, p = {Cos θ, Sin θ}); only m given: as a dial move.
   */
  setState: (partial) => {
    const next = cloneState(state);
    if (partial.k) next.k = clone(partial.k);
    if (partial.kprev) next.kprev = clone(partial.kprev);
    if (partial.m) next.m = clone(partial.m);
    if (partial.k && !partial.kprev) next.kprev = clone(partial.k);
    if (partial.k && !partial.m) next.m = next.k.map(pointOfAngle);
    state = next;
    run();
    return cloneState(state);
  },
  mu: () => ({ value: view.mu, text: view.text, shown: muEl.textContent }),
  svd: () => clone({ U: view.U, S: view.S, V: view.V, rank: view.rank, J: view.J }),
  points: () => clone(view.points),
  ellipsoid: () => ellipsoidSummary(view),
  primitives: () => clone(view.prims),
  clipping: () => CLIP.map((p) => ({ normal: p.normal.toArray(), constant: p.constant })),
  /** materials of the picture with the six PlotRange planes (the point markers have none: they never leave the box) */
  clipCoverage: () => {
    let total = 0, clipped = 0;
    group.traverse((o) => {
      if (!o.material || o.material.isMeshBasicMaterial) return;
      total++;
      if ((o.material.clippingPlanes ?? []).length === 6) clipped++;
    });
    return { total, clipped };
  },
  dialAngle: (i) => dials[i - 1].graphics().ang,
  /** a point of dial i's own picture (dial coordinates) in page pixels */
  dialToClient: (i, p) => dials[i - 1].plot.worldToClient(p),
  inkFraction: () => {
    if (!viewer) return 0;
    viewer.renderer.render(viewer.scene, viewer.camera);
    return inkFraction(viewer.renderer);
  },
  /** client (page) coordinates of a world point in the 3D picture */
  worldToClient: (p) => {
    const s = new THREE.Vector3(...p).project(viewer.camera);
    const r = viewer.renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((s.x + 1) / 2) * r.width, y: r.top + ((1 - s.y) / 2) * r.height };
  },
  cameraPosition: () => (viewer ? viewer.camera.position.toArray() : null),
  camera: () => (viewer ? { position: viewer.camera.position.toArray(), target: viewer.controls.target.toArray(), fov: viewer.camera.fov, aspect: viewer.camera.aspect } : null),
  evaluations: () => evaluations,
  ready: true,
};
