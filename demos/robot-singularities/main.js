// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/robot-singularities/main.js — page: controls (popup, joint slider grid, check boxes, setter), the two
// three.js graphics (workspace and phase space) drawn from the model's Graphics3D data (browser only).
import { THREE, createViewer, surface, cylinderBetween, fatLine, label, inkFraction } from '../../shared/three-helpers.js';
import { Controls, el } from '../../shared/ui.js';
import { addPopup, addCheckbox } from '../../shared/ui-extra.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { addMathematicaLighting } from '../../shared/mma-lighting.js';
import { TYPE_NAMES, typeOf, sliderSpec, jacobianFor } from './robots.js';
import { initialState, evaluate, selectType } from './model.js';
import { flatten, sampleCurve, sampleSurface, sampleCircle, infinitePlanePolygon, apply4 } from './g3d.js';
import { svd3, matrixRank } from './svd3.js';

const VIEWPOINT = [1.3, -2.4, 2]; // Mathematica's default ViewPoint
const VP_LEN = Math.hypot(...VIEWPOINT);
const THICK_PX = 3; // Thickness[Large] (Thick), measured ≈ 2.9 pt in snapshot 2; D-RS-03
const THIN_PX = 1;
const WS_ZOOM = 1.26; // D-RS-01

let state = initialState();
let view = null;

// ---- the two viewers ----------------------------------------------------------------------------------------
const wsEl = document.getElementById('view-workspace');
const phEl = document.getElementById('view-phase');
const ws = createViewer(wsEl, { box: [[-2.2, 2.2], [-2.2, 2.2], [-0.4, 4.15]], viewPoint: VIEWPOINT, size: 325, maxSize: 325 });
ws.renderer.domElement.setAttribute('data-testid', 'scene-canvas-workspace');
ws.renderer.domElement.setAttribute('aria-label', 'Workspace (3D, drag to rotate)');
const UNIT = [[-0.5, 0.5], [-0.5, 0.5], [-0.5, 0.5]]; // BoxRatios -> {1,1,1}: the phase box is drawn as a unit cube
const ph = createViewer(phEl, { box: UNIT, viewPoint: VIEWPOINT, size: 280, maxSize: 280 });
ph.renderer.domElement.setAttribute('data-testid', 'scene-canvas-phase');
ph.renderer.domElement.setAttribute('aria-label', 'Phase space (3D, drag to rotate)');
ph.renderer.localClippingEnabled = true;
// PlotRange clipping of the phase-space contents (everything inside the scaled group is clipped to the box)
const E = 0.5 + 1e-4;
const PHASE_CLIP = [
  new THREE.Plane(new THREE.Vector3(1, 0, 0), E), new THREE.Plane(new THREE.Vector3(-1, 0, 0), E),
  new THREE.Plane(new THREE.Vector3(0, 1, 0), E), new THREE.Plane(new THREE.Vector3(0, -1, 0), E),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), E), new THREE.Plane(new THREE.Vector3(0, 0, -1), E),
];

/**
 * PORT DEVIATION (D-RS-02): Mathematica lights and blends the displayed (sRGB) colour values directly, so the
 * renderers output linear values unconverted, and the lights are Mathematica's documented defaults
 * (shared/mma-lighting.js) instead of shared/three-helpers' placement.
 */
for (const v of [ws, ph]) {
  v.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  addMathematicaLighting(v.camera);
}

/**
 * Keep the user's viewing direction; centre and scale on the new box (SphericalRegion-like fit). `zoom` > 1 draws
 * larger than "the bounding sphere fills the image": the original's workspace pictures are about 1.26 times
 * larger than that (measured on all three workspace snapshots, D-RS-01).
 */
function fitViewer(viewer, box, zoom = 1) {
  const c = new THREE.Vector3(...box.map(([a, b]) => (a + b) / 2));
  const longest = Math.max(...box.map(([a, b]) => b - a));
  const radius = 0.5 * Math.hypot(...box.map(([a, b]) => b - a));
  const dir = viewer.camera.position.clone().sub(viewer.controls.target);
  if (dir.lengthSq() === 0) dir.set(...VIEWPOINT);
  dir.normalize();
  const dist = VP_LEN * longest;
  viewer.controls.target.copy(c);
  viewer.camera.position.copy(c.clone().add(dir.multiplyScalar(dist)));
  const half = Math.atan(Math.tan(Math.asin(Math.min(0.99, radius / dist)) * 1.04) / zoom);
  viewer.camera.fov = (2 * half * 180) / Math.PI;
  viewer.camera.near = dist / 100;
  viewer.camera.far = dist * 10;
  viewer.camera.updateProjectionMatrix();
  viewer.controls.update();
  viewer.render();
}

// ---- primitives -> three.js ------------------------------------------------------------------------------------
const DEFAULT_SURFACE = [1, 1, 1];
const DEFAULT_LINE = [0, 0, 0];
const EDGE_COLOR = [0, 0, 0];
function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      ws.lineMaterials.delete(o.material);
      ph.lineMaterials.delete(o.material);
      o.material.dispose();
    }
  });
  g.clear();
}
const m4 = (M) => new THREE.Matrix4().set(...M[0], ...M[1], ...M[2], ...M[3]);

function polygonMesh(points, material) {
  const geo = new THREE.BufferGeometry();
  const pos = [];
  for (let i = 1; i + 1 < points.length; i++) pos.push(...points[0], ...points[i], ...points[i + 1]);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

function surfaceMesh(grid, material) {
  const nu = grid.length, nv = grid[0].length;
  const pos = new Float32Array(nu * nv * 3);
  let k = 0;
  for (const row of grid) for (const q of row) { pos[k++] = q[0]; pos[k++] = q[1]; pos[k++] = q[2]; }
  const idx = [];
  for (let i = 0; i + 1 < nu; i++) for (let j = 0; j + 1 < nv; j++) {
    const a = i * nv + j, b = a + 1, c = a + nv, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

/**
 * Add the styled primitives to `group`. ctx: {viewer, clip (planes or null), box (for InfinitePlane), size (a length
 * for PointSize / Arrowheads, ~ the width the graphic spans)}.
 */
function addPrims(group, prims, ctx) {
  // translucent solids show front and back faces blended, as in Mathematica
  const mat = (p, side = THREE.FrontSide) => {
    const m = surface(p.color ?? DEFAULT_SURFACE, { opacity: p.opacity, side: p.opacity < 1 ? THREE.DoubleSide : side });
    if (ctx.clip) m.clippingPlanes = ctx.clip;
    return m;
  };
  const line = (pts, p) => {
    const l = fatLine(ctx.viewer, pts, p.color ?? DEFAULT_LINE, p.thickness === 'Large' ? THICK_PX : THIN_PX, p.opacity);
    if (ctx.clip) l.material.clippingPlanes = ctx.clip;
    return l;
  };
  // Mathematica's default EdgeForm: thin dark edges on cuboids, polygons, planes and cylinder rims (none on
  // spheres and ParametricPlot3D surfaces, which have EdgeForm[]); drawn 1 px wide (D-RS-03)
  const edges = (segs, p) => {
    const pos = new Float32Array(segs.length * 6);
    segs.forEach(([a, b], k) => pos.set([...a, ...b], 6 * k));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineBasicMaterial({ color: new THREE.Color(...EDGE_COLOR), transparent: p.opacity < 1, opacity: p.opacity });
    if (p.opacity < 1) m.depthWrite = false;
    if (ctx.clip) m.clippingPlanes = ctx.clip;
    group.add(new THREE.LineSegments(geo, m));
  };
  const loop = (pts) => pts.map((q, k) => [q, pts[(k + 1) % pts.length]]);
  for (const p of prims) {
    switch (p.type) {
      case 'sphere': {
        const geo = new THREE.SphereGeometry(p.radius, 40, 28);
        const m = mat(p);
        for (const c of p.centers) { const s = new THREE.Mesh(geo, m); s.position.set(...c); group.add(s); }
        break;
      }
      case 'cylinder': {
        group.add(cylinderBetween(p.p1, p.p2, p.radius, mat(p), 40));
        const ax = new THREE.Vector3(...p.p2).sub(new THREE.Vector3(...p.p1)).normalize();
        const u = new THREE.Vector3(1, 0, 0).cross(ax);
        if (u.lengthSq() < 1e-12) u.set(0, 1, 0).cross(ax);
        u.normalize();
        const w = ax.clone().cross(u);
        const rim = (c) => Array.from({ length: 48 }, (_, k) => {
          const t = (2 * Math.PI * k) / 48;
          return c.map((x, i) => x + p.radius * (Math.cos(t) * u.getComponent(i) + Math.sin(t) * w.getComponent(i)));
        });
        edges([...loop(rim(p.p1)), ...loop(rim(p.p2))], p);
        break;
      }
      case 'cuboid': {
        const size = [0, 1, 2].map((k) => p.max[k] - p.min[k]);
        const ctr = [0, 1, 2].map((k) => (p.max[k] + p.min[k]) / 2);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(p));
        const T = new THREE.Matrix4().makeTranslation(...ctr);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(p.matrix ? m4(p.matrix).multiply(T) : T);
        group.add(mesh);
        const corner = (k) => { const q = [0, 1, 2].map((i) => ((k >> i) & 1 ? p.max[i] : p.min[i])); return p.matrix ? apply4(p.matrix, q) : q; };
        const segs = [];
        for (let a = 0; a < 8; a++) for (const bit of [1, 2, 4]) if (!(a & bit)) segs.push([corner(a), corner(a | bit)]);
        edges(segs, p);
        break;
      }
      case 'polygon': group.add(polygonMesh(p.points, mat(p, THREE.DoubleSide))); edges(loop(p.points), p); break;
      case 'infinitePlane': {
        const poly = infinitePlanePolygon(p.points, ctx.box);
        if (poly.length >= 3) { group.add(polygonMesh(poly, mat(p, THREE.DoubleSide))); edges(loop(poly), p); }
        break;
      }
      case 'line': group.add(line(p.points, p)); break;
      case 'arrow': {
        const [a, b] = p.points;
        const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        const len = dir.length();
        if (len === 0) break;
        const head = Math.min(len, (p.arrowheads ?? 0.04) * ctx.size);
        dir.normalize();
        const tip = new THREE.Vector3(...b);
        const base = tip.clone().addScaledVector(dir, -head);
        group.add(line([a, base.toArray()], p));
        const cone = new THREE.Mesh(new THREE.ConeGeometry(head * 0.35, head, 20), mat({ ...p }));
        cone.position.copy(tip.clone().addScaledVector(dir, -head / 2));
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        group.add(cone);
        break;
      }
      case 'point': {
        const r = ((p.pointSize ?? 0.01) * ctx.size) / 2;
        const geo = new THREE.SphereGeometry(r, 16, 12);
        for (const q of p.points) { const s = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(...(p.color ?? DEFAULT_LINE)) })); s.position.set(...q); group.add(s); }
        break;
      }
      case 'ellipsoid': {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat(p));
        const S = new THREE.Matrix4().makeScale(...[0, 1, 2].map((k) => Math.sqrt(p.Sigma[k][k]) || 1e-6));
        const T = new THREE.Matrix4().makeTranslation(...p.center);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy((p.matrix ? m4(p.matrix) : new THREE.Matrix4()).multiply(T).multiply(S));
        group.add(mesh);
        break;
      }
      case 'circle': group.add(line(sampleCircle(p), p)); break;
      case 'parametricCurve': group.add(line(sampleCurve(p), p)); break;
      case 'parametricSurface': {
        const grid = sampleSurface(p);
        group.add(surfaceMesh(grid, mat(p, THREE.DoubleSide)));
        if (p.mesh !== 'None') {
          // Mesh -> Automatic: ~15 mesh lines in each direction (D-RS-04)
          const nu = grid.length, nv = grid[0].length, ms = { color: [0.15, 0.15, 0.15], opacity: 0.6, thickness: 'Normal' };
          for (let k = 1; k <= 15; k++) {
            const i = Math.round((k * (nu - 1)) / 16), j = Math.round((k * (nv - 1)) / 16);
            group.add(line(grid[i], ms));
            group.add(line(grid.map((row) => row[j]), ms));
          }
        }
        break;
      }
      default: break;
    }
  }
}

// ---- workspace scene ---------------------------------------------------------------------------------------------
const wsSingular = new THREE.Group();
const wsDynamic = new THREE.Group();
ws.scene.add(wsSingular, wsDynamic);
let wsSingKey = null, wsBoxKey = null;

function drawWorkspace() {
  const box = view.workspaceBox;
  const size = 2 * 0.5 * Math.hypot(...box.map(([a, b]) => b - a)); // ~ the width the graphic spans
  const key = `${state.iTypeOld}|${state.isJLinearVelOld}`;
  const singPrims = flatten(view.singSpace);
  if (key !== wsSingKey) {
    disposeGroup(wsSingular);
    addPrims(wsSingular, singPrims, { viewer: ws, clip: null, box, size });
    wsSingKey = key;
  }
  disposeGroup(wsDynamic);
  // everything but the cached singular set: ground, robot (view.base), manipulability ellipsoid
  const manipPrims = view.manip ? flatten(view.manip.graphics) : [];
  addPrims(wsDynamic, [...flatten(view.base), ...manipPrims], { viewer: ws, clip: null, box, size });
  const bk = box.map(([a, b]) => `${a.toFixed(4)},${b.toFixed(4)}`).join(';');
  if (bk !== wsBoxKey) { fitViewer(ws, box, WS_ZOOM); wsBoxKey = bk; }
  ws.render();
}

// ---- phase-space scene --------------------------------------------------------------------------------------------
const phData = new THREE.Group(); // data coordinates, scaled to the unit cube
const phSingular = new THREE.Group();
const phDynamic = new THREE.Group();
const phFrame = new THREE.Group(); // box, ticks, labels (unit-cube coordinates, not clipped)
phData.add(phSingular, phDynamic);
ph.scene.add(phData, phFrame);
let phSingKey = null;
const PH_ZOOM = 1.04; // phase box width / ground width as measured on snapshot 1 (D-RS-01)

function niceTicks([a, b]) {
  if (b - a > 2) return { major: [-2, 0, 2], minor: Array.from({ length: 13 }, (_, k) => -3 + 0.5 * k), fmt: (v) => String(v) };
  return { major: [0, 0.5, 1], minor: Array.from({ length: 11 }, (_, k) => k / 10), fmt: (v) => v.toFixed(1) };
}

/** Box edges, tick marks and labels (Axes -> True, AxesLabel), in unit-cube coordinates. */
function drawPhaseFrame(opt) {
  disposeGroup(phFrame);
  const gray = [0.55, 0.55, 0.55];
  const c = [-0.5, 0.5];
  for (const y of c) for (const z of c) phFrame.add(fatLine(ph, [[-0.5, y, z], [0.5, y, z]], gray, 1));
  for (const x of c) for (const z of c) phFrame.add(fatLine(ph, [[x, -0.5, z], [x, 0.5, z]], gray, 1));
  for (const x of c) for (const y of c) phFrame.add(fatLine(ph, [[x, y, -0.5], [x, y, 0.5]], gray, 1));
  // axes on the edges Mathematica uses for the default view point: θ1 front-bottom, θ2 top-left, θ3 front-left
  const axes = [
    { k: 0, at: (t) => [t, -0.5, -0.5], out: [0, -1, -1] },
    { k: 1, at: (t) => [-0.5, t, 0.5], out: [-1, 0, 1] },
    { k: 2, at: (t) => [-0.5, -0.5, t], out: [-1, -1, 0] },
  ];
  for (const ax of axes) {
    const [a, b] = opt.PlotRange[ax.k];
    const s = (v) => (v - a) / (b - a) - 0.5;
    const o = ax.out.map((v) => v / Math.hypot(...ax.out));
    const { major, minor, fmt } = niceTicks([a, b]);
    for (const v of minor) {
      if (v < a || v > b) continue;
      const p = ax.at(s(v));
      const len = major.includes(v) ? 0.035 : 0.018;
      phFrame.add(fatLine(ph, [p, p.map((x, i) => x + o[i] * len)], gray, 1));
    }
    for (const v of major) {
      const p = ax.at(s(v));
      phFrame.add(label(fmt(v), p.map((x, i) => x + o[i] * 0.06), [0.33, 0.33, 0.33], { cls: 'rs-tick' }));
    }
    const L = opt.AxesLabel[ax.k];
    const mid = ax.at(0);
    phFrame.add(label(`${L.sym}<sub>${L.sub}</sub>`, mid.map((x, i) => x + o[i] * 0.14), [0.33, 0.33, 0.33], { html: true, cls: 'rs-axis' }));
  }
}

function drawPhase() {
  const opt = view.phaseOpt;
  const R = opt.PlotRange;
  phData.scale.set(...R.map(([a, b]) => 1 / (b - a)));
  phData.position.set(...R.map(([a, b]) => -(a + b) / 2 / (b - a)));
  const key = `${state.iTypeOld}|${state.isJLinearVelOld}|${opt.PlotLabel}`;
  if (key !== phSingKey) {
    disposeGroup(phSingular);
    addPrims(phSingular, flatten(view.singPhase), { viewer: ph, clip: PHASE_CLIP, box: R, size: 1 });
    drawPhaseFrame(opt);
    phSingKey = key;
  }
  disposeGroup(phDynamic);
  const all = flatten(view.phase);
  const nSing = flatten(view.singPhase).length;
  addPrims(phDynamic, all.slice(nSing), { viewer: ph, clip: PHASE_CLIP, box: R, size: 1 });
  document.querySelector('[data-testid=plotlabel-phase]').textContent = opt.PlotLabel;
  ph.render();
}

// ---- controls (ControlPlacement -> Top) ------------------------------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
const typeCtl = addPopup(controls, {
  name: 'iType',
  options: TYPE_NAMES.map((n, i) => ({ value: i + 1, label: n })),
  value: state.iType,
  onChange: (v) => { state = selectType(state, v); buildSliders(); run(); },
});
const row = el('div', { class: 'rs-row' });
const sliderBox = el('div', { class: 'rs-sliders', 'data-testid': 'slider-grid' });
const optionsBox = el('div', { class: 'rs-options' });
row.append(sliderBox, optionsBox);
controls.root.append(row);
const optControls = new Controls(optionsBox);
const robotCtl = addCheckbox(optControls, { name: 'showRobot', label: 'show robot', value: state.showRobot, onChange: (v) => { state.showRobot = v; run(); } });
const manipCtl = addCheckbox(optControls, { name: 'showManipulability', label: 'show manipulability ellipsoid', value: state.showManipulability, onChange: (v) => { state.showManipulability = v; run(); } });
const linCtl = optControls.setterBar({
  name: 'isJLinearVel', label: 'velocity singularities', value: state.isJLinearVel,
  options: [{ value: 'Linear' }, { value: 'Angular' }],
  onChange: (v) => { state.isJLinearVel = v; run(); },
});

let sliders = [];
/**
 * The Dynamic Grid of joint sliders: θ_i for a revolute joint (-1.01π … 1.01π, step 0.01π), d_i for a prismatic
 * joint (0 … 1, step 0.01), each with its value shown (Appearance -> "Labeled"). Rebuilt when the robot changes.
 */
function buildSliders() {
  sliderBox.replaceChildren();
  const Type = typeOf(state.iType);
  sliders = [0, 1, 2].map((i) => {
    const spec = sliderSpec(Type, i);
    const sym = el('span', { class: 'rs-sym', 'data-testid': `label-params-${i + 1}` });
    sym.innerHTML = `${spec.label}<sub>${i + 1}</sub>`;
    // The range input works on the step index k = 0..n (the browser's own decimal stepping of min + k step
    // cannot reach 1.01π: min + 202 step rounds one ulp above max), the value is min + k step (max at k = n).
    const n = Math.round((spec.max - spec.min) / spec.step);
    const range = el('input', {
      type: 'range', min: 0, max: n, step: 1, value: 0,
      'data-testid': `slider-params-${i + 1}`, 'aria-label': `${spec.label}${i + 1}`,
    });
    const field = el('input', {
      type: 'text', class: 'ctl-field', inputmode: 'decimal', value: '',
      'data-testid': `value-params-${i + 1}`, 'aria-label': `${spec.label}${i + 1} value`,
    });
    range.addEventListener('input', () => {
      // Slider[Dynamic[params[[i]]], {min, max, step}]: value = min + k step, max at the right end (D-RS-06)
      const k = Number(range.value);
      setParam(i, k >= n ? spec.max : spec.min + k * spec.step);
    });
    field.addEventListener('change', () => {
      const v = Number(field.value);
      if (Number.isFinite(v)) setParam(i, Math.min(Math.max(v, spec.min), spec.max));
      else showParams();
    });
    sliderBox.append(sym, range, field);
    return { range, field, spec };
  });
  showParams();
}

function showParams() {
  sliders.forEach(({ range, field, spec }, i) => {
    range.value = String(Math.round((state.params[i] - spec.min) / spec.step));
    if (document.activeElement !== field) field.value = mmaNumberString(state.params[i]);
  });
}

function setParam(i, v) {
  state.params = state.params.slice();
  state.params[i] = v;
  run();
}

function syncControls() {
  typeCtl.set(state.iType);
  robotCtl.set(state.showRobot);
  manipCtl.set(state.showManipulability);
  linCtl.set(state.isJLinearVel);
}

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  syncControls();
  buildSliders();
  run();
});

let evaluations = 0;
function run() {
  const r = evaluate(state);
  state = r.state;
  view = r.view;
  evaluations++;
  drawWorkspace();
  drawPhase();
  showParams();
}

fitViewer(ph, UNIT, PH_ZOOM);
buildSliders();
run();

// ---- test / automation hook (port addition A-RS-03) ------------------------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
function summary(g) {
  const counts = {};
  for (const p of flatten(g)) counts[p.type] = (counts[p.type] || 0) + 1;
  return counts;
}
window.__demo = {
  name: 'robot-singularities',
  getState: () => clone(state),
  /** setState({iType, params, showRobot, showManipulability, isJLinearVel}): like the controls (a new iType resets params first) */
  setState: (partial) => {
    if (partial.iType !== undefined) state = selectType(state, partial.iType);
    const { iType, ...rest } = clone(partial);
    state = { ...state, ...rest };
    syncControls();
    if (iType !== undefined) buildSliders();
    run();
    return clone(state);
  },
  inkFraction: (which = 'workspace') => {
    const v = which === 'phase' ? ph : ws;
    v.renderer.render(v.scene, v.camera);
    return inkFraction(v.renderer);
  },
  jacobian: () => jacobianFor(state.iType, state.isJLinearVel, state.params),
  svd: () => {
    const J = jacobianFor(state.iType, state.isJLinearVel, state.params);
    const d = svd3(J);
    return { J, ...d, Sigma: d.S.map((s) => s / 2), rank: matrixRank(d.S.map((s) => s / 2)) };
  },
  ellipsoid: () => (view.manip ? { Sigma: view.manip.Sigma, U: view.manip.U, rank: view.manip.rank, center: view.o3, prims: summary(view.manip.graphics) } : null),
  singularSummary: () => ({
    iTypeOld: state.iTypeOld, isJLinearVelOld: state.isJLinearVelOld, phaseLabel: view.phaseOpt.PlotLabel,
    workspace: summary(view.singSpace), phase: summary(view.singPhase), recomputed: view.recomputed,
  }),
  view: () => ({ o3: view.o3, workspaceBox: view.workspaceBox, phaseOpt: clone(view.phaseOpt), workspace: summary(view.workspace), phase: summary(view.phase) }),
  evaluations: () => evaluations,
  cameraPosition: (which = 'workspace') => (which === 'phase' ? ph : ws).camera.position.toArray(),
  /** RGB of the workspace pixel where world point p is drawn (for colour checks against the snapshots) */
  workspacePixelAt: (p) => {
    ws.renderer.render(ws.scene, ws.camera);
    const s = new THREE.Vector3(...p).project(ws.camera);
    const gl = ws.renderer.getContext();
    const x = Math.round(((s.x + 1) / 2) * gl.drawingBufferWidth), y = Math.round(((s.y + 1) / 2) * gl.drawingBufferHeight);
    const px = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return [px[0], px[1], px[2]];
  },
  ready: true,
};
