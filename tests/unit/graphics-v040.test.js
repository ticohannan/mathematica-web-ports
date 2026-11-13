// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/graphics-v040.test.js — the pure parts of the v0.1.40 additions to shared/graphics.js (the drawing is tested
// in the browser: tests/e2e/graphics-v040.spec.js).
import { describe, it, expect } from 'vitest';
import { Arrowheads, ARROWHEAD_SIZES, Framed, RotatedText, Mouseover, Disk, Style, textOf, bounds, fitPlotRange, scaleGraphics } from '../../shared/graphics.js';

describe('shared/graphics.js v0.1.40', () => {
  it('Arrowheads[Large] is the measured size; an unmeasured name is an error, not a guess', () => {
    expect(Arrowheads('Large').value).toBe(ARROWHEAD_SIZES.Large);
    expect(() => Arrowheads('Small')).toThrow(/not measured/);
    expect(Arrowheads([[0.035, 0.325], [-0.035, 0.675]]).value).toEqual([[0.035, 0.325], [-0.035, 0.675]]);
  });
  it('Framed options: RoundingRadius, FrameMargins Tiny', () => {
    const f = Framed('A', { RoundingRadius: 15, FrameMargins: 'Tiny' });
    expect([f.RoundingRadius, f.FrameMargins]).toEqual([15, 1]);
  });
  it('RotatedText and Framed are read through by textOf', () => {
    expect(textOf(RotatedText(Style('10.6', 18), 0.5))).toBe('10.6');
    expect(textOf(Framed(RotatedText('x', 1)))).toBe('x');
  });
  it('Mouseover: its bounds are those of the shown form; scaling reaches both forms', () => {
    const m = Mouseover(Disk([0, 0], 1), Disk([5, 5], 1));
    expect(bounds(m)).toEqual(bounds(Disk([0, 0], 1)));
    expect(scaleGraphics(m, [1, 2]).a.r).toEqual([1, 2]); expect(scaleGraphics(m, [1, 2]).b.c).toEqual([5, 10]);
  });
  it('fitPlotRange widens the range to the shape of the image, centred', () => {
    expect(fitPlotRange([[0, 10], [0, 10]], [600, 300])).toEqual([[-5, 15], [0, 10]]);
    expect(fitPlotRange([[0, 10], [0, 1]], [600, 300])).toEqual([[0, 10], [-2, 3]]);
    const r = fitPlotRange([[-2.6, 14.1], [-5.4, 9.1]], [605, 300]);
    expect((r[1][1] - r[1][0]) / (r[0][1] - r[0][0])).toBeCloseTo(300 / 605, 12);
  });
});
