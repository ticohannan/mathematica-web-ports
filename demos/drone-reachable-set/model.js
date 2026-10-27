// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/drone-reachable-set/model.js — one evaluation of the Manipulate body of "Reachable Set for a Drone": the state in,
// { state, view, graphics } out (pure, no DOM). Simple mode: plain arithmetic, the original's definitions in the original's
// order under its names; the body's assignments to Manipulate variables are returned in `state`. Two pictures: the
// reachable set (picture 0) and the picture of the t̂R t̂T LocatorPane in the control panel (picture 1).
import {
  Graphics, Translate, Rotate, Rectangle, Disk, Line, Point, Text, Style, Subscript, Annotation, EdgeForm, Directive,
  Gray, Black, Orange, Blue, Green, Magenta, Brown, Red, LightBlue, Lighter, PointSize, Thick, Dashed, Italic, FontSize,
} from '../../shared/graphics.js';
import { ParametricPlot, Plot, Show } from '../../shared/plot.js';
import { Pi, Sin, Cos, Max, Min, Greater, Less, Unequal, cacheLast } from '../../shared/wl.js';
import { ticks, tickLabel } from '../../shared/svg-frame.js';

// ---- the Initialization code ---------------------------------------------------------------------------------------

/**
 * drawdrone[Θ, x, z, r, color]: a 2D drone at (x, z) — body, arm, four propeller ellipses (Lighter[color]) and two legs,
 * EdgeForm[Black] — turned by −Θ and translated. Mathematica's Rotate without a centre turns about the centre of the
 * bounding box, (0, 0.09 r) here (x from −1.6 r to 1.6 r, y from −0.15 r to 0.33 r): given explicitly (N-DR-05).
 */
export function drawdrone(Theta, x, z, r, color = Gray) {
  const R = (a, b) => [r * a, r * b];
  return Translate(Rotate([EdgeForm(Black), color,
    Rectangle(R(-0.3, 0), R(0.3, 0.25)),
    Rectangle(R(-1.1, -1 / 16), R(1.1, 1 / 16)),
    [Lighter(color), Disk(R(1.2, 0.25), R(0.4, 0.08)), Disk(R(0.8, 0.25), R(0.4, 0.08)),
      Disk(R(1.2 - 2, 0.25), R(0.4, 0.08)), Disk(R(0.8 - 2, 0.25), R(0.4, 0.08))],
    Rectangle(R(-1.05, -0.15), R(-0.9, 0.2)),
    Rectangle(R(1.05, -0.15), R(0.9, 0.2)),
  ], -Theta, R(0, 0.09)), [x, z]);
}

/** Θ[t, tR, UR1, UR2]: the pitch angle — turning at UR1 until tR, at UR2 after (Piecewise). */
export const Theta = (t, tR, UR1, UR2) => (t < tR ? UR1 * t : UR1 * tR + UR2 * (t - tR));

/** UR1 = 1: the maximum turning rate (radians per unit of the nondimensional time). */
export const UR1 = 1;

/**
 * xphaseshift[t, tR, tT, θ0, UT1, UT2]: the nondimensional x at time t of a drone that turns at UR1 until tR (no turning
 * after) and uses the thrust UT1 until tT, UT2 after — the original's closed forms (If[tR <= tT, …, If[tR > tT, …]], each a
 * Piecewise in t), checked against a numerical integration of ẍ = U sin Θ (unit "xphaseshift and zphaseshift solve").
 */
export function xphaseshift(t, tR, tT, theta0, UT1, UT2) {
  if (tR <= tT) {
    if (t < tR) return (UT1 * (t * UR1 * Cos(theta0 * UR1) + Sin(theta0 * UR1) - Sin((t + theta0) * UR1))) / UR1 ** 2;
    if (t < tT) {
      return (1 / (2 * UR1 ** 2)) * UT1 * (2 * t * UR1 * Cos(theta0 * UR1) + 2 * (-t + tR) * UR1 * Cos((theta0 + tR) * UR1)
        + 2 * Sin(theta0 * UR1) + (-2 + (t - tR) ** 2 * UR1 ** 2) * Sin((theta0 + tR) * UR1));
    }
    return (1 / (2 * UR1 ** 2)) * (2 * (-t + tR) * UR1 * UT1 * Cos((theta0 + tR) * UR1) + 2 * UT1 * (t * UR1 * Cos(theta0 * UR1) + Sin(theta0 * UR1))
      + ((-2 + (tR - tT) * (-2 * t + tR + tT) * UR1 ** 2) * UT1 + (t - tT) ** 2 * UR1 ** 2 * UT2) * Sin((theta0 + tR) * UR1));
  }
  if (tR > tT) {
    if (t < tT) return (UT1 * (t * UR1 * Cos(theta0 * UR1) + Sin(theta0 * UR1) - Sin((t + theta0) * UR1))) / UR1 ** 2;
    if (t < tR) {
      return (1 / UR1 ** 2) * (t * UR1 * UT1 * Cos(theta0 * UR1) - (t - tT) * UR1 * (UT1 - UT2) * Cos((theta0 + tT) * UR1)
        + UT1 * Sin(theta0 * UR1) - UT2 * Sin((t + theta0) * UR1) + (-UT1 + UT2) * Sin((theta0 + tT) * UR1));
    }
    return (1 / (2 * UR1 ** 2)) * (2 * t * UR1 * UT1 * Cos(theta0 * UR1) + 2 * (-t + tR) * UR1 * UT2 * Cos((theta0 + tR) * UR1)
      + 2 * (t - tT) * UR1 * (-UT1 + UT2) * Cos((theta0 + tT) * UR1) + 2 * UT1 * Sin(theta0 * UR1) - 2 * UT2 * Sin((theta0 + tR) * UR1)
      + t ** 2 * UR1 ** 2 * UT2 * Sin((theta0 + tR) * UR1) - 2 * t * tR * UR1 ** 2 * UT2 * Sin((theta0 + tR) * UR1)
      + tR ** 2 * UR1 ** 2 * UT2 * Sin((theta0 + tR) * UR1) + 2 * (-UT1 + UT2) * Sin((theta0 + tT) * UR1));
  }
  return NaN; // neither branch (a switching time that is not a number)
}

/** zphaseshift[t, tR, tT, θ0, UT1, UT2]: the nondimensional z (gravity −1), as xphaseshift. */
export function zphaseshift(t, tR, tT, theta0, UT1, UT2) {
  if (tR <= tT) {
    if (t < tR) return -(t ** 2) / 2 - (UT1 * (-Cos(theta0 * UR1) + Cos((t + theta0) * UR1) + t * UR1 * Sin(theta0 * UR1))) / UR1 ** 2;
    if (t < tT) {
      return (1 / (2 * UR1 ** 2)) * (2 * UT1 * Cos(theta0 * UR1) + (-2 + (t - tR) ** 2 * UR1 ** 2) * UT1 * Cos((theta0 + tR) * UR1)
        - t * UR1 * (t * UR1 + 2 * UT1 * Sin(theta0 * UR1)) + 2 * (t - tR) * UR1 * UT1 * Sin((theta0 + tR) * UR1));
    }
    return (1 / (2 * UR1 ** 2)) * (2 * UT1 * Cos(theta0 * UR1)
      + ((-2 + (tR - tT) * (-2 * t + tR + tT) * UR1 ** 2) * UT1 + (t - tT) ** 2 * UR1 ** 2 * UT2) * Cos((theta0 + tR) * UR1)
      - t * UR1 * (t * UR1 + 2 * UT1 * Sin(theta0 * UR1)) + 2 * (t - tR) * UR1 * UT1 * Sin((theta0 + tR) * UR1));
  }
  if (tR > tT) {
    if (t < tT) return -(t ** 2) / 2 - (UT1 * (-Cos(theta0 * UR1) + Cos((t + theta0) * UR1) + t * UR1 * Sin(theta0 * UR1))) / UR1 ** 2;
    if (t < tR) {
      return (1 / (2 * UR1 ** 2)) * (2 * UT1 * Cos(theta0 * UR1) - 2 * UT2 * Cos((t + theta0) * UR1) + 2 * (-UT1 + UT2) * Cos((theta0 + tT) * UR1)
        - t * UR1 * (t * UR1 + 2 * UT1 * Sin(theta0 * UR1)) + 2 * (t - tT) * UR1 * (UT1 - UT2) * Sin((theta0 + tT) * UR1));
    }
    return (1 / (2 * UR1 ** 2)) * (-(t ** 2) * UR1 ** 2 + (-2 + (t - tR) ** 2 * UR1 ** 2) * UT2 * Cos((theta0 + tR) * UR1)
      + 2 * (UT1 * Cos(theta0 * UR1) + (-UT1 + UT2) * Cos((theta0 + tT) * UR1)
        + UR1 * (-t * UT1 * Sin(theta0 * UR1) + (t - tR) * UT2 * Sin((theta0 + tR) * UR1) + (t - tT) * (UT1 - UT2) * Sin((theta0 + tT) * UR1))));
  }
  return NaN;
}

/** nothing = Graphics[{PointSize[0.00], Point[{0, 0}]}]: a blank graphics object (a point of size 0 at the origin). */
export const nothing = Graphics([PointSize(0), Point([0, 0])]);

// the axes labels x̂, ẑ (OverscriptBox[x, ^] in the original's strings: drawn as an italic letter with a hat)
const AXES_LABEL = [Style('x̂', Italic), Style('ẑ', Italic)];

/**
 * regions[T, pg, UT1, UT2]: the reachable set at time T — ParametricPlot over the switching times (ts1, ts2) ∈ [0, T]² of
 * the final position {x, z} and its mirror {−x, z} (turning the other way): two regions, faces Blue at Opacity 0.3 (darker
 * where a region folds over itself), boundaries ColorData[97, 1] and [97, 2] = the images of the square's edges.
 * PerformanceGoal and Exclusions are accepted and ignored by shared/plot.js; the grid: regionPlotPoints (D-DR-03).
 */
export function regions(T, pg, UT1, UT2) {
  return ParametricPlot((ts1, ts2) => {
    const x = xphaseshift(T, ts1, ts2, 0, UT1, UT2), z = zphaseshift(T, ts1, ts2, 0, UT1, UT2);
    return [[x, z], [-x, z]];
  }, [0, T], [0, T], {
    AxesLabel: AXES_LABEL, PlotRange: 'All', PlotStyle: Blue, Exclusions: 'None', LabelStyle: [Black], PerformanceGoal: pg,
    ImageSize: [400, 400], PlotPoints: regionPlotPoints(T),
  });
}
/** The grid of the region plot (D-DR-03): 60 × 60 up to T = 3 (the saved plots' boundaries have 170 and 225 points; here
 *  241), finer for larger T, whose longer boundary curves Mathematica's adaptive sampler refines: 20 T, at most 120. */
export const regionPlotPoints = (T) => Math.round(Math.min(120, Math.max(60, 20 * T)));

/**
 * optimumvalues[T, pg, UT1, UT2]: the control sequences of the boundary, Show of five ParametricPlots (Thick): Blue tT = 0
 * (maximum thrust throughout), Green tT = T (minimum thrust throughout), Magenta tR = 0 (no turning: x = 0, one curve),
 * Brown tR = T (turning throughout), Red tT = tR − π/2 for tR ∈ [π/2, T] (only when T > π/2, else `nothing`); each with
 * its mirror image except Magenta. Annotation ids optimum-blue … optimum-red.
 */
export function optimumvalues(T, pg, UT1, UT2) {
  const X = (tR, tT) => xphaseshift(T, tR, tT, 0, UT1, UT2), Z = (tR, tT) => zphaseshift(T, tR, tT, 0, UT1, UT2);
  const both = (tR, tT) => { const x = X(tR, tT), z = Z(tR, tT); return [[x, z], [-x, z]]; };
  const plots = [
    ['optimum-blue', ParametricPlot((tR) => both(tR, 0), [0, T], { AxesLabel: AXES_LABEL, PlotStyle: Directive(Thick, Blue), PerformanceGoal: pg })],
    ['optimum-green', ParametricPlot((tR) => both(tR, T), [0, T], { PlotStyle: Directive(Thick, Green), PerformanceGoal: pg })],
    ['optimum-magenta', ParametricPlot((tR) => [X(0, tR), Z(0, tR)], [0, T], { PlotStyle: Directive(Thick, Magenta), PerformanceGoal: pg })],
    ['optimum-brown', ParametricPlot((tR) => both(T, tR), [0, T], { PlotStyle: Directive(Thick, Brown), PerformanceGoal: pg })],
    ['optimum-red', Greater(T, Pi / 2)
      ? ParametricPlot((tR) => both(tR, tR - Pi / 2), [Pi / 2, T], { PlotStyle: Directive(Thick, Red), PerformanceGoal: pg }) : nothing],
  ];
  const g = Show(...plots.map(([, p]) => p));
  return Graphics(g.list.map((part, i) => Annotation(part, plots[i][0])), g.options);
}

/**
 * The LocatorPane's Dynamic setter in tRtTControl: pt = {Max[0, Min[T, Re[p1]]], Max[0, Min[T, Re[p2]]]} — the locator
 * stays in the square [0, T]².
 */
export const clampToSquare = ([a, b], T) => [Max(0, Min(T, a)), Max(0, Min(T, b))];

/**
 * tRtTControl[Dynamic[pt], T]: the picture of the LocatorPane — Plot[0, {tR, 0, T}] (a Thick Blue line along tT = 0),
 * AspectRatio 1, PlotRange {{−0.1, 1.01 T}, {−0.1, 1.01 T}}, Prolog: the LightBlue square [0, T]², Epilog: Thick Brown
 * tR = T, Green tT = T, Magenta tR = 0, Red the line tT = tR − π/2 when T > π/2 (else a Blue point at the origin);
 * ImageSize 1.125 {125, 125}. The locator itself is the Manipulate layer's (main.js, picture 1). `EdgeStyle -> None` in
 * the Prolog list has no effect (N-DR-07). ImagePadding: the margins of the snapshot (N-DR-06).
 */
export function tRtTControl(T) {
  return Plot(() => 0, [0, T], {
    AxesLabel: [Style(Subscript(Style('t̂', Italic), 'R'), 11), Style(Subscript(Style('t̂', Italic), 'T'), 11)],
    PlotStyle: Directive(Thick, Blue), AspectRatio: 1, PlotRange: [[-0.1, 1.01 * T], [-0.1, 1.01 * T]],
    Prolog: [[LightBlue, Annotation(Rectangle([0, 0], [T, T]), 'pane-square')]],
    LabelStyle: [Black, PANE_FONT], // Mathematica's ticks fit the 140 px pane; the layer's 11 px labels would overlap (N-DR-06)
    Epilog: [[Thick,
      Brown, Annotation(Line([[T, Max(0, 0)], [T, T]]), 'pane-brown'),
      Green, Annotation(Line([[0, T], [T, T]]), 'pane-green'),
      Magenta, Annotation(Line([[0, 0], [0, T]]), 'pane-magenta'),
      Red, Greater(T, Pi / 2) ? Annotation(Line([[Pi / 2, 0], [T, T - Pi / 2]]), 'pane-red') : Annotation([Blue, Point([0, 0])], 'pane-origin'),
    ]],
    ImageSize: [1.125 * 125, 1.125 * 125], ImagePadding: [[19, 17], [12, 19]],
    testid: 'pane-svg', label: 'switching times t̂R, t̂T (drag the locator)',
  });
}
const PANE_FONT = 9; // px at the pane's ImageSize

// ---- the Manipulate variables ----------------------------------------------------------------------------------------

/** The symbol T: the saved states give t = T (unevaluated), so t follows T until the t slider is moved (Q-DR-01). */
export const SYM_T = Object.freeze({ sym: 'T' });
const isSymT = (v) => !!v && typeof v === 'object' && v.sym === 'T';
/** The value of t: T while t is the symbol T. */
export const tValue = (t, T) => (isSymT(t) ? T : t);

/** The Manipulate's own initial values (its stored "Variables", what Initial Settings restores); the plots regionsd and
 *  regionsOpt (−1 there) are not variables of the port (N-DR-02). */
export const SPECS = Object.freeze({ T: 3, t: SYM_T, r1: [0.102, 2.04], Drone: false, Optimum: false, tfold: -1, r1old: -1, tRtT: [1, 0] });
/** The state saved in the notebook's output cell (what the published Demonstration shows). */
export const SAVED = Object.freeze({ T: 3, t: SYM_T, r1: [0.102, 2.04], Drone: false, Optimum: false, tfold: 3, r1old: [0.102, 2.04], tRtT: [1, 0] });
export const initialState = () => structuredClone({ ...SAVED });
export const initialSettings = () => structuredClone({ ...SPECS });

// ---- the picture's PlotRange -> All, frame and axes labels ----------------------------------------------------------

/**
 * The points PlotRange -> All takes into account (pure): the vertices of lines, polygons and points, the corners of
 * rectangles and the outlines of disks, after Rotate and Translate.
 */
export function extentPoints(g, f = (p) => p, out = []) {
  if (Array.isArray(g)) { for (const q of g) extentPoints(q, f, out); return out; }
  if (!g || !g.head) return out;
  const flat = (pts) => (Array.isArray(pts[0]?.[0]) ? pts.flatMap((q) => (Array.isArray(q[0]?.[0]) ? q.flat() : q)) : pts);
  switch (g.head) {
    case 'Graphics': return extentPoints(g.list, f, out);
    case 'Annotation': return extentPoints(g.g, f, out);
    case 'Translate': return extentPoints(g.g, (p) => f([p[0] + g.v[0], p[1] + g.v[1]]), out);
    case 'Rotate': {
      const c = Cos(g.angle), s = Sin(g.angle), [ax, ay] = g.about;
      return extentPoints(g.g, (p) => f([ax + c * (p[0] - ax) - s * (p[1] - ay), ay + s * (p[0] - ax) + c * (p[1] - ay)]), out);
    }
    case 'Line': case 'Polygon': case 'Point': case 'FilledPolygons': for (const p of flat(g.pts)) out.push(f(p)); return out;
    case 'Rectangle': for (const p of [g.a, [g.b[0], g.a[1]], g.b, [g.a[0], g.b[1]]]) out.push(f(p)); return out;
    case 'Disk': {
      const [rx, ry] = Array.isArray(g.r) ? g.r : [g.r, g.r];
      for (let k = 0; k < 48; k++) out.push(f([g.c[0] + rx * Cos((k * Pi) / 24), g.c[1] + ry * Sin((k * Pi) / 24)]));
      return out;
    }
    default: return out;
  }
}
/** The bounding box [[xmin, xmax], [zmin, zmax]] of points (finite coordinates only). */
export function boxOf(points) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  return [[x0, x1], [z0, z1]];
}

export const PADDING = 0.05; // PlotRangePadding -> Scaled[0.05] (the region plot's option, kept by Show)
const IMAGE = 400; // ImageSize -> {400, 400}
// px for the frame's tick labels (left, bottom) and the axes labels x̂ (right) and ẑ (top), as measured in the snapshots;
// without an axis its label is not drawn and the frame takes the room (snapshot 6: the frame 385 px wide instead of 371);
// the left margin grows with the longest tick label (Mathematica's automatic ImagePadding): 18 px for "−4", 31 for "−100"
const MARGINS = Object.freeze({ left: 18, right: 14, bottom: 17, top: 22 });
const BARE = Object.freeze({ right: 4, top: 8 });
const leftMargin = ([lo, hi], spec) => {
  const longest = Math.max(...ticks(lo, hi, spec).major.map((v) => tickLabel(v, spec.major).length));
  return Math.max(MARGINS.left, 6 + 6.3 * longest);
};

/**
 * The automatic frame ticks of the snapshots: major steps 1, 2 or 5 × 10^n nearest (in ratio) to a fifth of the padded range,
 * minor steps a quarter (2 × 10^n) or a fifth of it. The snapshots show 2 for ranges up to 15.7 and 5 from 18.8 on
 * (snapshot 5: −6 … 12.8 → 5), which shared/svg-frame.js automaticTicks (a sixth of the range) gives as 2 (N-DR-09).
 */
export function frameTickSpec(lo, hi) {
  const target = (hi - lo) / 5, p = 10 ** Math.floor(Math.log10(target));
  let best = null;
  for (const m of [1, 2, 5, 10]) {
    const d = Math.abs(Math.log((m * p) / target));
    if (!best || d < best.d) best = { m: m === 10 ? 1 : m, s: m * p, d };
  }
  const major = Number(best.s.toPrecision(12));
  return { major, minor: Number((major / (best.m === 2 ? 4 : 5)).toPrecision(12)) };
}

/**
 * The options of the picture: Show[regionsd, …, PlotRange -> All] keeps the region plot's options — Frame, Axes (inside the
 * frame, crossing at the origin), AxesLabel, LabelStyle Black, PlotRangePadding Scaled[0.05], ImageSize {400, 400} with
 * AspectRatio Automatic (the plot range fitted into the 400 × 400 image, centred). shared/plot.js gives ParametricPlot
 * regions no frame and draws no AxesLabel with a frame, so the frame options are set here and the labels are drawn as
 * text beyond the frame (`axesLabels`, N-DR-04). AxesOrigin -> Automatic: an axis is drawn at 0 only where 0 lies strictly
 * inside the drawn data; otherwise (snapshot 6: the set above the start, z = 0 only at the path's first point) there is no
 * horizontal axis and no x̂ (Q-DR-04) — the axis is put on the frame's edge, where the layer draws none.
 * Returns { options, unitsPerPx, padded, axes: [x axis drawn, z axis drawn] }.
 */
export function pictureOptions([[x0, x1], [z0, z1]]) {
  const S = [[x0 - PADDING * (x1 - x0), x1 + PADDING * (x1 - x0)], [z0 - PADDING * (z1 - z0), z1 + PADDING * (z1 - z0)]];
  const axes = [z0 < 0 && 0 < z1, x0 < 0 && 0 < x1]; // the horizontal axis (z = 0, label x̂), the vertical axis (x = 0, label ẑ)
  const ticksX = frameTickSpec(...S[0]), ticksZ = frameTickSpec(...S[1]);
  const M = { ...MARGINS, left: leftMargin(S[1], ticksZ), right: axes[0] ? MARGINS.right : BARE.right, top: axes[1] ? MARGINS.top : BARE.top };
  const ar = (S[1][1] - S[1][0]) / (S[0][1] - S[0][0]);
  const w = Math.min(IMAGE - M.left - M.right, (IMAGE - M.top - M.bottom) / ar), h = w * ar;
  const ex = (IMAGE - M.left - M.right - w) / 2, ey = (IMAGE - M.top - M.bottom - h) / 2;
  const options = {
    PlotRange: [[x0, x1], [z0, z1]], PlotRangePadding: [PADDING, PADDING], AspectRatio: ar, ImageSize: [IMAGE, IMAGE],
    ImagePadding: [[M.left + ex, M.right + ex], [M.bottom + ey, M.top + ey]],
    Frame: true, Axes: true, AxesInFrame: true, AxesOrigin: [axes[1] ? 0 : S[0][0], axes[0] ? 0 : S[1][0]], LabelStyle: [Black],
    FrameTicks: [ticksX, ticksZ],
    UpdateFrame: true, PlotRangeClipping: false, // the axes labels lie beyond the frame
    testid: 'scene-svg', label: 'the reachable set of the drone at the final time, its path and the drone',
  };
  return { options, unitsPerPx: (S[0][1] - S[0][0]) / w, padded: S, axes };
}

/** AxesLabel {x̂, ẑ} at the ends of the drawn axes beyond the frame (as Mathematica places them on a framed plot). */
export function axesLabels({ padded: [[, X1], [, Z1]], unitsPerPx: u, options: { AxesOrigin: [ox, oz] }, axes: [ax, az] }) {
  return [Black, FontSize(12),
    ax && Annotation(Text(AXES_LABEL[0], [X1 + 7 * u, oz], [-1, 0]), 'axes-label-x'),
    az && Annotation(Text(AXES_LABEL[1], [ox, Z1 + 12 * u]), 'axes-label-z'),
  ];
}

// ---- the body ---------------------------------------------------------------------------------------------------------

const cachedRegions = cacheLast(), cachedOptimum = cacheLast(), cachedPane = cacheLast();

/**
 * One evaluation of the Manipulate body. The original keeps the two plots in variables (regionsd, regionsOpt) and computes
 * them again when tfold != T or r1old != r1; tfold = ControlActive[-1, T] and pg = ControlActive["Speed", "Quality"]
 * are T and "Quality" at every evaluation (ContinuousAction -> False: the body runs when a control is released). Here a
 * cache keyed on T and r1 keeps the plots; tfold and r1old are updated as in the original.
 */
export function evaluate(state) {
  const s = { ...state, r1: [...state.r1], tRtT: [...state.tRtT] };
  const { T } = s;
  // parameter checking
  if (Greater(tValue(s.t, T), T)) s.t = T;
  if (Greater(s.tRtT[0], T)) s.tRtT[0] = T;
  if (Greater(s.tRtT[1], T)) s.tRtT[1] = T;
  if (Less(s.tRtT[0], 0)) s.tRtT[0] = 0;
  if (Less(s.tRtT[1], 0)) s.tRtT[1] = 0;
  const umin = s.r1[0], umax = s.r1[1];
  let recomputed = false;
  if (Unequal(s.tfold, T) || Unequal(s.r1old, s.r1)) {
    s.tfold = T; // ControlActive[-1, T]: forces a redraw
    s.r1old = [...s.r1];
    recomputed = true;
  }
  const pg = 'Quality';
  const regionsd = cachedRegions([T, umin, umax], () => regions(T, pg, umin, umax));
  const regionsOpt = cachedOptimum([T, umin, umax], () => optimumvalues(T, pg, umin, umax));
  const t = tValue(s.t, T), [tR, tT] = s.tRtT;
  const xd = xphaseshift(t, tR, tT, 0, umin, umax);
  const zd = zphaseshift(t, tR, tT, 0, umin, umax);
  // PlotStyle -> {Dashed, Black, Thick} on one curve is one style (Mathematica): a Directive here (N-DR-08)
  const path = ParametricPlot((tv) => [xphaseshift(tv, tR, tT, 0, umin, umax), zphaseshift(tv, tR, tT, 0, umin, umax)], [0, T],
    { PlotStyle: Directive(Dashed, Black, Thick) });
  const theta = Theta(t, tR, UR1, 0);
  const marker = s.Drone ? Annotation(drawdrone(theta, xd, zd, 1, Gray), 'drone')
    : Annotation([PointSize('Large'), Orange, Point([xd, zd])], 'drone-point');
  const parts = [regionsd, s.Optimum ? regionsOpt : nothing, Graphics([Annotation(path.list, 'path')]), Graphics([marker])];
  // Show[regionsd, If[Optimum, regionsOpt, nothing], path, Graphics[…], PlotRange -> All]
  const shown = Show(...parts);
  const range = boxOf(extentPoints(parts));
  const layout = pictureOptions(range);
  const picture = Graphics([...shown.list, axesLabels(layout)], layout.options);
  const pane = cachedPane([T], () => tRtTControl(T));
  return {
    state: s,
    view: {
      t, T, tR, tT, umin, umax, xd, zd, theta, recomputed, PlotRange: range, padded: layout.padded, axes: layout.axes,
      regionRange: regionsd.options.PlotRange,
    },
    graphics: [picture, pane],
  };
}
