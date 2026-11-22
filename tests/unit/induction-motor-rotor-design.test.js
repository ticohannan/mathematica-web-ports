// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Harley H. Hartman
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/induction-motor-rotor-design.test.js — the model of "AC Induction Motor Rotor Design". Expected values come
// from outside the port: the snapshot pictures' printed labels, the saved states, the slip form of the torque formula, a
// brute-force search for the maximum and an independent solution of T(s) = 100.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  initialState, evaluate, quantities, torque, fullLoadSpeed, timesText, NEMA, IMAGE_PADDING,
} from '../../demos/induction-motor-rotor-design/model.js';
import { annotation, textOf } from '../../shared/graphics.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/induction-motor-rotor-design.original-states.json', 'utf8'));
// the labels printed in docs/original-snapshots/induction-motor-rotor-design-k.png (read off the pictures)
const PRINTED = {
  1: { locked: '149 % full load', max: '313 % full load', maxRpm: '1344 rpm', fullLoad: '1725  rpm' },
  2: { locked: '94 % full load', max: '313 % full load', maxRpm: '1523 rpm', fullLoad: '1754  rpm' },
  3: { locked: '113 % full load', max: '313 % full load', maxRpm: '1462 rpm', fullLoad: '1745  rpm' },
  4: { locked: '311 % full load', max: '313 % full load', maxRpm: '162 rpm', fullLoad: '1531  rpm' },
};
// the torque written with the slip speed u = 1800 − s (an independent form of the same expression)
const slipTorque = (e, r, x, s) => { const u = 1800 - s; return (21.12 * e * e * r * u) / (1800 * 1800 * r * r + u * u * x * x); };
const RANGES = { e: [130, 240], r: [0.01, 1], x: [0.2, 0.85] };
const grid = (n) => {
  const out = [];
  const at = ([a, b], i) => a + ((b - a) * i) / (n - 1);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) out.push({ e: at(RANGES.e, i), r: at(RANGES.r, j), x: at(RANGES.x, k) });
  return out;
};

describe('induction-motor-rotor-design model', () => {
  it("the opening state is the notebook's live state and its initial settings", () => {
    expect(initialState()).toEqual({ e: 150, r: 0.107, x: 0.422 });
    expect(initialState()).toEqual(fx.states[0]);
    expect(initialState()).toEqual(fx.specs);
  });

  it('the snapshot settings give the labels printed in the snapshot pictures', () => {
    for (const k of Object.keys(PRINTED)) {
      const v = evaluate(fx.snapshots[k]).view;
      expect(v.labels, `snapshot ${k}`).toEqual(PRINTED[k]);
    }
  });

  it('the torque formula equals its slip form T = 21.12 e² r u/(1800² r² + u² x²), u = 1800 − s', () => {
    for (const s of grid(4)) {
      const T = torque(s.e, s.r, s.x);
      for (const speed of [0, 300, 1000, 1500, 1799, 1820]) expect(T(speed)).toBeCloseTo(slipTorque(s.e, s.r, s.x, speed), 9);
    }
    expect(quantities(initialState()).lockedRotor).toBeCloseTo(slipTorque(150, 0.107, 0.422, 0), 12);
  });

  it('the maximum of T lies at s = 1800 − 1800 r/x and is 21.12 e²/(3600 x) = 0.0058667 e²/x (a brute-force search)', () => {
    for (const st of [initialState(), ...Object.values(fx.snapshots), ...Object.values(NEMA), { e: 240, r: 0.01, x: 0.2 }]) {
      let best = -Infinity, at = 0;
      for (let s = -4000; s <= 1800; s += 0.05) { const t = slipTorque(st.e, st.r, st.x, s); if (t > best) { best = t; at = s; } }
      const q = quantities(st);
      expect(q.maxTorque).toBeCloseTo(best, 4);
      expect(q.maxTorque).toBeCloseTo((21.12 * st.e ** 2) / (3600 * st.x), 9);
      expect(Math.abs(1800 - (1800 * st.r) / st.x - at)).toBeLessThan(0.05);
    }
  });

  it('the full-load speed is the higher-speed root of T(s) = 100 (the quadratic solved independently)', () => {
    for (const st of [initialState(), ...Object.values(NEMA), ...grid(5)]) {
      // 100 x² u² − 21.12 e² r u + 100·1800² r² = 0: the smaller slip u gives the higher speed
      const a = 100 * st.x ** 2, b = -21.12 * st.e ** 2 * st.r, c = 100 * 1800 ** 2 * st.r ** 2;
      const u = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
      const fl = fullLoadSpeed(st.e, st.r, st.x);
      expect(fl.im).toBe(0);
      expect(fl.re).toBeCloseTo(1800 - u, 6);
      expect(torque(st.e, st.r, st.x)(fl.re)).toBeCloseTo(100, 6);
    }
  });

  it("the square root of the full-load speed stays real over the sliders' ranges (e⁴ ≥ 1.36 × 2.905×10⁸ x²)", () => {
    let least = Infinity;
    for (const s of grid(23)) least = Math.min(least, s.e ** 4 / (2.90547520661157e8 * s.x ** 2));
    expect(least).toBeCloseTo(130 ** 4 / (2.90547520661157e8 * 0.85 ** 2), 9); // the corner e = 130, x = 0.85
    expect(least).toBeGreaterThan(1.36);
    // the edge of the real region: e = 120.37 at x = 0.85, x = 0.9915 at e = 130 (both outside the ranges)
    expect((2.90547520661157e8 * 0.85 ** 2) ** 0.25).toBeCloseTo(120.369, 3);
    expect(Math.sqrt(130 ** 4 / 2.90547520661157e8)).toBeCloseTo(0.99147, 5);
  });

  it('outside the ranges the full-load speed is complex: its label shows the rounded complex number and no arrow is drawn', () => {
    const { view, graphics } = evaluate({ e: 110, r: 0.1, x: 0.85 });
    // Re = (−0.1056 e² r + 1800 x²)/x², Im = 0.1056 r √(2.905×10⁸ x² − e⁴)/x² (by hand: 1623.15, 116.48)
    expect(view.fullLoad.re).toBeCloseTo((-0.1056 * 110 ** 2 * 0.1 + 1800 * 0.85 ** 2) / 0.85 ** 2, 9);
    expect(view.fullLoad.im).toBeCloseTo((0.1056 * 0.1 * Math.sqrt(2.90547520661157e8 * 0.85 ** 2 - 110 ** 4)) / 0.85 ** 2, 9);
    expect(view.labels.fullLoad).toBe('(1623 + 116 ⅈ)  rpm');
    expect(view.fullLoadArrow).toBeNull();
    expect(annotation(graphics.list, 'full-load-arrow')).toBeFalsy();
  });

  it('Times[n, "text"] is shown as Mathematica prints it', () => {
    expect(timesText(149, '% full load')).toBe('149 % full load');
    expect(timesText(1725, ' rpm')).toBe('1725  rpm');
    expect(timesText(1, '% full load')).toBe('% full load');
    expect(timesText(0, '% full load')).toBe('0');
    expect(timesText(-1, ' rpm')).toBe('- rpm');
    expect(timesText(-12, ' rpm')).toBe('-12  rpm');
    expect(timesText({ re: 3, im: -1 }, ' rpm')).toBe('(3 - ⅈ)  rpm');
    expect(timesText({ re: 7, im: 0 }, ' rpm')).toBe('7  rpm');
  });

  it('the arrows: locked rotor at {50, T(0) + 30}, maximum at {s_max, T_max + 25} (or {0, T(0) + 25}), full load at {s_fl + 60, 100}', () => {
    const q = quantities(initialState());
    expect(q.lockedArrow).toEqual([50, q.lockedRotor + 30]);
    expect(q.maxArrow[0]).toBe(1344);
    expect(q.maxArrow[1]).toBeCloseTo(312.7962 + 25, 3);
    expect(q.fullLoadArrow[0]).toBeCloseTo(1725.0795 + 60, 3);
    expect(q.fullLoadArrow[1]).toBe(100);
    const past = quantities({ e: 150, r: 1, x: 0.422 }); // 1800 − 1800/0.422 = −2465: the maximum is off the plot
    expect(past.peakSpeed).toBe(-2465);
    expect(past.maxArrow).toEqual([0, past.lockedRotor + 25]);
    expect(evaluate({ e: 150, r: 1, x: 0.422 }).view.labels.maxRpm).toBe('0 rpm');
  });

  it('the picture: the curve, the three labels and the arrows; the plot options of the original', () => {
    const { graphics } = evaluate(initialState());
    expect(textOf(annotation(graphics.list, 'locked-label').g.expr, { sep: '' })).toBe('locked rotor\ntorque\n149 % full load');
    expect(textOf(annotation(graphics.list, 'max-label').g.expr)).toBe('max torque\n313 % full load\n1344 rpm');
    expect(textOf(annotation(graphics.list, 'full-load-label').g.expr)).toBe('full load\ntorque\n1725  rpm');
    for (const id of ['locked-arrow', 'max-arrow', 'full-load-arrow']) expect(annotation(graphics.list, id), id).toBeTruthy();
    expect(graphics.options.PlotRange).toEqual([[0, 1820], [0, 700]]);
    expect(graphics.options.ImageSize).toEqual([500, 300]);
    expect(graphics.options.ImagePadding).toEqual(IMAGE_PADDING);
    expect(graphics.options.Ticks[0]).toEqual([0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800]);
    expect(graphics.options.Ticks[1]).toHaveLength(15);
  });

  it("the NEMA buttons set the original's values", () => {
    expect(NEMA).toEqual({ A: { r: 0.065, x: 0.3263, e: 150 }, B: { r: 0.0792, x: 0.405, e: 158 }, D: { r: 0.384, x: 0.384, e: 150 } });
    // design D: r = x puts the maximum at 0 rpm, where it equals the locked-rotor torque 0.0058667 · 150²/0.384 = 343.75 %
    const d = evaluate(NEMA.D).view;
    expect(d.labels).toEqual({ locked: '344 % full load', max: '344 % full load', maxRpm: '0 rpm', fullLoad: '1532  rpm' });
  });
});

describe('corrected mode (E-IM)', () => {
  it('E-IM-02 corrected: with r > x the "max torque" label shows the locked-rotor torque at 0 rpm; with r ≤ x nothing changes', () => {
    // e = 150, r = 1, x = 0.422: T(0) = 21.12 · 22500 · 1/(1800 (1 + 0.422²)) = 224.09 (the slip form, by hand)
    const st = { e: 150, r: 1, x: 0.422 };
    expect(evaluate(st).view.labels.max).toBe('313 % full load');
    const c = evaluate({ ...st, errata: 'corrected' }).view;
    expect(c.labels.max).toBe('224 % full load');
    expect(c.maxTorqueShown).toBeCloseTo(slipTorque(150, 1, 0.422, 0), 9);
    expect(c.labels.maxRpm).toBe('0 rpm');
    for (const s of grid(6)) {
      const o = evaluate(s).view, k = evaluate({ ...s, errata: 'corrected' }).view;
      if (Math.round(1800 - (1800 * s.r) / s.x) >= 0) expect(k.labels, JSON.stringify(s)).toEqual(o.labels);
      else expect(k.maxTorqueShown).toBeCloseTo(slipTorque(s.e, s.r, s.x, 0), 9);
      // the arrows and the other labels are the same in both modes
      expect(k.maxArrow).toEqual(o.maxArrow);
      expect([k.labels.locked, k.labels.fullLoad]).toEqual([o.labels.locked, o.labels.fullLoad]);
    }
  });
});
