// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Benedict Isichei
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/distance-norms.test.js — the pure model of demos/distance-norms (TESTPLAN T-DN-01 … T-DN-12). Expected
// values are derived by hand or from independent formulas (closed-form areas, 1-D midpoint integrals of the Jacobian
// determinant r1 r2 sin(θ2 + b)), never from the port.
import { describe, it, expect } from 'vitest';
import { Red, Blue } from '../../shared/graphics.js';
import { preGraphics, sameDrawing, graphicsJSON } from '../support/pre-graphics.js';
import {
  normP, ballBoundary, sheetCuts, sheets, mapPhase, mapWorkspace, polygonArea, evaluate, initialState, INITIAL, picture, PLOT_RANGE,
} from '../../demos/distance-norms/model.js';

const ulps = (a, b) => (a === b ? 0 : Math.abs(a - b) / (Number.EPSILON * Math.max(Math.abs(a), Math.abs(b))));
const close = (p, q, tol) => p.forEach((v, i) => expect(Math.abs(v - q[i]), `${p} vs ${q}`).toBeLessThanOrEqual(tol));
// independent norms (not the model's normP)
const NORM = {
  1: ([a, b]) => Math.abs(a) + Math.abs(b),
  2: ([a, b]) => Math.sqrt(a * a + b * b),
  3: ([a, b]) => (Math.abs(a) ** 3 + Math.abs(b) ** 3) ** (1 / 3),
  Infinity: ([a, b]) => Math.max(Math.abs(a), Math.abs(b)),
};
const hasPoint = (poly, q) => poly.some((p) => p[0] === q[0] && p[1] === q[1]);
/** centroid of an implicitly closed polygon (shoelace) */
function centroid(pts) {
  let A = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    const c = x0 * y1 - x1 * y0;
    A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
  }
  return [cx / (3 * A), cy / (3 * A)];
}
/**
 * true when no two non-adjacent edges of the (deduplicated) closed polygon cross; `ignore(x, y)` may excuse a crossing
 * at a point (used at the fold circles, where the exact image curves meet tangentially and their chords, 6·10⁻⁶ units
 * deep, can cross each other)
 */
function isSimple(poly, ignore = () => false) {
  const pts = poly.filter((p, i) => Math.hypot(p[0] - poly[(i + 1) % poly.length][0], p[1] - poly[(i + 1) % poly.length][1]) > 1e-9);
  const n = pts.length;
  const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const cross = (p1, p2, q1, q2) => {
    const d1 = orient(q1, q2, p1), d2 = orient(q1, q2, p2), d3 = orient(p1, p2, q1), d4 = orient(p1, p2, q2);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };
  // bounding boxes of chunks keep the O(n²) check fast enough
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const xmin = Math.min(a[0], b[0]), xmax = Math.max(a[0], b[0]), ymin = Math.min(a[1], b[1]), ymax = Math.max(a[1], b[1]);
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const c = pts[j], d = pts[(j + 1) % n];
      if (Math.max(c[0], d[0]) < xmin || Math.min(c[0], d[0]) > xmax || Math.max(c[1], d[1]) < ymin || Math.min(c[1], d[1]) > ymax) continue;
      if (cross(a, b, c, d) && !ignore(...a) && !ignore(...c)) return false;
    }
  }
  return true;
}
/** 1-D midpoint rule of f on [lo, hi] with n steps */
function midpoint(f, lo, hi, n) {
  const h = (hi - lo) / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += f(lo + (i + 0.5) * h);
  return s * h;
}
const state = (o = {}) => ({ ...initialState(), ...o });
const SNAP6 = { p1: [0.9407478840311477, 0.3391067954065765], p2: [0.9576538422043407, -0.28792207020522664] };

describe('distance-norms model: norms and the parameter-space ball', () => {
  it('Norm[v, p] for p = 1, 2, 3 and infinity', () => {
    const v = [0.3, -0.4];
    expect(Math.abs(normP(v, 1) - 0.7)).toBeLessThanOrEqual(1e-16); // 0.3 + 0.4
    expect(normP(v, 2)).toBe(0.5); // sqrt(0.09 + 0.16)
    expect(ulps(normP(v, 3), 0.4497941445275415)).toBeLessThanOrEqual(2); // (0.027 + 0.064)^(1/3)
    expect(normP(v, Infinity)).toBe(0.4);
  });

  it('ball boundary: every point has norm d, with the corners of the square and the vertices of the diamond', () => {
    for (const p of [1, 2, 3, Infinity]) {
      const poly = ballBoundary(p, 0.5);
      for (const q of poly) expect(Math.abs(NORM[p](q) - 0.5), `p = ${p}: ${q}`).toBeLessThanOrEqual(1e-15);
      expect(polygonArea(poly), `p = ${p}: counter-clockwise`).toBeGreaterThan(0);
      expect(isSimple(poly), `p = ${p}: closed simple polygon`).toBe(true);
      const last = poly[poly.length - 1], first = poly[0];
      expect(Math.hypot(last[0] - first[0], last[1] - first[1]), 'implicitly closed').toBeLessThan(0.02);
    }
    for (const c of [[0.5, 0.5], [-0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]]) expect(hasPoint(ballBoundary(Infinity, 0.5), c)).toBe(true);
    for (const p of [1, 2, 3]) {
      for (const c of [[0.5, 0], [0, 0.5], [-0.5, 0], [0, -0.5]]) expect(hasPoint(ballBoundary(p, 0.5), c), `p = ${p}: ${c}`).toBe(true);
    }
  });
});

describe('distance-norms model: the two maps', () => {
  it('workspace mode: the region is the p-ball of radius d around the tip', () => {
    const d = 0.5;
    // 2d², πd², 4d²Γ(4/3)²/Γ(5/3) (Γ(4/3) = 0.8929795115692493, Γ(5/3) = 0.9027452929509336), 4d²
    const expected = { 1: 0.5, 2: 0.7853981633974483, 3: (4 * d * d * 0.8929795115692493 ** 2) / 0.9027452929509336, Infinity: 1 };
    expect(expected[3]).toBeCloseTo(0.8833193751427255, 12);
    for (const p of [1, 2, 3, Infinity]) {
      const { region } = evaluate(state({ cORw: 'workspace', p }));
      expect(region.mode).toBe('workspace');
      expect(region.sheets).toHaveLength(1);
      expect(Math.abs(region.sheets[0].area / expected[p] - 1), `p = ${p}`).toBeLessThan(1e-3);
      close(centroid(region.sheets[0].world), [1, 1], 1e-12);
    }
  });

  it('phase-space mode maps the corners and vertices as in snapshots 1 and 5', () => {
    // θ = (0, π/2), r1 = r2 = 1: F(a, b) = (cos a + cos(a + π/2 + b), sin a + sin(a + π/2 + b))
    const F = mapPhase({ r1: 1, r2: 1, theta1: 0, theta2: Math.PI / 2 });
    const cases = [
      [[-0.5, -0.5], [1.7191, 0.0609]], [[0.5, -0.5], [0.8776, 1.4794]], [[0.5, 0.5], [0.0361, 1.0197]], [[-0.5, 0.5], [0.8776, 0.5206]],
      [[0.5, 0], [0.3982, 1.3570]], [[0, 0.5], [0.5206, 0.8776]], [[-0.5, 0], [1.3570, 0.3982]], [[0, -0.5], [1.4794, 0.8776]],
    ];
    for (const [ab, xy] of cases) close(F(ab), xy, 5e-5);
    // the same points are on the drawn outlines of snapshot 1 (∞) and snapshot 5 (1-norm)
    const b1 = evaluate(state()).region.boundary, b5 = evaluate(state({ cORw: 'configuration', p: 1 })).region.boundary;
    for (const [, xy] of cases.slice(0, 4)) expect(b1.some((q) => Math.hypot(q[0] - xy[0], q[1] - xy[1]) < 1e-4)).toBe(true);
    for (const [, xy] of cases.slice(4)) expect(b5.some((q) => Math.hypot(q[0] - xy[0], q[1] - xy[1]) < 1e-4)).toBe(true);
    // the workspace map is a translation to the tip
    close(mapWorkspace({ r1: 1, r2: 1, theta1: 0, theta2: Math.PI / 2 })([0.25, -0.5]), [1.25, 0.5], 1e-15);
  });
});

describe('distance-norms model: sheets and the region', () => {
  it('sheets: the ball is cut where theta2 + theta2d is a multiple of pi', () => {
    expect(sheetCuts(Math.PI / 2, 0.5)).toEqual([]);
    expect(sheets(Infinity, 0.5, Math.PI / 2)).toHaveLength(1);
    expect(sheetCuts(-0.2920563147897327, 0.5)).toEqual([0.2920563147897327]);
    expect(sheets(1, 0.5, -0.2920563147897327)).toHaveLength(2);
    expect(sheetCuts(0.3, 3.14)).toEqual([-0.3, 2.8415926535897933]);
    const s = sheets(Infinity, 3.14, 0.3);
    expect(s).toHaveLength(3);
    expect(s.map((x) => [x.lo, x.hi])).toEqual([[-Infinity, -0.3], [-0.3, 2.8415926535897933], [2.8415926535897933, Infinity]]);
    // every sheet lies in its b range; on a sheet sin(θ2 + b) does not change sign
    for (const x of s) {
      for (const [, b] of x.poly) { expect(b).toBeGreaterThanOrEqual(x.lo); expect(b).toBeLessThanOrEqual(x.hi); }
      const signs = new Set(x.poly.map(([, b]) => Math.sign(Math.round(Math.sin(0.3 + b) * 1e9))).filter((v) => v !== 0));
      expect(signs.size).toBe(1);
    }
  });

  it('sheet areas add up to the integral of r1 r2 abs(sin(theta2 + theta2d))', () => {
    // (a) default: ∫∫ |sin(π/2 + b)| over the square = 2d · 2 sin d
    const a = evaluate(state()).region;
    expect(Math.abs(a.totalArea / (2 * 0.5 * 2 * Math.sin(0.5)) - 1)).toBeLessThan(1e-3);
    expect(2 * 0.5 * 2 * Math.sin(0.5)).toBeCloseTo(0.958851077208406, 14);
    // (b) snapshot 6 angles, 1-norm: the a-width of the diamond at height b is 2(d − |b|)
    const theta2 = Math.atan2(SNAP6.p2[1], SNAP6.p2[0]);
    const exactB = midpoint((b) => 2 * (0.5 - Math.abs(b)) * Math.abs(Math.sin(theta2 + b)), -0.5, 0.5, 200000);
    // 0.146968; the TESTPLAN's 0.14685 came from a 2000² midpoint rule over the square, which loses the cells cut by the
    // diamond's edges (0.08 % low); both are within the 0.5 % tolerance of the port's sheet total
    expect(exactB).toBeCloseTo(0.146968, 5);
    expect(Math.abs(exactB / 0.14685 - 1)).toBeLessThan(5e-3);
    const b = evaluate(state({ cORw: 'configuration', p: 1, ...SNAP6 })).region;
    expect(b.sheets).toHaveLength(2);
    expect(Math.abs(b.totalArea / exactB - 1)).toBeLessThan(5e-3);
    // (c) θ2 = 0.3, ∞, d = 3.14: 2d ∫ |sin(0.3 + b)| db
    const p2 = [0.955336489125606, 0.29552020666133955];
    const exactC = 2 * 3.14 * midpoint((t) => Math.abs(Math.sin(0.3 + t)), -3.14, 3.14, 200000);
    expect(exactC).toBeCloseTo(25.114, 2);
    const c = evaluate(state({ bound: 3.14, p2 })).region;
    expect(c.sheets).toHaveLength(3);
    expect(Math.abs(c.totalArea / exactC - 1)).toBeLessThan(5e-3);
    // every sheet polygon is simple; only within 1e-4 of the fold circles (radius r1 + r2 = 2 and |r1 − r2| = 0) may
    // chords of the tangentially meeting image curves cross (D-DN-02)
    const nearFold = (x, y) => Math.abs(Math.hypot(x, y) - 2) < 1e-4 || Math.hypot(x, y) < 1e-4;
    for (const r of [a, b, c]) for (const s of r.sheets) expect(isSimple(s.world, nearFold)).toBe(true);
    expect(isSimple(a.sheets[0].world)).toBe(true); // no fold inside the default region: strictly simple
  });

  it('the mapped boundary has no gap larger than 0.01 plot units', () => {
    const cases = [state({ bound: 3.14, p2: [0.955336489125606, 0.29552020666133955] }), state({ p: 2 })];
    for (const s of cases) {
      const { boundary } = evaluate(s).region;
      for (let i = 0; i < boundary.length; i++) {
        const P = boundary[i], Q = boundary[(i + 1) % boundary.length]; // closing segment included
        expect(Math.hypot(P[0] - Q[0], P[1] - Q[1])).toBeLessThanOrEqual(0.01);
      }
    }
  });

  it('degenerate arms: r1 = 0 or r1 = 2 give zero area and a boundary on the circle of radius 2', () => {
    for (const r1 of [0, 2]) {
      const { region, locals } = evaluate(state({ r1 }));
      expect(locals.r2).toBe(2 - r1);
      expect(region.degenerate).toBe(true);
      expect(region.totalArea).toBeLessThanOrEqual(1e-12);
      for (const [x, y] of region.boundary) expect(Math.abs(Math.hypot(x, y) - 2)).toBeLessThanOrEqual(1e-12);
    }
  });
});

describe('distance-norms model: the arm (Prolog)', () => {
  it('theta from the dials: ArcTan of p1 and p2 (bit-exact), p2 = {0, 1} gives pi/2', () => {
    const l = evaluate(state()).locals;
    expect(l.Theta1).toBe(0);
    expect(l.Theta2).toBe(1.5707963267948966);
    expect(l.r2).toBe(1);
    expect(evaluate(state({ p1: [0.7071067811865476, 0.7071067811865476] })).locals.Theta1).toBe(0.7853981633974483);
  });

  it('arm data at the initial settings: red point at (1/4, 0), blue arc to pi/2, theta2 label at (1.3536, 0.3536), Robot Arm on link 2', () => {
    const { arm } = evaluate(INITIAL);
    expect(arm.arcs.theta1).toEqual({ kind: 'Point', at: [0.25, 0] }); // myArrowArc with equal angles 0, 0
    const blue = arm.arcs.theta2;
    expect(blue.kind).toBe('Arrow');
    expect(blue.control).toHaveLength(12);
    blue.control.forEach((q, k) => {
      const t = (k * Math.PI) / 2 / 11;
      close(q, [1 + Math.cos(t) / 3, Math.sin(t) / 3], 1e-15);
    });
    expect(arm.theta1Label.visible).toBe(false);
    expect(arm.theta2Label.visible).toBe(true);
    close(arm.theta2Label.at, [1.3535533905932737, 0.35355339059327373], 2e-16);
    expect(arm.robotArm.link).toBe(2);
    expect(arm.robotArm.anchor).toEqual([1.5, 0]);
    expect(arm.robotArm.angle).toBe(Math.PI / 2);
    expect(arm.robotArm.about).toEqual([1, 0]);
    expect(arm.link1.rect).toEqual([[-0.125, -0.125], [1.125, 0.125]]);
    expect(arm.link1.radius).toBe(0.125);
    close(arm.link1.to, [1, 0], 0);
    expect(arm.link2.rect).toEqual([[0.875, -0.125], [2.125, 0.125]]);
    close(arm.link2.to, [1, 1], 1e-15);
    expect(arm.base).toEqual([0, 0]);
    expect(arm.elbow).toEqual([1, 0]);
  });

  it('label switch: Robot Arm on link 1 when r2 < 1 (tolerant), else link 2', () => {
    const link = (r1) => evaluate(state({ r1 })).arm.robotArm.link;
    expect(link(1)).toBe(2);
    expect(link(1.01)).toBe(1); // r2 = 0.99 < 1
    expect(link(0.99)).toBe(2);
    expect(link(1 + 2 ** -51)).toBe(2); // r2 = 1 − 2⁻⁵¹ equals 1 within the tolerance 2⁻⁴⁶: not Less
  });

  it('the invisible locator pEnd does not change the picture', () => {
    const a = evaluate(INITIAL);
    const b = evaluate({ ...initialState(), pEnd: [0.5, 0.5] });
    expect(b).toEqual(a);
  });
});

// ---- v0.1.21 (owner decision D2): model.js returns the picture as shared/graphics.js data (picture). The drawing output
// of the page before that change is frozen in tests/unit/fixtures/distance-norms-drawing.pre-graphics.json (f04c973).
describe('distance-norms: Graphics data = the drawing before v0.1.21', () => {
  const fx = preGraphics('distance-norms');
  const replay = (steps) => {
    let s = initialState();
    for (const st of steps) s = { ...s, ...st }; // the hook setState (the body assigns no variable)
    return { s, r: evaluate(s) };
  };
  // PlotRangeClipping before: the Annotation carried a clip-path attribute (its clipPath made by an `after` hook); now
  // Annotation[Clip[list, PlotRange, id], id] draws the same element
  const unclip = (g) => g.map((x) => (x.head === 'Annotation' && x.g.head === 'Clip'
    ? { ...x, g: x.g.g, attrs: { ...x.attrs, 'clip-path': `url(#${x.g.id})` } } : x));
  it.each(fx.states.map((s) => [s.name, s]))('%s: the same Graphics data, number for number', (name, s) => {
    const { s: state, r } = replay(s.steps);
    expect(graphicsJSON(state)).toEqual(s.state);
    const g = picture(r);
    expect(g.filter((x) => x.g.head === 'Clip').map((x) => [x.id, x.g.id, x.g.range])).toEqual([
      ['region', 'distance-norms-plot-range', PLOT_RANGE], ['region-outline', 'distance-norms-plot-range', PLOT_RANGE]]);
    const { replaced } = sameDrawing(unclip(g), s.graphics[0], name);
    // the Raw parts before: the θ labels (<tspan>s with an 8.5 px index 4 px down), now Text[Style[Subscript[…], …]]
    const labels = [r.arm.theta1Label.visible && 'theta1-label', r.arm.theta2Label.visible && 'theta2-label'].filter(Boolean);
    expect(replaced.map((x) => x[1].id)).toEqual(labels);
    for (const x of replaced) {
      expect(x[0]).toEqual(x[1].id === 'theta1-label' ? Red : Blue);
      expect(x[1].g.pos).toEqual(r.arm[x[1].id === 'theta1-label' ? 'theta1Label' : 'theta2Label'].at);
    }
  });
});
