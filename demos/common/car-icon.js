// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Francesco Bernardini and Aaron T. Becker; Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/car-icon.js — the car icon `drawCar` of three car Demonstrations: "Shortest Path for Forward and
// Reverse Motion of a Car" (Francesco Bernardini and Aaron T. Becker), "Shortest Path for the Dubins Car" (Aaron T.
// Becker and Shiva Shahrokhi) and "Isochrons for a Dubins Car" (Aaron T. Becker and Shiva Shahrokhi). Owner:
// dubins-path (COMMON-DECISIONS §3). car-paths uses it since v0.1.20 (before: its own copy); its carpaths.js re-exports
// drawCar and wheelAngle, so car-paths' unit tests "drawCar: …" guard this module.
//
// The three originals share one definition; they differ only in the headlights:
//   car-paths          {Yellow, Opacity[0.8 opac], EdgeForm[{Thin, Black}], Polygon[{{1,.35},{4,.05},{4,.55}}], …}
//   dubins-path        {Yellow, Opacity[0.8 opac], EdgeForm[None], …}                     (headlightEdge: null)
//   dubins-isochrons   If[lights, {Yellow, Opacity[0.8 opac], EdgeForm[None], Polygon[{{1,.35},{8,.05},{8,.55}}], …}]
//                      (lights, beam: 8, headlightEdge: null; its extra argument `sc` is never used)
// drawCar is pure (data in world coordinates); drawCarSvg renders that data with a shared/svg-plot.js picture (it
// calls only the picture's own drawing functions, so this module needs no DOM itself). The same picture as
// shared/graphics.js Graphics data: demos/common/car-graphics.js carGraphics (v0.1.20).
import { mEqual } from '../../shared/mma.js';
import { arcTan } from '../../shared/mma-exact.js';
import { NAMED, darker } from '../../shared/mma-colors.js';

/** Rotate[p, a, {cx, cy}]. */
export const rot = ([x, y], a, [cx, cy] = [0, 0]) => {
  const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy;
  return [cx + c * dx - s * dy, cy + s * dx + c * dy];
};
/** The four corners of Rectangle[{a, b}, {c, d}]. */
export const rectPts = ([a, b], [c, d]) => [[a, b], [c, b], [c, d], [a, d]];

/** Front-wheel angle of drawCar: If[Alpha == 0, 0, ArcTan[Alpha ∓ .375, 1.4]] (Mathematica ArcTan[x, y]!). */
export function wheelAngle(Alpha, side) {
  if (mEqual(Alpha, 0)) return 0;
  return side === 'left' ? arcTan(Alpha - 0.375, 1.4) : arcTan(Alpha + 0.375, 1.4);
}

/**
 * drawCar[xy, Theta, Alpha, opac]: car icon centred at the middle of the rear axle, as a list of primitives in WORLD
 * coordinates (the original's Translate[Rotate[Translate[{...}, {0.7, 0}], Theta, {0, 0}], xy] applied).
 *   { kind: 'polygon' | 'line' | 'arrow', pts, role, fill: 'inherit' | colour name, opacity, edge }
 * 'inherit' = the colour set by the caller (Green / Red / Blue). Colours named as in the original.
 * Options (defaults = car-paths' car):
 *   lights        true: draw the two headlight beams (If[lights, …] of dubins-isochrons)
 *   beam          x of the beams' far ends in the icon frame (4; 8 in dubins-isochrons)
 *   headlightEdge 'thin' (EdgeForm[{Thin, Black}], car-paths) | null (EdgeForm[None], the two Dubins Demonstrations)
 */
export function drawCar(xy, Theta, Alpha, opac, { lights = true, beam = 4, headlightEdge = 'thin' } = {}) {
  const inner = (p) => [p[0] + 0.7, p[1]]; // Translate[..., {0.7, 0}]
  const outer = (p) => { const q = rot(inner(p), Theta, [0, 0]); return [q[0] + xy[0], q[1] + xy[1]]; };
  const T = (pts) => pts.map(outer);
  const edge = { color: 'Black', opacity: opac }; // EdgeForm[Directive[Opacity[opac], Black]]
  const prims = [];
  // Rectangle[{-1, -1/2}, {1, 1/2}] in the caller's colour
  prims.push({ kind: 'polygon', role: 'body', pts: T(rectPts([-1, -1 / 2], [1, 1 / 2])), fill: 'inherit', opacity: opac, edge });
  if (lights) {
    // {Yellow, Opacity[0.8*opac], EdgeForm[…], Polygon[{{1, .35}, {beam, .05}, {beam, .55}}], Polygon[…]}
    const lightEdge = headlightEdge === 'thin' ? { color: 'Black', opacity: 0.8 * opac, thin: true } : null;
    prims.push({ kind: 'polygon', role: 'headlight', pts: T([[1, 0.35], [beam, 0.05], [beam, 0.55]]), fill: 'Yellow', opacity: 0.8 * opac, edge: lightEdge });
    prims.push({ kind: 'polygon', role: 'headlight', pts: T([[1, -0.35], [beam, -0.05], [beam, -0.55]]), fill: 'Yellow', opacity: 0.8 * opac, edge: lightEdge });
  }
  // Darker[Gray]: axles and tyres
  prims.push({ kind: 'line', role: 'axle', pts: T([[-0.7, 0.35], [-0.7, -0.35]]), stroke: 'DarkerGray', opacity: opac });
  prims.push({ kind: 'line', role: 'axle', pts: T([[0.7, 0.35], [0.7, -0.35]]), stroke: 'DarkerGray', opacity: opac });
  const aL = wheelAngle(Alpha, 'left'), aR = wheelAngle(Alpha, 'right');
  // Rotate[Rectangle[{.5, .35}, {.9, .4}], angle, {.7, .375}] (front left tyre)
  prims.push({ kind: 'polygon', role: 'tyre-front-left', pts: T(rectPts([0.5, 0.35], [0.9, 0.4]).map((p) => rot(p, aL, [0.7, 0.375]))), fill: 'DarkerGray', opacity: opac, edge });
  prims.push({ kind: 'polygon', role: 'tyre-back', pts: T(rectPts([-0.5, 0.35], [-0.9, 0.4])), fill: 'DarkerGray', opacity: opac, edge });
  prims.push({ kind: 'polygon', role: 'tyre-back', pts: T(rectPts([-0.5, -0.35], [-0.9, -0.4])), fill: 'DarkerGray', opacity: opac, edge });
  prims.push({ kind: 'polygon', role: 'tyre-front-right', pts: T(rectPts([0.5, -0.35], [0.9, -0.4]).map((p) => rot(p, aR, [0.7, -0.375]))), fill: 'DarkerGray', opacity: opac, edge });
  // Black, Arrowheads[.02], Arrow[{{0, 0}, {1.0, 0}}]
  prims.push({ kind: 'arrow', role: 'arrow', pts: T([[0, 0], [1.0, 0]]), stroke: 'Black', opacity: opac, arrowhead: 0.02 });
  return { prims, wheelAngles: [aL, aR] };
}

/** The colours drawCar names, as RGB triples (Darker[Gray] = Blend[{Gray, Black}, 1/3]). */
export const CAR_COLOURS = { Black: NAMED.Black, Yellow: NAMED.Yellow, DarkerGray: darker(NAMED.Gray) };

/**
 * {colour, drawCar[…]} rendered into group `parent` of a shared/svg-plot.js picture.
 *   colour    RGB triple of the caller's colour (the body: Green / Red / Blue)
 *   testid    data-testid of the car's group (parts get `<testid>-<role>`)
 *   thin      stroke of EdgeForm[{Thin, Black}] (default {abs: 0.25}: 0.25 px at the image size, D-CP-03)
 *   arrowSize Arrowheads[.02] as world units (default 0.02 × the picture's full width)
 */
export function drawCarSvg(plot, parent, car, { colour, testid, thin = { abs: 0.25 }, arrowSize } = {}) {
  const grp = plot.group(parent, testid ? { 'data-testid': testid } : {});
  const C = { ...CAR_COLOURS, inherit: colour };
  const size = arrowSize ?? 0.02 * plot.unitsPerPx * plot.imageSize;
  for (const pr of car.prims) {
    if (pr.kind === 'polygon') {
      plot.polygon(grp, pr.pts, {
        fill: C[pr.fill], fillOpacity: pr.opacity,
        stroke: pr.edge ? C[pr.edge.color] : undefined, strokeOpacity: pr.edge?.opacity,
        thickness: pr.edge?.thin ? thin : undefined, testid: testid ? `${testid}-${pr.role}` : undefined,
      });
    } else if (pr.kind === 'line') {
      plot.line(grp, pr.pts, { stroke: C[pr.stroke], opacity: pr.opacity, testid: testid ? `${testid}-${pr.role}` : undefined });
    } else if (pr.kind === 'arrow') {
      const [a, b] = pr.pts;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
      const base = [b[0] - size * ux, b[1] - size * uy], w = 0.3 * size;
      plot.line(grp, [a, base], { stroke: C.Black, opacity: pr.opacity, testid: testid ? `${testid}-arrow` : undefined });
      plot.polygon(grp, [b, [base[0] - w * uy, base[1] + w * ux], [base[0] + w * uy, base[1] - w * ux]], { fill: C.Black, fillOpacity: pr.opacity });
    }
  }
  return grp;
}
