// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Kenneth E. Caviness
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/longitudinal-standing-waves.test.js — the model of "Longitudinal Standing Waves". Expected values come from
// hand derivations, small independent computations here, the notebook's saved states and snapshot Settings, and
// numbers read off the original's snapshot pictures and saved definitions.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  initialState, evaluate, pts, lineData, makePts, unionNear, hArrows, hArrowsX, dlabels, plabels, pipecaps, myArrow, fRight, fLeft,
  λSaved, L, H, ε, arrowDivisions, transverseIcon,
} from '../../demos/longitudinal-standing-waves/model.js';
import { annotation, Cases } from '../../shared/graphics.js';
import { createRng } from '../../shared/random.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/longitudinal-standing-waves.original-states.json', 'utf8'));
const open3 = { n: 3, end: 'open', options: [1, 4, 7, 8], t: 0 };
// the curves of the plot: the Lines drawn by Plot (before the Epilog), in the order of transverseShown
const plotLines = (g) => g.list.filter((p) => Array.isArray(p) && p.some((q) => q.head === 'Line')).map((p) => p.find((q) => q.head === 'Line'));
const lambda = (n, end) => (end === 'closed' ? (4 * L) / (2 * n - 1) : (2 * L) / n); // the Details' relations, by hand

describe('longitudinal-standing-waves model', () => {
  it('the opening state is the live state of the notebook and its initial settings', () => {
    expect(initialState()).toEqual(fx.states[0]);
    expect(initialState()).toEqual(fx.specs);
  });

  it('the wavelength: 4L/(2n − 1) for a closed pipe, 2L/n for an open pipe and for none', () => {
    for (let n = 1; n <= 7; n++) {
      for (const end of ['open', 'closed', 'none']) expect(evaluate({ ...open3, n, end }).view.λ, `${n} ${end}`).toBeCloseTo(lambda(n, end), 14);
    }
    expect(evaluate({ ...open3, n: 1, end: 'closed' }).view.λ).toBe(28); // the fundamental of a closed pipe: 4L
    expect(evaluate({ ...open3, n: 7, end: 'closed' }).view.λ).toBeCloseTo(28 / 13, 15);
  });

  it('which waves each option shows: the intersections of the original (by hand)', () => {
    const shown = (s) => { const v = evaluate({ ...open3, ...s }).view; return [v.longitudinalShown, v.densityShown, v.transverseShown, v.filling]; };
    expect(shown({})).toEqual([[1], [], [4, 5, 6, 7], 1]);
    expect(shown({ n: 7, end: 'closed', options: [4, 2, 6] })).toEqual([[2], [], [2, 6, 7], null]);
    expect(shown({ n: 7, end: 'closed', options: [1, 8, 6, 5, 9, 10] })).toEqual([[], [1], [1, 4, 5, 6, 7], 2]);
    // without option 6 the waves 1–3 are not drawn transversely; without 4 or 5 not longitudinally
    expect(shown({ options: [1, 2, 3] })).toEqual([[], [], [6, 7], null]);
    expect(shown({ options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })).toEqual([[1, 2, 3], [1, 2, 3], [1, 2, 3, 4, 5, 6, 7], 4]);
    // an endless pipe: no reflected wave (3) and no transverse envelope (8)
    expect(shown({ end: 'none', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })).toEqual([[1, 2], [1, 2], [1, 2, 6, 7], null]);
    // the toggle order does not matter
    expect(shown({ options: [8, 7, 4, 1] })).toEqual(shown({}));
  });

  it('the waves use the saved wavelength 28/9 for every harmonic (E-LS-01, Q-LS-01), as the snapshot pictures show', () => {
    expect(λSaved).toBe(28 / 9);
    for (const x of [0, 0.7, 2.5, 6.1]) {
      expect(fRight(x + 28 / 9, 0.3)).toBeCloseTo(fRight(x, 0.3), 12);
      expect(fLeft(x + 28 / 9, 0.3)).toBeCloseTo(fLeft(x, 0.3), 12);
    }
    // snapshot 2 (n = 7, closed): the blue curve's maxima lie at 35, 268 and 500 px of the picture (75 px per unit):
    // 3.10 units apart — the saved 28/9 = 3.11, not this harmonic's 28/13 = 2.15
    const period = (500 - 35) / 2 / 75;
    expect(Math.abs(period - 28 / 9)).toBeLessThan(0.03);
    const v = evaluate(fx.snapshots[2]).view;
    expect(v.λWaves).toBe(28 / 9);
    expect(v.λ).toBeCloseTo(28 / 13, 15);
  });

  it('the transverse curves: sum, right + ε, left − ε, envelope ±H cos 2πx/λ, pipe ∓(H + 2ε)', () => {
    const t = 0.15, s = { n: 2, end: 'open', options: [1, 2, 3, 6, 8], t };
    const { view, graphics } = evaluate(s);
    expect(view.transverseShown).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const lines = plotLines(graphics);
    expect(lines).toHaveLength(7);
    const k = (2 * Math.PI) / λSaved, kl = (2 * Math.PI) / 7;
    const f = [
      (x) => 0.3 * (Math.cos(k * x - 2 * Math.PI * t) + Math.cos(k * x + 2 * Math.PI * t)),
      (x) => 0.3 * Math.cos(k * x - 2 * Math.PI * t) + 0.01,
      (x) => 0.3 * Math.cos(k * x + 2 * Math.PI * t) - 0.01,
      (x) => 0.6 * Math.cos(kl * x), (x) => -0.6 * Math.cos(kl * x), () => -0.62, () => 0.62,
    ];
    lines.forEach((ln, i) => { for (const [x, y] of ln.pts) expect(y, `curve ${i + 1} at ${x}`).toBeCloseTo(f[i](x), 12); });
    expect(lines[0].pts[0][0]).toBe(0);
    expect(lines[0].pts.at(-1)[0]).toBe(L);
  });

  it('Filling between the two envelope curves, grey at Opacity 0.2', () => {
    const { graphics } = evaluate(open3);
    const fill = graphics.list.find((p) => Array.isArray(p) && p.some((q) => q.head === 'Polygon'));
    const poly = fill.find((q) => q.head === 'Polygon').pts;
    for (const [x, y] of poly) expect(Math.abs(y)).toBeCloseTo(Math.abs(0.6 * Math.cos((2 * Math.PI * x) / (14 / 3))), 12);
    expect(fill.find((q) => q.dir === 'opacity').value).toBe(0.2);
    expect(fill.find((q) => q.dir === 'color').rgb).toEqual([0.5, 0.5, 0.5]);
    expect(plotLines(evaluate({ ...open3, options: [1, 4] }).graphics)).toHaveLength(2); // only the pipe
  });

  it('lineData = Range[-0.8(2L), L + 0.8(2L), .01L]: 421 values, the ends as stored in the notebook', () => {
    expect(lineData).toHaveLength(421);
    expect(lineData[0]).toBe(-11.200000000000001);
    expect(lineData[1]).toBe(-11.13);
    expect(lineData.at(-1)).toBe(18.200000000000003);
  });

  it('contour lines: each x of lineData moved by 0.07λ(fRight + fLeft), only those inside the pipe (independent computation)', () => {
    const s = { n: 4, end: 'closed', options: [1, 2, 3, 4], t: 0.37 };
    const { view, graphics } = evaluate(s);
    const λ = 28 / 7, kw = (2 * Math.PI) / (28 / 9), w = 2 * Math.PI * s.t;
    const xs = Array.from({ length: 421 }, (_, i) => -11.2 + 0.07 * i);
    const moved = [
      xs.map((x) => x + 0.07 * λ * (Math.cos(kw * x - w) + Math.cos(kw * x + w))),
      xs.map((x) => x + 0.07 * λ * Math.cos(kw * x - w)),
      xs.map((x) => x + 0.07 * λ * Math.cos(kw * x + w)),
    ].map((l) => l.filter((x) => x >= 0 && x <= L));
    expect(view.longitudinalShown).toEqual([1, 2, 3]);
    view.contourX.forEach((l, i) => {
      expect(l.length, `wave ${i + 1}`).toBe(moved[i].length);
      l.forEach((x, j) => expect(x).toBeCloseTo(moved[i][j], 10));
    });
    const c = annotation(graphics, 'contours').g;
    expect(c.map((p) => p[0].rgb)).toEqual([[0, 0, 0], [0, 0, 1], [1, 0, 0]]); // black sum, blue right, red left
    expect(c[1][1][0].pts).toEqual([[view.contourX[1][0], -H], [view.contourX[1][0], H]]);
  });

  it('the contour lines fold over in the original: the map x ↦ x + 0.07λ·2cos(2πx/λw) is not monotonic (by hand)', () => {
    // slope 1 − 0.14λ·(2π/λw)·sin(…): its smallest value at the opening settings is 1 − 0.14·(14/3)·2π·9/28 = −0.32
    const x = evaluate(open3).view.contourX[0];
    const lines = Array.from({ length: 421 }, (_, i) => lineData[i]).map((u) => u + 0.07 * (14 / 3) * 2 * Math.cos((2 * Math.PI * u) / (28 / 9)));
    expect(lines.some((u, i) => i > 0 && u < lines[i - 1])).toBe(true);
    expect(x.some((u, i) => i > 0 && u < x[i - 1])).toBe(true);
    expect(1 - 0.14 * (14 / 3) * 2 * Math.PI * (9 / 28)).toBeLessThan(0);
  });

  it('the point cloud: 5000 random points, sorted, no two closer than 0.1, about as many as the 1718 of the original', () => {
    expect(pts.length).toBeGreaterThan(1718 * 0.97);
    expect(pts.length).toBeLessThan(1718 * 1.03);
    for (let i = 1; i < pts.length; i++) expect(pts[i][0] > pts[i - 1][0] || (pts[i][0] === pts[i - 1][0] && pts[i][1] >= pts[i - 1][1])).toBe(true);
    let close = 0;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length && pts[j][0] - pts[i][0] < 0.1; j++) if (Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]) < 0.1) close++;
    expect(close).toBe(0);
    for (const [x, y] of pts) { expect(x).toBeGreaterThanOrEqual(-11.2 - 1e-12); expect(x).toBeLessThanOrEqual(18.2 + 1e-12); expect(Math.abs(y)).toBeLessThanOrEqual(0.6); }
    // reproducible (seeded), and another seed gives another cloud of the same kind
    expect(makePts()).toEqual(pts);
    const other = makePts(createRng({ seed: 7 }));
    expect(other).not.toEqual(pts);
    expect(Math.abs(other.length - 1718)).toBeLessThan(60);
  });

  it('Union with SameTest keeps a point unless it is near a point kept before it (in canonical order)', () => {
    expect(unionNear([[1, 0], [0, 0], [0.05, 0], [0.12, 0], [0.2, 0]], 0.1)).toEqual([[0, 0], [0.12, 0], [1, 0]]);
    expect(unionNear([[0, 0.5], [0, 0], [0.05, 0.3]], 0.1)).toEqual([[0, 0], [0, 0.5], [0.05, 0.3]]);
  });

  it('density points: the cloud moved by 0.07λ(…) along x, only those inside the pipe (independent computation)', () => {
    const s = { n: 7, end: 'closed', options: [1, 2, 3, 5], t: 0.2 };
    const { view, graphics } = evaluate(s);
    const λ = 28 / 13, kw = (2 * Math.PI) / (28 / 9), w = 2 * Math.PI * s.t;
    const g = [(x) => Math.cos(kw * x - w) + Math.cos(kw * x + w), (x) => Math.cos(kw * x - w), (x) => Math.cos(kw * x + w)];
    const expected = g.map((f) => pts.map(([x, y]) => [x + 0.07 * λ * f(x), y]).filter(([x]) => x >= 0 && x <= L));
    expect(view.densityCounts).toEqual(expected.map((l) => l.length));
    const d = annotation(graphics, 'density').g;
    d.forEach((wave, i) => wave[1].forEach((p, j) => { expect(p.pts[0][0]).toBeCloseTo(expected[i][j][0], 10); expect(p.pts[0][1]).toBe(expected[i][j][1]); }));
    // about 7/29.4 of the cloud lies in the pipe
    expect(view.densityCounts[1]).toBeGreaterThan(pts.length * 0.2);
    expect(view.densityCounts[1]).toBeLessThan(pts.length * 0.28);
  });

  it('hArrows: arrows between the massaged x-coordinates; n = 1 open (snapshot 6) by hand', () => {
    // x + 0.075·14·sin(4πx/14) at x = 0, 1, …, 7 (λ/14 = 1 apart)
    const hand = [0, 1, 2, 3, 4, 5, 6, 7].map((x) => x + 1.05 * Math.sin((4 * Math.PI * x) / 14));
    hArrowsX(1, L, 14, 'open').forEach((x, i) => expect(x).toBeCloseTo(hand[i], 12));
    const [, , rows] = hArrows(1, L, 14, 'open');
    expect(rows).toHaveLength(5); // y = H·{−0.8, −0.4, 0, 0.4, 0.8}
    rows.forEach((row, r) => {
      expect(row).toHaveLength(7);
      expect(row.filter((p) => p.head === 'Point')).toHaveLength(1); // 3.46 … 3.54 is shorter than 0.1
      expect(row[3].pts[0][0]).toBeCloseTo((hand[3] + hand[4]) / 2, 12);
      expect(row[3].pts[0][1]).toBeCloseTo(0.6 * [-0.8, -0.4, 0, 0.4, 0.8][r], 15);
      const a = row[0];
      expect(a.head).toBe('Arrow');
      expect(a.pts[0][0]).toBeCloseTo(hand[0] + ε, 12); // set back by ε at both ends
      expect(a.pts[1][0]).toBeCloseTo(hand[1] - ε, 12);
    });
    // closed pipes add the end L; the number of steps per wavelength
    expect(hArrowsX(2, L, 28 / 3, 'closed').at(-1)).toBe(L);
    expect([arrowDivisions(1, 'closed'), arrowDivisions(1, 'open'), arrowDivisions(2, 'closed'), arrowDivisions(5, 'open'), arrowDivisions(6, 'none')]).toEqual([26, 14, 14, 10, 6]);
    expect(hArrows(3, L, 14, 'none')).toEqual([]);
    expect(hArrows(1, L, 14, 'open')).toBe(hArrows(1, L, 14, 'open')); // memoized
    expect(myArrow([1, 1.05], 0.2)).toEqual({ head: 'Point', pts: [[1.025, 0.2]] });
  });

  it('node labels: N_d at λ/4 + kλ/2, A_d at kλ/2 (y 0.8); A_p and N_p there at y −0.85; a closed end is N_d, A_p', () => {
    const pos = (lab) => lab.map((t) => [t.expr.a + t.expr.b, +t.pos[0].toFixed(12), t.pos[1]]);
    const [[nd], [ad]] = dlabels(7, L, 28 / 13, 'closed');
    expect(pos(nd)).toEqual([1, 3, 5, 7, 9, 11, 13].map((j) => ['Nd', +(j * 7 / 13).toFixed(12), 0.8]));
    expect(pos(ad)).toEqual([0, 2, 4, 6, 8, 10, 12].map((j) => ['Ad', +(j * 7 / 13).toFixed(12), 0.8]));
    const [[ap], [np]] = plabels(1, L, 14, 'open');
    expect(pos(ap)).toEqual([['Ap', 3.5, -0.85]]);
    expect(pos(np)).toEqual([['Np', 0, -0.85], ['Np', 7, -0.85]]);
    // snapshot 7 (n = 1, closed): A_d at the open end, N_d at the closed end
    const [[nd1], [ad1]] = dlabels(1, L, 28, 'closed');
    expect(pos(nd1)).toEqual([['Nd', 7, 0.8]]);
    expect(pos(ad1)).toEqual([['Ad', 0, 0.8]]);
  });

  it('options 7, 9, 10 add the arrows and labels, except for an endless pipe', () => {
    const all = { n: 3, end: 'open', options: [7, 9, 10], t: 0 };
    for (const id of ['longitudinal-envelope', 'displacement-labels', 'pressure-labels']) expect(annotation(evaluate(all).graphics, id), id).toBeTruthy();
    for (const id of ['longitudinal-envelope', 'displacement-labels', 'pressure-labels']) expect(annotation(evaluate({ ...all, end: 'none' }).graphics, id), id).toBeFalsy();
    expect(annotation(evaluate({ ...all, options: [] }).graphics, 'longitudinal-envelope')).toBeFalsy();
  });

  it('pipe caps: nothing for open, a line at L + ε for closed, a zigzag between L and L + 0.08 for none', () => {
    expect(annotation(evaluate(open3).graphics, 'pipe-cap').g).toEqual([]);
    expect(annotation(evaluate({ ...open3, end: 'closed' }).graphics, 'pipe-cap').g.pts).toEqual([[7.01, -0.61], [7.01, 0.61]]);
    const zig = annotation(evaluate({ ...open3, end: 'none' }).graphics, 'pipe-cap').g.pts;
    expect(zig).toHaveLength(12);
    expect(zig[0][0][0]).toBe(7);
    expect(zig[0][1][0]).toBeCloseTo(7.08, 12);
    expect(zig[0][0][1]).toBeCloseTo(-0.62, 12);
    expect(zig[11][1][1]).toBeCloseTo(0.62, 12);
    expect(pipecaps[1]).toBe(annotation(evaluate({ ...open3, end: 'closed' }).graphics, 'pipe-cap').g);
  });

  it('an endless pipe: the "sum" is the right-moving wave alone', () => {
    const { view } = evaluate({ n: 2, end: 'none', options: [1, 2, 4], t: 0.4 });
    expect(view.contourX[0]).toEqual(view.contourX[1]);
  });

  it('the picture: Plot of x from 0 to L, y range −1 … 1, 546 × 150 px (ImageSize {550, 150} with AspectRatio Automatic), no axes', () => {
    const o = evaluate(open3).graphics.options;
    expect(o.PlotRange).toEqual([[0, 7], [-1, 1]]);
    expect(o.PlotRangePadding).toEqual([0.02, 0]);
    expect(o.ImageSize).toBeCloseTo(546, 9);
    expect(o.Axes).toBe(false);
    expect(Cases(transverseIcon, 'Line')[0].pts[0]).toEqual([0, 1]); // the toggler icon: Cos on 0 … 3π
  });

  it('the seven snapshot settings: wavelengths and what is shown (Settings of the snapshot cells)', () => {
    const want = {
      1: [14 / 3, [1], [], [4, 5, 6, 7]],
      2: [28 / 13, [2], [], [2, 6, 7]],
      3: [28 / 13, [1], [], [4, 5, 6, 7]],
      4: [28 / 13, [], [1], [1, 4, 5, 6, 7]],
      5: [14, [1], [], [4, 5, 6, 7]],
      6: [14, [], [], [4, 5, 6, 7]],
      7: [28, [1], [], [4, 5, 6, 7]],
    };
    expect(Object.keys(fx.snapshots)).toHaveLength(7);
    for (const [k, s] of Object.entries(fx.snapshots)) {
      const v = evaluate(s).view;
      expect(v.λ, k).toBeCloseTo(want[k][0], 14);
      expect([v.longitudinalShown, v.densityShown, v.transverseShown], k).toEqual(want[k].slice(1));
    }
  });
});

describe('corrected mode (E-LS)', () => {
  const corr = (s) => evaluate({ ...s, errata: 'corrected' }).view;
  it('kept is the original: the waves use 28/9; corrected: the own wavelength of the harmonic', () => {
    expect(evaluate({ ...open3, errata: 'original' }).view.λWaves).toBe(28 / 9);
    expect(corr(open3).λWaves).toBeCloseTo(14 / 3, 15);
  });
  it('the standing wave at the open end x = L: 0 in the original (a node), −H = −0.6 corrected (an antinode, by hand)', () => {
    expect(evaluate(open3).view.sumAtEnd).toBeCloseTo(0, 12); // 0.6 cos(2π·7·9/28) = 0.6 cos(4.5π)
    expect(corr(open3).sumAtEnd).toBeCloseTo(-0.6, 12); // 0.6 cos(2π·7·3/14) = 0.6 cos(3π)
    for (const t of [0, 0.1, 0.3]) expect(corr({ ...open3, n: 4, end: 'closed', t }).sumAtEnd).toBeCloseTo(0, 12); // a closed end: a node
  });
  it('corrected: the contour lines never fold over (slope 1 − 0.88 sin > 0) and bunch at the displacement nodes', () => {
    for (let n = 1; n <= 7; n++) {
      for (const end of ['open', 'closed']) {
        const x = corr({ n, end, options: [1, 4], t: 0 }).contourX[0];
        expect(x.every((u, i) => i === 0 || u > x[i - 1]), `${n} ${end}`).toBe(true);
      }
    }
    // n = 1 closed (snapshot 7, Details' snapshot 6): the lines are closest at the closed end (a displacement node)
    const x = corr({ n: 1, end: 'closed', options: [1, 4], t: 0 }).contourX[0];
    const gaps = x.slice(1).map((u, i) => u - x[i]);
    expect(gaps.indexOf(Math.min(...gaps))).toBeGreaterThan(gaps.length - 3);
  });
  it('corrected: the transverse standing wave fits its envelope at t = 0', () => {
    const { graphics } = evaluate({ n: 7, end: 'closed', options: [1, 6, 8], t: 0, errata: 'corrected' });
    const [sum, env] = plotLines(graphics);
    for (const [x, y] of sum.pts) expect(y).toBeCloseTo(0.6 * Math.cos((2 * Math.PI * x) / (28 / 13)), 12);
    expect(env.pts.length).toBeGreaterThan(10);
  });
});
