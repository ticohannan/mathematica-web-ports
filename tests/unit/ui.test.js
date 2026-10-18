// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/ui.test.js — the pure parts of shared/ui.js's slider option steps: 'mma' (mmaGrid, mmaSliderText).
// Expected values: k·step products computed independently in Python (IEEE doubles), Mathematica facts quoted in the
// batch drafts (four-bar-linkage T-FB-24, dubins-isochrons T-DI-38 / snapshot 3, dh-parameters T-DH-10 / T-DH-39,
// rrt T-RT-78, robot-singularities D-RS-06 / K-RS-06). The DOM behaviour is tested in tests/e2e/shared-controls.spec.js.
import { describe, it, expect } from 'vitest';
import { mmaGrid, mmaSliderText, fmt } from '../../shared/ui.js';

describe('mmaGrid: Mathematica discrete slider values min + k step', () => {
  // T-FB-24 (four-bar-linkage): separation slider {0, 1.5, 0.05}
  it('slider values are min + k step: separation 0.15 is 0.15000000000000002', () => {
    const g = mmaGrid(0, 1.5, 0.05);
    expect(g.n).toBe(30);
    expect(g.valueAt(3)).toBe(0.15000000000000002); // Python: 3*0.05
    expect(mmaSliderText(g.valueAt(3), { moved: true })).toBe('0.15');
    expect(g.valueAt(18)).toBe(0.9);
    expect(g.valueAt(27)).toBe(1.35);
    expect(g.valueAt(30)).toBe(1.5);
  });
  it('the right end gives max exactly, also when min + n step rounds past it (1.01π, D-RS-06)', () => {
    const g = mmaGrid(-1.01 * Math.PI, 1.01 * Math.PI, 0.01 * Math.PI);
    expect(g.n).toBe(202);
    expect(g.valueAt(202)).toBe(1.01 * Math.PI);
    expect(g.valueAt(101)).toBe(4.440892098500626e-16); // the slider centre in this arithmetic (D-RS-06)
    expect(g.valueAt(60)).toBe(-1.01 * Math.PI + 60 * (0.01 * Math.PI));
  });
  it('an off-grid right end is one extra position after the last grid point: {0, 2.49, 0.05} ends 2.45, 2.49', () => {
    const g = mmaGrid(0, 2.49, 0.05);
    expect(g.endOnGrid).toBe(false);
    expect(g.n).toBe(50);
    expect([g.valueAt(48), g.valueAt(49), g.valueAt(50)]).toEqual([2.4000000000000004, 2.45, 2.49]);
    expect([g.indexOf(2.46), g.indexOf(2.48), g.indexOf(3)]).toEqual([49, 50, 50]);
  });
  it('indexOf is the nearest position, clamped, and inverts valueAt for every position', () => {
    for (const [a, b, s] of [[0, 1.5, 0.05], [0.01, Math.PI, 0.01], [-3.1, 3.1, 0.1], [1, 10, 1], [0, 2.49, 0.05], [-0.1, 6.3, 0.01]]) {
      const g = mmaGrid(a, b, s);
      for (let k = 0; k <= g.n; k++) expect(g.indexOf(g.valueAt(k))).toBe(k);
      expect(g.indexOf(a - 5)).toBe(0);
      expect(g.indexOf(b + 5)).toBe(g.n);
    }
  });
  // T-DI-38 (dubins-isochrons): τ slider {0, …, 0.01}; snapshot 3's Settings hold 4.2700000000000005
  it('a typed 4.27 lands on 0 + 427·0.01 = 4.2700000000000005 and is shown as 4.27', () => {
    const g = mmaGrid(0, 10, 0.01);
    const v = g.valueAt(g.indexOf(4.27));
    expect(v).toBe(4.2700000000000005);
    expect(mmaSliderText(v, { moved: true })).toBe('4.27');
  });
  // T-DH-10 (dh-parameters), the d, r and grip part: {0, 1, 0.01}
  it('d, r and grip take the machine values 0.01 k: 0.81 at k = 81, 1 (max) at k = 100', () => {
    const g = mmaGrid(0, 1, 0.01);
    expect(g.valueAt(81)).toBe(0.81);
    expect(g.valueAt(100)).toBe(1);
  });
  it('other start values: prm-3d θ {-0.1, 6.3, 0.01} gives -0.1 + 35·0.01 = 0.25', () => {
    expect(mmaGrid(-0.1, 6.3, 0.01).valueAt(35)).toBe(0.25); // Python: -0.1 + 35*0.01
  });
});

describe('mmaSliderText: the value text of a Manipulate slider', () => {
  // T-RT-78 (rrt): "0" at start, "0.05" after one step, "0." back at the left end; goal radius "1" → "1.1"
  it('the sliders show their values as text: 0 at start, 0.05 after one step', () => {
    const g = mmaGrid(0, 0.9, 0.05);
    expect(mmaSliderText(0, { moved: false })).toBe('0');
    expect(mmaSliderText(g.valueAt(1), { moved: true })).toBe('0.05');
    expect(mmaSliderText(g.valueAt(0), { moved: true })).toBe('0.');
    expect(mmaSliderText(1, { moved: false })).toBe('1');
    expect(mmaSliderText(1 + 1 * 0.1, { moved: true })).toBe('1.1');
  });
  // T-DH-39 (dh-parameters): a typed 2 is clamped to the max 1 and shown "1."
  it('a moved machine real at an integer value shows a trailing point; integer sliders stay plain', () => {
    expect(mmaSliderText(1, { moved: true })).toBe('1.');
    expect(mmaSliderText(5, { moved: true, realValues: false })).toBe('5'); // Q slider {1, 10, 1}
    expect(mmaSliderText(0.75, { moved: false })).toBe('0.75');
  });
  it('the default text of the first ten apps is unchanged (fmt)', () => {
    expect(fmt(0.15000000000000002, 0.05)).toBe('0.15');
    expect(fmt(2, 1)).toBe('2');
    expect(fmt(0.5, 0)).toBe('0.5');
  });
});
