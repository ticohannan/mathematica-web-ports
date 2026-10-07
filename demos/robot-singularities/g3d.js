// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/robot-singularities/g3d.js — a tiny, pure model of Mathematica's Graphics3D language, so that the
// original's hand-written graphics (singular sets, robot joints, manipulability ellipsoid) can be written
// as DATA close to the source: directives (Red, Thick, Opacity[...]) apply to the primitives after them
// within the same list; nested lists scope directives; Show combines graphics (each keeps its own styles,
// options of the first graphic win); ParametricPlot3D curves/surfaces are kept as functions + ranges.
// `flatten` resolves a graphic into a list of styled primitives. No DOM, no three.js.
import { NAMED, darker } from '../../shared/mma-colors.js';

// ---- directives -------------------------------------------------------------------------------------
const color = (c) => ({ directive: 'color', value: c });
export const Red = color(NAMED.Red);
export const Blue = color(NAMED.Blue);
export const Green = color(NAMED.Green);
export const Gray = color(NAMED.Gray);
export const Orange = color(NAMED.Orange);
export const LightBlue = color(NAMED.LightBlue);
export const LightBrown = color(NAMED.LightBrown);
export const DarkerGreen = color(darker(NAMED.Green));
export const RGBColor = (r, g, b) => color([r, g, b]);
export const Opacity = (o) => ({ directive: 'opacity', value: o });
/** Thick = Thickness[Large] */
export const Thick = { directive: 'thickness', value: 'Large' };
export const PointSize = (s) => ({ directive: 'pointSize', value: s });
export const Arrowheads = (s) => ({ directive: 'arrowheads', value: s });
/** Directive[{...}] — a list of directives used as one style */
export const Directive = (list) => ({ directive: 'list', value: list });

// ---- primitives ---------------------------------------------------------------------------------------
const isPoint = (p) => Array.isArray(p) && typeof p[0] === 'number';
/** Sphere[c, r] or Sphere[{c1, c2, ...}, r] */
export const Sphere = (c, r = 1) => ({ prim: 'sphere', centers: isPoint(c) ? [c] : c, radius: r });
/** Line[{p1, p2, ...}] (one polyline) */
export const Line = (points) => ({ prim: 'line', points });
/** Cylinder[{p1, p2}, r] */
export const Cylinder = ([p1, p2], r = 1) => ({ prim: 'cylinder', p1, p2, radius: r });
/** Cuboid[pmin, pmax] */
export const Cuboid = (min, max) => ({ prim: 'cuboid', min, max });
/** Polygon[{p1, p2, ...}] */
export const Polygon = (points) => ({ prim: 'polygon', points });
/** InfinitePlane[{p1, p2, p3}] (plane through three points; drawn clipped to the plot range) */
export const InfinitePlane = (points) => ({ prim: 'infinitePlane', points });
/** Point[p] */
export const Point = (p) => ({ prim: 'point', points: isPoint(p) ? [p] : p });
/** Arrow[{p1, p2}] */
export const Arrow = (points) => ({ prim: 'arrow', points });
/** Ellipsoid[c, Σ] with Σ a (diagonal) positive semi-definite matrix: {x : (x-c).Σ^-1.(x-c) <= 1} */
export const Ellipsoid = (center, Sigma) => ({ prim: 'ellipsoid', center, Sigma });
/** a sampled closed circle in the xy plane (stands for splineCircle[{0,0,0}, 1, {0, 2π}], an exact circle) */
export const UnitCircle = () => ({ prim: 'circle' });

// ---- transforms ---------------------------------------------------------------------------------------
const I4 = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
export const mul4 = (A, B) => A.map((row) => [0, 1, 2, 3].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j] + row[3] * B[3][j]));
/** 4x4 from {m (3x3), v} (GeometricTransformation[g, {m, v}]) */
export const affine = (m, v = [0, 0, 0]) => [[...m[0], v[0]], [...m[1], v[1]], [...m[2], v[2]], [0, 0, 0, 1]];
/** RotationMatrix[θ, w] (right-handed, w normalised) */
export function rotationMatrix(theta, w) {
  const n = Math.hypot(w[0], w[1], w[2]);
  const [x, y, z] = w.map((v) => v / n);
  const c = Math.cos(theta), s = Math.sin(theta), k = 1 - c;
  return [[c + x * x * k, x * y * k - z * s, x * z * k + y * s], [x * y * k + z * s, c + y * y * k, y * z * k - x * s], [x * z * k - y * s, y * z * k + x * s, c + z * z * k]];
}
/** GeometricTransformation[g, T] with T a 4x4 matrix (TransformationFunction) */
export const GeometricTransformation = (content, T) => ({ transform: T, content });
/** Rotate[g, θ, w] — 3D: rotation by θ about the vector w anchored at the origin */
export const Rotate = (content, theta, w) => ({ transform: affine(rotationMatrix(theta, w)), content });

export const apply4 = (M, p) => [0, 1, 2].map((i) => M[i][0] * p[0] + M[i][1] * p[1] + M[i][2] * p[2] + M[i][3]);
const linPart = (M) => [0, 1, 2].map((i) => [M[i][0], M[i][1], M[i][2]]);

// ---- graphics -------------------------------------------------------------------------------------------
/** Graphics3D[content, options] */
export const Graphics3D = (content, options = {}) => ({ head: 'Graphics3D', content: Array.isArray(content) ? content : [content], options });
/** Show[g1, g2, ...] (or Show[{g1, ...}]): primitives of all, each in its own scope; options of the first win. */
export function Show(...gs) {
  const list = gs.flat().filter((g) => g && g.head === 'Graphics3D');
  const options = {};
  for (let i = list.length - 1; i >= 0; i--) Object.assign(options, list[i].options);
  return { head: 'Graphics3D', content: list.map((g) => g.content), options };
}

/**
 * ParametricPlot3D[{f1, f2, ...}, {u, u0, u1}] (curves) or ... {v, v0, v1}] (surfaces).
 * fs: array of functions; PlotStyle: a style (directive or Directive) or a list of styles used cyclically;
 * Mesh: 'None' or 'Automatic' (surfaces only).
 */
export function ParametricPlot3D(fs, uRange, vRange = null, { PlotStyle = null, Mesh = 'Automatic' } = {}) {
  const styles = Array.isArray(PlotStyle) ? PlotStyle : [PlotStyle];
  const content = fs.map((f, i) => {
    const st = styles[i % styles.length];
    const prim = vRange
      ? { prim: 'parametricSurface', f, u: uRange, v: vRange, mesh: Mesh }
      : { prim: 'parametricCurve', f, u: uRange };
    return st ? [st, prim] : [prim];
  });
  return { head: 'Graphics3D', content, options: {} };
}

const DEFAULT_STYLE = { color: null, opacity: 1, thickness: 'Normal', pointSize: null, arrowheads: null };

function applyDirective(st, d) {
  if (d.directive === 'list') return d.value.reduce(applyDirective, st);
  if (d.directive === 'color') return { ...st, color: d.value };
  if (d.directive === 'opacity') return { ...st, opacity: d.value };
  if (d.directive === 'thickness') return { ...st, thickness: d.value };
  if (d.directive === 'pointSize') return { ...st, pointSize: d.value };
  if (d.directive === 'arrowheads') return { ...st, arrowheads: d.value };
  return st;
}

/**
 * Resolve a graphic (or content list) into styled primitives in world coordinates:
 * {type, ...geometry, color, opacity, thickness, pointSize, arrowheads}. Points of lines, polygons, arrows,
 * planes and sphere/cylinder geometry are transformed; cuboids, ellipsoids, circles and parametric
 * primitives carry the accumulated 4x4 `matrix` (identity omitted).
 */
export function flatten(g, style = DEFAULT_STYLE, M = I4, out = []) {
  if (g == null) return out;
  if (g.head === 'Graphics3D') return flatten(g.content, style, M, out);
  if (Array.isArray(g)) {
    let st = style; // directives are scoped to this list
    for (const e of g) {
      if (e && e.directive) st = applyDirective(st, e);
      else flatten(e, st, M, out);
    }
    return out;
  }
  if (g.transform) return flatten(g.content, style, mul4(M, g.transform), out);
  if (!g.prim) return out; // Null (an If[...] without else)
  const s = { color: style.color, opacity: style.opacity, thickness: style.thickness, pointSize: style.pointSize, arrowheads: style.arrowheads };
  const ident = M === I4;
  const P = (p) => (ident ? p.slice() : apply4(M, p));
  switch (g.prim) {
    case 'sphere': out.push({ type: 'sphere', centers: g.centers.map(P), radius: g.radius, ...s }); break;
    case 'line': out.push({ type: 'line', points: g.points.map(P), ...s }); break;
    case 'cylinder': out.push({ type: 'cylinder', p1: P(g.p1), p2: P(g.p2), radius: g.radius, ...s }); break;
    case 'polygon': out.push({ type: 'polygon', points: g.points.map(P), ...s }); break;
    case 'infinitePlane': out.push({ type: 'infinitePlane', points: g.points.map(P), ...s }); break;
    case 'point': out.push({ type: 'point', points: g.points.map(P), ...s }); break;
    case 'arrow': out.push({ type: 'arrow', points: g.points.map(P), ...s }); break;
    case 'cuboid': out.push({ type: 'cuboid', min: g.min.slice(), max: g.max.slice(), ...(ident ? {} : { matrix: M }), ...s }); break;
    case 'ellipsoid': out.push({ type: 'ellipsoid', center: g.center.slice(), Sigma: g.Sigma, ...(ident ? {} : { matrix: M }), ...s }); break;
    case 'circle': out.push({ type: 'circle', ...(ident ? {} : { matrix: M }), ...s }); break;
    case 'parametricCurve': out.push({ type: 'parametricCurve', f: g.f, u: g.u, ...(ident ? {} : { matrix: M }), ...s }); break;
    case 'parametricSurface': out.push({ type: 'parametricSurface', f: g.f, u: g.u, v: g.v, mesh: g.mesh, ...(ident ? {} : { matrix: M }), ...s }); break;
    default: throw new Error(`unknown primitive ${g.prim}`);
  }
  return out;
}

// ---- sampling (pure; the renderer and the tests use the same samples) ------------------------------------
export const CURVE_POINTS = 241;
export const SURFACE_POINTS = 61;

/** Points of a parametric curve primitive (matrix applied). */
export function sampleCurve(p, n = CURVE_POINTS) {
  const [u0, u1] = p.u;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const q = p.f(u0 + ((u1 - u0) * i) / (n - 1));
    pts.push(p.matrix ? apply4(p.matrix, q) : q);
  }
  return pts;
}

/** Grid of points of a parametric surface primitive: rows over u, columns over v (matrix applied). */
export function sampleSurface(p, nu = SURFACE_POINTS, nv = SURFACE_POINTS) {
  const [u0, u1] = p.u, [v0, v1] = p.v;
  const grid = [];
  for (let i = 0; i < nu; i++) {
    const u = u0 + ((u1 - u0) * i) / (nu - 1);
    const row = [];
    for (let j = 0; j < nv; j++) {
      const q = p.f(u, v0 + ((v1 - v0) * j) / (nv - 1));
      row.push(p.matrix ? apply4(p.matrix, q) : q);
    }
    grid.push(row);
  }
  return grid;
}

/** Points of a circle primitive (splineCircle[{0,0,0}, 1, {0, 2π}] is an exact unit circle; matrix applied). */
export function sampleCircle(p, n = 129) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / (n - 1);
    const q = [Math.cos(t), Math.sin(t), 0];
    pts.push(p.matrix ? apply4(p.matrix, q) : q);
  }
  return pts;
}

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * InfinitePlane[{p1, p2, p3}] restricted to the box [[x0,x1],[y0,y1],[z0,z1]] (the plot range): the convex
 * polygon plane ∩ box, vertices in order around it. [] if the plane misses the box.
 */
export function infinitePlanePolygon([p1, p2, p3], box) {
  const n = cross3(sub3(p2, p1), sub3(p3, p1));
  const c = dot3(n, p1);
  const scale = Math.hypot(...n) * Math.max(...box.map(([a, b]) => Math.abs(b - a)));
  const eps = 1e-12 * scale;
  const corners = [];
  for (let k = 0; k < 8; k++) corners.push([box[0][k & 1], box[1][(k >> 1) & 1], box[2][(k >> 2) & 1]]);
  const edges = [];
  for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) {
    const d = a ^ b;
    if (d === 1 || d === 2 || d === 4) edges.push([corners[a], corners[b]]);
  }
  const pts = [];
  const add = (q) => { if (!pts.some((r) => Math.hypot(...sub3(r, q)) <= 1e-9 * (1 + Math.hypot(...q)))) pts.push(q); };
  for (const [e0, e1] of edges) {
    const f0 = dot3(n, e0) - c, f1 = dot3(n, e1) - c;
    if (Math.abs(f0) <= eps) add(e0);
    if (Math.abs(f1) <= eps) add(e1);
    if ((f0 < -eps && f1 > eps) || (f0 > eps && f1 < -eps)) {
      const t = f0 / (f0 - f1);
      add([e0[0] + t * (e1[0] - e0[0]), e0[1] + t * (e1[1] - e0[1]), e0[2] + t * (e1[2] - e0[2])]);
    }
  }
  if (pts.length < 3) return [];
  const ctr = pts.reduce((s, q) => [s[0] + q[0] / pts.length, s[1] + q[1] / pts.length, s[2] + q[2] / pts.length], [0, 0, 0]);
  const e1 = sub3(pts[0], ctr);
  const e2 = cross3(n, e1);
  return pts.map((q) => ({ q, ang: Math.atan2(dot3(sub3(q, ctr), e2), dot3(sub3(q, ctr), e1)) }))
    .sort((a, b) => a.ang - b.ang).map((x) => x.q);
}

// ---- bounds ------------------------------------------------------------------------------------------------
/** Axis-aligned bounds [[x0,x1],[y0,y1],[z0,z1]] of flattened primitives (PlotRange -> All), or null if empty. */
export function primitiveBounds(prims) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const add = (p, r = [0, 0, 0]) => { for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k] - r[k]); hi[k] = Math.max(hi[k], p[k] + r[k]); } };
  for (const p of prims) {
    switch (p.type) {
      case 'sphere': for (const c of p.centers) add(c, [p.radius, p.radius, p.radius]); break;
      case 'cylinder': {
        const a = [p.p2[0] - p.p1[0], p.p2[1] - p.p1[1], p.p2[2] - p.p1[2]];
        const n = Math.hypot(...a) || 1;
        const r = a.map((x) => p.radius * Math.sqrt(Math.max(0, 1 - (x / n) ** 2)));
        add(p.p1, r); add(p.p2, r); break;
      }
      case 'line': case 'polygon': case 'point': case 'arrow': case 'infinitePlane': for (const q of p.points) add(q); break;
      case 'cuboid': for (let k = 0; k < 8; k++) {
        const q = [k & 1 ? p.max[0] : p.min[0], k & 2 ? p.max[1] : p.min[1], k & 4 ? p.max[2] : p.min[2]];
        add(p.matrix ? apply4(p.matrix, q) : q);
      } break;
      case 'ellipsoid': {
        const r = Math.sqrt(Math.max(p.Sigma[0][0], p.Sigma[1][1], p.Sigma[2][2]));
        add(p.matrix ? apply4(p.matrix, p.center) : p.center, [r, r, r]); break;
      }
      case 'circle': for (const q of sampleCircle(p, 65)) add(q); break;
      case 'parametricCurve': for (const q of sampleCurve(p, 121)) add(q); break;
      case 'parametricSurface': for (const row of sampleSurface(p, 31, 31)) for (const q of row) add(q); break;
      default: break;
    }
  }
  return lo[0] === Infinity ? null : [[lo[0], hi[0]], [lo[1], hi[1]], [lo[2], hi[2]]];
}
