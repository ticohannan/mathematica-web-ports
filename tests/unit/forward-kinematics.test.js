// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rob Lockhart
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/forward-kinematics.test.js — the model of "Forward Kinematics". Expected values are derived by hand: the arm
// is planar in the frame turned by the base angle (elevations T2 and T2 + T3 of the two links, shoulder 3 above the
// base), and the matrix entries are the snapshots' texts (docs/original-snapshots/forward-kinematics-*.png).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { initialState, evaluate, transforms, tableMatrices, tableHeader, OPTIONS, BLUE, RED, angleOf } from '../../demos/forward-kinematics/model.js';
import { flatten } from '../../shared/graphics3d.js';
import { entryText, entryValue } from '../../shared/traditional-form.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/forward-kinematics.original-states.json', 'utf8'));
const n = (x) => Math.round(((typeof x === 'number' ? x : x.n) * 32) / Math.PI);
const fromSaved = (s) => ({ T1: n(s.T1), T2: n(s.T2), T3: n(s.T3), T4: n(s.T4), FT: s.FT });

/** the frame origins of the planar arm, by hand: shoulder (0, 0, 3), links of 20 at elevations a and a + b, turned by t */
function byHand({ T1, T2, T3 }) {
  const t = angleOf(T1), a = angleOf(T2), ab = angleOf(T2 + T3);
  const r1 = 20 * Math.cos(a), z1 = 3 + 20 * Math.sin(a);
  const r2 = r1 + 20 * Math.cos(ab), z2 = z1 + 20 * Math.sin(ab);
  const turn = (r, z) => [r * Math.cos(t), r * Math.sin(t), z];
  return { elbow: turn(r1, z1), wrist: turn(r2, z2) };
}

describe('forward-kinematics model', () => {
  it('the opening state is the saved Initial Settings (T1 0, T2 5π/16, T3 −π/2, T4 7π/32, frames off)', () => {
    expect(initialState()).toEqual({ T1: 0, T2: 10, T3: -16, T4: 7, FT: false });
    expect(fromSaved(fx.specs)).toEqual(initialState());
    expect(fromSaved(fx.states[0])).toEqual(initialState());
  });

  it('the transforms put the elbow and the end-effector frame where the planar geometry says', () => {
    for (const s of [initialState(), ...Object.values(fx.snapshots).map(fromSaved), { T1: 13, T2: 3, T3: 11, T4: -5 }]) {
      const { TR3, TR4 } = transforms(s);
      const h = byHand(s);
      TR3([0, 0, 0]).forEach((x, k) => expect(x).toBeCloseTo(h.elbow[k], 12));
      TR4([0, 0, 0]).forEach((x, k) => expect(x).toBeCloseTo(h.wrist[k], 12));
    }
  });

  it('the matrices of the table, as the four snapshots show them', () => {
    const rows = (s) => tableMatrices(fromSaved(s)).map(([label, m]) => [label, m.map((r) => r.map((e) => entryText(e, { minus: '-' })))]);
    const s3 = rows(fx.snapshots[3]);
    expect(s3.map(([l]) => l)).toEqual(['base', 'link 1', 'link 2', 'end-effector']);
    expect(s3[0][1]).toEqual([['-cos(π/16)', 'sin(π/16)', '0', '0'], ['-sin(π/16)', '-cos(π/16)', '0', '0'], ['0', '0', '1', '0'], ['0', '0', '0', '1']]);
    expect(s3[1][1]).toEqual([['-cos(7π/32)', '0', '-sin(7π/32)', '0'], ['0', '1', '0', '0'], ['sin(7π/32)', '0', '-cos(7π/32)', '0'], ['0', '0', '0', '1']]);
    expect(s3[2][1][2]).toEqual(['-cos(7π/32)', '0', 'sin(7π/32)', '0']);
    expect(s3[3][1][2]).toEqual(['cos(π/32)', '0', 'sin(π/32)', '0']);
    const s2 = rows(fx.snapshots[2]);
    expect(s2[2][1][0]).toEqual(['sin(π/8)', '0', 'cos(π/8)', '20']);
    const s4 = rows(fx.snapshots[4]);
    expect(s4[1][1]).toEqual([['0', '0', '-1', '0'], ['0', '1', '0', '0'], ['1', '0', '0', '0'], ['0', '0', '0', '1']]);
    expect(s4[3][1][0]).toEqual(['1', '0', '0', '20']);
    const s1 = rows(fx.snapshots[1]);
    expect(s1[1][1][2]).toEqual(['cos(3π/16)', '0', 'sin(3π/16)', '0']);
  });

  it('the table entries are the values of the drawing matrices (link 1 without its translation 3, N-FK-02)', () => {
    for (const s of [initialState(), ...Object.values(fx.snapshots).map(fromSaved)]) {
      const shown = tableMatrices(s).map(([, m]) => m.map((r) => r.map(entryValue)));
      const { M1 } = transforms(s);
      expect(shown[0]).toEqual(M1);
      const c = Math.cos(angleOf(s.T2)), sn = Math.sin(angleOf(s.T2));
      [[c, 0, -sn, 0], [0, 1, 0, 0], [sn, 0, c, 0], [0, 0, 0, 1]].forEach((r, i) => r.forEach((x, j) => expect(shown[1][i][j]).toBeCloseTo(x, 15)));
    }
  });

  it('the picture: the original’s primitives in order, colours and opacity; 15 arrows, invisible unless show frames', () => {
    const prims = flatten(evaluate(initialState()).graphics[0]);
    expect(prims.map((p) => p.type)).toEqual(['cylinder', 'cuboid', 'cylinder', 'cylinder', 'cylinder', 'cylinder', 'cylinder', 'tube', ...Array(15).fill('arrow')]);
    expect(prims[0]).toMatchObject({ p1: [0, 0, -5], p2: [0, 0, 0], radius: 10, color: BLUE, opacity: 0.9 });
    expect(prims[1].color).toEqual(RED);
    expect(prims[7]).toMatchObject({ radius: 1, color: BLUE });
    for (const a of prims.slice(8)) expect([a.color, a.opacity]).toEqual([[0, 0, 0], 0]);
    for (const a of flatten(evaluate({ ...initialState(), FT: true }).graphics[0]).slice(8)) expect(a.opacity).toBe(1);
    expect(evaluate(initialState()).graphics[0].options).toEqual(OPTIONS);
  });

  it('the gripper: a U of three segments at the end-effector frame', () => {
    const { view } = evaluate(initialState());
    const g = view.gripper, o = view.origins[4];
    expect(Math.hypot(...g[1].map((x, k) => x - g[2][k]))).toBeCloseTo(6, 12);
    expect(Math.hypot(...g[0].map((x, k) => x - g[1][k]))).toBeCloseTo(3, 12);
    expect(Math.hypot(...g[1].map((x, k) => x - o[k]))).toBeCloseTo(Math.hypot(3, 3), 12);
  });

});

describe('corrected mode (E-FK)', () => {
  it('E-FK-01: the header reads "local transformation matrix"; the picture and the matrices are unchanged', () => {
    expect(tableHeader(initialState())).toBe('local rotation matrix');
    expect(tableHeader({ ...initialState(), errata: 'corrected' })).toBe('local transformation matrix');
    const a = evaluate(initialState()), b = evaluate({ ...initialState(), errata: 'corrected' });
    expect(flatten(b.graphics[0])).toEqual(flatten(a.graphics[0]));
    expect(b.graphics[1].rows).toEqual(a.graphics[1].rows);
  });
});
