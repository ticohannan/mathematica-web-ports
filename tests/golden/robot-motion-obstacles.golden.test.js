// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/robot-motion-obstacles.golden.test.js — the port against the ORIGINAL's computed values stored in the
// notebook (tests/golden/robot-motion-obstacles.original-states.json: states[0] = the live state, snapshots[1…4] = the
// Settings of the four snapshot cells, specs = the initial settings; COMMON-DECISIONS §1) and against the snapshot
// pictures docs/original-snapshots/robot-motion-obstacles-1…4.png (TESTPLAN T-RM-20…27).
import { describe, it, expect } from 'vitest';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import { readPng } from '../support/png.js';
import { initialState, evaluate, blockedCount } from '../../demos/robot-motion-obstacles/model.js';
import { pointsegdis2, tableAngles, xMin, yMin, xMax } from '../../demos/common/arm-grid.js';

const fx = loadStates('tests/golden/robot-motion-obstacles.original-states.json');
const live = plain(fx.live);
const specs = plain(fx.specs);
const snaps = fx.snapshots.map((s) => plain(s));
/** a saved state with the cache forced (pObsOld = {-3, -2}), so the grid is computed again */
const forced = (s) => evaluate({ ...s, pObsOld: [-3, -2] });

describe('robot-motion golden: saved states of the original', () => {
  it('robot-motion: the first evaluation of the initial settings gives the saved 64 x 64 grid (240 blocked cells)', () => {
    const { state, view } = evaluate(initialState());
    expect(state.freeConfigSpace).toHaveLength(64);
    expect(state.freeConfigSpace).toEqual(live.freeConfigSpace);
    expect(blockedCount(live.freeConfigSpace)).toBe(240);
    expect(state.highRes).toBe(true);
    for (const k of ['pObs', 'pObs2', 'pConfig', 'Quality', 'pObsOld', 'pObs2Old', 'QualityOld', 'highRes']) expect(state[k], k).toEqual(live[k]);
    expect(view.recomputed).toBe(true);
    // the live state = the initial settings = snapshot 1's Settings (F-RM-12)
    expect(specs).toEqual(live);
    expect(snaps[0]).toEqual(live);
  });
  it('robot-motion: snapshot 2 settings (Q 5.31) give the saved 169 x 169 grid (4600 blocked cells)', () => {
    const s = snaps[1];
    expect(s.Quality).toBe(5.3100000000000005);
    expect(s.pObs).toEqual([0.2330000000000001, 0.685]);
    const { state } = forced(s);
    expect(state.freeConfigSpace).toHaveLength(169);
    expect(state.freeConfigSpace).toEqual(s.freeConfigSpace);
    expect(blockedCount(s.freeConfigSpace)).toBe(4600);
  });
  it('robot-motion: snapshot 3 settings (Q 8) give the saved 256 x 256 grid (10133 blocked cells)', () => {
    const s = snaps[2];
    expect(s.Quality).toBe(8);
    const { state } = forced(s);
    expect(state.freeConfigSpace).toHaveLength(256);
    expect(state.freeConfigSpace).toEqual(s.freeConfigSpace);
    expect(blockedCount(s.freeConfigSpace)).toBe(10133);
  });
  it('robot-motion: snapshot 4 settings (Q 5.31, obstacle 2 outside the locator range) give the saved 169 x 169 grid (1484 blocked cells)', () => {
    const s = snaps[3];
    expect(s.pObs2).toEqual([2.1, 1.1]); // outside the locator range -2…2 (Q-RM-07)
    const { state } = forced(s);
    expect(state.freeConfigSpace).toHaveLength(169);
    expect(state.freeConfigSpace).toEqual(s.freeConfigSpace);
    expect(state.pObs2).toEqual([2.1, 1.1]);
    expect(blockedCount(s.freeConfigSpace)).toBe(1484);
  });
  it('robot-motion: evaluating a saved state again changes nothing (cache condition false)', () => {
    for (const s of [live, ...snaps]) {
      const { state, view } = evaluate(s);
      expect(view.recomputed).toBe(false);
      expect(state.freeConfigSpace).toBe(s.freeConfigSpace);
      expect(state.pConfig).toEqual(s.pConfig);
      expect(state).toEqual(s);
    }
  });
  it('robot-motion: every sample of the saved grids is at least 5e-6 from the 1/4 threshold', () => {
    // min over the cells of |min over obstacles and links of the distance - 1/4| (design ref/margins.py: 1.7e-3, 2.2e-4,
    // 9.6e-6, 9.7e-5): a last-bit difference of the arithmetic cannot change any saved cell (D-RM-01, K-RM-06)
    const margins = snaps.map((s) => {
      const angs = tableAngles(32 * s.Quality), obs = [s.pObs, s.pObs2];
      let m = Infinity;
      for (const a2 of angs) for (const a1 of angs) {
        const e = [Math.cos(a1), Math.sin(a1)], f = [e[0] + Math.cos(a1 - a2), e[1] + Math.sin(a1 - a2)];
        const d = Math.min(pointsegdis2([[[0, 0], e], obs]), pointsegdis2([[e, f], obs]));
        m = Math.min(m, Math.abs(d - 0.25));
      }
      return m;
    });
    expect(margins.map((m) => Number(m.toExponential(1)))).toEqual([1.7e-3, 2.2e-4, 9.6e-6, 9.7e-5]);
    for (const m of margins) expect(m).toBeGreaterThan(5e-6);
  });
});

// The snapshot pictures: 1299 × 825 px at 2× resolution; the phase-space inset spans x 707…1197, y 226…716 px.
const pictures = [1, 2, 3, 4].map((k) => readPng(`docs/original-snapshots/robot-motion-obstacles-${k}.png`));
const INSET = { x0: 707, y0: 226, side: 490 };
const isGlyphGreen = ([r, g, b]) => g > r + 40 && g > b + 40;

describe('robot-motion golden: the snapshot pictures', () => {
  it('robot-motion: the snapshot pictures show the saved grids (at least 99 percent of cell centres agree)', () => {
    const result = snaps.map((s, k) => {
      const grid = s.freeConfigSpace, n = grid.length, img = pictures[k];
      let checked = 0, differ = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          // ArrayPlot stretches the n cells over the whole inset, row 1 at the top (also for n = 169, Q-RM-02)
          const p = img.pixel(Math.floor(INSET.x0 + ((j + 0.5) * INSET.side) / n), Math.floor(INSET.y0 + ((i + 0.5) * INSET.side) / n));
          if (isGlyphGreen(p)) continue;
          checked++;
          if ((p[0] < 128 ? 1 : 0) !== grid[i][j]) differ++;
        }
      }
      return { checked, differ };
    });
    for (const { checked, differ } of result) expect(differ / checked).toBeLessThan(0.01);
    expect(result[0].differ).toBe(0);
  });
  it('robot-motion: snapshot 1 shows Q 2, a green glyph at {5, 0} and the arm at 198.9 and 189.5 degrees', () => {
    const img = pictures[0];
    // world → picture: the inset corners (xMin, yMin + side) ↔ (707, 226) and (xMax, yMin) ↔ (1197, 716)
    const s = INSET.side / (xMax - xMin);
    const toPx = ([x, y]) => [Math.round(INSET.x0 + (x - xMin) * s), Math.round(INSET.y0 + (yMin + (xMax - xMin) - y) * s)];
    const { view, state } = evaluate(snaps[0]);
    expect(state.Quality).toBe(2);
    expect((view.Theta1 * 180) / Math.PI).toBeCloseTo(198.9, 1);
    expect((view.Theta2 * 180) / Math.PI).toBeCloseTo(189.5, 1);
    // the green glyph is centred at the inset point of {5, 0}
    const [gx, gy] = toPx([5, 0]);
    let green = 0;
    for (let dx = -8; dx <= 8; dx++) for (let dy = -8; dy <= 8; dy++) if (isGlyphGreen(img.pixel(gx + dx, gy + dy))) green++;
    expect(green).toBeGreaterThan(20);
    // the elbow point (black) at about (210, 500) and the base point at about (333, 458): link 1 points down-left
    const [ex, ey] = toPx(view.geometry.elbow);
    expect(Math.abs(ex - 210)).toBeLessThan(3);
    expect(Math.abs(ey - 500)).toBeLessThan(3);
    expect(Math.max(...img.pixel(ex, ey))).toBeLessThan(90);
    const [bx, by] = toPx([0, 0]);
    expect(Math.max(...img.pixel(bx, by))).toBeLessThan(90);
    // the brown obstacles at about (476, 319) and (476, 603)
    for (const p of [[1.1, 1.1], [1.1, -1.1]]) {
      const [ox, oy] = toPx(p);
      expect(Math.abs(ox - 476) + Math.abs(oy - (p[1] > 0 ? 319 : 603))).toBeLessThan(6);
      const [r, g, b] = img.pixel(ox + 3, oy + 3);
      expect(r > g && g > b && r > 90).toBe(true);
    }
  });
});
