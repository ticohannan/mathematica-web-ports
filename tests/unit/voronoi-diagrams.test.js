// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Ed Pegg Jr, Jeff Bryant and Theodore W. Gray
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/voronoi-diagrams.test.js — the model of "Voronoi Diagrams". Expected values: the definition of a Voronoi
// cell (nearest site), the notebook's saved states and the colours measured on its snapshots.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { initialState, evaluate, voronoiCell, scaledValue, guardPoints, SAVED_LOC, RANGE } from '../../demos/voronoi-diagrams/model.js';
import { GRADIENTS, GRADIENT_NAMES, gradientColor } from '../../demos/voronoi-diagrams/gradients.js';
import { annotation, Cases } from '../../shared/graphics.js';
import { gradientsModule } from '../../tools/gradients-to-js.mjs';

const fx = JSON.parse(fs.readFileSync('tests/golden/voronoi-diagrams.original-states.json', 'utf8'));
const area = (c) => Math.abs(c.reduce((s, p, i) => s + p[0] * c[(i + 1) % c.length][1] - p[1] * c[(i + 1) % c.length][0], 0)) / 2;
const nearest = (sites, q) => sites.reduce((b, p, k) => ((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 < (sites[b][0] - q[0]) ** 2 + (sites[b][1] - q[1]) ** 2 ? k : b), 0);
const insideConvex = (c, q) => c.every((p, i) => { const r = c[(i + 1) % c.length]; return (r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0]) >= -1e-9; });

describe('voronoi-diagrams model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual({ loc: fx.states[0].loc, colors: 'BeachColors', mesh: false });
    expect(SAVED_LOC).toEqual(fx.snapshots['1'].loc);
  });

  it('the cells tile the square', () => {
    for (const k of Object.keys(fx.snapshots)) {
      const s = fx.snapshots[k], cells = s.loc.map((_, i) => voronoiCell(s.loc, i));
      expect(cells.reduce((t, c) => t + area(c), 0)).toBeCloseTo(100, 9);
      // every point of a grid lies in the cell of its nearest site
      for (let x = 0.05; x < 10; x += 0.37) for (let y = 0.05; y < 10; y += 0.41) {
        const k2 = nearest(s.loc, [x, y]);
        expect(insideConvex(cells[k2], [x, y]), `snapshot ${k} (${x}, ${y})`).toBe(true);
      }
    }
    // two sites: the perpendicular bisector
    expect(voronoiCell([[2, 5], [8, 5]], 0, RANGE)).toEqual([[0, 0], [5, 0], [5, 10], [0, 10]]);
    // a repeated site: the first one keeps the cell
    expect(voronoiCell([[2, 5], [2, 5], [8, 5]], 1)).toEqual([]);
  });

  it('fewer than three points get a random one', () => {
    const r = guardPoints([[1, 1], [2, 2]], () => [7, 3]);
    expect(r).toEqual([[1, 1], [2, 2], [7, 3]]);
    expect(guardPoints([[1, 1], [2, 2], [3, 3]], () => [7, 3])).toHaveLength(3);
    expect(guardPoints([[1, 1]], () => [7, 3])).toEqual([[1, 1], [7, 3], [7, 3]]); // evaluated again until three
    const rng = { randomReal: ([a, b]) => (a + b) / 2 };
    expect(evaluate({ loc: [[1, 1]], colors: 'BeachColors', mesh: false }, { rng }).state.loc).toEqual([[1, 1], [5, 5], [5, 5]]);
  });

  it('the gradient data', () => {
    // Mathematica's ColorData["Gradients"], exported by the owner (v0.1.36), in its order; gradients.js is generated from it
    const exp = JSON.parse(fs.readFileSync('tests/golden/voronoi-diagrams.gradients.json', 'utf8'));
    expect(exp.count).toBe(51);
    expect(GRADIENT_NAMES).toEqual(exp.gradients.map((g) => g.name));
    expect(fs.readFileSync('demos/voronoi-diagrams/gradients.js', 'utf8')).toBe(gradientsModule(exp));
    for (const g of exp.gradients) g.samples.forEach((c, i) => gradientColor(g.name, i / 64).forEach((v, j) => expect(v).toBeCloseTo(c[j], 4)));
    expect(GRADIENT_NAMES).toContain('BeachColors');
    for (const n of GRADIENT_NAMES) {
      const s = GRADIENTS[n].samples;
      expect(s[0][0]).toBe(0);
      expect(s.at(-1)[0]).toBe(1);
      for (let i = 1; i < s.length; i++) expect(s[i][0]).toBeGreaterThan(s[i - 1][0]);
    }
    expect(gradientColor('PlumColors', 0)).toEqual([0, 0, 0]);
    expect(gradientColor('BeachColors', -1)).toEqual(gradientColor('BeachColors', 0));
  });

  it('the colours at the snapshot settings: cell k has ColorData[colors][(k − 1)/(n − 1)]', () => {
    // independent of the measured data: a gradient read at (k − 1)/(n − 1) gives sample k of that snapshot exactly, and
    // the cells' colours follow the order of the sites, not their position
    for (const k of Object.keys(fx.snapshots)) {
      const s = fx.snapshots[k], r = evaluate(s), n = s.loc.length;
      expect(r.view.colors).toBe(s.colors);
      expect(r.view.n).toBe(n);
      r.view.fills.forEach((f, i) => expect(f).toEqual(gradientColor(s.colors, i / (n - 1))));
      // two snapshots with the same colour scheme and different sites would give the same colour list: the colours
      // depend only on n and the index
      const shuffled = evaluate({ ...s, loc: [...s.loc].reverse() });
      expect(shuffled.view.fills).toEqual(r.view.fills);
    }
    // every cell of the five snapshots against its colour measured on the picture (8-bit): within 3/255
    const measured = JSON.parse(fs.readFileSync('tests/golden/voronoi-diagrams.snapshot-colours.json', 'utf8'));
    for (const k of Object.keys(fx.snapshots)) {
      const fills = evaluate(fx.snapshots[k]).view.fills;
      measured[k].forEach((c, i) => fills[i].forEach((v, j) => expect(Math.abs(v * 255 - c[j]), `snapshot ${k} cell ${i + 1}`).toBeLessThanOrEqual(3)));
    }
    expect(scaledValue(1, 10)).toBe(0);
    expect(scaledValue(10, 10)).toBe(1);
    // borders only with "show borders"
    expect(annotation(evaluate(fx.snapshots['3']).graphics, 'borders')).toBeTruthy();
    // every inner edge once
    const segs = Cases(annotation(evaluate(fx.snapshots['3']).graphics, 'borders').g, 'Line')[0].pts;
    const keys = segs.map((sg) => sg.map((p) => p.map((v) => v.toFixed(6)).join(',')).sort().join(';'));
    expect(new Set(keys).size).toBe(keys.length);
    expect(annotation(evaluate(fx.snapshots['2']).graphics, 'borders')).toBeFalsy();
    expect(Cases(annotation(evaluate(fx.snapshots['2']).graphics, 'cell-1').g, 'Polygon')).toHaveLength(1);
  });
});
