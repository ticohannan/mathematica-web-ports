// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Yunfeng Shi and Adam Bross
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/crystal-structures-miller/model.js — one evaluation of the Manipulate body of "Simple Crystal Structures and
// Miller Indices": the state in, { view, graphics } out (pure, no DOM). Simple mode: plain arithmetic on
// shared/graphics3d.js (Sphere, Cuboid, Line, Plot3D, ParametricPlot3D, Show).
// Variable names are the original's: CrystalType, rp (repeats), radius, radius2, sx, sy, sz (cell shifts), DrawCell,
// DrawCubeFace, DrawPlanes, m, n, r (the Miller indices h, k, l).
import { Graphics3D, Show, Plot3D, ParametricPlot3D, Sphere, Cuboid, Line, Point, Red, Blue, Black, Thick, EdgeForm, RGBColor } from '../../shared/graphics3d.js';
import { isCorrected } from '../../shared/errata.js';

/** The Manipulate's initial values (= the notebook's live state and snapshot 1). */
export const initialState = () => ({
  CrystalType: 'SC', rp: 1, radius: 0.1, radius2: 0.1, sx: 0, sy: 0, sz: 0,
  DrawCell: false, DrawCubeFace: false, DrawPlanes: false, m: 1, n: 1, r: 1,
});

/** The popup's values, in the original's order. */
export const CRYSTAL_TYPES = ['SC', 'BCC', 'FCC', 'HCP', 'CsCl', 'Diamond', 'NaCl', 'ZnS'];
/** The Miller index values {-4, …, 4}. */
export const MILLER_VALUES = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

/** HCP's cell in the original: a = 1, b = Sqrt[3.], c = Sqrt[8/3.] (the ideal c/a); 1, 1, 1 for the cubic ones. */
export const SQRT3 = Math.sqrt(3), SQRT83 = Math.sqrt(8 / 3);
export const cellSides = (CrystalType) => (CrystalType === 'HCP' ? [1, SQRT3, SQRT83] : [1, 1, 1]);

/** Lighter[Blue] = Blend[{Blue, White}, 1/3] (the cell face). */
export const LIGHTER_BLUE = [1 / 3, 1 / 3, 1];

/**
 * Table[{Sphere[{x + a, y + b, z + c}, …]}, {x, 0, rp}, {y, 0, rp}, {z, 0, rp}] (x outermost): the centres; `scale`
 * multiplies the sums (HCP: {(x + a)·1.0, (y + b)·Sqrt[3.], (z + c)·Sqrt[8/3.]}).
 */
export function table(rp, [a, b, c], scale = [1, 1, 1]) {
  const out = [];
  for (let x = 0; x <= rp; x++) for (let y = 0; y <= rp; y++) for (let z = 0; z <= rp; z++) {
    out.push([(x + a) * scale[0], (y + b) * scale[1], (z + c) * scale[2]]);
  }
  return out;
}

const FCC = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
const TETRA = [[0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];
const OCTA = [[0.5, 0, 0], [0.5, 0.5, 0.5], [0, 0, 0.5], [0, 0.5, 0]];
const HCP = [[0, 0, 0], [0.5, 0.5, 0], [0, 1 / 3, 0.5], [0.5, 5 / 6, 0.5]];

/**
 * The atoms of the body's nested If, in the original's Join order: a list of { color: 'Red' | 'Blue' | null (the
 * default surface colour), radius, offset, centres }. The fallback (any other CrystalType) is FCC. ZnS draws its blue
 * spheres with `radius` (E-CM-01: radius2 when corrected).
 */
export function atomGroups(state) {
  const { CrystalType, rp, radius, radius2 } = state;
  const g = (color, rad, offsets, scale) => offsets.map((o) => ({ color, radius: rad, offset: o, centers: table(rp, o, scale) }));
  switch (CrystalType) {
    case 'SC': return g(null, radius, [[0, 0, 0]]);
    case 'BCC': return g(null, radius, [[0, 0, 0], [0.5, 0.5, 0.5]]);
    case 'ZnS': return [...g('Red', radius, FCC), ...g('Blue', isCorrected(state) ? radius2 : radius, TETRA)];
    case 'NaCl': return [...g('Red', radius, FCC), ...g('Blue', radius2, OCTA)];
    case 'Diamond': return g(null, radius, [...FCC, ...TETRA]);
    case 'CsCl': return [...g('Red', radius, [[0, 0, 0]]), ...g('Blue', radius2, [[0.5, 0.5, 0.5]])];
    case 'HCP': return g(null, radius, HCP, [1, SQRT3, SQRT83]);
    default: return g(null, radius, FCC); // FCC (the last branch of the nested If)
  }
}

/**
 * The unit cell: Cuboid[{sx, sy, sz}, {sx + 1, sy + If[HCP, Sqrt[3.], 1], sz + If[HCP, Sqrt[8/3.], 1]}] (the shifts in
 * units of 1 for every structure; E-CM-03: in units of the HCP cell's sides when corrected).
 */
export function cellCorners(state) {
  const { CrystalType, sx, sy, sz } = state;
  const [a, b, c] = cellSides(CrystalType);
  if (isCorrected(state) && CrystalType === 'HCP') return [[sx * a, sy * b, sz * c], [(sx + 1) * a, (sy + 1) * b, (sz + 1) * c]];
  return [[sx, sy, sz], [sx + a, sy + b, sz + c]];
}

/** The 12 edges of the box between corners p and q. */
export function boxEdges([p, q]) {
  const v = (i, j, k) => [[p, q][i][0], [p, q][j][1], [p, q][k][2]];
  const out = [];
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    out.push([v(i, j, 0), v(i, j, 1)], [v(i, 0, j), v(i, 1, j)], [v(0, i, j), v(1, i, j)]);
  }
  return out;
}

/** The values of d: Table[…, {d, -3 rp, 3 rp}]; corrected (E-CM-04) at least ±(|h| + |k| + |l|)(rp + 1). */
export function planeOffsets(state) {
  const { rp, m, n, r } = state;
  const D = isCorrected(state) ? Math.max(3 * rp, (Math.abs(m) + Math.abs(n) + Math.abs(r)) * (rp + 1)) : 3 * rp;
  const out = [];
  for (let d = -D; d <= D; d++) out.push(d + 0); // + 0: no -0
  return out;
}

/**
 * The Miller planes of the body, as the original chooses them:
 *   r != 0: Plot3D[Table[(d C - m x - n y B)/r, {d, …}], {x, 0, rp + 1}, {y, 0, rp + 1}, Mesh -> None]
 *   else n != 0: ParametricPlot3D[Table[{x, (d B - m x)/n, z}, …], {x, 0, rp + 1}, {z, 0, rp + 1}, Mesh -> None]
 *   else m != 0: ParametricPlot3D[Table[{d/m, y, z}, …], {y, 0, rp + 1}, {z, 0, rp + 1}, Mesh -> None]
 *   else (0 0 0): ParametricPlot3D[Table[{d, y, z}, …], …] (the planes x = d; Q-CM-03)
 * with B = Sqrt[3.] and C = Sqrt[8/3.] for HCP, 1 otherwise. Corrected (E-CM-02): the lattice planes
 * h x/a + k y/b + l z/c = d of the cell a × b × c (differs only for HCP with two nonzero indices), and no planes for
 * (0 0 0) (E-CM-05). Returns { kind: 'Plot3D' | 'y' | 'x' | 'x000' | 'none', ds, f } with f(d) the function of the plot
 * variables.
 */
export function millerPlanes(state) {
  const { CrystalType, m, n, r } = state;
  const [, B, C] = cellSides(CrystalType);
  const fix = isCorrected(state);
  const ds = planeOffsets(state);
  if (r !== 0) {
    const f = fix ? (d) => (x, y) => (d * C - m * C * x - n * (C / B) * y) / r : (d) => (x, y) => (d * C - m * x - n * y * B) / r;
    return { kind: 'Plot3D', ds, f };
  }
  if (n !== 0) {
    const f = fix ? (d) => (x, z) => [x, (d * B - m * B * x) / n, z] : (d) => (x, z) => [x, (d * B - m * x) / n, z];
    return { kind: 'y', ds, f };
  }
  if (m !== 0) return { kind: 'x', ds, f: (d) => (y, z) => [d / m, y, z] };
  if (fix) return { kind: 'none', ds: [], f: null }; // E-CM-05: (0 0 0) is no plane
  return { kind: 'x000', ds, f: (d) => (y, z) => [d, y, z] };
}

/**
 * Ticks of one box axis as Mathematica's automatic 3D ticks come out in the snapshots (D-CM-05; the rule of
 * demos/rectangular-membrane boxTicks, copied app-locally): the major step is the smallest of {1, 2, 5}·10^n with
 * (hi − lo)/step < 5 (−1 … 2 and −1 … 3: every integer, as snapshots 1–4), minor ticks at step/5 (step/4 for a step 2·10^n).
 */
export function boxTicks([lo, hi]) {
  const L = hi - lo;
  let e = Math.floor(Math.log10(L)) - 2, step = null, mant = 1;
  for (; step === null; e++) for (const m of [1, 2, 5]) { const st = m * 10 ** e; if (L / st < 5) { step = st; mant = m; break; } }
  const minor = step / (mant === 2 ? 4 : 5);
  const val = (k, st) => (st < 1 ? k / Math.round(1 / st) : k * st);
  const isMajor = (v) => Math.abs(v / step - Math.round(v / step)) < 1e-9;
  const out = [];
  for (let k = Math.ceil(lo / minor - 1e-9); val(k, minor) <= hi + 1e-12; k++) {
    const v = val(k, minor) + 0;
    out.push(isMajor(v) ? [v, String(v), 0.035] : [v, '', 0.018]);
  }
  return out;
}

/** PlotRange -> {{-1, rp + 1}, {-1, rp + 1}, {-1, rp + 1}} */
export const plotRange = (rp) => [[-1, rp + 1], [-1, rp + 1], [-1, rp + 1]];

/**
 * BoxRatios of the shown picture (Q-CM-05): Show concatenates the options of its graphics and the first Graphics3D
 * sets none, so a Plot3D (planes with l != 0) brings its BoxRatios -> {1, 1, 0.4}; otherwise Automatic (the cube of the
 * plot range: {1, 1, 1}).
 */
export const boxRatios = (state) => (state.DrawPlanes && state.r !== 0 ? [1, 1, 0.4] : [1, 1, 1]);

/** The plane surfaces (Graphics3D values) of the body. */
function planeGraphics(state, P) {
  const { rp } = state;
  const range = plotRange(rp);
  if (P.kind === 'Plot3D') {
    // the planes are exact with two sample points per side (linear functions); Plot3D cuts them at its box (D-CM-02)
    return P.ds.map((d) => Plot3D(P.f(d), [0, rp + 1], [0, rp + 1], { Mesh: 'None', PlotPoints: 2, PlotRange: [[0, rp + 1], [0, rp + 1], range[2]] }));
  }
  if (P.kind === 'none') return [Graphics3D([Point([0, 0, 0])])];
  return [ParametricPlot3D(P.ds.map((d) => (u, v) => P.f(d)(u, v)), [0, rp + 1], [0, rp + 1], { Mesh: 'None' })];
}

/** One evaluation of the body: Show[Graphics3D[{atoms, {EdgeForm, FaceForm, cell}}, …], planes, PlotRange …]. */
export function evaluate(state) {
  const { rp, DrawCell, DrawCubeFace, DrawPlanes } = state;
  const groups = atomGroups(state);
  const atoms = groups.map((a) => (a.color ? [a.color === 'Red' ? Red : Blue, Sphere(a.centers, a.radius)] : [Sphere(a.centers, a.radius)]));
  // {EdgeForm[{Thick, Black}], If[DrawCubeFace, FaceForm[Lighter[Blue]], FaceForm[]], If[DrawCell, Cuboid[…], Point[{0, 0, 0}]]}
  // drawn as the cuboid's faces (only with a face colour) and its 12 edges as thick black lines (D-CM-01)
  const corners = cellCorners(state);
  const cell = DrawCell
    ? [...(DrawCubeFace ? [[RGBColor(...LIGHTER_BLUE), EdgeForm(), Cuboid(...corners)]] : []), [Thick, Black, Line(boxEdges(corners))]]
    : [Point([0, 0, 0])];
  const P = DrawPlanes ? millerPlanes(state) : null;
  const ratios = boxRatios(state);
  const graphics = Show(
    Graphics3D([...atoms, cell], { Axes: true, AxesLabel: ['<i>x</i>', '<i>y</i>', '<i>z</i>'] }),
    ...(P ? planeGraphics(state, P) : [Graphics3D([Point([0, 0, 0])])]),
  );
  Object.assign(graphics.options, { PlotRange: plotRange(rp), SphericalRegion: true, ImageSize: 400, BoxRatios: ratios, Ticks: plotRange(rp).map(boxTicks) });
  const count = groups.reduce((s, a) => s + a.centers.length, 0);
  return {
    view: {
      atoms: count,
      groups: groups.map((a) => ({ color: a.color, radius: a.radius, offset: a.offset, count: a.centers.length })),
      cell: DrawCell ? { corners, face: !!DrawCubeFace } : null,
      planes: P ? { kind: P.kind, ds: P.ds } : null,
      plotRange: plotRange(rp),
      boxRatios: ratios,
    },
    graphics,
  };
}
