// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dubins-reachability-3d/model.js — one evaluation of the Manipulate body of "3D Reachability Set for a Dubins
// Car": the state in, { state, view, graphics } out (pure, no DOM). Simple mode: plain arithmetic, the original's
// definitions under their names and in their order (Greek names spelled out: α → Alpha, β → Beta, θ → Theta; τ stays τ),
// the body's assignments to Manipulate variables returned in `state`. graphics = [the 3D picture or null, the 2D
// picture or null]: the original shows one of them (dim); main.js stacks the two pictures in one place.
import {
  Graphics, Line, Polygon, Rectangle, Circle, Arrow, Arrowheads, Rotate, Translate, Annotation, Opacity, EdgeForm, Directive,
  Thickness, Dashed, Black, Gray, Red, Green, Yellow, Darker, RGBColor, None,
} from '../../shared/graphics.js';
import { ParametricPlot, Show, Placed, COLOR_DATA_97 } from '../../shared/plot.js';
import {
  Graphics3D, Group3D, GraphicsComplex, ParametricPlot3D, Sphere, Directive as Directive3D, RGBColor as RGBColor3D,
  Polygon as Polygon3D, Line as Line3D, EdgeForm as EdgeForm3D, Thick as Thick3D, flatten, primitiveBounds,
} from '../../shared/graphics3d.js';
import { Pi, Sin, Cos, ArcTan, Table, Join, Unequal, Less } from '../../shared/wl.js';

// ---- Initialization: the seven 3D lines between the six Dubins parametric surfaces ---------------------------------

/** mRS3D[τ, t, r]: turn right for τ t, then straight — the line between RSR and RSL; {x, y, θ}. */
export function mRS3D(τ, t, r) {
  const Alpha = (τ * t) / r;
  return [r * (1 - Cos(Alpha)) - t * (τ - 1) * Sin(Alpha), r * Sin(Alpha) - t * (τ - 1) * Cos(Alpha), Pi / 2 - Alpha];
}
/** mLS3D[τ, t, r]: turn left for τ t, then straight — the line between LSL and LSR. */
export function mLS3D(τ, t, r) {
  const Alpha = (τ * t) / r;
  return [-r * (1 - Cos(Alpha)) + t * (τ - 1) * Sin(Alpha), r * Sin(Alpha) - t * (τ - 1) * Cos(Alpha), Pi / 2 + Alpha];
}
/** mRL3D[τ, t, r]: turn right for τ t, then left. */
export function mRL3D(τ, t, r) {
  const Alpha = (τ * t) / r, Beta = ((1 - τ) * t) / r;
  return [r * (1 - 2 * Cos(Alpha) + Cos(Alpha - Beta)), r * (2 * Sin(Alpha) - Sin(Alpha - Beta)), Pi / 2 - Alpha + Beta];
}
/** mLR3D[τ, t, r]: turn left for τ t, then right. */
export function mLR3D(τ, t, r) {
  const Alpha = (τ * t) / r, Beta = ((1 - τ) * t) / r;
  return [r * (-1 + 2 * Cos(Alpha) - Cos(Alpha - Beta)), r * (2 * Sin(Alpha) - Sin(Alpha - Beta)), Pi / 2 + Alpha - Beta];
}
/** mRLR3D[τ, t, r]: right for τ t, left for t/2, right for the rest — the RLR paths with no net change of θ. */
export const mRLR3D = (τ, t, r) => [2 * r * (Cos((t * τ) / r) - Cos((t - 2 * t * τ) / (2 * r))), 2 * r * (Sin((t * τ) / r) + Sin((t - 2 * t * τ) / (2 * r))), Pi / 2];
/** mSL3D[τ, t, r]: straight for τ t, then left — the line between LSL and RSL. */
export const mSL3D = (τ, t, r) => [-2 * r * Sin((t * (1 - τ)) / (2 * r)) ** 2, t * τ + 2 * r * Cos((t * (1 - τ)) / (2 * r)) * Sin((t * (1 - τ)) / (2 * r)), Pi / 2 + (t * (1 - τ)) / r];
/** mSR3D[τ, t, r]: straight for τ t, then right — the line between RSR and LSR. */
export const mSR3D = (τ, t, r) => [2 * r * Sin((t * (1 - τ)) / (2 * r)) ** 2, t * τ + 2 * r * Cos((t * (1 - τ)) / (2 * r)) * Sin((t * (1 - τ)) / (2 * r)), Pi / 2 - (t * (1 - τ)) / r];

/**
 * dubbins3D[τ1, τ2, t, r, p1, p2, p3]: the pose {x, y, θ} after a CCC path (no straight part) of duration t: turn p1
 * (−1 right, 1 left) until τ1 t, p2 until τ2 t, p3 until t; start at the origin heading +y (θ = π/2).
 */
export function dubbins3D(τ1, τ2, t, r, p1, p2, p3) {
  const Alpha1 = (τ1 * t) / r, Alpha2 = ((τ2 - τ1) * t) / r, Alpha3 = ((1 - τ2) * t) / r;
  return [
    p1 * r * (-1 + Cos(Alpha1)) - 2 * p3 * r * Sin((p3 * Alpha3) / 2) * Sin(p1 * Alpha1 + p2 * Alpha2 + (p3 * Alpha3) / 2) + p2 * r * (-Cos(p1 * Alpha1) + Cos(p1 * Alpha1 + p2 * Alpha2)),
    r * (Sin(Alpha1) + 2 * p3 * Cos(p1 * Alpha1 + p2 * Alpha2 + (p3 * Alpha3) / 2) * Sin((p3 * Alpha3) / 2)) + p2 * r * (-Sin(p1 * Alpha1) + Sin(p1 * Alpha1 + p2 * Alpha2)),
    Pi / 2 + p1 * Alpha1 + p2 * Alpha2 + p3 * Alpha3,
  ];
}
/** dubbins3Ds[τ1, τ2, t, r, p1, p2, p3]: the pose after a curve–straight–curve path (p2, the straight part, unused). */
export function dubbins3Ds(τ1, τ2, t, r, p1, p2, p3) {
  const Alpha1 = (τ1 * t) / r, Alpha3 = ((1 - τ2) * t) / r;
  return [
    p1 * r * (-1 + Cos(Alpha1)) - 2 * p3 * r * Sin((p3 * Alpha3) / 2) * Sin(p1 * Alpha1 + (p3 * Alpha3) / 2) + t * (τ1 - τ2) * Sin(p1 * Alpha1),
    r * (Sin(Alpha1) + 2 * p3 * Cos(p1 * Alpha1 + (p3 * Alpha3) / 2) * Sin((p3 * Alpha3) / 2)) + t * (-τ1 + τ2) * Cos(p1 * Alpha1),
    Pi / 2 + p1 * Alpha1 + p3 * Alpha3,
  ];
}

// ---- Initialization: the seven lines in 2D (the x, y parts of the 3D lines) ------------------------------------------
export function mRS(τ, t, r) { const Alpha = (τ * t) / r; return [r * (1 - Cos(Alpha)) - t * (τ - 1) * Sin(Alpha), r * Sin(Alpha) - t * (τ - 1) * Cos(Alpha)]; }
export function mLS(τ, t, r) { const Alpha = (τ * t) / r; return [-r * (1 - Cos(Alpha)) + t * (τ - 1) * Sin(Alpha), r * Sin(Alpha) - t * (τ - 1) * Cos(Alpha)]; }
export function mRL(τ, t, r) { const Alpha = (τ * t) / r, Beta = ((1 - τ) * t) / r; return [r * (1 - 2 * Cos(Alpha) + Cos(Alpha - Beta)), r * (2 * Sin(Alpha) - Sin(Alpha - Beta))]; }
export function mLR(τ, t, r) { const Alpha = (τ * t) / r, Beta = ((1 - τ) * t) / r; return [r * (-1 + 2 * Cos(Alpha) - Cos(Alpha - Beta)), r * (2 * Sin(Alpha) - Sin(Alpha - Beta))]; }
export const mRLR = (τ, t, r) => [2 * r * (Cos((t * τ) / r) - Cos((t - 2 * t * τ) / (2 * r))), 2 * r * (Sin((t * τ) / r) + Sin((t - 2 * t * τ) / (2 * r)))];
export const mSL = (τ, t, r) => [-2 * r * Sin((t * (1 - τ)) / (2 * r)) ** 2, t * τ + 2 * r * Cos((t * (1 - τ)) / (2 * r)) * Sin((t * (1 - τ)) / (2 * r))];
export const mSR = (τ, t, r) => [2 * r * Sin((t * (1 - τ)) / (2 * r)) ** 2, t * τ + 2 * r * Cos((t * (1 - τ)) / (2 * r)) * Sin((t * (1 - τ)) / (2 * r))];

/**
 * drawCar[xy, θ, α, opac, sc, lights]: a car icon centred at the middle of the rear axle (sc is not used, as in the
 * original): body, headlights (If[lights, …]), axles, tyres (the front ones turned by ArcTan[α ∓ .375, 1.4] unless
 * α == 0) and a black arrow; Translate[Rotate[Translate[{…}, {0.7, 0}], θ, {0, 0}], xy].
 */
export function drawCar(xy, Theta, Alpha, opac, sc, lights) {
  return [Opacity(opac), EdgeForm(Directive(Opacity(opac), Black)), Translate(Rotate(Translate([
    Rectangle([-1, -1 / 2], [1, 1 / 2]),
    Darker(Gray),
    lights && [Yellow, Opacity(0.8 * opac), EdgeForm(None), Polygon([[1, 0.35], [8, 0.05], [8, 0.55]]), Polygon([[1, -0.35], [8, -0.05], [8, -0.55]])],
    Line([[-0.7, 0.35], [-0.7, -0.35]]), Line([[0.7, 0.35], [0.7, -0.35]]),
    Rotate(Rectangle([0.5, 0.35], [0.9, 0.4]), Alpha === 0 ? 0 : ArcTan(Alpha - 0.375, 1.4), [0.7, 0.375]),
    Rectangle([-0.5, 0.35], [-0.9, 0.4]),
    Rectangle([-0.5, -0.35], [-0.9, -0.4]),
    Rotate(Rectangle([0.5, -0.35], [0.9, -0.4]), Alpha === 0 ? 0 : ArcTan(Alpha + 0.375, 1.4), [0.7, -0.375]),
    Black, Arrowheads(0.02), Arrow([[0, 0], [1.0, 0]]),
  ], [0.7, 0]), Theta, [0, 0]), xy)];
}

// ---- the Manipulate variables ------------------------------------------------------------------------------------------

export const DIMS = ['2D', '3D'];
export const PATHS = ['RSR', 'LSL', 'RSL', 'LSR', 'RLR', 'LRL'];
/**
 * The state saved in the notebook (states[0], the published Demonstration) = the Manipulate's own initial values (specs):
 * the 3D set for r = 1.8, t = 10, path RSR with switching times {0.5, 0.75}. plotReach (the cached plot; the notebook
 * stores the Graphics) is in the port the description of the plot the body computes from r, t and dim (N-D3-02).
 */
export const SAVED = Object.freeze({
  dim: '3D', dimold: '3D', r: 1.8, rold: 1.8, t: 10, told: 10, plotReach: Object.freeze({ dim: '3D', r: 1.8, t: 10 }),
  path: 'RSR', τ: Object.freeze([0.5, 0.75]), p: 100,
});
export const initialState = () => structuredClone({ ...SAVED, plotReach: { ...SAVED.plotReach }, τ: [...SAVED.τ] });

/** {p1, p2, p3, clr} of the Piecewise: the turns of the three segments (−1 right, 0 straight, 1 left) and the colour. */
export function pathParameters(path) {
  const clr = (i) => COLOR_DATA_97[i - 1]; // ColorData[97, "ColorList"][[i]]
  if (path === 'RSR') return [-1, 0, -1, clr(2)];
  if (path === 'LSL') return [1, 0, 1, clr(1)];
  if (path === 'RSL') return [-1, 0, 1, clr(3)];
  if (path === 'LSR') return [1, 0, -1, clr(4)];
  if (path === 'RLR') return [-1, 1, -1, clr(5)];
  return [1, -1, 1, clr(6)]; // True: LRL
}

/**
 * The pose of the car at progress myp (%) of the path: If[p2 == 0, dubbins3Ds, dubbins3D] @@ {If[τ[[1]] < myp/100.,
 * τ[[1]] 100/myp, 1], If[τ[[2]] < myp/100., τ[[2]] 100/myp, 1], myp/100 t, r, p1, p2, p3} — the switching times
 * rescaled to the part of the path already driven.
 */
export function carPose(myp, τ, t, r, [p1, p2, p3]) {
  const f = p2 === 0 ? dubbins3Ds : dubbins3D;
  return f(Less(τ[0], myp / 100) ? (τ[0] * 100) / myp : 1, Less(τ[1], myp / 100) ? (τ[1] * 100) / myp : 1, (myp / 100) * t, r, p1, p2, p3);
}

// ---- the 2D picture -----------------------------------------------------------------------------------------------------

export const LEGEND_LABELS = ['RS', 'LS', 'RL', 'LR', 'RLR, Δθ = 0', 'SL', 'SR'];
/**
 * PlotLegends -> Placed[…, {Left, Bottom}]: the legend in the lower left corner inside the plot. The layer's Placed takes
 * the legend's centre in scaled coordinates of the padded plot range (no {Left, Bottom}); this centre puts the legend's
 * corner where snapshots 2 and 4 show it (D-D3-04).
 */
export const LEGEND_AT = [0.165, 0.175];
/** Show[…, PlotRange -> {{-15, 15}, {-16, 16}}] */
export const PLOT_RANGE_2D = [[-15, 15], [-16, 16]];

/**
 * plotReach in 2D: ParametricPlot of the seven lines, s from 0 to 1 (mRLR at s/2), with the legend and the Prolog's two
 * translucent gray polygons LS–RS–RL and LS–RS–LR (each self-intersecting polygon filled by the even-odd rule, as
 * Mathematica fills polygons). polySteps = If[t < 10, 0.05, 0.02].
 */
export function plotReach2D(t, r) {
  const polySteps = Less(t, 10) ? 0.05 : 0.02;
  const LSback = Table((s) => mLS(s, t, r), [1, 0, -polySteps]);
  const RS = Table((s) => mRS(s, t, r), [0, 1, polySteps]);
  const polygon = (pts, id) => Annotation(Polygon(pts), id, { 'fill-rule': 'evenodd' });
  return ParametricPlot((s) => [mRS(s, t, r), mLS(s, t, r), mRL(s, t, r), mLR(s, t, r), mRLR(s / 2, t, r), mSL(s, t, r), mSR(s, t, r)], [0, 1], {
    PlotLegends: Placed(LEGEND_LABELS, LEGEND_AT),
    Prolog: [[Opacity(0.4), Gray,
      polygon(Join(LSback, RS, Table((s) => mRL(s, t, r), [0, 1, polySteps])), 'reach-polygon-1'),
      polygon(Join(LSback, RS, Table((s) => mLR(s, t, r), [1, 0, -polySteps])), 'reach-polygon-2')]],
  });
}

/**
 * epiGraphics: the dashed minimum-turning circles, the radius arrow (its label, Text["r", {r, -r/3}, Left], is not
 * drawn: Q-D3-03), the driven path (Thickness[0.01], the path's colour), the start car (red, half transparent, no
 * lights) and the car at progress p (green, with headlights).
 */
export function epiGraphics(r, clr, pathPoints, car) {
  return [
    Annotation([Gray, [Dashed, Circle([r, 0], r), Circle([-r, 0], r)], Arrowheads(0.02), Arrow([[r, 0], [r, -r]])], 'turning-circles'),
    [Thickness(0.01), RGBColor(...clr), Annotation(Line(pathPoints), 'path')],
    Red, Annotation(drawCar([0, 0], Pi / 2, 0, 0.5, 0.5, false), 'start-car'),
    Green, Annotation(drawCar(car.xy, car.Theta, car.Alpha, 0.8, 0.5, true), 'car'),
  ];
}

/** Show[{plotReach, Graphics[epiGraphics]}, AspectRatio -> Automatic, AxesOrigin -> {0, 0}, PlotRange -> {{-15, 15}, {-16, 16}}, ImageSize -> 440] */
export function show2D(plotReach, epi) {
  const g = Show(plotReach, Graphics(epi));
  // the plot's PlotRangePadding -> Scaled[0.05] (its first PlotRangePadding option, which Mathematica uses: N-D3-05)
  return Graphics(g.list, { ...g.options, AxesOrigin: [0, 0], PlotRange: PLOT_RANGE_2D, PlotRangePadding: [0.05, 0.05], ImageSize: 440, testid: 'scene-2d' });
}

// ---- the 3D picture -----------------------------------------------------------------------------------------------------

const GRAY_02 = RGBColor3D(0.2, 0.2, 0.2); // the mesh lines' GrayLevel[0.2]
/** The surfaces' default colours: ColorData[97] 2, 1, 3, 4, 5, 6 (Mathematica's 3D plot theme starts with the second colour). */
export const SURFACE_COLORS = [2, 1, 3, 4, 5, 6].map((i) => COLOR_DATA_97[i - 1]);
/** Mesh -> Automatic: 15 mesh lines of each parameter, at k/16 (as the notebook's saved plot has them). */
export const MESH_LINES = 15;
/**
 * The lighting Mathematica's 3D plot theme gives each surface colour (Lighting -> {{"Ambient", a}, {"Directional", d1,
 * ImageScaled[{0, 2, 2}]}, {"Directional", d2, ImageScaled[{2, 2, 2}]}, {"Directional", d3, ImageScaled[{2, 0, 2}]}} and
 * Specularity[White, n]), in SURFACE_COLORS order — the values stored with the notebook's saved plots (the same in all of
 * them). The directional lights are k × the surface colour (k = 0.3, 0.42, 0.25, 0.25, 0.5, 0.25), except the middle light
 * of the last three (GrayLevel[0.3], Hue[0.7, 1, 1] = {0.2, 0, 1}, GrayLevel[0.3]). Drawn by picture3d.js (D-D3-03).
 */
export const THEME_LIGHTING = [
  { ambient: [0.30100577, 0.224146685, 0.090484535], directional: [[0.2642166, 0.1833123, 0.0426153], [0.2642166, 0.1833123, 0.0426153], [0.2642166, 0.1833123, 0.0426153]], specularity: 3 },
  { ambient: [0.196998383, 0.252204821, 0.333209402], directional: [[0.15473514, 0.21284718, 0.29811516], [0.15473514, 0.21284718, 0.29811516], [0.15473514, 0.21284718, 0.29811516]], specularity: 3 },
  { ambient: [0.1830429875, 0.2142476375, 0.0962851875], directional: [[0.14004525, 0.17289225, 0.04872125], [0.14004525, 0.17289225, 0.04872125], [0.14004525, 0.17289225, 0.04872125]], specularity: 3 },
  { ambient: [0.30756835, 0.18676585, 0.147065275], directional: [[0.2306315, 0.0964065, 0.05229475], [0.3, 0.3, 0.3], [0.2306315, 0.0964065, 0.05229475]], specularity: 6 },
  { ambient: [0.4113952, 0.3882496, 0.4805404], directional: [[0.264244, 0.235312, 0.3506755], [0.2, 0, 1], [0.264244, 0.235312, 0.3506755]], specularity: 6 },
  { ambient: [0.3544158, 0.2863108, 0.2204774], directional: [[0.19301975, 0.1078885, 0.02559675], [0.3, 0.3, 0.3], [0.19301975, 0.1078885, 0.02559675]], specularity: 6 },
];
/** The ImageScaled positions of the three directional lights (fixed to the camera). */
export const THEME_LIGHT_POSITIONS = [[0, 2, 2], [2, 2, 2], [2, 0, 2]];

/**
 * Divisions of each parameter of a surface's grid: 16 × a factor that keeps the turning angle per step (t/r divided by
 * the divisions) small; the mesh lines k/16 are grid lines. Not Mathematica's adaptive sampler (D-D3-02).
 */
export const surfaceDivisions = (t, r) => 16 * Math.min(8, Math.max(4, Math.ceil(t / r / 2.5)));

/**
 * ParametricPlot3D[f[τ1, τ2], {τ1, 0, 1}, {τ2, τ1, 1}] of one surface: a GraphicsComplex over a grid of the triangular
 * domain (τ1 = i/n ≤ τ2 = j/n), quads and the triangles at the diagonal τ1 = τ2, smooth-shaded, no edges; and its mesh
 * lines τ1 = k/16 (τ2 from τ1 to 1) and τ2 = k/16 (τ1 from 0 to τ2) in GrayLevel[0.2].
 */
export function triangularSurface(f, n, color) {
  const id = []; // id[i][j - i] = 1-based index of the point (i/n, j/n)
  const pts = [];
  for (let i = 0; i <= n; i++) { id.push([]); for (let j = i; j <= n; j++) { pts.push(f(i / n, j / n)); id[i].push(pts.length); } }
  const at = (i, j) => id[i][j - i];
  const polys = [];
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (j === i) polys.push([at(i, i), at(i, i + 1), at(i + 1, i + 1)]);
      else polys.push([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
    }
  }
  const step = n / (MESH_LINES + 1), mesh = [];
  for (let k = 1; k <= MESH_LINES; k++) {
    const m = k * step;
    mesh.push(Line3D(Table((j) => pts[at(m, j) - 1], [m, n]))); // τ1 = k/16
    mesh.push(Line3D(Table((i) => pts[at(i, m) - 1], [0, m]))); // τ2 = k/16
  }
  return [[EdgeForm3D(), RGBColor3D(...color), GraphicsComplex(pts, Polygon3D(polys))], [GRAY_02, mesh]];
}

/**
 * plotReach in 3D: {ParametricPlot3D of the seven lines (mRLR3D at τ/2), ParametricPlot3D of the six surfaces RSR, LSL,
 * RSL, LSR (dubbins3Ds) and RLR, LRL (dubbins3D[τ1/2, 1/2 + τ2/2, …])}, with the bounds of its primitives (PlotRange ->
 * All). Curves: ColorData[97] 1–7, AbsoluteThickness[2] (Thick, drawn 2 px by main.js).
 */
export function plotReach3D(t, r) {
  const curves = ParametricPlot3D([
    (τ) => mRS3D(τ, t, r), (τ) => mLS3D(τ, t, r), (τ) => mRL3D(τ, t, r), (τ) => mLR3D(τ, t, r), (τ) => mRLR3D(τ / 2, t, r),
    (τ) => mSL3D(τ, t, r), (τ) => mSR3D(τ, t, r),
  ], [0, 1], null, { PlotStyle: COLOR_DATA_97.slice(0, 7).map((c) => Directive3D([RGBColor3D(...c), Thick3D])) });
  const n = surfaceDivisions(t, r);
  const surfaces = [
    (τ1, τ2) => dubbins3Ds(τ1, τ2, t, r, -1, 0, -1), // RSR
    (τ1, τ2) => dubbins3Ds(τ1, τ2, t, r, 1, 0, 1), // LSL
    (τ1, τ2) => dubbins3Ds(τ1, τ2, t, r, -1, 0, 1), // RSL
    (τ1, τ2) => dubbins3Ds(τ1, τ2, t, r, 1, 0, -1), // LSR
    (τ1, τ2) => dubbins3D(τ1 / 2, 1 / 2 + τ2 / 2, t, r, -1, 1, -1), // RLR
    (τ1, τ2) => dubbins3D(τ1 / 2, 1 / 2 + τ2 / 2, t, r, 1, -1, 1), // LRL
  ].map((f, k) => triangularSurface(f, n, SURFACE_COLORS[k]));
  const content = [curves.content, surfaces];
  return { t, r, content, bounds: primitiveBounds(flatten(content)), divisions: n };
}

const plotCache3D = { key: null, plot: null };
const plotCache2D = { key: null, plot: null };
/** The plots are computed again only when r or t change (the original's plotReach with rold, told, dimold). */
const cached = (cache, t, r, make) => {
  const key = `${t} ${r}`;
  if (cache.key !== key) { cache.key = key; cache.plot = make(t, r); }
  return cache.plot;
};

/** PlotRange -> All and PlotRangePadding -> Scaled[0.05] (the first of the curves' plot options; N-D3-05) */
export const padded = (box) => box.map(([a, b]) => [a - 0.05 * (b - a), b + 0.05 * (b - a)]);

/**
 * Ticks -> Automatic of one axis as the snapshots show them: major step the {1, 2, 5}·10^n whose number of divisions of
 * the range is closest to 4 (the six axes of snapshots 1 and 3: step 5 for ranges 12.2 to 21.2), minor ticks every
 * step/5 (step/4 for a mantissa 2); [[v, label, length]] for View3D, lengths as its own ticks (graphics3d.js niceTicks,
 * which takes step 10 for ranges above 20: D-D3-06).
 */
export function axisTicks([a, b]) {
  const R = b - a, e = Math.floor(Math.log10(R));
  const steps = [-1, 0, 1].flatMap((d) => [1, 2, 5].map((m) => ({ m, s: m * 10 ** (e + d) })));
  const { m, s } = steps.reduce((best, c) => (Math.abs(R / c.s - 4) < Math.abs(R / best.s - 4) ? c : best));
  const minor = s / (m === 2 ? 4 : 5);
  const val = (k) => (minor < 1 ? k / Math.round(1 / minor) : k * minor);
  const decimals = Math.max(0, -Math.floor(Math.log10(s) + 1e-9));
  const out = [];
  for (let k = Math.ceil(a / minor - 1e-9); val(k) <= b + 1e-12; k++) {
    const v = val(k), q = v / s;
    out.push(Math.abs(q - Math.round(q)) < 1e-9 ? [v, (v === 0 ? 0 : v).toFixed(decimals), 0.035] : [v, '', 0.018]);
  }
  return out;
}
const unite = (a, b) => a.map(([lo, hi], k) => [Math.min(lo, b[k][0]), Math.max(hi, b[k][1])]);

// ---- the body ---------------------------------------------------------------------------------------------------------

/**
 * One evaluation of the Manipulate body. opts.controlActive: ControlActive[] (a slider dragged with the mouse); while it
 * is true the old values told, rold, dimold are not updated (ControlActive[None, told = t; …]), as in the original.
 */
export function evaluate(state, { controlActive = false } = {}) {
  const s = { ...state, τ: [...state.τ] };
  const { r, t, p, τ } = s;
  const [p1, p2, p3, clr] = pathParameters(s.path);
  const pose = carPose(p, τ, t, r, [p1, p2, p3]);
  const replot = (needed) => {
    if (!needed) return false;
    s.plotReach = { dim: s.dim, r, t };
    if (!controlActive) { s.told = t; s.rold = r; s.dimold = s.dim; }
    return true;
  };
  if (s.dim === '2D') {
    const cAlpha = Less(p / 100, τ[0]) ? p1 : Less(p / 100, τ[1]) ? p2 : p3;
    const pathPoints = Table((myp) => carPose(myp, τ, t, r, [p1, p2, p3]).slice(0, 2), [0, 100, 1]);
    const car = { xy: pose.slice(0, 2), Theta: pose[2], Alpha: cAlpha };
    const recomputed = replot(Unequal(t, s.told) || s.plotReach === 1 || Unequal(s.rold, r) || s.dim !== s.dimold);
    const plot = cached(plotCache2D, t, r, plotReach2D);
    const graphics = show2D(plot, epiGraphics(r, clr, pathPoints, car));
    return { state: s, view: { dim: '2D', p1, p2, p3, clr, car, pathPoints, recomputed }, graphics: [null, graphics] };
  }
  const recomputed = replot(Unequal(r, s.rold) || Unequal(t, s.told) || s.dim !== s.dimold);
  const plot = cached(plotCache3D, t, r, plotReach3D);
  const sphere = [RGBColor3D(...clr), Sphere(pose, 0.05 * t)];
  const PlotRange = padded(unite(plot.bounds, primitiveBounds(flatten(sphere))));
  const graphics = Graphics3D([Group3D(plot.content, { key: `${t} ${r}` }), sphere], {
    Axes: true, AxesLabel: ['<i>x</i>', '<i>y</i>', 'θ'], Ticks: PlotRange.map(axisTicks), PlotRange, ImageSize: [450, 450],
  });
  return {
    state: s,
    view: { dim: '3D', p1, p2, p3, clr, sphere: { center: pose, radius: 0.05 * t }, PlotRange, bounds: plot.bounds, divisions: plot.divisions, recomputed },
    graphics: [graphics, null],
  };
}
