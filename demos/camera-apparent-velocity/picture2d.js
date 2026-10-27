// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/camera-apparent-velocity/picture2d.js — the original's 2D definitions (the "show 2D view" picture: the image
// plane seen from the camera) as Graphics data of shared/graphics.js, and the rasterized "image plane" label that both
// views use as a Texture. Pure (no DOM). The colours are those of the definitions saved with the Manipulate (N-CV-01).
import {
  Graphics, Line, Polygon, Disk, Point, Arrow, BSplineCurve, Text, Rotate, Annotation, Style, Italic, FontSize, FontFamily,
  Black, Gray, Red, Green, Yellow, Cyan, Purple, Brown, Darker, Opacity, EdgeForm, Directive, Thin, Thick, PointSize,
  Arrowheads, Texture, Rasterize, ImageReflect, None,
} from '../../shared/graphics.js';
import { Table, Pi, Cos, Sin, Equal } from '../../shared/wl.js';

/** ImageSize -> 1.5 {285, 285} of both views */
export const IMAGE_SIZE = 1.5 * 285;

/** (*this function draws a 2D drone at (x,y,z) into a camera with focal length λ*) draw2Ddrone[x, y, z, λ, color] */
export const draw2Ddrone = (x, y, z, λ, color) => [
  Gray, EdgeForm(Directive(Thin, Black)),
  Table((p) => Disk([((p[0] + x) * λ) / z, ((p[1] + y) * λ) / z], (0.25 * λ) / z), [[[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]]]),
  [Darker(Brown), Thick,
    Line([[(λ / z) * (-0.35 + x), (λ / z) * (-0.35 + y)], [(λ / z) * (0.35 + x), (λ / z) * (0.35 + y)]]),
    Line([[(λ / z) * (-0.35 + x), (λ / z) * (0.35 + y)], [(λ / z) * (0.35 + x), (λ / z) * (-0.35 + y)]])],
  color,
  Disk([(λ / z) * x, (λ / z) * y], (0.25 * λ) / z),
];

/** drawArrowsPoints2D[x, y, z, xc, yc, zc, λ]: the arrow from the projected start to the projected goal, their points */
export const drawArrowsPoints2D = (x, y, z, xc, yc, zc, λ) => [
  Black, Arrowheads(0.015), Arrow([[(λ * xc) / zc, (λ * yc) / zc], [(λ * x) / z, (λ * y) / z]]),
  Opacity(1), Green, PointSize(0.01), Point([(λ * xc) / zc, (λ * yc) / zc]), Red, Point([(λ / z) * x, (λ / z) * y]),
];

/** (*u and v axes*) drawaxesuv[] */
export const drawaxesuv = () => [
  Black, Arrowheads(0.03), Arrow([[-5, -5], [-5, -3]]), Arrow([[-5, -5], [-3, -5]]),
  Opacity(1), Black, FontSize(12),
  Text(Style('u', Italic), [-3.5, -5.3]),
  Text(Style('v', Italic), [-5.3, -3.5]),
];

/** infiniteArrowsPoints2D[x, y, z, xc, yc, zc, λ, r, ϕ]: (xc, yc) = (0, 0) — the ring of goals and the arrows to them */
export const infiniteArrowsPoints2D = (x, y, z, xc, yc, zc, λ, r, Phi) => [
  Opacity(1), PointSize(0.015), Red,
  Table((Theta) => Point([[((xc + r * Cos(Theta) * Sin(Phi)) / z) * λ, ((yc + r * Sin(Theta) * Sin(Phi)) / z) * λ]]), [0, 2 * Pi, 0.1 * Pi]),
  Opacity(1), Gray, Arrowheads(0.01),
  Table((Theta) => Arrow([[(λ * xc) / zc, (λ * yc) / zc], [(λ * (xc + r * Cos(Theta) * Sin(Phi))) / z, (λ * (yc + r * Sin(Theta) * Sin(Phi))) / z]]), [0, 2 * Pi, 0.1 * Pi]),
];

/** (* draws 2D Arc centered at (xc,yx)*) arc2D[xc, yc, r, zc, λ, ellipAng] — Arrow[BSplineCurve[…]] from angle 0 to ellipAng */
export const arc2D = (xc, yc, r, zc, λ, ellipAng) => [
  Arrowheads(0.015),
  Equal(ellipAng, 0)
    ? [Arrow([[(λ / zc) * xc, (λ / zc) * yc], [(xc * λ) / zc + 0.5 * r, (yc * λ) / zc]])]
    : [Arrow(BSplineCurve(Table((Theta) => [((xc + 0.5 * r * Cos(Theta)) * λ) / zc, ((yc + 0.5 * r * Sin(Theta)) * λ) / zc], [0, ellipAng, ellipAng / 12])))],
];

/** drawTheta2D[xc, yc, zc, λ, r, ellipAng, θ] (the body passes r λ/z as r) */
export const drawTheta2D = (xc, yc, zc, λ, r, ellipAng, Theta) => [
  Cyan, Line([[(λ / zc) * xc, (λ / zc) * yc], [(xc * λ) / zc + 0.5 * r, (yc * λ) / zc]]),
  arc2D(xc, yc, r, zc, λ, ellipAng),
  Text(Style('θ', Cyan, FontSize(12)), [(xc * λ) / zc + 0.35 * r * Cos(0.5 * Theta), (yc * λ) / zc + 0.35 * r * Sin(0.5 * Theta)]),
];

/**
 * text = Rasterize[Style["image plane", "SR"], RasterSize -> 500, ImageSize -> 200, Background -> None]: "SR" is the
 * Demonstrations' small sans-serif text style (Verdana-like, 12 pt; the raster saved in the notebook shows it). The
 * definitions saved with the Manipulate hold this picture as Graphics[Raster[…]], whose rows Texture takes from the top
 * down, so both views show the label upside down (Q-CV-01): ImageReflect reproduces that.
 */
export const SR_FONT = 'Verdana, "DejaVu Sans", "Bitstream Vera Sans", sans-serif';
export const text = ImageReflect(Rasterize(Style('image plane', FontFamily(SR_FONT), 12), { RasterSize: 500, ImageSize: 200, Background: None }));

/** label2D: the label as a texture on a translucent rectangle at the top of the image plane */
export const label2D = (() => {
  const rectangle = [[-5, 3.6], [3, 3.6], [3, 5], [-5, 5]], textCorners = [[0, 0], [1, 0], [1, 1], [0, 1]];
  return [Texture(text), EdgeForm(None), Opacity(0.5), Polygon(rectangle, { VertexTextureCoordinates: textCorners })];
})();

/** (*draw image plane in 2D*) imagePlane2D[] */
export const imagePlane2D = () => [EdgeForm(Black), Yellow, Opacity(0.3), Polygon([[-5, -5], [5, -5], [5, 5], [-5, 5]]), label2D];

/**
 * PlotRange -> All (the default of Graphics) for the 2D view: the bounds of every coordinate the primitives use —
 * vertices (a BSplineCurve's sampled points, inside its control polygon), disks with their radius, text positions (not
 * the text's extent) — with Rotate applied. Pure.
 */
export function plotRangeAll(list) {
  const xs = [], ys = [];
  const visit = (g, f) => {
    if (g == null || g === false) return;
    if (Array.isArray(g)) { for (const e of g) visit(e, f); return; }
    if (g.dir || !g.head) return; // a directive
    const add = (p) => { const [px, py] = f(p); xs.push(px); ys.push(py); };
    if (['Polygon', 'Line', 'Point', 'Arrow'].includes(g.head)) g.pts.forEach(add);
    else if (g.head === 'Disk') for (const [dx, dy] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) add([g.c[0] + dx * g.r, g.c[1] + dy * g.r]);
    else if (g.head === 'Text') add(g.pos);
    else if (g.head === 'Annotation') visit(g.g, f);
    else if (g.head === 'Rotate') {
      const c = Math.cos(g.angle), s = Math.sin(g.angle), [ax, ay] = g.about;
      visit(g.g, (p) => f([ax + c * (p[0] - ax) - s * (p[1] - ay), ay + s * (p[0] - ax) + c * (p[1] - ay)]));
    }
  };
  visit(list, (p) => p);
  return [[Math.min(...xs), Math.max(...xs)], [Math.min(...ys), Math.max(...ys)]];
}

/**
 * The body's Graphics[…] for "show 2D view" (q: the body's values). After the image plane, the arrow and the axes, the
 * body sets EdgeForm[Thick], Purple, Opacity[0.4] at the top level: the silhouette AND everything after it — θ, its arc
 * and the drones — are drawn at opacity 0.4 (Q-CV-03). PlotRange All with Mathematica's 2 % padding; ImageSize
 * {427.5, 427.5}: the plot range fitted into the square (UpdateFrame: the picture is made again when the range changes).
 * Annotation (no Wolfram counterpart): test ids for the image plane, the silhouette, θ and the drones.
 */
export function graphics2D(q) {
  const { x, y, z, xc, yc, zc, λ, r, Theta, Phi, majSalAxis, minSalAxis, ellipAng, xcimp, ycimp, Silhouette, showDrone, animation, a } = q;
  const list = [
    Annotation(imagePlane2D(), 'image-plane'), drawArrowsPoints2D(x, y, z, xc, yc, zc, λ), drawaxesuv(),
    // (*2D silhouette*)
    EdgeForm(Thick), Purple, Opacity(0.4),
    Silhouette ? Annotation(Rotate(Polygon(Table((Psi) => [xcimp + majSalAxis * Cos(Psi), ycimp + minSalAxis * Sin(Psi)], [0, 2 * Pi, Pi / 24])), ellipAng), 'silhouette') : null,
    xc === 0 && yc === 0
      ? [ // (*xc = 0 & yc = 0 case when there are infinite solutions*)
        infiniteArrowsPoints2D(x, y, z, xc, yc, zc, λ, r, Phi),
        // (*draw infinite (many) 2D drones*)
        showDrone && !animation
          ? [Annotation(draw2Ddrone(xc, yc, zc, λ, Darker(Green)), 'drone-start'),
            Annotation(Table((T) => draw2Ddrone(xc + r * Cos(T) * Sin(Phi), yc + r * Sin(T) * Sin(Phi), z, λ, Red), [0, 2 * Pi, 0.1 * Pi]), 'drone-goal')]
          : showDrone
            ? [Annotation(draw2Ddrone(xc, yc, zc, λ, Purple), 'drone-start'),
              Annotation(Table((T) => draw2Ddrone(xc + r * Cos(T) * Sin(Phi), yc + r * Sin(T) * Sin(Phi), z, λ, Purple), [0, 2 * Pi, 0.1 * Pi]), 'drone-goal'),
              Annotation(Table((T) => draw2Ddrone(xc + a * r * Cos(T) * Sin(Phi), yc + a * r * Sin(T) * Sin(Phi), zc + a * r * Cos(Phi), λ, Purple), [0, 2 * Pi, 0.1 * Pi]), 'drone-animated')]
            : null]
      : [ // (*xc or yc not equal to 0, there is only one solution*)
        Annotation(drawTheta2D(xc, yc, zc, λ, (r / z) * λ, ellipAng, Theta), 'theta'),
        // (*draw 2D drone*)
        showDrone && !animation
          ? [Annotation(draw2Ddrone(xc, yc, zc, λ, Darker(Green)), 'drone-start'), Annotation(draw2Ddrone(x, y, z, λ, Red), 'drone-goal')]
          : showDrone
            ? [Annotation(draw2Ddrone(xc, yc, zc, λ, Purple), 'drone-start'), Annotation(draw2Ddrone(x, y, z, λ, Purple), 'drone-goal'),
              Annotation(draw2Ddrone(xc + a * r * Cos(Theta) * Sin(Phi), yc + a * r * Sin(Theta) * Sin(Phi), zc + a * r * Cos(Phi), λ, Purple), 'drone-animated')]
            : null],
  ];
  const PlotRange = plotRangeAll(list);
  const [[x0, x1], [y0, y1]] = PlotRange;
  return Graphics(list, { PlotRange, ImageSize: IMAGE_SIZE * Math.min(1, (x1 - x0) / (y1 - y0)), UpdateFrame: true });
}
