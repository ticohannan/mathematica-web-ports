// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Housam Binous, Mohammad Mozahar Hossain and Ahmed Bellagi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/underdamped-step-performance.test.js — the model of "Performance Characteristics for Step Response of an Underdamped Process". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/underdamped-step-performance-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, characteristics } from '../../demos/underdamped-step-performance/model.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/underdamped-step-performance.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

describe('underdamped-step-performance model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it('yanal is the step response K M (1 − e^(−ζt/τ)(cos Ωt + ζ/√(1 − ζ²) sin Ωt))', () => {
    const c = characteristics({ Kg: 5, τ: 1, ζ: 0.2, M: 5 }), wd = Math.sqrt(1 - 0.04);
    for (const t of [0, 1, 3.3, 9]) expect(c.yanal(t)).toBeCloseTo(25 * (1 - Math.exp(-0.2 * t) * (Math.cos(wd * t) + (0.2 / wd) * Math.sin(wd * t))), 11);
  });
  it('the table of snapshot 3: 0.5266, 0.2773, 4.4889, 1.2661, 2.2445', () => {
    const c = characteristics(snap('3'));
    expect(+c.Overshoot.toFixed(4)).toBe(0.5266); expect(+c.DecayRatio.toFixed(4)).toBe(0.2773);
    expect(+c.P.toFixed(4)).toBe(4.4889); expect(+c.tr.toFixed(4)).toBe(1.2661); expect(+c.tp.toFixed(4)).toBe(2.2445);
    expect(JSON.stringify(evaluate(snap('3')).graphics)).toContain('1.2661');
  });
  it('the rise time solves y = M K in (0, tp); the peaks are a period apart; a/b and c/a as the Details give them', () => {
    const c = characteristics({ Kg: 1.4, τ: 1, ζ: 0.15, M: 8.5 });
    expect(c.yanal(c.tr)).toBeCloseTo(8.5 * 1.4, 9); expect(c.tr).toBeLessThan(c.tp);
    expect(c.tPeak1).toBeCloseTo(c.tp, 6); expect(c.tPeak2 - c.tPeak1).toBeCloseTo(c.P, 6);
    const MK = 8.5 * 1.4;
    expect((c.peak1 - MK) / MK).toBeCloseTo(c.Overshoot, 8); expect((c.peak2 - MK) / (c.peak1 - MK)).toBeCloseTo(c.DecayRatio, 6);
  });
});
