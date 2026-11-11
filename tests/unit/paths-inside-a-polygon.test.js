// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Stan Wagon and Karen Saxe
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/paths-inside-a-polygon.test.js — the model of "Paths inside a Polygon". Expected values: the notebook's
// saved snapshot settings with the paths read off the snapshot pictures, hand geometry, and an independent shortest-path
// planner written here (visibility graph over all vertices with an exact segment-in-polygon test).
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  initialState, evaluate, bodyPoints, POLYGONS, DEFAULTS, Round, SignedArea, Orientation, IntersectClosed, IntersectOpen,
  BetweenSW, InsideTri, InsidePoly, Triangulate, ReflexVertexQ, VisibleReflexEdges, ShortestInsidePath,
} from '../../demos/paths-inside-a-polygon/model.js';
import { annotation, Cases } from '../../shared/graphics.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/paths-inside-a-polygon.original-states.json', 'utf8'));

// ---- the independent planner --------------------------------------------------------------------------------------
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const onSeg = (p, a, b) => cross(a, b, p) === 0 && Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
function inClosed(poly, p) { // ray casting; the boundary counts as inside
  let c = false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (onSeg(p, a, b)) return true;
    if ((a[1] > p[1]) !== (b[1] > p[1]) && a[0] + ((p[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1]) > p[0]) c = !c;
  }
  return c;
}
function segInside(poly, a, b) { // no proper crossing, and every piece between boundary contacts has its midpoint inside
  const ts = [0, 1];
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i], d = poly[(i + 1) % poly.length];
    const d1 = cross(a, b, c), d2 = cross(a, b, d), d3 = cross(c, d, a), d4 = cross(c, d, b);
    if (d1 * d2 < 0 && d3 * d4 < 0) return false;
    for (const p of [c, d]) if (onSeg(p, a, b)) ts.push(Math.hypot(p[0] - a[0], p[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  ts.sort((x, y) => x - y);
  for (let k = 0; k + 1 < ts.length; k++) {
    if (ts[k + 1] - ts[k] < 1e-12) continue;
    const t = (ts[k] + ts[k + 1]) / 2;
    if (!inClosed(poly, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])) return false;
  }
  return true;
}
function referenceLength(poly, s, f) {
  const v = [...poly, s, f], N = v.length, dist = Array(N).fill(Infinity), done = Array(N).fill(false);
  dist[N - 2] = 0;
  for (;;) {
    let u = -1;
    for (let k = 0; k < N; k++) if (!done[k] && dist[k] < Infinity && (u < 0 || dist[k] < dist[u])) u = k;
    if (u < 0) break;
    done[u] = true;
    for (let k = 0; k < N; k++) {
      const w = Math.hypot(v[u][0] - v[k][0], v[u][1] - v[k][1]);
      if (!done[k] && dist[u] + w < dist[k] - 1e-9 && segInside(poly, v[u], v[k])) dist[k] = dist[u] + w;
    }
  }
  return dist[N - 1];
}
const bbox = (P) => [Math.min(...P.map((p) => p[0])), Math.max(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[1]))];
const onBoundary = (P, p) => P.some((a, i) => onSeg(p, a, P[(i + 1) % P.length]));

describe('paths-inside-a-polygon model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual({ i: 1, pt: [[500, 100], [500, 910]] });
    expect(evaluate(initialState()).state).toEqual({ i: 1, pt: [[500, 100], [500, 910]] });
  });

  it('the two polygons as evaluated', () => {
    expect(POLYGONS[1]).toHaveLength(39);
    expect(POLYGONS[1].slice(0, 3)).toEqual([[983, 649], [638, 523], [762, 611]]); // (723, 558) dropped by the ";"
    expect(POLYGONS[1]).toContainEqual([872, 578]);
    expect(POLYGONS[2]).toHaveLength(52);
    expect(POLYGONS[2][0]).toEqual([423, 804]); // Reverse@{…}
    expect(Orientation(POLYGONS[1])).toBe(1);
    expect(Orientation(POLYGONS[2])).toBe(1);
  });

  it('the geometric predicates', () => {
    expect(SignedArea([[0, 0], [2, 0], [0, 2]])).toBe(2);
    expect(Orientation([[0, 0], [0, 2], [2, 0]])).toBe(-1);
    expect(Orientation([[0, 0], [1, 1], [3, 3]])).toBe(0);
    expect(IntersectOpen([[0, 0], [2, 2]], [[0, 2], [2, 0]])).toBe(true);
    expect(IntersectOpen([[0, 0], [2, 2]], [[1, 1], [2, 0]])).toBe(false); // touching only
    expect(IntersectClosed([[0, 0], [2, 2]], [[1, 1], [2, 0]])).toBe(true);
    expect(BetweenSW([0, 0], [4, 0], [2, 0])).toBe(true);
    expect(BetweenSW([0, 0], [4, 0], [5, 0])).toBe(false);
    expect(InsideTri([[0, 0], [4, 0], [0, 4]], [2, 2])).toBe(true); // on the hypotenuse: closed triangle
    expect(InsideTri([[0, 0], [0, 4], [4, 0]], [3, 3])).toBe(false);
    // reflex: "not a left turn"; a straight vertex counts as reflex
    expect(ReflexVertexQ([[0, 0], [2, 0], [2, 2], [1, 1], [0, 2]], 4)).toBe(true);
    expect(ReflexVertexQ([[0, 0], [1, 0], [2, 0], [2, 2]], 2)).toBe(true);
    expect(ReflexVertexQ([[0, 0], [2, 0], [2, 2], [0, 2]], 2)).toBe(false);
  });

  it('the triangulation covers the polygon', () => {
    for (const i of [1, 2]) {
      const P = POLYGONS[i], tris = Triangulate(P);
      expect(tris).toHaveLength(P.length - 2);
      const area = tris.reduce((s, t) => s + Math.abs(SignedArea(t.map((k) => P[k - 1]))), 0);
      expect(area).toBe(SignedArea(P));
      for (const t of tris) expect(Orientation(t.map((k) => P[k - 1]))).toBe(1);
    }
  });

  it('the body rounds and snaps the points', () => {
    expect(Round(2.5)).toBe(2);
    expect(Round(3.5)).toBe(4);
    expect(Round(-0.5) === 0).toBe(true);
    expect(bodyPoints(1, [[500.4, 300.6], [500, 910]])).toEqual([[500, 301], [500, 910]]);
    // the default pair of the other polygon becomes this polygon's pair
    expect(bodyPoints(2, DEFAULTS[1])).toEqual(DEFAULTS[2]);
    // a point outside moves to the nearest vertex
    expect(InsidePoly(POLYGONS[1], [990, 990])).toBe(false);
    expect(bodyPoints(1, [[990, 990], [500, 910]])[0]).toEqual([963, 889]);
  });

  it('the visibility graph at the snapshot settings', () => {
    expect(VisibleReflexEdges(POLYGONS[1]).every(([a, b]) => a < b)).toBe(true);
    const r1 = evaluate(initialState());
    expect(r1.view.reflex).toBe(14);
    expect(r1.view.edges).toHaveLength(24);
    const r2 = evaluate({ i: 2, pt: [[909, 656], [326, 1152]] });
    expect(r2.view.reflex).toBe(24);
    for (const e of r2.view.edges) {
      const v = [...POLYGONS[2], ...r2.view.pt];
      expect(segInside(POLYGONS[2], v[e[0] - 1], v[e[1] - 1]), `edge ${e}`).toBe(true);
    }
    expect(Cases(annotation(r2.graphics, 'graph-edges').g, 'Line')).toHaveLength(r2.view.edges.length);
  });

  it('the shortest path at the snapshot settings', () => {
    // the vertices of the red paths of the four snapshot pictures
    const want = {
      1: [[500, 100], [872, 578], [638, 523], [382, 510], [238, 532], [404, 872], [500, 910]],
      2: [[738, 95], [872, 578], [638, 523], [382, 510], [238, 532], [404, 872], [632, 909]],
      3: [[909, 656], [924, 522], [924, 483], [831, 389], [745, 389], [534, 571], [360, 1042], [326, 1152]],
      4: [[928, 184], [722, 358], [642, 358], [529, 293]],
    };
    for (const k of ['1', '2', '3', '4']) {
      const s = fx.snapshots[k];
      const st = Array.isArray(s.pt[0]) ? s : initialState(); // snapshot 1 saved {A[i], B[i]}: the opening state
      const r = evaluate(st);
      expect(r.view.path, `snapshot ${k}`).toEqual(want[k]);
      expect(r.view.pathLength).toBeCloseTo(referenceLength(POLYGONS[st.i], ...r.view.pt), 9);
    }
  });

  it('the path agrees with an independent planner (and E-PI-01: points on an edge)', () => {
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const i of [1, 2]) {
      const P = POLYGONS[i], [x0, x1, y0, y1] = bbox(P);
      let n = 0, onEdge = 0;
      while (n < 150) {
        const a = [Math.round(x0 + rnd() * (x1 - x0)), Math.round(y0 + rnd() * (y1 - y0))];
        const b = [Math.round(x0 + rnd() * (x1 - x0)), Math.round(y0 + rnd() * (y1 - y0))];
        if (!InsidePoly(P, a) || !InsidePoly(P, b)) continue;
        n++;
        const r = ShortestInsidePath(P, a, b), ref = referenceLength(P, a, b);
        if (onBoundary(P, a) || onBoundary(P, b)) { onEdge++; continue; } // E-PI-01: may differ
        expect(r.dist, `${i}: ${a} → ${b}`).toBeCloseTo(ref, 9);
      }
      expect(onEdge).toBeLessThan(15);
    }
    // E-PI-01, the examples of DESIGN.md §11
    expect(ShortestInsidePath(POLYGONS[2], [169, 970], [169, 1020]).sp).toEqual([]);
    expect(referenceLength(POLYGONS[2], [169, 970], [169, 1020])).toBe(50);
    expect(ShortestInsidePath(POLYGONS[2], [745, 484], [322, 1105]).dist).toBeCloseTo(948.1918, 4);
    expect(referenceLength(POLYGONS[2], [745, 484], [322, 1105])).toBeCloseTo(802.7756, 4);
  });
});
