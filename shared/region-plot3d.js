// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/region-plot3d.js — RegionPlot3D on a grid: the region where a field is negative, as a closed triangle mesh.
// The field is sampled on an (n+1)³ grid over a box; every grid cube is split into the six Kuhn tetrahedra along its
// main diagonal and each tetrahedron cut by linear interpolation along its edges (marching tetrahedra). Where the
// region meets the box faces it is closed by caps cut from the same face triangulation ("marching triangles"), so the
// mesh is watertight; the crossing segments of the face triangles are the boundary lines RegionPlot3D draws on the
// box faces. A node where the field is exactly 0 counts as outside (zero-area triangles may appear there). Pure: no
// DOM, no three.js.
//
//   const v = regionPlot3D((x, y, z) => x * x + y * y + z * z - 1, [[-1.5, 1.5], [-1.5, 1.5], [-1.5, 1.5]], 32);
//   v.vertices  [[x, y, z], …]            v.surface [[i, j, k], …] (outward)
//   v.caps      [{ tri: [i, j, k], normal }, …]   v.lines [[p, q], …]   v.inside (grid nodes inside)
//
// A caller with a faster way to fill the grid (e.g. trigonometry hoisted out of the loops) samples it itself and
// calls marchingTetrahedra(values, ranges, n) with the same node layout (gridIndex) and coordinates (gridCoord).

/** The coordinate of grid index i of n on the interval [a, b]: a + i (b − a)/n, exactly b at i = n. */
export const gridCoord = ([a, b], n) => { const h = (b - a) / n; return (i) => (i === n ? b : a + i * h); };
/** The index of grid node (i, j, k) of an (n+1)³ grid in the values array. */
export const gridIndex = (n) => { const N = n + 1; return (i, j, k) => (i * N + j) * N + k; };

/** The field f(x, y, z) at the nodes of the (n+1)³ grid over ranges {{x0, x1}, {y0, y1}, {z0, z1}} (Float64Array). */
export function sampleGrid(f, ranges, n) {
  const N = n + 1;
  const [cx, cy, cz] = ranges.map((r) => gridCoord(r, n));
  const values = new Float64Array(N * N * N);
  const id = gridIndex(n);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) values[id(i, j, k)] = f(cx(i), cy(j), cz(k));
  return values;
}

// the six Kuhn tetrahedra of a cube: corners as bit masks (1 = +x, 2 = +y, 4 = +z), paths 0 → … → 7
const KUHN = [[1, 2, 4], [1, 4, 2], [2, 1, 4], [2, 4, 1], [4, 1, 2], [4, 2, 1]].map(([p, q]) => [0, p, p | q, 7]);

/**
 * The region values < 0 of a sampled grid (sampleGrid layout) as a closed mesh. Returns
 *   { vertices ([[x, y, z], ...]), surface ([[i, j, k], ...] vertex indexes, outward), caps ([{ tri: [i, j, k], normal }]),
 *     lines ([[p, q], ...]), inside (number of grid nodes inside) }
 * Vertices are shared by key (a grid node, or the crossing on the edge between two grid nodes), so the mesh is
 * closed: every edge belongs to exactly two triangles of surface ∪ caps.
 */
export function marchingTetrahedra(values, ranges, n) {
  const N = n + 1;
  const [cx, cy, cz] = ranges.map((r) => gridCoord(r, n));
  const id = gridIndex(n);
  let inside = 0;
  for (let q = 0; q < values.length; q++) if (values[q] < 0) inside++;
  const pos = (nid) => { const k = nid % N, j = ((nid - k) / N) % N, i = (nid - k - j * N) / (N * N); return [cx(i), cy(j), cz(k)]; };
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
  return { vertices, surface, caps, lines, inside };
}

/**
 * regionPlot3D(f, ranges, n): the region f(x, y, z) < 0 within the box `ranges` on an (n+1)³ grid, as a closed mesh:
 * { n, values, vertices, surface, caps, lines, inside } (marchingTetrahedra). Mathematica's RegionPlot3D samples
 * adaptively; this one samples uniformly.
 */
export function regionPlot3D(f, ranges, n) {
  const values = sampleGrid(f, ranges, n);
  return { n, values, ...marchingTetrahedra(values, ranges, n) };
}

/** The volume enclosed by a closed mesh (surface ∪ caps of marchingTetrahedra), by the divergence theorem. */
export function meshVolume({ vertices, surface, caps }) {
  let v6 = 0;
  for (const t of [...surface, ...caps.map((c) => c.tri)]) {
    const [a, b, c] = t.map((i) => vertices[i]);
    v6 += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  return v6 / 6;
}
