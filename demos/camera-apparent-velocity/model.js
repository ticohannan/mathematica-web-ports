// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/camera-apparent-velocity/model.js — one evaluation of the Manipulate body of "Maximizing Apparent Velocity in a
// Camera's Frame": the state in, { state, view, graphics: [3D picture, 2D picture] } out (pure, no DOM). Simple mode:
// plain arithmetic and shared/wl.js names; the original's Initialization definitions in the original's order, one
// function each (the 2D ones in picture2d.js). The published Demonstration runs the definitions SAVED with its
// Manipulate output (SaveDefinitions), which differ from the notebook's Input cells only in colours: Green and Cyan where
// the Input cells write Darker@Green and Darker@Cyan (N-CV-01); the port follows the saved ones, as the snapshots do.
import {
  Graphics3D, Line, Cylinder, Cuboid, Polygon, Point, Arrow, Ellipsoid, Sphere, Text, FontSize, Texture, EdgeForm,
  Opacity, PointSize, Arrowheads, RGBColor, Green, DarkerGreen, Red, Blue, Gray, Black, Yellow, GeometricTransformation,
  affine, rotationMatrix,
} from '../../shared/graphics3d.js';
import { Graphics, Row, Style, Italic, Superscript } from '../../shared/graphics.js';
import { NAMED } from '../../shared/mma-colors.js';
import { Pi, Degree, Cos, Sin, Sqrt, ArcTan, Chop, Mod, Table, Equal, Unequal, Plus, Subtract, Times, Normalize, Dot } from '../../shared/wl.js';
import { IMAGE_SIZE, text, graphics2D } from './picture2d.js';

/** The Manipulate's initial settings; the notebook's saved live state (states[0]) is the same. */
export const SPECS = Object.freeze({ a: 0.5, animation: false, imPlaneView: false, r: 4, showDrone: false, Silhouette: false, unusedVariable: 1, xc: 1, yc: 1, zc: 15 });
export const initialState = () => ({ ...SPECS });

/** λ: the focal length, the distance between the pinhole and the film (Module[{λ = 5, …}]) */
export const LAMBDA = 5;

// colours of shared/graphics3d.js that it does not name
const Purple = RGBColor(...NAMED.Purple), Pink = RGBColor(...NAMED.Pink), Magenta = RGBColor(...NAMED.Magenta), Cyan = RGBColor(...NAMED.Cyan);
/** Translate[g, {x, y, z}] in 3D (shared/graphics3d.js has Rotate and GeometricTransformation only) */
const Translate = (g, v) => GeometricTransformation(g, affine([[1, 0, 0], [0, 1, 0], [0, 0, 1]], v));
/** Rotate[g, θ, w, p] in 3D: about the axis w through p (shared/graphics3d.js Rotate turns about the origin) */
const RotateAbout = (g, theta, w, p) => { const R = rotationMatrix(theta, w); return GeometricTransformation(g, affine(R, Subtract(p, Dot(R, p)))); };
/** Ellipsoid[c, {r1, r2, r3}] (semi-axes) = Ellipsoid[c, DiagonalMatrix[{r1², r2², r3²}]] */
const EllipsoidR = (c, [r1, r2, r3]) => Ellipsoid(c, [[r1 * r1, 0, 0], [0, r2 * r2, 0], [0, 0, r3 * r3]]);
/** Text[Style["x", Italic], p] in 3D */
const italic = (s) => ({ html: `<i>${s}</i>` });

/** PlotRange -> 20 {{-1, 1}, {-1, 1}, {-0.1, 1}} of the 3D view */
export const PLOT_RANGE = [[-20, 20], [-20, 20], [-2, 20]];
/** the length Arrowheads[s] is a fraction of in the 3D view (View3D's default: the plot range's diagonal) */
const DIAGONAL = Math.hypot(...PLOT_RANGE.map(([lo, hi]) => hi - lo));
/**
 * Arrow[{p1, …, pn}] in 3D under Arrowheads[s] (the θ and ϕ arcs): shared/graphics3d-three.js draws an Arrow from its
 * first to its second point only, so the arc is its Line and a two-point Arrow along the last segment as long as the
 * head (s × DIAGONAL), so that the head has its full size at the arc's end (K-CV-01).
 */
const arrowPath = (pts, s) => {
  const end = pts[pts.length - 1], dir = Normalize(Subtract(end, pts[pts.length - 2]));
  return [Line(pts), Arrow([Subtract(end, Times(s * DIAGONAL, dir)), end])];
};
/** Arrowheads[{-s, s}], Arrow[{p, q}] in 3D (a head at each end; the 3D renderer takes one size only): two arrows from the middle */
const arrowBothEnds = (p, q, s) => { const m = Times(0.5, Plus(p, q)); return [Arrowheads(s), Arrow([m, q]), Arrow([m, p])]; };

/**
 * (*this function shows x, y, z, θ and ϕ for the optimum distance point*) computeShortestPt[xc, yc, zc, r] → {θ, ϕ, x,
 * y, z}: θ the angle from the +x axis, ϕ from the +z axis where the optimum occurs; the point on the sphere's
 * parametric equations. Chop: a coordinate within 10⁻¹⁰ of 0 is the exact 0.
 */
export function computeShortestPt(xc, yc, zc, r) {
  const Theta = xc === 0 && yc === 0 ? 0 : ArcTan(xc, yc);
  const Phi = (3 * Pi) / 2 - (ArcTan(Sqrt(r ** 2), Sqrt(xc ** 2 + zc ** 2 + yc ** 2 - r ** 2)) + ArcTan(Sqrt(xc ** 2 + yc ** 2), zc));
  const x = Chop(xc + r * Cos(Theta) * Sin(Phi));
  const y = Chop(yc + r * Sin(Theta) * Sin(Phi));
  const z = Chop(zc + r * Cos(Phi));
  return [Theta, Phi, x, y, z];
}

/**
 * NumberForm[v, {10, 1}]: one digit after the point; a coordinate that Chop made the exact 0 (or a product of it) is shown
 * as the integer "0", as NumberForm leaves exact integers alone.
 */
export const numberForm = (v, exact = false) => (exact && v === 0 ? '0' : v.toFixed(1));
const degrees = (v) => Superscript(numberForm((v * 180) / Pi), '∘'); // NumberForm[v (180)/(π), {10, 1}]^"∘"

/**
 * sphericaldist[_, xc, yc, zc, r]: the "coordinates in camera frame" Grid (Alignment -> {{Right, Left}}) as rows of
 * text expressions {variable, value}. For (xc, yc) = (0, 0) there are infinitely many optimal points.
 */
export function sphericaldist(xc, yc, zc, r) {
  const [Theta, Phi, x, y, z] = computeShortestPt(xc, yc, zc, r);
  if (xc === 0 && yc === 0) {
    // Row[{"(", x, ", " Style["y", Italic], ") ="}]: the missing comma multiplies ", " by y, shown with a space (Q-CV-05)
    const vars = ['', Row(['(', Style('x', Italic), ',  ', Style('y', Italic), ') =']), Row([Style('z', Italic), ' =']), 'θ ∈ ', 'ϕ ='];
    const vals = ['infinite solutions', `${numberForm(r * Sin(Phi))}(cos θ, sin θ)`, numberForm(z, true), Row(['(0, 360', Superscript(')', '∘')]), degrees(Phi)];
    return vars.map((v, i) => [v, vals[i]]);
  }
  const vars = [Row([Style('x', Italic), ' =']), Row([Style('y', Italic), ' =']), Row([Style('z', Italic), ' =']), 'θ =', 'ϕ ='];
  const vals = [numberForm(x, true), numberForm(y, true), numberForm(z, true), degrees(Theta), degrees(Phi)];
  return vars.map((v, i) => [v, vals[i]]);
}

/**
 * (*this function shows u, v and λ for the optimum distance point on the image plane*) imagePlaneCoor[_, xc, yc, zc, r]:
 * the "image plane coordinates" Grid. maxdist = √((x/z − xc/zc)² + (y/z − yc/zc)²) has no factor λ (E-CV-01), and the
 * Grid shows it as "0.3 = maxdist" (value and name swapped, Q-CV-06).
 */
export function imagePlaneCoor(xc, yc, zc, r) {
  const λ = 5;
  const [, Phi, x, y, z] = computeShortestPt(xc, yc, zc, r);
  const maxdist = Sqrt((x / z - xc / zc) ** 2 + (y / z - yc / zc) ** 2);
  const vari = [Row(['(', Style('u', Italic), ', ', Style('v', Italic), ') =']), 'λ =', Row([numberForm(maxdist), ' ='])];
  const vali = xc === 0 && yc === 0
    ? [`${numberForm(r * (λ / z) * Sin(Phi))}(cos θ, sin θ)`, String(λ), 'maxdist']
    : [`(${numberForm((λ * x) / z, true)}, ${numberForm((λ * y) / z, true)})`, String(λ), 'maxdist'];
  return vari.map((v, i) => [v, vali[i]]);
}

/** (*this function draws a drone at position (x,y,z) in color color*) drawDrone[x, y, z, color] */
export const drawDrone = (x, y, z, color) => Translate([
  color,
  Cylinder([[0.5, 0.5, -0.125], [0.5, 0.5, 0.125]], 0.1),
  Cylinder([[-0.5, -0.5, -0.125], [-0.5, -0.5, 0.125]], 0.1),
  Cylinder([[-0.5, 0.5, -0.125], [-0.5, 0.5, 0.125]], 0.1),
  Cylinder([[0.5, -0.5, -0.125], [0.5, -0.5, 0.125]], 0.1),
  EllipsoidR([0, 0, 0], [0.25, 0.2, 0.25]),
  Yellow,
  Cylinder([[0, 0, -0.025], [0.5, 0.5, 0.025]], 0.05),
  Cylinder([[0, 0, -0.025], [0.5, -0.5, 0.025]], 0.05),
  Cylinder([[0, 0, -0.025], [-0.5, 0.5, 0.025]], 0.05),
  Cylinder([[0, 0, -0.025], [-0.5, -0.5, 0.025]], 0.05),
  Gray,
  EllipsoidR([0.5, 0.5, 0.125], [0.25, 0.25, 0]),
  EllipsoidR([0.5, -0.5, 0.125], [0.25, 0.25, 0]),
  EllipsoidR([-0.5, 0.5, 0.125], [0.25, 0.25, 0]),
  EllipsoidR([-0.5, -0.5, 0.125], [0.25, 0.25, 0]),
], [x, y, z]);

/** (*draw x, y, z, u and v coordinate axes*) drawaxes[] */
export const drawaxes = () => [
  FontSize(12), Arrowheads(0.011),
  // (*x, y, z*)
  Green, Arrow([[-5, -5, 0], [-3, -5, 0]]), Arrow([[-5, -5, 0], [-5, -3, 0]]), Arrow([[-5, -5, 0], [-5, -5, 2]]),
  Text(italic('x'), [-3.5, -5.3, -0.5]),
  Text(italic('y'), [-4, -3.5, 1]),
  Text(italic('z'), [-5, -5, 2.5]),
  // (*u, v*)
  Black, Arrow([[-5, -5, 5], [-3, -5, 5]]), Arrow([[-5, -5, 5], [-5, -3, 5]]),
  Text(italic('u'), [-3, -6.5, 5.5]),
  Text(italic('v'), [-5.3, -3.5, 5.5]),
];

/** The original's aperture polygon (16 vertices): round the big square at z = 1, then round the small one at z = aph with a spike to each big corner. */
export const APERTURE = ((apWid, aph) => [[apWid, apWid, 1], [-apWid, apWid, 1], [-apWid, -apWid, 1], [apWid, -apWid, 1], [apWid, apWid, 1],
  [0.2, 0.2, aph], [-0.2, 0.2, aph], [-apWid, apWid, 1], [-0.2, 0.2, aph], [-0.2, -0.2, aph], [-apWid, -apWid, 1], [-0.2, -0.2, aph],
  [0.2, -0.2, aph], [apWid, -apWid, 1], [0.2, -0.2, aph], [0.2, 0.2, aph]])(0.9, 0.1);

/**
 * (*this function draws the camera*) drawCamera[]: the camera box and the aperture pyramid. Mathematica fills the
 * aperture's single non-planar Polygon as the funnel's four slanted sides (the snapshots); shared/graphics3d-three.js fans
 * a polygon from its first vertex, so the port gives the same four sides as four Polygons (same faces, same edges;
 * D-CV-04). The original's EdgeForm[Thick] at the end affects nothing after it.
 */
export function drawCamera() {
  const top = [0, 1, 2, 3].map((k) => APERTURE[k]), bottom = [5, 6, 9, 12].map((k) => APERTURE[k]);
  return [
    // (*draw the camera box*)
    Green, Opacity(0.3), Cuboid([-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]),
    // (*draw the camera aperture pyramid*)
    [0, 1, 2, 3].map((k) => Polygon([top[k], top[(k + 1) % 4], bottom[(k + 1) % 4], bottom[k]])),
  ];
}

/** drawSphereLinesArrowsPoints[x, y, z, xc, yc, zc, λ, r, Silhouette] (Thin: the default 1 px lines) */
export const drawSphereLinesArrowsPoints = (x, y, z, xc, yc, zc, λ, r, Silhouette) => [
  Silhouette ? [Purple, Opacity(0.3), Sphere([xc, yc, zc], r)] : null,
  PointSize(0.01), Opacity(1), Green, Point([xc, yc, zc]),
  Opacity(0.4), Black, Arrowheads(0.0075), Arrow([[(λ * xc) / zc, (λ * yc) / zc, λ], [(λ * x) / z, (λ * y) / z, λ]]),
  Opacity(1), Blue, Arrowheads(0.011), Arrow([[0, 0, 0], [x, y, z]]), Arrow([[0, 0, 0], [(λ * x) / z, (λ * y) / z, λ]]),
  Black, Arrowheads(0.011), Arrow([[xc, yc, zc], [x, y, z]]),
  Black, Line([[0, 0, 0], [xc, yc, zc]]), Line([[xc, yc, zc - r], [xc, yc, zc + r]]),
  Red, PointSize(0.01), Point([x, y, z]),
  Black, Line([[xc, yc - r, zc], [xc, yc + r, zc]]), Line([[xc - r, yc, zc], [xc + r, yc, zc]]),
  Opacity(1), Red, PointSize(0.01), Point([(λ * x) / z, (λ * y) / z, λ]),
  Green, PointSize(0.01), Point([(λ * xc) / zc, (λ * yc) / zc, λ]),
];

/** infiniteArrowsPoints[x, y, z, xc, yc, zc, λ, r, ϕ]: (xc, yc) = (0, 0) — every θ is optimal: the ring of goals at height z */
export const infiniteArrowsPoints = (x, y, z, xc, yc, zc, λ, r, Phi) => [
  Opacity(1), Blue,
  Table((Theta) => Line([[0, 0, 0], [xc + r * Cos(Theta) * Sin(Phi), yc + r * Sin(Theta) * Sin(Phi), z]]), [0, 2 * Pi, 0.1 * Pi]),
  Opacity(1), Gray, Arrowheads(0.011),
  Table((Theta) => Arrow([[xc, yc, zc], [xc + r * Cos(Theta) * Sin(Phi), yc + r * Sin(Theta) * Sin(Phi), z]]), [0, 2 * Pi, 0.1 * Pi]),
  Opacity(1), Gray, Arrowheads(0.0075),
  Table((Theta) => Arrow([[(λ * xc) / zc, (λ * yc) / zc, λ], [(λ * (xc + r * Cos(Theta) * Sin(Phi))) / z, (λ * (yc + r * Sin(Theta) * Sin(Phi))) / z, λ]]), [0, 2 * Pi, 0.1 * Pi]),
  Opacity(1), Red, PointSize(0.01),
  Table((Theta) => Point([[0, 0, 0], [((xc + r * Cos(Theta) * Sin(Phi)) * λ) / z, ((yc + r * Sin(Theta) * Sin(Phi)) * λ) / z, λ]]), [0, 2 * Pi, 0.1 * Pi]),
  Table((Theta) => Point([[0, 0, 0], [xc + r * Cos(Theta) * Sin(Phi), yc + r * Sin(Theta) * Sin(Phi), zc + r * Cos(Phi)]]), [0, 2 * Pi, 0.1 * Pi]),
  Green, PointSize(0.01), Point([(λ * xc) / zc, (λ * yc) / zc, λ]),
];

/** (*in 3D view, draw θ and ϕ*) drawThetaPhi[xc, yc, y, zc, λ, r, θ, ϕ] */
export const drawThetaPhi = (xc, yc, y, zc, λ, r, Theta, Phi) => [
  // (*drawing θ*)
  Cyan, Line([[xc, yc, zc], [xc + 0.5 * r, yc, zc]]),
  Arrowheads(0.0075),
  Equal(Theta, 0)
    ? [Arrow([[xc, yc, zc], [xc + 0.5 * r, yc, zc]])]
    : [arrowPath(Table((t) => [xc + 0.25 * r * Cos(t), yc + 0.25 * r * Sin(t), zc], [0, Theta, Theta / 12]), 0.0075),
      arrowPath(Table((t) => [(xc * λ) / zc + 0.25 * r * Cos(t), (yc * λ) / zc + 0.25 * r * Sin(t), λ], [0, Theta, Theta / 12]), 0.0075)],
  Text('θ', [xc + 0.35 * r * Cos(0.5 * Theta), yc + 0.35 * r * Sin(0.5 * Theta), zc]),
  // (*2D*)
  [FontSize(12), Text('θ', [(xc * λ) / zc + 0.35 * r * Cos(0.5 * Theta), (yc * λ) / zc + 0.35 * r * Sin(0.5 * Theta), λ])],
  Line([[(xc * λ) / zc, (yc * λ) / zc, λ], [(xc * λ) / zc + 0.5 * r, (yc * λ) / zc, λ]]),
  // (*drawing ϕ*)
  Magenta, Line([[xc, yc, zc], [xc, yc, zc + 0.5 * r]]),
  Unequal(Phi, 0) ? arrowPath(Table((t) => [xc + 0.45 * r * Cos(Theta) * Sin(t), yc + 0.45 * r * Sin(Theta) * Sin(t), zc + 0.45 * r * Cos(t)], [0, Phi, Phi / 12]), 0.0075) : null,
  [FontSize(12), Text('ϕ', [xc + 0.45 * r * Cos(0.5 * Theta) * Sin(0.5 * Phi), yc + 0.45 * r * Sin(0.5 * Theta) * Sin(0.5 * Phi), zc + 0.45 * r * Cos(0.5 * Phi)])],
];

/** label: the rasterized "image plane" (picture2d.js text) on a translucent rectangle just above the image plane (dz = .001) */
export const label = (() => {
  const dz = 0.001;
  const rectangle = [[-5, 3.6, 5 + dz], [3, 3.6, 5 + dz], [3, 5, 5 + dz], [-5, 5, 5 + dz]], textCorners = [[0, 0], [1, 0], [1, 1], [0, 1]];
  return [Texture(text), EdgeForm(), Opacity(0.5), Polygon(rectangle, { VertexTextureCoordinates: textCorners })];
})();

/** imagePlane[]: the image plane at z = λ = 5 (default dark edges), a faint larger plane just below, the label, λ */
export const imagePlane = () => [
  FontSize(12), Yellow, Opacity(0.3), Polygon([[-5, -5, 5], [5, -5, 5], [5, 5, 5], [-5, 5, 5]]),
  [EdgeForm(), Opacity(0.1), Polygon([[-15, -15, 4.95], [15, -15, 4.95], [15, 15, 4.95], [-15, 15, 4.95]])],
  Pink, Opacity(1),
  label,
  arrowBothEnds([-5, 0, 0], [-5, 0, 5], 0.011), // Arrowheads[{-0.011, 0.011}], Arrow[{{-5, 0, 0}, {-5, 0, 5}}]
  Text('λ', [-5.5, 0, 2.5]),
];

/** The options of the 3D picture */
export const OPTIONS_3D = Object.freeze({ SphericalRegion: true, ImageSize: IMAGE_SIZE, Boxed: false, ViewAngle: 12 * Degree, PlotRange: PLOT_RANGE });
/** The 2D picture while it is not shown: an empty Graphics with the usual plot range (no new picture on switching) */
const HIDDEN_2D = Graphics([], { PlotRange: [[-5.3, 5], [-5.3, 5]], ImageSize: IMAGE_SIZE, UpdateFrame: true });

/** The body evaluates itself again while "animate" is on (each evaluation moves a): Manipulate's own re-evaluation. */
export const settles = (s) => s.animation === true;

/**
 * One evaluation of the Manipulate body. If[animation, a = Mod[a + .1, 1]] first (a returned in `state`); then either the
 * 2D view (imPlaneView) or the 3D view; the other picture is returned empty (the page shows one of the two).
 */
export function evaluate(state) {
  const s = { ...state };
  if (s.animation) s.a = Mod(s.a + 0.1, 1);
  const { xc, yc, zc, r, Silhouette, imPlaneView, showDrone, animation, a } = s;
  const λ = 5; // (*focal length, the distance between the pinhole and the film*)
  const [Theta, Phi, x, y, z] = computeShortestPt(xc, yc, zc, r); // (*optimum value angles and position*)
  // (*silhouette axes*)
  const majSalAxis = r * λ * Sqrt((xc ** 2 + yc ** 2 + zc ** 2 - r ** 2) / (r ** 2 - zc ** 2) ** 2);
  const minSalAxis = (r * λ) / Sqrt(zc ** 2 - r ** 2);
  const ellipAng = ArcTan(x, y); // (*silhouette rotating angle from +ve u axis*)
  // (*silhouette center point*)
  const xcimp = (x * λ) / z - majSalAxis * Cos(ellipAng);
  const ycimp = (y * λ) / z - majSalAxis * Sin(ellipAng);
  const infinite = xc === 0 && yc === 0;
  const view = { Theta, Phi, x, y, z, u: (λ * x) / z, v: (λ * y) / z, majSalAxis, minSalAxis, ellipAng, xcimp, ycimp, infinite, a: s.a, imPlaneView };
  if (imPlaneView) {
    const g2 = graphics2D({ x, y, z, xc, yc, zc, λ, r, Theta, Phi, majSalAxis, minSalAxis, ellipAng, xcimp, ycimp, Silhouette, showDrone, animation, a });
    return { state: s, view: { ...view, PlotRange2D: g2.options.PlotRange }, graphics: [Graphics3D([], OPTIONS_3D), g2] };
  }
  const T = (f) => Table(f, [0, 2 * Pi, 0.1 * Pi]); // {θ, 0, 2Pi, 0.1Pi}: 21 values, the first and the last the same direction
  const g3 = Graphics3D([
    drawaxes(), drawCamera(), imagePlane(), drawSphereLinesArrowsPoints(x, y, z, xc, yc, zc, λ, r, Silhouette),
    infinite
      ? [ // (*xc = 0 & yc = 0 case when there are infinite solutions*)
        infiniteArrowsPoints(x, y, z, xc, yc, zc, λ, r, Phi),
        // (*draw infinite drones*)
        showDrone && !animation
          ? [drawDrone(xc, yc, zc, DarkerGreen), T((th) => drawDrone(xc + r * Cos(th) * Sin(Phi), yc + r * Sin(th) * Sin(Phi), z, Red))]
          : showDrone ? [drawDrone(xc, yc, zc, Purple), T((th) => drawDrone(xc + r * Cos(th) * Sin(Phi), yc + r * Sin(th) * Sin(Phi), z, Purple))] : null,
        animation ? T((th) => drawDrone(xc + a * r * Cos(th) * Sin(Phi), yc + a * r * Sin(th) * Sin(Phi), zc + a * r * Cos(Phi), Purple)) : null]
      : [ // (*xc or yc not equal to 0, there is only one solution*)
        drawThetaPhi(xc, yc, y, zc, λ, r, Theta, Phi),
        // (*draw 2 drones*)
        showDrone && !animation
          ? [drawDrone(x, y, z, Red), drawDrone(xc, yc, zc, DarkerGreen)]
          : showDrone ? [drawDrone(x, y, z, Purple), drawDrone(xc, yc, zc, Purple)] : null,
        animation ? drawDrone(xc + a * r * Cos(Theta) * Sin(Phi), yc + a * r * Sin(Theta) * Sin(Phi), zc + a * r * Cos(Phi), Purple) : null],
    // (*draw silhouette*)
    Purple, Opacity(0.4),
    Silhouette ? RotateAbout(Polygon(Table((Psi) => [xcimp + majSalAxis * Cos(Psi), ycimp + minSalAxis * Sin(Psi), 5 + 0.01], [0, 2 * Pi, Pi / 12])), ellipAng, [0, 0, 1], [xcimp, ycimp, 5]) : null,
  ], OPTIONS_3D);
  return { state: s, view, graphics: [g3, HIDDEN_2D] };
}

