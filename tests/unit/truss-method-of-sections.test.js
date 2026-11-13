// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/truss-method-of-sections.test.js — the model of "Method of Sections to Solve a Truss": the original's
// section balances against an independent method-of-joints solution (shared/truss.js), the numbers in the snapshots
// (docs/original-snapshots/truss-method-of-sections-*.png), the views and the corrected mode.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { trussSolve } from '../../shared/truss.js';
import { initialState, evaluate, solve, geometry, FD, FF } from '../../demos/truss-method-of-sections/model.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/truss-method-of-sections.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);
const texts = (g) => Cases(g, 'Text').map((t) => textOf(t.expr));
const all = (r, id) => JSON.stringify(annotation(r.graphics, id)?.g ?? null);

/** the same truss solved joint by joint: A pinned, G on a roller, FD at D and FF at F, both down */
function byJoints(w, h) {
  const { J, M } = geometry(w, h), names = Object.keys(J);
  const idx = (l) => names.indexOf(l);
  const nums = Object.keys(M).map(Number);
  const r = trussSolve({
    joints: names.map((l) => J[l]), members: nums.map((n) => [idx(M[n][0]), idx(M[n][1])]),
    supports: [{ joint: idx('A'), dirs: [[1, 0], [0, 1]] }, { joint: idx('G'), dirs: [[0, 1]] }],
    loads: [{ joint: idx('D'), f: [0, -FD] }, { joint: idx('F'), f: [0, -FF] }],
  });
  return { forces: Object.fromEntries(nums.map((n, i) => [n, r.forces[i]])), reactions: r.reactions, residual: r.residual };
}

describe('truss-method-of-sections model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it("the original's section balances give the forces of the method of joints (tension > 0), for several shapes", () => {
    for (const [w, h] of [[8, 8], [8, 6.3], [6.8, 8], [6, 7.1]]) {
      const S = solve(w, h), J = byJoints(w, h);
      expect(J.residual).toBeLessThan(1e-9);
      for (const n of [0, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 15, 16, 17, 19, 20]) expect(S[`F${n}`], `F${n} at w=${w} h=${h}`).toBeCloseTo(J.forces[n], 9);
      for (const n of [1, 6, 9, 14, 18]) expect(J.forces[n], `zero member ${n}`).toBeCloseTo(0, 9); // "all the vertical members are zero members"
      expect(S.RA).toBeCloseTo(J.reactions[1].value, 9); expect(S.RG).toBeCloseTo(J.reactions[2].value, 9);
    }
  });
  it('the numbers of the snapshots: RG = 17.5, RA = 7.5 kN; cut 3 at w = h = 8: F4 22.5, F12 10.6, F8 15.0 kN; θ = 45.0°', () => {
    const v1 = evaluate(snap('1')).view;
    expect([v1.RA, v1.RG]).toEqual([7.5, 17.5]);
    const r6 = evaluate(snap('6'));
    expect(r6.view.ThetaDeg).toBeCloseTo(45, 12);
    const t6 = texts(annotation(r6.graphics[0], 'cut-3').g).join(' | ');
    expect(t6).toContain('F4 = 22.5 kN');
    const eq = JSON.stringify(r6.graphics[1]);
    expect(eq).toContain('10.6'); expect(eq).toContain('15.0');
    expect(r6.view.showEquations).toBe(true);
    expect(evaluate(snap('4')).view.showEquations).toBe(false);
  });
  it('the views: the moment balance is a Mouseover; the cut line moves with the cut; the solved truss colours members', () => {
    expect(annotation(evaluate(snap('1')).graphics[0], 'moment-balance').g.head).toBe('Mouseover');
    const at = (cuts) => annotation(evaluate({ ...initialState(), steps: 2, cuts }).graphics[0], 'cut-line').g;
    expect(Cases(at(1), 'Line')[0].pts[0][0]).not.toBe(Cases(at(4), 'Line')[0].pts[0][0]);
    const solved = evaluate({ ...initialState(), steps: 2, cuts: 7 });
    expect(solved.view.compression + solved.view.tension).toBe(16);
    expect(texts(annotation(solved.graphics[0], 'member-forces').g)).toContain('20.0');
  });
});

describe('corrected mode (E-TX)', () => {
  it('E-TX-01: cut 4 prints |F12| under the label F13 (kept), |F13| = 20.0 kN (corrected)', () => {
    const st = { ...initialState(), steps: 2, cuts: 4, zoom: true };
    const line = (r) => texts(annotation(r.graphics[0], 'cut-balance').g)[0];
    expect(line(evaluate(st))).toContain('F13 = 10.6 kN');
    expect(line(evaluate({ ...st, errata: 'corrected' }))).toContain('F13 = 20.0 kN');
  });
  it('E-TX-02: the moment about I has + w FD (kept), − w FD (corrected); F15 = 20.0 kN in both', () => {
    const st = { ...initialState(), steps: 2, cuts: 5, zoom: true, moment: true };
    const eq = (r) => texts(r.graphics[1]).join(' | ');
    expect(eq(evaluate(st))).toContain('4 w RA + w FD - h F15');
    expect(eq(evaluate({ ...st, errata: 'corrected' }))).toContain('4 w RA - w FD - h F15');
    expect(eq(evaluate(st))).toContain('F15 = 20.0 kN');
  });
});
