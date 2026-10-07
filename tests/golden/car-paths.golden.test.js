// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Francesco Bernardini and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/car-paths.golden.test.js — the port against the ORIGINAL notebook's saved state
// (tests/golden/car-paths.original-state.json) and the numbers in its snapshot pictures (docs/original-snapshots).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { evaluate, initialState, getOptimalPath, pathLength } from '../../demos/car-paths/carpaths.js';
import { mmaNumberString } from '../../shared/mma-extra.js';

const saved = JSON.parse(fs.readFileSync('tests/golden/car-paths.original-state.json', 'utf8')).state;
// owner state 1 (Mathematica 15.0.1, saved 2026-10-06): non-integer poses, so the original computed with machine numbers
const owner1 = JSON.parse(fs.readFileSync('tests/golden/car-paths.owner-state-1.json', 'utf8')).state;
const exact = JSON.parse(fs.readFileSync('tests/unit/fixtures/car-paths-python-reference.json', 'utf8')).exactDefault;
const ulp = (x) => { const b = new Float64Array([Math.abs(x)]); const i = new BigInt64Array(b.buffer); i[0] += 1n; return b[0] - Math.abs(x); };
const label = (view) => `path length: ${mmaNumberString(view.pathLengthValue, { isReal: true })}   distance: ${mmaNumberString(view.distanceValue, { isReal: true })}`;
const withMarkers = (s, sTheta, g, gTheta) => [s, [s[0] + 2 * Math.cos(sTheta), s[1] + 2 * Math.sin(sTheta)], g, [g[0] + 2 * Math.cos(gTheta), g[1] + 2 * Math.sin(gTheta)]];

describe('car-paths golden', () => {
  it('car-paths: the saved state is the state after the first evaluation of the initial settings', () => {
    const { state } = evaluate(initialState());
    expect(state.locs).toEqual(saved.locs);
    expect(state.locsOld).toEqual(saved.locsOld);
    expect(state.progress).toBe(saved.progress);
    expect(state.progressOld).toBe(saved.progressOld);
    expect(state.minRadius).toBe(saved.minRadius);
    expect(state.type).toBe(saved.type);
    // the path word (steering and gear of each element) exactly; the parameters within 1 ulp — see the next test
    expect(state.optPath.map((e) => [e[1], e[2]])).toEqual(saved.optPath.map((e) => [e[1], e[2]]));
    state.optPath.forEach((e, i) => expect(Math.abs(e[0] - saved.optPath[i][0])).toBeLessThanOrEqual(ulp(saved.optPath[i][0])));
  });
  it('car-paths: getOptimalPath of the saved inputs equals the saved optPath, 3 of 4 parameters bit for bit', () => {
    const start = [-10, -5, -Math.PI / 2];
    const goal = [8, 5, Math.atan2(-1, 2)];
    const [opt] = getOptimalPath(start, goal, 3);
    const same = opt.filter((e, i) => e[0] === saved.optPath[i][0]).length;
    expect(same).toBe(3);
    expect(opt[1][0]).toBe(1.5707963267948966); // the exact Pi/2 of path8
    expect(opt[2][0]).toBe(4.699796477066468);
    expect(opt[3][0]).toBe(1.1100509962911302);
    expect(opt[0][0]).toBe(0.6464033872903241); // saved: 0.6464033872903242 (one ulp more)
  });
  it('car-paths: the saved optPath is the correctly rounded exact result (why the port differs by 1 ulp)', () => {
    // The original's initial settings are EXACT numbers (integer locators, minRadius 3), so Mathematica evaluated the
    // formulas symbolically and N[path] rounded once. A 300-bit evaluation rounded once (fixture, mpmath) reproduces the
    // saved parameters exactly; every machine-arithmetic order of t = Theta + pi/2 + a gives 0.6464033872903241 (D-CP-01).
    expect(exact.params).toEqual(saved.optPath.map((e) => e[0]));
  });
  it('car-paths: evaluating the saved state again keeps locators, settings and path word', () => {
    const { state } = evaluate({ ...saved });
    expect(state.locs).toEqual(saved.locs);
    expect(state.locsOld).toEqual(saved.locsOld);
    expect(state.progressOld).toBe(-1);
    expect(state.optPath.map((e) => [e[1], e[2]])).toEqual(saved.optPath.map((e) => [e[1], e[2]]));
  });
  it('car-paths: snapshot 1 label reads path length 24.08 and distance 20.62', () => {
    // docs/original-snapshots/car-paths-1.png: "path length: 24.08   distance: 20.62" (initial settings)
    const { view } = evaluate({ ...saved });
    expect(label(view)).toBe('path length: 24.08   distance: 20.62');
    expect(pathLength(saved.optPath) * 3).toBeCloseTo(exact.pathLengthTimesRadius, 12);
  });
  it('car-paths: snapshot 2 (Dubins, both headings turned by pi) reads path length 26.47 and distance 20.62', () => {
    // car-paths-2.png: same positions as snapshot 1, start marker above the start (heading pi/2), goal marker up-left of
    // the goal (heading ArcTan[-2, 1]), type Dubins, progress 0.745. Poses read off the picture.
    const locs = [[-10, -5], [-10, -3], [8, 5], [6, 6]];
    const { view, state } = evaluate({ ...initialState(), locs, locsOld: locs.map((p) => [...p]), type: 'Dubins', progress: 0.745 });
    expect(label(view)).toBe('path length: 26.47   distance: 20.62');
    expect(state.optPath.map((e) => e[1])).toEqual([1, 0, -1]); // RSL: right arc at the start, left loop at the goal
  });
  it('car-paths: snapshots 3 and 4 (r_min 8.142, poses read off the pictures) give about 18.18 and 56.43', () => {
    // car-paths-3.png / -4.png: start locator near (-2.10, -2.03) heading up, goal locator near (3.64, -1.64) heading
    // about 1.65 rad; labels 18.18 (Reeds-Shepp, four arcs, no straight) and 56.43 (Dubins), distance 5.76.
    // The poses are estimated from pixels, so the comparison has a tolerance.
    const locs = withMarkers([-2.096, -2.03], Math.PI / 2, [3.64, -1.64], 1.65);
    const base = { ...initialState(), locs, locsOld: locs.map((p) => [...p]), minRadius: 8.142 };
    const rs = evaluate(base);
    const du = evaluate({ ...base, type: 'Dubins' });
    expect(Math.abs(rs.view.pathLengthValue - 18.18)).toBeLessThan(0.1);
    expect(Math.abs(du.view.pathLengthValue - 56.43)).toBeLessThan(0.25);
    expect(Math.abs(rs.view.distanceValue - 5.76)).toBeLessThan(0.05);
    expect(rs.state.optPath.map((e) => e[1]).filter((s) => s === 0)).toEqual([]);
    expect(rs.state.optPath.length).toBe(4);
  });
  it('car-paths: owner state 1 (machine-number poses, r_min 6.318) gives the saved optPath bit for bit', () => {
    const { state, view } = evaluate({ ...owner1 });
    expect(state.optPath).toEqual(owner1.optPath); // every parameter, steering and gear bit-identical
    // the saved state is a fixed point of the body: locators, settings and the cache variable stay as saved
    expect(state.locs).toEqual(owner1.locs);
    expect(state.locsOld).toEqual(owner1.locsOld);
    expect([state.progress, state.progressOld, state.minRadius, state.type]).toEqual([owner1.progress, owner1.progressOld, owner1.minRadius, owner1.type]);
    // label: the saved path (sum 3.964105 x 6.318 = 25.045) and Norm[{17.55, 5.42, pi/2 - ArcTan[1/2]}] = 18.401
    expect(label(view)).toBe('path length: 25.05   distance: 18.4');
  });
});
