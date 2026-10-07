// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/prm-robot-arm.test.js — model of "Probabilistic Roadmap Method for Robot Arm". Expected values are
// derived by hand from the original's formulas (R-16).
import { describe, it, expect } from 'vitest';
import {
  pointsegdis2, isCollided, detCollision, robotSegments, draw2Drobot, rotateAbout, toAngles, toOuter, clampLoc, initialState,
  evaluate, regionTests, regionPolygons, xMin, yMin, xMax, yMax, OBS_RAD, WIDTHA, TWO_PI,
} from '../../demos/prm-robot-arm/model.js';
import { createRng, replayRng } from '../../shared/random.js';
import { ptInPoly } from '../../demos/common/prm-core.js';

const far = [[5, 5, 5], [-5, -5, 5]]; // obstacles that touch nothing
const settle = (extra = {}) => evaluate({ ...initialState(), ...extra }, createRng({ seed: 3 })).state;

describe('robot arm geometry', () => {
  it('pointsegdis2 is the distance from the nearest point to the segment (clamped to the end points)', () => {
    const seg = [[0, 0, 0], [0, 0, 1]];
    expect(pointsegdis2([seg, [[1, 0, 0.5]]])).toBe(1);
    expect(pointsegdis2([seg, [[0, 0, 3]]])).toBe(2);
    expect(pointsegdis2([seg, [[0, 0, -0.5]]])).toBe(0.5);
    expect(pointsegdis2([seg, [[3, 0, 0.5], [0, 0.25, 0.2]]])).toBe(0.25);
  });
  it('isCollided (defined but unused by the original) returns 1 or 0', () => {
    expect(isCollided([[[0, 0, 0], [0, 0, 1]], [[1, 0, 0.5]]], 1.5)).toBe(1);
    expect(isCollided([[[0, 0, 0], [0, 0, 1]], [[1, 0, 0.5]]], 0.5)).toBe(0);
  });
  it('robotSegments: link 1 from {0,0,1} along θ1, link 2 from the elbow along {Sin θ1 Sin θ2, -Cos θ1 Sin θ2, Cos θ2}', () => {
    const s = robotSegments(0, 0);
    expect(s.link1).toEqual([[0, 0, 1], [1, 0, 1]]);
    expect(s.link2).toEqual([[1, 0, 1], [1, 0, 2]]); // θ2 = 0: straight up
    expect(s.base).toEqual([[0, 0, 0], [0, 0, 1.1]]);
    const t = robotSegments(Math.PI / 2, Math.PI / 2).link2[1]; // elbow {0,1,1}, direction {1, 0, 0}
    expect(t[0]).toBeCloseTo(1, 15); expect(t[1]).toBeCloseTo(1, 15); expect(t[2]).toBeCloseTo(1, 15);
  });
  it('detCollision: link 1, link 2 and base against the sphere margins 0.55 / 0.55 / 0.6', () => {
    expect(detCollision(0, 0, [[0.5, 0, 1.5]], OBS_RAD, WIDTHA)).toBe(true); // 0.5 from link 1
    expect(detCollision(0, 0, [[0.4, 0, 1.6]], OBS_RAD, WIDTHA)).toBe(false); // 0.6 / 0.6 / 0.64: all above the margins
    expect(detCollision(0, 0, [[-1, 0, 2.5]], OBS_RAD, WIDTHA)).toBe(false); // 1.80 / 2.06 / 1.72
    expect(detCollision(0, 0, [[1.5, 0, 1.5]], OBS_RAD, WIDTHA)).toBe(true); // 0.5 from link 2
    expect(detCollision(Math.PI, 0, [[0.55, 0, 0.5]], OBS_RAD, WIDTHA)).toBe(true); // 0.55 < 0.6 from the base
  });
  it('the base is tested as a segment with margin 0.6 although it is drawn with radius 1/8 (original quirk)', () => {
    // sphere centre 0.61 from the z axis at z = 0.5: the drawn cylinder (radius 0.125) and sphere (radius 0.5)
    // overlap by 0.015, but 0.61 >= 0.6 and the links point away (θ1 = π, θ2 = 0): no collision is detected
    const c = [[0.61, 0, 0.5]];
    expect(pointsegdis2([[[0, 0, 0], [0, 0, 1.1]], c])).toBeCloseTo(0.61, 15);
    expect(0.61 < 0.125 + OBS_RAD).toBe(true);
    expect(detCollision(Math.PI, 0, c, OBS_RAD, WIDTHA)).toBe(false);
  });
  it('draw2Drobot geometry (Rotate q2 about x through {1,0,1}, then q1 about z through {0,0,1}) matches the segments detCollision tests', () => {
    for (const q of [[0.7, 1.1], [3.47, 3.31], [5.9, 0.2]]) {
      const r = draw2Drobot(WIDTHA, q);
      const tipLocal = [1, 0, 2]; // top of link 2 before rotation (centre line of the cuboid)
      const tip = rotateAbout(rotateAbout(tipLocal, r.inner.angle, r.inner.axis, r.inner.point), r.outer.angle, r.outer.axis, r.outer.point);
      const expected = robotSegments(q[0], q[1]).link2[1];
      for (let k = 0; k < 3; k++) expect(tip[k]).toBeCloseTo(expected[k], 14);
    }
    expect(draw2Drobot(WIDTHA, [0, 0]).cuboid).toEqual({ min: [0.95, -0.05, 0.95], max: [1.05, 0.05, 2.05] });
    expect(draw2Drobot(WIDTHA, [0, 0]).cylinder).toEqual({ from: [0, 0, 1], to: [1.05, 0, 1], radius: 0.05 });
  });
});

describe('robot arm locators and angles', () => {
  it('xMin = 2.9, yMin = -2, xMax = xMin + 3.8, yMax = yMin + 3.8 in machine arithmetic', () => {
    expect([xMin, yMin, xMax, yMax]).toEqual([2.9, -2, 2.9 + 3.8, -2 + 3.8]);
    expect(xMax).toBe(6.699999999999999);
    expect(yMax).toBe(1.7999999999999998);
  });
  it('locator position -> angles: (p - min)/(max - min) 2π', () => {
    const [t1, t2] = toAngles([5, 0]);
    expect(t1).toBeCloseTo((2.1 / 3.8) * TWO_PI, 12);
    expect(t2).toBeCloseTo((2 / 3.8) * TWO_PI, 12);
    const back = toOuter([t1, t2]);
    expect(back[0]).toBeCloseTo(5, 12); expect(back[1]).toBeCloseTo(0, 12);
  });
  it('a locator dragged past an edge of the phase plot jumps to the opposite edge', () => {
    expect(settle({ pConfig: [2.85, 0] }).pConfig).toEqual([xMax, 0]);
    expect(settle({ pConfig: [6.75, 0] }).pConfig).toEqual([xMin, 0]);
    expect(settle({ pConfigf: [4, -2.05] }).pConfigf).toEqual([4, yMax]);
    expect(settle({ pConfigf: [4, 1.85] }).pConfigf).toEqual([4, yMin]);
  });
  it('locators are clipped to {xMin-.1, yMin-.1}..{xMax+.1, yMax+.1}', () => {
    expect(clampLoc([0, 9])).toEqual([xMin - 0.1, yMax + 0.1]);
  });
});

describe('robot arm Manipulate body', () => {
  it('the first evaluation: no samples, rold = -1, obstOld = pObs3, "No path possible"', () => {
    const { state, view } = evaluate(initialState(), createRng({ seed: 1 }));
    expect(state.restart).toBe(false);
    expect(state.rold).toBe(-1);
    expect(state.obstOld).toEqual([[1, -0.6, 0.4], [-0.8, 0.2, 0.5]]);
    expect(state.pObsOld).toEqual([[1, -0.6, 0.4], [-0.8, 0.2, 0.5]]);
    expect(view.label).toBe('No path possible');
    expect(view.robotq).toEqual(view.qs);
  });
  // Hand-designed batch: seven free configurations at θ2 = 0.3 with θ1 = 0.3, 0.6, 1.0, 1.5, 2.1, 3.6, 4.4 (every
  // θ1 at least 0.7 from the orange sphere's direction 2.897 and 0.84 from the blue one's 5.74; link 2 points up)
  // and 93 colliding ones at θ1 = 2.9 (link 1, at z = 1, passes 0.5 above the orange centre and 0.0025 sideways: 0.500 < 0.55).
  const FREE = [0.3, 0.6, 1.0, 1.5, 2.1, 3.6, 4.4].map((t) => [t, 0.3]);
  const BATCH = (() => { const out = []; let m = 0; for (let k = 0; k < 100; k++) out.push(k % 10 === 0 && k <= 60 ? FREE[k / 10] : [2.9, 0.05 * m++]); return out; })();
  const DEFAULT_OBS = [[1, -0.6, 0.4], [-0.8, 0.2, 0.5]];
  // independent cross-check of the hand classification: clamped parametric projection, not pointsegdis2
  function handCollides([t1, t2], spheres) {
    const seg = (a, b, p) => {
      const ab = b.map((v, i) => v - a[i]), ap = p.map((v, i) => v - a[i]);
      const t = Math.max(0, Math.min(1, ab.reduce((q, v, i) => q + v * ap[i], 0) / ab.reduce((q, v) => q + v * v, 0)));
      return Math.hypot(...p.map((v, i) => v - (a[i] + t * ab[i])));
    };
    const el = [Math.cos(t1), Math.sin(t1), 1];
    const tip = [el[0] + Math.sin(t1) * Math.sin(t2), el[1] - Math.cos(t1) * Math.sin(t2), 1 + Math.cos(t2)];
    return spheres.some((c) => seg([0, 0, 1], el, c) < 0.55 || seg(el, tip, c) < 0.55 || seg([0, 0, 0], [0, 0, 1.1], c) < 0.6);
  }
  const F = (...pairs) => pairs.map(([a, b]) => [FREE[a - 1], FREE[b - 1]]);
  it('"add 100 vertices": 100 samples classified with detCollision, roadmap built with radius 1.0', () => {
    expect(BATCH.filter((p) => !handCollides(p, DEFAULT_OBS))).toEqual(FREE);
    const st = evaluate({ ...initialState(), addPoints: true }, replayRng({ reals: BATCH.flat() })).state;
    expect(st.pts).toEqual(BATCH);
    expect(st.goodPts).toEqual(FREE);
    expect(st.badPts.length).toBe(93);
    expect(st.rold).toBe(1); // rebuilt in the same evaluation because r (1.0) != rold (-1)
    // hand: gaps 0.3, 0.4, 0.5, 0.6 along θ1 and 0.7 (1 to 3), 0.9 (2 to 4), 0.8 (6 to 7) are within r = 1
    expect(st.edgesNN).toEqual(F([1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 5], [6, 7]));
    expect(st.edgesNNadj).toEqual([[2, 3], [1, 3, 4], [1, 2, 4], [2, 3, 5], [4], [7], [6]]);
  });
  it('moving an obstacle re-classifies every sample and rebuilds the roadmap', () => {
    const st = evaluate({ ...initialState(), addPoints: true }, replayRng({ reals: BATCH.flat() })).state;
    // the blue sphere moves to {-0.81, -0.4, 1}: direction 3.600, 0.903 from the axis -> link 1 at θ1 = 3.6 hits it;
    // θ1 = 4.4 stays clear (0.648 from link 1, 0.721 from link 2)
    const pObs3 = [[-0.81, -0.4, 1], [-0.8, 0.2, 0.5]];
    expect(BATCH.filter((p) => !handCollides(p, pObs3))).toEqual(FREE.filter((p) => p[0] !== 3.6));
    const moved = evaluate({ ...st, obstaxy: [-0.81, -0.4], obstaz: 1 }, replayRng({})).state;
    expect(moved.pts).toEqual(BATCH);
    expect(moved.goodPts).toEqual(FREE.filter((p) => p[0] !== 3.6));
    expect(moved.badPts.length).toBe(94);
    expect(moved.obstOld).toEqual(pObs3);
    expect(moved.rold).toBe(1); // rold = -1, then rebuilt (6 > 5 free samples)
    const G = moved.goodPts;
    expect(moved.edgesNN).toEqual([[G[0], G[1]], [G[0], G[2]], [G[1], G[2]], [G[1], G[3]], [G[2], G[3]], [G[3], G[4]]]);
    expect(moved.edgesNNadj).toEqual([[2, 3], [1, 3, 4], [1, 2, 4], [2, 3, 5], [4], []]);
  });
  it('an obstacle move that leaves at most 5 free samples keeps the OLD roadmap edges (no rebuild, original quirk)', () => {
    const rng = createRng({ seed: 7 });
    const st = evaluate({ ...initialState(), addPoints: true }, rng).state;
    // a sphere on top of the base: the base segment (to z = 1.1) is 0.4 from its centre -> every configuration collides
    const moved = evaluate({ ...st, obstaxy: [0, 0], obstaz: 1.5 }, rng).state;
    expect(moved.goodPts.length).toBe(0);
    expect(moved.badPts.length).toBe(100);
    expect(moved.rold).toBe(-1);
    expect(moved.edgesNN).toEqual(st.edgesNN);
    expect(moved.edgesNN.length).toBeGreaterThan(0);
  });
  it('a direct path is accepted even when start and goal are in collision (original quirk)', () => {
    // start at θ1 = 2.9 (link 1 at the orange sphere), goal 0.05 further right = 0.0827 rad: toroidDist < r = 1 and
    // <= delta, so pathOKTrobot accepts without testing; the collision test is only in the else branch
    const x = xMin + (2.9 / TWO_PI) * (xMax - xMin);
    const r = evaluate({ ...initialState(), pConfig: [x, 0], pConfigf: [x + 0.05, 0] }, createRng({ seed: 1 }));
    expect(r.view.inCollision).toBe(true);
    expect(r.view.inCollisionf).toBe(true);
    expect(r.view.path).toBe(-2);
    expect(r.view.label).toEqual({ prefix: 'Path length = ', value: 0.08 });
  });
  it('the Manipulate variable path is shadowed by the Module local and stays -1 even when a path exists (original quirk)', () => {
    const r = evaluate({ ...initialState(), obstaxy: [1, 1], obstaz: 2, obstbxy: [-1, -1], Obstbz: 2, pConfig: [5, 0], pConfigf: [5.1, 0.1] }, createRng({ seed: 1 }));
    expect(r.view.path).toBe(-2); // direct connection (toroidDist 0.23 < r = 1)
    expect(r.state.path).toBe(-1);
    expect(r.view.label.prefix).toBe('Path length = ');
  });
  it('restart clears the samples but keeps rold and obstOld', () => {
    const rng = createRng({ seed: 7 });
    const st = evaluate({ ...initialState(), addPoints: true }, rng).state;
    const r = evaluate({ ...st, restart: true }, rng).state;
    expect([r.pts, r.goodPts, r.badPts, r.edgesNN, r.edgesNNadj]).toEqual([[], [], [], [], []]);
    expect(r.rold).toBe(1);
    expect(r.obstOld).toEqual(st.obstOld);
  });
  it('the C-obstacle plot: recomputed while a control is active, once more at full quality on release, then cached', () => {
    const rng = createRng({ seed: 1 });
    let st = settle({ showConfigObs: true });
    expect([st.highRes, st.freeConfigSpace.quality]).toEqual([true, 'quality']);
    st = evaluate({ ...st, obstaz: 0.6 }, rng, { controlActive: true }).state; // dragging blue_z
    expect([st.highRes, st.freeConfigSpace.quality, st.freeConfigSpace.pObs3[0][2]]).toEqual([false, 'speed', 0.6]);
    st = evaluate(st, rng, { controlActive: false }).state; // released
    expect([st.highRes, st.freeConfigSpace.quality]).toEqual([true, 'quality']);
    const again = evaluate({ ...st, pConfig: [4.5, 0] }, rng, { controlActive: true }).state; // locator drag: cached
    expect(again.freeConfigSpace).toEqual(st.freeConfigSpace);
    const off = evaluate({ ...st, showConfigObs: false }, rng).state;
    expect([off.highRes, off.freeConfigSpace.quality]).toEqual([false, 'none']);
  });
  it('the two RegionPlot predicates together are detCollision', () => {
    const pObs3 = [[1, -0.6, 0.4], [-0.8, 0.2, 0.5]];
    for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) {
      const a1 = (i + 0.37) * (TWO_PI / 40), a2 = (j + 0.61) * (TWO_PI / 40);
      const [b, o] = regionTests(a1, a2, pObs3[0], pObs3[1]);
      expect(b || o).toBe(detCollision(a1, a2, pObs3, OBS_RAD, WIDTHA));
    }
  });
  it('regionPolygons covers the orange C-obstacle at θ1 = 2.9 (the sphere direction) and not at θ1 = 0.5', () => {
    const { polys } = regionPolygons([-0.8, 0.2, 0.5], 64);
    const covered = (p) => polys.some((poly) => ptInPoly(poly, p) || ptInPoly([...poly].reverse(), p));
    expect(covered([2.9, 0.3])).toBe(true);
    expect(covered([0.5, 0.3])).toBe(false);
    expect(regionPolygons(far[0], 16).polys.length).toBe(0);
  });
});
