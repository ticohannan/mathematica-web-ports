// shared/three-helpers.js
// three.js utilities that mimic Mathematica Graphics3D conventions:
// z-up camera from a ViewPoint in "scaled box coordinates", Mathematica's
// default "Automatic" lighting (approximation), thick lines, cylinders, labels.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

export { THREE };

export const rgb = ([r, g, b]) => new THREE.Color(r, g, b);

/**
 * Create a renderer + camera + orbit controls inside `container`.
 * opts.box: [[xmin,xmax],[ymin,ymax],[zmin,zmax]] (PlotRange)
 * opts.viewPoint: Mathematica ViewPoint (scaled box coords, longest side = 1)
 * opts.viewAngle: full view angle in radians, or undefined for automatic (fit bounding sphere)
 */
export function createViewer(container, opts) {
  const size = opts.size ?? 400;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xffffff, 1);
  renderer.domElement.setAttribute('data-testid', 'scene-canvas');
  container.append(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.append(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const [[x0, x1], [y0, y1], [z0, z1]] = opts.box;
  const center = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const longest = Math.max(x1 - x0, y1 - y0, z1 - z0);
  const vp = new THREE.Vector3(...opts.viewPoint).multiplyScalar(longest);
  const camPos = center.clone().add(vp);
  const dist = vp.length();
  const radius = 0.5 * Math.hypot(x1 - x0, y1 - y0, z1 - z0);
  const fovRad = opts.viewAngle ?? 2 * Math.asin(Math.min(0.99, radius / dist)) * 1.04;
  const camera = new THREE.PerspectiveCamera((fovRad * 180) / Math.PI, 1, dist / 100, dist * 10);
  camera.up.set(0, 0, 1); // ViewVertical -> {0,0,1}
  camera.position.copy(camPos);
  camera.lookAt(center);
  scene.add(camera);
  addMathematicaLighting(camera);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(center);
  controls.enableDamping = false;
  controls.update();

  let needs = true;
  const render = () => { needs = true; };
  const loop = () => {
    if (needs) {
      needs = false;
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      viewer.frames++;
    }
    requestAnimationFrame(loop);
  };
  controls.addEventListener('change', render);

  const lineMaterials = new Set();
  const resize = () => {
    const w = Math.min(container.clientWidth || size, opts.maxSize ?? 560);
    renderer.setSize(w, w);
    labelRenderer.setSize(w, w);
    container.style.height = `${w}px`;
    for (const m of lineMaterials) m.resolution.set(w, w);
    render();
  };
  window.addEventListener('resize', resize);
  const initial = { position: camPos.clone(), target: center.clone() };
  const resetView = () => {
    camera.position.copy(initial.position);
    controls.target.copy(initial.target);
    camera.up.set(0, 0, 1);
    controls.update();
    render();
  };

  const viewer = { scene, camera, renderer, labelRenderer, controls, render, resize, resetView, lineMaterials, frames: 0 };
  resize();
  requestAnimationFrame(loop);
  return viewer;
}

/** Approximation of Mathematica's default Lighting -> Automatic (lights fixed to the camera). */
function addMathematicaLighting(camera) {
  const amb = new THREE.AmbientLight(rgb([0.4, 0.2, 0.2]), Math.PI * 1.0);
  camera.add(amb);
  const target = new THREE.Object3D();
  target.position.set(0, 0, -1);
  camera.add(target);
  const dirs = [
    { c: [0, 0.18, 0.5], p: [-0.5, 1.5, 2] },
    { c: [0.18, 0.5, 0.18], p: [1.5, 1.5, 2] },
    { c: [0.5, 0.18, 0], p: [1.5, -0.5, 2] },
    { c: [0, 0.18, 0.5], p: [-0.5, -0.5, 2] },
  ];
  for (const d of dirs) {
    const l = new THREE.DirectionalLight(rgb(d.c), Math.PI * 1.0);
    l.position.set(...d.p);
    l.target = target;
    camera.add(l);
  }
}

/** Lambert material in a Mathematica directive colour. */
export function surface(color, { opacity = 1, side = THREE.FrontSide } = {}) {
  const m = new THREE.MeshLambertMaterial({ color: rgb(color), side });
  if (opacity < 1) {
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
  }
  return m;
}

/** Cylinder[{p, q}, r] */
export function cylinderBetween(p, q, r, material, radialSegments = 32) {
  const a = new THREE.Vector3(...p), b = new THREE.Vector3(...q);
  const len = a.distanceTo(b);
  const geo = new THREE.CylinderGeometry(r, r, len, radialSegments, 1, false);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

/** Screen-space thick polyline (Mathematica Thickness / AbsoluteThickness). */
export function fatLine(viewer, points, color, widthPx = 2, opacity = 1) {
  const geo = new LineGeometry();
  geo.setPositions(points.flat());
  const mat = new LineMaterial({ color: rgb(color), linewidth: widthPx, transparent: opacity < 1, opacity });
  const size = viewer.renderer.getSize(new THREE.Vector2());
  mat.resolution.set(size.x, size.y);
  viewer.lineMaterials.add(mat);
  const line = new Line2(geo, mat);
  line.computeLineDistances();
  return line;
}

/** Text label attached to a position (CSS2D, always faces the camera, like Mathematica Text). */
export function label(text, pos, color = [0, 0, 0], { padLeft = 0, html = false, cls = '' } = {}) {
  const div = document.createElement('div');
  div.className = cls ? `lbl ${cls}` : 'lbl';
  if (html) div.innerHTML = text; else div.textContent = text;
  div.style.color = `rgb(${color.map((c) => Math.round(c * 255)).join(',')})`;
  if (padLeft) div.style.paddingLeft = `${padLeft}em`;
  const obj = new CSS2DObject(div);
  obj.position.set(...pos);
  return obj;
}

/** Apply a row-major 3x3 rotation matrix to an Object3D. */
export function setRotation(obj, R) {
  const m = new THREE.Matrix4().set(
    R[0][0], R[0][1], R[0][2], 0,
    R[1][0], R[1][1], R[1][2], 0,
    R[2][0], R[2][1], R[2][2], 0,
    0, 0, 0, 1,
  );
  obj.setRotationFromMatrix(m);
}

/** Fraction of non-white pixels in the canvas (used by tests to detect a blank render). */
export function inkFraction(renderer) {
  const gl = renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let ink = 0;
  for (let i = 0; i < px.length; i += 16) if (px[i] < 245 || px[i + 1] < 245 || px[i + 2] < 245) ink++;
  return ink / (px.length / 16);
}
