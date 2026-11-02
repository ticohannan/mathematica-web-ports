// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original (ECE 6311 Lecture 18 notebook) by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/line-parameterization.test.js — the model of "Line Parameterization" (DESIGN.md §4). Expected values from
// the notebook's code worked by hand and from its saved state (tests/golden/line-parameterization.original-states.json).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { initialState, evaluate, thetaIndex, myArrowArc2 } from '../../demos/line-parameterization/model.js';
import { annotation } from '../../shared/graphics.js';
import { DIAL_TABLE_32 } from '../../demos/common/dial-control.js';

const saved = JSON.parse(fs.readFileSync('tests/golden/line-parameterization.original-states.json', 'utf8'));
const num = (x) => (typeof x === 'number' ? x : x.n);

describe('line-parameterization model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual({ rho: 1, p1: [1, 0] });
    expect(saved.specs.p1).toEqual([1, 0]); // the notebook's initial settings
    expect(saved.specs['ρ']).toBe(1);
    const { view } = evaluate(initialState());
    expect(view.k).toBe(0);
    expect(view.foot).toEqual([1, 0]);
  });

  it('theta is k pi/32 in [0, 2pi): ArcTan of the dial point, plus 2π when negative', () => {
    DIAL_TABLE_32.forEach((p, i) => {
      const k = thetaIndex(p);
      const a = Math.atan2(p[1], p[0]);
      const expected = a < 0 ? a + 2 * Math.PI : a;
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(64);
      expect(Math.abs((k * Math.PI) / 32 - expected), `table point ${i}`).toBeLessThan(1e-12);
    });
    expect(thetaIndex([-1, 0])).toBe(32); // ArcTan[-1, 0] = π
    expect(thetaIndex([0, -1])).toBe(48); // −π/2 + 2π
  });

  it('the picture at the saved state of the notebook (ρ = 1.8, θ = π/4)', () => {
    const st = saved.states[0];
    const rho = num(st['ρ']), p1 = st.p1.map(num);
    expect(rho).toBe(1.8);
    const { view, graphics } = evaluate({ rho, p1 });
    expect(view.k).toBe(8);
    const r = Math.SQRT1_2;
    expect(view.foot[0]).toBeCloseTo(1.8 * r, 14);
    expect(view.foot[1]).toBeCloseTo(1.8 * r, 14);
    const marker = annotation(graphics, 'marker').g.pts;
    expect(marker).toHaveLength(4);
    expect(marker[1][0]).toBeCloseTo(1.6 * r, 14); // (ρ − .2) u
    expect(marker[2][0]).toBeCloseTo(1.6 * r - 0.2 * r, 14); // + .2 n, n = {−Sin θ, Cos θ}
    expect(marker[2][1]).toBeCloseTo(1.6 * r + 0.2 * r, 14);
    expect(annotation(graphics, 'foot').g.pts).toEqual([view.foot]);
    const arrow = annotation(graphics, 'rho-arrow').g;
    expect(arrow.pts[0]).toEqual([0, 0]);
    expect(arrow.pts[1]).toEqual(view.foot);
    const rhoLabel = annotation(graphics, 'rho-label').g.pos; // (ρ/2) u + .15 n
    expect(rhoLabel[0]).toBeCloseTo(0.9 * r - 0.15 * r, 14);
    expect(rhoLabel[1]).toBeCloseTo(0.9 * r + 0.15 * r, 14);
    const eq = annotation(graphics, 'equation').g;
    expect(eq.angle).toBeCloseTo(Math.PI / 4 - Math.PI / 2, 15);
    expect(eq.about[0]).toBeCloseTo(1.2 * 1.8 * r, 14); // turned about its own position 1.2 ρ u
  });

  it('every point of the line satisfies x cos theta + y sin theta = rho', () => {
    for (const [rho, p1] of [[1.8, DIAL_TABLE_32[40]], [0.3, DIAL_TABLE_32[5]], [3, DIAL_TABLE_32[64]], [0, DIAL_TABLE_32[20]]]) {
      const { view, graphics } = evaluate({ rho, p1 });
      const [c, s] = view.normal;
      for (const q of annotation(graphics, 'line').g.pts) expect(q[0] * c + q[1] * s).toBeCloseTo(rho, 12);
    }
  });

  it('the arc is a point at theta 0 and an arrow otherwise (myArrowArc2, start === end)', () => {
    expect(annotation(evaluate({ rho: 1, p1: [1, 0] }).graphics, 'arc').g.head).toBe('Point');
    const arc = annotation(evaluate({ rho: 2, p1: DIAL_TABLE_32[48] }).graphics, 'arc').g; // θ = π/2, radius ρ/2 = 1
    expect(arc.head).toBe('Arrow');
    const pts = arc.curve.pts; // the B-spline's 12 control points on the circle of radius 1, from 0 to π/2
    expect(pts).toHaveLength(12);
    expect(pts[0]).toEqual([1, 0]);
    expect(pts[11][0]).toBeCloseTo(0, 15);
    expect(pts[11][1]).toBeCloseTo(1, 15);
    expect(myArrowArc2([0, 0], 1, [0, 0]).head).toBe('Point');
  });

  it('the theta label appears from k = 2 (Abs[θ] >= π/16), at 0.75 ρ in the direction θ − π/16', () => {
    expect(annotation(evaluate({ rho: 1, p1: DIAL_TABLE_32[33] }).graphics, 'theta-label')).toBeFalsy(); // k = 1
    const g = evaluate({ rho: 2, p1: DIAL_TABLE_32[34] }).graphics; // k = 2, θ = π/16
    const pos = annotation(g, 'theta-label').g.pos;
    expect(pos).toEqual([1.5, 0]);
    expect(annotation(evaluate({ rho: 1, p1: DIAL_TABLE_32[31] }).graphics, 'theta-label')).toBeTruthy(); // k = 63
  });
});
