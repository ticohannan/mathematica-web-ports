// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/exact-pi.js — Cos and Sin of exact rational multiples of π, as Mathematica evaluates them: an angle
// num·π/den is an exact number, Mathematica's automatic rules rewrite Cos/Sin of it to the first octant
// (Cos[19π/32] → −Sin[3π/32], Cos[3π/8] → Sin[π/8]) and give exact values where they exist (Cos[π/2] = 0,
// Sin[π/6] = 1/2), so symbolic cancellations leave exact zeros instead of 6.1×10^-17 residues. This module keeps the
// angle as the reduced fraction {num, den} (angle = num·π/den) and returns machine numbers whose symmetries are
// exact: cosPi(19, 32) === −sinPi(3, 32), cosPi(1, 2) === 0, sinPi(1, 6) === 0.5.
// Pure functions, no DOM. Generic Wolfram Language semantics (no Demonstration code).
//
// First-octant base values b = p/q ∈ [0, 1/4] (angle bπ):
//   b = 0    → (1, 0)                       exact
//   b = 1/4  → (1/√2, 1/√2) = 0.7071067811865475 (the value in the motion-planning original's cached data and
//              shared/mma.js; Math.SQRT1_2 is 1 ulp larger)
//   b = 1/6  → (√3/2, 1/2)                  Mathematica: Cos[π/6] = √3/2, Sin[π/6] = 1/2 (exact)
//   b = 1/8  → (½√(2+√2), ½√(2−√2))         Mathematica evaluates Cos[π/8], Sin[π/8] to these radicals; the
//              machine evaluation of the radicals is used (manipulability-ellipsoid draft §6.4)
//   other b  → Math.cos(pπ/q), Math.sin(pπ/q)
// The bit patterns of the irrational values are PROVISIONAL (lead K-ME-02, harness H-ME-12: N[Table[{Cos[kπ/32],
// Sin[kπ/32]}, {k, 0, 32}]]); the exactness of zeros, ±1, ±1/2 and the symmetries does not depend on them.

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

/** The reduced fraction of num/den: {num, den} with den > 0 and gcd 1 (0 → {num: 0, den: 1}). Integers only. */
export function reducePi(num, den = 1) {
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) throw new RangeError(`reducePi: integers with den ≠ 0 expected, got ${num}/${den}`);
  if (num === 0) return { num: 0, den: 1 };
  const g = gcd(num, den), s = den < 0 ? -1 : 1;
  return { num: (s * num) / g, den: (s * den) / g };
}

const SQRT2 = Math.sqrt(2);
const BASE = new Map([
  ['1/4', [1 / SQRT2, 1 / SQRT2, false, false]],
  ['1/6', [Math.sqrt(3) / 2, 0.5, false, true]],
  ['1/8', [Math.sqrt(2 + SQRT2) / 2, Math.sqrt(2 - SQRT2) / 2, false, false]],
]);
/** [cos, sin, cosRational, sinRational] of bπ for b = p/q in [0, 1/4] (reduced). */
function base(p, q) {
  if (p === 0) return [1, 0, true, true];
  return BASE.get(`${p}/${q}`) ?? [Math.cos((p * Math.PI) / q), Math.sin((p * Math.PI) / q), false, false];
}
const neg = (x) => (x === 0 ? 0 : -x); // no signed zero (Mathematica has none)

/**
 * Mathematica's first-octant form of Cos and Sin of num·π/den: each as {fn: 'cos'|'sin', sign: ±1, base: {num, den}}
 * with base in [0, 1/4], e.g. cos of 19π/32 → {fn: 'sin', sign: -1, base: {num: 3, den: 32}}.
 */
export function octantForm(num, den = 1) {
  const { num: p0, den: q } = reducePi(num, den);
  let p = ((p0 % (2 * q)) + 2 * q) % (2 * q); // angle pπ/q in [0, 2π)
  let sinSign = 1;
  if (p > q) { p = 2 * q - p; sinSign = -1; } // cos(2π − a) = cos a, sin(2π − a) = −sin a; now a ∈ [0, π]
  // octant o of a ∈ [0, π]: o = floor(4p/q) ∈ 0 … 4
  const o = Math.floor((4 * p) / q);
  const b = (n, d) => reducePi(n, d);
  // a = pπ/q;  o 0: b = a;  o 1: b = π/2 − a;  o 2: b = a − π/2;  o 3: b = π − a  (o 4 only at a = π)
  let c, s;
  if (o === 0) { c = { fn: 'cos', sign: 1, base: b(p, q) }; s = { fn: 'sin', sign: 1, base: b(p, q) }; }
  else if (o === 1) { const bb = b(q - 2 * p, 2 * q); c = { fn: 'sin', sign: 1, base: bb }; s = { fn: 'cos', sign: 1, base: bb }; }
  else if (o === 2) { const bb = b(2 * p - q, 2 * q); c = { fn: 'sin', sign: -1, base: bb }; s = { fn: 'cos', sign: 1, base: bb }; }
  else { const bb = b(q - p, q); c = { fn: 'cos', sign: -1, base: bb }; s = { fn: 'sin', sign: 1, base: bb }; }
  s.sign *= sinSign;
  return { cos: c, sin: s };
}

function evalForm({ fn, sign, base: { num, den } }) {
  const [cb, sb, cr, sr] = base(num, den);
  const v = fn === 'cos' ? cb : sb;
  return { value: sign < 0 ? neg(v) : v + 0, rational: fn === 'cos' ? cr : sr };
}

/**
 * Cos and Sin of num·π/den: {cos, sin, cosRational, sinRational, num, den} — the values as machine numbers with
 * exact 0, ±1, ±1/2 (no −0), and whether each is an exact rational in Mathematica (0, ±1, ±1/2) or an irrational
 * exact number (a radical or an unevaluated Cos/Sin that becomes machine only under N).
 */
export function trigPi(num, den = 1) {
  const r = reducePi(num, den);
  const f = octantForm(r.num, r.den);
  const c = evalForm(f.cos), s = evalForm(f.sin);
  return { cos: c.value, sin: s.value, cosRational: c.rational, sinRational: s.rational, num: r.num, den: r.den };
}
/** Cos[num π/den] */
export const cosPi = (num, den = 1) => trigPi(num, den).cos;
/** Sin[num π/den] */
export const sinPi = (num, den = 1) => trigPi(num, den).sin;
/** {Cos, Sin} of num π/den as a point on the unit circle (e.g. the dial table {Cos@a, Sin@a}, a = kπ/32). */
export const cosSinPi = (num, den = 1) => { const t = trigPi(num, den); return [t.cos, t.sin]; };

// ---- N[Pi/n] -------------------------------------------------------------------------------------------------------
// π to 64 decimals (more than enough to round π/n correctly for any n below 10^9: the distance of π/n to the nearest
// midpoint between two doubles is far above 10^-64 relative)
const PI_DIGITS = 31415926535897932384626433832795028841971693993751058209749445923078n; // π·10^67
const PI_SCALE = 10n ** 67n;
const f64 = new Float64Array(1), u64 = new BigUint64Array(f64.buffer);
const nextDouble = (x, dir) => { f64[0] = x; u64[0] += BigInt(dir); return f64[0]; }; // x > 0
/** a positive double as m / 2^s with BigInt m and s ≥ 0 */
function dyadic(x) {
  let s = 0n;
  while (!Number.isInteger(x)) { x *= 2; s++; }
  return [BigInt(x), s];
}
/**
 * The machine number nearest to the exact π/n for a positive integer n (what N[Pi/n] gives, and what Mathematica's
 * `1. (Pi/n)` gives when n is an exact integer: Pi/n stays exact until the machine factor turns it into a correctly
 * rounded double). Math.PI / n and Math.PI·(1/n) round twice and are 1 ulp off for some n (n = 3: both give 1.0471975511965976,
 * π/3 rounds to 1.0471975511965979; tests/unit/exact-pi.test.js). Non-integers or non-positive n: RangeError.
 */
export function piOver(n) {
  if (!Number.isInteger(n) || n <= 0) throw new RangeError(`piOver: a positive integer expected, got ${n}`);
  const c = Math.PI / n, N = BigInt(n);
  let best = c, bestErr = null;
  for (const d of [nextDouble(c, -1), c, nextDouble(c, 1)]) {
    // |d − π/n| ∝ |m·n·10^67 − π·10^67·2^s| / 2^s; compared on the common denominator 2^1100
    const [m, s] = dyadic(d);
    const diff = m * N * PI_SCALE - PI_DIGITS * (1n << s);
    const err = (diff < 0n ? -diff : diff) << (1100n - s);
    if (bestErr === null || err < bestErr) { best = d; bestErr = err; }
  }
  return best;
}
