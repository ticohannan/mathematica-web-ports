// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Harley H. Hartman
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/induction-motor-rotor-design/model.js — "AC Induction Motor Rotor Design": one evaluation of the Manipulate body,
// the state in, { view, graphics } out (pure, no DOM). Simple mode: the original's closed forms in plain arithmetic,
// shared/plot.js Plot with the original's Epilog (three arrows and three labels).
import { Annotation, Text, Style, Column, Row, Bold, Black, RGBColor, Thickness } from '../../shared/graphics.js';
import { Plot } from '../../shared/plot.js';
import { Round } from '../../shared/wl.js';
import { isCorrected } from '../../shared/errata.js';

export const initialState = () => ({ e: 150, r: 0.107, x: 0.422 });

/** The NEMA design buttons: Button[" A ", r = 0.065; x = 0.3263; e = 150], … (the values each button sets). */
export const NEMA = Object.freeze({
  A: Object.freeze({ r: 0.065, x: 0.3263, e: 150 }),
  B: Object.freeze({ r: 0.0792, x: 0.405, e: 158 }),
  D: Object.freeze({ r: 0.384, x: 0.384, e: 150 }),
});

/** ColorData["HTML", "SlateBlue"] = RGB 106, 90, 205. */
export const SLATE_BLUE = RGBColor(106 / 255, 90 / 255, 205 / 255);
export const PURPLE = RGBColor(0.5, 0.2, 0.5);
export const RED = RGBColor(0.9, 0.1, 0.1);

/** The plotted torque in % of full load at the speed s (rpm): −(21.12 e² r (s − 1800))/(3.24×10⁶ r² + (s − 1800)² x²). */
export const torque = (e, r, x) => (s) => -(21.12 * e ** 2 * r * (-1800 + s)) / (3.24e6 * r ** 2 + 1 * (-1800 + s) ** 2 * x ** 2);

/**
 * The full-load speed (1/x²)(−0.1056 e² r + 1800 x² + 0.1056 √(r² (e⁴ − 2.90547520661157×10⁸ x²))): the higher-speed root
 * of T(s) = 100. Returns { re, im }; im ≠ 0 where the square root is imaginary (e⁴ < 2.905×10⁸ x², the largest torque
 * below 100 %: not reachable with the sliders' ranges, E-IM-03).
 */
export function fullLoadSpeed(e, r, x) {
  const d = r ** 2 * (1 * e ** 4 - 2.90547520661157e8 * x ** 2);
  const base = (-0.1056 * e ** 2 * r + 1800 * x ** 2) / x ** 2;
  return d >= 0 ? { re: base + (0.1056 * Math.sqrt(d)) / x ** 2, im: 0 } : { re: base, im: (0.1056 * Math.sqrt(-d)) / x ** 2 };
}

/**
 * Round of a real or complex number as Mathematica prints it inside Times[n, "text"]: a complex result rounds both parts
 * (a Gaussian integer); an imaginary part of 0 leaves the integer.
 */
export const roundValue = ({ re, im }) => ({ re: Round(re), im: Round(im) });

/**
 * Mathematica's display of Times[n, "text"] (n an integer or a Gaussian integer): "n text" — the number first, a space,
 * then the string as it is (" rpm" keeps its own leading space: "1725  rpm"); 1 × "text" is the text alone, 0 × "text" is 0,
 * −1 × "text" is "-text", a complex number is parenthesised "(a + b ⅈ) text".
 */
export function timesText(n, text) {
  const { re, im } = typeof n === 'number' ? { re: n, im: 0 } : n;
  if (im === 0) {
    if (re === 0) return '0';
    if (re === 1) return text;
    if (re === -1) return `-${text}`;
    return `${re} ${text}`;
  }
  const i = (b) => (b === 1 ? 'ⅈ' : b === -1 ? '-ⅈ' : `${b} ⅈ`);
  const z = re === 0 ? i(im) : `(${re} ${im < 0 ? '-' : '+'} ${i(Math.abs(im))})`;
  return `${z} ${text}`;
}

/** The numbers behind the three labels and arrows, as the original computes them. */
export function quantities(state) {
  const { e, r, x } = state;
  const T = torque(e, r, x);
  const lockedRotor = -(21.12 * e ** 2 * r * -1800) / (3.24e6 * r ** 2 + 1 * (-1800) ** 2 * x ** 2); // T at s = 0
  const peakSpeed = Round(1800 - (1800 * r) / x); // Round[1800 − 1800 r/x, 1]
  const peakOutside = peakSpeed < 0; // the curve's maximum lies at a negative speed (r > x)
  const maxSpeedShown = peakOutside ? 0 : peakSpeed;
  const maxTorque = (0.005866666666666667 * e ** 2) / x; // 21.12 e²/(3600 x): T at s = 1800 − 1800 r/x
  // E-IM-02: with the maximum outside the plotted speeds the original still prints the unconstrained maximum next to
  // "0 rpm"; corrected, the largest torque on the plot, the locked-rotor torque at 0 rpm (where the arrow points)
  const maxTorqueShown = isCorrected(state) && peakOutside ? lockedRotor : maxTorque;
  const fl = fullLoadSpeed(e, r, x);
  return {
    T, lockedRotor, peakSpeed, peakOutside, maxSpeedShown, maxTorque, maxTorqueShown, fullLoad: fl,
    lockedArrow: [50, lockedRotor + 30],
    maxArrow: [maxSpeedShown, peakOutside ? lockedRotor + 25 : maxTorque + 25],
    fullLoadArrow: fl.im === 0 ? [fl.re + 60, 100] : null, // a complex position cannot be drawn (K-IM-02)
  };
}

/** {{left, right}, {bottom, top}} px: the snapshots (drawn at 1.1 × the ImageSize) measured and divided by 1.1. */
export const IMAGE_PADDING = Object.freeze([[44, 63], [28, 41]]);

// a drawn label keeps a double space (" rpm" after the number's space) with a no-break space: SVG text collapses spaces
const label = (lines, color, pos, id) => Annotation(Text(Column(lines.map((t) => Style(t, 12, color))), pos), id);

/** The Manipulate body: Plot[T(s), {s, 0, 1820}, …, Epilog -> {…}]. */
export function evaluate(state) {
  const q = quantities(state);
  const locked = timesText(Round(q.lockedRotor), '% full load');
  const max = timesText(Round(q.maxTorqueShown), '% full load');
  const maxRpm = Row([String(q.maxSpeedShown), ' rpm']); // Row[{Style[n, 12], Style[" rpm", 12]}]
  const fullLoad = timesText(roundValue(q.fullLoad), ' rpm');
  const Epilog = [
    // locked rotor display
    Annotation(Text(Style('↙', 20, PURPLE, Bold), q.lockedArrow), 'locked-arrow'),
    label(['locked rotor', 'torque', locked], PURPLE, [300, 610], 'locked-label'),
    // maximum torque display
    Annotation(Text(Style('↓', 20, Black, Bold), q.maxArrow), 'max-arrow'),
    label(['max torque', max, maxRpm], Black, [1005, 610], 'max-label'),
    // full load torque display
    ...(q.fullLoadArrow ? [Annotation(Text(Style('←', 20, RED, Bold), q.fullLoadArrow), 'full-load-arrow')] : []),
    label(['full load', 'torque', fullLoad.replace(/ {2}/g, ' \u00a0')], RED, [1710, 610], 'full-load-label'),
  ];
  const plot = Plot(q.T, [0, 1820], {
    // AxesLabel -> {"speed\nRPM", "torque\n% full load"}: the two-line strings as Columns (as Mathematica draws them); the
    // y label gets an empty third line so that the block ends above the plot, as in the snapshots (D-IM-01)
    AxesLabel: [Column(['speed', 'RPM']), Column(['torque', '% full load', ''])],
    PlotRange: [0, 700], PlotStyle: [[SLATE_BLUE, Thickness(0.01)]],
    Ticks: [[0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800], [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700]],
    ImageSize: [500, 300], Epilog,
    // D-IM-01: the room Mathematica leaves around the plot for the two-line axes labels, measured on the snapshots
    ImagePadding: IMAGE_PADDING,
  });
  const view = {
    lockedRotor: q.lockedRotor, maxTorque: q.maxTorque, maxTorqueShown: q.maxTorqueShown, peakSpeed: q.peakSpeed,
    maxSpeedShown: q.maxSpeedShown, fullLoad: q.fullLoad, lockedArrow: q.lockedArrow, maxArrow: q.maxArrow,
    fullLoadArrow: q.fullLoadArrow, labels: { locked, max, maxRpm: `${q.maxSpeedShown} rpm`, fullLoad }, corrected: isCorrected(state),
  };
  return { view, graphics: plot };
}
