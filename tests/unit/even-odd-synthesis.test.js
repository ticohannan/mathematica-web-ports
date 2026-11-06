// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/even-odd-synthesis.test.js — the model of "Synthesis with Even and Odd Functions". Expected values derived
// by hand from the Manipulate's definitions.
import { describe, it, expect } from 'vitest';
import { initialState, evaluate, X, jumpsOf, SIGNALS } from '../../demos/even-odd-synthesis/model.js';
import { annotation, Cases } from '../../shared/graphics.js';

describe('even-odd-synthesis model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual({ signal: 'StairStep', τ: 0 });
  });
  it('the seven signals', () => {
    expect(SIGNALS).toEqual(['Step', 'RampUp', 'Cos', 'Sin', 'TopHat', 'StairStep', 'Triangle']);
    expect([-1, 0, 2].map((t) => X('Step', t, 0))).toEqual([0, 1, 1]);
    expect([-1, 2.5, 5, 7].map((t) => X('RampUp', t, 0))).toEqual([0, 0.5, 1, 1]);
    expect(X('Cos', 1, 1)).toBe(1);
    expect(X('Sin', Math.PI / 2, 0)).toBe(1);
    expect([0, 1, 2, 3].map((t) => X('TopHat', t, 0))).toEqual([1, 0.25, 0, 0]);
    expect([-0.5, 0.5, 1.5, 2.5, 3.5, 4.5].map((t) => X('StairStep', t, 0))).toEqual([0, 0.25, 0.5, 0.75, 1, 0]);
    expect([-1, 1, 2, 3, 4, 5].map((t) => X('Triangle', t, 0))).toEqual([0, 0.5, 1, 0.5, 0, 0]);
    expect(X('StairStep', 3.5, 2)).toBe(0.5); // shifted by T = 2: x(1.5)
  });
  it('the jumps of each signal', () => {
    expect(jumpsOf('StairStep', 0)).toEqual([0, 1, 2, 3, 4]);
    expect(jumpsOf('TopHat', 1)).toEqual([-0.5, 0.5, 1.5, 2.5]);
    expect(jumpsOf('Sin', 3)).toEqual([]);
    for (const s of SIGNALS) for (const j of jumpsOf(s, 0.3)) expect(Math.abs(X(s, j - 1e-9, 0.3) - X(s, j + 1e-9, 0.3)), `${s} at ${j}`).toBeGreaterThan(0.2);
    // the top plot draws one dashed connector per jump, the bottom none (no ExclusionsStyle)
    const { graphics } = evaluate({ signal: 'StairStep', τ: 0 });
    const tops = Cases(annotation(graphics[0], 'input-plot').g, 'Line');
    expect(tops).toHaveLength(2);
    expect(tops[1].pts).toHaveLength(5);
    expect(Cases(annotation(graphics[1], 'parts-plot').g, 'Line')).toHaveLength(3);
  });
  it('even plus odd is the signal; the even part is even and the odd part odd', () => {
    for (const [s, τ] of [['StairStep', 0], ['Sin', 1.3], ['TopHat', -2], ['Triangle', 0.7]]) {
      const x = (t) => X(s, t, τ), e = (t) => (x(t) + x(-t)) / 2, o = (t) => (x(t) - x(-t)) / 2;
      for (const t of [-7.3, -2.1, 0.4, 1.7, 5.5]) {
        expect(e(t) + o(t)).toBeCloseTo(x(t), 14);
        expect(e(-t)).toBeCloseTo(e(t), 14);
        expect(o(-t)).toBeCloseTo(-o(t), 14);
      }
      // the plotted curves 2 and 3 are these parts (every sampled point of the lower plot)
      const ls = Cases(annotation(evaluate({ signal: s, τ }).graphics[1], 'parts-plot').g, 'Line');
      for (const [k, part] of [[1, e], [2, o]]) {
        const runs = Array.isArray(ls[k].pts[0][0]) ? ls[k].pts : [ls[k].pts];
        for (const run of runs) for (const [t, y] of run) expect(y, `${s} part ${k} at ${t}`).toBeCloseTo(part(t), 12);
      }
    }
  });
  it('the shift point and the plots’ frames', () => {
    const { graphics, view } = evaluate({ signal: 'Sin', τ: -3.5 });
    expect(annotation(graphics[0], 'shift-point')).toBeTruthy();
    expect(view.τ).toBe(-3.5);
    for (const g of graphics) {
      expect(g.options.PlotRange).toEqual([[-10, 10], [-1, 1]]);
      expect(g.options.ImageSize).toBe(500);
      expect(g.options.AspectRatio).toBeCloseTo(1 / 3, 15);
    }
    expect(graphics[1].options.PlotLegends.items.map((i) => typeof i.label)).toEqual(['string', 'object', 'object']);
  });
});
