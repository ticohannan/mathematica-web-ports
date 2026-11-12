// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/control-plots.js — Mathematica's control-system plots as Graphics data (v0.1.37), built on shared/plot.js and
// shared/control.js. Each returns a Graphics like Plot does (options for the Manipulate layer included).
//
//   RootLocusPlot(G, [k0, k1], opts)   RootLocusPlot[k G, {k, k0, k1}]: the closed-loop poles of k G/(1 + k G), the
//                                      roots of den(s) + k num(s), as k runs from k0 to k1; one curve per branch in
//                                      ColorData[97] order (branches numbered by their starting poles sorted by real,
//                                      then imaginary part), the open-loop poles × and zeros ○ (PoleZeroMarkers ->
//                                      Automatic), opts.ParameterValues: [k, …] closed-loop poles at those gains as
//                                      points in the branch colours. Branches are followed continuously: each step in
//                                      k matches the new roots to the previous ones with the least total movement, and
//                                      k is refined where a root moves more than 1/150 of the picture (near breakaway
//                                      points the roots move as √k).
//   BodePlot(G, [w0, w1], opts)        BodePlot[G, {w0, w1}, PlotLayout -> "List"]: [magnitude in dB, phase in degrees]
//                                      on a log ω axis (shared/plot.js LogLinearPlot), the phase unwrapped;
//                                      opts.StabilityMargins: true draws the margins as Mathematica does (red: on the
//                                      magnitude plot a vertical line at each phase crossover from the curve to 0 dB, on
//                                      the phase plot at each gain crossover from the curve to −180°).
//   NyquistPlot(G, opts)               NyquistPlot[G]: G(iω) for ω from 0 to ∞ (solid) and its mirror for negative ω
//                                      (dashed), arrows showing the direction of increasing ω, and for poles on the
//                                      imaginary axis (an integrator) the closing arc at infinity drawn as a dashed
//                                      circle segment of radius opts.InfinityRadius (default: 1.5 × the largest finite
//                                      |G| shown), as Mathematica draws it.

import { Graphics, Line, Point, Inset, Circle, Arrow, Arrowheads, Black, RGBColor, AbsoluteThickness, AbsolutePointSize, AbsoluteDashing, Annotation } from './graphics.js';
import { ListLinePlot, LogLinearPlot, COLOR_DATA_97 } from './plot.js';
import { Roots, polyAdd, polyScale } from './poly.js';
import { TransferFunctionPoles, TransferFunctionZeros, FrequencyResponse, BodeData, GainMargins, PhaseMargins } from './control.js';
import { Re, Im, Abs } from './complex.js';

const pt = (z) => [Re(z), Im(z)];
const order = (rs) => rs.map(pt).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
function permutations(n) {
  const out = [];
  const rec = (pre, rest) => { if (!rest.length) { out.push(pre); return; } rest.forEach((x, i) => rec([...pre, x], [...rest.slice(0, i), ...rest.slice(i + 1)])); };
  rec([], [...Array(n).keys()]);
  return out;
}
const PERMS = new Map();
/** Order `next` so that next[i] continues prev[i] (least total distance; brute force up to 6 roots, greedy beyond). */
function match(prev, next) {
  const n = prev.length;
  if (n <= 6) {
    if (!PERMS.has(n)) PERMS.set(n, permutations(n));
    let best = null, bestD = Infinity;
    for (const p of PERMS.get(n)) {
      let d = 0;
      for (let i = 0; i < n && d < bestD; i++) d += Math.hypot(prev[i][0] - next[p[i]][0], prev[i][1] - next[p[i]][1]);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best.map((j) => next[j]);
  }
  const left = [...next];
  return prev.map((q) => { let bi = 0; left.forEach((r, i) => { if (Math.hypot(q[0] - r[0], q[1] - r[1]) < Math.hypot(q[0] - left[bi][0], q[1] - left[bi][1])) bi = i; }); return left.splice(bi, 1)[0]; });
}

/** The branches of the root locus: [{ k, roots: [[x, y], …] }, …] in increasing k, roots in branch order. Pure. */
export function rootLocusData(G, [k0, k1], { samples = 120, depth = 10 } = {}) {
  const rootsAt = (k) => Roots(polyAdd(G.den, polyScale(G.num, k))).map(pt);
  const first = order(rootsAt(k0).map(([x, y]) => ({ re: x, im: y })));
  const pts = [{ k: k0, roots: first }];
  // a scale for the refinement: the spread of the roots at both ends
  const all = [...first, ...rootsAt(k1)];
  const span = Math.max(1e-9, Math.max(...all.map((r) => r[0])) - Math.min(...all.map((r) => r[0])), Math.max(...all.map((r) => r[1])) - Math.min(...all.map((r) => r[1])));
  const tol = span / 150;
  const step = (a, b, ra, d) => { // from a (roots ra) to b: returns the points after a
    const rb = match(ra, rootsAt(b));
    const move = Math.max(...ra.map((r, i) => Math.hypot(r[0] - rb[i][0], r[1] - rb[i][1])));
    if (move > tol && d < depth) {
      const m = (a + b) / 2, left = step(a, m, ra, d + 1), rm = left.at(-1).roots;
      return [...left, ...step(m, b, rm, d + 1)];
    }
    return [{ k: b, roots: rb }];
  };
  for (let i = 1; i <= samples; i++) {
    const a = k0 + ((k1 - k0) * (i - 1)) / samples, b = k0 + ((k1 - k0) * i) / samples;
    pts.push(...step(a, b, pts.at(-1).roots, 0));
  }
  return pts;
}

const marker = (kind) => Graphics(kind === 'pole'
  ? [Black, AbsoluteThickness(1.4), Line([[-1, -1], [1, 1]]), Line([[-1, 1], [1, -1]])]
  : [Black, AbsoluteThickness(1.4), Circle([0, 0], 0.9)], { PlotRange: [[-1.2, 1.2], [-1.2, 1.2]], ImageSize: 10 });

export function RootLocusPlot(G, [k0, k1], opts = {}) {
  const data = rootLocusData(G, [k0, k1]);
  const n = data[0].roots.length;
  const branches = Array.from({ length: n }, (_, i) => data.map((d) => d.roots[i]));
  const poles = order(TransferFunctionPoles(G)), zeros = order(TransferFunctionZeros(G));
  const markers = [...poles.map((p) => Inset(marker('pole'), p)), ...zeros.map((z) => Inset(marker('zero'), z))];
  const values = (opts.ParameterValues ?? []).flatMap((k) => {
    const d = rootLocusData(G, [k0, Math.max(k0, Math.min(k1, k))], { samples: 40, depth: 6 }).at(-1);
    return d.roots.map((r, i) => [RGBColor(...COLOR_DATA_97[i % 10]), AbsolutePointSize(7), Point(r)]);
  });
  const xs = [...branches.flat(), ...poles, ...zeros];
  const range = [[Math.min(...xs.map((p) => p[0])), Math.max(...xs.map((p) => p[0]))], [Math.min(...xs.map((p) => p[1])), Math.max(...xs.map((p) => p[1]))]];
  const { ParameterValues, ...rest } = opts;
  const g = ListLinePlot(branches, {
    PlotRange: range, PlotRangePadding: [0.02, 0.02], Axes: true, ...rest,
    Epilog: [...[].concat(opts.Epilog ?? []), Annotation(markers, 'pole-zero-markers'), Annotation(values, 'parameter-values')],
  });
  return { head: 'Graphics', list: g.list, options: g.options, branches, poles, zeros };
}

const RED = RGBColor(1, 0, 0);
export function BodePlot(G, [w0, w1], opts = {}) {
  const common = { Frame: true, GridLines: 'Automatic', ...opts.common };
  const mag = LogLinearPlot((w) => BodeData(G, w).magnitudeDB, [w0, w1], { ...common, ...opts.magnitude });
  const ph = LogLinearPlot((w) => BodeData(G, w).phaseDegrees, [w0, w1], { ...common, ...opts.phase });
  if (opts.StabilityMargins) {
    const ln = Math.log;
    const gm = GainMargins(G).filter((m) => m.frequency >= w0 && m.frequency <= w1);
    const pm = PhaseMargins(G).filter((m) => m.frequency >= w0 && m.frequency <= w1);
    mag.list.push(Annotation([RED, AbsoluteThickness(1.2), ...gm.map((m) => Line([[ln(m.frequency), BodeData(G, m.frequency).magnitudeDB], [ln(m.frequency), 0]]))], 'gain-margins'));
    ph.list.push(Annotation([RED, AbsoluteThickness(1.2), ...pm.map((m) => Line([[ln(m.frequency), BodeData(G, m.frequency).phaseDegrees], [ln(m.frequency), -180]]))], 'phase-margins'));
  }
  return [mag, ph];
}

export function NyquistPlot(G, opts = {}) {
  // ω from 10^-4 … 10^4 times the corner frequencies, log-spaced (more points near the corners)
  const corners = [...TransferFunctionPoles(G), ...TransferFunctionZeros(G)].map(Abs).filter((x) => x > 0);
  const lo = (corners.length ? Math.min(...corners) : 1) * 1e-3, hi = (corners.length ? Math.max(...corners) : 1) * 1e3;
  const N = opts.PlotPoints ?? 1500, ws = Array.from({ length: N }, (_, i) => lo * (hi / lo) ** (i / (N - 1)));
  let pos = ws.map((w) => pt(FrequencyResponse(G, w)));
  const finite = pos.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const R = opts.InfinityRadius ?? 1.5 * Math.max(1, ...finite.map(([x, y]) => Math.hypot(x, y)).filter((r) => r < 1e3));
  if (!opts.PlotRange) pos = pos.filter(([x, y]) => Math.hypot(x, y) <= R * 1.0001);
  const neg = pos.map(([x, y]) => [x, -y]);
  const color = RGBColor(...COLOR_DATA_97[0]);
  const arrowAt = (curve, frac) => { const i = Math.max(1, Math.min(curve.length - 1, Math.round(frac * (curve.length - 1)))); return Arrow([curve[i - 1], curve[i]]); };
  const prims = [
    [color, AbsoluteThickness(1.6), Annotation(Line(pos), 'nyquist-positive'), Arrowheads(0.04), arrowAt(pos, 0.5)],
    [color, AbsoluteThickness(1.6), AbsoluteDashing([4, 3]), Annotation(Line([...neg].reverse()), 'nyquist-negative')],
  ];
  // an integrator: the closing arc at infinity, dashed
  const nOnAxis = TransferFunctionPoles(G).filter((p) => Abs(p) < 1e-9).length;
  if (nOnAxis > 0 && pos.length) {
    const a0 = Math.atan2(pos[0][1], pos[0][0]);
    const arc = Array.from({ length: 61 }, (_, i) => { const a = a0 - (2 * a0 * i) / 60; return [R * Math.cos(a), R * Math.sin(a)]; });
    prims.push([Black, AbsoluteThickness(1), AbsoluteDashing([5, 4]), Annotation(Line(arc), 'nyquist-infinity')]);
  }
  return Graphics(prims, { PlotRange: opts.PlotRange ?? [[-R * 1.05, R * 1.05], [-R * 1.05, R * 1.05]], PlotRangeClipping: true, Axes: true, AspectRatio: 1, UpdateFrame: true, PlotRangePadding: 0, ImageSize: opts.ImageSize ?? 300, ...opts.options });
}
