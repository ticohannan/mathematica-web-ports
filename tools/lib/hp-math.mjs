// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/lib/hp-math.mjs — correctly rounded ArcTan[x, y] and ArcCos[c] for doubles, computed with
// BigInt fixed-point arithmetic (≈ 220 bits). Slow (tens of µs per call) — meant for the diagnostic
// candidates in numerics-candidates.mjs, not for the interactive demo.
import { decompose, toDouble } from './numerics-candidates.mjs';

const P = 240n;                 // fixed-point fraction bits
const ONE = 1n << P;
const toFixed = (x) => { const [m, e] = decompose(x); const sh = BigInt(e) + P; return sh >= 0n ? m << sh : m >> -sh; };
const fromFixed = (v) => toDouble(v, -Number(P));
const mul = (a, b) => (a * b) >> P;
const div = (a, b) => (a << P) / b;
function isqrt(n) { // floor(sqrt(n)) for BigInt n >= 0
  if (n < 2n) return n;
  let x = 1n << BigInt((n.toString(2).length + 1) >> 1);
  for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; }
}
const sqrtFixed = (a) => isqrt(a << P);
/** atan(t) for fixed-point |t| <= ONE. */
function atanSmall(t) {
  if (t < 0n) return -atanSmall(-t); // work with |t| (shifts of negative BigInts never reach 0)
  // halve the angle 3 times: atan(t) = 2 atan(t / (1 + sqrt(1 + t^2)))
  let k = 0n;
  for (; k < 3n; k++) t = div(t, ONE + sqrtFixed(ONE + mul(t, t)));
  const t2 = mul(t, t);
  let sum = 0n, term = t, n = 1n, sign = 1n;
  while (term !== 0n) { sum += sign * (term / n); term = mul(term, t2); n += 2n; sign = -sign; }
  return sum << k;
}
const PI = (() => { // Machin: pi = 16 atan(1/5) - 4 atan(1/239)
  const at = (inv) => { const x = ONE / inv, x2 = mul(x, x); let s = 0n, term = x, n = 1n, sg = 1n; while (term) { s += sg * (term / n); term = mul(term, x2); n += 2n; sg = -sg; } return s; };
  return 16n * at(5n) - 4n * at(239n);
})();
/** Correctly rounded ArcTan[x, y] = atan2(y, x) (Mathematica argument order). */
export function arcTanCR(x, y) {
  if (x === 0 && y === 0) return 0;
  const X = toFixed(x), Y = toFixed(y);
  const ax = X < 0n ? -X : X, ay = Y < 0n ? -Y : Y;
  let a;
  if (ay <= ax) {
    a = atanSmall(div(Y, X));               // in (-pi/4, pi/4]
    if (X < 0n) a += Y >= 0n ? PI : -PI;
  } else {
    a = (Y > 0n ? PI : -PI) / 2n - atanSmall(div(X, Y));
  }
  return fromFixed(a);
}
/** Correctly rounded ArcCos[c] for |c| <= 1. */
export function arcCosCR(c) {
  const C = toFixed(c);
  const s = sqrtFixed(mul(ONE - C, ONE + C));
  const ac = C < 0n ? -C : C;
  let a;
  if (ac <= s) { a = PI / 2n - atanSmall(div(C, s)); }
  else { a = atanSmall(div(s, ac)); if (C < 0n) a = PI - a; }
  return fromFixed(a);
}
