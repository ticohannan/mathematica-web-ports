// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/truss-solvability.test.js — the model of "Determine If a Truss Can Be Solved". Expected values counted by
// hand from the original's formulas, or read off the notebook's snapshots (docs/original-snapshots/truss-solvability-*.png).
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation, Cases, textOf } from '../../shared/graphics.js';
import { determinacy } from '../../shared/truss.js';
import { initialState, evaluate, counts, trussOf } from '../../demos/truss-solvability/model.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/truss-solvability.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);
const texts = (g) => Cases(g, 'Text').map((t) => textOf(t.expr, { sep: '' }));
const all = [];
for (const ADTR of [true, false]) for (const SA of [1, 2]) for (const SB of [1, 2]) for (const SF of [1, 2]) all.push({ ADTR, labels: false, SA, SB, SF });

describe('truss-solvability model', () => {
  it('the opening state', () => {
    expect(initialState()).toEqual(numbersOf(fx.specs));
  });
  it('the counts as the snapshots show them', () => {
    expect(counts(snap('1'))).toMatchObject({ members: 13, reactions: 3, joints: 8, variables: 16, equations: 16, difference: 0 });
    expect(counts(snap('2'))).toMatchObject({ members: 11, reactions: 4, joints: 7, variables: 15, equations: 14, difference: 1 });
    expect(counts(snap('3'))).toMatchObject({ variables: 14, equations: 14, difference: 0 });
    expect(counts(snap('4'))).toMatchObject({ reactions: 4, variables: 17, difference: 1 });
    expect(evaluate(snap('1')).view.verdictText).toBe('solvable');
    expect(evaluate(snap('2')).view.verdictText).toBe('statically indeterminate');
  });
  it('the picture: supports, reactions and loads as in snapshot 2 (no support at B, A and E pinned, labels)', () => {
    const g = evaluate(snap('2')).graphics;
    const reac = texts(annotation(g, 'reactions').g);
    expect(reac).toEqual(['RA, x', 'RA, y', 'RE, x', 'RE, y']);
    expect(texts(annotation(g, 'loads').g)).toEqual(['FG', 'FF', 'FD']);
    expect(texts(annotation(g, 'joint-labels').g).map((s) => s.trim())).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    const inset = annotation(g, 'counts').g.graphics; // the Inset's own Graphics
    expect(texts(inset.list ?? inset)).toEqual(expect.arrayContaining(['15 variables', '14 equations']));
    expect(JSON.stringify(inset)).toContain('statically indeterminate');
    expect(annotation(evaluate(snap('1')).graphics, 'joint-labels')).toBe(null);
  });
  it('the truss of shared/truss.js has the counted members, joints and reactions', () => {
    for (const s of all) {
      const t = trussOf(s), c = counts(s), d = determinacy(t);
      expect([t.members.length, t.joints.length, d.unknowns, d.equations]).toEqual([c.members, c.joints, c.variables, c.equations]);
    }
  });
  it('kept: the original verdict by the sign of variables − equations', () => {
    for (const s of all) expect(evaluate(s).view.verdict).toBe(counts(s).difference <= 0 ? 'solvable' : 'indeterminate');
  });
});

describe('corrected mode (E-TD)', () => {
  it('E-TD-01 corrected: without B and with two rollers the truss is a mechanism; every other case keeps its verdict', () => {
    const mech = { ADTR: false, labels: false, SA: 1, SB: 1, SF: 1, errata: 'corrected' };
    expect(counts(mech).difference).toBe(-1);
    expect(evaluate({ ...mech, errata: 'original' }).view.verdictText).toBe('solvable');
    expect(evaluate(mech).view).toMatchObject({ verdict: 'mechanism', verdictText: 'unstable (a mechanism)' });
    for (const s of all) {
      if (!s.ADTR && s.SA === 1 && s.SF === 1) continue;
      expect(evaluate({ ...s, errata: 'corrected' }).view.verdict, JSON.stringify(s)).toBe(evaluate(s).view.verdict);
    }
  });
});
