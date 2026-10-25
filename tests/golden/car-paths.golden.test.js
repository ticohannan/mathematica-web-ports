// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Francesco Bernardini and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/car-paths.golden.test.js — the port against the ORIGINAL notebook's saved state
// (tests/golden/car-paths.original-state.json) and the numbers in its snapshot pictures (docs/original-snapshots).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { evaluate, initialState, getOptimalPath, pathLength } from '../../demos/car-paths/carpaths.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { changeOfBasisR, cart2Polar, modPi, angfrom1to2, path7, timeflip, drawPath } from '../../demos/car-paths/carpaths.js';
import { Cases, Orange } from '../../shared/graphics.js';
import { loadStates, plain, isIntegerLiteral } from '../../tools/lib/wl-json.mjs';

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

// ---- snapshot Settings (tests/golden/car-paths.original-states.json, extracted with tools/extract_state.py --snapshots):
// each snapshot cell of the original notebook stores the full Manipulate state behind its picture
// (docs/original-snapshots/car-paths-<k>.png), including the optPath the original computed.
const FIXTURE = 'tests/golden/car-paths.original-states.json';
const snaps = loadStates(FIXTURE);
const snapText = fs.readFileSync(FIXTURE, 'utf8');
const snap = (k) => plain(snaps.snapshots[k - 1]);
const sameBits = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fixedPoint = (st, out) => {
  expect(out.locs).toEqual(st.locs);
  expect(out.locsOld).toEqual(st.locsOld);
  expect([out.progress, out.progressOld, out.minRadius, out.type]).toEqual([st.progress, st.progressOld, st.minRadius, st.type]);
};

describe('car-paths golden: the four snapshot states', () => {
  it('car-paths: snapshot 1: the Settings are the live state, with exact integer poses, label 24.08 and 20.62', () => {
    expect(snaps.count).toBe(4);
    expect(snap(1)).toEqual(plain(snaps.live));
    // exact integers in the notebook (JSON integers), so the original computed symbolically (D-CP-01)
    for (const ptr of [['locs', 1, 0], ['locs', 3, 1], ['minRadius']]) expect(isIntegerLiteral(snapText, ['snapshots', '1', ...ptr])).toBe(true);
    const st = snap(1);
    const { state, view } = evaluate({ ...st });
    fixedPoint(st, state);
    expect(state.optPath.map((e) => [e[1], e[2]])).toEqual(st.optPath.map((e) => [e[1], e[2]]));
    state.optPath.forEach((e, i) => expect(Math.abs(e[0] - st.optPath[i][0])).toBeLessThanOrEqual(ulp(st.optPath[i][0])));
    expect(label(view)).toBe('path length: 24.08   distance: 20.62');
  });
  it('car-paths: snapshot 2: Dubins with machine-number markers gives the saved optPath bit for bit, label 26.47 and 20.62', () => {
    const st = snap(2);
    expect(st.type).toBe('Dubins');
    expect(isIntegerLiteral(snapText, ['snapshots', '2', 'locs', 1, 1])).toBe(false); // {-10., -3.}: machine reals
    const { state, view } = evaluate({ ...st });
    expect(sameBits(state.optPath, st.optPath)).toBe(true);
    fixedPoint(st, state);
    expect(label(view)).toBe('path length: 26.47   distance: 20.62');
    expect(st.progress).toBe(745 * 0.001);
  });
  it('car-paths: snapshot 3: Reeds-Shepp with r_min 8.142 gives the saved path word, parameters within 1 ulp, label 18.18 and 5.76', () => {
    // bit for bit only with the summation order of K-CP-11 (next two tests)
    const st = snap(3);
    const { state, view } = evaluate({ ...st });
    expect(state.optPath.map((e) => [e[1], e[2]])).toEqual(st.optPath.map((e) => [e[1], e[2]]));
    state.optPath.forEach((e, i) => expect(Math.abs(e[0] - st.optPath[i][0])).toBeLessThanOrEqual(ulp(st.optPath[i][0])));
    fixedPoint(st, state);
    expect(label(view)).toBe('path length: 18.18   distance: 5.76');
  });
  // K-CP-11: the original evaluates t = modπ[Theta + π/2 + a] with the machine terms added first ((Theta + a) + π/2);
  // the port adds left to right ((Theta + π/2) + a), 1 ulp lower here in t and therefore in v. Skipped until K-CP-11 is
  // decided (no change to the port without a design decision).
  it.skip('car-paths: snapshot 3: the saved optPath bit for bit (K-CP-11, order of Theta + Pi/2 + a)', () => {
    const st = snap(3);
    expect(sameBits(evaluate({ ...st }).state.optPath, st.optPath)).toBe(true);
  });
  it('car-paths: snapshot 3: path7 with the machine terms of Theta + Pi/2 + a added first reproduces the saved parameters (evidence for K-CP-11)', () => {
    const st = snap(3);
    const L = st.locs;
    const start = [L[0][0], L[0][1], angfrom1to2(L[0], L[1])], goal = [L[2][0], L[2][1], angfrom1to2(L[2], L[3])];
    const [x, y, Th] = changeOfBasisR(start, goal, st.minRadius);
    // the optimum is path7 (C|CuCu|C) in its timeflip variant: path7[-x, y, -Phi]
    expect(sameBits(timeflip(path7(-x, y, -Th)).map((e) => [e[1], e[2]]), st.optPath.map((e) => [e[1], e[2]]))).toBe(true);
    const Phi = -Th;
    const [rho, Theta] = cart2Polar(-x + Math.sin(Phi), y - 1 - Math.cos(Phi));
    const u = Math.acos((20 - rho * rho) / 16);
    const a = Math.asin((2 * Math.sin(u)) / rho);
    expect(u).toBe(st.optPath[1][0]); // u is bit-identical
    const port = modPi(Theta + Math.PI / 2 + a); // as the port (left to right)
    const alt = modPi((Theta + a) + Math.PI / 2); // machine terms first, then the exact π/2
    expect(port).toBe(0.42735692458475966);
    expect(alt).toBe(st.optPath[0][0]); // 0.4273569245847597
    expect(modPi(alt - Phi)).toBe(st.optPath[3][0]); // v = modπ[t - Phi]: 0.4926843942081116
    expect(modPi(port - Phi)).toBe(0.49268439420811155);
  });
  it('car-paths: snapshot 4: Dubins with r_min 8.142 gives the saved optPath bit for bit, label 56.43 and 5.76', () => {
    const st = snap(4);
    const { state, view } = evaluate({ ...st });
    expect(sameBits(state.optPath, st.optPath)).toBe(true);
    fixedPoint(st, state);
    expect(label(view)).toBe('path length: 56.43   distance: 5.76');
    // slider values are min + k step in machine arithmetic (K-CP-07): 349 x 0.001, not the decimal 0.349
    expect(st.progress).toBe(349 * 0.001);
    expect(st.progress).not.toBe(0.349);
    expect(st.minRadius).toBe(0.001 + 8141 * 0.001);
  });
  it('car-paths: snapshot 4: the two forward right arcs of 1.42 and 4.80 rad have angE < angS and are drawn over their own length, as the picture shows (K-CP-01)', () => {
    // docs/original-snapshots/car-paths-4.png: the start arc is the short arc up and right of the green car, the goal arc
    // runs below the right construction circle's centre round to the red car (about 3/4 of the circle); a 2π
    // complement convention would draw 4.87 and 1.48 rad instead
    const st = snap(4);
    const L = st.locs;
    // drawPath's Graphics data (v0.1.21): the arcs Circle[center, minRadius, {angS, angE}]
    const arcs = Cases(drawPath(Orange, st.optPath, [L[0][0], L[0][1], angfrom1to2(L[0], L[1])], st.minRadius), 'Circle')
      .map((c) => ({ angS: c.angles[0], angE: c.angles[1] }));
    expect(arcs).toHaveLength(2);
    arcs.forEach((a, i) => {
      const param = st.optPath[i === 0 ? 0 : 2][0];
      expect(a.angE).toBeLessThan(a.angS);
      expect(Math.abs(a.angS - a.angE - param)).toBeLessThan(1e-14);
    });
    expect(arcs[1].angE).toBeLessThan(-Math.PI / 2); // the goal arc covers the bottom of its circle (angle -π/2)
    expect(arcs[1].angS).toBeGreaterThan(-Math.PI / 2);
  });
});
