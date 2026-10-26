// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Haoran Zhao and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/swarm-circle/model.js — one evaluation of the Manipulate body of "Distribution of a Swarm of Robots in a
// Circular Workplace under Gravity": the state in, { view, graphics } out (pure, no DOM). Simple mode: plain
// arithmetic, the original's function names. Five pictures: mean, correlation, covariance (column 1), the workplace
// and the variance (column 2).
import {
  Graphics, Disk, Circle, Rectangle, Rotate, Arrow, Line, Point, Text, Ellipsoid, Annotation, Row, Style, Column,
  LightBlue, White, Green, Darker, Black, Blue, Red, Lighter, Thin, Thick, Thickness, Arrowheads, PointSize,
  Opacity, EdgeForm, Italic,
} from '../../shared/graphics.js';
import { Plot, Placed, ColorData } from '../../shared/plot.js';
import { Pi, Sin, Cos, Sqrt, Abs, Chop, Boole, Round, Table, Flatten, Select, Dot, Subtract, Times, cacheLast } from '../../shared/wl.js';

export const initialState = () => ({ β: 4.712, h: 0.66, showParticles: false, showStats: false });

const ArcCos = Math.acos, ArcSin = Math.asin;

// ---- Initialization: the closed forms (gravity along β; computed for β = 0, then rotated)
export const Meanx = (Beta, h) => (2 * ((2 - h) * h) ** (3 / 2) * Cos(Beta)) / (3 * ((-1 + h) * Sqrt((2 - h) * h) + ArcCos(1 - h)));
export const Meany = (Beta, h) => (2 * ((2 - h) * h) ** (3 / 2) * Sin(Beta)) / (3 * ((-1 + h) * Sqrt((2 - h) * h) + ArcCos(1 - h)));
export const VarXh = (h) => (64 * (-2 + h) ** 3 * h ** 3 + 9 * ((-1 + h) * Sqrt(-(-2 + h) * h) + ArcCos(1 - h)) * (4 * ArcCos(1 - h) + Sin(4 * ArcSin(1 - h))))
  / (144 * ((-1 + h) * Sqrt(-(-2 + h) * h) + ArcCos(1 - h)) ** 2);
export const VarYh = (h) => (12 * ArcCos(1 - h) - 8 * Sin(2 * ArcCos(1 - h)) + Sin(4 * ArcCos(1 - h))) / (48 * ((-1 + h) * Sqrt(-(-2 + h) * h) + ArcCos(1 - h)));
export const Varx = (Beta, h) => VarXh(h) * Cos(Beta) ** 2 + VarYh(h) * Sin(Beta) ** 2;
export const Vary = (Beta, h) => VarYh(h) * Cos(Beta) ** 2 + VarXh(h) * Sin(Beta) ** 2;
export const Covxy = (Beta, h) => (VarXh(h) - VarYh(h)) * Cos(Beta) * Sin(Beta);
export const Corxy = (Beta, h) => Covxy(Beta, h) / Sqrt(Varx(Beta, h) * Vary(Beta, h));
/** The area under the chord (the stats text): −(1 − h) √((2 − h) h) + ArcCos[1 − h]. */
export const area = (h) => -(1 - h) * Sqrt((2 - h) * h) + ArcCos(1 - h);

export const numPts = 20;
/** swarmPtsS: the hexagonal lattice (1/numPts){i + Boole[EvenQ[j]]/2, j √3/2}, i = −20…20, j = −23…23; swarmPts: those inside the unit disk. */
const jMax = Round((2 / Sqrt(3)) * numPts);
export const swarmPtsS = Flatten(Table((i, j) => Times(1 / numPts, [i + Boole(j % 2 === 0) / 2, (j * Sqrt(3)) / 2]), [-numPts, numPts], [-jMax, jMax]), 1);
export const swarmPts = Select(swarmPtsS, (p) => p[0] ** 2 + p[1] ** 2 < 1);

/**
 * arrowArc[s_Circle] := s /. Circle[a_, r_, {start_, end_}] :> {s, Arrow[{# - r/10^6 {-Sin@end, Cos@end}, #}]}&[a + r {Cos@end, Sin@end}]:
 * the arc and a tiny arrow at its end, tangent to it (only its head shows). Written here (not demos/common/arrow-arcs.js).
 */
export function arrowArc(s) {
  const { c: a, r, angles: [, end] } = s;
  const tip = [a[0] + r * Cos(end), a[1] + r * Sin(end)];
  return [s, Arrow([Subtract(tip, Times(r / 10 ** 6, [-Sin(end), Cos(end)])), tip])];
}

// ---- pictures
const C = (i) => ColorData(97, i);
/** PointSize[Large]: Mathematica's named size is absolute (7 px measured in the snapshots); the layer's named sizes are fractions of the width (K-SC-01). */
const PointSizeLarge = PointSize('Large');
const piTicks = [[[0, '0'], [Pi / 2, 'π/2'], [Pi, 'π'], [(3 * Pi) / 2, '3π/2'], [2 * Pi, '2π']], 'Automatic'];
const padding = [[30, 6], [5, 20]];
const imsize = 220;

/** The four plots' curves depend on h only (and ControlActive): made once per (h, active) and reused while β moves. */
const cachedCurves = cacheLast();
function curves(h, active) {
  const PlotPoints = active ? 9 : undefined; // PlotPoints -> ControlActive[9, Automatic]
  const common = { Ticks: piTicks, ImageSize: imsize, ImagePadding: padding, PlotPoints };
  return {
    mean: Plot((Beta) => [Meanx(Beta, h), Meany(Beta, h)], [0, 2 * Pi], {
      ...common, AxesLabel: ['β', 'mean'], AxesOrigin: [0, 0], PlotRange: [[0, 2 * Pi], [-1, 1]],
      PlotLegends: Placed([Row(['mean ', Style('x', Italic)]), Row(['mean ', Style('y', Italic)])], [0.65, 0.85]),
      PlotStyle: [[C(1)], [C(2)]], testid: 'plot-mean', label: 'mean x and mean y against β',
    }),
    correlation: Plot((Beta) => Corxy(Beta, h), [0, 2 * Pi], {
      ...common, AxesLabel: ['β', 'correlation'], PlotRange: [[0, 2 * Pi], [-1.1, 1.1]],
      PlotStyle: [[C(6)]], testid: 'plot-correlation', label: 'correlation against β',
    }),
    covariance: Plot((Beta) => Covxy(Beta, h), [0, 2 * Pi], {
      ...common, AxesLabel: ['β', 'covariance'], PlotRange: [[0, 2 * Pi], [-0.1, 0.1]],
      PlotStyle: [[C(5)]], testid: 'plot-covariance', label: 'covariance against β',
    }),
    variance: Plot((Beta) => [Vary(Beta, h), Varx(Beta, h)], [0, 2 * Pi], {
      Ticks: piTicks, AxesLabel: ['β', 'variance'], PlotPoints,
      PlotLegends: [Row(['var ', Style('y', Italic)]), Row(['var ', Style('x', Italic)])],
      PlotRange: [[0, 2 * Pi], [0, 0.3]], ImageSize: 190, PlotStyle: [[C(3)], [C(4)]],
      testid: 'plot-variance', label: 'variance of x and y against β',
    }),
  };
}
/** Epilog -> Dynamic@{…}: the plot with points added (the curve picture itself unchanged). */
const withEpilog = (plot, id, epilog) => Graphics([plot.list, Annotation(epilog, id)], plot.options);

/** A machine real as Mathematica prints it in StringForm (6 significant digits, trailing zeros dropped, "1." for whole reals, 0 after Chop). */
export function fmt(x) {
  if (x === 0) return '0';
  if (Abs(x) >= 1e-5 && Abs(x) < 1e6) {
    let s = x.toPrecision(6);
    if (s.includes('.')) s = s.replace(/0+$/, '');
    return s;
  }
  const [m, e] = x.toExponential(5).split('e');
  return `${m.replace(/0+$/, '').replace(/\.$/, '.')}×10^${Number(e)}`;
}
const fmtList = (v) => `{${v.map(fmt).join(', ')}}`;

export function evaluate({ β, h, showParticles, showStats }, { controlActive = false } = {}) {
  const Beta = β;
  const bwid = 0.05;
  const x = Chop(Meanx(Beta, h));
  const y = Chop(Meany(Beta, h));
  const mean = [x, y];
  const cov = Chop(Covxy(Beta, h));
  const varx = Chop(Varx(Beta, h));
  const vary = Chop(Vary(Beta, h));
  const cor = Corxy(Beta, h);
  const u = [Cos(Beta), Sin(Beta)], n = [-Sin(Beta), Cos(Beta)];
  const at = (s, t) => [s * u[0] + t * n[0], s * u[1] + t * n[1]];
  const particles = showParticles ? (h < 2 ? Select(swarmPts, (p) => Dot(u, Subtract(p, Times(1 - h, u))) > 0) : swarmPts) : [];
  const meanRadius = (2 * (-(-2 + h) * h) ** (3 / 2)) / (3 * ((-1 + h) * Sqrt(-(-2 + h) * h) + ArcCos(1 - h)));
  const statsText = Column([`area=${fmt(area(h))}`, `mean=${fmtList(Chop(mean))}`, `cov=${fmt(Chop(cov))}`]);

  const P = cachedCurves([h, controlActive], () => curves(h, controlActive));
  const workplace = Graphics([
    [LightBlue, Annotation(Disk([0, 0], 1), 'workplace')],
    [White, Annotation(Rotate(Rectangle([-1, -1], [1 - h, 1]), Beta, [0, 0]), 'robot-free')],
    Annotation([Darker(Green), Arrowheads(0.04), // Arrowheads[.04 {-1, 1}]: a head at each end (K-SC-02)
      Arrow([at(1 - h, 1 / 10), at(1, 1 / 10)]), Arrow([at(1, 1 / 10), at(1 - h, 1 / 10)]),
      Thin, Line([at(1 - h, 0), at(1 - h, 2 / 10)]),
      Line([at(1, 0), at(1, 2 / 10)]),
      Text('h', at(1 - h / 2, 2 / 10))], 'height'),
    [Black, Thickness(bwid), Annotation(Circle([0, 0], 1 + bwid), 'obstacle')],
    showStats && [Black, Annotation(Text(statsText, [0, 1 / 2]), 'stats')],
    showParticles && [PointSize(0.011), Lighter(Blue, 0.5), Annotation(Point(particles), 'particles')],
    [C(1), Thick, Annotation(Circle([0, 0], meanRadius), 'mean-path')],
    Annotation([Blue, Thickness(0.01), Arrowheads(0.05), Arrow([[0, 0], Times(1 / 2, u)]), // Arrowheads: K-SC-02
      Blue, Thin, Line([[0, 0], [1 / 3, 0]]),
      Arrowheads(0.025), arrowArc(Circle([0, 0], 1 / 4, [0, Beta])),
      Abs(Beta) > Pi / 6 && Text('β', Times(1 / 6, [Cos(Beta / 2), Sin(Beta / 2)]))], 'gravity'),
    [C(2), PointSizeLarge, Annotation(Point(mean), 'mean')],
    [C(3), Opacity(0), EdgeForm(Thick, Red), Annotation(Ellipsoid(mean, Times(4, [[varx, cov], [cov, vary]])), 'ellipse')],
  ].filter((g) => g !== false), { ImageSize: 300, PlotRange: [[-7 / 6, 7 / 6], [-7 / 6, 7 / 6]], PlotRangePadding: 0, testid: 'scene-svg', label: 'the circular workplace, the swarm under gravity β, its mean and covariance ellipse' });

  const graphics = [
    withEpilog(P.mean, 'mean-points', [PointSizeLarge, C(1), Point([Beta, x]), C(2), Point([Beta, y])]),
    withEpilog(P.correlation, 'correlation-point', [PointSizeLarge, C(6), Point([Beta, cor])]),
    withEpilog(P.covariance, 'covariance-point', [PointSizeLarge, C(5), Point([Beta, cov])]),
    workplace,
    withEpilog(P.variance, 'variance-points', [PointSizeLarge, C(4), Point([Beta, varx]), C(3), Point([Beta, vary])]),
  ];
  return {
    view: { mean, cov, varx, vary, cor, area: area(h), meanRadius, particles: particles.length, stats: showStats ? statsText.items : null, betaLabel: Abs(Beta) > Pi / 6 },
    graphics,
  };
}
