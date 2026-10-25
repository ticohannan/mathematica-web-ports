// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Kevin Hernandez; Sándor Kabai
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/euler-angles/main.js — the Manipulate: the three angle sliders, the bookmarks and the gyroscope (a three.js
// scene built once, the picture's renderer), on shared/manipulate.js (browser only).
// On the shared Manipulate layer since v0.1.21; lighting as the other 3D ports since then (owner decision 2026-10-23,
// DEC-36, D-EA-05).
import { Manipulate } from '../../shared/manipulate.js';
import { THREE, createViewer, surface, cylinderBetween, fatLine, label, inkFraction } from '../../shared/three-helpers.js';
import { addMathematicaLighting } from '../../shared/mma-lighting.js';
import { DEFAULTS, PARAMS, BOOKMARKS, GEOMETRY as G, DEG, orientations, bookmarkAt } from './model.js';

/**
 * The picture: Graphics3D[{outer ring, yellow axle, black frame, Rotate[{middle ring, blue axle, blue frame,
 * Rotate[{inner ring, red axle, red frame, Rotate[{rotor, olive frame}, a3°, {0,0,1}]}, a2°, {0,1,0}]}, a1°, {0,0,1}]}]
 * as a three.js scene built once; draw({a1, a2, a3}) sets the three rotations (the renderer of the Manipulate's picture).
 */
function Gyroscope(element) {
  const viewer = createViewer(element, {
    box: [[-G.plotRange, G.plotRange], [-G.plotRange, G.plotRange], [-G.plotRange, G.plotRange]],
    viewPoint: G.viewPoint, viewAngle: G.viewAngle, size: 400, maxSize: 520,
  });
  // Lighting -> Automatic as View3D draws it (D-EA-05, owner decision 2026-10-23, DEC-36): Mathematica's documented
  // default lights (shared/mma-lighting.js) on the displayed colour values (linear output, no sRGB encoding)
  viewer.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  addMathematicaLighting(viewer.camera);

  /** Torus of major radius R, tube radius 1, lying in the YZ plane (axis = X), as in the original ParametricPlot3D. */
  const ring = (R, color) => {
    const geo = new THREE.TorusGeometry(R, G.tubeRadius, 24, 128);
    geo.rotateY(Math.PI / 2); // three.js torus axis is Z; the original's is X
    return new THREE.Mesh(geo, surface(color));
  };
  const axle = ({ from, to, r, axis, color }) => {
    const g = new THREE.Group();
    const v = (d) => (axis === 'z' ? [0, 0, d] : [0, d, 0]);
    const mat = surface(color);
    g.add(cylinderBetween(v(from), v(to), r, mat), cylinderBetween(v(-from), v(-to), r, mat));
    return g;
  };
  /** Three thick axis lines of length la with italic labels at distance lt. padIndex: label with the 4-space "blank". */
  const frame = ({ color, labels }, padIndex) => {
    const g = new THREE.Group();
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((d, i) => {
      g.add(fatLine(viewer, [[0, 0, 0], d.map((c) => c * G.axisLength)], color, 2));
      g.add(label(labels[i], d.map((c) => c * G.labelDistance), color, { padLeft: i === padIndex ? 1.6 : 0 }));
    });
    return g;
  };

  const [fixed, gimbal, inner, rotor] = [new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group()];
  viewer.scene.add(fixed, gimbal);
  gimbal.add(inner);
  inner.add(rotor);
  fixed.add(ring(G.rings[0].R, G.rings[0].color), axle(G.axles.yellow), frame(G.frames.fixed, -1));
  gimbal.add(ring(G.rings[1].R, G.rings[1].color), axle(G.axles.blue), frame(G.frames.gimbal, 2));
  inner.add(ring(G.rings[2].R, G.rings[2].color), axle(G.axles.red), frame(G.frames.inner, 1));
  const m = surface(G.rotor.color);
  const disk = cylinderBetween([0, 0, -G.rotor.diskHalfHeight], [0, 0, G.rotor.diskHalfHeight], G.rotor.diskRadius, m, 64);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(2 * G.rotor.cubeHalf, 2 * G.rotor.cubeHalf, 2 * G.rotor.cubeHalf), m);
  rotor.add(disk, cube, frame(G.frames.rotor, 2));

  return {
    viewer, rotor,
    draw: ({ a1, a2, a3 }) => {
      gimbal.rotation.set(0, 0, a1 * DEG);
      inner.rotation.set(0, a2 * DEG, 0);
      rotor.rotation.set(0, 0, a3 * DEG);
      viewer.render();
    },
  };
}

const gyro = Gyroscope(document.getElementById('graphic')); // made before the controls, as before the migration
const { viewer } = gyro;

const ctx = Manipulate({
  name: 'euler-angles',
  initial: () => ({ ...DEFAULTS }),
  body: (s) => ({ view: s, graphics: s }),
  graphics: { id: 'graphic', renderer: gyro },
  // {{a1, 0, "precession angle"}, 0, 360, 1} …; the sliders keep the port's own steps and number fields (steps: undefined)
  controls: PARAMS.map((p) => [[p.name, DEFAULTS[p.name], p.label], p.min, p.max, p.step, { Appearance: 'Labeled', steps: undefined }]),
  // setState takes only the three angles (as numbers), as the sliders do
  merge: (s, partial) => ({ ...s, ...Object.fromEntries(Object.entries(partial).filter(([k]) => k in DEFAULTS).map(([k, v]) => [k, Number(v)])) }),
  hook: {
    orientations: (c) => () => orientations(c.state),
    /** world-space direction of the rotor spin axis as rendered by three.js (independent of model.js) */
    renderedSpinAxis: () => () => {
      gyro.rotor.updateWorldMatrix(true, false);
      const v = new THREE.Vector3(0, 0, 1).applyQuaternion(gyro.rotor.getWorldQuaternion(new THREE.Quaternion()));
      return [v.x, v.y, v.z];
    },
    renderNow: () => () => { viewer.renderer.render(viewer.scene, viewer.camera); viewer.labelRenderer.render(viewer.scene, viewer.camera); },
    inkFraction: () => () => inkFraction(viewer.renderer),
    frames: () => () => viewer.frames,
    webgl: () => !!viewer.renderer.getContext(),
  },
});

// ---- the Manipulate's bookmarks (pos0 … pos6) and "Animate bookmarks" (port additions in the panel's tool bar) ----
const bmSelect = document.getElementById('bookmarks');
bmSelect.append(new Option('—', ''));
for (const b of BOOKMARKS) bmSelect.append(new Option(b.name, b.name));
bmSelect.addEventListener('change', () => {
  const b = BOOKMARKS.find((x) => x.name === bmSelect.value);
  if (b) ctx.setState({ a1: b.a1, a2: b.a2, a3: b.a3 });
});
let bmPlaying = false, bmStart = 0;
const BM_SECONDS = 9;
const bmBtn = document.getElementById('animate-bookmarks');
function bmTick(t) {
  if (!bmPlaying) return;
  if (!bmStart) bmStart = t;
  ctx.setState(bookmarkAt(((t - bmStart) / 1000 / BM_SECONDS) % 1));
  requestAnimationFrame(bmTick);
}
bmBtn.addEventListener('click', () => {
  bmPlaying = !bmPlaying;
  bmStart = 0;
  bmBtn.textContent = bmPlaying ? '❚❚ Stop bookmark animation' : '▶ Animate bookmarks';
  if (bmPlaying) requestAnimationFrame(bmTick);
});
document.getElementById('reset').addEventListener('click', () => { bmSelect.value = ''; }); // and the layer's reset
document.getElementById('reset-view').addEventListener('click', () => viewer.resetView());
