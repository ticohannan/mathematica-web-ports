// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/ode.js — NDSolve for initial-value problems of ordinary differential equations (v0.1.37).
//
//   const sol = NDSolve((t, y) => [y[1], -y[0]], [1, 0], [0, 10]);      y'' = −y, y(0) = 1, y'(0) = 0
//   sol(t)          the state vector at t (an InterpolatingFunction-like object: the whole solution, dense)
//   sol.d(t)        its derivative at t (from the interpolant, as Mathematica's y'[t] of an InterpolatingFunction)
//   sol.component(i), sol.derivative(i)   t ↦ y_i(t), t ↦ y_i'(t)
//   sol.domain      [t0, t1]; sol.steps the number of accepted steps
//
// Write a system of order k as k first-order equations (Mathematica does the same internally). The right-hand side
// f(t, y) returns an array; it may contain Max, Which, Piecewise and other non-smooth parts. Where the right-hand side
// jumps at a known time (Piecewise[{{a, t < 120}, {b, t >= 120}}]) pass breakpoints: [120] — the integration then
// stops and restarts there, as Mathematica's NDSolve does at a discontinuity it detects, so no step straddles the jump.
//
// Method: the explicit Runge–Kutta pair of J. R. Dormand and P. J. Prince, "A family of embedded Runge–Kutta formulae",
// J. Comput. Appl. Math. 6 (1980) 19–26 — the method of E. Hairer's DOPRI5 code and of MATLAB's ode45 and SciPy's RK45 —
// with Hairer's step-size control and his order-4 continuous extension (the dense output coefficients d_i of DOPRI5,
// E. Hairer, S. P. Nørsett and G. Wanner, Solving Ordinary Differential Equations I, 2nd ed., Springer 1993, §II.6).
// Tolerances: PrecisionGoal 10 and AccuracyGoal 12 digits by default, tighter than Mathematica's default (about 8), so
// the solution agrees with Mathematica's within its own accuracy. Options: PrecisionGoal, AccuracyGoal, MaxSteps
// (default 100000; Mathematica's NDSolve::mxst stops at 10000 steps per unit of the default — the ports never get near).

const C2 = 1 / 5, C3 = 3 / 10, C4 = 4 / 5, C5 = 8 / 9;
const A21 = 1 / 5;
const A31 = 3 / 40, A32 = 9 / 40;
const A41 = 44 / 45, A42 = -56 / 15, A43 = 32 / 9;
const A51 = 19372 / 6561, A52 = -25360 / 2187, A53 = 64448 / 6561, A54 = -212 / 729;
const A61 = 9017 / 3168, A62 = -355 / 33, A63 = 46732 / 5247, A64 = 49 / 176, A65 = -5103 / 18656;
const A71 = 35 / 384, A73 = 500 / 1113, A74 = 125 / 192, A75 = -2187 / 6784, A76 = 11 / 84;
const E1 = 71 / 57600, E3 = -71 / 16695, E4 = 71 / 1920, E5 = -17253 / 339200, E6 = 22 / 525, E7 = -1 / 40;
const D1 = -12715105075 / 11282082432, D3 = 87487479700 / 32700410799, D4 = -10690763975 / 1880347072,
  D5 = 701980252875 / 199316789632, D6 = -1453857185 / 822651844, D7 = 69997945 / 29380423;

/** The largest double below x (x > 0 finite): stages at a segment's end see the left-hand limit of a jump there. */
const below = (x) => {
  const b = new Float64Array([x]), u = new BigInt64Array(b.buffer);
  u[0] += x > 0 ? -1n : 1n;
  return x === 0 ? -Number.MIN_VALUE : b[0];
};
const comb = (y, h, terms) => y.map((yi, i) => { let s = 0; for (const [a, k] of terms) s += a * k[i]; return yi + h * s; });

/** Integrate y' = f(t, y) from t0 to t1 (t1 > t0) and return the dense solution. */
export function NDSolve(f, y0, [t0, t1], opts = {}) {
  const rtol = 10 ** -(opts.PrecisionGoal ?? 10), atol = 10 ** -(opts.AccuracyGoal ?? 12), maxSteps = opts.MaxSteps ?? 100000;
  const bps = [...new Set((opts.breakpoints ?? []).filter((b) => b > t0 && b < t1))].sort((a, b) => a - b);
  const edges = [t0, ...bps, t1];
  const steps = []; // { t, h, r1…r5 }
  let y = y0.slice(), n = y.length;
  const norm = (v, ya, yb) => Math.sqrt(v.reduce((s, vi, i) => s + (vi / (atol + rtol * Math.max(Math.abs(ya[i]), Math.abs(yb ? yb[i] : ya[i])))) ** 2, 0) / n);
  for (let seg = 0; seg + 1 < edges.length; seg++) {
    let t = edges[seg];
    const tEnd = edges[seg + 1], span = tEnd - t;
    const tl = tEnd < t1 ? below(tEnd) : tEnd; // inside a segment ending at a breakpoint: never evaluate at the jump
    const F = (tt, yy) => f(Math.min(tt, tl), yy);
    let k1 = F(t, y);
    // initial step (Hairer's hinit)
    const d0 = norm(y, y), d1 = norm(k1, y);
    let h0 = d0 < 1e-5 || d1 < 1e-5 ? 1e-6 * span : (0.01 * d0) / d1;
    h0 = Math.min(h0, span);
    const yE = comb(y, h0, [[1, k1]]), fE = F(t + h0, yE);
    const d2 = norm(fE.map((v, i) => v - k1[i]), y) / h0, dm = Math.max(d1, d2);
    const h1 = dm <= 1e-15 ? Math.max(1e-6 * span, h0 * 1e-3) : (0.01 / dm) ** (1 / 5);
    let h = Math.min(100 * h0, h1, span);
    let facOld = 1e-4;
    while (t < tEnd) {
      if (steps.length > maxSteps) throw new Error('NDSolve: maximum number of steps reached');
      if (t + 1.01 * h >= tEnd) h = tEnd - t;
      const k2 = F(t + C2 * h, comb(y, h, [[A21, k1]]));
      const k3 = F(t + C3 * h, comb(y, h, [[A31, k1], [A32, k2]]));
      const k4 = F(t + C4 * h, comb(y, h, [[A41, k1], [A42, k2], [A43, k3]]));
      const k5 = F(t + C5 * h, comb(y, h, [[A51, k1], [A52, k2], [A53, k3], [A54, k4]]));
      const k6 = F(t + h, comb(y, h, [[A61, k1], [A62, k2], [A63, k3], [A64, k4], [A65, k5]]));
      const y1 = comb(y, h, [[A71, k1], [A73, k3], [A74, k4], [A75, k5], [A76, k6]]);
      const k7 = F(t + h, y1);
      const errv = y.map((_, i) => h * (E1 * k1[i] + E3 * k3[i] + E4 * k4[i] + E5 * k5[i] + E6 * k6[i] + E7 * k7[i]));
      const err = norm(errv, y, y1);
      // Hairer's step control with Lund stabilisation (beta = 0.04)
      const fac11 = err ** (0.2 - 0.04 * 0.75);
      let fac = fac11 / facOld ** 0.04;
      fac = Math.max(1 / 10, Math.min(1 / 0.2, fac / 0.9));
      if (err <= 1 || h <= 1e-14 * Math.max(1, Math.abs(t))) {
        facOld = Math.max(err, 1e-4);
        const ydiff = y1.map((v, i) => v - y[i]);
        const bspl = ydiff.map((v, i) => h * k1[i] - v);
        steps.push({
          t, h, r1: y, r2: ydiff, r3: bspl,
          r4: ydiff.map((v, i) => v - h * k7[i] - bspl[i]),
          r5: y.map((_, i) => h * (D1 * k1[i] + D3 * k3[i] + D4 * k4[i] + D5 * k5[i] + D6 * k6[i] + D7 * k7[i])),
        });
        t = steps.at(-1).h === tEnd - t ? tEnd : t + h;
        y = y1; k1 = k7;
        h = h / fac;
      } else {
        h = h / Math.min(1 / 0.2, fac11 / 0.9);
      }
      if (!Number.isFinite(h) || h <= 0) throw new Error('NDSolve: step size became zero');
    }
  }
  const find = (tq) => {
    let lo = 0, hi = steps.length - 1;
    if (tq <= steps[0].t) return steps[0];
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (steps[mid].t <= tq) lo = mid; else hi = mid - 1; }
    return steps[lo];
  };
  const value = (tq) => {
    const s = find(tq), th = (tq - s.t) / s.h, th1 = 1 - th;
    return s.r1.map((r1, i) => r1 + th * (s.r2[i] + th1 * (s.r3[i] + th * (s.r4[i] + th1 * s.r5[i]))));
  };
  const deriv = (tq) => {
    const s = find(tq), th = (tq - s.t) / s.h, th1 = 1 - th;
    return s.r1.map((_, i) => {
      const g = s.r4[i] + th1 * s.r5[i], gd = -s.r5[i];
      const hh = s.r3[i] + th * g, hd = g + th * gd;
      const k = s.r2[i] + th1 * hh, kd = -hh + th1 * hd;
      return (k + th * kd) / s.h;
    });
  };
  const sol = (tq) => value(tq);
  sol.d = deriv;
  sol.component = (i) => (tq) => value(tq)[i];
  sol.derivative = (i) => (tq) => deriv(tq)[i];
  sol.domain = [t0, t1];
  sol.steps = steps.length;
  return sol;
}
