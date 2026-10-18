// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/three-helpers.test.js — the pure sizing and camera rules of shared/three-helpers.js createViewer.
// The square viewer (the rotation demos, robot-singularities, unit-balls, prm-robot-arm) keeps its rules; the
// non-square option follows the manipulability-ellipsoid draft D-ME-01 (camera at the PlotRange centre (0, 0, 2) +
// ViewPoint × longest side (8), vertical view angle 18° over the image height 420, image 440 × 420) and the
// arm-configurations draft D-AC-01 (420 × 350, ViewAngle 12°, box ±3).
import { describe, it, expect } from 'vitest';
import { viewerSize, viewerCamera } from '../../shared/three-helpers.js';

describe('createViewer sizing', () => {
  it('square by default: the side follows the container up to 560 px (or maxSize)', () => {
    expect(viewerSize(800, {})).toEqual({ width: 560, height: 560 });
    expect(viewerSize(300, {})).toEqual({ width: 300, height: 300 });
    expect(viewerSize(0, { size: 425 })).toEqual({ width: 425, height: 425 });
    expect(viewerSize(800, { maxSize: 425 })).toEqual({ width: 425, height: 425 });
  });
  it('non-square: imageSize [440, 420] keeps the ratio, at most 440 px wide unless maxSize says otherwise', () => {
    expect(viewerSize(1000, { imageSize: [440, 420] })).toEqual({ width: 440, height: 420 });
    expect(viewerSize(220, { imageSize: [440, 420] })).toEqual({ width: 220, height: 210 });
    expect(viewerSize(1000, { imageSize: [420, 350], maxSize: 840 })).toEqual({ width: 840, height: 700 });
  });
});

describe('createViewer camera', () => {
  it('manipulability-ellipsoid framing: centre (0, 0, 2), position centre + ViewPoint × 8, 18° vertical, aspect 440/420', () => {
    const c = viewerCamera({ box: [[-3.5, 3.5], [-4, 4], [-1, 5]], viewPoint: [1.3, -2.4, 2], viewAngle: (18 * Math.PI) / 180, imageSize: [440, 420] });
    expect(c.center).toEqual([0, 0, 2]);
    expect(c.position).toEqual([1.3 * 8, -2.4 * 8, 2 + 2 * 8]);
    expect(c.fovDeg).toBeCloseTo(18, 12);
    expect(c.aspect).toBe(440 / 420);
  });
  it('square viewer: aspect 1 and the automatic angle fits the bounding sphere (× 1.04), as before', () => {
    const c = viewerCamera({ box: [[-1, 1], [-1, 1], [-1, 1]], viewPoint: [1.3, -2.4, 2] });
    const dist = 2 * Math.hypot(1.3, -2.4, 2), radius = Math.sqrt(3);
    expect(c.aspect).toBe(1);
    expect(c.fovDeg).toBeCloseTo((2 * Math.asin(radius / dist) * 1.04 * 180) / Math.PI, 12);
    expect(c.near).toBeCloseTo(dist / 100, 12);
  });
});
