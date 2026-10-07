// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/prm-seven-link.test.js — model of the seven-link robot puzzle (expected values derived by hand
// from the original's formulas, R-16).
import { describe, it, expect } from 'vitest';
import {
  segmentIntersectionQ, lineIntersectionPoint, angDiff, initialState, evaluate, restart, goalJoints,
  LOC_START, ORIGIN, LINK_LEN, THETA_STEP, LIST_OF_ALL_LINES, OBS, roundTenth,
} from '../../demos/prm-seven-link/model.js';

const ang = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]);
const settle = () => evaluate(initialState()).state; // the first evaluation after opening

describe('seven-link geometry helpers', () => {
  it('segmentIntersectionQ: crossing segments intersect, separate ones do not', () => {
    expect(segmentIntersectionQ([[[0, 0], [2, 2]], [[0, 2], [2, 0]]])).toBe(true);
    expect(segmentIntersectionQ([[[0, 0], [1, 1]], [[3, 0], [4, 1]]])).toBe(false);
  });
  it('segmentIntersectionQ: touching at an end point counts (inclusive 0 <= Gamma <= 1)', () => {
    expect(segmentIntersectionQ([[[0, 0], [1, 0]], [[1, -1], [1, 1]]])).toBe(true);
  });
  it('segmentIntersectionQ: parallel and collinear overlapping segments do NOT count (original quirk)', () => {
    expect(segmentIntersectionQ([[[0, 0], [2, 0]], [[1, 0], [3, 0]]])).toBe(false);
    expect(segmentIntersectionQ([[[0, 0], [2, 0]], [[0, 1], [2, 1]]])).toBe(false);
  });
  it('lineIntersectionPoint of the two diagonals of a square is its centre', () => {
    expect(lineIntersectionPoint([[[0, 0], [2, 2]], [[0, 2], [2, 0]]])).toEqual([1, 1]);
  });
  it('angDiff wraps the difference into (-pi, pi] and is 0 for equal angles', () => {
    expect(angDiff(0.3, 0.3)).toBe(0);
    expect(angDiff(0.1, 2 * Math.PI - 0.1)).toBeCloseTo(0.2, 12);
    expect(angDiff(2 * Math.PI - 0.1, 0.1)).toBeCloseTo(-0.2, 12);
  });
  it('the obstacle list has 7 polygons and 42 edges', () => {
    expect(OBS.length).toBe(7);
    expect(LIST_OF_ALL_LINES.length).toBe(OBS.reduce((s, o) => s + o.length, 0));
  });
});

describe('seven-link Manipulate body', () => {
  it('the start configuration is collision free and the first evaluation sets collideState to 0', () => {
    const { state } = evaluate(initialState());
    expect(state.isCollide).toBe(false);
    expect(state.collideState).toBe(0);
    expect(state.locOld).toEqual(LOC_START);
  });
  it('a drag moves the link by at most 0.05 rad per evaluation', () => {
    const st = settle();
    const before = ang(st.loc[5], st.loc[6]);
    st.loc[6] = [st.loc[5][0] + 140, st.loc[5][1]]; // pointer far away: angle 0
    const { state } = evaluate(st);
    const after = ang(state.loc[5], state.loc[6]);
    expect(Math.abs(angDiff(after, before))).toBeCloseTo(THETA_STEP, 12);
    expect(Math.hypot(state.loc[6][0] - state.loc[5][0], state.loc[6][1] - state.loc[5][1])).toBeCloseTo(LINK_LEN, 9);
  });
  it('only the first changed locator is processed (Break)', () => {
    const st = settle();
    st.loc[2] = [st.loc[2][0] + 30, st.loc[2][1]];
    st.loc[5] = [st.loc[5][0] + 30, st.loc[5][1]];
    const { state } = evaluate(st);
    // joint 3 moved by the rule; joint 6 was overwritten by the relative translation of joints 4..7
    const d3 = [state.loc[2][0] - LOC_START[2][0], state.loc[2][1] - LOC_START[2][1]];
    expect(state.loc[5][0] - LOC_START[5][0]).toBeCloseTo(d3[0], 12);
    expect(state.loc[5][1] - LOC_START[5][1]).toBeCloseTo(d3[1], 12);
  });
  it('relative movement translates all following joints by the displacement of the dragged joint', () => {
    const st = settle();
    st.loc[3] = [st.loc[3][0] - 50, st.loc[3][1] + 20];
    const { state } = evaluate(st);
    const d = [state.loc[3][0] - LOC_START[3][0], state.loc[3][1] - LOC_START[3][1]];
    for (let j = 4; j < 7; j++) {
      expect(state.loc[j][0] - LOC_START[j][0]).toBeCloseTo(d[0], 12);
      expect(state.loc[j][1] - LOC_START[j][1]).toBeCloseTo(d[1], 12);
    }
  });
  it('absolute movement rotates all following links by the same angle', () => {
    const st = { ...settle(), movement: 'absolute' };
    const old = [ORIGIN, ...LOC_START];
    st.loc[3] = [st.loc[3][0] - 50, st.loc[3][1] + 20];
    const { state } = evaluate(st);
    const neu = [ORIGIN, ...state.loc];
    const dTheta = angDiff(ang(neu[3], neu[4]), ang(old[3], old[4]));
    for (let j = 4; j < 7; j++) expect(angDiff(ang(neu[j], neu[j + 1]), ang(old[j], old[j + 1]))).toBeCloseTo(dTheta, 9);
  });
  it('first entry into a collision counts once and keeps loc, then the next colliding update reverts loc', () => {
    let st = settle();
    // swing the last link (joint 6 at (144, 306)) toward obstacle 5 (x 200..410, y 218..263) in small updates
    let r;
    for (let k = 0; k < 200; k++) {
      st.loc[6] = [300, 230];
      r = evaluate(st);
      st = r.state;
      if (st.isCollide) break;
    }
    expect(st.isCollide).toBe(true);
    expect(st.collisions).toBe(1);
    expect(r.view.beep).toBe(true);
    expect(st.loc).not.toEqual(st.locOld); // the colliding position is kept in loc, the robot is drawn at locOld
    const held = st.locOld.map((p) => [...p]);
    st.loc[6] = [300, 230];
    const r2 = evaluate(st);
    expect(r2.state.collisions).toBe(1);
    expect(r2.state.isCollide).toBe(true);
    expect(r2.state.loc).toEqual(held);
  });
  it('a joint outside the workspace counts as a collision', () => {
    // hand-built chain: the start configuration with link 6->7 turned horizontal to the left, joint 7 at (4, 306):
    // length 140, clear of every obstacle (obstacle 4 ends at y = 263), but x = 4 < minX = 18
    const base = settle();
    const out = base.loc.map((p) => [...p]);
    out[6] = [4, 306];
    expect(Math.hypot(out[6][0] - out[5][0], out[6][1] - out[5][1])).toBe(140);
    const r = evaluate({ ...base, loc: out, locOld: out.map((p) => [...p]) });
    expect(r.state.isCollide).toBe(true);
    // the same link turned to the right (joint 7 at (284, 306)) is inside the workspace and clear
    const ins = base.loc.map((p) => [...p]);
    ins[6] = [284, 306];
    expect(evaluate({ ...base, loc: ins, locOld: ins.map((p) => [...p]) }).state.isCollide).toBe(false);
  });
  it('the first link (base to joint 1) is not collision-tested, and it can never reach an obstacle', () => {
    // joint 1 is always 140 from the base (445, 846), so y >= 706, while every obstacle ends at y = 620
    expect(ORIGIN[1] - LINK_LEN).toBeGreaterThan(Math.max(...OBS.flat().map((p) => p[1])));
    // a base->joint-1 link straight down WOULD cross obstacle edges if it were long enough, which is why the
    // original's omission (Q-SL-03) has no visible effect
    expect(LIST_OF_ALL_LINES.some((e) => segmentIntersectionQ([[ORIGIN, [ORIGIN[0], 100]], e]))).toBe(true);
  });
  it('restart resets collisions, isCollide and both locator lists', () => {
    const st = { ...settle(), collisions: 3, isCollide: true, loc: LOC_START.map(([x, y]) => [x + 1, y]) };
    const r = restart(st);
    expect(r.collisions).toBe(0);
    expect(r.isCollide).toBe(false);
    expect(r.loc).toEqual(LOC_START);
    expect(r.locOld).toEqual(LOC_START);
  });
  it('goal configuration: og starts at the base and has 8 points, links of length 140', () => {
    for (let g = 1; g <= 7; g++) {
      const og = goalJoints(g);
      expect(og.length).toBe(8);
      expect(og[0]).toEqual(ORIGIN);
      for (let k = 0; k < 7; k++) expect(Math.hypot(og[k + 1][0] - og[k][0], og[k + 1][1] - og[k][1])).toBeCloseTo(140, 9);
    }
  });
  it('success needs worst error < 20 and no collision in the PREVIOUS evaluation', () => {
    const og = goalJoints(1);
    const st = { ...settle(), loc: og.slice(1), locOld: og.slice(1) };
    const r = evaluate(st);
    expect(r.view.worstError).toBeLessThan(1e-9);
    expect(r.view.success).toBe(true);
    expect(evaluate({ ...st, isCollide: true }).view.success).toBe(false);
  });
  it('Round[x, .1] display rounding', () => {
    expect(roundTenth(669.6789)).toBeCloseTo(669.7, 12);
  });
});
