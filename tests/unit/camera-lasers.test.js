// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/camera-lasers.test.js — the camera-lasers model (demos/camera-lasers/model.js) against values derived by
// hand or with independent formulas (TESTPLAN T-CL-01 … T-CL-23): rotation of the 1 × 4 rectangle, segment
// intersection by hand, the projection k = λ/z, the Piecewise thresholds, Round half to even. The original computes
// exactly where its inputs are exact; the port uses machine numbers (D-CL-01), so coordinates are compared to 1e-12.
import { describe, it, expect } from 'vitest';
import {
  reticuleScale, majorTicks, minorTicks, Q, Convert3DtoCam, orientation, objectPoints, laserHits, visibleFaces,
  evaluate, initialSettings, SegmentIntersectionQ, LineIntersectionPoint, γ, DIAL_OPTIONS, negate, clipPolyline,
} from '../../demos/camera-lasers/model.js';
import { numberText, numberParts } from '../../shared/mma-text.js';
import { dialPointer, nearest32Index, dialGraphics, DIAL_TABLE_32, HAND } from '../../demos/common/dial-control.js';
import { NAMED } from '../../shared/mma-colors.js';

const close = (a, b, tol = 1e-12) => {
  if (Array.isArray(b)) { expect(a.length).toBe(b.length); a.forEach((x, i) => close(x, b[i], tol)); return; }
  expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
};
const state = (o = {}) => ({ ...initialSettings(), ...o, pFixed: (o.p ?? initialSettings().p).slice() });
const dial = (k) => DIAL_TABLE_32[k + 32].slice();
const closed = (pts) => [...pts, pts[0]];

describe('camera-lasers model', () => {
  it('reticule scale sc: 1/50, 1/10, 1/2, 1 by λ s with tolerant Less at 0.1, 0.25, 0.5', () => {
    const cases = [[0.1, 0.1, Q(1, 50)], [0.1, 0.99, Q(1, 50)], [0.1, 1, Q(1, 10)], [0.5, 0.2, Q(1, 10)], [0.5, 0.49, Q(1, 10)],
      [0.5, 0.5, Q(1, 2)], [0.5, 0.65, Q(1, 2)], [0.5, 1, Q(1, 1)], [2, 2, Q(1, 1)]];
    for (const [l, s, want] of cases) expect(reticuleScale(l, s), `${l} ${s}`).toEqual(want);
    expect(0.5 * 0.2).toBe(0.1);
    expect(reticuleScale(1, 0.10000000000000002)).toEqual(Q(1, 10)); // tolerantly equal to 1/10: not less
  });

  it('tick labels keep exactness: 1/2 and 3/2 as fractions, 0.75 as a real, 1 as an integer', () => {
    expect(majorTicks(Q(1))).toEqual([0.8, Q(1), 1.2, 1.5, Q(2), Q(3), Q(5), Q(10)]);
    expect(majorTicks(Q(1, 2))).toEqual([0.4, Q(1, 2), 0.6, 0.75, Q(1), Q(3, 2), Q(5, 2), Q(5)]);
    expect(majorTicks(Q(1, 10))).toEqual([0.08000000000000002, Q(1, 10), 0.12, 0.15000000000000002, Q(1, 5), Q(3, 10), Q(1, 2), Q(1)]);
    expect(majorTicks(Q(1, 50))).toEqual([0.016, Q(1, 50), 0.024, 0.03, Q(1, 25), Q(3, 50), Q(1, 10), Q(1, 5)]);
    expect(minorTicks(Q(1)).length).toBe(29);
  });

  it('number display of tick labels: 0.08 for 0.08000000000000002, 1/50, -3/2', () => {
    expect(numberText(0.08000000000000002)).toBe('0.08');
    expect(numberText(0.15000000000000002)).toBe('0.15');
    expect(numberText(0.75)).toBe('0.75');
    expect(numberText(Q(1))).toBe('1');
    expect(numberText(Q(10))).toBe('10');
    expect(numberParts(Q(1, 50))).toMatchObject({ sign: '', num: '1', den: '50' });
    expect(numberParts(negate(Q(3, 2)))).toMatchObject({ sign: '−', num: '3', den: '2' });
    expect(numberText(negate(0.8))).toBe('−0.8');
  });

  it('θ = ArcTan[p1[[1]], p1[[2]]] moved into [0, 2π)', () => {
    expect(orientation([1, 0])).toBe(0);
    expect(orientation([0, 1])).toBe(1.5707963267948966);
    expect(orientation([-1, 0])).toBe(3.141592653589793);
    expect(orientation([0, -1])).toBe(4.71238898038469);
    expect(orientation([0.49613893835683376, -0.8682431421244592])).toBe(5.231535094631212);
    expect(orientation([0.7607566910198931, -0.6490371769540347])).toBe(5.576867167133104);
  });

  it('locator rule: p.y <= -4 restores pFixed, otherwise pFixed follows p', () => {
    let s = evaluate({ ...initialSettings(), p: [5, -4] }).state;
    expect([s.p, s.pFixed]).toEqual([[3, -0.2], [3, -0.2]]);
    s = evaluate({ ...s, p: [5, -3.99] }).state;
    expect([s.p, s.pFixed]).toEqual([[5, -3.99], [5, -3.99]]);
    s = evaluate({ ...s, p: [5, -4.5] }).state;
    expect([s.p, s.pFixed]).toEqual([[5, -3.99], [5, -3.99]]);
  });

  it('objectPts: the 1 x 4 rectangle rotated by θ about p, counter-clockwise from {-1/2, -2}', () => {
    close(objectPoints(0, [3, -0.2]), [[2.5, -2.2], [3.5, -2.2], [3.5, 1.8], [2.5, 1.8]]);
    close(objectPoints(Math.PI / 4, [6, 0]), [[7.06066017177982, -1.7677669529663689], [7.767766952966369, -1.0606601717798212],
      [4.93933982822018, 1.7677669529663689], [4.232233047033631, 1.0606601717798212]], 1e-12);
  });

  it('lasers hit the nearest object edge: the default object gives {5/2, 1} and {5/2, -1}', () => {
    const d = laserHits(closed(objectPoints(0, [3, -0.2])), 1);
    close(d.InterPt1, [2.5, 1]);
    close(d.InterPt2, [2.5, -1]);
    const t = laserHits(closed(objectPoints(Math.PI / 4, [6, 0])), 1);
    close(t.InterPt1, [4.292893218813452, 1]);
    close(t.InterPt2, [6.292893218813452, -1]);
  });

  it('a laser that misses keeps {10000, ±s}', () => {
    const { view } = evaluate(state({ p: [8, 0], p1: [0, 1] }));
    expect(view.InterPt1).toEqual([10000, 1]);
    expect(view.InterPt2).toEqual([10000, -1]);
    close(view.InterPt3D1, [-5e-5, 0]);
    close(view.InterPt3D2, [5e-5, 0]);
    close(view.cam.filter((c) => c.kind === 'point').map((c) => c.size), [1e-5, 1e-5]);
  });

  it('a laser through a corner hits it (inclusive ends, parallel edges ignored)', () => {
    const { view } = evaluate(state({ p: [3, -1] }));
    expect(view.InterPt1).toEqual([2.5, 1]); // the top edge y = 1 lies on laser 1 (Det 0); the front edge's end point counts
    expect(view.InterPt2).toEqual([2.5, -1]);
  });

  it('SegmentIntersectionQ, LineIntersectionPoint and γ as in the original (shared segment geometry)', () => {
    expect(SegmentIntersectionQ([[[0, 0], [2, 2]], [[0, 2], [2, 0]]])).toBe(true);
    expect(LineIntersectionPoint([[[0, 0], [2, 2]], [[0, 2], [2, 0]]])).toEqual([1, 1]);
    expect(γ([[0, 0], [2, 2]])([1, 1])).toBe(0.5);
    expect(γ([[0, 2], [2, 0]])([1, 1])).toBe(0.5);
    expect(SegmentIntersectionQ([[[0, 0], [1, 0]], [[0, 1], [1, 1]]])).toBe(false);
    expect(SegmentIntersectionQ([[[0, 0], [1, 0]], [[1, 0], [1, 1]]])).toBe(true);
    expect(SegmentIntersectionQ([[[0, 0], [1, 0]], [[2, 1], [2, -1]]])).toBe(false);
    expect(γ([[0, 0], [1, 0]])([2, 0])).toBe(2);
  });

  it('Convert3DtoCam: k = λ/Max[0.001, z], image point k {-x, y}', () => {
    close(Convert3DtoCam(0.5, [1, 0, 2.5]), [-0.2, 0]);
    close(Convert3DtoCam(0.5, [-1, 0, 2.5]), [0.2, 0]);
    close(Convert3DtoCam(0.5, [1.8, -1, 2.5]), [-0.36, -0.2]);
    close(Convert3DtoCam(0.5, [1, -1, 0]), [-500, -500]);
    expect(Convert3DtoCam(0.5, [500, 0, Infinity])).toEqual([0, 0]);
  });

  it('visible faces: only edges with P.y/P.x > Q.y/Q.x are drawn, the default shows the front face from u -0.36 to 0.44', () => {
    const d = evaluate(initialSettings()).view;
    expect(d.faces.length).toBe(1);
    close(d.faces[0], [[-0.36, -0.2], [-0.36, 0.2], [0.44, 0.2], [0.44, -0.2]]);
    const t = evaluate(state({ p: [6, 0], p1: dial(8) })).view;
    expect(t.faces.length).toBe(2);
    const us = t.faces.flat().map((q) => q[0]);
    close(Math.min(...us), -0.1789, 1e-3);
    close(Math.max(...us), 0.1252, 1e-3);
  });

  it('laser dot sizes are PointSize[λ 0.2/x]: 0.04 at the default', () => {
    const size = (o) => evaluate(state(o)).view.cam.filter((c) => c.kind === 'point').map((c) => c.size);
    close(size({}), [0.04, 0.04]);
    close(size({ p: [6.94, -0.040000000000000036], p1: [1.0, 0.0] }), [0.015527950310559006, 0.015527950310559006]);
    close(size({ p: [8, 0], p1: [0, 1] }), [1e-5, 1e-5]);
  });

  it('ground grid: Round[20λ] horizontal lines and 2 Round[3/λ] + 1 converging lines, halves to even (λ 1.2 gives 5)', () => {
    const counts = (lambda) => {
      const v = evaluate(state({ lambda })).view;
      return [v.cam.filter((c) => c.role === 'ground-row').length, v.cam.filter((c) => c.role === 'ground-ray').length];
    };
    expect([0.5, 0.24, 1.2, 0.4, 2, 0.1].map(counts)).toEqual([[10, 13], [5, 25], [24, 5], [8, 17], [40, 5], [2, 61]]);
    const band = evaluate(initialSettings()).view.cam.find((c) => c.role === 'horizon-band');
    expect(band.from[1]).toBe(-0.045454545454545456);
    expect(band.to).toEqual([0.8, 0]);
  });

  it('objectPts gets its closing point twice (original quirk, no visible effect)', () => {
    const v = evaluate(initialSettings()).view;
    expect(v.objectPts.length).toBe(6);
    expect(v.objectPts[4]).toEqual(v.objectPts[0]);
    expect(v.objectPts[5]).toEqual(v.objectPts[0]);
    expect(v.faces.length).toBe(1);
    expect(visibleFaces(0.5, [[2.5, 1], [2.5, 1]])).toEqual([]); // the {P1, P1} edge: P.y/P.x > P.y/P.x is False
    expect(v.top.find((t) => t.role === 'object').pts.length).toBe(5);
  });

  it('the dial snaps to the nearest of the 65 points {Cos a, Sin a}, a = -π … π in steps of π/32', () => {
    const at = (deg, r = 0.8) => dialPointer([r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)], { setter: 'nearest32' });
    expect(at(10)).toEqual([0.9807852804032304, 0.19509032201612825]);
    expect(at(2)).toEqual([1, 0]);
    expect(at(45)).toEqual(dial(8));
    close(at(45), [Math.cos(Math.PI / 4), Math.sin(Math.PI / 4)], 1e-15);
    expect(nearest32Index(at(-100))).toBe(-18);
  });

  it('a press at the dial centre: the nearest32 setter picks k = −24 as Mathematica does (K-CL-09, harness H-CL-16)', () => {
    // Mathematica 15.0.1 (H-CL-16): Nearest[Table[{Cos@a, Sin@a}, {a, -Pi, Pi, Pi/32}], {0., 0.}] returns 11 points, the
    // first {−1/√2, −1/√2} (Position 9 of 65, a = −3π/4)
    expect(nearest32Index([0, 0])).toBe(-24);
    expect(dialPointer([0, 0], { setter: 'nearest32' })).toEqual(dial(-24));
  });

  it('θ label only for θ >= π/16 (tolerant), so for every clockwise dial position', () => {
    const shown = (k) => {
      const v = evaluate(state({ p1: dial(k) })).view;
      return [v.top.some((t) => t.role === 'theta-label'), v.theta];
    };
    expect(shown(0)).toEqual([false, 0]);
    expect(shown(1)[0]).toBe(false);
    const [two, t2] = shown(2);
    expect(two).toBe(true);
    close(t2, 0.19634954084936207, 1e-15);
    const [m1, tm1] = shown(-1);
    expect(m1).toBe(true);
    close(tm1, 6.1850105367549055, 1e-15);
  });

  it('orientation arc from π/2 to π/2 + θ, counter-clockwise', () => {
    const a0 = evaluate(initialSettings()).view.top;
    const arrow0 = a0.find((t) => t.role === 'orientation-arrow');
    close(arrow0.tip, [3, 0.8]);
    close(arrow0.direction, [-1, 0]);
    const arc0 = a0.find((t) => t.role === 'orientation-arc').pts;
    close(arc0[0], arc0[arc0.length - 1]); // zero length
    const a1 = evaluate(state({ p1: [0, 1] })).view.top;
    const arc1 = a1.find((t) => t.role === 'orientation-arc').pts;
    close(arc1[0], [3, 0.8]);
    close(arc1[arc1.length - 1], [2, -0.2]);
    close(arc1[Math.floor(arc1.length / 2)], [3 - Math.SQRT1_2, -0.2 + Math.SQRT1_2]); // through the upper left quadrant
    const arrow1 = a1.find((t) => t.role === 'orientation-arrow');
    close(arrow1.tip, [2, -0.2]);
    close(arrow1.direction, [0, -1]);
  });

  it("top view elements in the original's order with their colours", () => {
    const kinds = (v) => v.top.map((t) => t.kind);
    const base = ['polygon', 'polygon', 'arc', 'arrow', 'line'];
    const rest = ['line', 'rect', 'rect', 'rect', 'line', 'line', 'line', 'line', 'line', 'line', 'point', 'text', 'arrow', 'arrow', 'text', 'line', 'line', 'polygon', 'arrow', 'arrow', 'text', 'loc'];
    expect(kinds(evaluate(initialSettings()).view)).toEqual([...base, ...rest]);
    const v8 = evaluate(state({ p1: dial(8) })).view;
    expect(kinds(v8)).toEqual([...base, 'text', ...rest]);
    const top = v8.top;
    expect(top[0]).toMatchObject({ role: 'field-of-view', fill: NAMED.Blue, opacity: 0.2 });
    expect(top[1]).toMatchObject({ role: 'object', fill: [0.6, 0.4, 0.2], edge: NAMED.Black });
    expect(top.find((t) => t.role === 'camera').fill).toEqual([1 / 3, 1 / 3, 1 / 3]);
    expect(top.find((t) => t.role === 'laser-1')).toMatchObject({ fill: [1, 0.5, 0], edge: NAMED.Black });
    expect(top.find((t) => t.role === 'beam-1').stroke).toEqual(NAMED.Red);
    expect(top.find((t) => t.role === 'reflection-2')).toMatchObject({ stroke: NAMED.Red, dashed: true });
    expect(top.find((t) => t.role === 'image-plane')).toMatchObject({ stroke: NAMED.Blue, thicknessPx: 2 });
    expect(top.find((t) => t.role === 'pinhole')).toMatchObject({ color: NAMED.Blue, sizePx: 7.5 });
  });

  it("camera image elements in the original's order", () => {
    const cam = evaluate(initialSettings()).view.cam;
    const roles = cam.map((c) => c.role);
    const runs = [];
    for (const r of roles) { if (runs.length && runs[runs.length - 1][0] === r) runs[runs.length - 1][1]++; else runs.push([r, 1]); }
    expect(runs.slice(0, 8)).toEqual([['ground-row', 10], ['ground-ray', 13], ['horizon-band', 1], ['ground', 1], ['face', 1], ['dot-1', 1], ['dot-2', 1], ['reticule', 1]]);
    expect(roles.filter((r) => r === 'major-tick').length).toBe(16);
    expect(roles.filter((r) => r === 'tick-label').length).toBe(16);
    expect(roles.filter((r) => r === 'minor-tick').length).toBe(58);
    expect(cam[cam.length - 1]).toMatchObject({ role: 'title', text: 'camera image' });
    close(cam[cam.length - 1].at, [0, 0.32]);
    const labels = cam.filter((c) => c.role === 'tick-label').map((c) => numberText(c.value));
    expect(labels.slice(0, 4)).toEqual(['0.8', '−0.8', '1', '−1']);
  });

  it('the dial is dial-control.js with setter nearest32, arc myArrowArc2, size 120 and Red', () => {
    expect(DIAL_OPTIONS).toEqual({ name: 'p1', label: 'θ', color: NAMED.Red, imageSize: 120, setter: 'nearest32', arc: 'myArrowArc2', keyStep: 'grid' });
    const g0 = dialGraphics([1, 0], { arc: DIAL_OPTIONS.arc });
    expect(g0.arc.kind).toBe('Arrow');
    close(g0.arc.tip, [0.3, 0]);
    expect(g0.arc.direction).toEqual([1, 0]);
    const g8 = dialGraphics(dial(8), { arc: DIAL_OPTIONS.arc });
    close(g8.ang, Math.PI / 4, 1e-15);
    const c = Math.SQRT1_2;
    close(g8.hand, HAND.map(([x, y]) => [c * x - c * y, c * x + c * y]), 1e-12);
    expect(g8.arc.control.length).toBe(12);
    close(g8.arc.control[0], [0.3, 0]);
    close(g8.arc.control[11], [0.3 * c, 0.3 * c], 1e-12);
  });

  it('an object face at x = 0 gives no laser dot and no face instead of an error (port deviation)', () => {
    const { view } = evaluate(state({ p: [0.5, 0] }));
    expect(view.cam.filter((c) => c.kind === 'point').length).toBe(0); // REGRESSION PIN until H-CL-11 / M-CL-08
    for (const f of view.faces) for (const q of f) expect(Number.isFinite(q[0]) && Number.isFinite(q[1])).toBe(true);
    expect(view.faces.some((f) => f.some((q) => Math.abs(q[0]) > 100))).toBe(false); // no face with a vertex at x = 0
  });
});

describe('drawing: lines clipped to the plot range (D-CL-08)', () => {
  const box = [[-2, 16], [-5, 5]];
  it('a missing laser\'s dashed reflection is drawn only inside the window, with the dash phase of the full line', () => {
    const runs = clipPolyline([[10000, 1], [0, 0]], box);
    expect(runs.length).toBe(1);
    close(runs[0].pts[0], [16, 16 / 10000]);
    expect(runs[0].pts[1]).toEqual([0, 0]);
    close(runs[0].offset, Math.hypot(10000 - 16, 1 - 16 / 10000), 1e-9);
  });
  it('lines inside the window are unchanged; lines outside it are dropped; polylines split where they leave it', () => {
    expect(clipPolyline([[0, 0], [1, 1], [2, 0]], box)).toEqual([{ pts: [[0, 0], [1, 1], [2, 0]], offset: 0 }]);
    expect(clipPolyline([[20, 0], [30, 0]], box)).toEqual([]);
    const runs = clipPolyline([[0, 0], [0, 10], [1, 10], [1, 0]], box);
    expect(runs.map((r) => r.pts)).toEqual([[[0, 0], [0, 5]], [[1, 5], [1, 0]]]);
    expect(runs.map((r) => r.offset)).toEqual([0, 16]);
  });
  it('the model keeps the original points (beam to x = 10000)', () => {
    const v = evaluate({ ...initialSettings(), p: [3, 3.5] }).view;
    expect(v.top.find((t) => t.role === 'beam-1').pts[1][0]).toBe(10000);
  });
});
