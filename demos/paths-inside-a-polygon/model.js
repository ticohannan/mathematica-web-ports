// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Stan Wagon and Karen Saxe
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/paths-inside-a-polygon/model.js — "Paths inside a Polygon": the Manipulate's Initialization (orientation tests,
// the ear-cutting triangulation, Inside, reflex vertices, VisibleReflexEdges, ShortestInsidePath) and one evaluation of
// the body, the state in, { state, view, graphics } out (pure, no DOM). Simple mode: every coordinate is an integer
// (the body rounds the points), so the orientation tests are exact in double arithmetic. Indices are 1-based as in
// the original where they are passed between functions.
import { Graphics, Polygon, Line, Point, PointSize, Thickness, Thick, Red, Blue, Black, RGBColor, EdgeForm, FaceForm, Annotation } from '../../shared/graphics.js';

/** SignedArea[poly] = Σ (x_i y_{i+1} − y_i x_{i+1}) / 2. */
export const SignedArea = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - a[1] * b[0]; } return s / 2; };
const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const lexLess = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
/** ConvexVertex[pp] = Ordering[pp, 1][[1]]: the lexicographically smallest vertex (0-based here). */
export const ConvexVertex = (pp) => { let k = 0; for (let i = 1; i < pp.length; i++) if (lexLess(pp[i], pp[k])) k = i; return k; }; // 0-based
/** Orientation: Sign of the area of a triangle; of a polygon, that of the triangle at its ConvexVertex. */
export function Orientation(poly) {
  if (poly.length === 3) return sign(SignedArea(poly));
  const n = poly.length, v = ConvexVertex(poly);
  return Orientation([poly[(v - 1 + n) % n], poly[v], poly[(v + 1) % n]]);
}
export const LeftOf = (p, q, r) => Orientation([p, q, r]) === 1;
export const RightOf = (p, q, r) => Orientation([p, q, r]) === -1;
export const IntersectOpen = ([a, b], [c, d]) => ((LeftOf(a, b, c) && RightOf(a, b, d)) || (LeftOf(a, b, d) && RightOf(a, b, c))) && ((LeftOf(c, d, a) && RightOf(c, d, b)) || (LeftOf(c, d, b) && RightOf(c, d, a)));
const btw = (a, x, b) => (a <= x && x <= b) || (b <= x && x <= a);
export const BetweenSW = (p, q, r) => Orientation([p, q, r]) === 0 && (p[0] !== r[0] ? btw(p[0], r[0], q[0]) : btw(p[1], r[1], q[1]));
export const IntersectClosed = ([a, b], [c, d]) => IntersectOpen([a, b], [c, d]) || BetweenSW(a, b, c) || BetweenSW(a, b, d) || BetweenSW(c, d, a) || BetweenSW(c, d, b);
/** Inside[{p, q, r}, pt]: pt in the closed triangle (on an edge counts as inside). */
export function InsideTri([p, q, r], pt) {
  let [pp, qq, rr] = Orientation([p, q, r]) === -1 ? [r, q, p] : [p, q, r];
  return !LeftOf(qq, pp, pt) && !LeftOf(rr, qq, pt) && !LeftOf(pp, rr, pt);
}
export const AreaSW = (pp) => Math.abs(SignedArea(pp));
/**
 * PolygonDiagonal[poly]: at the ConvexVertex v (neighbours u, w) the ear diagonal {u, w}, or, when vertices lie inside
 * the triangle u v w, the diagonal from v to the one farthest from u w (largest area; Last of a Sort by area, so the last
 * of equally far ones). 1-based, sorted.
 */
export function PolygonDiagonal(poly) {
  const n = poly.length, v = ConvexVertex(poly) + 1, u = v - 1 === 0 ? n : v - 1, w = v + 1 === n + 1 ? 1 : v + 1;
  const tri = [poly[u - 1], poly[v - 1], poly[w - 1]];
  const inv = poly.filter((_, k) => ![u, v, w].includes(k + 1)).filter((p) => InsideTri(tri, p));
  if (!inv.length) return [u, w].sort((a, b) => a - b);
  // Last[Sort[inv, AreaSW[..#1..] <= AreaSW[..#2..] &]]: a point of largest area (ties: the last of them in a stable sort)
  let best = inv[0], ba = AreaSW([tri[0], best, tri[2]]);
  for (const p of inv.slice(1)) { const a = AreaSW([tri[0], p, tri[2]]); if (a >= ba) { best = p; ba = a; } }
  const pos = poly.findIndex((p) => p[0] === best[0] && p[1] === best[1]) + 1;
  return [pos, v].sort((a, b) => a - b);
}
function triInds(poly, inds) {
  if (inds.length === 3) return [inds];
  const [d1, d2] = PolygonDiagonal(inds.map((k) => poly[k - 1]));
  return [...triInds(poly, inds.slice(d1 - 1, d2)), ...triInds(poly, [...inds.slice(0, d1), ...inds.slice(d2 - 1)])];
}
/** Triangulate[poly]: triangles as 1-based index triples (counter-clockwise polygons directly, else reversed). */
export function Triangulate(poly) {
  const n = poly.length, R = Array.from({ length: n }, (_, k) => k + 1);
  if (Orientation(poly) === 1) return triInds(poly, R);
  return triInds([...poly].reverse(), R).map((t) => t.map((k) => n + 1 - k).reverse());
}
/** Inside[p, pt] for a polygon: in one of the triangles of Triangulate[p]. */
export const InsidePoly = (p, pt) => Triangulate(p).some((t) => InsideTri(t.map((k) => p[k - 1]), pt));
export const InsideFast = (tris, pt) => tris.some((t) => InsideTri(t, pt));
/** ReflexVertexQ: not a left turn at vertex ii (1-based; collinear counts as reflex). */
export const ReflexVertexQ = (poly, ii) => { const n = poly.length; return !LeftOf(poly[(ii - 2 + n) % n], poly[ii - 1], poly[ii % n]); };
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const has = (pair, p) => pair.some((q) => q[0] === p[0] && q[1] === p[1]);
/** VisibleReflexEdges[poly] (F-PI-06): 1-based index pairs. */
export function VisibleReflexEdges(poly) {
  const n = poly.length, v = Orientation(poly) === -1 ? [...poly].reverse() : poly;
  const tris = Triangulate(v).map((t) => t.map((k) => v[k - 1]));
  const verts = []; for (let k = 1; k <= n; k++) if (ReflexVertexQ(v, k)) verts.push(k);
  const border = Array.from({ length: n }, (_, k) => [k + 1, k + 2 > n ? 1 : k + 2]);
  const bre = border.filter((e) => verts.includes(e[0]) && verts.includes(e[1]));
  let pe = []; for (let i = 0; i < verts.length - 1; i++) for (let j = i + 1; j < verts.length; j++) pe.push([verts[i], verts[j]]);
  pe = pe.filter((e) => InsideFast(tris, mid(v[e[0] - 1], v[e[1] - 1])));
  for (const b of border) { const k = b.map((x) => v[x - 1]); pe = pe.filter((e) => b.includes(e[0]) || b.includes(e[1]) || !IntersectClosed(e.map((x) => v[x - 1]), k)); }
  return union([bre, pe]);
}
function union(lists) { const m = new Map(); for (const l of lists) for (const e of l) m.set(e.join(','), e); return [...m.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]); }
/**
 * ShortestInsidePath[s, start, finish] (F-PI-07): { ss (oriented polygon), v (ss, start, finish), pp (the graph's edges,
 * 1-based pairs, sorted as Union), sp (the shortest path's vertex indices; [] when none), dist, verts }. The search:
 * Dijkstra from start (D-PI-01).
 */
export function ShortestInsidePath(s, start, finish) {
  const n = s.length, ss = Orientation(s) === -1 ? [...s].reverse() : s, v = [...ss, start, finish];
  const tris = Triangulate(ss).map((t) => t.map((k) => v[k - 1]));
  // the original prints a message and returns ShortestInsidePath unevaluated; the body never gets here (it moves
  // outside points to a vertex first)
  if (!InsideFast(tris, start) || !InsideFast(tris, finish)) return { ss, v, pp: [], sp: [], verts: [n + 1, n + 2], outside: true };
  const verts = []; for (let k = 1; k <= n; k++) if (ReflexVertexQ(ss, k)) verts.push(k);
  verts.push(n + 1, n + 2);
  const border = Array.from({ length: n }, (_, k) => [k + 1, k + 2 > n ? 1 : k + 2]);
  const vv = VisibleReflexEdges(ss);
  const P = (e) => e.map((x) => v[x - 1]);
  const kill = (edges) => { for (const b of border) { const k = P(b); edges = edges.filter((e) => has(k, v[e[0] - 1]) || has(k, v[e[1] - 1]) || !IntersectClosed(P(e), k)); } return edges; };
  let se = verts.slice(0, -2).map((x) => [x, n + 1]).filter((e) => InsideFast(tris, mid(...P(e))));
  if (InsideFast(tris, mid(start, finish))) se = [...se, [n + 1, n + 2]];
  se = kill(se);
  let fe = kill(verts.slice(0, -2).map((x) => [x, n + 2]).filter((e) => InsideFast(tris, mid(...P(e)))));
  const pp = union([vv, se, fe]);
  // Dijkstra on vertices 1..n+2
  const N = n + 2, dist = Array(N + 1).fill(Infinity), prev = Array(N + 1).fill(0), done = Array(N + 1).fill(false);
  const adj = Array.from({ length: N + 1 }, () => []);
  for (const [a, b] of pp) { const w = Math.hypot(v[a - 1][0] - v[b - 1][0], v[a - 1][1] - v[b - 1][1]); adj[a].push([b, w]); adj[b].push([a, w]); }
  dist[n + 1] = 0;
  for (;;) { let u = 0; for (let k = 1; k <= N; k++) if (!done[k] && dist[k] < Infinity && (!u || dist[k] < dist[u])) u = k; if (!u) break; done[u] = true; for (const [b, w] of adj[u]) if (dist[u] + w < dist[b]) { dist[b] = dist[u] + w; prev[b] = u; } }
  const sp = []; if (dist[n + 2] < Infinity) { for (let k = n + 2; k; k = prev[k]) sp.unshift(k); }
  return { ss, v, pp, sp, dist: dist[n + 2], verts };
}
/**
 * polygonEx[1] and polygonEx[2] as evaluated (F-PI-04): {723,558};{762,611} keeps only (762, 611) (Q-PI-01, E-PI-02);
 * 513+10 = 523, 596-18 = 578; polygonEx[2] is written reversed in the original (Reverse@{…}).
 */
export const POLYGONS = {
  1: [[983,649],[638,523],[762,611],[382,510],[697,744],[685,766],[836,799],[594,770],[238,532],[404,872],[702,888],[963,889],[442,960],[186,628],[293,872],[180,851],[92,599],[94,684],[6,778],[16,430],[55,340],[320,378],[750,542],[169,277],[198,286],[872,578],[133,166],[66,120],[411,158],[468,269],[563,324],[598,410],[689,454],[344,52],[485,26],[713,174],[778,260],[690,9],[866,166]],
  2: [[169,804],[169,1042],[255,1042],[255,1179],[360,1179],[360,1042],[426,1042],[426,923],[559,923],[559,757],[664,757],[664,623],[534,623],[534,571],[745,571],[745,389],[831,389],[831,483],[924,483],[924,522],[894,522],[894,677],[1120,677],[1120,553],[1212,553],[1212,428],[1015,428],[1015,385],[1037,385],[1037,257],[1015,257],[1015,247],[981,247],[981,154],[722,154],[722,358],[642,358],[642,229],[418,229],[418,387],[497,387],[497,396],[313,396],[313,400],[249,400],[249,583],[292,583],[292,644],[313,644],[313,678],[423,678],[423,804]].reverse(),
};

// ---- the body ---------------------------------------------------------------------------------------------------
/** A[i], B[i]: the default start and finish of polygon i (A[3], B[3] belong to the unreachable polygonEx[3]). */
export const DEFAULTS = Object.freeze({ 1: [[500, 100], [500, 910]], 2: [[300, 1150], [1150, 450]], 3: [[0.83, 0.93], [0.9, 0]] });
export const initialState = () => ({ i: 1, pt: DEFAULTS[1].map((p) => [...p]) });
/** Round[x]: to the nearest integer, halves to even (Mathematica's rule). */
export const Round = (x) => { const f = Math.floor(x), d = x - f; return d > 0.5 || (d === 0.5 && f % 2 !== 0) ? f + 1 : f; };
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
/** Nearest[pol, p][[1]]: the polygon vertex nearest to p (the first of equally near ones). */
export function nearestVertex(pol, p) {
  let best = pol[0], bd = Infinity;
  for (const q of pol) { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < bd) { bd = d; best = q; } }
  return [...best];
}
/**
 * The body's assignments (F-PI-03): pt = Round[pt]; a default pair of any polygon becomes the chosen polygon's pair;
 * a point outside the polygon moves to its nearest vertex.
 */
export function bodyPoints(i, pt) {
  let p = pt.map((q) => q.map(Round));
  if ([1, 2, 3].some((k) => same(DEFAULTS[k][0], p[0]) && same(DEFAULTS[k][1], p[1]))) p = DEFAULTS[i].map((q) => [...q]);
  const pol = POLYGONS[i];
  if (!InsidePoly(pol, p[0])) p[0] = nearestVertex(pol, p[0]);
  if (!InsidePoly(pol, p[1])) p[1] = nearestVertex(pol, p[1]);
  return p;
}

const boundsOf = (pts) => [[Math.min(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[0]))], [Math.min(...pts.map((q) => q[1])), Math.max(...pts.map((q) => q[1]))]];
const aspectOf = (pts) => { const [[x0, x1], [y0, y1]] = boundsOf(pts); return (y1 - y0) / (x1 - x0); };

/** The Manipulate body (F-PI-08). */
export function evaluate({ i, pt }) {
  const p = bodyPoints(i, pt);
  const r = ShortestInsidePath(POLYGONS[i], p[0], p[1]);
  const { ss, v, pp, sp } = r;
  const pathLength = sp.length ? sp.slice(1).reduce((s, k, j) => s + Math.hypot(v[k - 1][0] - v[sp[j] - 1][0], v[k - 1][1] - v[sp[j] - 1][1]), 0) : 0;
  const graphics = Graphics([
    [EdgeForm(Black), FaceForm(RGBColor(1, 1, 0.6)), Annotation(Polygon(ss), 'polygon')],
    [Blue, Thickness(0.001), Annotation(pp.map((e) => Line([v[e[0] - 1], v[e[1] - 1]])), 'graph-edges')],
    [Red, PointSize(0.02), Annotation(Point([p[0], p[1]]), 'endpoints'), Thick, Annotation(Line(sp.map((k) => v[k - 1])), 'path')],
  ], {
    // PlotRange -> All: the polygon's bounding box (the points are inside it); equal scales (AspectRatio Automatic); a new
    // frame when the polygon changes (UpdateFrame)
    PlotRange: boundsOf(ss), AspectRatio: aspectOf(ss), UpdateFrame: true, ImageSize: [450, 450],
    label: 'The polygon, the visibility graph (blue) and the shortest path (red)',
  });
  return {
    state: { i, pt: p },
    view: { i, pt: p, reflex: r.verts.length - 2, edges: pp.map((e) => [...e]), path: sp.map((k) => [...v[k - 1]]), pathLength },
    graphics,
  };
}
