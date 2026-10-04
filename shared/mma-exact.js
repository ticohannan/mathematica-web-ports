// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/mma-exact.js
// Bit-exact reproductions of a few Wolfram Language built-ins on machine numbers, as measured
// against Mathematica 15.0.1 with `npm run compare:original -- --trace` (see docs/TESTING.md):
//
//   Det[m]           LU factorisation of the column-major view (LAPACK getrf on the transpose):
//                    partial pivoting, multipliers by reciprocal when a column has more than one
//                    entry below the pivot and by division when it has one, fused multiply-add
//                    updates, determinant = sign * product of the diagonal (left to right).
//                    Matched 6 000 / 6 000 probes and 45 090 calls inside the motion-planning code.
//   Norm[v]          classic BLAS dnrm2 scaling. Matched 5 500 / 5 500.
//   ArcTan[x, y]     correctly rounded atan2(y, x). Matched 9 945 / 9 945.
//   VectorAngle[u,v] best formula found so far (2 ArcTan of the Kahan norms, plain square-root
//                    norms, the platform atan2): matches about 87 % of calls; the rest differ in the
//                    last bit. Documented as a known deviation (motion-planning DESIGN.md K-MP-02).
//
// JavaScript has no fused multiply-add and Math.atan2 is not correctly rounded, so both are
// computed here: fast double-double arithmetic, with an exact BigInt fallback in the rare cases
// where the fast result cannot be proven correctly rounded.

// ------------------------------------------------------------------ exact helpers (BigInt)
const dv = new DataView(new ArrayBuffer(8));
function decompose(x) { // x = m * 2^e exactly
  if (x === 0) return [0n, 0];
  dv.setFloat64(0, x);
  const hi = dv.getUint32(0), lo = dv.getUint32(4);
  const neg = hi >>> 31 === 1, ex = (hi >>> 20) & 0x7ff;
  let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo), e;
  if (ex === 0) e = -1074; else { m |= 1n << 52n; e = ex - 1075; }
  return [neg ? -m : m, e];
}
const bitLength = (a) => a.toString(2).length; // a > 0n
function toDouble(m, e) { // m * 2^e rounded to the nearest double (ties to even), subnormals included
  if (m === 0n) return 0;
  const neg = m < 0n;
  let a = neg ? -m : m;
  const target = Math.max(bitLength(a) + e - 53, -1074); // exponent of the last kept bit
  if (target > e) {
    const sh = BigInt(target - e), half = 1n << (sh - 1n), rem = a & ((1n << sh) - 1n);
    a >>= sh;
    if (rem > half || (rem === half && (a & 1n) === 1n)) a += 1n;
    e = target;
  }
  return (neg ? -1 : 1) * (Number(a) * 2 ** e); // exact: a <= 2^53 and e >= -1074
}
function fmaBig(a, b, c) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || a === 0 || b === 0) return a * b + c; // IEEE result is exact here
  const [m1, e1] = decompose(a), [m2, e2] = decompose(b), [m3, e3] = decompose(c);
  const mp = m1 * m2, ep = e1 + e2;
  if (mp === 0n) return c;
  if (m3 === 0n) return toDouble(mp, ep);
  const e0 = Math.min(ep, e3);
  return toDouble((mp << BigInt(ep - e0)) + (m3 << BigInt(e3 - e0)), e0);
}

// ------------------------------------------------------------------ double-double arithmetic
const twoSum = (a, b) => { const s = a + b, bb = s - a; return [s, (a - (s - bb)) + (b - bb)]; };
const quickTwoSum = (a, b) => { const s = a + b; return [s, b - (s - a)]; };
const SPLIT = 134217729; // 2^27 + 1
const split = (a) => { const t = SPLIT * a, hi = t - (t - a); return [hi, a - hi]; };
const twoProd = (a, b) => {
  const p = a * b, [ah, al] = split(a), [bh, bl] = split(b);
  return [p, ((ah * bh - p) + ah * bl + al * bh) + al * bl];
};
const ddAdd = (A, B) => {
  let [s, e] = twoSum(A[0], B[0]); const [t, f] = twoSum(A[1], B[1]);
  e += t; [s, e] = quickTwoSum(s, e); e += f; return quickTwoSum(s, e);
};
const ddNeg = (A) => [-A[0], -A[1]];
const ddMul = (A, B) => { const [p, e] = twoProd(A[0], B[0]); return quickTwoSum(p, e + (A[0] * B[1] + A[1] * B[0])); };
const ddDiv = (A, B) => {
  const q1 = A[0] / B[0];
  let R = ddAdd(A, ddNeg(ddMul(B, [q1, 0])));
  const q2 = R[0] / B[0];
  R = ddAdd(R, ddNeg(ddMul(B, [q2, 0])));
  const q3 = R[0] / B[0];
  return ddAdd(quickTwoSum(q1, q2), [q3, 0]);
};
/**
 * True when every real number within `err` of hi + lo rounds to `hi` (round to nearest), so `hi` is
 * provably the correctly rounded value. Uses the hardware rounding itself, so it also handles a
 * power-of-two `hi`, where the gap below is half the gap above. `err` must be an upper bound of the
 * total error and `lo` should be much smaller than one unit in the last place of `hi`.
 */
const SLACK = 1 + 2 ** -16;
const surelyRounds = (hi, lo, err) => {
  const d = (Math.abs(lo) + err) * SLACK;
  return hi + d === hi && hi - d === hi;
};

/** Correctly rounded a*b + c (fused multiply-add). Fast path without allocations. */
export function fma(a, b, c) {
  const p = a * b;
  if (!(Math.abs(p) < 1e300) || !(Math.abs(c) < 1e300) || Math.abs(p) < 1e-290 || a === 0 || b === 0) return fmaBig(a, b, c);
  // a*b = p + e exactly (Dekker)
  let t = SPLIT * a; const ah = t - (t - a), al = a - ah;
  t = SPLIT * b; const bh = t - (t - b), bl = b - bh;
  const e = ((ah * bh - p) + ah * bl + al * bh) + al * bl;
  // p + c = s + q exactly
  const s = p + c; let bb = s - p; const q = (p - (s - bb)) + (c - bb);
  // q + e = u + v exactly
  const u = q + e; bb = u - q; const v = (q - (u - bb)) + (e - bb);
  // s + u = r + w exactly  →  a*b + c = r + w + v
  const r = s + u; bb = r - s; const w = (s - (r - bb)) + (u - bb);
  if (r !== 0 && surelyRounds(r, Math.abs(w) + Math.abs(v), 0)) return r; // provably the nearest double
  return fmaBig(a, b, c);
}

// ------------------------------------------------------------------ Det
/** Mathematica Det for a small square matrix of machine numbers (see header). */
export function det(M) {
  const n = M.length;
  if (n === 2) { // same algorithm, unrolled: LU of [[m00, m10], [m01, m11]]
    const [[m00, m01], [m10, m11]] = M;
    if (Math.abs(m01) > Math.abs(m00)) { if (m01 === 0) return 0; const l = m00 / m01; return -(m01 * fma(-l, m11, m10)) + 0; }
    if (m00 === 0) return 0;
    const l = m01 / m00; return m00 * fma(-l, m10, m11) + 0; // + 0: no signed zero, as in Mathematica
  }
  const A = M[0].map((_, j) => M.map((row) => row[j])); // column-major view = transpose
  let sign = 1;
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
    if (A[p][k] === 0) return 0;
    if (p !== k) { const tmp = A[p]; A[p] = A[k]; A[k] = tmp; sign = -sign; }
    const piv = A[k][k], recip = n - 1 - k > 1, r = 1 / piv;
    for (let i = k + 1; i < n; i++) {
      const l = recip ? A[i][k] * r : A[i][k] / piv;
      for (let j = k + 1; j < n; j++) A[i][j] = fma(-l, A[k][j], A[i][j]);
    }
  }
  let d = A[0][0];
  for (let k = 1; k < n; k++) d *= A[k][k];
  return sign * d + 0;
}

// ------------------------------------------------------------------ Norm, VectorAngle
/** Mathematica Norm of a real vector: BLAS dnrm2 scaling. */
export function norm(v) {
  let scale = 0, ssq = 1;
  for (const x of v) {
    if (x !== 0) {
      const ax = Math.abs(x);
      if (scale < ax) { ssq = 1 + ssq * (scale / ax) ** 2; scale = ax; } else ssq += (ax / scale) ** 2;
    }
  }
  return scale * Math.sqrt(ssq);
}
const sqrtNorm = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
/** VectorAngle[u, v] — best known reproduction (≈ 87 % bit-identical, otherwise 1 ulp). */
export function vectorAngle(u, v) {
  const a = sqrtNorm(u), b = sqrtNorm(v);
  return 2 * Math.atan2(sqrtNorm(u.map((x, i) => x * b - v[i] * a)), sqrtNorm(u.map((x, i) => x * b + v[i] * a)));
}

// ------------------------------------------------------------------ correctly rounded ArcTan
const P = 240n, ONE = 1n << P;
const toFixed = (x) => { const [m, e] = decompose(x); const sh = BigInt(e) + P; return sh >= 0n ? m << sh : m >> -sh; };
const fmul = (a, b) => (a * b) >> P;
const fdiv = (a, b) => (a << P) / b;
/** [floor(v), v > floor(v)] for v = (n·2^en) / (d·2^ed) · 2^q, positive n, d */
const ratioScaled = (n, en, d, ed, q) => {
  const sh = en - ed + q, num = sh >= 0 ? n << BigInt(sh) : n, den = sh >= 0 ? d : d << BigInt(-sh);
  return [num / den, num % den !== 0n];
};
function isqrt(n) { if (n < 2n) return n; let x = 1n << BigInt((n.toString(2).length + 1) >> 1); for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; } }
function atanFixed(t) { // |t| <= ONE
  if (t < 0n) return -atanFixed(-t);
  let k = 0n;
  for (; k < 3n; k++) t = fdiv(t, ONE + isqrt((ONE + fmul(t, t)) << P));
  const t2 = fmul(t, t);
  let sum = 0n, term = t, n = 1n, sg = 1n;
  while (term !== 0n) { sum += sg * (term / n); term = fmul(term, t2); n += 2n; sg = -sg; }
  return sum << k;
}
const PI_FIXED = (() => {
  const at = (inv) => { const x = ONE / inv, x2 = fmul(x, x); let s = 0n, term = x, n = 1n, sg = 1n; while (term) { s += sg * (term / n); term = fmul(term, x2); n += 2n; sg = -sg; } return s; };
  return 16n * at(5n) - 4n * at(239n);
})();
const fixedToDD = (V) => { const hi = toDouble(V, -Number(P)); const lo = toDouble(V - toFixed(hi), -Number(P)); return [hi, lo]; };
function arcTanBig(x, y) { // exact up to 2^-230 relative, then rounded once
  x += 0; y += 0;
  if (y === 0) return x < 0 ? Math.PI : 0;
  if (x === 0) return y > 0 ? Math.PI / 2 : -Math.PI / 2;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return Math.atan2(y, x);
  const [mx, ex] = decompose(Math.abs(x)), [my, ey] = decompose(Math.abs(y));
  const swap = Math.abs(y) > Math.abs(x);
  const [n, en, d, ed] = swap ? [mx, ex, my, ey] : [my, ey, mx, ex]; // ratio r = n·2^en / (d·2^ed) <= 1
  // z extra bits keep P significant bits when r is tiny (atan r ≈ r)
  const z = Math.max(0, (bitLength(d) + ed) - (bitLength(n) + en));
  const [Rz, inexact] = ratioScaled(n, en, d, ed, Number(P) + z); // floor(r · 2^(P+z))
  let A, scale; // atan(r) = A · 2^-scale
  if (z <= 8) { A = atanFixed(Rz >> BigInt(z)); scale = Number(P); }
  else {
    const R = Rz >> BigInt(z), r2 = fmul(R, R); // r·2^P, r²·2^P
    let S = 0n, term = ONE, k = 1n, sg = 1n;
    while (term !== 0n) { S += sg * (term / k); term = fmul(term, r2); k += 2n; sg = -sg; }
    A = (Rz * S) >> P; scale = Number(P) + z;
    if (r2 === 0n) { // r < 2^-120: atan r = r(1 - δ), 0 < δ < 2^-240, so it lies strictly inside
      // (Rz, Rz + 1) when r·2^scale is not an integer, and just below Rz when it is: one sticky bit
      A = 2n * Rz + (inexact ? 1n : -1n); scale += 1;
    }
  }
  if (!swap && x > 0) return (y < 0 ? -1 : 1) * toDouble(A, -scale);
  let a = scale === Number(P) ? A : A >> BigInt(scale - Number(P)); // absolute fixed point is enough now
  if (swap) a = PI_FIXED / 2n - a;
  if (x < 0) a = PI_FIXED - a;
  return (y < 0 ? -1 : 1) * toDouble(a, -Number(P));
}
const PI_DD = fixedToDD(PI_FIXED), PI2_DD = fixedToDD(PI_FIXED / 2n);
const ATAN_TABLE = Array.from({ length: 65 }, (_, k) => fixedToDD(atanFixed(toFixed(k / 64))));
const INV_ODD = Array.from({ length: 12 }, (_, n) => ddDiv([1, 0], [2 * n + 1, 0]));
function atanDD(t) { // dd t in [0, 1]
  const k = Math.round(t[0] * 64), c = k / 64;
  const u = ddDiv(ddAdd(t, [-c, 0]), ddAdd([1, 0], ddMul(t, [c, 0])));
  const u2 = ddMul(u, u);
  // atan(u) = u * sum_n (-1)^n u^(2n) / (2n+1), Horner from n = 11 (|u| <= 1/128: error < 2^-160)
  let s = ddNeg(INV_ODD[11]);
  for (let n = 10; n >= 0; n--) s = ddAdd(n % 2 ? ddNeg(INV_ODD[n]) : INV_ODD[n], ddMul(u2, s));
  return ddAdd(ATAN_TABLE[k], ddMul(u, s));
}
/** Mathematica ArcTan[x, y] (correctly rounded atan2(y, x); no signed zero). */
export function arcTan(x, y) {
  x += 0; y += 0;
  if (y === 0) return x < 0 ? Math.PI : 0;
  if (x === 0) return y > 0 ? Math.PI / 2 : -Math.PI / 2;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return Math.atan2(y, x);
  const ax = Math.abs(x), ay = Math.abs(y);
  if (Math.max(ax, ay) > 1e300 || Math.min(ax, ay) < 1e-290 || Math.min(ax, ay) / Math.max(ax, ay) < 2 ** -900) return arcTanBig(x, y);
  let a = ay <= ax ? atanDD(ddDiv([ay, 0], [ax, 0])) : ddAdd(PI2_DD, ddNeg(atanDD(ddDiv([ax, 0], [ay, 0]))));
  if (x < 0) a = ddAdd(PI_DD, ddNeg(a));
  const [hi, lo] = quickTwoSum(a[0], a[1]);
  if (!surelyRounds(hi, lo, Math.abs(hi) * 2 ** -95)) return arcTanBig(x, y);
  return y < 0 ? -hi : hi;
}
export { arcTanBig as _arcTanExactSlow, fmaBig as _fmaExactSlow };
