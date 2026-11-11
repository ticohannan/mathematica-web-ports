// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Ed Pegg Jr, Jeff Bryant and Theodore W. Gray
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/voronoi-diagrams/model.js — "Voronoi Diagrams": one evaluation of the Manipulate body, the state in,
// { state, view, graphics } out (pure, no DOM). The original draws ListDensityPlot[{x, y, k}, InterpolationOrder -> 0]:
// every point of the square takes the value of its nearest site, i.e. the Voronoi cells, coloured by
// ColorData[colors][(k − 1)/(n − 1)]. The port draws the exact cells (D-VD-01).
import { Graphics, Polygon, Line, RGBColor, EdgeForm, Annotation, GrayLevel, Opacity, AbsoluteThickness } from '../../shared/graphics.js';
import { GRADIENTS, GRADIENT_NAMES, gradientColor } from './gradients.js';

export { GRADIENT_NAMES };
export const RANGE = [[0, 10], [0, 10]];
/** The notebook's saved state (the live state of the output cell = snapshot 1), F-VD-07. */
export const SAVED_LOC = Object.freeze([
  [2.2780211487771407, 4.082436159080361], [6.5481268259144, 0.1426229792238698], [0.3312800968683538, 8.972979546201554],
  [2.431687864909007, 5.9548354029633455], [0.6067245246629116, 1.0215755189204634], [6.987050288884804, 7.378007174956325],
  [7.026730328401585, 6.151004007090637], [9.42416206247616, 2.8901657016964055], [5.018859916247552, 0.7088601130604699],
  [3.7087069848466214, 6.440886622795046],
].map((p) => Object.freeze(p)));
export const initialState = () => ({ loc: SAVED_LOC.map((p) => [...p]), colors: 'BeachColors', mesh: false });

/**
 * The Voronoi cell of site k inside the square: the square clipped by the half-planes nearer to site k than to each
 * other site (|x − p_k|² ≤ |x − p_j|²  ⇔  2 (p_j − p_k)·x ≤ |p_j|² − |p_k|²). Counter-clockwise polygon; [] when empty
 * (a site that coincides with an earlier one).
 */
export function voronoiCell(sites, k, [[x0, x1], [y0, y1]] = RANGE) {
  let poly = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const [px, py] = sites[k];
  for (let j = 0; j < sites.length && poly.length; j++) {
    if (j === k) continue;
    const [qx, qy] = sites[j];
    const a = 2 * (qx - px), b = 2 * (qy - py), c = qx * qx + qy * qy - px * px - py * py;
    if (a === 0 && b === 0) { if (j < k) poly = []; continue; } // the same position: the earlier site keeps the cell
    poly = clip(poly, a, b, c);
  }
  return poly;
}
/** Sutherland–Hodgman: the part of a convex polygon with a x + b y ≤ c. */
function clip(poly, a, b, c) {
  const out = [], f = (p) => a * p[0] + b * p[1] - c;
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length], fp = f(P), fq = f(Q);
    if (fp <= 0) out.push(P);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) { const t = fp / (fp - fq); out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]); }
  }
  return out;
}
/** The value of site k (1-based) scaled to 0 … 1 as ListDensityPlot's ColorFunctionScaling does: (k − 1)/(n − 1). */
export const scaledValue = (k, n) => (n > 1 ? (k - 1) / (n - 1) : 0);

/**
 * The body's guard (F-VD-04): If[Length[loc] < 3, AppendTo[loc, RandomReal[{0, 10}, {2}]]] — one random point per
 * evaluation; the body changed loc, so Mathematica evaluates it again until three points remain (E-VD-02). `random` is
 * () => [x, y].
 */
export function guardPoints(loc, random) {
  const out = [...loc];
  while (out.length < 3) out.push(random());
  return out;
}

/** The Manipulate body (F-VD-05, F-VD-06). */
export function evaluate({ loc, colors, mesh }, { rng } = {}) {
  const random = () => (rng ? [rng.randomReal([0, 10]), rng.randomReal([0, 10])] : [Math.random() * 10, Math.random() * 10]);
  const sites = guardPoints(loc, random);
  const n = sites.length;
  const name = GRADIENTS[colors] ? colors : GRADIENT_NAMES[0];
  const cells = sites.map((_, k) => voronoiCell(sites, k));
  const fills = sites.map((_, k) => gradientColor(name, scaledValue(k + 1, n)));
  const cellPrims = cells.map((c, k) => (c.length ? Annotation(Polygon(c), `cell-${k + 1}`) : null)).map((p, k) => (p ? [RGBColor(...fills[k]), p] : []));
  // Mesh -> All: the cell edges as thin dark lines (each shared edge once per cell; the square's border is the frame)
  // (an edge shared by two cells once: drawn twice at 30 % it would look darker than the snapshot)
  const seen = new Set(), key = (p) => p.map((v) => v.toFixed(9)).join(',');
  const borders = mesh ? cells.flatMap((c) => c.map((p, i) => [p, c[(i + 1) % c.length]])).filter(([p, q]) => {
    if (onFrame(p, q)) return false;
    const k = [key(p), key(q)].sort().join(';');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }) : [];
  const graphics = Graphics([
    [EdgeForm(), ...cellPrims],
    // the mesh lines measured on snapshot 3: about 1 px, black at about 30 % opacity
    mesh ? [GrayLevel(0), Opacity(0.3), AbsoluteThickness(1), Annotation(Line(borders), 'borders')] : [],
  ], { PlotRange: RANGE, Frame: true, FrameTicks: 'None', label: 'The Voronoi cells of the points' });
  return {
    state: { loc: sites, colors, mesh },
    view: { n, colors: name, cells: cells.map((c) => c.map((p) => [...p])), fills, area: cells.reduce((s, c) => s + polyArea(c), 0) },
    graphics,
  };
}
const onFrame = (p, q) => (p[0] === q[0] && (p[0] === 0 || p[0] === 10)) || (p[1] === q[1] && (p[1] === 0 || p[1] === 10));
const polyArea = (c) => Math.abs(c.reduce((s, p, i) => s + p[0] * c[(i + 1) % c.length][1] - p[1] * c[(i + 1) % c.length][0], 0)) / 2;
