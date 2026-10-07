// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/prm-seven-link.golden.test.js — the port against the ORIGINAL notebook's saved state
// (tests/golden/prm-seven-link.original-state.json) and its snapshot pictures (docs/original-snapshots).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { evaluate, initialState, roundTenth } from '../../demos/prm-seven-link/model.js';

const saved = JSON.parse(fs.readFileSync('tests/golden/prm-seven-link.original-state.json', 'utf8')).state;
// Owner state 1: the owner's working copy, saved in Mathematica 15.0.1 on 2026-10-06 after playing goal 7 (132 collisions).
const owner = JSON.parse(fs.readFileSync('tests/golden/prm-seven-link.owner-state-1.json', 'utf8')).state;

describe('seven-link golden', () => {
  it('seven-link: the saved state is the state after the first evaluation of the initial settings', () => {
    const { state } = evaluate(initialState());
    expect(state.loc).toEqual(saved.loc);
    expect(state.locOld).toEqual(saved.locOld);
    expect(state.goal).toBe(saved.goal);
    expect(state.movement).toBe(saved.movement);
    expect(state.collisions).toBe(saved.collisions);
    expect(state.isCollide).toBe(saved.isCollide);
    expect(state.collideState).toBe(saved.collideState);
  });
  it('seven-link: evaluating the saved state again changes nothing', () => {
    const { state } = evaluate({ ...saved });
    expect(state.loc).toEqual(saved.loc);
    expect(state.locOld).toEqual(saved.locOld);
    expect(state.collisions).toBe(0);
  });
  it('seven-link: worst error of the start position for goal 1 is 669.7, as in the original snapshot', () => {
    // docs/original-snapshots/prm-seven-link-1.png reads "0 collisions, worst error = 669.7"
    const { view } = evaluate({ ...saved });
    expect(roundTenth(view.worstError)).toBeCloseTo(669.7, 9);
  });

  it('seven-link: owner state 1 keeps every link 140 long and the port finds no collision, as saved', () => {
    // Independent facts from Mathematica's own state: link lengths (computed there with Cos/Sin) and isCollide = False.
    const chain = [[445, 846], ...owner.loc];
    for (let k = 1; k < chain.length; k++) {
      expect(Math.hypot(chain[k][0] - chain[k - 1][0], chain[k][1] - chain[k - 1][1])).toBeCloseTo(140, 9);
    }
    const { state } = evaluate({ ...owner });
    expect(state.isCollide).toBe(owner.isCollide);
    expect(state.collideState).toBe(owner.collideState);
  });
  it('seven-link: evaluating owner state 1 again changes nothing and keeps the count of 132 collisions', () => {
    const { state, view } = evaluate({ ...owner });
    expect(state.loc).toEqual(owner.loc);
    expect(state.locOld).toEqual(owner.locOld);
    expect(state.collisions).toBe(132);
    expect(view.success).toBe(false);
  });
});
