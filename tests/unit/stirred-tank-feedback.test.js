// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by R. Ricardo Sánchez
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/stirred-tank-feedback.test.js — the model of "Feedback Control in a Stirred-Tank Reactor". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/stirred-tank-feedback-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, solve } from '../../demos/stirred-tank-feedback/model.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/stirred-tank-feedback.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

/** An independent fixed-step RK4 of the four equations (h = 0.0005 h). */
function rk4(s, corrected, until) {
  let y = [20, 1, 15, 0], t = 0; const h = 0.0005;
  const f = (t, [TR, Q, Ts, I]) => { const T0 = t < 120 ? s.inletT : s.pertur, e = 80 - (corrected ? Ts : TR), Qc = Math.max(0, s.Q0 + s.Kp * e + (s.Kp / s.τI) * I);
    return [(s.Flu / 100) * (T0 - TR) + Q / 100, Qc - Q, (TR - Ts) / 2, e]; };
  while (t < until - 1e-12) {
    const k1 = f(t, y), k2 = f(t + h / 2, y.map((v, i) => v + (h / 2) * k1[i])), k3 = f(t + h / 2, y.map((v, i) => v + (h / 2) * k2[i])), k4 = f(t + h, y.map((v, i) => v + h * k3[i]));
    y = y.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); t += h;
  }
  return y;
}
describe('stirred-tank-feedback model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it('NDSolve agrees with an independent RK4 (t = 50 h)', () => {
    const { sol } = solve(initialState());
    rk4(initialState(), false, 50).forEach((v, i) => expect(sol(50)[i]).toBeCloseTo(v, 6));
  });
  it('the disturbance at 120 h: T0 jumps from the inlet temperature to the disturbance', () => {
    const { T0 } = solve(snap('3'));
    expect(T0(119.999)).toBe(11.5); expect(T0(120)).toBe(60);
  });
  it('snapshot 4: without control (Kp = 0) the heat input is Q0 and the tank warms slowly', () => {
    const { Qc, sol } = solve(snap('4'));
    expect(Qc(50)).toBe(100); expect(sol(119)[0]).toBeGreaterThan(50); expect(sol(119)[0]).toBeLessThan(56);
  });
  it('snapshot 1: Tr overshoots to about 105 °C', () => {
    const { sol } = solve(snap('1'));
    let peak = 0; for (let t = 0; t < 40; t += 0.05) peak = Math.max(peak, sol(t)[0]);
    expect(peak).toBeGreaterThan(102); expect(peak).toBeLessThan(108);
  });
});

describe('corrected mode (E-ST)', () => {
  it('E-ST-01: the controller acts on the sensor; agrees with the RK4 at t = 50 h', () => {
    const { sol } = solve(initialState(), true);
    expect(sol(50)[0]).toBeCloseTo(rk4(initialState(), true, 50)[0], 6);
    expect(evaluate({ ...initialState(), errata: 'corrected' }).view.at50.TR).toBeCloseTo(59.9119, 3);
  });
});
