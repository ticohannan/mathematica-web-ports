// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/truss-method-of-joints.test.js — the model of "Method of Joints to Solve a Truss Problem": the original's
// joint balances against an independent solution (shared/truss.js), the numbers in the snapshots
// (docs/original-snapshots/truss-method-of-joints-*.png), the views, PlotRange -> All and the corrected mode.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { trussSolve } from '../../shared/truss.js';
import { initialState, evaluate, solve, rangeAll, w, h, FC } from '../../demos/truss-method-of-joints/model.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/truss-method-of-joints.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);
const texts = (g) => Cases(g, 'Text').map((t) => textOf(t.expr));

describe('truss-method-of-joints model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it("the original's joint balances give the forces of an independent solution (A pinned, E on a roller, FC at C)", () => {
    // joints A B C D E; members AB AC BC BD CD CE DE (F1 … F7)
    const J = [[0, 0], [0.5 * w, h], [w, 0], [1.5 * w, h], [2 * w, 0]];
    const r = trussSolve({ joints: J, members: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4]],
      supports: [{ joint: 0, dirs: [[1, 0], [0, 1]] }, { joint: 4, dirs: [[0, 1]] }], loads: [{ joint: 2, f: [0, -FC] }] });
    const S = solve();
    [S.F1, S.F2, S.F3, S.F4, S.F5, S.F6, S.F7].forEach((f, i) => expect(f, `F${i + 1}`).toBeCloseTo(r.forces[i], 12));
    expect(S.RA).toBeCloseTo(r.reactions[1].value, 12); expect(S.RE).toBeCloseTo(r.reactions[2].value, 12);
    expect(r.reactions[0].value).toBeCloseTo(0, 12); // RA,x = 0, as the x-force balance says
  });
  it('the numbers of the snapshots: RA = RE = 0.50 kN, FAB = 0.58 kN (compression), FAC = 0.29 kN (tension)', () => {
    const t3 = texts(annotation(evaluate(snap('3')).graphics[0], 'reactions').g).join(' | ');
    expect(t3).toContain('RA = 0.50 kN'); expect(t3).toContain('RE = 0.50 kN');
    const eq = texts(evaluate(snap('5')).graphics[1]).join(' ');
    expect(eq).toContain('FAB = 0.58 kN (compression)'); expect(eq).toContain('FAC = 0.29 kN (tension)');
    expect(texts(annotation(evaluate(snap('1')).graphics[0], 'truss').g)).toContain('FC = 1 kN');
  });
  it('the solved truss: AB, BD, DE in compression, the others in tension', () => {
    const v = evaluate({ ...initialState(), steps: 2, joints: 5 }).view;
    expect(v.compression).toEqual(['AB', 'BD', 'DE']); expect(v.tension).toEqual(['AC', 'BC', 'CD', 'CE']);
  });
  it('PlotRange -> All of a joint in focus holds its points and its labels', () => {
    const st = { ...initialState(), steps: 2, joints: 1, focus: true };
    const R = rangeAll(annotation(evaluate(st).graphics[0], 'joint-A').g, [600, 300]);
    expect(R[1][1]).toBeGreaterThan(h); // the label F_AB above the end of the member
    expect(R[1][0]).toBeLessThan(0);
  });
});

describe('corrected mode (E-TJ)', () => {
  it('E-TJ-01: joint C\'s balances lack "= 0" (kept) and have it (corrected)', () => {
    const st = { ...initialState(), steps: 2, joints: 3, focus: true };
    const eq = (s) => texts(evaluate(s).graphics[1]).join(' ');
    expect(eq(st)).toContain('∑ Fy = -FC'); expect(eq({ ...st, errata: 'corrected' })).toContain('∑ Fy = 0 = -FC');
    expect(eq({ ...st, joints: 1, errata: 'corrected' })).toBe(eq({ ...st, joints: 1 }));
  });
});
