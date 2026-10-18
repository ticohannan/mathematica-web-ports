// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations "Robot Singularities in Three-Link Manipulators" by Aaron T. Becker and Yitong Lu and "Denavit-Hartenberg Parameters for a Three-Link Robot" by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/g3d-three.js — browser renderer of the flattened Graphics3D primitives of demos/common/g3d.js into
// three.js groups, and the SphericalRegion-like camera fit of the DH-family ports. Browser only (three.js).
// Moved from demos/robot-singularities/main.js (v0.1.16, DH-family move) with parameters instead of that page's
// module globals; robot-singularities' main.js calls these functions with its old values (behaviour unchanged).
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
//   fitViewer(viewer, vp)         vp: {box, zoom = 1, viewPoint = VIEWPOINT}: keeps the user's viewing direction,
//                                 centres and scales on the box (half angle = atan(tan(1.04 × the bounding sphere's angular radius) / zoom); zoom > 1
//                                 draws larger), camera distance |viewPoint| × longest side.
import { THREE, surface, cylinderBetween, fatLine } from '../../shared/three-helpers.js';
import { sampleCurve, sampleSurface, sampleCircle, infinitePlanePolygon, apply4, cuboidCorners } from './g3d.js';

/** Mathematica's default ViewPoint */
export const VIEWPOINT = [1.3, -2.4, 2];

export function fitViewer(viewer, { box, zoom = 1, viewPoint = VIEWPOINT }) {
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
  const half = Math.atan(Math.tan(Math.asin(Math.min(0.99, radius / dist)) * 1.04) / zoom);
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
