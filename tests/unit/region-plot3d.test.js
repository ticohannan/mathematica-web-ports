// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/region-plot3d.test.js — shared/region-plot3d.js: RegionPlot3D on a grid by marching tetrahedra with caps
// (a ball field: closed, consistently oriented mesh, Euler characteristic 2, vertices on the sphere, volume 4/3·π·r³;
// a ball cut by the box: caps and boundary lines on the face).
import { describe, it, expect } from 'vitest';
import { regionPlot3D, marchingTetrahedra, sampleGrid, gridCoord, gridIndex, meshVolume } from '../../shared/region-plot3d.js';

const ball = (c, r) => (x, y, z) => (x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2 - r * r;
const triangles = (v) => [...v.surface, ...v.caps.map((c) => c.tri)];
/** every undirected edge in exactly two triangles, every directed edge once (consistent orientation) */
function edgeCheck(tris) {
  const directed = new Map(), undirected = new Map();
  for (const t of tris) for (let e = 0; e < 3; e++) {
    const a = t[e], b = t[(e + 1) % 3];
    directed.set(`${a},${b}`, (directed.get(`${a},${b}`) ?? 0) + 1);
    const k = a < b ? `${a},${b}` : `${b},${a}`;
    undirected.set(k, (undirected.get(k) ?? 0) + 1);
  }
  return { edges: undirected.size, closed: [...undirected.values()].every((n) => n === 2), oriented: [...directed.values()].every((n) => n === 1) };
}

describe('grid', () => {
  it('coordinates: a + i (b − a)/n, the right end exact', () => {
    const c = gridCoord([0, 2 * Math.PI], 48);
    expect(c(0)).toBe(0);
    expect(c(1)).toBe((2 * Math.PI) / 48);
    expect(c(48)).toBe(2 * Math.PI);
    expect(gridCoord([-1, 2], 3)(1)).toBe(0);
    expect(gridIndex(2)(1, 2, 0)).toBe((1 * 3 + 2) * 3);
  });
  it('sampleGrid holds f at the nodes', () => {
    const f = (x, y, z) => x + 10 * y + 100 * z;
    const v = sampleGrid(f, [[0, 1], [0, 2], [0, 4]], 4);
    expect(v.length).toBe(125);
    expect(v[gridIndex(4)(1, 2, 3)]).toBe(f(0.25, 1, 3));
  });
});

describe('a ball inside the box', () => {
  // n = 31: no grid node lies exactly on the sphere (a node with field exactly 0 gives zero-area triangles, whose
  // orientation is arbitrary)
  const r = 1, n = 31;
  const v = regionPlot3D(ball([0, 0, 0], r), [[-1.5, 1.5], [-1.5, 1.5], [-1.5, 1.5]], n);
  it('is one closed, consistently oriented surface with no caps or face lines', () => {
    expect(Array.from(v.values).includes(0)).toBe(false);
    expect(v.caps).toEqual([]);
    expect(v.lines).toEqual([]);
    const e = edgeCheck(v.surface);
    expect(e.closed).toBe(true);
    expect(e.oriented).toBe(true);
    // a sphere: V − E + F = 2; every vertex used
    expect(v.vertices.length - e.edges + v.surface.length).toBe(2);
    expect(new Set(v.surface.flat()).size).toBe(v.vertices.length);
  });
  it('vertex counts: one vertex per crossed tetrahedron edge (no duplicates); 3 F = 2 E', () => {
    const e = edgeCheck(v.surface);
    expect(3 * v.surface.length).toBe(2 * e.edges);
    expect(new Set(v.vertices.map((p) => p.join(','))).size).toBe(v.vertices.length);
    expect(v.inside).toBe(Array.from(v.values).filter((x) => x < 0).length);
  });
  it('vertices lie on the sphere (linear interpolation: within h²) and the normals point outward', () => {
    const h = 3 / n;
    for (const p of v.vertices) expect(Math.abs(Math.hypot(...p) - r)).toBeLessThan(h * h);
    expect(meshVolume(v)).toBeGreaterThan(0);
  });
  it('encloses the volume 4/3·π·r³ (within 1 %)', () => {
    expect(Math.abs(meshVolume(v) / ((4 / 3) * Math.PI * r ** 3) - 1)).toBeLessThan(0.01);
  });
  it('regionPlot3D = marchingTetrahedra of the sampled grid', () => {
    const w = marchingTetrahedra(sampleGrid(ball([0, 0, 0], r), [[-1.5, 1.5], [-1.5, 1.5], [-1.5, 1.5]], n), [[-1.5, 1.5], [-1.5, 1.5], [-1.5, 1.5]], n);
    expect(w.vertices).toEqual(v.vertices);
    expect(w.surface).toEqual(v.surface);
  });
  it('an empty region gives an empty mesh', () => {
    const e = regionPlot3D(() => 1, [[0, 1], [0, 1], [0, 1]], 4);
    expect([e.vertices.length, e.surface.length, e.caps.length, e.lines.length, e.inside]).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('a ball cut by the box', () => {
  // centre on the face z = 0 of the box [−1, 1]² × [0, 1.5]: the upper half ball, closed by a disc cap on that face
  const r = 0.8, n = 32;
  const v = regionPlot3D(ball([0, 0, 0], r), [[-1, 1], [-1, 1], [0, 1.5]], n);
  it('caps lie on the face z = 0 with the outward normal (0, 0, −1); the whole mesh is closed and oriented', () => {
    expect(v.caps.length).toBeGreaterThan(0);
    for (const c of v.caps) {
      expect(c.normal).toEqual([0, 0, -1]);
      for (const i of c.tri) expect(v.vertices[i][2]).toBe(0);
    }
    const e = edgeCheck(triangles(v));
    expect(e.closed).toBe(true);
    expect(e.oriented).toBe(true);
    expect(v.vertices.length - e.edges + triangles(v).length).toBe(2);
  });
  it('boundary lines: the circle where the ball meets the face', () => {
    expect(v.lines.length).toBeGreaterThan(16);
    for (const [p, q] of v.lines) for (const x of [p, q]) {
      expect(x[2]).toBe(0);
      expect(Math.abs(Math.hypot(x[0], x[1]) - r)).toBeLessThan((2 / n) ** 2);
    }
  });
  it('encloses half the ball (within 1.5 %)', () => {
    expect(Math.abs(meshVolume(v) / ((2 / 3) * Math.PI * r ** 3) - 1)).toBeLessThan(0.015);
  });
});
