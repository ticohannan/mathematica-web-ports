// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Connor Davenport and Edmon Perkins
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/guitar-string-harmonics.test.js — the model of "Guitar String Harmonics: Standing Waves". Expected values
// from the notebook's saved states (tests/golden/guitar-string-harmonics.original-states.json), read off its snapshot
// pictures (docs/original-snapshots/guitar-string-harmonics-*.png) where a test says so, or derived by hand.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { numbersOf } from '../../shared/manipulate.js';
import { annotation } from '../../shared/graphics.js';
import {
  initialState, initialSettings, evaluate, displacement, wavePoints, forcedNode, f, L, λ, A, FRETS, FORCED_NODES, harmonicFrequencies,
} from '../../demos/guitar-string-harmonics/model.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/guitar-string-harmonics.original-states.json', 'utf8'));
const snap = (k) => numbersOf(fx.snapshots[k]);

describe('guitar-string-harmonics model', () => {
  it('the opening state is the live state of the notebook; Initial settings are the Manipulate\'s initial values', () => {
    expect(initialState()).toEqual(numbersOf(fx.states[0]));
    expect(initialSettings()).toEqual(numbersOf(fx.specs));
    expect(snap('1')).toEqual(numbersOf(fx.states[0])); // picture 1 is the live state; pictures 2-4 the Details' snapshots 1-3
    expect([snap('2').n, snap('3').n, snap('4').n]).toEqual([3, 4, 5]);
  });

  it('the initialization: L = 25.5, λ = 2 L, A = 0.25, f[n] = (n/2) L √41.77 (Mathematica\'s precedence)', () => {
    expect([L, λ, A]).toEqual([25.5, 51, 0.25]);
    for (let n = 1; n <= 5; n++) expect(f(n)).toBeCloseTo(n * 12.75 * 6.462971452822609, 10);
  });

  it('the harmonic frequencies table shows 82.4, 164.8, 247.2, 329.6, 412.0 Hz (as in every snapshot picture)', () => {
    expect(harmonicFrequencies()).toEqual([
      ['1st harmonic', '82.4', 'Hz'], ['2nd harmonic', '164.8', 'Hz'], ['3rd harmonic', '247.2', 'Hz'],
      ['4th harmonic', '329.6', 'Hz'], ['5th harmonic', '412.0', 'Hz'],
    ]);
  });

  it('the frets are the equal-tempered positions L·2^(−k/12) from the bridge, to three decimals', () => {
    expect(FRETS).toHaveLength(12);
    FRETS.forEach((y, i) => expect(y).toBeCloseTo(L * 2 ** (-(i + 1) / 12), 3));
  });

  it('the forced node L − L/n is a node of the wave and lies at the fret the forced-nodes table names', () => {
    for (let n = 1; n <= 5; n++) {
      const [, y] = forcedNode(n);
      for (const t of [0, 0.27, 0.5, 0.93]) expect(Math.abs(displacement(n, t, y))).toBeLessThan(1e-12);
    }
    // 2nd: 12th fret; 3rd: 7th fret; 4th: 5th fret; 5th: "just before 4th fret" (between the 3rd and 4th frets, nearer the 4th)
    expect(forcedNode(2)[1]).toBe(FRETS[11]);
    expect(Math.abs(forcedNode(3)[1] - FRETS[6])).toBeLessThan(0.02);
    expect(Math.abs(forcedNode(4)[1] - FRETS[4])).toBeLessThan(0.03);
    expect(forcedNode(5)[1]).toBeGreaterThan(FRETS[3]);
    expect(forcedNode(5)[1]).toBeLessThan(FRETS[2]);
    expect(forcedNode(5)[1] - FRETS[3]).toBeLessThan(FRETS[2] - forcedNode(5)[1]);
    expect(FORCED_NODES.map((r) => r[1])).toEqual(['12th fret', '7th fret', '5th fret', 'just before 4th fret']);
  });

  it('the replacements /. n -> 1 change nothing: the wave of harmonic n has n half waves on the string (snapshot pictures 2-4)', () => {
    for (let n = 1; n <= 5; n++) {
      // the visible points (0 ≤ x ≤ L) at t = 0: 0.5 sin(n π x / L), computed here directly
      const pts = wavePoints(n, 0).filter(([, x]) => x <= L);
      pts.forEach(([d, x]) => expect(d).toBeCloseTo(0.5 * Math.sin((n * Math.PI * x) / 25.5), 12));
      // sign changes of the samples (a sample on a node, e.g. x = 17 for n = 3, counts as zero)
      const signs = pts.map(([d]) => (Math.abs(d) < 1e-9 ? 0 : Math.sign(d))).filter((s) => s !== 0);
      let changes = 0; for (let i = 1; i < signs.length; i++) if (signs[i] !== signs[i - 1]) changes++;
      expect(changes).toBe(n - 1);
    }
    // snapshot picture 2 (3rd harmonic, t = 0): the first loop bulges to the right (+x), the second to the left
    expect(displacement(3, 0, 4)).toBeCloseTo(0.4979, 4);
    expect(displacement(3, 0, 13)).toBeLessThan(-0.49);
  });

  it('the Table runs over x = 0, 1, …, n λ (51 n + 1 points; only x ≤ 25 lie inside the picture)', () => {
    for (let n = 1; n <= 5; n++) {
      const pts = wavePoints(n, 0.31);
      expect(pts).toHaveLength(51 * n + 1);
      expect(pts.map(([, x]) => x)).toEqual(Array.from({ length: 51 * n + 1 }, (_, i) => i));
    }
  });

  it('the time factor cos(2π t f[n]): the live state t = 0.27 makes the string almost straight (snapshot picture 1)', () => {
    const v = evaluate(numbersOf(fx.states[0])).view;
    expect(v.timeFactor).toBeCloseTo(Math.cos(2 * Math.PI * 0.27 * 82.40288602348828), 9);
    expect(Math.abs(v.timeFactor)).toBeLessThan(0.01);
    expect(v.maxVisible).toBeLessThan(0.005);
    for (const k of ['2', '3', '4']) {
      const s = evaluate(snap(k)).view; // t = 0: the full amplitude 2 A = 0.5
      expect(s.timeFactor).toBe(1);
      expect(s.maxVisible).toBeGreaterThan(0.48);
      expect(s.node).toEqual([0, 25.5 - 25.5 / s.n]);
    }
  });

  it('the picture: fretboard, nut and bridge, 12 frets, sound hole, six string ends, five strings, the wave and the forced node', () => {
    const { graphics } = evaluate({ n: 4, t: 0 });
    expect(annotation(graphics, 'fretboard').g).toMatchObject({ a: [5.5, 0.05], b: [-0.5, 25.55] });
    expect(annotation(graphics, 'sound-hole').g).toMatchObject({ c: [2.5, 7], r: 3 });
    for (let k = 1; k <= 12; k++) expect(annotation(graphics, `fret-${k}`).g.pts[0][1]).toBe(FRETS[k - 1]);
    for (let x = 0; x <= 5; x++) expect(annotation(graphics, `string-end-${x}`).g).toMatchObject({ c: [x, 0], r: 0.25 });
    for (let x = 1; x <= 5; x++) expect(annotation(graphics, `string-${x}`).g.pts).toEqual([[x, 0], [x, 25.5]]);
    expect(annotation(graphics, 'wave').g.pts).toHaveLength(205);
    expect(annotation(graphics, 'forced-node').g).toMatchObject({ c: [0, 19.125], r: 0.25 });
    // colours and widths: RGBColor[0.85, 0.85, 0], orange RGBColor[1, 0.5, 0] Thickness[0.05], brown Thickness[0.02],
    // strings 3-5 GrayLevel[0.5] Thickness[0.013], strings 1-2 and the wave Thickness[0.018]
    expect(annotation(graphics, 'fretboard').style.color).toEqual([0.85, 0.85, 0]);
    expect(annotation(graphics, 'nut').style).toMatchObject({ color: [1, 0.5, 0], thickness: 0.05, cap: 'square' });
    expect(annotation(graphics, 'fret-1').style).toMatchObject({ color: [0.6, 0.4, 0.2], thickness: 0.02 });
    expect(annotation(graphics, 'string-3').style).toMatchObject({ color: [0.5, 0.5, 0.5], thickness: 0.013 });
    expect(annotation(graphics, 'wave').style).toMatchObject({ color: [0.5, 0.5, 0.5], thickness: 0.018 });
    expect(annotation(graphics, 'forced-node').style.color).toEqual([0, 0, 0]);
  });
});

describe('errors of the original (E-GA)', () => {
  it('E-GA-01: f[n] with the intended n/(2L) and the constant 41.77 as T/ρ gives 0.127 Hz; T/ρ for 82.4 Hz is (2 L 82.4)²', () => {
    const intended = (n, Tρ) => (n / (2 * L)) * Math.sqrt(Tρ);
    expect(intended(1, 41.77)).toBeCloseTo(0.1267, 4);
    expect((82.4 / 12.75) ** 2).toBeCloseTo(41.77, 2); // the constant was fitted to the misread formula
    const Tρ = (2 * L * f(1)) ** 2; // in²/s² with L in inches: about 1.766 × 10⁷
    expect(Tρ).toBeCloseTo(1.7661e7, -3);
    for (let n = 1; n <= 5; n++) expect(intended(n, Tρ)).toBeCloseTo(f(n), 9); // then nothing displayed changes
    expect(2 * L * f(1) * 0.0254).toBeCloseTo(106.74, 2); // the wave speed in m/s
  });
});
