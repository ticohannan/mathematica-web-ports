// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-3d/main.js — page: the Manipulate controls (ControlPlacement -> Top, four rows), the two three.js pictures
// ("robot workspace" and "robot phase space" with the C-obstacle volumes) drawn from the model's Graphics3D data, and the
// Dynamic view points of both pictures (browser only).
import { THREE, createViewer, fatLine, label, inkFraction } from '../../shared/three-helpers.js';
import { Controls } from '../../shared/ui.js';
import { addButton, addCheckbox, addVerticalSlider, addRow } from '../../shared/ui-extra.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { createRng, replayRng } from '../../shared/random.js';
import { addMathematicaLighting } from '../../shared/mma-lighting.js';
import { flatten } from '../common/g3d.js';
import { addPrims, disposeGroup, fitViewer } from '../common/g3d-three.js';
import {
  initialState, evaluate, stateFromSettings, cloneState, VIEWPOINT, WORKSPACE_RANGE, PHASE_RANGE, PAD_MIN, PAD_MAX,
  THETA_SLIDER, R_SLIDER, PROGRESS_SLIDER, Z_SLIDER, COLORS, TWO_PI,
} from './model.js';
import { volumeFor } from './cspace3d.js';

// ---- random source (A-P3-03): unseeded like the original; ?seed=N for reproducible runs -------------------------
const seedParam = new URLSearchParams(location.search).get('seed');
let rng = createRng({ seed: seedParam !== null && /^\d+$/.test(seedParam) ? Number(seedParam) : null });

const IMAGE = 300; // ImageSize -> {300, 300}
// The pictures' framing (no SphericalRegion: Mathematica fits the box to the image), measured on snapshot 1: the
// workspace box spans 0.86 and the phase cube 0.735 of the 300 px picture width at the default view point (D-P3-09).
const WS_ZOOM = 0.99;
const PH_ZOOM = 0.92;
const POINT_PX = { Large: 6.5, Medium: 4 }; // PointSize[Large], PointSize[Medium] measured on snapshot 1 (D-P3-04)

let state = initialState();
let view = null;
let evaluations = 0;
let controlActive = false; // Mathematica's ControlActive: a slider, pad or vertical slider is being dragged

// ---- the two viewers -----------------------------------------------------------------------------------------------
const rgb = (c) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace);
const longest = (box) => Math.max(...box.map(([a, b]) => b - a));
const center = (box) => box.map(([a, b]) => (a + b) / 2);
function makeViewer(el, box, testid, aria) {
  const v = createViewer(el, { box, viewPoint: VIEWPOINT, size: IMAGE, maxSize: IMAGE });
  v.renderer.domElement.setAttribute('data-testid', testid);
  v.renderer.domElement.setAttribute('aria-label', aria);
  // D-P3-03 (as D-RS-02): Mathematica lights and blends the displayed colour values directly
  v.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  v.renderer.localClippingEnabled = true;
  addMathematicaLighting(v.camera);
  return v;
}
const ws = makeViewer(document.getElementById('view-workspace'), WORKSPACE_RANGE, 'scene-canvas-workspace', 'Robot workspace (3D, drag to rotate)');
const ph = makeViewer(document.getElementById('view-phase'), PHASE_RANGE, 'scene-canvas-phase', 'Robot phase space θ1, θ2, θ3 (3D, drag to rotate)');
const VIEWERS = [ws, ph];
const ZOOM = new Map([[ws, WS_ZOOM], [ph, PH_ZOOM]]);
const BOX = new Map([[ws, WORKSPACE_RANGE], [ph, PHASE_RANGE]]);

/** the viewer's camera as a Mathematica ViewPoint (scaled so that the longest box side is 1) */
const viewPointOf = (v) => v.camera.position.clone().sub(v.controls.target).divideScalar(longest(BOX.get(v))).toArray();
/** put the viewer's camera at the ViewPoint vp (z up) and fit the box (ViewPoint -> Dynamic[viewPoint1/2], F-P3-26) */
function applyViewPoint(v, vp) {
  const box = BOX.get(v);
  const c = new THREE.Vector3(...center(box));
  v.controls.target.copy(c);
  v.camera.position.copy(c.clone().add(new THREE.Vector3(...vp).multiplyScalar(longest(box))));
  v.camera.up.set(0, 0, 1);
  fitViewer(v, { box, zoom: ZOOM.get(v), viewPoint: vp });
}
applyViewPoint(ws, state.viewPoint1);
applyViewPoint(ph, state.viewPoint2);
// a mouse rotation is written back into the Manipulate variable and survives every re-evaluation
ws.controls.addEventListener('change', () => { state.viewPoint1 = viewPointOf(ws); });
ph.controls.addEventListener('change', () => { state.viewPoint2 = viewPointOf(ph); });

/** clipping planes of a PlotRange box (parts outside the box are clipped, as Mathematica does) */
function clipPlanes(box, eps) {
  const out = [];
  box.forEach(([a, b], k) => {
    const n = [0, 0, 0];
    n[k] = 1; out.push(new THREE.Plane(new THREE.Vector3(...n), -a + eps));
    n[k] = -1; out.push(new THREE.Plane(new THREE.Vector3(...n), b + eps));
  });
  return out;
}
const WS_CLIP = clipPlanes(WORKSPACE_RANGE, 1e-4);
const PH_CLIP = clipPlanes(PHASE_RANGE, 1e-4);

/** Boxed -> True: the 12 edges of the box, thin gray */
function boxEdges(box) {
  const pts = [];
  const c = box;
  for (const y of c[1]) for (const z of c[2]) pts.push(c[0][0], y, z, c[0][1], y, z);
  for (const x of c[0]) for (const z of c[2]) pts.push(x, c[1][0], z, x, c[1][1], z);
  for (const x of c[0]) for (const y of c[1]) pts.push(x, y, c[2][0], x, y, c[2][1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: rgb([0.55, 0.55, 0.55]) }));
}
ws.scene.add(boxEdges(WORKSPACE_RANGE));
ph.scene.add(boxEdges(PHASE_RANGE));

// ---- workspace scene -----------------------------------------------------------------------------------------------
const wsGroup = new THREE.Group();
ws.scene.add(wsGroup);
const sphereGeo = new THREE.SphereGeometry(0.5, 64, 40);
function drawWorkspace() {
  disposeGroup(wsGroup, [ws]);
  const prims = flatten(view.workspace);
  addPrims(wsGroup, prims.filter((p) => p.type !== 'sphere'), { viewer: ws, clip: WS_CLIP, box: WORKSPACE_RANGE, size: 7, thinPx: 1 });
  // {Blue, Specularity[White, 10], Sphere[pObs3a, obsRad], Yellow, ...}: a Phong highlight (D-P3-03)
  for (const p of prims.filter((q) => q.type === 'sphere')) {
    const m = new THREE.MeshPhongMaterial({ color: rgb(p.color), specular: rgb(COLORS.White), shininess: 10, clippingPlanes: WS_CLIP });
    for (const c of p.centers) {
      const s = new THREE.Mesh(sphereGeo.clone(), m);
      s.position.set(...c);
      wsGroup.add(s);
    }
  }
  ws.render();
}

// ---- phase-space scene ---------------------------------------------------------------------------------------------
const phFrame = new THREE.Group(); // ticks and labels (Axes -> True, AxesLabel)
const phGroup = new THREE.Group(); // points, lines, the robot-progress cube
const phVol = new THREE.Group(); // the C-obstacle volumes (freeConfigSpacea, freeConfigSpaceb)
ph.scene.add(phFrame, phGroup, phVol);

const disc = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(32, 32, 31, 0, 2 * Math.PI); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
})();

/** Axes on the box edges Mathematica uses for the default view point (D-P3-08): θ1 front-bottom, θ2 top-left, θ3 front-left */
function drawPhaseFrame() {
  const gray = [0.2, 0.2, 0.2];
  const S = TWO_PI;
  const axes = [
    { sub: '1', at: (t) => [t, 0, 0], out: [0, -1, -1] },
    { sub: '2', at: (t) => [0, t, S], out: [-1, 0, 1] },
    { sub: '3', at: (t) => [0, 0, t], out: [-1, -1, 0] },
  ];
  for (const ax of axes) {
    const o = ax.out.map((v) => v / Math.hypot(...ax.out));
    const segs = [];
    for (let v = 0; v <= 6.0001; v += 0.5) {
      const p = ax.at(v);
      const len = Number.isInteger(v / 2) ? 0.035 * S : 0.018 * S;
      segs.push(...p, ...p.map((x, i) => x + o[i] * len));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    phFrame.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: rgb(gray) })));
    for (const v of [0, 2, 4, 6]) phFrame.add(label(String(v), ax.at(v).map((x, i) => x + o[i] * 0.07 * S), [0.13, 0.13, 0.13], { cls: 'p3-tick' }));
    phFrame.add(label(`<i>θ</i><sub>${ax.sub}</sub>`, ax.at(S / 2).map((x, i) => x + o[i] * 0.16 * S), [0.13, 0.13, 0.13], { html: true, cls: 'p3-axis' }));
  }
}
drawPhaseFrame();

const pointPx = (s) => (typeof s === 'number' ? s * IMAGE : POINT_PX[s] ?? 3);
function drawPhase() {
  disposeGroup(phGroup, [ph]);
  const prims = flatten(view.phase);
  let order = 0;
  const thin = new Map(); // default-thickness lines batched per colour, drawn in the order of their first piece
  for (const p of prims) {
    if (p.type === 'point') {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p.points.flat(), 3));
      const m = new THREE.PointsMaterial({ color: rgb(p.color ?? [0, 0, 0]), size: pointPx(p.pointSize), sizeAttenuation: false, map: disc, alphaTest: 0.5, clippingPlanes: PH_CLIP });
      const pts = new THREE.Points(g, m);
      pts.renderOrder = order++;
      phGroup.add(pts);
    } else if (p.type === 'line') {
      if (typeof p.thickness === 'number') {
        const l = fatLine(ph, p.points, p.color ?? [0, 0, 0], p.thickness * IMAGE);
        l.material.clippingPlanes = PH_CLIP;
        l.renderOrder = order++;
        phGroup.add(l);
      } else {
        const key = (p.color ?? [0, 0, 0]).join(',');
        if (!thin.has(key)) thin.set(key, { color: p.color ?? [0, 0, 0], pts: [], order: order++ });
        thin.get(key).pts.push(...p.points[0], ...p.points[1]);
      }
    } else if (p.type === 'cuboid') {
      const g = new THREE.Group();
      addPrims(g, [p], { viewer: ph, clip: PH_CLIP, box: PHASE_RANGE, size: TWO_PI });
      g.renderOrder = order++;
      phGroup.add(g);
    }
  }
  for (const { color, pts, order: o } of thin.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: rgb(color), clippingPlanes: PH_CLIP }));
    l.renderOrder = o;
    phGroup.add(l);
  }
  drawVolumes();
  const pl = document.querySelector('[data-testid=path-label]');
  pl.textContent = view.label.red ? view.label.text : `${view.label.text}${mmaNumberString(view.label.value)}`;
  pl.classList.toggle('p3-red', view.label.red);
  ph.render();
}

// freeConfigSpacea / b: translucent Blue / Yellow volumes (Directive[Lighting -> Automatic, colour, Opacity[0.5]], no edges),
// GrayLevel[0] boundary lines on the cube faces (F-P3-25); rebuilt only when a descriptor changes (Q-P3-12)
let volKey = null;
function drawVolumes() {
  const key = JSON.stringify(view.volumes);
  if (key === volKey) return;
  volKey = key;
  disposeGroup(phVol, [ph]);
  for (const [desc, color, name] of [[view.volumes.a, COLORS.Blue, 'blue'], [view.volumes.b, COLORS.Yellow, 'yellow']]) {
    const v = volumeFor(desc);
    if (!v) continue;
    const mat = () => {
      const m = new THREE.MeshLambertMaterial({ color: rgb(color), transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
      return m;
    };
    const pos = new Float32Array(v.vertices.length * 3);
    v.vertices.forEach((q, i) => pos.set(q, 3 * i));
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setIndex(v.surface.flat());
    sg.computeVertexNormals();
    const surface = new THREE.Mesh(sg, mat());
    surface.name = `c-obstacle-${name}`;
    surface.renderOrder = 1000;
    const cp = [], cn = [];
    for (const { tri, normal } of v.caps) for (const i of tri) { cp.push(...v.vertices[i]); cn.push(...normal); }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
    cg.setAttribute('normal', new THREE.Float32BufferAttribute(cn, 3));
    const caps = new THREE.Mesh(cg, mat());
    caps.renderOrder = 1000;
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(v.lines.flat(2), 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: rgb([0, 0, 0]) }));
    phVol.add(surface, caps, lines);
  }
}

function draw() {
  drawWorkspace();
  drawPhase();
}

// ---- evaluation (D-P3-06: at most once per animation frame while a control moves) -----------------------------------
let pending = 0;
function run() {
  if (pending) { cancelAnimationFrame(pending); pending = 0; }
  const r = evaluate(state, rng, { controlActive });
  state = r.state;
  view = r.view;
  evaluations++;
  // θ values shifted by 2π are written back into the sliders (Q-P3-01)
  for (let k = 1; k <= 3; k++) if (thetaCtl[k].get() !== state[`θ${k}`]) thetaCtl[k].set(state[`θ${k}`]);
  draw();
}
const schedule = () => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; run(); }); };

// ---- controls (ControlPlacement -> Top; the Rows of the original, F-P3-10) -----------------------------------------------
const controls = new Controls(document.getElementById('controls'));
const setLabelHtml = (api, html) => { const lab = api.row.querySelector('.ctl-label'); if (lab) lab.innerHTML = html; };
const markActive = (node) => node.addEventListener('pointerdown', () => { controlActive = true; });

// Row 1: Control@{{θk, .25, "θk"}, -.1, 6.3, 0.01, ImageSize -> Small}: slider with ⊕, no value field (F-P3-01)
const row1 = addRow(controls, { name: 'theta' });
const thetaCtl = {};
for (let k = 1; k <= 3; k++) {
  const api = controls.slider({
    name: `Theta${k}`, label: `θ${k}`, ...THETA_SLIDER, steps: 'mma', realValues: true, labeled: false, value: state[`θ${k}`],
    animSeconds: 12, onInput: (v) => { state[`θ${k}`] = v; schedule(); },
  });
  row1.append(api.row);
  api.row.classList.add('p3-theta');
  setLabelHtml(api, `<i>θ</i><sub>${k}</sub>`);
  markActive(api.row.querySelector('input[type=range]'));
  thetaCtl[k] = api;
}

// Row 2: the two sphere pads (2D sliders over 3{-1,-1} … {1,1}, Q-P3-13) and vertical sliders, the check box (F-P3-02 … 04)
const row2 = addRow(controls, { name: 'obstacles' });
const padA = controls.slider2D({ name: 'Obstaxy', label: 'blue_xy', min: PAD_MIN, max: PAD_MAX, value: state.Obstaxy, onInput: (v) => { state.Obstaxy = v; schedule(); } });
row2.append(padA.row); setLabelHtml(padA, 'blue<sub><i>xy</i></sub>'); markActive(padA.row.querySelector('svg'));
const zA = addVerticalSlider(controls, { name: 'Obstaz', label: 'blue_z', ...Z_SLIDER, value: state.Obstaz, parent: row2, onInput: (v) => { state.Obstaz = v; schedule(); } });
setLabelHtml(zA, 'blue<sub><i>z</i></sub>'); markActive(zA.row.querySelector('input'));
const padB = controls.slider2D({ name: 'Obstbxy', label: 'yellow_xy', min: PAD_MIN, max: PAD_MAX, value: state.Obstbxy, onInput: (v) => { state.Obstbxy = v; schedule(); } });
row2.append(padB.row); setLabelHtml(padB, 'yellow<sub><i>xy</i></sub>'); markActive(padB.row.querySelector('svg'));
const zB = addVerticalSlider(controls, { name: 'Obstbz', label: 'yellow_z', ...Z_SLIDER, value: state.Obstbz, parent: row2, onInput: (v) => { state.Obstbz = v; schedule(); } });
setLabelHtml(zB, 'yellow<sub><i>z</i></sub>'); markActive(zB.row.querySelector('input'));
for (const api of [zA, zB]) api.row.querySelector('.ctl-vvalue').hidden = true; // a VerticalSlider shows no value (D-P3-07)
const obsCtl = addCheckbox(controls, { name: 'showConfigObs', label: 'show configuration space obstacles', value: state.showConfigObs, parent: row2, onChange: (v) => { state.showConfigObs = v; run(); } });
obsCtl.row.classList.add('p3-check');
obsCtl.row.style.flexDirection = 'row-reverse';

// Row 3: Button["add 100 vertices", addPoints = True], Button["restart", ...], Button["new goal", ...], radius (F-P3-05 … 08)
const row3 = addRow(controls, { name: 'roadmap' });
addButton(controls, { name: 'addPoints', label: 'add 100 vertices', parent: row3, onClick: () => { state.addPoints = true; run(); } });
addButton(controls, { name: 'restart', label: 'restart', parent: row3, onClick: () => { state.restart = true; run(); } });
addButton(controls, { name: 'newgoal', label: 'new goal', parent: row3, onClick: () => { state.newgoal = true; run(); } });
const rCtl = controls.slider({ name: 'r', label: 'radius', ...R_SLIDER, steps: 'mma', realValues: true, value: state.r, animSeconds: 20, onInput: (v) => { state.r = v; schedule(); } });
row3.append(rCtl.row); rCtl.row.classList.add('p3-radius');
markActive(rCtl.row.querySelector('input[type=range]'));

// Row 4: {{progress, 0, "progress"}, 0, 1, 0.01, ControlType -> Slider, ImageSize -> 500}: no ⊕, no value (F-P3-09)
const progCtl = controls.slider({ name: 'progress', label: 'progress', ...PROGRESS_SLIDER, steps: 'mma', realValues: true, plus: false, labeled: false, value: state.progress, onInput: (v) => { state.progress = v; schedule(); } });
progCtl.row.classList.add('p3-progress');
markActive(progCtl.row.querySelector('input[type=range]'));

// ControlActive becomes False when the mouse is released: Mathematica evaluates the body once more
const release = () => { if (controlActive) { controlActive = false; run(); } };
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);

/** show `state` in every control (programmatic: no evaluation) */
function syncControls() {
  for (let k = 1; k <= 3; k++) { thetaCtl[k].stop(); thetaCtl[k].set(state[`θ${k}`], { moved: false }); }
  padA.set(state.Obstaxy); padB.set(state.Obstbxy); zA.set(state.Obstaz); zB.set(state.Obstbz);
  for (const api of [zA, zB]) api.row.querySelector('.ctl-vvalue').hidden = true;
  obsCtl.set(state.showConfigObs);
  rCtl.stop(); rCtl.set(state.r, { moved: false });
  progCtl.set(state.progress, { moved: false });
}

// "Initial settings" (A-P3-01): the stored specifications, including both view points
document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  syncControls();
  applyViewPoint(ws, state.viewPoint1);
  applyViewPoint(ph, state.viewPoint2);
  run();
});

run();

// ---- test / automation hook (port addition A-P3-02) ------------------------------------------------------------------
const copy = (x) => JSON.parse(JSON.stringify(x));
const viewerOf = (which) => (which === 'phase' ? ph : ws);
const inkOf = (v) => inkFraction(v.renderer);
function loadState(partial) {
  state = { ...state, ...copy(partial) };
  syncControls();
  if (partial.viewPoint1) applyViewPoint(ws, state.viewPoint1);
  if (partial.viewPoint2) applyViewPoint(ph, state.viewPoint2);
  run();
  return cloneState(state);
}
window.__demo = {
  name: 'prm-3d',
  getState: () => cloneState(state),
  /** the evaluation's results (qs, qf, path, qsn, qfn, totdist, robotq, label, counts, volumes, the two graphics as data) */
  view: () => copy(view),
  setRng: (spec) => { rng = spec && (spec.reals || spec.integers) ? replayRng(spec) : createRng({ seed: spec?.seed ?? null }); },
  loadState,
  /** a state stored in the original (snapshot Settings, plain doubles) */
  loadSettings: (settings) => loadState(stateFromSettings(settings)),
  /** colours of the start, goal and moving robots (their base cylinders) as drawn */
  robotColors: () => {
    const cyl = flatten(view.workspace).filter((p) => p.type === 'cylinder' && p.radius === 1 / 8);
    return { start: cyl[0].color, goal: cyl[1].color, moving: cyl[2].color, startOpacity: cyl[0].opacity, movingOpacity: cyl[2].opacity };
  },
  /** non-white fraction of a canvas ('workspace' | 'phase'); without an argument the smaller of the two (no forced render) */
  inkFraction: (which) => (which ? inkOf(viewerOf(which)) : Math.min(inkOf(ws), inkOf(ph))),
  camera: (which = 'workspace') => {
    const v = viewerOf(which);
    return { position: v.camera.position.toArray(), target: v.controls.target.toArray(), fov: v.camera.fov, viewPoint: viewPointOf(v) };
  },
  volumeCount: () => phVol.children.filter((o) => o.isMesh).length,
  evaluations: () => evaluations,
  webgl: VIEWERS.every((v) => !!v.renderer.getContext()),
  ready: true,
};
