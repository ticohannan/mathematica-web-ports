// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/torus-chart/surface.js — the manifold of
//   ParametricPlot3D[TorusToPlane[λ, u, v], {u, 0, 2π}, {v, 0, 2π}, …, PlotTheme -> "Business",
//                    BoundaryStyle -> Directive[Thick, Red], …]
// as data for the renderer and the tests: a fixed (n+1) × (n+1) grid (D-TC-01), triangles whose counterclockwise side
// is the ∂u × ∂v side (the FaceForm front, N-TC-02), unit normals of that side, the four parameter edges (boundary) and
// the theme's mesh: 15 contours of z at equally spaced levels between the lowest and highest z of the grid
// (K-TC-02, D-TC-02). z does not depend on u in either branch of TorusToPlane, so each contour is the curve
// v = v* (all u) at a root v* of z(v) = level; the roots are found on a fine v scan and refined by bisection.
// Pure: no DOM, no three.js.
import { TorusToPlane } from './model.js';
import { mLessEq } from '../../shared/mma.js';

const TWO_PI = 2 * Math.PI;
/** Grid intervals per parameter: 72 = 5° steps (D-TC-01). */
export const GRID_N = 72;
/** Number of mesh contours (Mesh -> 15 of the theme's z mesh; snapshot 4 shows 15 equally spaced arcs, D-TC-02). */
export const MESH_LEVELS = 15;

/** The parameter value of grid index k of n: 2π k/n (exactly 2π at k = n). */
export const gridParam = (k, n) => (k === n ? TWO_PI : (TWO_PI * k) / n);

/** ∂u × ∂v of TorusToPlane (not normalised), from the analytic partial derivatives of the branch λ selects. */
export function frontNormal(λ, u, v) {
  let du, dv;
  if (mLessEq(λ, 1)) {
    const A = 2 + λ + (1 - λ) * Math.cos(v), k = Math.PI / 3;
    du = [-k * Math.sin(u) * A, k * Math.cos(u) * A, 0];
    const dA = -(1 - λ) * Math.sin(v);
    dv = [k * Math.cos(u) * dA, k * Math.sin(u) * dA, -λ + (1 - λ) * Math.cos(v)];
  } else {
    du = [-(2 - λ) * Math.PI * Math.sin(u), -(λ - 1) + (2 - λ) * Math.PI * Math.cos(u), 0];
    dv = [λ - 1, 0, λ - 2];
  }
  return [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
}

/** z of TorusToPlane as a function of v alone (u does not enter). */
const zOf = (λ, v) => TorusToPlane(λ, 0, v)[2];

/** The mesh levels: MESH_LEVELS equally spaced values strictly between zmin and zmax (none if z is constant). */
export function meshLevels(zmin, zmax, count = MESH_LEVELS) {
  if (!(zmax - zmin > 1e-12)) return [];
  return Array.from({ length: count }, (_, k) => zmin + ((k + 1) * (zmax - zmin)) / (count + 1));
}

/** All v in [0, 2π] with z(v) = level (scan of `scan` intervals, then bisection). */
export function contourParams(λ, level, scan = 1440) {
  const out = [];
  let v0 = 0, f0 = zOf(λ, 0) - level;
  for (let k = 1; k <= scan; k++) {
    const v1 = gridParam(k, scan), f1 = zOf(λ, v1) - level;
    if (f0 === 0) out.push(v0);
    else if (f0 * f1 < 0) {
      let a = v0, b = v1, fa = f0;
      for (let it = 0; it < 80 && b - a > 1e-15; it++) {
        const m = (a + b) / 2, fm = zOf(λ, m) - level;
        if (fm === 0) { a = b = m; break; }
        if (fa * fm < 0) b = m; else { a = m; fa = fm; }
      }
      out.push((a + b) / 2);
    }
    v0 = v1; f0 = f1;
  }
  if (f0 === 0) out.push(v0);
  return out;
}

/**
 * sampleManifold(λ, n): {n, positions (Float64Array, (n+1)² × 3, index i(n+1)+j for u_i, v_j), normals (unit, front side),
 * triangles (Uint32Array, counterclockwise = front), boundary: {u0, u2pi, v0, v2pi} (polylines of n+1 points),
 * zRange: [zmin, zmax], mesh: [{level, v, points}] (15 z contours, none when z is constant)}.
 */
export function sampleManifold(λ, n = GRID_N) {
  const N1 = n + 1;
  const positions = new Float64Array(N1 * N1 * 3), normals = new Float64Array(N1 * N1 * 3);
  const us = Array.from({ length: N1 }, (_, i) => gridParam(i, n));
  let zmin = Infinity, zmax = -Infinity;
  for (let i = 0; i < N1; i++) for (let j = 0; j < N1; j++) {
    const k = (i * N1 + j) * 3;
    const p = TorusToPlane(λ, us[i], us[j]);
    positions.set(p, k);
    if (p[2] < zmin) zmin = p[2];
    if (p[2] > zmax) zmax = p[2];
    const c = frontNormal(λ, us[i], us[j]);
    const len = Math.hypot(c[0], c[1], c[2]);
    normals.set(len > 1e-12 ? [c[0] / len, c[1] / len, c[2] / len] : [0, 0, 1], k);
  }
  const triangles = new Uint32Array(n * n * 6);
  let t = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const a = i * N1 + j, b = (i + 1) * N1 + j, c = (i + 1) * N1 + j + 1, d = i * N1 + j + 1;
    triangles.set([a, b, c, a, c, d], t);
    t += 6;
  }
  const at = (i, j) => Array.from(positions.subarray((i * N1 + j) * 3, (i * N1 + j) * 3 + 3));
  const boundary = {
    u0: us.map((_, j) => at(0, j)), u2pi: us.map((_, j) => at(n, j)),
    v0: us.map((_, i) => at(i, 0)), v2pi: us.map((_, i) => at(i, n)),
  };
  const mesh = [];
  for (const level of meshLevels(zmin, zmax)) {
    for (const v of contourParams(λ, level)) mesh.push({ level, v, points: us.map((u) => TorusToPlane(λ, u, v)) });
  }
  return { n, positions, normals, triangles, boundary, zRange: [zmin, zmax], mesh };
}
