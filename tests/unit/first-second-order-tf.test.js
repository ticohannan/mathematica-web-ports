// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann, Adam J. Johnston and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/first-second-order-tf.test.js — the model of "First- and Second-Order Transfer Functions". Expected values derived by hand from the original's formulas, or
// read off the notebook's snapshots (docs/original-snapshots/first-second-order-tf-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { initialState, evaluate, responseOf, blockDiagram } from '../../demos/first-second-order-tf/model.js';
const fx = JSON.parse(fs.readFileSync('tests/golden/first-second-order-tf.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

describe('first-second-order-tf model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it('FOPDT: K (1 − e^(−(t − θ)/τ)) after the dead time, 0 before (Details)', () => {
    const y = responseOf({ tab: 1, τ: 7, k: 10, θ: 2, ζ: 0.2 });
    expect(y(1.99)).toBe(0);
    for (const t of [3, 9, 40]) expect(y(t)).toBeCloseTo(10 * (1 - Math.exp(-(t - 2) / 7)), 11);
    expect(evaluate(snap('1')).view.τ0).toBeCloseTo(6.32, 12); // "0.632 K = 6.3"
    expect(evaluate(snap('3')).view.τ0).toBeCloseTo(2.528, 12); // "0.632 K = 2.5"
  });
  it('SOPDT: the three damping formulas of the Details', () => {
    const at = (ζ, t) => responseOf({ tab: 2, τ: 7, k: 10, θ: 2, ζ })(t);
    const u = (t) => (t - 2) / 7;
    const under = (ζ, t) => 10 * (1 - Math.exp(-ζ * u(t)) * (Math.cos(Math.sqrt(1 - ζ * ζ) * u(t)) + (ζ / Math.sqrt(1 - ζ * ζ)) * Math.sin(Math.sqrt(1 - ζ * ζ) * u(t))));
    const crit = (t) => 10 * (1 - (1 + u(t)) * Math.exp(-u(t)));
    const over = (ζ, t) => 10 * (1 - Math.exp(-ζ * u(t)) * (Math.cosh(Math.sqrt(ζ * ζ - 1) * u(t)) + (ζ / Math.sqrt(ζ * ζ - 1)) * Math.sinh(Math.sqrt(ζ * ζ - 1) * u(t))));
    for (const t of [5, 20, 60]) {
      expect(at(0.2, t)).toBeCloseTo(under(0.2, t), 10);
      expect(at(1, t)).toBeCloseTo(crit(t), 10);
      expect(at(1.6, t)).toBeCloseTo(over(1.6, t), 10);
    }
  });
  it('snapshot 2 (ζ = 0.2): the first peak about 15 near t = 25', () => {
    const y = responseOf(snap('2'));
    let best = [0, 0]; for (let t = 0; t <= 60; t += 0.05) if (y(t) > best[1]) best = [t, y(t)];
    expect(best[0]).toBeGreaterThan(22); expect(best[0]).toBeLessThan(27); expect(best[1]).toBeCloseTo(15.27, 1);
  });
  it('the block diagram: three boxes, four arrows and the transfer function of the chosen model', () => {
    for (const tab of [1, 2]) {
      const g = blockDiagram(tab);
      expect(Cases(g.list, 'Rectangle')).toHaveLength(3); expect(Cases(g.list, 'Arrow')).toHaveLength(4);
      expect(JSON.stringify(g.list)).toContain(tab === 1 ? '\" + 1\"' : '2 ζ τ');
    }
  });
});
