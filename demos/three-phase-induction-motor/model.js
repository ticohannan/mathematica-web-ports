// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Harley H. Hartman
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/three-phase-induction-motor/model.js — one evaluation of the Manipulate body of "Operating an AC Three-Phase
// Induction Motor": the state {a, m, p, f} in, { view, graphics: [Graphics3D, Plot] } out (pure, no DOM). Simple mode:
// plain arithmetic with shared/wl.js names, in the original's order (rotor angle b, skew d and e, the Graphics3D, the
// plot of the three-phase supply).
import { Sin, Cos, Sqrt, Pi } from '../../shared/wl.js';
import * as G3 from '../../shared/graphics3d.js';
import { RGBColor, Thickness, Column } from '../../shared/graphics.js';
import { Plot } from '../../shared/plot.js';

/** The Manipulate's initial values (its control specs): what "Initial settings" restores. */
export const initialSettings = () => ({ a: 0, m: 1, p: 0, f: 50 });
/** The opening state: the notebook's live state (tests/golden: states[0]); a = 5.63 differs from the initial a = 0. */
export const initialState = () => ({ a: 5.63, m: 1, p: 0, f: 50 });

/** ColorData["HTML", "SlateBlue"] = RGBColor[106/255, 90/255, 205/255]. */
export const SLATE_BLUE = [106 / 255, 90 / 255, 205 / 255];
/** The colours of the phases: Sin[a + p°] SlateBlue, Sin[a + 2π/3] orange, Sin[a − 2π/3] lime (the code's comments
 *  call the last two "green" and "red": Q-TB-05). */
export const ORANGE_PHASE = [1, 0.47, 0];
export const LIME_PHASE = [0.47, 1, 0];
/** The colour of the fourth curve (the sum of squares). */
export const SUM_COLOR = [0.6, 0.74, 0.36];

/** p/(180/π): the phase shift in radians (the original's own spelling of p°). */
const deg = (p) => p / (180 / Pi);

/** The three phase currents at time t (the plot's first three curves; the band opacities use them without m). */
export const phases = (t, m, p) => [Sin(t + deg(p)) * m, Sin(t + (2 * Pi) / 3), Sin(t - (2 * Pi) / 3)];
/** The plot's fourth curve "relative flux": the sum of the squares of the three currents. */
export const sumOfSquares = (t, m, p) => phases(t, m, p).reduce((s, x) => s + x * x, 0);

/**
 * (* the rotor speed is adjusted by a magnitude factor *)
 * b = -a + Sqrt[(Sin[a + p/(180/π) + 0.7] m)^2 + Sin[a + 2π/3 + 0.7]^2 + Sin[a - 2π/3 + 0.7]^2]/1.3 — the rotor angle:
 * the field's angle −a plus the square root of the sum of squares taken 0.7 rad later (the 0.7 is inside each Sin;
 * Q-TB-02, N-TB-05).
 */
export function rotorAngle(a, m, p) {
  return -a + Sqrt((Sin(a + deg(p) + 0.7) * m) ** 2 + Sin(a + (2 * Pi) / 3 + 0.7) ** 2 + Sin(a - (2 * Pi) / 3 + 0.7) ** 2) / 1.3;
}

/** (* calculate skew *) d = b + (f π/12)/100, e = b − (f π/12)/100: the bars' angles at the top (z = 12) and bottom. */
export const skew = (b, f) => [b + (f * Pi / 12) / 100, b - (f * Pi / 12) / 100];

/** The six phase bands in the original's order: [opacity, colour, angle of the band's axis]. Opacity may be negative
 *  (Q-TB-01): Mathematica draws such a band's faces fully transparent and still draws its rims. */
export function phaseBands(a, p) {
  const sA = Sin(a + deg(p)), sB = Sin(a - (2 * Pi) / 3), sC = Sin(a + (2 * Pi) / 3);
  return [
    [-sA, SLATE_BLUE, Pi], [sA, SLATE_BLUE, 0], // (* draw blue phase bands *)
    [-sB, LIME_PHASE, Pi - (2 * Pi) / 3], [sB, LIME_PHASE, 0 - (2 * Pi) / 3], // (* draw red phase bands *)
    [-sC, ORANGE_PHASE, Pi + (2 * Pi) / 3], [sC, ORANGE_PHASE, 0 + (2 * Pi) / 3], // (* draw green phase bands *)
  ];
}

/** The angles (from d and e) of the twelve rotor bars: d + kπ/6, k = 0 … 11, as the original lists them. */
const BAR_OFFSETS = [0, Pi / 6, Pi / 3, Pi / 2, (2 * Pi) / 3, (5 * Pi) / 6, Pi, (7 * Pi) / 6, (4 * Pi) / 3, (3 * Pi) / 2, (5 * Pi) / 3, (11 * Pi) / 6];
const BAR_COLOR = [0.8, 0.1, 0.4];

/** The Graphics3D of the motor (ImageSize 275 × 275, Boxed -> False), primitives in the original's order. */
export function motorGraphics({ a, p }, b, d, e) {
  const q = b + Pi / 4;
  const c = (x, y, z) => [x, y, z];
  return G3.Graphics3D([
    // (* draw position indicator *) EdgeForm[Thick]: black edges, drawn 1 px wide (D-TB-03)
    [G3.EdgeForm([0, 0, 0]), G3.Orange, G3.Polygon([
      c(Cos(q) * 3.5, Sin(q) * 3.5, -10), c(Cos(q) * 7, Sin(q) * 7, -10),
      c(Cos(q) * 7, Sin(q) * 7, 10), c(Cos(q) * 3.5, Sin(q) * 3.5, 10),
    ])],
    // (* draw stator *)
    [G3.Opacity(0.3), G3.Yellow, G3.Cylinder([[0, 0, 10], [0, 0, -10]], 32)],
    [G3.Opacity(0.2), G3.White, G3.Cylinder([[0, 0, 10], [0, 0, -10]], 22)],
    // (* draw blue, red and green phase bands *)
    ...phaseBands(a, p).map(([o, col, t]) => [G3.Opacity(o), G3.RGBColor(...col),
      G3.Cylinder([[Cos(t) * 27, Sin(t) * 27, -10], [Cos(t) * 27, Sin(t) * 27, 10]], 4.8)]),
    // (* draw rotor *)
    [G3.Opacity(0.4), G3.RGBColor(0.2, 0.7, 0.3), G3.Cylinder([[0, 0, 10], [0, 0, -10]], 20)],
    // (* draw shaft *) (a top-level directive, as in the original)
    G3.RGBColor(...SLATE_BLUE), G3.Cylinder([[0, 0, 40], [0, 0, -18]], 3.5),
    // (* draw rotor holes *)
    [G3.Opacity(0.7), G3.White,
      ...[0, Pi / 2, Pi, (3 * Pi) / 2].map((k) => G3.Cylinder([[Cos(b + k) * 8, Sin(b + k) * 8, 10], [Cos(b + k) * 8, Sin(b + k) * 8, -10]], 1.8))],
    // (* draw bars *)
    ...BAR_OFFSETS.flatMap((k) => [G3.RGBColor(...BAR_COLOR),
      G3.Cylinder([[Cos(d + k) * 18, Sin(d + k) * 18, 12], [Cos(e + k) * 18, Sin(e + k) * 18, -12]], 2)]),
  ], { Boxed: false, ImageSize: 275 });
}

/** ImagePadding {{left, right}, {bottom, top}} in px: Mathematica's automatic padding as the snapshots show it. */
const PLOT_PADDING = [[26, 28], [10, 40]];

/** (* plot three phase graph *): the three currents and the sum of their squares over one period (the plot's own
 *  variable a: the curves do not depend on the Manipulate's a, Q-TB-03). */
export function supplyPlot({ m, p }) {
  return Plot((t) => [...phases(t, m, p), sumOfSquares(t, m, p)], [0, 2 * Pi], {
    // "current / \nrelative flux": two lines above the y axis; the layer centres a Column label on the axis end, so two
    // empty lines lift the text clear of the tick label 2.0 (D-TB-04)
    AxesLabel: ['time', Column(['current / ', 'relative flux', '', ''])],
    PlotRange: [-1.5, 2.0],
    PlotStyle: [[RGBColor(...SLATE_BLUE), Thickness(0.01)], [RGBColor(...ORANGE_PHASE), Thickness(0.01)],
      [RGBColor(...LIME_PHASE), Thickness(0.01)], [RGBColor(...SUM_COLOR), Thickness(0.01)]],
    ImageSize: 300,
    ImagePadding: PLOT_PADDING, // room for the two-line y label above the axis (as the snapshots place it)
  });
}

/** One evaluation of the Manipulate body: Grid[{{Graphics3D[…], Plot[…]}}]. */
export function evaluate(state) {
  const { a, m, p, f } = state;
  const b = rotorAngle(a, m, p);
  const [d, e] = skew(b, f);
  return {
    view: { b, d, e, bands: phaseBands(a, p).map(([o]) => o), flux: sumOfSquares(a, m, p) },
    graphics: [motorGraphics(state, b, d, e), supplyPlot(state)],
  };
}
