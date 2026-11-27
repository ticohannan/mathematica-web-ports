// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Neil Hendren and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/batch-distillation/model.js — "Batch Distillation": one evaluation of the
// Manipulate body, the state in, { view, state, graphics } out (pure, no DOM). The original's invented equilibrium data,
// the Rayleigh equation solved for the still's composition (FindRoot of an NIntegrate), the mass balance of the
// collection flask, the body's assignments (the end of a collection, the guard against boiling dry), and its drawing:
// the still, the condenser, the thermometer and the collection flask, with an Inset at {11, 4} of the flasks set aside,
// the x–y plot or the T–x–y plot.
import {
  Graphics, Annotation, Inset, Text, Style, Row, Column, Subscript, Italic, Bold, Polygon, Line, Rectangle, Disk, Circle, Arrow,
  Arrowheads, Point, PointSize, Tooltip, EdgeForm, FaceForm, Opacity, Black, White, Red, Gray, Blue, Orange, LightBlue, Darker,
  Lighter, Thick, Thin, AbsoluteThickness, Dashed, FontSize, None, bsplinePoints,
} from '../../shared/graphics.js';
import { ParametricPlot } from '../../shared/plot.js';
import { numberFormString } from '../../shared/number-form.js';

export const initialState = () => ({
  z: 0.5, az: 1, molesToEvap: 0.1, graph: 1, inProg: false, xb: 0.5, xt: 0.7438817893939389, stage: 1,
  flasksMol: Array(10).fill(0), flasksFrac: Array(10).fill(0), evapProg: 0, boilDry: false,
});

/** eqdata[x]: the invented vapour mole fraction of B in equilibrium with liquid x (Switch[az, …]). */
export function eqdata(x, az) {
  if (az === 1) return x + 0.25 * Math.sin(Math.PI * x ** 0.8) ** 0.9;
  if (az === 2) return x ** 0.75 + 0.12 * Math.sin(2 * Math.PI * x);
  return x ** 0.9 - 0.14 * Math.sin(2 * Math.PI * x);
}
/** eqtempdata[x]: the invented boiling temperature (K). */
export function eqtempdata(x, az) {
  if (az === 1) return 379 - 29 * x - 5 * Math.sin(Math.PI * x);
  if (az === 2) return 380 - 20 * x - 15 * Math.sin(1.022 * Math.PI * x);
  return 343 + 41 * x + 20 * Math.sin(Math.PI * (x + 0.26));
}

/** The FindRoot ranges of the original's Which (the side of the azeotrope where z lies). */
export function findRootRange(az, z) {
  if (az === 1) return [0.0001, 0.9999];
  if (az === 2) return z > 0.61517 ? [0.61518, 0.9999] : [0.0001, 0.61516];
  return z > 0.45717 ? [0.45718, 0.999] : [0.0001, 0.45716];
}

/** ∫_a^b f dx by composite 5-point Gauss–Legendre (NIntegrate, AccuracyGoal and PrecisionGoal 6). */
function integrate(f, a, b, panels = 48) {
  const g = [[-0.906179845938664, 0.2369268850561891], [-0.5384693101056831, 0.4786286704993665], [0, 0.5688888888888889],
    [0.5384693101056831, 0.4786286704993665], [0.906179845938664, 0.2369268850561891]];
  const h = (b - a) / panels;
  let s = 0;
  for (let k = 0; k < panels; k++) {
    const m = a + (k + 0.5) * h;
    for (const [t, w] of g) s += w * f(m + (t * h) / 2);
  }
  return (s * h) / 2;
}

/**
 * The Rayleigh equation with zero reflux, ∫_{xbf}^{x0} dx/(eqdata(x) − x) = Log[(1 − collectedVol)/molb], solved for xbf
 * in the original's FindRoot range. FindRoot starts at x0 (the still's composition before this collection); here the
 * integral is followed from x0 in the direction its sign gives (toward smaller x where the vapour is richer in B than
 * the liquid, toward larger x where it is poorer) until it reaches the right side, and the step that crosses it is
 * bisected. It cannot pass a point where eqdata(x) = x (an azeotrope, where the integral diverges); at the end of the
 * range, as FindRoot, it stops there.
 */
export function rayleigh(x0, rhs, az, z) {
  if (Math.abs(rhs) < 1e-14) return x0;
  const [lo, hi] = findRootRange(az, z);
  const f = (u) => 1 / (eqdata(u, az) - u);
  const d = (f(x0) > 0) === (rhs > 0) ? -1 : 1; // ∫_{xbf}^{x0} f = rhs: xbf < x0 when f and rhs have one sign
  const end = d < 0 ? lo : hi;
  const h = 0.005;
  let x = x0, I = 0; // I = ∫_x^{x0} f
  while ((end - x) * d > 0) {
    const xn = (end - x) * d > h ? x + d * h : end;
    const In = I + integrate(f, xn, x, 8);
    if ((In - rhs) * (I - rhs) <= 0) { // the root is between x and xn
      let a = x, b = xn, Ia = I;
      for (let i = 0; i < 50; i++) {
        const m = (a + b) / 2, Im = Ia + integrate(f, m, a, 8);
        if ((Im - rhs) * (Ia - rhs) <= 0) b = m; else { a = m; Ia = Im; }
      }
      return (a + b) / 2;
    }
    x = xn; I = In;
  }
  return end;
}

const clip = (v, a, b) => Math.min(b, Math.max(a, v));
const sum = (xs) => xs.reduce((a, v) => a + v, 0);

/** The Module's numbers (collectedVol … T) for a state. */
export function compute(s) {
  const k = Math.min(s.stage, 10);
  const collectedVol = sum(s.flasksMol.slice(0, k));
  const collectedB = sum(s.flasksMol.slice(0, k).map((m, i) => m * s.flasksFrac[i]));
  const molt = s.evapProg * s.molesToEvap;
  const molb = 1 - collectedVol - molt;
  const x0 = s.stage > 1 ? (s.z - collectedB) / (1 - collectedVol) : s.z;
  const compb = rayleigh(x0, Math.log((1 - collectedVol) / molb), s.az, s.z);
  const compt = molt < 0.01 ? eqdata(compb, s.az) : (s.z - collectedB - compb * molb) / molt;
  const T = eqtempdata(compb, s.az) - 273.15;
  return { collectedVol, collectedB, molt, molb, compb, compt, T, y: eqdata(compb, s.az) };
}

/**
 * The body's assignments in its order — xb, xt; inProg; at evapProg = 1 the flask's mole fraction and amount are stored,
 * evapProg = 0 and stage + 1; the guard against boiling the still below 0.2 mol — repeated while they change anything
 * (the Manipulate evaluates its body again while a tracked variable changes).
 */
export function step(state) {
  const s = { ...state, flasksMol: [...state.flasksMol], flasksFrac: [...state.flasksFrac] };
  for (let pass = 0; pass < 8; pass++) {
    const before = JSON.stringify(s);
    const c = compute(s);
    s.xb = c.compb;
    s.xt = c.compt;
    s.inProg = c.molb <= 0.2 || s.stage === 9 || s.evapProg > 0;
    if (s.evapProg === 1) {
      s.flasksFrac[s.stage - 1] = s.xt;
      s.flasksMol[s.stage - 1] = clip(s.molesToEvap, 0, 1 - (s.stage > 1 ? c.collectedVol : 0));
      s.evapProg = 0;
      s.stage += 1;
    }
    if (!s.inProg && c.molb - s.molesToEvap < 0.2) { s.molesToEvap = c.molb - 0.2; s.boilDry = true; } else s.boilDry = false;
    if (JSON.stringify(s) === before) break;
  }
  return s;
}

/** The reset button: stage = 1, the flasks emptied, z = 0.5. */
export const reset = (s) => ({ ...s, stage: 1, flasksMol: Array(10).fill(0), z: 0.5, flasksFrac: Array(10).fill(0) });

// ---- the drawing (the original's Initialization) ------------------------------------------------------------------
/** FilledCurve[BSplineCurve[pts, SplineDegree -> d]] as a polygon (closed by a straight line, as FilledCurve closes it). */
const curve = (pts, d = 3) => bsplinePoints(pts, { SplineDegree: d });
const STILL = [[-0.4, 3.25], [-0.5, 3], [-1.5, 3], [-1.5, 1.5], [-1.5, 0], [0, 0], [1.5, 0], [1.5, 1.5], [1.5, 3], [0.5, 3], [0.4, 3.25]];
const GLASS = [[0.4, 6.95], [0.45, 6.95], [0.45, 7.15], [0.45, 7.25], [0.45, 7.35], [0.8, 7.05], [0.8, 7.05], [1, 7.25], [0.5, 7.65], [0.45, 7.65],
  [0.45, 7.95], [0, 7.95], [-0.45, 7.95], [-0.45, 7.65], [-0.45, 7.25], [-0.45, 6.95], [-0.35, 7], [-0.4, 3.25], [-0.4, 3.25], [-0.5, 3], [-1.5, 3],
  [-1.5, 1.5], [-1.5, 0], [0, 0], [1.5, 0], [1.5, 1.5], [1.5, 3], [0.5, 3], [0.4, 3.25]];

const columnPart1 = () => [
  FaceForm(LightBlue),
  Polygon([[1, 7.25], [1.2, 7.45], [1.33, 7.33], [1.57, 7.59], [1.83, 7.35], [1.59, 7.08], [4.45, 4.45], [3.85, 3.8], [4.25, 4.25]]),
  Polygon([[4.05, 4.05], [3.85, 3.8], [3.72, 3.92], [3.48, 3.66], [3.22, 3.9], [3.46, 4.16], [0.6, 6.8], [0.8, 7.05]]),
  EdgeForm(Black), FaceForm(Lighter(Orange, 0.7)), Annotation(Polygon(curve(STILL, 2)), 'still-liquid'),
];

/** columnPart2[lvl]: white above the liquid (lvl mol, 2.4 lvl high) and the liquid's surface. */
const columnPart2 = (lvl) => {
  const k = Math.sin((Math.PI / 0.5) * clip(lvl, 0, 0.25)) ** 0.8;
  return [
    EdgeForm(), FaceForm(White), Rectangle([-1.55, 2.4 * lvl], [1.55, 3.5]),
    EdgeForm(Black), FaceForm(Lighter(Orange, 0.6)), Annotation(Disk([0, 2.4 * lvl], [1 + 0.5 * k, 0.12 * k]), 'still-surface'),
  ];
};

/** columnPart3: the glass (FaceForm[{Opacity[0.1], Orange}] with a black edge), the condenser, the coolant arrows. */
const columnPart3 = () => {
  const glass = curve(GLASS, 2);
  return [
    [EdgeForm(), FaceForm(Orange), Opacity(0.1), Polygon(glass)], [Black, Line([...glass, glass[0]])],
    Line([[1.83, 7.35], [1.59, 7.08], [4.45, 4.45], [3.85, 3.8], [3.72, 3.92], [3.48, 3.66]]),
    Line([[3.22, 3.9], [3.46, 4.16], [0.6, 6.8], [1.2, 7.45], [1.33, 7.33], [1.57, 7.59]]),
    EdgeForm(), FaceForm(Lighter(Orange, 0.9)), Polygon([[4.73, 3.75], [4.375, 3.75], [0.44, 7.33], [0.47, 7.73]]),
    Polygon([[4.73, 3.55], [4.73, 3.75], [1, 7.25], [0.8, 7.05], [4.59, 3.55]]),
    Line([[4.73, 3.55], [4.73, 3.75], [0.47, 7.73]]), Line([[0.44, 7.33], [4.59, 3.55]]),
    Black, Arrowheads(0.02), Arrow([[2.3, 8.12], [1.7, 7.47]]), Arrow([[3.35, 3.78], [2.75, 3.13]]),
    Annotation(Text(Style('coolant', 16), [2.4, 8.22], [-1, 0]), 'label-coolant'),
  ];
};

const COIL_PTS = Array.from({ length: 341 }, (_, i) => [-1.7 + 0.01 * i + 0.1 * Math.sin((Math.PI / 10) * i), -0.35 + 0.2 * Math.cos((Math.PI / 10) * i)]);
const COIL_CURVE = bsplinePoints(COIL_PTS, { SplineDegree: 2 }, 3);
const coil = () => [
  EdgeForm(AbsoluteThickness(1)), FaceForm(Lighter(Red, 0.8)), Rectangle([-1.7, -0.65], [1.7, -0.05]), Black, Line(COIL_CURVE),
];

/** thermometer[t]: the tube, the bulb and the red column 7.25 + (t − 80.7)/30 × 1.25 high. */
const thermometer = (t) => [
  EdgeForm(Thick, Black), FaceForm(None), Rectangle([-1.13, 7], [-0.87, 8.5], { RoundingRadius: 0.13 }),
  FaceForm(Red), Disk([-1, 7], 0.25), Thick, Black, Circle([-1, 7], 0.25, [(1.25 * Math.PI) / 2, (4.75 * Math.PI) / 2]),
  Red, EdgeForm(), Annotation(Rectangle([-1.1, 7], [-0.9, 7.25 + ((t - 80.7) / 30) * 1.25]), 'thermometer-column'),
];

const FLASK_SHAPE = [[2.5, 0.6], [3.7, 0.6], [3.8, 0.7], [3.7, 0.9], [2.7, 2.5], [2.7, 2.6], [2.7, 2.8], [2.7, 2.85], [2.75, 2.85], [2.8, 2.9], [2.75, 2.95],
  [2.7, 2.95], [2.5, 2.95], [2.3, 2.95], [2.25, 2.95], [2.2, 2.9], [2.25, 2.85], [2.3, 2.85], [2.3, 2.8], [2.3, 2.6], [2.3, 2.5], [1.3, 0.9], [1.2, 0.7],
  [1.3, 0.6], [2.5, 0.6]];
const mod = (a, n) => ((a % n) + n) % n;
export const modfuncy = (n) => (n === 0 ? 0 : -6.5 + 2 * mod(9 - n, 9) + 2 * mod(n + 1, 2));
export const modfuncx = (n) => (n === 0 ? 0 : 5 + 6.8 * mod(n + 1, 2));
/** flask[n, lvl]: the collection flask (n = 0) or the n-th flask set aside, holding lvl mol. */
export function flask(n, lvl) {
  const mx = modfuncx(n), my = modfuncy(n);
  const outline = curve(FLASK_SHAPE.map(([x, y]) => [x + 2.15 + mx, y + 0.4 + my]));
  const k = Math.sin((Math.PI / 0.2) * clip(lvl * 3.75, 0, 0.1)) ** 0.8;
  return [
    EdgeForm(), FaceForm(Lighter(Orange, 0.7)), Polygon(outline),
    FaceForm(White), Rectangle([3.35 + mx, 1 + 6 * lvl + my], [5.95 + mx, 3.4 + my]),
    Black, Line(outline),
    FaceForm(Lighter(Orange, 0.7)), EdgeForm(Black),
    Disk([4.65 + mx, 1 + 6 * lvl + my], [-0.3 * 3.75 * lvl + (0.25 - lvl) * 2.52 + 0.7 * k, 0.02 * k]),
  ];
}

export const superScript = (j) => (j === 1 ? 'st' : j === 2 ? 'nd' : j === 3 ? 'rd' : 'th');
const sub = (a, b) => Subscript(Style(a, Italic), b);
const nf = (x, spec) => numberFormString(x, spec, { minus: '−' });

/** The flasks set aside (graph = 1): the inset's Graphics, PlotRange {{7.7, 22}, {−2, 13}}, 300 × 340 px. */
function flasksGraphic(s) {
  const out = [];
  for (let j = 2; j <= s.stage; j++) {
    const mol = s.flasksMol[j - 2], frac = clip(s.flasksFrac[j - 2], 0, 0.99);
    const m = mod(j, 2), m1 = m === 0 ? 2 : 1; // Mod[j, 2] and Mod[j, 2, 1]
    out.push([
      Annotation(Tooltip(flask(j - 1, mol), `${j - 1}${superScript(j - 1)} flask of liquid collected`), `flask-${j - 1}`),
      Black, FontSize(16),
      Annotation(Text(Column([Row([nf(mol, [5, mol > 0 && mol < 0.01 ? 4 : 2]), ' mol']), Row([sub('x', `B, ${j - 1}`), ' = ', nf(frac, [5, 2])])]),
        [11.3 + 6.8 * m, 19.8 - 2 * j - 2 * m1], [-1, 0]), `flask-label-${j - 1}`),
      Bold, Annotation(Text(Style(Row([' ', String(j - 1), ' ']), { Background: White }), [9.7 + 6.8 * m, 19.5 - 2 * j - 2 * m1]), `flask-number-${j - 1}`),
    ]);
  }
  return Graphics(out, { PlotRange: [[7.7, 22], [-2, 13]], PlotRangePadding: 0, AspectRatio: FULL, ImageSize: [300, 340] });
}

/**
 * AspectRatio -> Full in an inset of ImageSize {300, 340}: the picture fills the box. The layer's insets take a numeric
 * AspectRatio (height/width of the plot range's box), 340/300 here.
 */
const FULL = 340 / 300;
const xOfT = (t) => (t - 353) / 31;
/** The x–y plot (graph = 2): Show[eqplot, the diagonal, Frame, …]. */
function xyPlot(s, c) {
  return ParametricPlot((t) => [xOfT(t), eqdata(xOfT(t), s.az)], [353, 384], {
    PlotStyle: [Thick, Darker(Blue)], Frame: true, FrameLabel: [sub('x', 'B, still'), sub('y', 'B')], LabelStyle: [17, Black],
    AxesOrigin: [0, 0], PlotRange: [[0.01, 1], [0, 1]], ImageSize: [300, 340], AspectRatio: FULL,
    Prolog: [[Thin, Dashed, Opacity(0.5), Black, Annotation(Line([[0, 0], [1, 1]]), 'diagonal')]],
    Epilog: [PointSize(0.035), Annotation(Point([c.compb, c.y]), 'xy-point')],
  });
}
/** The T–x–y plot (graph = 3): bubble-point and dew-point lines, the two points and their labels. */
function txyPlot(s, c) {
  const vapColor = Darker(Blue), liqColor = Gray;
  const liq = [0.05 + 0.9 * c.compb, s.az === 1 ? c.T + 1.5 : c.T - 1.5];
  const vap = [0.05 + 0.9 * c.y, s.az === 1 ? c.T - 1.5 : c.T + 1.5];
  const yr = { 1: [349 - 273, 380 - 273], 2: [352 - 273, 381 - 273], 3: [355 - 273, 379 - 273] }[s.az];
  return ParametricPlot((t) => [[xOfT(t), eqtempdata(xOfT(t), s.az) - 273.15], [eqdata(xOfT(t), s.az), eqtempdata(xOfT(t), s.az) - 273.15]], [353, 384], {
    PlotStyle: [[Thick, Darker(Blue)], [Thin, Black, Opacity(0.7), Dashed]], Frame: true,
    FrameLabel: [Row(['mole fraction ', Style('B', Italic)]), 'temperature (°C)'], LabelStyle: [17, Black],
    PlotRange: [[0, 1], yr], ImageSize: [300, 340], AspectRatio: FULL,
    Epilog: [PointSize(0.035), vapColor, Annotation(Point([c.compb, c.T]), 'bubble-point'), liqColor, Annotation(Point([c.y, c.T]), 'dew-point'),
      FontSize(15), vapColor, Annotation(Text(Style(sub('x', 'B, still'), { Background: White }), liq), 'label-xB'),
      liqColor, Annotation(Text(Style(sub('y', 'B'), { Background: White }), vap), 'label-yB')],
  });
}

export function evaluate(state) {
  const s = step(state);
  const c = compute(s);
  const shown = c.molb + c.molt > 0.2;
  const yText = `The mol fraction of B in the vapor is ${nf(c.y, [3, 2])}.`;
  const tText = `The liquid and vapor are in equilibrium at ${nf(c.T, [4, 1])} °C.`;
  const column = [
    columnPart1(), columnPart2(c.molb), columnPart3(),
    Annotation(Tooltip(coil(), 'This electrical heating coil heats\nthe liquid in the still.'), 'coil'),
    Annotation(Tooltip(flask(0, c.molt), 'The distillate collection flask will be\nset aside after collecting some distillate.'), 'receiver'),
    Annotation(Tooltip(thermometer(c.T), tText), 'thermometer'),
    [FontSize(16), Annotation(Tooltip(Text(Column([Row([sub('x', 'B, still'), ' = ', nf(c.compb, [3, 2])]), Row([nf(c.molb, [5, 2]), ' mol'])]), [0, 1]),
      `The mol fraction of B in the liquid is ${nf(c.compb, [3, 2])}.`), 'label-still')],
    [FontSize(16), Annotation(Tooltip(Text(Column(shown
      ? [Row([sub('x', Row(['B, ', String(s.stage)])), ' = ', nf(clip(c.compt, 0, 0.99), [3, 2])]), Row([nf(c.molt, [5, 2]), ' mol'])] : ['', '']), [4.9, 0]),
    'The composition of the distillate depends on\nthe mole fraction in the still and the amount collected.'), 'label-receiver')],
    [FontSize(16), Annotation(Tooltip(Text(shown ? Row([sub('y', 'B'), ' = ', nf(c.y, [3, 2])]) : '', [-0.8, 5.5], [1, 0]), yText), 'label-vapor')],
    [FontSize(17), Annotation(Tooltip(Text(Row([nf(c.T, [7, 1]), '° C']), [0.35, 8.35]), tText), 'label-T')],
    [Opacity(0), Tooltip(Rectangle([-0.45, 4], [0.45, 7]), yText)],
    ...(shown ? [[Black, Arrowheads(0.02), Annotation(Arrow([[-0.75, 5.5], [0.05, 5.7]]), 'arrow-vapor')]] : []),
  ];
  const inset = s.graph === 1 ? flasksGraphic(s) : s.graph === 2 ? xyPlot(s, c) : txyPlot(s, c);
  const graphics = Graphics([column, Annotation(Inset(inset, [11, 4]), `inset-${s.graph}`)],
    { PlotRange: [[-3, 16], [-0.8, 9]], ImageSize: [600, 340], AspectRatio: 'Full' });
  const view = {
    stage: s.stage, molb: c.molb, molt: c.molt, xStill: c.compb, xFlask: c.compt, yVapor: c.y, T: c.T, inProg: s.inProg, boilDry: s.boilDry,
    labels: {
      T: `${nf(c.T, [7, 1])}° C`, still: nf(c.compb, [3, 2]), stillMol: `${nf(c.molb, [5, 2])} mol`,
      vapor: shown ? nf(c.y, [3, 2]) : '', receiver: shown ? nf(clip(c.compt, 0, 0.99), [3, 2]) : '', receiverMol: shown ? `${nf(c.molt, [5, 2])} mol` : '',
    },
  };
  return { view, state: s, graphics };
}
