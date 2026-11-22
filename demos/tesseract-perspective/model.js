// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alexander Perepelitsa
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/tesseract-perspective/model.js — one evaluation of the Manipulate body: the state in, { view, graphics } out
// (pure, no DOM). The original's initialization code with the same names and in the same order:
//   UpDimShape builds the edges of the square, the cube and the tesseract recursively (each shape twice, at -1 and +1 in
//   a new coordinate, plus the segments joining the copies); RotFigure4 rotates in homogeneous 5 × 5 matrices; Trans5
//   moves the tesseract to w = -3; Perspective projects from the 4D origin to the 3-space w = d (d = -1) and drops w.
// The picture: Graphics3D[{Lighter@Blue, CapForm["Round"], Specularity[White, 20], Tube[edges, 0.04]}, PlotRange ->
// {{-.7, .7}, {-.7, .7}, {-.7, .7}}, Boxed -> False, Lighting -> "Neutral", ImageSize -> 1.1 {400, 400},
// SphericalRegion -> True]. Tube with a list of lines, CapForm and Specularity are not in shared/graphics3d.js: they are
// written here as Graphics3D data (Tube of several lines = a list of shared Tubes, the two directives as directive
// objects that shared/graphics3d.js ignores) and drawn by picture3d.js (D-TT-01).
import { Graphics3D, RGBColor, Tube as Tube1 } from '../../shared/graphics3d.js';
import { Union } from '../../shared/wl.js';

// ---- the original's initialization code ----------------------------------------------------------------------------

/** IncDim[sg_, d_] := Map[Append[#, d] &, sg, {2}] — every point of every segment gets a new last coordinate d */
export const IncDim = (sg, d) => sg.map((seg) => seg.map((p) => [...p, d]));
/** DblSegments[l_] := Join[IncDim[l, -1], IncDim[l, 1]] */
export const DblSegments = (l) => [...IncDim(l, -1), ...IncDim(l, 1)];
/** ConnectPoints[l1_, l2_] := Table[{Flatten[l1, 1][[i]], Flatten[l2, 1][[i]]}, {i, Length[Flatten[l1, 1]]}] */
export function ConnectPoints(l1, l2) {
  const f1 = l1.flat(1), f2 = l2.flat(1);
  return f1.map((p, i) => [p, f2[i]]);
}
/** DblConnSegments[l_] := Union[ConnectPoints[IncDim[l, -1], IncDim[l, 1]]] (Union: sorted in canonical order, no duplicates) */
export const DblConnSegments = (l) => Union(ConnectPoints(IncDim(l, -1), IncDim(l, 1)));
/** UpDimShape[l_] := Join[DblSegments[l], DblConnSegments[l]] */
export const UpDimShape = (l) => [...DblSegments(l), ...DblConnSegments(l)];
/** Sqr = UpDimShape[{{{-1}, {1}}}] (4 edges); myCube = UpDimShape[Sqr] (12); Tes = UpDimShape[myCube] (32) */
export const Sqr = UpDimShape([[[-1], [1]]]);
export const myCube = UpDimShape(Sqr);
/** Homogen[l_] := Map[Append[#, 1] &, l, {2}] */
export const Homogen = (l) => l.map((seg) => seg.map((p) => [...p, 1]));
export const Tes = UpDimShape(myCube);

/** R4x, R4y, R4z, R4k: rotations in the planes (y, z), (x, z), (x, y) and (z, w), homogeneous 5 × 5, as written */
export const R4x = (t) => [[1, 0, 0, 0, 0], [0, Math.cos(t), -Math.sin(t), 0, 0], [0, Math.sin(t), Math.cos(t), 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]];
export const R4y = (t) => [[Math.cos(t), 0, Math.sin(t), 0, 0], [0, 1, 0, 0, 0], [-Math.sin(t), 0, Math.cos(t), 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]];
export const R4z = (t) => [[Math.cos(t), -Math.sin(t), 0, 0, 0], [Math.sin(t), Math.cos(t), 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]];
export const R4k = (t) => [[1, 0, 0, 0, 0], [0, 1, 0, 0, 0], [0, 0, Math.cos(t), -Math.sin(t), 0], [0, 0, Math.sin(t), Math.cos(t), 0], [0, 0, 0, 0, 1]];

const dot = (M, v) => M.map((row) => row.reduce((s, m, j) => s + m * v[j], 0));
const mapPoints = (l, f) => l.map((seg) => seg.map(f));
/** Rotate4X[l_, Theta_] := Map[R4x[Theta].# &, l, {2}] (and Y, Z, K) */
export const Rotate4X = (l, t) => { const M = R4x(t); return mapPoints(l, (p) => dot(M, p)); };
export const Rotate4Y = (l, t) => { const M = R4y(t); return mapPoints(l, (p) => dot(M, p)); };
export const Rotate4Z = (l, t) => { const M = R4z(t); return mapPoints(l, (p) => dot(M, p)); };
export const Rotate4K = (l, t) => { const M = R4k(t); return mapPoints(l, (p) => dot(M, p)); };
/** DropUnit[l_] := Map[Drop[#, -1] &, l, {2}] */
export const DropUnit = (l) => mapPoints(l, (p) => p.slice(0, -1));
/** RotFigure4[l_, Thetax_, Thetay_, Thetaz_, Thetak_] := DropUnit[Rotate4K[Rotate4Z[Rotate4Y[Rotate4X[Homogen[l], Thetax], Thetay], Thetaz], Thetak]] */
export const RotFigure4 = (l, tx, ty, tz, tk) => DropUnit(Rotate4K(Rotate4Z(Rotate4Y(Rotate4X(Homogen(l), tx), ty), tz), tk));
/** Ortho[l_] := Map[Drop[#, -1] &, l, {2}] */
export const Ortho = (l) => mapPoints(l, (p) => p.slice(0, -1));
/** PersPoint[pt_, d_] := Map[#/(Last[pt]/d) &, pt] — the point scaled so that its last coordinate becomes d */
export const PersPoint = (pt, d) => pt.map((x) => x / (pt.at(-1) / d));
/** Perspective[l_, d_] := Ortho[Map[PersPoint[#, d] &, l, {2}]] */
export const Perspective = (l, d) => Ortho(mapPoints(l, (p) => PersPoint(p, d)));
/** Mtr4[x_, y_, z_, k_]: the homogeneous translation by {x, y, z, k} */
export const Mtr4 = (x, y, z, k) => [[1, 0, 0, 0, x], [0, 1, 0, 0, y], [0, 0, 1, 0, z], [0, 0, 0, 1, k], [0, 0, 0, 0, 1]];
/** Trans5vec[l_, x_, y_, z_, k_] := Map[Mtr4[x, y, z, k].# &, l, {2}] */
export const Trans5vec = (l, x, y, z, k) => { const M = Mtr4(x, y, z, k); return mapPoints(l, (p) => dot(M, p)); };
/** Trans5[l_, x_, y_, z_, k_] := DropUnit[Trans5vec[Homogen[l], x, y, z, k]] */
export const Trans5 = (l, x, y, z, k) => DropUnit(Trans5vec(Homogen(l), x, y, z, k));

// ---- Graphics3D pieces not in shared/graphics3d.js (shared candidates) ----------------------------------------------

/** Lighter[c] = Blend[{c, White}, 1/3]; Lighter@Blue = RGBColor[1/3, 1/3, 1] */
export const Lighter = (c) => RGBColor(...c.value.map((x) => x + (1 - x) / 3));
const BlueColor = RGBColor(0, 0, 1);
/** CapForm["Round"] / Specularity[White, n] as directives (ignored by shared/graphics3d.js flatten, read by styledTubes) */
export const CapForm = (form) => ({ directive: 'capForm', value: form });
export const Specularity = (c, n) => ({ directive: 'specularity', value: { color: c.value, exponent: n } });
export const White = RGBColor(1, 1, 1);
/** Tube[{line1, line2, …}, r] is a list of tubes, Tube[{p1, p2, …}, r] one tube */
export const Tube = (pts, r) => (Array.isArray(pts[0]?.[0]) ? pts.map((l) => Tube1(l, r)) : Tube1(pts, r));

/**
 * The tubes of a Graphics3D with their style: [{ points, radius, color, capForm, specularity }] in drawing order.
 * Directives are scoped to their list, as in Mathematica; defaults: white surface, CapForm None (no caps), no
 * specularity.
 */
export function styledTubes(g) {
  const out = [];
  const walk = (x, st) => {
    if (x == null) return;
    if (x.head === 'Graphics3D') { walk(x.content, st); return; }
    if (Array.isArray(x)) {
      let s = st;
      for (const e of x) {
        if (e && e.directive === 'color') s = { ...s, color: e.value };
        else if (e && e.directive === 'capForm') s = { ...s, capForm: e.value };
        else if (e && e.directive === 'specularity') s = { ...s, specularity: e.value };
        else if (e && !e.directive) walk(e, s);
      }
      return;
    }
    if (x.prim === 'tube') out.push({ points: x.points, radius: x.radius, ...st });
  };
  walk(g, { color: [1, 1, 1], capForm: 'None', specularity: null });
  return out;
}

// ---- the Manipulate body -------------------------------------------------------------------------------------------

/** The Manipulate's initial value (also the notebook's live state and snapshot 1): a = 0 */
export const initialState = () => ({ a: 0 });

/** The edges of the tesseract in 3-space: Perspective[Trans5[RotFigure4[Tes, 0, 0, 0, a], 0, 0, 0, -3], -1] */
export const edges = (a) => Perspective(Trans5(RotFigure4(Tes, 0, 0, 0, a), 0, 0, 0, -3), -1);

export const PLOT_RANGE = [[-0.7, 0.7], [-0.7, 0.7], [-0.7, 0.7]];

/**
 * Manipulate[Graphics3D[{Lighter@Blue, CapForm["Round"], Specularity[White, 20], Tube[Perspective[Trans5[RotFigure4[Tes,
 * 0, 0, 0, a], 0, 0, 0, -3], -1], 0.04]}, PlotRange -> {{-.7, .7}, {-.7, .7}, {-.7, .7}}, Boxed -> False,
 * Lighting -> "Neutral", ImageSize -> 1.1 {400, 400}, SphericalRegion -> True], {{a, 0, "rotate"}, 0, 2*3.1416, .0001,
 * Appearance -> "Labeled"}, SaveDefinitions -> True]
 */
export function evaluate({ a }) {
  const lines = edges(a);
  const graphics = Graphics3D(
    [Lighter(BlueColor), CapForm('Round'), Specularity(White, 20), Tube(lines, 0.04)],
    { PlotRange: PLOT_RANGE, Boxed: false, Lighting: 'Neutral', ImageSize: 440, SphericalRegion: true },
  );
  return { view: { a, edges: lines }, graphics };
}
