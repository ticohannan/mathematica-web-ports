// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Javier Garcia
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/steering-rc-cars/model.js — one evaluation of the Manipulate body of "Steering Multiple Radio Control (RC) Cars
// with One Joystick": the state in, { state, view, graphics } out (pure, no DOM). Simple mode: plain arithmetic, the
// original's definitions in the original's order; the body's assignments to Manipulate variables are returned in `state`.
import {
  Graphics, Line, Polygon, Rectangle, Disk, Point, Arrow, Text, Style, Rotate, Translate, Annotation,
  Black, White, Gray, Red, Green, Blue, Darker, EdgeForm, Opacity, Thick,
} from '../../shared/graphics.js';
import { ColorData } from '../../shared/plot.js';
import { Pi, Cos, Sin, Sqrt, Tan, ArcTan, RandomReal, RotationMatrix, Dot } from '../../shared/wl.js';
import { mUnequal } from '../../shared/mma.js';

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const scale = (k, a) => [k * a[0], k * a[1]];
const dir = (t) => [Cos(t), Sin(t)];
const Cot = (x) => 1 / Tan(x), Csc = (x) => 1 / Sin(x);

// ---- the Initialization code ---------------------------------------------------------------------------------------

/** collisionRadius[θ1, θ2, r] = 2r / Sqrt[2 − 2 Cos[θ1 − θ2]]: the radius of the disk where two robots of radius r meet. */
export const collisionRadius = (t1, t2, r) => (2 * r) / Sqrt(2 - 2 * Cos(t1 - t2));

/** collisionDelta[θ1, θ2, p1, p2] = p2 − {{1/2, −1/2 Cot[(θ1 − θ2)/2]}, {1/2 Cot[(θ1 − θ2)/2], 1/2}}.(p2 − p1): where the
 *  two robots meet (setup). */
export function collisionDelta(t1, t2, p1, p2) {
  const c = Cot((t1 - t2) / 2);
  return sub(p2, Dot([[1 / 2, (-1 / 2) * c], [(1 / 2) * c, 1 / 2]], sub(p2, p1)));
}

/** collisionDelta[θref, θ1, θ2, pref, p1, p2] = pref − RotationMatrix[θref].M.(p2 − p1), M = Inverse[RotationMatrix[θ2] −
 *  RotationMatrix[θ1]] as the original's FullSimplify wrote it: where the reference robot must be for the two to meet
 *  (running). */
export function collisionDeltaRef(tref, t1, t2, pref, p1, p2) {
  const cs = Csc((t1 - t2) / 2), sp = Sin((t1 + t2) / 2), cp = Cos((t1 + t2) / 2);
  const M = [[(1 / 2) * cs * sp, (-1 / 2) * cp * cs], [(1 / 2) * cp * cs, (1 / 2) * cs * sp]];
  return sub(pref, Dot(RotationMatrix(tref), Dot(M, sub(p2, p1))));
}

/** distPt2Pt[ps, pe]: the Euclidean distance between 2D points, Sqrt[(pe1 − ps1)² + (pe2 − ps2)²]. Math.hypot does not
 *  underflow for tiny differences (Mathematica switches to arbitrary precision there): with the plain formula a runner
 *  1e-163 from the joystick at the origin would have distance 0, never arrive and keep the body evaluating (N-SR-06). */
export const distPt2Pt = (ps, pe) => Math.hypot(pe[0] - ps[0], pe[1] - ps[1]);

/** drawRC[ps, r, orient, col]: an RC car — axles, four wheels, body, spoilers, cockpit; Rotate about its bounding box's
 *  centre (Mathematica's Rotate without a point), then Translate to ps. */
export function drawRC(ps, r, orient, col) {
  const R = (x, y) => [r * x, r * y];
  return Translate(Rotate([
    Darker(Gray), Rectangle(R(-0.58, -0.4), R(-0.52, 0.4)),
    Rectangle(R(0.58, -0.4), R(0.52, 0.4)),
    Darker(Gray, 0.5),
    Rectangle(R(-0.8, -0.6), R(-0.3, -0.3), { RoundingRadius: r * 0.05 }),
    Rectangle(R(-0.8, 0.6), R(-0.3, 0.3), { RoundingRadius: r * 0.05 }),
    Rectangle(R(0.8, -0.45), R(0.3, -0.2), { RoundingRadius: r * 0.05 }),
    Rectangle(R(0.8, 0.45), R(0.3, 0.2), { RoundingRadius: r * 0.05 }),
    [col,
      [Darker(col), Rectangle(R(0.85, -0.4), R(0.95, 0.4))],
      Rectangle(R(-0.9, -0.15), R(1, 0.15), { RoundingRadius: r * 0.4 }),
      Polygon([[-0.7, -0.25], [-0.7, 0.25], [0, 0.25], [0.5, 0], [0, -0.25]].map(([x, y]) => R(x, y))),
      [Darker(col), Rectangle(R(-0.9, -0.52), R(-0.6, 0.52))],
      Rectangle(R(-0.95, -0.55), R(-0.55, -0.5), { RoundingRadius: r * 0.1 }),
      Rectangle(R(-0.95, 0.55), R(-0.55, 0.5), { RoundingRadius: r * 0.1 }),
    ],
    Black,
    Rectangle(R(-0.4, -0.15), R(0.1, 0.15), { RoundingRadius: r * 0.2 }),
    col, Rectangle(R(-0.25, -0.18), R(-0.2, 0.18)),
  ], orient), ps);
}

/** drawCell[ps, r, θ, orient]: a Tetrahymena pyriformis cell — a green rounded body turned to orient, and a red/white
 *  marker turned to θ (the field direction). */
export function drawCell(ps, r, Theta, orient) {
  return Translate([EdgeForm(Black),
    Rotate([Darker(Green), EdgeForm(Black),
      Rectangle([-r, -0.4 * r], [r, 0.4 * r], { RoundingRadius: r }),
      Green, Disk([0, 0], 0.35 * r)], orient),
    Rotate([Red, Polygon([[0, -0.1], [-0.3, 0], [0, 0.1]].map((p) => scale(r, p))),
      White, Polygon([[0, -0.1], [0.3, 0], [0, 0.1]].map((p) => scale(r, p)))], Theta),
  ], ps);
}

/** drawParticle[ps, r, θ]: a catalytic Janus particle — a red disk with its green half on the side θ − π/2 … θ + π/2. */
export const drawParticle = (ps, r, Theta) => [EdgeForm(Black), Red, Disk(ps, r), Green, Disk(ps, r, [Theta - Pi / 2, Theta + Pi / 2])];

/** drawRobot[robot, ps, r, θ, orient, col]: the Piecewise choice of the three pictures. */
export const drawRobot = (robot, ps, r, Theta, orient, col) => (robot === 'RC car' ? drawRC(ps, r, orient, col)
  : robot === 'particle' ? drawParticle(ps, r, Theta) : drawCell(ps, r, Theta, orient));

// ---- the Manipulate variables ----------------------------------------------------------------------------------------

/** The Manipulate's own initial values (its stored "Variables", what Initial Settings restores): n = 4 but nold = 5, so
 *  that the first evaluation draws new random robots. */
export const SPECS = Object.freeze({
  n: 4, nold: 5, rad: 0.143,
  ps: [[-0.8918765953759862, 0.6169193243358966], [0.34777693488663797, 0.3255428947729371], [0.751651502181407, -0.4152297594519414], [-0.3833976323749506, 0.20207908524993368], [0.3254451756780816, -0.5956594371762316]],
  psold: [[0.20810528746341372, 0.6241792655587695], [0.3647022891299567, 0.7123508360127975], [0.1972659773201917, 0.8012429661456713], [-0.8110808722422274, -0.8052688349462285], [-0.3737666037461156, 0.5835168434884412]],
  pθs: [0, 0],
  loc: [[-4, 2], [2, 2], [4, 0]],
  θs: [1.0032674265603987, 5.471295791582701, 4.194778420491389, 3.0085164160663336, 0.6513602951287174],
  runnerθ: 0, mode: 'setup', modeP: '', runPath: [], runner: [-2, 0], robot: 'RC car', range: 1, offset: [0, 0],
  lastTime: 3729349688.282855,
});

/** The state saved in the notebook's output cell (what the published Demonstration shows): four RC cars in setup. */
export const SAVED = Object.freeze({
  n: 4, nold: 4, rad: 0.143,
  ps: [[-0.5884292921671261, -0.5744400917723027], [-0.27571043015089014, -0.11691138797407552], [-0.0017604440227372287, 0.8111938117152859], [-0.4548539823984563, 0.827828183685845]],
  psold: [[-0.5884292921671261, -0.5744400917723027], [-0.27571043015089014, -0.11691138797407552], [-0.0017604440227372287, 0.8111938117152859], [-0.4548539823984563, 0.827828183685845]],
  pθs: [[-0.7997356511027366, -0.6548895956450735], [-0.4623205784418142, -0.24457952242758485], [-0.15953771952021673, 0.973146988086089], [-0.43722003153804456, 0.6024140231345332]],
  loc: [[-0.5884292921671261, -0.5744400917723027], [-0.27571043015089014, -0.11691138797407552], [-0.0017604440227372287, 0.8111938117152859], [-0.4548539823984563, 0.827828183685845],
    [-0.7997356511027366, -0.6548895956450735], [-0.4623205784418142, -0.24457952242758488], [-0.15953771952021673, 0.973146988086089], [-0.43722003153804456, 0.6024140231345332]],
  θs: [-2.777812729604893, -2.541588042582261, 2.343134541009599, -1.4927262078906343],
  runnerθ: 0, mode: 'setup', modeP: 'setup', runPath: [], runner: [-2, 0], robot: 'RC car', range: 1, offset: [0, 0],
  lastTime: 3729349688.282855,
});
export const initialState = () => structuredClone({ ...SAVED });
export const initialSettings = () => structuredClone({ ...SPECS });

/** The body keeps evaluating itself while it moves the runner (it writes runner and runPath): running and loc != runner. */
export const settles = (s) => s.mode === 'running' && mUnequal(s.loc, s.runner);

// ---- the body ---------------------------------------------------------------------------------------------------------

/** pθs: the orientation handles at distance k·rad from the robots in their headings. */
const handles = (ps, θs, n, k) => Array.from({ length: n }, (_, i) => add(ps[i], scale(k, dir(θs[i]))));

/**
 * One evaluation of the Manipulate body. opts: rng (RandomReal source, for new robots when n changes) and time
 * (AbsoluteTime[] of this evaluation, seconds; without it dt is the minimum 0.01).
 */
export function evaluate(state, { rng, time } = {}) {
  const s = structuredClone(state);
  const { n } = s;
  // perms: the unique pairs {i, j}, i < j
  const perms = [];
  for (let i = 1; i <= n - 1; i++) for (let j = i + 1; j <= n; j++) perms.push([i, j]);
  if (s.modeP !== s.mode) {
    if (s.mode === 'running') { s.loc = s.ps[0]; s.runner = s.loc; s.runnerθ = s.θs[0]; }
    if (s.mode === 'setup') {
      const d = distPt2Pt(s.ps[0], s.runner); // distance from runner to original pose
      const a = (mUnequal(s.runner, s.ps[0]) ? ArcTan(s.runner[0] - s.ps[0][0], s.runner[1] - s.ps[0][1]) : 0) - s.θs[0];
      s.ps = Array.from({ length: n }, (_, i) => add(s.ps[i], scale(d, dir(s.θs[i] + a))));
      s.psold = s.ps;
      const t1 = s.θs[0];
      s.θs = s.θs.map((t) => t + s.runnerθ - t1); // value plotted for running is θs[[i]] + runnerθ − θs[[1]]
      s.pθs = handles(s.ps, s.θs, n, 1.5 * 10 ** (s.range - 1) * s.rad); // final step: update the locators
      s.loc = [...s.ps, ...s.pθs];
    }
    s.modeP = s.mode;
  }
  if (s.mode === 'setup') {
    if (n !== s.nold) { // redraw the particles if n changes
      s.nold = n;
      s.ps = RandomReal([-0.9, 0.9], [n, 2], rng);
      s.θs = RandomReal(2 * Pi, n, rng);
      s.runPath = [];
      s.psold = s.ps;
      s.pθs = handles(s.ps, s.θs, n, 0.5 * 10 ** (s.range / 2) * s.rad);
      s.loc = [...s.ps, ...s.pθs];
    }
    s.ps = s.loc.slice(0, n);
    if (mUnequal(s.psold, s.ps)) {
      if (mUnequal(s.ps[0], s.psold[0])) { const v = sub(s.ps[0], s.psold[0]); s.runPath = s.runPath.map((x) => add(x, v)); } // update path
      s.psold = s.ps;
    } else { // otherwise, let the other locators change the orientation of the robots
      const θtemp = s.θs[0];
      s.θs = Array.from({ length: n }, (_, i) => (mUnequal(s.loc[n + i], s.loc[i]) ? ArcTan(s.loc[n + i][0] - s.loc[i][0], s.loc[n + i][1] - s.loc[i][1]) : 0));
      if (mUnequal(s.θs[0], θtemp)) { // update path
        const Rm = RotationMatrix(s.θs[0] - θtemp), p1 = s.ps[0];
        s.runPath = s.runPath.map((x) => add(Dot(Rm, sub(x, p1)), p1));
      }
    }
    s.pθs = handles(s.ps, s.θs, n, 0.5 * 10 ** (s.range / 2) * s.rad);
    if (mUnequal(s.loc.slice(n, 2 * n), s.pθs)) s.loc = [...s.loc.slice(0, n), ...s.pθs, ...s.loc.slice(2 * n)];
  }
  let dt = null;
  if (s.mode === 'running' && mUnequal(s.loc, s.runner)) {
    const rundist = distPt2Pt(s.loc, s.runner);
    s.runnerθ = mUnequal(s.loc, s.runner) ? ArcTan(s.loc[0] - s.runner[0], s.loc[1] - s.runner[1]) : s.runnerθ;
    const cTime = time ?? s.lastTime;
    dt = cTime - s.lastTime;
    if (dt < 0.01) dt = 0.01;
    if (dt > 0.1) dt = 0.1;
    s.lastTime = cTime;
    // apply control to runner, which is provided by the player
    s.runner = add(s.runner, scale(rundist < dt ? rundist : dt, dir(s.runnerθ)));
    s.runPath = [...s.runPath, s.runner];
  }

  // ---- the picture
  const { rad, ps, θs, robot } = s;
  const col = (i) => ColorData(97, i);
  const disks = perms.map(([i, j]) => {
    const t1 = θs[i - 1], t2 = θs[j - 1];
    const dc = collisionRadius(t1, t2, rad);
    const dd = s.mode === 'setup' ? collisionDelta(t1, t2, ps[i - 1], ps[j - 1]) : collisionDeltaRef(θs[0], t1, t2, ps[0], ps[i - 1], ps[j - 1]);
    return { pair: [i, j], center: dd, radius: dc };
  });
  const drawable = (d) => d.center.every(Number.isFinite) && Number.isFinite(d.radius); // θi = θj: no meeting point (D-SR-02)
  const collisions = [Opacity(0.5), disks.filter(drawable).map(({ pair: [i, j], center: dd, radius: dc }) => Annotation([
    Gray, Disk(dd, dc), Black, Point(dd), Text(Style(`${i},${j}`, 10, Black), add(dd, [0.5 * rad, 0.5 * rad])),
  ], `collision-${i}-${j}`))];
  // each robot's path: runPath rotated by θi − θ1 about ps[[1]] and translated by ps[[i]] − ps[[1]]
  const pathOf = (i) => { const Rm = RotationMatrix(θs[i - 1] - θs[0]); return s.runPath.map((x) => add(add(Dot(Rm, sub(x, ps[0])), ps[0]), sub(ps[i - 1], ps[0]))); };
  const paths = [];
  for (let i = n; i >= 1; i--) paths.push(Annotation([Thick, Opacity(1), col(i), Line(pathOf(i))], `path-${i}`));
  const arrowLength = 0.85 * 10 ** (s.range / 2) * rad;
  const robots = [], centres = [], headings = [];
  if (s.mode === 'setup') {
    for (let i = n; i >= 1; i--) {
      robots.push(Annotation([
        drawRobot(robot, ps[i - 1], rad, θs[0], θs[i - 1], col(i)),
        Black, Text(Style(i, 12, Black), add(ps[i - 1], [0.7 * rad, 0.7 * rad]), [-1, -1]),
        Blue, Thick, Arrow([ps[i - 1], add(ps[i - 1], scale(arrowLength, dir(θs[i - 1])))]),
      ], `robot-${i}`));
      centres[i - 1] = ps[i - 1]; headings[i - 1] = θs[i - 1];
    }
  } else { // RUNNING MODE
    const d = distPt2Pt(ps[0], s.runner); // distance from runner to original pose
    const a = (mUnequal(s.runner, ps[0]) ? ArcTan(s.runner[0] - ps[0][0], s.runner[1] - ps[0][1]) : 0) - θs[0];
    for (let i = n; i >= 1; i--) {
      const cent = add(ps[i - 1], scale(d, dir(θs[i - 1] + a)));
      const heading = θs[i - 1] + s.runnerθ - θs[0];
      robots.push(Annotation([
        drawRobot(robot, cent, rad, s.runnerθ, heading, col(i)),
        [Opacity(1), Black, Text(Style(i, 12, Black), add(cent, [0.7 * rad, 0.7 * rad]), [-1, -1])],
        Blue, Thick, Arrow([cent, add(cent, scale(arrowLength, dir(heading)))]),
      ], `robot-${i}`));
      centres[i - 1] = cent; headings[i - 1] = heading;
    }
  }
  // the locators (Locator[#] & /@ loc, or Locator[loc]) are the Manipulate layer's own glyphs (N-SR-01)
  const k = 1.2 * 10 ** (s.range - 1);
  const PlotRange = [[k * (-1 + s.offset[0]), k * (1 + s.offset[0])], [k * (-1 + s.offset[1]), k * (1 + s.offset[1])]];
  const graphics = Graphics([collisions, paths, robots], { PlotRange, Axes: false, ImageSize: [420, 420], UpdateFrame: true });
  return {
    state: s,
    view: { mode: s.mode, perms, disks, centres, headings, runner: s.runner, pathLength: s.runPath.length, dt, PlotRange },
    graphics,
  };
}
