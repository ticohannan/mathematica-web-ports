// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/geometry.js — computational geometry under Mathematica's names where it has one (v0.1.23), for new apps in
// simple mode (plain JavaScript arithmetic; the course ports keep their own exact code in demos/common/).
//
//   ConvexHull(pts)                      the hull's vertices, counter-clockwise from the lowest (then leftmost) point
//                                        (Mathematica: MeshCoordinates[ConvexHullMesh[pts]] in hull order)
//   PolygonArea(poly)                    signed area (positive counter-clockwise) — Area[Polygon[poly]] up to sign
//   RegionMember(poly, p)                p inside or on the polygon (crossing rule) — RegionMember[Polygon[poly], p]
//   SignedArea(p, q, r)                  ½ det of (q − p, r − p): > 0 when p → q → r turns left
//   SegmentIntersection([a, b], [c, d])  the crossing point of two segments, or null
//   RegionDistance([a, b], p)            distance from p to segment ab (2D or 3D) — RegionDistance[Line[{a, b}], p]
//   RegionNearest([a, b], p)             the nearest point of segment ab to p — RegionNearest[Line[{a, b}], p]
//   SegmentsClosestPoints([a0, a1], [b0, b1])  {pA, pB, distance}: the closest points of two segments in 2D or 3D
//   Eigensystem2([[a, b], [b, c]])       {values: [l1 ≥ l2], vectors: [v1, v2]} of a symmetric 2 × 2 matrix (unit
//                                        vectors; Mathematica's order: larger eigenvalue first)
//   CircumCircle(a, b, c)                {center, radius} of the circle through three points (null if collinear)
//   RollPitchYawMatrix([α, β, γ])        Mathematica's RollPitchYawMatrix: Rz(α)·Ry(β)·Rx(γ)

const sub = (a, b) => a.map((x, i) => x - b[i]);
const add = (a, b) => a.map((x, i) => x + b[i]);
const mul = (k, a) => a.map((x) => k * x);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const norm = (a) => Math.sqrt(dot(a, a));

export const SignedArea = (p, q, r) => 0.5 * ((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));

/** Convex hull (Andrew's monotone chain): counter-clockwise, starting at the lowest point (leftmost of ties). */
export function ConvexHull(points) {
  const pts = [...new Map(points.map((p) => [`${p[0]},${p[1]}`, p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const half = (list) => {
    const h = [];
    for (const p of list) {
      while (h.length >= 2 && SignedArea(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  const hull = [...half(pts), ...half([...pts].reverse())];
  let s = 0; // start at the lowest point (leftmost of ties), as Mathematica's examples list it
  hull.forEach((p, i) => { if (p[1] < hull[s][1] || (p[1] === hull[s][1] && p[0] < hull[s][0])) s = i; });
  return [...hull.slice(s), ...hull.slice(0, s)];
}

export function PolygonArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length]; a += x0 * y1 - x1 * y0; }
  return a / 2;
}

/** p inside the polygon (even-odd crossing rule) or on its boundary (within 1e-12). */
export function RegionMember(poly, p) {
  const [x, y] = p;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (RegionDistance([poly[j], poly[i]], p) < 1e-12) return true;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function SegmentIntersection([a, b], [c, d]) {
  const r = sub(b, a), s = sub(d, c);
  const den = r[0] * s[1] - r[1] * s[0];
  if (den === 0) return null; // parallel (collinear overlaps are not reported)
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? add(a, mul(t, r)) : null;
}

export function RegionNearest([a, b], p) {
  const ab = sub(b, a), L = dot(ab, ab);
  if (L === 0) return [...a];
  const t = Math.min(1, Math.max(0, dot(sub(p, a), ab) / L));
  return add(a, mul(t, ab));
}
export const RegionDistance = (seg, p) => norm(sub(p, RegionNearest(seg, p)));

/** Closest points of segments [a0, a1] and [b0, b1] (2D or 3D; degenerate segments allowed). */
export function SegmentsClosestPoints([a0, a1], [b0, b1]) {
  const u = sub(a1, a0), v = sub(b1, b0), w = sub(a0, b0);
  const a = dot(u, u), b = dot(u, v), c = dot(v, v), d = dot(u, w), e = dot(v, w);
  const D = a * c - b * b;
  let s, t;
  if (a === 0 && c === 0) { s = 0; t = 0; } else if (a === 0) { s = 0; t = Math.min(1, Math.max(0, e / c)); } else if (c === 0) {
    t = 0; s = Math.min(1, Math.max(0, -d / a));
  } else {
    s = D > 1e-14 * a * c ? Math.min(1, Math.max(0, (b * e - c * d) / D)) : 0; // parallel: any s; take 0
    t = (b * s + e) / c;
    if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -d / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - d) / a)); }
  }
  const pA = add(a0, mul(s, u)), pB = add(b0, mul(t, v));
  return { pA, pB, distance: norm(sub(pA, pB)) };
}

export function Eigensystem2([[a, b], [, c]]) {
  const m = (a + c) / 2, r = Math.hypot((a - c) / 2, b);
  const l1 = m + r, l2 = m - r;
  let v1;
  if (b !== 0) v1 = [l1 - c, b]; else v1 = a >= c ? [1, 0] : [0, 1];
  const n = Math.hypot(...v1);
  v1 = [v1[0] / n, v1[1] / n];
  return { values: [l1, l2], vectors: [v1, [-v1[1], v1[0]]] };
}

export function CircumCircle(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (d === 0) return null;
  const s = (p) => p[0] * p[0] + p[1] * p[1];
  const center = [(s(a) * (b[1] - c[1]) + s(b) * (c[1] - a[1]) + s(c) * (a[1] - b[1])) / d, (s(a) * (c[0] - b[0]) + s(b) * (a[0] - c[0]) + s(c) * (b[0] - a[0])) / d];
  return { center, radius: Math.hypot(a[0] - center[0], a[1] - center[1]) };
}

export function RollPitchYawMatrix([al, be, ga]) {
  const [ca, sa, cb, sb, cg, sg] = [Math.cos(al), Math.sin(al), Math.cos(be), Math.sin(be), Math.cos(ga), Math.sin(ga)];
  return [
    [ca * cb, ca * sb * sg - sa * cg, ca * sb * cg + sa * sg],
    [sa * cb, sa * sb * sg + ca * cg, sa * sb * cg - ca * sg],
    [-sb, cb * sg, cb * cg],
  ];
}
