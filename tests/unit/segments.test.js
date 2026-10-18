// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Li Huang; Shiva Shahrokhi and Aaron T. Becker; Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/segments.test.js — demos/common/segments.js (owner rrt, COMMON-DECISIONS §3) against the originals'
// definitions of λ / Gamma, lineIntersectionPoint and segmentIntersectionQ. Expected values by hand (IEEE arithmetic
// written out in the test, never through the module) and from shared/mma-exact.js det for machine determinants.
import { describe, it, expect } from 'vitest';
import { Gamma, lineIntersectionPoint, segmentIntersectionQ, det2, isExactSegment } from '../../demos/common/segments.js';
import { det } from '../../shared/mma-exact.js';

describe('demos/common/segments.js', () => {
  it('segments: λ is ((a - p).(a - b)) times 1/((a - b).(a - b)): 0.9999999999999999 for 49 · (1/49)', () => {
    // a = (0, 0), b = (7, 0), p = (7, 0): numerator (−7)(−7) = 49, denominator 49; 49·(1/49) rounds below 1
    const oneOver49 = 1 / 49;
    expect(49 * oneOver49).toBe(0.9999999999999999);
    expect(Gamma([[0, 0], [7, 0]])([7, 0])).toBe(0.9999999999999999);
    expect(Gamma([[0, 0], [2, 2]])([1, 1])).toBe(0.5);
    expect(Gamma([[0, 0], [1, 0]])([2, 5])).toBe(2); // the foot of the perpendicular, outside the segment
    expect(Gamma([[0, 0], [1, 0]])([-0.5, 3])).toBe(-0.5);
  });

  it('segments: lineIntersectionPoint of crossing diagonals is (1, 1); the quotient is a product with 1/Det', () => {
    expect(lineIntersectionPoint([[[0, 0], [2, 2]], [[0, 2], [2, 0]]])).toEqual([1, 1]);
    // machine segments: Det[{a, b}] = 0, Det[{c, d}] = −0.2·0.3 − 0.7·0.1 … written out: c = (0.1, 0.7), d = (0.3, 0.1)
    const a = [0.5, 0.5], b = [0.25, 0.25], c = [0.1, 0.7], d = [0.3, 0.1];
    const dab = det([a, b]), dcd = det([c, d]), den = det([[a[0] - b[0], a[1] - b[1]], [c[0] - d[0], c[1] - d[1]]]);
    const r = 1 / den;
    const expected = [(dab * (c[0] - d[0]) - dcd * (a[0] - b[0])) * r, (dab * (c[1] - d[1]) - dcd * (a[1] - b[1])) * r];
    expect(lineIntersectionPoint([[a, b], [c, d]])).toEqual(expected);
    expect(expected[0]).toBeCloseTo(0.25, 14);
    expect(expected[1]).toBeCloseTo(0.25, 14);
  });

  it('segments: crossing, touching, parallel and missing segments', () => {
    expect(segmentIntersectionQ([[[0, 0], [2, 2]], [[0, 2], [2, 0]]])).toBe(true); // λ 1/2 on both
    expect(segmentIntersectionQ([[[0, 0], [1, 0]], [[0, 1], [1, 1]]])).toBe(false); // parallel: Det 0
    expect(segmentIntersectionQ([[[0, 0], [1, 0]], [[1, 0], [1, 1]]])).toBe(true); // shared end point: λ 1 and 0 (inclusive)
    expect(segmentIntersectionQ([[[0, 0], [1, 0]], [[2, 1], [2, -1]]])).toBe(false); // λ 2 on the first segment
    expect(segmentIntersectionQ([[[0, 0], [2, 0]], [[1, 0], [3, 0]]])).toBe(false); // collinear overlap: Det 0 (original quirk)
  });

  it('segments: λ just outside [0, 1] counts when within Mathematica\'s tolerance (2^-46 relative)', () => {
    // a vertical edge x = 1 from y = 0 to y = 1 and a horizontal step ending at x = 1 (1 + 2^-50): λ on the step is
    // 1 + 2^-50 > 1 but tolerantly equal to 1
    const end = 1 + 2 ** -50;
    expect(segmentIntersectionQ([[[0, 0.5], [1 / end, 0.5]], [[1, 0], [1, 1]]], { exact: [false, true] })).toBe(true);
    expect(segmentIntersectionQ([[[0, 0.5], [1 / (1 + 2 ** -40), 0.5]], [[1, 0], [1, 1]]], { exact: [false, true] })).toBe(false);
  });

  it('segments: exact flags choose integer Det or the machine Det of shared/mma-exact.js', () => {
    expect(det2([1, 3], [1, 3], true)).toBe(0);
    expect(det2([1, 3], [1, 3], false)).toBe(det([[1, 3], [1, 3]]));
    expect(det([[1, 3], [1, 3]])).not.toBe(0); // the LU Det of the machine matrix is not exactly 0
    expect(det2([1, 3], [1, 4])).toBe(1); // default: integers are exact
    expect(isExactSegment([[0, 0], [5, -21]])).toBe(true);
    expect(isExactSegment([[0, 0], [5.5, -21]])).toBe(false);
    // collinear overlapping segments: exact Det 0 → False; as machine numbers Det is −1.67e-16, the "intersection"
    // is the origin with λ 0 and λ 1 → True
    const segs = [[[0, 0], [-1, -3]], [[1, 3], [0, 0]]];
    expect(segmentIntersectionQ(segs)).toBe(false);
    expect(segmentIntersectionQ(segs, { exact: [false, false] })).toBe(true);
  });
});
