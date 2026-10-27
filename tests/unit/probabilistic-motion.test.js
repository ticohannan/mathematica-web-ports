// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Renuka Pakeetharan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/probabilistic-motion.test.js — the model of "Probabilistic Models for Robot Motion": the opening state from
// the notebook, the Initialization definitions (triangular density, nominal motion, the velocity and odometry densities
// and samplers), the exclusion curves of the OdometryPDF picture, the picture of each mode and the notebook's five
// snapshot settings. Expected values derived by hand (formulas in the comments) or from the motion they describe.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, evaluate, SPECS, SAVED, MODES, IMAGE_SIZE, DrawRobot, signedAngleDist, probTriangularDistribution,
  MyTriangularDistribution, probNormalDistribution, nominalMotionModel, motionModelVelocityNoAng,
  sampleMotionModelVelocityNsamples, MotionModelOdometryNoAng, sampleMotionModelOdometryNsamples, odometryExclusions,
  exclusionGaps,
} from '../../demos/probabilistic-motion/model.js';
import { annotation, Cases } from '../../shared/graphics.js';
import { createRng } from '../../shared/random.js';

const saved = JSON.parse(readFileSync(new URL('../golden/probabilistic-motion.original-states.json', import.meta.url), 'utf8'));
const close = (a, b, d = 12) => { expect(a.length).toBe(b.length); a.forEach((x, i) => (Array.isArray(x) ? close(x, b[i], d) : expect(x).toBeCloseTo(b[i], d))); };
const args = (s) => [s.α1, s.α2, s.α3, s.α4, s.α5, s.α6];
const rng = () => createRng({ seed: 1 });
// the spread of points along the unit direction u and across it (standard deviations)
const spread = (pts, ang) => {
  const u = [Math.cos(ang), Math.sin(ang)], m = [0, 1].map((k) => pts.reduce((a, p) => a + p[k], 0) / pts.length);
  const sd = (f) => Math.sqrt(pts.reduce((a, p) => a + f(p[0] - m[0], p[1] - m[1]) ** 2, 0) / pts.length);
  return { along: sd((dx, dy) => dx * u[0] + dy * u[1]), across: sd((dx, dy) => -dx * u[1] + dy * u[0]) };
};

describe('probabilistic-motion model', () => {
  it("the opening state is the notebook's saved state; Initial settings are the Manipulate's own initial values (the same)", () => {
    expect(initialState()).toEqual(saved.states[0]);
    expect(initialState()).toEqual(saved.specs);
    expect(SAVED).toEqual(SPECS);
    const s = initialState(); s.v = 99;
    expect(SPECS.v).toBe(2); // a copy each time
    expect(MODES).toEqual(['VelocityPDF', 'VelocitySample', 'OdometryPDF', 'OdometrySample']);
  });
  it('DrawRobot: a circle of radius diam/2 and a heading line of length diam/1.5', () => {
    const [c, l] = DrawRobot(1, 2, Math.PI / 2, 1);
    expect(c.c).toEqual([1, 2]);
    expect(c.r).toBe(0.5);
    close(l.pts, [[1, 2], [1, 2 + 1 / 1.5]], 14);
  });
  it('signedAngleDist: θ1 − θ2 wrapped to (−π, π]', () => {
    expect(signedAngleDist(0.5, 0.2)).toBeCloseTo(0.3, 14);
    expect(signedAngleDist(3, -3)).toBeCloseTo(6 - 2 * Math.PI, 14);
    expect(signedAngleDist(-3, 3)).toBeCloseTo(2 * Math.PI - 6, 14);
    expect(signedAngleDist(Math.PI / 2, -Math.PI / 2)).toBeCloseTo(Math.PI, 14);
  });
  it('probTriangularDistribution: peak 1/√(6 b²), support ±√(6 b²), unit area; no variance: 1 at a == 0, else 0', () => {
    expect(probTriangularDistribution(0, 1 / 6)).toBeCloseTo(1, 14); // 1/√1
    expect(probTriangularDistribution(0.5, 1 / 6)).toBeCloseTo(0.5, 14); // 1 − 0.5/1
    expect(probTriangularDistribution(-0.5, 1 / 6)).toBeCloseTo(0.5, 14);
    expect(probTriangularDistribution(1.2, 1 / 6)).toBe(0);
    let area = 0;
    for (let a = -2; a < 2; a += 1e-4) area += probTriangularDistribution(a + 5e-5, 0.1) * 1e-4;
    expect(area).toBeCloseTo(1, 6);
    expect(probTriangularDistribution(0, 0)).toBe(1);
    expect(probTriangularDistribution(0.1, 0)).toBe(0);
  });
  it('MyTriangularDistribution: triangular for a positive range; a zero range is uniform on {0, 0} (only 0)', () => {
    expect(MyTriangularDistribution([-0.3, 0.3])).toMatchObject({ dist: 'Triangular', a: -0.3, b: 0.3, c: 0 });
    expect(MyTriangularDistribution([-0, 0])).toMatchObject({ dist: 'Uniform' });
  });
  it('probNormalDistribution: the normal density of variance b²', () => {
    expect(probNormalDistribution(0, 1)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 14);
    expect(probNormalDistribution(2, 4)).toBeCloseTo(Math.exp(-0.5) / Math.sqrt(8 * Math.PI), 14);
  });
  it('nominalMotionModel: an arc of radius v/ω about the centre of rotation, or straight on when ω == 0', () => {
    close(nominalMotionModel(2, Math.PI / 2, 0, 0, 0, 1), [4 / Math.PI, 4 / Math.PI, Math.PI / 2], 14); // a quarter circle of radius 4/π
    // heading north from {1, 2}, turning right (ω = −1, radius 1): about the centre {2, 2} by 1 rad clockwise
    close(nominalMotionModel(1, -1, 1, 2, Math.PI / 2, 1), [2 - Math.cos(1), 2 + Math.sin(1), Math.PI / 2 - 1], 14);
    close(nominalMotionModel(2, 0, 0, 0, Math.PI / 6, 1), [Math.sqrt(3), 1, Math.PI / 6], 14);
    close(nominalMotionModel(2, 0.0, 1, 1, 0, 0.5), [2, 1, 0], 14); // ΔT = 0.5: one unit
  });
  it('motionModelVelocityNoAng: 1/(6 b²) at the nominal end; on the nominal circle the commands that reach the point; 0 far away', () => {
    const s = initialState(), b2 = 0.02 * 4 + 0.02 * 1.57 ** 2; // α1 v² + α2 ω² = α3 v² + α4 ω² = 0.129298
    const [xp, yp] = nominalMotionModel(s.v, s.ω, 0, 0, s.θ, 1);
    expect(motionModelVelocityNoAng([xp, yp], [s.v, s.ω], [0, 0, s.θ], 1, ...args(s))).toBeCloseTo(1 / (6 * b2), 10); // 1.28903
    // the point 1 rad along the nominal circle (radius R = v/ω): reached with ωh = 1, vh = R
    const R = s.v / s.ω, p = [R * Math.sin(1), R - R * Math.cos(1)];
    const tri = (a) => Math.max(0, 1 / Math.sqrt(6 * b2) - Math.abs(a) / (6 * b2));
    expect(motionModelVelocityNoAng(p, [s.v, s.ω], [0, 0, s.θ], 1, ...args(s))).toBeCloseTo(tri(s.v - R) * tri(s.ω - 1), 10); // 0.0799
    expect(motionModelVelocityNoAng([-2, -2], [s.v, s.ω], [0, 0, s.θ], 1, ...args(s))).toBe(0);
    // straight ahead (within 0.01 of the heading line): vh = the distance, ωh = 0 — v = 1, ω = 0: 1/(6·0.02)²·… = 1/0.12
    expect(motionModelVelocityNoAng([1, 0], [1, 0], [0, 0, 0], 1, 0.02, 0.02, 0.02, 0.02, 0, 0)).toBeCloseTo(1 / 0.12, 10);
    expect(motionModelVelocityNoAng([-1, 0.005], [-1, 0], [0, 0, 0], 1, 0.02, 0.02, 0.02, 0.02, 0, 0)).toBeGreaterThan(8.3); // backwards
    // the same density whatever α5, α6 (no final rotation in this model, Q-PM-02)
    expect(motionModelVelocityNoAng(p, [s.v, s.ω], [0, 0, s.θ], 1, 0.02, 0.02, 0.02, 0.02, 0.5, 0.5))
      .toBe(motionModelVelocityNoAng(p, [s.v, s.ω], [0, 0, s.θ], 1, ...args(s)));
  });
  it('sampleMotionModelVelocityNsamples: seeded and repeatable; no noise: every sample at the nominal pose; v-noise within ±b (E-PM-01)', () => {
    const s = initialState();
    const a = sampleMotionModelVelocityNsamples([s.v, s.ω], [0, 0, s.θ], 1, ...args(s), 500, rng());
    expect(a.length).toBe(500);
    expect(sampleMotionModelVelocityNsamples([s.v, s.ω], [0, 0, s.θ], 1, ...args(s), 500, rng())).toEqual(a);
    const nominal = nominalMotionModel(s.v, s.ω, 0, 0, s.θ, 1);
    for (const p of sampleMotionModelVelocityNsamples([s.v, s.ω], [0, 0, s.θ], 1, 0, 0, 0, 0, 0, 0, 20, rng())) expect(p).toEqual(nominal);
    // only v noisy (α3 = … = α6 = 0): each sample is the nominal end scaled by vh/v (from the start at the origin)
    const b = Math.sqrt(0.05 * s.v ** 2), only = sampleMotionModelVelocityNsamples([s.v, s.ω], [0, 0, s.θ], 1, 0.05, 0, 0, 0, 0, 0, 500, rng());
    const vh = only.map((p) => (s.v * Math.hypot(p[0], p[1])) / Math.hypot(nominal[0], nominal[1]));
    expect(Math.max(...vh.map((x) => Math.abs(x - s.v)))).toBeLessThanOrEqual(b); // TriangularDistribution[{−b, b}]
    expect(Math.max(...vh.map((x) => Math.abs(x - s.v)))).toBeGreaterThan(0.8 * b);
    expect(vh.reduce((t, x) => t + x, 0) / 500).toBeCloseTo(s.v, 1);
    only.forEach((p) => expect(p[2]).toBe(nominal[2]));
  });
  it('MotionModelOdometryNoAng: 1/√(6 b1²)·1/√(6 b2²) at the nominal end (δhatrot1 = δrot1, δhattrans = δtrans); 0 behind the start', () => {
    const s = initialState();
    const [xp, yp] = nominalMotionModel(s.v, s.ω, 0, 0, s.θ, 1);
    const r1 = s.ω / 2, t = 2 * (s.v / s.ω) * Math.sin(s.ω / 2); // the chord: direction θ + ω/2, length 2 (v/ω) sin(ω/2) = 1.80083
    const b1 = 0.02 * r1 ** 2 + 0.02 * t ** 2, b2 = 0.02 * t ** 2 + 0.02 * r1 ** 2;
    expect(MotionModelOdometryNoAng([xp, yp], [s.v, s.ω], [0, 0, s.θ], 1, 0.02, 0.02, 0.02, 0.02))
      .toBeCloseTo(1 / Math.sqrt(6 * b1) / Math.sqrt(6 * b2), 10); // 2.1593
    // on the nominal ray at distance d: p1 at its peak, p2 = the triangular density of δtrans − d
    const d = 1.5, q = [d * Math.cos(r1), d * Math.sin(r1)], c1 = 0.02 * r1 ** 2 + 0.02 * d ** 2, c2 = 0.02 * d ** 2 + 0.02 * r1 ** 2;
    expect(MotionModelOdometryNoAng(q, [s.v, s.ω], [0, 0, s.θ], 1, 0.02, 0.02, 0.02, 0.02))
      .toBeCloseTo((1 / Math.sqrt(6 * c1)) * Math.max(0, 1 / Math.sqrt(6 * c2) - (t - d) / (6 * c2)), 10);
    expect(MotionModelOdometryNoAng([-1, -1], [s.v, s.ω], [0, 0, s.θ], 1, 0.02, 0.02, 0.02, 0.02)).toBe(0);
  });
  it('sampleMotionModelOdometryNsamples: seeded and repeatable; no noise: every sample at the nominal pose (rotation, translation, rotation)', () => {
    const s = saved.snapshots['5'];
    const a = sampleMotionModelOdometryNsamples([s.v, s.ω], [0, 0, s.θ], 1, s.α1, s.α2, s.α3, s.α4, 500, rng());
    expect(sampleMotionModelOdometryNsamples([s.v, s.ω], [0, 0, s.θ], 1, s.α1, s.α2, s.α3, s.α4, 500, rng())).toEqual(a);
    const nominal = nominalMotionModel(s.v, s.ω, 0, 0, s.θ, 1);
    for (const p of sampleMotionModelOdometryNsamples([s.v, s.ω], [0, 0, s.θ], 1, 0, 0, 0, 0, 10, rng())) close(p, nominal, 12);
    // α1 = 0: the rotations' noise is α2 δtrans² only; the mean of the samples is near the nominal end
    const m = [0, 1].map((k) => a.reduce((t, p) => t + p[k], 0) / a.length);
    expect(Math.hypot(m[0] - nominal[0], m[1] - nominal[1])).toBeLessThan(0.05);
  });
  it('odometryExclusions: the cuts and kinks of the snapshot-5 settings (rays at π, θ + π, θ + δrot1 ± π, circle of radius δtrans)', () => {
    const s = saved.snapshots['5'];
    const ex = odometryExclusions([s.v, s.ω], [0, 0, s.θ], 1, s.α1, s.α2, s.α3, s.α4);
    // δrot1 = ω/2 = 1 (the chord of the arc), δtrans = 2 (v/ω) sin(ω/2) = 1.99 sin 1
    close(ex.rays, [Math.PI, s.θ + Math.PI, s.θ + 1 + Math.PI, s.θ + 1], 12);
    expect(ex.radius).toBeCloseTo(1.99 * Math.sin(1), 12); // 1.67453
    const [g1, g2] = ex.supports;
    // inside both supports at the nominal end, outside far away; p1's support at distance r: |a| < √(6·0.0214) r
    const [xp, yp] = nominalMotionModel(s.v, s.ω, 0, 0, s.θ, 1);
    expect(g1(xp, yp)).toBeLessThan(0); expect(g2(xp, yp)).toBeLessThan(0);
    expect(g1(-2, -2)).toBeGreaterThan(0); expect(g2(0.05, 0)).toBeGreaterThan(0);
    const r = 2, edge = s.θ + 1 + Math.sqrt(6 * 0.0214) * r; // a point on p1's support boundary
    expect(g1(r * Math.cos(edge), r * Math.sin(edge))).toBeCloseTo(0, 10);
    // both α of a factor 0: its If is decided (no Max), no support curve
    expect(odometryExclusions([s.v, s.ω], [0, 0, s.θ], 1, 0, 0, s.α3, s.α4).supports[0]).toBe(null);
    const gaps = exclusionGaps(ex, [[-3, 3], [-3, 3]]);
    expect(Cases(annotation(gaps, 'gap-cuts').g, 'Line').length).toBe(4);
    expect(annotation(gaps, 'gap-circle').g.r).toBeCloseTo(1.67453, 5);
    expect(Cases(annotation(gaps, 'gap-support-1').g, 'Line').length).toBe(1);
  });
  it('the picture of each mode: density or samples, the robots, the velocity path or the odometry path', () => {
    for (const mode of MODES) {
      const { view, graphics } = evaluate({ ...initialState(), mode });
      expect(graphics.options.ImageSize).toEqual(IMAGE_SIZE);
      expect(graphics.options.PlotRange).toEqual([[-3, 3], [-3, 3]]);
      const pdf = mode.endsWith('PDF'), velocity = mode.startsWith('Velocity');
      expect(!!annotation(graphics, 'density-raster')).toBe(pdf);
      expect(!!annotation(graphics, 'samples')).toBe(!pdf);
      expect(!!annotation(graphics, 'velocity-path')).toBe(velocity);
      expect(!!annotation(graphics, 'odometry-path')).toBe(!velocity);
      expect(!!annotation(graphics, 'gap-cuts')).toBe(mode === 'OdometryPDF');
      expect(graphics.options.Frame).toEqual(pdf ? true : [true, true, false, false]);
      const start = annotation(graphics, 'robot-start'), end = annotation(graphics, 'robot-end');
      expect(Cases(start.g, 'Circle')[0].c).toEqual([0, 0]);
      close(Cases(end.g, 'Circle')[0].c, view.nominal.slice(0, 2), 14);
      if (!pdf) expect(Cases(annotation(graphics, 'samples').g, 'Circle').length).toBe(500);
      // Plot[Null, …] draws no curve: the lines are the 500 samples', the two robots' and the path's
      if (!pdf) expect(Cases(graphics, 'Line').length).toBe(500 + 2 + 1);
    }
    // velocity: start, centre of rotation {0, v/ω}, end; the swept arcs of radius r ± 1/2 from −π/2 to −π/2 + ω
    const g = evaluate(initialState()).graphics, path = annotation(g, 'velocity-path').g;
    const R = 2 / 1.57;
    close(Cases(path, 'Line')[0].pts[1], [0, R], 14);
    close(Cases(path, 'Point')[0].pts[0], [0, R], 14);
    const arcs = Cases(path, 'Circle');
    close(arcs.map((c) => c.r), [R + 0.5, R - 0.5], 14);
    close(arcs[0].angles, [-Math.PI / 2, -Math.PI / 2 + 1.57], 14);
  });
  it('the odometry path: the line to 0.7 beyond the end, the arcs of the two rotations (green at the start, red at the end)', () => {
    const s = { ...initialState(), mode: 'OdometryPDF' }, { graphics, view } = evaluate(s);
    const path = annotation(graphics, 'odometry-path').g, [xp, yp] = view.nominal, α = Math.atan2(yp, xp); // 0.785
    close(Cases(path, 'Line')[0].pts[1], [xp + 0.7 * Math.cos(α), yp + 0.7 * Math.sin(α)], 14);
    const [green, red] = Cases(path, 'Circle');
    close(green.angles, [0, α], 14); expect(green.r).toBeCloseTo(0.6, 14);
    close(red.angles, [α, 1.57], 14); close(red.c, [xp, yp], 14);
    // turning right (ω < 0) from heading 3: the angles run downwards (α − 2π when α > θ is not needed here)
    const right = evaluate({ ...s, θ: 3, ω: -1.5 });
    const [g2, r2] = Cases(annotation(right.graphics, 'odometry-path').g, 'Circle');
    expect(g2.angles[1]).toBeLessThan(g2.angles[0]);
    expect(r2.angles[1]).toBeLessThan(r2.angles[0]);
  });
  it('SeedRandom[1] at every evaluation: the same samples for the same settings; a noise slider rescales the same draws', () => {
    const s = { ...initialState(), mode: 'VelocitySample' };
    expect(evaluate(s).view.samples).toEqual(evaluate(s).view.samples);
    const a = Cases(annotation(evaluate(s).graphics, 'samples').g, 'Circle').map((c) => c.c);
    const b = Cases(annotation(evaluate({ ...s, α1: 0.021 }).graphics, 'samples').g, 'Circle').map((c) => c.c);
    const shift = a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1]));
    expect(Math.max(...shift)).toBeLessThan(0.02); // a small change moves every sample a little
    expect(Math.max(...shift)).toBeGreaterThan(0);
  });
  it("the notebook's five snapshot settings evaluate to the snapshot pictures' poses, clouds and densities", () => {
    const v = Object.fromEntries(Object.entries(saved.snapshots).map(([k, s]) => [k, evaluate(s)]));
    // 1: the red robot at {1.27, 1.27}, the centre of rotation {0, 1.27}; the density saturates there (> 1)
    close(v['1'].view.nominal, [1.27388, 1.27287, 1.57], 4);
    const s1 = saved.snapshots['1'];
    expect(motionModelVelocityNoAng(v['1'].view.nominal, [s1.v, s1.ω], [0, 0, 0], 1, ...args(s1))).toBeGreaterThan(1);
    // 2–5: θ = 0.1508, v = 1.99, ω = 2: the red robot at {0.68, 1.53} heading 2.15; centre of rotation {−0.15, 0.98}
    for (const k of ['2', '3', '4', '5']) close(v[k].view.nominal, [0.682806, 1.528992, 2.150796], 5);
    close(Cases(annotation(v['2'].graphics, 'velocity-path').g, 'Point')[0].pts[0], [-0.995 * Math.sin(0.150796), 0.995 * Math.cos(0.150796)], 5);
    // the clouds: 500 samples around the end; 2 (α1 = 0.0726) stretched along the chord (direction θ + ω/2 = 1.15),
    // 4 (α1 = 0, α3 = 0.0828) across it, as the snapshots show (a slanted cloud, a flat one)
    const pts = (k) => Cases(annotation(v[k].graphics, 'samples').g, 'Circle').map((c) => c.c);
    for (const k of ['2', '3', '4']) {
      expect(v[k].view.samples.count).toBe(500);
      expect(Math.hypot(v[k].view.samples.mean[0] - 0.6828, v[k].view.samples.mean[1] - 1.529)).toBeLessThan(0.06);
    }
    const s2 = spread(pts('2'), 1.1508), s4 = spread(pts('4'), 1.1508);
    expect(s2.along).toBeGreaterThan(1.5 * s2.across);
    expect(s4.across).toBeGreaterThan(1.5 * s4.along);
    // 5: the gaps of the OdometryPDF picture; the density at the end 1/√(6·0.0214 δtrans²)·1/√(6(0.0828 δtrans² + 0.064)) = 1.25
    expect(v['5'].view.exclusions).toMatchObject({ supports: [true, true] });
    expect(v['5'].view.exclusions.radius).toBeCloseTo(1.67453, 5);
    const s5 = saved.snapshots['5'], t2 = (1.99 * Math.sin(1)) ** 2;
    expect(MotionModelOdometryNoAng(v['5'].view.nominal, [s5.v, s5.ω], [0, 0, s5.θ], 1, s5.α1, s5.α2, s5.α3, s5.α4))
      .toBeCloseTo(1 / Math.sqrt(6 * 0.0214 * t2) / Math.sqrt(6 * (0.0828 * t2 + 0.064)), 8);
  });
  it('ω == 0: no path circle in the velocity modes; v == 0 and undefined samples draw no errors', () => {
    const g = evaluate({ ...initialState(), ω: 0 }).graphics;
    expect(annotation(g, 'velocity-path')).toBe(null);
    close(annotation(g, 'robot-end').g[2][1].pts[1], [2 + 1 / 1.5, 0], 14); // straight on: the end at {2, 0}, heading 0
    // ω = 0 and no ω noise: vh/ωh is not a number, those samples are left out (D-PM-04)
    const none = evaluate({ ...initialState(), mode: 'VelocitySample', ω: 0, α3: 0, α4: 0 });
    expect(Cases(annotation(none.graphics, 'samples').g, 'Circle').length).toBe(0);
    for (const mode of MODES) expect(() => evaluate({ ...initialState(), mode, v: 0 })).not.toThrow();
  });
});
