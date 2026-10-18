// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Lillian Lin; Aaron T. Becker and Haoran Zhao; Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala; Aaron T. Becker and Shiva Shahrokhi; Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/arrow-arcs.test.js — demos/common/arrow-arcs.js (owner two-link-kinematics, COMMON-DECISIONS §3):
// myArrowArc, myArrowArc2, tableStep, bsplineCurve and arrowArc of the originals' Initialization code. Expected values
// come from the definitions worked by hand (two-link-kinematics T-TK-20 … T-TK-22, four-bar-linkage T-FB-18,
// robot-motion-obstacles T-RM-16, bfs-motion-planning T-BF-17, torus chart T-TC-10, camera-lasers T-CL-19) and from an
// independent Cox–de Boor recursion written in this file, never from the module itself.
import { describe, it, expect } from 'vitest';
import { tableStep, bsplinePoint, bsplineCurve, myArrowArc, myArrowArc2, arrowArc, circleArcPoints } from '../../demos/common/arrow-arcs.js';

const ulps = (a, b) => (a === b ? 0 : Math.abs(a - b) / (Number.EPSILON * Math.max(Math.abs(a), Math.abs(b))));
const near = (p, q, n = 4) => p.forEach((v, i) => expect(ulps(v, q[i]), `${v} vs ${q[i]}`).toBeLessThanOrEqual(n));
const close = (p, q, tol = 1e-15) => p.forEach((v, i) => expect(Math.abs(v - q[i]), `${v} vs ${q[i]}`).toBeLessThanOrEqual(tol));

/** Independent clamped B-spline: the Cox–de Boor recursion of the basis functions (degree 3, uniform clamped knots). */
function coxDeBoor(points, u, d = 3) {
  const n = points.length, inner = n - d - 1;
  const t = [...Array(d + 1).fill(0), ...Array.from({ length: inner }, (_, i) => (i + 1) / (inner + 1)), ...Array(d + 1).fill(1)];
  const N = (i, p, x) => {
    if (p === 0) return (t[i] <= x && x < t[i + 1]) || (x === 1 && t[i] < 1 && t[i + 1] === 1) ? 1 : 0;
    const a = t[i + p] === t[i] ? 0 : ((x - t[i]) / (t[i + p] - t[i])) * N(i, p - 1, x);
    const b = t[i + p + 1] === t[i + 1] ? 0 : ((t[i + p + 1] - x) / (t[i + p + 1] - t[i + 1])) * N(i + 1, p - 1, x);
    return a + b;
  };
  return points.reduce((s, P, i) => { const w = N(i, d, u); return [s[0] + w * P[0], s[1] + w * P[1]]; }, [0, 0]);
}

describe('arrow-arcs.js: myArrowArc and myArrowArc2', () => {
  it('myArrowArc: equal angles give a Point at c + r (Cos, Sin), otherwise 12 B-spline control points', () => {
    expect(myArrowArc([0, 0], 1 / 4, [0, 0])).toEqual({ kind: 'Point', at: [0.25, 0] });
    const a = myArrowArc([0, 0], 1 / 2, [0, 0.4]);
    expect(a.kind).toBe('Arrow');
    expect(a.control).toHaveLength(12);
    const step = 0.4 * (1 / 11);
    expect(step).toBe(0.03636363636363637);
    a.control.forEach((p, k) => expect(p).toEqual([0.5 * Math.cos(k * step), 0.5 * Math.sin(k * step)]));
    expect(a.control[0]).toEqual([0.5, 0]);
    expect(11 * step).toBe(0.4000000000000001);
    expect(a.control[11]).toEqual([0.46053049700144255, 0.1947091711543253]);
    expect(a.tip).toEqual(a.control[11]);
    const leg = [a.control[11][0] - a.control[10][0], a.control[11][1] - a.control[10][1]];
    close(a.direction, leg.map((v) => v / Math.hypot(...leg)));
  });
  it('myArrowArc2 compares with SameQ: a 4-ulp difference draws an arrow', () => {
    const e = 1 + 4 * 2 ** -52;
    expect(myArrowArc([0.5, 0.5], 0.3, [1, e]).kind).toBe('Point'); // Equal: tolerance 2^-46
    expect(myArrowArc2([0.5, 0.5], 0.3, [1, e]).kind).toBe('Arrow'); // SameQ: the last bit only
    expect(myArrowArc2([0.5, 0.5], 0.3, [1, 1 + 2 ** -52]).kind).toBe('Point');
    expect(myArrowArc2([0.5, 0.5], 0.3, [1, 1]).kind).toBe('Point');
  });
  it('myArrowArc2 with a Dynamic end (the dials): always an Arrow; at angle 0 twelve copies of c + r(1, 0), head along +x', () => {
    const a = myArrowArc2([0, 0], 0.3, [0, 0], { endIsDynamic: true });
    expect(a.kind).toBe('Arrow');
    expect(a.control).toEqual(Array(12).fill([0.3, 0]));
    expect(a.tip).toEqual([0.3, 0]);
    expect(a.direction).toEqual([1, 0]);
    const b = myArrowArc2([0, 0], 0.3, [0, (19 * Math.PI) / 32], { endIsDynamic: true });
    expect(b.control).toHaveLength(12);
    close(b.tip, [0.3 * Math.cos((19 * Math.PI) / 32), 0.3 * Math.sin((19 * Math.PI) / 32)]);
  });
  it('myArrowArc on a circle about c with a negative angle (four-bar: r 0.45, angle −0.8877458382200738)', () => {
    const ang = -0.8877458382200738;
    const a = myArrowArc([0, 0], 0.45, [0, ang]);
    const step = ang * (1 / 11);
    a.control.forEach((p, k) => expect(p).toEqual([0.45 * Math.cos(0 + k * step), 0.45 * Math.sin(0 + k * step)])); // t_k = start + k·step
    expect(Math.abs(11 * step - ang)).toBeLessThanOrEqual(1e-15);
    expect(myArrowArc([0, 0], 0.45, [0, 0])).toEqual({ kind: 'Point', at: [0.45, 0] });
    const c = myArrowArc([1, 2], 2 / 3, [1, 1.5]);
    expect(c.control[0]).toEqual([1 + (2 / 3) * Math.cos(1), 2 + (2 / 3) * Math.sin(1)]);
  });
});

describe('arrow-arcs.js: tableStep and bsplineCurve', () => {
  it('tableStep: step (end − start)·(1/11), t_k = start + k·step, 12 values, start = end gives 12 copies', () => {
    const ts = tableStep(1, 2);
    expect(ts).toHaveLength(12);
    ts.forEach((t, k) => expect(t).toBe(1 + k * ((2 - 1) * (1 / 11))));
    expect(tableStep(0.7, 0.7)).toEqual(Array(12).fill(0.7));
    expect(tableStep(0, 1, 4)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
  it('bsplineCurve: clamped cubic through the end points, end tangent along the last control leg', () => {
    const sq = [[0, 0], [1, 0], [1, 1], [0, 1]];
    expect(bsplinePoint(sq, 0.5)).toEqual([0.75, 0.5]); // Bézier (P0 + 3 P1 + 3 P2 + P3)/8
    for (const u of [0, 0.1, 0.37, 0.9, 1]) close(bsplinePoint(sq, u), coxDeBoor(sq, u));
    const ctl = tableStep(0, Math.PI / 2).map((t) => [Math.cos(t), Math.sin(t)]);
    const curve = bsplineCurve(ctl, { samples: 48 });
    expect(curve).toHaveLength(48);
    expect(curve[0]).toEqual(ctl[0]);
    close(curve[47], ctl[11]);
    for (let i = 0; i <= 200; i++) close(bsplinePoint(ctl, i / 200), coxDeBoor(ctl, i / 200), 1e-14);
    // end tangent parallel to P11 − P10: the curve near u = 1 approaches the tip along the last leg
    const e = bsplinePoint(ctl, 1 - 1e-6), leg = [ctl[11][0] - ctl[10][0], ctl[11][1] - ctl[10][1]];
    const d = [ctl[11][0] - e[0], ctl[11][1] - e[1]];
    expect(Math.abs(d[0] * leg[1] - d[1] * leg[0]) / (Math.hypot(...d) * Math.hypot(...leg))).toBeLessThan(1e-5);
    let deficit = 0;
    for (let i = 0; i <= 4000; i++) deficit = Math.max(deficit, 1 - Math.hypot(...coxDeBoor(ctl, i / 4000)));
    expect(Math.abs(deficit - 0.00448)).toBeLessThanOrEqual(1e-5);
    let deficitPort = 0;
    for (const p of bsplineCurve(ctl, { samples: 4001 })) deficitPort = Math.max(deficitPort, 1 - Math.hypot(...p));
    expect(Math.abs(deficitPort - deficit)).toBeLessThan(1e-9);
  });
  it('bsplinePoint with fewer than four control points lowers the degree (two points: the segment)', () => {
    close(bsplinePoint([[0, 0], [2, 2]], 0.25), [0.5, 0.5]);
    close(bsplinePoint([[0, 0], [1, 1], [2, 0]], 0.5), [1, 0.5]);
  });
});

describe('arrow-arcs.js: arrowArc', () => {
  it('arrowArc: the arc and an arrowhead at its end along the counter-clockwise tangent (robot-motion-obstacles initial arm)', () => {
    const a = arrowArc({ center: [0, 0], r: 1 / 3, start: 0, end: 3.4722866171255617 });
    expect(a.kind).toBe('ArrowArc');
    near(a.tip, [-0.3152724139002115, -0.1082331564015614]);
    near(a.direction, [0.32469946920468423, -0.9458172417006344]);
    close(a.tail, [a.tip[0] - (1 / 3) * 1e-6 * a.direction[0], a.tip[1] - (1 / 3) * 1e-6 * a.direction[1]], 1e-20);
    expect(a.arc[0]).toEqual([1 / 3, 0]);
    close(a.arc[a.arc.length - 1], a.tip);
    const b = arrowArc([[-0.9458172417006344, -0.32469946920468423], 1 / 3, [3.4722866171255617, 6.779226252483239]]);
    near(b.tip, [-0.6526593246318049, -0.16605033819232604]);
    near(b.direction, [-0.47594739303707456, 0.8794737512064885]);
  });
  it('arrowArc with end < start runs clockwise and its head points back along the arc (torus-chart dial, BFS elbow)', () => {
    const a = arrowArc({ center: [0, 0], r: 0.3, start: 0, end: -1 });
    close(a.tip, [0.3 * Math.cos(1), -0.3 * Math.sin(1)]);
    close(a.direction, [0.8414709848078965, 0.5403023058681398]);
    const pts = a.arc;
    expect(Math.atan2(pts[1][1], pts[1][0])).toBeLessThan(0); // clockwise from 0
    const b = arrowArc({ center: [0, 0], r: 0.3, start: 0, end: 2 });
    close(b.direction, [-Math.sin(2), Math.cos(2)]);
    const bf = arrowArc({ center: [0, 0], r: 1 / 3, start: 3.959715740462135, end: 3.337942194439155 });
    const sweep = bf.arc.map((p) => Math.atan2(p[1], p[0]) + 2 * Math.PI);
    expect(Math.max(...sweep) - Math.min(...sweep)).toBeCloseTo(0.6217735460229799, 12); // the short arc, 0.62 rad
    close(bf.direction, [-Math.sin(3.337942194439155), Math.cos(3.337942194439155)]);
  });
  it('arrowArc of a zero-length arc (camera-lasers top view at θ = 0): head at p + (0, 1) pointing to −x, no negative zero', () => {
    const a = arrowArc({ center: [3, -0.2], r: 1, start: Math.PI / 2, end: Math.PI / 2 });
    close(a.tip, [3, 0.8]);
    close(a.direction, [-1, 0]);
    const z = arrowArc({ center: [0, 0], r: 1, start: 0, end: 0 });
    expect(Object.is(z.direction[0], -0)).toBe(false);
    expect(z.direction).toEqual([0, 1]);
  });
  it('circleArcPoints samples Circle[c, r, {a0, a1}] from a0 to a1', () => {
    const p = circleArcPoints([1, 1], 2, 0, Math.PI, 4);
    expect(p).toHaveLength(5);
    close(p[2], [1, 3]);
    close(p[4], [-1, 1]);
  });
});
