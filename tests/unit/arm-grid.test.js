// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Haoran Zhao; Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/arm-grid.test.js — demos/common/arm-grid.js, the configuration-space grid code shared by "Robot Motion with
// Obstacles" and "Breadth-First Search Robot Motion Planning" (TESTPLAN of robot-motion-obstacles, T-RM-01…03,
// T-RM-07…12, T-RM-18, T-RM-19). Expected values: IEEE double arithmetic of the source lines and hand derivations
// (the draft's independent Python reference design/robot-motion-obstacles/ref/cspace.py), never the port.
import { describe, it, expect } from 'vitest';
import {
  xMin, yMin, xMax, yMax, W, L, PLOT_RANGE, IMAGE_SIZE, OBS_RANGE, CONFIG_RANGE, clampTo, pointsegdis2, armHits,
  tableCount, tableAngles, cSpaceTable, applyTorus, locatorToAngles, arrayPlotColors,
} from '../../demos/common/arm-grid.js';

const count = (grid, v) => grid.reduce((s, row) => s + row.filter((x) => x === v).length, 0);
const px = (rgba, i) => Array.from(rgba.data.slice(4 * i, 4 * i + 3));

describe('arm-grid constants', () => {
  it('xMin, yMin, xMax, yMax in machine arithmetic: 2.9, -2, 6.699999999999999, 1.7999999999999998', () => {
    expect([xMin, yMin, xMax, yMax]).toEqual([2.9, -2, 6.699999999999999, 1.7999999999999998]);
    expect(xMax - xMin).toBe(3.7999999999999994);
    expect(yMax - yMin).toBe(3.8);
    expect([W, L]).toEqual([0.125, 1]);
    expect(PLOT_RANGE).toEqual([[-2.2, 7.1], [-2.4, 2.4]]);
    expect(IMAGE_SIZE).toEqual([600, 320]);
  });
  it('obstacle locators are limited to -2..2 and the configuration locator to {2.8, -2.1}..{6.799999999999999, 1.9}', () => {
    expect(OBS_RANGE).toEqual([[-2, -2], [2, 2]]);
    expect(CONFIG_RANGE).toEqual([[2.8, -2.1], [6.799999999999999, 1.9]]);
    expect(clampTo([3, -5], OBS_RANGE)).toEqual([2, -2]);
    expect(clampTo([7, 2], CONFIG_RANGE)).toEqual([6.799999999999999, 1.9]);
    expect(clampTo([0.5, -0.25], OBS_RANGE)).toEqual([0.5, -0.25]);
  });
});

describe('pointsegdis2', () => {
  it('pointsegdis2 is the distance to the nearest point of the segment, clamped to the end points', () => {
    for (const seg of [[[0, 0], [1, 0]], [[1, 0], [0, 0]]]) {
      expect(pointsegdis2([seg, [[0.5, 0.3]]])).toBe(0.3); // projection inside the segment
      expect(pointsegdis2([seg, [[2, 0]]])).toBe(1); // beyond one end
      expect(pointsegdis2([seg, [[-1, 1]]])).toBe(Math.SQRT2); // before the other end
    }
  });
  it('pointsegdis2 takes the minimum over the point list', () => {
    expect(pointsegdis2([[[1, 0], [0, 0]], [[2, 0], [0.5, 0.3]]])).toBe(0.3);
    expect(pointsegdis2([[[1, 0], [0, 0]], [[0.5, 0.3], [2, 0]]])).toBe(0.3);
  });
});

describe('torus wrap and angles', () => {
  it('a configuration locator left of xMin jumps to xMax and one right of xMax jumps to xMin', () => {
    const a = applyTorus([2.85, 0]);
    expect(a).toEqual([6.699999999999999, 0]);
    expect(locatorToAngles(a)[0]).toBe(6.283185307179586);
    const b = applyTorus([6.75, 0]);
    expect(b).toEqual([2.9, 0]);
    expect(locatorToAngles(b)[0]).toBe(0);
  });
  it('a configuration locator below yMin jumps to yMax and one above yMax jumps to yMin', () => {
    const a = applyTorus([5, -2.05]);
    expect(a).toEqual([5, 1.7999999999999998]);
    // a·(1/b): 3.8·(1/3.8) = 0.9999999999999999 → 6.283185307179585 (a true division gives …586; H-RM-19 decides)
    expect(locatorToAngles(a)[1]).toBe(6.283185307179585);
    const b = applyTorus([5, 1.85]);
    expect(b).toEqual([5, -2]);
    expect(locatorToAngles(b)[1]).toBe(0);
  });
  it('a configuration locator exactly on an edge does not wrap (tolerant Less)', () => {
    for (const p of [[2.9, 0], [6.699999999999999, 0], [5, -2], [5, 1.7999999999999998], [2.9 - 2.9 * 2 ** -50, 0]]) expect(applyTorus(p)).toEqual(p);
  });
  it('applyTorus maps x < xMin to xMax, x > xMax to xMin and the same for y', () => {
    expect(applyTorus([2.85, 0])).toEqual([6.699999999999999, 0]);
    expect(applyTorus([6.75, 0])).toEqual([2.9, 0]);
    expect(applyTorus([5, -2.05])).toEqual([5, 1.7999999999999998]);
    expect(applyTorus([5, 1.85])).toEqual([5, -2]);
    expect(applyTorus([2.9, 0])).toEqual([2.9, 0]);
    expect(applyTorus([6.75, 1.85])).toEqual([2.9, -2]); // both at once (H-RM-07)
  });
  it('locator {5, 0} gives Theta1 3.4722866171255617 and Theta2 3.306939635357677', () => {
    // (((5 - 2.9)·(1/3.7999999999999994))·2)·π and (((0 + 2)·(1/3.8))·2)·π in doubles (ref/divcheck.py)
    expect(locatorToAngles([5, 0])).toEqual([3.4722866171255617, 3.306939635357677]);
  });
});

describe('the configuration-space table', () => {
  it('exactPi: a whole res starts at the correctly rounded π/res (res 48: 0.06544984694978737), other res at π·(1/res)', () => {
    expect(tableAngles(48)[0]).toBe(0.06544984694978735);
    const e = tableAngles(48, { exactPi: true });
    expect(e.length).toBe(48);
    expect(e[0]).toBe(0.06544984694978737);
    expect(e[1]).toBe(0.06544984694978737 + 2 * 0.06544984694978737);
    expect(tableAngles(169.92, { exactPi: true })).toEqual(tableAngles(169.92));
    expect(tableAngles(64, { exactPi: true })).toEqual(tableAngles(64)); // π/64 is exact either way
  });
  it('the table has res rows and columns for whole res and Floor[res] for res = 169.92', () => {
    expect([8, 16, 64, 320].map(tableCount)).toEqual([8, 16, 64, 320]);
    expect(tableCount(169.92000000000002)).toBe(169); // 32 × 5.3100000000000005 (snapshots 2 and 4)
    expect(tableCount(84.96000000000001)).toBe(84); // 16 × 5.31 (BFS, K-BF-05)
  });
  it('row i and column j sample a2 = (2i - 1) pi/res and a1 = (2j - 1) pi/res with link 2 at a1 - a2', () => {
    const angs = tableAngles(64);
    expect(angs).toHaveLength(64);
    expect(angs[0]).toBe(0.04908738521234052); // π/64
    expect(angs[63]).toBe(6.234097921967246); // 127π/64
    // an obstacle exactly at the arm tip of cell (3, 5): a1 = 9π/64, link 2 at a1 - a2 = π/16
    const grid = cSpaceTable([[1.8847745735266739, 0.6226454154464103]], 64, 1, 0);
    expect(grid[2][4]).toBe(1);
    expect(count(grid, 1)).toBe(49);
  });
  it('an obstacle at the origin blocks every cell, obstacles farther than 2.25 from the origin block none', () => {
    expect(count(cSpaceTable([[0, 0]], 32), 1)).toBe(1024);
    expect(count(cSpaceTable([[2, 2], [-2, -2]], 32), 1)).toBe(0);
  });
  it('armHits: link 1 at theta1 and link 2 at the absolute angle phi2, margin 2w', () => {
    expect(armHits(0, 0, [[2.2, 0]])).toBe(true); // 0.2 from the tip
    expect(armHits(0, 0, [[2.25, 0]])).toBe(false); // exactly 1/4: Less is false
    expect(armHits(0, Math.PI / 2, [[1, 1.2]])).toBe(true);
  });
});

describe('ArrayPlot colours and the inset', () => {
  it('arrayPlotColors: 0 white, 1 black, row 1 at the top', () => {
    const a = arrayPlotColors([[0, 1], [1, 0]]);
    expect([a.width, a.height]).toEqual([2, 2]);
    expect(px(a, 0)).toEqual([255, 255, 255]);
    expect(px(a, 1)).toEqual([0, 0, 0]);
    expect(px(a, 2)).toEqual([0, 0, 0]);
    expect(px(a, 3)).toEqual([255, 255, 255]);
    const zeros = arrayPlotColors([[0, 0], [0, 0]]);
    for (let i = 0; i < 4; i++) expect(px(zeros, i)).toEqual([255, 255, 255]); // K-RM-04: expected white
    const ones = arrayPlotColors([[1, 1], [1, 1]]);
    for (let i = 0; i < 4; i++) expect(px(ones, i)).toEqual([0, 0, 0]); // K-RM-04: expected black
  });
});
