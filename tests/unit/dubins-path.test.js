// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/dubins-path.test.js — model of "Shortest Path for the Dubins Car" (demos/dubins-path/dubins.js).
// Expected values: derived by hand, from plain geometry, from car-paths' algebraic Dubins formulas (a different
// original, demos/car-paths/carpaths.js) or from the design's independent Python transcription (TESTPLAN T-DP-01…25).
import { describe, it, expect } from 'vitest';
import {
  angPt2Pt, distPt2Pt, arcLen, sortWords, movingCar, evaluate, initialState, round01, labelNumber, WORD_COLOURS, picture,
} from '../../demos/dubins-path/dubins.js';
import fs from 'node:fs';
import { drawCar } from '../../demos/common/car-icon.js';
import { annotation } from '../../shared/graphics.js';
import { carRecords, pieceRecord } from '../support/car-records.js';

// word pieces and cars are shared/graphics.js data since v0.1.21: read back into the records of v0.1.15–v0.1.20
const records = (d) => d && { ...d, pieces: d.pieces.map(pieceRecord) };
const CALLER = [0.1, 0.2, 0.3]; // a colour no part of the car uses (the body's 'inherit')
import { dLSL, dLSR, dRSR, dRSL, dLRL, dRLR, changeOfBasisR, pathLength } from '../../demos/car-paths/carpaths.js';

const PI = Math.PI;
const near = (a, b, tol = 1e-12) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);
const nearVec = (a, b, tol = 1e-12) => { expect(a.length).toBe(b.length); a.forEach((v, i) => near(v, b[i], tol)); };
const ulp = (x) => { const b = new Float64Array([Math.abs(x)]); const i = new BigInt64Array(b.buffer); i[0] += 1n; return b[0] - Math.abs(x); };
/** A state with the goal at g and the heading locator at h (as after a drag that ended there). */
const pose = (g, h, extra = {}) => ({ ...initialState(), goalXY: g, goalXYold: [...g], goalThetaloc: h, ...extra });
function lcg(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

describe('dubins-path helpers', () => {
  it('angPt2Pt is ArcTan[dx, dy] with Mathematica argument order and Chop below 1e-10', () => {
    expect(angPt2Pt([0, 0], [1, 1])).toBe(0.7853981633974483);
    expect(angPt2Pt([0, 0], [-1, 0])).toBe(3.141592653589793);
    expect(angPt2Pt([0, 0], [1, 1e-11])).toBe(0);
    expect(angPt2Pt([0, 0], [0, -2])).toBe(-1.5707963267948966);
  });
  it('distPt2Pt is the square root of the sum of squares', () => {
    expect(distPt2Pt([0, 3], [4, 0])).toBe(5);
    expect(distPt2Pt([1, 1], [4, 5])).toBe(5);
    expect(distPt2Pt([0.1, 0.2], [0.4, 0.6])).toBe(Math.sqrt(0.09000000000000002 + 0.15999999999999998));
  });
  it('arcLen counts left arcs counter-clockwise within one turn', () => {
    nearVec(arcLen(-PI / 2, -1.3051487573942633, 1), [0.2656475694006333, -PI / 2, -1.3051487573942633], 1e-15);
    nearVec(arcLen(0, -1, 1), [2 * PI - 1, 0, 2 * PI - 1], 1e-15);
    nearVec(arcLen(0, 7, 1), [7 - 2 * PI, 0, 7 - 2 * PI], 1e-15);
    expect(arcLen(1, 1, 1)).toEqual([0, 1, 1]);
  });
  it('arcLen counts right arcs clockwise and moves the end angle with the arc', () => {
    nearVec(arcLen(PI / 2, PI / 2 + 0.5, -1), [2 * PI - 0.5, PI / 2, -4.21238898038469], 1e-15);
    nearVec(arcLen(0, -7, -1), [7 - 2 * PI, 0, -(7 - 2 * PI)], 1e-15);
    expect(arcLen(1, 1, -1)).toEqual([0, 1, 1]);
  });
  it('turning circles at the opening state', () => {
    const { view } = evaluate(initialState());
    expect(view.csL).toEqual([0, 3]);
    expect(view.csR).toEqual([0, -3]);
    const k = 3 / Math.SQRT2;
    nearVec(view.ceL, [2 + k, 2 + k], 1e-15);
    nearVec(view.ceR, [2 - k, 2 - k], 1e-15);
  });
});

describe('dubins-path words', () => {
  it('the six word lengths at the opening state', () => {
    const { view } = evaluate(initialState());
    const L = view.lengths;
    near(L.LSL, 20.764501874731444);
    expect(L.LSR).toBe(Infinity);
    near(L.RSR, 24.08698542300058);
    near(L.RSL, 39.599212413501064);
    near(L.LRL, 30.97602967926326);
    near(L.RLR, 37.145643910306624);
    near(L.LSL, 20.764501874731446, 1e-14); // the exact value (mpmath) to 17 digits, D-DP-01
  });
  it('every word length equals the algebraic Dubins formula of car-paths times r_min', () => {
    const rnd = lcg(11);
    const fns = { LSL: dLSL, LSR: dLSR, RSR: dRSR, RSL: dRSL, LRL: dLRL, RLR: dRLR };
    let compared = 0;
    for (let k = 0; k < 2000; k++) {
      const g = [(rnd() - 0.5) * 26, (rnd() - 0.5) * 16], th = PI - rnd() * 2 * PI, r = 0.2 + rnd() * 4.8;
      const { view, state } = evaluate(pose(g, [g[0] + 2 * Math.cos(th), g[1] + 2 * Math.sin(th)], { minRadius: r }));
      // skip poses within 1e-9 of a validity boundary (2 r_min for LSR/RSL, 4 r_min for LRL/RLR)
      const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      const bounds = [Math.abs(dist(view.csL, view.ceR) - 2 * r), Math.abs(dist(view.csR, view.ceL) - 2 * r),
        Math.abs(dist(view.csL, view.ceL) - 4 * r), Math.abs(dist(view.csR, view.ceR) - 4 * r)];
      if (bounds.some((b) => b < 1e-9)) continue;
      const [x, y, Phi] = changeOfBasisR([0, 0, 0], [g[0], g[1], state.Theta], r);
      for (const [w, fn] of Object.entries(fns)) {
        const p = fn(x, y, Phi);
        const mine = view.lengths[w];
        if (!p.length) { expect(mine, `${w} at ${g} ${th} ${r}`).toBe(Infinity); continue; }
        const theirs = pathLength(p) * r;
        expect(Math.abs(mine - theirs), `${w} at ${g} ${th} ${r}: ${mine} vs ${theirs}`).toBeLessThanOrEqual(1e-9 * Math.max(1, theirs));
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(9000);
  });
  it('every word drawing is a connected forward path from the start pose to the goal pose', () => {
    const rnd = lcg(23);
    const at = (p, end) => (p.kind === 'line' ? (end ? p.to : p.from) : [p.c[0] + p.r * Math.cos(end ? p.a2 : p.a1), p.c[1] + p.r * Math.sin(end ? p.a2 : p.a1)]);
    for (let k = 0; k < 2000; k++) {
      const g = [(rnd() - 0.5) * 26, (rnd() - 0.5) * 16], th = PI - rnd() * 2 * PI, r = 0.2 + rnd() * 4.8;
      const { view, state } = evaluate(pose(g, [g[0] + 2 * Math.cos(th), g[1] + 2 * Math.sin(th)], { minRadius: r }));
      for (const [len, d] of view.words) {
        if (!Number.isFinite(len)) { expect(d).toBe(null); continue; }
        const letters = d.word.split('');
        let pos = [0, 0], head = 0, total = 0;
        records(d).pieces.forEach((p, i) => {
          nearVec(at(p, false), pos, 1e-9);
          if (p.kind === 'arc') {
            const dir = letters[i] === 'L' ? 1 : -1;
            expect((p.a2 - p.a1) * dir, `${d.word} piece ${i + 1} turns the word's way`).toBeGreaterThanOrEqual(-1e-12);
            near(wrap(p.a1 + dir * PI / 2 - head), 0, 1e-9); // tangent at the start of the arc = current heading
            head = p.a2 + dir * PI / 2;
            total += Math.abs(p.a2 - p.a1) * p.r;
          } else {
            expect(letters[i]).toBe('S');
            const l = Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1]);
            if (l > 1e-9) near(wrap(Math.atan2(p.to[1] - p.from[1], p.to[0] - p.from[0]) - head), 0, 1e-9);
            total += l;
          }
          pos = at(p, true);
        });
        nearVec(pos, state.goalXY, 1e-9);
        near(wrap(head - state.Theta), 0, 1e-9);
        near(total, len, 1e-9 * Math.max(1, len));
      }
    }
  });
  it('LSR and RSL exist only when the circle distance exceeds 2 r_min', () => {
    const a = evaluate(pose([2, 2], [4, 2], { minRadius: 1 }));
    expect(a.state.Theta).toBe(0);
    expect(a.view.lengths.LSR).toBe(Infinity);
    expect(a.view.word).toBe('RSR');
    near(a.view.shortestPath[0], 9.111612431925776);
    expect(a.view.label).toBe('9.11 path length, 2.83 distance');
    const b = evaluate(pose([2, 2.000001], [4, 2.000001], { minRadius: 1 }));
    expect(b.view.word).toBe('LSR');
    near(b.view.lengths.LSR, 3.1415936535897937);
    expect(b.view.label.startsWith('3.14 path length')).toBe(true);
  });
  it('LRL and RLR exist only when the circle distance is below 4 r_min', () => {
    const a = evaluate(pose([4, 0], [6, 0], { minRadius: 1 }));
    expect([a.view.lengths.LRL, a.view.lengths.RLR]).toEqual([Infinity, Infinity]);
    const b = evaluate(pose([3.999999, 0], [5.999999, 0], { minRadius: 1 }));
    near(b.view.lengths.LRL, 6.286013734363456);
    near(b.view.lengths.RLR, 6.286013734363456);
  });
  it('LRL pose: the middle arc turns right (Alpha = -r_min)', () => {
    const { view, state } = evaluate(pose([1.5, 3], [1, 5], { progress: 0.5 }));
    expect(state.Theta).toBe(1.8157749899217608);
    expect(view.word).toBe('LRL');
    near(view.shortestPath[0], 22.705170776241488);
    expect(view.label).toBe('22.71 path length, 3.35 distance');
    expect(records(view.shortestPath[1]).pieces[1].kind).toBe('arc');
    expect(view.car.segment).toBe(2);
    nearVec(view.car.xyP, [2.155321000664522, -5.6462461938107324]);
    near(view.car.angP, -9.380128950962089);
    expect(view.car.Alpha).toBe(-3);
  });
  it('RLR pose: the middle arc turns left (Alpha = r_min)', () => {
    const { view } = evaluate(pose([5, 3], [3, 4], { progress: 0.5 }));
    expect(view.word).toBe('RLR');
    near(view.shortestPath[0], 16.336062716280537);
    expect(view.label).toBe('16.34 path length, 5.83 distance');
    nearVec(view.car.xyP, [6.867110968657073, -2.800975726213286]);
    expect(view.car.Alpha).toBe(3);
  });
});

describe('dubins-path selection and moving car', () => {
  it('Sort tie-break: equal lengths are ordered by colour LSR, RLR, LRL, RSR, RSL, LSL', () => {
    const w = (word, colour) => [5, { word, colour, pieces: [] }];
    const list = [w('LSL', 'Pink'), w('LSR', 'Blue'), w('RSR', 'DarkerYellow'), w('RSL', 'Orange'), w('LRL', 'Brown'), w('RLR', 'DarkerGreen')];
    expect(sortWords(list).map((x) => x[1].word)).toEqual(['LSR', 'RLR', 'LRL', 'RSR', 'RSL', 'LSL']);
    const two = [w('LSL', 'Pink'), [Infinity, null], w('RSR', 'DarkerYellow'), w('RSL', 'Orange'), w('LRL', 'Brown'), [Infinity, null]];
    const s = sortWords(two);
    expect(s[0][1].word).toBe('LRL');
    expect(s.slice(4).map((x) => x[0])).toEqual([Infinity, Infinity]);
    // the colour triples are the RGBColor arguments of Blue, Darker[Green], Brown, Darker[Yellow], Orange, Pink
    expect(WORD_COLOURS.Blue).toEqual([0, 0, 1]);
    expect(WORD_COLOURS.DarkerGreen).toEqual([0, 2 / 3, 0]);
  });
  it('goal straight ahead: the four CSC words tie at length 8 and LSR (blue) is drawn', () => {
    const { view } = evaluate(pose([8, 0], [10, 0], { progress: 0 }));
    expect([view.lengths.LSL, view.lengths.LSR, view.lengths.RSR, view.lengths.RSL]).toEqual([8, 8, 8, 8]);
    near(view.lengths.LRL, 28.942379968353926);
    near(view.lengths.RLR, 28.942379968353926);
    expect(view.word).toBe('LSR');
    expect(view.car.xyP).toEqual([1.8369701987210297e-16, 0]);
    expect(view.car.angP).toBe(0);
    expect(view.car.Alpha).toBe(0);
    expect(view.label).toBe('8. path length, 8. distance');
  });
  it('moving car at the opening state and progress 0.25 is on the third arc', () => {
    const { view } = evaluate(initialState());
    near(view.car.distTrav, 5.191125468682861);
    expect(view.car.segment).toBe(3);
    nearVec(view.car.xyP, [5.026953574450204, 1.2612804048338337]);
    near(view.car.angP, 0.30666167509927655);
    expect(view.car.Alpha).toBe(3);
  });
  it('progress 0 puts the car on the start and progress 1 on the goal with the goal heading', () => {
    const p0 = evaluate({ ...initialState(), progress: 0 }).view.car;
    expect(p0.xyP).toEqual([1.8369701987210297e-16, 0]);
    expect(p0.angP).toBe(0);
    expect(p0.Alpha).toBe(3);
    const p1 = evaluate({ ...initialState(), progress: 1 }).view.car;
    nearVec(p1.xyP, [2, 2]);
    near(p1.angP, 5.497787143782137);
    near(wrap(p1.angP + PI / 4), 0);
    expect(p1.Alpha).toBe(3);
  });
  it('on the straight segment Alpha is 0 and the heading is the line direction', () => {
    const { view } = evaluate({ ...initialState(), progress: 0.2 });
    expect(view.car.segment).toBe(2);
    nearVec(view.car.xyP, [4.025842245807755, 0.9862855036400986]);
    near(view.car.angP, 0.2656475694006333);
    expect(view.car.Alpha).toBe(0);
  });
  it('goal (8, 3) heading up: RSL is drawn and at progress 0 the moving car faces backwards', () => {
    const a = evaluate(pose([8, 3], [8, 5], { progress: 0 }));
    expect(a.view.lengths.RSL).toBe(9.712388980384688);
    expect(a.view.lengths.LSL).toBe(9.71238898038469);
    expect(a.view.word).toBe('RSL');
    expect(a.view.label).toBe('9.71 path length, 8.54 distance');
    expect(a.view.car.xyP).toEqual([1.8369701987210297e-16, 0]);
    expect(a.view.car.angP).toBe(PI); // Q-DP-02 / E-DP-01: Sign[0 + 10^-6] π/2
    expect(a.view.car.Alpha).toBe(0);
    const b = evaluate(pose([8, 3], [8, 5], { progress: 0.2 }));
    expect(b.view.car.segment).toBe(2);
    nearVec(b.view.car.xyP, [1.942477796076938, 0], 1e-12);
    near(b.view.car.angP, 0);
  });
});

describe('dubins-path Manipulate body', () => {
  it('locator coupling: a moved goal keeps its heading and carries the heading locator 2 units away', () => {
    const { state: s0 } = evaluate(initialState());
    const { state, view } = evaluate({ ...s0, goalXY: [5, -3] });
    expect(Math.abs(state.Theta - -PI / 4)).toBeLessThanOrEqual(2 * ulp(PI / 4));
    nearVec(state.goalThetaloc, [5 + Math.SQRT2, -3 - Math.SQRT2], 1e-14);
    expect(state.goalXYold).toEqual([5, -3]);
    expect(view.word).toBe('RSR');
    near(view.shortestPath[0], 5.932057541877011);
    expect(view.label).toBe('5.93 path length, 5.83 distance');
  });
  it('locator coupling: a moved heading locator turns the goal car and is put back 2 units away', () => {
    const { state: s0 } = evaluate(initialState());
    const { state, view } = evaluate({ ...s0, goalThetaloc: [2, 6] });
    expect(state.Theta).toBe(PI / 2);
    nearVec(state.goalThetaloc, [2, 4], 1e-15);
    expect(view.word).toBe('LRL');
    expect(view.label).toBe('22.14 path length, 2.83 distance');
  });
  it('the heading locator dropped on the goal centre gives heading 0', () => {
    const { state: s0 } = evaluate(initialState());
    const { state, view } = evaluate({ ...s0, goalThetaloc: [2, 2] });
    expect(view.dTheta).toBe(0);
    expect(state.Theta).toBe(0);
    expect(state.goalThetaloc).toEqual([4, 2]);
    expect(view.lengths.LSL).toBe(view.lengths.RSR);
    near(view.lengths.LSL, 21.67798304628495);
    expect(view.word).toBe('RSR');
    expect(view.label).toBe('21.68 path length, 2.83 distance');
  });
  it('label: Round to 0.01 and a trailing point for whole numbers', () => {
    const label = (a, b) => `${labelNumber(round01(a))} path length, ${labelNumber(round01(b))} distance`;
    expect(label(20.764501874731444, Math.sqrt(8))).toBe('20.76 path length, 2.83 distance');
    expect(label(8, 8)).toBe('8. path length, 8. distance');
    expect(label(22.497596735219986, Math.sqrt(1.9000000000000004 ** 2 + 3.58 ** 2))).toBe('22.5 path length, 4.05 distance');
    expect(label(16.802600329558373, Math.hypot(13, 8))).toBe('16.8 path length, 15.26 distance');
    expect(round01(0.125)).toBe(0.12); // half to even
  });
  it('drawCar of this Demonstration differs from the default car (car-paths\', tests/unit/car-icon.test.js) only in headlights without edges', () => {
    const mine = carRecords(drawCar([1, 2], 0.3, 3, 0.2, { lights: true, beam: 4, headlightEdge: null }), CALLER);
    const theirs = carRecords(drawCar([1, 2], 0.3, 3, 0.2), CALLER);
    expect(mine.prims.length).toBe(theirs.prims.length);
    mine.prims.forEach((p, i) => {
      const q = theirs.prims[i];
      expect(p.role).toBe(q.role);
      expect(p.pts).toEqual(q.pts);
      expect(p.opacity).toBe(q.opacity);
      if (p.role === 'headlight') { expect(p.edge).toBe(null); expect(q.edge.thin).toBe(true); } else expect(p.edge).toEqual(q.edge);
    });
  });
  it('picture: the words and the three cars hold exactly the numbers of v0.1.20 (fixture dubins-path-drawing.pre-graphics.json)', () => {
    const PRE = JSON.parse(fs.readFileSync('tests/unit/fixtures/dubins-path-drawing.pre-graphics.json', 'utf8'));
    expect(PRE.rows.length).toBeGreaterThanOrEqual(3);
    for (const row of PRE.rows) {
      const { state, view } = evaluate({ ...initialState(), ...row.partial });
      const graphics = picture(state, view);
      const words = view.words.map(([len, d]) => [len, records(d)]);
      expect(JSON.parse(JSON.stringify(words)), JSON.stringify(row.partial)).toEqual(row.words);
      expect(JSON.parse(JSON.stringify([view.shortestPath[0], records(view.shortestPath[1])]))).toEqual(row.shortestPath);
      // the drawn candidates and the shortest path are those pieces, after the word's colour
      for (const [len, d] of view.words) {
        const drawn = annotation(graphics, `candidate-${d?.word}`);
        if (!Number.isFinite(len)) { expect(drawn).toBe(null); continue; }
        expect(drawn.g.slice(1)).toEqual(d.pieces);
        expect(drawn.attrs['data-word']).toBe(d.word);
      }
      expect(annotation(graphics, 'shortest-path').g.slice(1)).toEqual(view.shortestPath[1].pieces);
      for (const id of ['start-car', 'goal-car', 'moving-car']) {
        const c = annotation(graphics, id);
        expect(JSON.parse(JSON.stringify(carRecords(c.g, c.style.color, id))), id).toEqual({ prims: row.cars[id].prims });
      }
    }
  });
  it('initial state is the live state and the Input-cell values give the same state after one evaluation', () => {
    const s = initialState();
    expect(s).toEqual({ goalXY: [2, 2], goalXYold: [2, 2], Theta: -0.7853981633974483, goalThetaloc: [3.414213562373095, 0.5857864376269049], goalTheta: 0, progress: 0.25, minRadius: 3 });
    const a = evaluate(s).state;
    const b = evaluate({ ...s, Theta: PI / 2, goalThetaloc: [4, 0] }).state;
    expect(a.Theta).toBe(-0.7853981633974483);
    expect(a.goalThetaloc).toEqual([3.414213562373095, 0.5857864376269049]); // exact opening kept (D-DP-09, harness H-DP-25)
    // From the Input-cell values the port recomputes goalThetaloc with the engine's Math.sin/cos, whose last bit
    // differs between browsers (D-DP-09); in Mathematica those inputs are exact. Same state within 1 ulp.
    expect(b.Theta).toBe(-0.7853981633974483);
    expect(b.goalThetaloc[0]).toBe(3.414213562373095);
    expect(Math.abs(b.goalThetaloc[1] - 0.5857864376269049)).toBeLessThanOrEqual(2.3e-16); // ...049 (Firefox, WebKit, Mathematica) or ...051 (V8)
    expect(evaluate(b).view.word).toBe('LSL');
  });
  it('evaluation is idempotent to the last bit', () => {
    let { state } = evaluate(initialState());
    const first = JSON.stringify(state);
    for (let k = 0; k < 100; k++) state = evaluate(state).state;
    expect(JSON.stringify(state)).toBe(first);
  });
  it('movingCar indexes the drawing as the original (drawing[[2]] … drawing[[4]])', () => {
    const { view } = evaluate(initialState());
    const car = movingCar(view.shortestPath, 0.25, 3);
    expect(car).toEqual(view.car);
  });
});
