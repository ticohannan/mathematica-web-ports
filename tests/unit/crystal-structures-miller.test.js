// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Yunfeng Shi and Adam Bross
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/crystal-structures-miller.test.js — the model of "Simple Crystal Structures and Miller Indices". Expected
// values from the notebook's saved states, from crystallography by hand (contact radii, site counts, lattice planes)
// and from small independent computations in the tests.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  initialState, evaluate, atomGroups, cellCorners, boxEdges, millerPlanes, planeOffsets, boxRatios, boxTicks, table,
  CRYSTAL_TYPES, SQRT3, SQRT83,
} from '../../demos/crystal-structures-miller/model.js';
import { flatten } from '../../shared/graphics3d.js';
import { ERRATA, CORRECTED, ORIGINAL } from '../../shared/errata.js';

const saved = JSON.parse(fs.readFileSync('tests/golden/crystal-structures-miller.original-states.json', 'utf8'));
const S0 = initialState();
const fixed = (s) => ({ ...s, [ERRATA]: CORRECTED });
const centers = (s) => atomGroups(s).flatMap((g) => g.centers);
/** the smallest distance between two distinct centres (brute force) */
function nearest(points) {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    const d = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1], points[i][2] - points[j][2]);
    if (d > 1e-9) best = Math.min(best, d);
  }
  return best;
}

describe('crystal-structures-miller model', () => {
  it('the opening state: the Manipulate\'s initial values = the live state = snapshot 1', () => {
    expect(S0).toEqual(saved.specs);
    expect(S0).toEqual(saved.states[0]);
    expect({ ...S0 }).toEqual({ ...saved.snapshots['1'] });
    const { view } = evaluate(S0);
    expect(view).toMatchObject({ atoms: 8, cell: null, planes: null, plotRange: [[-1, 2], [-1, 2], [-1, 2]], boxRatios: [1, 1, 1] });
  });

  it('the structures: popup values and atoms per Table (rp + 1)³ times the sites of each structure', () => {
    expect(CRYSTAL_TYPES).toEqual(['SC', 'BCC', 'FCC', 'HCP', 'CsCl', 'Diamond', 'NaCl', 'ZnS']);
    const sites = { SC: 1, BCC: 2, FCC: 4, HCP: 4, CsCl: 2, Diamond: 8, NaCl: 8, ZnS: 8 };
    for (const rp of [0, 1, 2, 5]) for (const t of CRYSTAL_TYPES) {
      expect(evaluate({ ...S0, CrystalType: t, rp }).view.atoms).toBe(sites[t] * (rp + 1) ** 3);
    }
    // Table order: x outermost, z innermost
    expect(table(1, [0, 0, 0]).slice(0, 3)).toEqual([[0, 0, 0], [0, 0, 1], [0, 1, 0]]);
  });

  it('contact radii by hand: SC 1/2, BCC √3/4, FCC √2/4, Diamond √3/8, HCP 1/2, NaCl 1/4 + 1/4, CsCl √3/4 + √3/4', () => {
    const half = (t) => nearest(centers({ ...S0, CrystalType: t, rp: 1 })) / 2;
    expect(half('SC')).toBeCloseTo(0.5, 12);
    expect(half('BCC')).toBeCloseTo(Math.sqrt(3) / 4, 12);
    expect(half('FCC')).toBeCloseTo(Math.sqrt(2) / 4, 12);
    expect(half('Diamond')).toBeCloseTo(Math.sqrt(3) / 8, 12);
    expect(half('HCP')).toBeCloseTo(0.5, 12); // a = 1 and c = √(8/3): ideal close packing, 12 neighbours at 1
    expect(half('NaCl')).toBeCloseTo(0.25, 12);
    expect(half('CsCl')).toBeCloseTo(Math.sqrt(3) / 4, 12);
    // HCP: every atom of the second layer has three neighbours in the first at distance 1
    const hcp = centers({ ...S0, CrystalType: 'HCP', rp: 1 });
    const b = [1, SQRT3 / 3, SQRT83 / 2]; // a B-layer site above the triangle (1, 0), (1/2, √3/2), (3/2, √3/2)
    expect(hcp.filter((p) => Math.abs(Math.hypot(p[0] - b[0], p[1] - b[1], p[2] - b[2]) - 1) < 1e-12 && p[2] === 0)).toHaveLength(3);
  });

  it('colours and radii: NaCl and CsCl red radius / blue radius2; ZnS blue uses radius (E-CM-01); the others default', () => {
    const s = { ...S0, radius: 0.3, radius2: 0.2 };
    const by = (t, st = s) => atomGroups({ ...st, CrystalType: t }).map((g) => [g.color, g.radius]);
    expect(by('NaCl')).toEqual([...Array(4).fill(['Red', 0.3]), ...Array(4).fill(['Blue', 0.2])]);
    expect(by('CsCl')).toEqual([['Red', 0.3], ['Blue', 0.2]]);
    expect(by('ZnS')).toEqual([...Array(4).fill(['Red', 0.3]), ...Array(4).fill(['Blue', 0.3])]);
    expect(by('Diamond')).toEqual(Array(8).fill([null, 0.3]));
    expect(by('SC').concat(by('BCC'), by('FCC'), by('HCP')).every(([c, r]) => c === null && r === 0.3)).toBe(true);
    // NaCl's blue sites are the octahedral holes (1/2, 0, 0) …; ZnS's the tetrahedral (1/4, 1/4, 1/4) …
    expect(atomGroups({ ...s, CrystalType: 'NaCl' }).slice(4).map((g) => g.offset)).toEqual([[0.5, 0, 0], [0.5, 0.5, 0.5], [0, 0, 0.5], [0, 0.5, 0]]);
    expect(atomGroups({ ...s, CrystalType: 'ZnS' }).slice(4).map((g) => g.offset)).toEqual([[0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]]);
    // the picture: Red = RGB(1, 0, 0), Blue = RGB(0, 0, 1), the others without a colour (the default surface)
    const prims = flatten(evaluate({ ...s, CrystalType: 'NaCl' }).graphics).filter((p) => p.type === 'sphere');
    expect(prims.map((p) => p.color)).toEqual([...Array(4).fill([1, 0, 0]), ...Array(4).fill([0, 0, 1])]);
    expect(flatten(evaluate(S0).graphics).find((p) => p.type === 'sphere').color).toBeNull();
  });

  it('the unit cell: Cuboid from {sx, sy, sz}, 1 × 1 × 1 or 1 × √3 × √(8/3) for HCP, thick black edges, Lighter[Blue] face', () => {
    expect(cellCorners({ ...S0, sx: 1, sy: 0, sz: 2 })).toEqual([[1, 0, 2], [2, 1, 3]]);
    expect(cellCorners({ ...S0, CrystalType: 'HCP', sy: 1 })).toEqual([[0, 1, 0], [1, 1 + SQRT3, SQRT83]]);
    const edges = boxEdges([[0, 0, 0], [1, 2, 3]]);
    expect(edges).toHaveLength(12);
    const lengths = edges.map(([p, q]) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])).sort();
    expect(lengths).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
    const g = flatten(evaluate({ ...S0, DrawCell: true, DrawCubeFace: true }).graphics);
    const cub = g.find((p) => p.type === 'cuboid');
    expect(cub).toMatchObject({ min: [0, 0, 0], max: [1, 1, 1], edgeForm: 'None' });
    expect(cub.color.map((c) => +c.toFixed(12))).toEqual([+(1 / 3).toFixed(12), +(1 / 3).toFixed(12), 1]);
    const lines = g.filter((p) => p.type === 'line');
    expect(lines).toHaveLength(12);
    expect(lines.every((l) => l.color.join() === '0,0,0' && l.thickness === 'Large')).toBe(true);
    // no face: no cuboid, only the edges; no cell: Point[{0, 0, 0}]
    expect(flatten(evaluate({ ...S0, DrawCell: true }).graphics).some((p) => p.type === 'cuboid')).toBe(false);
    expect(flatten(evaluate(S0).graphics).filter((p) => p.type === 'point').map((p) => p.points)).toEqual([[[0, 0, 0]], [[0, 0, 0]]]);
  });

  it('Miller planes of the cubic structures: h x + k y + l z = d, d = -3 rp … 3 rp, zero and negative indices', () => {
    const on = (s, P, d, p) => s.m * p[0] + s.n * p[1] + s.r * p[2] - d;
    const point = (P, d, u, v) => (P.kind === 'Plot3D' ? [u, v, P.f(d)(u, v)] : P.f(d)(u, v));
    for (const [m, n, r, kind] of [[1, 1, 1, 'Plot3D'], [-1, 2, 3, 'Plot3D'], [0, 0, -2, 'Plot3D'], [1, -1, 0, 'y'], [0, 3, 0, 'y'], [-4, 0, 0, 'x'], [2, 0, 0, 'x']]) {
      const s = { ...S0, rp: 2, DrawPlanes: true, m, n, r };
      const P = millerPlanes(s);
      expect(P.kind).toBe(kind);
      expect(P.ds).toEqual([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]);
      for (const d of P.ds) for (const [u, v] of [[0, 0], [1.5, 0.25], [3, 3]]) expect(on(s, P, d, point(P, d, u, v))).toBeCloseTo(0, 12);
    }
    // a zero index: the planes are parallel to that axis (intercept at infinity)
    const P = millerPlanes({ ...S0, m: 0, n: 1, r: 1 });
    expect(P.f(1)(0, 0)).toBe(P.f(1)(2, 0));
    // (0 0 0) is not a plane: the original's last branch draws x = d (Q-CM-03)
    const Z = millerPlanes({ ...S0, m: 0, n: 0, r: 0 });
    expect(Z.kind).toBe('x000');
    expect(Z.ds.map((d) => Z.f(d)(0.3, 0.7))).toEqual([-3, -2, -1, 0, 1, 2, 3].map((d) => [d, 0.3, 0.7]));
    // a negative index gives the same family as the positive one (d runs symmetrically): (-1 0 0) = (1 0 0)
    const xs = (m) => millerPlanes({ ...S0, m, n: 0, r: 0 }).ds.map((d) => millerPlanes({ ...S0, m, n: 0, r: 0 }).f(d)(0, 0)[0] + 0).sort();
    expect(xs(-1)).toEqual(xs(1));
    // no repeats: the single plane d = 0 through the origin
    expect(planeOffsets({ ...S0, rp: 0 })).toEqual([0]);
  });

  it('the planes are clipped to the box: Plot3D over {x, 0, rp+1}, {y, 0, rp+1}, z cut at -1 … rp+1', () => {
    const s = { ...S0, rp: 1, DrawPlanes: true, m: 1, n: 1, r: 1 };
    const surf = flatten(evaluate(s).graphics).filter((p) => p.type === 'plotSurface');
    expect(surf).toHaveLength(7);
    for (const p of surf) for (const q of p.points) {
      expect(q[0]).toBeGreaterThanOrEqual(0); expect(q[0]).toBeLessThanOrEqual(2);
      expect(q[1]).toBeGreaterThanOrEqual(0); expect(q[1]).toBeLessThanOrEqual(2);
      expect(q[2]).toBeGreaterThanOrEqual(-1 - 1e-12); expect(q[2]).toBeLessThanOrEqual(2 + 1e-12);
    }
    // d = -3 lies outside the box (x + y + z ≥ -1): no triangles; d = 3 cuts it
    expect(surf[0].triangles).toHaveLength(0);
    expect(surf[6].triangles.length).toBeGreaterThan(0);
    // Mesh -> None
    expect(surf.every((p) => p.meshLines.length === 0)).toBe(true);
    // l = 0: ParametricPlot3D surfaces, one per d
    const par = flatten(evaluate({ ...s, r: 0 }).graphics).filter((p) => p.type === 'parametricSurface');
    expect(par).toHaveLength(7);
    expect(par[0]).toMatchObject({ u: [0, 2], v: [0, 2], mesh: 'None' });
  });

  it('BoxRatios: {1, 1, 0.4} from the Plot3D when planes with l ≠ 0 are shown (Q-CM-05), else the cube', () => {
    expect(boxRatios({ ...S0, DrawPlanes: true })).toEqual([1, 1, 0.4]);
    expect(boxRatios({ ...S0, DrawPlanes: true, r: 0 })).toEqual([1, 1, 1]);
    expect(boxRatios({ ...S0, DrawPlanes: false })).toEqual([1, 1, 1]);
    expect(evaluate({ ...S0, DrawPlanes: true }).graphics.options).toMatchObject({ BoxRatios: [1, 1, 0.4], PlotRange: [[-1, 2], [-1, 2], [-1, 2]], SphericalRegion: true, Axes: true });
  });

  it('the ticks: every integer for the snapshots\' boxes (-1 … 2, -1 … 3), every second for -1 … 6', () => {
    const major = (r) => boxTicks(r).filter((t) => t[1] !== '').map((t) => t[1]);
    expect(major([-1, 2])).toEqual(['-1', '0', '1', '2']);
    expect(major([-1, 3])).toEqual(['-1', '0', '1', '2', '3']);
    expect(major([-1, 6])).toEqual(['0', '2', '4', '6']);
  });

  it('at each snapshot\'s settings: structure, atoms and cell as the pictures show', () => {
    const v = (k) => evaluate(saved.snapshots[k]).view;
    expect(v('1')).toMatchObject({ atoms: 8, cell: null });
    expect(v('2')).toMatchObject({ atoms: 27, cell: { corners: [[0, 0, 0], [1, 1, 1]], face: true }, plotRange: [[-1, 3], [-1, 3], [-1, 3]] });
    expect(v('3')).toMatchObject({ atoms: 54, cell: { face: false } });
    expect(v('4')).toMatchObject({ atoms: 216, cell: { face: false } });
    expect(v('4').groups.map((g) => g.radius)).toEqual([...Array(4).fill(0.28800000000000003), ...Array(4).fill(0.259)]);
  });

});

describe('corrected mode (E-CM)', () => {
  it('E-CM-01 … E-CM-05: the corrections, and the original without them', () => {
    // E-CM-01: ZnS blue spheres with radius2
    const z = { ...S0, CrystalType: 'ZnS', radius: 0.3, radius2: 0.2 };
    expect(atomGroups(fixed(z)).slice(4).every((g) => g.radius === 0.2)).toBe(true);
    expect(atomGroups({ ...z, [ERRATA]: ORIGINAL }).slice(4).every((g) => g.radius === 0.3)).toBe(true);
    // E-CM-02: the HCP (1 1 0) planes: original y = √3 d − x misses the atom (1/2, √3/2, 0); corrected y = √3 (d − x) hits it
    const h = { ...S0, CrystalType: 'HCP', rp: 1, m: 1, n: 1, r: 0 };
    const dOf = (s) => { const P = millerPlanes(s); const y0 = P.f(0)(0.5, 0)[1], y1 = P.f(1)(0.5, 0)[1]; return (SQRT3 / 2 - y0) / (y1 - y0); };
    expect(Math.abs(dOf(h) - Math.round(dOf(h)))).toBeGreaterThan(0.1);
    expect(dOf(fixed(h))).toBeCloseTo(1, 12);
    // and with l ≠ 0: corrected planes x/1 + y/√3 + z/√(8/3) = d through the lattice points; cubic unchanged
    const P = millerPlanes(fixed({ ...h, r: 1 }));
    for (const p of [[0.5, SQRT3 / 2, 0], [0, SQRT3 / 3, SQRT83 / 2], [1, 0, SQRT83]]) {
      const d = p[0] + p[1] / SQRT3 + p[2] / SQRT83;
      expect(P.f(d)(p[0], p[1])).toBeCloseTo(p[2], 12);
    }
    const c = { ...S0, m: 2, n: -1, r: 3 };
    expect(millerPlanes(fixed(c)).f(2)(0.3, 0.4)).toBeCloseTo(millerPlanes(c).f(2)(0.3, 0.4), 12);
    // E-CM-03: the HCP cell shifted by whole cells
    expect(cellCorners(fixed({ ...h, sx: 1, sy: 1, sz: 1 }))).toEqual([[1, SQRT3, SQRT83], [2, 2 * SQRT3, 2 * SQRT83]]);
    expect(cellCorners({ ...h, sx: 1, sy: 1, sz: 1 })).toEqual([[1, 1, 1], [2, 1 + SQRT3, 1 + SQRT83]]);
    // E-CM-04: (4 0 0) with one repeat: the original's x = d/4 for d ≤ 3 misses x = 1; corrected D = 8
    const f = { ...S0, m: 4, n: 0, r: 0 };
    expect(planeOffsets(f).map((d) => d / 4)).not.toContain(1);
    expect(planeOffsets(fixed(f))).toHaveLength(17); // D = max(3, 4 · 2) = 8
    expect(planeOffsets(fixed(f)).map((d) => d / 4)).toContain(1);
    expect(planeOffsets(fixed({ ...S0, rp: 2 }))).toHaveLength(19); // max(6, 3 · 3) = 9
    // E-CM-05: (0 0 0) draws nothing when corrected, the planes x = d in the original
    const zero = { ...S0, DrawPlanes: true, m: 0, n: 0, r: 0 };
    expect(evaluate(fixed(zero)).view.planes).toEqual({ kind: 'none', ds: [] });
    expect(flatten(evaluate(fixed(zero)).graphics).some((p) => p.type === 'parametricSurface')).toBe(false);
    expect(flatten(evaluate(zero).graphics).filter((p) => p.type === 'parametricSurface')).toHaveLength(7);
  });
});
