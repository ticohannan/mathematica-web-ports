// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Gerard Balmens
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/hypercube-4d-rotation/model.js — one evaluation of the Manipulate body of "Rotating a Hypercube in 4D": the
// state in, { view, graphics } out (pure, no DOM). The original's definitions in its order: the six 5 × 5 homogeneous
// rotation matrices Rxw … Ryz (row-vector convention, V.M), Transw, Proj and their product ProjRot; the colours c1 … c4;
// the 16 vertices V, the 32 edges, the vertex colours cf, the 24 square faces allface and the faces deleted for each
// "hypercube" choice (deleteface); then the body (coord, dfig, Show).
//
// Faces with VertexColors: shared/graphics3d.js has GraphicsComplex polygons without VertexColors, so `facesPrim` writes
// the faces directly as the shared 'plotSurface' primitive (indexed triangles with vertex colours, drawn by
// shared/graphics3d-three.js on a two-sided Lambert material); the polygon edges are thick black lines (EdgeForm[{Black,
// AbsoluteThickness[3]}]); see DESIGN.md N-HY-02.
import { Graphics3D, Show, Line, Sphere, Text, FontSize, Opacity, RGBColor, Thick } from '../../shared/graphics3d.js';

const { cos, sin } = Math;

/** Chop[x] (tolerance 10^-10), elementwise on lists */
export const Chop = (x) => (Array.isArray(x) ? x.map(Chop) : Math.abs(x) < 1e-10 ? 0 : x);
/** m1 . m2 for matrices (lists of rows) */
const dot = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, x, k) => s + x * B[k][j], 0)));

// ---- Initialization Code -----------------------------------------------------------------------------------------
// Grid rows as in the notebook: v.R with a row vector v. Rxw[a] turns y and z (fixes the W-X plane), Ryw[b] x and z,
// Rzw[c] x and y, Rxy[d] z and w, Rxz[e] y and w, Ryz[f] x and w.
export const Rxw = (a) => [[1, 0, 0, 0, 0], [0, cos(a), -sin(a), 0, 0], [0, sin(a), cos(a), 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]];
export const Ryw = (b) => [[cos(b), 0, -sin(b), 0, 0], [0, 1, 0, 0, 0], [sin(b), 0, cos(b), 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]];
export const Rzw = (c) => [[cos(c), -sin(c), 0, 0, 0], [sin(c), cos(c), 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]];
export const Rxy = (d) => [[1, 0, 0, 0, 0], [0, 1, 0, 0, 0], [0, 0, cos(d), -sin(d), 0], [0, 0, sin(d), cos(d), 0], [0, 0, 0, 0, 1]];
export const Rxz = (e) => [[1, 0, 0, 0, 0], [0, cos(e), 0, -sin(e), 0], [0, 0, 1, 0, 0], [0, sin(e), 0, cos(e), 0], [0, 0, 0, 0, 1]];
export const Ryz = (f) => [[cos(f), 0, 0, -sin(f), 0], [0, 1, 0, 0, 0], [0, 0, 1, 0, 0], [sin(f), 0, 0, cos(f), 0], [0, 0, 0, 0, 1]];
/** Transw[w]: w -> w + dw (the last row adds w times the homogeneous coordinate to the fourth) */
export const Transw = (w) => [[1, 0, 0, 0, 0], [0, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, w, 1]];
/** Proj[pw]: the homogeneous coordinate becomes 1 + pw w (the "stereographic projection"; a central projection, §11 E-HY-01) */
export const Proj = (pw) => [[1, 0, 0, 0, 0], [0, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, pw], [0, 0, 0, 0, 1]];
/** ProjRot[a, b, c, d, e, f, dw, pw] = Chop[N[Rxw[a].Ryw[b].Rzw[c].Rxy[d].Rxz[e].Ryz[f].Transw[dw].Proj[pw]]] */
export const ProjRot = (a, b, c, d, e, f, dw, pw) =>
  Chop([Rxw(a), Ryw(b), Rzw(c), Rxy(d), Rxz(e), Ryz(f), Transw(dw), Proj(pw)].reduce(dot));

export const c1 = [1, 0, 0], c2 = [0, 1, 0], c3 = [0, 0, 1], c4 = [1, 1, 0];

export const V = [[-1, -1, -1, -1, 1], [1, -1, -1, -1, 1], [1, 1, -1, -1, 1], [-1, 1, -1, -1, 1],
  [-1, -1, 1, -1, 1], [1, -1, 1, -1, 1], [1, 1, 1, -1, 1], [-1, 1, 1, -1, 1],
  [-1, -1, -1, 1, 1], [1, -1, -1, 1, 1], [1, 1, -1, 1, 1], [-1, 1, -1, 1, 1],
  [-1, -1, 1, 1, 1], [1, -1, 1, 1, 1], [1, 1, 1, 1, 1], [-1, 1, 1, 1, 1]];
export const edge = [[1, 2], [2, 3], [3, 4], [4, 1], [1, 5], [2, 6], [3, 7],
  [4, 8], [5, 6], [6, 7], [7, 8], [8, 5], [9, 10], [10, 11], [11, 12],
  [12, 9], [9, 13], [10, 14], [11, 15], [12, 16], [13, 14], [14, 15],
  [15, 16], [16, 13], [1, 9], [2, 10], [3, 11], [4, 12], [5, 13],
  [6, 14], [7, 15], [8, 16]];
export const cf = [c3, c3, c3, c3, c1, c1, c1, c1, c2, c2, c2, c2, c4, c4, c4, c4];

export const allface = [[1, 2, 3, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 4, 8, 7],
  [4, 1, 5, 8], [5, 6, 7, 8], [9, 10, 11, 12], [9, 10, 14, 13],
  [10, 11, 15, 14], [11, 12, 16, 15], [12, 9, 13, 16], [13, 14, 15, 16],
  [1, 2, 10, 9], [2, 3, 11, 10], [3, 4, 12, 11], [4, 1, 9, 12],
  [5, 6, 14, 13], [6, 7, 15, 14], [7, 8, 16, 15], [8, 5, 13, 16],
  [1, 9, 13, 5], [2, 10, 14, 6], [3, 11, 15, 7], [4, 12, 16, 8]];

export const deleteface = [[],
  [[2], [4], [8], [10]],
  [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12]]];

/** Delete[list, {{i}, {j}, …}]; Delete[list, {}] deletes nothing (the "full" hypercube of snapshot 1, N-HY-01) */
export const Delete = (list, positions) => {
  const gone = new Set(positions.map(([i]) => i));
  return list.filter((_, k) => !gone.has(k + 1));
};

/** Darker[c] = Blend[{c, Black}, 1/3] */
const darker = (c) => c.map((x) => (2 / 3) * x);
/** the opening state: the notebook's live state (golden states[0]; snapshot 1 has the same settings) */
export const initialState = () => ({ hyp: 1, graph: 1, op: 0.4, axe: 0, pw: 1, dur: 20, a: 0, b: 0, c: 0.054660199596142635, d: 0.05453616286837221, e: 0, f: 0 });
/** the Manipulate's own initial values ("Initial settings") */
export const initialSettings = () => ({ hyp: 1, graph: 1, op: 0.4, axe: 0, pw: 1, dur: 20, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 });

/** the projected vertices: VP = Chop[N[V.ProjRot[…]]], vertices = Chop[VP[[i, k]]/VP[[i, 5]]] (k = 1 … 3) */
export function projectedVertices({ a, b, c, d, e, f, pw }, dw = 2) {
  const VP = Chop(dot(V, ProjRot(a, b, c, d, e, f, dw, pw)));
  return { VP, vertices: Chop(VP.map((r) => [r[0] / r[4], r[1] / r[4], r[2] / r[4]])) };
}

/** the eye direction of ViewPoint {1.1, -2.4, 1.4}: the faces are listed far to near from it (see facesPrim) */
export const VIEWPOINT = [1.1, -2.4, 1.4];

/**
 * GraphicsComplex[vertices, Polygon[face], VertexColors -> cf] (colors = cf) or GraphicsComplex[vertices, Polygon[face]]
 * (colors = null, the colour of the directives) as one shared 'plotSurface' primitive: each square two triangles
 * (i, j, k), (i, k, l); the faces ordered far to near along the ViewPoint so that the translucent faces blend back to
 * front from the opening view (Mathematica sorts them for every view, K-HY-02).
 */
export function facesPrim(vertices, face, colors) {
  const depth = (q) => q.reduce((s, i) => s + vertices[i - 1].reduce((t, x, k) => t + x * VIEWPOINT[k], 0), 0) / q.length;
  const order = face.map((q) => [q, depth(q)]).sort((u, w) => u[1] - w[1]).map(([q]) => q);
  return {
    prim: 'plotSurface', points: vertices, normals: vertices.map(() => [0, 0, 1]), colors,
    triangles: order.flatMap(([i, j, k, l]) => [[i - 1, j - 1, k - 1], [i - 1, k - 1, l - 1]]),
    meshLines: [], meshStyle: { color: [0, 0, 0], opacity: 1 }, baseColor: null, baseOpacity: 1,
  };
}
/** EdgeForm[{Black, AbsoluteThickness[thick]}] of the polygons: their sides as thick black lines (opaque) */
export const faceEdges = (vertices, face) => face.map((q) => Line([...q, q[0]].map((i) => vertices[i - 1])));

/** NumberForm[Chop[x/N[Degree]], {4, 0}]: the angle display of the rotation controls ("0" for zero, "3." otherwise) */
export function angleText(x) {
  const deg = Chop(x / (Math.PI / 180));
  return deg === 0 ? '0' : `${Math.round(deg)}.`;
}

/** Manipulate body: { view, graphics } */
export function evaluate(s) {
  const { hyp, graph, op, axe, pw } = s;
  // (* Init *)
  const lum = [['Ambient', [1, 1, 1]]];
  const ptr1 = 2 - pw, ptr2 = 1.05 * ptr1;
  // (* Choice *)
  const face = Delete(allface, deleteface[hyp - 1]);
  // (* Calculs *)
  const { VP, vertices } = projectedVertices(s);
  // (* Graphics *)
  const opt1 = Number(axe) === 1 ? 1 : 0;
  const label = (t, pos) => [FontSize(14), Text({ html: `<i>${t}</i>` }, pos)];
  const coord = Graphics3D([Thick, Opacity(opt1),
    [RGBColor(...darker([1, 0, 0])), Line([[-ptr1, 0, 0], [ptr1, 0, 0]]), label('X', [ptr2, 0, 0])],
    [RGBColor(...darker([0, 1, 0])), Line([[0, -ptr1, 0], [0, ptr1, 0]]), label('Y', [0, ptr2, 0])],
    [RGBColor(...darker([0, 0, 1])), Line([[0, 0, -ptr1], [0, 0, ptr1]]), label('Z', [0, 0, ptr2])]],
  { Boxed: false, ViewPoint: VIEWPOINT, SphericalRegion: true, ViewAngle: (18.5 * Math.PI) / 180, Lighting: lum });
  const pts = [RGBColor(1, 0, 0), Sphere(vertices, 0.03)];
  const lines = edge.map(([i, j]) => Line([vertices[i - 1], vertices[j - 1]]));
  let dfig;
  if (graph === 1) dfig = Graphics3D([Opacity(op), facesPrim(vertices, face, cf), [Opacity(1), RGBColor(0, 0, 0), Thick, ...faceEdges(vertices, face)]], { Lighting: lum });
  else if (graph === 2) dfig = Graphics3D([Opacity(op), RGBColor(0.2, 0.6, 0.9), facesPrim(vertices, face, null), [Opacity(1), RGBColor(0, 0, 0), Thick, ...faceEdges(vertices, face)]], { Lighting: lum });
  else dfig = Graphics3D([Thick, RGBColor(0, 0, 0), ...lines, pts]);
  // (* Display *)
  const graphics = Show(coord, dfig); // AspectRatio -> Automatic, ImageSize -> {350, 350}: main.js (View3D)
  return {
    view: { vertices, VP, faces: face.length, ptr1, ptr2, opt1, angles: ['a', 'b', 'c', 'd', 'e', 'f'].map((k) => angleText(s[k])) },
    graphics,
  };
}
