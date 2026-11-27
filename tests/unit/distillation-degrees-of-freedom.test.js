// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann, Janet deGrazia, John L. Falconer, Nathan S. Nelson and Nick Bongiardina
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/distillation-degrees-of-freedom.test.js — the model of "Degree-of-Freedom Analysis on a Distillation
// Process": the count of unknowns, balances and extra information for the known variables of the four snapshot
// pictures (read from their blue labels) against the numbers printed beside them, and the seeded random draw.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, evaluate, analyse, analyseKnown, selectable, randomSample, key, extraOf,
} from '../../demos/distillation-degrees-of-freedom/model.js';

const golden = JSON.parse(readFileSync(new URL('../golden/distillation-degrees-of-freedom.original-states.json', import.meta.url), 'utf8'));
/** The known variables of a picture: every selectable variable except the blue ones. */
const knownExcept = (state, blue) => selectable(state.view, state.cond).filter((v) => !blue.includes(key(v)));

describe('distillation-degrees-of-freedom model', () => {
  it('the opening state is the notebook live state', () => {
    expect(initialState()).toEqual(golden.states[0]);
    expect(initialState()).toEqual(golden.specs);
  });

  it('14 variables to choose from with 1 - zA, 21 with zB; the extra information of each unit', () => {
    expect(selectable(1)).toHaveLength(14);
    expect(selectable(2)).toHaveLength(21);
    expect([extraOf(1, 1), extraOf(2, 1), extraOf(2, 2), extraOf(3, 1), extraOf(4, 2)]).toEqual([0, 1, 2, 1, 0]);
    expect(selectable(1, 2).filter((v) => v.n === 4).map(key)).toEqual(['m4', 'x4A']); // a total condenser's liquid distillate
  });

  it('the four snapshots: the counts printed beside the flowsheets', () => {
    const cases = [
      // snapshot: blue labels of the picture → unknowns of the balance (in the picture's order), extra, dof, status
      [1, ['m4', 'y2A', 'x6A', 'm7', 'x3A'], ['m4', 'x6A', 'y2A'], 1, 0, 'solvable'],
      [2, ['m3', 'm4', 'm5', 'm6', 'm7', 'x5A', 'x5B', 'x6A', 'x6B', 'y2A', 'y4A', 'y4B'], ['m3', 'm6', 'm7', 'x6A', 'x6B', 'y2A'], 2, 2, 'underspecified'],
      [3, ['m6', 'y4A', 'x3A'], ['y4A'], 0, -1, 'overspecified'],
      [4, ['m1', 'm2', 'm4', 'm5', 'y4A'], ['m5'], 1, -2, 'overspecified'],
    ];
    for (const [k, blue, bal, extra, dof, status] of cases) {
      const s = golden.snapshots[k];
      const unknowns = s.view === 1 ? s.u1 : s.u2;
      expect(blue, `snapshot ${k}: the picture shows as many unknowns as the slider`).toHaveLength(unknowns);
      const a = analyseKnown(s, knownExcept(s, blue));
      expect(a.balUnknown.map(key), `snapshot ${k}`).toEqual(bal);
      expect([a.extra, a.dof, a.status], `snapshot ${k}`).toEqual([extra, dof, status]);
    }
  });

  it('the sums of zB: one per stream with an unknown composition in the balance', () => {
    const s = { ...golden.snapshots[2] };
    const a = analyseKnown(s, knownExcept(s, ['m3', 'm4', 'm5', 'm6', 'm7', 'x5A', 'x5B', 'x6A', 'x6B', 'y2A', 'y4A', 'y4B']));
    expect(a.sums.map((x) => `${x.c}${x.n}`)).toEqual(['y2', 'x6']);
  });

  it('with 1 - zA, the 1 - A label is unknown exactly when A is', () => {
    const s = initialState();
    const a = analyseKnown(s, knownExcept(s, ['m4', 'y2A', 'x6A', 'm7', 'x3A']));
    const oneMinus = a.unknownVars.filter((v) => v.kind === '1-A').map(key);
    expect(oneMinus).toEqual(['x31-A', 'x61-A', 'y21-A']);
  });

  it('the random draw: as many known as variables minus unknowns, the same for the same problem number, another for the next', () => {
    const a = analyse(initialState()), b = analyse(initialState()), c = analyse({ ...initialState(), reset: 2 });
    expect(a.known).toHaveLength(14 - 5);
    expect(b.known.map(key)).toEqual(a.known.map(key));
    expect(c.known.map(key)).not.toEqual(a.known.map(key));
    expect(new Set(randomSample([1, 2, 3, 4, 5], 5, 7))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('the picture: the title, the flowsheet with the chosen unit and the explanation', () => {
    const { view, graphics } = evaluate(initialState());
    expect(graphics).toHaveLength(3);
    expect(view.unit).toBe('condenser');
    expect(['solvable', 'overspecified', 'underspecified']).toContain(view.status);
  });
});
