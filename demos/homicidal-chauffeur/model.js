// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Javier Garcia
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/homicidal-chauffeur/model.js — one evaluation of the Manipulate body of "The Homicidal Chauffeur Problem": the
// state in, { state, view, graphics } out (pure, no DOM). Simple mode: plain arithmetic, the original's definitions in
// the original's order; the body's assignments to Manipulate variables are returned in `state`.
import {
  Graphics, Line, Polygon, Rectangle, Disk, Circle, Arrow, Text, Style, Rotate, Translate, Annotation,
  Black, Blue, LightBlue, Red, Gray, Yellow, Darker, EdgeForm, Directive, Opacity, Thick, Dashed, Arrowheads, None,
  AbsoluteThickness,
} from '../../shared/graphics.js';
import {
  Pi, Cos, Sin, Sqrt, Abs, Sign, Max, ArcTan, Mod, Round, Ceiling, Chop, Plus, Times,
  Equal, Unequal, Less, Greater, LessEqual,
} from '../../shared/wl.js';

/** Graphics[…, PlotRange -> {{-15, 15}, {-9, 12}}, ImageSize -> {600, 400}]: Mathematica fits the 30 × 21 plot range
 *  into 600 × 400 px, i.e. 571.4 × 400 (AspectRatio -> Automatic), without plot-range padding (measured, N-HC-03). */
export const PLOT_RANGE = [[-15, 15], [-9, 12]];
export const IMAGE_SIZE = (400 * 30) / 21;

/** Clock[vmax, dt]: Mathematica's clock that cycles from 0 to vmax every dt seconds, read at `time` (seconds of the page
 *  clock, the body's AbsoluteTime[]; the phase is the page clock's, N-HC-01). */
export const Clock = (vmax, dt, time) => (vmax * Mod(time, dt)) / dt;

/**
 * The locators' look: the Graphics of `Locator[#, Graphics[{Black, {AbsoluteThickness[1], LineBox[cross hairs from 2 to
 * 10], CircleBox[{-0.5, 0.5}, 5]}, {AbsoluteThickness[3], Opacity[0.3], CircleBox[{-0.5, 0.5}, 3]}}, ImageSize -> 17,
 * PlotRange -> {{-8, 8}, {-8, 8}}]] & /@ loc` (Mathematica's default locator) around the point, in picture units: one
 * unit of that 17 px picture is 17/16 px, IMAGE_SIZE px span the 30 units of the plot range; the hairs end at its plot
 * range (8), the circles are centred on the point (the original's half-pixel offset aligns them to its raster, N-HC-04).
 */
const u = (17 / 16) * (30 / IMAGE_SIZE); // one unit of the locator's 17 px picture, in picture units
export const LOCATOR_LOOK = Object.freeze([Black,
  [AbsoluteThickness(1), Line([[[0, -8 * u], [0, -2 * u]], [[0, 2 * u], [0, 8 * u]], [[-8 * u, 0], [-2 * u, 0]], [[2 * u, 0], [8 * u, 0]]]), Circle([0, 0], 5 * u)],
  [AbsoluteThickness(3), Opacity(0.3), Circle([0, 0], 3 * u)],
]);

// ---- the Initialization code ---------------------------------------------------------------------------------------

/** drawRunner[xy, θ, isRunning]: a top-down view of a running person whose arms swing (Clock[1, .3]) while isRunning:
 *  arms, shoulders Rectangle[{-.1, -.5}, {.1, .5}] and the head Disk[{0, 0}, {.3, .25}], turned to θ and moved to xy. */
export function drawRunner(xy, Theta, isRunning, time) {
  const arms = () => { const s = 0.65 * 2 * (Clock(1, 0.3, time) - 0.5); return [Rectangle([0, -0.4], [s, -0.1]), Rectangle([0, 0.4], [-s, 0.1])]; };
  return Translate(Rotate([EdgeForm(Darker(Blue)),
    [isRunning && arms()],
    Rectangle([-0.1, -0.5], [0.1, 0.5]),
    Disk([0, 0], [0.3, 0.25]),
  ], Theta, [0, 0]), xy);
}

/** drawCar[xy, θ, α, opac]: a car icon, xy the middle of the rear axle, θ its orientation, α the wheels' orientation, opac
 *  its opacity — body Rectangle[{-1, -1/2}, {1, 1/2}] moved by {0.7, 0} (so −0.3 … 1.7 along the car), two yellow
 *  headlight beams, axles, four wheels and a black arrow. */
export function drawCar(xy, Theta, Alpha, opac) {
  return [Opacity(opac), EdgeForm(Directive(Opacity(opac), Black)), Translate(Rotate(Translate([
    Rectangle([-1, -1 / 2], [1, 1 / 2]),
    Darker(Gray),
    [Yellow, Opacity(0.8 * opac), EdgeForm(None), Polygon([[1, 0.35], [8, 0.05], [8, 0.55]]), Polygon([[1, -0.35], [8, -0.05], [8, -0.55]])],
    Line([[-0.7, 0.35], [-0.7, -0.35]]), Line([[0.7, 0.35], [0.7, -0.35]]),
    Rotate(Rectangle([0.5, 0.35], [0.9, 0.4]), Equal(Alpha, 0) ? 0 : ArcTan(Alpha - 0.375, 1.4), [0.7, 0.375]),
    Rectangle([-0.5, 0.35], [-0.9, 0.4]),
    Rectangle([-0.5, -0.35], [-0.9, -0.4]),
    Rotate(Rectangle([0.5, -0.35], [0.9, -0.4]), Equal(Alpha, 0) ? 0 : ArcTan(Alpha + 0.375, 1.4), [0.7, -0.375]),
    Black, Arrowheads(0.02), Arrow([[0, 0], [1.0, 0]]),
  ], [0.7, 0]), Theta, [0, 0]), xy)];
}

/** ptInCar[xy, θ, pt]: whether pt lies in the car's rectangle, −.3 ≤ x ≤ 1.7 and −.5 ≤ y ≤ .5 in the car's frame (the
 *  original turns by θ − φ, which flips y — harmless, the rectangle is symmetric: E-HC-02). */
export function ptInCar(xy, Theta, pt) {
  const Phi = angPt2Pt(xy, pt), d = distPt2Pt(xy, pt);
  const ptCarRef = [d * Cos(Theta - Phi), d * Sin(Theta - Phi)];
  return LessEqual(-0.3, ptCarRef[0]) && LessEqual(ptCarRef[0], 1.7) && LessEqual(-0.5, ptCarRef[1]) && LessEqual(ptCarRef[1], 0.5);
}

/** distPt2Pt[ps, pe]: the Euclidean distance between 2D points, Sqrt[(pe1 − ps1)² + (pe2 − ps2)²], with Math.hypot (no
 *  underflow of tiny differences, as Mathematica's arbitrary-precision fallback; N-HC-07). */
export const distPt2Pt = (ps, pe) => Math.hypot(pe[0] - ps[0], pe[1] - ps[1]);

/** angPt2Pt[ps, pe] = Chop[N[ArcTan[pe1 − ps1, pe2 − ps2]]]: the direction from ps to pe (ArcTan[0, 0] is 0 here, D-HC-01). */
export const angPt2Pt = (ps, pe) => Chop(ArcTan(pe[0] - ps[0], pe[1] - ps[1]));

/** mod2pi[θ] = ArcTan[Cos[θ], Sin[θ]]: the angle in (−π, π]. */
export const mod2pi = (Theta) => ArcTan(Cos(Theta), Sin(Theta));

/** mod0to2pi[θ]: the angle in [0, 2π). */
export function mod0to2pi(Theta) {
  let ang = ArcTan(Cos(Theta), Sin(Theta));
  if (ang < 0) ang += 2 * Pi;
  return ang;
}

// ---- text forms ------------------------------------------------------------------------------------------------------

/** StringForm["… `` …", e1, …]: the template with each `` replaced by the next argument. */
export const StringForm = (template, ...xs) => { let i = 0; return template.replace(/``/g, () => String(xs[i++])); };

/**
 * NumberForm[x, {n, f}, NumberPadding -> {left, right}] as the snapshots show the running time: f decimals, the left
 * padding up to n − f digits before the point plus room for the sign, the right padding up to f decimals
 * (" 23.8", "  6.2", "  0.0", " 10.7"). With more than n − f digits before the point the n digits of precision win
 * (123.45 → " 123.0"): our reading of NumberForm, not seen in a snapshot (N-HC-05).
 */
export function NumberForm(x, [n, f], { NumberPadding: [left, right] = ['', ''] } = {}) {
  const a = Math.abs(x);
  let [ip, fp = ''] = a.toFixed(f).split('.');
  if (ip.length > n - f) { ip = String(Math.round(Number(a.toPrecision(n)))); fp = ''; }
  return `${left.repeat(Math.max(0, n - f - ip.length))}${x < 0 ? '-' : left}${ip}.${fp.padEnd(f, right)}`;
}

// ---- the Manipulate variables ----------------------------------------------------------------------------------------

/** The state saved in the notebook's output cell (what the published Demonstration shows), equal to the Manipulate's
 *  stored initial values (what Initial Settings restores): setup, the pedestrian at {-2, 0}, the car at {2, 2} heading
 *  0.6 with its handle 2 units ahead; the times are those of the notebook's last evaluation (2018). */
export const SAVED = Object.freeze({
  minRadius: 3, runner: [-2, 0], vcar: 2, state: 'setup', stateP: 'setup',
  timer: 3725285449.98407, runPath: [], carPath: [],
  loc: [[-2, 0], [2, 2], [3.6506712298193564, 3.1292849467900705]],
  carXYold: [2, 2], carθ: 0.6, lastTime: 3725285449.986006,
});
export const initialState = () => structuredClone({ ...SAVED });

/** The body keeps evaluating itself while running (it moves the pedestrian and the car and appends to the paths every
 *  time) and once more after a change of mode it made itself (a hit: running → Collision puts the locator on the
 *  pedestrian). */
export const settles = (s) => s.state === 'running' || s.stateP !== s.state;

// ---- the body ---------------------------------------------------------------------------------------------------------

/** the orientation handle: 2 units ahead of the car */
const handleOf = (xy, Theta) => Plus(xy, Times(2, [Cos(Theta), Sin(Theta)]));

/**
 * One evaluation of the Manipulate body. opts: time (AbsoluteTime[] of this evaluation, seconds; without it the clock
 * stands at lastTime, so that dt is the minimum 0.01).
 */
export function evaluate(state, { time } = {}) {
  const s = { ...state };
  const now = time ?? s.lastTime; // AbsoluteTime[]
  let dt = null, dTheta = null, omega = null, goalTheta = null, Alpha = null, branch = null, cTime;
  if (s.state === 'Collision') s.loc = [s.runner];
  if (s.stateP !== s.state) {
    if (s.state === 'running') { s.runPath = []; s.carPath = []; s.loc = [s.runner]; s.timer = now; }
    if (s.state === 'setup') s.loc = [s.runner, s.carXYold, handleOf(s.carXYold, s.carθ)];
    s.stateP = s.state;
  }
  if (s.state === 'setup') {
    if (s.loc.length < 2) s.loc = [s.runner, s.carXYold, handleOf(s.carXYold, s.carθ)];
    s.runner = s.loc[0];
    if (Unequal(s.carXYold, s.loc[1])) s.carXYold = s.loc[1];
    else { // otherwise, let 3rd locator change orientation of car
      dTheta = Sqrt((s.loc[2][0] - s.carXYold[0]) ** 2 + (s.loc[2][1] - s.carXYold[1]) ** 2);
      s.carθ = dTheta > 0 ? ArcTan(s.loc[2][0] - s.carXYold[0], s.loc[2][1] - s.carXYold[1]) : 0;
    }
    const h = handleOf(s.carXYold, s.carθ);
    if (Unequal(s.loc[2], h)) s.loc = [s.loc[0], s.loc[1], h, ...s.loc.slice(3)];
  }
  const ceL = Plus(s.carXYold, Times(s.minRadius, [Cos(s.carθ + Pi / 2), Sin(s.carθ + Pi / 2)]));
  const ceR = Plus(s.carXYold, Times(s.minRadius, [Cos(s.carθ - Pi / 2), Sin(s.carθ - Pi / 2)]));
  const rundist = distPt2Pt(s.loc[0], s.runner);
  const runnerTheta = s.state === 'running' && Unequal(s.loc[0], s.runner) ? ArcTan(s.loc[0][0] - s.runner[0], s.loc[0][1] - s.runner[1]) : 0;
  if (s.state === 'running') {
    cTime = now; dt = cTime - s.lastTime; if (Less(dt, 0.01)) dt = 0.01; s.lastTime = cTime;
    // apply control to runner, which is provided by the player
    s.runner = Plus(s.runner, Times(Less(rundist, dt) ? rundist : dt, [Cos(runnerTheta), Sin(runnerTheta)]));
    // simple controller for pursuer (chauffeur)
    goalTheta = mod2pi(angPt2Pt(s.carXYold, s.runner) - s.carθ); // shortest angle from car heading to runner
    Alpha = mod0to2pi(goalTheta < 0 // the runner is in the right plane of the car
      ? angPt2Pt(ceR, s.carXYold) - angPt2Pt(ceR, s.runner)
      : angPt2Pt(ceL, s.runner) - angPt2Pt(ceL, s.carXYold));
    const r = s.minRadius, v = s.vcar;
    if (LessEqual((Abs(Alpha * r) - ArcTan(2.5 / r) * r) / v, Max(distPt2Pt(goalTheta < 0 ? ceR : ceL, s.runner) - r, 0) / 1)) {
      branch = 'toward'; // turn toward evader until straight path exists to evader
      omega = Greater(Abs(goalTheta), (v * dt) / r) ? Sign(goalTheta) : (goalTheta * r) / (v * dt);
    } else {
      branch = 'away'; // else, turn away from evader until pointing straight away
      omega = Greater(Pi - Abs(goalTheta), (v * dt) / r) ? -Sign(goalTheta) : (-Sign(goalTheta) * ((Pi - Abs(goalTheta)) * r)) / (v * dt);
    }
    s.runPath = [...s.runPath, s.runner];
    if (Greater(cTime - s.timer, 3)) { // runner gets 3 second head start
      s.carθ += (omega * v * dt) / r;
      s.carXYold = Plus(s.carXYold, Times(dt * v, [Cos(s.carθ), Sin(s.carθ)]));
      s.carPath = [...s.carPath, s.carXYold];
    }
  } else cTime = s.lastTime;

  // ---- the picture (Graphics[{…}] in the original's order)
  const isRunning = s.state === 'running' && rundist > 0;
  const countdown = s.state === 'running' && Less(cTime - s.timer, 3) ? Ceiling(3 + s.timer - cTime) : null;
  const hit = ptInCar(s.carXYold, s.carθ, s.runner);
  let sText;
  if (hit) {
    if (s.state === 'running') s.state = 'Collision';
    sText = 'pedestrian hit!';
  } else sText = 'pedestrian missed.';
  const runningTime = StringForm('running time `` s', NumberForm(Round(cTime - s.timer, 0.01), [3, 1], { NumberPadding: [' ', '0'] }));
  // the locators (Locator[#, Graphics[…]] & /@ loc) are drawn by the Manipulate layer at loc with LOCATOR_LOOK (N-HC-04)
  const graphics = Graphics([
    Blue, Annotation([Thick, Line(s.runPath)], 'run-path'),
    countdown !== null && Annotation(Text(Style(countdown, 24), [0, 5]), 'countdown'),
    Annotation([LightBlue, drawRunner(s.runner, runnerTheta, isRunning, now)], 'runner'),
    Red, Annotation([Thick, Line(s.carPath)], 'car-path'), Annotation(drawCar(s.carXYold, s.carθ, 0, 1), 'car'),
    Annotation([Gray, Dashed, Circle(ceL, s.minRadius), Circle(ceR, s.minRadius)], 'turn-circles'),
    Annotation([Black, Text(Style(sText, 20), [0, 8.5])], 'status'),
    // NumberForm's padding spaces kept: white-space on the <text> itself (SVG collapses spaces; N-HC-05)
    [Black, Annotation(Text(Style(runningTime, 20), [-4, -8.5], [-1, 0]), 'running-time', { style: 'white-space:pre' })],
  ], { PlotRange: PLOT_RANGE, ImageSize: [600, 400], PlotRangePadding: 0 }); // the layer fits the range into 600 × 400 (IMAGE_SIZE wide)
  return {
    state: s,
    view: {
      state: s.state, runner: s.runner, runnerθ: runnerTheta, rundist, isRunning, car: s.carXYold, carθ: s.carθ, ceL, ceR,
      dt, goalTheta, Alpha, omega, branch, hit, sText, countdown, runningTime,
      runPathLength: s.runPath.length, carPathLength: s.carPath.length, locators: s.loc.length,
    },
    graphics,
  };
}
