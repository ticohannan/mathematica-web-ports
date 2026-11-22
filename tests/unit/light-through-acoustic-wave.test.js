// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Brendon O'Leary
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/light-through-acoustic-wave.test.js — the model of "Path of Light through an Acoustic Wave". Expected
// values come from outside the port: the notebook's saved states, a Simpson integration of the differential equation
// written in the test, finite differences, and values read off the snapshots (docs/original-snapshots/
// light-through-acoustic-wave-*.png) where a test says so.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation } from '../../shared/graphics.js';
import { initialState, evaluate, clampM, lightPath, wave } from '../../demos/light-through-acoustic-wave/model.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/light-through-acoustic-wave.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

/** Simpson's rule for ∫₀ˣ f (N even). */
const simpson = (f, X, N = 20000) => {
  const h = X / N;
  let s = f(0) + f(X);
  for (let i = 1; i < N; i++) s += (i % 2 ? 4 : 2) * f(i * h);
  return (s * h) / 3;
};
/** The linear equation's solution, independently: y′ = n tan θ/(n + m sin wx) integrated numerically. */
const yLinear = (X, { n, m, w, θ }) => simpson((x) => (n * Math.tan(θ)) / (n + m * Math.sin(w * x)), X);
/** The least-time path itself (Snell's invariant (n + m sin wx) y′/√(1 + y′²) = n sin θ), integrated numerically. */
const yLeastTime = (X, { n, m, w, θ }, N = 200000) => {
  const K = n * Math.sin(θ);
  return simpson((x) => { const q = n + m * Math.sin(w * x); return K / Math.sqrt(q * q - K * K); }, X, N);
};
/** A small seeded generator (Park–Miller), independent of the port. */
const lcg = (seed) => () => (seed = (seed * 48271) % 2147483647) / 2147483647;

describe('light-through-acoustic-wave model', () => {
  it('the opening state = the live state and the initial settings of the notebook', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
    expect(initialState()).toEqual(numbersOf(fx.states[0]));
    expect(evaluate(initialState()).state).toEqual(initialState());
  });

  it('If[m > n − .1, m = n − .1]: the body lowers m to n − .1 and returns the changed state', () => {
    expect(clampM({ n: 1, m: 0.95 })).toBe(0.9);
    expect(clampM({ n: 0.8, m: 0.7 })).toBe(0.7); // 0.7 < 0.8 − .1 = 0.7000000000000001: unchanged
    expect(clampM({ n: 0.8, m: 0.75 })).toBe(0.8 - 0.1);
    expect(clampM({ n: 3, m: 2.5 })).toBe(2.5);
    const r = evaluate({ n: 0.8, m: 0.9, w: 0.5, θ: 0.01 });
    expect(r.state).toEqual({ n: 0.8, m: 0.8 - 0.1, w: 0.5, θ: 0.01 });
    expect(r.view.m).toBe(0.8 - 0.1);
  });

  it('the light path is n tan θ ∫₀ˣ dξ/(n + m sin wξ) (Simpson integration in the test)', () => {
    for (const s of [initialState(), snap('3'), snap('4'), { n: 4, m: 3.2, w: 1.7, θ: -0.015 }]) {
      for (const x of [0.7, 6.3, 13, 27.5, 41, 50]) expect(lightPath(x, s)).toBeCloseTo(yLinear(x, s), 9);
    }
  });

  it('m = 0: the path is the straight line y = x tan θ; the wave is m sin wx', () => {
    const s = { n: 2, m: 0, w: 0.9, θ: 0.017 };
    for (const x of [0, 3, 10, 33.3, 50]) expect(lightPath(x, s)).toBeCloseTo(x * Math.tan(0.017), 12);
    expect(wave(Math.PI, { m: 0.7, w: 0.5 })).toBeCloseTo(0.7, 15);
  });

  it("the Details' equation without the cubic term: (n + m sin wx) y″ + m w cos(wx) y′ = 0, y(0) = 0, y′(0) = tan θ", () => {
    const h = 1e-4;
    for (const s of [initialState(), snap('3'), snap('4'), { n: 5, m: 4.9, w: 2, θ: 0.02 }]) {
      expect(lightPath(0, s)).toBe(0);
      expect((lightPath(h, s) - lightPath(-h, s)) / (2 * h)).toBeCloseTo(Math.tan(s.θ), 8);
      for (let x = 0.31; x < 50; x += 0.37) {
        const d1 = (lightPath(x + h, s) - lightPath(x - h, s)) / (2 * h);
        const d2 = (lightPath(x + h, s) - 2 * lightPath(x, s) + lightPath(x - h, s)) / (h * h);
        const q = s.n + s.m * Math.sin(s.w * x);
        expect(Math.abs(q * d2 + s.m * s.w * Math.cos(s.w * x) * d1)).toBeLessThan(1e-5);
        expect(d1).toBeCloseTo((s.n * Math.tan(s.θ)) / q, 6); // the first integral (n + m sin wx) y′ = n tan θ
      }
    }
  });

  it('continuous at the branch points x = (2k + 1)π/w (Ceiling moves ArcTan to the next branch)', () => {
    for (const s of [initialState(), snap('3'), snap('4'), { n: 5, m: 4.9, w: 2, θ: 0.02 }, { n: 0.8, m: 0.8 - 0.1, w: 0.3, θ: -0.02 }]) {
      const slope = (s.n * Math.abs(Math.tan(s.θ))) / (s.n - s.m);
      for (let k = 0; ((2 * k + 1) * Math.PI) / s.w < 50; k++) {
        const xp = ((2 * k + 1) * Math.PI) / s.w;
        for (const e of [1e-12, 1e-9, 1e-6, 1e-3]) {
          expect(Math.abs(lightPath(xp + e * xp, s) - lightPath(xp - e * xp, s))).toBeLessThanOrEqual(2 * e * xp * slope * 1.001 + 1e-14);
        }
      }
    }
  });

  it('N-LT-01: only within a few units in the last place of a pole do the two branch terms round differently', () => {
    // there the value is one period step 2π n tan θ/(w √(n² − m²)) off; a sample would have to hit that window
    const s = snap('3');
    const step = (2 * Math.PI * s.n * Math.tan(s.θ)) / (s.w * Math.sqrt(s.n * s.n - s.m * s.m));
    let widest = 0;
    for (let k = 0; ((2 * k + 1) * Math.PI) / s.w < 50; k++) {
      const xp = ((2 * k + 1) * Math.PI) / s.w;
      const ref = lightPath(xp * (1 - 1e-9), s);
      for (let j = -64; j <= 64; j++) {
        const x = xp + j * Number.EPSILON * xp;
        const off = Math.abs(lightPath(x, s) - ref);
        if (off > Math.abs(step) / 2) { widest = Math.max(widest, Math.abs(j)); expect(off).toBeCloseTo(Math.abs(step), 6); }
      }
    }
    expect(widest).toBeLessThanOrEqual(8);
  });

  it('the drawn curves have no spikes: at the snapshot settings and 300 random settings', () => {
    const rnd = lcg(20261117);
    const states = ['1', '2', '3', '4'].map(snap);
    for (let i = 0; i < 300; i++) {
      const n = 0.8 + 4.2 * rnd();
      states.push({ n, m: (n - 0.1) * rnd(), w: 0.3 + 1.7 * rnd(), θ: -0.02 + 0.04 * rnd() });
    }
    for (const s of states) {
      const { view, graphics } = evaluate(s);
      const slope = (s.n * Math.abs(Math.tan(s.θ))) / (s.n - s.m);
      expect(view.steepest).toBeLessThanOrEqual(slope * (1 + 1e-6) + 1e-12);
      const pts = annotation(graphics, 'light-path').g.find((d) => d.head === 'Line').pts;
      expect(pts[0]).toEqual([0, 0]);
      expect(pts.at(-1)[0]).toBe(50);
      expect(pts.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    }
  });

  it('the plot: PlotStyle {Thick, Dashed}, ImageSize {500, 300}, ImagePadding {{25, 25}, {10, 10}}, x from 0 to 50', () => {
    const { graphics } = evaluate(initialState());
    expect(graphics.options.ImageSize).toEqual([500, 300]);
    expect(graphics.options.ImagePadding).toEqual([[25, 25], [10, 10]]);
    expect(graphics.options.PlotRange[0]).toEqual([0, 50]);
    const path = annotation(graphics, 'light-path').g, sound = annotation(graphics, 'sound-wave').g;
    expect(path.some((d) => d.dir === 'thickness' && d.value.abs === 2)).toBe(true); // Thick = AbsoluteThickness[2]
    expect(sound.some((d) => d.dir === 'dash')).toBe(true);
    expect(path.some((d) => d.dir === 'dash')).toBe(false);
  });

  it('snapshot 1 and 2 (the opening state): the path rises to about 0.70 at x = 50, the wave ±0.7', () => {
    for (const k of ['1', '2']) {
      const { view } = evaluate(snap(k));
      expect(view.yEnd).toBeCloseTo(0.701, 3); // the picture: the path ends just above the wave's crest 0.7
      expect(view.plotRange[1][0]).toBeCloseTo(-0.7, 3);
      expect(view.plotRange[1][1]).toBeCloseTo(0.7011, 3);
    }
  });

  it('snapshot 3: θ < 0, the path falls in steps to about −1.0 at x = 50', () => {
    const s = snap('3');
    expect(s).toEqual({ n: 1, m: 0.9, w: 1.302, θ: -0.0089 });
    const { view } = evaluate(s);
    expect(view.yEnd).toBeCloseTo(-0.995, 2); // the picture: last step ends at about −1.0
    expect(view.plotRange[1][0]).toBeCloseTo(-0.995, 2);
    expect(view.plotRange[1][1]).toBeCloseTo(0.9, 3);
  });

  it('snapshot 4: the path rises in two steep steps (near x = 16 and x = 37) to about 2.0', () => {
    const s = snap('4');
    const { view } = evaluate(s);
    expect(view.yEnd).toBeCloseTo(2.02, 2);
    // the picture: about 0.95 at x = 20 and 1.1 at x = 30 (flat parts where the index is high)
    expect(lightPath(20, s)).toBeGreaterThan(0.85); expect(lightPath(20, s)).toBeLessThan(1.0);
    // the steep parts are where sin(0.3 x) = −1: x = 3π/(2·0.3) ≈ 15.7 and 7π/(2·0.3) ≈ 36.7
    const d = (x) => (lightPath(x + 1e-4, s) - lightPath(x - 1e-4, s)) / 2e-4;
    expect(d((3 * Math.PI) / 0.6)).toBeCloseTo(0.2, 4); // n tan θ/(n − m) = 0.02/0.1
  });

  it("the Details: where the index rises, the path turns toward the wavefronts' normal (the x axis)", () => {
    const s = initialState(), d = (x) => (lightPath(x + 1e-4, s) - lightPath(x - 1e-4, s)) / 2e-4;
    const crest = Math.PI / (2 * s.w), trough = (3 * Math.PI) / (2 * s.w);
    expect(Math.abs(d(crest))).toBeLessThan(Math.abs(d(0))); // index n + m: flatter
    expect(Math.abs(d(trough))).toBeGreaterThan(Math.abs(d(0))); // index n − m: steeper
  });
});

describe('E-LT-01: the linear equation against the least-time path', () => {
  it('close for small slopes (the opening state and the snapshots), far off where the slope reaches 1', () => {
    const rel = (s) => (lightPath(50, s) - yLeastTime(50, s)) / yLeastTime(50, s);
    expect(Math.abs(rel(initialState()))).toBeLessThan(3e-4);
    expect(Math.abs(rel(snap('3')))).toBeLessThan(2e-3);
    expect(Math.abs(rel(snap('4')))).toBeLessThan(1e-2);
    // n = 5, m = 4.9, θ = 0.02, w = 0.3: the linear path ends at 4.31, the least-time path at about 12.5 (n sin θ =
    // 0.09999 is just below the smallest index 0.1: nearly total reflection)
    const s = { n: 5, m: 4.9, w: 0.3, θ: 0.02 };
    expect(lightPath(50, s)).toBeCloseTo(4.3086, 3);
    const exact = yLeastTime(50, s, 400000);
    expect(exact).toBeGreaterThan(12); expect(exact).toBeLessThan(13);
    expect(s.n * Math.sin(s.θ)).toBeLessThan(s.n - s.m); // no total reflection anywhere in the controls' ranges
  });
});
