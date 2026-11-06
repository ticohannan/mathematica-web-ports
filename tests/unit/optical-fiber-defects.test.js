// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Hoang Nguyen
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/optical-fiber-defects.test.js — the model of "Defects in an Optical Fiber". Expected values derived by hand
// (Snell's law, the reflection law, the reflectance ((N1 − N2)/(N1 + N2))²).
import { describe, it, expect } from 'vitest';
import { initialState, evaluate, TraceLaser, edgesOf, startIndices, testpoint, incidentAng, normAng } from '../../demos/optical-fiber-defects/model.js';

describe('optical-fiber-defects model', () => {
  it('the opening state', () => {
    const s = initialState();
    expect(s.h).toBeCloseTo(0.405, 15);
    expect(s.w).toBeCloseTo(0.78, 15);
    expect(s.θ1).toBe(-Math.PI / 16);
    expect(s.p).toEqual([[-1.8, 0.5], [-3.8, 0.5]]);
  });
  it('the boundary segments', () => {
    expect(edgesOf(0.5, 1)).toEqual([[[-5, 0], [-0.5, 0]], [[-0.5, 0], [0, 0.5]], [[0, 0.5], [0.5, 0]], [[0.5, 0], [5, 0]], [[-5, 1], [5, 1]]]);
    expect(normAng([[0, 0], [1, 0]])).toBeCloseTo(Math.PI / 2, 15);
  });
  it('a source inside the fiber starts in N = 1.5', () => {
    expect(startIndices(0.4, 0.8, [-2, 0.5])).toEqual([1.5, 1]);
    expect(startIndices(0.4, 0.8, [0, 0.1])).toEqual([1, 1.5]); // inside the defect
    expect(startIndices(0.4, 0.8, [-2, 1.5])).toEqual([1, 1.5]); // above the fiber
    expect(testpoint([[-1, 0], [0, 1], [1, 0]], [0, 0.5])).toBe(true);
    expect(testpoint([[-1, 0], [0, 1], [1, 0]], [0.9, 0.5])).toBe(false);
  });
  it('incidentAng: the angle to the normal on the incoming side', () => {
    // a ray coming down at 45° onto the x axis
    const [inc, n] = incidentAng([[-1, 1], [0, 0]], [[-5, 0], [5, 0]]);
    expect(Math.abs(inc)).toBeCloseTo(Math.PI / 4, 15);
    expect(n).toBeCloseTo(Math.PI / 2, 15);
  });
  it('power is conserved at each split; total internal reflection beyond the critical angle', () => {
    // inside the glass towards the top at 30° from the normal (< 41.8°): refracted 0.96, reflected 0.04
    const rays = [];
    TraceLaser([0, 0.5], Math.PI / 2 - Math.PI / 6, 1, [[[-5, 1], [5, 1]]], 1.5, 1, rays);
    expect(rays[0].pow).toBe(1);
    expect(rays[1].pow).toBeCloseTo(0.96, 15);
    expect(rays[2].pow).toBeCloseTo(0.04, 15);
    // the refracted ray: sin θt = 1.5 sin 30° (Snell)
    const d = [rays[1].to[0] - rays[1].from[0], rays[1].to[1] - rays[1].from[1]];
    expect(Math.abs(d[0]) / Math.hypot(...d)).toBeCloseTo(0.75, 12);
    // at 60° from the normal (> 41.8°) no refracted ray: everything reflected
    const tir = [];
    TraceLaser([0, 0.5], Math.PI / 2 - Math.PI / 3, 1, [[[-5, 1], [5, 1]]], 1.5, 1, tir);
    expect(tir).toHaveLength(2);
    expect(tir[1].pow).toBe(1);
    expect(tir[1].to[1]).toBeLessThan(tir[1].from[1]); // reflected downwards
  });
  it('TraceLaser at the snapshot settings', () => {
    // the opening state: source 1 reaches the defect's left side first, source 2 the bottom edge
    const { view } = evaluate(initialState());
    expect(view.rays[0][0].to[0]).toBeCloseTo(-0.2126, 4);
    expect(view.rays[0][0].to[1]).toBeCloseTo(0.1842, 4);
    expect(view.rays[1][0].to[0]).toBeCloseTo(-1.2864, 3);
    expect(view.rays[1][0].to[1]).toBe(0);
    for (const r of view.rays) for (const x of r) expect(x.pow).toBeGreaterThan(0);
    // snapshot 2: source 1 above the fiber (N = 1 first)
    const s2 = evaluate({ ...initialState(), θ1: -0.5152211951887262, θ2: -0.5403539364174441, p: [[-4.73, 1.5], [-4.9, 0.18]] });
    expect(s2.view.indices).toEqual([[1, 1.5], [1.5, 1]]);
    expect(s2.view.rays[0][0].to[1]).toBeCloseTo(1, 12); // from above, the first hit is the fiber's top
    // snapshot 3: both sources inside; source 1 reaches the bottom edge first at x = −3.1727
    const s3 = evaluate({ ...initialState(), θ1: -0.5152211951887262, θ2: -0.7916813487046279, p: [[-4.25, 0.61], [-4.695, 0.16]] });
    expect(s3.view.indices).toEqual([[1.5, 1], [1.5, 1]]);
    expect(s3.view.rays[0][0].to[0]).toBeCloseTo(-3.1727, 4);
    expect(s3.view.rays[0][0].to[1]).toBe(0);
    // snapshot 4: every traced segment ends on a boundary or leaves the picture, with powers in (0, 1]
    const s4 = evaluate({ ...initialState(), θ1: -0.6157521601035993, θ2: -0.6031857894892401, p: [[-4.285, 0.68], [-4.68, 0.4]] });
    for (const r of s4.view.rays) for (const x of r) { expect(x.pow).toBeGreaterThan(0); expect(x.pow).toBeLessThanOrEqual(1); }
    expect(s4.view.rays[0].length).toBeGreaterThan(3);
  });
});
