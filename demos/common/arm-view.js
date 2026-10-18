// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Haoran Zhao; Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala; Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/arm-view.js — drawing of the two-link arm, the phase-space inset and the coloured locator icon as
// "Robot Motion with Obstacles" (Aaron T. Becker and Haoran Zhao) and "Breadth-First Search Robot Motion Planning"
// (Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala) draw them in their Graphics; `loc[col]` is the icon of
// their Initialization code (identical in "Probabilistic Roadmap Method for Robot Arm", Aaron T. Becker and Yitong
// Lu, whose data LOC_ICON in demos/common/prm-core.js is used). Owner: robot-motion-obstacles (COMMON-DECISIONS §3).
// Browser-only (SVG through shared/svg-plot.js). The geometry comes from demos/common/two-link.js (armGeometry) and
// demos/common/arrow-arcs.js (arrowArc); the pixels of the grid from demos/common/arm-grid.js (arrayPlotColors).
import { svgNode, darkLocatorGlyph } from '../../shared/svg-plot.js';
import { NAMED, darker, css } from '../../shared/mma-colors.js';
import { LOC_ICON } from './prm-core.js';
import { xMin, yMin, xMax } from './arm-grid.js';

const deg = (a) => (a * 180) / Math.PI;
/** Arrowheads[.02]: the head is 2 % of the plot width long; drawn as a filled triangle (D-RM-05). */
const ARROWHEAD = 0.02;
/** Point size of the black base and elbow points (default PointSize, approximated; D-RM-05). */
const POINT = 0.008;
/** Font sizes in px at ImageSize 600 (D-RM-05): Medium for the angle labels, default for the other texts. */
export const FONT = { medium: 12, text: 10 };
/** The font of all texts (as rrt's plot label, D-RM-05). */
export const FONT_FAMILY = 'Arial, Helvetica, sans-serif';

/** A text "θ" with subscript `sub` (Style[θ_k, …]) centred at pos. */
export function drawThetaLabel(plot, g, sub, pos, { color = NAMED.Black, fontPx = FONT.text, testid } = {}) {
  const t = plot.text(g, '', pos, { fontPx, italic: true, color, family: FONT_FAMILY, testid });
  t.append(document.createTextNode('θ'));
  const s = svgNode('tspan', { 'font-size': fontPx * 0.72 * plot.unitsPerPx, dy: fontPx * 0.28 * plot.unitsPerPx });
  s.textContent = sub;
  t.append(s);
  return t;
}

/** One rounded bar: Rotate[Rectangle[a, b, RoundingRadius -> w], angle, about]. */
function bar(plot, g, link, fill, edge, testid) {
  const [[x0, y0], [x1, y1]] = link.rect;
  return g.appendChild(svgNode('rect', {
    x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0), rx: link.radius, ry: link.radius,
    transform: `rotate(${deg(link.angle)} ${link.about[0]} ${link.about[1]})`,
    fill: css(fill), stroke: css(edge), 'stroke-width': plot.strokeWidth({ abs: 1 }), 'data-testid': testid,
  }));
}

/** arrowArc[Circle[…]]: the arc and an arrowhead at its end along the counter-clockwise tangent. */
export function drawArrowArc(plot, g, arc, color, testid) {
  const grp = plot.group(g, { 'data-testid': testid });
  plot.line(grp, arc.arc, { stroke: color, thickness: { abs: 1 } });
  const s = ARROWHEAD * (plot.plotRange[0][1] - plot.plotRange[0][0]);
  const [ux, uy] = arc.direction, [tx, ty] = arc.tip;
  const bx = tx - s * ux, by = ty - s * uy, hw = 0.3 * s;
  plot.polygon(grp, [[tx, ty], [bx - hw * uy, by + hw * ux], [bx + hw * uy, by - hw * ux]], { fill: color, testid: `${testid}-head` });
  return grp;
}

/**
 * The arm as the Graphics list draws it (order: link 1, black base point, Darker[Gray] arc 1 and label θ1, link 2 with
 * the black text "Robot Arm" turned with it, black elbow point, arc 2 and label θ2). geometry = two-link.js armGeometry,
 * arcs = [arc1, arc2] from arrow-arcs.js arrowArc. Options: edge (EdgeForm colour: Black, or Red in collision),
 * link1Fill (Gray), link2Fill (RM Gray, BFS LightGray), labelColor (Darker[Gray]).
 */
export function drawArm(plot, layer, geometry, arcs, { edge = NAMED.Black, link1Fill = NAMED.Gray, link2Fill = NAMED.Gray, labelColor = darker(NAMED.Gray) } = {}) {
  const g = plot.group(layer, { 'data-testid': 'arm' });
  bar(plot, g, geometry.link1, link1Fill, edge, 'arm-link1');
  plot.point(g, geometry.base, POINT, NAMED.Black, 'arm-base');
  drawArrowArc(plot, g, arcs[0], labelColor, 'arc-theta1');
  if (geometry.theta1Label.visible) drawThetaLabel(plot, g, '1', geometry.theta1Label.at, { color: labelColor, fontPx: FONT.medium, testid: 'label-theta1' });
  const l2 = plot.group(g, { 'data-testid': 'arm-link2-group' });
  bar(plot, l2, geometry.link2, link2Fill, edge, 'arm-link2');
  const ra = geometry.robotArm;
  const tg = plot.group(l2, { transform: `rotate(${deg(ra.angle)} ${ra.about[0]} ${ra.about[1]})` });
  plot.text(tg, 'Robot Arm', ra.anchor, { fontPx: FONT.text, color: NAMED.Black, family: FONT_FAMILY, testid: 'text-robot-arm' });
  plot.point(g, geometry.elbow, POINT, NAMED.Black, 'arm-elbow');
  drawArrowArc(plot, g, arcs[1], labelColor, 'arc-theta2');
  if (geometry.theta2Label.visible) drawThetaLabel(plot, g, '2', geometry.theta2Label.at, { color: labelColor, fontPx: FONT.medium, testid: 'label-theta2' });
  return g;
}

/** {Brown, Table[Disk[pObsV[[i]], w], …]} under the arm's EdgeForm (black, red in collision). */
export function drawObstacles(plot, layer, centres, r, edge = NAMED.Black) {
  centres.forEach((c, i) => plot.disk(layer, c, r, { fill: NAMED.Brown, stroke: edge, thickness: { abs: 1 }, testid: `obstacle-${i + 1}` }));
}

const insetSide = () => xMax - xMin;

/**
 * The ArrayPlot inset Inset[ArrayPlot[…], {xMin, yMin}, {0, 0}, xMax - xMin] as ONE SVG <image>: an n × n canvas
 * (one pixel per cell, row 1 at the top) scaled with nearest-neighbour sampling over the inset square (D-RM-02).
 * rgba = arm-grid.js arrayPlotColors(array). Returns the <image> (data-testid grid-image, data-width/height = n).
 */
export function drawGridInset(plot, layer, rgba) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, rgba.width);
  canvas.height = Math.max(1, rgba.height);
  if (rgba.width && rgba.height) canvas.getContext('2d').putImageData(new ImageData(rgba.data, rgba.width, rgba.height), 0, 0);
  const side = insetSide();
  // the world group is flipped (y up): an inner scale(1,-1) puts the picture upright, its top edge at y = yMin + side
  const img = svgNode('image', {
    href: canvas.toDataURL('image/png'), x: xMin, y: -(yMin + side), width: side, height: side, preserveAspectRatio: 'none',
    transform: 'scale(1,-1)', style: 'image-rendering:pixelated;image-rendering:crisp-edges', 'data-testid': 'grid-image',
    'data-width': rgba.width, 'data-height': rgba.height,
  });
  img.style.imageRendering = 'pixelated';
  layer.append(img);
  return img;
}

/** FrameStyle -> {{Red, Directive[Red, Dashed]}, {Blue, Directive[Blue, Dashed]}}: left, right, bottom, top; no ticks. */
export function drawInsetFrame(plot, layer) {
  const s = insetSide(), x0 = xMin, y0 = yMin, x1 = xMin + s, y1 = yMin + s;
  const dash = [2, 2]; // measured in the snapshots: 0.5 px lines, dashes of about 2 px
  const t = { abs: 0.5 };
  plot.line(layer, [[x0, y0], [x0, y1]], { stroke: NAMED.Red, thickness: t, cap: 'butt', testid: 'frame-left' });
  plot.line(layer, [[x1, y0], [x1, y1]], { stroke: NAMED.Red, thickness: t, cap: 'butt', dash, testid: 'frame-right' });
  plot.line(layer, [[x0, y0], [x1, y0]], { stroke: NAMED.Blue, thickness: t, cap: 'butt', testid: 'frame-bottom' });
  plot.line(layer, [[x0, y1], [x1, y1]], { stroke: NAMED.Blue, thickness: t, cap: 'butt', dash, testid: 'frame-top' });
}

/**
 * The Manipulate's default locator glyph for the obstacle locators: shared/svg-plot.js darkLocatorGlyph (black lines,
 * dark translucent ring; measured in the snapshots: the brown disk under the ring darkened to about 70 %).
 */
export const obstacleGlyph = darkLocatorGlyph;

/** loc[col]: the originals' 17 px locator icon (prm-core.js LOC_ICON), centred at the origin, in world units. */
export function locIcon(plot, color) {
  const upx = plot.unitsPerPx;
  const u = upx * LOC_ICON.pxPerUnit;
  const g = svgNode('g', { class: 'loc-icon' });
  for (const [[a, b], [c, d]] of LOC_ICON.lines) g.append(svgNode('line', { x1: a * u, y1: b * u, x2: c * u, y2: d * u, stroke: css(color), 'stroke-width': upx }));
  for (const { c, r, thicknessPx, opacity } of LOC_ICON.circles) {
    g.append(svgNode('circle', { cx: c[0] * u, cy: c[1] * u, r: r * u, fill: 'none', stroke: css(color), 'stroke-opacity': opacity, 'stroke-width': thicknessPx * upx }));
  }
  return g;
}
