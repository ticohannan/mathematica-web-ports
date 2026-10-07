// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Francesco Bernardini and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/car-paths.test.js — model of the car-path Demonstration. Expected values are derived by hand from the
// original's formulas, from geometry (an independent integrator below), from the Details text of the original, or
// from the upstream Python library the original was converted from (fixture, R-16).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  sLEFT, sSTRAIGHT, sRIGHT, gFORWARD, gBACKWARD, cart2Polar, angfrom1to2, modPi, mod2Pi, changeOfBasisR,
  createPathElement, reverseSteering, reverseGear, timeflip, reflect, pathLength, getOptimalPath, getOptimalDubinsPath,
  getAllPaths, getAllDubinsPaths, path1, path5, path7, getPos, drawPath, drawCar, wheelAngle, initialState, evaluate,
  swapStartGoal, round01, LOCS0,
} from '../../demos/car-paths/carpaths.js';

const PI = Math.PI;
const fixture = JSON.parse(fs.readFileSync('tests/unit/fixtures/car-paths-python-reference.json', 'utf8'));
const closeVec = (a, b, d = 12) => { expect(a.length).toBe(b.length); a.forEach((v, i) => expect(v).toBeCloseTo(b[i], d)); };

/** Independent integrator: drive a path (unit turning radius) from the pose (0, 0, 0). */
function integrate(path) {
  let x = 0, y = 0, t = 0;
  for (const [p, s, g] of path) {
    if (s === 0) { x += g * p * Math.cos(t); y += g * p * Math.sin(t); } else if (s === -1) { // left: centre on the left
      const cx = x - Math.sin(t), cy = y + Math.cos(t); t += g * p; x = cx + Math.sin(t); y = cy - Math.cos(t);
    } else { // right: centre on the right
      const cx = x + Math.sin(t), cy = y - Math.cos(t); t -= g * p; x = cx - Math.sin(t); y = cy + Math.cos(t);
    }
  }
  return [x, y, t];
}
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function lcg(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

describe('car-paths helpers', () => {
  it('constants of the original: sLEFT -1, sSTRAIGHT 0, sRIGHT 1, gFORWARD 1, gBACKWARD -1', () => {
    expect([sLEFT, sSTRAIGHT, sRIGHT, gFORWARD, gBACKWARD]).toEqual([-1, 0, 1, 1, -1]);
  });
  it('cart2Polar: radius and Mathematica ArcTan[x, y] angle, and 0 at the origin', () => {
    const [r, t] = cart2Polar(3, 4);
    expect(r).toBe(5);
    expect(t).toBeCloseTo(Math.atan(4 / 3), 15);
    expect(cart2Polar(0, 0)).toEqual([0, 0]);
    expect(cart2Polar(-2, 0)).toEqual([2, PI]);
    expect(cart2Polar(0, -2)).toEqual([2, -PI / 2]);
  });
  it('angfrom1to2 gives the headings of the default cars: -pi/2 (start) and -ArcTan[1/2] (goal)', () => {
    expect(angfrom1to2([-10, -5], [-10, -7])).toBe(-PI / 2);
    expect(angfrom1to2([8, 5], [10, 4])).toBeCloseTo(-Math.atan(0.5), 15);
  });
  it('modPi maps into (-pi, pi] and keeps pi as pi (the Python maps it to -pi)', () => {
    expect(modPi(1.5 * PI)).toBeCloseTo(-PI / 2, 14);
    expect(modPi(PI)).toBe(PI);
    expect(modPi(-PI)).toBe(PI);
    expect(modPi(-0.5)).toBeCloseTo(-0.5, 14);
    expect(modPi(7)).toBeCloseTo(7 - 2 * PI, 14);
  });
  it('mod2Pi maps into [0, 2pi) and its Phi < 0 branch is dead', () => {
    expect(mod2Pi(-0.5)).toBeCloseTo(2 * PI - 0.5, 14);
    expect(mod2Pi(2 * PI)).toBe(0);
    const rnd = lcg(7);
    for (let k = 0; k < 1000; k++) { const v = mod2Pi((rnd() - 0.5) * 100); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(2 * PI); }
  });
  it('changeOfBasisR: goal in the frame of the start, lengths divided by minRadius', () => {
    closeVec(changeOfBasisR([1, 2, PI / 2], [1, 5, PI], 3), [1, 0, PI / 2], 15);
    // the initial settings: dx = 18/3 = 6, dy = 10/3, start heading -pi/2 -> (-10/3, 6, pi/2 - ArcTan[1/2])
    closeVec(changeOfBasisR([-10, -5, -PI / 2], [8, 5, -Math.atan(0.5)], 3), [-10 / 3, 6, PI / 2 - Math.atan(0.5)], 14);
  });
  it('createPathElement reverses the gear of a negative parameter', () => {
    expect(createPathElement([-2, 1, 1])).toEqual([2, 1, -1]);
    expect(createPathElement([2, 1, 1])).toEqual([2, 1, 1]);
    expect(createPathElement([0, -1, 1])).toEqual([0, -1, 1]);
  });
  it('reverseSteering, reverseGear, timeflip and reflect', () => {
    expect(reverseSteering([1, -1, 1])).toEqual([1, 1, 1]);
    expect(reverseGear([1, -1, 1])).toEqual([1, -1, -1]);
    expect(timeflip([[1, -1, 1], [2, 0, -1]])).toEqual([[1, -1, -1], [2, 0, 1]]);
    expect(reflect([[1, -1, 1], [2, 0, -1]])).toEqual([[1, 1, 1], [2, 0, -1]]);
  });
  it('pathLength is the sum of the parameters', () => {
    expect(pathLength([[1, -1, 1], [2, 0, 1], [0.5, 1, -1]])).toBe(3.5);
  });
});

describe('car-paths formulas', () => {
  it('straight ahead gives L0 S5 L0: zero-length elements are kept (the DeleteCases pattern with exact 0 never matches reals)', () => {
    expect(getOptimalPath([0, 0, 0], [5, 0, 0], 1)[0]).toEqual([[0, -1, 1], [5, 0, 1], [0, -1, 1]]);
  });
  it('ties keep generation order: straight behind picks the timeflip variant of path1', () => {
    // positions are divided by r_min = 2: goal (-2.5, 0, 0). Variant 1 (path1 plain) needs 2.5 + 2 pi; variant 2
    // (timeflip of path1(2.5, 0, 0)) and variant 4 (reflect of it) both need 2.5 -> the first one is kept.
    const [opt] = getOptimalPath([0, 0, 0], [-5, 0, 0], 2);
    expect(opt).toEqual([[0, -1, -1], [2.5, 0, -1], [0, -1, -1]]);
    expect(pathLength(reflect(timeflip(path1(2.5, -0, 0))))).toBe(2.5); // the later variant ties
  });
  it('Dubins U-turn has length pi times r_min, ties keep the order LSL, LSR, RSR, RSL, LRL, RLR', () => {
    const [opt, all] = getOptimalDubinsPath([0, 0, 0], [0, 4, PI], 2);
    expect(pathLength(opt) * 2).toBeCloseTo(2 * PI, 12);
    expect(opt.map((e) => e[1])).toEqual([-1, 0, -1]); // LSL (first) — LSR has the same length
    expect(pathLength(all[1])).toBeCloseTo(PI, 12);
    expect(all[1].map((e) => e[1])).toEqual([-1, 0, 1]);
  });
  it('every Reeds-Shepp and Dubins candidate path ends at the goal (independent integrator)', () => {
    const rnd = lcg(42);
    for (let k = 0; k < 300; k++) {
      const goal = [(rnd() - 0.5) * 12, (rnd() - 0.5) * 12, (rnd() - 0.5) * 4 * PI];
      for (const p of [...getAllPaths([0, 0, 0], goal, 1), ...getAllDubinsPaths([0, 0, 0], goal, 1)]) {
        const [x, y, t] = integrate(p);
        expect(Math.hypot(x - goal[0], y - goal[1], wrap(t - goal[2]))).toBeLessThan(1e-9);
      }
    }
  });
  it('Reeds-Shepp optimal lengths agree with the upstream Python library (fixture)', () => {
    expect(fixture.cases.length).toBeGreaterThan(20);
    for (const c of fixture.cases) {
      const [opt, all] = getOptimalPath(c.start, c.goal, c.minRadius);
      expect(Math.abs(pathLength(opt) * c.minRadius - c.length)).toBeLessThan(1e-9 * Math.max(1, c.length));
      const word = opt.filter((e) => e[0] !== 0).map((e) => [e[1], e[2]]);
      if (JSON.stringify(word) !== JSON.stringify(c.word)) {
        // a tie between different words (K-CP-02): the Python's choice must be among the port's equally short paths
        const same = all.some((p) => JSON.stringify(p.filter((e) => e[0] !== 0).map((e) => [e[1], e[2]])) === JSON.stringify(c.word)
          && Math.abs(pathLength(p) - pathLength(opt)) < 1e-12);
        expect(same, JSON.stringify(c)).toBe(true);
      }
    }
  });
  it('Dubins paths drive forward only and are never shorter than the Reeds-Shepp path (Details text)', () => {
    const rnd = lcg(3);
    for (let k = 0; k < 300; k++) {
      const s = [(rnd() - 0.5) * 26, (rnd() - 0.5) * 16, (rnd() - 0.5) * 2 * PI];
      const g = [(rnd() - 0.5) * 26, (rnd() - 0.5) * 16, (rnd() - 0.5) * 2 * PI];
      const r = 0.5 + rnd() * 9.5;
      const [d] = getOptimalDubinsPath(s, g, r);
      const [rs] = getOptimalPath(s, g, r);
      expect(d.every((e) => e[2] === 1)).toBe(true);
      expect(pathLength(d)).toBeGreaterThanOrEqual(pathLength(rs) - 1e-12);
    }
  });
  it('the Reeds-Shepp length does not change when start and goal are swapped (Details text)', () => {
    const rnd = lcg(11);
    for (let k = 0; k < 200; k++) {
      const s = [(rnd() - 0.5) * 26, (rnd() - 0.5) * 16, (rnd() - 0.5) * 2 * PI];
      const g = [(rnd() - 0.5) * 26, (rnd() - 0.5) * 16, (rnd() - 0.5) * 2 * PI];
      expect(pathLength(getOptimalPath(s, g, 3)[0])).toBeCloseTo(pathLength(getOptimalPath(g, s, 3)[0]), 10);
    }
  });
  it('identical start and goal: the original gives a zero-length path (the Python would divide by zero)', () => {
    expect(getOptimalPath([1, 2, 0.3], [1, 2, 0.3], 3)[0]).toEqual([[0, -1, 1], [0, 0, 1], [0, -1, 1]]);
    // path5's own branch for rho == 0: u = ArcCos[1] = 0, a = 0, t = pi/2, v = pi/2
    expect(path5(0, 0, 0)).toEqual([[PI / 2, -1, 1], [0, 1, 1], [PI / 2, -1, -1]]);
  });
  it('the rho == 0 branch of path7 can never run (u1 = 20/16 > 1)', () => {
    expect(path7(0, 2, 0)).toEqual([]); // xi = 0 + Sin[0] = 0, eta = 2 - 1 - Cos[0] = 0
  });
});

describe('car-paths getPos and drawing data', () => {
  it('getPos: a quarter left turn of radius 2 ends at (2, 2) heading up, Alpha = r_min', () => {
    const [pos, th, alpha] = getPos([[PI / 2, -1, 1]], [0, 0, 0], 2, 1);
    closeVec(pos, [2, 2], 14);
    expect(th).toBeCloseTo(PI / 2, 15);
    expect(alpha).toBe(2);
  });
  it('getPos: a backward right arc moves the car to (-1, -1) and turns it left, Alpha = -r_min', () => {
    const [pos, th, alpha] = getPos([[PI / 2, 1, -1]], [0, 0, 0], 1, 1);
    closeVec(pos, [-1, -1], 14);
    expect(th).toBeCloseTo(PI / 2, 15);
    expect(alpha).toBe(-1);
  });
  it('getPos: progress stops inside an element', () => {
    const [pos, th, alpha] = getPos([[1, 0, 1], [1, 0, 1]], [0, 0, 0], 1, 0.75);
    closeVec(pos, [1.5, 0], 15);
    expect([th, alpha]).toEqual([0, 0]);
  });
  it('getPos: at progress 0 the car sits at the start with the wheels of the first arc (snapshot 1 shows turned front tyres)', () => {
    const start = [-10, -5, -PI / 2];
    const [pos, th, alpha] = getPos([[0.6464, 1, -1], [PI / 2, -1, 1]], start, 3, 0);
    closeVec(pos, [-10, -5], 14);
    expect(th).toBe(-PI / 2);
    expect(alpha).toBe(-3);
  });
  it('drawPath: arcs with centres, angles and construction circles, lines for straight elements', () => {
    const [arc, line] = drawPath([[PI / 2, -1, 1], [1, 0, 1]], [0, 0, 0], 2, true);
    expect(arc.kind).toBe('arc');
    closeVec(arc.center, [0, 2], 15);
    expect([arc.r, arc.angS, arc.angE]).toEqual([2, -PI / 2, 0]);
    expect(arc.construction.r).toBe(2);
    expect(line.kind).toBe('line');
    closeVec(line.from, [2, 2], 14);
    closeVec(line.to, [2, 4], 14);
    expect(drawPath([[PI / 2, -1, 1]], [0, 0, 0], 2, false)[0].construction).toBe(null);
  });
  it('drawPath: a forward right arc has angE < angS (drawn between the two angles, K-CP-01)', () => {
    const [arc] = drawPath([[0.5, 1, 1]], [0, 0, 0], 1, true);
    expect(arc.angS).toBe(PI / 2);
    expect(arc.angE).toBe(PI / 2 - 0.5);
    closeVec(arc.center, [0, -1], 15);
  });
  it('drawCar: body rectangle of the car centred at the rear axle', () => {
    const body = drawCar([0, 0], 0, 0, 0.2).prims.find((p) => p.role === 'body');
    closeVec(body.pts.flat(), [-0.3, -0.5, 1.7, -0.5, 1.7, 0.5, -0.3, 0.5], 14);
    // rotated by pi/2 about the rear axle and moved to (1, 2): (x, y) -> (1 - y, 2 + x)
    const body2 = drawCar([1, 2], PI / 2, 0, 0.2).prims.find((p) => p.role === 'body');
    closeVec(body2.pts.flat(), [1.5, 1.7, 1.5, 3.7, 0.5, 3.7, 0.5, 1.7], 14);
  });
  it('drawCar: front wheels turn by ArcTan[Alpha - .375, 1.4] and ArcTan[Alpha + .375, 1.4] (Mathematica argument order)', () => {
    expect(drawCar([0, 0], 0, 0, 0.6).wheelAngles).toEqual([0, 0]);
    closeVec(drawCar([0, 0], 0, 3, 0.6).wheelAngles, [Math.atan(1.4 / 2.625), Math.atan(1.4 / 3.375)], 15);
    closeVec(drawCar([0, 0], 0, -3, 0.6).wheelAngles, [PI - Math.atan(1.4 / 3.375), PI - Math.atan(1.4 / 2.625)], 15);
    expect(wheelAngle(3, 'left')).toBeGreaterThan(wheelAngle(3, 'right')); // inner wheel turns more
  });
  it('drawCar: headlights, axles, four tyres and the arrow, with the opacities of the original', () => {
    const { prims } = drawCar([0, 0], 0, 0, 0.6);
    const roles = prims.map((p) => p.role);
    expect(roles.filter((r) => r === 'headlight').length).toBe(2);
    expect(roles.filter((r) => r === 'axle').length).toBe(2);
    expect(roles.filter((r) => r.startsWith('tyre')).length).toBe(4);
    expect(prims.find((p) => p.role === 'body').opacity).toBe(0.6);
    expect(prims.find((p) => p.role === 'headlight').opacity).toBeCloseTo(0.48, 15); // Opacity[0.8 opac]
    const arrow = prims.find((p) => p.role === 'arrow');
    closeVec(arrow.pts.flat(), [0.7, 0, 1.7, 0], 15);
  });
});

describe('car-paths Manipulate body', () => {
  it('the first evaluation of the initial settings keeps the locators and computes the path', () => {
    const { state, view } = evaluate(initialState());
    expect(state.locs).toEqual(LOCS0);
    expect(state.locsOld).toEqual(LOCS0);
    expect(view.start).toEqual([-10, -5, -PI / 2]);
    closeVec(view.goal, [8, 5, -Math.atan(0.5)], 15);
    expect(view.recomputed).toBe(true);
    expect(state.optPath.length).toBe(4);
  });
  it('dragging the start position keeps the heading and carries the orientation marker 2 units away', () => {
    const st = evaluate(initialState()).state;
    st.locs[0] = [-5, 0];
    const { state, view } = evaluate(st);
    expect(view.sTheta).toBe(-PI / 2);
    closeVec(state.locs[1], [-5, -2], 14);
    expect(state.locsOld[0]).toEqual([-5, 0]);
    expect(state.locsOld[1]).toEqual(state.locs[1]);
  });
  it('dragging an orientation marker turns the car and holds the marker 2 units away', () => {
    const st = evaluate(initialState()).state;
    st.locs[1] = [-7, -5]; // 3 units to the right of the start
    const { state, view } = evaluate(st);
    expect(view.sTheta).toBe(0);
    expect(state.locs[1]).toEqual([-8, -5]);
    expect(state.locsOld[1]).toEqual([-8, -5]);
  });
  it('the goal locators behave like the start locators', () => {
    const st = evaluate(initialState()).state;
    st.locs[3] = [8, 9]; // straight above the goal
    const { state, view } = evaluate(st);
    expect(view.gTheta).toBe(PI / 2);
    closeVec(state.locs[3], [8, 7], 14);
  });
  it('positions are clamped to 13 x 8 (tighter than the locator range 14 x 9)', () => {
    const st = evaluate(initialState()).state;
    st.locs[0] = [14, 9];
    st.locs[2] = [-14, -9];
    const { state } = evaluate(st);
    expect(state.locs[0]).toEqual([13, 8]);
    expect(state.locs[2]).toEqual([-13, -8]);
    closeVec(state.locs[1], [13, 6], 14); // start heading -pi/2 kept
    closeVec(state.locs[3], [-13 + 2 * Math.cos(-Math.atan(0.5)), -8 + 2 * Math.sin(-Math.atan(0.5))], 14);
  });
  it('input corrections of minRadius and progress', () => {
    const base = initialState();
    expect(evaluate({ ...base, minRadius: 0 }).state.minRadius).toBe(0.001);
    expect(evaluate({ ...base, minRadius: 12 }).state.minRadius).toBe(10);
    expect(evaluate({ ...base, minRadius: NaN }).state.minRadius).toBe(3);
    expect(evaluate({ ...base, minRadius: 'abc' }).state.minRadius).toBe(3);
    expect(evaluate({ ...base, progress: -1 }).state.progress).toBe(0);
    expect(evaluate({ ...base, progress: 2 }).state.progress).toBe(1);
    expect(evaluate({ ...base, progress: NaN }).state.progress).toBe(0);
  });
  it('progressOld stays -1, so the path is recomputed on every evaluation (the cache never works)', () => {
    let st = evaluate(initialState()).state;
    for (const p of [0.2, 0.5, 0.5, 0.9]) {
      const r = evaluate({ ...st, progress: p });
      expect(r.view.recomputed).toBe(true);
      expect(r.state.progressOld).toBe(-1);
      st = r.state;
    }
  });
  it('with a progressOld other than -1 the path is kept until progress repeats (cache branch as written)', () => {
    const st = { ...initialState(), progressOld: 0.5, progress: 0.3, optPath: [[1, 0, 1]] };
    const r1 = evaluate(st);
    expect(r1.view.recomputed).toBe(false);
    expect(r1.state.optPath).toEqual([[1, 0, 1]]);
    expect(r1.state.progressOld).toBe(0.3);
    const r2 = evaluate(r1.state);
    expect(r2.view.recomputed).toBe(true);
    expect(r2.state.optPath.length).toBe(4);
  });
  it('distance includes the heading difference: 20.62 at the initial settings (the xy distance would be 20.59)', () => {
    const { view } = evaluate(initialState());
    // hand: Sqrt[18^2 + 10^2 + (pi/2 - ArcTan[1/2])^2] = Sqrt[425.2258] = 20.621; Sqrt[18^2 + 10^2] = 20.591
    expect(view.distanceValue).toBeCloseTo(20.62, 12);
    expect(round01(Math.hypot(18, 10))).toBeCloseTo(20.59, 12);
  });
  it('swap start and goal exchanges the locator pairs', () => {
    const s = swapStartGoal(initialState());
    expect(s.locs).toEqual([[8, 5], [10, 4], [-10, -5], [-10, -7]]);
    expect(s.locsOld).toEqual(s.locs);
  });
  it('type Dubins uses the six forward-only words', () => {
    const { state } = evaluate({ ...initialState(), type: 'Dubins' });
    expect(state.optPath.length).toBe(3);
    expect(state.optPath.every((e) => e[2] === 1)).toBe(true);
  });
  it('Round[x, 0.01] display rounding', () => {
    expect(round01(24.081141562328455)).toBeCloseTo(24.08, 12);
    expect(round01(20.621003)).toBeCloseTo(20.62, 12);
  });
});
