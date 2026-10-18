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
// lines) are the crossing segments of the face triangles. Pure: no DOM, no three.js.
import { TWO_PI, OBS_RAD, WIDTHA, jointAngle2Origin, robotSegments, pointsegdis2 } from './model.js';

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

// the six Kuhn tetrahedra of a cube: corners as bit masks (1 = +a1, 2 = +a2, 4 = +a3), paths 0 → … → 7
const KUHN = [[1, 2, 4], [1, 4, 2], [2, 1, 4], [2, 4, 1], [4, 1, 2], [4, 2, 1]].map(([p, q]) => [0, p, p | q, 7]);

/**
 * cObstacle(c, n): the C-obstacle of the sphere centre c on an (n+1)³ grid. Returns
 *   { n, h, values (Float64Array of the field at the nodes), vertices ([[a1, a2, a3], ...]),
 *     surface ([[i, j, k], ...] vertex indexes, outward), caps ([{ tri: [i, j, k], normal }]), lines ([[p, q], ...]),
 *     inside (number of grid nodes inside) }
 * Vertices are shared by key (a grid node, or the crossing on the edge between two grid nodes), so the mesh is
 * closed: every edge belongs to exactly two triangles of surface ∪ caps.
 */
export function cObstacle(c, n) {
  const N = n + 1, h = TWO_PI / n;
  const coord = (i) => (i === n ? TWO_PI : i * h);
  const id = (i, j, k) => (i * N + j) * N + k;
  const values = new Float64Array(N * N * N);
  let inside = 0;
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
        const f = Math.min(m12, segDist(o2x, o2y, o2z, o3x, o3y, o3z, c) - lim, d0);
        values[id(i, j, k)] = f;
        if (f < 0) inside++;
      }
    }
  }
  const pos = (nid) => { const k = nid % N, j = ((nid - k) / N) % N, i = (nid - k - j * N) / (N * N); return [coord(i), coord(j), coord(k)]; };
  const vertices = [];
  const keyIndex = new Map();
  const nodeVertex = (a) => {
    const key = -1 - a;
    let v = keyIndex.get(key);
    if (v === undefined) { v = vertices.length; vertices.push(pos(a)); keyIndex.set(key, v); }
    return v;
  };
  const crossing = (a, b) => { // the zero of the linear interpolation on the grid edge a–b (a inside, b outside)
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const key = lo * N * N * N + hi;
    let v = keyIndex.get(key);
    if (v === undefined) {
      const fa = values[a], fb = values[b];
      const t = fa / (fa - fb);
      const pa = pos(a), pb = pos(b);
      v = vertices.length;
      vertices.push([pa[0] + t * (pb[0] - pa[0]), pa[1] + t * (pb[1] - pa[1]), pa[2] + t * (pb[2] - pa[2])]);
      keyIndex.set(key, v);
    }
    return v;
  };
  const surface = [];
  /** add triangle (x, y, z) oriented so that its normal points along (ox, oy, oz) */
  const addTri = (list, x, y, z, ox, oy, oz) => {
    const X = vertices[x], Y = vertices[y], Z = vertices[z];
    const ux = Y[0] - X[0], uy = Y[1] - X[1], uz = Y[2] - X[2], wx = Z[0] - X[0], wy = Z[1] - X[1], wz = Z[2] - X[2];
    const d = (uy * wz - uz * wy) * ox + (uz * wx - ux * wz) * oy + (ux * wy - uy * wx) * oz;
    list.push(d >= 0 ? [x, y, z] : [x, z, y]);
  };
  // ---- marching tetrahedra -------------------------------------------------------------------------------------
  const corner = new Int32Array(8);
  const ins = new Int32Array(4), outs = new Int32Array(4), insM = new Int32Array(4), outsM = new Int32Array(4);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
    let nin = 0;
    for (let m = 0; m < 8; m++) {
      corner[m] = id(i + (m & 1), j + ((m >> 1) & 1), k + ((m >> 2) & 1));
      if (values[corner[m]] < 0) nin++;
    }
    if (nin === 0 || nin === 8) continue;
    for (let t = 0; t < 6; t++) {
      const tet = KUHN[t];
      let ni = 0, no = 0;
      for (let q = 0; q < 4; q++) {
        const m = tet[q], a = corner[m];
        if (values[a] < 0) { insM[ni] = m; ins[ni++] = a; } else { outsM[no] = m; outs[no++] = a; }
      }
      if (ni === 0 || no === 0) continue;
      // outward = centroid of the outside corners - centroid of the inside corners (corner offsets in cells)
      let ox = 0, oy = 0, oz = 0;
      for (let q = 0; q < no; q++) { const m = outsM[q]; ox += (m & 1) / no; oy += ((m >> 1) & 1) / no; oz += ((m >> 2) & 1) / no; }
      for (let q = 0; q < ni; q++) { const m = insM[q]; ox -= (m & 1) / ni; oy -= ((m >> 1) & 1) / ni; oz -= ((m >> 2) & 1) / ni; }
      if (ni === 1) addTri(surface, crossing(ins[0], outs[0]), crossing(ins[0], outs[1]), crossing(ins[0], outs[2]), ox, oy, oz);
      else if (ni === 3) addTri(surface, crossing(ins[0], outs[0]), crossing(ins[1], outs[0]), crossing(ins[2], outs[0]), ox, oy, oz);
      else {
        const ap = crossing(ins[0], outs[0]), aq = crossing(ins[0], outs[1]), bq = crossing(ins[1], outs[1]), bp = crossing(ins[1], outs[0]);
        addTri(surface, ap, aq, bq, ox, oy, oz);
        addTri(surface, ap, bq, bp, ox, oy, oz);
      }
    }
  }
  // ---- caps and boundary lines on the six faces ------------------------------------------------------------------
  // On every face the Kuhn split cuts each grid square along its diagonal from (low, low) to (high, high) of the two
  // free coordinates, so the face triangles below are exactly the tetrahedron faces lying on the cube face.
  const caps = [], lines = [];
  for (let axis = 0; axis < 3; axis++) {
    for (const side of [0, n]) {
      const normal = [0, 0, 0];
      normal[axis] = side === 0 ? -1 : 1;
      const node = (u, w) => { const ijk = [0, 0, 0]; ijk[axis] = side; ijk[(axis + 1) % 3] = u; ijk[(axis + 2) % 3] = w; return id(...ijk); };
      for (let u = 0; u < n; u++) for (let w = 0; w < n; w++) {
        const q00 = node(u, w), q10 = node(u + 1, w), q11 = node(u + 1, w + 1), q01 = node(u, w + 1);
        for (const tri of [[q00, q10, q11], [q00, q11, q01]]) {
          const poly = [], cut = [];
          for (let e = 0; e < 3; e++) {
            const a = tri[e], b = tri[(e + 1) % 3];
            const ia = values[a] < 0, ib = values[b] < 0;
            if (ia) poly.push(nodeVertex(a));
            if (ia !== ib) { const x = ia ? crossing(a, b) : crossing(b, a); poly.push(x); cut.push(x); }
          }
          for (let t = 1; t + 1 < poly.length; t++) {
            const before = caps.length;
            addTri(caps, poly[0], poly[t], poly[t + 1], ...normal);
            caps[before] = { tri: caps[before], normal };
          }
          if (cut.length === 2) lines.push([vertices[cut[0]], vertices[cut[1]]]);
        }
      }
    }
  }
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
