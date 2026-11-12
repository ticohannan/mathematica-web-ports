// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Jeff Bryant and Housam Binous
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/proportional-temperature-control/model.js — "Proportional Temperature Control": one evaluation of the
// Manipulate body, the state in, { view, graphics } out (pure, no DOM). Simple mode: shared/ode.js NDSolve,
// shared/plot.js Plot.
import { Graphics, Annotation, Style, Row, Column, GrayLevel, Superscript } from '../../shared/graphics.js';
import { Plot } from '../../shared/plot.js';
import { NDSolve } from '../../shared/ode.js';
import { isCorrected } from '../../shared/errata.js';

export const initialState = () => ({ V: 100, F: 10, Q0: 2500, TRset: 80, T0: 20 });

/** NDSolve[{V ρ cp TR' == F ρ cp (T0 − TR) + Q, Q' == (QC − Q)/τQ, Tsens' == (TR − Tsens)/τsens, …}, {t, 0, 150}]. */
export function solve({ V, F, Q0, TRset, T0 }) {
  const rho = 1, cp = 4.19, Kp = 300, TauSens = 2, TauQ = 1;
  const QC = (Tsens) => Math.max(0, Q0 + Kp * (TRset - Tsens));
  // y = [TR, Q, Tsens]
  return NDSolve((t, [TR, Q, Tsens]) => [
    (F * rho * cp * (T0 - TR) + Q) / (V * rho * cp),
    (QC(Tsens) - Q) / TauQ,
    (TR - Tsens) / TauSens,
  ], [T0, 2500, T0], [0, 150]);
}

/** The Manipulate body. */
export function evaluate(state) {
  const { V, F, Q0, TRset, T0 } = state;
  const corrected = isCorrected(state);
  const sol = solve(state);
  // E-PT-01: the model's ρ = 1 with cp = 4.19 kJ/(kg °C) is water in kg per litre, so the volumes are litres
  const vol = corrected ? ' L' : Row([' m', Superscript('', '3')]);
  const flow = corrected ? ' L/h' : Row([' m', Superscript('', '3'), '/h']);
  const sep = Style('    |    ', GrayLevel(0.5));
  const label = Column([
    Row([Row([`volume = ${V}`, vol]), sep, Row([`water flow = ${F}`, flow]), sep, `heat input = ${Q0} kJ/h`]),
    Row([`outlet temperature = ${TRset} C`, sep, `initial tank temperature = ${T0} C`]),
  ]);
  // PlotRange -> All with AxesOrigin -> {0, 0}: the range reaches down to the origin (all four snapshots start at 0)
  let lo = 0, hi = -Infinity;
  for (let k = 0; k <= 1500; k++) { const y = sol(k / 10); lo = Math.min(lo, y[0], y[2]); hi = Math.max(hi, y[0], y[2]); }
  const plot = Plot([(t) => sol(t)[2], (t) => sol(t)[0]], [0, 150], {
    PlotRange: [[0, 150], [lo, hi]], PlotRangePadding: [0.02, 0.04], ImageSize: 500, AspectRatio: (350 - 85) / (500 - 95), ImagePadding: [[50, 45], [35, 50]],
    Frame: [true, true, false, false], FrameLabel: ['time (hours)', 'temperature C'], PlotLabel: Style(label, 12),
    AxesOrigin: [0, 0], label: 'Sensor and tank temperatures',
  });
  const end = sol(150);
  return {
    view: { TR150: end[0], Q150: end[1], Tsens150: end[2], steps: sol.steps, corrected },
    graphics: Graphics([Annotation(plot.list, 'temperature-plot')], plot.options),
  };
}
