// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/plot.js — Mathematica's 2D plot functions as Graphics data (shared/graphics.js), for the Manipulate layer
// (shared/manipulate.js draws them; the frame, ticks and legend are redrawn when they change). v0.1.23.
//
//   Plot((x) => Sin(x), [0, 2 * Pi])                              Plot[Sin[x], {x, 0, 2 Pi}]
//   Plot((b) => [Meanx(b), Meany(b)], [0, 2 * Pi], {              Plot[{Meanx[b], Meany[b]}, {b, 0, 2 Pi},
//     PlotLegends: ['mean x', 'mean y'], PlotRange: [[0, 2 * Pi], [-1, 1]] })    PlotLegends -> {…}, PlotRange -> …]
//   ListPlot([[x1, y1], [x2, y2]], { Filling: 0 })                ListPlot[{{x1, y1}, …}, Filling -> 0]
//   ListLinePlot(data), ParametricPlot((t) => [x(t), y(t)], [t0, t1]), Show(g1, g2, …)
//
// The function f returns a number (one curve) or an array of numbers (one per curve); a value that is not a finite
// number (NaN, Infinity — Mathematica's non-real values) leaves a gap. Sampling: PlotPoints (default 50) equally spaced
// points, then intervals are halved where the curve bends (MaxRecursion, default 6) — like Mathematica's adaptive
// sampling, not identical to it (the drawn curves agree to well under a pixel; extreme values may differ slightly).
//
// Options (Mathematica's names): PlotRange (Automatic | All | {ymin, ymax} | {{xmin, xmax}, {ymin, ymax}}, entries
// may be All/Automatic), PlotRangePadding (automatic ranges get Scaled[0.02], explicit ones none, as in Mathematica),
// PlotStyle (one style for all curves, or a list: one per curve; a style is a directive or an array of directives;
// defaults ColorData[97] and AbsoluteThickness[1.6]), Filling (0 | 'Axis' | 'Bottom' | 'Top' | a number | an object
// {curve: target} with target a number, 'Axis', 'Bottom', 'Top' or [otherCurve]), FillingStyle (default the curve's
// colour at Opacity 0.2), PlotLegends (a list of labels, or Placed(labels, [sx, sy]) inside the plot), Epilog, Prolog,
// AspectRatio (default 1/GoldenRatio; ParametricPlot: Automatic), ImageSize (default 360; 'Small' | 'Medium' |
// 'Large'), Axes, AxesOrigin (default: 0 when inside the range, else the nearer end), Ticks, AxesLabel, Frame (True or
// {bottom, left, top, right}; the axes stay as plain lines inside), FrameTicks, FrameLabel, PlotLabel, ImagePadding
// ({{left, right}, {bottom, top}} px), PlotRangeClipping (default True: curves and Epilog clipped to the plot range),
// Background, LabelStyle (v0.1.26); ListPlot: Joined (true, or a list per data set), PlotMarkers are not supported.
// Not supported by the curve and list plots: Exclusions (jumps are joined unless the function gives a non-number there),
// Mesh, ColorFunction.
//
// v0.1.26 — regions and densities (Mathematica 10+ defaults; the same options as above unless said otherwise):
//   RegionPlot((x, y) => x * x + y * y < 1, [-1, 1], [-1, 1])     RegionPlot[x^2 + y^2 < 1, {x, -1, 1}, {y, -1, 1}]
//   ParametricPlot((u, v) => [u * Cos(v), u * Sin(v)], [0, 1], [0, 2 * Pi])    ParametricPlot[{u Cos[v], u Sin[v]},
//                                                                  {u, 0, 1}, {v, 0, 2 Pi}] (a region: a v range given)
//   DensityPlot((x, y) => Sin(x) * Sin(y), [-3, 3], [-3, 3], { ColorFunctionScaling: false })
//   DensityGradient(v), DENSITY_GRADIENT_STOPS                     Mathematica's default DensityPlot colours
// RegionPlot: Frame, no Axes, AspectRatio 1, PlotRange = the given ranges (padded Scaled[0.02]); a grid of PlotPoints (default 50)
// cells per axis, marching squares, each boundary crossing on a cell edge refined by 10 bisections, then each boundary
// chord halved with its midpoint moved onto the boundary MaxRecursion times (default 1, at most 2; not Mathematica's sampler);
// the face in the PlotStyle colour (default ColorData[97, 1]; a colour or a list of directives) at Opacity 0.3 drawn as one
// seamless shape (FilledPolygons), the boundary (BoundaryStyle, None for none) as joined lines. A region where pred is
// nowhere true draws only the frame. Test ids region-face, region-boundary.
// ParametricPlot regions: f(u, v) → a point or a list of points (several regions, PlotStyle cyclic); a PlotPoints ×
// PlotPoints grid (default 40) of quads, the face drawn seamlessly — the quads of each orientation as one shape, so a
// region that folds over itself is darker where it is doubly covered, as Mathematica's —, the boundary = the images of the
// four edges of the domain; Mesh (default None; n: n lines each way, MeshStyle default the darker face colour); PlotRange
// and AspectRatio as the curve form; Exclusions, PerformanceGoal accepted and ignored. Test ids region-face-i,
// region-boundary-i, region-mesh-i.
// Boundaries (both): opaque, AbsoluteThickness 1 and the region's default colour ColorData[97, i] whatever the PlotStyle
// (as the Mathematica snapshots of ReachableSetForADrone show: Blue faces, boundaries in ColorData[97, 1] and [97, 2]).
// DensityPlot: samples at the centres of a PlotPoints × PlotPoints grid (default 150) drawn as an image over the plot range,
// interpolated by the browser; Frame, no Axes, AspectRatio 1; ColorFunction (default DensityGradient) of the value scaled
// by the z range to 0…1 (ColorFunctionScaling, default true) or of the raw value (false: DensityGradient clips it to
// 0…1); PlotRange {{x0, x1}, {y0, y1}} (default the given ranges), a third entry {z0, z1} or All, or {z0, z1} alone, sets
// the z range (automatic: min…max of the samples); non-numbers are transparent; MaxRecursion, PerformanceGoal ignored.
// Test id density-raster.

import {
  Graphics, RGBColor, Opacity, AbsoluteThickness, AbsolutePointSize, PointSize, Line, Polygon, Point, applyDirective, DEFAULT_STYLE,
  Annotation, EdgeForm, Darker, FilledPolygons, ImageRaster,
} from './graphics.js';

/** ColorData[97] — Mathematica's default plot colours (the first 10, then repeated). */
export const COLOR_DATA_97 = Object.freeze([
  [0.368417, 0.506779, 0.709798], [0.880722, 0.611041, 0.142051], [0.560181, 0.691569, 0.194885],
  [0.922526, 0.385626, 0.209179], [0.528488, 0.470624, 0.701351], [0.772079, 0.431554, 0.102387],
  [0.363898, 0.618501, 0.782349], [1, 0.75, 0], [0.647624, 0.37816, 0.614037], [0.571589, 0.586483, 0],
].map((c) => Object.freeze(c)));
/** ColorData(97, i) (1-based; repeats after 10) or ColorData(97, 'ColorList'). */
export function ColorData(scheme, i) {
  if (scheme !== 97) throw new Error('plot: only ColorData[97] is available');
  if (i === 'ColorList') return COLOR_DATA_97.map((c) => RGBColor(...c));
  return RGBColor(...COLOR_DATA_97[(i - 1) % 10]);
}
/**
 * Placed[labels, {sx, sy}]: a legend inside the plot, centred at scaled coordinates of the plot range. Placed[labels,
 * {{sx, sy}, {ax, ay}}] (v0.1.27, Mathematica's form): the legend's own scaled point {ax, ay} at {sx, sy}.
 */
export const Placed = (labels, position) => Object.freeze({ placed: true, labels, position });

const GOLDEN = 2 / (1 + Math.sqrt(5));
const SIZES = { Tiny: 100, Small: 180, Medium: 360, Large: 576 };
const isAuto = (v) => v == null || v === 'Automatic' || v === 'All' || v?.dir === 'none';
const finite = (y) => typeof y === 'number' && Number.isFinite(y);

// ---- sampling ---------------------------------------------------------------------------------------------------
/** Sample f on [a, b]: returns { xs, ys: [[y per x] per curve] } on one common grid (adaptive refinement). Pure. */
export function sample(f, [a, b], { PlotPoints = 50, MaxRecursion = 6 } = {}) {
  const ev = (x) => { const v = f(x); return Array.isArray(v) ? v : [v]; };
  let xs = Array.from({ length: PlotPoints }, (_, i) => (i === PlotPoints - 1 ? b : a + ((b - a) * i) / (PlotPoints - 1)));
  let vs = xs.map(ev);
  const n = vs[0].length;
  // the y scale against which bends are judged (finite values only)
  const span = (k) => { let lo = Infinity, hi = -Infinity; for (const v of vs) if (finite(v[k])) { lo = Math.min(lo, v[k]); hi = Math.max(hi, v[k]); } return hi > lo ? hi - lo : 1; };
  for (let depth = 0; depth < MaxRecursion; depth++) {
    const spans = Array.from({ length: n }, (_, k) => span(k));
    const nx = [xs[0]], nv = [vs[0]];
    let added = 0;
    for (let i = 1; i < xs.length; i++) {
      const x0 = xs[i - 1], x1 = xs[i];
      // halve when the mid value is off the chord by more than 1/400 of the curve's range, or when finiteness changes
      let need = false;
      if (i >= 1) {
        const xm = (x0 + x1) / 2, vm = ev(xm);
        for (let k = 0; k < n && !need; k++) {
          const y0 = vs[i - 1][k], y1 = vs[i][k], ym = vm[k];
          if (finite(y0) !== finite(y1) || finite(ym) !== finite(y0)) need = true;
          else if (finite(ym) && Math.abs(ym - (y0 + y1) / 2) > spans[k] / 400) need = true;
        }
        if (need) { nx.push(xm); nv.push(vm); added++; }
      }
      nx.push(x1); nv.push(vs[i]);
    }
    xs = nx; vs = nv;
    if (!added || xs.length > 4000) break;
  }
  // local extrema: one more point at the vertex of the parabola through each extreme sample and its neighbours, so
  // that maxima and minima (and an automatic plot range) are found almost exactly
  const extra = [];
  for (let i = 1; i + 1 < xs.length; i++) {
    for (let k = 0; k < n; k++) {
      const [ya, yb, yc] = [vs[i - 1][k], vs[i][k], vs[i + 1][k]];
      if (!finite(ya) || !finite(yb) || !finite(yc) || !((yb > ya && yb >= yc) || (yb < ya && yb <= yc))) continue;
      const [xa, xb, xc] = [xs[i - 1], xs[i], xs[i + 1]];
      const den = (xb - xa) * (yb - yc) - (xb - xc) * (yb - ya);
      if (den === 0) continue;
      const xv = xb - ((xb - xa) ** 2 * (yb - yc) - (xb - xc) ** 2 * (yb - ya)) / (2 * den);
      if (xv > xa && xv < xc && xv !== xb) extra.push(xv);
    }
  }
  if (extra.length) {
    const all = xs.map((x, i) => [x, vs[i]]).concat(extra.map((x) => [x, ev(x)])).sort((p, q) => p[0] - q[0]);
    xs = all.map((p) => p[0]); vs = all.map((p) => p[1]);
  }
  return { xs, ys: Array.from({ length: n }, (_, k) => vs.map((v) => v[k])) };
}

/** The runs of finite points of a sampled curve: [[[x, y], …], …] (a gap where a value is not a number). */
export function segments(xs, ys) {
  const out = [];
  let run = [];
  xs.forEach((x, i) => { if (finite(ys[i]) && finite(x)) run.push([x, ys[i]]); else { if (run.length) out.push(run); run = []; } });
  if (run.length) out.push(run);
  return out;
}

// ---- styles, ranges, frame options -----------------------------------------------------------------------------------
// PlotStyle -> {s1, s2, …}: one style per curve, used cyclically (as Mathematica); a single directive: every curve
const styleList = (PlotStyle, n) => {
  if (PlotStyle == null) return Array(n).fill(null);
  // v0.1.26: one curve and a flat list of directives ({Dashed, Black, Thick}) — all of them style that curve, as in
  // Mathematica (with several curves a list gives the successive curves their styles)
  if (n === 1 && Array.isArray(PlotStyle) && PlotStyle.length > 1 && PlotStyle.every((d) => !Array.isArray(d))) return [PlotStyle];
  if (Array.isArray(PlotStyle) && PlotStyle.length) return Array.from({ length: n }, (_, i) => PlotStyle[i % PlotStyle.length]);
  return Array(n).fill(PlotStyle);
};
// 'Automatic' in a PlotStyle list = that curve's default style (v0.1.27, PlotStyle -> {Automatic, Dotted})
const asList = (s) => (s == null || s === 'Automatic' ? [] : Array.isArray(s) ? s.filter((d) => d !== 'Automatic') : [s]);
/** The directives of curve i: default colour and thickness, then the user's style. */
const curveStyle = (i, user) => [RGBColor(...COLOR_DATA_97[i % 10]), AbsoluteThickness(1.6), ...asList(user)];
/** The resolved style of a list of directives (colour, dash, thickness in px) — for legends and fillings. */
function resolve(ds) {
  const st = ds.reduce((s, d) => (d && d.dir ? applyDirective(s, d) : s), DEFAULT_STYLE);
  return { color: [...st.color], dash: st.dash, thicknessPx: st.thickness?.abs ?? 1.6, opacity: st.opacity };
}

function rangeOf(points) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of points) {
    if (!finite(x) || !finite(y)) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (x0 === Infinity) return [[-1, 1], [-1, 1]];
  const widen = (lo, hi) => (hi > lo ? [lo, hi] : lo === 0 ? [-1, 1] : [lo - Math.abs(lo) / 10, hi + Math.abs(hi) / 10]);
  return [widen(x0, x1), widen(y0, y1)];
}
/** PlotRange option + the data's own range → { PlotRange, PlotRangePadding, auto: [xAuto, yAuto] }. */
function resolveRange(spec, data, xDomain) {
  const own = rangeOf(data);
  if (xDomain) own[0] = xDomain;
  let xs = 'Automatic', ys = 'Automatic';
  if (!isAuto(spec)) {
    if (Array.isArray(spec) && spec.length === 2 && (Array.isArray(spec[0]) || isAuto(spec[0])) && (Array.isArray(spec[1]) || isAuto(spec[1]))) [xs, ys] = spec;
    else if (Array.isArray(spec) && typeof spec[0] === 'number') ys = spec;
    else if (typeof spec === 'number') ys = [-spec, spec];
  }
  const auto = [isAuto(xs), isAuto(ys)];
  const R = [auto[0] ? own[0] : xs, auto[1] ? own[1] : ys];
  return { PlotRange: R, PlotRangePadding: [auto[0] ? 0.02 : 0, auto[1] ? 0.05 : 0], auto }; // Mathematica pads automatic y ranges more
}
const clampTo = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));

/** The Graphics options of a plot: frame, axes, legend, size; `items` = legend entries. */
function plotOptions(opts, range, items, aspect) {
  const { PlotRange, auto } = range;
  // PlotRangePadding (v0.1.27: the option was ignored by Plot, ListPlot and ParametricPlot): a number or {px, py}, fractions
  // of the ranges; default as Mathematica (Scaled[0.02] for automatic ranges, none for explicit ones)
  const up = opts.PlotRangePadding;
  const PlotRangePadding = up == null ? range.PlotRangePadding : Array.isArray(up) ? up : [up, up];
  const frame = opts.Frame && opts.Frame !== 'False';
  const o = {
    PlotRange, PlotRangePadding, AutoRange: auto, UpdateFrame: true, PlotRangeClipping: opts.PlotRangeClipping ?? true,
    AspectRatio: opts.AspectRatio === undefined ? aspect : opts.AspectRatio === 'Automatic' ? undefined : opts.AspectRatio,
    ImageSize: typeof opts.ImageSize === 'string' ? SIZES[opts.ImageSize] : opts.ImageSize ?? 360,
    Axes: opts.Axes ?? !frame,
    AxesInFrame: frame && opts.Axes !== false, // Mathematica keeps the axes (lines, no ticks) inside a Frame
    AxesOrigin: opts.AxesOrigin ?? [clampTo(0, PlotRange[0]), clampTo(0, PlotRange[1])],
  };
  for (const k of ['Ticks', 'AxesLabel', 'Frame', 'FrameTicks', 'FrameLabel', 'PlotLabel', 'LabelStyle', 'Background', 'ImagePadding', 'label', 'testid', 'id']) if (opts[k] !== undefined) o[k] = opts[k];
  const lg = opts.PlotLegends;
  if (lg != null && items.length) {
    const labels = lg.placed ? lg.labels : lg;
    o.PlotLegends = { items: labels.map((label, i) => ({ label, ...items[i % items.length] })).slice(0, labels.length), position: lg.placed ? lg.position : 'right' };
  }
  return o;
}

// ---- fillings ----------------------------------------------------------------------------------------------------
const fillTargets = (Filling, n) => {
  if (Filling == null || Filling === 'None' || Filling?.dir === 'none') return [];
  if (typeof Filling === 'number' || typeof Filling === 'string') return Array.from({ length: n }, (_, i) => [i, Filling]);
  return Object.entries(Filling).map(([k, t]) => [Number(k) - 1, Array.isArray(t) ? { curve: t[0] - 1 } : t]);
};
const baseline = (t, R, origin) => (t === 'Axis' ? origin : t === 'Bottom' ? R[1][0] : t === 'Top' ? R[1][1] : t);

// ---- the plot functions ------------------------------------------------------------------------------------------
/** Plot[f, {x, a, b}, opts] — see the header. */
export function Plot(f, [a, b], opts = {}) {
  const fs = Array.isArray(f) ? f : null;
  const g = fs ? (x) => fs.map((h) => h(x)) : f;
  const { xs, ys } = sample(g, [a, b], opts);
  const n = ys.length;
  const styles = styleList(opts.PlotStyle, n).map((s, i) => curveStyle(i, s));
  const range = resolveRange(opts.PlotRange, ys.flatMap((y) => xs.map((x, i) => [x, y[i]])), [a, b]);
  const items = styles.map(resolve);
  const o = plotOptions(opts, range, items, GOLDEN); // legend swatches are lines, as Mathematica's
  const prims = [];
  // fillings first (under the curves)
  for (const [k, t] of fillTargets(opts.Filling, n)) {
    if (k < 0 || k >= n) continue;
    const fillStyle = opts.FillingStyle ? asList(opts.FillingStyle) : [RGBColor(...items[k].color), Opacity(0.2)];
    const polys = [];
    if (t && typeof t === 'object' && 'curve' in t) {
      const other = ys[t.curve];
      for (const run of segments(xs, ys[k].map((y, i) => (finite(other[i]) ? y : NaN)))) {
        const back = run.map(([x]) => [x, other[xs.indexOf(x)]]).reverse();
        polys.push([...run, ...back]);
      }
    } else {
      const y0 = baseline(t, o.PlotRange, o.AxesOrigin[1]);
      for (const run of segments(xs, ys[k])) polys.push([[run[0][0], y0], ...run, [run[run.length - 1][0], y0]]);
    }
    if (polys.length) prims.push([...fillStyle, Polygon(polys.length === 1 ? polys[0] : polys)]);
  }
  ys.forEach((y, k) => {
    const runs = segments(xs, y);
    if (runs.length) prims.push([...styles[k], Line(runs.length === 1 ? runs[0] : runs)]);
  });
  return Graphics([...asList(opts.Prolog), ...prims, ...asList(opts.Epilog)], o);
}

/**
 * ParametricPlot[{x(t), y(t)}, {t, a, b}, opts]: f returns [x, y] or a list of such points (several curves).
 * ParametricPlot(f, [u0, u1], [v0, v1], opts) (v0.1.26, a third argument that is an array): the region f(u, v) — see the
 * header.
 */
export function ParametricPlot(f, [a, b], opts = {}, regionOpts = {}) {
  if (Array.isArray(opts)) return parametricRegion(f, [a, b], opts, regionOpts ?? {});
  const first = f((a + b) / 2);
  const many = Array.isArray(first[0]);
  const g = (t) => { const v = f(t); return (many ? v : [v]).flat(); };
  const { xs, ys } = sample(g, [a, b], opts);
  const n = ys.length / 2;
  const curves = Array.from({ length: n }, (_, k) => xs.map((_, i) => [ys[2 * k][i], ys[2 * k + 1][i]]));
  const styles = styleList(opts.PlotStyle, n).map((s, i) => curveStyle(i, s));
  const range = resolveRange(opts.PlotRange, curves.flat(), null);
  const o = plotOptions({ ...opts, AspectRatio: opts.AspectRatio ?? 'Automatic' }, range, styles.map(resolve), undefined);
  const prims = curves.map((pts, k) => {
    const runs = segments(pts.map((p) => p[0]), pts.map((p) => (finite(p[0]) ? p[1] : NaN)));
    return runs.length ? [...styles[k], Line(runs.length === 1 ? runs[0] : runs)] : null;
  }).filter(Boolean);
  return Graphics([...asList(opts.Prolog), ...prims, ...asList(opts.Epilog)], o);
}

const isPointList = (d) => Array.isArray(d) && d.length > 0 && d.every((p) => Array.isArray(p) && p.length === 2 && typeof p[0] === 'number');
/** ListPlot[data, opts]: data = [[x, y], …] or [y1, y2, …] (x = 1, 2, …), or a list of such data sets. */
export function ListPlot(data, opts = {}) {
  const sets = (isPointList(data) || typeof data[0] === 'number' ? [data] : data).map((d) => (typeof d[0] === 'number' ? d.map((y, i) => [i + 1, y]) : d));
  const n = sets.length;
  const styles = styleList(opts.PlotStyle, n).map((s, i) => [RGBColor(...COLOR_DATA_97[i % 10]), AbsoluteThickness(1.6), ...asList(s)]);
  const range = resolveRange(opts.PlotRange, sets.flat(), null);
  const o = plotOptions(opts, range, styles.map(resolve), GOLDEN);
  const joined = (k) => (Array.isArray(opts.Joined) ? opts.Joined[k] : !!opts.Joined);
  const prims = [];
  for (const [k, t] of fillTargets(opts.Filling, n)) {
    if (k < 0 || k >= n) continue;
    const y0 = baseline(t, o.PlotRange, o.AxesOrigin[1]);
    const c = resolve(styles[k]).color;
    if (joined(k)) { // joined: the area under the line
      for (const run of segments(sets[k].map((p) => p[0]), sets[k].map((p) => p[1]))) prims.push([RGBColor(...c), Opacity(0.2), Polygon([[run[0][0], y0], ...run, [run[run.length - 1][0], y0]])]);
    } else { // points: stems down (or up) to the filling level
      prims.push([RGBColor(...c), Opacity(0.5), AbsoluteThickness(1), Line(sets[k].filter((p) => finite(p[1])).map(([x, y]) => [[x, y0], [x, y]]))]);
    }
  }
  sets.forEach((pts, k) => {
    if (joined(k)) {
      const runs = segments(pts.map((p) => p[0]), pts.map((p) => p[1]));
      if (runs.length) prims.push([...styles[k], Line(runs.length === 1 ? runs[0] : runs)]);
    } else {
      const ok = pts.filter((p) => finite(p[0]) && finite(p[1]));
      if (ok.length) prims.push([...styles[k], opts.PointSize != null ? PointSize(opts.PointSize) : AbsolutePointSize(opts.PointPx ?? 4.5), Point(ok)]);
    }
  });
  return Graphics([...asList(opts.Prolog), ...prims, ...asList(opts.Epilog)], o);
}
/** ListLinePlot[data, opts] = ListPlot with Joined -> True. */
export const ListLinePlot = (data, opts = {}) => ListPlot(data, { Joined: true, ...opts });

/**
 * Show[g1, g2, …]: the primitives of all (each in its own list) with the options of the first — its plot range too:
 * a plot stores the range it computed, so Mathematica's Show keeps it (the others' parts outside it are clipped).
 */
export function Show(...gs) {
  const list = gs.flat().filter((g) => g && g.head === 'Graphics');
  return Graphics(list.map((g) => g.list), { ...list[0].options });
}

// ---- regions and densities (v0.1.26) -------------------------------------------------------------------------------
const gridSize = (pp, dflt) => (Array.isArray(pp) ? pp : [pp ?? dflt, pp ?? dflt]).map((n) => Math.max(1, Math.round(n)));
const isNone = (s) => s === 'None' || s === false || s?.dir === 'none';
/**
 * The PlotRange of RegionPlot and DensityPlot: the given ranges unless the option gives others. Padding (v0.1.26): the
 * PlotRangePadding option (a number or [px, py], fractions of the ranges), else `pad` — RegionPlot Scaled[0.02] as
 * Mathematica draws it, DensityPlot none (its raster fills the frame).
 */
function domainRange(spec, xr, yr, opts = {}, pad = 0) {
  let xs = xr, ys = yr;
  if (Array.isArray(spec) && spec.length >= 2 && (Array.isArray(spec[0]) || isAuto(spec[0])) && (Array.isArray(spec[1]) || isAuto(spec[1]))) {
    if (Array.isArray(spec[0])) xs = spec[0];
    if (Array.isArray(spec[1])) ys = spec[1];
  }
  const p = opts.PlotRangePadding ?? pad;
  return { PlotRange: [xs, ys], PlotRangePadding: Array.isArray(p) ? p : [p, p], auto: [false, false] };
}
/** The face of region i: its default colour at Opacity 0.3 without edges, then the user's PlotStyle. */
const faceStyle = (i, user) => [RGBColor(...COLOR_DATA_97[i % 10]), Opacity(0.3), EdgeForm(), ...asList(user)];
/** The boundary of region i: opaque, AbsoluteThickness 1, the region's default colour (whatever the PlotStyle), then BoundaryStyle. */
const boundaryStyle = (i, user) => [RGBColor(...COLOR_DATA_97[i % 10]), AbsoluteThickness(1), ...asList(user)];
const legendItems = (faces) => faces.map((s) => ({ ...resolve(s), filled: true }));
/** The runs of a list of points with gaps (null): [[p, …], …], runs of one point dropped. */
const runsOf = (pts) => {
  const out = [];
  let run = [];
  for (const p of pts) { if (p) run.push(p); else { if (run.length > 1) out.push(run); run = []; } }
  if (run.length > 1) out.push(run);
  return out;
};
const signedArea = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };

/**
 * The outline of a union of counter-clockwise polygons given as lists of vertex ids (integers): an edge that two polygons
 * traverse in opposite directions (shared by neighbours) cancels; the others are linked into closed loops of ids. The
 * loops wind around each point as often as the polygons cover it, so FilledPolygons of them paints exactly the union.
 */
function outlineLoops(polys) {
  let M = 1;
  for (const poly of polys) for (const id of poly) if (id >= M) M = id + 1;
  const count = new Map(); // a·M + b → number of edges a → b not cancelled
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if (a === b) continue;
      const back = b * M + a, c = count.get(back);
      if (c) { if (c === 1) count.delete(back); else count.set(back, c - 1); } else count.set(a * M + b, (count.get(a * M + b) ?? 0) + 1);
    }
  }
  const next = new Map(); // a → [b, …]
  for (const [key, c] of count) {
    const a = Math.floor(key / M), b = key % M;
    if (!next.has(a)) next.set(a, []);
    for (let i = 0; i < c; i++) next.get(a).push(b);
  }
  const loops = [];
  for (const start of [...next.keys()]) {
    while (next.get(start)?.length) {
      const loop = [start];
      for (let a = start; ;) {
        const outs = next.get(a);
        if (!outs?.length) break;
        const b = outs.pop();
        if (!outs.length) next.delete(a);
        if (b === start) break;
        loop.push(b); a = b;
      }
      loops.push(loop);
    }
  }
  return loops;
}

/** RegionPlot[pred, {x, x0, x1}, {y, y0, y1}, opts]: the region where pred(x, y) is true — see the header. */
export function RegionPlot(pred, [x0, x1], [y0, y1], opts = {}) {
  const [nx, ny] = gridSize(opts.PlotPoints, 50), STEPS = 10, W = nx + 1;
  const X = (i) => (i === nx ? x1 : x0 + ((x1 - x0) * i) / nx), Y = (j) => (j === ny ? y1 : y0 + ((y1 - y0) * j) / ny);
  const test = (x, y) => !!pred(x, y);
  const inside = new Uint8Array(W * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) inside[j * W + i] = test(X(i), Y(j)) ? 1 : 0;
  // vertex ids: the grid corners, then the crossings on the horizontal edges (from corner (i, j) to (i + 1, j)), then on
  // the vertical edges (from (i, j) to (i, j + 1)); a crossing lies between a corner inside and one outside
  const C = W * (ny + 1), H = nx * (ny + 1);
  const cId = (i, j) => j * W + i, hId = (i, j) => C + j * nx + i, vId = (i, j) => C + H + j * W + i;
  const crossings = new Map();
  const bisect = (ax, ay, bx, by, inA) => { // the boundary between a (inA) and b (not inA), 10 halvings
    for (let s = 0; s < STEPS; s++) {
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (test(mx, my) === inA) { ax = mx; ay = my; } else { bx = mx; by = my; }
    }
    return [(ax + bx) / 2, (ay + by) / 2];
  };
  const pointOf = (id) => {
    if (id < C) return [X(id % W), Y(Math.floor(id / W))];
    let p = crossings.get(id);
    if (!p) {
      if (id < C + H) { const i = (id - C) % nx, j = Math.floor((id - C) / nx); p = bisect(X(i), Y(j), X(i + 1), Y(j), inside[cId(i, j)] === 1); }
      else { const r = id - C - H, i = r % W, j = Math.floor(r / W); p = bisect(X(i), Y(j), X(i), Y(j + 1), inside[cId(i, j)] === 1); }
      crossings.set(id, p);
    }
    return p;
  };
  // marching squares: the inside part of each cell as a counter-clockwise polygon of ids
  const polys = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = [cId(i, j), cId(i + 1, j), cId(i + 1, j + 1), cId(i, j + 1)];
      const ins = c.map((id) => inside[id]);
      const mask = ins[0] | (ins[1] << 1) | (ins[2] << 2) | (ins[3] << 3);
      if (mask === 0) continue;
      if (mask === 15) { polys.push(c); continue; }
      const e = [hId(i, j), vId(i + 1, j), hId(i, j + 1), vId(i, j)]; // edge k joins corners k and k + 1
      if ((mask === 5 || mask === 10) && !test((X(i) + X(i + 1)) / 2, (Y(j) + Y(j + 1)) / 2)) { // a saddle, centre outside: two corners
        if (mask === 5) polys.push([c[0], e[0], e[3]], [e[1], c[2], e[2]]);
        else polys.push([e[0], c[1], e[1]], [e[2], c[3], e[3]]);
        continue;
      }
      const poly = [];
      for (let k = 0; k < 4; k++) { if (ins[k]) poly.push(c[k]); if (ins[k] !== ins[(k + 1) % 4]) poly.push(e[k]); }
      polys.push(poly);
    }
  }
  // the loops as points, each marked whether it lies on the boundary (a crossing) or on the edge of the domain (a corner);
  // a loop edge between two crossings is a chord of the boundary
  let shapes = outlineLoops(polys).map((loop) => loop.map((id) => ({ p: pointOf(id), on: id >= C })));
  // MaxRecursion (default 1, at most 2): each chord is halved and its midpoint moved onto the boundary (bisection across
  // the chord, within half its length), so that curved boundaries are smoother than the grid
  const onBoundary = (a, b) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = (b[0] - a[0]) / 2, dy = (b[1] - a[1]) / 2;
    const px = mx + dy, py = my - dx, qx = mx - dy, qy = my + dx, inP = test(px, py);
    return dx === 0 && dy === 0 || inP === test(qx, qy) ? [mx, my] : bisect(px, py, qx, qy, inP);
  };
  for (let level = Math.max(0, Math.min(2, Math.round(opts.MaxRecursion ?? 1))); level > 0; level--) {
    shapes = shapes.map((loop) => loop.flatMap((a, k) => {
      const b = loop[(k + 1) % loop.length];
      return a.on && b.on ? [a, { p: onBoundary(a.p, b.p), on: true }] : [a];
    }));
  }
  // the boundary: the runs of chords (the rest of a loop runs along the edge of the domain)
  const runs = [];
  for (const loop of shapes) {
    const m = loop.length, chord = (k) => loop[k].on && loop[(k + 1) % m].on;
    let s = -1;
    for (let k = 0; k < m && s < 0; k++) if (chord(k) && !chord((k + m - 1) % m)) s = k;
    if (s < 0) { if (m > 2 && chord(0)) runs.push([...loop, loop[0]].map((v) => v.p)); continue; } // a closed curve
    let run = null;
    for (let t = 0; t < m; t++) {
      const k = (s + t) % m;
      if (chord(k)) { if (!run) run = [loop[k].p]; run.push(loop[(k + 1) % m].p); } else if (run) { runs.push(run); run = null; }
    }
    if (run) runs.push(run);
  }
  const face = faceStyle(0, opts.PlotStyle);
  const o = plotOptions({ Frame: true, Axes: false, ...opts }, domainRange(opts.PlotRange, [x0, x1], [y0, y1], opts, 0.02), legendItems([face]), 1);
  const prims = [];
  if (shapes.length) prims.push(Annotation([...face, FilledPolygons(shapes.map((l) => l.map((v) => v.p)))], 'region-face'));
  if (runs.length && !isNone(opts.BoundaryStyle)) prims.push(Annotation([...boundaryStyle(0, opts.BoundaryStyle), Line(runs.length === 1 ? runs[0] : runs)], 'region-boundary'));
  return Graphics([asList(opts.Prolog), ...prims, asList(opts.Epilog)], o);
}

/** ParametricPlot[{x(u, v), y(u, v)}, {u, u0, u1}, {v, v0, v1}, opts] — see the header. */
function parametricRegion(f, [u0, u1], [v0, v1], opts) {
  const [nu, nv] = gridSize(opts.PlotPoints, 40), W = nu + 1;
  const U = (i) => (i === nu ? u1 : u0 + ((u1 - u0) * i) / nu), V = (j) => (j === nv ? v1 : v0 + ((v1 - v0) * j) / nv);
  const first = f((u0 + u1) / 2, (v0 + v1) / 2);
  const many = Array.isArray(first?.[0]);
  const m = many ? first.length : 1;
  const ok = (p) => Array.isArray(p) && finite(p[0]) && finite(p[1]);
  const grids = Array.from({ length: m }, () => new Array(W * (nv + 1)));
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const val = f(U(i), V(j)), pts = many ? val : [val];
      for (let r = 0; r < m; r++) grids[r][j * W + i] = ok(pts?.[r]) ? pts[r] : null;
    }
  }
  const styles = styleList(opts.PlotStyle, m), faces = styles.map((s, r) => faceStyle(r, s));
  const range = resolveRange(opts.PlotRange, grids.flat().filter(Boolean), null);
  // v0.1.26: Mathematica's defaults for a region ParametricPlot (read from a saved notebook): Frame and Axes, automatic
  // ranges padded by Scaled[0.05] on both axes; a PlotRangePadding option replaces that
  range.PlotRangePadding = opts.PlotRangePadding !== undefined ? (Array.isArray(opts.PlotRangePadding) ? opts.PlotRangePadding : [opts.PlotRangePadding, opts.PlotRangePadding])
    : range.auto.map((a) => (a ? 0.05 : 0));
  const o = plotOptions({ Frame: true, Axes: true, ...opts, AspectRatio: opts.AspectRatio ?? 'Automatic' }, range, legendItems(faces), undefined);
  // the domain's edge: v = v0 (u increasing), u = u1, v = v1 (u decreasing), u = u0 — closed, split where a point is missing
  const edge = [];
  for (let i = 0; i <= nu; i++) edge.push(i);
  for (let j = 1; j <= nv; j++) edge.push(j * W + nu);
  for (let i = nu - 1; i >= 0; i--) edge.push(nv * W + i);
  for (let j = nv - 1; j >= 0; j--) edge.push(j * W);
  const meshCounts = isNone(opts.Mesh) || opts.Mesh == null ? [0, 0] : Array.isArray(opts.Mesh) ? opts.Mesh : [opts.Mesh, opts.Mesh];
  const faceParts = [], meshParts = [], boundaryParts = [];
  for (let r = 0; r < m; r++) {
    const P = grids[r];
    // the quads, counter-clockwise in (u, v); those the map turns over are reversed and filled as a second shape
    const pos = [], neg = [];
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const q = [j * W + i, j * W + i + 1, (j + 1) * W + i + 1, (j + 1) * W + i];
        if (!q.every((id) => P[id])) continue;
        if (signedArea(q.map((id) => P[id])) >= 0) pos.push(q); else neg.push([q[0], q[3], q[2], q[1]]);
      }
    }
    const shapes = [pos, neg].filter((s) => s.length).map((s) => FilledPolygons(outlineLoops(s).map((l) => l.map((id) => P[id]))));
    if (shapes.length) faceParts.push(Annotation([...faces[r], ...shapes], `region-face-${r + 1}`));
    if (meshCounts[0] > 0 || meshCounts[1] > 0) { // Mesh -> n: n lines u = const and n lines v = const
      const at = (u, v) => { const val = f(u, v), p = many ? val?.[r] : val; return ok(p) ? p : null; };
      const lines = [];
      for (let k = 1; k <= meshCounts[0]; k++) { const u = u0 + ((u1 - u0) * k) / (meshCounts[0] + 1); lines.push(...runsOf(Array.from({ length: nv + 1 }, (_, j) => at(u, V(j))))); }
      for (let k = 1; k <= meshCounts[1]; k++) { const v = v0 + ((v1 - v0) * k) / (meshCounts[1] + 1); lines.push(...runsOf(Array.from({ length: nu + 1 }, (_, i) => at(U(i), v)))); }
      if (lines.length) meshParts.push(Annotation([Darker(RGBColor(...resolve(faces[r]).color)), AbsoluteThickness(0.5), ...asList(opts.MeshStyle), Line(lines)], `region-mesh-${r + 1}`));
    }
    if (!isNone(opts.BoundaryStyle)) {
      const runs = runsOf(edge.map((id) => P[id]));
      const user = styleList(opts.BoundaryStyle, m)[r];
      if (runs.length) boundaryParts.push(Annotation([...boundaryStyle(r, user), Line(runs.length === 1 ? runs[0] : runs)], `region-boundary-${r + 1}`));
    }
  }
  return Graphics([asList(opts.Prolog), ...faceParts, ...meshParts, ...boundaryParts, asList(opts.Epilog)], o);
}

/** DENSITY_GRADIENT_STOPS: [value, [r, g, b]] — Mathematica's default DensityPlot colours, fitted to snapshot pictures. */
export const DENSITY_GRADIENT_STOPS = Object.freeze([
  [0, [0.2, 0.231, 0.498]], [0.05, [0.338, 0.247, 0.466]], [0.1, [0.444, 0.267, 0.429]], [0.15, [0.538, 0.286, 0.392]],
  [0.2, [0.626, 0.302, 0.357]], [0.25, [0.702, 0.326, 0.333]], [0.3, [0.755, 0.359, 0.329]], [0.35, [0.8, 0.396, 0.333]],
  [0.4, [0.843, 0.435, 0.341]], [0.45, [0.883, 0.475, 0.349]], [0.5, [0.922, 0.504, 0.351]], [0.55, [0.941, 0.569, 0.361]],
  [0.6, [0.955, 0.618, 0.369]], [0.65, [0.964, 0.666, 0.376]], [0.7, [0.974, 0.721, 0.388]], [0.75, [0.984, 0.769, 0.424]],
  [0.8, [0.992, 0.813, 0.486]], [0.85, [0.996, 0.851, 0.554]], [0.9, [1, 0.894, 0.641]], [0.95, [1, 0.929, 0.713]],
  [1, [1, 0.959, 0.769]],
].map(([t, c]) => Object.freeze([t, Object.freeze(c)])));
const gradientRgb = (v) => {
  const S = DENSITY_GRADIENT_STOPS, t = v >= 0 ? (v <= 1 ? v : 1) : 0; // clipped to [0, 1] (not a number: 0)
  let k = 1;
  while (k < S.length - 1 && S[k][0] < t) k++;
  const [ta, a] = S[k - 1], [tb, b] = S[k], s = (t - ta) / (tb - ta);
  return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
};
/** DensityGradient(v): the colour of DensityPlot's default colour function at v (clipped to 0…1), linear between the stops. */
export const DensityGradient = (v) => RGBColor(...gradientRgb(v));

/** DensityPlot[f, {x, x0, x1}, {y, y0, y1}, opts] — see the header. */
export function DensityPlot(f, [x0, x1], [y0, y1], opts = {}) {
  const [nx, ny] = gridSize(opts.PlotPoints, 150);
  const z = new Float64Array(nx * ny);
  let lo = Infinity, hi = -Infinity;
  for (let r = 0; r < ny; r++) { // row 0 at the top (ImageRaster)
    const y = y1 - ((y1 - y0) * (r + 0.5)) / ny;
    for (let c = 0; c < nx; c++) {
      const v = f(x0 + ((x1 - x0) * (c + 0.5)) / nx, y);
      z[r * nx + c] = finite(v) ? v : NaN;
      if (finite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; }
    }
  }
  const spec = opts.PlotRange;
  const zSpec = Array.isArray(spec) && spec.length === 2 && finite(spec[0]) ? spec : Array.isArray(spec) && spec.length === 3 ? spec[2] : null;
  const [z0, z1] = Array.isArray(zSpec) && finite(zSpec[0]) && finite(zSpec[1]) ? zSpec : [lo, hi];
  const scaling = opts.ColorFunctionScaling !== false, cf = opts.ColorFunction;
  const data = new Uint8ClampedArray(nx * ny * 4);
  for (let k = 0; k < z.length; k++) {
    const v = z[k];
    if (Number.isNaN(v)) continue; // transparent
    const s = scaling ? Math.min(1, Math.max(0, z1 > z0 ? (v - z0) / (z1 - z0) : 0)) : v;
    const c = cf ? cf(s) : gradientRgb(s), rgb = c.rgb ?? c;
    data[4 * k] = 255 * rgb[0]; data[4 * k + 1] = 255 * rgb[1]; data[4 * k + 2] = 255 * rgb[2]; data[4 * k + 3] = 255;
  }
  const o = plotOptions({ Frame: true, Axes: false, ...opts }, domainRange(spec, [x0, x1], [y0, y1], opts, 0), [], 1);
  o.FrameInFront = opts.FrameInFront ?? true; // v0.1.26: the frame and its ticks over the raster, as Mathematica draws them
  const raster = Annotation(ImageRaster({ width: nx, height: ny, data }, [[x0, y0], [x1, y1]], { smooth: true }), 'density-raster');
  return Graphics([asList(opts.Prolog), raster, asList(opts.Epilog)], o);
}
