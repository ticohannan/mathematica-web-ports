// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// The shared additions of v0.1.33 (S-1 … S-7): Plot Exclusions/ExclusionsStyle, ListPlot PlotMarkers and
// InterpolationOrder 0, CheckboxBar, HeavisidePi, JoinForm (LocatorAutoCreate: browser tests of lowpass-filter-design).
import { describe, it, expect } from 'vitest';
import { Plot, ListPlot, ListLinePlot, excludeAt, sample, steps } from '../../shared/plot.js';
import { Cases, Dashed, Graphics, Line, Red, Thick, JoinForm, applyDirective, DEFAULT_STYLE, walk } from '../../shared/graphics.js';
import { parseControl, CheckboxBar, Rule } from '../../shared/manipulate.js';
import { HeavisidePi, UnitStep } from '../../shared/wl.js';

const lines = (g) => Cases(g, 'Line');
const runsOf = (l) => (Array.isArray(l.pts[0][0]) ? l.pts : [l.pts]);

describe('S-1 Plot Exclusions and ExclusionsStyle', () => {
  const step = (x) => UnitStep(x);
  it('breaks the curve at an exclusion, with the left and right limits as its ends', () => {
    const g = Plot(step, [-2, 2], { Exclusions: [0] });
    const [l] = lines(g);
    const runs = runsOf(l);
    expect(runs).toHaveLength(2);
    expect(runs[0].at(-1)[0]).toBeLessThan(0);
    expect(runs[0].at(-1)[1]).toBe(0);
    expect(runs[1][0][0]).toBeGreaterThan(0);
    expect(runs[1][0][1]).toBe(1);
    expect(Math.abs(runs[0].at(-1)[0])).toBeLessThan(1e-6);
  });
  it('without Exclusions the jump is joined (as before)', () => {
    expect(runsOf(lines(Plot(step, [-2, 2]))[0])).toHaveLength(1);
  });
  it('ExclusionsStyle joins the jump with a vertical line in the given style (black, 1 px by default)', () => {
    const g = Plot([step, (x) => x / 4], [-2, 2], { Exclusions: [0], ExclusionsStyle: Dashed });
    const ls = lines(g);
    expect(ls).toHaveLength(3); // two curves + one connector (the second curve does not jump)
    const conn = ls[2];
    expect(conn.pts).toEqual([[0, 0], [0, 1]]);
    let dash = null, colour = null;
    walk(g.list, (p, st) => { if (p === conn) { dash = st.dash; colour = st.color; } });
    expect(dash).toEqual([3, 3]);
    expect(colour).toEqual([0, 0, 0]);
  });
  it('excludeAt ignores points outside (a, b) and returns the jumps of every curve', () => {
    const f = (x) => [UnitStep(x - 1), 2];
    const s = sample(f, [0, 2], {});
    const r = excludeAt(f, s, [0, 2], [1, 5, -1]);
    expect(r.jumps).toHaveLength(1);
    expect(r.jumps[0].left).toEqual([0, 2]);
    expect(r.jumps[0].right).toEqual([1, 2]);
    expect(r.xs.every((x, i) => i === 0 || x > r.xs[i - 1])).toBe(true);
  });
});

describe('S-2 ListPlot PlotMarkers and S-3 InterpolationOrder 0', () => {
  it('PlotMarkers -> {g, s}: an Inset of g at each point, s × the image width wide', () => {
    const cross = Graphics([Red, Thick, Line([[-0.5, -0.5], [0.5, 0.5]]), Line([[-0.5, 0.5], [0.5, -0.5]])]);
    const g = ListPlot([[-1, 1], [-1, -1]], { PlotMarkers: [cross, 0.06], ImageSize: [220, 350] });
    const insets = Cases(g, 'Inset');
    expect(insets).toHaveLength(2);
    expect(insets[0].pos).toEqual([-1, 1]);
    expect(insets[0].graphics.options.ImageSize).toBeCloseTo(13.2, 6);
    expect(insets[0].graphics.options.PlotRange).toEqual([[-0.5, 0.5], [-0.5, 0.5]]);
    expect(Cases(g, 'Point')).toHaveLength(0);
  });
  it('InterpolationOrder 0: each y held from its x to the next x', () => {
    expect(steps([[0, 1], [2, 3], [5, 0]])).toEqual([[0, 1], [2, 1], [2, 3], [5, 3], [5, 0]]);
    const g = ListLinePlot([[0, 1], [2, 3], [5, 0]], { InterpolationOrder: 0 });
    expect(lines(g)[0].pts).toEqual([[0, 1], [2, 1], [2, 3], [5, 3], [5, 0]]);
    expect(lines(ListLinePlot([[0, 1], [2, 3]]))[0].pts).toEqual([[0, 1], [2, 3]]);
  });
});

describe('S-4 CheckboxBar, S-6 HeavisidePi, S-7 JoinForm', () => {
  it('parses a CheckboxBar control with Rule labels', () => {
    const c = parseControl([['checked', [1, 2], 'display: '], [Rule(1, 'x'), Rule(2, 'y'), Rule(3, 'z')], { ControlType: CheckboxBar }]);
    expect(c.kind).toBe('checkboxbar');
    expect(c.init).toEqual([1, 2]);
    expect(c.values.map((v) => v.value)).toEqual([1, 2, 3]);
  });
  it('HeavisidePi is 1 inside |x| < 1/2 and 0 outside', () => {
    expect([-1, -0.49, 0, 0.49, 0.51].map(HeavisidePi)).toEqual([0, 1, 1, 1, 0]);
  });
  it('JoinForm sets the corner style', () => {
    expect(applyDirective(DEFAULT_STYLE, JoinForm('Bevel')).join).toBe('bevel');
    expect(applyDirective(DEFAULT_STYLE, JoinForm('Miter')).join).toBe('miter');
    expect(DEFAULT_STYLE.join).toBeUndefined();
  });
});
