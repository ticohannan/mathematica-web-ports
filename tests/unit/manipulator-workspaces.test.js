// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei, Muhammad Sultan and Maruthi S. Chemudupati
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/manipulator-workspaces.test.js — the pure model of "Robot Manipulator Workspaces" (TESTPLAN T-MW-01 …
// T-MW-20, T-MW-55; the IntervalSlider cases T-MW-21 … T-MW-23 are in tests/unit/ui-interval.test.js).
// Expected values: hand-derived closed forms of the DH tables (products of the four DH transforms written out by
// hand, checked with an independent Python product, TESTPLAN), the source text, and robot-singularities' table.
import { describe, it, expect } from 'vitest';
import {
  TYPES, TYPE_NAMES, DEFAULT_TYPE, initialState, initialSettings, selectType, pmOf, evaluate, workspaceSurfaces,
  sampleSpeedSurface, SPEED_PARAMS, workspace3D, jointLabels, typeOf,
} from '../../demos/manipulator-workspaces/model.js';
import { TYPES as RS_TYPES } from '../../demos/robot-singularities/robots.js';
import { makeO3coords, computeAd, computeTd } from '../../demos/common/dh-chain.js';
import { drawJoint } from '../../demos/common/robot-draw.js';
import { flatten, cuboidCorners } from '../../demos/common/g3d.js';
import { mUnequal } from '../../shared/mma.js';

const { cos, sin } = Math;
const near = (a, b, tol, what = '') => expect(Math.abs(a - b), `${what} ${a} vs ${b}`).toBeLessThanOrEqual(tol);
const near3 = (p, q, tol, what = '') => p.forEach((v, i) => near(v, q[i], tol, `${what}[${i}]`));
// a small deterministic generator (no Math.random: reproducible)
function lcg(seed) { let s = seed >>> 0; return () => ((s = (1664525 * s + 1013904223) >>> 0) / 2 ** 32); }

describe('manipulator workspaces: joint values and DH tables', () => {
  it('pm is r[[1]] + params (r[[2]] - r[[1]]): 1 at the defaults, 0.5 and 1.5 at the slider ends', () => {
    const st = initialState();
    expect(pmOf(st)).toEqual([1, 1, 1]);
    expect(pmOf({ ...st, params: [0, 0, 0] })).toEqual([0.5, 0.5, 0.5]);
    expect(pmOf({ ...st, params: [1, 1, 1] })).toEqual([1.5, 1.5, 1.5]);
    // the order of operations: r1 + params (r2 - r1)
    expect(pmOf({ ...st, params: [0.07, 0.5, 0.5], r1: [-3.1, 0.30000000000000027] })[0]).toBe(-3.1 + 0.07 * (0.30000000000000027 - -3.1));
  });
  it('changing a range keeps the slider fractions and moves the arm', () => {
    const st = initialState();
    const a = evaluate(st).view;
    const b = evaluate({ ...st, r1: [-0.5, 0.5] });
    expect(b.state.params).toEqual([0.5, 0.5, 0.5]);
    expect(a.pm[0]).toBe(1);
    expect(b.view.pm[0]).toBe(0);
    // planar arm: o3 = (cos q1 + cos(q1+q2) + cos(q1+q2+q3), sin …, 0)
    near3(b.view.o3, [1 + cos(1) + cos(2), 0 + sin(1) + sin(2), 0], 1e-15, 'o3');
    expect(Math.hypot(...b.view.o3.map((v, i) => v - a.o3[i]))).toBeGreaterThan(0.5);
  });
  it('the Type table has the 14 robots of the popup menu in order, default elbow robot arm', () => {
    expect(TYPE_NAMES).toEqual(['planar robot arm', 'elbow robot arm', 'PUMA robot arm', 'offset PUMA arm', 'Stanford robot arm',
      'cylindrical robot arm', 'spherical robot arm', 'offset spherical arm', 'twisted spherical', 'SCARA robot arm',
      'planar RPR arm', 'CNC robot arm', 'Cartesian robot arm', 'linear robot arm']);
    expect(TYPES).toHaveLength(14);
    expect(DEFAULT_TYPE).toBe(2);
    expect(TYPE_NAMES[DEFAULT_TYPE - 1]).toBe('elbow robot arm');
  });
  it('the 14 DH rows equal robot-singularities rows 1 to 14 except the planar RPR theta row {q1, 0, q2}', () => {
    for (let k = 0; k < 14; k++) {
      for (const row of [0, 1, 2, 3]) expect(TYPES[k][row], `robot ${k + 1} row ${row}`).toEqual(RS_TYPES[k][row]);
      if (k === 10) {
        expect(TYPES[k][4]).toEqual(['q1', 0, 'q2']);
        expect(RS_TYPES[k][4]).toEqual(['q1', 0, 'q3']);
      } else expect(TYPES[k][4], `robot ${k + 1} theta`).toEqual(RS_TYPES[k][4]);
    }
  });
  it('o3coords of the planar arm at pm = (1, 1, 1) is (cos 1 + cos 2 + cos 3, sin 1 + sin 2 + sin 3, 0)', () => {
    const o = makeO3coords(typeOf(1))(1, 1, 1);
    near3(o, [cos(1) + cos(2) + cos(3), sin(1) + sin(2) + sin(3), 0], 1e-15);
    near3(o, [-0.865837027279448, 1.8918884196934453, 0], 1e-15);
  });
  it('o3coords of the CNC arm is (q2, q3, q1), of the Cartesian arm (0, q2, q1 - q3), of the linear arm (0, 0, q1 + q2 + q3)', () => {
    const rnd = lcg(7);
    const cnc = makeO3coords(typeOf(12)), cart = makeO3coords(typeOf(13)), lin = makeO3coords(typeOf(14));
    for (let n = 0; n < 50; n++) {
      const [q1, q2, q3] = [0, 0, 0].map(() => -3.1 + 6.2 * rnd());
      near3(cnc(q1, q2, q3), [q2, q3, q1], 1e-14, 'CNC');
      near3(cart(q1, q2, q3), [0, q2, q1 - q3], 1e-14, 'Cartesian');
      near3(lin(q1, q2, q3), [0, 0, q1 + q2 + q3], 1e-14, 'linear');
    }
  });
  it('Td of the elbow arm at pm = (1, 1, 1): its end column equals o3coords', () => {
    const Td = computeTd(computeAd(typeOf(2), [1, 1, 1]), { chop: false });
    const col = [Td[2][0][3], Td[2][1][3], Td[2][2][3]];
    near3(col, [cos(1) * (cos(1) + cos(2)), sin(1) * (cos(1) + cos(2)), 2 + sin(1) + sin(2)], 1e-15);
    near3(col, [0.06708148636027596, 0.10447322503882622, 3.7507684116335787], 1e-15);
    near3(col, makeO3coords(typeOf(2))(1, 1, 1), 1e-15);
    const v = evaluate({ ...initialState(), Type: 2, TypeOld: 2 }).view;
    near3(v.o3, col, 0);
  });
  it('Td[1] = Ad[[1]] keeps its residues, Td[2] and Td[3] are chopped (Chop acts on a TransformationFunction, H-AC-14)', () => {
    // elbow arm, pm = (π/2, 0, 0): cos(π/2) = 6.1e-17 survives in Td[1] = Ad[[1]] (not chopped in the original either)
    // and is removed from the chopped products Td[i] = Chop[Td[i-1].Ad[[i]]] (Q-MW-09)
    const st = { ...initialState(), Type: 2, TypeOld: 2, params: [0, 0, 0], r1: [Math.PI / 2, 2], r2: [0, 1], r3: [0, 1] };
    const { Td } = evaluate(st).view;
    expect(Math.abs(Td[0][0][0])).toBe(cos(Math.PI / 2)); // 6.123233995736766e-17, not 0
    const tiny = Td.slice(1).flat(2).filter((x) => x !== 0 && Math.abs(x) < 1e-10);
    expect(tiny).toEqual([]);
    expect(Td[2][0][0]).toBe(0);
  });
});

describe('manipulator workspaces: the recompute test and the joint grid', () => {
  it('the workspace is recomputed when the robot or a range changes, not when a joint slider moves', () => {
    let r = evaluate(initialState());
    expect(r.view.recomputed).toBe(false);
    r = evaluate({ ...r.state, params: [0.2, 0.5, 0.5] }, r.cache);
    expect([r.view.recomputed, r.view.computed]).toEqual([false, false]);
    r = evaluate({ ...r.state, r2: [0.5, 2.5] }, r.cache);
    expect(r.view.recomputed).toBe(true);
    expect(r.state.r2old).toEqual([0.5, 2.5]);
    r = evaluate(selectType(r.state, 10), r.cache);
    expect(r.view.recomputed).toBe(true);
    expect(r.state.TypeOld).toBe(10);
  });
  it("the 14 DH tables are pairwise Unequal, so comparing robot indexes equals the original's TypeOld != Type", () => {
    let pairs = 0;
    for (let i = 0; i < 14; i++) for (let j = i + 1; j < 14; j++) {
      pairs++;
      const A = TYPES[i], B = TYPES[j];
      let differs = A[0].some((t, k) => t !== B[0][k]);
      for (const row of [1, 2, 3, 4]) for (let k = 0; k < 3; k++) {
        const a = A[row][k], b = B[row][k];
        if (typeof a === 'number' && typeof b === 'number' && mUnequal(a, b)) differs = true;
      }
      expect(differs, `${TYPE_NAMES[i]} vs ${TYPE_NAMES[j]}`).toBe(true);
    }
    expect(pairs).toBe(91);
  });
  it("a range change within Equal's tolerance (1.5 vs 1.5000000000000004) does not recompute the workspace (original quirk)", () => {
    const r0 = evaluate(initialState());
    const r = evaluate({ ...r0.state, r1: [0.5, 1.5000000000000004] }, r0.cache);
    expect(r.view.recomputed).toBe(false);
    expect(r.state.r1old).toEqual([0.5, 1.5]);
    expect(r.view.pm[0]).toBe(0.5 + 0.5 * (1.5000000000000004 - 0.5));
    expect(r.view.ws).toBe(r0.view.ws);
  });
  it('selectType resets every joint slider to 0.5, selecting the same robot keeps them (original quirk)', () => {
    const st = { ...initialState(), params: [0.2, 0.9, 0.4] };
    const s1 = selectType(st, 10);
    expect(s1.params).toEqual([0.5, 0.5, 0.5]);
    const s2 = selectType({ ...s1, params: [0.2, 0.9, 0.4] }, 10);
    expect(s2.params).toEqual([0.2, 0.9, 0.4]);
    expect(jointLabels(10)).toEqual(['θ1', 'θ2', 'd3']);
    expect(jointLabels(6)).toEqual(['θ1', 'd2', 'd3']);
  });
  it("initial state is the notebook's saved state (planar robot arm, ranges {0.5, 1.5}, params 0.5, TypeOld = Type)", () => {
    expect(initialState()).toEqual({
      Type: 1, TypeOld: 1, params: [0.5, 0.5, 0.5], r1: [0.5, 1.5], r2: [0.5, 1.5], r3: [0.5, 1.5],
      r1old: [0.5, 1.5], r2old: [0.5, 1.5], r3old: [0.5, 1.5],
    });
  });
  it('Initial settings are the stored specifications: elbow robot arm, ranges {0.5, 1.5}, params 0.5', () => {
    expect(initialSettings()).toEqual({
      Type: 2, TypeOld: 2, params: [0.5, 0.5, 0.5], r1: [0.5, 1.5], r2: [0.5, 1.5], r3: [0.5, 1.5],
      r1old: [0.5, 1.5], r2old: [0.5, 1.5], r3old: [0.5, 1.5],
    });
    expect(evaluate(initialSettings()).view.recomputed).toBe(false);
  });
});

describe('manipulator workspaces: the nine surfaces', () => {
  const R = [0.5, 1.5];
  it('workspace3D has 9 surfaces in the original order (r3 min, r3 max, r2 min, r2 max, r1 min, r1 max, r3 middle, r2 middle, r1 middle)', () => {
    // CNC: o3 = (q2, q3, q1); surface k holds one coordinate fixed
    const f = workspaceSurfaces(typeOf(12), R, R, R);
    expect(f).toHaveLength(9);
    const fixed = [[1, 0.5], [1, 1.5], [0, 0.5], [0, 1.5], [2, 0.5], [2, 1.5], [1, 1], [0, 1], [2, 1]]; // [axis, value]
    const rnd = lcg(3);
    f.forEach((s, k) => {
      for (let n = 0; n < 10; n++) {
        const p = s(rnd(), rnd());
        expect(p[fixed[k][0]], `surface ${k + 1}`).toBe(fixed[k][1]);
      }
    });
  });
  it('Speed sampling: parameters k/9 for k = 0 to 9 plus 1/2, 11 x 11 vertices and 100 quads per surface', () => {
    expect(SPEED_PARAMS).toEqual([0, 1 / 9, 2 / 9, 3 / 9, 4 / 9, 1 / 2, 5 / 9, 6 / 9, 7 / 9, 8 / 9, 1]);
    const s = sampleSpeedSurface((a, b) => [a, b, 0]);
    expect(s.grid).toHaveLength(11);
    expect(s.grid.every((row) => row.length === 11)).toBe(true);
    expect(s.quads).toHaveLength(100);
    expect(s.grid[3][7]).toEqual([3 / 9, 6 / 9, 0]);
    const ws = workspace3D(typeOf(1), R, R, R);
    expect(ws.surfaces.map((x) => x.grid.flat().length)).toEqual(Array(9).fill(121));
  });
  it('mesh lines at a = 1/2 and b = 1/2 with 11 points, boundary of 41 points per surface', () => {
    const s = sampleSpeedSurface((a, b) => [a, b, 0]);
    const [ma, mb] = s.mesh;
    expect(ma).toHaveLength(11);
    expect(mb).toHaveLength(11);
    expect(ma.every((p) => p[0] === 0.5)).toBe(true);
    expect(mb.every((p) => p[1] === 0.5)).toBe(true);
    expect(s.boundary).toHaveLength(41);
    expect(s.boundary[0]).toEqual(s.boundary[40]);
    expect(s.boundary.every((p) => p[0] === 0 || p[0] === 1 || p[1] === 0 || p[1] === 1)).toBe(true);
    // the saved graphic: 9 boundary lines and two mesh groups of 9 lines
    const lines = flatten(workspace3D(typeOf(1), R, R, R).graphic).filter((p) => p.type === 'line');
    expect(lines.filter((l) => l.points.length === 41)).toHaveLength(9);
    expect(lines.filter((l) => l.points.length === 11)).toHaveLength(18);
  });
  it('the CNC workspace is the cube 0.5..1.5 cut into 8 cubes by the middle planes', () => {
    const ws = workspace3D(typeOf(12), R, R, R);
    const pts = ws.surfaces.flatMap((s) => s.grid.flat());
    expect(pts.every((p) => p.every((v) => v >= 0.5 && v <= 1.5))).toBe(true);
    // each surface is one of the planes x, y, z ∈ {0.5, 1, 1.5}
    const planes = ws.surfaces.map((s) => {
      const g = s.grid.flat();
      const ax = [0, 1, 2].find((k) => g.every((p) => p[k] === g[0][k]));
      return `${'xyz'[ax]}=${g[0][ax]}`;
    });
    expect(planes).toEqual(['y=0.5', 'y=1.5', 'x=0.5', 'x=1.5', 'z=0.5', 'z=1.5', 'y=1', 'x=1', 'z=1']);
  });
  it('the Cartesian workspace is flat (x = 0)', () => {
    const ws = workspace3D(typeOf(13), R, R, R);
    const xs = ws.surfaces.flatMap((s) => s.grid.flat()).map((p) => p[0]);
    expect(xs.every((x) => Math.abs(x) === 0)).toBe(true); // exactly 0 with the exact table angles
  });
});

describe('manipulator workspaces: the picture', () => {
  it('Show takes the options of the first graphic: no axes, no box, SphericalRegion, ImageSize 425', () => {
    const v = evaluate(initialState()).view;
    expect(v.graphic.options).toEqual({ SphericalRegion: true, ImageSize: 425, Boxed: false });
    expect(v.ws.graphic.options.Axes).toBe(true);
    expect('Axes' in v.graphic.options).toBe(false);
    expect(v.graphic.content).toHaveLength(2);
  });
  it('drawJoint of a prismatic joint with negative extension gives a cuboid between z = d + 0.01 and -0.21 (corners normalised for drawing)', () => {
    const prims = flatten(drawJoint('p', -1, 0, 0));
    const cub = prims.filter((p) => p.type === 'cuboid');
    const [axis, ...body] = cub;
    expect(axis.color).toEqual([0.5, 0.5, 0.5]); // Gray
    // -jr - .01 = -1/5 - 0.01 = -0.21000000000000002 (machine), d + .01 = -0.99
    expect([axis.min, axis.max]).toEqual([[-0.05, -0.05, -0.2 - 0.01], [0.05, 0.05, -1 + 0.01]]); // as written: reversed in z
    expect(cuboidCorners(axis)).toEqual({ min: [-0.05, -0.05, -0.99], max: [0.05, 0.05, -0.21000000000000002] });
    // the light-blue joint body is unchanged
    expect(body.map((b) => [b.min, b.max])).toEqual([[[-0.2, -0.2, -0.2], [0.2, 0.2, 0.2 - 0.1]], [[-0.2, -0.2, 0.2], [0.2, 0.2, 0.2 + 0.05]]]);
    expect(prims.some((p) => p.type === 'cuboid' && p.max[0] === 0)).toBe(false); // r = 0: no link
  });
});
