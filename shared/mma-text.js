// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/mma-text.js — the text of numbers as Mathematica's front end shows them in labels and Text[…]:
// exact rationals (inline "11/20" or stacked: numerator over denominator), exact multiples of π ("5π/32", "π",
// "−π/2"), exact integers plainly ("1", "10"), machine reals with six significant digits (shared/mma-extra.js
// mmaNumberString: "0.08" for 0.08000000000000002, "1." for 1.0), and a leading minus sign for negative values.
// Specified by the camera-lasers draft (F-CL-18, §6), the two-link-kinematics draft (§6, dial labels) and the
// dh-parameters / arm-configurations drafts (value labels "5π/32", "−13π/16", "11/20"); COMMON-DECISIONS §5–§6.
// Pure functions, no DOM: 'stacked' results are data ({sign, num, den}) that an SVG or HTML layer draws as a
// built-up fraction (sign, numerator, bar, denominator); 'inline' results are strings.
// The minus sign is U+2212 "−" by default (the drafts' expected label texts); pass {minus: '-'} for ASCII.
import { mmaNumberString } from './mma-extra.js';
import { reducePi } from './exact-pi.js';

export const MINUS = '−';

/** The reduced exact rational num/den: {num, den}, den > 0 (integers). */
export const rational = (num, den = 1) => reducePi(num, den);

const asText = ({ sign, num, den }) => (den ? `${sign}${num}/${den}` : `${sign}${num}`);

/**
 * Parts of the exact rational num/den: {sign: '' | minus, num: '3', den: '2' | null, text: '−3/2'} (den null for an
 * integer). fractionText gives the inline text: fractionText(11, 20) = "11/20", fractionText(30, 20) = "3/2",
 * fractionText(20, 20) = "1", fractionText(-1, 5) = "−1/5".
 */
export function fractionParts(num, den = 1, { minus = MINUS } = {}) {
  const r = rational(num, den);
  const parts = { sign: r.num < 0 ? minus : '', num: String(Math.abs(r.num)), den: r.den === 1 ? null : String(r.den) };
  return { ...parts, text: asText(parts) };
}
export const fractionText = (num, den = 1, opts) => fractionParts(num, den, opts).text;

/**
 * An exact multiple of π, (num/den)·π, as Mathematica writes it: "0", "π", "−π", "π/32", "5π/32", "−13π/16",
 * "3π/4", "27π/32" (reduced; the numerator 1 is not written). form 'inline' (default) returns the string;
 * form 'stacked' returns {sign, num: '3π', den: '4' | null, text} for a built-up fraction (−3π/4 drawn as "3π" over
 * "4" with a minus sign in front, two-link-kinematics D-TK-04).
 */
export function piFraction(num, den = 1, { form = 'inline', minus = MINUS } = {}) {
  const r = rational(num, den);
  let parts;
  if (r.num === 0) parts = { sign: '', num: '0', den: null };
  else {
    const a = Math.abs(r.num);
    parts = { sign: r.num < 0 ? minus : '', num: a === 1 ? 'π' : `${a}π`, den: r.den === 1 ? null : String(r.den) };
  }
  const text = asText(parts);
  return form === 'stacked' ? { ...parts, text } : text;
}

/**
 * Parts of any number shown in a label, with its exactness:
 *  - {num, den} (an exact rational) → as fractionParts;
 *  - {num, den, pi: true} (an exact multiple of π) → as piFraction(…, {form: 'stacked'});
 *  - a JS number → an exact integer if Number.isInteger and not {real: true}, else a machine real through
 *    mmaNumberString ("0.75", "0.08", "1.", "6.12323×10^-16").
 * Returns {sign, num, den | null, text}; numberText returns only the inline text.
 */
export function numberParts(value, { minus = MINUS, real = false } = {}) {
  if (value && typeof value === 'object') {
    if (value.pi) return piFraction(value.num, value.den ?? 1, { form: 'stacked', minus });
    return fractionParts(value.num, value.den ?? 1, { minus });
  }
  const s = mmaNumberString(value, { isReal: real || !Number.isInteger(value) });
  const neg = s.startsWith('-');
  const parts = { sign: neg ? minus : '', num: neg ? s.slice(1) : s, den: null };
  return { ...parts, text: asText(parts) };
}
export const numberText = (value, opts) => numberParts(value, opts).text;

const normalizeTyped = (t) => String(t).trim().replace(/[−–]/g, '-').replace(/\s+/g, ' ');

/**
 * Parses an exact multiple of π typed by a user: "5π/32", "5 Pi/32", "5*Pi/32", "-13π/16", "−π/2", "π", "Pi",
 * "2π", "0", "π/32", "(5/32)π" are accepted; returns the reduced {num, den}, or null when the text is not an exact
 * multiple of π (e.g. a plain decimal "0.5" — the caller decides what a plain number means).
 */
export function parsePiFraction(text) {
  const t = normalizeTyped(text).replace(/Pi/g, 'π').replace(/\s*\*\s*/g, '').replace(/\s+/g, '');
  if (/^[+-]?0$/.test(t)) return { num: 0, den: 1 };
  let m = t.match(/^([+-]?)(\d*)π(?:\/(\d+))?$/);
  if (m) {
    const n = m[2] === '' ? 1 : Number(m[2]), d = m[3] ? Number(m[3]) : 1;
    if (d === 0) return null;
    return rational(m[1] === '-' ? -n : n, d);
  }
  m = t.match(/^([+-]?)\(?(\d+)\/(\d+)\)?π$/);
  if (m && Number(m[3]) !== 0) return rational((m[1] === '-' ? -1 : 1) * Number(m[2]), Number(m[3]));
  return null;
}

/** Parses an exact rational "11/20", "-3/2", "−1/5", "3" → {num, den}; null for anything else (e.g. "0.5"). */
export function parseFraction(text) {
  const t = normalizeTyped(text).replace(/\s+/g, '');
  const m = t.match(/^([+-]?\d+)(?:\/(\d+))?$/);
  if (!m) return null;
  const d = m[2] ? Number(m[2]) : 1;
  return d === 0 ? null : rational(Number(m[1]), d);
}
