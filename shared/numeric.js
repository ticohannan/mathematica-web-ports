// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/numeric.js — Mathematica's numerical functions of one variable that the control and signal ports use (v0.1.37).
//
//   FindRoot(f, x0)              FindRoot[f[x] == 0, {x, x0}]: Newton's method (derivative by central differences,
//                                step halving while |f| does not decrease). Returns x.
//   FindRoot(f, [x0, x1])        FindRoot[f[x] == 0, {x, x0, x1}]: the secant method from two starting values; when
//                                the two values bracket a root, the bracket is kept (Illinois variant of regula falsi),
//                                so the root found is the one inside it.
//   FindMaximum(f, x0, opts)     FindMaximum[f[x], {x, x0}]: the local maximum reached by climbing from x0 (the first
//                                step 1 % of max(1, |x0|), or x1 − x0 for [x0, x1]), refined by Brent's parabolic
//                                method; opts.bounds [a, b] keeps x inside (FindMaximum[{f, a <= x <= b}, …]).
//                                Returns [fmax, xmax] (Mathematica's {fmax, {x -> xmax}}).  FindMinimum likewise.
//   NIntegrate(f, [a, b], opts)  NIntegrate[f[x], {x, a, b}]: globally adaptive Gauss–Kronrod (7/15 points, the rule
//                                and nodes of QUADPACK's QK15, R. Piessens et al., Springer 1983, public domain), the
//                                interval with the largest error estimate bisected until the total error is below
//                                max(AccuracyGoal, PrecisionGoal·|result|); opts.breakpoints splits [a, b] first
//                                (Mathematica's {x, a, x1, …, b}). Default goals 10⁻¹⁰ relative, 10⁻¹² absolute.
//   Fourier(list, {FourierParameters: [a, b]})   Mathematica's discrete Fourier transform
//                                v_s = n^((a−1)/2) Σ_r u_r e^(2π i b (r−1)(s−1)/n), default {0, 1}; radix-2 FFT for a
//                                power-of-two length, the direct sum otherwise. Real or complex input; complex output.
//   TriangleWave(x), SquareWave(x), SawtoothWave(x)   period 1, as Mathematica's (TriangleWave[0] = 0, rising to 1 at
//                                1/4; SquareWave 1 on [0, 1/2), −1 on [1/2, 1); SawtoothWave x − Floor[x]).

import { Complex, cadd, csub, cmul } from './complex.js';

const deriv = (f, x) => { const h = 1e-6 * Math.max(1, Math.abs(x)); return (f(x + h) - f(x - h)) / (2 * h); };

export function FindRoot(f, start, { MaxIterations = 100 } = {}) {
  if (Array.isArray(start)) return secant(f, start[0], start[1], MaxIterations);
  let x = start, fx = f(x);
  for (let i = 0; i < MaxIterations; i++) {
    if (fx === 0) return x;
    const d = deriv(f, x);
    if (!Number.isFinite(d) || d === 0) break;
    let step = fx / d, xn = x - step, fn = f(xn);
    for (let k = 0; k < 30 && !(Math.abs(fn) < Math.abs(fx)) && Math.abs(step) > 1e-15 * Math.max(1, Math.abs(x)); k++) { step /= 2; xn = x - step; fn = f(xn); }
    const done = Math.abs(xn - x) <= 1e-14 * Math.max(1, Math.abs(xn));
    x = xn; fx = fn;
    if (done) break;
  }
  return x;
}
function secant(f, a, b, maxIt) {
  let fa = f(a), fb = f(b);
  const bracket = fa * fb < 0;
  for (let i = 0; i < 4 * maxIt; i++) {
    if (fb === 0) return b;
    if (fa === fb) break;
    const c = b - (fb * (b - a)) / (fb - fa), fc = f(c);
    if (Math.abs(c - b) <= 1e-15 * Math.max(1, Math.abs(c))) return c;
    if (bracket) { // Illinois: keep the end where the sign differs
      if (fc * fb < 0) { a = b; fa = fb; } else fa /= 2;
      b = c; fb = fc;
      if (Math.abs(b - a) <= 1e-15 * Math.max(1, Math.abs(b))) return b;
    } else { a = b; fa = fb; b = c; fb = fc; }
  }
  return b;
}

/** Brent's minimisation of g on [a, c] with the interior point b (g(b) < g(a), g(c)). */
function brent(g, a, b, c) {
  const CG = 0.3819660112501051, tol = 1e-10;
  let lo = Math.min(a, c), hi = Math.max(a, c), x = b, w = b, v = b, fx = g(x), fw = fx, fv = fx, d = 0, e = 0;
  for (let it = 0; it < 200; it++) {
    const m = (lo + hi) / 2, tol1 = tol * Math.abs(x) + 1e-14, tol2 = 2 * tol1;
    if (Math.abs(x - m) <= tol2 - (hi - lo) / 2) break;
    let useGolden = true;
    if (Math.abs(e) > tol1) {
      let r = (x - w) * (fx - fv), q = (x - v) * (fx - fw), p = (x - v) * q - (x - w) * r;
      q = 2 * (q - r); if (q > 0) p = -p; q = Math.abs(q);
      const et = e; e = d;
      if (Math.abs(p) < Math.abs(0.5 * q * et) && p > q * (lo - x) && p < q * (hi - x)) {
        d = p / q; const u = x + d;
        if (u - lo < tol2 || hi - u < tol2) d = x < m ? tol1 : -tol1;
        useGolden = false;
      }
    }
    if (useGolden) { e = (x < m ? hi : lo) - x; d = CG * e; }
    const u = Math.abs(d) >= tol1 ? x + d : x + (d > 0 ? tol1 : -tol1), fu = g(u);
    if (fu <= fx) { if (u < x) hi = x; else lo = x; v = w; fv = fw; w = x; fw = fx; x = u; fx = fu; }
    else { if (u < x) lo = u; else hi = u; if (fu <= fw || w === x) { v = w; fv = fw; w = u; fw = fu; } else if (fu <= fv || v === x || v === w) { v = u; fv = fu; } }
  }
  return [fx, x];
}
function localMin(g, start, { bounds = [-Infinity, Infinity] } = {}) {
  const [lo, hi] = bounds, clamp = (x) => Math.min(hi, Math.max(lo, x));
  let x0 = clamp(Array.isArray(start) ? start[0] : start);
  let step = Array.isArray(start) ? start[1] - start[0] : 0.01 * Math.max(1, Math.abs(x0));
  let f0 = g(x0), x1 = clamp(x0 + step), f1 = g(x1);
  if (!(f1 < f0)) { // try the other direction
    const xm = clamp(x0 - step), fm = g(xm);
    if (fm < f0) { step = -step; x1 = xm; f1 = fm; } else if (x1 !== x0 && xm !== x0) return brent(g, xm, x0, x1);
    else return f1 < f0 ? [f1, x1] : [f0, x0];
  }
  // downhill with growing steps until g rises (or a bound is reached)
  for (let k = 0; k < 200; k++) {
    step *= 1.618;
    const x2 = clamp(x1 + step), f2 = g(x2);
    if (x2 === x1) return [f1, x1]; // at a bound
    if (f2 >= f1) return brent(g, x0, x1, x2);
    x0 = x1; f0 = f1; x1 = x2; f1 = f2;
  }
  return [f1, x1];
}
export const FindMinimum = (f, start, opts) => localMin(f, start, opts);
export function FindMaximum(f, start, opts) { const [v, x] = localMin((x) => -f(x), start, opts); return [-v, x]; }

// QUADPACK QK15: Kronrod nodes (positive half, the last is 0), their weights, and the 7-point Gauss weights of the
// nodes with odd index
const XGK = [0.991455371120812639206854697526329, 0.949107912342758524526189684047851, 0.864864423359769072789712788640926,
  0.741531185599394439863864773280788, 0.586087235467691130294144845693013, 0.405845151377397166906606412076961,
  0.207784955007898467600689403773245, 0];
const WGK = [0.022935322010529224963732008058970, 0.063092092629978553290700663189204, 0.104790010322250183839876322541518,
  0.140653259715525918745189590510238, 0.169004726639267902826583426598550, 0.190350578064785409913256402421014,
  0.204432940075298892414161999234649, 0.209482141084727828012999174891714];
const WG = [0.129484966168869693270611432679082, 0.279705391489276667901467771423780, 0.381830050505118944950369775488975,
  0.417959183673469387755102040816327];
function qk15(f, a, b) {
  const c = (a + b) / 2, h = (b - a) / 2, fc = f(c);
  let rk = fc * WGK[7], rg = fc * WG[3];
  for (let j = 0; j < 7; j++) {
    const x = h * XGK[j], s = f(c - x) + f(c + x);
    rk += WGK[j] * s;
    if (j % 2 === 1) rg += WG[(j - 1) / 2] * s;
  }
  return { a, b, value: rk * h, error: Math.abs((rk - rg) * h) };
}
export function NIntegrate(f, [a, b], { breakpoints = [], PrecisionGoal = 10, AccuracyGoal = 12, MaxSubintervals = 20000 } = {}) {
  const pts = [a, ...breakpoints.filter((x) => x > a && x < b).sort((p, q) => p - q), b];
  const ivs = [];
  for (let i = 0; i + 1 < pts.length; i++) ivs.push(qk15(f, pts[i], pts[i + 1]));
  const rtol = 10 ** -PrecisionGoal, atol = 10 ** -AccuracyGoal;
  for (let it = 0; it < MaxSubintervals; it++) {
    let total = 0, err = 0, worst = 0;
    ivs.forEach((iv, i) => { total += iv.value; err += iv.error; if (iv.error > ivs[worst].error) worst = i; });
    if (err <= Math.max(atol, rtol * Math.abs(total))) return total;
    const iv = ivs[worst], m = (iv.a + iv.b) / 2;
    if (m <= iv.a || m >= iv.b) return total;
    ivs.splice(worst, 1, qk15(f, iv.a, m), qk15(f, m, iv.b));
  }
  return ivs.reduce((s, iv) => s + iv.value, 0);
}

/** Fourier[list, FourierParameters -> {a, b}] (complex numbers out). */
export function Fourier(list, { FourierParameters: [pa, pb] = [0, 1] } = {}) {
  const n = list.length, z = list.map((u) => (typeof u === 'number' ? Complex(u, 0) : u));
  const sign = Math.sign(pb) || 1, scale = n ** ((pa - 1) / 2);
  let out;
  if ((n & (n - 1)) === 0 && Math.abs(pb) === 1) {
    out = z.slice();
    for (let i = 1, j = 0; i < n; i++) { // bit-reversal permutation
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) [out[i], out[j]] = [out[j], out[i]];
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (sign * 2 * Math.PI) / len;
      for (let i = 0; i < n; i += len) {
        for (let k = 0; k < len / 2; k++) {
          const w = Complex(Math.cos(ang * k), Math.sin(ang * k)), u = out[i + k], v = cmul(out[i + k + len / 2], w);
          out[i + k] = cadd(u, v); out[i + k + len / 2] = csub(u, v);
        }
      }
    }
  } else {
    out = Array.from({ length: n }, (_, s) => {
      let acc = Complex(0, 0);
      for (let r = 0; r < n; r++) { const ang = (2 * Math.PI * pb * ((r * s) % n)) / n; acc = cadd(acc, cmul(z[r], Complex(Math.cos(ang), Math.sin(ang)))); }
      return acc;
    });
  }
  return out.map((c) => Complex(c.re * scale, c.im * scale));
}

export function TriangleWave(x) {
  const p = x - Math.floor(x);
  return p < 0.25 ? 4 * p : p < 0.75 ? 2 - 4 * p : 4 * p - 4;
}
export const SquareWave = (x) => (x - Math.floor(x) < 0.5 ? 1 : -1);
export const SawtoothWave = (x) => x - Math.floor(x);
