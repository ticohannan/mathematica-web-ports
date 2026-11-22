// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Connor Davenport and Edmon Perkins
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/guitar-string-harmonics/model.js — "Guitar String Harmonics: Standing Waves": one evaluation of the Manipulate
// body, the state in, { view, graphics } out (pure, no DOM). Simple mode: ordinary JavaScript arithmetic.
//
// The body is Row[{Dynamic[Graphics[…]], Text@Grid[…]}]: the picture (fretboard, strings, the standing wave on the sixth
// string and the forced node) and a text column (equations, forced nodes, harmonic frequencies). The text column does
// not depend on the controls; textPanel() gives its contents, main.js writes it beside the picture.
import {
  Annotation, Line, Disk, Rectangle, Black, RGBColor, GrayLevel, Thickness, CapForm,
} from '../../shared/graphics.js';
import { NumberForm } from '../../shared/number-form.js';

// ---- Initialization (the notebook's init cells, in their order)
/** L = 25.5 (the string length: the scale length of the picture, from the bridge at y = 0 to the nut at y = L) */
export const L = 25.5;
/** λ = 2 L (the fundamental's wavelength) */
export const λ = 2 * L;
/** f[n_] := (n/2 L)*Sqrt[41.77] — Mathematica reads n/2 L as (n/2)·L (E-GA-01): n · 82.4029… */
export const f = (n) => (n / 2) * L * Math.sqrt(41.77);
/** Omega = 2π f — 2π times the symbol f (not f applied to anything); never used (N-GA-02). */
/** A = 0.25 */
export const A = 0.25;

/** The fret lines of the picture, as written in the original (y from the bridge; 12th fret at L/2). */
export const FRETS = [24.069, 22.718, 21.443, 20.239, 19.103, 18.031, 17.019, 16.064, 15.162, 14.311, 13.508, 12.75];

/** The Manipulate's live state when the notebook was saved (the opening state, golden data). */
export const initialState = () => ({ n: 1, t: 0.27 });
/** The Manipulate's initial values {{n, 1, "harmonic"}, …}, {{t, 0, "time"}, …}: what "Initial settings" restores. */
export const initialSettings = () => ({ n: 1, t: 0 });

/**
 * The displacement of the sixth string at height x:
 *   2 A Sin[2π x/(2 L/n) /. n -> 1] Cos[2π t (n/2 L) Sqrt[41.77] /. n -> 1].
 * The two replacements change nothing (Q-GA-01): in the Manipulate the rule's n is the Manipulate variable n$$, so the
 * rule evaluates to (value of n) -> 1, and the expression it is applied to has already evaluated to a number. The wave
 * therefore has the harmonic n's wavelength 2L/n and oscillates with the frequency f[n] of the table.
 */
export const displacement = (n, t, x) => 2 * A * Math.sin((2 * Math.PI * x) / ((2 * L) / n)) * Math.cos(2 * Math.PI * t * ((n / 2) * L) * Math.sqrt(41.77));

/** Table[{displacement, x}, {x, 0, n λ}]: integer heights 0, 1, …, 2 n L (most of them above the picture, Q-GA-02). */
export function wavePoints(n, t) {
  const pts = [];
  for (let x = 0; x <= n * λ; x++) pts.push([displacement(n, t, x), x]);
  return pts;
}

/** The forced node Disk[{0, L − L/n}, 0.25]: a node of the harmonic n at L/n from the nut. */
export const forcedNode = (n) => [0, L - L / n];

const fretLine = (y) => Line([[5.5, y], [-0.5, y]]);
const string = (x) => Line([[x, 0], [x, 25.5]]);

/** The Manipulate body's picture (Graphics list; options PlotRange, ImageSize in main.js). */
export function evaluate(state) {
  const { n, t } = state;
  const wave = wavePoints(n, t);
  const node = forcedNode(n);
  const graphics = [
    // Mathematica draws line ends square (the nut lines reach half their width past x = -0.5 and 5.5 in every
    // snapshot); the SVG default would round them (N-GA-04)
    CapForm('Square'),
    RGBColor(0.85, 0.85, 0), Annotation(Rectangle([5.5, 0.05], [-0.5, 25.55]), 'fretboard'),
    [RGBColor(1, 0.5, 0), Thickness(0.05), [Annotation(Line([[5.5, 0], [-0.5, 0]]), 'bridge'), Annotation(Line([[5.5, 25.5], [-0.5, 25.5]]), 'nut')],
      [RGBColor(0.6, 0.4, 0.2), Thickness(0.02), FRETS.map((y, i) => Annotation(fretLine(y), `fret-${i + 1}`))]],
    [Black, Annotation(Disk([2.5, 7], 3), 'sound-hole')],
    ...[0, 1, 2, 3, 4, 5].map((x) => [Black, Annotation(Disk([x, 0], 0.25), `string-end-${x}`)]),
    Thickness(0.013), GrayLevel(0.5), [3, 4, 5].map((x) => Annotation(string(x), `string-${x}`)),
    Thickness(0.018), [Annotation(string(1), 'string-1'), Annotation(string(2), 'string-2'), Annotation(Line(wave), 'wave')],
    [Black, Annotation(Disk(node, 0.25), 'forced-node')],
  ];
  const visible = wave.filter(([, x]) => x <= L);
  return {
    view: {
      n, t,
      frequency: f(n),
      timeFactor: Math.cos(2 * Math.PI * t * ((n / 2) * L) * Math.sqrt(41.77)),
      node,
      points: wave.length,
      maxVisible: Math.max(...visible.map(([d]) => Math.abs(d))),
    },
    graphics,
  };
}

// ---- the text column: Text@Grid[{…}, Alignment -> Center]
export const HARMONICS = ['1st', '2nd', '3rd', '4th', '5th'];
/** Grid[{{"2nd harmonic", "12th fret"}, …}, Frame -> All] */
export const FORCED_NODES = [
  ['2nd harmonic', '12th fret'],
  ['3rd harmonic', '7th fret'],
  ['4th harmonic', '5th fret'],
  ['5th harmonic', 'just before 4th fret'],
];
/** Grid[{{"1st harmonic", NumberForm[f[1], {4, 1}], "Hz"}, …}, Frame -> All] */
export const harmonicFrequencies = () => HARMONICS.map((h, i) => [`${h} harmonic`, NumberForm(f(i + 1), [4, 1]), 'Hz']);
