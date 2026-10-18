// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/torus-chart.golden.test.js — the port against values the ORIGINAL computed or drew:
//  * the live state (states[0]) and the four snapshot cells' Settings in tests/golden/torus-chart.original-states.json
//    (written by `python3 tools/extract_state.py --snapshots <notebook> …`; raw notebook lines 2311, 6086, 9212, 12067);
//    expected angles and balls from an independent Python evaluation (TESTPLAN N-TC-03, N-TC-05);
//  * the picture of snapshot 1 where the Settings cannot hold it (docs/original-snapshots/torus-chart-1.png, 2× pixels);
//  * the Mathematica-harness records H-TC-01 … H-TC-14 (tests/golden/torus-chart.harness.json, read through
//    tests/support/harness-json.js). These SKIP with the documented reason until the owner's harness run exists.
import { describe, it, expect } from 'vitest';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import { harnessCase, captureOf, toJS, sameDouble } from '../support/harness-json.js';
import { readPng } from '../support/png.js';
import { initialState, initialSettings, evaluate, plotLabel } from '../../demos/torus-chart/model.js';
import { sampleManifold } from '../../demos/torus-chart/surface.js';
import { dialGraphics } from '../../demos/common/dial-control.js';

const DIR = 'torus-chart';
const fx = loadStates(`tests/golden/${DIR}.original-states.json`);
const live = plain(fx.live), specs = plain(fx.specs);
const snap = (k) => plain(fx.snapshots[k - 1]);
const ulps = (a, b) => (a === b ? 0 : Math.abs(a - b) / (Number.EPSILON * Math.max(Math.abs(a), Math.abs(b))));
const withinUlps = (a, b, n, what) => expect(ulps(a, b), `${what}: ${a} vs ${b}`).toBeLessThanOrEqual(n);
const closeV = (a, b, tol, what) => b.forEach((v, i) => expect(Math.abs(a[i] - v), `${what}[${i}] ${a[i]} vs ${v}`).toBeLessThanOrEqual(tol));

describe('torus-chart golden: saved state and snapshot Settings', () => {
  it('chart for a torus: the saved Manipulate variables are the opening state of the port', () => {
    expect(live).toEqual(initialState());
    expect(snap(1)).toEqual(live);
    expect(specs).toEqual(initialSettings());
  });
  it('chart for a torus: the saved state gives theta 5.29146324975242, phi 0.9575889779203874 and the green ball at (0.9575889779203874, 0.9917220574271663, 0)', () => {
    const r = evaluate(live);
    withinUlps(r.θ, 5.29146324975242, 1, 'θ');
    withinUlps(r.φ, 0.9575889779203874, 1, 'φ');
    closeV(r.config.center, [0.9575889779203874, 0.9917220574271663, 0], 1e-15, 'ball');
    expect(r.config.center[2]).toBe(0);
    expect(Object.is(r.config.center[2], -0)).toBe(false);
  });
  it('chart for a torus: the saved and snapshot dial points are unit vectors to 2.3e-16', () => {
    expect(Math.abs(Math.hypot(...live.p1) - 1)).toBeLessThanOrEqual(2.3e-16);
    expect(Math.abs(Math.hypot(...live.p2) - 1)).toBeLessThanOrEqual(2.3e-16);
    for (const k of [2, 3, 4]) for (const n of ['p1', 'p2']) withinUlps(Math.hypot(...snap(k)[n]), 1, 1, `snapshot ${k} |${n}|`);
  });
  it('chart for a torus: the snapshot Settings lambda 2., 0.13, 0.56, 1.45 give the labels Plane, 2-Torus, Cylinder, Plane as pictured', () => {
    expect([1, 2, 3, 4].map((k) => snap(k).λ)).toEqual([2, 0.13, 0.56, 1.45]);
    expect([1, 2, 3, 4].map((k) => plotLabel(snap(k).λ))).toEqual(['Plane', '2-Torus', 'Cylinder', 'Plane']);
  });
  it('chart for a torus: snapshots 2 to 4 Settings give the angles and the ball positions of the pictures', () => {
    const want = {
      2: { θ: 0.6218879334516852, φ: 5.241635761216535, ball: [5.328386094975314, 4.709005293658027, -1.0239788187140584] },
      3: { θ: 0.6218879334516852, φ: 5.241635761216535, ball: [5.5095942218748215, 4.838888575366346, -1.5558266856479135] },
      4: { θ: 5.239676027398976, φ: 0.5485494024505281, ball: [2.844174353672654, 0.7042672683202926, 1.426173788126596] },
    };
    for (const k of [2, 3, 4]) {
      const r = evaluate(snap(k));
      withinUlps(r.θ, want[k].θ, 1, `snapshot ${k} θ`);
      withinUlps(r.φ, want[k].φ, 1, `snapshot ${k} φ`);
      closeV(r.config.center, want[k].ball, 1e-15, `snapshot ${k} ball`);
    }
  });
});

describe('torus-chart golden: snapshot 1 picture', () => {
  const png = readPng('docs/original-snapshots/torus-chart-1.png');
  // dial centres and radius in the 2× picture (gray circles: x 42 … 338, y 103 … 397 and 430 … 725)
  const R = 147.5, θDIAL = [190, 250], φDIAL = [190, 577];
  const lum = ([r, g, b]) => (r + g + b) / 3;
  /** darkest luminance on the arc radius 0.3 at dial angle a (degrees) */
  const arcInk = ([cx, cy], a) => {
    let best = 255;
    for (let r = 0.27 * R; r <= 0.33 * R; r += 1) best = Math.min(best, lum(png.pixel(Math.round(cx + r * Math.cos((a * Math.PI) / 180)), Math.round(cy - r * Math.sin((a * Math.PI) / 180)))));
    return best;
  };
  /** centroid (screen px, relative to the arc's end) of the black arrowhead pixels next to the arc end, hand and arc excluded */
  const arrowBlob = ([cx, cy], ang) => {
    const d = [Math.cos(ang), -Math.sin(ang)], r0 = 0.3 * R, tip = [cx + r0 * d[0], cy + r0 * d[1]];
    let n = 0, sx = 0, sy = 0;
    for (let x = Math.floor(tip[0]) - 16; x <= tip[0] + 16; x++) for (let y = Math.floor(tip[1]) - 16; y <= tip[1] + 16; y++) {
      const p = png.pixel(x, y);
      if (Math.max(...p) > 90) continue; // black only (the hand is red)
      const dx = x - cx, dy = y - cy;
      if (Math.abs(dx * d[1] - dy * d[0]) < 4) continue; // the hand's black edge
      if (Math.hypot(x - tip[0], y - tip[1]) > 14 || Math.abs(Math.hypot(dx, dy) - r0) < 2.5) continue; // the arc itself
      n++; sx += x - tip[0]; sy += y - tip[1];
    }
    return { n, c: [sx / n, sy / n] };
  };
  const angleBetween = (a, b) => Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))) * 180 / Math.PI;

  it('chart for a torus: snapshots 1 and 2 show clockwise arcs with counterclockwise arrowheads for dials in the lower half', () => {
    // snapshot 1: θ dial at −56.8° (lower half), ϕ dial at +54.9°; snapshot 2's ϕ dial (−59.7°) is drawn the same way
    const gθ = dialGraphics(live.p1, { arc: 'arrowArcCircle' }), gφ = dialGraphics(live.p2, { arc: 'arrowArcCircle' });
    expect(gθ.arc.circle.end).toBeLessThan(0); // the port: from 0 clockwise to the hand
    for (const a of [-45, -30, -15]) expect(arcInk(θDIAL, a), `θ arc at ${a}°`).toBeLessThan(60);
    for (const a of [15, 30, 45, 90]) expect(arcInk(θDIAL, a), `no θ arc at ${a}°`).toBeGreaterThan(200);
    for (const a of [15, 30, 45]) expect(arcInk(φDIAL, a), `ϕ arc at ${a}°`).toBeLessThan(60);
    for (const a of [-15, -30, -45]) expect(arcInk(φDIAL, a), `no ϕ arc at ${a}°`).toBeGreaterThan(200);
    // the arrowhead lies behind the arc's end along the counterclockwise tangent (in screen y down): -(dx, -dy)
    for (const [dial, g] of [[θDIAL, gθ], [φDIAL, gφ]]) {
      const b = arrowBlob(dial, g.ang);
      expect(b.n).toBeGreaterThanOrEqual(5);
      const back = [-g.arc.direction[0], g.arc.direction[1]];
      expect(angleBetween(b.c, back), `arrowhead of the dial at ${g.ang}`).toBeLessThan(35);
    }
    // snapshot 2's ϕ dial: the same backwards arrowhead in the lower half
    expect(dialGraphics(snap(2).p2, { arc: 'arrowArcCircle' }).arc.circle.end).toBeLessThan(0);
  });
  it('chart for a torus: the plot label is gray (102, 102, 102) and larger than the tick labels as in snapshot 1', () => {
    // "Plane": darkest pixel and ink rows in x 790 … 870, y 65 … 105; the black tick label "3" of the z axis: x 520 … 535
    let darkest = [255, 255, 255];
    const rows = (x0, x1, y0, y1, t) => {
      const out = [];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (lum(png.pixel(x, y)) < t) { out.push(y); break; }
      return out;
    };
    for (let y = 65; y < 105; y++) for (let x = 790; x < 870; x++) { const p = png.pixel(x, y); if (lum(p) < lum(darkest)) darkest = p; }
    darkest.forEach((c) => expect(Math.abs(c - 102)).toBeLessThanOrEqual(10));
    const lab = rows(790, 870, 65, 105, 200), tick = rows(520, 535, 305, 335, 160);
    const hLab = lab[lab.length - 1] - lab[0] + 1, hTick = tick[tick.length - 1] - tick[0] + 1;
    // measured 17 px against 15 px: larger, about 1.1× (the draft's "1.5×" was not borne out; D-TC-10)
    expect(hLab).toBeGreaterThan(hTick);
    expect(hLab / hTick).toBeLessThan(1.3);
  });
});

// ------------------------------------------------------------------------------------------- Mathematica harness
/** a scenario value as JS: "wl:-0." (a machine minus zero typed in the front end) becomes the number */
const jsValue = (v) => (Array.isArray(v) ? v.map(jsValue) : typeof v === 'string' && v.startsWith('wl:') ? Number(v.slice(3)) : v);
/** Replay: the initial settings, then each step (set: assign and evaluate once; setFrom: snapshot k's Settings). */
function replay(scenario) {
  let state = scenario.start === 'live' ? { ...live } : initialSettings();
  let r = null;
  for (const st of scenario.steps) {
    const next = st.setFrom ? snap(Number(String(st.setFrom).split(':')[1])) : { ...state, ...jsValue(toJS(st.set)) };
    r = evaluate(next);
    if (!r.indeterminate) state = next;
  }
  return { state, r };
}
/** all numbers inside a recorded value (e.g. the Sphere centre inside the config Graphics3D) */
const numbersIn = (v) => {
  const j = toJS(v);
  const out = [];
  (function walk(x) { if (typeof x === 'number') out.push(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.values(x).forEach(walk); })(j);
  return out;
};
function compare(h, { ulp = 1 } = {}) {
  const { state, r } = replay(h.scenario);
  for (const name of h.scenario.capture) {
    if (name === 'θ' || name === 'φ') withinUlps(r[name], toJS(captureOf(h.record, name)), ulp, `${h.scenario.id} ${name}`);
    if (name === 'config') {
      const nums = numbersIn(captureOf(h.record, name));
      // Graphics3D[{RGBColor[0, 1, 0], Sphere[{x, y, z}, 1/5]}]: the three centre coordinates follow the colour
      const c = r.config.center;
      const i = nums.findIndex((_, k) => k + 2 < nums.length && Math.abs(nums[k] - c[0]) < 1e-9 && Math.abs(nums[k + 1] - c[1]) < 1e-9);
      expect(i, `${h.scenario.id} ball centre in the record`).toBeGreaterThanOrEqual(0);
      // bit for bit (0 and -0 equal): the order of operations of TorusToPlane is lead K-TC-09, decided here
      const diffs = c.map((x, k) => (sameDouble(x, nums[i + k]) ? null : `[${k}] ${x} (port) vs ${nums[i + k]} (recorded)`)).filter(Boolean);
      expect(diffs, `${h.scenario.id} ball bit for bit (K-TC-09)`).toEqual([]);
    }
    if (name.startsWith('%options') && name.includes('PlotLabel')) {
      expect(JSON.stringify(captureOf(h.record, name))).toContain(plotLabel(state.λ));
    }
  }
  return { state, r };
}
const plainCase = (id, extra = () => {}) => (ctx) => {
  const h = harnessCase(DIR, id);
  if (h.status !== 'ok') return ctx.skip(h.reason);
  extra(compare(h), h);
};
/** recorded manifold vertices: every port grid point lies within tol of a recorded polygon vertex set (coarse check) */
function manifoldNear(h, λ, tol) {
  const nums = numbersIn(captureOf(h.record, 'manifold'));
  const pts = [];
  for (let k = 0; k + 2 < nums.length; k += 3) pts.push(nums.slice(k, k + 3));
  expect(pts.length).toBeGreaterThan(100);
  // each recorded point lies on the port's surface: near some sampled point of a fine grid
  const s = sampleManifold(λ, 144);
  const P = s.positions;
  for (const p of pts.filter((_, i) => i % 97 === 0)) {
    let best = Infinity;
    for (let k = 0; k < P.length; k += 3) best = Math.min(best, Math.hypot(P[k] - p[0], P[k + 1] - p[1], P[k + 2] - p[2]));
    expect(best).toBeLessThan(tol);
  }
}

describe('torus-chart golden: Mathematica harness records', () => {
  it('torus-chart: harness H-TC-01 the saved state', plainCase('H-TC-01'));
  it('torus-chart: harness H-TC-02 the initial settings', plainCase('H-TC-02', ({ r }) => {
    expect([r.θ, r.φ]).toEqual([0, 0]);
    expect(r.label).toBe('2-Torus');
  }));
  it('torus-chart: harness H-TC-03 to H-TC-05 the manifold at lambda 0.13, 0.56 and 1.45 (mesh, lighting, sampling)', (ctx) => {
    const hs = ['H-TC-03', 'H-TC-04', 'H-TC-05'].map((id) => harnessCase(DIR, id));
    const missing = hs.find((h) => h.status !== 'ok');
    if (missing) return ctx.skip(missing.reason);
    hs.forEach((h, i) => { compare(h); manifoldNear(h, [0.13, 0.56, 1.45][i], 0.2); });
  });
  it('torus-chart: harness H-TC-06 lambda = 1 at the branch boundary', plainCase('H-TC-06'));
  it('torus-chart: harness H-TC-07 to H-TC-10 plot labels at and around 1/2 and 1.2', (ctx) => {
    const hs = ['H-TC-07', 'H-TC-08', 'H-TC-09', 'H-TC-10'].map((id) => harnessCase(DIR, id));
    const missing = hs.find((h) => h.status !== 'ok');
    if (missing) return ctx.skip(missing.reason);
    hs.forEach((h) => compare(h));
  });
  it('torus-chart: harness H-TC-11 a dial point at the exact centre', (ctx) => {
    const h = harnessCase(DIR, 'H-TC-11');
    if (h.status !== 'ok') return ctx.skip(h.reason);
    expect(replay(h.scenario).r.indeterminate).toBe(true); // the port keeps the previous state (K-TC-03)
    expect(JSON.stringify(captureOf(h.record, '%messages'))).toMatch(/ArcTan::indet|Indeterminate/);
  });
  it('torus-chart: harness H-TC-12 dial points on the axes give 0, π and 3π/2', plainCase('H-TC-12', ({ r }) => {
    expect(r.θ).toBe(Math.PI);
    expect(r.φ).toBe(4.71238898038469);
  }));
  it('torus-chart: harness H-TC-13 a dial point just below the positive x axis gives θ = 2π in machine arithmetic', plainCase('H-TC-13', ({ r }) => {
    expect(r.θ).toBe(2 * Math.PI);
    // λ = 2: x = (λ−1)·v + (2−λ)(…) = 1, y = (λ−1)(−u + 2π) + 0 = 0 for u = 2π, z = (λ−2)(v−π) = 0
    expect(r.config.center).toEqual([1, 0, 0]);
  }));
  it('torus-chart: harness H-TC-14 negative zero in a dial point', plainCase('H-TC-14', ({ r }) => expect(r.θ).toBe(Math.PI)));
});
