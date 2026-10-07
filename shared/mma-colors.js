// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/mma-colors.js — Mathematica's named colours and colour functions as RGB triples (0..1).
// Values from the Wolfram Language documentation of each symbol (e.g. LightBlue = RGBColor[0.87, 0.94, 1]).
// Pure module: usable in Node tests and in the browser.

export const NAMED = {
  Black: [0, 0, 0], White: [1, 1, 1], Gray: [0.5, 0.5, 0.5], LightGray: [0.85, 0.85, 0.85], DarkGray: [0.25, 0.25, 0.25],
  Red: [1, 0, 0], Green: [0, 1, 0], Blue: [0, 0, 1], Cyan: [0, 1, 1], Magenta: [1, 0, 1], Yellow: [1, 1, 0],
  Brown: [0.6, 0.4, 0.2], Orange: [1, 0.5, 0], Pink: [1, 0.5, 0.5], Purple: [0.5, 0, 0.5],
  LightRed: [1, 0.85, 0.85], LightBlue: [0.87, 0.94, 1], LightGreen: [0.88, 1, 0.88], LightYellow: [1, 1, 0.85],
  LightOrange: [1, 0.9, 0.8], LightBrown: [0.94, 0.91, 0.88], LightPink: [1, 0.925, 0.925], LightPurple: [0.94, 0.88, 0.94],
  LightCyan: [0.9, 1, 1], LightMagenta: [1, 0.9, 1],
};

/** Blend[{a, b}, t] for RGB triples. */
export const blend = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
/** Lighter[c, f] = Blend[{c, White}, f] (default f = 1/3). */
export const lighter = (c, f = 1 / 3) => blend(c, NAMED.White, f);
/** Darker[c, f] = Blend[{c, Black}, f] (default f = 1/3). */
export const darker = (c, f = 1 / 3) => blend(c, NAMED.Black, f);

/** CSS rgb() string of an RGB triple. */
export const css = (c) => `rgb(${c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)).join(',')})`;

/** Look up a named colour, with optional Darker/Lighter: col('Green', 'darker'). */
export function col(name, mod) {
  const c = NAMED[name];
  if (!c) throw new Error(`unknown colour ${name}`);
  return mod === 'darker' ? darker(c) : mod === 'lighter' ? lighter(c) : c;
}
