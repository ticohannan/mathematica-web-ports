// tests/unit/mma.test.js — Mathematica-semantics helpers
import { describe, it, expect } from 'vitest';
import { arcTan, mod, roundHalfEven, roundTo, circlePoints, sortMma, mEqual, mLess, chop } from '../../shared/mma.js';

describe('arcTan (Mathematica ArcTan[x, y])', () => {
  it('takes x first, y second', () => {
    expect(arcTan(0, 1)).toBeCloseTo(Math.PI / 2, 15);
    expect(arcTan(1, 0)).toBe(0);
  });
  it('treats -0 like +0 (Mathematica has no signed zero): ArcTan[-1, 0] = Pi, never -Pi', () => {
    expect(arcTan(-1, -0)).toBe(Math.PI);
    expect(arcTan(-1, 0)).toBe(Math.PI);
  });
});

describe('mod / round', () => {
  it('Mod[m, n, d] lands in [d, d+n)', () => {
    expect(mod(Math.PI, 2 * Math.PI, -Math.PI)).toBeCloseTo(-Math.PI, 15);
    expect(mod(-Math.PI, 2 * Math.PI, -Math.PI)).toBeCloseTo(-Math.PI, 15);
    expect(mod(7, 5)).toBe(2);
    expect(mod(-1, 5)).toBe(4);
  });
  it('Round goes half to even', () => {
    expect([0.5, 1.5, 2.5, -0.5, -1.5, -2.5].map(roundHalfEven)).toEqual([0, 2, 2, -0, -2, -2]);
    expect(roundTo(1.5434, 0.001)).toBeCloseTo(1.543, 12);
  });
});

describe('circlePoints (CirclePoints[n])', () => {
  it('starts at angle -pi/2 + pi/n and goes counter-clockwise (flat bottom edge)', () => {
    const tri = circlePoints(3);
    expect(tri[0][0]).toBeCloseTo(Math.sqrt(3) / 2, 15);
    expect(tri[0][1]).toBe(-0.5);
    expect(tri[1]).toEqual([0, 1]);
    expect(tri[2][1]).toBe(-0.5);
  });
  it('mirror-symmetric vertices are bit-identical (as with exact radicals in Mathematica)', () => {
    for (const n of [3, 4, 5, 6]) {
      const p = circlePoints(n);
      // reflection about the y axis maps vertex k to vertex (n-1-k) mod n ... check the flat bottom edge
      expect(p[0][1]).toBe(p[n - 1][1]);
      expect(p[0][0]).toBe(-p[n - 1][0]);
    }
    const sq = circlePoints(4);
    expect(sq[0][0]).toBe(sq[1][0]); // vertical right edge exactly vertical
  });
  it('all points are on the unit circle', () => {
    for (const n of [3, 4, 5, 6, 7]) for (const [x, y] of circlePoints(n)) expect(Math.hypot(x, y)).toBeCloseTo(1, 14);
  });
});

describe('sortMma (Sort[list, p])', () => {
  it('sorts by the predicate', () => {
    expect(sortMma([3, 1, 2], (a, b) => a < b)).toEqual([1, 2, 3]);
  });
  it('with a strict predicate, tied elements end up in reverse input order', () => {
    const items = [{ k: 1, id: 'a' }, { k: 1, id: 'b' }, { k: 0, id: 'c' }];
    expect(sortMma(items, (x, y) => x.k < y.k).map((o) => o.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('tolerant comparisons (Equal / Less on machine reals)', () => {
  it('Equal ignores the last few bits', () => {
    expect(mEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(mEqual(1, 1 + 1e-10)).toBe(false);
    expect(mEqual([1, 2], [1, 2 + 1e-17])).toBe(true);
  });
  it('comparison with exact 0 is exact', () => {
    expect(mEqual(1e-300, 0)).toBe(false);
  });
  it('Less is false for numbers that are Equal', () => {
    expect(mLess(0.3, 0.1 + 0.2)).toBe(false);
  });
  it('Chop removes |x| < 1e-10', () => {
    expect(chop([1e-11, -1e-11, 1e-9])).toEqual([0, 0, 1e-9]);
  });
});
