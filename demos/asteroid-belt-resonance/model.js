// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by S. M. Blinder
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/asteroid-belt-resonance/model.js — "Orbital Resonance in the Asteroid Belt": one evaluation of the Manipulate
// body, the state in, { view, graphics } out (pure, no DOM). Simple mode: the original's Graphics list in order; the
// random belt of the Initialization is drawn once from a seeded generator (D-OR-01).
import {
  Annotation, Text, Row, Style, Rectangle, Circle, Point, PointSize, AbsolutePointSize, Thickness, Thick, Blue, White, Orange, Red,
  Yellow, Gray, Lighter, RGBColor,
} from '../../shared/graphics.js';
import { NormalDistribution, RandomVariate, Erf } from '../../shared/wl.js';
import { createRng } from '../../shared/random.js';
import { isCorrected } from '../../shared/errata.js';

export const initialState = () => ({ 'θ': 0, t: 0, k: 0, T: 0, H: 0 });

/** Jupiter's semi-major axis in the gap radii, 5.20336 AU. */
export const A_JUPITER = 5.20336;
/** The Kirkwood gaps of the setter, k = 1 … 4: 3:1, 5:2, 7:3, 2:1 — the asteroid's period as a fraction of Jupiter's. */
export const GAPS = Object.freeze([
  { k: 1, label: '3:1', ratio: 1 / 3 }, { k: 2, label: '5:2', ratio: 2 / 5 }, { k: 3, label: '7:3', ratio: 3 / 7 }, { k: 4, label: '2:1', ratio: 1 / 2 },
]);
/**
 * The radius drawn for a gap: the original's 5.20336 × (period ratio) (E-OR-01); corrected, Kepler's third law
 * a = a_J (P/P_J)^(2/3) (3:1 at 2.50 AU, 5:2 at 2.82, 7:3 at 2.96, 2:1 at 3.28).
 */
export const gapRadius = (ratio, corrected = false) => A_JUPITER * (corrected ? ratio ** (2 / 3) : ratio);

/**
 * Initialization: r = RandomVariate[NormalDistribution[2.71, .4], 5000]; Phi = RandomReal[{0, 2π}, 5000];
 * Phi1 = RandomReal[{-π/6, π/6}, 750]; Phi2 = RandomReal[{-π/8, π/8}, 100]; Phi3 = RandomReal[{-π, π}, 100];
 * j = RandomVariate[NormalDistribution[5.203, .3], 750]; h = …[3.97, .35], 100; h1 = …[2.75, .25], 100.
 * Mathematica's random stream cannot be reproduced; a seeded generator gives the same distributions (D-OR-01).
 */
export function initialization(seed = 2018) {
  const rng = createRng({ seed });
  const r = RandomVariate(NormalDistribution(2.71, 0.4), 5000, rng);
  const Phi = rng.randomReal([0, 2 * Math.PI], 5000);
  const Phi1 = rng.randomReal([-Math.PI / 6, Math.PI / 6], 750);
  const Phi2 = rng.randomReal([-Math.PI / 8, Math.PI / 8], 100);
  const Phi3 = rng.randomReal([-Math.PI, Math.PI], 100);
  const j = RandomVariate(NormalDistribution(5.203, 0.3), 750, rng);
  const h = RandomVariate(NormalDistribution(3.97, 0.35), 100, rng);
  const h1 = RandomVariate(NormalDistribution(2.75, 0.25), 100, rng);
  return Object.freeze({ r, Phi, Phi1, Phi2, Phi3, j, h, h1 });
}
const INIT = initialization();

/** The picture's width in px (ImageSize .95 × 575). */
export const WIDTH = 0.95 * 575;
/** PointSize[d] for the asteroids, d × the width, but at least 1 px: Mathematica's raster shows the 0.55-px points of
 *  PointSize[.001] as single pixels (D-OR-03). */
const small = (d) => AbsolutePointSize(Math.max(1, d * WIDTH));
/** Spacer[10]: 10 pt, about one em of the legend's text. */
const Spacer = () => '\u2003';
const polar = (rad, ang) => [rad * Math.cos(ang), rad * Math.sin(ang)];
const P8 = Math.PI / 8, P3 = Math.PI / 3;

/** The planets' angles at the slider value Theta (Earth: Theta; the others Theta over their periods in years). */
export function planets(Th) {
  return {
    jupiter: polar(5.203, P8 + Th / 11.86),
    mars: polar(1.524, P8 + Th / 1.881),
    earth: polar(1, Th),
    venus: polar(0.723, 9 * P8 + Th / 0.615),
    mercury: polar(0.387, -Math.PI / 16 + Th / 0.241),
  };
}

/** The Manipulate body (the layer passes a context as the second argument: the belt is the module's own). */
export const evaluate = (state) => evaluateWith(state, INIT);

export function evaluateWith(state, init) {
  const { 'θ': Th, t, k } = state;
  const T = Number(state.T), H = Number(state.H); // the checkboxes' {0, 1} (the layer's checkbox gives false / true)
  const corrected = isCorrected(state);
  const pl = planets(Th);
  const { r, Phi, Phi1, Phi2, Phi3, j, h, h1 } = init;
  const jup = P8 + Th / 11.86;
  const belt = r.map((rn, n) => polar(rn, t + Th / 3.6 + Phi[n]));
  const trojans = [
    ...j.map((jn, n) => polar(jn, jup + P3 + Phi1[n])),
    ...j.map((jn, n) => polar(jn, jup - P3 + Phi1[n])),
  ];
  const hildas = [
    ...h.map((hn, n) => polar(hn, jup + P3 + Phi2[n])),
    ...h.map((hn, n) => polar(hn, jup - P3 + Phi2[n])),
    ...h.map((hn, n) => polar(hn, 9 * P8 + Th / 11.86 + Phi2[n])),
    ...h1.map((hn, n) => polar(hn, jup + 2 * P3 + Phi3[n])),
    ...h1.map((hn, n) => polar(hn, jup + Phi3[n])),
    ...h1.map((hn, n) => polar(hn, 9 * P8 + P3 + Th / 11.86 + Phi3[n])),
  ];
  const radius = (g) => gapRadius(g.ratio, corrected);
  const shown = GAPS.find((g) => g.k === k); // Which[k == 1, …, k == 4, …]: nothing for k = 0
  const gapThickness = 0.005 * Erf(0.02 * t);
  const dot = (c) => Style('●', c);
  const graphics = [
    // Rectangle[{-8, -7}, {8, 7}], as Mathematica shows it: cut at the PlotRange 7.7 (D-OR-02)
    Blue, Annotation(Rectangle([-7.7, -7], [7.7, 7]), 'sky'),
    White, Annotation([Circle([0, 0], 1), Circle([0, 0], 0.387), Circle([0, 0], 0.723), Circle([0, 0], 1.524), Circle([0, 0], 5.203)], 'orbits'),
    PointSize(0.015), Orange, Annotation(Point([0, 0]), 'sun'),
    Orange, Annotation(Point(pl.jupiter), 'jupiter'),
    PointSize(0.01), Red, Annotation(Point(pl.mars), 'mars'),
    Lighter(Blue), Annotation(Point(pl.earth), 'earth'),
    Yellow, Annotation(Point(pl.venus), 'venus'),
    Gray, Annotation(Point(pl.mercury), 'mercury'),
    small(0.001), White, Annotation(Point(belt), 'belt'),
    RGBColor(1 - T, 1, 1 - T), small(0.001 * (1 + 1.5 * T)), Annotation(Point(trojans), 'trojans'),
    RGBColor(1, 1 - H, 1 - H), small(0.001 * (1 + 2 * H)), Annotation(Point(hildas), 'hildas'),
    // the gaps: blue circles over the belt, as thick as 0.005 Erf[0.02 t] of the width; the chosen one yellow
    Blue, Thickness(gapThickness), Annotation(GAPS.map((g) => Circle([0, 0], radius(g))), 'gaps'),
    Yellow, Thick, ...(shown ? [Annotation(Circle([0, 0], radius(shown)), 'gap-shown')] : []),
    White, Annotation(Text(Row(['Sun ', dot(Orange), Spacer(), 'Mercury ', dot(Gray), Spacer(), 'Venus ', dot(Yellow), Spacer(),
      'Earth ', dot(Lighter(Blue)), Spacer(), 'Mars ', dot(Red), Spacer(), 'Jupiter ', dot(Orange)]), [0, -6]), 'legend'),
  ];
  const view = {
    planets: pl, gapThickness, gapRadii: GAPS.map(radius), shownGap: shown ? { label: shown.label, radius: radius(shown) } : null,
    trojanColor: [1 - T, 1, 1 - T], hildaColor: [1, 1 - H, 1 - H], counts: { belt: belt.length, trojans: trojans.length, hildas: hildas.length },
    corrected,
  };
  return { view, graphics };
}
