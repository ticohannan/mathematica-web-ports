// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by D. Meliga, S. Z. Lavagnino and A. Ratti
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/catch-a-standing-wave.test.js — the model of "How to Catch a Standing Wave" against values from outside the
// port: the notebook's saved states and snapshot Settings, the snapshot pictures (button shading, node positions read
// from the pictures) and closed forms derived by hand (sin(kx + t) + sin(kx − t) = 2 sin(kx) cos t, nodes at iπ/k).
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  initialState, evaluate, sin6, nodes, nodeBound, fAt, fIndex, isPiOverF, ptValue, firstHarmonic, PLOT_RANGE,
} from '../../demos/catch-a-standing-wave/model.js';
import { annotation, Cases } from '../../shared/graphics.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/catch-a-standing-wave.original-states.json', 'utf8'));
const plain = (v) => JSON.parse(JSON.stringify(v), (k, x) => (x && typeof x === 'object' && !Array.isArray(x) && typeof x.wl === 'string' && 'n' in x ? x.n : x));
/** a snapshot's Settings as a port state (pt given as the expression {π/f, 0} holds it, as the page's setState does) */
const stateOf = (st) => {
  const s = plain(st);
  return isPiOverF(st.pt) ? { ...s, pt: firstHarmonic(s.f), ptExpr: 'Pi/f' } : { ...s, ptExpr: null };
};

describe('catch-a-standing-wave model', () => {
  it('the opening state is the live state of the notebook and its initial settings (pt holds the expression {π/f, 0})', () => {
    const s = initialState();
    for (const saved of [fx.states[0], fx.specs]) {
      expect(s.f).toBe(saved.f);
      expect(s.a).toBe(saved.a);
      expect(s.t).toBe(saved.t);
      expect(isPiOverF(saved.pt)).toBe(true);
    }
    expect(s.ptExpr).toBe('Pi/f');
    expect(s.pt).toEqual([Math.PI / 0.18, 0]);
  });

  it('isPiOverF recognises the saved form of {π/f, 0} and nothing else', () => {
    expect(isPiOverF(fx.snapshots['1'].pt)).toBe(true);
    expect(isPiOverF(plain(fx.snapshots['1'].pt))).toBe(true); // Pi already turned into its number
    expect(isPiOverF([{ wl: 'Pi/f' }, 0])).toBe(true);
    for (const k of ['2', '3', '4']) expect(isPiOverF(fx.snapshots[k].pt), k).toBe(false);
    expect(isPiOverF([17.45, 0])).toBe(false);
  });

  it('pt holding {π/f, 0} follows the frequency; a number does not', () => {
    expect(ptValue({ f: 0.5, ptExpr: 'Pi/f', pt: [1, 1] })).toEqual([Math.PI / 0.5, 0]);
    expect(ptValue({ f: 0.5, ptExpr: null, pt: [1, 1] })).toEqual([1, 1]);
    const r = evaluate({ ...initialState(), f: fAt(90) }); // the slider moved to 0.5
    expect(r.view.pt[0]).toBe(Math.PI / fAt(90));
    expect(annotation(r.graphics[1], 'cavity-line').g.pts).toEqual([[Math.PI / fAt(90), -2], [Math.PI / fAt(90), 2]]);
  });

  it('the frequency slider: values 1.4 − k·0.01 from the bottom (1.4) to the top (0.18), as the snapshots store them', () => {
    // snapshot Settings f = 0.2699999999999998, 0.24999999999999978, 0.5399999999999999: 1.4 − 113·0.01, − 115·0.01, − 86·0.01
    expect(fAt(fIndex(fx.snapshots['2'].f))).toBe(fx.snapshots['2'].f);
    expect(fAt(fIndex(fx.snapshots['3'].f))).toBe(fx.snapshots['3'].f);
    expect(fAt(fIndex(fx.snapshots['4'].f))).toBe(fx.snapshots['4'].f);
    expect([fIndex(fx.snapshots['2'].f), fIndex(fx.snapshots['3'].f), fIndex(fx.snapshots['4'].f)]).toEqual([113, 115, 86]);
    expect(fAt(0)).toBe(1.4);
    expect(fAt(122)).toBe(0.18); // the top end is max itself (1.4 − 122·0.01 would be 0.17999999999999994)
    expect(fIndex(0.18)).toBe(122);
  });

  it('the first harmonic setter gives {π/f, 0} at the current f: snapshot 3 stores exactly π/f of its f', () => {
    const s3 = fx.snapshots['3'];
    expect(firstHarmonic(s3.f)).toEqual(s3.pt);
    expect(s3.pt[0]).not.toBe(4 * Math.PI); // the slider's 0.24999999999999978, not 0.25
  });

  it('sin6 samples {x, Sin[f x + t] + Sin[f x − t]} at x = 0, .001, … ≤ n, = 2 sin(f x) cos t', () => {
    const d = sin6(0.3, 2.5, 1.2);
    expect(d.length).toBe(2501);
    expect(d[0]).toEqual([0, Math.sin(1.2) + Math.sin(-1.2)]);
    expect(d[1000][0]).toBeCloseTo(1, 15);
    for (const [x, y] of [d[0], d[777], d[2500]]) expect(y).toBeCloseTo(2 * Math.sin(0.3 * x) * Math.cos(1.2), 14);
    expect(sin6(0.3, -0.5, 1)).toEqual([]);
    expect(sin6(0.3, 0.0005, 1).length).toBe(1);
  });

  it('nodes at iπ/(a f) up to the cavity end, read from the snapshot pictures', () => {
    // picture 2: one node at π/0.27 ≈ 11.64 (under the red point); picture 4: 5.82 (red) and 11.64 (black, left of the
    // line at 11.82); picture 3 (a = 3): 4.19, 8.38 and the cavity end 12.57 (under the red point)
    const n2 = nodes(19.26, 1, fx.snapshots['2'].f);
    expect(n2.map((p) => +p[0].toFixed(2))).toEqual([11.64]);
    const n4 = nodes(11.82, 1, fx.snapshots['4'].f);
    expect(n4.map((p) => +p[0].toFixed(2))).toEqual([5.82, 11.64]);
    const s3 = fx.snapshots['3'];
    expect(nodes(s3.pt[0], 3, s3.f).map((p) => +p[0].toFixed(2))).toEqual([4.19, 8.38, 12.57]);
    expect(nodes(-0.5, 1, 0.18)).toEqual([]);
    expect(nodes(10, 1, 0.18)).toEqual([]); // 10·0.18/π = 0.57 < 1
  });

  it('a resonance whose bound comes out just below a whole number still draws the node at the cavity end (K-CA-04)', () => {
    // first harmonic at f = 1.4, then f = 0.7 (1.4 − 70·0.01) and 2nd harmonic: L = π/1.4 is one half wavelength of 2·0.7
    const L = firstHarmonic(1.4)[0];
    expect(nodeBound(L, 2, fAt(70))).toBe(0.9999999999999998);
    const n = nodes(L, 2, fAt(70));
    expect(n.length).toBe(1);
    expect(n[0][0]).toBeCloseTo(L, 14);
    // at the first harmonic itself the bound is within 2 ulps of a for every slider value and harmonic
    for (let k = 0; k <= 122; k++) for (let a = 1; a <= 5; a++) expect(nodes(Math.PI / fAt(k), a, fAt(k)).length).toBe(a);
  });

  it('the two plots: waves Sin[a f x ∓ t], the standing wave, the cavity lines, the red ends at 0 and π/f', () => {
    const s = { f: 0.25, t: 0.7, a: 2, pt: [9, 1.5], ptExpr: null };
    const { view, graphics: [top, bottom] } = evaluate(s);
    expect(top.options.PlotRange).toEqual(PLOT_RANGE);
    expect(top.options.PlotLabel).toBe('forward and backward waves');
    expect(bottom.options.PlotLabel).toBe('standing wave');
    expect(top.options.AxesLabel).toEqual(['length', 'amplitude']);
    const curves = Cases(top.list, 'Line').filter((l) => l.pts.length > 2);
    expect(curves.length).toBe(2);
    for (const [i, sign] of [[0, -1], [1, 1]]) {
      for (const [x, y] of curves[i].pts.filter((_, j) => j % 17 === 0)) expect(y).toBeCloseTo(Math.sin(0.5 * x + sign * 0.7), 12);
      expect(curves[i].pts[0][0]).toBe(0);
      expect(curves[i].pts.at(-1)[0]).toBe(20);
    }
    expect(annotation(top.list, 'cavity-line-top').g.pts).toEqual([[9, -1], [9, 1]]);
    expect(annotation(bottom.list, 'cavity-line').g.pts).toEqual([[9, -2], [9, 2]]);
    expect(annotation(bottom.list, 'end-0').g.pts).toEqual([[0, 0]]);
    expect(annotation(bottom.list, 'end-1').g.pts).toEqual([[Math.PI / 0.25, 0]]);
    expect(annotation(bottom.list, 'end-1').style.color.slice(0, 3)).toEqual([1, 0, 0]);
    // nodes of k = a f = 0.5: π/0.5 = 6.28 only (2π = 12.57 > 9)
    expect(view.nodes).toEqual([Math.PI / 0.5]);
    const wave = Cases(bottom.list, 'Line').find((l) => l.pts.length > 100);
    expect(wave.pts.length).toBe(9001);
    for (const [x, y] of wave.pts.filter((_, j) => j % 500 === 0)) expect(y).toBeCloseTo(2 * Math.sin(0.5 * x) * Math.cos(0.7), 12);
  });

  it('the snapshots: cavity end, nodes, and the "first harmonic" button pressed in pictures 1 and 3 only', () => {
    // the pictures: the button is darker (pressed) in snapshots 1 and 3, light in 2 and 4 (pixel average 207 vs 223)
    const pressed = { 1: true, 2: false, 3: true, 4: false };
    const ends = { 1: Math.PI / 0.18, 2: 19.26, 3: fx.snapshots['3'].pt[0], 4: 11.82 };
    for (const k of ['1', '2', '3', '4']) {
      const { view } = evaluate(stateOf(fx.snapshots[k]));
      expect(view.firstHarmonicPressed, k).toBe(pressed[k]);
      expect(view.cavity, k).toBe(ends[k]);
    }
    // picture 1: amplitude of the standing wave 2 cos 1 ≈ 1.08 at its crest
    const { graphics } = evaluate(stateOf(fx.snapshots['1']));
    const wave = Cases(graphics[1].list, 'Line').find((l) => l.pts.length > 100);
    expect(Math.max(...wave.pts.map((p) => p[1]))).toBeCloseTo(2 * Math.cos(1), 6);
  });

  it('the opening picture is the first harmonic at f = 0.18: one half wavelength between the red ends', () => {
    const { view } = evaluate(initialState());
    expect(view.wavelength / 2).toBeCloseTo(view.cavity, 12);
    expect(view.firstHarmonicEnd).toBe(view.cavity);
    expect(Math.abs(view.standingAtEnd)).toBeLessThan(1e-3);
  });
});
