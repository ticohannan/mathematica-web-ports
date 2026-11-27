// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Michel de Spot
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/solar-yield-mounting-systems/model.js — "Solar Energy Yield for Three Mounting Systems": one evaluation of
// the Manipulate body, the state in, { view, graphics } out (pure, no DOM). Simple mode: the original's sunvect,
// efull, pnlrot, polrot and trkall in plain arithmetic; the plot of the five mountings' yields over the day with its
// two fillings and legend, and the bar chart of the daily totals.
import {
  Annotation, Text, Style, Line, Rectangle, Polygon, EdgeForm, Opacity, GrayLevel, Hue, Red, Orange, Bold,
  AbsoluteThickness, Thin, Thick, Dashed, Dotted, Yellow, RGBColor, FontSize, Black, Gray,
} from '../../shared/graphics.js';
import { Plot } from '../../shared/plot.js';
import { isCorrected } from '../../shared/errata.js';

export const initialState = () => ({ lat: 49.7, sl: 58, dp: 171 });
/** The notebook's three variables (the setters' own variables optimize, equinox and season mirror sl and dp). */
export const VARIABLES = Object.freeze(['lat', 'sl', 'dp']);

const DEG = Math.PI / 180;
const ARC = 0.017453; // the original's rounded degree

/** sunvect[dd, hr, lat]: the unit vector to the Sun (x, y = south, z = up) on day dd of the year at hour hr. */
export function sunvect(dd, hr, lat) {
  const zeta = Math.cos(ARC * ((10 + dd) * 360 / 365.24 + ((360 * 0.0167) / Math.PI) * Math.sin(ARC * (-2 + dd) * 360 / 365.24)));
  const c = Math.sqrt(1 - 0.158236 * zeta ** 2);
  const h = ((12 - hr) * Math.PI) / 12;
  return [
    -c * Math.sin(h),
    0.39779 * Math.cos(lat * DEG) * zeta + Math.cos(h) * c * Math.sin(lat * DEG),
    Math.cos(lat * DEG) * Math.cos(h) * c - 0.39779 * zeta * Math.sin(lat * DEG),
  ];
}

/** efull[dd, hr, lat]: {sun vector, {direct normal irradiance, diffuse irradiance}} (W/m²). */
export function efull(dd, hr, lat) {
  const sr = sunvect(dd, hr, lat);
  const i0 = 1380, a1 = 0.87, b1 = 0.17, ex = 1 + 0.033412 * Math.cos((2 * Math.PI * (dd - 2)) / 365);
  return [sr, [i0 * ex * a1 * Math.exp(-b1 / sr[2]), i0 * ex * sr[2] * (0.271 - 0.2939 * a1 * Math.exp(-b1 / sr[2]))]];
}

/** pnlrot[{σ, ρ}]: the normal of a panel tilted σ degrees, turned ρ degrees. */
export const pnlrot = ([s, r]) => [-Math.sin(r * DEG) * Math.sin(s * DEG), Math.cos(r * DEG) * Math.sin(s * DEG), Math.cos(s * DEG)];

/** RotationMatrix[θ, u].v (right-handed, u a unit vector). */
export function rotate(theta, u, v) {
  const c = Math.cos(theta), s = Math.sin(theta), d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const x = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return v.map((vi, i) => vi * c + x[i] * s + u[i] * d * (1 - c));
}

/** polrot[σ, hr]: the normal of a panel on a polar axis tilted σ, turned (hr − 12) 15° about that axis. */
export function polrot(s, hr) {
  const axis = rotate(-s * DEG, [1, 0, 0], [0, 1, 0]);
  return rotate((hr - 12) * 15 * DEG, axis, rotate(-s * DEG, [1, 0, 0], [0, 0, 1]));
}

/**
 * trkall[dd, hr, lat, σ, ρ] (ρ is not used): {Full, Vert., Polar, Horiz., Fixed} — the irradiance on a two-axis tracker
 * (direct + diffuse), and on panels turning about a vertical axis (tilt σ, facing the Sun's azimuth), a polar axis, a
 * horizontal east–west axis (tilted to the Sun's zenith angle) and a fixed panel tilted σ to the south: direct × cos
 * of the angle of incidence (when positive) + diffuse.
 */
export function trkall(dd, hr, lat, s) {
  const [sr, [dir, dif]] = efull(dd, hr, lat);
  const normals = [
    pnlrot([s, Math.atan2(sr[1], sr[0]) / DEG - 90]),
    polrot(s, hr),
    pnlrot([(Math.PI / 2 - Math.asin(sr[2])) / DEG, 0]),
    pnlrot([s, 0]),
  ];
  const asp = normals.map((n) => n[0] * sr[0] + n[1] * sr[1] + n[2] * sr[2]);
  return [dir + dif, ...asp.map((a) => dir * a * (a > 0 ? 1 : 0) + dif)];
}

/**
 * pr = hlim /. NSolve[sunvect[dp, hlim, lat][[3]] == 0, hlim]: sunrise and sunset, the hours where the Sun's height is 0
 * (cos((12 − hr) π/12) = 0.39779 ζ sin(lat)/(cos(lat) √(1 − 0.158236 ζ²))).
 */
export function sunriseSunset(dd, lat) {
  const zeta = Math.cos(ARC * ((10 + dd) * 360 / 365.24 + ((360 * 0.0167) / Math.PI) * Math.sin(ARC * (-2 + dd) * 360 / 365.24)));
  const c = (0.39779 * zeta * Math.sin(lat * DEG)) / (Math.cos(lat * DEG) * Math.sqrt(1 - 0.158236 * zeta ** 2));
  const h = (12 * Math.acos(Math.max(-1, Math.min(1, c)))) / Math.PI;
  return [12 - h, 12 + h];
}

export const NAMES = Object.freeze(['Full', 'Vert.', 'Polar', 'Horiz.', 'Fixed']);

/** Sum[trkall[dp, hr, lat, sl, 0], {hr, Ceiling[pr[[1]], .1], Floor[pr[[2]], .1], .1}]/10000: the daily yields in kWh/m². */
export function dailyYields(dd, lat, s) {
  const [a, b] = sunriseSunset(dd, lat);
  const first = Math.ceil(a * 10 - 1e-9), last = Math.floor(b * 10 + 1e-9);
  const sum = [0, 0, 0, 0, 0];
  for (let k = first; k <= last; k++) trkall(dd, k / 10, lat, s).forEach((v, i) => { sum[i] += v; });
  return sum.map((v) => v / 10000);
}

/** DateString[DatePlus[{2013, 1, 1}, dp], {"MonthName", " ", "Day"}] (2013 is not a leap year). */
export function dayLabel(dp) {
  const d = new Date(Date.UTC(2013, 0, 1 + dp));
  return `${d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} ${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** PlotStyle: Hue[.4, 1, .5]; Red, Dashed, Thick; Hue[.6], Dashed; Orange, Thick, Dotted; Thin, Hue[.15, 1, .5]. */
export const STYLES = Object.freeze([
  [Hue(0.4, 1, 0.5)], [Red, Dashed, Thick], [Hue(0.6), Dashed], [Orange, Thick, Dotted], [Thin, Hue(0.15, 1, 0.5)],
]);
/** ChartStyle: Hue[.4, 1, 1, .5], Hue[0, 1, 1, .3], LightBlue, LightOrange, LightYellow. */
export const BAR_STYLES = Object.freeze([
  [Hue(0.4, 1, 1), Opacity(0.5)], [Hue(0, 1, 1), Opacity(0.3)], [RGBColor(0.87, 0.94, 1)], [RGBColor(1, 0.9, 0.8)], [RGBColor(1, 1, 0.85)],
]);

/** The bar chart's y scale: the PlotRange {1, 13} drawn 120 px high and 210 px wide (6.3 units): y' = (y − 1) × 0.3. */
export const BAR_SCALE = (120 / 210) * 6.3 / 12;
const by = (y) => (y - 1) * BAR_SCALE;

export function evaluate(state) {
  const { lat, sl, dp } = state;
  const corrected = isCorrected(state);
  const [rise, set] = sunriseSunset(dp, lat);
  const curves = [0, 1, 2, 3, 4].map((i) => (hr) => trkall(dp, hr, lat, sl)[i]);
  // Filling -> {{5 -> {Bottom, Directive[Yellow, Opacity[.1]]}}, {1 -> {{5}, Directive[Hue[.4, 1, 1], Opacity[.1]]}}}:
  // two fillings with their own styles, drawn as the plot's Prolog from the same curves (D-SY-02)
  const n = 400, xs = Array.from({ length: n + 1 }, (_, k) => rise + ((set - rise) * k) / n);
  // at sunrise and sunset the Sun's height is 0 and the curves give NaN or Infinity there: those points are left out of
  // the fillings, as Plot leaves them out of the curves (an SVG polygon with a NaN point is an error in WebKit)
  const both = xs.map((x) => [x, curves[0](x), curves[4](x)]).filter(([, a, b]) => Number.isFinite(a) && Number.isFinite(b));
  const full = both.map(([x, a]) => [x, a]), fixed = both.map(([x, , b]) => [x, b]);
  const Prolog = [
    Annotation([Yellow, Opacity(0.1), Polygon([[rise, 0], ...fixed, [set, 0]])], 'fill-fixed'),
    Annotation([Hue(0.4, 1, 1), Opacity(0.1), Polygon([...full, ...[...fixed].reverse()])], 'fill-full'),
  ];
  const plot = Plot(curves, [rise, set], {
    PlotStyle: STYLES, GridLines: 'Automatic', PlotRange: [[2, 22], [0, 1100]], Prolog,
    PlotLabel: Style('daily solar energy yield', Bold, Hue(0.38, 0.5, 0.5)),
    AxesLabel: [Style('hour', Bold), Style(corrected ? 'W/m2' : 'wh/m2', Bold)], // E-SY-01 ImageSize: [0.95 * 380, 0.95 * 380], ImagePadding: [[40, 38], [20, 34]],
  });
  // PlotLegends -> Placed[{"Full", …}, Bottom]: below the plot, its own small picture (D-SY-03)
  const legend = [FontSize(10)];
  NAMES.forEach((name, i) => {
    const [x, y] = i < 3 ? [20 + i * 115, 34] : [77 + (i - 3) * 115, 12];
    legend.push(Annotation([...STYLES[i], Line([[x, y], [x + 22, y]])], `legend-line-${i + 1}`), Black, Annotation(Text(name, [x + 28, y], [-1, 0]), `legend-${i + 1}`));
  });
  const yields = dailyYields(dp, lat, sl);
  // BarChart[MapThread[Labeled[#1, #2, Center] &, {yields, names}], ChartStyle -> …, PlotRange -> {1, 13},
  // GridLines -> {None, Automatic}]: five bars with their names in the middle
  const bars = [GrayLevel(0.85), AbsoluteThickness(0.5)];
  for (let y = 2; y <= 12; y += 2) bars.push(Line([[0.2, by(y)], [5.8, by(y)]]));
  yields.forEach((v, i) => {
    bars.push(Annotation([...BAR_STYLES[i], EdgeForm(GrayLevel(0.5)), Rectangle([0.55 + i, 0], [1.45 + i, by(Math.min(v, 13))])], `bar-${i + 1}`));
    bars.push(Black, FontSize(10), Text(NAMES[i], [1 + i, by(Math.min(v, 13)) / 2]));
  });
  bars.push(Gray, AbsoluteThickness(1), Line([[0.2, 0], [0.2, by(13)]]), FontSize(10));
  for (let y = 2; y <= 12; y += 2) bars.push(Line([[0.2, by(y)], [0.1, by(y)]]), Text(String(y), [0.05, by(y)], [1, 0]));
  const view = {
    sunrise: rise, sunset: set, yields, day: dayLabel(dp), noon: trkall(dp, 12, lat, sl), corrected,
    axisLabel: corrected ? 'W/m2' : 'wh/m2', yieldLabel: corrected ? 'Energy Yield kWh/m2/day' : 'Energy Yield kW/h/da', // E-SY-02
  };
  // the setters show pressed while their value equals the variable, as Mathematica's (their values follow lat)
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const setters = {
    optimize: near(sl, lat + 23.4) ? 'winter' : near(sl, lat - 23.4) ? 'summer' : null,
    equinox: near(sl, lat) ? 'equinox' : null,
    season: [354, 79, 171, 263].includes(dp) ? dp : null,
  };
  return { view, state: { ...state, ...setters }, graphics: [plot, legend, bars] };
}
