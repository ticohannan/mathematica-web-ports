// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/bfs-motion-planning.golden.test.js — the port against the ORIGINAL's computed values stored in the
// notebook (tests/golden/bfs-motion-planning.original-states.json: states[0] = the live state, snapshots[1…4] = the
// Settings of the four snapshot cells with grid, cost map, parents, path, lS, lE; specs = the initial settings;
// COMMON-DECISIONS §1) and against the pictures docs/original-snapshots/bfs-motion-planning-1…4.png (T-BF-18…29).
import { describe, it, expect } from 'vitest';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import { readPng } from '../support/png.js';
import { initialState, evaluate, bfsTorus, cellOf, blockedCount } from '../../demos/bfs-motion-planning/model.js';
import { cSpaceTable, xMin, yMin, xMax } from '../../demos/common/arm-grid.js';

const fx = loadStates('tests/golden/bfs-motion-planning.original-states.json');
const live = plain(fx.live);
const specs = plain(fx.specs);
const snaps = fx.snapshots.map((s) => plain(s));
const saved = [live, ...snaps.slice(1)]; // the live state = snapshot 1's Settings
/** bit-for-bit equality (Object.is on every number, Infinity included) */
const same = (a, b) => (Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i])) : Object.is(a, b));
const forced = (s) => evaluate({ ...s, pObsOld: [-3, -2] });
function expectSame(state, s, what = ['freeConfigSpace', 'costmap', 'parents', 'path', 'lS', 'lE']) {
  for (const k of what) expect(same(state[k], s[k]), k).toBe(true);
}

describe('bfs golden: saved states of the original', () => {
  it('bfs: the first evaluation of the initial settings gives the saved grid, costmap, parents and 9-cell path bit for bit', () => {
    const { state } = evaluate(initialState());
    expectSame(state, live);
    expect(state.freeConfigSpace).toHaveLength(32);
    expect(blockedCount(live.freeConfigSpace)).toBe(64);
    expect(Math.max(...live.costmap.flat().filter(Number.isFinite))).toBeCloseTo(24.1, 10);
    expect(live.path).toHaveLength(9);
    expect([state.updatedCspace, state.updatedcostmap, state.highRes]).toEqual([false, false, true]);
    expect(specs).toEqual(live); // the initial settings = the live state (F-BF-14)
    expect(snaps[0]).toEqual(live);
  });
  it('bfs: snapshot 2 settings reproduce grid, costmap, parents and the 15-cell path bit for bit', () => {
    const s = snaps[1];
    expect(s.pObs2).toEqual([0.038000000000000256, -1.0899999999999999]);
    const { state } = forced(s);
    expectSame(state, s);
    expect(blockedCount(s.freeConfigSpace)).toBe(160);
    expect(s.path).toHaveLength(15);
    expect([s.lS, s.lE]).toEqual([[13, 8], [16, 22]]);
  });
  it('bfs: snapshot 4 settings reproduce grid, costmap, parents and the 50-cell path bit for bit', () => {
    const s = snaps[3];
    expect(s.Quality).toBe(6);
    const { state } = forced(s);
    expectSame(state, s);
    expect(state.freeConfigSpace).toHaveLength(96);
    expect(blockedCount(s.freeConfigSpace)).toBe(516);
    expect(s.path).toHaveLength(50);
    expect([s.lS, s.lE]).toEqual([[77, 12], [10, 61]]);
  });
  it('bfs: the snapshot 3 grid belongs to obstacle 2 at its default (1.1, -1.1), not to the saved position', () => {
    const s = snaps[2];
    expect(s.pObs2).toEqual([1.278, -0.33999999999999986]);
    expect(s.pObs2Old).toEqual(s.pObs2);
    expect(same(cSpaceTable([s.pObs, [1.1, -1.1]], 112, -1, 0), s.freeConfigSpace)).toBe(true);
    const atSaved = cSpaceTable([s.pObs, s.pObs2], 112, -1, 0);
    let onlySaved = 0, onlyStale = 0;
    atSaved.forEach((row, i) => row.forEach((v, j) => { if (v === -1 && s.freeConfigSpace[i][j] === 0) onlySaved++; if (v === 0 && s.freeConfigSpace[i][j] === -1) onlyStale++; }));
    expect([onlySaved, onlyStale]).toEqual([579, 358]);
    expect(blockedCount(atSaved)).toBe(1078);
  });
  it('bfs: snapshot 3 settings keep their stale grid and reproduce costmap, parents and the 38-cell path from it', () => {
    const s = snaps[2];
    expect([s.Quality, s.progress]).toEqual([7, 0.52]);
    const { state, view } = evaluate({ ...s, updatedCspace: true }); // the cache keeps the stale grid; the search runs on it
    expect(view.gridRecomputed).toBe(false);
    expectSame(state, s);
    expect(blockedCount(state.freeConfigSpace)).toBe(857);
    expect(Math.max(...s.costmap.flat().filter(Number.isFinite))).toBe(86.59999999999988);
    expect(state.path).toHaveLength(38);
    expect([state.lS, state.lE, view.ccord]).toEqual([[79, 7], [42, 97], [60, 3]]);
  });
  it('bfs: an exact Greater does not reproduce the saved costmaps (542 of 1024 entries differ at the initial settings)', () => {
    const diffs = saved.map((s) => {
      const b = bfsTorus(s.freeConfigSpace, s.lS, { greater: (x, y) => x > y });
      const flat = s.costmap.flat();
      return b.lvl.flat().filter((v, i) => !Object.is(v, flat[i])).length;
    });
    expect(diffs).toEqual([542, 407, 3990, 4010]);
    // and the tolerant Greater reproduces all of them
    for (const s of saved) expect(same(bfsTorus(s.freeConfigSpace, s.lS).lvl, s.costmap)).toBe(true);
  });
  it('bfs: lS and lE of the five saved states follow from the locator positions', () => {
    const cells = [live, ...snaps].map((s) => [cellOf(s.pConfigI, s.freeConfigSpace.length).cell, cellOf(s.pConfigF, s.freeConfigSpace.length).cell]);
    expect(cells).toEqual([live, ...snaps].map((s) => [s.lS, s.lE]));
    expect(cells.slice(1)).toEqual([[[16, 14], [16, 22]], [[13, 8], [16, 22]], [[79, 7], [42, 97]], [[77, 12], [10, 61]]]);
  });
  it('bfs: evaluating a saved state again changes nothing (no search, no path update)', () => {
    for (const s of [live, ...snaps]) {
      const { state, view } = evaluate(s);
      expect([view.gridRecomputed, view.searched, view.walked]).toEqual([false, false, false]);
      expect(same(state.costmap, s.costmap)).toBe(true);
      expect(state).toEqual(s);
    }
  });
});

// The pictures: 1299 × 878 px at 2× resolution; the cost-map inset spans x 707…1197, y 279…769 px.
const pictures = [1, 2, 3, 4].map((k) => readPng(`docs/original-snapshots/bfs-motion-planning-${k}.png`));
const INSET = { x0: 707, y0: 279, side: 490 };
const S = INSET.side / (xMax - xMin); // px per world unit
const toPx = ([x, y]) => [Math.round(INSET.x0 + (x - xMin) * S), Math.round(INSET.y0 + (yMin + (xMax - xMin) - y) * S)];
const cellPx = (i, j, n) => [Math.round(INSET.x0 + ((j - 0.5) * INSET.side) / n), Math.round(INSET.y0 + ((i - 0.5) * INSET.side) / n)];
const nearGlyph = (s, [x, y]) => [s.pConfigI, s.pConfigF].some((p) => { const [gx, gy] = toPx(p); return Math.hypot(x - gx, y - gy) < 24; });

describe('bfs golden: the snapshot pictures', () => {
  it('bfs: the snapshot labels read path length = 1.57, 2.99, 2.58 and 4.31 rads', () => {
    const views = snaps.map((s) => evaluate(s).view);
    expect(views.map((v) => v.label.text)).toEqual([1.57, 2.99, 2.58, 4.31].map((x) => `robot phase space, path length = ${x} rads`));
    const raw = snaps.map((s) => (2 * (Math.PI * (1 / s.costmap.length))) * s.costmap[s.lE[0] - 1][s.lE[1] - 1]);
    raw.forEach((v, i) => expect(v).toBeCloseTo([1.5707963267948966, 2.9904035071357846, 2.581715962825039, 4.307254427765501][i], 14));
    expect(snaps.map((s) => [s.Quality, s.progress])).toEqual([[2, 1], [2, 1], [7, 0.52], [6, 1]]);
  });
  it('bfs: snapshot greys follow 255 (1 - cost/max) and blocked cells are dark red (127, 0, 0)', () => {
    snaps.forEach((s, k) => {
      const n = s.costmap.length, img = pictures[k];
      const onPath = new Set(s.path.map(([r, c]) => `${r},${c}`));
      const finite = s.costmap.flat().filter((v, i) => Number.isFinite(v) && !onPath.has(`${Math.floor(i / n) + 1},${(i % n) + 1}`));
      const max = Math.max(...finite);
      const xs = [], ys = [];
      let infCells = 0, infRed = 0;
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= n; j++) {
          const px = cellPx(i, j, n);
          if (onPath.has(`${i},${j}`) || nearGlyph(s, px)) continue;
          const [r, g, b] = img.pixel(...px), v = s.costmap[i - 1][j - 1];
          if (!Number.isFinite(v)) { infCells++; if (Math.abs(r - 127) <= 3 && g <= 3 && b <= 3) infRed++; continue; }
          xs.push(v / max); ys.push((r + g + b) / 3);
        }
      }
      expect(infRed, `snapshot ${k + 1}: dark red Infinity cells`).toBe(infCells);
      // least-squares line grey = a + b·(v/max)
      const m = xs.length, sx = xs.reduce((p, q) => p + q, 0), sy = ys.reduce((p, q) => p + q, 0);
      const sxx = xs.reduce((p, q) => p + q * q, 0), sxy = xs.reduce((p, q, i) => p + q * ys[i], 0);
      const b = (m * sxy - sx * sy) / (m * sxx - sx * sx), a = (sy - b * sx) / m;
      expect(a, `snapshot ${k + 1}: intercept`).toBeGreaterThan(250);
      expect(a).toBeLessThan(256);
      expect(b, `snapshot ${k + 1}: slope`).toBeLessThan(-249);
      expect(b).toBeGreaterThan(-257);
    });
  });
  it('bfs: snapshots show the saved path in green and the current cell in blue', () => {
    snaps.forEach((s, k) => {
      const n = s.costmap.length, img = pictures[k], { view } = evaluate(s);
      let checked = 0, green = 0;
      for (const [i, j] of s.path) {
        if (i === view.ccord[0] && j === view.ccord[1]) continue;
        const px = cellPx(i, j, n);
        if (nearGlyph(s, px)) continue;
        checked++;
        const [r, g, b] = img.pixel(...px);
        if (r < 30 && g > 225 && b < 30) green++;
      }
      expect(checked, `snapshot ${k + 1}`).toBeGreaterThan(4);
      expect(green / checked, `snapshot ${k + 1}: green path cells`).toBeGreaterThan(0.9);
    });
    for (const k of [2, 3]) { // snapshots 3 and 4: the blue cell is not under a glyph
      const s = snaps[k], { view } = evaluate(s);
      const [r, g, b] = pictures[k].pixel(...cellPx(view.ccord[0], view.ccord[1], s.costmap.length));
      expect([r < 40, g < 40, b > 200], `snapshot ${k + 1}: blue cell ${view.ccord}`).toEqual([true, true, true]);
    }
  });
  it('bfs: snapshot 4 draws the elbow arc as the short arc of 35.6 degrees', () => {
    const { view } = evaluate(snaps[3]);
    expect(view.ccord).toEqual([10, 61]);
    expect([view.Theta1, view.Theta2]).toEqual([3.959715740462135, -0.6217735460229799]);
    expect((view.Theta2 * 180) / Math.PI).toBeCloseTo(-35.6, 1);
    expect([view.geometry.theta1Label.visible, view.geometry.theta2Label.visible]).toEqual([true, false]);
    // in the picture: grey arc pixels on the short arc (between θ1 + θ2 and θ1), none on the long one
    const img = pictures[3], e = view.geometry.elbow, r = 1 / 3;
    const dark = (ang) => {
      const [x, y] = toPx([e[0] + r * Math.cos(ang), e[1] + r * Math.sin(ang)]);
      let best = 255;
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) best = Math.min(best, img.pixel(x + dx, y + dy)[0]);
      return best;
    };
    expect(dark((view.Theta1 + (view.Theta1 + view.Theta2)) / 2)).toBeLessThan(160);
    expect(dark(view.Theta1 + view.Theta2 - 1.5)).toBeGreaterThan(230);
  });
});
