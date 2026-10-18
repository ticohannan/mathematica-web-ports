// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/svg-frame.test.js — the pure layout of shared/svg-frame.js. Expected values from the drafts:
// distance-norms F-DN-17 / T-DN-20 (frame at ±2.5, majors −2 … 2 every 1, minors every 0.2 incl. ±2.2, ±2.4, axes
// through 0 without ticks), four-bar-linkage F-FB-14 / T-FB-61 (−π … π: ticks −3 … 3 with minor ticks),
// dubins-isochrons F-DI-15 / T-DI-35 (axes through the origin, labels −15, −10, −5, 5, 10, 15, minor ticks every 1).
import { describe, it, expect } from 'vitest';
import { ticks, automaticTicks, tickLabel, frameLayout, framePrimitives, axesPrimitives } from '../../shared/svg-frame.js';

const near = (xs, ys) => xs.length === ys.length && xs.every((x, i) => Math.abs(x - ys[i]) < 1e-12);

describe('ticks', () => {
  it('distance-norms: frame range ±2.5 with ticks every 1 and minor ticks every 0.2', () => {
    const t = ticks(-2.5, 2.5, { major: 1, minor: 0.2 });
    expect(t.major).toEqual([-2, -1, 0, 1, 2]);
    expect(t.minor).toHaveLength(20); // 4 between each pair of majors (16) and 2 beyond each outer major
    expect(t.minor).toEqual(expect.arrayContaining([-2.4, -2.2, 2.2, 2.4, 0.2, -0.2]));
    expect(t.minor).not.toEqual(expect.arrayContaining([-2.6]));
  });
  it('automatic ticks reproduce the three drafts: ±2.5 → 1/0.2, ±π → 1/0.2 (−3 … 3), ±16.5 → 5/1', () => {
    expect(automaticTicks(-2.5, 2.5)).toMatchObject({ majorStep: 1, minorStep: 0.2, major: [-2, -1, 0, 1, 2] });
    expect(automaticTicks(-Math.PI, Math.PI)).toMatchObject({ majorStep: 1, minorStep: 0.2, major: [-3, -2, -1, 0, 1, 2, 3] });
    const di = automaticTicks(-16.5, 16.5);
    expect(di).toMatchObject({ majorStep: 5, minorStep: 1, major: [-15, -10, -5, 0, 5, 10, 15] });
    expect(di.minor).toContain(16);
    expect(di.minor).not.toContain(10);
  });
  it('tick labels use the decimals of the step and a minus sign', () => {
    expect([-2, 0, 1].map((v) => tickLabel(v, 1))).toEqual(['−2', '0', '1']);
    expect(tickLabel(0.6000000000000001, 0.2)).toBe('0.6');
    expect(tickLabel(-15, 5, { minus: '-' })).toBe('-15');
  });
});

describe('frame and axes as data', () => {
  it('frameLayout leaves the measured image padding of distance-norms around the frame', () => {
    // D-DN-03: 789 px picture at 2.19 px/pt = 360 pt, padding left 62, right 39, top 33, bottom 62 px
    const k = 789 / 360; // px per pt of the snapshot (≈ 2.19)
    const L = frameLayout([[-2.5, 2.5], [-2.5, 2.5]], { imageSize: 360, margins: { left: 62 / k, right: 39 / k, top: 33 / k, bottom: 62 / k } });
    const [[X0, X1]] = L.plotRange;
    const framePx = (5 / (X1 - X0)) * 360 * k; // the frame width in the snapshot's pixels
    expect(framePx).toBeCloseTo(688, 9); // frame at px 450 … 1138 in snapshot 1
    expect(L.padding).toBe(0);
  });
  it('frame primitives: frame lines at exactly ±2.5, ticks on four sides, labels left and bottom, axes without ticks', () => {
    const p = framePrimitives({ range: [[-2.5, 2.5], [-2.5, 2.5]], unitsPerPx: 0.01, majorStep: 1, minorStep: 0.2, axes: true });
    const frame = p.lines.find((l) => l.role === 'frame');
    expect(frame.pts).toEqual([[-2.5, -2.5], [2.5, -2.5], [2.5, 2.5], [-2.5, 2.5], [-2.5, -2.5]]);
    expect(p.lines.filter((l) => l.role === 'major')).toHaveLength(5 * 4);
    expect(p.lines.filter((l) => l.role === 'minor')).toHaveLength(20 * 4);
    expect(p.lines.find((l) => l.role === 'axis-x').pts).toEqual([[-2.5, 0], [2.5, 0]]);
    expect(p.texts.filter((t) => t.role === 'label-x').map((t) => t.str)).toEqual(['−2', '−1', '0', '1', '2']);
    expect(p.texts.filter((t) => t.role === 'label-y')).toHaveLength(5);
    // ticks point into the frame: major 4 px, minor 2.3 px at the nominal size
    const bottomMajor = p.lines.find((l) => l.role === 'major' && l.pts[0][1] === -2.5);
    expect(bottomMajor.pts[1][1] - bottomMajor.pts[0][1]).toBeCloseTo(0.04, 12);
  });
  it('dubins-isochrons: axes through the origin with labels at ±5, ±10, ±15 and minor ticks every 1', () => {
    const p = axesPrimitives({ range: [[-16.5, 16.5], [-17.6, 17.6]], unitsPerPx: 0.075 });
    expect(p.texts.filter((t) => t.role === 'label-x').map((t) => t.str)).toEqual(['−15', '−10', '−5', '5', '10', '15']);
    expect(p.texts.filter((t) => t.role === 'label-y').map((t) => t.str)).toEqual(['−15', '−10', '−5', '5', '10', '15']);
    const minorX = p.lines.filter((l) => l.role === 'minor-x').map((l) => l.pts[0][0]);
    expect(near(minorX.filter((x) => x > 0 && x < 5), [1, 2, 3, 4])).toBe(true);
    expect(minorX).toContain(16);
    expect(p.lines.filter((l) => l.role === 'major-x').map((l) => l.pts[0][0])).not.toContain(0); // no tick at the origin
  });
  it('four-bar-linkage: axes over −π … π with ticks −3 … 3 and the axes labels θ, φ', () => {
    const p = axesPrimitives({ range: [[-Math.PI, Math.PI], [-Math.PI, Math.PI]], unitsPerPx: 0.02, axesLabel: ['θ', 'φ'] });
    expect(p.texts.filter((t) => t.role === 'label-x').map((t) => t.str)).toEqual(['−3', '−2', '−1', '1', '2', '3']);
    expect(p.texts.filter((t) => t.role.startsWith('axes-label')).map((t) => t.str)).toEqual(['θ', 'φ']);
  });
});
