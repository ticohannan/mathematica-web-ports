// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Nasser M. Abbasi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/feedback-control-simulation/model.js — "Simulation of Feedback Control System with Controller and Second-Order
// Plant": one evaluation of the Manipulate body, the state in, { state, view, graphics } out (pure, no DOM). Simple mode:
// shared/control.js (TransferFunctionModel, SystemsModelFeedbackConnect, OutputResponse, TransferFunctionPoles,
// GainMargins, PhaseMargins), shared/control-plots.js (BodePlot, NyquistPlot), shared/plot.js.
import {
  Graphics, Annotation, Line, Rectangle, Text, Style, Row, Italic, Grid, Framed, EdgeForm, GrayLevel, Black, Blue, Red, White,
  Opacity, Thin, Thick, Dotted, Inset, Hue, AbsoluteThickness, AbsoluteDashing, Superscript, Directive, SpanFromLeft, Gray,
} from '../../shared/graphics.js';
import { Plot, ListPlot } from '../../shared/plot.js';
import {
  TransferFunctionModel, SystemsModelSeriesConnect, SystemsModelFeedbackConnect, OutputResponse, Signal, TransferFunctionPoles,
  TransferFunctionZeros, GainMargins, PhaseMargins,
} from '../../shared/control.js';
import { BodePlot, NyquistPlot } from '../../shared/control-plots.js';
import { NumberForm } from '../../shared/number-form.js';
import { Abs, Re, Im } from '../../shared/complex.js';
import { mmaNumberString } from '../../shared/mma-extra.js';

export const W = 410, H = 470; // ContentSizeW, ContentSizeH
export const TYPES = Object.freeze(['P', 'PI', 'PD', 'PID']);
export const initialState = () => ({
  doSimulation: false, currentTime: 0, propertional: 10, integral: 3.73, derivative: 0.697, controllerType: 'PID', delta: 0.2,
  showPlantResponse: true, simulationTime: 20, zeta: 0.77, wn: 1, dcGain: 1,
});

// ---- the classes of the Initialization, as functions of the state -------------------------------------------------------
/** plant@getTF: (wn² gain)/(s² + 2 zeta wn s + wn²). */
export const plantTF = ({ zeta, wn, dcGain }) => TransferFunctionModel([wn * wn * dcGain], [wn * wn, 2 * zeta * wn, 1]);
/** controller@getPolynomial: kp + ki/s + kd s by type, as a transfer function. */
export function controllerTF({ controllerType: t, propertional: kp, integral: ki, derivative: kd }) {
  if (t === 'PID') return TransferFunctionModel([ki, kp, kd], [0, 1]);
  if (t === 'PD') return TransferFunctionModel([kp, kd], [1]);
  if (t === 'PI') return TransferFunctionModel([ki, kp], [0, 1]);
  return TransferFunctionModel([kp], [1]);
}
export const openLoopTF = (s) => SystemsModelSeriesConnect(controllerTF(s), plantTF(s));
/** feedBack@getPolynomial: N@Simplify[p/(1 + p)] — the closed loop, normalised to a monic denominator. */
export function closedLoopTF(s) {
  const T = SystemsModelFeedbackConnect(openLoopTF(s));
  const lead = T.den.at(-1);
  return TransferFunctionModel(T.num.map((x) => x / lead), T.den.map((x) => x / lead));
}
/** First@OutputResponse[tf, UnitStep[t], {t, 0, simulationTime}]. */
export const stepResponse = (tf) => OutputResponse(tf, Signal.step(1));
/** The closed-loop poles as formatClosedLoopPoles writes them (Mathematica's order: real roots last, as the snapshot). */
export function sortedPoles(tf) {
  return TransferFunctionPoles(tf).map((z) => [Re(z), Math.abs(Im(z)) < 1e-12 ? 0 : Im(z)])
    .sort((a, b) => (a[1] === 0) - (b[1] === 0) || a[0] - b[0] || a[1] - b[1]);
}
const fmt6 = (x) => mmaNumberString(x);
export const poleText = ([re, im]) => (im === 0 ? fmt6(re) : `${fmt6(re)} ${im < 0 ? '-' : '+'} ${fmt6(Math.abs(im))} i`);

// ---- makeMechanicalSystem: the mass–spring–damper at displacement y ------------------------------------------------------
/** rugo[xkezd, ykezd, xveg, yveg] (by Árpád Kósa, as the original credits it): the zigzag of the spring. */
export function rugo(x0, y0, x1, y1) {
  const step = 12, szel = 0.25, veghossz = 0.3;
  const hx = x1 - x0, hy = y1 - y0, hossz = Math.hypot(hx, hy), dh = (hossz - 2 * veghossz) / step;
  const pts = [[x0, y0], [x0 + (hx * (dh + veghossz)) / hossz, y0 + (hy * (dh + veghossz)) / hossz]];
  for (let i = 2; i <= step - 2; i++) {
    const s = i % 2 === 1 ? 1 : -1;
    pts.push([x0 + (hx * (i * dh + veghossz)) / hossz + (s * hy * szel) / hossz, y0 + (hy * (i * dh + veghossz)) / hossz - (s * hx * szel) / hossz]);
  }
  pts.push([x0 + (hx * ((step - 1) * dh + veghossz)) / hossz, y0 + (hy * ((step - 1) * dh + veghossz)) / hossz], [x1, y1]);
  return pts;
}
/** PaddedForm[Chop[N@y, 10^-5], {6, 6}, NumberSigns -> {"", ""}, NumberPadding -> {"0", "0"}]. */
export function paddedY(y) {
  const v = Math.abs(y) < 1e-5 ? 0 : y;
  if (v === 0) return '000000'; // Chop gives the exact 0: an integer padded to six digits
  return NumberForm(v, [6, 6], { NumberPadding: ['0', '0'], NumberSigns: ['', ''] });
}
export function mechanicalSystem(y$) {
  const a1 = 1, a3 = 0.7, a6 = 0.3, a0 = 0.7, a2 = 0.15 * a0, a4 = 0.3 * a0;
  let y = y$;
  if (y > 1.5) y = 1.5; // virtual stop guards for an unstable system
  if (y < -0.2) y = -0.2;
  return Graphics([
    [EdgeForm([Thick, Black]), GrayLevel(0.9), Rectangle([0, 0], [1.5 + a0, a1])],
    [GrayLevel(0.5), Opacity(0.5), Annotation(Rectangle([y + a0, 0], [y + a0 + 0.05, a1]), 'mass')],
    [Black, Line([[a4, a3], [y + a0, a3]])], [Black, Line([[0, a3], [a2, a3]])], [Black, Line([[a2, 0.9 * a3], [a2, 1.1 * a3]])],
    [Black, Line([[a2, 0.9 * a3], [a4, 0.9 * a3]])], [Black, Line([[a2, 1.1 * a3], [a4, 1.1 * a3]])], [Black, Line([[0, a6], [a2, a6]])],
    [Blue, Thin, Dotted, Line([[a0 + 1, 0], [a0 + 1, a1]])], [Blue, Thin, Dotted, Line([[a0, 0], [a0, a1]])],
    Text(Style(paddedY(y$), 11), [y + a0, 1.1 * a1]),
    Text(Row([Style('x', Italic), Style(' = 0', 11)]), [a0, -0.1]), Text(Row([Style('x', Italic), Style(' = 1', 11)]), [a0 + 1, -0.1]),
    [Red, Annotation(Line(rugo(0, a6, y + a0, a6)), 'spring')],
  ], { PlotRange: [[-0.01, 2.3], [-0.21, 1.2 * a1]], ImageSize: 0.58 * W, PlotRangePadding: 0, AspectRatio: 0.3, UpdateFrame: true });
}

// ---- the plots -------------------------------------------------------------------------------------------------------
const HUE = Hue(0.67, 0.6, 0.6);
const polyText = (tf, exact = false) => {
  // TraditionalForm of the rational function: numerator over denominator, highest power first; the plant's
  // coefficients are exact at the opening settings (plantClass[…, .77, 1, 1]: "1", not "1."), the closed loop's N@…
  const term = (c, k) => { const a = mmaNumberString(c, { isReal: !(exact && Number.isInteger(c)) }); return k === 0 ? a : k === 1 ? `${a === '1.' ? '' : a + ' '}s` : `${a === '1.' ? '' : a + ' '}s^${k}`; };
  const side = (p) => p.map((c, k) => [c, k]).filter(([c]) => c !== 0).reverse().map(([c, k]) => (k > 0 && c === 1 ? (k === 1 ? 's' : `s^${k}`) : term(c, k)));
  return [side(tf.num), side(tf.den)];
};
const supText = (parts) => Row(parts.flatMap((t, i) => {
  const m = /^(.*)s\^(\d)$/.exec(t);
  const piece = m ? [m[1] + 's', Superscript('', m[2])] : [t];
  return i ? [' + ', ...piece] : piece;
}));
export function frac(tf, exact = false) {
  const [n, d] = polyText(tf, exact);
  return [supText(n), supText(d)];
}

/** The Manipulate body. */
export function evaluate(state) {
  const s = { ...state };
  const plant = plantTF(s), closed = closedLoopTF(s), open = openLoopTF(s);
  const plantY = stepResponse(plant), closedY = stepResponse(closed);
  // the animation (doSimulation): currentTime advances by delta per evaluation up to simulationTime
  if (s.doSimulation && s.currentTime < s.simulationTime) s.currentTime = Math.min(s.simulationTime, s.currentTime + s.delta);
  const T = s.simulationTime;
  const poles = sortedPoles(closed);
  const stable = !poles.some(([re]) => re > 0);
  // the step response plot (getPlot)
  const show = s.showPlantResponse;
  const curves = show ? [closedY, plantY, () => 1] : [closedY, () => 1];
  const legend = [
    Text(Style('closed loop', 12), [0.56 * T + 0.09 * T, 0.2], [-1, 0]),
  ];
  const step = Plot(curves, [0, T], {
    AxesOrigin: [0, 0], PlotRange: [[0, T], 'All'], Frame: true, ImageSize: 0.65 * W, AspectRatio: 1.1, GridLines: 'Automatic',
    GridLinesStyle: [AbsoluteThickness(0.5), Gray, AbsoluteDashing([3, 3])], Axes: false,
    // Thin (0.25 pt) is drawn 1 px wide by the front end; so here (D-FC-06)
    PlotStyle: show ? [[Blue, AbsoluteThickness(1)], [Black, AbsoluteThickness(1)], Red] : [[Blue, AbsoluteThickness(1)], Red], FrameLabel: [Row([Style('t', Italic), ' sec']), null],
    PlotLabel: Style('step response', 11), PlotLegends: undefined, label: 'Step response',
  });
  const [x0, x1] = step.options.PlotRange[0], [y0, y1] = step.options.PlotRange[1];
  step.list.push(
    Text(Framed(Style(stable ? 'stable' : 'unstable', stable ? Black : Red, 12), { FrameMargins: 2 }), [x0 + 0.06 * (x1 - x0), y0 + 0.05 * (y1 - y0)], [-1, 0]),
    Annotation([
      Blue, AbsoluteThickness(1), Line([[x0 + 0.56 * (x1 - x0), y0 + 0.2 * (y1 - y0)], [x0 + 0.62 * (x1 - x0), y0 + 0.2 * (y1 - y0)]]),
      Text(Style('closed loop', 12), [x0 + 0.64 * (x1 - x0), y0 + 0.2 * (y1 - y0)], [-1, 0]),
      ...(show ? [Black, Line([[x0 + 0.56 * (x1 - x0), y0 + 0.13 * (y1 - y0)], [x0 + 0.62 * (x1 - x0), y0 + 0.13 * (y1 - y0)]]),
        Text(Style('plant', 12), [x0 + 0.64 * (x1 - x0), y0 + 0.13 * (y1 - y0)], [-1, 0])] : []),
    ], 'legend'),
  );
  void legend;
  // the Bode plot of the open loop, with the margins (getBodePlot)
  const corners = [...TransferFunctionPoles(open), ...TransferFunctionZeros(open)].map(Abs).filter((x) => x > 1e-9);
  const wLo = 10 ** (Math.floor(Math.log10(Math.min(...corners))) - 2), wHi = 20 * Math.max(...corners);
  const pm = PhaseMargins(open).sort((a, b) => a.frequency - b.frequency).at(-1);
  const gm = GainMargins(open).sort((a, b) => a.frequency - b.frequency).at(-1);
  const head = (title, c1, c2, v1, v2) => Grid([[title, SpanFromLeft], [c1, c2], [v1, v2]], { Frame: 'All', FrameStyle: [Gray], Spacings: [0.2, 0.15] });
  const gmRow = gm ? [mmaNumberString(gm.frequency), mmaNumberString(20 * Math.log10(gm.margin))] : ['None', '∞'];
  const pmRow = pm ? [mmaNumberString(pm.frequency), mmaNumberString((180 / Math.PI) * pm.margin)] : ['None', '∞'];
  const [mag, ph] = BodePlot(open, [wLo, wHi], {
    StabilityMargins: true,
    common: { PlotStyle: [[HUE, AbsoluteThickness(1)]], ImageSize: 0.42 * W, AspectRatio: 0.6, GridLinesStyle: [GrayLevel(0.7), AbsoluteThickness(0.5)] },
    magnitude: { PlotLabel: Style(head('open loop magnitude plot', 'crossover (rad/sec)', 'margin (db)', ...gmRow), 9), label: 'Bode magnitude' },
    phase: { PlotLabel: Style(head('open loop phase plot', 'crossover (rad/sec)', 'margin (deg)', ...pmRow), 9), label: 'Bode phase' },
  });
  // the Nyquist plot of the open loop
  // the original's picture shows the curve near −1: a range of ±1.2 with the arc at infinity drawn at radius 1 (D-FC-04)
  const nyq = NyquistPlot(open, { ImageSize: 0.42 * W, InfinityRadius: 1, PlotRange: [[-1.2, 1.2], [-1.2, 1.2]], options: { PlotLabel: Style('open loop Nyquist', 11), label: 'Nyquist' } });
  // the poles in the s-plane (polesPlot)
  const pp = poles.map(([re, im]) => [re, im]);
  const plantP = TransferFunctionPoles(plant).map((z) => [Re(z), Im(z)]);
  const all = [...pp, ...(show ? plantP : [])];
  const R = [[Math.min(-1.2, 1.2 * Math.min(...all.map((p) => p[0]))), Math.max(1.2, 1.2 * Math.max(...all.map((p) => p[0])))],
    [Math.min(-1.2, 1.2 * Math.min(...all.map((p) => p[1]))), Math.max(1.2, 1.2 * Math.max(...all.map((p) => p[1])))]];
  const mark = (p, c) => Text(Style('⊗', c, 9), p);
  const polesPlot = Graphics([[GrayLevel(0.5), AbsoluteThickness(0.6), Line([[R[0][0], 0], [R[0][1], 0]]), Line([[0, R[1][0]], [0, R[1][1]]])],
    ...pp.map((p) => mark(p, Blue)), ...(show ? plantP.map((p) => mark(p, Black)) : [])], {
    PlotRange: R, Frame: true, AspectRatio: 1, ImageSize: 0.35 * W, GridLines: 'Automatic',
    GridLinesStyle: [AbsoluteThickness(0.5), Gray, AbsoluteDashing([3, 3])], UpdateFrame: true, PlotRangePadding: 0, label: 'Poles in the s-plane',
  });
  const [pn, pd] = frac(plant, true), [cn, cd] = frac(closed);
  const tfTable = Graphics([Text(Style(Grid([[Style('plant', 11), Style('closed loop', 11)], [pn, cn], [pd, cd]], { Frame: 'All', FrameStyle: [Gray], Spacings: [0.6, 0.15] }), 11), [0, 0])],
    { PlotRange: [[-1, 1], [-0.22, 0.22]], ImageSize: 0.65 * W, PlotRangePadding: 0, AspectRatio: 0.22, UpdateFrame: true });
  const tNow = s.currentTime;
  return {
    state: s,
    view: {
      currentTime: tNow, stable, poles, plantY: plantY(tNow), closedY: closedY(tNow), phaseMargin: pm ?? null, gainMargin: gm ?? null,
      closedNum: closed.num, closedDen: closed.den, bodeRange: [wLo, wHi],
    },
    graphics: [
      mechanicalSystem(plantY(tNow)), mechanicalSystem(closedY(tNow)),
      Graphics([Annotation(nyq.list, 'nyquist-plot')], nyq.options),
      tfTable,
      Graphics([Annotation(step.list, 'step-plot')], step.options),
      Graphics([Annotation(mag.list, 'bode-magnitude')], mag.options),
      Graphics([Annotation(ph.list, 'bode-phase')], ph.options),
      polesPlot,
    ],
  };
}
