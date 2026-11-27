// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Sergio Hannibal Mejía and Simon Lorimer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/planetary-atmosphere-single-layer/model.js — "Single-Layer Model for Planetary Atmospheres": one evaluation
// of the Manipulate body, the state in, { view, state, graphics } out (pure, no DOM). Simple mode: the original's
// Module in plain arithmetic, its Graphics (the planet, the layer, the arrows of the energy flows and their numbers)
// and the plot of the planet's temperature against the emissivity, one picture above the other (the Column).
import {
  Annotation, Text, RotatedText, Style, Row, Subscript, Superscript, Italic, Disk, Circle, Arrow, Arrowheads, Thickness,
  Opacity, Point, PointSize, Tooltip, Black, Blue, Yellow, Red, White, Gray, Cyan, Orange, Lighter, Darker, RGBColor,
  FontSize,
} from '../../shared/graphics.js';
import { Plot } from '../../shared/plot.js';
import { Round } from '../../shared/wl.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { isCorrected } from '../../shared/errata.js';

export const initialState = () => ({ 'α': 0.3, 'ϵ': 0.742, d: 1, planet: 1, reset: false, scale: 'DegreesCelsius' });

/** σ = 5.67×10⁻⁸ W m⁻² K⁻⁴ (the Module's value). */
export const SIGMA = 5.67e-8;
/** LightGreen = RGBColor[0.88, 1, 0.88] (Wolfram Language documentation). */
const LightGreen = RGBColor(0.88, 1, 0.88);
/** The planets of the setter: the presets of the reset box (ε, α) and the mean distance the original meant to set. */
export const PLANETS = Object.freeze({
  1: Object.freeze({ name: 'Earth', 'ϵ': 0.742, 'α': 0.3, d: 1, color: LightGreen }),
  2: Object.freeze({ name: 'Mars', 'ϵ': 0.3, 'α': 0.25, d: 1.52, color: Lighter(Orange) }),
  3: Object.freeze({ name: 'Venus', 'ϵ': 0.8, 'α': 0.75, d: 0.72, color: Gray }),
  4: Object.freeze({ name: 'my own', color: Cyan }),
});

/** Tp = ((2 (1 − α) S)/(σ (2 − ε)))^(1/4): the planet's temperature for the mean intensity S (W/m²). */
export const Tplanet = (alpha, eps, S) => ((2 * (1 - alpha) * S) / (SIGMA * (2 - eps))) ** 0.25;
/** Ta = (Tp⁴/2)^(1/4): the layer absorbs ε σ Tp⁴ and emits ε σ Ta⁴ up and down. */
export const Tatmosphere = (Tp) => (Tp ** 4 / 2) ** 0.25;

/**
 * The state after the body's assignments, in the original's order:
 *  Which[planet == 1, d = 1, planet == 1, d = 1.52, planet == 1, d = .72] — the three tests are all planet == 1, so only
 *  Earth sets its distance (E-OR… E-AT-01; corrected: planet == 1, 2, 3);
 *  If[reset, {Which[planet == 1, {ε = .742, α = .3}, planet == 2, {ε = .3, α = .25}, planet == 3, {α = .75, ε = .8}],
 *  reset = False}].
 */
export function assigned(state) {
  const s = { ...state };
  const corrected = isCorrected(state);
  if (s.planet === 1) s.d = 1;
  else if (corrected && (s.planet === 2 || s.planet === 3)) s.d = PLANETS[s.planet].d;
  if (s.reset) {
    const p = PLANETS[s.planet];
    if (p['α'] !== undefined) { s['ϵ'] = p['ϵ']; s['α'] = p['α']; }
    s.reset = false;
  }
  return s;
}

/** The numbers of the picture. */
export function quantities(s) {
  const S = 342 / s.d ** 2;
  const Tp = Tplanet(s['α'], s['ϵ'], S);
  const Ta = Tatmosphere(Tp);
  return { S, Tp, Ta, emitted: SIGMA * Tp ** 4, transmittedUp: (1 - s['ϵ']) * SIGMA * Tp ** 4, layer: s['ϵ'] * SIGMA * Ta ** 4 };
}

const minus = (x) => (x < 0 ? `\u2212${-x}` : String(x));

/** UnitConvert[Quantity[T, "Kelvins"], scale], rounded: "286 K = 13 °C" (or °F). */
export function temperatureText(T, scale) {
  const c = T - 273.15;
  const v = scale === 'DegreesFahrenheit' ? (c * 9) / 5 + 32 : c;
  return `${minus(Round(T))} K = ${minus(Round(v))} ${scale === 'DegreesFahrenheit' ? '°F' : '°C'}`;
}

// Text[…, pos, {0, 0}, {dx, dy}]: the label turned to the direction {dx, dy}
const turned = (expr, pos, [dx, dy]) => Text(RotatedText(expr, Math.atan2(dy, dx)), pos);

export function evaluate(state) {
  const s = assigned(state);
  const corrected = isCorrected(state);
  const { S, Tp, Ta, emitted, transmittedUp, layer } = quantities(s);
  const alpha = s['α'], eps = s['ϵ'];
  const color = PLANETS[s.planet].color;
  const Tsub = (sub) => Subscript(Style('T', Italic), sub);
  // {FontSize -> 17, Style[Text[Tooltip[…, tip], pos, {0, 0}, dir], colour], …}
  const num = (n, tip, pos, dir, c, id) => Annotation(Tooltip([FontSize(17), turned(Style(minus(n), c), pos, dir)], tip), id);
  const scene = [
    Black, Annotation(Disk([0, -20], 30), 'space'), color, Annotation(Disk([0, -20], 25), 'layer-air'),
    Blue, Circle([0, -20], 25),
    // Green, Thickness[0.05], Lighter[Blue], Darker[color]: the last colour wins
    Thickness(0.05), Darker(color), Annotation(Circle([0, -30], 30.2), 'ground'),
    Yellow,
    Thickness(0.1), Arrowheads(0.3), Annotation(Arrow([[-4, 9], [-3, 5]]), 'arrow-sun'),
    Thickness(0.1 * alpha), Arrowheads(0.3 * alpha), Annotation(Arrow([[-3, 5], [-2, 8]]), 'arrow-reflected'),
    Thickness(0.1 * (1 - alpha)), Arrowheads(0.3 * (1 - alpha)), Annotation(Arrow([[-3, 5], [-2, 0]]), 'arrow-transmitted'),
    Blue,
    Thickness(0.1), Opacity(0.1 + 0.8 * eps), Annotation(Circle([0, -20], 25), 'cloud-layer'),
    Lighter(Red),
    Opacity(1), Thickness((0.1 * transmittedUp) / S), Arrowheads((0.3 * transmittedUp) / S), Annotation(Arrow([[-0.5, 5], [-0.5, 8]]), 'arrow-planet-up'),
    Thickness((0.1 * layer) / S), Arrowheads((0.3 * layer) / S),
    Annotation(Arrow([[1.7, 4.95], [2.0, 8]]), 'arrow-layer-up'), Annotation(Arrow([[1.7, 5], [1.5, 2]]), 'arrow-layer-down'),
    Lighter(Red),
    Thickness((0.1 * emitted) / S), Arrowheads((0.3 * emitted) / S), Opacity(1), Annotation(Arrow([[-0.5, -0.5], [-0.5, 5]]), 'arrow-planet'),
  ];
  const Sbar = Row([Style('S̅', Italic), ' = ', String(Round(S))]); // OverscriptBox[S, _] = S̄
  const numbers = [
    Annotation(Tooltip([FontSize(17), turned(Style(Sbar, Lighter(Blue)), [-3.6, 7], [-Math.cos(4.4), Math.sin(4.4)])], 'S̄ average intensity '), 'num-S'),
    num(Round(S * alpha), 'S̄Alpha', [-2.3, 7], [-Math.cos(1.93), Math.sin(1.93)], Lighter(Blue), 'num-reflected'),
    num(Round(S * (1 - alpha)), 'S̄(1-Alpha)', [-2.5, 3], [-Math.cos(4.52), Math.sin(4.52)], Blue, 'num-transmitted'),
    num(Round(emitted), 'σ Tp^4', [-0.5, 1.5], [0, 1], Blue, 'num-planet'),
    num(Round(transmittedUp), '(1-ε)σ Tp^4', [-0.5, 6.5], [0, 1], Blue, 'num-planet-up'),
    num(Round(layer), 'εσTa^4', [1.6, 3.2], [Math.cos(1.48), Math.sin(1.48)], Blue, 'num-layer-down'),
    num(Round(layer), 'εσTa^4', [1.85, 6.6], [Math.cos(1.48), Math.sin(1.48)], Blue, 'num-layer-up'),
  ];
  const dText = typeof s.d === 'number' ? mmaNumberString(s.d) : String(s.d);
  const units = corrected ? 'W/m' : 'kW/m'; // E-AT-02: the intensities are in W/m²
  const texts = [
    Black, FontSize(14), Opacity(1),
    Annotation(Text(Style(Row(['mean solar distance: ', Style('d', Italic), ' = ', dText, ' AU']), White), [1.75, 8.2]), 'label-distance'),
    Blue, Annotation(Text(Row(['radiation measurements are in ', Superscript(units, '2')]), [-1.6, 0.65]), 'label-units'),
    Black,
    Annotation(Text(Row([Tsub('p'), ` = ${temperatureText(Tp, s.scale)}`]), [3, 1.75]), 'label-Tp'),
    Annotation(Text(Row([Tsub('a'), ` = ${temperatureText(Ta, s.scale)}`]), [3, 1]), 'label-Ta'),
  ];
  // Plot[Tp(e), {e, 0, 1}, …] with the point {ε, Tp} (Tooltip "Tp … K = … °C")
  const curve = Plot((e) => Tplanet(alpha, e, S), [0, 1], {
    ImageSize: [360, 160], AspectRatio: 0.4, PlotRange: [[0, 1], [0, 400]],
    AxesLabel: [Style('ϵ', Italic), Row([Tsub('p'), ' (K)'])], PlotLabel: 'planetary temperature versus emissivity',
    GridLines: [range(0, 1, 0.1), range(0, 400, 50)], Ticks: [range(0, 1, 0.1).map((x) => [x, mmaNumberString(x, { isReal: true })]), range(0, 400, 50)],
    Epilog: [PointSize(0.02), Annotation(Tooltip(Point([eps, Tp]), `Tp${temperatureText(Tp, s.scale)}`), 'point-Tp')],
  });
  const view = {
    S, Tp, Ta, emitted, transmittedUp, layer, d: s.d, planet: PLANETS[s.planet].name, corrected,
    labels: {
      S: Round(S), reflected: Round(S * alpha), transmitted: Round(S * (1 - alpha)), emitted: Round(emitted),
      planetUp: Round(transmittedUp), layer: Round(layer), distance: dText, Tp: temperatureText(Tp, s.scale),
      Ta: temperatureText(Ta, s.scale), units: `${units}²`,
    },
  };
  return { view, state: s, graphics: [[...scene, ...numbers, ...texts], curve] };
}

function range(a, b, step) {
  const n = Math.round((b - a) / step);
  return Array.from({ length: n + 1 }, (_, i) => Number((a + i * step).toFixed(10)));
}
