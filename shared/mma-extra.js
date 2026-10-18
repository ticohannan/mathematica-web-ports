// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/mma-extra.js — further Wolfram Language list semantics needed by the second set of ports.
// Kept separate from shared/mma.js so that file stays unchanged for the first three apps.
// Pure functions, no DOM.
import { norm as dnrm2 } from './mma-exact.js';

/**
 * Nearest[pts, x, {n, r}, DistanceFunction -> dist]: up to n elements of pts within distance r of x,
 * nearest first. Ties (equal distance) keep the input order — an ASSUMPTION: Mathematica's tie order
 * for a custom DistanceFunction is not documented (lead to check against the original).
 * n = Infinity allowed; r = Infinity allowed.
 */
export function nearest(pts, x, { n = 1, r = Infinity } = {}, dist = euclidean) {
  const scored = [];
  for (let i = 0; i < pts.length; i++) {
    const d = dist(pts[i], x);
    if (d <= r) scored.push({ i, d });
  }
  scored.sort((a, b) => a.d - b.d || a.i - b.i);
  return scored.slice(0, n).map((s) => pts[s.i]);
}

export function euclidean(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

/** MinimalBy[list, f] (all minimal elements, in input order). First@MinimalBy = minimalBy(...)[0]. */
export function minimalBy(list, f) {
  let best = Infinity;
  const vals = list.map(f);
  for (const v of vals) if (v < best) best = v;
  return list.filter((_, i) => vals[i] === best);
}

/** Position[list, x, 1, 1] style lookup with exact (===, element-wise) equality; returns 0-based index or -1. */
export function positionOf(list, x) {
  outer: for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (Array.isArray(x)) {
      if (!Array.isArray(e) || e.length !== x.length) continue;
      for (let k = 0; k < x.length; k++) if (e[k] !== x[k]) continue outer;
      return i;
    }
    if (e === x) return i;
  }
  return -1;
}

/** Accumulate[list] (running sums, left to right). */
export function accumulate(xs) {
  let s = 0;
  return xs.map((v) => (s += v));
}

/** Clip[x, {min, max}] */
export const clip = (x, [a, b]) => Math.min(Math.max(x, a), b);

/** Ceiling, as Mathematica (for finite reals). */
export const ceiling = Math.ceil;

/**
 * Number formatting like Mathematica's StandardForm output of a machine real in text:
 * shortest round-trip digits, at most 6 significant digits shown (Mathematica shows 6 by default),
 * trailing "." for integral reals (e.g. 3.), integers unchanged.
 */
export function mmaNumberString(v, { isReal = !Number.isInteger(v) } = {}) {
  if (!Number.isFinite(v)) return v > 0 ? '∞' : v < 0 ? '-∞' : 'Indeterminate';
  if (!isReal) return String(v);
  if (v === 0) return '0.';
  let s = Number(v.toPrecision(6)).toString();
  if (/e/.test(s)) {
    const [m, e] = s.split('e');
    return `${m}×10^${Number(e)}`;
  }
  if (!s.includes('.')) s += '.';
  return s;
}

// ------------------------------------------------------------------ Normalize (two length models)
// Mathematica's Normalize[v] multiplies v by the reciprocal of its length (Times[v, Power[Norm[v], -1]]); which
// length it uses is not documented. Two models fit different recorded data (COMMON-DECISIONS §3): the correctly
// rounded Euclidean length (Mathematica 15.0.1 states and 2019 snapshots of one original) and the BLAS dnrm2 length
// (2018 snapshots of another). Each app picks one and records the choice. Normalize[{0, …, 0}] is the zero vector.
const f64 = new DataView(new ArrayBuffer(8));
/** x = m · 2^e exactly, m a BigInt (finite x ≠ 0). */
function split2(x) {
  f64.setFloat64(0, x);
  const hi = f64.getUint32(0), lo = f64.getUint32(4);
  const ex = (hi >>> 20) & 0x7ff;
  let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  if (ex) m |= 1n << 52n;
  return [m, (ex || 1) - 1075];
}
function isqrtBig(n) { // floor(sqrt(n)), n >= 0n
  if (n < 2n) return n;
  let x = 1n << BigInt((n.toString(2).length + 1) >> 1);
  for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; }
}
/**
 * The Euclidean length of a real vector, correctly rounded (round to nearest, ties to even): the sum of squares
 * is formed exactly in integers and its square root rounded once. Normal (not subnormal) results.
 */
export function lengthCR(v) {
  const parts = v.filter((x) => x !== 0).map((x) => split2(Math.abs(x)));
  if (!parts.length) return 0;
  const e0 = Math.min(...parts.map(([, e]) => e));
  let S = 0n; // sum of squares = S · 2^(2 e0)
  for (const [m, e] of parts) S += (m << BigInt(e - e0)) ** 2n;
  // sqrt(S) · 2^e0; scale S by 4^t so that the integer root has at least 60 bits
  const t = Math.max(0, 60 - (S.toString(2).length >> 1));
  const N = S << BigInt(2 * t);
  const r = isqrtBig(N);
  const inexact = r * r !== N;
  const L = r.toString(2).length;
  const drop = L - 53;
  let q = r >> BigInt(drop);
  const rem = r - (q << BigInt(drop)), half = 1n << BigInt(drop - 1);
  if (rem > half || (rem === half && (inexact || (q & 1n)))) q += 1n;
  return Number(q) * 2 ** (drop + e0 - t);
}
/** Normalize[v] = v · (1/length) with the correctly rounded length. */
export function normalizeCR(v) {
  const len = lengthCR(v);
  if (len === 0) return v.map(() => 0);
  const r = 1 / len;
  return v.map((x) => x * r);
}
/** Normalize[v] = v · (1/length) with the BLAS dnrm2 length (shared/mma-exact.js `norm`, Mathematica's Norm). */
export function normalizeDnrm2(v) {
  const len = dnrm2(v);
  if (len === 0) return v.map(() => 0);
  const r = 1 / len;
  return v.map((x) => x * r);
}

// ------------------------------------------------------------------ number display: EngineeringForm, N[x, n]
/** Significant digits and decimal exponent of |x| rounded to n digits: {digits: 'd1d2…dn', exp} (x finite, ≠ 0). */
function sigDigits(x, n) {
  const [m, e] = Math.abs(x).toExponential(n - 1).split('e');
  return { digits: m.replace('.', ''), exp: Number(e) };
}
const signed = (x, s, minus) => (x < 0 ? minus + s : s);

/**
 * EngineeringForm[x] of a machine real as the front end shows it: six significant digits (trailing zeros dropped,
 * a trailing "." kept), the exponent a multiple of 3 written "×10^e" and omitted when it is 0; 0. for zero.
 * Examples (manipulability-ellipsoid draft, F-ME-06 / T-ME-18): 0.6718917 → "671.892×10^-3", 1.2071068 → "1.20711",
 * 0.49999999999999994 → "500.×10^-3". engineeringParts gives the pieces for a superscript rendering.
 */
export function engineeringParts(x, { digits = 6, minus = '-' } = {}) {
  if (!Number.isFinite(x)) return { mantissa: mmaNumberString(x), exponent: 0 };
  if (x === 0) return { mantissa: '0.', exponent: 0 };
  const { digits: d, exp } = sigDigits(x, digits);
  const e3 = 3 * Math.floor(exp / 3);
  const intLen = exp - e3 + 1; // 1 … 3 digits before the point
  const intPart = d.slice(0, intLen), frac = d.slice(intLen).replace(/0+$/, '');
  return { mantissa: signed(x, `${intPart}.${frac}`, minus), exponent: e3 };
}
export function engineeringForm(x, opts) {
  const { mantissa, exponent } = engineeringParts(x, opts);
  return exponent ? `${mantissa}×10^${exponent}` : mantissa;
}

/**
 * The text of N[x, n] for an exact x (an arbitrary-precision number with n digits): exactly n significant digits,
 * trailing zeros kept ("1.0", "0.098", "0.71", "2.8" — arm-configurations draft §6.4; "0.50" for 1/2); an exact 0
 * stays "0". ASSUMPTION (not pinned by the drafts): like the front end's StandardForm, a number below 10^-5 or with
 * more integer digits than n is written d.d…×10^e (e.g. N[100, 2] → "1.0×10^2"); a number with exactly n integer
 * digits gets a trailing point ("31.").
 */
export function nDigits(x, n, { minus = '-' } = {}) {
  if (!Number.isFinite(x)) return mmaNumberString(x);
  if (x === 0) return '0';
  const { digits: d, exp } = sigDigits(x, n);
  let s;
  if (exp < -5 || exp >= n) s = `${d[0]}.${d.slice(1)}×10^${exp}`;
  else if (exp < 0) s = `0.${'0'.repeat(-exp - 1)}${d}`;
  else s = `${d.slice(0, exp + 1)}.${d.slice(exp + 1)}`;
  return signed(x, s, minus);
}
