// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Richard Cangelosi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/lotka-volterra-competition.test.js — the model of "Lotka-Volterra Competition Model" against values from
// outside the port: the saved states and snapshot Settings of the notebook, hand derivations (the equilibria of the
// rescaled equations, the invariant line of the saddle case with r1 = r2) and an independent RK4 integration here.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  initialState, evaluate, SPECS, RESET, field, communityEquilibrium, equilibria, portraitCase, timeSolution, sepICS,
  separatrices, basinPolygons, nearCorner, percentTicks, plotLabel, PALE_BLUE, LIGHT_GRAY, jacobian,
} from '../../demos/lotka-volterra-competition/model.js';
import { annotation } from '../../shared/graphics.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/lotka-volterra-competition.original-states.json', 'utf8'));
const snap = (k) => ({ ...fx.snapshots[k] });
/** An independent fixed-step RK4 of the rescaled equations (written here, not the port's NDSolve). */
function rk4(s, [x, y], T, h = 0.001) {
  const A = (s.α * s.k2) / s.k1, B = (s.β * s.k1) / s.k2;
  const f = (u, v) => [s.r1 * u * (1 - u - A * v), s.r2 * v * (1 - v - B * u)];
  for (let t = 0; t < T - 1e-12; t += h) {
    const k1 = f(x, y), k2 = f(x + (h / 2) * k1[0], y + (h / 2) * k1[1]), k3 = f(x + (h / 2) * k2[0], y + (h / 2) * k2[1]), k4 = f(x + h * k3[0], y + h * k3[1]);
    x += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); y += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  }
  return [x, y];
}
/** Point in polygon (even-odd rule). */
const inside = ([px, py], pts) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

describe('lotka-volterra-competition model', () => {
  it('the opening state is the saved live state and the initial settings', () => {
    expect(initialState()).toEqual(fx.states[0]);
    expect(SPECS).toEqual(fx.specs);
  });
  it('the reset button sets the original values (not the initial ones)', () => {
    expect(RESET).toEqual({ α: 0.63, β: 0.53, k1: 120, k2: 120, r1: 0.15, r2: 0.15 });
  });
  it('the rescaled equations and the equilibria (hand derivation)', () => {
    const s = { α: 0.5, β: 0.25, r1: 1, r2: 2, k1: 200, k2: 100 }; // A = α k2/k1 = 0.25, B = β k1/k2 = 0.5
    expect(field(s)(0.4, 0.2)).toEqual([1 * 0.4 * (1 - 0.4 - 0.25 * 0.2), 2 * 0.2 * (1 - 0.2 - 0.5 * 0.4)]);
    // 1 − x − A y = 0, 1 − y − B x = 0 → x = (1 − A)/(1 − A B) = 0.75/0.875, y = (1 − B)/(1 − A B) = 0.5/0.875
    const [x, y] = communityEquilibrium(s);
    expect(x).toBeCloseTo(0.75 / 0.875, 14);
    expect(y).toBeCloseTo(0.5 / 0.875, 14);
    for (const p of equilibria(s)) for (const v of field(s)(...p)) expect(Math.abs(v)).toBeLessThan(1e-15);
    expect(equilibria(s)).toHaveLength(4);
  });
  it('the three cases at the snapshot settings', () => {
    expect(portraitCase(snap(1))).toBe('coexistence');
    expect(portraitCase(snap(2))).toBe('coexistence');
    expect(portraitCase(snap(3))).toBe('exclusion');
    expect(portraitCase(snap(4))).toBe('bistable');
    // snapshot 3: xEq = (1 − 0.62)/(1 − 0.775) = 1.6889 > 1
    expect(communityEquilibrium(snap(3))[0]).toBeCloseTo(0.38 / 0.225, 12);
    expect(plotLabel('bistable')[1]).toContain('light gray - basin of attraction for species 1');
  });
  it('the time solution agrees with an independent RK4 (snapshots 1, 3 and 4)', () => {
    for (const k of [1, 3, 4]) {
      const sol = timeSolution(snap(k));
      for (const t of [5, 30, 120]) {
        const ref = rk4(snap(k), [0.35, 0.35], t);
        expect(Math.abs(sol(t)[0] - ref[0])).toBeLessThan(1e-7);
        expect(Math.abs(sol(t)[1] - ref[1])).toBeLessThan(1e-7);
      }
    }
    // snapshot 1: both settle at the community equilibrium (0.5555, 0.7056), as the time plot of the snapshot shows
    const { view } = evaluate(snap(1));
    expect(view.u120).toBeCloseTo(0.37 / (1 - 0.63 * 0.53), 6);
    expect(view.v120).toBeCloseTo(0.47 / (1 - 0.63 * 0.53), 6);
  });
  it('sepICS gives the four eigen-directions of the saddle in increasing angle', () => {
    const s = snap(4), p0 = communityEquilibrium(s), J = jacobian(s)(...p0);
    const ics = sepICS(s, p0, 1e-7);
    expect(ics.map((c) => c.t)).toEqual([...ics.map((c) => c.t)].sort((a, b) => a - b));
    for (const { t } of ics) { // J d ∥ d
      const d = [Math.cos(t), Math.sin(t)], Jd = [J[0][0] * d[0] + J[0][1] * d[1], J[1][0] * d[0] + J[1][1] * d[1]];
      expect(Math.abs(d[0] * Jd[1] - d[1] * Jd[0])).toBeLessThan(1e-12);
    }
    // first: the stable direction up and right (both components of the eigenvector positive)
    expect(Math.cos(ics[0].t)).toBeGreaterThan(0);
    expect(Math.sin(ics[0].t)).toBeGreaterThan(0);
  });
  it('the separatrices of snapshot 4: the invariant line y = (1 − β)/(1 − α) x and the branches to (0, 1) and (1, 0)', () => {
    const s = snap(4), lines = separatrices(s);
    expect(lines).toHaveLength(4);
    // r1 = r2, k1 = k2: on y = m x, y'/y = x'/x needs m = (1 − β)/(1 − α) = 8/9 — the stable manifold is that line
    const m = (1 - s.β) / (1 - s.α);
    expect(lines[0][0][0]).toBeCloseTo(1, 12);
    expect(lines[0][0][1]).toBeCloseTo(m, 6);
    for (const [x, y] of lines[2]) expect(Math.abs(y - m * x)).toBeLessThan(1e-6);
    expect(lines[1].at(-1)[0]).toBeLessThan(1e-6); // to (0, 1)
    expect(lines[1].at(-1)[1]).toBeCloseTo(1, 6);
    expect(lines[3].at(-1)[0]).toBeCloseTo(1, 6); // to (1, 0)
    expect(lines[3].at(-1)[1]).toBeLessThan(1e-6);
  });
  it('the basins: pale blue above the separatrix (species 2 wins), light gray below (species 1 wins)', () => {
    const polys = basinPolygons(separatrices(snap(4)));
    expect(polys.map((p) => p.colour)).toEqual([PALE_BLUE, PALE_BLUE, LIGHT_GRAY, LIGHT_GRAY]);
    expect(PALE_BLUE.rgb.map((c) => +c.toFixed(4))).toEqual([0.7467, 0.92, 0.928]); // .05 → .3667 → .7467 …
    expect(LIGHT_GRAY.rgb.map((c) => +c.toFixed(4))).toEqual([0.8667, 0.8667, 0.8667]);
    const which = (q) => polys.filter((p) => inside(q, p.pts)).map((p) => p.colour);
    expect(which([0.1, 0.9])).toEqual([PALE_BLUE]);
    expect(which([0.5, 0.95])).toEqual([PALE_BLUE]);
    expect(which([0.9, 0.1])).toEqual([LIGHT_GRAY]);
    expect(which([0.9, 0.6])).toEqual([LIGHT_GRAY]);
    // a point in a blue region tends to (0, 1), one in a gray region to (1, 0)
    expect(rk4(snap(4), [0.5, 0.95], 200)[1]).toBeCloseTo(1, 3);
    expect(rk4(snap(4), [0.9, 0.6], 200)[0]).toBeCloseTo(1, 3);
    expect(nearCorner([0.005, 0.999])).toEqual([[0, 1]]);
    expect(nearCorner([1, 0.8889])).toEqual([]);
  });
  it('percent ticks as PercentForm writes them', () => {
    expect(percentTicks(0.25)).toEqual([[0, '0%'], [0.25, '25%'], [0.5, '50%'], [0.75, '75%'], [1, '100%']]);
    expect(percentTicks(0.5).map((t) => t[1])).toEqual(['0%', '50%', '100%']);
  });
  it('the pictures of each case have their parts', () => {
    const g1 = evaluate(snap(1)).graphics[0].list, g3 = evaluate(snap(3)).graphics[0].list, g4 = evaluate(snap(4)).graphics[0].list;
    for (const id of ['stream-lines', 'stream-arrows', 'equilibria', 'u-nullcline', 'v-nullcline', 'axis-green', 'axis-brown']) expect(annotation(g1, id)).toBeTruthy();
    expect(annotation(g3, 'axis-arrows')).toBeTruthy();
    expect(annotation(g3, 'u-nullcline')).toBeFalsy();
    for (const id of ['basins', 'separatrices', 'stream-lines']) expect(annotation(g4, id)).toBeTruthy();
    expect(annotation(evaluate(snap(1)).graphics[1].list, 'stream-lines')).toBeFalsy();
  });
  describe('corrected mode (E-LV)', () => {
    const slow = { ...SPECS, α: 1.45, β: 1.4, r1: 0.05, r2: 0.05 };
    it('kept: with r1 = r2 = 0.05 the separatrices stop near the saddle after t = 1000 (the original)', () => {
      const ends = evaluate(slow).view.sepEnds;
      expect(ends[1][1]).toBeCloseTo(0.39, 2);
      expect(ends[3][0]).toBeCloseTo(0.44, 2);
    });
    it('corrected: the separatrices end at (0, 1) and (1, 0), where an independent RK4 run to t = 10⁴ goes', () => {
      const ends = evaluate({ ...slow, errata: 'corrected' }).view.sepEnds;
      expect(ends[1]).toEqual([0, 1]);
      expect(ends[3]).toEqual([1, 0]);
      // independent: from the saddle a little along the unstable direction (up-left), a long RK4 run reaches (0, 1)
      const p0 = communityEquilibrium(slow), [{ t }] = sepICS(slow, p0, 1e-7).slice(1, 2);
      const far = rk4(slow, [p0[0] + 1e-4 * Math.cos(t), p0[1] + 1e-4 * Math.sin(t)], 10000, 0.05);
      expect(far[0]).toBeLessThan(1e-3);
      expect(far[1]).toBeCloseTo(1, 3);
      // and the basins are coloured right again: (0.5, 0.95) blue, (0.9, 0.6) gray
      const polys = basinPolygons(separatrices({ ...slow, errata: 'corrected' }));
      expect(polys.filter((p) => inside([0.5, 0.95], p.pts)).map((p) => p.colour)).toEqual([PALE_BLUE]);
      expect(polys.filter((p) => inside([0.9, 0.6], p.pts)).map((p) => p.colour)).toEqual([LIGHT_GRAY]);
    });
    it('corrected changes nothing visible at the opening settings and snapshot 4', () => {
      const a = evaluate(snap(4)).view.sepEnds, b = evaluate({ ...snap(4), errata: 'corrected' }).view.sepEnds;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) expect(Math.abs(a[i][j] - b[i][j])).toBeLessThan(1e-6);
    });
  });
  it('α β = 1: the community equilibrium is not a number and the port draws the exclusion case (D-LV-03)', () => {
    const s = { ...SPECS, α: 0.5, β: 2 };
    expect(Number.isFinite(communityEquilibrium(s)[0])).toBe(false);
    expect(portraitCase(s)).toBe('exclusion');
    expect(equilibria(s)).toHaveLength(3);
  });
});
