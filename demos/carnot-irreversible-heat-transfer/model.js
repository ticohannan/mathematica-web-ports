// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann, Megan Maguire and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/carnot-irreversible-heat-transfer/model.js — "Carnot Cycles with Irreversible Heat Transfer": one evaluation of
// the Manipulate body, the state in, { view, graphics } out (pure, no DOM). Simple mode: the original's Module in plain
// arithmetic; the picture is the original's two Graphics (cycle and labels) shown together.
import {
  Annotation, Text, Style, Row, Subscript, Italic, Circle, Arrow, Arrowheads, Line, Rectangle, Thick, Blue, Black, White,
  RGBColor, EdgeForm, LightRed, LightGreen, LightBlue,
} from '../../shared/graphics.js';
import { numberFormString } from '../../shared/number-form.js';
import { isCorrected } from '../../shared/errata.js';

export const initialState = () => ({ csb: 1, 'ΔT1': 10, 'ΔT2': 12 });

/** LightYellow = RGBColor[1, 1, 0.85] (the Wolfram Language documentation). */
export const LightYellow = RGBColor(1, 1, 0.85);
/** RGBColor[0, .6, 0]: the green of the two vertical (adiabatic) strokes of the cycle. */
export const GREEN = RGBColor(0, 0.6, 0);

/**
 * The Module's numbers, in the original's order: Th = If[csb == 1, 500, 325], Tc = 275; the engine's (pump's)
 * temperatures TH = Th ∓ ΔT1, TC = Tc ± ΔT2; the heats QH, QC (the engine keeps QH = −1250 J, the pump QC = −600 J);
 * η = (TH − TC)/TH, COP = TC/(TH − TC); W = η QH (engine) or −QC/COP (pump); ΔSh = QH/Th, ΔSc = QC/Tc.
 */
export function cycle({ csb, 'ΔT1': dT1, 'ΔT2': dT2 }) {
  const engine = csb === 1;
  const Th = engine ? 500 : 325, Tc = 275;
  const TH = Th + (engine ? -dT1 : dT1);
  const TC = Tc + (engine ? dT2 : -dT2);
  // QH = If[csb == 1, -1250, -QC*TH/TC]; QC = If[csb == 1, -QH*TC/TH, -600]: the two refer to each other, and the
  // Module's symbolic evaluation resolves them in this order
  const QC = engine ? (1250 * TC) / TH : -600;
  const QH = engine ? -1250 : (-QC * TH) / TC;
  const eta = (TH - TC) / TH, COP = TC / (TH - TC);
  const W = engine ? eta * QH : -QC / COP;
  const dSh = QH / Th, dSc = QC / Tc;
  return { engine, Th, Tc, TH, TC, QH, QC, eta, COP, W, dSh, dSc, dStotal: dSh + dSc };
}

const fmt = (x, spec) => numberFormString(x, spec, { minus: '−' });
const T = (sub) => Subscript(Style('T', Italic), sub);

/** Arrowheads[{0, 0.03, 0.03, 0.03}] (engine, Abs) or {−0.03, −0.03, −0.03, 0} (pump, Reverse): heads at the fractions
 *  0, 1/3, 2/3 and 1 of each stroke; the layer draws such lists at the ends only, so the places are given (D-CI-02). */
const strokeHeads = (engine) => Arrowheads(engine
  ? [[0.03, 1 / 3], [0.03, 2 / 3], [0.03, 1]]
  : [[-0.03, 0], [-0.03, 1 / 3], [-0.03, 2 / 3]]);

export function evaluate(state) {
  const c = cycle(state);
  // E-CI-01: the original's COP is the refrigerator's TC/(TH − TC); corrected, the heat pump's TH/(TH − TC) (W unchanged)
  c.COPshown = isCorrected(state) ? c.TH / (c.TH - c.TC) : c.COP;
  const s3 = Math.sqrt(3);
  const cycleG = [
    Annotation(Circle([0, 0], 2), 'cycle-circle'),
    Annotation([Thick, strokeHeads(c.engine),
      Blue, Arrow([[-s3, 1], [s3, 1]]), Arrow([[s3, -1], [-s3, -1]]),
      GREEN, Arrow([[s3, 1], [s3, -1]]), Arrow([[-s3, -1], [-s3, 1]])], 'cycle-strokes'),
    Arrowheads(c.engine ? [0, 0.05] : [-0.05, 0]),
    Annotation(Arrow([[2, 0], [5, 0]]), 'arrow-work'),
    Annotation(Arrow([[0, 5], [0, 2]]), 'arrow-hot'),
    Annotation(Arrow([[0, -2], [0, -5]]), 'arrow-cold'),
    Annotation(Line([[-5, 5], [5, 5]]), 'hot-reservoir'),
    Annotation(Line([[-5, -5], [5, -5]]), 'cold-reservoir'),
    [EdgeForm(Black),
      c.engine ? LightRed : LightGreen, Annotation(Rectangle([5.10, -0.5], [8.95, 0.5]), 'box-work'),
      White, Annotation(Rectangle([-5.65, -0.5], [-2.45, 0.5]), 'box-performance'),
      LightBlue, Annotation(Rectangle([-6.25, -2.5], [-1.75, -1.5]), 'box-total'),
      LightYellow, Annotation(Rectangle([-6.25, 3.5], [-1.75, 4.5]), 'box-dSh'),
      Annotation(Rectangle([-6.25, -3.5], [-1.75, -4.5]), 'box-dSc'),
      Annotation(Rectangle([1.65, 1.75], [6.35, 2.75]), 'box-QH'),
      Annotation(Rectangle([1.65, -1.75], [6.35, -2.75]), 'box-QC')],
  ];
  const big = (e) => Style(e, 18);
  const texts = {
    perf: c.engine ? Row([Style('η', Italic), ' = ', fmt(c.eta, 2)]) : Row([Style('COP', Italic), ' = ', fmt(c.COPshown, 2)]),
    W: Row([Subscript(Style('W', Italic), 'S'), ' = ', fmt(c.W, [4, 0]), ' J']),
  };
  const temps = [['h', c.Th, [0, 5], [0, -1]], ['c', c.Tc, [0, -5], [0, 1]], ['H', c.TH, [3.75, 1], [0, 0]], ['C', c.TC, [3.75, -1], [0, 0]]];
  const heats = [['h', c.QH, [5, 5], [1, -1]], ['c', c.QC, [5, -5], [1, 1]], ['H', -c.QH, [4, 2.25], [0, 0]], ['C', -c.QC, [4, -2.25], [0, 0]]];
  const entropies = [['h', c.dSh, 4], ['c', c.dSc, -4], ['total', c.dStotal, -2]];
  const labelsG = [
    Annotation(Text(big('hot reservoir'), [-5, 5], [-1, -1]), 'label-hot'),
    Annotation(Text(big('cold reservoir'), [-5, -5], [-1, 1]), 'label-cold'),
    Annotation(Text(big(texts.W), [7, 0]), 'label-W'),
    Annotation(Text(big(texts.perf), [-4, 0]), 'label-performance'),
    ...temps.map(([s, v, p, o]) => Annotation(Text(big(Row([T(s), ' = ', String(v), ' K'])), p, o), `label-T${s}`)),
    ...heats.map(([s, v, p, o]) => Annotation(Text(big(Row([Subscript(Style('Q', Italic), s), ' = ', fmt(v, [4, 0]), ' J'])), p, o), `label-Q${s}`)),
    ...entropies.map(([s, v, y]) => Annotation(Text(big(Row(['Δ', Subscript(Style('S', Italic), s), ' = ', fmt(v, [3, 2]), ' J/K'])), [-4, y]), `label-dS${s}`)),
  ];
  const view = {
    ...c,
    corrected: isCorrected(state),
    labels: {
      performance: c.engine ? `η = ${fmt(c.eta, 2)}` : `COP = ${fmt(c.COPshown, 2)}`,
      W: fmt(c.W, [4, 0]),
      Qh: fmt(c.QH, [4, 0]), Qc: fmt(c.QC, [4, 0]), QH: fmt(-c.QH, [4, 0]), QC: fmt(-c.QC, [4, 0]),
      dSh: fmt(c.dSh, [3, 2]), dSc: fmt(c.dSc, [3, 2]), dStotal: fmt(c.dStotal, [3, 2]),
    },
  };
  return { view, graphics: [...cycleG, ...labelsG] };
}
