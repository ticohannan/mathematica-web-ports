// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/graphics3d-three.js — browser renderer of the flattened Graphics3D primitives of shared/graphics3d.js into
// three.js groups, and a SphericalRegion-like camera fit. Browser only (three.js).
// Generic: moved to shared/ under MIT in v0.1.21 (owner decision D1) from demos/common/g3d-three.js (v0.1.16), unchanged.
//
// API
//   addPrims(group, prims, ctx)   ctx: {viewer, clip (THREE.Plane[] or null), box (plot range, for InfinitePlane),
//                                 size (a length for PointSize / Arrowheads, ~ the width the graphic spans),
//                                 thickPx = 3 (Thickness[Large], D-RS-03), thinPx = 1}
//                                 Primitives with edgeForm 'None' (EdgeForm[]) get no edges; an RGB edgeForm
//                                 colours them; otherwise Mathematica's default thin dark edges (cuboids, polygons,
//                                 planes, cylinder rims).
//   disposeGroup(group, viewers)  frees the geometries and materials of `group` (and forgets its line materials in
//                                 every viewer of `viewers`), then empties it.
//   fitViewer(viewer, vp)         vp: {box, zoom = 1, viewPoint = VIEWPOINT, viewAngle}: keeps the user's viewing direction,
//                                 centres and scales on the box (half angle = atan(tan(1.04 × the bounding sphere's angular radius) / zoom); zoom > 1
//                                 draws larger), camera distance |viewPoint| × longest side; with viewAngle (radians,
//                                 ViewAngle, v0.1.21) the vertical angle is that instead.
//   'mesh' primitives (GraphicsComplex polygons, v0.1.21): one indexed BufferGeometry (each polygon a triangle fan),
//                                 smooth vertex normals, both faces; edges as polygons unless EdgeForm[].
//   textured polygons (v0.1.26: a polygon with `texture` and `textureCoordinates`, shared/graphics3d.js Texture): the
//                                 same triangle fan with the texture coordinates as UVs; a white Lambert material with
//                                 the image as its map (one THREE.CanvasTexture per image object, from shared/graphics.js
//                                 imageCanvas; colour values used as they are; anisotropic filtering up to 8), always
//                                 blended (the image's alpha × Opacity), both faces, no depth writes; edges as for any
//                                 polygon.
import { THREE, surface, cylinderBetween, fatLine, label } from './three-helpers.js';
import { sampleCurve, sampleSurface, sampleCircle, infinitePlanePolygon, apply4, cuboidCorners, infiniteLineSegment } from './graphics3d.js';
import { imageCanvas } from './graphics.js';

/** Mathematica's default ViewPoint */
export const VIEWPOINT = [1.3, -2.4, 2];

// SphericalRegion: true (the default here, as every port so far was made with it): the view angle shows the box's
// bounding sphere from any direction, so rotating never changes the scale. false (v0.1.27, Mathematica's own default):
// the view angle is the smallest that shows the box's eight corners from the current direction (× 1.02), so a long
// thin box fills the image as Mathematica draws it.
export function fitViewer(viewer, { box, zoom = 1, viewPoint = VIEWPOINT, viewAngle, SphericalRegion = true }) {
  const vpLen = Math.hypot(...viewPoint);
  const c = new THREE.Vector3(...box.map(([a, b]) => (a + b) / 2));
  const longest = Math.max(...box.map(([a, b]) => b - a));
  const radius = 0.5 * Math.hypot(...box.map(([a, b]) => b - a));
  const dir = viewer.camera.position.clone().sub(viewer.controls.target);
  if (dir.lengthSq() === 0) dir.set(...viewPoint);
  dir.normalize();
  const dist = vpLen * longest;
  viewer.controls.target.copy(c);
  viewer.camera.position.copy(c.clone().add(dir.multiplyScalar(dist)));
  let half = viewAngle !== undefined ? viewAngle / 2 : Math.atan(Math.tan(Math.asin(Math.min(0.99, radius / dist)) * 1.04) / zoom);
  if (viewAngle === undefined && SphericalRegion === false) {
    viewer.controls.update();
    viewer.camera.updateMatrixWorld();
    const aspect = viewer.camera.aspect || 1;
    let t = 0;
    for (const x of box[0]) for (const y of box[1]) for (const z of box[2]) {
      const v = new THREE.Vector3(x, y, z).applyMatrix4(viewer.camera.matrixWorldInverse);
      const depth = -v.z;
      if (depth > 0) t = Math.max(t, Math.abs(v.y) / depth, Math.abs(v.x) / (depth * aspect));
    }
    if (t > 0) half = Math.atan((t * 1.02) / zoom);
  }
  viewer.camera.fov = (2 * half * 180) / Math.PI;
  viewer.camera.near = dist / 100;
  viewer.camera.far = dist * 10;
  viewer.camera.updateProjectionMatrix();
  viewer.controls.update();
  viewer.render();
}

const DEFAULT_SURFACE = [1, 1, 1];
const DEFAULT_LINE = [0, 0, 0];
const EDGE_COLOR = [0, 0, 0];

export function disposeGroup(g, viewers = []) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      for (const v of viewers) v.lineMaterials.delete(o.material);
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

// v0.1.26: Texture on a Polygon — one texture per image object (kept while the image object lives). The GL texture is
// not freed with the object (three.js frees it only on dispose()), so a body should make its image once (a module
// constant, as camera-apparent-velocity does) rather than a new Rasterize or RGBA image on every evaluation.
const textures = new WeakMap();
function textureOf(image, renderer) {
  let t = textures.get(image);
  if (!t) {
    t = new THREE.CanvasTexture(imageCanvas(image)); // flipY: texture coordinate t = 1 is the image's top row
    t.colorSpace = THREE.NoColorSpace; // the colour values as they are (the 3D pictures write them unencoded)
    t.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 1); // sharp when seen at a slant
    textures.set(image, t);
  }
  return t;
}
function texturedPolygonMesh(p, { clip, viewer }) {
  const geo = new THREE.BufferGeometry();
  const pos = [], uv = [];
  const { points: q, textureCoordinates: c } = p;
  for (let i = 1; i + 1 < q.length; i++) { pos.push(...q[0], ...q[i], ...q[i + 1]); uv.push(...c[0], ...c[i], ...c[i + 1]); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(1, 1, 1), map: textureOf(p.texture, viewer?.renderer), transparent: true, opacity: p.opacity, side: THREE.DoubleSide, depthWrite: false });
  if (clip) m.clippingPlanes = clip;
  return new THREE.Mesh(geo, m);
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

function indexedMesh(points, polygons, material) {
  const pos = new Float32Array(points.length * 3);
  let k = 0;
  for (const q of points) { pos[k++] = q[0]; pos[k++] = q[1]; pos[k++] = q[2]; }
  const idx = [];
  for (const f of polygons) for (let i = 1; i + 1 < f.length; i++) idx.push(f[0], f[i], f[i + 1]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

/** Add the styled primitives to `group` (see the header for ctx). */
export function addPrims(group, prims, ctx) {
  const thickPx = ctx.thickPx ?? 3, thinPx = ctx.thinPx ?? 1;
  // translucent solids show front and back faces blended, as in Mathematica
  const mat = (p, side = THREE.FrontSide) => {
    const m = surface(p.color ?? DEFAULT_SURFACE, { opacity: p.opacity, side: p.opacity < 1 ? THREE.DoubleSide : side });
    if (ctx.clip) m.clippingPlanes = ctx.clip;
    return m;
  };
  const line = (pts, p) => {
    const l = fatLine(ctx.viewer, pts, p.color ?? DEFAULT_LINE, p.thickness === 'Large' ? thickPx : thinPx, p.opacity);
    if (ctx.clip) l.material.clippingPlanes = ctx.clip;
    return l;
  };
  // Mathematica's default EdgeForm: thin dark edges on cuboids, polygons, planes and cylinder rims (none on
  // spheres and ParametricPlot3D surfaces, which have EdgeForm[]); drawn 1 px wide (D-RS-03)
  const edges = (segs, p) => {
    if (p.edgeForm === 'None') return;
    const pos = new Float32Array(segs.length * 6);
    segs.forEach(([a, b], k) => pos.set([...a, ...b], 6 * k));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineBasicMaterial({ color: new THREE.Color(...(Array.isArray(p.edgeForm) ? p.edgeForm : EDGE_COLOR)), transparent: p.opacity < 1, opacity: p.opacity });
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
        const box = cuboidCorners(p); // corners in any order (N-DH-06); unchanged for ordered corners
        const size = [0, 1, 2].map((k) => box.max[k] - box.min[k]);
        const ctr = [0, 1, 2].map((k) => (box.max[k] + box.min[k]) / 2);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(p));
        const T = new THREE.Matrix4().makeTranslation(...ctr);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(p.matrix ? m4(p.matrix).multiply(T) : T);
        group.add(mesh);
        const corner = (k) => { const q = [0, 1, 2].map((i) => ((k >> i) & 1 ? box.max[i] : box.min[i])); return p.matrix ? apply4(p.matrix, q) : q; };
        const segs = [];
        for (let a = 0; a < 8; a++) for (const bit of [1, 2, 4]) if (!(a & bit)) segs.push([corner(a), corner(a | bit)]);
        edges(segs, p);
        break;
      }
      case 'polygon':
        if (p.texture && p.textureCoordinates) group.add(texturedPolygonMesh(p, ctx)); // v0.1.26
        else group.add(polygonMesh(p.points, mat(p, THREE.DoubleSide)));
        edges(loop(p.points), p); break;
      case 'infinitePlane': {
        const poly = infinitePlanePolygon(p.points, ctx.box);
        if (poly.length >= 3) { group.add(polygonMesh(poly, mat(p, THREE.DoubleSide))); edges(loop(poly), p); }
        break;
      }
      case 'line': group.add(line(p.points, p)); break;
      case 'mesh': {
        group.add(indexedMesh(p.points, p.polygons, mat(p, THREE.DoubleSide)));
        if (p.edgeForm !== 'None') edges(p.polygons.flatMap((f) => loop(f.map((i) => p.points[i]))), p);
        break;
      }
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
      // v0.1.23 ------------------------------------------------------------------------------------------------
      case 'tube': {
        const m = mat(p);
        for (let i = 0; i + 1 < p.points.length; i++) {
          if (p.points[i].every((x, k) => x === p.points[i + 1][k])) continue;
          group.add(cylinderBetween(p.points[i], p.points[i + 1], p.radius, m, 24));
        }
        if (p.points.length > 2) { // joints
          const geo = new THREE.SphereGeometry(p.radius, 16, 12);
          for (const q of p.points.slice(1, -1)) { const s = new THREE.Mesh(geo, m); s.position.set(...q); group.add(s); }
        }
        break;
      }
      case 'cone': {
        const a = new THREE.Vector3(...p.p1), b = new THREE.Vector3(...p.p2), len = a.distanceTo(b);
        if (len === 0) break;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(p.radius, len, 40), mat(p));
        cone.position.copy(a.clone().add(b).multiplyScalar(0.5));
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        group.add(cone);
        break;
      }
      case 'infiniteLine': {
        const seg = infiniteLineSegment(p.points, ctx.box);
        if (seg.length) group.add(line(seg, p));
        break;
      }
      case 'text': {
        const html = typeof p.expr === 'object' && p.expr?.html != null;
        const obj = label(html ? p.expr.html : String(p.expr), p.pos, p.color ?? DEFAULT_LINE, { html, cls: 'lbl-text3d' });
        obj.element.style.fontSize = `${p.fontSize}px`;
        obj.element.dataset.testid = 'text3d';
        group.add(obj);
        break;
      }
      default: break;
    }
  }
}
