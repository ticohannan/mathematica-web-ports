// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Francesco Bernardini and Aaron T. Becker; Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/car-icon.test.js — the shared car icon demos/common/car-icon.js (owner dubins-path, COMMON-DECISIONS §3)
// against the three originals' drawCar definitions (docs/original-source/car-paths.txt, dubins-path.txt,
// dubins-isochrons.txt) and car-paths' own drawCar of v0.1.19 (a recorded fixture; car-paths uses this module since v0.1.20).
// Since v0.1.21 drawCar returns shared/graphics.js Graphics data; the tests read its numbers through annotations()
// (tests/support/car-records.js lists them in the record form of v0.1.19–v0.1.20, so that the fixture comparison stays exact).
import { describe, it, expect } from 'vitest';
import { drawCar, wheelAngle, rot, rectPts } from '../../demos/common/car-icon.js';
import { annotations, annotation, Cases, RGBColor, Gray, Darker } from '../../shared/graphics.js';
import { NAMED } from '../../shared/mma-colors.js';
import { carRecords } from '../support/car-records.js';
import fs from 'node:fs';

const PI = Math.PI;
const PRE_MOVE = JSON.parse(fs.readFileSync('tests/unit/fixtures/car-paths-drawCar.pre-move.json', 'utf8'));
const closeVec = (a, b, d = 14) => { expect(a.length).toBe(b.length); a.forEach((v, i) => expect(v).toBeCloseTo(b[i], d)); };
// the caller's colour ({Green, drawCar[…]}): a colour no part of the car uses, so that 'inherit' can be recognised
const CALLER = RGBColor(0.1, 0.2, 0.3);
const oldForm = (car) => carRecords(car, CALLER.rgb);

describe('car-icon', () => {
  // D3 (owner, 2026-10-22): the test that compared drawCar with car-paths' re-export of the same function (since
  // v0.1.20) could not fail; it is replaced by the two tests below.
  it('car-icon: default options reproduce car-paths\' own drawCar of v0.1.19 bit for bit (fixture recorded from a80af87)', () => {
    expect(PRE_MOVE.rows).toHaveLength(6);
    for (const { args, car } of PRE_MOVE.rows) {
      const { prims, wheelAngles } = car;
      expect(JSON.parse(JSON.stringify(oldForm(drawCar(...args)))), JSON.stringify(args)).toEqual({ prims });
      expect([wheelAngle(args[2], 'left'), wheelAngle(args[2], 'right')]).toEqual(wheelAngles); // the angles the tyres are turned by
    }
  });
  it('car-icon: every vertex as re-derived from the original drawCar (car-paths.txt l. 74-85) at six poses', () => {
    // Translate[Rotate[Translate[{…}, {0.7, 0}], Theta, {0, 0}], xy]; tyres Rotate[…, If[Alpha == 0, 0, ArcTan[Alpha ∓ .375, 1.4]], {.7, ±.375}]
    const turn = ([x, y], a, [cx, cy]) => [cx + Math.cos(a) * (x - cx) - Math.sin(a) * (y - cy), cy + Math.sin(a) * (x - cx) + Math.cos(a) * (y - cy)];
    const rect = ([x0, y0], [x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; // the port's corner order
    for (const { args: [xy, Theta, Alpha, opac] } of PRE_MOVE.rows) {
      const place = (q) => { const r = turn([q[0] + 0.7, q[1]], Theta, [0, 0]); return [r[0] + xy[0], r[1] + xy[1]]; };
      const tyre = (side) => (Alpha === 0 ? 0 : Math.atan2(1.4, Alpha - side * 0.375));
      const want = [
        ['body', rect([-1, -0.5], [1, 0.5])],
        ['headlight', [[1, 0.35], [4, 0.05], [4, 0.55]]],
        ['headlight', [[1, -0.35], [4, -0.05], [4, -0.55]]],
        ['axle', [[-0.7, 0.35], [-0.7, -0.35]]],
        ['axle', [[0.7, 0.35], [0.7, -0.35]]],
        ['tyre-front-left', rect([0.5, 0.35], [0.9, 0.4]).map((q) => turn(q, tyre(1), [0.7, 0.375]))],
        ['tyre-back', rect([-0.5, 0.35], [-0.9, 0.4])],
        ['tyre-back', rect([-0.5, -0.35], [-0.9, -0.4])],
        ['tyre-front-right', rect([0.5, -0.35], [0.9, -0.4]).map((q) => turn(q, tyre(-1), [0.7, -0.375]))],
        ['arrow', [[0, 0], [1, 0]]],
      ];
      const { prims } = oldForm(drawCar(xy, Theta, Alpha, opac));
      expect(prims.map((p) => p.role)).toEqual(want.map(([r]) => r));
      prims.forEach((p, i) => closeVec(p.pts.flat(), want[i][1].map(place).flat(), 13));
      expect(prims.map((p) => p.opacity)).toEqual(prims.map((p) => (p.role === 'headlight' ? 0.8 * opac : opac)));
    }
  });
  it('car-icon: headlightEdge null removes only the headlight edges (EdgeForm[None])', () => {
    const a = oldForm(drawCar([1, 2], 0.3, 3, 0.2, { headlightEdge: null })), b = oldForm(drawCar([1, 2], 0.3, 3, 0.2));
    a.prims.forEach((p, i) => {
      if (p.role === 'headlight') expect(p.edge).toBe(null);
      else expect(p).toEqual(b.prims[i]);
    });
  });
  it('car-icon: lights false draws no headlights and beam 8 lengthens them to 8.7 ahead of the rear axle', () => {
    expect(oldForm(drawCar([0, 0], 0, 0, 0.8, { lights: false })).prims.some((p) => p.role === 'headlight')).toBe(false);
    const lights = oldForm(drawCar([0, 0], 0, 0, 0.8, { beam: 8, headlightEdge: null })).prims.filter((p) => p.role === 'headlight');
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
    expect(annotation(drawCar([0, 0], 0, 0, 1), 'tyre-back').style.color[0]).toBeCloseTo(1 / 3, 15); // Darker[Gray]
  });
  it('car-icon: id and arrowSize: the parts as the pages draw them (shaft up to the head\'s base, filled head; drawCarSvg and car-graphics.js before v0.1.21)', () => {
    const car = drawCar([0, 0], 0, 0, 0.8, { headlightEdge: null, id: 'car', arrowSize: 0.6 }); // Arrowheads[.02] of a 30-unit wide picture
    expect(car.head).toBe('Annotation');
    expect(car.id).toBe('car');
    const parts = annotations([CALLER, car]);
    expect(parts.map((a) => a.id)).toEqual(['car', 'car-body', 'car-headlight', 'car-headlight', 'car-axle', 'car-axle',
      'car-tyre-front-left', 'car-tyre-back', 'car-tyre-back', 'car-tyre-front-right', 'car-arrow']);
    const body = parts[1];
    expect(body.style.color).toEqual(CALLER.rgb); // the caller's colour on the body
    expect(body.style.opacity).toBe(0.8);
    expect(parts[2].style.edge).toBe(null); // EdgeForm[None]
    // the arrow: the shaft from the rear axle to the head's base, then the head (no edge, Black, Opacity[opac])
    const shaft = parts[10];
    expect(shaft.g.head).toBe('Line');
    closeVec(shaft.g.pts.flat(), [0.7, 0, 1.7 - 0.6, 0]);
    const head = Cases([CALLER, car], 'Polygon').at(-1);
    closeVec(head.pts.flat(), [1.7, 0, 1.1, 0.18, 1.1, -0.18]); // width 0.3 × the length on each side
    const headStyle = [];
    Cases([CALLER, car], (q, st) => q === head && headStyle.push(st));
    expect(headStyle).toHaveLength(1);
    expect(headStyle[0].edge).toBe(null);
    expect(headStyle[0].color).toEqual(NAMED.Black);
    expect(headStyle[0].opacity).toBe(0.8);
    // without arrowSize: the layer's Arrow with Arrowheads[.02] over the same two points
    const plain = annotation(drawCar([0, 0], 0, 0, 0.8), 'arrow');
    expect(plain.g.head).toBe('Arrow');
    expect(plain.g.pts).toEqual([shaft.g.pts[0], head.pts[0]]);
    expect(plain.style.arrowheads).toBe(0.02);
    // id and arrowSize change no number of the car (read back into the v0.1.19 records)
    for (const { args } of PRE_MOVE.rows) expect(oldForm(drawCar(...args, { id: 'x', arrowSize: 0.624 }))).toEqual(oldForm(drawCar(...args)));
  });
});
