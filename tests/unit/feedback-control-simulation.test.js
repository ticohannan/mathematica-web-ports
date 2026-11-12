// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Nasser M. Abbasi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/feedback-control-simulation.test.js — the model of "Simulation of Feedback Control System with Controller and Second-Order Plant". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/feedback-control-simulation-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, plantTF, closedLoopTF, openLoopTF, stepResponse, sortedPoles, poleText, rugo, paddedY } from '../../demos/feedback-control-simulation/model.js';
import { BodeData, PhaseMargins, GainMargins } from '../../shared/control.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/feedback-control-simulation.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

// the original's own plots, saved in the notebook: lines of points
const lines = (e, out = []) => { if (Array.isArray(e)) e.forEach((a) => lines(a, out)); else if (e && typeof e === 'object') { if (e.head === 'Line' && Array.isArray(e.args?.[0]?.[0])) out.push(e.args[0]); (e.args ?? []).forEach((a) => lines(a, out)); } return out; };
describe('feedback-control-simulation model', () => {
  it('the opening state (the Manipulate’s variables)', () => {
    const sp = numbersOf(fx.specs);
    for (const [k, v] of Object.entries(initialState())) expect(sp[k], k).toEqual(v);
  });
  it('the transfer functions of the snapshot table: plant 1/(s² + 1.54 s + 1), closed loop (0.697 s² + 10 s + 3.73)/(s³ + 2.237 s² + 11 s + 3.73)', () => {
    expect(plantTF(initialState()).den).toEqual([1, 1.54, 1]);
    const T = closedLoopTF(initialState());
    expect(T.num).toEqual([3.73, 10, 0.697]); expect(T.den.map((x) => +x.toFixed(12))).toEqual([3.73, 11, 2.237, 1]);
  });
  it('the closed-loop poles as listed under the s-plane picture', () => {
    expect(sortedPoles(closedLoopTF(initialState())).map(poleText)).toEqual(['-0.937822 - 3.0729 i', '-0.937822 + 3.0729 i', '-0.361356']);
  });
  it('the step responses agree with the original’s saved curves (858 and 780 points)', () => {
    const [cl, pl] = lines(fx.specs.stepResponsePlot).filter((l) => l.length > 100);
    const yc = stepResponse(closedLoopTF(initialState())), yp = stepResponse(plantTF(initialState()));
    for (const [t, y] of cl) expect(yc(t)).toBeCloseTo(y, 5);
    for (const [t, y] of pl) expect(yp(t)).toBeCloseTo(y, 5);
  });
  it('the Bode plot agrees with the original’s saved curves, and the phase margin line 3.13293 rad/s, 34.3638°', () => {
    const L = openLoopTF(initialState());
    const [mag, ph, pmLine] = [0, 1].flatMap((i) => lines(fx.specs.bodePlot[i]));
    for (const [x, y] of mag) expect(BodeData(L, 10 ** x).magnitudeDB).toBeCloseTo(y, 3);
    for (const [x, y] of ph) expect(BodeData(L, 10 ** x).phaseDegrees).toBeCloseTo(y, 3);
    const [pm] = PhaseMargins(L);
    expect(Math.log10(pm.frequency)).toBeCloseTo(pmLine[0][0], 6); expect(pmLine[0][1]).toBeCloseTo(-180 + (pm.margin * 180) / Math.PI, 3);
    expect(GainMargins(L)).toEqual([]);
    expect(evaluate(initialState()).view.bodeRange[1]).toBeCloseTo(10 ** mag.at(-1)[0], 3); // 20 × the largest corner frequency (D-FC-03)
  });
  it('run: the time advances by delta per evaluation up to the simulation time', () => {
    let s = { ...initialState(), doSimulation: true };
    for (let i = 0; i < 3; i++) s = evaluate(s).state;
    expect(s.currentTime).toBeCloseTo(0.6, 12);
    expect(evaluate({ ...s, currentTime: 19.9 }).state.currentTime).toBe(20);
  });
  it('the mechanical picture: Árpád Kósa’s spring and the padded displacement', () => {
    const z = rugo(0, 0.3, 1.7, 0.3);
    expect(z[0]).toEqual([0, 0.3]); expect(z.at(-1)).toEqual([1.7, 0.3]); expect(z).toHaveLength(13);
    expect(paddedY(0)).toBe('000000'); expect(paddedY(0.5)).toBe('0.500000');
  });
});
