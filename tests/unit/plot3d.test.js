// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/plot3d.test.js — the pure parts of shared/plot3d.js: box edges, tick segments, the BoxRatios group, the
// lit-surface material.
import { describe, it, expect } from 'vitest';
import { boxEdgeSegments, tickSegments, scaledBoxGroup, litSurfaceMaterial, triangleMesh } from '../../shared/plot3d.js';

const segs = (flat) => Array.from({ length: flat.length / 6 }, (_, i) => [flat.slice(6 * i, 6 * i + 3), flat.slice(6 * i + 3, 6 * i + 6)]);

describe('shared/plot3d.js', () => {
  it('boxEdgeSegments: the 12 edges, 4 along each axis in the order x, y, z', () => {
    const box = [[0, 1], [-2, 2], [3, 6]];
    const s = segs(boxEdgeSegments(box));
    expect(s.length).toBe(12);
    s.forEach(([p, q], i) => {
      const axis = Math.floor(i / 4);
      const d = p.map((x, k) => q[k] - x);
      expect(d.map((x, k) => (k === axis ? x : Math.abs(x)))).toEqual([0, 1, 2].map((k) => (k === axis ? box[k][1] - box[k][0] : 0)));
      for (const x of [p, q]) x.forEach((c, k) => expect(box[k]).toContain(c));
    });
    expect(new Set(s.map((e) => JSON.stringify(e))).size).toBe(12);
  });
  it('tickSegments: per value, per edge; length a fraction of the scaled box; values outside an axis range skipped', () => {
    const box = [[0, 2], [0, 4], [-1, 1]], ratios = [1, 1, 0.5];
    const t = segs(tickSegments(box, ratios, [-1, 0, 1, 3], (v) => (v === 0 ? 0.1 : 0.05), [
      { axis: 0, at: [0, 0, -1], toward: 1, sign: 1 },
      { axis: 2, at: [0, 4, 0], toward: 1, sign: -1 },
    ]));
    expect(t).toEqual([
      [[0, 4, -1], [0, 4 - 0.05 * 4, -1]], // v = −1: only the z edge
      [[0, 0, -1], [0, 0.1 * 4, -1]], [[0, 4, 0], [0, 4 - 0.1 * 4, 0]], // v = 0
      [[1, 0, -1], [1, 0.05 * 4, -1]], [[0, 4, 1], [0, 4 - 0.05 * 4, 1]], // v = 1
      // v = 3: outside both ranges
    ]);
  });
  it('scaledBoxGroup maps the box onto the scaled box with centre 0 and sides boxRatios', () => {
    const g = scaledBoxGroup([[-2, 2], [0, 1], [10, 20]], [1, 1, 0.4]);
    g.updateMatrixWorld();
    const map = (p) => { const v = g.position.clone().add(g.scale.clone().multiply({ x: p[0], y: p[1], z: p[2] })); return v.toArray(); };
    [[[-2, 0, 10], [-0.5, -0.5, -0.2]], [[2, 1, 20], [0.5, 0.5, 0.2]]].forEach(([p, q]) => map(p).forEach((x, i) => expect(x).toBeCloseTo(q[i], 14)));
  });
  it('litSurfaceMaterial: uniforms from the lighting option, translucent below opacity 1, two-sided', () => {
    const lighting = { ambient: 0.2, diffuse: 0.8, direction: [0, 0, 2], specular: 0.1, shininess: 7 };
    const m = litSurfaceMaterial([1, 0.5, 0], { lighting });
    expect(m.uniforms.lightDir.value.toArray()).toEqual([0, 0, 1]);
    expect([m.uniforms.ambient.value, m.uniforms.diffuse.value, m.uniforms.specular.value, m.uniforms.shininess.value]).toEqual([0.2, 0.8, 0.1, 7]);
    expect([m.transparent, m.depthWrite, m.side, m.polygonOffset]).toEqual([false, true, 2, true]);
    const t = litSurfaceMaterial([1, 1, 1], { lighting, opacity: 0.5 });
    expect([t.transparent, t.depthWrite, t.uniforms.alpha.value]).toEqual([true, false, 0.5]);
    const mesh = triangleMesh({ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], normals: [0, 0, 1, 0, 0, 1, 0, 0, 1] }, m);
    expect(mesh.geometry.getAttribute('position').count).toBe(3);
  });
});
