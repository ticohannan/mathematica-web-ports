// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/traditional-form.js — exact matrix entries as Mathematica evaluates and shows them in TraditionalForm (v0.1.38):
// integers, ±1/√2, and ±cos/±sin of a rational multiple of π in Mathematica's automatic first-octant form
// (Cos[5π/16] → sin(3π/16), −Sin[17π/16] → sin(π/16); shared/exact-pi.js octantForm), and a built-up matrix in
// parentheses for HTML pages.
//
//   trigEntry(fn, num, den, sign = 1)  sign·fn(num·π/den), fn 'cos' | 'sin': the exact value as data —
//                                      { kind: 'int', value } (0, ±1), { kind: 'invSqrt2', sign } (±1/√2, at odd
//                                      multiples of π/4) or { kind: 'trig', sign, fn, base: {num, den} } (base in
//                                      (0, 1/4): Mathematica leaves Cos[π/8], Sin[3π/32] unevaluated).
//                                      Bases whose value Mathematica turns into radicals (multiples of π/5, π/6,
//                                      π/10, π/12 inside the first octant) are not implemented: RangeError.
//   intEntry(n)                        an exact integer entry { kind: 'int', value: n }
//   entryValue(e)                      the entry as a machine number (exact zeros and ±1; shared/exact-pi.js values)
//   entryText(e, { minus })            plain text: "0", "−1", "20", "1/√2", "−sin(3π/16)", "cos(π/8)"
//   matrixElement(rows, { doc, testid, className })
//                                      a <span class="tf-matrix"> holding a table of the entries in tall parentheses,
//                                      each trig argument as a built-up fraction (3π over 16) in parentheses, as the
//                                      front end draws TraditionalForm[{{…}, …}]; styles in shared/traditional-form.css (.tf-*,
//                                      v0.1.39; the page links it).
// Generic Wolfram Language semantics (no Demonstration code). Pure except matrixElement (DOM).
import { octantForm, cosPi, sinPi } from './exact-pi.js';

export const MINUS = '−';

/** an exact integer entry */
export const intEntry = (n) => ({ kind: 'int', value: n === 0 ? 0 : n });

/** sign·fn(num·π/den) as Mathematica's exact value (see the file header) */
export function trigEntry(fn, num, den = 1, sign = 1) {
  if (fn !== 'cos' && fn !== 'sin') throw new RangeError(`trigEntry: fn 'cos' or 'sin' expected, got ${fn}`);
  const f = octantForm(num, den)[fn];
  const s = sign * f.sign;
  const { num: p, den: q } = f.base;
  if (p === 0) return intEntry(f.fn === 'cos' ? s : 0);
  if (p === 1 && q === 4) return { kind: 'invSqrt2', sign: s };
  if (q % 3 === 0 || q % 5 === 0) throw new RangeError(`trigEntry: ${f.fn}(${p}π/${q}) is a radical in Mathematica (not implemented)`);
  return { kind: 'trig', sign: s, fn: f.fn, base: { num: p, den: q } };
}

/** the machine value of an entry */
export function entryValue(e) {
  if (e.kind === 'int') return e.value;
  if (e.kind === 'invSqrt2') return e.sign * (1 / Math.SQRT2);
  const v = e.fn === 'cos' ? cosPi(e.base.num, e.base.den) : sinPi(e.base.num, e.base.den);
  return e.sign * v;
}

const piText = ({ num, den }) => `${num === 1 ? '' : num}π/${den}`;

/** plain text of an entry */
export function entryText(e, { minus = MINUS } = {}) {
  if (e.kind === 'int') return e.value < 0 ? `${minus}${-e.value}` : String(e.value);
  const sg = e.sign < 0 ? minus : '';
  if (e.kind === 'invSqrt2') return `${sg}1/√2`;
  return `${sg}${e.fn}(${piText(e.base)})`;
}

function frac(doc, top, bottom) {
  const f = doc.createElement('span');
  f.className = 'tf-frac';
  const a = doc.createElement('span'); a.className = 'tf-num'; a.textContent = top;
  const b = doc.createElement('span'); b.className = 'tf-den'; b.textContent = bottom;
  f.append(a, b);
  return f;
}

function entryNode(doc, e, minus) {
  const cell = doc.createElement('span');
  cell.className = 'tf-entry';
  if (e.kind === 'int') { cell.textContent = entryText(e, { minus }); return cell; }
  if (e.sign < 0) cell.append(minus);
  if (e.kind === 'invSqrt2') { cell.append(frac(doc, '1', '√2')); return cell; }
  const fn = doc.createElement('span'); fn.className = 'tf-fn'; fn.textContent = e.fn;
  const open = doc.createElement('span'); open.className = 'tf-paren'; open.textContent = '(';
  const close = doc.createElement('span'); close.className = 'tf-paren'; close.textContent = ')';
  cell.append(fn, open, frac(doc, `${e.base.num === 1 ? '' : e.base.num}π`, String(e.base.den)), close);
  return cell;
}

/** a TraditionalForm matrix of entries (rows of trigEntry / intEntry data) as a DOM element */
export function matrixElement(rows, { doc = document, testid, className, minus = MINUS } = {}) {
  const wrap = doc.createElement('span');
  wrap.className = className ? `tf-matrix ${className}` : 'tf-matrix';
  if (testid) wrap.setAttribute('data-testid', testid);
  wrap.setAttribute('aria-label', `matrix (${rows.map((r) => r.map((e) => entryText(e, { minus: '-' })).join(', ')).join('; ')})`);
  const table = doc.createElement('table');
  for (const r of rows) {
    const tr = doc.createElement('tr');
    for (const e of r) { const td = doc.createElement('td'); td.append(entryNode(doc, e, minus)); tr.append(td); }
    table.append(tr);
  }
  wrap.append(table);
  return wrap;
}
