// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/art-gallery.golden.test.js — the port against values computed by the ORIGINAL:
//  * the live Manipulate state saved in the notebook (tests/golden/art-gallery.original-state.json); the notebook was
//    last saved by Mathematica 14.1 ("CreatedBy" line) and the first snapshot cell holds the same state;
//  * the five other snapshot cells, saved by the authors in 2019: each keeps its Manipulate settings ("Settings" in
//    TaggingRules), including the visible regions the original computed. Extracted from Art-Gallery-Problem.nb with
//    the parser of tools/extract_state.py (data of the original, CC BY-NC-SA 3.0); `picture` = number of the
//    corresponding docs/original-snapshots/art-gallery-<n>.png;
//  * owner state 1 (Mathematica 15.0.1, saved 2026-10-06): tests/golden/art-gallery.owner-state-1.json;
//  * colours read from the snapshot pictures.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { evaluate, initialState, environment, GUARD_COLORS } from '../../demos/art-gallery/model.js';
import { visiblePolys, withNormalizeModel } from '../../demos/art-gallery/visibility.js';

const saved = JSON.parse(fs.readFileSync('tests/golden/art-gallery.original-state.json', 'utf8')).state;
const owner = JSON.parse(fs.readFileSync('tests/golden/art-gallery.owner-state-1.json', 'utf8')).state;
const viaNorm = (f) => withNormalizeModel('viaNorm', f); // the 14.1 saved state needs Normalize via the dnrm2 Norm (D-AG-08)

const SNAPSHOTS_2019 = [
  { picture: 2, cellId: 688697862, s: 6, reg: "irregular",
    pts: [[1,0],[2,2],[-1.375,-1.81],[3.42,-1.2599999999999998],[-3.605,3.3],[-0.625,0.40000000000000036],[-1.1549999999999998,-3.62],[0.19500000000000028,2.75],[-2,1],[-1,-1]],
    visibleRegion: [
      [[2.6,1],[0.5,0.5],[-1.2,-1],[-1.3,1.35],[-1.2822762395363814,2.0967611075338053],[-3.5,0.5],[-1.2,-2.8],[2.1,-2.7]],
      [[4.949747468305832,4.949747468305832],[1.166905785835938,4.949747468305833],[2.6,1],[2.1,-2.7],[0.03773148738632076,-4.949747468305832],[4.949747468305832,-4.949747468305832]],
      [[4.949747468305832,4.949747468305832],[-4.949747468305832,4.949747468305832],[-4.949747468305832,-4.949747468305832],[-3.2956344699385314,-4.949747468305833],[-3.5,0.5],[-1,2.3],[-3.3,3.2],[0.75,3],[4.949747468305832,2.7106947783026984]],
      [[0.5,0.5],[2.6,1],[4.949747468305832,1.4371623196848056],[4.949747468305832,4.949747468305832],[1.7811164495848155,4.949747468305833],[0.75,3],[-0.9,1],[-1.3,1.35],[-1.2,-1]],
      [[4.949747468305832,-1.8945414221685513],[2.1,-2.7],[-1.2,-2.8],[-3.5,0.5],[-4.949747468305834,3.0471042939957487],[-4.949747468305832,-4.949747468305832],[4.949747468305832,-4.949747468305832]],
      [[0.75,3],[-3.3,3.2],[-1,2.3],[-3.5,0.5],[-2.989633286318759,-0.23226528484699827],[-1.3,1.35],[-0.9,1]],
    ] },
  { picture: 3, cellId: 8109304, s: 2, reg: "irregular",
    pts: [[1,0],[2,2],[-0.21499999999999986,2.3100000000000005],[-1.185,-1.9100000000000001],[-3.605,3.3],[-0.625,0.40000000000000036],[-1.1549999999999998,-3.62],[0.19500000000000028,2.75],[-2,1],[-1,-1]],
    visibleRegion: [
      [[0.75,3],[-3.3,3.2],[-1,2.3],[-3.5,0.5],[-3.0272652673404155,-0.17827157294635998],[-1.3,1.35],[-0.9,1]],
      [[2.6,1],[0.5,0.5],[-1.2,-1],[-1.3,1.35],[-1.325251286346775,2.065819073830322],[-3.5,0.5],[-1.2,-2.8],[2.1,-2.7]],
    ] },
  { picture: 4, cellId: 1001602567, s: 2, reg: "movable obstacles",
    pts: [[-1.2349999999999999,-0.6799999999999997],[2,2],[-0.21499999999999986,2.3100000000000005],[-1.355,-0.8199999999999998],[-3.605,3.3],[-0.625,0.40000000000000036],[-1.1549999999999998,-3.62],[0.19500000000000028,2.75],[-2,1],[-1,-1]],
    visibleRegion: [
      [[2,3],[3.5355339059327373,3.4783378758887533],[3.5355339059327373,3.5355339059327373],[-3.5355339059327373,3.5355339059327373],[-3.535533905932737,-2.0790883987416997],[-1.9421067811865473,0.027106781186547746],[-0.5278932188134524,0.027106781186547746],[-0.5278932188134524,-1.3871067811865472],[-0.7097187159477877,-3.535533905932737],[3.5355339059327373,-3.5355339059327373],[3.5355339059327373,0.05796910755162338],[1.1339745962155614,1.5]],
      [[-0.5278932188134524,0.027106781186547746],[-1.9421067811865473,0.027106781186547746],[-1.9421067811865473,-1.3871067811865472],[-0.5278932188134524,-1.3871067811865472]],
    ] },
  { picture: 5, cellId: 1957518383, s: 8, reg: "cubicle",
    pts: [[-1.2349999999999999,-0.6799999999999997],[2,2],[-1.1149999999999998,2.2700000000000005],[-0.08999999999999986,4],[-3.62,0.3200000000000003],[1.8550000000000004,-0.7999999999999998],[1.83,-4],[3.6000000000000005,2.25],[-3.545,-3.16],[-0.6400000000000001,-0.8500000000000001]],
    visibleRegion: [
      [[0.5,2.5],[-1,2.5],[-1,3.5],[-0.8644545049957965,4.949747468305833],[-1.9537827441445093,4.949747468305833],[-1.5,3.5],[-1.5,2],[0.5,2]],
      [[4.949747468305832,4.949747468305832],[-4.949747468305832,4.949747468305832],[-4.949747468305832,3.287427057433163],[-3.5,3.5],[-1.5,3.5],[-1.5,3.2252747252747263],[-1,3.5],[3.5,3.5],[4.949747468305833,3.2980853108209143]],
      [[-1.5,0.5],[-3.5,0.5],[-3.5,3.5],[-3.4452925483658183,4.949747468305833],[-4.949747468305832,4.949747468305832],[-4.949747468305832,-4.949747468305832],[-3.3474268550876296,-4.949747468305833],[-3.5,-2],[-3.5,0],[-1.5,0]],
      [[4.949747468305832,-0.23560836444270572],[3.5,-0.5],[1.5,-0.5],[1.5,-1.5],[2,-1.5],[2,-1],[3.5,-1],[4.949747468305832,-1.17626109037153]],
      [[4.949747468305832,-3.0659438717647203],[3.5,-3.5],[2,-3.5],[2,-3],[1.5,-3],[1.5,-3.5],[-0.5,-3.5],[-0.9999999999999999,-3.3927038626609436],[-1,-3.5],[-2,-3.5],[-4.949747468305832,-3.1149154741115113],[-4.949747468305832,-4.949747468305832],[4.949747468305832,-4.949747468305832]],
      [[4.949747468305832,4.949747468305832],[3.3840202025355333,4.949747468305832],[3.5,3.5],[3.5,2.5],[1.5,2.5],[1.5,2],[3.5,2],[3.5,-0.5],[3.4818181818181815,-1],[3.5,-1],[3.5,-3.5],[3.474787000551203,-4.949747468305833],[4.949747468305832,-4.949747468305832]],
      [[-2,-2],[-3.5,-2],[-3.5,0],[-3.4928797468354436,0.5],[-3.5,0.5],[-3.5,3.5],[-3.4902044089979336,4.949747468305833],[-4.949747468305832,4.949747468305832],[-4.949747468305832,-4.949747468305832],[4.587823054507386,-4.949747468305832],[-2,-3.5]],
      [[0,-0.5],[-1,-0.5],[-1,-3.5],[-1.1969468258830562,-4.949747468305832],[-0.4234095677121446,-4.949747468305832],[-0.5,-3.5],[-0.5,-1],[0,-1]],
    ] },
  { picture: 6, cellId: 561991041, s: 7, reg: "movable obstacles",
    pts: [[-1.2349999999999999,-0.6799999999999997],[2,2],[3.7750000000000004,2.6799999999999997],[-0.10499999999999998,3.71],[-3.8,-0.5699999999999998],[1.8550000000000004,-0.7999999999999998],[1.5949999999999998,-3.8],[2.3100000000000005,2.04],[-1.38,-0.8799999999999999],[-0.6400000000000001,-0.8500000000000001]],
    visibleRegion: [
      [[4.949747468305832,4.949747468305832],[3.139691969558261,4.949747468305832],[3.5355339059327373,3.5355339059327373],[3.5355339059327373,-3.5355339059327373],[3.481048450124157,-4.949747468305833],[4.949747468305832,-4.949747468305832]],
      [[4.949747468305832,4.949747468305832],[-4.949747468305832,4.949747468305832],[-4.949747468305831,3.4636114812694827],[-3.5355339059327373,3.5355339059327373],[3.5355339059327373,3.5355339059327373],[4.949747468305833,3.4677602433932675]],
      [[-3.5355339059327373,3.5355339059327373],[-3.4444345396658322,4.949747468305832],[-4.949747468305832,4.949747468305832],[-4.949747468305832,-4.949747468305832],[-3.4094144451943094,-4.949747468305833],[-3.5355339059327373,-3.5355339059327373]],
      [[3.5355339059327373,3.023077015846581],[2.8660254037844384,1.5],[1.1339745962155614,1.5],[0.49585648471901006,3.5355339059327373],[-3.5355339059327373,3.5355339059327373],[-3.5355339059327378,1.0710646002144746],[-0.5278932188134524,0.027106781186547746],[-0.5278932188134524,-1.3871067811865472],[-3.5355339059327378,-2.12814134741842],[-3.5355339059327373,-3.5355339059327373],[3.5355339059327373,-3.5355339059327373]],
      [[4.949747468305833,-3.3427974967031395],[3.5355339059327373,-3.5355339059327373],[-3.5355339059327373,-3.5355339059327373],[-4.949747468305833,-3.4626347605659613],[-4.949747468305832,-4.949747468305832],[4.949747468305832,-4.949747468305832]],
      [[2,3],[1.1339745962155614,1.5],[2.8660254037844384,1.5]],
      [[-0.5278932188134524,0.027106781186547746],[-1.9421067811865473,0.027106781186547746],[-1.9421067811865473,-1.3871067811865472],[-0.5278932188134524,-1.3871067811865472]],
    ] },
];

const dv = new DataView(new ArrayBuffer(8));
const ordinal = (x) => { dv.setFloat64(0, x); const b = dv.getBigInt64(0); return b < 0n ? -(b & 0x7fffffffffffffffn) : b; };
/** distance of two doubles in units in the last place */
const ulps = (a, b) => Math.abs(Number(ordinal(a) - ordinal(b)));
const regionsOf = (snap) => { const polys = environment(snap.reg, snap.pts).listofPoly; return snap.visibleRegion.map((_, i) => visiblePolys(polys, snap.pts[i + 2])); };
const sameSet = (a, b) => expect([...a].map((p) => JSON.stringify(p)).sort()).toEqual([...b].map((p) => JSON.stringify(p)).sort());

describe('art-gallery golden: the live state saved by Mathematica 14.1', () => {
  it('art-gallery: the saved state is the state after the first evaluation of the initial settings', () => {
    const { state, view } = viaNorm(() => evaluate(initialState()));
    expect(view.recomputed).toEqual([1]);
    expect(state.s).toBe(saved.s);
    expect(state.reg).toBe(saved.reg);
    expect(state.prevReg).toBe(saved.prevReg);
    expect(state.sOld).toBe(saved.sOld);
    expect(state.pts).toEqual(saved.pts);
    expect(state.ptsOld).toEqual(saved.ptsOld);
    expect(state.visibleRegion).toEqual(saved.visibleRegion); // guard 1 plus the seven untouched {{10,10},{10,10}}
  });
  it('art-gallery: the visibility polygon of guard 1 is bit-identical, including the points shifted by the collinearity nudge', () => {
    const got = viaNorm(() => evaluate(initialState())).state.visibleRegion[0];
    const want = saved.visibleRegion[0];
    expect(got.length).toBe(25);
    got.forEach((q, j) => { expect(Object.is(q[0], want[j][0])).toBe(true); expect(Object.is(q[1], want[j][1])).toBe(true); });
    // values that only come out of the original's 1e-5 shifts of collinear vertices (tb) and its 40-unit extended lines
    expect(want).toContainEqual([7.000000000000001e-05, -3.5000000000000004]);
    expect(want).toContainEqual([-3.5000000000000004, -2.3333333333333336e-05]);
    expect(want).toContainEqual([3.499967001839099, -3.4999999999999996]);
  });
  it('art-gallery: evaluating the saved state again recomputes nothing', () => {
    const { state, view } = evaluate(JSON.parse(JSON.stringify(saved)));
    expect(view.recomputed).toEqual([]);
    expect(state.visibleRegion).toEqual(saved.visibleRegion);
    expect(state.ptsOld).toEqual(saved.ptsOld);
  });
  it('art-gallery: the 14.1 state needs Normalize via the dnrm2 Norm (the default Normalize changes last bits)', () => {
    const polys = environment('cubicle', saved.pts).listofPoly;
    const cr = visiblePolys(polys, saved.pts[2]); // default: correctly rounded length
    expect(cr.length).toBe(25);
    expect(cr).not.toEqual(saved.visibleRegion[0]);
    cr.forEach((q, j) => q.forEach((v, c) => expect(ulps(v, saved.visibleRegion[0][j][c])).toBeLessThanOrEqual(4)));
  });
});

describe('art-gallery golden: the five snapshots saved in 2019', () => {
  it('art-gallery: the 2019 snapshots are bit-identical for every shown guard with the default Normalize (K-AG-03)', () => {
    for (const snap of SNAPSHOTS_2019) {
      regionsOf(snap).forEach((got, i) => expect(got, `picture ${snap.picture} guard ${i + 1}`).toEqual(snap.visibleRegion[i]));
    }
  });
  it('art-gallery: with Normalize via the dnrm2 Norm the 2019 snapshots keep their points and order within 3 ulps', () => {
    let differing = 0;
    viaNorm(() => {
      for (const snap of SNAPSHOTS_2019) {
        regionsOf(snap).forEach((got, i) => {
          const want = snap.visibleRegion[i];
          expect(got.length, `picture ${snap.picture} guard ${i + 1}`).toBe(want.length);
          got.forEach((q, j) => q.forEach((v, c) => { const u = ulps(v, want[j][c]); if (u) differing++; expect(u).toBeLessThanOrEqual(3); }));
        });
      }
    });
    expect(differing).toBeGreaterThan(0); // the 14.1 model does not fit the 2019 data (D-AG-08)
  });
  it('art-gallery: a guard inside a movable obstacle sees exactly that obstacle, whose vertices match the original bit for bit', () => {
    const p4 = SNAPSHOTS_2019.find((s) => s.picture === 4); // guard 2 inside the square
    const env4 = environment(p4.reg, p4.pts);
    sameSet(p4.visibleRegion[1], env4.poly1);
    const p6 = SNAPSHOTS_2019.find((s) => s.picture === 6); // guard 6 inside the triangle, guard 7 inside the square
    const env6 = environment(p6.reg, p6.pts);
    sameSet(p6.visibleRegion[5], env6.poly2);
    sameSet(p6.visibleRegion[6], env6.poly1);
  });
  it('art-gallery: the guard colours reproduce the region tints of the snapshot pictures (Opacity 0.3 over white)', () => {
    // single-region pixels read from docs/original-snapshots/art-gallery-{1,2,5,6}.png
    const tints = [[184, 228, 239], [255, 232, 181], [213, 208, 255], [207, 232, 197], [251, 214, 191], [195, 219, 252], [242, 235, 179], [221, 204, 247]];
    GUARD_COLORS.forEach((c, i) => c.forEach((v, k) => expect(Math.abs(255 * (0.7 + 0.3 * v) - tints[i][k])).toBeLessThanOrEqual(2)));
  });
});

describe('art-gallery golden: owner state 1 (Mathematica 15.0.1, saved 2026-10-06)', () => {
  it('art-gallery: owner state 1, movable obstacles with five guards: every visible region is bit-identical with the defaults', () => {
    expect(owner.s).toBe(5);
    expect(owner.reg).toBe('movable obstacles');
    const polys = environment(owner.reg, owner.pts).listofPoly;
    for (let i = 0; i < owner.s; i++) expect(visiblePolys(polys, owner.pts[i + 2]), `guard ${i + 1}`).toEqual(owner.visibleRegion[i]);
  });
  it('art-gallery: owner state 1, the square around a guard inside it matches the original bit for bit', () => {
    const env = environment(owner.reg, owner.pts);
    sameSet(owner.visibleRegion[2], env.poly1); // guard 3 stands inside the square
  });
  it('art-gallery: owner state 1, evaluating it again recomputes nothing and keeps the cached regions', () => {
    const { state, view } = evaluate(JSON.parse(JSON.stringify(owner)));
    expect(view.recomputed).toEqual([]);
    expect(state.visibleRegion).toEqual(owner.visibleRegion);
    expect(state.ptsOld).toEqual(owner.ptsOld);
    expect(state.ptsOld[8]).toEqual([-10, -10]); // guards 7 and 8 were never shown
  });
});
