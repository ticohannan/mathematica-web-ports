// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/drone-reachable-set.test.js — the model of "Reachable Set for a Drone": the opening state and the initial
// settings from the notebook, the closed-form trajectories (against a numerical integration and hand-derived cases), the
// region and the optimum curves (against the plots saved in the notebook), the body's parameter checking, the drone, the
// picture's range and options, the LocatorPane picture and the notebook's six snapshot settings. Expected values derived
// by hand or from the motion they describe.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, initialSettings, evaluate, xphaseshift, zphaseshift, Theta, drawdrone, regions, optimumvalues,
  tRtTControl, clampToSquare, tValue, extentPoints, boxOf, pictureOptions, frameTickSpec, nothing, SAVED, SPECS, SYM_T,
  regionPlotPoints,
} from '../../demos/drone-reachable-set/model.js';
import { annotation, Cases } from '../../shared/graphics.js';
import { ColorData } from '../../shared/plot.js';

const saved = JSON.parse(readFileSync(new URL('../golden/drone-reachable-set.original-states.json', import.meta.url), 'utf8'));
const num = (x) => (Array.isArray(x) ? x.map(num) : x && typeof x === 'object' && 'n' in x ? x.n : x);
// the settings of a saved state without the two cached plots (not variables of the port, N-DR-02)
const settings = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'regionsd' && k !== 'regionsOpt').map(([k, v]) => [k, num(v)]));
const close = (a, b, d = 12) => { expect(a.length).toBe(b.length); a.forEach((x, i) => (Array.isArray(x) ? close(x, b[i], d) : expect(x).toBeCloseTo(b[i], d))); };
const { sin, cos, PI } = Math;

/**
 * x(t1), z(t1) by integrating ẍ = U sin θ, z̈ = U cos θ − 1 from rest (θ = θ0 + t until tR, then constant; U = UT1 until
 * tT, then UT2): Simpson steps (exact for the velocity, 4th order for the position) on the pieces between the switching
 * times, so that no step straddles a jump of the acceleration.
 */
function integrate(t1, tR, tT, theta0, UT1, UT2, n = 4000) {
  const acc = (t, left) => {
    const on = (s) => (left ? t <= s : t < s); // at a switching time the piece on the left uses the values before it
    const th = on(tR) ? t + theta0 : tR + theta0, U = on(tT) ? UT1 : UT2;
    return [U * sin(th), U * cos(th) - 1];
  };
  const cuts = [0, ...[tR, tT].filter((s) => s > 0 && s < t1).sort((a, b) => a - b), t1];
  let x = 0, z = 0, vx = 0, vz = 0;
  for (let k = 1; k < cuts.length; k++) {
    const a = cuts[k - 1], h = (cuts[k] - a) / n;
    for (let i = 0; i < n; i++) {
      const t = a + i * h, a1 = acc(t, false), a2 = acc(t + h / 2, true), a3 = acc(t + h, true);
      x += h * vx + ((h * h) / 6) * (a1[0] + 2 * a2[0]); z += h * vz + ((h * h) / 6) * (a1[1] + 2 * a2[1]);
      vx += (h / 6) * (a1[0] + 4 * a2[0] + a3[0]); vz += (h / 6) * (a1[1] + 4 * a2[1] + a3[1]);
    }
  }
  return [x, z];
}
/** the style in effect at the first primitive with this head inside g */
function styleAt(g, head) {
  let found = null;
  Cases(g, (q, st) => { if (!found && q.head === head) found = st; return false; });
  return found;
}
/** distance from p to a polyline */
function segDist(p, pts, i) {
  const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const s = L ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L)) : 0;
  return Math.hypot(p[0] - ax - s * dx, p[1] - ay - s * dy);
}
// the distance from p to a polyline, exact up to one grid cell (1/400 of the polyline's size, far above the tolerances
// used below); farther points get a value of at least the cell size. The grid is built once per polyline.
const segGrid = new WeakMap();
function distToPolyline(p, pts) {
  let G = segGrid.get(pts);
  if (!G) {
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    const h = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0, 1e-9) / 400;
    const cells = new Map();
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      for (let cx = Math.floor((Math.min(ax, bx) - x0) / h); cx <= Math.floor((Math.max(ax, bx) - x0) / h); cx++) {
        for (let cy = Math.floor((Math.min(ay, by) - y0) / h); cy <= Math.floor((Math.max(ay, by) - y0) / h); cy++) {
          const k = `${cx},${cy}`; if (!cells.has(k)) cells.set(k, []); cells.get(k).push(i);
        }
      }
    }
    G = { x0, y0, h, cells }; segGrid.set(pts, G);
  }
  const cx = Math.floor((p[0] - G.x0) / G.h), cy = Math.floor((p[1] - G.y0) / G.h);
  let best = Infinity;
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) for (const s of G.cells.get(`${i},${j}`) ?? []) best = Math.min(best, segDist(p, pts, s));
  return best <= G.h ? best : Math.max(best, G.h); // beyond one cell: only "farther than the cell" matters here
}
const curve = (f, a, b, n = 6000) => Array.from({ length: n + 1 }, (_, i) => f(a + ((b - a) * i) / n));
/** the Line primitives of a saved Mathematica Graphics ({head, args} form) with their directives' RGBColor */
function savedLines(g) {
  const out = [];
  const walk = (x, color) => {
    if (Array.isArray(x)) { let c = color; for (const y of x) { if (y?.head === 'Directive') { const rgb = y.args.find((d) => d.head === 'RGBColor'); if (rgb) c = rgb.args; } walk(y, c); } return; }
    if (x?.head === 'Line') out.push({ color, pts: x.args[0] });
    else if (x?.head === 'Graphics') walk(x.args[0], color);
  };
  walk(g.args[0], null);
  return out;
}
/** the boundary lines of a saved region plot: point ids into its GraphicsComplex, as points, with their colours */
function savedBoundaries(g) {
  const [pts, prims] = g.args[0].args;
  return prims[1].map(([dir, line]) => ({ color: dir.args[0].args, pts: line.args[0].map((id) => pts[id - 1]) }));
}

describe('drone-reachable-set model', () => {
  it("the opening state is the notebook's saved state; Initial settings are the Manipulate's own initial values", () => {
    expect(initialState()).toEqual(settings(saved.states[0]));
    expect(initialSettings()).toEqual(settings(saved.specs));
    expect(SAVED.t).toEqual({ sym: 'T' }); // t = T, unevaluated (Q-DR-01)
    const s = initialState(); s.tRtT[0] = 99;
    expect(SAVED.tRtT[0]).toBe(1); // a copy each time
  });
  it('evaluating the saved state leaves it unchanged; Initial settings fill tfold and r1old as in the notebook', () => {
    expect(evaluate(initialState()).state).toEqual(initialState());
    const { state, view } = evaluate(initialSettings());
    expect(state).toEqual(initialState()); // tfold = −1 ≠ T: the plots are made, tfold = 3, r1old = r1
    expect(view.recomputed).toBe(true);
    expect(evaluate(initialState()).view.recomputed).toBe(false);
  });
  it('xphaseshift and zphaseshift solve ẍ = U sin θ, z̈ = U cos θ − 1 from rest (numerical integration, both orders of tR and tT)', () => {
    const cases = [[2.5, 1, 2, 0, 0.3, 2.2], [2.5, 2, 1, 0, 0.3, 2.2], [3, 0.4, 0.4, 0, 0.102, 2.04], [1.7, 3, 0.5, 0, 1, 4],
      [4, 1.2, 3.1, 0.35, 0.5, 1.5], [4, 3.1, 1.2, -0.6, 0.5, 1.5], [0.8, 0.2, 0.6, 0, 0, 5]];
    for (const [t, tR, tT, th0, U1, U2] of cases) {
      const [x, z] = integrate(t, tR, tT, th0, U1, U2);
      expect(xphaseshift(t, tR, tT, th0, U1, U2)).toBeCloseTo(x, 9);
      expect(zphaseshift(t, tR, tT, th0, U1, U2)).toBeCloseTo(z, 9);
    }
  });
  it('hand-derived trajectories: no turning, maximum thrust while turning, the top of the set', () => {
    // tR = 0 (no turning): x = 0, z = ½((2 t tT − tT²) UT1 + (t − tT)² UT2 − t²)
    expect(xphaseshift(2.82, 0, 0.49, 0, 0.102, 2.04)).toBe(0);
    expect(zphaseshift(2.82, 0, 0.49, 0, 0.102, 2.04)).toBeCloseTo(0.5 * ((2 * 2.82 * 0.49 - 0.49 ** 2) * 0.102 + 2.33 ** 2 * 2.04 - 2.82 ** 2), 12);
    // tT = 0 < t < tR: maximum thrust while turning θ = t: x = UT2 (t − sin t), z = UT2 (1 − cos t) − t²/2
    expect(xphaseshift(1.5, 2, 0, 0, 0.3, 2)).toBeCloseTo(2 * (1.5 - sin(1.5)), 14);
    expect(zphaseshift(1.5, 2, 0, 0, 0.3, 2)).toBeCloseTo(2 * (1 - cos(1.5)) - 1.125, 14);
    // the top of the opening set: full thrust upward for T = 3: (UT2 − 1) T²/2 = 1.04 · 4.5 = 4.68
    expect(zphaseshift(3, 0, 0, 0, 0.102, 2.04)).toBeCloseTo(4.68, 13);
    // the opening point (t = T = 3, tR = 1, tT = 0): turn to θ = 1 at full thrust, then straight on at θ = 1
    const U = 2.04, v = [U * (1 - cos(1)), U * sin(1) - 1], p = [U * (1 - sin(1)), U * (1 - cos(1)) - 0.5];
    expect(xphaseshift(3, 1, 0, 0, 0.102, U)).toBeCloseTo(p[0] + 2 * v[0] + U * sin(1) * 2, 12);
    expect(zphaseshift(3, 1, 0, 0, 0.102, U)).toBeCloseTo(p[1] + 2 * v[1] + (U * cos(1) - 1) * 2, 12);
  });
  it('the two branches of the closed forms agree on tR = tT (continuity)', () => {
    for (const [t, tR] of [[2, 1], [3, 2], [0.4, 0.5], [2.82, 2.82]]) {
      expect(xphaseshift(t, tR, tR, 0, 0.3, 2)).toBeCloseTo(xphaseshift(t, tR, tR - 1e-9, 0, 0.3, 2), 7);
      expect(zphaseshift(t, tR, tR, 0, 0.3, 2)).toBeCloseTo(zphaseshift(t, tR, tR - 1e-9, 0, 0.3, 2), 7);
    }
  });
  it('Θ turns at UR1 until tR and at UR2 after', () => {
    expect(Theta(0.5, 1, 1, 0)).toBe(0.5);
    expect(Theta(2.5, 1, 1, 0)).toBe(1);
    expect(Theta(2.5, 1, 2, -1)).toBe(0.5);
  });
  it("the region boundaries saved in the notebook lie on the port's images of the four edges of the switching-time square", () => {
    const plots = [saved.states[0], saved.snapshots[2], saved.snapshots[5], saved.snapshots[6]];
    for (const st of plots) {
      const T = num(st.T), [U1, U2] = num(st.r1);
      const P = (ts1, ts2) => [xphaseshift(T, ts1, ts2, 0, U1, U2), zphaseshift(T, ts1, ts2, 0, U1, U2)];
      const edges = [curve((u) => P(u, 0), 0, T), curve((u) => P(T, u), 0, T), curve((u) => P(u, T), 0, T), curve((u) => P(0, u), 0, T)];
      const lines = savedBoundaries(st.regionsd);
      expect(lines.map((l) => l.color)).toEqual([[0.368417, 0.506779, 0.709798], [0.880722, 0.611041, 0.142051]]); // ColorData[97, 1], [97, 2]
      for (const [k, line] of lines.entries()) {
        let worst = 0; // one expect per line (thousands of points)
        for (const q of line.pts) {
          const p = k === 0 ? q : [-q[0], q[1]]; // region 2 is the mirror image
          worst = Math.max(worst, Math.min(...edges.map((e) => distToPolyline(p, e))));
        }
        expect(worst).toBeLessThan(2e-5);
      }
      // and the port's region has the saved plot's extent (PlotRange -> All of Mathematica's points)
      const own = boxOf(st.regionsd.args[0].args[0]);
      close(regions(T, 'Quality', U1, U2).options.PlotRange, own, 2);
    }
  });
  it("the optimum curves saved in the notebook lie on the port's curves (Blue, Green, Magenta, Brown, Red)", () => {
    for (const st of [saved.snapshots[2], saved.snapshots[5], saved.snapshots[6]]) {
      const T = num(st.T), [U1, U2] = num(st.r1);
      const P = (tR, tT) => [xphaseshift(T, tR, tT, 0, U1, U2), zphaseshift(T, tR, tT, 0, U1, U2)];
      const byColor = {
        '0,0,1': curve((u) => P(u, 0), 0, T), '0,1,0': curve((u) => P(u, T), 0, T), '1,0,1': curve((u) => P(0, u), 0, T),
        '0.6,0.4,0.2': curve((u) => P(T, u), 0, T), '1,0,0': curve((u) => P(u, u - PI / 2), PI / 2, T),
      };
      const lines = savedLines(st.regionsOpt);
      expect(lines.map((l) => l.color.join())).toEqual(['0,0,1', '0,0,1', '0,1,0', '0,1,0', '1,0,1', '0.6,0.4,0.2', '0.6,0.4,0.2', '1,0,0', '1,0,0']);
      for (const { color, pts } of lines) {
        let worst = 0; // one expect per line (thousands of points)
        for (const q of pts) worst = Math.max(worst, Math.min(distToPolyline(q, byColor[color.join()]), distToPolyline([-q[0], q[1]], byColor[color.join()])));
        expect(worst, color.join()).toBeLessThan(2e-5);
      }
      const g = optimumvalues(T, 'Quality', U1, U2);
      for (const id of ['optimum-blue', 'optimum-green', 'optimum-magenta', 'optimum-brown', 'optimum-red']) expect(annotation(g, id), id).toBeTruthy();
    }
    expect(Cases(annotation(optimumvalues(1.5, 'Quality', 0.1, 2), 'optimum-red').g, 'Line')).toEqual([]); // T ≤ π/2: nothing
  });
  it('the region plot: two mirrored regions, faces Blue at Opacity 0.3, boundaries ColorData[97, 1] and [97, 2]', () => {
    const g = regions(3, 'Quality', 0.102, 2.04);
    for (const i of [1, 2]) {
      const face = styleAt(annotation(g, `region-face-${i}`).g, 'FilledPolygons'), edge = styleAt(annotation(g, `region-boundary-${i}`).g, 'Line');
      expect(face.color).toEqual([0, 0, 1]);
      expect(face.opacity).toBe(0.3);
      expect(edge.color).toEqual([...ColorData(97, i).rgb]);
    }
    // the edges of the square: 4 × PlotPoints segments, the first point (ts1 = ts2 = 0) the top of the set
    const b1 = Cases(annotation(g, 'region-boundary-1').g, 'Line')[0].pts;
    expect(b1.length).toBe(4 * 60 + 1);
    expect([regionPlotPoints(1), regionPlotPoints(3), regionPlotPoints(4.5), regionPlotPoints(10)]).toEqual([60, 60, 90, 120]);
    close(b1[0], [0, 4.68], 12);
    expect(g.options.PlotRange[0][0]).toBeCloseTo(-g.options.PlotRange[0][1], 14); // symmetric
  });
  it('parameter checking: t and the locator are kept in [0, T]; t = T follows T; tfold and r1old record a new T and r1', () => {
    const s = evaluate({ ...initialState(), T: 2, t: 2.5, tRtT: [3, -1] }).state;
    expect(s.t).toBe(2);
    expect(s.tRtT).toEqual([2, 0]);
    expect(s.tfold).toBe(2);
    expect(s.r1old).toEqual([0.102, 2.04]);
    const sym = evaluate({ ...initialState(), T: 5 });
    expect(sym.state.t).toEqual(SYM_T); // still the symbol
    expect(sym.view.t).toBe(5);
    expect(tValue(SYM_T, 7)).toBe(7);
    expect(tValue(1.5, 7)).toBe(1.5);
    expect(clampToSquare([4, -2], 3)).toEqual([3, 0]);
    const r = evaluate({ ...initialState(), r1: [0.5, 3] });
    expect(r.state.r1old).toEqual([0.5, 3]);
    expect(r.view.recomputed).toBe(true);
    expect(r.view.regionRange[1][1]).toBeCloseTo(2 * 4.5, 12); // top: (3 − 1)·3²/2
  });
  it('drawdrone turns the drone by −Θ about the centre of its bounding box (0, 0.09 r) and moves it to (x, z)', () => {
    const level = boxOf(extentPoints(drawdrone(0, 2, 3, 1)));
    close(level, [[0.4, 3.6], [2.85, 3.33]], 12);
    // Θ = π/2: x from −0.24 to 0.24 about the centre, y from −1.6 to 1.6 (clockwise: the right propellers go down)
    close(boxOf(extentPoints(drawdrone(PI / 2, 2, 3, 1))), [[1.76, 2.24], [1.49, 4.69]], 12);
    const right = Cases(drawdrone(PI / 2, 0, 0, 1), 'Disk')[0]; // Disk[{1.2, .25}, {.4, .08}] before the rotation
    expect(right.c).toEqual([1.2, 0.25]);
    expect(right.r).toEqual([0.4, 0.08]);
    const rot = drawdrone(PI / 2, 0, 0, 1).g;
    expect(rot.angle).toBe(-PI / 2);
    expect(rot.about).toEqual([0, 0.09]);
  });
  it('the picture of the opening state: the region, the dashed path to the orange point at t = T, PlotRange -> All, the frame', () => {
    const { view, graphics: [picture] } = evaluate(initialState());
    expect(view.xd).toBeCloseTo(5.632167, 6); // hand-derived above; snapshot 1: the orange point at about (5.6, 2.1)
    expect(view.zd).toBeCloseTo(2.075418, 6);
    const point = annotation(picture, 'drone-point');
    expect(point.g.at(-1).pts).toEqual([[view.xd, view.zd]]);
    expect(Cases(point.g, (q, st) => q.head === 'Point' && st.color[0] === 1)).toHaveLength(1); // Orange
    expect(annotation(picture, 'drone')).toBeNull();
    expect(annotation(picture, 'optimum-blue')).toBeNull();
    const path = Cases(annotation(picture, 'path').g, 'Line')[0].pts;
    close(path[0], [0, 0], 14);
    close(path.at(-1), [view.xd, view.zd], 10);
    // PlotRange -> All: the region (the saved plot: x ±6.16316, z −5.14780 … 4.68), padded by 5 %
    close(view.PlotRange, [[-6.1632, 6.1632], [-5.1478, 4.68]], 3);
    expect(view.padded[0][1]).toBeCloseTo(6.779, 3); // snapshot 1: the frame at x ≈ ±6.78, z ≈ −5.64 … 5.17
    expect(view.padded[1][0]).toBeCloseTo(-5.639, 3);
    expect(picture.options.Frame).toBe(true);
    expect(picture.options.AxesOrigin).toEqual([0, 0]);
    expect(picture.options.FrameTicks).toEqual([{ major: 2, minor: 0.5 }, { major: 2, minor: 0.5 }]);
    expect(annotation(picture, 'axes-label-x').g.pos[0]).toBeGreaterThan(view.padded[0][1]); // beyond the frame
    expect(annotation(picture, 'axes-label-z').g.pos[1]).toBeGreaterThan(view.padded[1][1]);
  });
  it('pictureOptions fits the padded range into the 400 × 400 image (AspectRatio Automatic), centred', () => {
    const { options, unitsPerPx, padded } = pictureOptions([[-6, 6], [-4, 2]]);
    close(padded, [[-6.6, 6.6], [-4.3, 2.3]], 12);
    const [[l, r], [b, t]] = options.ImagePadding;
    const w = 400 - l - r, h = w * options.AspectRatio;
    expect(l).toBeCloseTo(6 + 6.3 * 2, 12); // the longest tick label on the left: "−4", 2 characters
    expect(w).toBeCloseTo(400 - 18.6 - 14, 12); // the width binds
    expect(h + b + t).toBeCloseTo(400, 12);
    expect(b - 17).toBeCloseTo(t - 22, 12); // the free height split equally
    expect(unitsPerPx).toBeCloseTo(13.2 / w, 14);
    const tall = pictureOptions([[-1, 1], [-1, 10]]); // the height binds
    const [[l2, r2], [b2, t2]] = tall.options.ImagePadding;
    expect((400 - l2 - r2) * tall.options.AspectRatio + b2 + t2).toBeCloseTo(400, 12);
    expect(l2 - 18.6).toBeCloseTo(r2 - 14, 12); // the free width split equally ("10": 18.6 px on the left)
    expect(pictureOptions([[-90, 90], [-110, 55]]).options.ImagePadding[0][0]).toBeCloseTo(6 + 6.3 * 4, 12); // "−100"
    // z = 0 at the edge of the data: no horizontal axis (AxesOrigin on the frame's edge) and no room for x̂ on the right
    const bare = pictureOptions([[-6, 6], [0, 8]]);
    expect(bare.axes).toEqual([false, true]);
    expect(bare.options.AxesOrigin).toEqual([0, -0.4]);
    expect(400 - bare.options.ImagePadding[0][0] - bare.options.ImagePadding[0][1]).toBeCloseTo(378, 12); // 400 − 18 − 4
  });
  it("frameTickSpec: major steps of the snapshots' frames (2 up to a range of 15.7, 5 from 18.8)", () => {
    expect(frameTickSpec(-6.779, 6.779)).toEqual({ major: 2, minor: 0.5 });
    expect(frameTickSpec(-0.716, 15.03)).toEqual({ major: 2, minor: 0.5 }); // snapshot 6, z
    expect(frameTickSpec(-6.036, 12.784)).toEqual({ major: 5, minor: 1 }); // snapshot 5, z: −5, 0, 5, 10
    expect(frameTickSpec(-11.44, 11.44)).toEqual({ major: 5, minor: 1 });
    expect(frameTickSpec(-0.3, 0.3)).toEqual({ major: 0.1, minor: 0.02 });
  });
  it('the LocatorPane picture: the square [0, T]², its coloured edges, the red line tT = tR − π/2 (a blue point when T ≤ π/2)', () => {
    const g = tRtTControl(3);
    close(g.options.PlotRange, [[-0.1, 3.03], [-0.1, 3.03]], 14);
    expect(g.options.AspectRatio).toBe(1);
    const sq = annotation(g, 'pane-square');
    expect(sq.g.a).toEqual([0, 0]); expect(sq.g.b).toEqual([3, 3]);
    expect(annotation(g, 'pane-brown').g.pts).toEqual([[3, 0], [3, 3]]);
    expect(annotation(g, 'pane-green').g.pts).toEqual([[0, 3], [3, 3]]);
    expect(annotation(g, 'pane-magenta').g.pts).toEqual([[0, 0], [0, 3]]);
    close(annotation(g, 'pane-red').g.pts, [[PI / 2, 0], [3, 3 - PI / 2]], 14);
    expect(annotation(g, 'pane-red').style.color).toEqual([1, 0, 0]);
    const small = tRtTControl(1.2);
    expect(annotation(small, 'pane-red')).toBeNull();
    expect(Cases(annotation(small, 'pane-origin').g, 'Point')[0].pts).toEqual([[0, 0]]);
  });
  it("the notebook's six snapshot settings evaluate to the snapshot pictures' drone positions, frames and parts", () => {
    const snap = (k) => evaluate(settings(saved.snapshots[k]));
    // measured in the snapshot pictures (px): the frame's width / height, and the centroid of the drone's gray body converted
    // to data units with the frame — the drone's picture is centred at (xd, zd + 0.09) (the centre of its bounding box)
    const MEASURED = {
      1: { frame: 371 / 296.5 }, 2: { frame: 371 / 295.5, body: [4.25, -2.66] }, 3: { frame: 371 / 297, body: [0.04, 1.75] },
      4: { frame: 371 / 323, body: [0.21, -3.69] }, 5: { frame: 371 / 305 }, 6: { frame: 385 / 229.5, body: [10.89, 9.56] },
    };
    for (const [k, m] of Object.entries(MEASURED)) {
      const { view } = snap(k), [[x0, x1], [z0, z1]] = view.padded;
      expect((x1 - x0) / (z1 - z0), `snapshot ${k}: frame`).toBeCloseTo(m.frame, 1); // PlotRange -> All, padded 5 %
      if (m.body) { expect(Math.abs(view.xd - m.body[0]), `snapshot ${k}: x`).toBeLessThan(0.2); expect(Math.abs(view.zd + 0.09 - m.body[1]), `snapshot ${k}: z`).toBeLessThan(0.2); }
    }
    // 1: the opening picture
    expect(snap(1).view.xd).toBeCloseTo(evaluate(initialState()).view.xd, 14);
    // 2: tR 2.19, tT 0.62 — the drone low on the right, turned by 2.19 rad; its propeller widens the range beyond the region
    // on the right only (x to 5.37 against 5.30; the frame −5.84 … 5.90 as in the snapshot, where it is asymmetric too)
    let r = snap(2);
    expect(r.view.theta).toBe(2.19);
    expect(r.view.PlotRange[0][1] - r.view.regionRange[0][1]).toBeGreaterThan(0.05);
    expect(r.view.PlotRange[0][0]).toBeCloseTo(r.view.regionRange[0][0], 3); // (the optimum curves are sampled more finely)
    for (const id of ['drone', 'optimum-blue', 'optimum-red', 'region-face-1', 'axes-label-x', 'axes-label-z']) expect(annotation(r.graphics[0], id), id).toBeTruthy();
    expect(annotation(r.graphics[0], 'drone-point')).toBeNull();
    // 3: no turning (tR = 0), tT 0.49 — the drone level on the z axis at z = ½((2·2.82·0.49 − 0.49²)·0.102 + 2.33²·2.04 − 2.82²)
    r = snap(3);
    expect(r.view.xd).toBe(0);
    expect(r.view.zd).toBeCloseTo(1.68998, 4);
    expect(r.view.theta).toBe(0);
    // 4: tR 2.16 < tT 2.77 — near the bottom; the drone below the region: PlotRange -> All includes it
    r = snap(4);
    expect(r.view.PlotRange[1][0]).toBeLessThan(r.view.regionRange[1][0] - 0.3);
    // 5: thrust {0.1, 4.}: top (4 − 1)·2.82²/2 = 11.93; tT = T (minimum thrust): the drone near the bottom notch
    r = snap(5);
    expect(r.view.regionRange[1][1]).toBeCloseTo(3 * 2.82 ** 2 / 2, 10);
    expect(r.view.zd).toBeLessThan(-3);
    expect(r.graphics[0].options.FrameTicks[1].major).toBe(5);
    // 6: thrust {3., 4.6}: the set is a crescent above the start (its lowest z > 0), the drone at the top right; z = 0 is only
    // the path's first point: no horizontal axis and no x̂ (Q-DR-04), the vertical axis and ẑ as usual
    r = snap(6);
    expect(r.view.regionRange[1][0]).toBeGreaterThan(1);
    expect(r.view.PlotRange[1][0]).toBe(0); // the path starts at the origin: PlotRange -> All reaches z = 0
    expect(r.view.axes).toEqual([false, true]);
    expect(annotation(r.graphics[0], 'axes-label-x')).toBeNull();
    expect(annotation(r.graphics[0], 'axes-label-z')).toBeTruthy();
    expect(r.graphics[0].options.AxesOrigin).toEqual([0, r.view.padded[1][0]]);
    for (const k of [2, 3, 4, 5, 6]) expect(snap(k).state).toEqual(settings(saved.snapshots[k])); // already consistent
  });
  it('nothing is a point of size 0 at the origin', () => {
    expect(Cases(nothing, 'Point')[0].pts).toEqual([[0, 0]]);
    expect(nothing.list[0].value).toBe(0);
  });
});
