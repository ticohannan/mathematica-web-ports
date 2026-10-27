// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/wall-friction.test.js — the model of "Moving Two Particles with Shared Control Inputs Using Wall Friction":
// the opening state from the notebook, the frame turns, the wall move (checked against the reflection it aims at), the
// search, the point keeping (with the original's missing semicolon), the progress split, the picture and the notebook's
// four snapshot settings (checked against what the snapshot pictures show). Expected values derived by hand or from the
// pictures.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, evaluate, SAVED, CONFIG_SPACE, MAX_EXPANSIONS, wallFrictionMoveDir, wallFrictionMoveUp, returnr1r2,
  ensurer1r2, rotate90, rotate270, rotate180, rotate90inplace, rotate270inplace, rotate180inplace, mirror, mirrorInplace,
  distanceMoved, optimal2robotPath, keepRobotsInWorkspaceAndSpaced, progressSplit, StringForm, realText,
} from '../../demos/wall-friction/model.js';
import { annotation, Cases } from '../../shared/graphics.js';
import { mulberry32 } from '../../shared/random.js';

const saved = JSON.parse(readFileSync(new URL('../golden/wall-friction.original-states.json', import.meta.url), 'utf8'));
const num = (x) => (Array.isArray(x) ? x.map(num) : x && typeof x === 'object' && 'n' in x ? x.n : x);
const settings = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, num(v)]));
const close = (a, b, d = 12) => { expect(a.length).toBe(b.length); a.forEach((x, i) => (Array.isArray(x) ? close(x, b[i], d) : expect(x).toBeCloseTo(b[i], d))); };
const plus = (a, b) => [a[0] + b[0], a[1] + b[1]];
const minus = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const run = (s) => evaluate({ ...initialState(), ...s });

describe('wall-friction model', () => {
  it("the opening state is the notebook's saved state, which equals its stored initial settings (ϵ = 1/20)", () => {
    expect(initialState()).toEqual(settings(saved.states[0]));
    expect(initialState()).toEqual(settings(saved.specs));
    expect(SAVED['ϵ']).toBe(1 / 20);
    const s = initialState(); s.s1[0] = 99;
    expect(SAVED.s1[0]).toBe(0.95); // a copy each time
  });
  it('the frame turns: rotate90 makes "r" push left, rotate270 makes "l" push right; the *inplace forms turn the moves', () => {
    const p = [0.3, 0.8], m = [0.1, -0.2];
    close(rotate270(rotate90(p)), p, 15); close(rotate90(rotate270(p)), p, 15); close(rotate180(rotate180(p)), p, 15);
    close(mirror(mirror(p)), p, 15);
    // a move m turns like the difference of two points
    for (const [turn, inplace] of [[rotate90, rotate90inplace], [rotate270, rotate270inplace], [rotate180, rotate180inplace], [mirror, mirrorInplace]]) {
      close(minus(turn(plus(p, m)), turn(p)), inplace(m), 15);
    }
    // "up" in the frame of "r" is −x in the workspace (N-WF-03), in the frame of "l" +x
    close(rotate270inplace([0, 1]), [-1, 0], 15);
    close(rotate90inplace([0, 1]), [1, 0], 15);
    close(rotate180inplace([0, 1]), [0, -1], 15);
    expect(rotate90([0, 0.5])[1]).toBe(1); // the left wall becomes the up wall in the frame of "r"
  });
  it('ensurer1r2 makes robot 1 the top-left robot (flip, mirror or both); returnr1r2 undoes it', () => {
    const moves = [[0, 0], [0.1, 0.2]];
    const cases = [
      [[0.2, 0.7], [0.6, 0.3], false, false], // already top left
      [[0.6, 0.7], [0.2, 0.3], true, false], // top right: mirror
      [[0.6, 0.3], [0.2, 0.7], false, true], // bottom right: flip
      [[0.2, 0.3], [0.6, 0.7], true, true], // bottom left: flip and mirror
    ];
    for (const [a, b, mir, flip] of cases) {
      const [r1, r2, g1, g2, isMirrored, isFlipped, path] = ensurer1r2(a, b, [0.4, 0.4], [0.5, 0.5], moves);
      expect([isMirrored, isFlipped]).toEqual([mir, flip]);
      expect(r1[1]).toBeGreaterThanOrEqual(r2[1]);
      expect(r1[0]).toBeLessThanOrEqual(r2[0]);
      close(path, mir ? moves.map(mirrorInplace) : moves, 15);
      close(returnr1r2(isFlipped, isMirrored, r1, r2), [a, b], 15);
      close(returnr1r2(isFlipped, isMirrored, g1, g2), [[0.4, 0.4], [0.5, 0.5]], 15);
    }
  });
  it('distanceMoved = Total[Norm /@ moves]', () => {
    expect(distanceMoved([[0, 0], [3, 4], [-0.6, 0.8]])).toBeCloseTo(6, 15);
  });
  it('wallFrictionMoveUp aims robot 1 at the mirror image of its goal (a reflection at the up wall), then sets the spacing with robot 2 alone', () => {
    const r1 = [0.2, 0.6], r2 = [0.5, 0.3], g1 = [0.3, 0.5], g2 = [0.7, 0.4];
    const [d, r1out, r2out, path, path1, path2, done] = wallFrictionMoveUp(r1, r2, g1, g2, [[0, 0]], [r1], [r2], 0.05);
    // m1 = ((1 − 0.6)/(2 − 0.5 − 0.6)·(0.3 − 0.2), 1 − 0.6): robot 1 meets the wall on the line to (0.3, 1.5)
    const m1 = [(0.4 / 0.9) * 0.1, 0.4];
    close(path, [[0, 0], m1, [0.1, 0.2]], 14);
    close(path1, [r1, [0.2 + m1[0], 1], [0.2 + m1[0], 1]], 14); // robot 1 held at the wall during m2
    close(path2, [r2, [0.5 + m1[0], 0.7], [0.6 + m1[0], 0.9]], 14);
    close(minus(r2out, r1out), minus(g2, g1), 14); // the goal spacing in one move
    expect(d).toBeCloseTo(len(m1) + len([0.1, 0.2]), 14);
    expect(done).toBe(false);
    // the base case then takes both to their goals: robot 1's path in and out of the wall at equal angles
    const fin = wallFrictionMoveDir('u', r1out, r2out, g1, g2, path, path1, path2, 0.05);
    expect(fin[6]).toBe(true);
    const out = minus(g1, r1out);
    expect(out[0] / out[1]).toBeCloseTo(-m1[0] / m1[1], 12);
    close(fin[3].at(-1), minus(g2, r2out), 14);
  });
  it('wallFrictionMoveUp: a dead end (Infinity) when robot 2 already touches the up wall or when m2 is nearly 0', () => {
    // robot 2 is the lower one after ensurer1r2: both on the up wall
    const top = wallFrictionMoveUp([0.2, 1], [0.6, 1], [0.3, 0.5], [0.4, 0.6], [[0, 0]], [[0.2, 1]], [[0.6, 1]], 0.05);
    expect(top[0]).toBe(Infinity);
    expect(top[3]).toEqual([[0, 0]]); // returned at once, no move added
    // both at the same height: both reach the wall together, robot 2 is on it, m2 = {0, 0}
    const same = wallFrictionMoveUp([0.2, 0.5], [0.6, 0.5], [0.3, 0.5], [0.8, 0.5], [[0, 0]], [[0.2, 0.5]], [[0.6, 0.5]], 0.05);
    expect(same[0]).toBe(Infinity);
    expect(same[3].at(-1)).toEqual([0, 0]);
  });
  it('wallFrictionMoveDir: base case 1 for every direction when the spacing is already the goal spacing (within 0.00001)', () => {
    const s1 = [0.2, 0.3], s2 = [0.5, 0.4], g1 = [0.6, 0.7], g2 = [0.9, 0.8];
    for (const dir of ['u', 'd', 'l', 'r']) {
      const e = wallFrictionMoveDir(dir, s1, s2, g1, g2, [[0, 0]], [s1], [s2], 0.05);
      expect(e[6]).toBe(true);
      close(e[3], [[0, 0], [0.4, 0.4]], 14);
      expect(e[4].at(-1)).toEqual(g1); expect(e[5].at(-1)).toEqual(g2);
      expect(e[0]).toBeCloseTo(0.4 * Math.SQRT2, 14);
    }
    expect(wallFrictionMoveDir('u', s1, [0.5, 0.40002], g1, g2, [[0, 0]], [s1], [s2], 0.05)[6]).toBe(false);
  });
  it('keepRobotsInWorkspaceAndSpaced: clipped to [ε, 1 − ε]; closer than ε: robot 2 moved along the line, or robot 1 toward the centre', () => {
    close(keepRobotsInWorkspaceAndSpaced([-1, 0.5], [0.5, 2], 0.05), [[0.05, 0.5], [0.5, 0.95]], 15);
    close(keepRobotsInWorkspaceAndSpaced([0.5, 0.5], [0.52, 0.5], 0.05), [[0.5, 0.5], [0.55, 0.5]], 14);
    // coincident: robot 1 ε to the left of robot 2 (to the right near the left wall)
    close(keepRobotsInWorkspaceAndSpaced([0.5, 0.5], [0.5, 0.5], 0.05), [[0.45, 0.5], [0.5, 0.5]], 15);
    close(keepRobotsInWorkspaceAndSpaced([0.06, 0.5], [0.06, 0.5], 0.05), [[0.11, 0.5], [0.06, 0.5]], 15);
    // robot 2 at the right edge: moving it would leave the workspace; the missing semicolon (E-WF-01) skips "robot 1
    // away from robot 2" (which would give (0.9, 0.6)) and puts robot 1 ε from robot 2 toward the centre
    const [p1, p2] = keepRobotsInWorkspaceAndSpaced([0.93, 0.6], [0.99, 0.6], 0.05);
    close(p2, [0.95, 0.6], 15);
    const k = 0.05 / Math.hypot(0.45, 0.1);
    close(p1, [0.95 - 0.45 * k, 0.6 - 0.1 * k], 14);
    expect(len(minus(p1, p2))).toBeCloseTo(0.05, 14);
    // points already inside and ε apart are kept
    expect(keepRobotsInWorkspaceAndSpaced([0.95, 0.95], [0.2, 0.8], 0.05)).toEqual([[0.95, 0.95], [0.2, 0.8]]);
  });
  it('progressSplit: Floor and FractionalPart of k·n/420 exactly for the slider positions k/420', () => {
    expect(progressSplit(1, 5)).toEqual([5, 0]);
    expect(progressSplit(0, 5)).toEqual([0, 0]);
    for (let n = 1; n <= 12; n++) {
      for (let k = 0; k <= 420; k++) {
        const v = 0 + k * (1 / 420); // the slider's machine value of position k
        const [q, f] = progressSplit(v, n);
        expect(q).toBe(Math.floor((k * n) / 420));
        expect(f).toBe(((k * n) % 420) / 420);
      }
    }
    expect(progressSplit(0.123, 4)).toEqual([0, 0.492]); // off the grid (hook only): a machine product
  });
  it("the search on the opening state (snapshot 1): four moves — down-left, robot 1 alone to the corner, robot 2 alone right, both to the goals", () => {
    const { view, state } = evaluate(initialState());
    expect(state).toEqual(initialState()); // the points are inside and ε apart: nothing written back
    expect(view.found).toBe(true);
    expect(view.expansions).toBe(5);
    close(view.path, [[0, 0], [-0.2, -0.09], [-0.75, 0.14], [0.28, 0], [0.05, -0.05]], 12);
    close(view.path1, [[0.95, 0.95], [0.75, 0.86], [0, 1], [0, 1], [0.05, 0.95]], 12);
    close(view.path2, [[0.2, 0.8], [0, 0.71], [0, 0.71], [0.28, 0.71], [0.33, 0.66]], 12);
    expect([view.mvNum, view.mvFrac]).toEqual([4, 0]);
    expect(view.pm1).toEqual([0.05, 0.95]); expect(view.pm2).toEqual([0.33, 0.66]);
    // optimal2robotPath returns optimalPathList[[1]] after the pop: the finished entry's copy (N-WF-02)
    expect(optimal2robotPath(...[SAVED.s1, SAVED.s2, SAVED.e1, SAVED.e2], 0.05)).toEqual([view.path, view.path1, view.path2]);
  });
  it('the picture of the opening state: workspace, markers, both paths, the Δ configuration space inset at {1.38, .45}', () => {
    const { graphics } = evaluate(initialState());
    expect(graphics.options).toEqual({ ImageSize: 600, PlotRange: [[-0.05, 1.75], [-0.05, 1.05]], PlotRangePadding: 0 });
    const ws = annotation(graphics, 'workspace').g;
    expect(ws.map((part) => part[1].head)).toEqual(['Rectangle', 'Rectangle', 'Rectangle', 'Disk', 'Disk']);
    expect(ws[2][1]).toMatchObject({ a: [0.05, 0.05], b: [0.95, 0.95] }); // the ε workspace
    expect(ws[3][1]).toMatchObject({ c: [0.2, 0.8], r: 0.05 }); // gray disks of radius ε around robot 2's start and goal
    const m1 = annotation(graphics, 'markers-1').g;
    expect(Cases(m1, 'Rectangle')[0]).toMatchObject({ a: [0.95 - 1 / 60, 0.95 - 1 / 60], b: [0.95 + 1 / 60, 0.95 + 1 / 60] });
    expect(Cases(m1, 'Circle')[0]).toMatchObject({ c: [0.05, 0.95], r: 1 / 40 });
    // four moves, but robot 1 is held during move 3 and robot 2 during move 2, and the arrow to the current position is
    // p → p at progress 1: those zero-length arrows are not drawn (N-WF-05)
    expect(Cases(annotation(graphics, 'path-1').g, 'Arrow').length).toBe(3);
    expect(Cases(annotation(graphics, 'path-2').g, 'Arrow').length).toBe(3);
    expect(Cases(annotation(graphics, 'position-1').g, 'Point').length).toBe(1); // at its goal, not on a wall
    const inset = Cases(graphics, 'Inset')[0];
    expect(inset.pos).toEqual([1.38, 0.45]);
    const o = inset.graphics.options;
    expect(o.ImageSize).toBe(230); expect(o.testid).toBe('config-plot');
    expect(o.PlotRange).toEqual([[-1, 1], [-1, 1]]);
    const epi = inset.graphics.list;
    // reachable regions for Δ = pe2 − pe1 = (0.28, −0.29): blue {Δx − 1, Δy}–{1, 0}, green {0, −1}–{Δx, 1 + Δy}
    const blue = annotation(epi, 'reach-blue').g.at(-1), green = annotation(epi, 'reach-green').g.at(-1);
    close([blue.a, blue.b], [[-0.72, -0.29], [1, 0]], 12);
    close([green.a, green.b], [[0, -1], [0.28, 0.71]], 12);
    const goal = annotation(epi, 'goal-delta').g;
    close(goal.c, [0.28, -0.29], 12); expect(goal.r).toBe(0.05);
    const cur = annotation(epi, 'current-delta').g;
    close([cur.a, cur.b], [[0.28 - 1 / 30, -0.29 - 1 / 30], [0.28 + 1 / 30, -0.29 + 1 / 30]], 12);
    close(annotation(epi, 'label-r').g.pos, [0.18, -0.39], 12);
    close(annotation(epi, 'label-g').g.pos, [0.38, -0.19], 12);
  });
  it('the blue rectangle holds what one move via a horizontal wall reaches, the green one via a vertical wall (the Details swap them, E-WF-04)', () => {
    const u = mulberry32(21);
    const inside = (q, r) => q[0] >= Math.min(r.a[0], r.b[0]) - 1e-9 && q[0] <= Math.max(r.a[0], r.b[0]) + 1e-9
      && q[1] >= Math.min(r.a[1], r.b[1]) - 1e-9 && q[1] <= Math.max(r.a[1], r.b[1]) + 1e-9;
    let checked = 0, inBoth = 0;
    for (let t = 0; t < 150; t++) {
      const p = () => [0.05 + 0.9 * u(), 0.05 + 0.9 * u()];
      const { graphics, state } = run({ s1: p(), s2: p(), e1: p(), e2: p(), progress: 0, 'ϵ': 0.001 }); // the rectangles of the starts
      const epi = Cases(graphics, 'Inset')[0].graphics.list;
      const blue = annotation(epi, 'reach-blue').g.at(-1), green = annotation(epi, 'reach-green').g.at(-1);
      for (const dir of ['u', 'd', 'l', 'r']) {
        const e = wallFrictionMoveDir(dir, state.s1, state.s2, state.e1, state.e2, [[0, 0]], [state.s1], [state.s2], 0.001);
        if (!Number.isFinite(e[0]) || e[6]) continue;
        const d = minus(e[2], e[1]); // the spacing after one move: robot 1 at the wall, robot 2 moved alone
        expect(inside(d, dir === 'u' || dir === 'd' ? blue : green)).toBe(true);
        if (inside(d, blue) && inside(d, green)) inBoth++;
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(400);
    expect(inBoth).toBeLessThan(checked / 2); // the two rectangles only overlap
  });
  it('progress 3/4 of the opening state: robot 1 at the corner (on the wall: a point with a white centre), robot 2 at the left wall', () => {
    const { view, graphics } = run({ progress: 315 * (1 / 420) });
    expect([view.mvNum, view.mvFrac]).toEqual([3, 0]);
    close(view.pm1, [0, 1], 12);
    const pos = annotation(graphics, 'position-1').g;
    expect(Cases(pos, 'Point').length).toBe(2);
    // half way through move 2: robot 1 between (0.75, 0.86) and (0, 1), robot 2 held at (0, 0.71)
    const half = run({ progress: 0.375 });
    expect([half.view.mvNum, half.view.mvFrac]).toEqual([1, 0.5]);
    close(half.view.pm1, [0.375, 0.93], 12);
    close(half.view.pm2, [0, 0.71], 12);
  });
  it('the moves panel: "move k of n", the total distance rounded to 0.01, the current move as an arrow centred at {1.55, .5}', () => {
    const { view, graphics } = run({ ifMove: 'moves' });
    expect(view.panel).toMatchObject({ move: 4, of: 4, fraction: 1, total: 1.33 });
    expect(annotation(graphics, 'move-text').g.expr.expr).toBe('move 4 of 4');
    expect(annotation(graphics, 'distance-text').g.expr.expr).toBe('total distance 1.33 ');
    const arrow = annotation(graphics, 'move-done').g;
    close(arrow.pts, [[1.525, 0.525], [1.575, 0.475]], 12); // the last move (0.05, −0.05)
    expect(Cases(graphics, 'Inset').length).toBe(0);
    // at the start of move 2 (progress 1/4): "move 2 of 4", only the faded arrow and the point at its tail
    const start = run({ ifMove: 'moves', progress: 105 * (1 / 420) });
    expect(start.view.panel).toMatchObject({ move: 2, fraction: 0 });
    expect(annotation(start.graphics, 'move-done')).toBe(null);
    close(annotation(start.graphics, 'move-point').g.pts[0], minus([1.55, 0.5], [-0.375, 0.07]), 12);
    expect(StringForm('move `` of ``', 2, 4)).toBe('move 2 of 4');
    expect([realText(1.8900000000000001), realText(2), realText(0.5)]).toEqual(['1.89', '2.', '0.5']);
  });
  it("the notebook's four snapshot settings: the moves and totals the pictures show (1.89 and 1.93), the panel chosen by the exact setter text", () => {
    const expected = { 1: { moves: 4, inset: true }, 2: { moves: 5, inset: false, total: 1.89 }, 3: { moves: 4, inset: true }, 4: { moves: 5, inset: false, total: 1.93 } };
    for (const k of Object.keys(saved.snapshots)) {
      const s = settings(saved.snapshots[k]);
      const { state, view, graphics } = evaluate(s);
      expect(state).toEqual(s); // the saved points are inside and ε apart
      expect(view.path.length - 1).toBe(expected[k].moves);
      // the robots end at their goals
      close(view.pm1, s.e1, 12); close(view.pm2, s.e2, 12);
      expect(Cases(graphics, 'Inset').length).toBe(expected[k].inset ? 1 : 0);
      if (!expected[k].inset) {
        expect(s.ifMove).toBe('Δ Configuration Space'); // not the setter's value: no button selected, the moves shown (Q-WF-01)
        expect(view.panel.total).toBeCloseTo(expected[k].total, 12);
        expect(view.panel.move).toBe(expected[k].moves);
      } else expect(s.ifMove).toBe(CONFIG_SPACE);
    }
    // snapshot 2: the last move points down and a little left, as its panel arrow; snapshot 4: down-left
    close(run(settings(saved.snapshots[2])).view.panel.vector, [-0.0529, -0.2], 3);
    close(run(settings(saved.snapshots[4])).view.panel.vector, [-0.186, -0.1059], 3);
  });
  it('the body writes the points back: clipped to the current ε workspace and ε apart', () => {
    const { state } = run({ 'ϵ': 0.1, s1: [0.05, 0.95], e2: [0.33, 0.66], e1: [0.33, 0.66] });
    expect(state.s1).toEqual([0.1, 0.9]);
    close(state.e1, [0.23, 0.66], 14); // coincident goals: e1 ε to the left of e2
    expect(state.e2).toEqual([0.33, 0.66]);
  });
  it('every move moves each robot by the shared input or leaves it at a wall; no robot leaves the workspace', () => {
    for (const k of Object.keys(saved.snapshots)) {
      const { view } = evaluate(settings(saved.snapshots[k]));
      for (const P of [view.path1, view.path2]) {
        for (let i = 1; i < P.length; i++) {
          const d = minus(P[i], P[i - 1]);
          const held = len(d) < 1e-12, moved = len(minus(d, view.path[i])) < 1e-12;
          expect(held || moved).toBe(true);
          if (held) expect(P[i].some((x) => Math.abs(x) < 1e-12 || Math.abs(x - 1) < 1e-12)).toBe(true);
          expect(P[i].every((x) => x > -1e-12 && x < 1 + 1e-12)).toBe(true);
        }
      }
    }
  });
  it('aligned pairs whose spacing must grow: every expansion is a dead end; the port gives up after MAX_EXPANSIONS and shows $Aborted', () => {
    const { view, graphics, state } = run({ s1: [0.3, 0.5], s2: [0.4, 0.5], e1: [0.2, 0.3], e2: [0.7, 0.3] });
    expect(view.found).toBe(false);
    expect(view.expansions).toBe(MAX_EXPANSIONS);
    expect(annotation(graphics, 'aborted').g.expr).toBe('$Aborted');
    expect(state.s1).toEqual([0.3, 0.5]);
    // the same spacing growth with a little height difference is found at once
    expect(run({ s1: [0.3, 0.5], s2: [0.4, 0.51], e1: [0.2, 0.3], e2: [0.7, 0.3] }).view.found).toBe(true);
  });
});
