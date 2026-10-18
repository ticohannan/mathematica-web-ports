// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/torus-chart/main.js — page: the λ slider and the two dials (ControlPlacement -> Left), the three.js picture of
// Show[manifold, config] (translucent two-coloured surface, red boundary, z mesh, green ball, box with ticks, plot
// label), the test hook (browser only).
import { THREE, createViewer, fatLine, label, inkFraction } from '../../shared/three-helpers.js';
import { Controls, mmaSliderText } from '../../shared/ui.js';
import { NAMED } from '../../shared/mma-colors.js';
import { makeDialControl } from '../common/dial-control.js';
import {
  initialState, initialSettings, cloneState, evaluate, PLOT_RANGE, FACE_FRONT, FACE_BACK, OPACITY, BALL_RADIUS,
} from './model.js';
import { sampleManifold, GRID_N } from './surface.js';

const VIEWPOINT = [1.3, -2.4, 2]; // Mathematica's default ViewPoint
const IMAGE_SIZE = 350; // ImageSize -> {350, 350}
const ZOOM = 0.93; // framing of SphericalRegion -> True, fitted to snapshot 1 (D-TC-07)
const BOUNDARY_PX = 2.5; // Thick (D-TC-04)
const MESH_COLOR = [0.2, 0.2, 0.2];
const BOX_COLOR = [0.55, 0.55, 0.55];
/**
 * PORT DEVIATION (D-TC-02): the lights of PlotTheme -> "Business", fitted to the snapshot colours: a white light
 * model on the displayed (sRGB) values, fixed to the camera (x right, y up, z toward the viewer):
 * colour = base · (ambient + Σ diffuse_i max(0, n·l_i)) + specular · Σ max(0, n·h_i)^shininess, then Opacity[0.8].
 */
export const LIGHTS = {
  ambient: 0.1,
  dirs: [[1, 0.1, 0.35], [0, 0.8, 0.6], [0, 0, 1]],
  diffuse: [0.7, 0.55, 0.4],
  specular: 0.25,
  shininess: 14,
};

let state = initialState();
let result = evaluate(state);
let lambdaReal = true; // the saved λ is the machine real 2. (shown "2."); Initial settings restore the exact 0
let evaluations = 1;

// ---- controls (in the original's order) ------------------------------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
// Row[{Control@{{λ, 0, "Torus -> Plane"}, 0, 2, Appearance -> "Labeled", ImageSize -> Small}}]: continuous, ⊕ panel
const lambdaCtl = controls.slider({
  name: 'lambda', label: 'Torus → Plane', min: 0, max: 2, step: 0, value: state.λ,
  format: (v, { moved }) => mmaSliderText(v, { moved: moved || lambdaReal, realValues: true }),
  onInput: (v) => { lambdaReal = true; update({ λ: v }); },
});
lambdaCtl.set(state.λ, { moved: true });
// {{p1, {1, 0}, "θ"}, (makeDialControl[#1, {0, 0}, Red] &), ImageSize -> {160, 160}}; p2 the same, "ϕ", Blue
const dialOpts = { imageSize: 160, setter: 'normalize', arc: 'arrowArcCircle', labels: 'stacked' };
const p1Ctl = makeDialControl(controls, { ...dialOpts, name: 'p1', label: 'θ', color: NAMED.Red, value: state.p1, onInput: (pt) => update({ p1: pt }) });
const p2Ctl = makeDialControl(controls, { ...dialOpts, name: 'p2', label: 'ϕ', color: NAMED.Blue, value: state.p2, onInput: (pt) => update({ p2: pt }) });
const plotLabelEl = document.querySelector('[data-testid=plot-label]');

// ---- the 3D picture ----------------------------------------------------------------------------------------------------
function webgl2Available() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
const viewEl = document.getElementById('view');
const viewer = webgl2Available() ? createViewer(viewEl, { box: PLOT_RANGE, viewPoint: VIEWPOINT, size: IMAGE_SIZE, maxSize: IMAGE_SIZE }) : null;

const VERT = `
varying vec3 vN;
void main() {
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = `
uniform vec3 front;
uniform vec3 back;
uniform float alpha;
uniform float ambient;
uniform vec3 dirs[3];
uniform float diffuse[3];
uniform float specular;
uniform float shininess;
varying vec3 vN;
void main() {
  vec3 n = normalize(vN);
  vec3 base = front;
  if (!gl_FrontFacing) { n = -n; base = back; }
  float d = ambient;
  float s = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 l = normalize(dirs[i]);
    d += diffuse[i] * max(dot(n, l), 0.0);
    s += specular * pow(max(dot(n, normalize(l + vec3(0.0, 0.0, 1.0))), 0.0), shininess);
  }
  gl_FragColor = vec4(min(base * d + vec3(s), vec3(1.0)), alpha);
}`;
function litMaterial(front, back, opacity) {
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
    uniforms: {
      front: { value: new THREE.Vector3(...front) }, back: { value: new THREE.Vector3(...back) }, alpha: { value: opacity },
      ambient: { value: LIGHTS.ambient }, dirs: { value: LIGHTS.dirs.map((d) => new THREE.Vector3(...d)) },
      diffuse: { value: LIGHTS.diffuse }, specular: { value: LIGHTS.specular }, shininess: { value: LIGHTS.shininess },
    },
  });
  if (opacity < 1) {
    m.transparent = true;
    m.depthWrite = false;
    // lines lying on the surface (mesh, boundary) stay in front of it
    m.polygonOffset = true;
    m.polygonOffsetFactor = 1;
    m.polygonOffsetUnits = 1;
  }
  return m;
}

const groups = {};
let surfaceMesh = null, ball = null, sampled = null, sampledLambda = null;
if (viewer) {
  // Mathematica blends the displayed colour values: output the shader's values unconverted (as D-RS-02)
  viewer.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  viewer.renderer.domElement.setAttribute('aria-label', 'Chart for a torus (3D, drag to rotate)');
  for (const k of ['frame', 'manifold', 'config']) { groups[k] = new THREE.Group(); viewer.scene.add(groups[k]); }
  fitCamera();
  drawFrame();
  ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 40, 28), litMaterial(NAMED.Green, NAMED.Green, 1));
  groups.config.add(ball);
  viewer.controls.addEventListener('change', sortSurface);
}

/** SphericalRegion -> True: the bounding sphere of the box fills the picture (zoom fitted, D-TC-07). */
function fitCamera() {
  const box = PLOT_RANGE;
  const radius = 0.5 * Math.hypot(...box.map(([a, b]) => b - a));
  const dist = viewer.camera.position.distanceTo(viewer.controls.target);
  const half = Math.atan(Math.tan(Math.asin(Math.min(0.99, radius / dist))) / ZOOM);
  viewer.camera.fov = (2 * half * 180) / Math.PI;
  viewer.camera.updateProjectionMatrix();
}

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) { viewer.lineMaterials.delete(o.material); o.material.dispose(); }
  });
  g.clear();
}

/** Box edges, tick marks and tick labels (Boxed, Axes -> True) on the edges Mathematica uses for the default view (D-TC-08). */
function drawFrame() {
  const g = groups.frame;
  const [[x0, x1], [y0, y1], [z0, z1]] = PLOT_RANGE;
  // the three edges at the corner nearest the default view point (x1, y0, z1) are not drawn, as in the snapshots
  const front = (a, b) => [a, b].some((p) => p[0] === x1 && p[1] === y0 && p[2] === z1);
  const edge = (a, b) => { if (!front(a, b)) g.add(fatLine(viewer, [a, b], BOX_COLOR, 1)); };
  for (const y of [y0, y1]) for (const z of [z0, z1]) edge([x0, y, z], [x1, y, z]);
  for (const x of [x0, x1]) for (const z of [z0, z1]) edge([x, y0, z], [x, y1, z]);
  for (const x of [x0, x1]) for (const y of [y0, y1]) edge([x, y, z0], [x, y, z1]);
  const axes = [
    { at: (t) => [t, y0, z0], out: [0, -1, -1], ticks: [0, 2, 4, 6] }, // x: front-bottom edge
    { at: (t) => [x1, t, z0], out: [1, 0, -1], ticks: [0, 2, 4, 6] }, // y: right-bottom edge
    { at: (t) => [x0, y0, t], out: [-1, -1, 0], ticks: [-3, -2, -1, 0, 1, 2, 3] }, // z: left vertical edge
  ];
  for (const ax of axes) {
    const o = ax.out.map((v) => v / Math.hypot(...ax.out));
    for (const v of ax.ticks) {
      const p = ax.at(v);
      g.add(fatLine(viewer, [p, p.map((c, i) => c + o[i] * 0.15)], BOX_COLOR, 1));
      g.add(label(String(v).replace('-', '−'), p.map((c, i) => c + o[i] * 0.55), [0, 0, 0], { cls: 'tc-tick' }));
    }
  }
}

/** Mathematica draws translucent polygons back to front: the surface's triangles sorted by distance from the camera. */
function sortSurface() {
  if (!surfaceMesh) return;
  const pos = surfaceMesh.geometry.getAttribute('position').array;
  const idx = surfaceMesh.geometry.getIndex();
  const tri = sampled.triangles, nT = tri.length / 3;
  const c = viewer.camera.position;
  const keys = new Float64Array(nT), order = new Uint32Array(nT);
  for (let t = 0; t < nT; t++) {
    let sx = 0, sy = 0, sz = 0;
    for (let k = 0; k < 3; k++) { const v = tri[3 * t + k] * 3; sx += pos[v]; sy += pos[v + 1]; sz += pos[v + 2]; }
    const dx = sx / 3 - c.x, dy = sy / 3 - c.y, dz = sz / 3 - c.z;
    keys[t] = dx * dx + dy * dy + dz * dz;
    order[t] = t;
  }
  order.sort((a, b) => keys[b] - keys[a]);
  const out = idx.array;
  for (let k = 0; k < nT; k++) { const t = order[k]; out[3 * k] = tri[3 * t]; out[3 * k + 1] = tri[3 * t + 1]; out[3 * k + 2] = tri[3 * t + 2]; }
  idx.needsUpdate = true;
}

function drawManifold() {
  disposeGroup(groups.manifold);
  sampled = sampleManifold(state.λ, GRID_N);
  sampledLambda = state.λ;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sampled.positions), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(sampled.normals), 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(sampled.triangles), 1));
  surfaceMesh = new THREE.Mesh(geo, litMaterial(FACE_FRONT, FACE_BACK, OPACITY));
  surfaceMesh.renderOrder = 1;
  groups.manifold.add(surfaceMesh);
  sortSurface();
  // the theme's mesh: thin dark z contours
  const segs = [];
  for (const line of sampled.mesh) for (let k = 0; k + 1 < line.points.length; k++) segs.push(...line.points[k], ...line.points[k + 1]);
  if (segs.length) {
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    groups.manifold.add(new THREE.LineSegments(mg, new THREE.LineBasicMaterial({ color: new THREE.Color(...MESH_COLOR) })));
  }
  // BoundaryStyle -> Directive[Thick, Red]: the four parameter edges
  for (const k of ['u0', 'u2pi', 'v0', 'v2pi']) groups.manifold.add(fatLine(viewer, sampled.boundary[k], NAMED.Red, BOUNDARY_PX));
}

function draw() {
  plotLabelEl.textContent = result.label;
  if (!viewer) return;
  if (sampledLambda !== state.λ) drawManifold();
  ball.position.set(...result.config.center);
  viewer.render();
}

/** One front-end update: the changed variables, one evaluation of the body; every control follows the state. */
function update(partial) {
  const next = { ...cloneState(state), ...partial };
  const r = evaluate(next);
  evaluations++;
  state = next;
  result = r;
  syncControls();
  draw();
}
function syncControls() {
  p1Ctl.set(state.p1);
  p2Ctl.set(state.p2);
}

document.getElementById('reset').addEventListener('click', () => {
  lambdaCtl.stop();
  state = initialSettings();
  lambdaReal = false; // the stored λ = 0 is exact: shown "0"
  lambdaCtl.set(state.λ, { moved: false });
  result = evaluate(state);
  syncControls();
  if (viewer) viewer.resetView();
  draw();
});

draw();

// ---- test / automation hook (port addition A-TC-03) --------------------------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
function pixelAt(p) {
  viewer.renderer.render(viewer.scene, viewer.camera);
  const s = new THREE.Vector3(...p).project(viewer.camera);
  const gl = viewer.renderer.getContext();
  const x = Math.round(((s.x + 1) / 2) * gl.drawingBufferWidth), y = Math.round(((s.y + 1) / 2) * gl.drawingBufferHeight);
  const px = new Uint8Array(4);
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return [px[0], px[1], px[2]];
}
window.__demo = {
  name: 'torus-chart',
  webgl: !!viewer,
  getState: () => cloneState(state),
  /** assign variables (e.g. a snapshot's Settings), then evaluate once, as the front end shows a snapshot */
  setState: (partial) => {
    const p = clone(partial);
    if ('λ' in p) { lambdaReal = true; lambdaCtl.set(p.λ, { moved: true }); }
    update(p);
    return cloneState(state);
  },
  view: () => ({
    θ: result.θ, φ: result.φ, ball: result.config.center.slice(), radius: result.config.radius, label: result.label,
    surface: sampled ? { n: sampled.n, vertices: sampled.positions.length / 3, triangles: sampled.triangles.length / 3, meshLines: sampled.mesh.length, zRange: sampled.zRange.slice() } : null,
  }),
  dialAngle: (name) => (name === 'p1' ? p1Ctl : p2Ctl).graphics().ang,
  evaluations: () => evaluations,
  inkFraction: () => {
    if (!viewer) return 0;
    viewer.renderer.render(viewer.scene, viewer.camera);
    return inkFraction(viewer.renderer);
  },
  /** RGB of the canvas pixel where world point p is drawn */
  pixelAt: (p) => (viewer ? pixelAt(p) : null),
  /** client (page) coordinates of a world point in the 3D picture */
  worldToClient: (p) => {
    const s = new THREE.Vector3(...p).project(viewer.camera);
    const r = viewer.renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((s.x + 1) / 2) * r.width, y: r.top + ((1 - s.y) / 2) * r.height };
  },
  /** a point of a dial's own picture in page pixels */
  controlToClient: (name, p) => (name === 'p1' ? p1Ctl : p2Ctl).plot.worldToClient(p),
  camera: () => (viewer ? viewer.camera.position.toArray() : null),
  ready: true,
};
