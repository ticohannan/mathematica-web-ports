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
// drawCar returns shared/graphics.js Graphics data (pure; v0.1.21: before, a list of { kind, role, … } records that
// demos/common/car-graphics.js and drawCarSvg rendered — both removed, the pictures unchanged).
import { mEqual } from '../../shared/mma.js';
import { arcTan } from '../../shared/mma-exact.js';
import {
  Annotation, Polygon, Line, Arrow, Arrowheads, EdgeForm, Directive, Opacity, Thin, Black, Yellow, Gray, Darker,
} from '../../shared/graphics.js';
import { arrowheadPolygon } from '../../shared/graphics-extras.js';

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
 * drawCar[xy, Theta, Alpha, opac]: the car icon centred at the middle of the rear axle, as Graphics data in WORLD
 * coordinates (the original's Translate[Rotate[Translate[{…}, {0.7, 0}], Theta, {0, 0}], xy] applied to every vertex;
 * rectangles as their four corners). The body takes the colour in effect where the car is drawn, as in the original
 * ({Green, drawCar[…]}). Each part is Annotation[part, role] (roles body, headlight, axle, tyre-front-left, tyre-back,
 * tyre-front-right, arrow), so tests read its numbers with shared/graphics.js annotations().
 * Options (defaults = car-paths' car):
 *   lights        true: draw the two headlight beams (If[lights, …] of dubins-isochrons)
 *   beam          x of the beams' far ends in the icon frame (4; 8 in dubins-isochrons)
 *   headlightEdge 'thin' (EdgeForm[{Thin, Black}], car-paths) | null (EdgeForm[None], the two Dubins Demonstrations)
 *   id            data-testid of the car's group; the parts then get `<id>-<role>`
 *   arrowSize     Arrowheads[.02] in world units (0.02 × the picture's full width, padding included): the arrow is then
 *                 drawn as the ports draw it, the shaft up to the head's base (Annotation 'arrow') and a filled
 *                 triangle head of width 0.6 × its length; without it, the layer's Arrow with Arrowheads[.02]
 */
export function drawCar(xy, Theta, Alpha, opac, { lights = true, beam = 4, headlightEdge = 'thin', id, arrowSize } = {}) {
  const place = (p) => { const q = rot([p[0] + 0.7, p[1]], Theta, [0, 0]); return [q[0] + xy[0], q[1] + xy[1]]; };
  const T = (pts) => pts.map(place);
  const part = (g, role) => Annotation(g, id ? `${id}-${role}` : role);
  const aL = wheelAngle(Alpha, 'left'), aR = wheelAngle(Alpha, 'right');
  const tail = place([0, 0]), tip = place([1.0, 0]);
  let arrow = part(Arrow([tail, tip]), 'arrow');
  if (arrowSize !== undefined) {
    const len = Math.hypot(tip[0] - tail[0], tip[1] - tail[1]);
    const u = [(tip[0] - tail[0]) / len, (tip[1] - tail[1]) / len];
    arrow = [part(Line([tail, [tip[0] - arrowSize * u[0], tip[1] - arrowSize * u[1]]]), 'arrow'), EdgeForm(), arrowheadPolygon(tip, u, arrowSize)];
  }
  const car = [
    Opacity(opac), EdgeForm(Directive(Opacity(opac), Black)),
    part(Polygon(T(rectPts([-1, -1 / 2], [1, 1 / 2]))), 'body'), // Rectangle[{-1, -1/2}, {1, 1/2}]
    Darker(Gray),
    lights && [Yellow, Opacity(0.8 * opac), headlightEdge === 'thin' ? EdgeForm(Directive(Opacity(0.8 * opac), Black, Thin)) : EdgeForm(),
      part(Polygon(T([[1, 0.35], [beam, 0.05], [beam, 0.55]])), 'headlight'),
      part(Polygon(T([[1, -0.35], [beam, -0.05], [beam, -0.55]])), 'headlight')],
    part(Line(T([[-0.7, 0.35], [-0.7, -0.35]])), 'axle'), part(Line(T([[0.7, 0.35], [0.7, -0.35]])), 'axle'),
    // Rotate[Rectangle[{.5, .35}, {.9, .4}], If[Alpha == 0, 0, ArcTan[Alpha - .375, 1.4]], {.7, .375}] (front left tyre)
    part(Polygon(T(rectPts([0.5, 0.35], [0.9, 0.4]).map((p) => rot(p, aL, [0.7, 0.375])))), 'tyre-front-left'),
    part(Polygon(T(rectPts([-0.5, 0.35], [-0.9, 0.4]))), 'tyre-back'),
    part(Polygon(T(rectPts([-0.5, -0.35], [-0.9, -0.4]))), 'tyre-back'),
    part(Polygon(T(rectPts([0.5, -0.35], [0.9, -0.4]).map((p) => rot(p, aR, [0.7, -0.375])))), 'tyre-front-right'),
    Black, Arrowheads(0.02), arrow, // Black, Arrowheads[.02], Arrow[{{0, 0}, {1.0, 0}}]
  ];
  return id ? Annotation(car, id) : car;
}
