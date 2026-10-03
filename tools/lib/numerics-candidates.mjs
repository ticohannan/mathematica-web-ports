// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/lib/numerics-candidates.mjs — alternative floating-point implementations of a few Wolfram
// Language built-ins (Det, VectorAngle, Norm, ArcTan, EuclideanDistance). Used by the trace/probe
// mode of tools/compare-with-original.mjs to find out WHICH formula reproduces Mathematica's
// machine-number results bit for bit. Includes an exact fused multiply-add (JavaScript has none).

// ---------------------------------------------------------------- exact arithmetic helpers
const dv = new DataView(new ArrayBuffer(8));
/** x = m * 2^e exactly (m BigInt). */
export function decompose(x) {
  if (x === 0) return [0n, 0];
  dv.setFloat64(0, x);
  const hi = dv.getUint32(0), lo = dv.getUint32(4);
  const neg = hi >>> 31 === 1;
  const exp = (hi >>> 20) & 0x7ff;
  let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e;
  if (exp === 0) e = -1074; else { m |= 1n << 52n; e = exp - 1075; }
  return [neg ? -m : m, e];
}
/** Correctly rounded (ties-to-even) double nearest to m * 2^e. */
export function toDouble(m, e) {
  if (m === 0n) return 0;
  const neg = m < 0n;
  let a = neg ? -m : m;
  const bits = a.toString(2).length;
  if (bits > 64) { // keep 64 bits + sticky bit: enough for correct rounding to 53 bits
    const sh = BigInt(bits - 64);
    const sticky = (a & ((1n << sh) - 1n)) !== 0n;
    a >>= sh; if (sticky) a |= 1n; e += Number(sh);
  }
  return (neg ? -1 : 1) * Number(a) * 2 ** e;
}
/** fma(x, y, z) = x*y + z with a single rounding. */
export function fma(x, y, z) {
  const [m1, e1] = decompose(x), [m2, e2] = decompose(y), [m3, e3] = decompose(z);
  const mp = m1 * m2, ep = e1 + e2;
  if (mp === 0n) return z;
  if (m3 === 0n) return toDouble(mp, ep);
  const e0 = Math.min(ep, e3);
  return toDouble((mp << BigInt(ep - e0)) + (m3 << BigInt(e3 - e0)), e0);
}

// ---------------------------------------------------------------- Det
/** LU decomposition with partial pivoting (LAPACK getrf style), determinant = sign * prod(diag). */
function luDet(M, { recip = false, useFma = false, prodRight = false } = {}) {
  const A = M.map((r) => r.slice());
  const n = A.length;
  let sign = 1;
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
    if (A[p][k] === 0) return 0;
    if (p !== k) { [A[p], A[k]] = [A[k], A[p]]; sign = -sign; }
    const piv = A[k][k], r = 1 / piv;
    for (let i = k + 1; i < n; i++) {
      const l = recip ? A[i][k] * r : A[i][k] / piv;
      A[i][k] = l;
      for (let j = k + 1; j < n; j++) A[i][j] = useFma ? fma(-l, A[k][j], A[i][j]) : A[i][j] - l * A[k][j];
    }
  }
  let d;
  if (prodRight) { d = A[n - 1][n - 1]; for (let k = n - 2; k >= 0; k--) d = A[k][k] * d; }
  else { d = A[0][0]; for (let k = 1; k < n; k++) d *= A[k][k]; }
  return sign * d;
}
function naiveDet(M, useFma = false) {
  if (M.length === 2) {
    const [[a, b], [c, d]] = M;
    return useFma ? fma(a, d, -(b * c)) : a * d - b * c;
  }
  if (M.length === 3) {
    const [[a, b, c], [d, e, f], [g, h, i]] = M;
    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  }
  return NaN;
}
export const DET_CANDIDATES = {
  'naive a*d-b*c / cofactor': (M) => naiveDet(M),
  'naive with fma': (M) => naiveDet(M, true),
  'LU, l = a/p': (M) => luDet(M),
  'LU, l = a*(1/p)': (M) => luDet(M, { recip: true }),
  'LU, l = a/p, fma update': (M) => luDet(M, { useFma: true }),
  'LU, l = a*(1/p), fma update': (M) => luDet(M, { recip: true, useFma: true }),
  'LU, l = a/p, product right-to-left': (M) => luDet(M, { prodRight: true }),
  'LU, l = a*(1/p), product right-to-left': (M) => luDet(M, { recip: true, prodRight: true }),
};

// ---------------------------------------------------------------- Norm / distance
function dnrm2Classic(v) { // reference BLAS dnrm2 (scale / sum of squares), pre-LAPACK-3.10
  let scale = 0, ssq = 1;
  for (const x of v) {
    if (x !== 0) {
      const ax = Math.abs(x);
      if (scale < ax) { ssq = 1 + ssq * (scale / ax) ** 2; scale = ax; } else ssq += (ax / scale) ** 2;
    }
  }
  return scale * Math.sqrt(ssq);
}
const sumSq = (v) => v.reduce((s, x) => s + x * x, 0);
export const NORM_CANDIDATES = {
  'Sqrt[x^2+y^2]': (v) => Math.sqrt(sumSq(v)),
  'hypot': (v) => Math.hypot(...v),
  'BLAS dnrm2 (scaled)': (v) => dnrm2Classic(v),
  'Sqrt[fma(x,x,y*y)]': (v) => (v.length === 2 ? Math.sqrt(fma(v[0], v[0], v[1] * v[1])) : NaN),
};
export const EUCLID_CANDIDATES = Object.fromEntries(Object.entries(NORM_CANDIDATES)
  .map(([k, f]) => [k, (a, b) => f(a.map((x, i) => x - b[i]))]));

// ---------------------------------------------------------------- angles
export const ARCTAN_CANDIDATES = {
  'Math.atan2(y, x)': (x, y) => Math.atan2(y, x),
};
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const VECTORANGLE_CANDIDATES = {
  'ArcCos[u.v/(|u||v|)] (sqrt norms)': (u, v) => Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (Math.sqrt(sumSq(u)) * Math.sqrt(sumSq(v)))))),
  'ArcCos[u.v/(|u||v|)] (hypot norms)': (u, v) => Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (Math.hypot(...u) * Math.hypot(...v))))),
  'ArcCos[u.v/Sqrt[(u.u)(v.v)]]': (u, v) => Math.acos(Math.max(-1, Math.min(1, dot(u, v) / Math.sqrt(sumSq(u) * sumSq(v))))),
  '2 ArcTan[|u|v|-v|u||, |u|v|+v|u||] (Kahan)': (u, v) => {
    const nu = Math.sqrt(sumSq(u)), nv = Math.sqrt(sumSq(v));
    const a = u.map((x, i) => x * nv - v[i] * nu), b = u.map((x, i) => x * nv + v[i] * nu);
    return 2 * Math.atan2(Math.sqrt(sumSq(a)), Math.sqrt(sumSq(b)));
  },
  'ArcTan[u.v, |u x v|]': (u, v) => Math.atan2(Math.abs(u[0] * v[1] - u[1] * v[0]), dot(u, v)),
};

export const CANDIDATES = {
  Det: (args) => Object.fromEntries(Object.entries(DET_CANDIDATES).map(([k, f]) => [k, f(args[0])])),
  Norm: (args) => Object.fromEntries(Object.entries(NORM_CANDIDATES).map(([k, f]) => [k, f(args[0])])),
  EuclideanDistance: (args) => Object.fromEntries(Object.entries(EUCLID_CANDIDATES).map(([k, f]) => [k, f(args[0], args[1])])),
  ArcTan: (args) => Object.fromEntries(Object.entries(ARCTAN_CANDIDATES).map(([k, f]) => [k, f(args[0], args[1])])),
  VectorAngle: (args) => Object.fromEntries(Object.entries(VECTORANGLE_CANDIDATES).map(([k, f]) => [k, f(args[0], args[1])])),
};

/** Seeded probe arguments for the built-ins (realistic magnitudes + near-degenerate cases). */
export function probeArguments(seed = 1, count = 1500) {
  let s = seed >>> 0 || 1;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const c = () => Number(((rand() - 0.5) * 9).toFixed(2)); // a locator-like coordinate
  const w = () => (rand() - 0.5) * 9 + (rand() - 0.5) * 1e-3 * rand(); // non-round value
  const out = { Det: [], Norm: [], EuclideanDistance: [], ArcTan: [], VectorAngle: [] };
  for (let i = 0; i < count; i++) {
    const a = [w(), w()], b = [w(), w()];
    out.Det.push([[a, b]]);
    const t = w();
    out.Det.push([[a, [a[0] * t + (rand() - 0.5) * 1e-9, a[1] * t]]]); // nearly parallel rows
    const p1 = [c(), c()], p2 = [w(), w()], p3 = [w(), w()];
    out.Det.push([[[1, ...p1], [1, ...p2], [1, ...p3]]]);
    out.Det.push([[[1, ...p2], [1, ...p3], [1, p2[0] + (p3[0] - p2[0]) * 0.5, p2[1] + (p3[1] - p2[1]) * 0.5 + (rand() - 0.5) * 1e-12]]]);
    out.Norm.push([[w(), w()]]);
    out.EuclideanDistance.push([[w(), w()], [c(), c()]]);
    out.ArcTan.push([w(), w()]);
    out.VectorAngle.push([[w(), w()], [w(), w()]]);
    out.VectorAngle.push([a, [a[0] * 2 + (rand() - 0.5) * 1e-10, a[1] * 2]]); // nearly parallel
  }
  return out;
}
