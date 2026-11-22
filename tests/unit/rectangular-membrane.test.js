// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alain Goriely
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/rectangular-membrane.test.js — the model of "Vibrations of a Rectangular Membrane". Expected values come
// from outside the port: the notebook's saved states (tests/golden/rectangular-membrane.original-states.json), the
// wave equation itself (checked by finite differences in the test), hand-derived periods and colours, and the tick
// labels read off the original's snapshot pictures.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { initialState, evaluate, membrane, amplitudeSum, zPlotRange, boxTicks, SNAPSHOT_NAMES } from '../../demos/rectangular-membrane/model.js';

const saved = JSON.parse(fs.readFileSync('tests/golden/rectangular-membrane.original-states.json', 'utf8'));
/** snapshot k's Settings in the port's names ($9 … $12 → B11, B21, B12, B22) */
const snapshot = (k) => Object.fromEntries(Object.entries(saved.snapshots[k]).map(([n, v]) => [SNAPSHOT_NAMES[n] ?? n, v]));

/** an independent HSB → RGB (Hue[h] periodic in h) */
function hue(h) {
  const x = (h - Math.floor(h)) * 6, i = Math.floor(x) % 6, f = x - Math.floor(x);
  return [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][i];
}

describe('rectangular-membrane model', () => {
  it('the opening state: the Manipulate\'s initial values = the live state and initial settings saved in the notebook = snapshot 1', () => {
    const s = initialState();
    expect(s).toEqual({ a: 4, b: 4, B11: 0.5, B21: 0, B12: 0, B22: 0, t: 0, c: 1, zrange: 0 });
    for (const [k, v] of Object.entries(saved.states[0])) expect(s[k]).toBe(v);
    for (const [k, v] of Object.entries(saved.specs)) expect(s[k]).toBe(v);
    expect(s).toEqual(snapshot('1'));
  });

  it('the body solves the wave equation u_tt = c² (u_xx + u_yy) with u = 0 on the boundary and no initial velocity', () => {
    const p = { a: 6.97, b: 4.28, B11: 0.83, B21: 0.74, B12: -0.64, B22: 0.3, c: 1.3 };
    const u = (x, y, t) => membrane({ ...p, t })(x, y);
    const h = 1e-3, [x, y, t] = [2.1, 1.7, 0.9];
    const utt = (u(x, y, t + h) - 2 * u(x, y, t) + u(x, y, t - h)) / h ** 2;
    const uxx = (u(x + h, y, t) - 2 * u(x, y, t) + u(x - h, y, t)) / h ** 2;
    const uyy = (u(x, y + h, t) - 2 * u(x, y, t) + u(x, y - h, t)) / h ** 2;
    expect(utt).toBeCloseTo(p.c ** 2 * (uxx + uyy), 4);
    for (const s of [0, 0.37, 0.81]) {
      expect(u(0, s * p.b, t)).toBe(0);
      expect(u(s * p.a, 0, t)).toBe(0);
      expect(Math.abs(u(p.a, s * p.b, t))).toBeLessThan(1e-14);
      expect(Math.abs(u(s * p.a, p.b, t))).toBeLessThan(1e-14);
    }
    expect((u(x, y, h) - u(x, y, -h)) / (2 * h)).toBeCloseTo(0, 9); // u_t(0) = 0
    // at t = 0 the profile is the sum of the four modes B[m,n] Sin[m π x/a] Sin[n π y/b]
    const S = (m, n) => Math.sin((m * Math.PI * x) / p.a) * Math.sin((n * Math.PI * y) / p.b);
    expect(u(x, y, 0)).toBeCloseTo(p.B11 * S(1, 1) + p.B21 * S(2, 1) + p.B12 * S(1, 2) + p.B22 * S(2, 2), 14);
  });

  it('each mode has its own frequency c π √(m²/a² + n²/b²): the (1,1) mode of a 4 × 4 membrane is inverted after 2√2', () => {
    const s = { ...initialState() };
    expect(evaluate({ ...s, t: 2 * Math.SQRT2 }).view.center).toBeCloseTo(-0.5, 14);
    expect(evaluate({ ...s, t: Math.SQRT2 }).view.center).toBeCloseTo(0, 14);
    expect(evaluate({ ...s, t: 2 * Math.SQRT2, c: 0 }).view.center).toBe(0.5); // wave speed 0: nothing moves
    // the (2,2) mode of the same membrane is twice as fast: back at its start after 2√2
    expect(membrane({ ...s, B11: 0, B22: 1, t: 2 * Math.SQRT2 })(1, 1)).toBeCloseTo(1, 13);
  });

  it('the colours: Hue[z/S] at every vertex with S = |B11| + |B21| + |B12| + |B22| (red at rest and at the top of snapshot 1)', () => {
    for (const k of ['1', '2', '4']) {
      const st = snapshot(k), { graphics, view } = evaluate(st);
      const S = Math.abs(st.B11) + Math.abs(st.B21) + Math.abs(st.B12) + Math.abs(st.B22);
      expect(view.S).toBeCloseTo(S, 14);
      const s = graphics.content[0];
      s.points.forEach((p, i) => { if (i % 97 === 0) hue(p[2] / S).forEach((c, j) => expect(s.colors[i][j]).toBeCloseTo(c, 12)); });
    }
    const s1 = evaluate(snapshot('1')).graphics.content[0];
    const top = s1.points.findIndex((p) => p[0] === 2 && p[1] === 2); // the centre, z = 0.5 = S: Hue[1]
    expect(s1.points[top][2]).toBe(0.5);
    expect(s1.colors[top]).toEqual([1, 0, 0]);
    expect(evaluate(snapshot('1')).graphics.options.Lighting).toBe('Neutral');
  });

  it('the box: PlotRange {{0, a}, {0, b}, {-S + zrange, S - zrange}} with BoxRatios -> Automatic, at each snapshot', () => {
    const expected = { 1: [-0.5, 0.5], 2: [-2.21, 2.21], 3: [-0.83, 0.83], 4: [-2.31, 2.31] };
    for (const k of ['1', '2', '3', '4']) {
      const st = snapshot(k), { view, graphics } = evaluate(st);
      expect(view.box[0]).toEqual([0, st.a]); expect(view.box[1]).toEqual([0, st.b]);
      expect(view.box[2][0]).toBeCloseTo(expected[k][0], 13); expect(view.box[2][1]).toBeCloseTo(expected[k][1], 13);
      expect(graphics.options.PlotRange).toEqual(view.box);
      expect(graphics.options.BoxRatios).toBeUndefined();
      expect(graphics.options.ImageSize).toEqual([390, 350]);
    }
  });

  it('ClippingStyle -> None at snapshot 4: the trough below −2.31 is cut away, nothing outside the box', () => {
    const st = snapshot('4'), { graphics, view } = evaluate(st);
    // an independent search: the surface goes down to about −2.43 there (below the box)
    let min = Infinity;
    const u = membrane(st);
    for (let i = 0; i <= 300; i++) for (let j = 0; j <= 300; j++) min = Math.min(min, u((st.a * i) / 300, (st.b * j) / 300));
    expect(min).toBeLessThan(-2.42);
    const s = graphics.content[0];
    const zs = s.points.map((p) => p[2]);
    expect(Math.min(...zs)).toBe(view.box[2][0]);
    expect(zs.filter((z) => z === view.box[2][0]).length).toBeGreaterThan(3); // the cut edge
    for (const l of s.meshLines) for (const p of l) expect(p[2]).toBeGreaterThanOrEqual(view.box[2][0]);
  });

  it('the tick labels of the box as in the snapshots', () => {
    const labels = (r) => boxTicks(r).filter((t) => t[1] !== '').map((t) => t[1]).join(' ');
    // read from docs/original-snapshots/rectangular-membrane-1 … 4.png
    expect(labels([0, 4])).toBe('0 1 2 3 4');
    expect(labels([-0.5, 0.5])).toBe('-0.5 0.0 0.5');
    expect(labels([-0.83, 0.83])).toBe('-0.5 0.0 0.5');
    expect(labels([0, 6.97])).toBe('0 2 4 6');
    expect(labels([0, 4.28])).toBe('0 1 2 3 4');
    expect(labels([-2.21, 2.21])).toBe('-2 -1 0 1 2');
    expect(labels([0, 7.48])).toBe('0 2 4 6');
    expect(labels([0, 5.65])).toBe('0 2 4');
    expect(labels([-2.31, 2.31])).toBe('-2 -1 0 1 2');
    expect(boxTicks([0, 0])).toEqual([[0, '0', 0.035]]);
    expect(evaluate(initialState()).graphics.options.Ticks.map((t) => t.filter((x) => x[1]).length)).toEqual([5, 5, 3]);
  });

  it('the plot: 65 × 65 samples, 15 mesh lines each way', () => {
    const { view } = evaluate(initialState());
    expect(view).toMatchObject({ vertices: 65 * 65, triangles: 2 * 64 * 64, meshLines: 30, uncolored: 0 });
  });

  it('all amplitudes 0: S = 0, Hue[0/0] is no colour (the port draws white), the box has zero height (E-RA-02, K-RA-01)', () => {
    const { view, graphics } = evaluate({ ...initialState(), B11: 0 });
    expect(view.S).toBe(0);
    expect(view.box[2]).toEqual([0, 0]);
    expect(view.uncolored).toBe(view.vertices);
    expect(graphics.content[0].points.every((p) => p[2] === 0)).toBe(true);
  });

  it('reduce box height ≥ S: the range {-S + zrange, S - zrange} collapses or turns round; the port uses it sorted (E-RA-03, K-RA-02)', () => {
    expect(zPlotRange({ ...initialState(), zrange: 0.5 })).toEqual([0, 0]);
    expect(evaluate({ ...initialState(), zrange: 0.5 }).view.box[2]).toEqual([0, 0]);
    expect(zPlotRange({ ...initialState(), zrange: 2 })).toEqual([1.5, -1.5]);
    const { view } = evaluate({ ...initialState(), zrange: 2 });
    expect(view.box[2]).toEqual([-1.5, 1.5]);
    expect(view.uncolored).toBe(0);
    expect(amplitudeSum({ B11: -1, B21: 0.5, B12: -0.25, B22: 0 })).toBe(1.75);
  });
});
