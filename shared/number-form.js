// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/number-form.js — Mathematica's number display forms for machine numbers (v0.1.37): NumberForm, PaddedForm and
// AccountingForm as the front end shows them, for labels in pictures and pages.
//
//   NumberForm(x, n)            n significant digits; trailing zeros dropped; an integral real keeps its point ("2.")
//   NumberForm(x, [n, f])       f digits after the point (padded with zeros), at most n significant digits (the digits
//                               beyond the n-th become 0: NumberForm[123.456, {4, 2}] = "123.50")
//   PaddedForm(x, [n, f])       as NumberForm with {n, f}, the integer part padded on the left to n − f characters with
//                               spaces (NumberPadding {" ", "0"})
//   AccountingForm(x, [n, f])   as NumberForm, negative numbers in parentheses (NumberSigns {{"(", ")"}, ""})
// Options (Mathematica's names): NumberPadding: [left, right] (left fills the integer part to n − f characters, right the
// decimals to f), NumberSigns: [negative, positive] (strings; a negative [before, after] pair as AccountingForm's),
// SignPadding (true: the sign before the padding — the ports' only use pads with "0" and no sign, where it changes
// nothing), NumberPoint ("." by default; "" drops it), exact (true: x is an exact integer of the original — Mathematica
// prints exact integers in full, without a point, whatever n is), minus (the minus sign; "-" by default).
//
// Exponents: as Mathematica's default ExponentFunction, a machine number of magnitude ≥ 10^6 or < 10^-5 is shown as
// mantissa × 10^e (NumberForm[8.8617*10^6, {6, 3}] = "8.862×10^6"); the result is then a Row with a Superscript, ready
// for Text (shared/graphics.js), and numberFormString gives the same as plain text with "×10^e".

import { Row, Superscript } from './graphics.js';

const digitsOf = (x, n) => { // the n significant digits of |x| > 0 and the decimal exponent of the first
  const [m, e] = Math.abs(x).toExponential(n - 1).split('e');
  return { digits: m.replace('.', ''), exp: Number(e) };
};

/** The parts of the display: { sign, int, frac, point, exp } (exp null: no exponent). */
export function numberFormParts(x, spec, opts = {}) {
  const { exact = false, NumberPoint = '.' } = opts;
  const neg = x < 0;
  const ax = Math.abs(x);
  if (exact && Number.isInteger(x)) return { neg, int: String(ax), frac: '', point: '', exp: null, exact: true };
  const [n, f] = Array.isArray(spec) ? spec : [spec, null];
  if (ax === 0) return { neg: false, int: '0', frac: f ? '0'.repeat(f) : '', point: NumberPoint, exp: null };
  let { exp } = digitsOf(ax, Math.max(1, n));
  const sci = exp >= 6 || exp < -5;
  const v = sci ? ax / 10 ** exp : ax;
  let int, frac;
  if (f == null) { // n significant digits, trailing zeros dropped
    const { digits, exp: e } = digitsOf(v, n);
    if (e >= 0) { int = digits.slice(0, e + 1).padEnd(e + 1, '0'); frac = digits.slice(e + 1); }
    else { int = '0'; frac = '0'.repeat(-e - 1) + digits; }
    frac = frac.replace(/0+$/, '');
  } else {
    const { exp: e } = digitsOf(v, Math.max(1, n));
    const keep = Math.min(f, Math.max(0, n - e - 1)); // decimals within the n significant digits
    const s = v.toFixed(keep);
    [int, frac = ''] = s.split('.');
    frac = frac.padEnd(f, '0');
    if (e + 1 > n) int = int.slice(0, n) + '0'.repeat(int.length - n); // digits beyond the n-th become 0
  }
  return { neg, int, frac, point: NumberPoint, exp: sci ? exp : null };
}

function assemble(p, spec, opts, sciText) {
  const { NumberPadding = ['', '0'], NumberSigns, minus = '-' } = opts;
  const [n, f] = Array.isArray(spec) ? spec : [spec, null];
  let int = p.int, frac = p.frac;
  if (f != null && NumberPadding[0]) int = int.padStart(Math.max(1, n - f), NumberPadding[0]);
  if (f != null && !NumberPadding[1]) frac = frac.replace(/0+$/, '');
  const body = p.exact || frac === '' ? int + (p.exact ? '' : p.point) : int + p.point + frac;
  const [negS, posS] = NumberSigns ?? [minus, ''];
  const [pre, post] = p.neg ? (Array.isArray(negS) ? negS : [negS, '']) : [posS, ''];
  return { pre, body, post, exp: p.exp, sciText };
}

/** NumberForm[x, n] / NumberForm[x, {n, f}] as text or (with an exponent) a Row for Text. */
export function NumberForm(x, spec, opts = {}) {
  const a = assemble(numberFormParts(x, spec, opts), spec, opts);
  if (a.exp == null) return a.pre + a.body + a.post;
  return Row([a.pre + a.body + '×', Superscript('10', String(a.exp)), a.post].filter((s) => s !== ''));
}
/** The same as plain text ("8.862×10^6"). */
export function numberFormString(x, spec, opts = {}) {
  const a = assemble(numberFormParts(x, spec, opts), spec, opts);
  return a.pre + a.body + (a.exp == null ? '' : `×10^${a.exp}`) + a.post;
}
export const PaddedForm = (x, spec, opts = {}) => NumberForm(x, spec, { NumberPadding: [' ', '0'], ...opts });
export const AccountingForm = (x, spec, opts = {}) => NumberForm(x, spec, { NumberSigns: [['(', ')'], ''], ...opts });
