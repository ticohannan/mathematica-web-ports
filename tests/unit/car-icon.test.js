// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Francesco Bernardini and Aaron T. Becker; Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/car-icon.test.js — the shared car icon demos/common/car-icon.js (owner dubins-path, COMMON-DECISIONS §3)
// against the three originals' drawCar definitions (docs/original-source/car-paths.txt, dubins-path.txt,
// dubins-isochrons.txt) and car-paths' own copy (which must stay interchangeable until car-paths switches).
import { describe, it, expect } from 'vitest';
import { drawCar, drawCarSvg, wheelAngle, rot, rectPts, CAR_COLOURS } from '../../demos/common/car-icon.js';
import { drawCar as drawCarCP } from '../../demos/car-paths/carpaths.js';

const PI = Math.PI;
const closeVec = (a, b, d = 14) => { expect(a.length).toBe(b.length); a.forEach((v, i) => expect(v).toBeCloseTo(b[i], d)); };

describe('car-icon', () => {
  it('car-icon: the default options give exactly car-paths\' drawCar (headlights to x = 4 with thin black edges)', () => {
    for (const args of [[[0, 0], 0, 0, 0.2], [[1, 2], 0.3, 3, 0.6], [[-5, 4], -2.5, -1.2, 0.8]]) {
      expect(drawCar(...args)).toEqual(drawCarCP(...args));
    }
  });
  it('car-icon: headlightEdge null removes only the headlight edges (EdgeForm[None])', () => {
    const a = drawCar([1, 2], 0.3, 3, 0.2, { headlightEdge: null }), b = drawCar([1, 2], 0.3, 3, 0.2);
    a.prims.forEach((p, i) => {
      if (p.role === 'headlight') expect(p.edge).toBe(null);
      else expect(p).toEqual(b.prims[i]);
    });
  });
  it('car-icon: lights false draws no headlights and beam 8 lengthens them to 8.7 ahead of the rear axle', () => {
    expect(drawCar([0, 0], 0, 0, 0.8, { lights: false }).prims.some((p) => p.role === 'headlight')).toBe(false);
    const lights = drawCar([0, 0], 0, 0, 0.8, { beam: 8, headlightEdge: null }).prims.filter((p) => p.role === 'headlight');
    closeVec(lights[0].pts.flat(), [1.7, 0.35, 8.7, 0.05, 8.7, 0.55]);
    closeVec(lights[1].pts.flat(), [1.7, -0.35, 8.7, -0.05, 8.7, -0.55]);
  });
  it('car-icon: wheelAngle, rot and rectPts', () => {
    expect(wheelAngle(0, 'left')).toBe(0);
    expect(wheelAngle(3, 'left')).toBeCloseTo(Math.atan(1.4 / 2.625), 15);
    expect(wheelAngle(-3, 'right')).toBeCloseTo(PI - Math.atan(1.4 / 2.625), 15);
    closeVec(rot([1, 0], PI / 2, [0, 0]), [0, 1], 15);
    closeVec(rot([2, 1], PI, [1, 1]), [0, 1], 15);
    expect(rectPts([0, 0], [2, 1])).toEqual([[0, 0], [2, 0], [2, 1], [0, 1]]);
    expect(CAR_COLOURS.DarkerGray[0]).toBeCloseTo(1 / 3, 15);
  });
  it('car-icon: drawCarSvg draws every primitive with the caller\'s colour on the body and no edge where there is none', () => {
    const calls = [];
    const plot = {
      unitsPerPx: 0.05, imageSize: 600,
      group: (_g, attrs) => ({ attrs }),
      polygon: (_g, pts, st) => calls.push(['polygon', pts, st]),
      line: (_g, pts, st) => calls.push(['line', pts, st]),
    };
    drawCarSvg(plot, null, drawCar([0, 0], 0, 0, 0.8, { headlightEdge: null }), { colour: [0, 0, 1], testid: 'car' });
    const body = calls.find((c) => c[2].testid === 'car-body');
    expect(body[2].fill).toEqual([0, 0, 1]);
    expect(body[2].fillOpacity).toBe(0.8);
    const light = calls.find((c) => c[2].testid === 'car-headlight');
    expect(light[2].stroke).toBe(undefined);
    // arrow shaft + head: Arrowheads[.02] = 0.02 × the picture width (0.05 × 600 = 30 units → 0.6)
    const shaft = calls.find((c) => c[2].testid === 'car-arrow');
    closeVec(shaft[1].flat(), [0.7, 0, 1.7 - 0.6, 0]);
  });
});
