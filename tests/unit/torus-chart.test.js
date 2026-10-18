// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/torus-chart.test.js — the pure parts of "Chart for a Torus" (demos/torus-chart/model.js, surface.js) and the
// drawing data of demos/common/dial-control.js this app relies on. Expected values: TESTPLAN rows T-TC-01 … T-TC-17,
// hand-derived closed forms (λ = 0, 1, 2), an independent Python/mpmath evaluation of TorusToPlane, and the source text.
import { describe, it, expect } from 'vitest';
import {
  TorusToPlane, angleOf, plotLabel, evaluate, initialState, initialSettings, FACE_FRONT, FACE_BACK, OPACITY, BALL_RADIUS,
} from '../../demos/torus-chart/model.js';
import { sampleManifold, frontNormal } from '../../demos/torus-chart/surface.js';
import { dialGraphics, makeHand, dialPointer } from '../../demos/common/dial-control.js';
import { normalizeCR } from '../../shared/mma-extra.js';

const PI = Math.PI, TWO_PI = 2 * Math.PI;
const close = (a, b, tol, what = '') => expect(Math.abs(a - b), `${what} ${a} vs ${b}`).toBeLessThanOrEqual(tol);
const closeV = (a, b, tol, what = '') => b.forEach((v, i) => close(a[i], v, tol, `${what}[${i}]`));
// a fixed pseudo-random list of (u, v) in [0, 2π]² (no Math.random: reproducible)
const UV = Array.from({ length: 20 }, (_, k) => [((k * 0.6180339887) % 1) * TWO_PI, ((k * 0.4142135623 + 0.1) % 1) * TWO_PI]);
const unit = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };

describe('torus-chart model', () => {
  it('TorusToPlane at lambda 0 is the torus: (0, 0) gives (2π, π, 0) and (π, π) gives (2π/3, π, 0)', () => {
    closeV(TorusToPlane(0, 0, 0), [6.283185307179586, 3.141592653589793, 0], 1e-15);
    closeV(TorusToPlane(0, PI, PI), [2.0943951023931953, 3.141592653589793, 1.2e-16], 1e-15);
    expect(Object.is(TorusToPlane(0, 0, 0)[2], -0)).toBe(false);
  });
  it('TorusToPlane at lambda 1 is the cylinder (π (1 + cos u), π (1 + sin u), π - v)', () => {
    for (const [u, v] of UV) closeV(TorusToPlane(1, u, v), [PI * (1 + Math.cos(u)), PI * (1 + Math.sin(u)), PI - v], 1e-14, `(${u}, ${v})`);
  });
  it('TorusToPlane at lambda 2 is the square (v, 2π - u, 0)', () => {
    for (const [u, v] of UV) {
      const p = TorusToPlane(2, u, v);
      closeV(p, [v, TWO_PI - u, 0], 1e-15, `(${u}, ${v})`);
      expect(Object.is(p[2], -0), 'no negative zero').toBe(false);
    }
  });
  it('the two branches of TorusToPlane agree at lambda = 1', () => {
    // the second branch written out independently at λ = 1: {0·v + 1·(π + π cos u), 0·(2π − u) + 1·(π + π sin u), −(v − π)}
    for (const [u, v] of UV) {
      const second = [PI + Math.cos(u) * PI, PI + Math.sin(u) * PI, -1 * (v - PI)];
      closeV(TorusToPlane(1, u, v), second, 1e-14);
      closeV(TorusToPlane(1 + 1e-15, u, v), second, 1e-14); // within the tolerant λ <= 1
      closeV(TorusToPlane(1.000001, u, v), second, 1e-5); // the second branch: continuous
    }
  });
  it('PlotLabel: 2-Torus below 1/2, Cylinder below 1.2, Plane from 1.2 (strict tolerant Less)', () => {
    const cases = [[0, '2-Torus'], [0.13, '2-Torus'], [0.49, '2-Torus'], [0.5, 'Cylinder'], [0.49999999999999994, 'Cylinder'],
      [0.56, 'Cylinder'], [1.19, 'Cylinder'], [1.1999999999999997, 'Plane'], [1.2, 'Plane'], [1.45, 'Plane'], [2, 'Plane']];
    for (const [λ, s] of cases) expect(plotLabel(λ), String(λ)).toBe(s);
  });
  it('theta from the dial: ArcTan[x, y] plus 2π when negative, in [0, 2π]', () => {
    expect(angleOf([1, 0])).toBe(0);
    expect(angleOf([0, 1])).toBe(PI / 2);
    expect(angleOf([-1, 0])).toBe(PI);
    expect(angleOf([-1, -0])).toBe(PI); // no signed zero
    close(angleOf([0, -1]), 4.71238898038469, 1e-14);
    close(angleOf([0.5472493629827029, -0.8369696139735457]), 5.29146324975242, 1e-14);
    expect(angleOf([1, -1e-17])).toBe(6.283185307179586); // 2π: the range is [0, 2π]
  });
  it('Normalize puts the dial point on the unit circle, the zero vector stays zero', () => {
    expect(dialPointer([3, 4], { clamp: false })).toEqual([0.6000000000000001, 0.8]); // 3·(1/5), 4·(1/5)
    expect(normalizeCR([3, 4])).toEqual([3 * (1 / 5), 4 * (1 / 5)]);
    const q = dialPointer([-0.2, 0.1]);
    close(Math.hypot(...q), 1, 2.3e-16);
    close(Math.atan2(q[1], q[0]), Math.atan2(0.1, -0.2), 1e-15);
    expect(dialPointer([0, 0])).toEqual([0, 0]);
  });
});

describe('torus-chart dial drawing (demos/common/dial-control.js, arc arrowArcCircle)', () => {
  it('dial graphic: 17 major ticks from 0.94 to 1, 16 minor ticks from 0.98 to 1, 8 labels at radius 0.7', () => {
    const g = dialGraphics([1, 0], { arc: 'arrowArcCircle' });
    expect(g.majorTicks).toHaveLength(17);
    g.majorTicks.forEach(([a, b], k) => {
      const t = (k * PI) / 8;
      closeV(a, [0.94 * Math.cos(t), 0.94 * Math.sin(t)], 1e-15);
      closeV(b, [Math.cos(t), Math.sin(t)], 1e-15);
    });
    expect(g.minorTicks).toHaveLength(16);
    g.minorTicks.forEach(([a, b], k) => {
      const t = PI / 16 + (k * PI) / 8;
      closeV(a, [0.98 * Math.cos(t), 0.98 * Math.sin(t)], 1e-15);
      closeV(b, [Math.cos(t), Math.sin(t)], 1e-15);
    });
    expect(g.labels.map((l) => l.num / l.den)).toEqual([-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]);
    for (const l of g.labels) closeV(l.at, [0.7 * Math.cos((PI * l.num) / l.den), 0.7 * Math.sin((PI * l.num) / l.den)], 1e-15);
  });
  it('makeHand[7, 7/3, .1, .3] is the polygon (-7/30, -0.03), (-7/30, 0.03), (0.7, 0.01), (0.78, 0), (0.7, -0.01)', () => {
    const h = makeHand(7, 7 / 3, 0.1, 0.3);
    const want = [[-0.23333333333333334, -0.03], [-0.23333333333333334, 0.03], [0.7, 0.01], [0.78, 0], [0.7, -0.01]];
    h.forEach((p, i) => closeV(p, want[i], 1e-16));
  });
  it('the dial arc goes from 0 to ArcTan in (-π, π] and its arrowhead points counterclockwise (original quirk)', () => {
    const g = dialGraphics([Math.cos(-1), Math.sin(-1)], { arc: 'arrowArcCircle' });
    close(g.ang, -1, 1e-15);
    expect(g.arc.circle.start).toBe(0);
    close(g.arc.circle.end, -1, 1e-15); // clockwise from 0 (no +2π: Q-TC-01)
    closeV(g.arc.tip, [0.3 * Math.cos(1), -0.3 * Math.sin(1)], 1e-15);
    closeV(g.arc.direction, [0.8414709848078965, 0.5403023058681398], 1e-15); // (−sin(−1), cos(−1)): counterclockwise
    const g2 = dialGraphics([Math.cos(2), Math.sin(2)], { arc: 'arrowArcCircle' });
    close(g2.arc.circle.end, 2, 1e-15);
    closeV(g2.arc.direction, [-0.9092974268256817, -0.4161468365471424], 1e-15);
  });
});

describe('torus-chart body and surface', () => {
  it('the green ball sits at TorusToPlane of the dial angles, radius 0.2', () => {
    const r = evaluate({ λ: 0, p1: [1, 0], p2: [1, 0] });
    closeV(r.config.center, [TWO_PI, PI, 0], 1e-15);
    expect(r.config.radius).toBe(0.2);
    expect(BALL_RADIUS).toBe(0.2);
    expect(r.label).toBe('2-Torus');
  });
  it('surface sampling: fixed grid over [0, 2π]², boundary curves u = 0, u = 2π, v = 0, v = 2π', () => {
    const s = sampleManifold(0.56, 72);
    expect(s.positions.length / 3).toBe(73 * 73);
    expect(s.triangles.length / 3).toBe(2 * 72 * 72);
    for (const k of ['u0', 'u2pi', 'v0', 'v2pi']) expect(s.boundary[k], k).toHaveLength(73);
    s.boundary.u0.forEach((p, j) => closeV(s.boundary.u2pi[j], p, 1e-14, `seam ${j}`)); // the seam
    closeV(s.boundary.v0[0], TorusToPlane(0.56, 0, 0), 0);
    closeV(s.boundary.v2pi[72], TorusToPlane(0.56, TWO_PI, TWO_PI), 0);
    // the corners of the grid are the parameter corners exactly
    closeV(Array.from(s.positions.subarray(0, 3)), TorusToPlane(0.56, 0, 0), 0);
  });
  it('front faces of the manifold are the side of du x dv: outside of the torus top at lambda 0.13, inside of the funnel at lambda 0.56, top of the square at lambda 2', () => {
    closeV(unit(frontNormal(0.13, 0, PI / 2)), unit([-0.29, 0, 2.032]), 2e-3);
    closeV(unit(frontNormal(0.56, 0, PI / 4)), unit([-0.75, 0, 0.98]), 1e-2);
    closeV(unit(frontNormal(2, 1, 1)), [0, 0, 1], 1e-15);
    // the triangles: counterclockwise (b − a) × (c − a) points to the same side as the analytic normal
    const s = sampleManifold(0.56, 72);
    const P = (k) => Array.from(s.positions.subarray(3 * k, 3 * k + 3));
    for (const t of [100, 2000, 5000]) {
      const [a, b, c] = [0, 1, 2].map((i) => P(s.triangles[3 * t + i]));
      const e1 = b.map((x, i) => x - a[i]), e2 = c.map((x, i) => x - a[i]);
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const m = Array.from(s.normals.subarray(3 * s.triangles[3 * t], 3 * s.triangles[3 * t] + 3));
      expect(n[0] * m[0] + n[1] * m[1] + n[2] * m[2], `triangle ${t}`).toBeGreaterThan(0);
    }
  });
  it('mesh lines are contours of z, none on the flat square at lambda 2', () => {
    const s = sampleManifold(0.56, 72);
    expect(s.mesh).toHaveLength(15); // z decreases in v: one contour per level
    for (const line of s.mesh) {
      expect(line.points).toHaveLength(73);
      for (const p of line.points) expect(p[2]).toBe(line.points[0][2]);
      close(line.points[0][2], line.level, 1e-12);
    }
    const [z0, z1] = s.zRange;
    s.mesh.forEach((l, k) => close(l.level, z0 + ((k + 1) * (z1 - z0)) / 16, 1e-12));
    expect(sampleManifold(2, 72).mesh).toEqual([]);
    expect(sampleManifold(0.13, 72).mesh.length).toBeGreaterThan(15); // z(v) not monotonic: two arcs for most levels
  });
  it('the face colours are RGBColor[0.34398, 0.49112, 0.89936] in front and RGBColor[0.97, 0.606, 0.081] behind, opacity 0.8, as in the source', () => {
    expect(FACE_FRONT).toEqual([0.34398, 0.49112, 0.89936]);
    expect(FACE_BACK).toEqual([0.97, 0.606, 0.081]);
    expect(OPACITY).toBe(0.8);
  });
  it('initial state is the saved state (lambda 2., p1 and p2 of the notebook)', () => {
    expect(initialState()).toEqual({ λ: 2, p1: [0.5472493629827029, -0.8369696139735457], p2: [0.5754934061746134, 0.8178064193007667] });
  });
  it("Initial settings are the code's initial values (lambda 0, p1 = p2 = {1, 0})", () => {
    expect(initialSettings()).toEqual({ λ: 0, p1: [1, 0], p2: [1, 0] });
  });
});
