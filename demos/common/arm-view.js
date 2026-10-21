// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Haoran Zhao; Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala; Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/arm-view.js — the two-link arm, the obstacles, the phase-space inset and the coloured locator icon as
// "Robot Motion with Obstacles" (Aaron T. Becker and Haoran Zhao) and "Breadth-First Search Robot Motion Planning"
// (Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala) draw them in their Graphics, written as Graphics data
// (shared/graphics.js) in the originals' order; `loc[col]` is the icon of their Initialization code (identical in
// "Probabilistic Roadmap Method for Robot Arm", Aaron T. Becker and Yitong Lu, whose data LOC_ICON in
// demos/common/prm-core.js is used). Owner: robot-motion-obstacles (COMMON-DECISIONS §3).
// The data is pure (drawn by shared/graphics.js render); only `obstacleGlyph`, re-exported from shared/svg-plot.js,
// builds SVG. The geometry comes from demos/common/two-link.js
// (armGeometry) and demos/common/arrow-arcs.js (arrowArc); the pixels of the grid from demos/common/arm-grid.js
// (arrayPlotColors). Test ids (Annotation) are the ones the browser tests read.
// v0.1.19: rewritten from SVG drawing calls to Graphics data (same picture).
import {
  Annotation, Rotate, Rectangle, Point, Line, Polygon, Disk, Text, Style, Subscript, Inset, ImageRaster, Graphics, Circle,
  EdgeForm, AbsoluteThickness, AbsoluteDashing, CapForm, PointSize, Opacity, Italic, FontSize, FontFamily, Black, Gray,
  Red, Green, Blue, Brown, Darker,
} from '../../shared/graphics.js';
import { darkLocatorGlyph } from '../../shared/svg-plot.js';
import { LOC_ICON } from './prm-core.js';
import { xMin, yMin, xMax, PLOT_RANGE } from './arm-grid.js';

/** Arrowheads[.02]: the head is 2 % of the plot width long; drawn as a filled triangle (D-RM-05). */
const ARROWHEAD = 0.02 * (PLOT_RANGE[0][1] - PLOT_RANGE[0][0]);
/** Point size of the black base and elbow points (default PointSize, approximated; D-RM-05). */
const POINT = PointSize(0.008);
/** Font sizes in px at ImageSize 600 (D-RM-05): Medium for the angle labels, default for the other texts. */
export const FONT = { medium: 12, text: 10 };
/** The font of all texts (as rrt's plot label, D-RM-05). */
export const FONT_FAMILY = 'Arial, Helvetica, sans-serif';
const TEXT = [FontSize(FONT.text), FontFamily(FONT_FAMILY)];

/** Text[Style[θ_k, …], pos] (italic θ with subscript k). */
export const thetaLabel = (k, pos, id, fontPx = FONT.text) =>
  Annotation(Text(Style(Subscript('θ', k), Italic, FontSize(fontPx), FontFamily(FONT_FAMILY)), pos), id);

/** arrowArc[Circle[…]]: the arc and an arrowhead at its end along the counter-clockwise tangent (only the head of the
 * original's r/10^6 shaft is visible). */
function arrowArcGraphics(arc, id) {
  const [ux, uy] = arc.direction, [tx, ty] = arc.tip;
  const bx = tx - ARROWHEAD * ux, by = ty - ARROWHEAD * uy, hw = 0.3 * ARROWHEAD;
  return Annotation([
    AbsoluteThickness(1), Line(arc.arc), EdgeForm(),
    Annotation(Polygon([[tx, ty], [bx - hw * uy, by + hw * ux], [bx + hw * uy, by - hw * ux]]), `${id}-head`),
  ], id);
}

const bar = (link) => Rectangle(link.rect[0], link.rect[1], { RoundingRadius: link.radius });

/**
 * The arm as the Graphics list draws it: link 1, black base point, Darker[Gray] arc 1 and label θ1, link 2 with the
 * black text "Robot Arm" turned with it, black elbow point, arc 2 and label θ2. geometry = two-link.js armGeometry,
 * arcs = [arc1, arc2] from arrow-arcs.js arrowArc. The edge colour comes from the enclosing EdgeForm (Black, or Red in
 * collision). Options: link1Fill (Gray), link2Fill (RM Gray, BFS LightGray), labelColor (Darker[Gray]).
 */
export function armGraphics(geometry, arcs, { link1Fill = Gray, link2Fill = Gray, labelColor = Darker(Gray) } = {}) {
  const l2 = geometry.link2, ra = geometry.robotArm;
  return Annotation([
    link1Fill, Annotation(Rotate(bar(geometry.link1), geometry.link1.angle, geometry.link1.about), 'arm-link1'),
    [Black, POINT, Annotation(Point(geometry.base), 'arm-base')],
    [labelColor, arrowArcGraphics(arcs[0], 'arc-theta1'),
      geometry.theta1Label.visible && thetaLabel('1', geometry.theta1Label.at, 'label-theta1', FONT.medium)],
    // Rotate[{Rectangle[…], {Black, Text["Robot Arm", …]}}, θ1 + θ2, elbow] (robotArm.angle = link 2's angle)
    [link2Fill, Annotation(Rotate([
      Annotation(bar(l2), 'arm-link2'),
      [Black, ...TEXT, Annotation(Text('Robot Arm', ra.anchor), 'text-robot-arm')],
    ], l2.angle, l2.about), 'arm-link2-group')],
    [Black, POINT, Annotation(Point(geometry.elbow), 'arm-elbow')],
    [labelColor, arrowArcGraphics(arcs[1], 'arc-theta2'),
      geometry.theta2Label.visible && thetaLabel('2', geometry.theta2Label.at, 'label-theta2', FONT.medium)],
  ], 'arm');
}

/** {Brown, Table[Disk[pObsV[[i]], w], …]} under the arm's EdgeForm (black, red in collision). */
export const obstacleDisks = (centres, r) => [Brown, ...centres.map((c, i) => Annotation(Disk(c, r), `obstacle-${i + 1}`))];

const side = xMax - xMin;

/**
 * Inset[ArrayPlot[…], {xMin, yMin}, {0, 0}, xMax - xMin] as one raster over the inset square (one pixel per cell, row 1
 * at the top, nearest-neighbour scaling; D-RM-02). rgba = arm-grid.js arrayPlotColors(array); pass the same object
 * while the array is unchanged and the image is not re-encoded.
 */
export const gridInset = (rgba) => Annotation(ImageRaster(rgba, [[xMin, yMin], [xMin + side, yMin + side]]), 'grid-image');

/** FrameStyle -> {{Red, Directive[Red, Dashed]}, {Blue, Directive[Blue, Dashed]}}: left, right, bottom, top; no ticks. */
export function insetFrame() {
  const x0 = xMin, y0 = yMin, x1 = xMin + side, y1 = yMin + side;
  const dashed = AbsoluteDashing([2, 2]); // measured in the snapshots: 0.5 px lines, dashes of about 2 px
  return [AbsoluteThickness(0.5), CapForm('Butt'),
    Red, Annotation(Line([[x0, y0], [x0, y1]]), 'frame-left'), [dashed, Annotation(Line([[x1, y0], [x1, y1]]), 'frame-right')],
    Blue, Annotation(Line([[x0, y0], [x1, y0]]), 'frame-bottom'), [dashed, Annotation(Line([[x0, y1], [x1, y1]]), 'frame-top')]];
}

/** The other texts of the Graphics in one colour (RM: Gray, BFS: Black). */
export const plainText = (str, pos, id) => [...TEXT, Annotation(Text(str, pos), id)];

/**
 * The Manipulate's default locator glyph for the obstacle locators: shared/svg-plot.js darkLocatorGlyph (black lines,
 * dark translucent ring; measured in the snapshots: the brown disk under the ring darkened to about 70 %).
 */
export const obstacleGlyph = darkLocatorGlyph;

/** loc[col]: the originals' 17 px locator icon (GraphicsBox, PlotRange ±8, ImageSize 17; prm-core.js LOC_ICON). */
export const locIcon = (color, pos) => {
  const R = 8; // PlotRange {{-8, 8}, {-8, 8}}
  return Inset(Graphics([color, AbsoluteThickness(1), Line(LOC_ICON.lines),
    ...LOC_ICON.circles.map(({ c, r, thicknessPx, opacity }) => [AbsoluteThickness(thicknessPx), Opacity(opacity), Circle(c, r)])],
  { PlotRange: [[-R, R], [-R, R]], ImageSize: R * 2 * LOC_ICON.pxPerUnit }), pos);
};

/** Locator[p, loc[col]] with its test id and the glyph colour name ('red' | 'green') for the tests. */
export const configGlyph = (p, inCollision, id) => Annotation(locIcon(inCollision ? Red : Darker(Green), p), id, { 'data-color': inCollision ? 'red' : 'green' });

