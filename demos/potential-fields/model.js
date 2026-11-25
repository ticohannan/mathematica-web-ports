// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original (ECE 6311 Lecture 22 notebook) by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/potential-fields/model.js — the notebook's two potentials and one evaluation of each of its four Manipulates
// (the page's four tabs): the state in, { view, graphics } out (pure, no DOM). Changed at Dr. Becker's request
// (2026-11-24): each tab with obstacles has a list of them (one locator each, obstacle-pad.js), the sum has a ρ_0
// slider, the ρ_0 circles are white and the d_i circle red.
//
//   Uatt[x_, y_, ζ_, d_] := Module[{dist = Sqrt[x^2 + y^2]}, If[dist <= d, 1/2 ζ (x^2 + y^2), d ζ (dist - 1/2 d)]]
//   Urep[x_, y_, xo_, yo_, η_, ρ0_] := Module[{dist = Sqrt[(x - xo)^2 + (y - yo)^2]},
//     If[dist <= ρ0, 1/2 η (1/dist - 1/ρ0)^2, 0]]
//
// Tabs (in the notebook's order): attractive (Plot3D of Uatt with the red "switch line", the circle dist = d at the
// height ζ d²/2), repulsive (Plot3D of Urep around the obstacles, z from −0.1 to 10), attractive + repulsive (Plot3D of
// Uatt plus Urep of the obstacles, η = 1 and ρ_0 from its slider (the notebook: two obstacles and ρ0 = 2 fixed),
// ExclusionsStyle -> Red, with the switch line) and the same sum as a ContourPlot (the switch line is computed but
// left out of Show, as in the notebook).
import { Graphics3D, Show, Plot3D, Line as Line3D, Red as Red3D, Thick as Thick3D, White as White3D, RGBColor as RGB3D } from '../../shared/graphics3d.js';
import { DensityPlot, implicitCurves } from '../../shared/plot.js';
import { Line, Red, White, GrayLevel, Opacity, AbsoluteThickness, Annotation } from '../../shared/graphics.js';

export const RANGE = [-4, 4];

/** Uatt[x, y, ζ, d] as in the notebook (dist <= d: quadratic; beyond: conic, continuous with slope ζ d). */
export function Uatt(x, y, zeta, d) {
  const dist = Math.sqrt(x * x + y * y);
  return dist <= d ? 0.5 * zeta * (x * x + y * y) : d * zeta * (dist - 0.5 * d);
}

/** Urep[x, y, xo, yo, η, ρ0] as in the notebook (Infinity at the obstacle itself, 1/0; 0 beyond ρ0). */
export function Urep(x, y, xo, yo, eta, rho0) {
  const dist = Math.sqrt((x - xo) ** 2 + (y - yo) ** 2);
  if (dist <= rho0) return 0.5 * eta * (1 / dist - 1 / rho0) ** 2;
  return 0;
}

/** The notebook's fixed values in the third and fourth Manipulate: Module[{ηi = 1, ρ0 = 2, …}, …]; ρ0 = 2 is now the
 *  initial value of the ρ_0 slider of those tabs (A-PF-10). */
export const ETA_FIXED = 1, RHO0_FIXED = 2;

/** The repulsive potential of all the obstacles: Σ Urep (the notebook: one obstacle in the second Manipulate, obs and
 *  obs2 in the third and fourth; A-PF-11). */
export const UrepAll = (x, y, obs, eta, rho0) => obs.reduce((u, [xo, yo]) => u + Urep(x, y, xo, yo, eta, rho0), 0);

/** U of the third and fourth Manipulate: Uatt + Σ Urep(obstacle), η = 1. */
export const Ucombined = (s) => (x, y) => Uatt(x, y, s['ζi'], s.di) + UrepAll(x, y, s.obs, ETA_FIXED, s['ρ0'] ?? RHO0_FIXED);

// ---- states ----------------------------------------------------------------------------------------------------------

/** The four tabs and their initial settings (the Manipulates' own: the notebook's live states are listed in DESIGN.md). */
export const TABS = Object.freeze([
  Object.freeze({ key: 'att', title: 'Attractive', label: 'Attractive Potential' }),
  Object.freeze({ key: 'rep', title: 'Repulsive', label: 'Repulsive Potential' }),
  Object.freeze({ key: 'comb', title: 'Attractive + repulsive', label: 'Attractive+Repulsive Potential' }),
  Object.freeze({ key: 'cont', title: 'Contour plot', label: 'Attractive+Repulsive Potential' }),
]);
export const initialStates = Object.freeze({
  // di = 1; ζi = 1; Manipulate[…, {{di, 1, "d_i"}, 0.01, 4}, {{ζi, 1, "ζ_i"}, 0, 4}]
  att: () => ({ di: 1, 'ζi': 1 }),
  // {{obs, {-1, 1}}, {-4, -4}, {4, 4}}, {{ρ0, 2}, 0, 5}, {{ηi, 10}, 0, 200}
  // (obs is the list of the obstacles: the notebook's obs, and obs and obs2 in the last two)
  rep: () => ({ obs: [[-1, 1]], 'ρ0': 2, 'ηi': 10 }),
  comb: () => ({ di: 1, 'ζi': 1, obs: [[-1, 1], [-1, 1]], 'ρ0': RHO0_FIXED }),
  cont: () => ({ di: 1, 'ζi': 1, obs: [[-1, 1], [-1, 1]], 'ρ0': RHO0_FIXED }),
});

// ---- automatic z range (D-PF-04) ----------------------------------------------------------------------------------------

/**
 * Mathematica's PlotRange -> Automatic leaves out the "outliers" of a function: here the poles of Urep at the obstacles.
 * The port's rule, fitted to the current Mathematica pictures of the notebook (D-PF-04: the default combined state's
 * top near 7.2, the contour levels 1 … 7): on a 101 × 101 grid, the top is the upper quartile plus 2.5 interquartile
 * ranges, or the largest value when that is lower; the bottom likewise below the lower quartile.
 */
export const IQR_FACTOR = 2.5;
export function automaticZRange(f, [x0, x1] = RANGE, [y0, y1] = RANGE, n = 101) {
  const v = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const z = f(x0 + ((x1 - x0) * i) / (n - 1), y0 + ((y1 - y0) * j) / (n - 1));
    v.push(Number.isNaN(z) ? Infinity : z);
  }
  v.sort((a, b) => a - b);
  const q = (p) => { const k = p * (v.length - 1), i = Math.floor(k); return v[i] === v[i + 1] || i + 1 >= v.length ? v[i] : v[i] + (k - i) * (v[i + 1] - v[i]); };
  const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
  let top = Math.min(v[v.length - 1], q3 + IQR_FACTOR * iqr);
  let bottom = Math.max(v[0], q1 - IQR_FACTOR * iqr);
  if (!(top > bottom)) { bottom -= 1; top += 1; } // a flat function (ζ = 0 and no obstacle in reach): ±1 as Plot3D
  return [bottom, top];
}

// ---- 3D tabs ----------------------------------------------------------------------------------------------------------

/** The cap's colour: lit by the default lights it shows the light grey of the screenshots (D-PF-03). */
export const CAP = [0.86, 0.86, 0.86];

/** Infinity (at an obstacle) and large values are kept above the box so the shared Plot3D cuts them (not a hole). */
const capped = (f) => (x, y) => { const z = f(x, y); return Number.isNaN(z) ? 1e9 : Math.min(z, 1e9); };

/**
 * Mathematica's default ClippingStyle -> Automatic shows the parts of the surface above the plot range as a flat cap at
 * the top of the box, light grey in Tico's screenshots. The port draws the cap as a second, grey surface at the top
 * where f is above it (D-PF-03).
 */
function topCap(f, top) {
  return Plot3D((x, y) => (f(x, y) > top || Number.isNaN(f(x, y)) ? top : NaN), RANGE, RANGE, {
    PlotPoints: 65, Mesh: 'None', PlotStyle: RGB3D(...CAP), PlotRange: [RANGE, RANGE, [top - 1, top + 1]],
  }).content;
}

/** The switch line: Line[Table[{d Cos θ, d Sin θ, ζ d²/2}, {θ, 0, 2π, π/32}]] (65 points) */
export const switchLine = (d, zeta) => Array.from({ length: 65 }, (_, k) => {
  const th = (k * Math.PI) / 32;
  return [d * Math.cos(th), d * Math.sin(th), 0.5 * zeta * d * d];
});

/** A circle in the plane (the condition of an If: dist == r) lifted onto the surface, for the exclusion curves. */
const onSurface = (f, [cx, cy], r, n = 129) => Array.from({ length: n }, (_, k) => {
  const th = (2 * Math.PI * k) / (n - 1), x = cx + r * Math.cos(th), y = cy + r * Math.sin(th);
  return [x, y, f(x, y)];
});

/** Mathematica's default Plot3D surface colour in Tico's screenshots (an orange lit to yellow, K-PF-01). */
export const SURFACE = [1, 0.81, 0.15];
const PLOT3D_OPTIONS = { PlotPoints: 65, PlotStyle: RGB3D(...SURFACE), ImageSize: [360, 300], AxesEdge: [[-1, -1], [1, -1], [-1, -1]] };

export function evaluateAttractive(s) {
  const f = (x, y) => Uatt(x, y, s['ζi'], s.di);
  // Energy = Plot3D[Uatt[x, y, ζi, di], {x, -4, 4}, {y, -4, 4}, PlotLabel -> "Attractive Potential"]; Show[{Energy, switchLine}]
  const energy = Plot3D(f, RANGE, RANGE, { ...PLOT3D_OPTIONS, PlotLabel: 'Attractive Potential' });
  const line = Graphics3D([Red3D, Thick3D, Line3D(switchLine(s.di, s['ζi']))]);
  const graphics = Show(energy, line);
  return { view: summary(energy, { switchHeight: 0.5 * s['ζi'] * s.di ** 2 }), graphics };
}

export function evaluateRepulsive(s) {
  const f = (x, y) => UrepAll(x, y, s.obs, s['ηi'], s['ρ0']);
  // Plot3D[Urep[x, y, obs[[1]], obs[[2]], ηi, ρ0], {x, -4, 4}, {y, -4, 4}, PlotLabel -> "Repulsive Potential",
  //   PlotRange -> {Automatic, Automatic, {-0.1, 10}}]
  const zr = [-0.1, 10];
  const energy = Plot3D(capped(f), RANGE, RANGE, { ...PLOT3D_OPTIONS, PlotLabel: 'Repulsive Potential', PlotRange: [RANGE, RANGE, zr] });
  // Exclusions -> Automatic: the condition of the If (dist = ρ0) is left out of the surface with ExclusionsStyle -> None,
  // a gap that shows the white background (Tico's screenshots); the port draws it as a white curve (D-PF-05)
  const gap = s['ρ0'] > 0 ? [White3D, Thick3D, ...s.obs.map((c) => Line3D(onSurface(f, c, s['ρ0'])))] : [];
  const graphics = Graphics3D([...energy.content, ...topCap(f, zr[1]), ...gap], energy.options);
  return { view: summary(energy, { zRange: zr }), graphics };
}

export function evaluateCombined(s) {
  const f = Ucombined(s);
  const zr = automaticZRange(f);
  const energy = Plot3D(capped(f), RANGE, RANGE, { ...PLOT3D_OPTIONS, PlotLabel: 'Attractive+Repulsive Potential', PlotRange: [RANGE, RANGE, zr] });
  // the conditions of the Ifs on the surface (D-PF-05): dist = d about the origin in red, dist = ρ_0 about each
  // obstacle in white (A-PF-12; the notebook's ExclusionsStyle -> Red drew both red)
  const curves = (kind) => exclusionCircles(s).filter((e) => e.kind === kind && e.r > 0).map(({ c, r }) => Line3D(onSurface(f, c, r)));
  const line = [Red3D, Thick3D, Line3D(switchLine(s.di, s['ζi']))];
  const graphics = Graphics3D([...energy.content, ...topCap(f, zr[1]), White3D, Thick3D, ...curves('rho'), Red3D, Thick3D, ...curves('d'), ...line], energy.options);
  return { view: summary(energy, { zRange: zr, switchHeight: 0.5 * s['ζi'] * s.di ** 2 }), graphics };
}

const summary = (g, extra) => {
  const surf = g.content[0];
  return { triangles: surf.triangles.length, box: g.options.PlotRange, meshLines: surf.meshLines.length, ...extra };
};

/** The If conditions of the sum: dist = d about the origin (kind 'd') and dist = ρ_0 about each obstacle ('rho'). */
export const exclusionCircles = (s) => [
  { c: [0, 0], r: s.di, kind: 'd' }, ...s.obs.map((c) => ({ c, r: s['ρ0'] ?? RHO0_FIXED, kind: 'rho' })),
];

// ---- the contour tab --------------------------------------------------------------------------------------------------

/**
 * Mathematica's current default ContourPlot colours, read from Tico's screenshots of the contour tab in Mathematica (the
 * default state and one other; the band colours at the scaled middle of each band, D-PF-06), a dark purple through red
 * and orange to light orange; linear between them, the end colours held. The last stop (t = 1) is not in the
 * screenshots: it continues the light end (D-PF-06).
 */
export const CONTOUR_GRADIENT = Object.freeze([
  [0.0664, [0.4, 0.051, 0.4]],
  [0.2014, [0.6863, 0.0863, 0.3804]],
  [0.2203, [0.7294, 0.0941, 0.3765]],
  [0.3385, [0.8627, 0.1686, 0.3647]],
  [0.3674, [0.8863, 0.2588, 0.3647]],
  [0.4755, [0.9294, 0.3882, 0.3647]],
  [0.5146, [0.9569, 0.4667, 0.3608]],
  [0.6125, [0.9922, 0.5529, 0.3569]],
  [0.6617, [1.0, 0.6549, 0.4196]],
  [0.7496, [1.0, 0.7294, 0.4824]],
  [1, [1.0, 0.8824, 0.6471]],
].map(([t, c]) => Object.freeze([t, Object.freeze(c)])));
export function contourColor(t) {
  const S = CONTOUR_GRADIENT;
  if (!(t > S[0][0])) return S[0][1];
  if (t >= S[S.length - 1][0]) return S[S.length - 1][1];
  let k = 1;
  while (S[k][0] < t) k++;
  const [ta, a] = S[k - 1], [tb, b] = S[k], u = (t - ta) / (tb - ta);
  return a.map((x, i) => x + (b[i] - x) * u);
}

/** Contours -> Automatic: the round values (1, 2 or 5 × 10^k apart) strictly inside the z range, the step that gives
 *  the number of bands nearest to ten (the saved picture: 0.2 … 1.4 over 0.02 … 1.55). */
export function automaticContours([z0, z1]) {
  const p = 10 ** Math.floor(Math.log10((z1 - z0) / 10));
  let step = p;
  for (const m of [1, 2, 5, 10, 20]) if (Math.abs((z1 - z0) / (m * p) - 10) < Math.abs((z1 - z0) / step - 10)) step = m * p;
  const out = [];
  for (let k = Math.ceil(z0 / step); k * step < z1; k++) if (k * step > z0) out.push(Number((k * step).toPrecision(12)));
  return out;
}

/** Band colour of a value: the band between two levels (or a level and the end of the range), coloured at its middle. */
export function bandColor(v, levels, [z0, z1]) {
  if (!(v <= z1)) return null; // above the range (and Infinity, at an obstacle): white, as Mathematica clips
  if (v < z0) v = z0; // below the sampled minimum (the raster is finer than the range's grid): the lowest band
  let lo = z0, hi = z1;
  for (const c of levels) { if (c <= v) lo = c; else { hi = c; break; } }
  return contourColor(((lo + hi) / 2 - z0) / (z1 - z0));
}

/** Width of the red exclusion bands in the saved picture: about 0.12 of the plot's units (D-PF-05), in pixels here. */
export const EXCLUSION_PX = 4;

export function evaluateContour(s) {
  const f = Ucombined(s);
  const zr = automaticZRange(f);
  const levels = automaticContours(zr);
  const lines = levels.map((c) => Annotation([GrayLevel(0), Opacity(0.5), AbsoluteThickness(1),
    ...implicitCurves((x, y) => f(x, y) - c, RANGE, RANGE, { PlotPoints: 160 }).map((pts) => Line(pts))], `contour-${c}`));
  const circle = ({ c, r }) => Line(Array.from({ length: 129 }, (_, k) => {
    const th = (2 * Math.PI * k) / 128; return [c[0] + r * Math.cos(th), c[1] + r * Math.sin(th)];
  }));
  const ex = exclusionCircles(s).filter((e) => e.r > 0);
  // ContourPlot[…, {x, -4, 4}, {y, -4, 4}, ExclusionsStyle -> Red, PlotLabel -> "Attractive+Repulsive Potential"];
  // the ρ_0 circles white, the d_i circle red (A-PF-12)
  const graphics = DensityPlot(f, RANGE, RANGE, {
    PlotPoints: 240, PlotRange: zr, ColorFunctionScaling: false,
    ColorFunction: (v) => bandColor(v, levels, zr) ?? [1, 1, 1],
    PlotLabel: 'Attractive+Repulsive Potential', ImageSize: 360, AspectRatio: 1,
    Epilog: [...lines,
      Annotation([White, AbsoluteThickness(EXCLUSION_PX), ...ex.filter((e) => e.kind === 'rho').map(circle)], 'exclusions-rho'),
      Annotation([Red, AbsoluteThickness(EXCLUSION_PX), ...ex.filter((e) => e.kind === 'd').map(circle)], 'exclusions-d')],
  });
  return { view: { zRange: zr, levels }, graphics };
}

export const evaluators = Object.freeze({ att: evaluateAttractive, rep: evaluateRepulsive, comb: evaluateCombined, cont: evaluateContour });
