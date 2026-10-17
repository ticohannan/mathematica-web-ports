// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/prm-seven-link.golden.test.js — the port against the ORIGINAL notebook's saved state
// (tests/golden/prm-seven-link.original-state.json) and its snapshot pictures (docs/original-snapshots).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { evaluate, initialState, roundTenth } from '../../demos/prm-seven-link/model.js';
import { ORIGIN, LINK_LEN } from '../../demos/prm-seven-link/model.js';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';

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

// ---- snapshot Settings (tests/golden/prm-seven-link.original-states.json, tools/extract_state.py --snapshots): the five
// snapshot cells store the Manipulate state behind docs/original-snapshots/prm-seven-link-<k>.png. Snapshots 2-5 are
// machine-number states after dragging toward goal 1; the status line of each picture is quoted in the tests.
const snaps = loadStates('tests/golden/prm-seven-link.original-states.json');
const snap = (k) => plain(snaps.snapshots[k - 1]);
// [k, title, collisions, worst error, solved] (titles written out: the design document cites them)
const STATUS = [
  [1, 'seven-link: snapshot 1: evaluating the saved state changes nothing and the status reads 0 collisions, worst error = 669.7', 0, 669.7, false],
  [2, 'seven-link: snapshot 2: evaluating the saved state changes nothing and the status reads 0 collisions, worst error = 752.6', 0, 752.6, false],
  [3, 'seven-link: snapshot 3: evaluating the saved state changes nothing and the status reads 3 collisions, worst error = 748.9', 3, 748.9, false],
  [4, 'seven-link: snapshot 4: evaluating the saved state changes nothing and the status reads 14 collisions, worst error = 467.9', 14, 467.9, false],
  [5, 'seven-link: snapshot 5: evaluating the saved state changes nothing and the status reads 36 collisions, worst error = 3.4', 36, 3.4, true],
];

describe('seven-link golden: the five snapshot states', () => {
  it('seven-link: snapshot 1: the Settings are the live state (start position, goal 1, 0 collisions)', () => {
    expect(snaps.count).toBe(5);
    expect(snap(1)).toEqual(plain(snaps.live));
  });
  for (const [k, title, collisions, worst, solved] of STATUS) {
    it(title, () => {
      const st = snap(k);
      const { state, view } = evaluate(JSON.parse(JSON.stringify(st)));
      expect(state).toEqual(st); // loc, locOld, collideState 0, collisions, isCollide False: a fixed point of the body
      expect(state.collisions).toBe(collisions);
      expect(roundTenth(view.worstError)).toBeCloseTo(worst, 9);
      expect(view.success).toBe(solved); // snapshot 5: "Congratulations! You solved goal 1 in only 36 collisions!"
    });
  }
  it('seven-link: snapshots 2 to 5: every link of the dragged robot is 140 long (Cos and Sin of the original, within 1e-12)', () => {
    for (const k of [2, 3, 4, 5]) {
      const chain = [ORIGIN, ...snap(k).loc];
      for (let i = 1; i < chain.length; i++) {
        expect(Math.abs(Math.hypot(chain[i][0] - chain[i - 1][0], chain[i][1] - chain[i - 1][1]) - LINK_LEN), `snapshot ${k} link ${i}`).toBeLessThan(1e-12);
      }
    }
  });
});
