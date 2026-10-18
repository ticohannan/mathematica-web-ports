// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/four-bar-linkage.golden.test.js — the port against the ORIGINAL: the live state (= the initial settings
// = snapshot 1's Settings) and the Settings of snapshots 2–4 stored in the notebook, with the original's Plot samples
// (tests/golden/four-bar-linkage.original-states.json, tools/extract_state.py --snapshots); what the snapshot pictures
// show (docs/original-snapshots/four-bar-linkage-k.png); and the Mathematica harness records
// (tests/golden/four-bar-linkage.harness.json; until the owner's run exists those tests skip with the reason
// "no harness data (owner run pending)").
// The correctly rounded Cos, Sin and ArcCos below (BigInt fixed point, 200 bits, rounded once) are an independent
// reference used to show which arithmetic order reproduces the stored values (DESIGN §6.4).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import * as F from '../../demos/four-bar-linkage/fourbar.js';
import { arcTan } from '../../shared/mma-exact.js';
import { mEqual, mGreaterEq } from '../../shared/mma.js';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import { harnessCase, captureOf, firstDifference, toJS } from '../support/harness-json.js';

const TABLE = JSON.parse(fs.readFileSync('demos/four-bar-linkage/recorded-samples.json', 'utf8'));
F.useRecordedSamples(TABLE);
const fx = loadStates('tests/golden/four-bar-linkage.original-states.json');
const snap = (k) => plain(fx.snapshots[k - 1]);
const PI = Math.PI;
const NAMES = ['p', 'spacing', 'links', 'spacingOld', 'linksOld', 'pnear', 'pvals'];

/** the Lines of a stored plot (fixture encoding {head, args}), with the index of the curve colour before each */
function plotLinesOf(plot) {
  const out = [];
  let colour = -1;
  const walk = (v) => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    const h = v.head ?? v.h, a = v.args ?? v.a;
    if (h === 'RGBColor') { colour = F.CURVE_COLOURS.findIndex((c) => c.every((x, i) => x === toJS(a[i]))); return; }
    if (h === 'Line') { out.push({ colour, pts: toJS(a[0]) }); return; }
    if (a) a.forEach(walk);
  };
  walk(plot);
  return out;
}
const optionOf = (plot, name) => {
  const opts = plot.args.slice(1).flat();
  const r = opts.find((o) => o.head === 'Rule' && o.args[0].sym === name);
  return r && r.args[1];
};
const curvePoints = (pvals, curve1) => [pvals.slice(0, curve1).map((r) => r[0]), pvals.slice(curve1).map((r) => r[1])]
  .map((c) => [...c].sort((a, b) => a[0] - b[0]));

// ---- correctly rounded Cos, Sin, ArcCos (independent reference; BigInt fixed point) --------------------------------
const P = 200n, ONE = 1n << P;
const toFix = (x) => { // exact for the doubles used here
  if (x === 0) return 0n;
  const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, Math.abs(x));
  const bits = b.getBigUint64(0), e = Number((bits >> 52n) & 0x7ffn), m = (bits & ((1n << 52n) - 1n)) | (e ? 1n << 52n : 0n);
  const sh = BigInt((e || 1) - 1075) + P;
  const v = sh >= 0n ? m << sh : m >> -sh;
  return x < 0 ? -v : v;
};
const toDouble = (X) => { // round to nearest
  if (X === 0n) return 0;
  const neg = X < 0n, A = neg ? -X : X;
  const len = A.toString(2).length, drop = len - 53;
  let q = drop > 0 ? A >> BigInt(drop) : A << BigInt(-drop);
  if (drop > 0) { const rem = A - (q << BigInt(drop)), half = 1n << BigInt(drop - 1); if (rem > half || (rem === half && (q & 1n))) q += 1n; }
  const v = Number(q) * 2 ** (drop - Number(P));
  return neg ? -v : v;
};
const mul = (a, b) => (a * b) >> P;
const div = (a, b) => (a << P) / b;
function sincosFix(X) {
  let s = 0n, c = 0n, term = ONE, k = 0n; // term = X^k / k!
  while (term !== 0n) {
    const r = k % 4n;
    if (r === 0n) c += term; else if (r === 1n) s += term; else if (r === 2n) c -= term; else s -= term;
    k += 1n;
    term = mul(term, X) / k;
  }
  return [s, c];
}
const crSin = (x) => toDouble(sincosFix(toFix(x))[0]);
const crCos = (x) => toDouble(sincosFix(toFix(x))[1]);
const crAcos = (q) => {
  if (q > 1 || q < -1) return NaN;
  const Q = toFix(q);
  let Y = toFix(Math.acos(q));
  for (let i = 0; i < 6; i++) { const [s, c] = sincosFix(Y); if (s === 0n) break; Y += div(c - Q, s); }
  return toDouble(Y);
};
const T = (...xs) => [...xs].sort((a, b) => a - b).reduce((r, x) => r * x);
/** Φpos/Φneg with a chosen order of the five addends of γ: 'written' or 'ascending'; correctly rounded functions */
function phiCR(t, [l1, l2, l3, l4], sign, plusOrder = 'written') {
  const c = crCos(t), s = crSin(t);
  const A = T(2, l3, l4) + T(-2, l1, l3, c), B = T(-2, l1, l3, s);
  const terms = [l2 * l2, -(l4 * l4), -(l3 * l3), -(l1 * l1), T(2, l1, l4, c)];
  const G = (plusOrder === 'written' ? terms : [...terms].sort((a, b) => a - b)).reduce((r, x) => r + x);
  const r = A * A + B * B;
  if (mGreaterEq(G * G, r)) return null;
  const v = arcTan(A, B) + sign * crAcos(G * (1 / Math.sqrt(r)));
  let p = arcTan(crCos(v), crSin(v));
  if (mEqual(p, -PI)) p = PI;
  return p;
}
const countBits = (pvals, l, fn) => {
  let same = 0, maxDiff = 0;
  for (const [[t, a], [, b]] of pvals) {
    for (const [want, got] of [[a, fn(t, l, 1)], [b, fn(t, l, -1)]]) {
      if (got === want) same++;
      maxDiff = Math.max(maxDiff, Math.abs(got - want));
    }
  }
  return { same, maxDiff };
};
const portPhi = (t, l, sign) => (sign > 0 ? F.Phipos(t, l) : F.Phineg(t, l));

describe('four-bar golden: saved state and snapshot Settings', () => {
  it('four-bar: recorded-samples.json holds the pvals of the live state and of snapshots 2 to 4', () => {
    for (let k = 1; k <= 4; k++) {
      const s = snap(k), t = TABLE.settings[k - 1];
      expect([t.snapshot, t.spacing, t.links]).toEqual([k, s.spacing, s.links]);
      expect(t.pvals).toEqual(s.pvals);
      expect(plotLinesOf(fx.snapshots[k - 1].plot)[0].pts.length).toBe(t.curve1);
    }
    expect(TABLE.grid).toEqual(snap(2).pvals.slice(0, 25).map((r) => r[0][0]));
  });
  it('four-bar: the saved state is the state after the first evaluation of the initial settings', () => {
    expect(plain(fx.live)).toEqual(snap(1)); // live state = snapshot 1's Settings
    const init = F.initialSettings();
    const specs = plain(fx.specs);
    for (const k of NAMES) expect(init[k], k).toEqual(specs[k]); // = the stored "Variables"
    const { state, view } = F.evaluate(init);
    expect(view.resampled).toBe(null); // no new Plot: spacingOld = spacing, linksOld = links
    const live = plain(fx.live);
    for (const k of NAMES) expect(state[k], k).toEqual(live[k]);
    expect(state.plot.lines.map((c) => c.flat(1))).toEqual(plotLinesOf(fx.live.plot).map((l) => l.pts));
    const again = F.evaluate(state).state;
    for (const k of NAMES) expect(again[k], k).toEqual(state[k]);
  });
  it('four-bar: Phipos and Phineg reproduce the 200 saved sample values', () => {
    const l = F.lenlengthsOf([1.35, 2], 0.75);
    const port = countBits(snap(1).pvals, l, portPhi);
    expect(port.maxDiff).toBeLessThan(1e-14);
    expect(port.same).toBeGreaterThanOrEqual(170);
    expect(countBits(snap(1).pvals, l, (t, ll, sg) => phiCR(t, ll, sg)).same).toBe(200); // with correctly rounded functions (I-FB-02)
  });
  it('four-bar: Phipos and Phineg reproduce the snapshot samples of settings 2, 3 and 4', () => {
    const want = { 2: 203, 3: 160, 4: 260 };
    for (const k of [2, 3, 4]) {
      const s = snap(k), l = F.lenlengthsOf(s.links, s.spacing);
      const port = countBits(s.pvals, l, portPhi);
      expect(port.maxDiff, `snapshot ${k}`).toBeLessThan(1e-14);
      expect(port.same / (2 * s.pvals.length), `snapshot ${k}`).toBeGreaterThan(0.85);
      expect(countBits(s.pvals, l, (t, ll, sg) => phiCR(t, ll, sg)).same, `snapshot ${k}`).toBe(want[k]);
    }
    // the 57 exact Pi values of snapshot 2 (written as their double in the fixture) come out as π
    expect(fx.snapshots[1].pvals.flat(1).filter((q) => typeof q[1] === 'object' && q[1].wl === 'Pi').length).toBe(57);
  });
  it('four-bar: Plus in written order: 203 of 206 snapshot-2 values, ascending order only 188', () => {
    const s = snap(2), l = F.lenlengthsOf(s.links, s.spacing);
    expect(countBits(s.pvals, l, (t, ll, sg) => phiCR(t, ll, sg, 'written')).same).toBe(203);
    expect(countBits(s.pvals, l, (t, ll, sg) => phiCR(t, ll, sg, 'ascending')).same).toBe(188);
  });
  it('four-bar: First@Nearest of the saved pvals at mod2pi of {-0.9, -1} is the saved pnear', () => {
    const pv = snap(1).pvals, x = [-0.9, -1].map(F.mod2pi);
    expect(F.nearestSample(pv, x)).toEqual([-0.8877458382200738, -0.9960977669686768]);
    const flat = pv.flat(1);
    const pos = flat.findIndex((q) => q[0] === -0.8877458382200738 && q[1] === -0.9960977669686768) + 1;
    expect(pos).toBe(70);
    expect(flat.findIndex((q, i) => i >= 70 && q[0] === -0.8877458382200738 && q[1] === -0.9960977669686768) + 1).toBe(170);
    expect(Math.hypot(flat[69][0] - x[0], flat[69][1] - x[1])).toBe(0.012860478356552464);
  });
  it('four-bar: First@Nearest at mod2pi of p gives the saved pnear in snapshots 2, 3 and 4', () => {
    const want = { 2: 37, 3: 67, 4: 53 };
    for (const k of [2, 3, 4]) {
      const s = snap(k);
      expect(s.p).toEqual([0.9100000000000001, 1.0899999999999999]);
      const near = F.nearestSample(s.pvals, s.p.map(F.mod2pi));
      expect(near, `snapshot ${k}`).toEqual(s.pnear);
      expect(s.pvals.flat(1).findIndex((q) => q[0] === near[0] && q[1] === near[1]) + 1).toBe(want[k]);
      const { state, view } = F.evaluate(F.fromSettings(s));
      expect(view.resampled).toBe(null);
      expect(state.pnear).toEqual(s.pnear);
    }
  });
  it('four-bar: the saved plot lines are the sorted sample points of each curve', () => {
    const lines = plotLinesOf(fx.live.plot);
    expect(lines.map((l) => [l.colour, l.pts.length])).toEqual([[0, 50], [1, 50]]);
    expect(lines.map((l) => l.pts)).toEqual(curvePoints(snap(1).pvals, 50));
    expect(lines[0].pts[0][0]).toBe(-1.0179884220375017);
    expect(lines[0].pts[49][0]).toBe(1.0179065968530974);
    expect(toJS(optionOf(fx.live.plot, 'PlotRangePadding'))).toEqual([[0, 0], [0, 0]]);
  });
  it('four-bar: each snapshot plot has two Lines and no exclusion segments', () => {
    for (let k = 1; k <= 4; k++) {
      const lines = plotLinesOf(fx.snapshots[k - 1].plot);
      expect(lines.map((l) => l.colour)).toEqual([0, 1]);
      expect(lines.map((l) => l.pts)).toEqual(curvePoints(snap(k).pvals, TABLE.settings[k - 1].curve1));
      expect(JSON.stringify(fx.snapshots[k - 1].plot)).not.toMatch(/"Dashing"|"Dashed"/);
    }
  });
  it('four-bar: the saved samples lie inside the true domain and reach within 6e-4 of its edges', () => {
    const pv = snap(1).pvals, edge = 1.0184438111156382;
    const ts = pv.map((r) => r[0][0]);
    expect(ts.every((t) => Math.abs(t) < edge)).toBe(true);
    expect(edge + Math.min(...ts)).toBeLessThan(6e-4);
    expect(edge - Math.max(...ts)).toBeLessThan(6e-4);
    expect(Math.abs(edge + Math.min(...ts) - 4.55e-4)).toBeLessThan(1e-5);
    expect(Math.abs(edge - Math.max(...ts) - 5.37e-4)).toBeLessThan(1e-5);
    expect(new Set(ts).size).toBe(62);
    expect(ts.slice(0, 7)).toEqual(snap(2).pvals.slice(9, 16).map((r) => r[0][0]));
    ts.slice(0, 7).forEach((t, i) => expect(Math.abs(t - (-PI + ((i + 9) * PI) / 12))).toBeLessThan(0.02));
  });
  it("four-bar: snapshot 2 records 1 to 25 are Plot's initial grid with its offsets", () => {
    const ts = snap(2).pvals.slice(0, 25).map((r) => r[0][0]);
    expect(ts[0]).toBe(-3.141592391790405);
    expect(ts[24]).toBe(3.141592391790405);
    const off = ts.map((t, k) => t - (-PI + (k * PI) / 12));
    for (const o of off.slice(1, 24)) { expect(o).toBeGreaterThanOrEqual(-0.0191); expect(o).toBeLessThanOrEqual(0.0104); }
    expect(ts.includes(0)).toBe(false);
    expect(ts.slice(9, 16)).toEqual(snap(1).pvals.slice(0, 7).map((r) => r[0][0]));
    expect(F.plotGrid()).toEqual(ts);
  });
});

describe('four-bar golden: what the snapshot pictures show', () => {
  it('four-bar: snapshot 1 shows the default curve, the locator glyph at (-0.89, -1.0) and the crank at about -51 degrees', () => {
    const { state, view } = F.evaluate(F.initialSettings());
    const [blue, orange] = curvePoints(state.pvals, 50);
    const minB = blue.reduce((m, q) => (q[1] < m[1] ? q : m)), maxO = orange.reduce((m, q) => (q[1] > m[1] ? q : m));
    expect(Math.abs(minB[1] - -2.01516)).toBeLessThan(1e-5);
    expect(Math.abs(minB[0] - -0.69150)).toBeLessThan(1e-5);
    expect(Math.abs(maxO[1] - 2.01517)).toBeLessThan(1e-5);
    expect(Math.abs(maxO[0] - 0.70964)).toBeLessThan(1e-5);
    expect(Math.abs(state.pnear[0] - -0.89)).toBeLessThan(0.01);
    expect(Math.abs(state.pnear[1] - -1.0)).toBeLessThan(0.01);
    expect(orange.some((q) => q[0] === state.pnear[0] && q[1] === state.pnear[1])).toBe(true); // on the orange curve
    expect(Math.abs((view.Thetav * 180) / PI - -50.86)).toBeLessThan(0.01);
    expect(Math.abs((view.Phiv * 180) / PI - -57.07)).toBeLessThan(0.01);
    expect(Math.max(...state.pvals.map((r) => Math.abs(r[0][0])))).toBeLessThanOrEqual(1.02);
  });
  it('four-bar: snapshot 2 shows the phi = pi branch and vertical lines at theta near -pi and 0', () => {
    const s = snap(2);
    const { state } = F.evaluate(F.fromSettings(s));
    for (const [[t, a], [, b]] of s.pvals) { // φ = π (57 exact Pi values), the rest within 1e-9 of ±π
      if (t < 0) expect(Math.abs(Math.abs(a) - PI)).toBeLessThan(1e-9);
      if (t > 0) expect(Math.abs(Math.abs(b) - PI)).toBeLessThan(1e-9);
    }
    expect(s.pvals.some((r) => r[0][0] === 0)).toBe(false);
    expect(state.plot.lines.map((c) => c.map((x) => x.length))).toEqual([[53], [50]]);
    expect(state.pnear).toEqual([1.5682884704754614, 0.9232811364269555]);
    // the blue curve jumps from φ = π (θ < 0) to φ near -π just right of θ = 0: the vertical line at θ ≈ 0
    const blue = state.plot.lines[0][0];
    const jumps = blue.slice(1).filter((q, i) => Math.abs(q[1] - blue[i][1]) > 3).map((q) => q[0]);
    expect(jumps.some((t) => Math.abs(t) < 0.1)).toBe(true);
    expect(Math.abs(blue[0][0] + PI)).toBeLessThan(1e-6);
  });
  it('four-bar: snapshot 3 has its curve inside abs(theta) < 0.6536', () => {
    const s = snap(3);
    const ts = s.pvals.map((r) => r[0][0]);
    expect(Math.min(...ts)).toBe(-0.6523648569272664);
    expect(Math.max(...ts)).toBe(0.653244269849987);
    expect(ts.every((t) => Math.abs(t) < 0.6535887566362116)).toBe(true);
    expect(F.evaluate(F.fromSettings(s)).state.pnear).toEqual([0.6071028938293324, 1.227294095393258]);
    const mine = F.plotSamples(F.lenlengthsOf(s.links, s.spacing)).records.map((r) => r[0][0]);
    expect(Math.min(...mine)).toBeGreaterThan(-0.6535887566362116);
    expect(Math.max(...mine)).toBeLessThan(0.6535887566362116);
    expect(0.6535887566362116 + Math.min(...mine)).toBeLessThan(2e-3);
  });
  it('four-bar: snapshot 4 has its bifurcation at (0, 0) and its curve inside abs(theta) < 1.3086', () => {
    const s = snap(4);
    const ts = s.pvals.map((r) => r[0][0]);
    expect(Math.min(...ts)).toBe(-1.307095547966003);
    expect(Math.max(...ts)).toBe(1.3069499162852871);
    expect(ts.every((t) => Math.abs(t) < 1.3085411679190395)).toBe(true);
    // both curves pass close to (0, 0): each curve's polyline through its samples crosses θ = 0 near φ = 0
    for (const pts of curvePoints(s.pvals, TABLE.settings[3].curve1)) {
      const i = pts.findIndex((q) => q[0] > 0);
      const [a, b] = [pts[i - 1], pts[i]];
      expect(Math.abs(a[1] + ((0 - a[0]) * (b[1] - a[1])) / (b[0] - a[0]))).toBeLessThan(0.06);
    }
    expect(F.evaluate(F.fromSettings(s)).state.pnear).toEqual([0.84510449245104, 1.1021600517398067]);
  });
});

// ---- Mathematica harness records (scenarios in tests/harness/four-bar-linkage.scenarios.json) ----
// Everything downstream of the samples is compared bit for bit by REPLAYING the harness's pvals into the port (the
// sampler is replaced by them, curve 1 = the first Line of the recorded plot); the four recorded settings use the
// port's table of the 2018 samples, so their pvals comparison answers K-FB-02; H-FB-09 and H-FB-10 run the port's own
// sampler (K-FB-03). %messages, the Plot log (wl:) and the Graphics options are not compared here.
const scenarios = JSON.parse(fs.readFileSync('tests/harness/four-bar-linkage.scenarios.json', 'utf8')).scenarios;
const OWN_SAMPLER = new Set(['H-FB-09', 'H-FB-10']);
const HARNESS_TITLES = [
  'four-bar: harness H-FB-01', 'four-bar: harness H-FB-02', 'four-bar: harness H-FB-03', 'four-bar: harness H-FB-04',
  'four-bar: harness H-FB-05', 'four-bar: harness H-FB-06', 'four-bar: harness H-FB-07', 'four-bar: harness H-FB-08',
  'four-bar: harness H-FB-09', 'four-bar: harness H-FB-10', 'four-bar: harness H-FB-11', 'four-bar: harness H-FB-12',
  'four-bar: harness H-FB-13', 'four-bar: harness H-FB-14', 'four-bar: harness H-FB-15', 'four-bar: harness H-FB-16',
  'four-bar: harness H-FB-17', 'four-bar: harness H-FB-18', 'four-bar: harness H-FB-19', 'four-bar: harness H-FB-20',
];
const setValue = (x) => (typeof x === 'string' && x.startsWith('wl:') ? { 'wl:True': true, 'wl:False': false }[x] : toJS(x));

describe('four-bar golden: Mathematica harness', () => {
  for (const title of HARNESS_TITLES) {
    const sc = scenarios.find((x) => x.id === title.slice(-7));
    it(`${title}: ${sc.why ?? ''}`, (ctx) => {
      const h = harnessCase('four-bar-linkage', sc.id);
      if (h.status !== 'ok') return ctx.skip(h.reason);
      const cap = (n) => (sc.capture.includes(n) ? captureOf(h.record, n) : undefined);
      const recPvals = cap('pvals'), recPlot = cap('plot');
      const replay = () => {
        const records = toJS(recPvals ?? []);
        const lines = recPlot ? plotLinesOf(recPlot) : [];
        const curve1 = lines.filter((l) => l.colour === 0).reduce((n, l) => n + l.pts.length, 0) || records.length;
        return { records, curve1, nulls: [[], []] };
      };
      const sampler = OWN_SAMPLER.has(sc.id) || recPvals === undefined ? F.plotSamples : replay;
      let st = F.initialSettings(), view = null;
      for (const step of h.scenario.steps) {
        if (step.set) for (const [k, x] of Object.entries(step.set)) st[k] = setValue(x);
        if (step.setFrom) st = F.fromSettings(snap(Number(String(step.setFrom).split(':')[1])));
        ({ state: st, view } = F.evaluate(st, { sampler }));
      }
      const port = {
        lenlengths: view.lenlengths, impossibleLinks: view.impossibleLinks, pnear: st.pnear, 'θv': view.Thetav, 'φv': view.Phiv,
        'α': view.Alpha, spacingOld: st.spacingOld, linksOld: st.linksOld, pvals: st.pvals,
      };
      for (const name of sc.capture) {
        if (!(name in port)) continue;
        expect(firstDifference(captureOf(h.record, name), port[name], name), `${sc.id}: ${name}`).toBe(null);
      }
      if (recPlot !== undefined && st.plot.text === null) { // the drawn points of each curve
        const lines = plotLinesOf(recPlot);
        for (const c of [0, 1]) {
          const rec = lines.filter((l) => l.colour === c).flatMap((l) => l.pts).sort((a, b) => a[0] - b[0]);
          expect(rec, `${sc.id}: plot curve ${c + 1}`).toEqual(st.plot.lines[c].flat(1).sort((a, b) => a[0] - b[0]));
        }
      }
    });
  }
});
