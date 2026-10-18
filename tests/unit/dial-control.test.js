// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Lillian Lin; Aaron T. Becker and Haoran Zhao; Shiva Shahrokhi and Aaron T. Becker; Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/dial-control.test.js — the pure parts of demos/common/dial-control.js (owner two-link-kinematics; its
// tests live in that app's TESTPLAN, COMMON-DECISIONS §6): makeHand, the two setters, the LocatorPane clamp, the arrow-key
// rule (keyStep number | 'grid') and the dial drawing data. Expected values: the definitions worked by hand, cos/sin of
// kπ/32 with Python `math` (T-TK-86), atan2 by hand (T-TK-87). The DOM part (pointer, keys, test ids) is tested in a
// real browser: tests/e2e/dial-control.spec.js.
import { describe, it, expect } from 'vitest';
import {
  makeHand, HAND, DIAL_TABLE_32, nearest32Index, dialSetter, dialPaneRange, clampToRange, dialPointer, dialKey, dialGraphics, DIAL_LABELS,
} from '../../demos/common/dial-control.js';
import { arcTan } from '../../shared/mma-exact.js';

const ulps = (a, b) => (a === b ? 0 : Math.abs(a - b) / (Number.EPSILON * Math.max(Math.abs(a), Math.abs(b))));
const near = (p, q, n = 1) => p.forEach((v, i) => expect(ulps(v, q[i]), `${v} vs ${q[i]}`).toBeLessThanOrEqual(n));
const close = (p, q, tol = 1e-15) => p.forEach((v, i) => expect(Math.abs(v - q[i]), `${v} vs ${q[i]}`).toBeLessThanOrEqual(tol));

describe('dial-control.js: hand and setters', () => {
  it('makeHand gives the five hand vertices divided by 10', () => {
    expect(makeHand(7, 7 / 3, 0.1, 0.3)).toEqual([
      [-0.23333333333333334, -0.03], [-0.23333333333333334, 0.03], [0.7, 0.01], [0.78, 0], [0.7, -0.01],
    ]);
    expect(HAND).toEqual(makeHand(7, 7 / 3, 0.1, 0.3));
  });
  it('dial setter: a press point is normalised (correctly rounded length), the centre stays (0, 0)', () => {
    const set = dialSetter('normalize');
    expect(set([3, 4])).toEqual([0.6000000000000001, 0.8]); // (3, 4)·(1/5)
    expect(set([0, 0])).toEqual([0, 0]); // Normalize[{0, 0}] = {0, 0}
    expect(dialPointer([3, 4], { clamp: false })).toEqual([0.6000000000000001, 0.8]);
  });
  it('nearest32 setter: the 65-point table of k·π/32, a press snaps to the nearest point (ties in table order)', () => {
    expect(DIAL_TABLE_32).toHaveLength(65);
    expect(DIAL_TABLE_32[0]).toEqual([-1, 0]);
    expect(DIAL_TABLE_32[64]).toEqual([-1, 0]);
    expect(DIAL_TABLE_32[32]).toEqual([1, 0]);
    expect(DIAL_TABLE_32[48]).toEqual([0, 1]); // exact zero (shared/exact-pi.js)
    const set = dialSetter('nearest32');
    expect(nearest32Index(set([0.3, 0.95]))).toBe(13); // 72.47° = 12.88 steps (manipulability ellipsoid T-ME-15)
    expect(set([-1.2, 0])).toEqual([-1, 0]);
    expect(nearest32Index([-1.2, 0])).toBe(-32); // −π and π are the same point: the first in table order
    expect(nearest32Index(set([0.5, -0.5]))).toBe(-8);
    expect(nearest32Index(set([0.02, 1.5]))).toBe(16);
    // a press exactly at the centre: not "all equidistant" in machine arithmetic. Mathematica 15.0.1 (harness H-CL-16):
    // Nearest[exact table, {0., 0.}] returns 11 points, the first {−1/√2, −1/√2} at Position 9, i.e. k = −24
    expect(nearest32Index(set([0, 0]))).toBe(-24);
    expect(nearest32Index([0, 0])).toBe(-24);
    expect(() => dialSetter('round')).toThrow(RangeError);
  });
});

describe('dial-control.js: LocatorPane clamp and arrow keys', () => {
  it('dial-control clamp: a pointer far outside the plot range is clamped first, the far corner gives 45 degrees', () => {
    const range = dialPaneRange();
    expect(range).toEqual([[-1.04, 1.04], [-1.04, 1.04]]); // the unit dial with the default 2 % padding
    expect(clampToRange([100, 3], range)).toEqual([1.04, 1.04]);
    const a = dialPointer([100, 3], { setter: 'normalize' });
    expect(arcTan(a[0], a[1])).toBe(0.7853981633974483);
    // inside: not clamped; ‖(0.3, 0.4)‖ rounds to 0.5 exactly, so (0.3·2, 0.4·2) = (0.6, 0.8) (the draft's
    // T-TK-87 row repeats (0.6000000000000001, 0.8) of (3, 4) here — corrected by hand: 0.3² + 0.4² = 0.25 + 1.1e-17)
    expect(dialPointer([0.3, 0.4], { setter: 'normalize' })).toEqual([0.6, 0.8]);
    const b = dialPointer([100, 3], { setter: 'normalize', clamp: false });
    expect(ulps(arcTan(b[0], b[1]), 0.0299910048568779)).toBeLessThanOrEqual(2); // 1.72°
    expect(nearest32Index(dialPointer([100, 3], { setter: 'nearest32' }))).toBe(8);
    expect(nearest32Index(dialPointer([100, 3], { setter: 'nearest32', clamp: false }))).toBe(0);
    // about another centre the pane moves with it
    expect(dialPaneRange([2, 0])).toEqual([[2 - 1.04, 2 + 1.04], [-1.04, 1.04]]);
  });
  it("dial-control keyStep 'grid': one key turns the dial by ±π/32, Shift by ±π/8, a radial key press also turns it", () => {
    const o = { keyStep: 'grid', setter: 'nearest32' };
    let pt = [1, 0];
    const seq = [];
    for (const [key, shift] of [['ArrowUp', false], ['ArrowRight', false], ['ArrowLeft', false], ['ArrowLeft', false], ['ArrowDown', true]]) {
      pt = dialKey(pt, key, { ...o, shift }).pt;
      seq.push([nearest32Index(pt), pt]);
    }
    expect(seq.map((s) => s[0])).toEqual([1, 2, 1, 0, -4]);
    near(seq[0][1], [0.9951847266721969, 0.0980171403295606]);
    near(seq[1][1], [0.9807852804032304, 0.19509032201612825]); // ArrowRight at k = 1 is nearly radial and still turns
    expect(seq[3][1]).toEqual([1, 0]);
    near(seq[4][1], [0.9238795325112867, -0.3826834323650898]);
    // the default keyStep 0.05 at k = 0: the pointer (1.05, 0) snaps back to k = 0 (no turn)
    const d = dialKey([1, 0], 'ArrowRight', { setter: 'nearest32' });
    expect(d.pointer).toEqual([1.05, 0]);
    expect(d.pt).toEqual([1, 0]);
    // the grid wraps at ±π: from −π one step down is 31π/32
    expect(nearest32Index(dialKey([-1, 0], 'ArrowDown', o).pt)).toBe(31);
    expect(nearest32Index(dialKey(DIAL_TABLE_32[63], 'ArrowUp', o).pt)).toBe(-32);
    expect(dialKey([1, 0], 'Enter', o)).toBeNull();
  });
  it('keyStep 0.05 with the normalize setter: ArrowUp at angle 0 gives ArcTan of Normalize[(1, 0.05)], Shift moves 0.25', () => {
    const r = dialKey([1, 0], 'ArrowUp', {});
    expect(r.pointer).toEqual([1, 0.05]);
    expect(ulps(arcTan(r.pt[0], r.pt[1]), 0.04995839572194276)).toBeLessThanOrEqual(2); // 2.86° (torus chart A-TC-02)
    const s = dialKey(r.pt, 'ArrowUp', { shift: true });
    close(s.pointer, [r.pt[0], r.pt[1] + 0.25]);
    expect(Math.hypot(...s.pt)).toBeCloseTo(1, 15);
    const l = dialKey([0, 1], 'ArrowLeft', { keyStep: 0.1 });
    close(l.pt, [-0.09950371902099892, 0.9950371902099892]);
  });
});

describe('dial-control.js: drawing data', () => {
  it('dial graphic: 17 major ticks from 0.94 to 1, 16 minor ticks from 0.98 to 1, 8 labels at radius 0.7, −3π/4 … π', () => {
    const g = dialGraphics([1, 0]);
    expect(g.majorTicks).toHaveLength(17);
    expect(g.minorTicks).toHaveLength(16);
    g.majorTicks.forEach(([a, b], k) => {
      close(a, [0.94 * Math.cos((k * Math.PI) / 8), 0.94 * Math.sin((k * Math.PI) / 8)]);
      close(b, [Math.cos((k * Math.PI) / 8), Math.sin((k * Math.PI) / 8)]);
    });
    g.minorTicks.forEach(([a], k) => close(a, [0.98 * Math.cos(Math.PI / 16 + (k * Math.PI) / 8), 0.98 * Math.sin(Math.PI / 16 + (k * Math.PI) / 8)]));
    expect(g.labels.map((l) => l.text)).toEqual(['−3π/4', '−π/2', '−π/4', '0', 'π/4', 'π/2', '3π/4', 'π']);
    expect(g.labels[0].parts).toMatchObject({ sign: '−', num: '3π', den: '4' }); // stacked: "3π" over "4"
    expect(g.labels[7].parts).toMatchObject({ sign: '', num: 'π', den: null });
    g.labels.forEach((l, i) => close(l.at, [0.7 * Math.cos(((i - 3) * Math.PI) / 4), 0.7 * Math.sin(((i - 3) * Math.PI) / 4)]));
    expect(DIAL_LABELS).toHaveLength(8);
    expect(g.circle).toEqual({ center: [0, 0], r: 1 });
  });
  it("hand and arc: rotated by ArcTan[pt]; myArrowArc2 at angle 0 is still an arrow (head +x, Q-TK-05)", () => {
    const g = dialGraphics([1, 0]);
    expect(g.ang).toBe(0);
    expect(g.hand).toEqual(HAND);
    expect(g.arc.kind).toBe('Arrow');
    expect(g.arc.tip).toEqual([0.3, 0]);
    expect(g.arc.direction).toEqual([1, 0]);
    const q = dialGraphics([0, 1]);
    expect(q.ang).toBe(Math.PI / 2);
    close(q.hand[3], [0, 0.78]);
    close(q.arc.tip, [0, 0.3]);
    expect(q.arc.control).toHaveLength(12);
  });
  it("arc 'arrowArcCircle' (torus chart): arc from 0 to ArcTan in (−π, π], counter-clockwise arrowhead (Q-TC-01)", () => {
    const g = dialGraphics([Math.cos(-1), Math.sin(-1)], { arc: 'arrowArcCircle' });
    expect(g.arcKind).toBe('arrowArcCircle');
    expect(g.arc.kind).toBe('ArrowArc');
    expect(g.arc.circle).toMatchObject({ r: 0.3, start: 0 });
    expect(Math.abs(g.arc.circle.end + 1)).toBeLessThan(1e-15);
    close(g.arc.tip, [0.3 * Math.cos(1), -0.3 * Math.sin(1)]);
    close(g.arc.direction, [0.8414709848078965, 0.5403023058681398], 1e-15);
    expect(() => dialGraphics([1, 0], { arc: 'circle' })).toThrow(RangeError);
  });
});
