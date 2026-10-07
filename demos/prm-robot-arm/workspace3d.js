// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-robot-arm/workspace3d.js — the "robot workspace" Inset: Graphics3D[{start & goal robots (translucent),
// base, current robot, blue and orange spheres}, ViewPoint -> {2 Cos[viewAng], 2 Sin[viewAng], 1},
// PlotRange -> {1.5{-1,1}, 1.5{-1,1}, {-0.1, 2.4}}, Lighting -> Automatic, ImageSize -> 280] in three.js.
// Browser only. When WebGL 2 is not available, the inset shows a notice and the rest of the page keeps working
// (owner's choice for this page: no data-needs-webgl2 page requirement).
import { createViewer, THREE, cylinderBetween, inkFraction } from '../../shared/three-helpers.js';
import { NAMED } from '../../shared/mma-colors.js';
import { addMathematicaLighting } from '../../shared/mma-lighting.js';
import { draw2Drobot, WIDTHA, OBS_RAD, BASE_RADIUS } from './model.js';

const BOX = [[-1.5, 1.5], [-1.5, 1.5], [-0.1, 2.4]];
// Colours are used as given (no sRGB -> linear conversion) and the output is not re-encoded, so lighting is
// computed on the sRGB values as in Mathematica's renderer (D-PA-05). The lights are Mathematica's documented
// default lights (shared/mma-lighting.js), not shared/three-helpers' placement (which has two colours swapped).
const rgb = (c) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace);

function webgl2Available() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (gl && gl.getExtension('WEBGL_lose_context')) gl.getExtension('WEBGL_lose_context').loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

const viewPointOf = (viewAng) => [2 * Math.cos(viewAng), 2 * Math.sin(viewAng), 1];

export function createWorkspace(container) {
  if (!webgl2Available()) {
    const box = document.createElement('div');
    box.className = 'requirements-notice';
    box.setAttribute('data-testid', 'requirements-notice');
    box.setAttribute('role', 'alert');
    box.innerHTML = '<strong>The 3D robot workspace needs WebGL 2.</strong> This browser does not offer WebGL 2 (it may be '
      + 'switched off or blocked for your graphics card). The phase-space plot on the right works without it.';
    container.append(box);
    return { ok: false, update: () => {}, inkFraction: () => 0, cameraPosition: () => null, robotColor: () => null };
  }

  const viewer = createViewer(container, { box: BOX, viewPoint: viewPointOf(-Math.PI / 2), size: 280, maxSize: 4000 });
  const { scene, camera, controls } = viewer;
  viewer.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  addMathematicaLighting(camera);
  const center = new THREE.Vector3(0, 0, (BOX[2][0] + BOX[2][1]) / 2);
  const longest = 3;

  // Boxed -> True: the 12 edges of the PlotRange box
  const corners = [];
  for (const x of BOX[0]) for (const y of BOX[1]) for (const z of BOX[2]) corners.push([x, y, z]);
  const edgePts = [];
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
    const d = corners[i].reduce((s, v, k) => s + (v !== corners[j][k] ? 1 : 0), 0);
    if (d === 1) edgePts.push(...corners[i], ...corners[j]);
  }
  const boxGeo = new THREE.BufferGeometry();
  boxGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePts, 3));
  scene.add(new THREE.LineSegments(boxGeo, new THREE.LineBasicMaterial({ color: rgb([0.55, 0.55, 0.55]) })));

  // materials
  const phong = (c, { opacity = 1, specular = null, shininess = 30 } = {}) => {
    const m = new THREE.MeshPhongMaterial({ color: rgb(c), specular: specular ? rgb(specular) : rgb([0, 0, 0]), shininess });
    if (opacity < 1) { m.transparent = true; m.opacity = opacity; m.depthWrite = false; }
    return m;
  };
  const MAT = {
    ghost: phong(NAMED.Brown, { opacity: 0.2 }), // Brown, Opacity[0.2]
    brown: phong(NAMED.Brown), red: phong(NAMED.Red),
    blue: phong(NAMED.Blue, { specular: NAMED.White, shininess: 10 }), // Blue, Specularity[White, 10]
    orange: phong(NAMED.Orange, { specular: NAMED.White, shininess: 10 }),
  };
  const EDGE = { ghost: new THREE.LineBasicMaterial({ color: rgb(NAMED.Gray), transparent: true, opacity: 0.5 }), solid: new THREE.LineBasicMaterial({ color: rgb([0.15, 0.15, 0.15]) }) };

  const sphereGeo = new THREE.SphereGeometry(OBS_RAD, 64, 40);
  const sphereA = new THREE.Mesh(sphereGeo, MAT.blue);
  const sphereB = new THREE.Mesh(sphereGeo, MAT.orange);
  scene.add(sphereA, sphereB);

  const dynamic = new THREE.Group();
  scene.add(dynamic);
  const cuboidGeo = new THREE.BoxGeometry(2 * WIDTHA, 2 * WIDTHA, 1 + 2 * WIDTHA);
  const cuboidEdges = new THREE.EdgesGeometry(cuboidGeo);

  /** draw2Drobot[widtha, q] in material `mat` (link 1 cylinder, link 2 cuboid with its edges). */
  function robot(q, mat, edgeMat) {
    const r = draw2Drobot(WIDTHA, q);
    const g = new THREE.Group();
    // link 1: the outer rotation (q1 about the z axis through {0,0,1}) of a cylinder along x
    const c1 = Math.cos(q[0]), s1 = Math.sin(q[0]);
    const to = [r.cylinder.to[0] * c1, r.cylinder.to[0] * s1, 1];
    g.add(cylinderBetween(r.cylinder.from, to, r.cylinder.radius, mat, 24));
    // link 2: Mouter . Minner . (cuboid centred at {1, 0, 1.5})
    const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
    const mInner = T(1, 0, 1).multiply(new THREE.Matrix4().makeRotationX(q[1])).multiply(T(-1, 0, -1));
    const mOuter = T(0, 0, 1).multiply(new THREE.Matrix4().makeRotationZ(q[0])).multiply(T(0, 0, -1));
    const ctr = r.cuboid.min.map((v, k) => (v + r.cuboid.max[k]) / 2);
    const m = mOuter.multiply(mInner).multiply(T(...ctr));
    for (const obj of [new THREE.Mesh(cuboidGeo, mat), new THREE.LineSegments(cuboidEdges, edgeMat)]) {
      obj.matrixAutoUpdate = false;
      obj.matrix.copy(m);
      g.add(obj);
    }
    return g;
  }

  function disposeGroup(group) {
    for (const child of [...group.children]) {
      child.traverse((o) => { if (o.geometry && o.geometry !== cuboidGeo && o.geometry !== cuboidEdges) o.geometry.dispose(); });
      group.remove(child);
    }
  }

  function setViewPoint(viewAng) {
    const vp = new THREE.Vector3(...viewPointOf(viewAng)).multiplyScalar(longest);
    camera.position.copy(center.clone().add(vp));
    camera.up.set(0, 0, 1);
    controls.target.copy(center);
    controls.update();
  }

  let current = MAT.brown;
  function update({ qs, qf, robotq, inCollision, pObs3, viewAng }) {
    disposeGroup(dynamic);
    // {Brown, Opacity[0.2], EdgeForm[Gray], draw2Drobot[widtha, qs], draw2Drobot[widtha, qf]}
    dynamic.add(robot(qs, MAT.ghost, EDGE.ghost), robot(qf, MAT.ghost, EDGE.ghost));
    // If[inCollision, Red, Brown], Cylinder[{{0,0,-.1},{0,0,1+2widtha}}, 1/8], draw2Drobot[widtha, robotq]
    // ORIGINAL QUIRK (Q-PA-04): the colour directive also applies to the current robot, which is therefore red
    // whenever the START configuration is in collision, wherever the robot is.
    const mat = inCollision ? MAT.red : MAT.brown;
    current = mat;
    const base = cylinderBetween([0, 0, -0.1], [0, 0, 1 + 2 * WIDTHA], BASE_RADIUS, mat, 32);
    dynamic.add(base, robot(robotq, mat, EDGE.solid));
    sphereA.position.set(...pObs3[0]);
    sphereB.position.set(...pObs3[1]);
    // ORIGINAL QUIRK (Q-PA-05): every evaluation rebuilds the Graphics3D with ViewPoint {2Cos[viewAng], 2Sin[viewAng], 1},
    // so a rotation made with the mouse lasts only until the next update.
    setViewPoint(viewAng);
    viewer.render();
  }

  return {
    ok: true,
    update,
    inkFraction: () => inkFraction(viewer.renderer),
    cameraPosition: () => camera.position.toArray(),
    /** colour (hex, as given to Mathematica) of the base and the current robot */
    robotColor: () => current.color.getHexString(THREE.LinearSRGBColorSpace),
    viewer,
  };
}
