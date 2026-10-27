// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Renuka Pakeetharan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/probabilistic-motion/model.js — one evaluation of the Manipulate body of "Probabilistic Models for Robot
// Motion": the state in, { view, graphics } out (pure, no DOM). Simple mode: plain arithmetic with shared/wl.js names,
// the original's definitions in the original's order under their names; Mathematica's ==, !=, <, … on computed reals
// are Equal, Unequal, Less, … of shared/wl.js (a comparison with an exact 0 needs no tolerance: plain < and >).
import {
  Graphics, Circle, Line, Point, PointSize, Annotation, Thick, AbsoluteThickness, CapForm, Opacity, Black, White, Red,
  Green, Blue,
} from '../../shared/graphics.js';
import { DensityPlot, RegionPlot, Plot, Show } from '../../shared/plot.js';
import {
  Pi, Sin, Cos, Sqrt, Abs, Exp, ArcTan, Max, Times, Transpose, Mean, RandomVariate, TriangularDistribution,
  UniformDistribution, Equal, Unequal, Less, Greater, GreaterEqual,
} from '../../shared/wl.js';
import { createRng } from '../../shared/random.js';

// ---- the Initialization code ---------------------------------------------------------------------------------------

/** DrawRobot[x, y, θ, diam] := {Circle[{x, y}, diam/2], Line[{{x, y}, {x, y} + diam/1.5 {Cos[θ], Sin[θ]}}]}: the
 *  robot as a circle and a heading line. */
export const DrawRobot = (x, y, θ, diam) => [
  Circle([x, y], diam / 2), Line([[x, y], [x + (diam / 1.5) * Cos(θ), y + (diam / 1.5) * Sin(θ)]]),
];

/** signedAngleDist[θ1, θ2] := ArcTan[Cos[θ1 − θ2], Sin[θ1 − θ2]]: the signed angular distance θ1 − θ2, in (−π, π]. */
export const signedAngleDist = (θ1, θ2) => ArcTan(Cos(θ1 - θ2), Sin(θ1 - θ2));

/** probTriangularDistribution[a, bSq] := If[bSq > 0, Max[0, 1/Sqrt[6 bSq] − Abs[a]/(6 bSq)], If[a == 0, 1, 0]]: the
 *  density at a of the symmetric triangular distribution with variance bSq (support ±√(6 bSq)); with no variance 1 at
 *  a == 0, else 0. */
export const probTriangularDistribution = (a, bSq) => (bSq > 0
  ? Max(0, 1 / Sqrt(6 * bSq) - Abs(a) / (6 * bSq))
  : Equal(a, 0) ? 1 : 0);

/** MyTriangularDistribution[myrange] := If[myrange[[2]] > 0, TriangularDistribution[myrange],
 *  UniformDistribution[myrange]]: a zero range {0., 0.} becomes a uniform distribution that only gives 0. */
export const MyTriangularDistribution = (myrange) => (myrange[1] > 0 ? TriangularDistribution(myrange) : UniformDistribution(myrange));

/** probNormalDistribution[a, bSq] := Max[1/Sqrt[2 π bSq] E^(−a²/(2 bSq)), 0]: defined in the original, used only in a
 *  commented-out line (the models use the triangular density). */
export const probNormalDistribution = (a, bSq) => Max((1 / Sqrt(2 * Pi * bSq)) * Exp(-(a ** 2) / (2 * bSq)), 0);

/** nominalMotionModel[v, ω, x, y, θ, ΔT] → {xp, yp, θp}: the noise-free pose after ΔT — an arc about the centre of
 *  rotation when ω != 0, else straight on. */
export function nominalMotionModel(v, ω, x, y, θ, ΔT) {
  let xp, yp, θp;
  if (Unequal(ω, 0)) {
    xp = x - (v / ω) * Sin(θ) + (v / ω) * Sin(θ + ω * ΔT);
    yp = y + (v / ω) * Cos(θ) - (v / ω) * Cos(θ + ω * ΔT);
    θp = θ + ω * ΔT;
  } else { // no angular velocity, so just move straight
    xp = x + v * ΔT * Cos(θ);
    yp = y + v * ΔT * Sin(θ);
    θp = θ;
  }
  return [xp, yp, θp];
}

/**
 * motionModelVelocityNoAng[xt, ut, xtm1, Δt, α1, …, α6]: the density of arriving at xt = {xp, yp} (any final heading)
 * from the pose xtm1 = {x, y, θ} under the commands ut = {v, ω} — Probabilistic Robotics' motion_model_velocity without
 * the final-heading factor: the circle through both points tangent to the heading gives the commands (vh, ωh) that
 * reach xt, and the density is the product of the triangular densities of v − vh and ω − ωh (α5, α6 unused).
 */
export function motionModelVelocityNoAng(xt, ut, xtm1, Δt, α1, α2, α3, α4, α5, α6) { // eslint-disable-line no-unused-vars
  const [x, y, θ] = xtm1, [xp, yp] = xt, [v, ω] = ut;
  let μ, xs, ys, rs, Δθ, vh, ωh, a1, a2, speed;
  // if the new point is NOT along the original heading (should be != 0; the inequality makes the graph look better)
  if (Greater(Abs((y - yp) * Cos(θ) - (x - xp) * Sin(θ)), 0.01)) {
    // a compromise for numerical stability (should really be ∞ if the denominator is zero)
    μ = (x * Cos(θ) - xp * Cos(θ) + y * Sin(θ) - yp * Sin(θ)) / (2 * (y * Cos(θ) - yp * Cos(θ) - x * Sin(θ) + xp * Sin(θ)));
    xs = (x + xp) / 2 + μ * (y - yp); // {xs, ys} is the centre of the circle the robot follows from xtm1 to xt
    ys = (y + yp) / 2 + μ * (xp - x);
    rs = Sqrt((x - xs) ** 2 + (y - ys) ** 2); // radius of the circle
    a1 = Equal(xp - xs, 0) && Equal(yp - ys, 0) ? 0 : ArcTan(xp - xs, yp - ys);
    a2 = Equal(x - xs, 0) && Equal(0, y - ys) ? 0 : ArcTan(x - xs, y - ys);
    Δθ = signedAngleDist(a1, a2);
    // change #2: pick the Δθ that is closest to the control input ω Δt
    while (Greater(Δθ - Pi, ω * Δt)) Δθ = Δθ - 2 * Pi;
    while (Less(Δθ + Pi, ω * Δt)) Δθ = Δθ + 2 * Pi;
    vh = GreaterEqual(a2 * Cos(θ), 0) ? -(Δθ / Δt) * rs : (Δθ / Δt) * rs; // need a sign
    ωh = Δθ / Δt;
  } else { // the new point is along the original heading
    a1 = ArcTan(xp - x, yp - y); // angle of movement
    Δθ = ArcTan(Cos(a1 - θ), Sin(a1 - θ)); // signed angular difference
    speed = Sqrt((x - xp) ** 2 + (y - yp) ** 2) / Δt;
    vh = GreaterEqual(Cos(Δθ), 0) ? speed : -speed;
    ωh = 0;
  }
  return probTriangularDistribution(v - vh, α1 * v ** 2 + α2 * ω ** 2) * probTriangularDistribution(ω - ωh, α3 * v ** 2 + α4 * ω ** 2);
}

/** The noise of a sampler: RandomVariate[MyTriangularDistribution[Sqrt[bSq] {−1, 1}], n] from the source rng. */
const noise = (bSq, n, rng) => RandomVariate(MyTriangularDistribution(Times(Sqrt(bSq), [-1, 1])), n, rng);

/**
 * sampleMotionModelVelocityNsamples[ut, xtm1, ΔT, α1, …, α6, Nsamples] → Nsamples poses {x', y', θ'}: the commands
 * with triangular noise (variances α1 v² + α2 ω², α3 v² + α4 ω²), driven along their arcs, plus a final rotation γ
 * (α5 v² + α6 ω²) — Probabilistic Robotics' sample_motion_model_velocity. rng: the random source (SeedRandom).
 */
export function sampleMotionModelVelocityNsamples(ut, xtm1, ΔT, α1, α2, α3, α4, α5, α6, Nsamples, rng) {
  const [x, y, θ] = xtm1, [v, ω] = ut;
  const vh = noise(α1 * v ** 2 + α2 * ω ** 2, Nsamples, rng).map((e) => v + e);
  const ωh = noise(α3 * v ** 2 + α4 * ω ** 2, Nsamples, rng).map((e) => ω + e);
  const γh = noise(α5 * v ** 2 + α6 * ω ** 2, Nsamples, rng);
  const xp = vh.map((vi, i) => x - (vi / ωh[i]) * Sin(θ) + (vi / ωh[i]) * Sin(θ + ωh[i] * ΔT));
  const yp = vh.map((vi, i) => y + (vi / ωh[i]) * Cos(θ) - (vi / ωh[i]) * Cos(θ + ωh[i] * ΔT));
  const θp = ωh.map((wi, i) => θ + wi * ΔT + γh[i] * ΔT);
  return Transpose([xp, yp, θp]);
}

/**
 * MotionModelOdometryNoAng[xt, ut, xtm1, ΔT, α1, …, α4]: the density of arriving at xt = {xp, yp} when the odometry
 * reports the nominal motion of ut from xtm1 — Probabilistic Robotics' motion_model_odometry without the final rotation:
 * the motion is a rotation δrot1 and a translation δtrans, and the density is the product of the triangular densities
 * of the rotation's and the translation's errors (with the authors' fixes of the angle wrapping).
 */
export function MotionModelOdometryNoAng(xt, ut, xtm1, ΔT, α1, α2, α3, α4) {
  const [xb, yb] = xtm1; // old pose x_{t−1}
  const [x, y, θ] = xtm1; // old odometry x̄_{t−1}
  const [xp, yp] = xt; // the query point
  const [v, ω] = ut;
  const [xbp, ybp] = nominalMotionModel(v, ω, x, y, θ, ΔT); // new odometry x̄_t
  const δrot1 = ArcTan(xbp - x, ybp - y) - θ; // FIX #1 (not wrapped)
  const δtrans = Sqrt((xbp - xb) ** 2 + (ybp - yb) ** 2);
  const δhatrot1 = signedAngleDist(ArcTan(xp - x, yp - y), θ); // FIX #2
  const δhattrans = Sqrt((-x + xp) ** 2 + (-y + yp) ** 2);
  const p1 = probTriangularDistribution(signedAngleDist(δrot1, δhatrot1), α1 * δhatrot1 ** 2 + α2 * δhattrans ** 2); // FIX #3
  const p2 = probTriangularDistribution(δtrans - δhattrans, α3 * δhattrans ** 2 + α4 * δhatrot1 ** 2);
  return p1 * p2;
}

/**
 * sampleMotionModelOdometryNsamples[ut, xtm1, ΔT, α1, …, α4, Nsamples] → Nsamples poses: the nominal motion split into
 * rotation δrot1, translation δtrans and rotation δrot2, each with triangular noise — Probabilistic Robotics'
 * sample_motion_model_odometry (with the authors' wrapping fixes). rng: the random source (SeedRandom).
 */
export function sampleMotionModelOdometryNsamples(ut, xtm1, ΔT, α1, α2, α3, α4, Nsamples, rng) {
  const [x, y, θ] = xtm1, [v, ω] = ut;
  const [xbp, ybp, θbp] = nominalMotionModel(v, ω, x, y, θ, ΔT);
  const δrot1 = signedAngleDist(ArcTan(xbp - x, ybp - y), θ); // FIX #1
  const δtrans = Sqrt((-x + xbp) ** 2 + (-y + ybp) ** 2);
  const δrot2 = signedAngleDist(signedAngleDist(θbp, θ), δrot1); // FIX #2
  const δhatrot1 = noise(α1 * δrot1 ** 2 + α2 * δtrans ** 2, Nsamples, rng).map((e) => δrot1 + e);
  const δhattrans = noise(α3 * δtrans ** 2 + α4 * (δrot1 ** 2 + δrot2 ** 2), Nsamples, rng).map((e) => δtrans + e);
  const δhatrot2 = noise(α1 * δrot1 ** 2 + α2 * δtrans ** 2, Nsamples, rng).map((e) => δrot2 + e);
  const xp = δhattrans.map((t, i) => x + t * Cos(θ + δhatrot1[i]));
  const yp = δhattrans.map((t, i) => y + t * Sin(θ + δhatrot1[i]));
  const θp = δhatrot1.map((r1, i) => θ + r1 + δhatrot2[i]);
  return Transpose([xp, yp, θp]);
}

// ---- DensityPlot's Exclusions -> Automatic (Q-PM-01) ------------------------------------------------------------------
// Mathematica evaluates a DensityPlot's function with symbolic xx, yy to find where it may jump, and leaves white gaps
// there. motionModelVelocityNoAng gives nothing symbolic (its If on the point stays unevaluated and the result does not
// depend on xx, yy), so the VelocityPDF picture has no gaps; MotionModelOdometryNoAng gives p1 p2 with symbolic If, Max,
// Abs and ArcTan, and its picture has gaps along the curves below (found in the snapshot of the OdometryPDF mode,
// N-PM-03). The port draws them as white bands of constant width over the density; Mathematica's gaps follow its
// adaptive mesh (D-PM-03).

/** The width of the gaps: about 0.1 plot units as in the snapshot (6.5 px at the picture's nominal size). */
export const GAP_THICKNESS = AbsoluteThickness(6.5);

/**
 * odometryExclusions[ut, xtm1, ΔT, α1, …, α4] → { start, rays, radius, supports }: the curves along which Mathematica's
 * DensityPlot of MotionModelOdometryNoAng leaves gaps (the start {x, y} = xtm1):
 *   the branch cut of ArcTan[xp − x, yp − y]                      the ray from the start at angle π;
 *   the branch cut of δhatrot1 = signedAngleDist[…, θ]            the ray at θ + π;
 *   the branch cut of signedAngleDist[δrot1, δhatrot1]            the ray at θ + δrot1 + π;
 *   p1's If[a == 0, …] and Abs[a]: signedAngleDist[…] == 0       the ray at θ + δrot1 (through the nominal end);
 *   p2's If[a == 0, …] and Abs[a]: δtrans − δhattrans == 0       the circle of radius δtrans about the start;
 *   p1's and p2's Max[0, …]: |a| == √(6 bSq)                      where each triangular density's support ends:
 *     supports[k](X, Y) < 0 inside it; null when that bSq is 0 (both α's 0: the If is decided, no Max).
 * The boundaries of bSq > 0 (bSq == 0) are single points or curves without a sign change, which Mathematica does not
 * trace.
 */
export function odometryExclusions(ut, xtm1, ΔT, α1, α2, α3, α4) {
  const [x, y, θ] = xtm1, [v, ω] = ut;
  const [xbp, ybp] = nominalMotionModel(v, ω, x, y, θ, ΔT);
  const δrot1 = ArcTan(xbp - x, ybp - y) - θ, δtrans = Sqrt((xbp - x) ** 2 + (ybp - y) ** 2);
  const δhatrot1 = (X, Y) => signedAngleDist(ArcTan(X - x, Y - y), θ), δhattrans = (X, Y) => Sqrt((X - x) ** 2 + (Y - y) ** 2);
  const support1 = (X, Y) => Abs(signedAngleDist(δrot1, δhatrot1(X, Y))) - Sqrt(6 * (α1 * δhatrot1(X, Y) ** 2 + α2 * δhattrans(X, Y) ** 2));
  const support2 = (X, Y) => Abs(δtrans - δhattrans(X, Y)) - Sqrt(6 * (α3 * δhattrans(X, Y) ** 2 + α4 * δhatrot1(X, Y) ** 2));
  return {
    start: [x, y], rays: [Pi, θ + Pi, θ + δrot1 + Pi, θ + δrot1], radius: δtrans,
    supports: [α1 > 0 || α2 > 0 ? support1 : null, α3 > 0 || α4 > 0 ? support2 : null],
  };
}

/** The gaps as Graphics: white bands over the density (Mathematica's holes show the white background), the support
 *  boundaries traced as RegionPlot boundaries (PlotRangeClipping cuts everything at the plot range). */
export function exclusionGaps({ start: [x, y], rays, radius, supports }, [[x0, x1], [y0, y1]]) {
  const L = 2 * Math.hypot(x1 - x0, y1 - y0); // a ray beyond the plot range
  return Graphics([White, GAP_THICKNESS, CapForm('Butt'),
    Annotation(rays.map((ψ) => Line([[x, y], [x + L * Cos(ψ), y + L * Sin(ψ)]])), 'gap-cuts'),
    Annotation(Circle([x, y], radius), 'gap-circle'),
    supports.map((g, k) => g && Annotation(RegionPlot((X, Y) => g(X, Y) < 0, [x0, x1], [y0, y1],
      { PlotStyle: Opacity(0), BoundaryStyle: [White, GAP_THICKNESS] }).list, `gap-support-${k + 1}`)),
  ]);
}

// ---- the Manipulate variables ----------------------------------------------------------------------------------------

/** The four modes of the PopupMenu. */
export const MODES = Object.freeze(['VelocityPDF', 'VelocitySample', 'OdometryPDF', 'OdometrySample']);
/** The Manipulate's own initial values (its stored "Variables"); the notebook's saved live state is the same. */
export const SPECS = Object.freeze({ mode: 'VelocityPDF', θ: 0, v: 2, ω: 1.57, α1: 0.02, α2: 0.02, α3: 0.02, α4: 0.02, α5: 0.02, α6: 0.02 });
export const SAVED = SPECS;
export const initialState = () => ({ ...SAVED });

// ---- the body ---------------------------------------------------------------------------------------------------------

/** The picture's size: ImageSize -> 1.1 {400, 400}. */
export const IMAGE_SIZE = [1.1 * 400, 1.1 * 400];

/** One evaluation of the Manipulate body (pure): the state in, { view, graphics } out. */
export function evaluate(state) {
  const { mode, θ, v, ω, α1, α2, α3, α4, α5, α6 } = state;
  const ΔT = 1, numSamples = 500, x = 0, y = 0, diam = 1;
  const pr3 = [[-3, 3], [-3, 3], 'All'], pr2 = [[-3, 3], [-3, 3]];
  const rng = createRng({ seed: 1 }); // SeedRandom[1]: make samples repeatable (D-PM-01: other numbers than Mathematica's)
  const densityOptions = { PlotRange: pr3, MaxRecursion: 5, ColorFunctionScaling: false, PerformanceGoal: 'Quality' };
  // Show[Plot[Null, {xx, −3, 3}, …], Graphics[{Blue, robots}, PlotRange -> pr2]]: an empty framed plot with the samples
  const sampled = (robotSamples) => Show(
    Plot(() => null, [-3, 3], { PlotRange: pr2, Frame: [true, true, false, false], AspectRatio: 1, AxesOrigin: [-3, -3] }),
    Graphics([Annotation([Blue, robotSamples.filter((p) => p.every(Number.isFinite)) // D-PM-04: undefined samples
      .map(([sx, sy, sθ]) => DrawRobot(sx, sy, sθ, diam / 15))], 'samples')], { PlotRange: pr2 }),
  );
  let first, robotSamples = null, exclusions = null;
  if (mode === 'VelocityPDF') {
    first = DensityPlot((xx, yy) => motionModelVelocityNoAng([xx, yy], [v, ω], [x, y, θ], ΔT, α1, α2, α3, α4, α5, α6), [-3, 3], [-3, 3], densityOptions);
  } else if (mode === 'VelocitySample') {
    robotSamples = sampleMotionModelVelocityNsamples([v, ω], [x, y, θ], ΔT, α1, α2, α3, α4, α5, α6, numSamples, rng);
    first = sampled(robotSamples);
  } else if (mode === 'OdometryPDF') {
    first = DensityPlot((xx, yy) => MotionModelOdometryNoAng([xx, yy], [v, ω], [x, y, θ], ΔT, α1, α2, α3, α4), [-3, 3], [-3, 3], densityOptions);
    exclusions = odometryExclusions([v, ω], [x, y, θ], ΔT, α1, α2, α3, α4);
    first = Show(first, exclusionGaps(exclusions, pr2));
  } else if (mode === 'OdometrySample') {
    robotSamples = sampleMotionModelOdometryNsamples([v, ω], [x, y, θ], ΔT, α1, α2, α3, α4, numSamples, rng);
    first = sampled(robotSamples);
  }

  // the second Graphics: the initial pose (green), the nominal path and the default final pose (red). In the original
  // the assignment {xp, yp, θp} = nominalMotionModel[…] stands in the Graphics list (its value draws nothing, N-PM-02).
  const [xp, yp, θp0] = nominalMotionModel(v, ω, x, y, θ, ΔT);
  let θp = θp0;
  let path = null;
  if (mode === 'VelocityPDF' || mode === 'VelocitySample') {
    if (Unequal(ω, 0)) {
      const r = Abs(v / ω); // radius of the robot's path
      const xc = x - (v / ω) * Sin(θ), yc = y + (v / ω) * Cos(θ); // the point the robot turns around: centre of rotation
      const offset = v / ω > 0 ? -Pi / 2 : (-3 * Pi) / 2;
      const arc = [θ + offset, θ + offset + ω * ΔT];
      path = Annotation([
        Line([[x, y], [xc, yc], [xp, yp]]), PointSize('Large'), Point([xc, yc]),
        Circle([xc, yc], r + diam / 2, arc), r - diam / 2 >= 0 && Circle([xc, yc], Abs(r - diam / 2), arc),
      ], 'velocity-path');
    }
  } else { // odometry: the direction of the translation, the first rotation (green) and the second (red)
    const toEnd = ArcTan(xp - x, yp - y);
    let α = toEnd;
    if (ω > 0 && Less(α, θ)) α = α + 2 * Pi;
    if (ω < 0 && Greater(α, θ)) α = α - 2 * Pi;
    if (ω > 0 && Less(θp, α)) θp = θp + 2 * Pi;
    if (ω < 0 && Greater(θp, α)) θp = θp - 2 * Pi;
    path = Annotation([
      Black, Line([[x, y], [xp + 0.7 * diam * Cos(toEnd), yp + 0.7 * diam * Sin(toEnd)]]),
      Green, Circle([x, y], 0.6 * diam, [θ, α]), // fix sign issue according to ω ΔT
      Red, Circle([xp, yp], 0.6 * diam, [α, θp]),
    ], 'odometry-path');
  }
  const overlay = Graphics([
    Annotation([Thick, Green, DrawRobot(x, y, θ, diam)], 'robot-start'), // initial position
    path,
    Annotation([Thick, Red, DrawRobot(xp, yp, θp, diam)], 'robot-end'), // default ending position
  ].filter(Boolean));
  const shown = Show(first, overlay);
  const graphics = Graphics(shown.list, { ...shown.options, ImageSize: IMAGE_SIZE });
  return {
    view: {
      mode, nominal: [xp, yp, θp0],
      samples: robotSamples && { count: robotSamples.length, mean: Mean(robotSamples) },
      exclusions: exclusions && { rays: exclusions.rays, radius: exclusions.radius, supports: exclusions.supports.map(Boolean) },
    },
    graphics,
  };
}
