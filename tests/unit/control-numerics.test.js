// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/control-numerics.test.js — the v0.1.37 shared modules (complex, poly, matrix, ode, numeric, number-form,
// control, the log axes of plot.js) against closed forms and hand-derived values.
import { describe, it, expect } from 'vitest';
import * as Cx from '../../shared/complex.js';
import * as P from '../../shared/poly.js';
import * as M from '../../shared/matrix.js';
import { NDSolve } from '../../shared/ode.js';
import * as N from '../../shared/numeric.js';
import { NumberForm, numberFormString as NF, PaddedForm, AccountingForm } from '../../shared/number-form.js';
import * as C from '../../shared/control.js';
import { logTicks, LogLinearPlot } from '../../shared/plot.js';
import { textOf } from '../../shared/graphics.js';

const sortRoots = (rs) => rs.map((z) => [Cx.Re(z), Cx.Im(z)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

describe('complex.js', () => {
  it('arithmetic, Abs, Arg (Arg[0] = 0), the principal Sqrt and integer powers', () => {
    const z = Cx.Complex(3, 4);
    expect(Cx.Abs(z)).toBe(5);
    expect(Cx.cmul(z, Cx.Conjugate(z))).toEqual({ re: 25, im: 0 });
    const q = Cx.cdiv(Cx.Complex(1, 2), Cx.Complex(3, -4));
    expect(q.re).toBeCloseTo(-0.2, 15); expect(q.im).toBeCloseTo(0.4, 15);
    expect(Cx.Arg(0)).toBe(0); expect(Cx.Arg(-1)).toBe(Math.PI);
    expect(Cx.csqrt(-4)).toEqual({ re: 0, im: 2 });
    const r = Cx.csqrt(Cx.Complex(-3, -4)); expect(r.re).toBeCloseTo(1, 14); expect(r.im).toBeCloseTo(-2, 14);
    const p = Cx.cpow(Cx.I, 7); expect(p.re).toBeCloseTo(0, 15); expect(p.im).toBeCloseTo(-1, 15);
    expect(Cx.ctext(Cx.Complex(-0.5, -2), (x) => x.toFixed(1))).toBe('-0.5 - 2.0 i');
  });
});

describe('poly.js', () => {
  it('arithmetic in CoefficientList order, evaluation and derivative', () => {
    expect(P.polyMul([1, 1], [-1, 1])).toEqual([-1, 0, 1]); // (1 + s)(−1 + s) = s² − 1
    expect(P.polyAdd([1, 2, 3], [0, 0, -3])).toEqual([1, 2]);
    expect(P.polyEval([1, -3, 2], 2)).toBe(3);
    expect(P.polyDeriv([5, 1, 3, 4])).toEqual([1, 6, 12]);
    const v = P.polyEvalC([1, 0, 1], Cx.I); expect(v.re).toBe(0); expect(v.im).toBe(0);
    expect(P.polyFromRoots([Cx.Complex(-1, 2), Cx.Complex(-1, -2), 3])).toEqual([-15, -1, -1, 1]); // (s² + 2s + 5)(s − 3) = s³ − s² − s − 15
  });
  it('Roots: companion-matrix eigenvalues (real, complex pairs, repeated and zero roots)', () => {
    expect(sortRoots(P.Roots([-6, 11, -6, 1])).map((r) => r[0].toFixed(10))).toEqual(['1.0000000000', '2.0000000000', '3.0000000000']);
    const c = sortRoots(P.Roots([5, 2, 1])); // s² + 2s + 5: −1 ± 2i
    expect(c[0][0]).toBeCloseTo(-1, 12); expect(c[0][1]).toBeCloseTo(-2, 12); expect(c[1][1]).toBeCloseTo(2, 12);
    expect(sortRoots(P.Roots([0, 0, 2, 2]))).toEqual([[-1, 0], [0, 0], [0, 0]]); // 2s² + 2s³
    const d = sortRoots(P.Roots([1, 2, 1])); // (s + 1)², a double root (accurate to √ε)
    expect(d[0][0]).toBeCloseTo(-1, 6); expect(d[1][0]).toBeCloseTo(-1, 6);
  });
});

describe('matrix.js', () => {
  it('MatrixExp: rotation, nilpotent, diagonal and a large-norm case (scaling and squaring)', () => {
    const E = M.MatrixExp([[0, 30], [-30, 0]]);
    expect(E[0][0]).toBeCloseTo(Math.cos(30), 12); expect(E[0][1]).toBeCloseTo(Math.sin(30), 12);
    expect(M.MatrixExp([[0, 1], [0, 0]])).toEqual([[1, 1], [0, 1]]);
    const D = M.MatrixExp([[-2, 0], [0, 1]]);
    expect(D[0][0]).toBeCloseTo(Math.exp(-2), 15); expect(D[1][1]).toBeCloseTo(Math.E, 14);
    // Jordan block: e^{λt}[[1, t], [0, 1]] for λ = −1, t = 50 (norm far above θ13)
    const J = M.MatrixExp([[-50, 50], [0, -50]]);
    expect(J[0][1] / Math.exp(-50)).toBeCloseTo(50, 8);
  });
  it('LinearSolve and Eigenvalues', () => {
    expect(M.LinearSolve([[2, 1], [1, 3]], [3, 5]).map((x) => +x.toFixed(12))).toEqual([0.8, 1.4]);
    expect(sortRoots(M.Eigenvalues([[0, 1], [-2, -3]])).map((r) => +r[0].toFixed(12))).toEqual([-2, -1]);
  });
});

describe('ode.js NDSolve', () => {
  it('a harmonic oscillator: value and derivative from the dense output within 10⁻⁸ over 50 periods of 2π', () => {
    const s = NDSolve((t, y) => [y[1], -y[0]], [1, 0], [0, 50]);
    let err = 0;
    for (let t = 0; t <= 50; t += 0.0371) err = Math.max(err, Math.abs(s(t)[0] - Math.cos(t)), Math.abs(s.d(t)[0] + Math.sin(t)));
    expect(err).toBeLessThan(1e-8);
    expect(s.component(1)(Math.PI / 2)).toBeCloseTo(-1, 9);
  });
  it('breakpoints: a right-hand side that jumps at t = 1 is integrated exactly on both sides', () => {
    const s = NDSolve((t, y) => [t < 1 ? 1 : -2], [0], [0, 3], { breakpoints: [1] });
    expect(s(0.5)[0]).toBeCloseTo(0.5, 13); expect(s(1)[0]).toBeCloseTo(1, 13); expect(s(2.5)[0]).toBeCloseTo(-2, 12);
  });
  it('a nonlinear right-hand side (logistic equation) against its closed form', () => {
    const s = NDSolve((t, y) => [y[0] * (1 - y[0])], [0.1], [0, 10]);
    const exact = (t) => 1 / (1 + 9 * Math.exp(-t));
    for (const t of [0.3, 2, 5.5, 10]) expect(s(t)[0]).toBeCloseTo(exact(t), 9);
  });
});

describe('numeric.js', () => {
  it('FindRoot: Newton from one start, the secant method kept inside a bracket from two', () => {
    expect(N.FindRoot((x) => Math.cos(x) - x, 1)).toBeCloseTo(0.7390851332151607, 14);
    expect(N.FindRoot((x) => x * x - 2, [0, 3])).toBeCloseTo(Math.SQRT2, 14);
    expect(N.FindRoot((x) => Math.sin(x), [3, 3.5])).toBeCloseTo(Math.PI, 14);
  });
  it('FindMaximum / FindMinimum: the local extremum climbed to from the start, inside bounds', () => {
    const [v, x] = N.FindMaximum(Math.sin, 0.05);
    expect(v).toBeCloseTo(1, 12); expect(x).toBeCloseTo(Math.PI / 2, 7);
    expect(N.FindMaximum(Math.sin, 0.05, { bounds: [0, 1] })).toEqual([Math.sin(1), 1]);
    const [, x2] = N.FindMaximum(Math.sin, 7); expect(x2).toBeCloseTo(Math.PI / 2 + 2 * Math.PI, 7);
    expect(N.FindMinimum((x) => (x - 2) ** 2, [0, 0.5])[1]).toBeCloseTo(2, 7);
  });
  it('NIntegrate: smooth, kinked (|sin|) and long ranges', () => {
    expect(N.NIntegrate((x) => Math.exp(-x), [0, 50])).toBeCloseTo(1 - Math.exp(-50), 12);
    expect(N.NIntegrate((x) => Math.abs(Math.sin(x)), [0, 100])).toBeCloseTo(62 + 1 - Math.cos(100 - 31 * Math.PI), 7);
    expect(N.NIntegrate((x) => x * x, [0, 3], { breakpoints: [1, 2] })).toBeCloseTo(9, 13);
  });
  it('Fourier: Mathematica\'s default {0, 1} and {1, −1}, power-of-two and other lengths agree with the direct sum', () => {
    const F = N.Fourier([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(F[0].re).toBeCloseTo(36 / Math.sqrt(8), 13);
    expect(F[1].re).toBeCloseTo(-1.4142135623730951, 13); expect(F[1].im).toBeCloseTo(-3.414213562373095, 13);
    const x = Array.from({ length: 16 }, (_, i) => Math.sin(i) + 0.3 * i);
    const fast = N.Fourier(x, { FourierParameters: [1, -1] });
    const slow = N.Fourier([...x, 0].slice(0, 16).map((v) => Cx.Complex(v, 0)), { FourierParameters: [1, -1] });
    fast.forEach((z, k) => {
      let re = 0, im = 0;
      x.forEach((v, r) => { re += v * Math.cos((-2 * Math.PI * r * k) / 16); im += v * Math.sin((-2 * Math.PI * r * k) / 16); });
      expect(z.re).toBeCloseTo(re, 10); expect(z.im).toBeCloseTo(im, 10); expect(slow[k].re).toBeCloseTo(re, 10);
    });
    const G = N.Fourier([1, 2, 3, 4, 5, 6]);
    expect(G[0].re).toBeCloseTo(21 / Math.sqrt(6), 13); expect(G[1].im).toBeCloseTo(-2.1213203435596424, 12);
  });
  it('TriangleWave, SquareWave, SawtoothWave (period 1, Mathematica\'s phase)', () => {
    expect([0, 0.125, 0.25, 0.5, 0.75, 1, -0.25].map(N.TriangleWave)).toEqual([0, 0.5, 1, 0, -1, 0, -1]);
    expect([0, 0.49, 0.5, 1.2].map(N.SquareWave)).toEqual([1, 1, -1, 1]);
    expect(N.SawtoothWave(2.25)).toBe(0.25);
  });
});

describe('number-form.js', () => {
  it('NumberForm[x, n]: n significant digits, trailing zeros dropped, an integral real keeps its point', () => {
    expect([[20.4004, 4], [6.0669, 4], [1.98376, 4], [2, 4], [0.0123456, 3], [1.373, 2]].map(([x, n]) => NumberForm(x, n)))
      .toEqual(['20.4', '6.067', '1.984', '2.', '0.0123', '1.4']);
    expect(NumberForm(7, [3, 1], { exact: true })).toBe('7');
  });
  it('NumberForm[x, {n, f}]: f decimals within n significant digits; exponents from 10^6', () => {
    expect([[6.32, [4, 1]], [3557.9991, [4, 3]], [123.456, [4, 2]], [24.807852, [4, 3]], [5.00816, [4, 3]]].map(([x, s]) => NumberForm(x, s)))
      .toEqual(['6.3', '3558.000', '123.50', '24.810', '5.008']);
    expect(NF(8.86171e6, [6, 3])).toBe('8.862×10^6');
    expect(textOf(NumberForm(8.86171e6, [6, 3]))).toBe('8.862×106');
  });
  it('padding and signs: PaddedForm, AccountingForm, NumberPadding, NumberPoint', () => {
    expect(NumberForm(10, [5, 3], { NumberPadding: ['0', '0'], NumberSigns: ['', ''] })).toBe('10.000');
    expect(NumberForm(3.73, [4, 3], { NumberPadding: ['0', '0'] })).toBe('3.730');
    expect(NumberForm(20, [2, 0], { NumberPadding: ['0', '0'], NumberPoint: '' })).toBe('20');
    expect(PaddedForm(3.5, [4, 1])).toBe('  3.5');
    expect(AccountingForm(-2.5, [3, 1])).toBe('(2.5)');
  });
});

describe('control.js', () => {
  // the snapshot values of "Simulation of Feedback Control System with Controller and Second-Order Plant" (N. M. Abbasi)
  const plant = C.TransferFunctionModel([1], [1, 1.54, 1]);
  const pid = C.TransferFunctionModel([3.73, 10, 0.697], [0, 1]);
  const L = C.SystemsModelSeriesConnect(pid, plant);
  it('feedback connection and poles as in the snapshot: (0.697 s² + 10 s + 3.73)/(s³ + 2.237 s² + 11 s + 3.73)', () => {
    const T = C.SystemsModelFeedbackConnect(L);
    expect(T.num).toEqual([3.73, 10, 0.697]);
    expect(T.den.map((x) => +x.toFixed(10))).toEqual([3.73, 11, 2.237, 1]);
    const p = sortRoots(C.TransferFunctionPoles(T));
    expect(p[0][0]).toBeCloseTo(-0.937822, 6); expect(Math.abs(p[0][1])).toBeCloseTo(3.0729, 4); expect(p[2][0]).toBeCloseTo(-0.361356, 6);
  });
  it('PhaseMargins and GainMargins: crossover 3.13293 rad/s, margin 34.3638° (snapshot), no phase crossover', () => {
    const [pm] = C.PhaseMargins(L);
    expect(pm.frequency).toBeCloseTo(3.13293, 5); expect((pm.margin * 180) / Math.PI).toBeCloseTo(34.3638, 4);
    expect(C.GainMargins(L)).toEqual([]);
    // a third-order loop with a phase crossover: K/(s+1)³ crosses −180° at ω = √3 with |G| = K/8
    const G = C.TransferFunctionModel([4], [1, 3, 3, 1]);
    const [gm] = C.GainMargins(G);
    expect(gm.frequency).toBeCloseTo(Math.sqrt(3), 10); expect(gm.margin).toBeCloseTo(2, 10);
    expect(C.BodeData(G, Math.sqrt(3)).phaseDegrees).toBeCloseTo(-180, 9);
  });
  it('OutputResponse: step with dead time, ramp, sine (first order) against the closed forms', () => {
    const y = C.OutputResponse(C.TransferFunctionModel([10], [1, 7], { delay: 2 }), C.Signal.step(1));
    expect(y(1.9)).toBe(0);
    expect(y(9)).toBeCloseTo(10 * (1 - Math.exp(-1)), 12);
    const T = 5, a = 3, w = 1, Phi = -Math.atan(w * T);
    const ys = C.OutputResponse(C.TransferFunctionModel([1], [1, T]), C.Signal.sin(w, a));
    const fo = (t) => (a * w * T) / (w * w * T * T + 1) * Math.exp(-t / T) + (a / Math.sqrt(w * w * T * T + 1)) * Math.sin(w * t + Phi);
    for (const t of [0.5, 3.7, 9.9]) expect(ys(t)).toBeCloseTo(fo(t), 12);
    const yr = C.OutputResponse(C.TransferFunctionModel([1], [1, T]), C.Signal.ramp(a));
    expect(yr(4)).toBeCloseTo(a * T * (Math.exp(-4 / T) - 1) + a * 4, 12);
  });
  it('OutputResponse: a second-order step (ζ = 0.2), a repeated pole (ζ = 1) and a function input', () => {
    const z = 0.2, wn = 1 / 7, K = 10;
    const G = C.TransferFunctionModel([K], [1, 2 * z * 7, 49]);
    const wd = wn * Math.sqrt(1 - z * z);
    const exact = (t) => K * (1 - Math.exp(-z * wn * t) * (Math.cos(wd * t) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * t)));
    for (const t of [3, 25, 80]) expect(C.OutputResponse(G, C.Signal.step())(t)).toBeCloseTo(exact(t), 11);
    const crit = C.OutputResponse(C.TransferFunctionModel([1], [1, 2, 1]), C.Signal.step());
    expect(crit(2)).toBeCloseTo(1 - Math.exp(-2) * 3, 13);
    const viaOde = C.OutputResponse(C.TransferFunctionModel([1], [1, 2, 1]), (t) => 1, { tmax: 5 });
    expect(viaOde(2)).toBeCloseTo(1 - Math.exp(-2) * 3, 9);
  });
  it('InverseLaplaceTransform of a rational function: 1/(s(s+1)) → 1 − e^(−t)', () => {
    const f = C.InverseLaplaceTransform([1], [0, 1, 1]);
    expect(f(0.7)).toBeCloseTo(1 - Math.exp(-0.7), 14);
  });
});

describe('plot.js log axes', () => {
  const labels = (lo, hi) => logTicks(lo, hi).ticks.major.map(([, l]) => textOf(l));
  it('labels as Mathematica\'s log axes in the snapshots of Link Budget for Communication Systems and the Bode plot', () => {
    expect(labels(100, 1e4)).toEqual(['100', '500', '1000', '5000', '104']);
    expect(labels(100, 1500)).toEqual(['100', '200', '500', '1000']);
    expect(labels(1e5, 1.5e7)).toEqual(['1×105', '5×105', '1×106', '5×106', '1×107']);
    expect(labels(0.001, 300)).toEqual(['0.001', '0.01', '0.1', '1', '10', '100']);
  });
  it('LogLinearPlot plots in Log[x] with the log ticks as FrameTicks', () => {
    const g = LogLinearPlot((x) => Math.log10(x), [100, 1e4], { Frame: true, PlotRange: [[100, 1e4], [1, 5]] });
    expect(g.options.PlotRange[0].map((v) => +v.toFixed(10))).toEqual([Math.log(100), Math.log(1e4)].map((v) => +v.toFixed(10)));
    expect(g.options.FrameTicks[0].gridAll).toBe(true);
  });
});
