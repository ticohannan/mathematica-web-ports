// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/manipulability-ellipsoid.golden.test.js — the port against values the ORIGINAL computed or drew:
//  * the live state (states[0]), the initial settings (specs) and the four snapshot cells' Settings in
//    tests/golden/manipulability-ellipsoid.original-states.json (written by `python3 tools/extract_state.py --snapshots
//    <notebook> …`; raw notebook lines 1715 and 5000, 7841, 10766, 14286); expected σ and μ from the TESTPLAN's NumPy
//    evaluation and the label texts of the four pictures;
//  * the snapshot pictures where the Settings cannot hold it (docs/original-snapshots/manipulability-ellipsoid-k.png,
//    2 px per pt): dial size and spacing, the base cylinder's width, the drawn arrows, rings and full blue circles;
//  * the Mathematica-harness records H-ME-01 … H-ME-16 (tests/golden/manipulability-ellipsoid.harness.json, read through
//    tests/support/harness-json.js). These SKIP with the documented reason until the owner's harness run exists.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadStates, isExact as isExactWl, exactDouble } from '../../tools/lib/wl-json.mjs';
import { harnessCase, captureOf, toJS, toJSNumeric, isNumericSymbol, plotRanges } from '../support/harness-json.js';
import { readPng } from '../support/png.js';
import {
  initialState, evaluate, updateAngles, angleValue, pointXY, ellipsoidSummary, robotContent, splineArcAngles,
  PLOT_RANGE, IMAGE_SIZE, VIEW_ANGLE, VIEWPOINT,
} from '../../demos/manipulability-ellipsoid/model.js';
import { arcTan } from '../../shared/mma-exact.js';
import { cosSinPi } from '../../shared/exact-pi.js';
import { engineeringForm } from '../../shared/mma-extra.js';
import { viewerCamera } from '../../shared/three-helpers.js';
import { flatten } from '../../shared/graphics3d.js';
import { DIAL_TABLE_32, nearest32Index } from '../../demos/common/dial-control.js';

const DIR = 'manipulability-ellipsoid';
const fx = loadStates(`tests/golden/${DIR}.original-states.json`);
const PI = Math.PI;
const close = (a, b, tol, what = '') => expect(Math.abs(a - b), `${what}: ${a} vs ${b}`).toBeLessThanOrEqual(tol);
const closeV = (a, b, tol, what = '') => b.forEach((v, i) => close(a[i], v, tol, `${what}[${i}]`));
/** distance in units in the last place (0 for equal doubles, also 0 and -0) */
const f64 = new Float64Array(1), i64 = new BigInt64Array(f64.buffer);
const ordered = (x) => { f64[0] = x; const b = i64[0]; return b < 0n ? -(b & 0x7fffffffffffffffn) : b; };
const ulpsBetween = (a, b) => (a === b ? 0 : Number(ordered(a) - ordered(b) < 0n ? ordered(b) - ordered(a) : ordered(a) - ordered(b)));
const withinUlps = (a, b, n, what = '') => expect(ulpsBetween(a, b), `${what}: ${a} vs ${b}`).toBeLessThanOrEqual(n);

// ---- fixture values → the port's state encoding (k = exact multiple of π/32, {r} machine; m = table index, {p} machine)
/** "19*Pi/32", "-21*Pi/32", "Pi/4", "9*Pi/16" → k (in units of π/32) */
function kOfWl(wl) {
  const m = wl.replace(/\s/g, '').match(/^(-?)(\d*)\*?Pi(?:\/(\d+))?$/);
  if (!m) throw new Error(`not a rational multiple of π: ${wl}`);
  const k = ((m[1] ? -1 : 1) * Number(m[2] || 1) * 32) / Number(m[3] || 1);
  if (!Number.isInteger(k)) throw new Error(`not a multiple of π/32: ${wl}`);
  return k;
}
const angleOf = (v) => (isExactWl(v) ? kOfWl(v.wl) : Number.isInteger(v) ? (v === 0 ? 0 : (() => { throw new Error(`exact angle ${v}`); })()) : { r: v });
/** an exact pair → the index m of the table point it equals; a machine pair → {p} */
function pointOf(pair) {
  if (pair.some((c) => isExactWl(c) || Number.isInteger(c))) {
    const xy = pair.map((c) => (isExactWl(c) ? exactDouble(c) : c));
    const i = DIAL_TABLE_32.findIndex((q) => Math.abs(q[0] - xy[0]) < 1e-15 && Math.abs(q[1] - xy[1]) < 1e-15);
    if (i < 0) throw new Error(`exact point ${JSON.stringify(pair)} is not a table point`);
    const m = i - 32;
    return m === -32 ? 32 : m;
  }
  return { p: pair.slice() };
}
const toPort = (s) => ({
  k: [s.θ1, s.θ2, s.θ3].map(angleOf), kprev: [s.θ1prev, s.θ2prev, s.θ3prev].map(angleOf), m: [s.p1, s.p2, s.p3].map(pointOf),
});
const live = toPort(fx.live), specs = toPort(fx.specs);
const snap = (k) => toPort(fx.snapshots[k - 1]);
const png = (k) => readPng(`docs/original-snapshots/${DIR}-${k}.png`);

describe('manipulability-ellipsoid golden: saved state and snapshot Settings', () => {
  it('manipulability ellipsoid: the live state (= the initial settings) is the opening state of the port', () => {
    expect(live).toEqual(initialState());
    expect(specs).toEqual(initialState());
    expect(snap(1)).toEqual(initialState());
    expect(initialState()).toEqual({ k: [19, 18, -21], kprev: [19, 18, -21], m: [19, 18, -21] });
    // the stored exact p values are the table points Cos/Sin of 19π/32, 9π/16, −21π/32 (−Sin[3π/32] = Cos[19π/32] …)
    for (const [i, n] of [[0, 'p1'], [1, 'p2'], [2, 'p3']]) closeV(pointXY(live.m[i]), fx.live[n].map(exactDouble), 1e-16, n);
  });

  it('manipulability ellipsoid: the four snapshot Settings are fixed points of one evaluation (snapshot 3 keeps θ1prev one ulp below θ1)', () => {
    for (const k of [1, 2, 3, 4]) {
      const s = snap(k);
      const once = evaluate(s).state;
      expect(once, `snapshot ${k}`).toEqual(s);
      expect(evaluate(once).state, `snapshot ${k}, second evaluation`).toEqual(s);
    }
    const s3 = snap(3);
    expect(s3.k[0]).toEqual({ r: 0.8929626109272769 });
    expect(s3.kprev[0]).toEqual({ r: 0.8929626109272768 });
  });

  it('manipulability ellipsoid: snapshots 2 and 3 have machine θ1 = ArcTan of their normalised p1, bit for bit (1.1311921798353952, 0.8929626109272769)', () => {
    for (const [k, θ] of [[2, 1.1311921798353952], [3, 0.8929626109272769]]) {
      const s = snap(k);
      expect(arcTan(...s.m[0].p)).toBe(θ);
      expect(s.k[0].r).toBe(θ);
      close(Math.hypot(...s.m[0].p), 1, 2.3e-16, `|p1| of snapshot ${k}`); // Normalize of the earlier continuous dial
    }
    const s4 = snap(4); // p1 = {Cos[5π/32], −Sin[5π/32]}: θ1 = −5π/32 + 2π = 59π/32
    expect(s4.m[0]).toBe(-5);
    expect(updateAngles({ ...s4, kprev: s4.k.slice() }).k[0]).toBe(59);
  });

  it('manipulability ellipsoid: μ of the snapshot Settings reads 671.892×10^-3, 1.20711, 1.20711, 1.20711', () => {
    expect([1, 2, 3, 4].map((k) => evaluate(snap(k)).text)).toEqual(['671.892×10^-3', '1.20711', '1.20711', '1.20711']);
    for (const k of [2, 3, 4]) closeV(evaluate(snap(k)).S, [2.073132, 1.707107, 0.341081], 1e-6, `σ of snapshot ${k}`);
  });
});

describe('manipulability-ellipsoid golden: the snapshot pictures', () => {
  const isBlue = ([r, g, b]) => b > 150 && r < 90 && g < 90;
  const isRed = ([r, g, b]) => r > 150 && g < 90 && b < 90;
  const isGreen = ([r, g, b]) => g > 150 && r < 100 && b < 100;
  const isGray = ([r, g, b]) => Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && r > 90 && r < 170;
  const count = (img, test, [x0, x1], [y0, y1]) => {
    let n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (test(img.pixel(x, y))) n++;
    return n;
  };

  it('manipulability ellipsoid: snapshot 1 dial circles are 346 px across and 378 px apart (automatic ImageSize of the stored makeDialControl)', () => {
    const img = png(1);
    // the gray circles crossed by the column x = 227 (through the dial centres): top and bottom runs of each dial
    const runs = [];
    let prev = -10;
    for (let y = 0; y < img.height; y++) {
      if (!isGray(img.pixel(227, y))) continue;
      if (y > prev + 1) runs.push([y, y]); else runs[runs.length - 1][1] = y;
      prev = y;
    }
    const mid = ([a, b]) => (a + b) / 2;
    // the outermost runs of each dial: the circle; the labels (π/2, −π/2) lie inside it
    const dials = [[0, 420], [420, 800], [800, 1200]].map(([a, b]) => runs.filter((r) => r[0] >= a && r[1] < b));
    const circles = dials.map((rs) => [mid(rs[0]), mid(rs[rs.length - 1])]);
    const diam = circles.map(([t, b]) => b - t), centres = circles.map(([t, b]) => (t + b) / 2);
    for (const d of diam) close(d, 346, 346 * 0.03, 'circle diameter (px)');
    close(centres[1] - centres[0], 378, 378 * 0.03, 'dial spacing 1–2');
    close(centres[2] - centres[1], 378, 378 * 0.03, 'dial spacing 2–3');
    // the port's dial circle is measured in the page (e2e "has the controls of the original with their saved values
    // (μ = 671.892×10^-3)": 173 px = 346 / 2 against this picture)
  });

  it('manipulability ellipsoid: snapshot 1 shows a full ellipsoid with three arrow pairs and rings and the label 671.892×10^-3', () => {
    const v = evaluate(snap(1));
    expect(ellipsoidSummary(v)).toMatchObject({ rank: 3, arrows: { blue: 2, red: 2, green: 2 }, rings: { blue: 1, red: 1, green: 1 }, ellipsoid: 1 });
    expect(v.text).toBe('671.892×10^-3');
    // picture: blue, red and green lines (arrows and rings) inside the ellipsoid's region (x 830 … 980, y 470 … 670)
    const img = png(1);
    for (const [name, t] of [['blue', isBlue], ['red', isRed], ['green', isGreen]]) {
      expect(count(img, t, [830, 980], [470, 560]), `${name} in the ellipsoid region`).toBeGreaterThan(20);
    }
  });

  it('manipulability ellipsoid: snapshots 2-4 show flat full-rank ellipsoids and a full blue circle at θ2 = 0', () => {
    for (const k of [2, 3, 4]) {
      const v = evaluate(snap(k));
      expect(v.rank, `snapshot ${k}`).toBe(3);
      expect(v.S[2]).toBeGreaterThan(0.1);
      expect(v.S[2] / v.S[0]).toBeLessThan(0.2); // flat
      expect(ellipsoidSummary(v)).toMatchObject({ arrows: { blue: 2, red: 2, green: 2 }, ellipsoid: 1 });
      const blue = flatten(robotContent(v.angles, v.points)).filter((p) => p.type === 'line')[1];
      closeV(blue.points[blue.points.length - 1], blue.points[0], 1e-14, `snapshot ${k}: the blue arc is closed`);
      expect(splineArcAngles([0, angleValue(v.angles[1])])).toEqual({ start: 0, end: 2 * PI });
    }
    // pictures 2 and 3: the blue circle passes below the blue joint (y > 702), snapshot 1's quarter arc does not
    expect(count(png(1), isBlue, [830, 960], [703, 740])).toBe(0);
    for (const k of [2, 3]) expect(count(png(k), isBlue, [830, 960], [703, 740]), `picture ${k}`).toBeGreaterThan(50);
  });

  it('manipulability ellipsoid: framing of snapshot 1, base cylinder 72 px wide at 2 px per pt (camera model 71.1 px)', () => {
    // D-ME-01: camera at the PlotRange centre + ViewPoint × longest side, vertical angle 18° over the image height 420
    const cam = viewerCamera({ box: PLOT_RANGE, viewPoint: VIEWPOINT, viewAngle: VIEW_ANGLE, imageSize: IMAGE_SIZE });
    expect(cam.center).toEqual([0, 0, 2]);
    closeV(cam.position, [10.4, -19.2, 18], 1e-12, 'camera position');
    close(cam.fovDeg, 18, 1e-12, 'vertical view angle');
    close(cam.aspect, 440 / 420, 1e-15, 'aspect');
    // pinhole projection of the base cylinder (radius 3/8, top at z = 1/2) at 2 px per pt
    const d = cam.center.map((c, i) => c - cam.position[i]);
    const n = Math.hypot(...d);
    const depth = [0, 0, 0.5].reduce((s, p, i) => s + (p - cam.position[i]) * (d[i] / n), 0);
    const f = (2 * IMAGE_SIZE[1]) / 2 / Math.tan(VIEW_ANGLE / 2);
    const model = (2 * 0.375 * f) / depth;
    close(model, 71.1, 0.05, 'camera model (px)');
    // the picture: the red base's widest rows (x 854 … 924 plus its black edge lines)
    const img = png(1);
    const isBaseRed = ([r, g, b]) => r > 90 && g < 70 && b < 70;
    let widest = 0;
    for (let y = 800; y <= 830; y++) {
      let lo = Infinity, hi = -Infinity;
      for (let x = 830; x < 960; x++) if (isBaseRed(img.pixel(x, y))) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
      widest = Math.max(widest, hi - lo + 1);
    }
    close(widest, 72, 2, 'measured base width (px)');
    close(model, widest, widest * 0.05, 'camera model vs picture');
  });
});

// ------------------------------------------------------------------------------------------- Mathematica harness
/** a small Wolfram expression of numbers, Pi, Sqrt, Cos, Sin and lists → JS numbers (test inputs only) */
function wlNumber(text) {
  const js = text.replace(/\s+(?=[A-Za-z(])/g, '*').replace(/(\d)\s*(?=Pi|Sqrt|Cos|Sin)/g, '$1*').replace(/Pi/g, 'Math.PI')
    .replace(/Sqrt\[/g, 'Math.sqrt(').replace(/Cos\[/g, 'Math.cos(').replace(/Sin\[/g, 'Math.sin(').replace(/\]/g, ')')
    .replace(/\{/g, '[').replace(/\}/g, ']');
  if (!/^[-+*/().,\d\s[\]Mathcossqrtin_PIe]*$/.test(js)) throw new Error(`unsupported expression ${text}`);
  return Function(`return (${js});`)();
}
const NEAREST = /^Nearest\[Table\[\{Cos\[a\],Sin\[a\]\},\{a,-Pi,Pi,Pi\/32\}\],(.+)\]\[\[1\]\]$/;
/** a scenario value for p_i → m (an exact table point, or the table point Nearest picks) */
function scenarioPoint(v) {
  const t = String(v).slice(3).replace(/\s/g, ' ');
  const nm = t.replace(/\s/g, '').match(NEAREST);
  if (nm) { const i = nearest32Index(wlNumber(nm[1])); return i === -32 ? 32 : i; }
  const xy = wlNumber(t);
  const i = DIAL_TABLE_32.findIndex((q) => Math.abs(q[0] - xy[0]) < 1e-12 && Math.abs(q[1] - xy[1]) < 1e-12);
  if (i < 0) throw new Error(`not a table point: ${t}`);
  return i - 32 === -32 ? 32 : i - 32;
}
/** a scenario value for θ_i → k (exact) */
function scenarioAngle(v) {
  if (typeof v === 'number' && Number.isInteger(v)) { if (v !== 0) throw new Error(`exact angle ${v}`); return 0; }
  const x = wlNumber(String(v).slice(3));
  const k = Math.round((x * 32) / PI);
  if (Math.abs((k * PI) / 32 - x) > 1e-12) throw new Error(`not a multiple of π/32: ${v}`);
  return k;
}
const VAR = { θ1: ['k', 0], θ2: ['k', 1], θ3: ['k', 2], θ1prev: ['kprev', 0], θ2prev: ['kprev', 1], θ3prev: ['kprev', 2], p1: ['m', 0], p2: ['m', 1], p3: ['m', 2] };
/** Replay: the initial settings, then each step (set: assign and evaluate once; setFrom: snapshot k's Settings, evaluate once). */
function replay(scenario) {
  let state = initialState(), view = null;
  const views = [];
  for (const step of scenario.steps) {
    if (step.setFrom) state = snap(Number(String(step.setFrom).split(':')[1]));
    else if (step.drag) {
      // drag (HW-25): the stored setter Nearest[table, #][[1]] applied to the machine pointer value
      state = JSON.parse(JSON.stringify(state));
      for (const [name, v] of Object.entries(step.drag)) {
        const [key, i] = VAR[name];
        if (key !== 'm') throw new Error(`drag of ${name}: not a dial point`);
        const pointer = typeof v === 'string' ? wlNumber(v.slice(3).replace(/^N\[(.*)\]$/, '$1')) : toJS(v);
        const k = nearest32Index(pointer);
        state.m[i] = k === -32 ? 32 : k;
      }
    } else {
      const set = toJS(step.set);
      state = JSON.parse(JSON.stringify(state));
      for (const [name, v] of Object.entries(set)) {
        const [key, i] = VAR[name];
        state[key][i] = key === 'm' ? scenarioPoint(v) : scenarioAngle(v);
      }
    }
    view = evaluate(state);
    state = view.state;
    views.push(view);
  }
  return { state, view, views };
}
const numbers = (v) => { const out = []; (function walk(x) { if (typeof x === 'number') out.push(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.values(x).forEach(walk); })(toJS(v)); return out; };
/**
 * Whether the recorded %text entries ({input, plain, boxes, pos}, HARNESS-WL §6) hold the port's μ text in full:
 * "671.892×10^-3" → the mantissa "671.892" directly followed by SuperscriptBox["10", "-3"] in the boxes; "0." → the
 * mantissa with no exponent box after it. Quotes, backslashes and spaces of the InputForm are ignored.
 */
function muTextRecorded(recTexts, text) {
  const [, mant, exp] = text.match(/^(.*?)(?:×10\^(-?\d+))?$/);
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = exp === undefined
    ? new RegExp(`(^|[^\\d.])${esc(mant)}(?![\\d.])(?!.{0,40}SuperscriptBox)`)
    : new RegExp(`(^|[^\\d.])${esc(mant)}(?![\\d.]).{0,40}SuperscriptBox\\[10,${esc(exp)}\\]`);
  return [].concat(recTexts).some((t) => {
    const b = String(t && typeof t === 'object' ? (t.boxes ?? t.input ?? '') : t).replace(/[\\"\s]/g, '');
    return re.test(b);
  });
}
/** compare the captures of one record (step = null: after the last step) with the port's view after that step */
function compareCaptures(h, view, step = null) {
  const id = h.scenario.id;
  const cap = (name) => captureOf(h.record, name, step == null ? {} : { step });
  const sigma = () => [0, 1, 2].map((j) => view.S[j]);
  for (const name of h.scenario.capture) {
    const rec = cap(name);
    if (VAR[name]) {
      const [key, i] = VAR[name];
      // in ulps (an absolute 4e-16 is below one ulp for |θ| ≥ 2): an exact recorded angle kπ/32 is N of the exact value,
      // the correctly rounded double (K-ME-09), so 0 ulps; machine values (ArcTan of a machine point) within 1 ulp
      if (key === 'm') pointXY(view.state.m[i]).forEach((x, c) => withinUlps(x, toJS(rec)[c], 1, `${id} ${name}[${c}]`));
      // an exact angle that is a bare symbol (θ3 = ArcTan[-1, 0] = Pi) is encoded {"sym": "Pi"} (HW-45)
      else withinUlps(angleValue(view.state[key][i]), toJSNumeric(rec), isExactWl(rec) || isNumericSymbol(rec) ? 0 : 1, `${id} ${name}`);
    } else if (name === 'Σfull' || name === 'Σ') {
      const M = toJS(rec);
      [0, 1, 2].forEach((j) => {
        // a recorded zero singular value (SVD tolerance, K-ME-01) must be an exact 0 in the port, and a nonzero one nonzero
        if (M[j][j] === 0) expect(sigma()[j], `${id} ${name}[${j}] exact zero`).toBe(0);
        else expect(sigma()[j], `${id} ${name}[${j}] nonzero`).not.toBe(0);
        close(M[j][j], sigma()[j], 1e-14 * Math.max(1, view.S[0]), `${id} ${name}[${j}]`);
      });
    } else if (name === 'U') {
      const U = toJS(rec);
      for (let j = 0; j < 3; j++) if (view.S[j] > 0) {
        const dot = U[0][j] * view.U[0][j] + U[1][j] * view.U[1][j] + U[2][j] * view.U[2][j];
        close(Math.abs(dot), 1, 1e-12, `${id} U column ${j} up to sign`);
      }
    } else if (name === 'oc' || name === 'o2' || name === 'z1') closeV(view.points[name], toJS(rec), 1e-14, `${id} ${name}`);
    else if (name === 'wl:MatrixRank[Σ]') expect(toJS(rec), `${id} rank`).toBe(view.rank);
    else if (name === 'wl:Det[Σfull]') {
      const mu = toJS(rec);
      if (mu === 0) expect(view.mu, `${id} μ exact zero`).toBe(0);
      else expect(view.mu, `${id} μ nonzero`).not.toBe(0);
      close(mu, view.mu, 1e-15 * Math.max(1, view.mu), `${id} μ`);
    }
    else if (name === 'wl:N[JvRRRanthro[θ1,θ2,θ3,r2,r3]]') {
      const J = toJS(rec);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        if (J[i][j] === 0) expect(view.J[i][j], `${id} J[${i}][${j}] exact zero`).toBe(0);
        else close(view.J[i][j], J[i][j], 4.5e-16, `${id} J[${i}][${j}] (bits: K-ME-02)`);
      }
    } else if (name === '%text') expect(muTextRecorded(toJS(rec), view.text), `${id} μ text ${view.text} in ${JSON.stringify(toJS(rec))}`).toBe(true);
    else if (name === '%plotRange') {
      // one Graphics3D; its absolute PlotRange (kernel AbsoluteOptions, HW-50) is the stored option, unchanged by the overshoot
      const [g, ...more] = plotRanges(rec);
      expect(more, `${id} one graphic`).toEqual([]);
      expect([g.head, g.method], `${id} plot range method`).toEqual(['Graphics3D', 'AbsoluteOptions']);
      expect(g.value, `${id} plot range`).toEqual(PLOT_RANGE);
    }
    else expect(rec, `${id} ${name} recorded`).toBeDefined(); // %messages, %primitives, splineCircle, Nearest: inspected by hand
  }
}
function check(ctx, id, extra = () => {}) {
  const h = harnessCase(DIR, id);
  if (h.status !== 'ok') return ctx.skip(h.reason);
  const r = replay(h.scenario);
  if (h.scenario.captureEachStep) r.views.forEach((v, i) => compareCaptures(h, v, i + 1));
  else compareCaptures(h, r.view);
  extra(h, r);
}

describe('manipulability-ellipsoid golden: Mathematica harness records', () => {
  it('manipulability ellipsoid: every harness scenario replays in the port (its inputs are understood)', () => {
    const file = JSON.parse(readFileSync(`tests/harness/${DIR}.scenarios.json`, 'utf8'));
    expect(file.scenarios).toHaveLength(16);
    const ids = [];
    for (const sc of file.scenarios) {
      const r = replay(harnessCase(DIR, sc.id).scenario);
      expect(r.views).toHaveLength(sc.steps.length);
      ids.push(sc.id);
    }
    expect(ids).toEqual(Array.from({ length: 16 }, (_, i) => `H-ME-${String(i + 1).padStart(2, '0')}`));
    // spot checks of the parsed inputs: H-ME-03 snaps (0.3, 0.95) to 13π/32, H-ME-05 sets θ3 = π, H-ME-08 the rank-1 arm
    expect(replay(harnessCase(DIR, 'H-ME-03').scenario).views[0].state.k[0]).toBe(13);
    expect(replay(harnessCase(DIR, 'H-ME-05').scenario).state.k[2]).toBe(32);
    expect(replay(harnessCase(DIR, 'H-ME-08').scenario).view.rank).toBe(1);
    expect(replay(harnessCase(DIR, 'H-ME-02').scenario).state).toEqual({ k: [0, 0, 8], kprev: [0, 0, 8], m: [0, 0, 8] });
  });
  it('harness "H-ME-01"', (ctx) => check(ctx, 'H-ME-01'));
  it('harness "H-ME-02"', (ctx) => check(ctx, 'H-ME-02'));
  it('harness "H-ME-03"', (ctx) => check(ctx, 'H-ME-03', (h, r) => {
    expect(r.views[0].state.k[0]).toBe(13);
    expect(r.views[0].state.kprev[0]).toBe(19);
    expect(r.views[1].state.kprev[0]).toBe(13);
  }));
  it('harness "H-ME-04"', (ctx) => check(ctx, 'H-ME-04', (h, r) => expect(r.state.k[0]).toBe(60)));
  it('harness "H-ME-05"', (ctx) => check(ctx, 'H-ME-05'));
  it('harness "H-ME-06"', (ctx) => check(ctx, 'H-ME-06'));
  it('harness "H-ME-07"', (ctx) => check(ctx, 'H-ME-07'));
  it('harness "H-ME-08"', (ctx) => check(ctx, 'H-ME-08'));
  it('harness "H-ME-09"', (ctx) => check(ctx, 'H-ME-09'));
  it('harness "H-ME-10"', (ctx) => check(ctx, 'H-ME-10', (h, r) => {
    // the recorded B-spline control points lie on circles of radius 1/2 (weights aside) about the origin of the arc
    expect(numbers(captureOf(h.record, 'wl:splineCircle[{0,0,0},1/2,{0,θ2}]')).length).toBeGreaterThan(6);
    expect(r.state.k.slice(1)).toEqual([-16, -8]);
  }));
  it('harness "H-ME-11"', (ctx) => check(ctx, 'H-ME-11', (h, r) => {
    // K-ME-05, through the stored setter with machine pointers (TESTPLAN line of harness run 2: the exact midpoint of
    // run 1 made Nearest::mepcmp). The port's rule: least squared machine distance, ties first in table order (H-CL-16).
    const T = 'Table[{Cos[a],Sin[a]},{a,-Pi,Pi,Pi/32}]';
    // the midpoint pointer: the port assumes N[Cos[Pi/64]] = Math.cos(π/64) (the recorded input echo must say so, else
    // the tie premise of this scenario does not hold and the expectations below must be re-derived)
    const echo = h.record.inputEcho.find((e) => toJS(e.step) === 1 && toJS(e.name) === 'p1'); // lexical record: step is a LexNumber
    expect(toJS(echo.value), 'H-ME-11 midpoint pointer').toEqual([Math.cos(PI / 64), Math.sin(PI / 64)]);
    const mid = toJS(captureOf(h.record, `wl:Nearest[${T},N[{Cos[Pi/64],Sin[Pi/64]}]]`, { step: 1 }));
    expect(mid[0], 'H-ME-11 first point at the midpoint').toEqual(DIAL_TABLE_32[32 + nearest32Index([Math.cos(PI / 64), Math.sin(PI / 64)])]);
    expect(r.views[0].state.m[0], 'H-ME-11 p1 after the drag').toBe(0);
    const centre = toJS(captureOf(h.record, `wl:Nearest[${T},{0.,0.}]`, { step: 2 }));
    expect(centre[0], 'H-ME-11 first point at the centre').toEqual(DIAL_TABLE_32[nearest32Index([0, 0]) + 32]);
    expect(r.views[1].state.m[1], 'H-ME-11 p2 after the drag').toBe(-24);
  }));
  it('harness "H-ME-12"', (ctx) => check(ctx, 'H-ME-12', (h) => {
    // K-ME-02: N[{Cos[kπ/32], Sin[kπ/32]}] bit for bit against the octant table of shared/exact-pi.js
    const table = toJS(captureOf(h.record, 'wl:N[Table[{Cos[k Pi/32],Sin[k Pi/32]},{k,0,32}]]'));
    table.forEach((q, k) => expect(q, `k = ${k}`).toEqual(cosSinPi(k, 32)));
  }));
  it('harness "H-ME-13"', (ctx) => check(ctx, 'H-ME-13', (h, r) => expect(r.state.k[0]).toBe(0)));
  it('harness "H-ME-14"', (ctx) => check(ctx, 'H-ME-14', (h) => {
    const xs = [0.6718917273402976, 1.2071067811865472, 0.49999999999999994, 0.012, 0, 2.7944208223697744e-16];
    h.scenario.capture.forEach((name, i) => expect(JSON.stringify(toJS(captureOf(h.record, name)))).toContain(engineeringForm(xs[i]).split('×')[0]));
  }));
  it('harness "H-ME-15"', (ctx) => check(ctx, 'H-ME-15'));
  it('harness "H-ME-16"', (ctx) => check(ctx, 'H-ME-16'));
});
