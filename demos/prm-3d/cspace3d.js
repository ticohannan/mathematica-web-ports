// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-3d/cspace3d.js — the configuration-space obstacle volumes of "Probabilistic Roadmap Method in 3D":
//   RegionPlot3D[detCollision[jointAngle2Origin[{a1, a2, a3}], {pObs3a}, obsRad, widtha], {a1, 0, 2π}, {a2, 0, 2π},
//     {a3, 0, 2π}, Mesh -> None, PlotStyle -> Directive[Blue, Opacity[0.5]]]   (Yellow for the second sphere)
// PORT DEVIATION (D-P3-02): RegionPlot3D's adaptive sampling is replaced by the sign of a margin field sampled on an
// (n+1)³ grid over [0, 2π]³ (n = 24 while a control is active, 48 at rest) and marching tetrahedra (every grid cube
// split into the six Kuhn tetrahedra along its main diagonal, linear interpolation along the tetrahedron edges). The
// volume is closed on the six cube faces by caps cut from the same face triangulation ("marching triangles"), so the
// whole mesh is watertight, and the boundary lines where the volume meets the faces (RegionPlot3D's GrayLevel[0]
// lines) are the crossing segments of the face triangles. The generic meshing is shared/region-plot3d.js (MIT); this
// file keeps the field of the original's detCollision test and the cache. Pure: no DOM, no three.js.
import { TWO_PI, OBS_RAD, WIDTHA, jointAngle2Origin, robotSegments, pointsegdis2 } from './model.js';
import { marchingTetrahedra, gridCoord, gridIndex } from '../../shared/region-plot3d.js';

/** grid sizes (cells per side): ControlActive -> "speed", at rest -> "quality" (D-P3-02) */
export const GRID = { speed: 24, quality: 48 };

/**
 * The margin field of one sphere centre c at (a1, a2, a3): the minimum over detCollision's four tests of
 * (distance - limit) — links 1, 2, 3 against obsRad + widtha, the base segment against obsRad + 2 widtha. Negative
 * exactly where the corresponding strict comparison `distance < limit` holds (detCollision uses Mathematica's
 * tolerant Less; the two differ only within 2^-46 relative of the limit).
 */
export function field(a1, a2, a3, c, obsRad = OBS_RAD, widtha = WIDTHA) {
  const { link1, link2, link3, base } = robotSegments(jointAngle2Origin([a1, a2, a3]), widtha);
  const P = [c];
  return Math.min(
    pointsegdis2([link1, P]) - (obsRad + widtha),
    pointsegdis2([link2, P]) - (obsRad + widtha),
    pointsegdis2([link3, P]) - (obsRad + widtha),
    pointsegdis2([base, P]) - (obsRad + 2 * widtha),
  );
}

/**
 * pointsegdis2[{{a, b}, {c}}] with scalars: the same operations in the same order as model.js pointsegdis2 (u = a - b,
 * mean = (a + b)/2, s = -(2 (c - mean).u)·(1/u.u), k = Sign[s] Min[1, Abs[s]]/2, EuclideanDistance[c, mean - u k]).
 */
function segDist(ax, ay, az, bx, by, bz, c) {
  const ux = ax - bx, uy = ay - by, uz = az - bz;
  const mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2;
  const inv = 1 / (ux * ux + uy * uy + uz * uz);
  const s = -(2 * ((c[0] - mx) * ux + (c[1] - my) * uy + (c[2] - mz) * uz)) * inv;
  const k = (Math.sign(s) * Math.min(1, Math.abs(s))) / 2;
  const ex = c[0] - (mx - ux * k), ey = c[1] - (my - uy * k), ez = c[2] - (mz - uz * k);
  return Math.sqrt(ex * ex + ey * ey + ez * ez);
}

/**
 * cObstacle(c, n): the C-obstacle of the sphere centre c on an (n+1)³ grid over [0, 2π]³ (shared/region-plot3d.js
 * marchingTetrahedra, D-P3-02). Returns
 *   { n, h, values (Float64Array of the field at the nodes), vertices ([[a1, a2, a3], ...]),
 *     surface ([[i, j, k], ...] vertex indexes, outward), caps ([{ tri: [i, j, k], normal }]), lines ([[p, q], ...]),
 *     inside (number of grid nodes inside) }
 * Vertices are shared by key (a grid node, or the crossing on the edge between two grid nodes), so the mesh is
 * closed: every edge belongs to exactly two triangles of surface ∪ caps.
 */
export function cObstacle(c, n) {
  const N = n + 1, h = TWO_PI / n;
  const ranges = [[0, TWO_PI], [0, TWO_PI], [0, TWO_PI]];
  const coord = gridCoord(ranges[0], n);
  const id = gridIndex(n);
  const values = new Float64Array(N * N * N);
  // the same arithmetic as field() (bit for bit; unit test), with the cosines and sines of the grid coordinates computed once
  const cs = Array.from({ length: N }, (_, i) => Math.cos(coord(i))), sn = Array.from({ length: N }, (_, i) => Math.sin(coord(i)));
  const lim = OBS_RAD + WIDTHA, lim0 = OBS_RAD + 2 * WIDTHA;
  const d0 = segDist(0, 0, 0, 0, 0, 1 + 2 * WIDTHA, c) - lim0; // the base does not move
  for (let i = 0; i < N; i++) {
    const c1 = cs[i], s1 = sn[i];
    const d1 = segDist(0, 0, 1, c1, s1, 1, c) - lim;
    for (let j = 0; j < N; j++) {
      const c2 = cs[j], s2 = sn[j];
      const o2x = c1 + c1 * c2, o2y = s1 + s1 * c2, o2z = 1 + s2;
      const d2 = segDist(c1, s1, 1, o2x, o2y, o2z, c) - lim;
      const m12 = Math.min(d1, d2);
      for (let k = 0; k < N; k++) {
        const c3 = cs[k], s3 = sn[k];
        const o3x = o2x + (c1 * c2 * c3 + s1 * s3), o3y = o2y + (s1 * c2 * c3 - c1 * s3), o3z = o2z + c3 * s2;
        values[id(i, j, k)] = Math.min(m12, segDist(o2x, o2y, o2z, o3x, o3y, o3z, c) - lim, d0);
      }
    }
  }
  const { vertices, surface, caps, lines, inside } = marchingTetrahedra(values, ranges, n);
  return { n, h, values, vertices, surface, caps, lines, inside };
}

// ---- cache (the original keeps freeConfigSpacea/b until the sphere moves or the box is switched off, Q-P3-12) --------
const cache = new Map();
/** cObstacle for a volume descriptor {c, quality} of the model's state (null → null), memoised. */
export function volumeFor(desc) {
  if (!desc) return null;
  const key = `${desc.c.join(',')}|${desc.quality}`;
  let v = cache.get(key);
  if (!v) {
    if (cache.size >= 8) cache.delete(cache.keys().next().value);
    v = cObstacle(desc.c, GRID[desc.quality] ?? GRID.quality);
    cache.set(key, v);
  }
  return v;
}
