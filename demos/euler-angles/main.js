// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Kevin Hernandez; Sándor Kabai
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/euler-angles/main.js — page wiring + three.js scene (browser only).
import { THREE, createViewer, surface, cylinderBetween, fatLine, label, inkFraction } from '../../shared/three-helpers.js';
import { Controls } from '../../shared/ui.js';
import { DEFAULTS, PARAMS, BOOKMARKS, GEOMETRY as G, DEG, orientations, bookmarkAt } from './model.js';

const state = { ...DEFAULTS };
const viewer = createViewer(document.getElementById('graphic'), {
  box: [[-G.plotRange, G.plotRange], [-G.plotRange, G.plotRange], [-G.plotRange, G.plotRange]],
  viewPoint: G.viewPoint,
  viewAngle: G.viewAngle,
  size: 400,
  maxSize: 520,
});

// ---- geometry -------------------------------------------------------------
/** Torus of major radius R, tube radius 1, lying in the YZ plane (axis = X), as in the original ParametricPlot3D. */
function ring(R, color) {
  const geo = new THREE.TorusGeometry(R, G.tubeRadius, 24, 128);
  geo.rotateY(Math.PI / 2); // three.js torus axis is Z; the original's is X
  return new THREE.Mesh(geo, surface(color));
}

function axle({ from, to, r, axis, color }) {
  const g = new THREE.Group();
  const v = (d) => (axis === 'z' ? [0, 0, d] : [0, d, 0]);
  const m = surface(color);
  g.add(cylinderBetween(v(from), v(to), r, m), cylinderBetween(v(-from), v(-to), r, m));
  return g;
}

/** Three thick axis lines of length la with italic labels at distance lt. padIndex: label that gets the 4-space "blank" prefix. */
function frame({ color, labels }, padIndex) {
  const g = new THREE.Group();
  const L = G.axisLength, T = G.labelDistance;
  const dirs = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  dirs.forEach((d, i) => {
    g.add(fatLine(viewer, [[0, 0, 0], d.map((c) => c * L)], color, 2));
    g.add(label(labels[i], d.map((c) => c * T), color, { padLeft: i === padIndex ? 1.6 : 0 }));
  });
  return g;
}

const fixed = new THREE.Group();
const gimbal = new THREE.Group();
const inner = new THREE.Group();
const rotor = new THREE.Group();
viewer.scene.add(fixed, gimbal);
gimbal.add(inner);
inner.add(rotor);

fixed.add(ring(G.rings[0].R, G.rings[0].color), axle(G.axles.yellow), frame(G.frames.fixed, -1));
gimbal.add(ring(G.rings[1].R, G.rings[1].color), axle(G.axles.blue), frame(G.frames.gimbal, 2));
inner.add(ring(G.rings[2].R, G.rings[2].color), axle(G.axles.red), frame(G.frames.inner, 1));
{
  const m = surface(G.rotor.color);
  const disk = cylinderBetween([0, 0, -G.rotor.diskHalfHeight], [0, 0, G.rotor.diskHalfHeight], G.rotor.diskRadius, m, 64);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(2 * G.rotor.cubeHalf, 2 * G.rotor.cubeHalf, 2 * G.rotor.cubeHalf), m);
  rotor.add(disk, cube, frame(G.frames.rotor, 2));
}

function apply() {
  gimbal.rotation.set(0, 0, state.a1 * DEG);
  inner.rotation.set(0, state.a2 * DEG, 0);
  rotor.rotation.set(0, 0, state.a3 * DEG);
  viewer.render();
}

// ---- controls -------------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
const sliders = {};
for (const p of PARAMS) {
  sliders[p.name] = controls.slider({
    ...p, value: state[p.name], labeled: true,
    onInput: (v) => { state[p.name] = v; apply(); },
  });
}

function setState(partial) {
  for (const [k, v] of Object.entries(partial)) {
    if (k in sliders) { sliders[k].set(v); state[k] = sliders[k].get(); }
  }
  apply();
}

const bmSelect = document.getElementById('bookmarks');
bmSelect.append(new Option('—', ''));
for (const b of BOOKMARKS) bmSelect.append(new Option(b.name, b.name));
bmSelect.addEventListener('change', () => {
  const b = BOOKMARKS.find((x) => x.name === bmSelect.value);
  if (b) setState({ a1: b.a1, a2: b.a2, a3: b.a3 });
});

let bmPlaying = false, bmStart = 0;
const BM_SECONDS = 9;
const bmBtn = document.getElementById('animate-bookmarks');
function bmTick(t) {
  if (!bmPlaying) return;
  if (!bmStart) bmStart = t;
  const u = ((t - bmStart) / 1000 / BM_SECONDS) % 1;
  setState(bookmarkAt(u));
  requestAnimationFrame(bmTick);
}
bmBtn.addEventListener('click', () => {
  bmPlaying = !bmPlaying;
  bmStart = 0;
  bmBtn.textContent = bmPlaying ? '❚❚ Stop bookmark animation' : '▶ Animate bookmarks';
  if (bmPlaying) requestAnimationFrame(bmTick);
});
document.getElementById('reset').addEventListener('click', () => { bmSelect.value = ''; setState(DEFAULTS); });
document.getElementById('reset-view').addEventListener('click', () => viewer.resetView());

apply();

// ---- test / automation hook ---------------------------------------------
window.__demo = {
  name: 'euler-angles',
  getState: () => ({ ...state }),
  setState,
  orientations: () => orientations(state),
  /** world-space direction of the rotor spin axis as rendered by three.js (independent of model.js) */
  renderedSpinAxis: () => {
    rotor.updateWorldMatrix(true, false);
    const v = new THREE.Vector3(0, 0, 1).applyQuaternion(rotor.getWorldQuaternion(new THREE.Quaternion()));
    return [v.x, v.y, v.z];
  },
  renderNow: () => { viewer.renderer.render(viewer.scene, viewer.camera); viewer.labelRenderer.render(viewer.scene, viewer.camera); },
  inkFraction: () => inkFraction(viewer.renderer),
  frames: () => viewer.frames,
  webgl: !!viewer.renderer.getContext(),
  ready: true,
};
