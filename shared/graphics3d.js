// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/graphics3d.js — a small, pure model of Mathematica's Graphics3D language, so that 3D pictures can be
// written as DATA close to Wolfram Language: directives (Red, Thick, Opacity[...]) apply to the primitives after them
// within the same list; nested lists scope directives; Show combines graphics (each keeps its own styles, options of the
// first graphic win); ParametricPlot3D curves/surfaces are kept as functions + ranges. `flatten` resolves a graphic into
// a list of styled primitives (drawn in three.js by shared/graphics3d-three.js). No DOM, no three.js.
// Generic (no code of a Demonstration): moved to shared/ under MIT in v0.1.21 (owner decision D1) from
// demos/common/g3d.js (first written for robot-singularities, v0.1.16 DH-family move), unchanged except mul4Fma (moved
// here from demos/common/dh-chain.js). Notes kept from there:
//   - EdgeForm[] / EdgeForm[c]: directive `EdgeForm(c)` (EdgeForm() = no edges); a flattened primitive carries
//     `edgeForm` only when one was given ('None' or an RGB list), so existing outputs keep their exact shape;
//   - Cuboid[p, q] with its corners in any order (Mathematica draws the box between two opposite corners):
//     `cuboidCorners(prim)` gives the componentwise min / max box; the flattened data keep the corners as written;
//     primitiveBounds is order-independent; graphics3d-three.js draws the normalised box.
//   rotationMatrix stays on Math.cos/Math.sin (a rotation by π/2 through it is not exact, as in Mathematica with machine angles).
// Added in v0.1.21 for the 3D pictures of shared/graphics3d-view.js (additive; existing outputs unchanged):
//   - GraphicsComplex[pts, prims]: primitives that index a point list (1-based, as Mathematica); a Polygon of several
//     index lists flattens to ONE {type: 'mesh', points, polygons (0-based)} (an indexed surface, smooth-shaded);
//   - Group3D(content, { key }): a part of the picture drawn as its own group (no Mathematica counterpart; flatten and
//     primitiveBounds see through it); with a `key`, the renderer reuses the part's last drawing while the key is the
//     same (===) — the 3D counterpart of shared/graphics.js cachedGraphics; groupsOf(graphics) lists the parts;
//   - pure helpers of the renderer: clipPlaneData (explicit PlotRange → six clipping planes), boxRatioTransform
//     (BoxRatios), niceTicks (Ticks -> Automatic), frameData (Boxed / Axes / Ticks / AxesLabel geometry), imageWidth.
// Added in v0.1.26 (additive; existing outputs unchanged): Texture[image] and Polygon[pts, VertexTextureCoordinates ->
//   {{s, t}, …}] — a flattened polygon carries `texture` and `textureCoordinates` only when it has both (images: RGBA data
//   or shared/graphics.js Rasterize; drawn by shared/graphics3d-three.js).
import { NAMED, darker } from './mma-colors.js';
import { fma } from './mma-exact.js';

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
/** EdgeForm[] (no edges: EdgeForm()) or EdgeForm[c] (edges in colour c, an RGB list) */
export const EdgeForm = (c = 'None') => ({ directive: 'edgeForm', value: c });
/**
 * v0.1.26: Texture[image] — the following Polygons with VertexTextureCoordinates show the image instead of their colour
 * (Opacity multiplies its alpha; lit like a white surface). image: an RGBA image {width, height, data} (row 1 at the
 * top) or a shared/graphics.js Rasterize / ImageReflect description; other primitives ignore the texture.
 */
export const Texture = (image) => ({ directive: 'texture', value: image });

// ---- primitives ---------------------------------------------------------------------------------------
const isPoint = (p) => Array.isArray(p) && typeof p[0] === 'number';
/** Sphere[c, r] or Sphere[{c1, c2, ...}, r] */
export const Sphere = (c, r = 1) => ({ prim: 'sphere', centers: isPoint(c) ? [c] : c, radius: r });
/** Line[{p1, p2, ...}] (one polyline) */
export const Line = (points) => ({ prim: 'line', points });
/** Cylinder[{p1, p2}, r] */
export const Cylinder = ([p1, p2], r = 1) => ({ prim: 'cylinder', p1, p2, radius: r });
/** Cuboid[p, q]: the box between two opposite corners p, q (any order), stored as given in {min: p, max: q} */
export const Cuboid = (min, max) => ({ prim: 'cuboid', min, max });
/**
 * The box of a (flattened) cuboid with its corners in componentwise order: {min, max} (N-DH-06). The data keep the
 * corners as written in the source (robot-singularities' outputs stay bit-identical); the renderer and tests use this.
 */
export const cuboidCorners = (p) => ({ min: [0, 1, 2].map((k) => Math.min(p.min[k], p.max[k])), max: [0, 1, 2].map((k) => Math.max(p.min[k], p.max[k])) });
/**
 * Polygon[{p1, p2, ...}]; v0.1.26: Polygon[pts, VertexTextureCoordinates -> {{s1, t1}, …}] — with a Texture in effect
 * the polygon shows the image ({0, 0} its bottom-left, {1, 1} its top-right corner)
 */
export const Polygon = (points, { VertexTextureCoordinates } = {}) => (VertexTextureCoordinates
  ? { prim: 'polygon', points, textureCoordinates: VertexTextureCoordinates } : { prim: 'polygon', points });
/** InfinitePlane[{p1, p2, p3}] (plane through three points; drawn clipped to the plot range) */
export const InfinitePlane = (points, vs) => ({ prim: 'infinitePlane', points: vs ? [points, points.map((x, k) => x + vs[0][k]), points.map((x, k) => x + vs[1][k])] : points }); // v0.1.23: also InfinitePlane[p, {v1, v2}]
/** Point[p] */
export const Point = (p) => ({ prim: 'point', points: isPoint(p) ? [p] : p });
/** Arrow[{p1, p2}] */
export const Arrow = (points) => ({ prim: 'arrow', points });
/** Ellipsoid[c, Σ] with Σ a (diagonal) positive semi-definite matrix: {x : (x-c).Σ^-1.(x-c) <= 1} */
export const Ellipsoid = (center, Sigma) => ({ prim: 'ellipsoid', center, Sigma });
/**
 * GraphicsComplex[{p1, p2, …}, prims]: inside, Polygon and Line take 1-based indices into the points instead of
 * coordinates (Polygon[{i, j, k, …}] or Polygon[{{…}, {…}, …}] several polygons; Line[{i, j, …}]).
 */
export const GraphicsComplex = (points, content) => ({ prim: 'graphicsComplex', points, content });
/**
 * Group3D(content, { key }): a part drawn as its own group (a THREE.Group of the picture), see the file header. Only
 * top-level parts of a Graphics3D become groups (shared/graphics3d-view.js); directives outside do not reach inside.
 */
export const Group3D = (content, { key } = {}) => ({ prim: 'group', content, key });
/** v0.1.23: Tube[{p1, p2, …}, r] — a thick polyline (drawn as cylinders without edges, joined by spheres) */
export const Tube = (points, r = 0.05) => ({ prim: 'tube', points, radius: r });
/** v0.1.23: Cone[{p1, p2}, r] — base centre p1, apex p2 */
export const Cone = ([p1, p2], r = 1) => ({ prim: 'cone', p1, p2, radius: r });
/** v0.1.23: InfiniteLine[{p1, p2}] — drawn clipped to the plot range */
export const InfiniteLine = (points) => ({ prim: 'infiniteLine', points });
/** v0.1.23: Text[expr, pos] — a label at a 3D point (expr: a string, or HTML via { html }), centred, in the current colour and FontSize */
export const Text = (expr, pos) => ({ prim: 'text', expr, pos });
/** v0.1.23: FontSize[px] for Text in 3D */
export const FontSize = (px) => ({ directive: 'fontSize', value: px });
export const White = color(NAMED.White);
export const Black = color(NAMED.Black);
export const Yellow = color(NAMED.Yellow);
/** a sampled closed circle in the xy plane (an exact unit circle, sampled when drawn) */
export const UnitCircle = () => ({ prim: 'circle' });

// ---- transforms ---------------------------------------------------------------------------------------
const I4 = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
export const mul4 = (A, B) => A.map((row) => [0, 1, 2, 3].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j] + row[3] * B[3][j]));
/**
 * 4x4 machine-matrix product as Mathematica 15.0.1 computes Dot of two machine (packed) TransformationFunction
 * matrices: every entry is the fused multiply-add chain fma(a3, b3, fma(a2, b2, fma(a1, b1, a0*b0))) (the dgemm
 * kernel). Evidence: a Mathematica 15.0.1 harness run (this project's arm-configurations port, H-AC-11) reproduced
 * bit for bit, where the plain left-to-right sum (mul4) differs in the last bit of 3 entries. `+ 0` turns -0 into 0.
 */
export const mul4Fma = (A, B) => A.map((row) => [0, 1, 2, 3].map((j) => fma(row[3], B[3][j], fma(row[2], B[2][j], fma(row[1], B[1][j], row[0] * B[0][j]))) + 0));
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
  if (d.directive === 'edgeForm') return { ...st, edgeForm: d.value };
  if (d.directive === 'fontSize') return { ...st, fontSize: d.value };
  if (d.directive === 'texture') return { ...st, texture: d.value };
  return st;
}

/**
 * Resolve a graphic (or content list) into styled primitives in world coordinates:
 * {type, ...geometry, color, opacity, thickness, pointSize, arrowheads[, edgeForm]}. Points of lines, polygons, arrows,
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
  if (g.prim === 'group') return flatten(g.content, style, M, out);
  if (g.prim === 'graphicsComplex') return flattenComplex(g, style, M, out);
  const s = { color: style.color, opacity: style.opacity, thickness: style.thickness, pointSize: style.pointSize, arrowheads: style.arrowheads };
  if (style.edgeForm != null) s.edgeForm = style.edgeForm;
  const ident = M === I4;
  const P = (p) => (ident ? p.slice() : apply4(M, p));
  switch (g.prim) {
    case 'sphere': out.push({ type: 'sphere', centers: g.centers.map(P), radius: g.radius, ...s }); break;
    case 'line': out.push({ type: 'line', points: g.points.map(P), ...s }); break;
    case 'cylinder': out.push({ type: 'cylinder', p1: P(g.p1), p2: P(g.p2), radius: g.radius, ...s }); break;
    case 'polygon': out.push(g.textureCoordinates && style.texture // v0.1.26: a textured polygon also carries both
      ? { type: 'polygon', points: g.points.map(P), ...s, texture: style.texture, textureCoordinates: g.textureCoordinates }
      : { type: 'polygon', points: g.points.map(P), ...s }); break;
    case 'infinitePlane': out.push({ type: 'infinitePlane', points: g.points.map(P), ...s }); break;
    case 'point': out.push({ type: 'point', points: g.points.map(P), ...s }); break;
    case 'arrow': out.push({ type: 'arrow', points: g.points.map(P), ...s }); break;
    case 'cuboid': out.push({ type: 'cuboid', min: g.min.slice(), max: g.max.slice(), ...(ident ? {} : { matrix: M }), ...s }); break;
    case 'ellipsoid': out.push({ type: 'ellipsoid', center: g.center.slice(), Sigma: g.Sigma, ...(ident ? {} : { matrix: M }), ...s }); break;
    case 'circle': out.push({ type: 'circle', ...(ident ? {} : { matrix: M }), ...s }); break;
    case 'parametricCurve': out.push({ type: 'parametricCurve', f: g.f, u: g.u, ...(ident ? {} : { matrix: M }), ...s }); break;
    case 'parametricSurface': out.push({ type: 'parametricSurface', f: g.f, u: g.u, v: g.v, mesh: g.mesh, ...(ident ? {} : { matrix: M }), ...s }); break;
    case 'tube': out.push({ type: 'tube', points: g.points.map(P), radius: g.radius, ...s }); break;
    case 'cone': out.push({ type: 'cone', p1: P(g.p1), p2: P(g.p2), radius: g.radius, ...s }); break;
    case 'infiniteLine': out.push({ type: 'infiniteLine', points: g.points.map(P), ...s }); break;
    case 'text': out.push({ type: 'text', expr: g.expr, pos: P(g.pos), ...s, fontSize: style.fontSize ?? 12 }); break;
    default: throw new Error(`unknown primitive ${g.prim}`);
  }
  return out;
}

/** GraphicsComplex: indices resolved; a Polygon of several index lists becomes one 'mesh' primitive */
function flattenComplex(gc, style, M, out) {
  const at = (i) => gc.points[i - 1];
  const walk = (c, st) => {
    if (c == null) return;
    if (Array.isArray(c)) { for (const e of c) { if (e && e.directive) st = applyDirective(st, e); else walk(e, st); } return; }
    if (c.prim === 'polygon' && Array.isArray(c.points[0])) {
      const s = { color: st.color, opacity: st.opacity, thickness: st.thickness, pointSize: st.pointSize, arrowheads: st.arrowheads };
      if (st.edgeForm != null) s.edgeForm = st.edgeForm;
      out.push({ type: 'mesh', points: gc.points.map((p) => (M === I4 ? p.slice() : apply4(M, p))), polygons: c.points.map((l) => l.map((i) => i - 1)), ...s });
    } else if (c.prim === 'polygon' || c.prim === 'line' || c.prim === 'point' || c.prim === 'arrow') flatten({ ...c, points: c.points.map(at) }, st, M, out);
    else flatten(c, st, M, out);
  };
  walk(gc.content, style);
  return out;
}

/** The parts of a graphic for the renderer: [{content, key}] — each top-level Group3D one part, runs of other content one part each. */
export function groupsOf(g) {
  const list = g && g.head === 'Graphics3D' ? g.content : Array.isArray(g) ? g : [g];
  const parts = [];
  let run = null;
  for (const e of list) {
    if (e && e.prim === 'group') { parts.push({ content: e.content, key: e.key }); run = null; } else {
      if (!run) { run = { content: [], key: undefined }; parts.push(run); }
      run.content.push(e);
    }
  }
  return parts;
}

// ---- frame, clipping, BoxRatios (pure; shared/graphics3d-view.js draws them) ------------------------------------
/**
 * The six clipping planes that keep the inside of box {{x0, x1}, {y0, y1}, {z0, z1}} (explicit PlotRange), as
 * [normal, constant] (three.js Plane: normal·p + constant >= 0 is kept), widened by `padding`; order 'min-first'
 * ({1,0,0} x >= x0, then {-1,0,0} x <= x1, per axis) or 'max-first' (the upper plane of each axis first).
 */
export function clipPlaneData(box, { padding = 0, order = 'min-first' } = {}) {
  return box.flatMap(([a, b], i) => {
    const n = [0, 0, 0]; n[i] = 1;
    const m = [0, 0, 0]; m[i] = -1;
    const lo = [n, padding ? -a + padding : -a], hi = [m, padding ? b + padding : b];
    return order === 'max-first' ? [hi, lo] : [lo, hi];
  });
}

/**
 * BoxRatios -> {rx, ry, rz}: the plot range box drawn as a box of these ratios, longest side 1, centred at the origin.
 * Returns {scale, position} (data → drawn: q = scale·p + position) and worldBox (the drawn box).
 */
export function boxRatioTransform(box, ratios) {
  const top = Math.max(...ratios);
  const side = ratios.map((r) => r / top);
  return {
    scale: box.map(([a, b], k) => side[k] / (b - a)),
    position: box.map(([a, b], k) => (-(a + b) / 2 / (b - a)) * side[k]),
    worldBox: side.map((s) => [-s / 2, s / 2]),
  };
}

/**
 * Ticks -> Automatic for the range [a, b] (pure): major step = the largest of {1, 2, 5}·10^n not above (b - a)/2,
 * minor step = major/4 (mantissa 2) or major/5; values k·step (k/(1/step) for steps below 1, so 0.3 is 3/10). Returns
 * [[v, label, length]] in increasing order: every minor position inside [a, b], majors labelled ("2", "0.5": as many
 * decimals as the major step) with length 0.035, minors unlabelled with 0.018 (fractions of the box side).
 */
export function niceTicks([a, b], { major: majorLen = 0.035, minor: minorLen = 0.018 } = {}) {
  const half = (b - a) / 2;
  let e = Math.floor(Math.log10(half)), step = null, mant = 1;
  for (let k = 0; k < 3 && step === null; k++, e--) {
    for (const m of [5, 2, 1]) { const s = m * 10 ** e; if (s <= half) { step = s; mant = m; break; } }
  }
  const minor = step / (mant === 2 ? 4 : 5);
  const val = (k, s) => (s < 1 ? k / Math.round(1 / s) : k * s);
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const isMajor = (v) => { const q = v / step; return Math.abs(q - Math.round(q)) < 1e-9; };
  const out = [];
  for (let k = Math.ceil(a / minor - 1e-9) + 0; val(k, minor) <= b + 1e-12; k++) {
    const v = val(k, minor);
    out.push(isMajor(v) ? [v, v.toFixed(decimals), majorLen] : [v, '', minorLen]);
  }
  return out;
}

/**
 * Geometry of the box frame and axes (Boxed, Axes, Ticks, AxesLabel) in drawn coordinates (pure). box: the data plot
 * range; worldBox: the drawn box (box itself, or the BoxRatios box); AxesEdge {{y, z}, {x, z}, {x, y}} sides (±1) of
 * the edge each axis is drawn on (default the edges Mathematica uses for its default ViewPoint {1.3, -2.4, 2});
 * ticks[k]: [[v, label, length]] (length × the box side S = the longest side of worldBox); tickLabelOffset and
 * axisLabelOffset × S outwards. Returns {edges: [[p, q]] (12, x edges then y then z), axes: [{ticks: [[p, q]],
 * tickLabels: [{text, pos}], label: {pos}}]} — ticks outside the range are left out.
 */
export function frameData({ box, worldBox = box, AxesEdge = [[-1, -1], [-1, 1], [-1, -1]], ticks, tickLabelOffset = 0.06, axisLabelOffset = 0.14 }) {
  const S = Math.max(...worldBox.map(([a, b]) => b - a));
  const [cx, cy, cz] = worldBox;
  const edges = [];
  for (const y of cy) for (const z of cz) edges.push([[cx[0], y, z], [cx[1], y, z]]);
  for (const x of cx) for (const z of cz) edges.push([[x, cy[0], z], [x, cy[1], z]]);
  for (const x of cx) for (const y of cy) edges.push([[x, y, cz[0]], [x, y, cz[1]]]);
  const side = (k, s) => (s < 0 ? worldBox[k][0] : worldBox[k][1]);
  const scaled = worldBox !== box;
  const axes = [0, 1, 2].map((k) => {
    const others = [0, 1, 2].filter((i) => i !== k);
    const out = [0, 0, 0];
    others.forEach((i, j) => { out[i] = AxesEdge[k][j]; });
    const at = (t) => { const p = [0, 0, 0]; p[k] = t; others.forEach((i, j) => { p[i] = side(i, AxesEdge[k][j]); }); return p; };
    const [a, b] = box[k], [lo, hi] = worldBox[k];
    const s = (v) => (scaled ? lo + ((v - a) / (b - a)) * (hi - lo) : v);
    const o = out.map((v) => v / Math.hypot(...out));
    const list = ticks[k] ?? [];
    const inside = list.filter(([v]) => v >= a && v <= b);
    return {
      ticks: inside.map(([v, , len]) => { const p = at(s(v)); return [p, p.map((x, i) => x + o[i] * len * S)]; }),
      tickLabels: inside.filter(([, l]) => l !== '' && l != null).map(([v, l]) => ({ text: l, pos: at(s(v)).map((x, i) => x + o[i] * tickLabelOffset * S) })),
      label: { pos: at((lo + hi) / 2).map((x, i) => x + o[i] * axisLabelOffset * S) },
    };
  });
  return { edges, axes };
}

/**
 * Width in world units that an image shows at the centre of the box (PointSize reference): 2 |viewPoint| L
 * tan(viewAngle/2) w/h with L the longest side of the box and ImageSize {w, h} (or a number: square).
 */
export function imageWidth(box, { viewPoint, viewAngle, imageSize }) {
  const longest = Math.max(...box.map(([a, b]) => b - a));
  const ratio = Array.isArray(imageSize) ? imageSize[0] / imageSize[1] : 1;
  return 2 * Math.hypot(...viewPoint) * longest * Math.tan(viewAngle / 2) * ratio;
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

/** Points of a circle primitive (an exact unit circle; matrix applied). */
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
  if (n[0] === 0 && n[1] === 0 && n[2] === 0) return []; // v0.1.23: collinear points define no plane
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
/** v0.1.23: the part of the line through p1, p2 inside the box [[x0, x1], [y0, y1], [z0, z1]] ([] if it misses it). */
export function infiniteLineSegment([p1, p2], box) {
  const d = [0, 1, 2].map((k) => p2[k] - p1[k]);
  let lo = -Infinity, hi = Infinity;
  for (let k = 0; k < 3; k++) {
    if (d[k] === 0) { if (p1[k] < box[k][0] || p1[k] > box[k][1]) return []; continue; }
    const t0 = (box[k][0] - p1[k]) / d[k], t1 = (box[k][1] - p1[k]) / d[k];
    lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
  }
  if (!(hi > lo) || !Number.isFinite(lo)) return [];
  return [lo, hi].map((t) => [0, 1, 2].map((k) => p1[k] + t * d[k]));
}
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
      case 'line': case 'polygon': case 'point': case 'arrow': case 'infinitePlane': case 'mesh': for (const q of p.points) add(q); break;
      case 'tube': for (const q of p.points) add(q, [p.radius, p.radius, p.radius]); break;
      case 'cone': add(p.p1, [p.radius, p.radius, p.radius]); add(p.p2); break;
      case 'text': add(p.pos); break;
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
