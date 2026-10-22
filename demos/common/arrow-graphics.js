// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Lillian Lin; Aaron T. Becker and Benedict Isichei; Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/arrow-graphics.js — the arrows of demos/common/dial-control.js (drawArrowhead, drawArcArrow) written as
// Graphics data (shared/graphics.js) for pages on shared/manipulate.js: two-link-kinematics, distance-norms and
// camera-lasers (v0.1.20). Same geometry as the SVG helpers, which stay in dial-control.js for the dials themselves
// (a separate file, so that the bundles of the other dial users do not grow). Pure (works in Node).
import { Line, Polygon, Point, EdgeForm } from '../../shared/graphics.js';

/**
 * World units per nominal pixel of a picture with this PlotRange, ImageSize and PlotRangePadding (the arithmetic of
 * shared/svg-plot.js createPlot), so that Graphics data can size arrowheads and margins in pixels exactly as drawn.
 */
import { plotUnitsPerPx } from '../../shared/svg-plot.js';
export { plotUnitsPerPx }; // world units per pixel (shared/svg-plot.js)

/** Arrowheads[s] as data: drawArrowhead's filled triangle of length L (world units) at tip, along the unit direction. */
export function arrowheadPolygon(tip, [dx, dy], L, widthRatio = 0.3) {
  const nx = -dy, ny = dx, h = L * widthRatio;
  const b = [tip[0] - L * dx, tip[1] - L * dy];
  return Polygon([tip, [b[0] + h * nx, b[1] + h * ny], [b[0] - h * nx, b[1] - h * ny]]);
}

/**
 * drawArcArrow as data, in the colour of the enclosing list: a myArrowArc / myArrowArc2 / arrowArc result (arrow-arcs.js)
 * as a Point (with the pointSize directive), or the curve / arc with its head of length headLength (world units);
 * thickness: a directive or null.
 */
export function arcArrowGraphics(data, { thickness = null, headLength, pointSize = null }) {
  if (data.kind === 'Point') return [pointSize, Point(data.at)];
  return [thickness, Line(data.kind === 'Arrow' ? data.curve : data.arc), EdgeForm(), arrowheadPolygon(data.tip, data.direction, headLength)];
}
