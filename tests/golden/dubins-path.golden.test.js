// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/dubins-path.golden.test.js — the port against the ORIGINAL notebook: the live state, the initial
// settings and the four snapshot Settings (tests/golden/dubins-path.original-states.json, written with
// `python3 tools/extract_state.py --snapshots`), the snapshot pictures (docs/original-snapshots/dubins-path-<k>.png) and
// the Mathematica-harness records (tests/golden/dubins-path.harness.json; these tests skip until the owner's run exists).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { initialState, evaluate } from '../../demos/dubins-path/dubins.js';
import { loadStates, plain, isIntegerLiteral } from '../../tools/lib/wl-json.mjs';
import { harnessCase, captureOf, toJS, isExact, isInteger, isMachineReal as isLexReal } from '../support/harness-json.js';
import { readPng } from '../support/png.js';

const FIXTURE = 'tests/golden/dubins-path.original-states.json';
const fx = loadStates(FIXTURE);
const fxText = fs.readFileSync(FIXTURE, 'utf8');
const ulp = (x) => { const b = new Float64Array([Math.abs(x)]); const i = new BigInt64Array(b.buffer); i[0] += 1n; return b[0] - Math.abs(x); };
const withinUlps = (a, b, n) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(n * ulp(b));
/** A fixture state (Greek names as Unicode) → the port's state (names spelled out), exact values as doubles. */
const toPort = (s) => {
  const p = plain(s);
  return { goalXY: p.goalXY, goalXYold: p.goalXYold, Theta: p['θ'], goalThetaloc: p['goalθloc'], goalTheta: p['goalθ'], progress: p.progress, minRadius: p.minRadius };
};
const snap = (k) => toPort(fx.snapshots[k - 1]);
const PI = Math.PI;

describe('dubins-path golden: the saved states', () => {
  it("dubins-path: the port's initial state is the live state and one evaluation keeps it", () => {
    expect(fx.count).toBe(4);
    const init = initialState();
    for (const s of [fx.specs, fx.live]) {
      expect(s.goalXY).toEqual(init.goalXY);
      expect(s.goalXYold).toEqual(init.goalXYold);
      expect(s.progress).toBe(init.progress);
      expect(s.minRadius).toBe(init.minRadius);
      expect(s['goalθ']).toBe(init.goalTheta);
      // exact in the notebook: Theta = -Pi/4, goalThetaloc = {2 + Sqrt[2], 2 - Sqrt[2]} (D-DP-01)
      expect(s['θ'].wl).toBe('-Pi/4');
      expect(s['θ'].n).toBe(init.Theta);
      expect(s['goalθloc'].map((v) => v.wl)).toEqual(['(2) + ((2)^(1/2))', '(2) + (-((2)^(1/2)))']);
    }
    for (const ptr of [['specs', 'goalXY', 0], ['specs', 'minRadius'], ['states', 0, 'goalXY', 1]]) expect(isIntegerLiteral(fxText, ptr)).toBe(true);
    // N[{2 + √2, 2 - √2}] as Mathematica 15.0.1 gives it (harness H-DP-01, H-DP-25: "n" 0.5857864376269049, one ulp
    // below the correctly rounded 0.585786437626905; the same double as the fixture's Python 2 - sqrt(2)) (D-DP-09)
    expect(init.goalThetaloc).toEqual([3.414213562373095, 0.5857864376269049]);
    expect(init.goalThetaloc[1]).toBe(fx.specs['goalθloc'][1].n);
    const { state } = evaluate(init);
    expect(state.Theta).toBe(-0.7853981633974483);
    withinUlps(state.goalThetaloc[0], 3.414213562373095, 2);
    expect(state.goalThetaloc[1]).toBe(0.5857864376269049); // exact opening kept (D-DP-09)
    expect(state.goalXY).toEqual([2, 2]);
    expect(state.goalXYold).toEqual([2, 2]);
  });
  it('dubins-path: evaluating the saved state gives the label of snapshot 1 and keeps the locators', () => {
    const saved = toPort(fx.live);
    expect(snap(1)).toEqual(saved);
    const { state, view } = evaluate(saved);
    expect(view.label).toBe('20.76 path length, 2.83 distance');
    expect(view.word).toBe('LSL');
    withinUlps(state.Theta, saved.Theta, 2);
    state.goalThetaloc.forEach((v, i) => withinUlps(v, saved.goalThetaloc[i], 2));
  });
  it('dubins-path: snapshot settings 2 to 4 give the labels and path words of the pictures', () => {
    const want = {
      2: { word: 'LSR', len: 23.910454985284474, label: '23.91 path length, 5.26 distance', xyP: [2.7371322148120267, 4.2280501775734605], angP: 1.9925379154403728 },
      3: { word: 'LSL', len: 22.497596735219986, label: '22.5 path length, 4.05 distance', xyP: [2.8624372520083465, 3.8980272703626015], angP: 1.8747997279349988 },
      4: { word: 'RSL', len: 17.020489584085038, label: '17.02 path length, 5.99 distance', xyP: [2.965218628356695, -2.5445019362868386], angP: -1.4183741320070864 },
    };
    for (const [k, w] of Object.entries(want)) {
      const s = snap(Number(k));
      expect([s.progress, s.minRadius]).toEqual([0.25, 3]);
      const { state, view } = evaluate(s);
      expect(view.word, `snapshot ${k}`).toBe(w.word);
      expect(Math.abs(view.shortestPath[0] - w.len)).toBeLessThanOrEqual(1e-9);
      expect(view.label).toBe(w.label);
      view.car.xyP.forEach((v, i) => expect(Math.abs(v - w.xyP[i])).toBeLessThanOrEqual(1e-9));
      expect(Math.abs(view.car.angP - w.angP)).toBeLessThanOrEqual(1e-9);
      // the stored Settings are a fixed point of the body (bit for bit)
      expect([state.Theta, state.goalThetaloc, state.goalXYold]).toEqual([s.Theta, s.goalThetaloc, s.goalXYold]);
    }
  });
});

// ---- golden-snapshot: the pictures (2× pictures, graphic 1200 × 800 px, origin at pixel (649.5, 592.5), 40 px per unit)
const toWorld = (x, y) => [(x - 649.5) / 40, (592.5 - y) / 40];
const PURE = { Pink: [255, 128, 128], Blue: [0, 0, 255], Orange: [255, 128, 0], DarkerYellow: [170, 170, 0], Brown: [153, 102, 51], DarkerGreen: [0, 170, 0] };
function scan(k) {
  const img = readPng(`docs/original-snapshots/dubins-path-${k}.png`);
  const counts = Object.fromEntries(Object.keys(PURE).map((c) => [c, 0]));
  let bx = 0, by = 0, bn = 0;
  const red = [];
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const o = (y * img.width + x) * img.channels, r = img.data[o], g = img.data[o + 1], b = img.data[o + 2];
      for (const [c, v] of Object.entries(PURE)) if (r === v[0] && g === v[1] && b === v[2]) counts[c]++;
      if (b > 200 && r < 90 && g < 90 && !(r === 0 && g === 0 && b === 255)) { bx += x; by += y; bn++; } // the blue car's body (opacity 0.8)
      if (r > 200 && g < 90 && b < 90) red.push([x, y]); // the red reticle (the goal car is pale red)
    }
  }
  return { counts, carBody: toWorld(bx / bn, by / bn), red };
}
/** centre of the blue car body = rear axle + 0.7 (cos angP, sin angP) */
const bodyCentre = (car) => [car.xyP[0] + 0.7 * Math.cos(car.angP), car.xyP[1] + 0.7 * Math.sin(car.angP)];

describe('dubins-path golden: the snapshot pictures', () => {
  it('dubins-path: snapshot 1 reads 20.76 path length and 2.83 distance with the pink LSL path', () => {
    const { state, view } = evaluate(snap(1));
    expect(view.label).toBe('20.76 path length, 2.83 distance');
    expect(view.word).toBe('LSL');
    const s = scan(1);
    expect(s.counts.Pink).toBeGreaterThan(3500);
    expect(s.counts.Blue + s.counts.Orange).toBe(0);
    const xs = s.red.map((p) => p[0]), ys = s.red.map((p) => p[1]);
    const reticle = toWorld((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
    expect(Math.hypot(reticle[0] - state.goalThetaloc[0], reticle[1] - state.goalThetaloc[1])).toBeLessThan(0.05);
    const c = bodyCentre(view.car);
    expect(Math.hypot(s.carBody[0] - c[0], s.carBody[1] - c[1])).toBeLessThan(0.1);
  }, 30000);
  it('dubins-path: snapshots 2 to 4 show the thick path in the colour of the computed word', () => {
    for (const k of [2, 3, 4]) {
      const { view } = evaluate(snap(k));
      const colour = view.shortestPath[1].colour;
      const s = scan(k);
      expect(s.counts[colour], `snapshot ${k}: ${colour}`).toBeGreaterThan(3000);
      for (const other of ['Pink', 'Blue', 'Orange']) if (other !== colour) expect(s.counts[other], `snapshot ${k}: ${other}`).toBe(0);
      if (k === 2) continue; // path and car share the colour Blue
      const c = bodyCentre(view.car);
      expect(Math.hypot(s.carBody[0] - c[0], s.carBody[1] - c[1]), `snapshot ${k}: car`).toBeLessThan(0.1);
    }
  }, 60000);
});

// ---- harness records (tools/wolfram/manipulate-harness.wls, scenarios tests/harness/dubins-path.scenarios.json) ----
// Each test replays its scenario in the port (from the initial settings; one evaluation per step) and compares the
// captures with the harness record: decisions (the drawn word, which words exist) exactly, lengths within 4 ulp, other
// reals within 1e-12 (TESTPLAN T-DP-31…T-DP-36). They skip until tests/golden/dubins-path.harness.json exists.
const NAME = { Theta: 'Theta', 'θ': 'Theta', goalThetaloc: 'goalThetaloc', 'goalθloc': 'goalThetaloc', goalTheta: 'goalTheta', 'goalθ': 'goalTheta' };
function wlValue(v) {
  // scenario values are read lexically (LexNumber for 2 and 2.0 alike): plain doubles for the port
  if (typeof v !== 'string') return Array.isArray(v) ? v.map(wlValue) : toJS(v);
  if (!v.startsWith('wl:')) return v;
  const e = v.slice(3);
  if (!/^[-+*/ ().0-9Pi]+$/.test(e)) throw new Error(`unsupported wl value ${v}`);
  return Function('Pi', `return (${e});`)(PI);
}
function replay(scenario) {
  let state = initialState(), res = null;
  const out = [];
  for (const step of scenario.steps) {
    if (step.setFrom) state = snap(Number(step.setFrom.split(':')[1]));
    // a fresh object per step: the state of an earlier step stays as it was evaluated (captureEachStep scenarios)
    state = { ...state };
    if (step.set) for (const [k, v] of Object.entries(step.set)) state[NAME[k] ?? k] = wlValue(v);
    if (step.settle) { for (let i = 0; i < 50; i++) { const n = evaluate(state).state; const same = JSON.stringify(n) === JSON.stringify(state); state = n; if (same) break; } }
    res = evaluate(state);
    state = res.state;
    out.push({ state, view: res.view });
  }
  return out;
}
const WORDS = { dLSL: 'LSL', dLSR: 'LSR', dRSR: 'RSR', dRSL: 'RSL', dLRL: 'LRL', dRLR: 'RLR' };
const COLOUR_WORD = { '1,0.5,0.5': 'LSL', '0,0,1': 'LSR', '1,0.5,0': 'RSL', '0.6,0.4,0.2': 'LRL' };
const num = (v) => (isExact(v) && v.wl === 'Infinity' ? Infinity : toJS(v));
function portValue(name, { state, view }) {
  if (name in state) return state[name];
  if (name in WORDS) return view.lengths[WORDS[name]];
  if (['dTheta', 'csL', 'csR', 'ceL', 'ceR'].includes(name)) return view[name];
  if (['distTrav', 'ang1', 'ang2', 'ang3', 'angP', 'xyP', 'Alpha'].includes(name)) return view.car[name];
  return undefined;
}
function compareCapture(name, rec, at) {
  if (name === '%messages') return;
  if (name === '%text') { expect(JSON.stringify(toJS(rec))).toContain(at.view.label); return; }
  if (name === 'shortestPath') {
    const [len, drawing] = rec;
    expect(Math.abs(num(len) - at.view.shortestPath[0])).toBeLessThanOrEqual(4 * ulp(num(len)));
    const col = (drawing?.[0]?.a ?? drawing?.[0]?.args)?.map((a) => Number(toJS(a).toFixed(6))).join(',');
    if (col in COLOUR_WORD) expect(at.view.word).toBe(COLOUR_WORD[col]);
    else expect(['RSR', 'RLR']).toContain(at.view.word); // Darker[Yellow] / Darker[Green]: told apart by the length
    return;
  }
  const mine = portValue(name, at);
  expect(mine, `no port value for capture ${name}`).not.toBe(undefined);
  const theirs = name in WORDS ? num(Array.isArray(rec) ? rec[0] : rec) : toJS(rec);
  const cmp = (a, b) => {
    if (Array.isArray(b)) { expect(a.length).toBe(b.length); a.forEach((x, i) => cmp(x, b[i])); return; }
    if (b === Infinity || a === Infinity) { expect(a).toBe(b); return; }
    const tol = name in WORDS ? 4 * ulp(b) : 1e-12 * Math.max(1, Math.abs(b));
    expect(Math.abs(a - b), `${name}: port ${a}, harness ${b}`).toBeLessThanOrEqual(tol);
  };
  cmp(mine, theirs);
}
// test titles written out (the design document cites them verbatim)
const SCENARIOS = [
  ['H-DP-01', 'dubins-path harness H-DP-01: the Input-cell values give the live state'],
  ['H-DP-02', 'dubins-path harness H-DP-02: the opening state in machine numbers'],
  ['H-DP-03', 'dubins-path harness H-DP-03: a dragged goal keeps its heading'],
  ['H-DP-04', 'dubins-path harness H-DP-04: a dragged heading locator sets Theta'],
  ['H-DP-05', 'dubins-path harness H-DP-05: heading locator on the goal centre'],
  ['H-DP-06', 'dubins-path harness H-DP-06: goal straight ahead, machine numbers'],
  ['H-DP-07', 'dubins-path harness H-DP-07: goal straight ahead, exact integers'],
  ['H-DP-08', 'dubins-path harness H-DP-08: RSL against LSL and the backwards car'],
  ['H-DP-09', 'dubins-path harness H-DP-09: goal behind on the x-axis'],
  ['H-DP-10', 'dubins-path harness H-DP-10: LRL with the car on the middle arc'],
  ['H-DP-11', 'dubins-path harness H-DP-11: RLR with the car on the middle arc'],
  ['H-DP-12', 'dubins-path harness H-DP-12: snapshot 2 Settings'],
  ['H-DP-13', 'dubins-path harness H-DP-13: snapshot 4 Settings'],
  ['H-DP-14', 'dubins-path harness H-DP-14: r_min at its minimum'],
  ['H-DP-15', 'dubins-path harness H-DP-15: r_min at its maximum'],
  ['H-DP-16', 'dubins-path harness H-DP-16: progress 1'],
  ['H-DP-17', 'dubins-path harness H-DP-17: progress 0'],
  ['H-DP-18', 'dubins-path harness H-DP-18: circle distance exactly 2 r_min'],
  ['H-DP-19', 'dubins-path harness H-DP-19: circle distance exactly 4 r_min'],
  ['H-DP-20', 'dubins-path harness H-DP-20: goal pose equal to the start pose'],
  ['H-DP-21', 'dubins-path harness H-DP-21: a sequence of updates'],
  ['H-DP-22', 'dubins-path harness H-DP-22: the car on the straight tangent'],
  ['H-DP-23', 'dubins-path harness H-DP-23: snapshot 3 Settings'],
  ['H-DP-24', 'dubins-path harness H-DP-24: re-evaluation and settling change nothing'],
  ['H-DP-25', 'dubins-path harness H-DP-25: the exact initial settings evaluated once'],
];

describe('dubins-path golden: Mathematica harness', () => {
  for (const [id, title] of SCENARIOS) {
    it(title, (ctx) => {
      const h = harnessCase('dubins-path', id);
      if (h.status !== 'ok') return ctx.skip(h.reason);
      const steps = replay(h.scenario);
      // H-DP-20 (K-DP-03): ArcTan[0, 0] is Indeterminate in Mathematica; only record the words that exist
      const each = h.scenario.captureEachStep;
      steps.forEach((at, i) => {
        if (!each && i < steps.length - 1) return;
        for (const name of h.scenario.capture) {
          const rec = captureOf(h.record, name, each ? { step: i + 1 } : {});
          if (id === 'H-DP-20' && !['%messages'].includes(name)) continue; // recorded for K-DP-03, compared by hand
          if (id === 'H-DP-07' && name === 'shortestPath') {
            // P-DP-01 (proposed): with exact integer inputs dLSL and dRSR are the exact integer 8, dLSR and dRSL the
            // machine 8.; Sort puts 8 before 8. and Darker[Yellow] {2/3, 2/3, 0} before Pink, so the original draws
            // RSR. The port has machine numbers only and draws LSR (the colour order of Q-DP-01). Unreachable with
            // the mouse (dragged locators are machine reals).
            expect(isInteger(rec[0]) && toJS(rec[0])).toBe(8);
            expect(rec[1][0].a.map((a) => toJS(a))).toEqual([2 / 3, 2 / 3, 0]);
            expect(isInteger(captureOf(h.record, 'dRSR')[0]) && isInteger(captureOf(h.record, 'dLSL')[0])).toBe(true);
            expect(isLexReal(captureOf(h.record, 'dLSR')[0]) && isLexReal(captureOf(h.record, 'dRSL')[0])).toBe(true);
            expect(at.view.word).toBe('LSR');
            expect(at.view.shortestPath[0]).toBe(8);
            continue;
          }
          if (id === 'H-DP-07' && ['angP', 'xyP', 'Alpha'].includes(name)) {
            // P-DP-01: the original's car is on the zero-length first arc of RSR (exact: xyP {0, 0}, angP the symbol
            // Pi = Pi/2 + Sign[0 + 10^-6] Pi/2, the backwards car of Q-DP-02); the port's car is on LSR's, which is
            // the car H-DP-06 recorded for the same pose in machine numbers.
            const want = { angP: { sym: 'Pi' }, xyP: [0, 0], Alpha: 0 }[name];
            expect(toJS(rec)).toEqual(want);
            const machine = captureOf(harnessCase('dubins-path', 'H-DP-06').record, name);
            compareCapture(name, machine, at);
            continue;
          }
          compareCapture(name, rec, at);
        }
      });
    });
  }
});
