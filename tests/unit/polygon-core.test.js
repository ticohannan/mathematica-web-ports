// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana; Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/polygon-core.test.js — demos/common/polygon-core.js (owner minkowski-sum, COMMON-DECISIONS §3): the
// polygon helpers moved from motion-planning and art-gallery. Expected values by hand from the originals' definitions;
// the users' own golden tests (parity, art-gallery golden) guard that the move changed no result.
import { describe, it, expect } from 'vitest';
import {
  lineList, vector, areaCalulation, areaOfPoly, centroidCal, centroidOfPoly, discretizeLineRev1, sameQ, sameRealQ,
} from '../../demos/common/polygon-core.js';
import * as planner from '../../demos/motion-planning/planner.js';
import * as visibility from '../../demos/art-gallery/visibility.js';
import * as minkowski from '../../demos/minkowski-sum/minkowski.js';

const up = (x, k = 1) => { const b = new Float64Array([x]); const i = new BigInt64Array(b.buffer); i[0] += BigInt(k); return b[0]; };

describe('polygon-core', () => {
  it('lineList closes the polygon: Partition[Append[list, First[list]], 2, 1]', () => {
    expect(lineList([[0, 0], [1, 0], [0, 1]])).toEqual([[[0, 0], [1, 0]], [[1, 0], [0, 1]], [[0, 1], [0, 0]]]);
    expect(lineList([[2, 3]])).toEqual([[[2, 3], [2, 3]]]);
  });
  it('vector is the first point minus the second', () => {
    expect(vector([[3, 5], [1, 1]])).toEqual([2, 4]);
  });
  it('areaOfPoly is the signed shoelace area (counter-clockwise positive), areaCalulation the cross term', () => {
    expect(areaCalulation([[1, 2], [3, 4]])).toBe(1 * 4 - 3 * 2);
    expect(areaOfPoly([[0, 0], [2, 0], [2, 1], [0, 1]])).toBe(2);
    expect(areaOfPoly([[0, 1], [2, 1], [2, 0], [0, 0]])).toBe(-2);
  });
  it('centroidOfPoly: shoelace centroid, the vertex mean for zero area', () => {
    expect(centroidCal([[1, 2], [3, 4]])).toEqual([4 * -2, 6 * -2]);
    expect(centroidOfPoly([[0, 0], [2, 0], [2, 1], [0, 1]])).toEqual([1, 0.5]);
    expect(centroidOfPoly([[0, 0], [1, 1], [2, 2]])).toEqual([1, 1]);
  });
  it('discretizeLineRev1: Floor[1/h + 1e-12] + 1 points, h = step·(1/d)', () => {
    expect(discretizeLineRev1([[0, 0], [0, 0.03]], 0.01).length).toBe(4);
    expect(discretizeLineRev1([[0, 0], [0, 0.035]], 0.01).length).toBe(4);
    expect(discretizeLineRev1([[5, 5], [5, 5]], 0.01)).toEqual([[5, 5]]);
  });
  it('sameQ: equal up to one unit in the last place, component-wise', () => {
    expect(sameRealQ(2.885, up(2.885))).toBe(true);
    expect(sameRealQ(2.885, up(2.885, 2))).toBe(false);
    expect(sameRealQ(0, -0)).toBe(true);
    expect(sameQ([1, up(2)], [1, 2])).toBe(true);
    expect(sameQ([1, 2], [1, 2, 3])).toBe(false);
  });
  it('motion-planning, art-gallery and minkowski-sum use the same functions (moved, not copied)', () => {
    for (const f of ['lineList', 'vector', 'areaOfPoly', 'centroidOfPoly', 'discretizeLineRev1']) {
      expect(planner[f], f).toBe({ lineList, vector, areaOfPoly, centroidOfPoly, discretizeLineRev1 }[f]);
      expect(minkowski[f], f).toBe(planner[f]);
    }
    expect(visibility.sameQ).toBe(sameQ);
    expect(visibility.lineList).toBe(lineList);
    expect(visibility.vector).not.toBe(vector); // art-gallery's own vector: second point minus first
    expect(visibility.vector([[3, 5], [1, 1]])).toEqual([-2, -4]);
  });
});
