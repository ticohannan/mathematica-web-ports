// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Harley H. Hartman
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/three-phase-induction-motor.test.js — the model of "Operating an AC Three-Phase Induction Motor" against
// values from outside the port: the notebook's saved states, closed forms derived by hand (sin² identities, the
// space vector of three phases) and readings of the snapshot pictures.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  initialState, initialSettings, evaluate, rotorAngle, skew, phaseBands, sumOfSquares, SLATE_BLUE, ORANGE_PHASE, LIME_PHASE, SUM_COLOR,
} from '../../demos/three-phase-induction-motor/model.js';
import { flatten } from '../../shared/graphics3d.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/three-phase-induction-motor.original-states.json', 'utf8'));
const TWO_PI = 2 * Math.PI;
/** Lines of a 2D plot (the curves), in order. */
const plotLines = (g) => {
  const out = [];
  const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && x.head === 'Line') out.push(x); else if (x && x.list) walk(x.list); else if (x && x.g) walk(x.g); };
  walk(g.list);
  return out;
};
/** Sum of squares of the three currents, by hand: m² sin²(t + φ) + 1 + cos(2t)/2 (sin²(t + 2π/3) + sin²(t − 2π/3)). */
const S = (t, m, phi = 0) => m * m * Math.sin(t + phi) ** 2 + 1 + Math.cos(2 * t) / 2;

describe('three-phase-induction-motor model', () => {
  it('the opening state is the notebook\'s live state; Initial settings are the control specs\' values', () => {
    expect(initialState()).toEqual(fx.states[0]);
    expect(initialSettings()).toEqual({ a: 0, m: 1, p: 0, f: 50 });
  });

  it('rotor angle, balanced supply: b = −a + √(3/2)/1.3 for every a (sin² of three phases sums to 3/2)', () => {
    for (const a of [0, 0.74, 1.54, 2.3, 5.63, TWO_PI]) expect(rotorAngle(a, 1, 0)).toBeCloseTo(-a + Math.sqrt(1.5) / 1.3, 12);
  });

  it('rotor angle, unbalanced: the sum of squares taken 0.7 rad after a (the 0.7 inside each Sin)', () => {
    for (const [a, m, p] of [[0.74, 1.342, 0], [1.54, 1, 80], [3, 0.6, -80], [5.63, 1.4, 30]]) {
      const phi = (p * Math.PI) / 180;
      expect(rotorAngle(a, m, p)).toBeCloseTo(-a + Math.sqrt(S(a + 0.7, m, phi)) / 1.3, 12);
      // not the flux at a itself (N-TB-05): the two differ by more than rounding
      if (m !== 1 || p !== 0) expect(Math.abs(rotorAngle(a, m, p) - (-a + Math.sqrt(S(a, m, phi)) / 1.3))).toBeGreaterThan(1e-3);
    }
  });

  it('the mean rotor speed is the field\'s, whatever m and p: b(a + 2π) = b(a) − 2π (E-TB-01)', () => {
    for (const [m, p] of [[1, 0], [1.4, 0], [0.6, 80], [1.2, -45]]) {
      for (const a of [0, 1, 2.5]) expect(rotorAngle(a + TWO_PI, m, p)).toBeCloseTo(rotorAngle(a, m, p) - TWO_PI, 10);
    }
  });

  it('skew: d − e = f π/600, so skew 100% turns the bars by one bar pitch π/6', () => {
    const [d, e] = skew(0.3, 100);
    expect(d - e).toBeCloseTo(Math.PI / 6, 14);
    expect(skew(0.3, 50)).toEqual([0.3 + (50 * Math.PI / 12) / 100, 0.3 - (50 * Math.PI / 12) / 100]);
    expect(skew(0.3, 0)).toEqual([0.3, 0.3]);
  });

  it('phase bands: opposite bands have opacities ±Sin; the lit bands point along the field π/2 − a (clockwise)', () => {
    for (const a of [0.2, 1.54, 3.3, 5.63]) {
      const bands = phaseBands(a, 0);
      expect(bands.map(([o]) => o)).toHaveLength(6);
      for (let k = 0; k < 6; k += 2) expect(bands[k][0]).toBeCloseTo(-bands[k + 1][0], 15);
      // Σ opacity · direction = 2 Σ sin(a + φk) e^{iφk} = 3 e^{i(π/2 − a)} (space vector of a balanced three-phase set)
      const v = bands.reduce(([x, y], [o, , t]) => [x + o * Math.cos(t), y + o * Math.sin(t)], [0, 0]);
      expect(v[0]).toBeCloseTo(3 * Math.cos(Math.PI / 2 - a), 12);
      expect(v[1]).toBeCloseTo(3 * Math.sin(Math.PI / 2 - a), 12);
    }
  });

  it('snapshot 1 (a = 5.63): the bands at π, π/3 and 2π/3 are lit, those at 0, −2π/3, −π/3 have negative opacity', () => {
    const { view } = evaluate(fx.snapshots[1]);
    const sA = Math.sin(5.63), sB = Math.sin(5.63 - TWO_PI / 3), sC = Math.sin(5.63 + TWO_PI / 3);
    expect(view.bands[0]).toBeCloseTo(-sA, 14);
    expect(view.bands[2]).toBeCloseTo(-sB, 14);
    expect(view.bands[5]).toBeCloseTo(sC, 14);
    expect(view.bands.filter((o) => o > 0)).toHaveLength(3); // as the picture shows: slate blue left, lime right, orange behind
    expect(view.bands[1]).toBeLessThan(0);
    expect(view.bands[3]).toBeLessThan(0);
    expect(view.bands[4]).toBeLessThan(0);
  });

  it('the Graphics3D: 27 primitives in the original\'s order with their colours, opacities and sizes', () => {
    const s = { a: 1.2, m: 1, p: 0, f: 50 };
    const { view, graphics: [motor] } = evaluate(s);
    expect(motor.options).toMatchObject({ Boxed: false, ImageSize: 275 });
    const prims = flatten(motor);
    expect(prims).toHaveLength(1 + 2 + 6 + 1 + 1 + 4 + 12);
    const [ind, stator, inner, ...rest] = prims;
    expect(ind).toMatchObject({ type: 'polygon', color: [1, 0.5, 0], edgeForm: [0, 0, 0] });
    const q = view.b + Math.PI / 4;
    expect(ind.points[0][0]).toBeCloseTo(Math.cos(q) * 3.5, 12);
    expect(ind.points[2]).toEqual([Math.cos(q) * 7, Math.sin(q) * 7, 10]);
    expect(stator).toMatchObject({ type: 'cylinder', radius: 32, opacity: 0.3, color: [1, 1, 0], p1: [0, 0, 10], p2: [0, 0, -10] });
    expect(inner).toMatchObject({ type: 'cylinder', radius: 22, opacity: 0.2, color: [1, 1, 1] });
    const bands = rest.slice(0, 6);
    expect(bands.map((b) => b.color)).toEqual([SLATE_BLUE, SLATE_BLUE, LIME_PHASE, LIME_PHASE, ORANGE_PHASE, ORANGE_PHASE]);
    bands.forEach((b) => expect(b).toMatchObject({ radius: 4.8 }));
    expect(bands[1].p1[0]).toBeCloseTo(27, 14);
    expect(bands[1].opacity).toBeCloseTo(Math.sin(1.2), 14);
    const [rotor, shaft, ...more] = rest.slice(6);
    expect(rotor).toMatchObject({ radius: 20, opacity: 0.4, color: [0.2, 0.7, 0.3] });
    expect(shaft).toMatchObject({ radius: 3.5, opacity: 1, color: SLATE_BLUE, p1: [0, 0, 40], p2: [0, 0, -18] });
    const holes = more.slice(0, 4), bars = more.slice(4);
    holes.forEach((h, k) => {
      expect(h).toMatchObject({ radius: 1.8, opacity: 0.7, color: [1, 1, 1] });
      expect(h.p1[0]).toBeCloseTo(Math.cos(view.b + (k * Math.PI) / 2) * 8, 12);
    });
    expect(bars).toHaveLength(12);
    bars.forEach((b, k) => {
      expect(b).toMatchObject({ radius: 2, opacity: 1, color: [0.8, 0.1, 0.4] });
      expect(b.p1[0]).toBeCloseTo(Math.cos(view.d + (k * Math.PI) / 6) * 18, 12);
      expect(b.p1[2]).toBe(12);
      expect(b.p2[1]).toBeCloseTo(Math.sin(view.e + (k * Math.PI) / 6) * 18, 12);
      expect(b.p2[2]).toBe(-12);
    });
  });

  it('the plot: four curves over one period in the original\'s colours, PlotRange {−1.5, 2}, AxesLabel time and two lines', () => {
    const plot = evaluate({ a: 3, m: 1.342, p: 0, f: 50 }).graphics[1];
    expect(plot.options).toMatchObject({ ImageSize: 300, Axes: true });
    expect(plot.options.PlotRange[1]).toEqual([-1.5, 2]);
    expect(plot.options.PlotRange[0][1]).toBeCloseTo(TWO_PI, 14);
    expect(plot.options.AxesLabel[0]).toBe('time');
    expect(plot.options.AxesLabel[1].items.slice(0, 2)).toEqual(['current / ', 'relative flux']);
    const lines = plotLines(plot);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    const allPts = lines.flatMap((l) => l.pts);
    expect(allPts.length).toBeGreaterThan(100);
    // every sampled point of the first curve lies on m Sin[t]; x runs over [0, 2π]
    for (const [t, y] of lines[0].pts) expect(y).toBeCloseTo(1.342 * Math.sin(t), 10);
    expect(lines[0].pts[0][0]).toBe(0);
    expect(lines[0].pts.at(-1)[0]).toBeCloseTo(TWO_PI, 12);
    expect(JSON.stringify(plot)).toContain(JSON.stringify(SUM_COLOR));
  });

  it('the fourth curve is the sum of squares: constant 3/2 when balanced, 1 + m²/2 + (1 − m²) cos 2t / 2 otherwise', () => {
    for (const t of [0, 0.5, 2, 4.4]) {
      expect(sumOfSquares(t, 1, 0)).toBeCloseTo(1.5, 14);
      expect(sumOfSquares(t, 1.342, 0)).toBeCloseTo(1 + 1.342 ** 2 / 2 + ((1 - 1.342 ** 2) * Math.cos(2 * t)) / 2, 12);
    }
  });

  it('snapshot 3 (p = 80): the flux curve dips to about 0.5 near t = 1.6 and leaves the plot above 2 (as the picture)', () => {
    let min = Infinity, tMin = 0, max = -Infinity;
    for (let t = 0; t <= TWO_PI; t += 0.001) {
      const v = sumOfSquares(t, 1, 80);
      if (v < min) { min = v; tMin = t; }
      max = Math.max(max, v);
    }
    expect(min).toBeGreaterThan(0.4);
    expect(min).toBeLessThan(0.6);
    expect(tMin).toBeGreaterThan(1.4);
    expect(tMin).toBeLessThan(1.8);
    expect(max).toBeGreaterThan(2);
  });

  it('the snapshots\' Settings evaluate (rotor angle by hand at each)', () => {
    for (const k of Object.keys(fx.snapshots)) {
      const s = fx.snapshots[k];
      const { view } = evaluate(s);
      expect(view.b).toBeCloseTo(-s.a + Math.sqrt(S(s.a + 0.7, s.m, (s.p * Math.PI) / 180)) / 1.3, 12);
      expect(view.d - view.e).toBeCloseTo((s.f * Math.PI) / 600, 12);
    }
  });

  it('the rotor runs ahead and behind by ±0.13 rad at m = 1.4, p = 0 (E-TB-01)', () => {
    let lo = Infinity, hi = -Infinity;
    for (let a = 0; a < TWO_PI; a += 0.001) { const w = rotorAngle(a, 1.4, 0) + a; lo = Math.min(lo, w); hi = Math.max(hi, w); }
    expect((hi - lo) / 2).toBeCloseTo((Math.sqrt(2.46) - Math.sqrt(1.5)) / 2.6, 6); // S from 1.5 to m² + 1/2
    expect((hi - lo) / 2).toBeGreaterThan(0.12);
    expect((hi - lo) / 2).toBeLessThan(0.14);
  });

  it('the field magnitude is not the sum of squares when unbalanced (E-TB-02): |F|² = 3S/2 − (Σi)²/2', () => {
    const field = (t, m, p) => {
      const i = [m * Math.sin(t + (p * Math.PI) / 180), Math.sin(t - TWO_PI / 3), Math.sin(t + TWO_PI / 3)];
      const ang = [0, -TWO_PI / 3, TWO_PI / 3]; // the bands with positive opacity of each phase
      return Math.hypot(i.reduce((s, x, k) => s + x * Math.cos(ang[k]), 0), i.reduce((s, x, k) => s + x * Math.sin(ang[k]), 0));
    };
    for (const t of [0.3, 1.1, 2.5, 4]) {
      expect(field(t, 1, 0)).toBeCloseTo(1.5, 12); // balanced: 3/2, as the sum of squares
      const Sv = sumOfSquares(t, 1.342, 0), sum = 0.342 * Math.sin(t);
      expect(field(t, 1.342, 0) ** 2).toBeCloseTo(1.5 * Sv - sum ** 2 / 2, 12);
    }
    expect(Math.abs(field(Math.PI / 2, 1.342, 0) - sumOfSquares(Math.PI / 2, 1.342, 0))).toBeGreaterThan(0.1);
  });

  it('without the 0.7 the rotor angle would change by 0.11 rad at snapshot 2 and 0.24 rad at snapshot 3 (N-TB-05)', () => {
    const no07 = ({ a, m, p }) => -a + Math.sqrt(sumOfSquares(a, m, p)) / 1.3;
    expect(rotorAngle(0.74, 1.342, 0) - no07(fx.snapshots[2])).toBeCloseTo(0.1131, 4);
    expect(rotorAngle(1.54, 1, 80) - no07(fx.snapshots[3])).toBeCloseTo(0.2439, 4);
    expect(rotorAngle(5.63, 1, 0) - no07(fx.snapshots[1])).toBeCloseTo(0, 12); // balanced: no change
  });
});
