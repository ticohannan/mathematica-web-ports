// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mable Wan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/time-shifting-scaling.test.js — the model of "Time Shifting and Time Scaling in Signal Processing".
// Expected values derived by hand from the notebook's definitions and its saved states.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { initialState, evaluate, couple, SIGNALS, SIGNAL_NAMES, UHsignal, orderOf, B_COLOR } from '../../demos/time-shifting-scaling/model.js';
import { annotation, Cases } from '../../shared/graphics.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/time-shifting-scaling.original-states.json', 'utf8'));
const lines = (g, id) => Cases(annotation(g, id).g, 'Line');

describe('time-shifting-scaling model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual({ signal: 'RampDown', β: 4, α: 2, τ: 2, bOld: 0, aOld: 0, TOld: 0, checked: [1, 2] });
    // after the evaluations the hidden variables hold the values of the saved snapshots (bOld 4, aOld 2, TOld 2.)
    const { state } = evaluate(initialState());
    expect(state).toEqual({ ...fx.snapshots['1'], τ: 2, TOld: 2 });
  });
  it('the five signals', () => {
    expect(SIGNAL_NAMES).toEqual(['RampDown', 'TopHat', 'StairStep', 'Triangle', 'UH']);
    expect(SIGNALS.TopHat).toEqual({ T: [-10000, 0, 1, 3, 4, 10000], X: [0, 1, 4, 1, 0, 0] });
    expect(SIGNALS.UH.T).toHaveLength(66); // −10000, 0, 1/9, …, 7, 10000
    expect(SIGNALS.UH.T[64]).toBeCloseTo(7, 14);
    // UHsignal at the sampled times with f = (−1)^n: the strokes of U and H
    expect(SIGNALS.UH.X.slice(0, 4)).toEqual([0, 4, 1, 4]);
    expect(UHsignal(1.5, 1)).toBe(1.5);
    expect(UHsignal(5.5, -1)).toBe(2.25);
    expect(UHsignal(3.5, 1)).toBe(0);
    expect(['RampDown', 'TopHat', 'StairStep', 'Triangle', 'UH'].map(orderOf)).toEqual([1, 0, 0, 1, 0]);
  });
  it('b, a and T stay coupled as in the original', () => {
    const s0 = couple(initialState());
    // T moved to 3: b = T a = 6
    let s = couple({ ...s0, τ: 3 });
    expect(s.β).toBe(6);
    expect(s.τ).toBe(3);
    // b moved to -1: T = b/a = -0.5
    s = couple({ ...s0, β: -1 });
    expect(s.τ).toBe(-0.5);
    // a moved to 4: T = b/a = 1 (b kept)
    s = couple({ ...s0, α: 4 });
    expect([s.β, s.τ, s.aOld]).toEqual([4, 1, 4]);
    // a = 0: nothing is coupled (E-TS-01)
    s = couple({ ...s0, α: 0, τ: 7 });
    expect([s.β, s.τ]).toEqual([4, 7]);
    // T may leave its slider's range (Q-TS-02)
    expect(couple({ ...s0, α: 0.1 }).τ).toBeCloseTo(40, 12);
  });
  it('y, z and w are x at the transformed times', () => {
    const { view } = evaluate({ ...initialState(), signal: 'TopHat', checked: [1, 2, 3, 4] });
    const T = SIGNALS.TopHat.T;
    expect(view.Ty).toEqual(T.map((t) => (t + 4) / 2));
    expect(view.Tb).toEqual(T.map((t) => t + 4));
    expect(view.Tw).toEqual(T.map((t) => t / 2));
    const zero = evaluate({ ...initialState(), α: 0 }).view;
    expect(zero.Ty).toEqual(SIGNALS.RampDown.T.map((t) => 10000 * t));
  });
  it('hidden curves are not drawn, the legend keeps all four entries; steps for TopHat', () => {
    const { graphics } = evaluate({ ...initialState(), signal: 'TopHat', checked: [3] });
    const ls = lines(graphics[1], 'output-plot');
    expect(ls).toHaveLength(1); // z only
    expect(ls[0].pts.slice(0, 4)).toEqual([[-9996, 0], [4, 0], [4, 1], [5, 1]]); // held, then the step at t = b
    expect(graphics[1].options.PlotLegends.items).toHaveLength(4);
    expect(graphics[1].options.PlotLegends.items[2].color).toEqual([0.560181, 0.691569, 0.194885]); // z: the default 3rd colour
    expect(B_COLOR.rgb).toEqual([138 / 255, 182 / 255, 7 / 255]);
  });
});
