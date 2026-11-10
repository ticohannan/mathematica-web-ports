// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/bfs-motion-planning.test.js — the model of "Breadth-First Search Robot Motion Planning" (TESTPLAN
// T-BF-01…17). Expected values by hand from the source (neighbour order, first improvement wins) and from the draft's
// independent Python reference (design/robot-motion-obstacles/ref/cspace.py, bfs.py), never from the port.
import { describe, it, expect } from 'vitest';
import {
  bfsTorus, getShortestPath, cellOf, progressIndex, cellAngles, pathLengthLabel, initialState, evaluate, blockedCount,
} from '../../demos/bfs-motion-planning/model.js';
import { applyTorus, cSpaceTable, arrayPlotColors } from '../../demos/common/arm-grid.js';
import { arrowArc } from '../../demos/common/arrow-arcs.js';
import { angleLabelVisible } from '../../demos/common/two-link.js';

const zeros = (n) => Array.from({ length: n }, () => new Array(n).fill(0));
const withBlocked = (n, cells) => { const g = zeros(n); for (const [r, c] of cells) g[r - 1][c - 1] = -1; return g; };
const pathTo = (b, start, goal) => getShortestPath(b.parent, start, goal).reverse();
const live = () => evaluate(initialState()).state;

describe('bfs-motion-planning: grid and cells', () => {
  it('applyTorus maps x < xMin to xMax, x > xMax to xMin and the same for y', () => {
    expect(applyTorus([2.85, 0])).toEqual([6.699999999999999, 0]);
    expect(applyTorus([6.75, 0])).toEqual([2.9, 0]);
    expect(applyTorus([5, -2.05])).toEqual([5, 1.7999999999999998]);
    expect(applyTorus([5, 1.85])).toEqual([5, -2]);
    expect(applyTorus([2.9, 0])).toEqual([2.9, 0]);
  });
  it('the grid holds -1 for blocked and 0 for free cells at 16Q by 16Q', () => {
    const obs = [[1.1, 1.1], [1.1, -1.1]];
    const grids = [4, 8, 16, 32, 160].map((r) => cSpaceTable(obs, r, -1, 0));
    expect(grids.map((g) => g.length)).toEqual([4, 8, 16, 32, 160]);
    expect(grids.map(blockedCount)).toEqual([0, 4, 16, 64, 1536]);
    expect(new Set(grids[3].flat())).toEqual(new Set([-1, 0]));
  });
  it('locator to cell: Round[{.5 + pS2, Max[1, pS1 + .5]}] with half-even rounding', () => {
    const c = (p) => cellOf(p, 32).cell;
    const a = cellOf([4.5, 0], 32);
    expect(a.pS).toEqual([13.473684210526319, 15.157894736842106]);
    expect(a.cell).toEqual([16, 14]);
    expect(c([5.5, 0])).toEqual([16, 22]);
    expect(c([2.9, 0])).toEqual([16, 1]);
    expect(c([6.699999999999999, 0])).toEqual([16, 32]); // Round[32.5] = 32
    expect(c([5, -2])).toEqual([32, 18]); // Round[32.5] = 32
    // a·(1/b): 3.8·(1/3.8) = 0.9999999999999999, pS2 = 3.552713678800501e-15 → row 1 (a true division: row 0; H-BF-14)
    expect(cellOf([5, 1.7999999999999998], 32).pS[1]).toBe(3.552713678800501e-15);
    expect(c([5, 1.7999999999999998])).toEqual([1, 18]);
  });
  it('Theta1 = (2c - 1) pi/L and Theta2 = -(2r - 1) pi/L at the cell centre', () => {
    expect(cellAngles([16, 22], 32)).toEqual([4.221515128261284, -3.043417883165112]);
    expect(cellAngles([16, 14], 32)).toEqual([2.650718801466388, -3.043417883165112]);
    expect(cellAngles([10, 61], 96)).toEqual([3.959715740462135, -0.6217735460229799]); // a true division: 3.9597157404621353
  });
  it('ccord = path[[Max[1, Ceiling[progress Length[path]]]]] in machine arithmetic: 0.14 of 50 cells is cell 8', () => {
    expect([0, 0.14, 0.28, 0.56, 0.58, 1].map((p) => progressIndex(p, 50))).toEqual([1, 8, 15, 29, 29, 50]);
    expect(progressIndex(0.52, 38)).toBe(20);
    expect(progressIndex(0.5, 9)).toBe(5);
    expect(14 * 0.01).toBe(0.14); // the slider value 0. + 14·0.01 equals the literal here (K-BF-08)
  });
  it('label: Round[2.0 pi/L costmap[[lE]], 0.01] shown like Mathematica (1.57, 4.)', () => {
    expect(pathLengthLabel(8.0, 32).text).toBe('robot phase space, path length = 1.57 rads');
    expect(pathLengthLabel(3.8200000000000003, 6).text).toBe('robot phase space, path length = 4. rads'); // 4.000294645571003
    expect(pathLengthLabel(0.0, 32).text).toBe('robot phase space, path length = 0. rads');
    expect(pathLengthLabel(Infinity, 32).text).toBe('robot phase space, path length = ∞ rads'); // provisional, D-BF-06
  });
  it('arrayPlotColors for the costmap: grey 1 - v/max, Infinity dark red, Green path, Blue current cell', () => {
    const a = arrayPlotColors([[0.0, 1.0, Infinity], ['Green', 'Blue', 4.0]]);
    const px = (i) => Array.from(a.data.slice(4 * i, 4 * i + 3));
    expect([0, 1, 2, 3, 4, 5].map(px)).toEqual([[255, 255, 255], [191, 191, 191], [127, 0, 0], [0, 255, 0], [0, 0, 255], [0, 0, 0]]);
  });
});

describe('bfs-motion-planning: bfsTorus and getShortestPath', () => {
  it('bfsTorus on a free 5 x 5 torus from (3, 3): costs 1.0, 1.41, 2.0, 2.41, 2.82 and the first-found parents', () => {
    const b = bfsTorus(zeros(5), [3, 3]);
    const rows = [[2.82, 2.41, 2.0, 2.41, 2.82], [2.41, 1.41, 1.0, 1.41, 2.41], [2.0, 1.0, 0.0, 1.0, 2.0], [2.41, 1.41, 1.0, 1.41, 2.41], [2.82, 2.41, 2.0, 2.41, 2.82]];
    b.lvl.forEach((row, i) => row.forEach((v, j) => expect(v).toBeCloseTo(rows[i][j], 14)));
    expect(b.parent[0]).toEqual([[2, 2], [2, 3], [2, 3], [2, 3], [2, 4]]);
    expect(b.parent[2]).toEqual([[3, 2], [3, 3], [0, 0], [3, 3], [3, 4]]);
    expect(pathTo(b, [3, 3], [1, 1])).toEqual([[3, 3], [2, 2], [1, 1]]);
    expect(pathTo(b, [3, 3], [1, 4])).toEqual([[3, 3], [2, 3], [1, 4]]);
  });
  it('bfsTorus keeps the first of two costs equal within tolerance (6 x 6 torus from (4, 4): cell (1, 2) has 3.8200000000000003 via (6, 3))', () => {
    const b = bfsTorus(zeros(6), [4, 4]);
    expect(b.lvl[0][1]).toBe(3.8200000000000003);
    expect(b.parent[0][1]).toEqual([6, 3]);
    expect(pathTo(b, [4, 4], [1, 2])).toEqual([[4, 4], [5, 4], [6, 3], [1, 2]]);
    const exact = bfsTorus(zeros(6), [4, 4], { greater: (x, y) => x > y });
    expect(exact.lvl[0][1]).toBe(3.82);
    expect(exact.parent[0][1]).toEqual([2, 2]);
  });
  it('bfsTorus allows a diagonal step between two blocked cells (corner cutting)', () => {
    const b = bfsTorus(withBlocked(5, [[2, 3], [3, 2]]), [3, 3]);
    expect(b.lvl[1][1]).toBe(1.41);
    expect(b.parent[1][1]).toEqual([3, 3]);
    expect(b.lvl[1][2]).toBe(Infinity);
    expect(b.lvl[2][1]).toBe(Infinity);
    expect(pathTo(b, [3, 3], [2, 2])).toEqual([[3, 3], [2, 2]]);
  });
  it('bfsTorus spreads from a blocked start cell', () => {
    const a = bfsTorus(withBlocked(5, [[3, 3]]), [3, 3]), b = bfsTorus(zeros(5), [3, 3]);
    expect(a.lvl).toEqual(b.lvl);
    expect(a.lvl[2][2]).toBe(0);
  });
  it('bfsTorus wraps neighbours around both edges', () => {
    const b = bfsTorus(zeros(6), [4, 4]);
    expect(b.lvl[0][0]).toBe(4.2299999999999995);
    const all = b.lvl.flat();
    expect(all.filter((v) => v === Math.max(...all))).toHaveLength(1);
    expect(pathTo(b, [4, 4], [1, 1])).toEqual([[4, 4], [5, 5], [6, 6], [1, 1]]);
  });
  it("bfsTorus returns nothing for a start outside the grid (the original's condition)", () => {
    for (const s of [[0, 18], [33, 1], [5, 0]]) expect(bfsTorus(zeros(32), s)).toBeNull();
  });
  it('getShortestPath returns only the goal when it is unreachable or equals the start', () => {
    const g = withBlocked(5, [[5, 5], [5, 1], [5, 2], [1, 5], [1, 2], [2, 5], [2, 1], [2, 2]]);
    const b = bfsTorus(g, [3, 3]);
    expect(b.lvl[0][0]).toBe(Infinity); // (1, 1)'s eight torus neighbours are blocked
    expect(getShortestPath(b.parent, [3, 3], [1, 1])).toEqual([[1, 1]]);
    expect(getShortestPath(b.parent, [3, 3], [3, 3])).toEqual([[3, 3]]);
  });
});

describe('bfs-motion-planning: one evaluation of the body', () => {
  it('the search reruns only when lS changes or the grid was recomputed, the path only when lE changes or after a search', () => {
    const s0 = live();
    const run = (patch) => { const { view } = evaluate({ ...s0, ...patch }); return [view.searched ? 1 : 0, view.walked ? 1 : 0]; };
    expect(run({ pConfigF: [5.8, 0.0] })).toEqual([0, 1]); // (a) the goal moves to another cell
    expect(run({ pConfigI: [4.52, 0.01] })).toEqual([0, 0]); // (b) the start moves within its cell
    expect(run({ pConfigI: [4.8, 0.0] })).toEqual([1, 1]); // (c) the start moves to another cell
    expect(run({ Quality: 3 })).toEqual([1, 1]); // (d) a new grid
    expect(run({ progress: 0.5 })).toEqual([0, 0]); // (e) only the current cell moves
  });
  it('both glyphs take the colour of the current arm configuration', () => {
    const s0 = live();
    const at0 = evaluate({ ...s0, pConfigI: [3.315625, 1.740625], progress: 0 });
    expect(at0.state.lS).toEqual([1, 4]);
    expect(at0.view.ccord).toEqual([1, 4]);
    expect(at0.view.inCollision).toBe(true);
    expect(at0.view.glyph).toBe('red'); // both glyphs loc[Red]
    const at1 = evaluate({ ...at0.state, progress: 1 });
    expect(at1.view.ccord).toEqual([16, 22]);
    expect(at1.view.inCollision).toBe(false);
    expect(at1.view.glyph).toBe('green');
  });
  it('the elbow arc runs from Theta1 to Theta1 + Theta2 < Theta1 and is drawn as the short arc', () => {
    const t1 = 3.959715740462135, t2 = -0.6217735460229799;
    const a = arrowArc({ center: [Math.cos(t1), Math.sin(t1)], r: 1 / 3, start: t1, end: t1 + t2 });
    expect(a.circle.end).toBe(3.337942194439155);
    const sweep = Math.abs(a.circle.end - a.circle.start);
    expect(sweep).toBeCloseTo(0.6217735460229799, 14); // 0.62 rad, not 5.66
    const angs = a.arc.map(([x, y]) => { const g = Math.atan2(y - Math.sin(t1), x - Math.cos(t1)); return g < 0 ? g + 2 * Math.PI : g; });
    for (const g of angs) { expect(g).toBeGreaterThan(3.3379); expect(g).toBeLessThan(3.9598); }
    expect(a.direction[0]).toBeCloseTo(-Math.sin(3.337942194439155), 15);
    expect(a.direction[1]).toBeCloseTo(Math.cos(3.337942194439155), 15);
    expect(angleLabelVisible(t2)).toBe(false);
  });
});

// The switch "errors of the original: kept | corrected" (A-BF-08, shared/errata.js). Expected values by hand: step
// counts on small grids times 1 and √2; the blocked-goal state is the one of the browser test "a goal inside an
// obstacle region gives a one-cell path and red glyphs".
describe('corrected mode (E-BF)', () => {
  const R2 = Math.SQRT2;
  const blockedGoal = (errata) => evaluate({ ...initialState(), pConfigF: [3.315625, 1.740625], ...(errata ? { errata } : {}) });
  it('kept: errata = "original" gives exactly the result without the variable', () => {
    const plain = evaluate(initialState()), kept = evaluate({ ...initialState(), errata: 'original' });
    expect(kept.view).toEqual(plain.view);
    const { errata, errataApplied, ...rest } = kept.state;
    expect([errata, errataApplied]).toEqual(['original', 'original']);
    expect(rest).toEqual(plain.state);
  });
  it('E-BF-02: on a free 7 x 7 torus from (4, 4) a diagonal costs √2: (5,5) √2, (6,6) 2√2, (5,6) 1 + √2, (4,6) 2', () => {
    const o = bfsTorus(zeros(7), [4, 4]), f = bfsTorus(zeros(7), [4, 4], { corrected: true });
    expect([o.lvl[4][4], o.lvl[5][5]]).toEqual([1.41, 2.82]);
    expect(f.lvl[4][4]).toBe(R2);
    expect(f.lvl[5][5]).toBeCloseTo(2 * R2, 14);
    expect(f.lvl[4][5]).toBeCloseTo(1 + R2, 14);
    expect(f.lvl[3][5]).toBe(2);
    expect(f.parent[4][4]).toEqual([4, 4]);
  });
  it('E-BF-02: the label of a path with two diagonals on a 32-cell grid is Round[(2π/32) 2√2, 0.01] = 0.56, the original\'s 0.55', () => {
    expect(pathLengthLabel(2 * R2, 32).text).toBe('robot phase space, path length = 0.56 rads'); // 0.5554
    expect(pathLengthLabel(2.82, 32).text).toBe('robot phase space, path length = 0.55 rads'); // 0.5537
  });
  it('E-BF-04: with (4,5) and (5,4) blocked the step (4,4) → (5,5) is not taken; the way round costs 3√2', () => {
    const grid = withBlocked(7, [[4, 5], [5, 4]]);
    expect(bfsTorus(grid, [4, 4]).lvl[4][4]).toBe(1.41); // the original cuts the corner
    const f = bfsTorus(grid, [4, 4], { corrected: true });
    expect(f.lvl[4][4]).toBeCloseTo(3 * R2, 12); // (4,4) → (3,5) → (4,6) → (5,5), or its mirror image
    const path = getShortestPath(f.parent, [4, 4], [5, 5], { corrected: true }).reverse();
    expect(path.length).toBe(4);
    expect(path[0]).toEqual([4, 4]);
    expect(path[3]).toEqual([5, 5]);
    // one blocked neighbour only: the diagonal is still taken
    expect(bfsTorus(withBlocked(7, [[4, 5]]), [4, 4], { corrected: true }).lvl[4][4]).toBe(R2);
  });
  it('E-BF-03: an unreachable goal — the original jumps to it and shows ∞; corrected stays at the start and says "no path exists"', () => {
    const o = blockedGoal(), f = blockedGoal('corrected');
    expect(o.state.lE).toEqual([1, 4]);
    expect(o.state.path).toEqual([[1, 4]]);
    expect(o.view.label.text).toBe('robot phase space, path length = ∞ rads');
    expect(o.view.inCollision).toBe(true);
    expect(f.state.lE).toEqual([1, 4]);
    expect(f.state.path).toEqual([f.state.lS]);
    expect(f.view.ccord).toEqual(f.state.lS);
    expect(f.view.label.text).toBe('robot phase space, no path exists');
    expect(f.view.noPath).toBe(true);
    expect(f.view.inCollision).toBe(false);
    // a reachable goal is not affected: the opening state has the same path in both modes (no diagonal: 1.57)
    const a = evaluate(initialState()), b = evaluate({ ...initialState(), errata: 'corrected' });
    expect(b.state.path).toEqual(a.state.path);
    expect(b.view.label.text).toBe('robot phase space, path length = 1.57 rads');
    expect(b.view.noPath).toBe(false);
  });
  it('E-BF-03: nothing spreads from a blocked start cell', () => {
    const grid = withBlocked(7, [[4, 4]]);
    expect(bfsTorus(grid, [4, 4]).lvl[3][4]).toBe(1); // the original searches from it
    const f = bfsTorus(grid, [4, 4], { corrected: true });
    expect(f.pushes).toBe(0);
    expect(f.lvl.flat().filter(Number.isFinite)).toEqual([0]);
  });
  it('E-BF-05: with the goal in an obstacle region the original draws both glyphs red; corrected the start green and the goal red', () => {
    const o = blockedGoal(), f = blockedGoal('corrected');
    expect([o.view.glyphStart, o.view.glyphGoal]).toEqual(['red', 'red']);
    expect([f.view.glyphStart, f.view.glyphGoal]).toEqual(['green', 'red']);
    // a start in an obstacle region: at P = 1 (the arm at the free goal) the original shows both green
    const os = evaluate({ ...initialState(), pConfigI: [3.315625, 1.740625] });
    const fs = evaluate({ ...initialState(), pConfigI: [3.315625, 1.740625], errata: 'corrected' });
    expect(os.state.lS).toEqual([1, 4]);
    expect([os.view.glyphStart, os.view.glyphGoal]).toEqual(['green', 'green']);
    expect([fs.view.glyphStart, fs.view.glyphGoal]).toEqual(['red', 'green']);
    expect(fs.view.noPath).toBe(true); // E-BF-03: nothing is searched from the colliding start
  });
  it('E-BF-07: on the bottom edge of an odd grid (L = 17) the original gives row 18, corrected row 17; inside the grid nothing changes', () => {
    expect(cellOf([5, -2], 17).cell[0]).toBe(18); // Round[17 + 0.5] = 18 (half to even), outside the grid
    expect(cellOf([5, -2], 17, { corrected: true }).cell[0]).toBe(17);
    for (const p of [[4.5, 0], [5.5, 0], [3.3, 1.7], [6.6, -1.9]]) expect(cellOf(p, 32, { corrected: true })).toEqual(cellOf(p, 32));
  });
  it('switching the mode runs the cached search again', () => {
    const s1 = evaluate({ ...initialState(), errata: 'original' });
    const s2 = evaluate({ ...s1.state, errata: 'corrected' });
    expect(s2.view.searched).toBe(true);
    expect(evaluate(s2.state).view.searched).toBe(false);
  });
});

