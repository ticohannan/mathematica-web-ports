// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by R. Ricardo Sánchez
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/stirred-tank-feedback/model.js — "Feedback Control in a Stirred-Tank Reactor": one evaluation of the
// Manipulate body, the state in, { view, graphics } out (pure, no DOM). Simple mode: shared/ode.js NDSolve (a breakpoint
// at the disturbance, t = 120 h), shared/plot.js Plot with PlotTheme -> "Detailed".
import { Graphics, Annotation, Style, Row, Subscript, Italic, Red, Blue, Black, Green, RGBColor } from '../../shared/graphics.js';
import { Plot } from '../../shared/plot.js';
import { NDSolve } from '../../shared/ode.js';
import { isCorrected } from '../../shared/errata.js';

export const initialState = () => ({ Kp: 10, τI: 4, Q0: 100, inletT: 20, pertur: 40, Flu: 3 });
const MAGENTA = RGBColor(1, 0, 1);

/**
 * The Module: ρc = 1, Cpc = 1, Tset = 80, Vr = 100, τQ = 1, τsens = 2; Qc = Max[0, Q0 + Kp εrr + (Kp/τI) Int] with
 * εrr = Tset − TR (the original; the corrected mode, E-ST-01: Tset − Tsens, the measured temperature);
 * T0 = inletT before t = 120 h, pertur from then on. State y = [TR, Q, Tsens, Int].
 */
export function solve({ Kp, τI, Q0, inletT, pertur, Flu }, corrected = false) {
  const ρc = 1, Cpc = 1, Tset = 80, Vr = 100, τQ = 1, τsens = 2;
  const T0 = (t) => (t < 120 ? inletT : pertur);
  const err = ([TR, , Tsens]) => Tset - (corrected ? Tsens : TR);
  const Qc = (y) => Math.max(0, Q0 + Kp * err(y) + (Kp / τI) * y[3]);
  const sol = NDSolve((t, y) => {
    const [TR, Q, Tsens] = y;
    return [(Flu / Vr) * (T0(t) - TR) + Q / (Vr * ρc * Cpc), (Qc(y) - Q) / τQ, (TR - Tsens) / τsens, err(y)];
  }, [20, 1, 15, 0], [0, 200], { breakpoints: [120] });
  return { sol, T0, Tset, Qc: (t) => Qc(sol(t)) };
}

const T = (sub) => Subscript(Style('T', Italic), sub);
/** The Manipulate body: Multicolumn[{the temperatures, the heat input}, 1]. */
export function evaluate(state) {
  const corrected = isCorrected(state);
  const { sol, T0, Tset, Qc } = solve(state, corrected);
  const common = { Frame: true, LabelStyle: [Black, 14], FrameTicksStyle: 10, PlotTheme: 'Detailed', ImageSize: 337.5, AspectRatio: 2 / 3 };
  const temps = Plot([(t) => sol(t)[0], (t) => sol(t)[2], T0, () => Tset], [0, 200], {
    ...common, PlotRange: [10, 110], PlotStyle: [Red, Blue, Black, Green], FrameLabel: ['time (h)', 'temperature (°C)'],
    PlotLegends: [T('r'), T('sens'), Subscript('T', '0'), T('set')], label: 'Temperatures',
  });
  const heat = Plot(Qc, [0, 200], {
    ...common, PlotStyle: MAGENTA, PlotRange: [-10, 1100],
    FrameLabel: ['time (h)', Row([Subscript(Style('Q', Italic), 'c'), ' (kJ/h)'])], PlotLegends: [Subscript(Style('Q', Italic), 'c')],
    label: 'Heat input of the controller',
  });
  const at = (t) => { const y = sol(t); return { TR: y[0], Q: y[1], Tsens: y[2], Int: y[3], Qc: Qc(t) }; };
  return {
    view: { at50: at(50), at119: at(119), at200: at(200), corrected },
    graphics: [Graphics([Annotation(temps.list, 'temperature-plot')], temps.options), Graphics([Annotation(heat.list, 'heat-plot')], heat.options)],
  };
}
