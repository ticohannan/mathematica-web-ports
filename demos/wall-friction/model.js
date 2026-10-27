// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/wall-friction/model.js — one evaluation of the Manipulate body of "Moving Two Particles with Shared Control
// Inputs Using Wall Friction": the state in, { state, view, graphics } out (pure, no DOM). Simple mode: plain arithmetic
// with shared/wl.js names; the original's definitions in the original's order under their names, its search (While,
// SortBy, ties) statement by statement, its quirks included (DESIGN.md §7 and §11). Mathematica's ==, !=, <, … on
// computed reals are Equal, Unequal, Less, … of shared/wl.js (tolerant in the last seven bits).
import {
  Graphics, Line, Rectangle, Disk, Circle, Point, Arrow, Text, Inset, Style, Row, Annotation, Italic, Directive, EdgeForm,
  FaceForm, Opacity, Thickness, PointSize, Arrowheads, AbsoluteDashing, CapForm, FontSize, None, Darker, Lighter, Black,
  White, Gray, Red, Green, Blue, Magenta, LightBlue, LightGreen, Bold,
} from '../../shared/graphics.js';
import { RegionPlot } from '../../shared/plot.js';
import {
  Abs, Min, Max, Floor, Round, Clip, Norm, EuclideanDistance, Total, Plus, Subtract, Times, Divide, Append, SortBy, First,
  Rest, Equal, Unequal, Less, Greater, LessEqual, GreaterEqual,
} from '../../shared/wl.js';

// ---- the Initialization code ---------------------------------------------------------------------------------------
// An entry of the search is the original's list {distance, r1, r2, path, path1, path2, done}: the distance moved (or
// Infinity for a dead end), the two robots' positions after the moves, the moves (the shared control inputs, starting
// with {0, 0}), the positions of robot 1 and of robot 2 after each move, and True when the robots reached their goals.

/**
 * wallFrictionMoveDir[dir, s1, s2, g1, g2, moves, pm1, pm2, ε]: one expansion of an entry in direction dir. Base case 1:
 * when the spacing s2 − s1 already equals the goal spacing g2 − g1 (within 0.00001; the y test is strict on its upper
 * side, as written), the last move g2 − s2 takes both robots to their goals: a finished entry (True). Otherwise the frame
 * is turned so that dir is up, wallFrictionMoveUp moves, and its answer is turned back. The frames of "r" and "l" are
 * swapped (rotate90 makes "r" push left; N-WF-03).
 */
export function wallFrictionMoveDir(dir, s1, s2, g1, g2, moves, pm1, pm2, ε) {
  let path = moves, path1 = pm1, path2 = pm2;
  // STEP 1: is base case 1 possible? If so, do it and return
  const [Δex, Δey] = Subtract(Subtract(g2, g1), Subtract(s2, s1));
  if (LessEqual(-0.00001, Δex) && LessEqual(Δex, 0.00001) && LessEqual(-0.00001, Δey) && Less(Δey, 0.00001)) {
    path = Append(path, [g2[0] - s2[0], g2[1] - s2[1]]); path1 = Append(path1, g1); path2 = Append(path2, g2);
    return [distanceMoved(path), g1, g2, path, path1, path2, true];
  }
  // OTHERWISE, move in the desired direction to contact a wall: rotate the frame so the movement is up, call
  // wallFrictionMoveUp, then rotate the answer back into the original frame
  let newPathEntries, s1t, s2t, g1t, g2t, movest, pm1st, pm2st;
  if (dir === 'u') newPathEntries = wallFrictionMoveUp(s1, s2, g1, g2, moves, pm1, pm2, ε);
  if (dir === 'd') { // rotate the frame 180 deg, then unrotate the answers
    [s1t, s2t, g1t, g2t] = [s1, s2, g1, g2].map(rotate180);
    movest = moves.map(rotate180inplace); pm1st = pm1.map(rotate180); pm2st = pm2.map(rotate180);
    newPathEntries = wallFrictionMoveUp(s1t, s2t, g1t, g2t, movest, pm1st, pm2st, ε);
    newPathEntries = unturn(newPathEntries, rotate180, rotate180inplace);
  }
  if (dir === 'r') { // rotate the frame 90 deg, then unrotate the answers
    [s1t, s2t, g1t, g2t] = [s1, s2, g1, g2].map(rotate90);
    movest = moves.map(rotate90inplace); pm1st = pm1.map(rotate90); pm2st = pm2.map(rotate90);
    newPathEntries = wallFrictionMoveUp(s1t, s2t, g1t, g2t, movest, pm1st, pm2st, ε);
    newPathEntries = unturn(newPathEntries, rotate270, rotate270inplace);
  }
  if (dir === 'l') { // rotate the frame 270 deg, then unrotate the answers
    [s1t, s2t, g1t, g2t] = [s1, s2, g1, g2].map(rotate270);
    movest = moves.map(rotate270inplace); pm1st = pm1.map(rotate270); pm2st = pm2.map(rotate270);
    newPathEntries = wallFrictionMoveUp(s1t, s2t, g1t, g2t, movest, pm1st, pm2st, ε);
    newPathEntries = unturn(newPathEntries, rotate90, rotate90inplace);
  }
  return newPathEntries;
}
/** "undo the change": newPathEntries[[2]], [[3]] = turn[…], [[4]] = Map[turnInplace, …], [[5]], [[6]] = Map[turn, …]. */
const unturn = ([d, r1, r2, path, path1, path2, done], turn, turnInplace) => [d, turn(r1), turn(r2), path.map(turnInplace), path1.map(turn), path2.map(turn), done];

/**
 * wallFrictionMoveUp[r1in, r2in, g1in, g2in, moves, pm1, pm2, ε]: robot 1 (made the top-left robot by ensurer1r2) is
 * moved up to the wall together with robot 2 (m1, aimed so that robot 1 touches the wall on the line to its goal when
 * the goal spacing is achievable), then robot 2 alone (m2: robot 1 is held by the wall's friction) toward the goal
 * spacing, clipped by the workspace and kept ε/2 off robot 1. A move m2 of nearly 0 makes the entry a dead end
 * (Infinity), as does robot 2 already touching the up wall.
 */
export function wallFrictionMoveUp(r1in, r2in, g1in, g2in, moves, pm1, pm2, ε) {
  const L = 1; // size of workspace
  let path1 = pm1, path2 = pm2; // desired moves for r1, r2
  // robot 1 must be the top left robot. If it is not the top robot, flip entries, if it is not the left robot, mirror
  // entries. Remember to switch again at end! Then move robot while first robot is touching wall.
  let [r1, r2, g1, g2, isMirrored, isFlipped, path] = ensurer1r2(r1in, r2in, g1in, g2in, moves);
  const [Δgx, Δgy] = Subtract(g2, g1);
  // If the second robot is already touching the up wall, just return (positions and moves as flipped/mirrored, N-WF-04)
  if (Equal(r2[1], 1)) return [Infinity, r1, r2, path, path1, path2, false];
  // If the goal Δgx, Δgy is achievable, do it in one move
  let Δtgx, Δtgy;
  if (Greater(r2[0] - r1[0] - 1, Δgx)) Δtgx = r2[0] - r1[0] - 1; else Δtgx = Δgx;
  if (Greater(Δgy, 0)) Δtgy = 0; else Δtgy = Δgy;
  // If[Δgy < r2[[2]] − r1[[2]], Δtgy = r2[[2]] − r1[[2]], , Δtgy = Δgy]: the double comma makes Δtgy = Δgy the
  // fourth argument (taken only for a condition neither True nor False), so the False case keeps the line above
  if (Less(Δgy, r2[1] - r1[1])) Δtgy = r2[1] - r1[1];
  let m1;
  if (LessEqual(r2[0] - r1[0] - 1 + 2 * ε, Δtgx) && LessEqual(Δtgx, 1 - 2 * ε) && LessEqual(r2[1] - r1[1], Δtgy) && LessEqual(Δtgy, 0)) {
    // in achievable range: move r1 and r2 so that r1 will touch the up wall in the line of the goal
    m1 = [((1 - r1[1]) / (2 - g1[1] - r1[1])) * (g1[0] - r1[0]), 1 - r1[1]];
  } else {
    // not in achievable range: move the shortest path to the wall
    m1 = [0, 1 - r1[1]];
  }
  // check the boundaries
  if (Greater(r2[0] + m1[0], 1)) m1 = [1 - r2[0], m1[1]];
  if (Less(r1[0] + m1[0], 0)) m1 = [-r1[0], m1[1]];
  if (Greater(r1[0] + m1[0] + Δtgx, 1) && Greater(Δtgx, 0)) m1 = [m1[0] - (Δtgx + r1[0] + m1[0] - 1), m1[1]];
  if (Less(r1[0] + m1[0] + Δtgx, 0) && Less(Δtgx, 0)) m1 = [m1[0] + (Abs(Δtgx) - r1[0] - m1[0]), m1[1]];
  if (Equal(r1[1], 1)) m1 = [0, 0];
  else if (Equal(m1[0], 0)) {
    if (Equal(r1[0], 1) || Equal(r2[0], 1)) m1 = [m1[0] - ε, m1[1]];
    if (Equal(r1[0], 0) || Equal(r2[0], 0)) m1 = [m1[0] + ε, m1[1]];
  }
  r1 = Plus(r1, m1); r2 = Plus(r2, m1);
  const [Δex] = Subtract([Δtgx, Δtgy], Subtract(r2, r1));
  // move r2 to get correct spacing
  let m2 = GreaterEqual(Δex, 0)
    ? [Min(Δtgx - (r2[0] - r1[0]), 1 - r2[0]), Δtgy - (r2[1] - r1[1])]
    : [Max(Δtgx - (r2[0] - r1[0]), -r2[0]), Δtgy - (r2[1] - r1[1])];
  // check if the robots are in ε difference with each other
  if (LessEqual(r1[0] - ε / 2, r2[0] + m2[0]) && LessEqual(r2[0] + m2[0], r1[0] + ε / 2) && Equal(r1[1], r2[1] + m2[1])) {
    if (Greater(r2[0] + m2[0], L / 2)) m2 = [m2[0] + (r1[0] + ε - r2[0] - m2[0]), m2[1]];
    else m2 = [m2[0] + (r1[0] - ε - r2[0] - m2[0]), m2[1]];
  }
  if (Equal(r2[1], 1)) m2 = [0, 0];
  let r1out, r2out;
  if (Unequal(m1, [0, 0])) { // add m1
    path = Append(path, m1);
    [r1out, r2out] = returnr1r2(isFlipped, isMirrored, r1, r2);
    path1 = Append(path1, r1out); path2 = Append(path2, r2out);
  }
  // add m2
  r2 = Plus(r2, m2);
  path = Append(path, m2);
  [r1out, r2out] = returnr1r2(isFlipped, isMirrored, r1, r2);
  path1 = Append(path1, r1out); path2 = Append(path2, r2out);
  // change the path back if it was mirrored
  if (isMirrored) path = path.map(mirrorInplace);
  const stuck = Less(-0.00001, m2[0]) && Less(m2[0], 0.00001) && Less(-0.00001, m2[1]) && Less(m2[1], 0.00001);
  return [stuck ? Infinity : distanceMoved(path), r1out, r2out, path, path1, path2, false];
}

/** returnr1r2[isFlipped, isMirrored, r1, r2]: undoing the mirroring and flipping. */
export function returnr1r2(isFlipped, isMirrored, r1, r2) {
  let r1out, r2out;
  if (isMirrored) {
    if (isFlipped) { r1out = mirror(r2); r2out = mirror(r1); } else { r1out = mirror(r1); r2out = mirror(r2); }
  } else if (isFlipped) { r1out = r2; r2out = r1; } else { r1out = r1; r2out = r2; }
  return [r1out, r2out];
}

/** ensurer1r2[r1in, r2in, g1in, g2in, moves]: doing the mirroring and flipping, so that robot 1 is the top left robot. */
export function ensurer1r2(r1in, r2in, g1in, g2in, moves) {
  let r1, r2, g1, g2, path, isFlipped = false, isMirrored = false;
  if (Less(r1in[1], r2in[1])) {
    if (Greater(r1in[0], r2in[0])) {
      [r1, r2, g1, g2] = [r2in, r1in, g2in, g1in]; isFlipped = true; path = moves;
    } else {
      [r1, r2, g1, g2] = [r2in, r1in, g2in, g1in].map(mirror); path = moves.map(mirrorInplace); isFlipped = true; isMirrored = true;
    }
  } else if (Greater(r1in[0], r2in[0])) {
    [r1, r2, g1, g2] = [r1in, r2in, g1in, g2in].map(mirror); path = moves.map(mirrorInplace); isMirrored = true;
  } else {
    [r1, r2, g1, g2] = [r1in, r2in, g1in, g2in]; path = moves;
  }
  return [r1, r2, g1, g2, isMirrored, isFlipped, path];
}

/** rotate270[r]: rotate the coordinate frame 270 deg. */
export const rotate270 = (r) => [1 - r[1], r[0]];
/** rotate90inplace[r]: changes in path when we rotate 90 deg. */
export const rotate90inplace = (r) => [r[1], -r[0]];
/** rotate90[r]: rotate the coordinate frame 90 deg. */
export const rotate90 = (r) => [r[1], 1 - r[0]];
/** rotate270inplace[r]: changes in path when we rotate 270 deg. */
export const rotate270inplace = (r) => [-r[1], r[0]];
/** rotate180[r]: rotate the coordinate frame 180 deg. */
export const rotate180 = (r) => [1 - r[0], 1 - r[1]];
/** rotate180inplace[r]: changes in path when we rotate 180 deg. */
export const rotate180inplace = (r) => [-r[0], -r[1]];
/** mirror[r]: mirror the coordinate frame about the right wall. */
export const mirror = (r) => [1 - r[0], r[1]];
/** mirrorInplace[r]: changes in path when we mirror. */
export const mirrorInplace = (r) => [-r[0], r[1]];
/** distanceMoved[moves]: total distance moved with the sequence of moves, Total[Norm /@ moves]. */
export const distanceMoved = (moves) => Total(moves.map((m) => Norm(m)));

/** The While loop gives up after this many expansions (D-WF-02): when both pairs of points are exactly aligned and the
 *  spacing must grow, every expansion is a dead end and the original's loop never ends (E-WF-02); a search that
 *  succeeds needs far fewer (at most 17 in 2000 random configurations). */
export const MAX_EXPANSIONS = 300;
/**
 * optimal2robotPath[s1, s2, g1, g2, ε]: the best-first search. The list starts with the entry {Infinity, s1, s2, {{0, 0}},
 * {s1}, {s2}, False}; while the entry taken last is not finished, it is expanded in the four directions u, d, l, r (each
 * result appended), the list is sorted by distance (SortBy[…, First]: ties in canonical order of the whole entries) and
 * its first entry taken off. Returns {path, path1, path2} of optimalPathList[[1]] — the list's first entry AFTER the
 * finished one was taken off, i.e. its copy from the same expansion (the four directions return the same finished entry;
 * N-WF-02). With `stats`, also the number of expansions.
 */
export function optimal2robotPath(s1, s2, g1, g2, ε, stats = null) {
  let pathToExplore = [Infinity, s1, s2, [[0, 0]], [s1], [s2], false];
  let optimalPathList = [pathToExplore];
  let n = 0;
  while (pathToExplore[6] !== true) {
    if (++n > MAX_EXPANSIONS) { if (stats) stats.expansions = n - 1; return null; } // D-WF-02
    const r1 = pathToExplore[1], r2 = pathToExplore[2];
    const moves = pathToExplore[3], pm1 = pathToExplore[4], pm2 = pathToExplore[5];
    for (const dir of ['u', 'd', 'l', 'r']) {
      const wallMoves = wallFrictionMoveDir(dir, r1, r2, g1, g2, moves, pm1, pm2, ε);
      optimalPathList = Append(optimalPathList, wallMoves);
    }
    optimalPathList = SortBy(optimalPathList, First); // sorts the current list by their total distance moved
    pathToExplore = First(optimalPathList); // read first entry
    optimalPathList = Rest(optimalPathList); // pop off first entry
  }
  if (stats) stats.expansions = n;
  // return the best movement
  return [optimalPathList[0][3], optimalPathList[0][4], optimalPathList[0][5]];
}

/**
 * keepRobotsInWorkspaceAndSpaced[r1, r2, ε]: both points clipped to the ε workspace [ε, 1 − ε]²; when they are closer
 * than ε, robot 2 is moved to distance ε from robot 1 along their line if that stays strictly inside, otherwise robot 1
 * is put at distance ε from robot 2 toward the centre {1/2, 1/2} (coincident points: robot 1 ε to the left of robot 2,
 * or to the right near the left wall). The original's middle alternative (robot 1 moved away from robot 2) is never
 * used: a missing semicolon makes its If a factor of the previous assignment (Q-WF-03, E-WF-01).
 */
export function keepRobotsInWorkspaceAndSpaced(r1, r2, ε) {
  // keep robots in ε workspace
  let p1 = [Clip(r1[0], [ε, 1 - ε]), Clip(r1[1], [ε, 1 - ε])];
  let p2 = [Clip(r2[0], [ε, 1 - ε]), Clip(r2[1], [ε, 1 - ε])];
  // keep ε-spacing between robots
  const ds = EuclideanDistance(p1, p2);
  const inside = (tp) => Less(ε, tp[0]) && Less(tp[0], 1 - ε) && Less(ε, tp[1]) && Less(tp[1], 1 - ε);
  if (Less(ds, ε)) {
    if (Equal(ds, 0)) p1 = Plus(p2, Greater(p2[0], 2 * ε) ? [-ε, 0] : [ε, 0]);
    else {
      let tp = Plus(p1, Times(ε, Divide(Subtract(p2, p1), ds))); // temp position
      if (inside(tp)) p2 = tp;
      else {
        // "tp = p2+ε((p1-p2))/(ds)⏎If[…]" without a semicolon: ONE assignment whose right side multiplies by the If. Its
        // test is the one that just failed (tp is assigned only afterwards), so it always takes the second branch
        // p1 = p2 + ε ({1/2, 1/2} − p2)/|{1/2, 1/2} − p2|; the product (and so tp) is not used afterwards
        const factor = Subtract(p1, p2); // evaluated before the If, with the old p1
        const branch = inside(tp) ? (p1 = tp)
          : (p1 = Plus(p2, Times(ε, Divide(Subtract([1 / 2, 1 / 2], p2), EuclideanDistance([1 / 2, 1 / 2], p2)))));
        tp = Plus(p2, Times(ε, Divide(Times(factor, branch), ds)));
      }
    }
  }
  return [p1, p2];
}

// ---- the Manipulate variables ----------------------------------------------------------------------------------------

/** The value of the setter "on the right, show" that draws the Δ configuration space (any other value: the moves). */
export const CONFIG_SPACE = 'Δ configuration space';
/** The state saved in the notebook's output cell (what the published Demonstration shows); it equals the Manipulate's
 *  stored initial values (Initial settings). ϵ is the exact 1/20. */
export const SAVED = Object.freeze({
  ifMove: CONFIG_SPACE, progress: 1, ϵ: 1 / 20,
  s1: [0.95, 0.95], s2: [0.2, 0.8], e1: [0.05, 0.95], e2: [0.33, 0.66],
});
export const initialState = () => structuredClone({ ...SAVED });

// ---- the body ---------------------------------------------------------------------------------------------------------

/** StringForm["… `` …", e1, …]: the template with each `` replaced by the next argument. */
export const StringForm = (template, ...xs) => { let i = 0; return template.replace(/``/g, () => String(xs[i++])); };
/** The text of a machine real as Mathematica prints it: six significant digits, "2." for a whole number. */
export const realText = (x) => { const s = String(Number(x.toPrecision(6))); return /[.e]/.test(s) ? s : `${s}.`; };
/** Arrow[{p, q}] — with p = q (a robot held by a wall, or the arrow to the current position at a move's start) nothing
 *  is drawn, as at that place in Mathematica (N-WF-05). */
const arrow = ([p, q]) => (Equal(p, q) ? null : Arrow([p, q]));
/** Dashed as the snapshots draw it on these 3-px lines: 4-px dashes and gaps with flat ends (N-WF-07). */
const Dashed = Directive(AbsoluteDashing([4, 4]), CapForm('Butt'));
/** The dashed Arrow[{p, q}]: its shaft as a Line (the layer draws an Arrow's line with round caps, which would close the
 *  gaps) and its head as an Arrow over the last millionth of it (N-WF-07). */
const dashedArrow = ([p, q]) => (Equal(p, q) ? null : [Line([p, q]), Arrow([Plus(p, Times(1 - 1e-6, Subtract(q, p))), q])]);
/** Annotation[g, id] for the tests, or nothing where g is not drawn. */
const tag = (g, id) => (g ? Annotation(g, id) : null);
/** Row[{"Δ", Style[s, Italic]}] */
const delta = (s) => Row(['Δ', Style(s, Italic)]);

/**
 * Floor and FractionalPart of progress·n. The progress slider {0, 1, 1/420} gives exact rationals k/420 in Mathematica:
 * for such a value both are taken of k·n/420 exactly (an integer division), so that the fraction is exactly 0 at a move's
 * start, as in Mathematica (the machine product leaves a tiny positive fraction at some starts; N-WF-06); any other value
 * as a machine real.
 */
export function progressSplit(progress, n) {
  const k = Round(progress * 420);
  if (Equal(k / 420, progress)) { const q = Floor((k * n) / 420); return [q, (k * n - 420 * q) / 420]; }
  return [Floor(progress * n), progress * n - Floor(progress * n)];
}

/** The picture's options: ImageSize -> 600, PlotRange -> {{−0.05, 1.75}, {−.05, 1.05}}, without padding (N-WF-08). */
const OPTIONS = { ImageSize: 600, PlotRange: [[-0.05, 1.75], [-0.05, 1.05]], PlotRangePadding: 0 };

/**
 * One evaluation of the Manipulate body: the start and goal points kept in the ε workspace and ε apart (written back to
 * the Manipulate variables, as the original's assignments), the search, the robots at the progress along the path, and
 * the picture.
 */
export function evaluate(state) {
  const s = structuredClone(state);
  const ε = s['ϵ'], { progress, ifMove } = s;
  const r = 1 / 40; // radius of start and end markers
  const thickness = 0.005;
  const c1 = Blue, c2 = Magenta;
  // keep robots in ε workspace
  [s.s1, s.s2] = keepRobotsInWorkspaceAndSpaced(s.s1, s.s2, ε);
  [s.e1, s.e2] = keepRobotsInWorkspaceAndSpaced(s.e1, s.e2, ε);
  const [ps1, pe1, ps2, pe2] = [s.s1, s.e1, s.s2, s.e2];
  const stats = {};
  const found = optimal2robotPath(ps1, ps2, pe1, pe2, ε, stats);
  // the search did not end (D-WF-02): Mathematica aborts the evaluation after its time limit and shows $Aborted
  if (!found) {
    return { state: s, view: { found: false, expansions: stats.expansions }, graphics: Graphics([Annotation(Text('$Aborted', [0.85, 0.5]), 'aborted')], OPTIONS) };
  }
  const [path, path1, path2] = found;
  const [mvNum, mvFrac] = progressSplit(progress, path.length - 1);
  const pm2 = mvFrac > 0 ? Plus(path2[mvNum], Times(mvFrac, Subtract(path2[mvNum + 1], path2[mvNum]))) : path2[mvNum];
  const pm1 = mvFrac > 0 ? Plus(path1[mvNum], Times(mvFrac, Subtract(path1[mvNum + 1], path1[mvNum]))) : path1[mvNum];
  const onWall = (p) => Equal(p[0], 0) || Equal(p[1], 0) || Equal(p[0], 1) || Equal(p[1], 1);
  const position = (pm) => (onWall(pm) ? [Point(pm), PointSize(0.005), White, Point(pm)] : Point(pm));
  const markers = (c, ps, pe) => [c, [Opacity(0.3), Dashed, dashedArrow([ps, pe])], Point(ps), EdgeForm(Directive(c, Thickness(thickness))),
    FaceForm(None), Rectangle(Subtract(ps, (2 / 3) * r), Plus(ps, (2 / 3) * r)), Circle(pe, r)];
  const trail = (c, pathk, pm, k) => [c,
    Array.from({ length: mvNum }, (_, i) => arrow([pathk[i], pathk[i + 1]])), // Table[Arrow[{path[[i]], path[[i + 1]]}], {i, 1, mvNum}]
    arrow([pathk[mvNum], pm]),
    Annotation([position(pm)], `position-${k}`)];

  let right, panel = null;
  if (ifMove === CONFIG_SPACE) {
    right = Inset(RegionPlot((x) => x < -3, [-1, 1], [-1, 1], {
      Epilog: [
        // reachable region (by the code: blue via a horizontal wall, green via a vertical wall; the Details say the opposite,
        // E-WF-04)
        Annotation([LightBlue, EdgeForm(Blue), Less(pm1[0], pm2[0])
          ? Rectangle([pm2[0] - 1 - pm1[0], pm2[1] - pm1[1]], [1, 0]) : Rectangle([1 - pm1[0] + pm2[0], pm2[1] - pm1[1]], [-1, 0])], 'reach-blue'),
        Annotation([LightGreen, EdgeForm(Green), Opacity(0.5), Greater(pm1[1], pm2[1])
          ? Rectangle([0, -1], [pm2[0] - pm1[0], 1 + pm2[1] - pm1[1]]) : Rectangle([0, 1], [pm2[0] - pm1[0], -(1 + pm1[1] - pm2[1])])], 'reach-green'),
        // goal deltas
        Green,
        Annotation(Disk(Subtract(pe2, pe1), 2 * r), 'goal-delta'),
        Annotation(Text(Style(delta('r'), FontSize(16), Black), [pm2[0] - pm1[0] - 0.1, pm2[1] - pm1[1] - 0.1]), 'label-r'),
        // current deltas
        Red, Annotation(Rectangle(Subtract(Subtract(pm2, pm1), (4 / 3) * r), Plus(Subtract(pm2, pm1), (4 / 3) * r)), 'current-delta'),
        Annotation(Text(Style(delta('g'), FontSize(16), Black), [pe2[0] - pe1[0] + 0.1, pe2[1] - pe1[1] + 0.1]), 'label-g'),
      ],
      FrameLabel: [delta('x'), delta('y')], LabelStyle: Directive(Black, Bold), ImageSize: 230, testid: 'config-plot',
      // Mathematica's automatic margins of this inset, measured on the snapshots (left, right, bottom, top px; D-WF-03)
      ImagePadding: [[40, 4], [34, 4]],
    }), [1.38, 0.45]);
  } else {
    let n = mvNum, f = mvFrac;
    if (n + 1 === path.length) { n = path.length - 2; f = 1; }
    const total = Round(Total(Array.from({ length: path.length - 1 }, (_, i) => EuclideanDistance(path[i + 1], [0, 0]))), 0.01);
    const offset = Subtract([1.55, 0.5], Times(1 / 2, path[n + 1]));
    panel = { move: n + 1, of: path.length - 1, fraction: f, total, vector: path[n + 1], offset };
    right = Annotation([
      Darker(Red), Annotation(Text(Style(StringForm('move `` of ``', n + 1, path.length - 1), FontSize(18)), [1.4, 0.9]), 'move-text'),
      Annotation(Text(Style(StringForm('total distance `` ', realText(total)), FontSize(18)), [1.4, 0.8]), 'distance-text'),
      [Opacity(0.3), tag(arrow([offset, Plus(offset, path[n + 1])]), 'move-full')],
      Annotation(Point(Plus(offset, Times(f, path[n + 1]))), 'move-point'),
      tag(arrow([offset, Plus(offset, Times(f, path[n + 1]))]), 'move-done'),
    ], 'moves');
  }

  const graphics = Graphics([
    // workspace
    Annotation([
      [Darker(Red), Rectangle([-0.025, -0.025], [1.025, 1.025])],
      [Lighter(Gray, 0.8), Rectangle([0, 0], [1, 1])],
      [White, Rectangle([ε, ε], [1 - ε, 1 - ε])],
      [Lighter(Gray, 0.8), Disk(ps2, ε)],
      [Lighter(Gray, 0.8), Disk(pe2, ε)],
    ], 'workspace'),
    PointSize(0.01),
    Arrowheads(0.03),
    Thickness(thickness),
    // starting poses, dashed line from start to end
    Annotation(markers(c1, ps1, pe1), 'markers-1'),
    Annotation(markers(c2, ps2, pe2), 'markers-2'),
    // plot path of particle 1, of particle 2
    Annotation(trail(c1, path1, pm1, 1), 'path-1'),
    Annotation(trail(c2, path2, pm2, 2), 'path-2'),
    right,
  ], OPTIONS);
  return {
    state: s,
    view: { path, path1, path2, mvNum, mvFrac, pm1, pm2, panel, found: !!found, expansions: stats.expansions },
    graphics,
  };
}
