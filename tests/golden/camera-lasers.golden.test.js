// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/camera-lasers.golden.test.js — the camera-lasers port against the ORIGINAL notebook's saved states
// (tests/golden/camera-lasers.original-states.json: live state, initial settings, the four snapshot cells' Settings),
// positions read off the snapshot pictures (docs/original-snapshots/camera-lasers-k.png, 2× pictures: the camera image
// spans x 331…1232 px for u −0.8…0.8, i.e. 563 px per unit about 781.5 px, and y 541…991 px for v 0.4…−0.4 about
// 766 px) and the Mathematica harness (tests/golden/camera-lasers.harness.json; the harness tests SKIP with the
// documented reason until it exists). The original computes exactly where its inputs are exact and the port with
// machine numbers (D-CL-01): coordinates are compared to 1e-12, decisions exactly.
import { describe, it, expect } from 'vitest';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import { evaluate, initialSettings, fromSaved, Q, N, isExact } from '../../demos/camera-lasers/model.js';
import { nearest32Index } from '../../demos/common/dial-control.js';
import { numberText } from '../../shared/mma-text.js';
import { cosPi, sinPi } from '../../shared/exact-pi.js';
import { harnessCase, stepRecord, toJS } from '../support/harness-json.js';

const fixture = loadStates('tests/golden/camera-lasers.original-states.json');
const snaps = fixture.snapshots.map((s) => fromSaved(plain(s)));
const view = (k) => evaluate(snaps[k - 1]).view;
const close = (a, b, tol = 1e-12) => {
  if (Array.isArray(b)) { expect(a.length).toBe(b.length); a.forEach((x, i) => close(x, b[i], tol)); return; }
  expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
};
const pxU = (u) => 781.5 + u * 563;
const pxV = (v) => 766 - v * 563;
const dots = (v) => v.cam.filter((c) => c.kind === 'point');
const faceUs = (v) => [...new Set(v.faces.flat().map((q) => q[0]))].sort((a, b) => a - b);

describe('camera-lasers golden: saved states of the original', () => {
  it('camera-lasers: the saved state is the state after the first evaluation of the initial settings', () => {
    const live = fromSaved(plain(fixture.live));
    expect(fromSaved(plain(fixture.specs))).toEqual(live); // live state = initial settings (F-CL-07)
    expect(fixture.live.p[1]).toEqual({ wl: '-1/5', n: -0.2 }); // Rational[-1, 5], loaded as its double
    expect(live).toEqual(initialSettings());
    expect(evaluate(initialSettings()).state).toEqual(live);
  });

  it('camera-lasers: the four snapshot settings keep p and pFixed when evaluated', () => {
    for (const s of snaps) {
      const { state } = evaluate(s);
      expect(state.p).toEqual(s.p);
      expect(state.pFixed).toEqual(s.pFixed);
      expect(s.p[1]).toBeGreaterThan(-4);
    }
  });

  it('camera-lasers: snapshot 1 shows dots at u = ±0.2 and the front face from -0.36 to 0.44', () => {
    const v = view(1);
    close(v.InterPt3D1, [-0.2, 0]);
    close(v.InterPt3D2, [0.2, 0]);
    close(dots(v).map((d) => d.size), [0.04, 0.04]);
    close(faceUs(v), [-0.36, 0.44]);
    close([...new Set(v.faces.flat().map((q) => q[1]))].sort((a, b) => a - b), [-0.2, 0.2]);
    // picture camera-lasers-1.png: dots centred at 669 and 894 px, 37 px wide (0.04 × 450 × 2 = 36); face 579…1029 × 654…879
    expect(Math.abs(pxU(-0.2) - 669)).toBeLessThan(2);
    expect(Math.abs(pxU(0.2) - 894)).toBeLessThan(2);
    expect(Math.abs(0.04 * 450 * 2 - 37)).toBeLessThan(2);
    expect(Math.abs(pxU(-0.36) - 579)).toBeLessThan(2);
    expect(Math.abs(pxU(0.44) - 1029)).toBeLessThan(2);
    expect(Math.abs(pxV(0.2) - 654)).toBeLessThan(2);
    expect(Math.abs(pxV(-0.2) - 879)).toBeLessThan(2);
  });

  it('camera-lasers: snapshot 2 dots at u = ±0.0776, face from -0.152 to 0.158', () => {
    const v = view(2);
    close([v.InterPt1[0], v.InterPt2[0]], [6.44, 6.44]);
    close(v.InterPt3D1, [-0.07763975155279502, 0]);
    close(v.InterPt3D2, [0.07763975155279502, 0]);
    close(faceUs(v), [-0.15217391304347827, 0.15838509316770188]);
    expect(Math.abs(pxU(-0.0776) - 738)).toBeLessThan(2);
    expect(Math.abs(pxU(0.0776) - 825)).toBeLessThan(2);
    expect(Math.abs(pxU(-0.1522) - 696)).toBeLessThan(3);
    expect(Math.abs(pxU(0.1584) - 871)).toBeLessThan(3);
  });

  it('camera-lasers: snapshot 3 (s 0.65) reticule labels in halves and two visible faces', () => {
    const v = view(3);
    expect(v.sc).toEqual(Q(1, 2));
    const labels = v.cam.filter((c) => c.role === 'tick-label').map((c) => ({ text: numberText(c.value), u: c.at[0], exact: isExact(c.value) }));
    const right = labels.filter((l) => l.u > 0).sort((a, b) => b.u - a.u);
    expect(right.map((l) => l.text)).toEqual(['0.4', '1/2', '0.6', '0.75', '1', '3/2', '5/2', '5']);
    expect(right.map((l) => l.exact)).toEqual([false, true, false, false, true, true, true, true]);
    close(right.map((l) => l.u), [0.8125, 0.65, 0.5416666666666667, 0.43333333333333335, 0.325, 0.21666666666666667, 0.13, 0.065], 1e-12);
    const left = labels.filter((l) => l.u < 0).sort((a, b) => a.u - b.u).filter((l) => l.u >= -0.8);
    expect(left.map((l) => l.text)).toEqual(['−1/2', '−0.6', '−0.75', '−1', '−3/2', '−5/2', '−5']); // as the picture shows them
    close([v.InterPt1[0], v.InterPt2[0]], [7.139717781462682, 4.985069214771844]);
    close([v.InterPt3D1[0], v.InterPt3D2[0]], [-0.0455, 0.0652], 1e-3);
    expect(v.faces.length).toBe(2);
    close(faceUs(v), [-0.0822, 0.0604, 0.1345], 1e-3);
    expect(v.top.some((t) => t.role === 'theta-label')).toBe(true);
    expect(Math.abs(pxU(-0.0455) - 757)).toBeLessThan(2);
    expect(Math.abs(pxU(0.0652) - 818)).toBeLessThan(2);
  });

  it('camera-lasers: snapshot 4 only the left laser hits (x 4.514), one dot', () => {
    const v = view(4);
    close(v.InterPt1, [4.51422817341176, 1]);
    expect(v.InterPt2).toEqual([10000, -1]);
    close(v.InterPt3D1[0], -0.11076090547326287);
    const visible = dots(v).filter((d) => d.size * 450 > 1);
    expect(visible.length).toBe(1);
    close(faceUs(v), [-0.2342, 0.0267, 0.0981], 1e-3);
    expect(Math.abs(pxU(-0.11076) - 719)).toBeLessThan(2);
    // the lower beam runs to x = 10000 (past the right edge of the top view) and its reflection back along the axis
    expect(v.top.find((t) => t.role === 'beam-2').pts[1]).toEqual([10000, -1]);
  });

  it('camera-lasers: snapshots 3 and 4 have off-grid dial values (made with an earlier dial)', () => {
    const steps = [];
    for (const k of [3, 4]) {
      const [x, y] = snaps[k - 1].p1;
      close(Math.hypot(x, y), 1, 1e-15);
      steps.push(Math.atan2(y, x) / (Math.PI / 32));
    }
    close(steps, [-10.712, -7.194], 1e-3);
    for (const s of steps) expect(Number.isInteger(Math.round(s * 1000) / 1000)).toBe(false);
    expect([3, 4].map((k) => nearest32Index(snaps[k - 1].p1))).toEqual([-11, -7]);
    expect(nearest32Index(snaps[1].p1)).toBe(0);
  });
});

// ------------------------------------------------------------------------------------------------ harness replays
/** Values of the camera-lasers scenarios: lexical numbers, and the few "wl:" lists they use ({3,-1/5}, {Cos[Pi/32],Sin[Pi/32]}). */
function wlValue(text) {
  const items = text.replace(/^wl:\{|\}$/g, '').split(',').map((t) => t.trim());
  const piArg = (a) => {
    const m = a.match(/^(-?)(\d*)\s*Pi(?:\/(\d+))?$/);
    if (!m) throw new Error(`unsupported angle ${a}`);
    return [(m[1] ? -1 : 1) * (m[2] ? Number(m[2]) : 1), m[3] ? Number(m[3]) : 1];
  };
  return items.map((t) => {
    let m = t.match(/^(Cos|Sin)\[(.+)\]$/);
    if (m) { const [n, d] = piArg(m[2]); return m[1] === 'Cos' ? cosPi(n, d) : sinPi(n, d); }
    m = t.match(/^(-?\d+)(?:\/(\d+))?$/);
    if (m) return Number(m[1]) / (m[2] ? Number(m[2]) : 1);
    throw new Error(`unsupported value ${t}`);
  });
}
const portName = (k) => (k === 'λ' ? 'lambda' : k);
function replay(scenario) {
  let state = initialSettings();
  const out = [];
  for (const step of scenario.steps) {
    for (const [k, v] of Object.entries(step.set ?? {})) state[portName(k)] = typeof v === 'string' && v.startsWith('wl:') ? wlValue(v) : toJS(v);
    const r = evaluate(state);
    state = r.state;
    out.push({ state, view: r.view });
  }
  return out;
}
function numericDiff(rec, act, where) {
  if (Array.isArray(rec)) {
    if (!Array.isArray(act) || act.length !== rec.length) return `${where}: length`;
    for (let i = 0; i < rec.length; i++) { const d = numericDiff(rec[i], act[i], `${where}[${i}]`); if (d) return d; }
    return null;
  }
  const a = typeof act === 'object' && act !== null ? N(act) : act;
  const tol = Math.abs(rec) > 100 ? 1e-9 : 1e-12;
  return Math.abs(rec - a) <= tol * Math.max(1, Math.abs(rec)) ? null : `${where}: ${rec} vs ${a}`;
}
/** The InputForm-like texts of the port's pictures (labels: "1/2", "-1/2", reals by value). */
function textsMatch(recTexts, view) {
  const portLabels = view.cam.filter((c) => c.role === 'tick-label').map((c) => c.value);
  const others = [...view.top, ...view.cam].filter((c) => c.kind === 'text').map((c) => c.text);
  for (const t of recTexts) {
    const m = String(t).match(/^(-?\d+)\/(\d+)$|^(-?\d+)$|^(-?\d*\.\d*(?:\*\^-?\d+)?)$/);
    if (m) {
      const exact = m[1] !== undefined || m[3] !== undefined;
      const val = m[1] !== undefined ? Number(m[1]) / Number(m[2]) : Number(String(m[3] ?? m[4]).replace('*^', 'e'));
      if (!portLabels.some((x) => isExact(x) === exact && Math.abs(N(x) - val) <= 1e-12 * Math.max(1, Math.abs(val)))) return `text ${t} not drawn with that exactness`;
    } else if (!others.includes(t)) return `text ${t} not drawn`;
  }
  return null;
}
function compare(scenario, record, results) {
  const diffs = [];
  const check = (caps, { state, view }, where) => {
    for (const [name, rec] of Object.entries(caps ?? {})) {
      if (name === '%primitives' || name === '%g' || name === '%messages' || name.startsWith('wl:')) continue; // drawn data: checked by the unit tests
      if (name === '%text') { const d = textsMatch(toJS(rec), view); if (d) diffs.push(`${where}: ${d}`); continue; }
      const actual = { sc: view.sc, 'θ': view.theta, objectPts: view.objectPts, InterPt1: view.InterPt1, InterPt2: view.InterPt2,
        InterPt3D1: view.InterPt3D1, InterPt3D2: view.InterPt3D2, p: state.p, pFixed: state.pFixed }[name];
      const d = numericDiff(toJS(rec), actual, `${where} ${name}`);
      if (d) diffs.push(d);
    }
  };
  if (scenario.captureEachStep) scenario.steps.forEach((_, i) => check(stepRecord(record, i + 1).capture, results[i], `step ${i + 1}`));
  else check(record.capture, results[results.length - 1], 'end');
  return diffs;
}
function harnessTest(id, title) {
  it(`${id}: ${title}`, (ctx) => {
    const h = harnessCase('camera-lasers', id);
    if (h.status !== 'ok') return ctx.skip(h.reason);
    if (id === 'H-CL-16') {
      // which of the 65 points Nearest returns for the dial centre; dial-control.js pins k = −29 (K-CL-09)
      const pos = toJS(h.record.capture['wl:Position[Table[{Cos@a,Sin@a},{a,-Pi,Pi,Pi/32}],First@Nearest[Table[{Cos@a,Sin@a},{a,-Pi,Pi,Pi/32}],{0.,0.}]]']);
      expect(pos.flat()[0] - 33, 'k of the point Mathematica returns').toBe(nearest32Index([0, 0]));
      return;
    }
    expect(compare(h.scenario, h.record, replay(h.scenario))).toEqual([]);
  });
}

describe('camera-lasers golden: Mathematica harness (tests/golden/camera-lasers.harness.json)', () => {
  harnessTest('H-CL-01', 'the opening state computed exactly');
  harnessTest('H-CL-02', 'snapshot setting 2');
  harnessTest('H-CL-03', 'snapshot setting 3');
  harnessTest('H-CL-04', 'snapshot setting 4');
  harnessTest('H-CL-05', 'sc and label exactness for every Piecewise branch and boundary');
  harnessTest('H-CL-06', 'Round half to even in the ground grid');
  harnessTest('H-CL-07', 'exact dial values give the same θ, objectPts and θ label');
  harnessTest('H-CL-08', 'the locator rule over three steps');
  harnessTest('H-CL-09', 'both lasers miss');
  harnessTest('H-CL-10', 'corner hit, exact and machine p');
  harnessTest('H-CL-11', 'faces at x = 0 and x = 0.05');
  harnessTest('H-CL-12', 'object reaching behind the camera');
  harnessTest('H-CL-13', 'laser spacing extremes');
  harnessTest('H-CL-14', 'focal length extremes');
  harnessTest('H-CL-15', 'θ = π: half-circle arc and the θ label');
  harnessTest('H-CL-16', 'which dial point Mathematica’s Nearest returns for the dial centre');

  it('the harness replay helper reads the wl: values of the scenarios', () => {
    expect(wlValue('wl:{3,-1/5}')).toEqual([3, -0.2]);
    expect(wlValue('wl:{Cos[Pi/32],Sin[Pi/32]}')).toEqual([cosPi(1, 32), sinPi(1, 32)]);
    expect(wlValue('wl:{Cos[31 Pi/32],Sin[-Pi]}')).toEqual([cosPi(31, 32), 0]);
    const r = replay({ steps: [{ set: { p: 'wl:{3,-1}', p1: [1, 0] } }] });
    expect(r[0].view.InterPt1).toEqual([2.5, 1]);
  });
});
