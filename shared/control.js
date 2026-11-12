// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/control.js — Mathematica's linear-systems functions for single-input single-output transfer functions
// (v0.1.37), in Mathematica's names.
//
//   TransferFunctionModel(num, den, { delay })   num(s)/den(s)·e^(−delay·s); num and den are coefficient lists from the
//                                       constant term up (CoefficientList), e.g. (k + c s)/(k + c s + m s²) is
//                                       TransferFunctionModel([k, c], [k, c, m])
//   TransferFunctionPoles(G), TransferFunctionZeros(G)   the roots of den and num (complex numbers, shared/poly.js)
//   SystemsModelSeriesConnect(G, H) = G·H, SystemsModelParallelConnect(G, H) = G + H,
//   SystemsModelFeedbackConnect(G, H = 1) = G/(1 + G H)        (unit negative feedback by default)
//   tfScale(G, k), tfEval(G, z) (G at a complex z), FrequencyResponse(G, ω) = G(iω)
//   OutputResponse(G, u, opts)          the zero-state response y(t) as a function of t, for
//                                       u = Signal.step(a), Signal.ramp(a) (a t), Signal.sin(ω, amp, φ) (amp sin(ω t + φ)),
//                                       Signal.cos(…), Signal.exp(λ, a) (a e^(λ t)), Signal.sum(…), or any function u(t)
//                                       (then with opts.tmax: integrated by shared/ode.js)
//   InverseLaplaceTransform(num, den)   the inverse Laplace transform of a strictly proper rational function, as a
//                                       function of t (for a biproper one the constant part's δ(t) is left out)
//   GainMargins(G), PhaseMargins(G)     lists of { frequency, margin } (gain as a ratio, phase in radians)
//   BodeData(G, ω)                      { magnitudeDB, phaseDegrees } with the phase unwrapped (continuous in ω)
//
// Method (no symbolic algebra): the response of a rational transfer function to an input that is itself the output of
// a small linear system (a step, ramp, sinusoid, exponential and their sums: everything with a rational Laplace
// transform) is computed exactly by one matrix exponential of the combined system, C·e^(M t)·z0 (C. F. Van Loan,
// "Computing integrals involving the matrix exponential", IEEE Trans. Autom. Control 23 (1978) 395–404; the approach of
// MATLAB's step/lsim and SciPy's signal.lsim), with shared/matrix.js MatrixExp (Higham 2005). The realisation is the
// controllable canonical form. This is the same function Mathematica's OutputResponse and InverseLaplaceTransform give
// in closed form, to rounding — including repeated poles, where partial fractions lose accuracy. Dead time: y(t) = 0 for
// t < delay, then the response without delay at t − delay (Mathematica's OutputResponse of a model with
// Exp[−θ s]).
// Margins follow the polynomial method of python-control's stability_margins (BSD-3-Clause): the gain crossovers are
// the positive real roots of |num(iω)|² − |den(iω)|², the phase crossovers those of Im(num(iω)·conj(den(iω))) where
// the phase is an odd multiple of π. The phase is unwrapped as the sum of the angles of the factors (iω − zero) and
// (iω − pole), so it is continuous in ω, as Mathematica's BodePlot and margins use it.

import { Complex, cadd, cmul, cdiv, cexp, Abs, Arg, Re, Im } from './complex.js';
import { polyTrim, polyAdd, polyMul, polyScale, polyEvalC, polyDegree, Roots } from './poly.js';
import { MatrixExp, matVec } from './matrix.js';
import { NDSolve } from './ode.js';

export function TransferFunctionModel(num, den, { delay = 0 } = {}) {
  num = polyTrim(typeof num === 'number' ? [num] : num); den = polyTrim(typeof den === 'number' ? [den] : den);
  if (polyDegree(den) < 0) throw new Error('TransferFunctionModel: zero denominator');
  return Object.freeze({ head: 'TransferFunctionModel', num, den, delay });
}
const tf = TransferFunctionModel;
export const TransferFunctionPoles = (G) => Roots(G.den);
export const TransferFunctionZeros = (G) => Roots(G.num);
export const tfScale = (G, k) => tf(polyScale(G.num, k), G.den, { delay: G.delay });
export const SystemsModelSeriesConnect = (G, H) => tf(polyMul(G.num, H.num), polyMul(G.den, H.den), { delay: G.delay + H.delay });
export function SystemsModelParallelConnect(G, H) {
  if (G.delay !== H.delay) throw new Error('SystemsModelParallelConnect: different delays');
  return tf(polyAdd(polyMul(G.num, H.den), polyMul(H.num, G.den)), polyMul(G.den, H.den), { delay: G.delay });
}
/** G/(1 + G H) (H = 1 by default), as N@Simplify[p/(1 + p)] of the ports: the common factors are not cancelled. */
export function SystemsModelFeedbackConnect(G, H = tf([1], [1])) {
  if (G.delay || H.delay) throw new Error('SystemsModelFeedbackConnect: models with dead time are not supported');
  return tf(polyMul(G.num, H.den), polyAdd(polyMul(G.den, H.den), polyMul(G.num, H.num)));
}
export function tfEval(G, z) {
  const v = cdiv(polyEvalC(G.num, z), polyEvalC(G.den, z));
  return G.delay ? cmul(v, cexp(cmul(Complex(-G.delay, 0), z))) : v;
}
export const FrequencyResponse = (G, w) => tfEval(G, Complex(0, w));

// ---- state space: controllable canonical form -------------------------------------------------------------------------
function realize(num, den) {
  const n = polyDegree(den), an = den[n];
  const a = den.map((x) => x / an), b = num.map((x) => x / an);
  if (polyDegree(num) > n) throw new Error('OutputResponse: improper transfer function');
  const D = polyDegree(num) === n ? b[n] : 0;
  const c = Array.from({ length: n }, (_, i) => (b[i] ?? 0) - D * a[i]);
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i < n - 1 ? (j === i + 1 ? 1 : 0) : -a[j])));
  const B = Array.from({ length: n }, (_, i) => (i === n - 1 ? 1 : 0));
  return { A, B, C: c, D, n };
}

/** Inputs with a rational Laplace transform, as the output of a small autonomous system w' = Aw w, u = Cw·w. */
export const Signal = Object.freeze({
  step: (a = 1) => ({ A: [[0]], w0: [a], C: [1] }),
  ramp: (a = 1) => ({ A: [[0, 1], [0, 0]], w0: [0, a], C: [1, 0] }),
  sin: (w, amp = 1, phase = 0) => ({ A: [[0, w], [-w, 0]], w0: [amp * Math.sin(phase), amp * Math.cos(phase)], C: [1, 0] }),
  cos: (w, amp = 1, phase = 0) => Signal.sin(w, amp, phase + Math.PI / 2),
  exp: (lambda, a = 1) => ({ A: [[lambda]], w0: [a], C: [1] }),
  sum: (...parts) => {
    const m = parts.reduce((s, p) => s + p.C.length, 0), A = Array.from({ length: m }, () => new Array(m).fill(0));
    let o = 0; const w0 = [], C = [];
    for (const p of parts) { p.A.forEach((r, i) => r.forEach((x, j) => { A[o + i][o + j] = x; })); w0.push(...p.w0); C.push(...p.C); o += p.C.length; }
    return { A, w0, C };
  },
});

/** The zero-state response t ↦ y(t) of G to the input u (a Signal or a function of t). */
export function OutputResponse(G, u, { tmax } = {}) {
  const { A, B, C, D, n } = realize(G.num, G.den);
  let y0;
  if (typeof u === 'function') {
    if (!(tmax > 0)) throw new Error('OutputResponse: a function input needs opts.tmax');
    if (n === 0) y0 = (t) => D * u(t);
    else {
      const sol = NDSolve((t, x) => { const ut = u(t); return A.map((r, i) => r.reduce((s, aij, j) => s + aij * x[j], 0) + B[i] * ut); }, new Array(n).fill(0), [0, tmax]);
      y0 = (t) => sol(t).reduce((s, xi, i) => s + C[i] * xi, 0) + D * u(t);
    }
  } else {
    const m = u.C.length, N = n + m;
    const M = Array.from({ length: N }, () => new Array(N).fill(0));
    for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) M[i][j] = A[i][j]; for (let j = 0; j < m; j++) M[i][n + j] = B[i] * u.C[j]; }
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) M[n + i][n + j] = u.A[i][j];
    const z0 = [...new Array(n).fill(0), ...u.w0];
    y0 = (t) => {
      const z = matVec(MatrixExp(M.map((r) => r.map((x) => x * t))), z0);
      let y = 0;
      for (let i = 0; i < n; i++) y += C[i] * z[i];
      for (let j = 0; j < m; j++) y += D * u.C[j] * z[n + j];
      return y;
    };
  }
  return G.delay ? (t) => (t < G.delay ? 0 : y0(t - G.delay)) : y0;
}

/**
 * InverseLaplaceTransform[num(s)/den(s), s, t] for a proper rational function (its δ part omitted). With simple poles
 * (all at least 10⁻⁶ apart, relative) the closed form Σ Res e^(p t) — Heaviside's expansion, residue num(p)/den'(p) —
 * is used (fast: the ports integrate it thousands of times); otherwise C·e^(A t)·B.
 */
export function InverseLaplaceTransform(num, den) {
  num = polyTrim(num); den = polyTrim(den);
  const { A, B, C, n } = realize(num, den);
  if (n === 0) return () => 0;
  const poles = Roots(den), scale = 1 + Math.max(...poles.map(Abs));
  const simple = poles.every((p, i) => poles.every((q, j) => i === j || Abs(cadd(p, Complex(-Re(q), -Im(q)))) > 1e-6 * scale));
  if (simple && polyDegree(num) < n) {
    const dden = den.slice(1).map((a, i) => a * (i + 1));
    const res = poles.map((p) => cdiv(polyEvalC(num, p), polyEvalC(dden, p)));
    return (t) => { let v = 0; poles.forEach((p, i) => { v += Re(cmul(res[i], cexp(cmul(p, Complex(t, 0))))); }); return v; };
  }
  return (t) => { const E = MatrixExp(A.map((r) => r.map((x) => x * t))); return E.reduce((s, row, i) => s + C[i] * row.reduce((q, e, j) => q + e * B[j], 0), 0); };
}

// ---- frequency domain -------------------------------------------------------------------------------------------------
/** p(iω) = re(ω) + i·im(ω) as two real polynomials in ω. */
function splitIw(p) {
  const re = [], im = [];
  p.forEach((c, k) => { const s = [1, 1, -1, -1][k % 4]; if (k % 2 === 0) { re[k] = s * c; im[k] = 0; } else { im[k] = s * c; re[k] = 0; } });
  return { re: polyTrim(re.map((x) => x ?? 0)), im: polyTrim(im.map((x) => x ?? 0)) };
}
const positiveRealRoots = (p) => Roots(p).filter((r) => Math.abs(Im(r)) <= 1e-7 * Math.max(1, Math.abs(Re(r))) && Re(r) > 0).map(Re).sort((a, b) => a - b);

/** The phase of G(iω) unwrapped: continuous in ω > 0 (radians). */
export function unwrappedPhase(G, w) {
  const lead = (p) => polyTrim(p).at(-1);
  let ph = lead(G.num) / lead(G.den) < 0 ? -Math.PI : 0;
  const iw = Complex(0, w);
  for (const z of Roots(G.num)) ph += Arg(cadd(iw, Complex(-Re(z), -Im(z))));
  for (const p of Roots(G.den)) ph -= Arg(cadd(iw, Complex(-Re(p), -Im(p))));
  return ph - G.delay * w;
}
export function BodeData(G, w) {
  return { magnitudeDB: 20 * Math.log10(Abs(FrequencyResponse(G, w))), phaseDegrees: (unwrappedPhase(G, w) * 180) / Math.PI };
}
/** Phase margins: at each gain crossover |G(iω)| = 1, { frequency: ω, margin: π + phase(ω) } (radians). */
export function PhaseMargins(G) {
  if (G.delay) throw new Error('PhaseMargins: models with dead time are not supported');
  const N = splitIw(G.num), D = splitIw(G.den);
  const P = polyAdd(polyAdd(polyMul(N.re, N.re), polyMul(N.im, N.im)), polyScale(polyAdd(polyMul(D.re, D.re), polyMul(D.im, D.im)), -1));
  if (polyDegree(P) < 1) return [];
  return positiveRealRoots(P).map((w) => ({ frequency: w, margin: Math.PI + unwrappedPhase(G, w) }));
}
/** Gain margins: at each phase crossover (phase an odd multiple of π), { frequency: ω, margin: 1/|G(iω)| }. */
export function GainMargins(G) {
  if (G.delay) throw new Error('GainMargins: models with dead time are not supported');
  const N = splitIw(G.num), D = splitIw(G.den);
  const P = polyAdd(polyMul(N.im, D.re), polyScale(polyMul(N.re, D.im), -1)); // Im(N conj D)
  if (polyDegree(P) < 1) return [];
  return positiveRealRoots(P).filter((w) => Re(FrequencyResponse(G, w)) < 0).map((w) => ({ frequency: w, margin: 1 / Abs(FrequencyResponse(G, w)) }));
}
