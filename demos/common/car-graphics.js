// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Francesco Bernardini and Aaron T. Becker; Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/car-graphics.js — {colour, drawCar[…]} of the three car Demonstrations (demos/common/car-icon.js) written
// as shared/graphics.js Graphics data: the same picture as car-icon.js drawCarSvg, for pages on shared/manipulate.js
// (v0.1.20; first used by car-paths). A module of its own so that pages still drawing with drawCarSvg do not load
// shared/graphics.js. Pure (data only).
import { Annotation, Polygon, Line, EdgeForm, Directive, Opacity, AbsoluteThickness, Black, Yellow, Gray, Darker } from '../../shared/graphics.js';
/**
 * {colour, drawCar[…]} as Graphics data (shared/graphics.js), the same picture as drawCarSvg:
 *   colour    an RGBColor (the body: Green / Red / Blue)
 *   testid    data-testid of the car's group (parts get `<testid>-<role>`)
 *   thin      EdgeForm[{Thin, Black}] of the headlights (default AbsoluteThickness[0.25], D-CP-03)
 *   arrowSize Arrowheads[.02] as world units (required: 0.02 × the picture's full width, padding included)
 * The arrow is the shaft up to the head's base and a filled head (as drawCarSvg; not the layer's Arrow primitive).
 */
export function carGraphics(car, colour, { testid, thin = AbsoluteThickness(0.25), arrowSize } = {}) {
  const C = { Black, Yellow, DarkerGray: Darker(Gray), inherit: colour };
  const id = (role) => (g) => (testid ? Annotation(g, `${testid}-${role}`) : g);
  const parts = car.prims.map((pr) => {
    if (pr.kind === 'polygon') {
      const edge = pr.edge ? EdgeForm(Directive(Opacity(pr.edge.opacity), C[pr.edge.color], ...(pr.edge.thin ? [thin] : []))) : EdgeForm();
      return [C[pr.fill], Opacity(pr.opacity), edge, id(pr.role)(Polygon(pr.pts))];
    }
    if (pr.kind === 'line') return [C[pr.stroke], Opacity(pr.opacity), id(pr.role)(Line(pr.pts))];
    const [a, b] = pr.pts; // Arrowheads[.02], Arrow[{{0, 0}, {1.0, 0}}]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    const base = [b[0] - arrowSize * ux, b[1] - arrowSize * uy], w = 0.3 * arrowSize;
    return [Black, Opacity(pr.opacity), id('arrow')(Line([a, base])),
      EdgeForm(), Polygon([b, [base[0] - w * uy, base[1] + w * ux], [base[0] + w * uy, base[1] - w * ux]])];
  });
  return testid ? Annotation(parts, testid) : parts;
}
