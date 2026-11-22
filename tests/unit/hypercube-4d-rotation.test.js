// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Gerard Balmens
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/hypercube-4d-rotation.test.js — the model of "Rotating a Hypercube in 4D". Expected values from hand
// derivations, from an independent computation in this file (the six plane rotations applied one after the other to
// each vertex, then the central projection written out) and from the notebook's saved states.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  initialState, initialSettings, evaluate, projectedVertices, ProjRot, Rxw, Ryw, Rzw, Rxy, Rxz, Ryz, V, edge, allface,
  deleteface, Delete, cf, angleText, facesPrim, VIEWPOINT,
} from '../../demos/hypercube-4d-rotation/model.js';
import { flatten } from '../../shared/graphics3d.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/hypercube-4d-rotation.original-states.json', 'utf8'));
const num = (x) => (x && typeof x === 'object' && 'n' in x ? x.n : x);
const settings = (k) => Object.fromEntries(Object.entries(fx.snapshots[k]).map(([n, v]) => [n, num(v)]));

/** independent: the rotation in the plane of coordinates i, j (0-based, x y z w) for a row vector, as the Grids read */
function turn(p, i, j, t) {
  const q = p.slice();
  q[i] = p[i] * Math.cos(t) + p[j] * Math.sin(t);
  q[j] = -p[i] * Math.sin(t) + p[j] * Math.cos(t);
  return q;
}
/** independent: Rxw (y z), Ryw (x z), Rzw (x y), Rxy (z w), Rxz (y w), Ryz (x w) one after the other, w + 2, then x/(1 + pw w) */
function project([x, y, z, w], { a, b, c, d, e, f, pw }) {
  let p = [x, y, z, w];
  p = turn(p, 1, 2, a); p = turn(p, 0, 2, b); p = turn(p, 0, 1, c);
  p = turn(p, 2, 3, d); p = turn(p, 1, 3, e); p = turn(p, 0, 3, f);
  const h = 1 + pw * (p[3] + 2);
  return { p4: p, xyz: [p[0] / h, p[1] / h, p[2] / h] };
}
const close = (u, v, tol = 1e-12) => u.every((x, k) => Math.abs(x - v[k]) <= tol);

describe('hypercube-4d-rotation model', () => {
  it('the opening state is the notebook\'s live state; Initial settings are the Manipulate\'s own values', () => {
    expect(initialState()).toEqual(fx.states[0]);
    expect(initialState()).toEqual(settings(1)); // snapshot 1 was taken at the live state
    expect(initialSettings()).toEqual({ hyp: 1, graph: 1, op: 0.4, axe: 0, pw: 1, dur: 20, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 });
  });

  it('each rotation matrix is a rotation that fixes the coordinate plane its control is named after', () => {
    const t = 0.7;
    // [matrix, the two coordinates it leaves alone] — W-X, W-Y, W-Z, X-Y, X-Z, Y-Z
    for (const [M, fixed] of [[Rxw(t), [0, 3]], [Ryw(t), [1, 3]], [Rzw(t), [2, 3]], [Rxy(t), [0, 1]], [Rxz(t), [0, 2]], [Ryz(t), [1, 2]]]) {
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        const dotij = M[i].reduce((s, x, k) => s + x * M[j][k], 0);
        expect(dotij).toBeCloseTo(i === j ? 1 : 0, 14); // orthogonal rows
      }
      for (const k of [...fixed, 4]) expect(M[k].map((x, j) => (j === k ? x - 1 : x)).every((x) => x === 0)).toBe(true);
    }
  });

  it('with all angles zero the projection divides x, y, z by 1 + pw (w + 2): ±1/2 for w = -1, ±1/4 for w = +1 at pw = 1', () => {
    const { vertices } = projectedVertices(initialSettings());
    expect(vertices[0]).toEqual([-0.5, -0.5, -0.5]);
    expect(vertices[6]).toEqual([0.5, 0.5, 0.5]);
    expect(vertices[8]).toEqual([-0.25, -0.25, -0.25]);
    expect(vertices[14]).toEqual([0.25, 0.25, 0.25]);
    const s = { ...initialSettings(), pw: 0.001 };
    expect(projectedVertices(s).vertices[0][0]).toBeCloseTo(-1 / 1.001, 15);
    expect(ProjRot(0, 0, 0, 0, 0, 0, 2, 1)[3]).toEqual([0, 0, 0, 1, 1]); // w → w + 2 and h → h + pw w
  });

  it('the caption: the first slider turns the picture about the X axis without distortion', () => {
    const t = 0.9;
    const before = projectedVertices(initialSettings()).vertices;
    const after = projectedVertices({ ...initialSettings(), a: t }).vertices;
    before.forEach((p, i) => {
      expect(after[i][0]).toBeCloseTo(p[0], 14);
      expect(Math.hypot(after[i][1], after[i][2])).toBeCloseTo(Math.hypot(p[1], p[2]), 14);
      expect(Math.atan2(after[i][2], after[i][1]) - Math.atan2(p[2], p[1])).toSatisfy((d) => Math.abs(Math.cos(d) - Math.cos(t)) < 1e-12);
    });
  });

  it('at every snapshot\'s settings the vertices agree with the plane rotations applied one by one, and stay on the sphere of radius 2', () => {
    for (const k of Object.keys(fx.snapshots)) {
      const s = settings(k);
      const { vertices } = projectedVertices(s);
      V.forEach((v, i) => {
        const { p4, xyz } = project(v, s);
        expect(Math.hypot(...p4)).toBeCloseTo(2, 13);
        expect(close(vertices[i], xyz, 1e-12)).toBe(true);
      });
    }
  });

  it('the stereographic projection of the original is a central projection from w = -2 - 1/pw onto w = -2 (§11 E-HY-01)', () => {
    for (const pw of [1, 0.5, 0.001]) {
      const eyeW = -2 - 1 / pw;
      // every point of the ray from the eye through a 4D point projects to the same 3D point
      const p = [0.3, -0.8, 1.1, 0.4], s = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, pw };
      const eye = [0, 0, 0, eyeW];
      const img = project(p, s).xyz;
      for (const t of [0.3, 2, 5]) {
        const q = eye.map((x, k) => x + t * (p[k] - x));
        expect(close(project(q, s).xyz, img, 1e-12)).toBe(true);
      }
      // points of the hyperplane w = -2 are left where they are
      expect(project([0.3, -0.8, 1.1, -2], s).xyz).toEqual([0.3, -0.8, 1.1]);
      // a stereographic projection needs its centre on the sphere through the vertices (radius 2): here it is outside
      expect(Math.abs(eyeW)).toBeGreaterThan(2.9);
    }
  });

  it('the hypercube choices: full 24 faces, "1 hole" without faces 2, 4, 8, 10, "3 holes" the 12 faces between the two cubes', () => {
    expect(Delete(allface, deleteface[0])).toEqual(allface);
    const one = Delete(allface, deleteface[1]);
    expect(one).toHaveLength(20);
    for (const q of [[1, 2, 6, 5], [3, 4, 8, 7], [9, 10, 14, 13], [11, 12, 16, 15]]) expect(one).not.toContainEqual(q);
    const three = Delete(allface, deleteface[2]);
    expect(three).toEqual(allface.slice(12));
    // every face is a square of the tesseract: four vertices that differ in exactly two coordinates
    for (const q of allface) {
      const differ = [0, 1, 2, 3].filter((k) => new Set(q.map((i) => V[i - 1][k])).size === 2);
      expect(differ).toHaveLength(2);
    }
    // the 32 edges join vertices that differ in one coordinate
    for (const [i, j] of edge) expect(V[i - 1].filter((x, k) => x !== V[j - 1][k])).toHaveLength(1);
    expect(new Set(edge.map((e) => e.join('-'))).size).toBe(32);
  });

  it('the picture: colour faces with VertexColors cf, blue faces, or edges with red spheres; the axes always in the plot range', () => {
    const s = settings(1);
    const g1 = flatten(evaluate(s).graphics);
    const surf = g1.find((p) => p.type === 'plotSurface');
    expect(surf.colors).toEqual(cf);
    expect(surf.opacity).toBe(0.4);
    expect(surf.triangles).toHaveLength(48);
    expect(g1.filter((p) => p.type === 'line' && p.thickness === 'Large' && p.opacity === 1 && p.color.join() === '0,0,0')).toHaveLength(24);
    // the axes at Opacity[0] (axe = 0), from -(2 - pw) to 2 - pw, Darker[Red] etc.
    const axes = g1.filter((p) => p.type === 'line' && p.opacity === 0);
    expect(axes[0].points).toEqual([[-1, 0, 0], [1, 0, 0]]);
    expect(axes[0].color).toEqual([2 / 3, 0, 0]);
    expect(evaluate({ ...s, axe: 1 }).view.opt1).toBe(1);
    expect(evaluate({ ...s, axe: true }).view.opt1).toBe(1); // the checkbox stores True (N-HY-03)
    const g2 = flatten(evaluate(settings(3)).graphics);
    const blue = g2.find((p) => p.type === 'plotSurface');
    expect(blue.colors).toBeNull();
    expect(blue.color).toEqual([0.2, 0.6, 0.9]);
    expect(blue.triangles).toHaveLength(40);
    const g3 = flatten(evaluate(settings(4)).graphics);
    expect(g3.some((p) => p.type === 'plotSurface')).toBe(false);
    const sph = g3.find((p) => p.type === 'sphere');
    expect(sph.centers).toHaveLength(16);
    expect(sph.radius).toBe(0.03);
    expect(sph.color).toEqual([1, 0, 0]);
    expect(g3.filter((p) => p.type === 'line' && p.opacity === 1)).toHaveLength(32);
    expect(evaluate(settings(4)).view.ptr1).toBeCloseTo(1.999, 15);
    expect(evaluate(settings(5)).view.faces).toBe(12);
  });

  it('the faces are listed far to near along the ViewPoint {1.1, -2.4, 1.4}', () => {
    const { vertices } = projectedVertices(settings(2));
    const surf = facesPrim(vertices, allface, cf);
    const depth = (t) => t.reduce((s, i) => s + vertices[i].reduce((u, x, k) => u + x * VIEWPOINT[k], 0), 0);
    // the first triangle of each square: depths of the squares' centres never decrease
    const squares = [];
    for (let k = 0; k < surf.triangles.length; k += 2) squares.push([...new Set([...surf.triangles[k], ...surf.triangles[k + 1]])]);
    const d = squares.map((q) => depth(q) / 4);
    for (let k = 1; k < d.length; k++) expect(d[k]).toBeGreaterThanOrEqual(d[k - 1] - 1e-15);
  });

  it('the angle column: NumberForm[Chop[x/N[Degree]], {4, 0}] as in the snapshots ("0", "3.", "326.")', () => {
    expect(evaluate(settings(1)).view.angles).toEqual(['0', '0', '3.', '3.', '0', '0']);
    expect(evaluate(settings(2)).view.angles).toEqual(['0', '0', '225.', '16.', '0', '0']);
    expect(evaluate(settings(3)).view.angles).toEqual(['0', '0', '98.', '153.', '0', '0']);
    expect(evaluate(settings(4)).view.angles).toEqual(['0', '0', '326.', '44.', '41.', '31.']);
    expect(evaluate(settings(5)).view.angles).toEqual(['0', '0', '33.', '51.', '0', '0']);
    expect(angleText(1e-13)).toBe('0');
    expect(angleText(0.004)).toBe('0.');
  });
});
