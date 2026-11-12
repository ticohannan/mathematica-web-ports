// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Enrique Zeleny
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/active-shock-absorbers.test.js — the model of "Active Shock Absorbers". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/active-shock-absorbers-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, solve, DAMPING, absorber } from '../../demos/active-shock-absorbers/model.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/active-shock-absorbers.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

describe('active-shock-absorbers model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it('the three damping functions', () => {
    expect(DAMPING[1](0.5)).toBe(0.0625); expect(DAMPING[2](0)).toBe(0); expect(DAMPING[2](1)).toBeCloseTo(1 - Math.exp(-10), 15);
    expect(DAMPING[3](-1)).toBeCloseTo(-Math.PI / 4, 15);
  });
  it('the initial values and the energy law d/dt (m y′²/2 + k y²/2) = −γ(y) y′²', () => {
    const s = initialState(), sol = solve(s);
    expect(sol(0)).toEqual([0.1, 0.2]);
    const E = (t) => { const [y, v] = sol(t); return (s.m * v * v) / 2 + (s.k * y * y) / 2; };
    for (const t of [1, 5, 20]) {
      const [y, v] = sol(t), dE = (E(t + 1e-4) - E(t - 1e-4)) / 2e-4;
      expect(dE).toBeCloseTo(-DAMPING[2](y) * v * v, 5);
    }
  });
  it('snapshot 4 (γ = arctan y): a limit cycle of amplitude about 1', () => {
    const sol = solve(snap('4'));
    let m = 0; for (let t = 30; t < 50; t += 0.01) m = Math.max(m, Math.abs(sol(t)[0]));
    expect(m).toBeGreaterThan(0.9); expect(m).toBeLessThan(1.1);
  });
  it('the absorber picture: the spring zigzags from 0 to max + y', () => {
    const sp = annotation(absorber(0.1).list, 'spring').g.pts;
    expect(sp[0][1]).toBe(0); expect(sp.at(-1)[1]).toBeCloseTo(1.3, 12);
    expect(Math.max(...sp.map((p) => p[0]))).toBeCloseTo(-0.05, 12); expect(Math.min(...sp.map((p) => p[0]))).toBeCloseTo(-0.15, 12);
  });
});
