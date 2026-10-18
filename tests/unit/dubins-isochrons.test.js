// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/dubins-isochrons.test.js — model of "Isochrons for a Dubins Car" (demos/dubins-isochrons/isochrons.js).
// Expected values: by hand (quarter turns, end points), from an RK4 integration of the car's equations of motion
// (below, independent of the formulas) or from the design's independent Python transcription (TESTPLAN T-DI-01…20).
import { describe, it, expect } from 'vitest';
import {
  mRS, mLS, mRL, mLR, carState, polySteps, tableValues, greyPolygons, isochronCurves, reachRegions, curveSteps,
  initialState, inputCellState, evaluate, needsPlot, FORMULAS,
} from '../../demos/dubins-isochrons/isochrons.js';
import { drawCar } from '../../demos/common/car-icon.js';
import { drawCar as drawCarCP } from '../../demos/car-paths/carpaths.js';

const PI = Math.PI;
const near = (a, b, tol = 1e-12) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);
const nearVec = (a, b, tol = 1e-12) => { expect(a.length).toBe(b.length); a.forEach((v, i) => near(v, b[i], tol)); };
function lcg(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

/** RK4 of the Dubins car from (0, 0) heading up: s·t seconds with the first steering, then (1 − s)·t with the second. */
function integrate(word, s, t, r, n = 2000) {
  const u = { R: -1 / r, L: 1 / r, S: 0 };
  let x = 0, y = 0, th = PI / 2;
  for (const [seg, T] of [[word[0], s * t], [word[1], (1 - s) * t]]) {
    const h = T / n, c = u[seg];
    for (let i = 0; i < n; i++) {
      // dx/dt = cos θ, dy/dt = sin θ, dθ/dt = c (θ is linear in time; x and y by RK4)
      const t2 = th + (h / 2) * c, t4 = th + h * c;
      x += (h / 6) * (Math.cos(th) + 4 * Math.cos(t2) + Math.cos(t4));
      y += (h / 6) * (Math.sin(th) + 4 * Math.sin(t2) + Math.sin(t4));
      th = t4;
    }
  }
  return [x, y];
}
/** point in the union of a region's quads (non-zero winding of any quad) */
function insideQuads(quads, [px, py]) {
  for (const q of quads) {
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (const [x, y] of q) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    if (px < minx || px > maxx || py < miny || py > maxy) continue;
    let w = 0;
    for (let i = 0; i < q.length; i++) {
      const [x1, y1] = q[i], [x2, y2] = q[(i + 1) % q.length];
      const cross = (x2 - x1) * (py - y1) - (px - x1) * (y2 - y1);
      if (y1 <= py && y2 > py && cross > 0) w++;
      else if (y1 > py && y2 <= py && cross < 0) w--;
    }
    if (w !== 0) return true;
  }
  return false;
}

describe('dubins-isochrons formulas', () => {
  it('mRS, mLS, mRL and mLR agree with an RK4 integration of the Dubins car', () => {
    const rnd = lcg(5);
    for (let k = 0; k < 40; k++) {
      const s = rnd(), t = 0.1 + rnd() * 13.9, r = 0.5 + rnd() * 9.5;
      for (const [w, f] of [['RS', mRS], ['LS', mLS], ['RL', mRL], ['LR', mLR]]) nearVec(f(s, t, r), integrate(w, s, t, r), 1e-9);
    }
  });
  it('isochron formulas at a quarter turn: mRS gives (2 + pi, 2) and mRL gives (4, 4)', () => {
    nearVec(mRS(0.5, 2 * PI, 2), [5.141592653589793, 2], 1e-14);
    nearVec(mLS(0.5, 2 * PI, 2), [-5.141592653589793, 2], 1e-14);
    nearVec(mRL(0.5, 2 * PI, 2), [4, 4], 1e-14);
    nearVec(mLR(0.5, 2 * PI, 2), [-4, 4], 1e-14);
    nearVec(mRS(1, PI, 2), [2, 2], 1e-15);
    nearVec(mLS(1, PI, 2), [-2, 2], 1e-15);
  });
  it('isochron end points: s = 0 is straight ahead and RL at s = 0 equals LS at s = 1', () => {
    expect(mRS(0, 10, 2)).toEqual([0, 10]);
    expect(mLS(0, 10, 2).map((v) => v + 0)).toEqual([0, 10]);
    const left = [-1.4326756290735476, -1.917848549326277], right = [1.4326756290735476, -1.917848549326277];
    nearVec(mRL(0, 10, 2), left, 1e-15);
    nearVec(mLS(1, 10, 2), left, 1e-15);
    nearVec(mRL(1, 10, 2), right, 1e-15);
    nearVec(mRS(1, 10, 2), right, 1e-15);
    nearVec(mLR(0, 10, 2), right, 1e-15);
    nearVec(left, [2 * (Math.cos(5) - 1), 2 * Math.sin(5)], 1e-15);
  });
});

describe('dubins-isochrons car', () => {
  it('car pose of snapshot 1: RS, tau 0.5, p 100', () => {
    const c = carState('RS', 2, 10, 0.5, 100);
    near(c.fs, 0.05); near(c.maxAlpha, 0.25);
    nearVec(c.cxy, [2.4125127694966784, 9.69947592476017]);
    near(c.cTheta, 1.3207963267948966);
    expect(c.cAlpha).toBe(0);
  });
  it('car pose of snapshot 2: LR, tau 5.57, p 100', () => {
    const c = carState('LR', 2, 10, 5.57, 100);
    near(c.fs, 0.557); near(c.maxAlpha, 2.785);
    nearVec(c.cxy, [-7.4321687856013146, 0.31706898177825416]);
    near(c.cTheta, 2.140796326794897);
    expect(c.cAlpha).toBe(-2);
  });
  it('car poses of snapshots 3 to 5: RL tau 4.27, RL tau 1.2, RS tau 1.2', () => {
    const a = carState('RL', 2, 10, 4.2700000000000005, 100), b = carState('RL', 2, 10, 1.2, 100), c = carState('RS', 2, 10, 1.2, 100);
    nearVec(a.cxy, [5.629321115832841, 4.71379806419473]); near(a.cTheta, 2.300796326794896); expect(a.cAlpha).toBe(2);
    nearVec(b.cxy, [-2.8832778834675463, 1.034854111694703]); near(b.cTheta, 5.370796326794897); expect(b.cAlpha).toBe(2);
    nearVec(c.cxy, [5.3181825360569555, 8.392238357995241]); near(c.cTheta, 0.9707963267948966); expect(c.cAlpha).toBe(0);
  });
  it('while p t/100 < tau the car is still turning (fs = 1)', () => {
    const c = carState('RL', 2, 10, 4, 30);
    expect(c.fs).toBe(1);
    nearVec(c.cxy, [1.8585255966645942, 1.994989973208109]);
    near(c.cTheta, 0.07079632679489656);
    expect(c.cAlpha).toBe(-2);
    // hand: 3 s on a right circle of radius 2 about (2, 0), from the origin heading up
    nearVec(c.cxy, [2 - 2 * Math.cos(1.5), 2 * Math.sin(1.5)], 1e-12);
  });
  it('at the switching instant the car is at the end of the turn and its wheels show the second segment', () => {
    const a = carState('RL', 2, 10, 5, 50);
    expect(a.fs).toBe(1);
    nearVec(a.cxy, [3.602287231093867, 1.196944288207913]);
    near(a.cTheta, -0.9292036732051034);
    expect(a.cAlpha).toBe(2); // left: the second segment (Q-DI-04)
    expect(carState('RS', 2, 10, 5, 50).cAlpha).toBe(0);
  });
  it('tau beyond t: a pure turn for the whole time t', () => {
    const c = carState('LS', 2, 10, 12, 100);
    expect(c.fs).toBe(1); expect(c.maxAlpha).toBe(5);
    nearVec(c.cxy, [-1.4326756290735476, -1.917848549326277]);
    near(c.cTheta, 6.570796326794897);
    expect(c.cAlpha).toBe(2);
    const line = c.pathGraphics.pieces[1];
    expect(line.from).toEqual(line.to); // zero length
  });
  it('p 0 puts the car at the origin heading up', () => {
    const a = carState('RS', 2, 10, 0.5, 0), b = carState('RS', 2, 10, 0, 0);
    expect(a.cxy.map((v) => v + 0)).toEqual([0, 0]); expect(a.cTheta).toBe(PI / 2); expect(a.cAlpha).toBe(-2);
    expect(b.cxy.map((v) => v + 0)).toEqual([0, 0]); expect(b.cAlpha).toBe(0);
  });
  it('path graphics: arc centres and angles and the straight piece of each path', () => {
    const rs = carState('RS', 2, 10, 0.5, 100).pathGraphics;
    expect(rs.colour).toBe('Blue');
    expect(rs.pieces[0]).toMatchObject({ kind: 'arc', c: [2, 0], r: 2 });
    near(rs.pieces[0].a1, PI); near(rs.pieces[0].a2, 2.891592653589793);
    nearVec(rs.pieces[1].from, [0.06217515657871053, 0.4948079185090459]);
    nearVec(rs.pieces[1].to, [2.4125127694966784, 9.699475924760172]);
    const lr = carState('LR', 2, 10, 5.57, 100).pathGraphics;
    expect(lr.colour).toBe('Green');
    expect(lr.pieces.length).toBe(3); // the first arc twice (Q-DI-05)
    expect(lr.pieces[0]).toEqual(lr.pieces[1]);
    expect(lr.pieces[0]).toMatchObject({ c: [-2, 0], a1: 0 }); near(lr.pieces[0].a2, 2.785);
    nearVec(lr.pieces[2].c, [-5.748366835276777, 1.3963330792461932]);
    near(lr.pieces[2].a1, 5.926592653589793); near(lr.pieces[2].a2, 3.7115926535897934);
    const rl = carState('RL', 2, 10, 4.2700000000000005, 100).pathGraphics;
    expect(rl.colour).toBe('Red');
    near(rl.pieces[0].a1, PI); near(rl.pieces[0].a2, 1.0065926535897929);
    nearVec(rl.pieces[1].c, [4.1389723111431, 3.3800587941873355]);
    near(rl.pieces[1].a1, -2.135); near(rl.pieces[1].a2, 0.73);
  });
  it('drawCar of this Demonstration: optional headlights 8 units long without edges', () => {
    const opts = { lights: true, beam: 8, headlightEdge: null };
    const on = drawCar([0, 0], 0, 0, 0.8, opts), off = drawCar([0, 0], 0, 0, 0.8, { ...opts, lights: false });
    const lights = on.prims.filter((p) => p.role === 'headlight');
    expect(lights.length).toBe(2);
    nearVec(lights[0].pts.flat(), [1.7, 0.35, 8.7, 0.05, 8.7, 0.55], 1e-14);
    nearVec(lights[1].pts.flat(), [1.7, -0.35, 8.7, -0.05, 8.7, -0.55], 1e-14);
    for (const l of lights) { expect(l.edge).toBe(null); near(l.opacity, 0.64, 1e-15); }
    expect(off.prims.some((p) => p.role === 'headlight')).toBe(false);
    // every other primitive as car-paths' drawCar
    const cp = drawCarCP([0, 0], 0, 0, 0.8).prims.filter((p) => p.role !== 'headlight');
    expect(off.prims).toEqual(cp);
  });
});

describe('dubins-isochrons plot', () => {
  it('polySteps is 0.05 for t < 10 and 0.02 otherwise, times r^2 for r < 1', () => {
    expect([polySteps(10, 2), polySteps(9.99, 2), polySteps(5, 0.7), polySteps(5, 0.5), polySteps(12, 0.6)])
      .toEqual([0.02, 0.05, 0.024499999999999997, 0.0125, 0.0072]);
  });
  it('Table iterator: {s, 0, 1, 0.02} and {s, 1, 0, -0.02} give 51 values each', () => {
    const up = tableValues(0, 1, 0.02), down = tableValues(1, 0, -0.02);
    expect(up.length).toBe(51); expect(down.length).toBe(51);
    up.forEach((v, k) => expect(v).toBe(k * 0.02));
    down.forEach((v, k) => expect(v).toBe(1 + k * -0.02));
  });
  it('Table iterator with a step that does not divide 1 stops short of the end', () => {
    const a = tableValues(0, 1, 0.024499999999999997), b = tableValues(1, 0, -0.024499999999999997), c = tableValues(0, 1, 0.0072);
    expect([a.length, a.at(-1), b.length, b.at(-1)]).toEqual([41, 0.9799999999999999, 41, 0.02000000000000013]);
    expect([c.length, c.at(-1)]).toEqual([139, 0.9935999999999999]);
  });
  it('the two grey polygons are LS(1..0)+RS(0..1)+RL(0..1) and LS(1..0)+RS(0..1)+LR(1..0)', () => {
    const [P1, P2] = greyPolygons(10, 2);
    expect([P1.length, P2.length]).toEqual([153, 153]);
    expect(P1[0]).toEqual(mLS(1, 10, 2)); expect(P2[0]).toEqual(P1[0]);
    expect(P1[50].map((v) => v + 0)).toEqual([0, 10]); expect(P1[51]).toEqual([0, 10]);
    expect(P1[101]).toEqual(mRS(1, 10, 2));
    expect(P1[102]).toEqual(mRL(0, 10, 2));
    expect(P2[102]).toEqual(mLR(1, 10, 2));
    nearVec(P1[152], [1.4326756290735476, -1.917848549326277], 1e-15);
    nearVec(P2[152], [1.4326756290735476, -1.917848549326277], 1e-15);
  });
  it('plot cache: recomputed when t, r or set change or plotReach is 1, kept when tau, p or path change', () => {
    let { state } = evaluate(initialState());
    const plot0 = state.plotReach;
    for (const change of [{ tau: 3 }, { p: 40 }, { path: 'LS' }]) {
      const res = evaluate({ ...state, ...change });
      expect(res.view.recomputed).toBe(false);
      expect(res.state.plotReach).toBe(plot0);
      expect([res.state.told, res.state.rold, res.state.setold]).toEqual([10, 2, '=']);
      state = res.state;
    }
    for (const [change, check] of [[{ t: 12 }, (s) => s.told === 12], [{ r: 3 }, (s) => s.rold === 3], [{ set: '≤' }, (s) => s.setold === '≤']]) {
      const before = state.plotReach;
      const res = evaluate({ ...state, ...change });
      expect(res.view.recomputed).toBe(true);
      expect(res.state.plotReach).not.toBe(before);
      expect(check(res.state)).toBe(true);
      state = res.state;
    }
    expect(state.plotReach.regions).toBeTruthy();
    expect(needsPlot({ ...initialState(), plotReach: 1 })).toBe(true);
  });
  it('initial state is the live state: r 2, t 10, set =, path RS, tau 0.5, p 100 with the plot cached', () => {
    const s = initialState();
    const { plotReach, ...rest } = s;
    expect(rest).toEqual({ r: 2, rold: 2, t: 10, told: 10, set: '=', setold: '=', path: 'RS', tau: 0.5, p: 100 });
    expect(plotReach.curves && plotReach.polygons).toBeTruthy();
    expect(needsPlot(s)).toBe(false);
    const res = evaluate(s);
    expect(res.view.recomputed).toBe(false);
    expect(res.state.plotReach).toBe(plotReach);
    const input = evaluate(inputCellState());
    expect(input.view.recomputed).toBe(true);
    expect([input.state.told, input.state.rold, input.state.setold]).toEqual([10, 2, '=']);
  });
  it('isochron sampling: every sample lies on its curve and the turning angle per step is at most 1 degree', () => {
    for (const [r, t, n] of [[2, 10, 401], [0.5, 14, 1606], [10, 0.1, 401]]) {
      const curves = isochronCurves(t, r);
      const N = curveSteps(t, r);
      expect(N + 1).toBe(n);
      expect((PI / 180) * (r / t)).toBeGreaterThanOrEqual(1 / N); // Δs ≤ (π/180)·r/t
      for (const [w, pts] of Object.entries(curves)) {
        expect(pts.length).toBe(n);
        pts.forEach((p, k) => expect(p).toEqual(FORMULAS[w](k === N ? 1 : k / N, t, r)));
        expect(pts[0]).toEqual(FORMULAS[w](0, t, r));
        expect(pts[N]).toEqual(FORMULAS[w](1, t, r));
      }
    }
  });
  it('region mesh: image points lie inside their region and the holes beside the start stay empty', () => {
    const regions = reachRegions(10, 2);
    const rnd = lcg(9);
    const words = ['RS', 'LS', 'LR', 'RL'];
    // the quads are straight-edged: along the fold lines of RL and LR the curved image can stick out of the mesh by up
    // to 0.025 units (0.35 px, D-DI-02); points that miss must lie that close to the mesh
    const segDist = (p, a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const h = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(p[0] - a[0] - h * dx, p[1] - a[1] - h * dy);
    };
    let missed = 0;
    for (let k = 0; k < 2000; k++) {
      const w = words[k % 4], s = rnd(), t1 = rnd() * 10, p = FORMULAS[w](s, t1, 2);
      if (insideQuads(regions[w].quads, p)) continue;
      missed++;
      expect(['RL', 'LR']).toContain(w);
      const d = Math.min(...regions[w].quads.flatMap((q) => q.map((a, i) => segDist(p, a, q[(i + 1) % 4]))));
      expect(d, `${w} ${s} ${t1}`).toBeLessThan(0.03);
    }
    expect(missed).toBeLessThan(40);
    const inside = (p) => words.filter((w) => insideQuads(regions[w].quads, p));
    for (const p of [[2, 0.3], [-2, 0.3], [1, -1]]) expect(inside(p), String(p)).toEqual([]);
    expect(inside([5, 5])).toEqual(['RS', 'RL']);
    expect(inside([-5, 5])).toEqual(['LS', 'LR']);
    expect(inside([0.5, 9.5])).toEqual(['RS']);
  });
});
