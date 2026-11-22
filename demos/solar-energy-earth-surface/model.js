// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Stephen Wilkerson, Frank A. Wattenberg and Russell Park
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/solar-energy-earth-surface/model.js — one evaluation of the Manipulate body: the state { sea, lat, h } in,
// { view, graphics: [the globe (Graphics3D), the energy plot, the accumulated-energy plot] } out (pure, no DOM).
// The original's functions keep their names and order: tiltEarth, rotateEarth, sun, point, normal, energy, then the
// tables, the two plots and the parts of the globe (northpole, southpole, cancer, capricorn, artic, antartic, norm1,
// sunnorm1, earth, night, pt).
import { Graphics3D, ParametricPlot3D, RGBColor as RGB3, Red as Red3, Blue as Blue3, Green as Green3, Black as Black3,
  Opacity as Opacity3, Directive as Directive3, Thick, Arrowheads, Arrow as Arrow3, Sphere, Tube, Line as Line3, Rotate as Rotate3 } from '../../shared/graphics3d.js';
import { Graphics, Red, Black, Blue, PointSize, Point, Superscript } from '../../shared/graphics.js';
import { Plot, ListLinePlot, Show } from '../../shared/plot.js';
import { Table, Accumulate, Dot, Max, Cos, Sin, Pi, Times, Plus, Flatten } from '../../shared/wl.js';
import { isCorrected } from '../../shared/errata.js';

/** The Manipulate's initial settings = the notebook's live state (tests/golden/…original-states.json). */
export const SPECS = Object.freeze({ sea: 0, lat: 51.47885, h: 12 });
export const initialState = () => ({ ...SPECS });

/** The solar constant of the original, W/m². */
export const SOLAR = 1367.6;
/** The axis tilt of the original, rad (Q-SE-04, E-SE-08). */
export const TILT = 0.408;

/** tiltEarth: the rotation about the y axis by 0.408 rad. */
export const tiltEarth = [[Cos(TILT), 0, Sin(TILT)], [0, 1, 0], [-Sin(TILT), 0, Cos(TILT)]];
/** rotateEarth[hour, season]: the rotation about the z axis by 2π (hour − 12 + season·24)/24. */
export function rotateEarth(hour, season) {
  const a = (2 * Pi * (hour - 12 + season * 24)) / 24;
  return [[Cos(a), -Sin(a), 0], [Sin(a), Cos(a), 0], [0, 0, 1]];
}
/** sun[season]: the direction of the Sun, {Cos[2π season], Sin[2π season], 0}. */
export const sun = (season) => [Cos(2 * Pi * season), Sin(2 * Pi * season), 0];
/** point[latitude]: the point on the meridian of the Earth's x axis (the original's column vector, here a list). */
export const point = (latitude) => [Cos((latitude * 2 * Pi) / 360), 0, Sin((latitude * 2 * Pi) / 360)];
/** normal[latitude, hour, season] = tiltEarth . rotateEarth[hour, season] . point[latitude] */
export const normal = (latitude, hour, season) => Dot(tiltEarth, Dot(rotateEarth(hour, season), point(latitude)));
/** energy[latitude, hour, season] = 1367.6 Max[0, sun[season] . normal[latitude, hour, season]] */
export const energy = (latitude, hour, season) => SOLAR * Max(0, Dot(sun(season), normal(latitude, hour, season)));

/** Table[energy[latitude, t, sea], {t, 0, 24, 1}] — 25 hourly values (corrected, E-SE-04: {t, 0, 23}, 24 values). */
export const hourly = (latitude, sea, corrected = false) => Table((t) => energy(latitude, t, sea), [0, corrected ? 23 : 24, 1]);

const LABEL_W = Superscript('watts/m', 2); // "watts/m"^2
const TICKS = [[0, 4, 8, 12, 16, 20, 24], 'Automatic'];
// the room Mathematica's ImageSize -> {175, 175} leaves around each plot for its tick labels and axes labels (px, measured
// on the snapshots): the plot area about 100 px wide, "time (hr)" right of it (D-SE-04)
const PADDING_ENERGY = [[28, 50], [16, 18]];
const PADDING_TOTAL = [[36, 50], [16, 18]];
/** The legend of the energy plot: the symbols equator, latitude and north pole (= north·pole) as Mathematica shows them. */
export const LEGEND = Object.freeze(['equator', 'latitude', 'north pole']);
/** The globe's plain colour (the original's map texture is not reproduced, D-SE-01). */
export const GLOBE_COLOR = [0.62, 0.84, 0.97];
/** Mesh lines of the globe: Mathematica's default 3D mesh style (dark, partly transparent). */
const MESH_STYLE = [RGB3(0.15, 0.15, 0.15), Opacity3(0.55)];
/** Arrowheads[Medium] as a fraction of the width the globe's picture shows (View3D `size`, main.js): heads of about
 *  10 px, as measured on the snapshots (D-SE-06). */
export const ARROWHEAD_MEDIUM = 0.03;
/** Dashed in 3D: the curve cut into dashes of about 5 px with 4 px gaps at the picture's scale (0.094 world units a period, D-SE-05). */
const DASH_PERIOD = 0.094;

/** Points of a closed curve f(s), s in [0, 2π] (n segments). */
const curvePoints = (f, n) => Table((k) => f((2 * Pi * k) / n), [0, n]);
/** A curve drawn dashed: Line of dashes (5/9 of each period drawn). */
function dashed(f, length) {
  const n = Math.max(8, Math.round(length / DASH_PERIOD));
  const dashes = [];
  for (let k = 0; k < n; k++) {
    const a = (2 * Pi * k) / n, b = (2 * Pi * (k + 5 / 9)) / n;
    dashes.push(Table((j) => f(a + ((b - a) * j) / 4), [0, 4]));
  }
  return Line3(dashes);
}
/** ParametricPlot3D[rotvec1 . {Cos[s] Sin[θ], Sin[s] Sin[θ], Cos[θ]}, {s, 0, 2π}] for a fixed polar angle θ (degrees). */
const circleAt = (rotvec1, deg) => (s) => Dot(rotvec1, [Cos(s) * Sin((deg * Pi) / 180), Sin(s) * Sin((deg * Pi) / 180), Cos((deg * Pi) / 180)]);

/** The mesh of the globe: Mesh -> {24, 9} = 24 lines in s (meridians at 2πk/25) and 9 in t (parallels at πk/10). */
function globeMesh(rotvec1) {
  const r = 1.002; // just outside the surface, so that the lines are not hidden by it
  const at = (s, t) => Times(r, Dot(rotvec1, [Cos(s) * Sin(t), Sin(s) * Sin(t), Cos(t)]));
  const meridians = Table((k) => Table((j) => at((2 * Pi * k) / 25, (Pi * j) / 48), [0, 48]), [1, 24]);
  const parallels = Table((k) => Table((j) => at((2 * Pi * j) / 96, (Pi * k) / 10), [0, 96]), [1, 9]);
  return [...MESH_STYLE, Line3([...meridians, ...parallels])];
}

/**
 * The Manipulate body for the state { sea, lat, h } (errata: 'corrected' takes the corrected branches of E-SE-01 …
 * E-SE-04; without it every value is the original's).
 */
export function evaluate(state) {
  const { sea, lat, h } = state;
  const fix = isCorrected(state);
  const rotvec1 = Dot(tiltEarth, rotateEarth(h, sea));
  const eng = hourly(lat, sea, fix), eng1 = hourly(0, sea, fix), eng2 = hourly(90, sea, fix);
  const aeng = Accumulate(eng), aeng1 = Accumulate(eng1), aeng2 = Accumulate(eng2);
  // ListLinePlot[{aeng, aeng1, aeng2}, PlotStyle -> {{Red}, {Black}, {Blue}}]: the latitude red, the equator black
  // (E-SE-03; corrected: {aeng1, aeng, aeng2}, the colours of the legend)
  const engtot = ListLinePlot(fix ? [aeng1, aeng, aeng2] : [aeng, aeng1, aeng2], {
    ImageSize: [175, 175], PlotStyle: [[Red], [Black], [Blue]], PlotLabel: 'energy',
    AxesLabel: ['time (hr)', LABEL_W], Ticks: TICKS, ImagePadding: PADDING_TOTAL,
  });
  const plt = Show(
    Plot((t) => [energy(0, t, sea), energy(lat, t, sea), energy(90, t, sea)], [0, 24], {
      PlotRange: [0, 1400], Ticks: TICKS, PlotStyle: [[Red], [Black], [Blue]], ImageSize: [175, 175],
      PlotLabel: 'energy', AxesLabel: ['time (hr)', LABEL_W], ImagePadding: PADDING_ENERGY, // PlotLegends: drawn by the page below the plot (D-SE-03)
    }),
    Graphics([PointSize('Large'), Point([h, energy(lat, h, sea)])]),
  );
  const northpole = [Blue3, Tube([Dot(rotvec1, [0, 0, 1]), Times(1.2, Dot(rotvec1, [0, 0, 1]))], 0.02)];
  const southpole = [Green3, Tube([Dot(rotvec1, [0, 0, -1]), Times(1.2, Dot(rotvec1, [0, 0, -1]))], 0.02)];
  const cancer = [Thick, Blue3, dashed(circleAt(rotvec1, 66.5), 2 * Pi * Sin((66.5 * Pi) / 180))];
  const capricorn = [Thick, Green3, dashed(circleAt(rotvec1, 113.5), 2 * Pi * Sin((113.5 * Pi) / 180))];
  const artic = [Thick, Blue3, Line3(curvePoints(circleAt(rotvec1, 23.5), 120))];
  const antartic = [Thick, Green3, Line3(curvePoints(circleAt(rotvec1, 156.5), 120))];
  // the marked point, its normal and the Sun's arrow use rotateEarth[h, sea + .5]: 12 hours away from the globe and from
  // the plotted energy (Q-SE-01, E-SE-01; corrected: rotateEarth[h, sea])
  const drawnAt = Flatten(Dot(tiltEarth, Dot(rotateEarth(h, fix ? sea : sea + 0.5), point(lat))));
  const norm1 = [Black3, Arrowheads(ARROWHEAD_MEDIUM), Arrow3([drawnAt, Times(1.3, drawnAt)])];
  const sunnorm1 = [Red3, Arrowheads(ARROWHEAD_MEDIUM), Arrow3([drawnAt, Plus(drawnAt, Times(0.5, sun(sea)))])];
  // the globe: a plain sphere with the 24 × 9 mesh (the original's map texture is not reproduced, D-SE-01)
  const earth = [
    ParametricPlot3D([(s, t) => Dot(rotvec1, [Cos(s) * Sin(t), Sin(s) * Sin(t), Cos(t)])], [0, 2 * Pi], [0, Pi], { PlotStyle: RGB3(...GLOBE_COLOR), Mesh: 'None' }).content,
    globeMesh(rotvec1),
  ];
  // the night half: x <= 0 at every season (Q-SE-02, E-SE-02; corrected: turned with the Sun, about z by 2π sea)
  const nightSurface = ParametricPlot3D([(v, u) => Times(1.01, [-Cos(u) * Sin(v), Sin(u) * Sin(v), Cos(v)])], [0, Pi], [-Pi / 2, Pi / 2],
    { PlotStyle: Directive3([Opacity3(0.7), RGB3(0.3, 0.3, 0.3)]), Mesh: 'None' }).content;
  const night = fix ? Rotate3(nightSurface, 2 * Pi * sea, [0, 0, 1]) : nightSurface;
  const pt = [Red3, Sphere(drawnAt, 0.02)];
  // Show[earth, night, cancer, capricorn, northpole, southpole, artic, antartic, pt, norm1, sunnorm1] (the options: main.js)
  const globe = Graphics3D([earth, night, cancer, capricorn, northpole, southpole, artic, antartic, pt, norm1, sunnorm1]);
  const view = {
    sea, lat, h,
    energyAt: { equator: energy(0, h, sea), latitude: energy(lat, h, sea), northPole: energy(90, h, sea) },
    eng, eng1, eng2, aeng, aeng1, aeng2,
    totals: { latitude: aeng.at(-1), equator: aeng1.at(-1), northPole: aeng2.at(-1) },
    normal: normal(lat, h, sea), sun: sun(sea), drawnAt, rotvec1,
    nightCentre: fix ? Times(-1, sun(sea)) : [-1, 0, 0],
    legend: LEGEND,
  };
  return { view, graphics: [globe, plt, engtot] };
}
