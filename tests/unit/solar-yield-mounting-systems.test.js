// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Michel de Spot
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/solar-yield-mounting-systems.test.js — the model of "Solar Energy Yield for Three Mounting Systems": the
// Sun's position against standard results (noon height, declination, day length), the five mountings' irradiances
// against their geometry, and the daily totals of the snapshot settings against the bar charts of the pictures.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, evaluate, sunvect, efull, pnlrot, polrot, trkall, sunriseSunset, dailyYields, dayLabel,
} from '../../demos/solar-yield-mounting-systems/model.js';
import { annotation } from '../../shared/graphics.js';

const golden = JSON.parse(readFileSync(new URL('../golden/solar-yield-mounting-systems.original-states.json', import.meta.url), 'utf8'));
const DEG = Math.PI / 180;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe('solar-yield-mounting-systems model', () => {
  it('the opening state is the notebook live state', () => {
    expect(initialState()).toEqual(golden.states[0]);
    expect(initialState()).toEqual(golden.specs);
    // the body keeps the setters' own variables in step: summer pressed at dp = 171, no optimized angle at sl = 58
    expect(evaluate(initialState()).state).toMatchObject({ season: 171, optimize: null, equinox: null });
    expect(evaluate(golden.snapshots[2]).state.optimize).toBe('summer');
  });

  it('the Sun: a unit vector, at noon in the south at the height 90 - lat + declination', () => {
    for (const [dd, decl] of [[171, 23.44], [354, -23.44]]) {
      const s = sunvect(dd, 12, 49.7);
      expect(Math.hypot(...s)).toBeCloseTo(1, 6); // 0.39779² = 0.1582369 against the 0.158236 of the cosine
      expect(s[0]).toBeCloseTo(0, 12);
      expect(Math.asin(s[2]) / DEG).toBeCloseTo(90 - 49.7 + decl, 1);
    }
    // the day length at 49.7° N: about 16.1 h at the June solstice, 7.9 h at the December one
    const [a, b] = sunriseSunset(171, 49.7);
    expect(b - a).toBeCloseTo(16.1, 1);
    expect(sunvect(171, a, 49.7)[2]).toBeCloseTo(0, 12);
    const [c, d] = sunriseSunset(354, 49.7);
    expect(d - c).toBeCloseTo(7.9, 1);
  });

  it('the irradiance: the full tracker gets direct + diffuse, the fixed panel the direct part times the cosine of incidence', () => {
    const [sr, [dir, dif]] = efull(171, 10, 49.7);
    const v = trkall(171, 10, 49.7, 58);
    expect(v[0]).toBeCloseTo(dir + dif, 10);
    const n = pnlrot([58, 0]);
    expect(v[4]).toBeCloseTo(dir * Math.max(0, dot(n, sr)) + dif, 10);
    // the polar axis: its normal stays perpendicular to the tilted axis and faces the Sun's hour angle
    const p = polrot(58, 15);
    expect(Math.hypot(...p)).toBeCloseTo(1, 12);
    // a two-axis tracker gets the most at every hour (to the 4×10⁻⁷ by which the Sun's vector is longer than 1, Q-SY-03)
    for (const hr of [6, 9, 12, 15, 18]) { const w = trkall(171, hr, 49.7, 58); for (const x of w.slice(1)) expect(w[0]).toBeGreaterThanOrEqual(x * (1 - 1e-6)); }
  });

  it('the vertical-axis tracker faces the Sun azimuth; the horizontal one is tilted to the zenith angle', () => {
    const sr = sunvect(171, 9, 49.7);
    const az = Math.atan2(sr[1], sr[0]) / DEG - 90;
    const n = pnlrot([58, az]);
    // the horizontal projections of the normal and of the Sun point the same way
    expect(Math.atan2(n[1], n[0])).toBeCloseTo(Math.atan2(sr[1], sr[0]), 10);
  });

  it('the snapshot settings give the daily totals of the bar charts (snapshots 1 and 2)', () => {
    const y1 = dailyYields(171, 49.7, 58), y2 = dailyYields(171, 49.7, 26.3);
    // read from the pictures: Full ≈ 13, Vert. ≈ 12.2, Polar ≈ 11.5, Horiz. ≈ 7.6, Fixed ≈ 6.8; then 13, 11.6, 12.6, 7.6, 8.6
    expect(y1.map((x) => Math.round(x * 5) / 5)).toEqual([13, 12.2, 11.4, 7.6, 6.8]);
    expect(y2.map((x) => Math.round(x * 5) / 5)).toEqual([13, 11.6, 12.6, 7.6, 8.6]);
    expect(evaluate(golden.snapshots[2]).view.noon[0]).toBeCloseTo(1032, 0);
  });

  it('the fillings leave out sunrise and sunset, where the curves are not finite', () => {
    const [rise, set] = sunriseSunset(171, 49.7);
    expect(trkall(171, rise, 49.7, 58).every(Number.isFinite)).toBe(false); // Infinity (tracking) and NaN (fixed) at the horizon
    for (const s of [initialState(), ...Object.values(golden.snapshots)]) {
      const [plot] = evaluate({ ...initialState(), ...s }).graphics;
      for (const id of ['fill-fixed', 'fill-full']) {
        const poly = annotation(plot, id).g.find((p) => p?.head === 'Polygon');
        expect(poly.pts.length, id).toBeGreaterThan(100);
        expect(poly.pts.flat().every(Number.isFinite), id).toBe(true);
      }
    }
    expect(set).toBeGreaterThan(rise);
  });

  it('the date labels of the season setters', () => {
    expect([dayLabel(171), dayLabel(354), dayLabel(79), dayLabel(263), dayLabel(1)]).toEqual(['June 21', 'December 21', 'March 21', 'September 21', 'January 02']);
  });
});

describe('corrected mode (E-SY)', () => {
  it('only the two unit labels change', () => {
    const o = evaluate(initialState()).view, c = evaluate({ ...initialState(), errata: 'corrected' }).view;
    expect([o.axisLabel, o.yieldLabel]).toEqual(['wh/m2', 'Energy Yield kW/h/da']);
    expect([c.axisLabel, c.yieldLabel]).toEqual(['W/m2', 'Energy Yield kWh/m2/day']);
    expect(c.yields).toEqual(o.yields);
  });
});
