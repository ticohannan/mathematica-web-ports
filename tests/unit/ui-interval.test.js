// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/ui-interval.test.js — the pure parts of shared/ui-interval.js (Mathematica's IntervalSlider).
// Test titles and expected values are those of the four-bar-linkage TESTPLAN (T-FB-21 … T-FB-23) and the
// manipulator-workspaces TESTPLAN (T-MW-21 … T-MW-23): k·step products in IEEE doubles (Python), the Method and
// MinIntervalSize rules of the IntervalSlider documentation. The DOM control is tested in
// tests/e2e/shared-controls.spec.js.
import { describe, it, expect } from 'vitest';
import { intervalStep, intervalShift, intervalLabel } from '../../shared/ui-interval.js';

const FB = { min: 0, max: 2.49, step: 0.05, minIntervalSize: 0.1, method: 'Push' }; // four-bar link lengths
const MW = { min: -3.1, max: 3.1, step: 0.1, minIntervalSize: 0.1, method: 'Push' }; // manipulator ranges

describe('IntervalSlider (four-bar-linkage)', () => {
  it('IntervalSlider: Push keeps at least 0.1 between the thumbs and stops at 0 and 2.49', () => { // T-FB-21
    expect(intervalStep([1.35, 2], 'hi', 0, FB)).toEqual([0, 0.1]);
    expect(intervalStep([1.35, 2.49], 'lo', 2.49, FB)).toEqual([2.35, 2.49]); // 2.4000000000000004 would leave 0.09
  });
  it('IntervalSlider values are min + k step and the right end gives 2.49', () => { // T-FB-22
    const at = (k) => intervalStep([0, 0.1], 'hi', k * 0.05, FB)[1];
    expect([at(24), at(41), at(48)]).toEqual([1.2000000000000002, 2.0500000000000003, 2.4000000000000004]);
    expect(intervalStep([0, 0.1], 'hi', 2.49, FB)[1]).toBe(2.49);
    expect(intervalStep([0, 0.1], 'hi', 2.47, FB)[1]).toBe(2.45); // nearer the last grid point than the end
  });
  it('interval label shows {1.35, 2} at the start and reals with a trailing point after a change', () => { // T-FB-23
    expect(intervalLabel([1.35, 2])).toBe('{1.35, 2}');
    let v = intervalStep([1.35, 2], 'hi', 41 * 0.05, FB);
    expect(intervalLabel(v, [false, false])).toBe('{1.35, 2.05}');
    v = intervalStep(v, 'hi', 40 * 0.05, FB);
    expect(v[1]).toBe(2); // 40·0.05 = 2.0
    expect(intervalLabel(v, [false, false])).toBe('{1.35, 2.}');
    expect(intervalLabel([1.0, 2.0], [false, false])).toBe('{1., 2.}'); // snapshot 2's machine values
  });
  it('dragging the upper thumb from 2 to 1.0 pushes the lower one to 0.9 (T-FB-57, model part)', () => {
    const v = intervalStep([1.35, 2], 'hi', 1.0, FB);
    expect(v).toEqual([18 * 0.05, 20 * 0.05]);
    expect(intervalLabel(v, [false, false])).toBe('{0.9, 1.}');
  });
});

describe('IntervalSlider (manipulator-workspaces)', () => {
  it('IntervalSlider Push: dragging the lower thumb above the upper pushes it, keeping MinIntervalSize 0.1', () => { // T-MW-21
    expect(intervalStep([0.5, 1.5], 'lo', -3.1 + 46 * 0.1, MW)).toEqual([1.5000000000000004, 1.6]);
  });
  it('IntervalSlider: a pushed thumb stops at the range end and the pushing thumb 0.1 before it', () => { // T-MW-22
    expect(intervalStep([2.5, 3.0], 'lo', 3.1, MW)).toEqual([3.0000000000000004, 3.1]);
  });
  it('IntervalSlider values are min + k step and are clamped to -3.1..3.1', () => { // T-MW-23
    expect(intervalStep([0.5, 1.5], 'lo', -4, MW)[0]).toBe(-3.1);
    expect(intervalStep([-3.1, 1.5], 'lo', 0.47, MW)[0]).toBe(0.5); // k = 36: -3.1 + 36·0.1
    expect(intervalStep([0.5, 1.5], 'hi', 4, MW)[1]).toBe(3.1);
  });
});

describe('IntervalSlider methods and the bar', () => {
  it('Stop: a thumb cannot be dragged past the other (it stops MinIntervalSize before it)', () => {
    const S = { ...FB, method: 'Stop' };
    expect(intervalStep([1.35, 2], 'lo', 2.3, S)).toEqual([1.9000000000000001, 2]); // 38·0.05, 0.1 below 2
    expect(intervalStep([1.35, 2], 'hi', 0, S)).toEqual([1.35, 1.4500000000000002]); // 29·0.05
    expect(intervalStep([1.35, 2], 'lo', 1.0, S)).toEqual([1, 2]); // free movement away from the other thumb
  });
  it('Free (Mathematica\'s default): a thumb may pass the other; the value stays ordered', () => {
    const F = { min: 0, max: 10, step: 1 };
    expect(intervalStep([2, 5], 'lo', 8, F)).toEqual([5, 8]);
    expect(intervalStep([2, 5], 'hi', 1, F)).toEqual([1, 2]);
  });
  it('MinIntervalSize 0 lets the thumbs meet; a continuous slider is not snapped', () => {
    expect(intervalStep([2, 5], 'lo', 5, { min: 0, max: 10, step: 1, method: 'Push' })).toEqual([5, 5]);
    expect(intervalStep([0.2, 0.7], 'lo', 0.333, { min: 0, max: 1, step: 0, minIntervalSize: 0.1, method: 'Push' })).toEqual([0.333, 0.7]);
  });
  it('the bar moves both thumbs by whole positions and stops at the range ends', () => {
    expect(intervalShift([0.5, 1.5], 3, MW)).toEqual([-3.1 + 39 * 0.1, -3.1 + 49 * 0.1]);
    expect(intervalShift([2.5, 3.0], 5, MW)).toEqual([-3.1 + 57 * 0.1, 3.1]); // stops at the right end
    expect(intervalShift([-2.9, 0], -10, MW)).toEqual([-3.1, -3.1 + 29 * 0.1]);
  });
});
