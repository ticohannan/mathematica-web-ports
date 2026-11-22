// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Richard Cangelosi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/lotka-volterra-competition/model.js — "Lotka-Volterra Competition Model": one evaluation of the Manipulate
// body, the state in, { view, graphics } out (pure, no DOM). Simple mode: shared/ode.js NDSolve for the time plot,
// shared/plot.js StreamPlot, ContourPlot (of sys == 0), ParametricPlot and Plot; the separatrices from the saddle are
// integrated here with the original's two stop events (WhenEvent) by a small RK4 integrator.
import {
  Graphics, Annotation, Line, Polygon, Point, Arrow, Arrowheads, Text, Column, Style, Black, Gray, GrayLevel,
  RGBColor, Darker, Lighter, Green, Thick, Thickness, PointSize, FontSize, AbsoluteThickness,
} from '../../shared/graphics.js';
import { Plot, ParametricPlot, StreamPlot, ContourPlot, Equation } from '../../shared/plot.js';
import { NDSolve } from '../../shared/ode.js';
import { isCorrected } from '../../shared/errata.js';

/** The Manipulate's initial values (= the notebook's live state and the specs of the saved states). */
export const SPECS = Object.freeze({ α: 0.63, β: 0.53, r1: 0.55, r2: 0.55, k1: 100, k2: 100 });
export const initialState = () => ({ ...SPECS });
/** Button["reset", α = .63; β = .53; k1 = 120; k2 = 120; r1 = 0.15; r2 = 0.15] — not the initial values (Q-LV-01). */
export const RESET = Object.freeze({ α: 0.63, β: 0.53, k1: 120, k2: 120, r1: 0.15, r2: 0.15 });

export const T_MAX = 120; // tMax = 120
export const BROWN = RGBColor(0.63, 0.24, 0.18); // RGBColor[.63, .24, .18] (* redish brown *)
export const GREEN = Darker(Green); // Darker[Green]
/** The basin colours: Lighter[Lighter[RGBColor[.05, .7, .73]], 0.6] and Lighter[Lighter[Gray], 0.6]. */
export const PALE_BLUE = Lighter(Lighter(RGBColor(0.05, 0.7, 0.73)), 0.6);
export const LIGHT_GRAY = Lighter(Lighter(Gray), 0.6);
const HYPHEN = '‐'; // \[Hyphen]

/** ticks = {#, ToString[PercentForm[#]]} & /@ Range[0, 1, .25] (and ticks2 with step .5). */
export const percentTicks = (step) => {
  const out = [];
  for (let k = 0; k * step <= 1 + 1e-12; k++) out.push([k * step, `${Math.round(k * step * 100)}%`]);
  return out;
};

/** sys = {r1 x (1 − x − α k2/k1 y), r2 y (1 − y − β k1/k2 x)} as a function of (x, y). */
export const field = ({ α, β, r1, r2, k1, k2 }) => (x, y) => [r1 * x * (1 - x - ((α * k2) / k1) * y), r2 * y * (1 - y - ((β * k1) / k2) * x)];
/** D[sys, {vars}] at (x, y): the Jacobian matrix. */
export const jacobian = ({ α, β, r1, r2, k1, k2 }) => (x, y) => {
  const A = (α * k2) / k1, B = (β * k1) / k2;
  return [[r1 * (1 - 2 * x - A * y), -r1 * A * x], [-r2 * B * y, r2 * (1 - 2 * y - B * x)]];
};
const det = (m) => m[0][0] * m[1][1] - m[0][1] * m[1][0];

/** {xEq, yEq} = {(k1 − k2 α)/(k1 (1 − α β)), (k2 − k1 β)/(k2 (1 − α β))}: the community equilibrium. */
export const communityEquilibrium = ({ α, β, k1, k2 }) => [(k1 - k2 * α) / (k1 * (1 - α * β)), (k2 - k1 * β) / (k2 * (1 - α * β))];

/**
 * equilibria = Solve[sys == {0, 0}, vars, Reals]: the four fixed points (0, 0), (0, 1), (1, 0) and the community
 * equilibrium (when it is a number; K-LV-01 for r1 = 0 or r2 = 0, D-LV-03 for α β = 1).
 */
export function equilibria(s) {
  const eq = communityEquilibrium(s);
  const pts = [[0, 0], [0, 1], [1, 0]];
  if (Number.isFinite(eq[0]) && Number.isFinite(eq[1]) && !pts.some((p) => p[0] === eq[0] && p[1] === eq[1])) pts.push(eq);
  return pts;
}

/**
 * Which phase portrait the body draws: 'coexistence' (stable community equilibrium inside the square: nullclines),
 * 'exclusion' (the community equilibrium outside the square: one species always wins), 'bistable' (a saddle inside:
 * separatrices and basins). stable = Det[D[sys, {vars}] /. {x → xEq, y → yEq}] > 0.
 */
export function portraitCase(s) {
  const [xEq, yEq] = communityEquilibrium(s);
  const outside = !(Number.isFinite(xEq) && Number.isFinite(yEq)) || xEq < 0 || xEq > 1 || yEq < 0 || yEq > 1; // D-LV-03
  const stable = Number.isFinite(xEq) && Number.isFinite(yEq) && det(jacobian(s)(xEq, yEq)) > 0;
  if (stable || outside) return outside ? 'exclusion' : 'coexistence';
  return 'bistable';
}

/** sol = NDSolve[{u' == …, v' == …, u[0] == 0.35, v[0] == 0.35}, {u[t], v[t]}, {t, 0, tMax}]. */
export function timeSolution(s) {
  const f = field(s);
  return NDSolve((t, [u, v]) => f(u, v), [0.35, 0.35], [0, T_MAX]);
}

/**
 * sepICS[p0, eps]: the points p1 = p0 + eps Norm[p0] {Cos[t], Sin[t]} where the field is parallel to p1 − p0 (NSolve of
 * Det[{p1 − p0, sys(p1)}] == 0 with 0 < t < 2π): with eps = 10^−7 these are the eigen-directions of the Jacobian, two
 * angles each, in increasing t (the order the original's polygons need: stable up, unstable up-left, stable down,
 * unstable down-right). Returns [{ t, p }].
 */
export function sepICS(s, p0, eps) {
  const J = jacobian(s)(...p0);
  const tr = J[0][0] + J[1][1], d = det(J), disc = Math.sqrt(tr * tr - 4 * d);
  const angles = [];
  for (const lam of [(tr + disc) / 2, (tr - disc) / 2]) {
    const v1 = [J[0][1], lam - J[0][0]], v2 = [lam - J[1][1], J[1][0]];
    const v = Math.hypot(...v1) >= Math.hypot(...v2) ? v1 : v2;
    const a = Math.atan2(v[1], v[0]);
    for (const t of [a, a + Math.PI]) angles.push(((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
  }
  angles.sort((a, b) => a - b);
  const r = eps * Math.hypot(...p0);
  return angles.map((t) => ({ t, p: [p0[0] + r * Math.cos(t), p0[1] + r * Math.sin(t)] }));
}

/**
 * One separatrix: NDSolve from p1 over {t, −1000, 1000} with WhenEvent[Norm[X − p0] < 0.5 eps Norm[p0],
 * "StopIntegration"] and WhenEvent[|X1 − 1/2| > 1/2 or |X2 − 1/2| > 1/2, "StopIntegration"] (the plot domain [0, 1]²).
 * RK4 with step 0.02 (the events located by bisection of the last step); the points kept every 0.002 of path length.
 * Returns the curve in increasing t: [[x, y], …].
 */
export function separatrix(s, p0, p1, eps, { T = 1000, h = 0.02, corrected = false } = {}) {
  const f = field(s), stopNear = 0.5 * eps * Math.hypot(...p0);
  const out = (X) => Math.abs(X[0] - 0.5) > 0.5 || Math.abs(X[1] - 0.5) > 0.5;
  const near = (X) => Math.hypot(X[0] - p0[0], X[1] - p0[1]) < stopNear;
  const step = (X, dt) => {
    const k1 = f(X[0], X[1]);
    const k2 = f(X[0] + (dt / 2) * k1[0], X[1] + (dt / 2) * k1[1]);
    const k3 = f(X[0] + (dt / 2) * k2[0], X[1] + (dt / 2) * k2[1]);
    const k4 = f(X[0] + dt * k3[0], X[1] + dt * k3[1]);
    return [X[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), X[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
  };
  // E-LV-01 corrected: no fixed time span — steps sized to the field (at most 0.003 of path, stable for RK4), the curve
  // ends where it leaves the square, comes back to the saddle, or reaches another equilibrium (within 10^−4: the
  // equilibrium itself is its last point); at most 400 000 steps
  const others = equilibria(s).filter((q) => q[0] !== p0[0] || q[1] !== p0[1]);
  const J = jacobian(s);
  const hOf = (X) => {
    const m = J(X[0], X[1]), w = f(X[0], X[1]);
    const stiff = Math.max(Math.abs(m[0][0]) + Math.abs(m[0][1]), Math.abs(m[1][0]) + Math.abs(m[1][1]), 1e-9);
    return Math.max(1e-4, Math.min(0.5 / stiff, 0.003 / Math.max(Math.hypot(w[0], w[1]), 1e-300)));
  };
  const run = (sgn) => {
    const pts = [];
    let X = p1.slice(), last = X, t = 0, n = 0;
    while (corrected ? n++ < 400000 : t < T) {
      if (corrected) {
        const q = others.find((e) => Math.hypot(X[0] - e[0], X[1] - e[1]) < 1e-4);
        if (q) { pts.push(q.slice()); return pts; }
      }
      const dt = corrected ? hOf(X) : Math.min(h, T - t), Y = step(X, sgn * dt);
      if (out(Y) || near(Y)) { // the event inside this step: bisect the step length
        let lo = 0, hi = dt;
        for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2, Z = step(X, sgn * mid); if (out(Z) || near(Z)) hi = mid; else lo = mid; }
        const Z = step(X, sgn * hi);
        pts.push(out(Z) ? [Math.min(1, Math.max(0, Z[0])), Math.min(1, Math.max(0, Z[1]))] : Z);
        return pts;
      }
      X = Y; t += dt;
      if (!Number.isFinite(X[0]) || !Number.isFinite(X[1])) return pts;
      if (Math.hypot(X[0] - last[0], X[1] - last[1]) > 0.002) { pts.push(X); last = X; }
    }
    if (pts[pts.length - 1] !== X) pts.push(X);
    return pts;
  };
  const fwd = run(1), bwd = run(-1);
  return [...bwd.reverse(), p1, ...fwd];
}

/** separatrices: one curve per sepICS point of each saddle (Pick[equilibria, Sign@Det@D[sys, {vars}] /. equilibria, −1]). */
export function separatrices(s, eps = 1e-7) {
  const J = jacobian(s), corrected = isCorrected(s);
  const saddles = equilibria(s).filter((p) => Math.sign(det(J(...p))) === -1);
  return saddles.flatMap((p0) => sepICS(s, p0, eps).map(({ p }) => separatrix(s, p0, p, eps, { corrected })));
}

const CORNERS = [[0, 0], [0, 1], [1, 0], [1, 1]]; // Tuples[{{0, 1}, {0, 1}}]
/** Nearest[Tuples[{{0, 1}, {0, 1}}], q, {1, 0.01}]: the corner within 0.01 of q, if any (a list of 0 or 1 points). */
export const nearCorner = (q) => {
  let best = null, bd = Infinity;
  for (const c of CORNERS) { const d = Math.hypot(c[0] - q[0], c[1] - q[1]); if (d < bd) { bd = d; best = c; } }
  return bd <= 0.01 ? [best] : [];
};
/**
 * The basin polygons: MapAt[Reverse, Partition[sepLines, 2, 1, 1], {{2}, {4}}] /. {Line[p1], Line[p2]} :>
 * Polygon[Join[p1, p2, Nearest[corners, {p2[[−1, 1]], p1[[1, 2]]}, {1, 0.01}], Nearest[corners, {p1[[1, 1]],
 * p2[[−1, 2]]}, {1, 0.01}]]], coloured {pale blue, pale blue, light gray, light gray} (Riffle). Returns [{ colour, pts }].
 */
export function basinPolygons(lines) {
  const n = lines.length;
  if (!n) return [];
  const pairs = lines.map((l, i) => [l, lines[(i + 1) % n]]).map((p, i) => (i === 1 || i === 3 ? [p[1], p[0]] : p));
  const colours = [PALE_BLUE, PALE_BLUE, LIGHT_GRAY, LIGHT_GRAY];
  return pairs.map(([p1, p2], i) => ({
    colour: colours[i % 4],
    pts: [...p1, ...p2, ...nearCorner([p2[p2.length - 1][0], p1[0][1]]), ...nearCorner([p1[0][0], p2[p2.length - 1][1]])],
  }));
}

// ---- the pictures ------------------------------------------------------------------------------------------------------
const FRAME_LABEL = ['species 1\npopulation densities as a percent of carrying capacity', 'species 2'];
const LABELS = {
  exclusion: [`two${HYPHEN}species competition outcomes`, 'One species always outcompetes the other', 'regardless of initial population densities.'],
  coexistence: ['stable coexistence of competing species', '• green - species 1 isoclines', '• brown - species 2 isoclines'],
  bistable: [`two${HYPHEN}species competition outcomes`, ' • light gray - basin of attraction for species 1', ' • pale blue - basin of attraction for species 2'],
};
export const plotLabel = (kind) => LABELS[kind];
// ImageSize -> {370, 400}; room above the frame for the three-line PlotLabel (drawn in the margin, D-LV-02)
const PADDING = [[46, 14], [62, 62]];
const IMAGE = [370, 400];
/** The PlotLabel Column above the frame (Text in the top margin; px offsets converted with the frame's scale). */
function labelText(lines, pad) {
  const plotPx = IMAGE[1] - PADDING[1][0] - PADDING[1][1];
  const u = (1 + 2 * pad) / plotPx; // data units per px
  return Annotation([GrayLevel(0.25), FontSize(12), Text(Column(lines), [0.5, 1 + pad + 31 * u])], 'plot-label');
}
const pointsOf = (s) => [Black, PointSize(0.02), Annotation(Point(equilibria(s)), 'equilibria')];

/** The phase portrait for the state (the If of the original's body): { graphics, sepEnds (the separatrices' last points) }. */
export function phasePortrait(s) {
  const kind = portraitCase(s);
  const sys = field(s);
  const opts = { FrameLabel: FRAME_LABEL, FrameTicks: [percentTicks(0.25), percentTicks(0.25)], ImageSize: IMAGE, ImagePadding: PADDING, PlotRangeClipping: false, label: 'the phase portrait', testid: 'phase-svg' };
  if (kind !== 'bistable') {
    const stream = StreamPlot(sys, [0, 1], [0, 1], { StreamPoints: 25, ...opts });
    const pad = stream.options.PlotRangePadding[0];
    if (kind === 'exclusion') {
      return { graphics: Graphics([stream.list, [
        pointsOf(s),
        [Black, Arrowheads(0.02), Annotation([Arrow([[0, 0.01], [0, 0.995]]), Arrow([[0.01, 0], [0.995, 0]])], 'axis-arrows')],
      ], labelText(LABELS.exclusion, pad)], stream.options) };
    }
    const [xEq, yEq] = communityEquilibrium(s);
    // uNullcline = ContourPlot[sys == 0, …, ContourStyle -> {Thickness[0.006], RGBColor[.63, .24, .18]}]
    const u = ContourPlot(Equation(sys, 0), [0, 1], [0, 1], { ContourStyle: [Thickness(0.006), BROWN] });
    // vNullcline = ParametricPlot[{t, −yEq/(1 − xEq) (t − 1)}, {t, 0, √2}, RegionFunction -> (0 < y < 1), …, PlotStyle -> {Thick, Darker[Green]}]
    const v = ParametricPlot((t) => { const y = (-yEq / (1 - xEq)) * (t - 1); return [t, y > 0 && y < 1 ? y : NaN]; }, [0, Math.SQRT2], { PlotStyle: [Thick, GREEN] });
    return { graphics: Graphics([stream.list, Annotation(u.list, 'u-nullcline'), Annotation(v.list, 'v-nullcline'), [
      [Thick, GREEN, Annotation(Line([[0, 0.015], [0, 0.985]]), 'axis-green')],
      [Thickness(0.006), BROWN, Annotation(Line([[0.015, 0], [0.985, 0]]), 'axis-brown')],
      pointsOf(s),
    ], labelText(LABELS.coexistence, pad)], stream.options) };
  }
  // the saddle case: separatrices, basins (background), streamLines = StreamPlot[sys, …] (default StreamPoints)
  const lines = separatrices(s);
  const polys = basinPolygons(lines);
  const stream = StreamPlot(sys, [0, 1], [0, 1]);
  // Show[{background, streamLines, sepPlots}, …]: the options of background (PlotRange -> All, Scaled[0.02] padding), Axes -> True
  const pad = 0.02;
  const o = { ...stream.options, ...opts, PlotRangePadding: [pad, pad], Axes: true, AxesInFrame: true, AxesOrigin: [0, 0] };
  const graphics = Graphics([
    Annotation(polys.map(({ colour, pts }) => [colour, Polygon(pts)]), 'basins'),
    stream.list,
    [Black, AbsoluteThickness(1.6), Annotation(Line(lines), 'separatrices')], // sepPlots: PlotStyle -> Black, the default thickness
    pointsOf(s),
    labelText(LABELS.bistable, pad),
  ], o);
  return { graphics, sepEnds: lines.map((l) => l[l.length - 1]) };
}

/** The time plot (the Dynamic in the control column): u and v from sol over [0, tMax]. */
export function timePlot(sol) {
  const u = sol.component(0), v = sol.component(1);
  return Plot((t) => [u(t), v(t)], [0, T_MAX], {
    Frame: true, PlotLabel: Column(['population densities as a', 'percent of carrying capacity']), FrameLabel: ['time', null], LabelStyle: [FontSize(9)],
    PlotStyle: [GREEN, BROWN], PlotRange: [[0, T_MAX], [0, 1]], FrameTicks: ['Automatic', percentTicks(0.5)],
    AspectRatio: 0.45, ImageSize: [200, 130], ImagePadding: [[30, 8], [34, 14]], label: 'the population densities in time', testid: 'time-svg',
  });
}

/** The Manipulate body: the phase portrait (picture 1) and the time plot (picture 2, in the control column). */
export function evaluate(state) {
  const s = { ...SPECS, ...state };
  const sol = timeSolution(s);
  const kind = portraitCase(s);
  const [xEq, yEq] = communityEquilibrium(s);
  const portrait = phasePortrait(s);
  return {
    view: { kind, xEq, yEq, equilibria: equilibria(s), u120: sol(T_MAX)[0], v120: sol(T_MAX)[1], label: LABELS[kind], sepEnds: portrait.sepEnds ?? [] },
    graphics: [portrait.graphics, timePlot(sol)],
  };
}
