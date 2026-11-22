// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Kenneth E. Caviness
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/longitudinal-standing-waves/model.js — one evaluation of the Manipulate body: the state in, { view, graphics } out
// (pure, no DOM). The original's Initialization first (same names and order), then the body.
import { Plot } from '../../shared/plot.js';
import {
  Line, Point, Arrow, Text, Subscript, Black, Blue, Red, Gray, Directive, Thick, Arrowheads, Annotation, AbsoluteDashing,
  AbsolutePointSize,
} from '../../shared/graphics.js';
import { Range, Table, Partition, Join, Intersection, Flatten, Select, Transpose, MapThread, Outer, Boole, Cos, Pi, RandomReal, EuclideanDistance, Norm, MemberQ, Position, Times } from '../../shared/wl.js';
import { createRng } from '../../shared/random.js';
import { isCorrected } from '../../shared/errata.js';

// ---- Initialization ------------------------------------------------------------------------------------------------
// T=1;L=7;ε=.01;H=.6;
export const T = 1, L = 7, ε = 0.01, H = 0.6;
// Dotted (Dashing[{0, Small}]) as the snapshots show it: dots every 5 px (D-LS-03)
export const Dotted = AbsoluteDashing([0, 5]);
// the default point size of the original's picture: points 3.3 px across in the snapshots (D-LS-03)
export const POINT_SIZE = AbsolutePointSize(3.3);
// plotstyle: 1 sum, 2 right, 3 left (Directive[Dashing[{}], Thick, colour]), 4 and 5 the transverse envelope
// (Directive[Dotted, Gray]), 6 and 7 the pipe's border (Black)
export const plotstyle = [
  Directive(Thick, Black),
  Directive(Thick, Blue),
  Directive(Thick, Red),
  Directive(Dotted, Gray),
  Directive(Dotted, Gray),
  Black,
  Black,
];

/**
 * Union[list, SameTest -> test] for points and test = (EuclideanDistance[#1, #2] < d &): the list in canonical order
 * (x, then y) and each point kept unless it is "the same" as a point kept before it. (The original's saved cloud — 1718
 * points, sorted, no two closer than 0.1 — fits this rule: the unit test checks the count against it.) Only kept points
 * less than d to the left can be the same, so the search looks back that far.
 */
export function unionNear(points, d) {
  const sorted = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const kept = [];
  for (const p of sorted) {
    let same = false;
    for (let k = kept.length - 1; k >= 0 && p[0] - kept[k][0] < d; k--) if (EuclideanDistance(p, kept[k]) < d) { same = true; break; }
    if (!same) kept.push(p);
  }
  return kept;
}
/** The seed of the point cloud (D-LS-01: Mathematica's random numbers cannot be reproduced; this cloud is the port's). */
export const PTS_SEED = 1;
/** create a bunch of spread out points, deleting near duplicates:
 *  pts = Union[Transpose@{RandomReal[{-0.8(2L), L+0.8(2L)}, #], RandomReal[{-H, H}, #]}&@5000, SameTest -> (EuclideanDistance[#1,#2] < .1 &)] */
export function makePts(rng = createRng({ seed: PTS_SEED })) {
  const xs = RandomReal([-0.8 * (2 * L), L + 0.8 * (2 * L)], 5000, rng);
  const ys = RandomReal([-H, H], 5000, rng);
  return unionNear(Transpose([xs, ys]), 0.1);
}
export const pts = makePts();
/** x-coordinates for a bunch of spaced out vertical lines: lineData = Range[-0.8(2L), L+0.8(2L), .01L] (421 values) */
export const lineData = Range(-0.8 * (2 * L), L + 0.8 * (2 * L), 0.01 * L);
/** lop[l_List] := Select[l, 0 <= # <= L &] — throws away out-of-range x-coordinates */
export const lop = (l) => Select(l, (x) => x >= 0 && x <= L);
/** lopPoints[l_List] := Select[l, 0 <= #[[1, 1]] <= L &] — throws away Points with out-of-range x-coordinates */
export const lopPoints = (l) => Select(l, (p) => p.pts[0][0] >= 0 && p.pts[0][0] <= L);
/**
 * The value of the global symbol λ in the original. fRight and fLeft are defined at the top level with λ in their
 * bodies; the Manipulate's λ is a Module variable (λ$nnn), so they never see it. SaveDefinitions stored the global λ
 * that was set when the Demonstration was saved, λ = 28/9 (in the Manipulate's Initialization), and every evaluation
 * uses it (E-LS-01, Q-LS-01). The snapshots show it: every wave has the wavelength 28/9 = 3.11 whatever n and the end.
 */
export const λSaved = 28 / 9;
/** functions to graph: waves moving right|left: fRight[x_, t_] := Cos[2π(x/λ - t/T)], fLeft[x_, t_] := Cos[2π(x/λ + t/T)];
 *  λ is the saved global value unless given (the corrected mode gives the Manipulate's λ). */
export const fRight = (x, t, λ = λSaved) => Cos(2 * Pi * (x / λ - t / T));
export const fLeft = (x, t, λ = λSaved) => Cos(2 * Pi * (x / λ + t / T));
/** Arrow[{p1, p2}, s]: the ends set back by the distance s along the arrow (Mathematica's setback, in plot units). */
export function setBack([[ax, ay], [bx, by]], s) {
  const d = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / d, uy = (by - ay) / d;
  return [[ax + s * ux, ay + s * uy], [bx - s * ux, by - s * uy]];
}
/** function to draw an arrow unless x-coords are too close, then a point:
 *  myArrow[{x1_, x2_}, y_] := Switch[Norm[x2 - x1], _?(# < .1 &), Point[{(x1 + x2)/2, y}], _, Arrow[{{x1, y}, {x2, y}}, ε]] */
export const myArrow = ([x1, x2], y) => (Norm([x2 - x1]) < 0.1 ? Point([(x1 + x2) / 2, y]) : Arrow(setBack([[x1, y], [x2, y]], ε)));
/** the number of arrow steps per wavelength: If[end == "closed" && n == 1, 26, If[n <= 2, 14, If[n <= 5, 10, 6]]] */
export const arrowDivisions = (n, end) => (end === 'closed' && n === 1 ? 26 : n <= 2 ? 14 : n <= 5 ? 10 : 6);
/** the "massaged" x-coordinates between which hArrows draws its arrows */
export function hArrowsX(n, L_, λ, end) {
  return Join(Range(0.0, L_ + ε * λ, λ / arrowDivisions(n, end)).map((x) => x - 0.075 * λ * Cos((4 * Pi * x) / λ + Pi / 2)),
    end === 'closed' ? [L_] : []); // "closed": add one extra end coordinate
}
// build the "longitudinal envelope", a list of arrows (or points) showing relative sizes of displacements (memoized,
// hArrows[n, L, λ, end] := hArrows[n, L, λ, end] = …)
const hArrowsMemo = new Map();
export function hArrows(n, L_, λ, end) {
  const key = `${n}|${L_}|${λ}|${end}`;
  if (!hArrowsMemo.has(key)) {
    hArrowsMemo.set(key, end === 'none' ? [] : [Gray, Arrowheads([-ε, ε]),
      Outer((y, xs) => myArrow(xs, y), Times(H, Range(-0.8, 0.8, 0.4)) /* y-coordinates */, Partition(hArrowsX(n, L_, λ, end), 2, 1))]);
  }
  return hArrowsMemo.get(key);
}
const memo = (f) => { const m = new Map(); return (n, L_, λ, end) => { const k = `${n}|${L_}|${λ}|${end}`; if (!m.has(k)) m.set(k, f(n, L_, λ, end)); return m.get(k); }; };
/** dlabels[n, L, λ, end]: N_d at λ/4, 3λ/4, … and A_d at 0, λ/2, … (y = 0.8), up to L */
export const dlabels = memo((n, L_, λ) => [
  [Table((x) => Text(Subscript('N', 'd'), [x, 0.8]), [λ / 4, L_, λ / 2])],
  [Table((x) => Text(Subscript('A', 'd'), [x, 0.8]), [0, L_, λ / 2])],
]);
/** plabels[n, L, λ, end]: A_p at λ/4, 3λ/4, … and N_p at 0, λ/2, … (y = −0.85), up to L */
export const plabels = memo((n, L_, λ) => [
  [Table((x) => Text(Subscript('A', 'p'), [x, -0.85]), [λ / 4, L_, λ / 2])],
  [Table((x) => Text(Subscript('N', 'p'), [x, -0.85]), [0, L_, λ / 2])],
]);
/** transverseIcon = Plot[Cos[t], {t, 0, 3π}, PlotRange -> All, ImageSize -> 19, Axes -> False] (a toggler label) */
export const transverseIcon = Plot((t) => Cos(t), [0, 3 * Pi], { PlotRange: 'All', ImageSize: 19, Axes: false });
/** pipecaps: open nothing, closed a single line, none a zigzag */
export const pipecaps = [
  [],
  Line([[L + ε, -H - ε], [L + ε, H + ε]]),
  Line(Partition(Table((i) => [L + 0.04 * (1 - (-1) ** i), (-1 + (2 / 12) * i) * (H + 2 * ε)], [0, 12]), 2, 1)),
];

/** The Manipulate's initial values (the notebook's live state is the same). */
export const initialState = () => ({ n: 3, end: 'open', options: [1, 4, 7, 8], t: 0 });

// ImageSize -> {550, 150} with AspectRatio -> Automatic: Mathematica fits the plot range (x 0 … 7 padded by Scaled[0.02],
// y −1 … 1) into 550 × 150, so the height decides: 150 · 7.28/2 = 546 px wide (the layer fits a width only).
const IMAGE_WIDTH = Math.min(550, (150 * (L * 1.04)) / 2);

// ---- the body -------------------------------------------------------------------------------------------------------
export function evaluate(state) {
  const { n, end, options, t } = state;
  const has = (k) => MemberQ(options, k);
  // if option button 4, buttons 1|2|3 mean show both|left|right longitudinal waves (lines):
  const longitudinalShown = Intersection(options, has(4) ? (end !== 'none' ? [1, 2, 3] : [1, 2]) : []);
  // if option button 5, buttons 1|2|3 mean show both|left|right longitudinal waves (points):
  const densityShown = Intersection(options, has(5) ? (end !== 'none' ? [1, 2, 3] : [1, 2]) : []);
  // if option button 6, buttons 1|2|3 show both|left|right transverse waves; option button 8 means transverse envelope,
  // functions 4&5; always show pipe border: functions 6&7
  const transverseShown = Flatten([
    Intersection(options, has(6) ? [1, 2, 3, 8] : [8], end !== 'none' ? [1, 2, 3, 8] : [1, 2]).map((k) => (k === 8 ? [4, 5] : k)), 6, 7]);
  const λ = (4 * L) / (2 * n - Boole(end === 'closed')); // "closed": 4L/(2n-1), else: 2L/n
  // the wavelength fRight and fLeft use: the saved global 28/9 (E-LS-01), or λ with "errors of the original: corrected"
  const λw = isCorrected(state) ? λ : λSaved;
  const fR = (x, tt) => fRight(x, tt, λw), fL = (x, tt) => fLeft(x, tt, λw);
  const both = Boole(end !== 'none');
  const curves = [
    (x) => 0.5 * H * (fR(x, t) + both * fL(x, t)), // 1: sum
    (x) => 0.5 * H * fR(x, t) + ε, // 2: right
    (x) => 0.5 * H * fL(x, t) - ε, // 3: left
    (x) => H * Cos(2 * Pi * (x / λ)), (x) => -H * Cos(2 * Pi * (x / λ)), // 4, 5: envelope, option 8
    () => -(H + 2 * ε), () => H + 2 * ε, // 6, 7: pipe, no option
  ];
  const shown = transverseShown.map((k) => curves[k - 1]);
  const filling = MemberQ(transverseShown, 4 /* envelope = 4&5 */) ? Position(transverseShown, 4)[0][0] : null;
  // longitudinal wave displacements of the three waves (sum, right, left) at x
  const shift = (x, tt) => [x + 0.07 * λ * (fR(x, tt) + both * fL(x, tt)), x + 0.07 * λ * fR(x, tt), x + 0.07 * λ * fL(x, tt)];
  const pick = (list, ks) => ks.map((k) => list[k - 1]);
  // longitudinal wave representation, vertical lines:
  const contourX = longitudinalShown.length ? Transpose(lineData.map((x) => pick(shift(x, t), longitudinalShown))).map(lop) : [];
  const contours = MapThread((c, xs) => [c, xs.map((x) => Line([[x, -H], [x, H]]))], [pick([Black, Blue, Red], longitudinalShown), contourX]);
  // longitudinal wave representation, points:
  const densityPoints = densityShown.length
    ? Transpose(pts.map((p) => pick(shift(p[0], t), densityShown).map((x) => Point([x, p[1]])))).map(lopPoints) : [];
  const density = MapThread((c, ps) => [c, ps], [pick([Black, Blue, Red], densityShown), densityPoints]);
  // longitudinal envelope display and node & antinode labels (none for an endless pipe)
  const envelope = end === 'none' ? [] : [
    has(7) ? Annotation(hArrows(n, L, λ, end), 'longitudinal-envelope') : [],
    has(9) ? Annotation(dlabels(n, L, λ, end), 'displacement-labels') : [],
    has(10) ? Annotation(plabels(n, L, λ, end), 'pressure-labels') : [],
  ];
  const cap = pipecaps[{ open: 0, closed: 1, none: 2 }[end]]; // end: nothing | single line | zigzag
  const graphics = Plot((x) => shown.map((f) => f(x)), [0, L], {
    ImageSize: IMAGE_WIDTH, AspectRatio: 'Automatic', PlotRange: 1, Axes: false,
    Filling: filling ? { [filling]: [filling + 1] } : null,
    PlotStyle: pick(plotstyle, transverseShown),
    Epilog: [
      POINT_SIZE,
      Annotation(cap, 'pipe-cap'),
      Annotation(contours, 'contours'),
      Annotation(density, 'density'),
      Annotation(envelope, 'end-display'),
    ],
    testid: 'scene-svg', label: 'Longitudinal Standing Waves',
  });
  const view = {
    λ, λWaves: λw, longitudinalShown, densityShown, transverseShown, filling,
    contourX, densityCounts: densityPoints.map((ps) => ps.length),
    // the transverse standing wave at the right end x = L (an open end is an antinode: ±H cos 2πt with the right λ)
    sumAtEnd: curves[0](L),
  };
  return { view, graphics };
}
