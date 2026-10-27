// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/visibility-region/model.js — one evaluation of the Manipulate body of "Visibility Region of a Polygon": the
// state in, { state, view, graphics } out (pure, no DOM). Simple mode: plain arithmetic with shared/wl.js names; the
// original's definitions in the original's order under their names, and its sweep statement by statement (its quirks
// included: see DESIGN.md §7 and §11). Mathematica's ==, !=, <, … on computed reals are Equal, Unequal, Less, … of
// shared/wl.js (tolerant in the last seven bits); `===`/sameQ where the original matches patterns (DeleteCases).
import {
  Line, Polygon, Point, Circle, Annotation, Opacity, EdgeForm, Thin, Thickness, PointSize, Transparent, Lighter,
  Purple, Yellow, Orange, Blue, Green, Red,
} from '../../shared/graphics.js';
import {
  Pi, ArcTan, Mod, Round, Chop, Det, Dot, Cross, Norm, Normalize, VectorAngle, EuclideanDistance, Plus, Subtract, Times,
  Divide, Partition, Append, Prepend, Join, Reverse, RotateLeft, RotateRight, First, Flatten, Position, Total, Max, Sort,
  Equal, Unequal, Less, Greater, LessEqual, GreaterEqual,
} from '../../shared/wl.js';

// Det of shared/wl.js computes a 2 × 2 by its expansion a d − b c (v0.1.26, found with this port): that reproduces the
// original's snapshot 5 (N-VR-03), where the first ray's end fvPoint comes out a hair below p, so the arc of the last
// step is a full circle; elimination put it exactly on p's line (an empty arc).

// ---- the Initialization code ---------------------------------------------------------------------------------------

/** lineList[list_] := Partition[Append[list, First[list]], 2, 1]: the polygon's edges {v_i, v_i+1}, the closing one last. */
export const lineList = (list) => Partition(Append(list, First(list)), 2, 1);

/** vector[{{x1_, y1_}, {x2_, y2_}}] := {x2 − x1, y2 − y1} (defined in the original, not used by its Manipulate). */
export const vector = ([[x1, y1], [x2, y2]]) => [x2 - x1, y2 - y1];

/** normalVector[{{x2_, y2_}, {x1_, y1_}}] := Normalize[{−y2 + y1, x2 − x1}]: for the line P → Q the unit normal on its
 *  right, Normalize[{Q_y − P_y, P_x − Q_x}] (the original names the first point x2, y2). */
export const normalVector = ([[x2, y2], [x1, y1]]) => Normalize([-y2 + y1, x2 - x1]);

/** vertexList[list_] := Partition[Join[list, list[[1 ;; 2]]], 3, 1]: the triples {v_i, v_i+1, v_i+2} (a vertex with
 *  its two neighbours; the middle one is the vertex). */
export const vertexList = (list) => Partition(Join(list, list.slice(0, 2)), 3, 1);

/** λ[{a_, b_}][p_] := ((a − p).(a − b))/((a − b).(a − b)): the parameter of the point of the line a + λ (b − a)
 *  nearest to p (0 at a, 1 at b). */
export const λ = ([a, b]) => (p) => Dot(Subtract(a, p), Subtract(a, b)) / Dot(Subtract(a, b), Subtract(a, b));

/** LineIntersectionPoint[{{a_, b_}, {c_, d_}}] := (Det[{a, b}] (c − d) − Det[{c, d}] (a − b))/Det[{a − b, c − d}]:
 *  where the lines through a, b and c, d cross. */
export const LineIntersectionPoint = ([[a, b], [c, d]]) => Divide(
  Subtract(Times(Det([a, b]), Subtract(c, d)), Times(Det([c, d]), Subtract(a, b))), Det([Subtract(a, b), Subtract(c, d)]));

/** Round[{x, y}, a]: Round threads over a point (Mathematica's Round is listable). */
const roundPoint = (v, a) => v.map((x) => Round(x, a));

/**
 * SegmentIntersectionQ[{p1 : {a_, b_}, p2 : {c_, d_}}]: True when the segments cross at a point inside both: not
 * parallel (Chop@Det[{a − b, c − d}] == 0 is False), the crossing rounded to 1e-7 has 0 < λ < 1 on both, and it is
 * none of the four end points (rounded to 1e-7). Segments that only touch at an end point do not intersect.
 */
export function SegmentIntersectionQ([p1, p2]) {
  const [a, b] = p1, [c, d] = p2;
  const roundoff = 0.0000001;
  if (Equal(Chop(Det([Subtract(a, b), Subtract(c, d)])), 0)) return false;
  const p = roundPoint(LineIntersectionPoint([p1, p2]), roundoff);
  const l1 = λ(p1)(p), l2 = λ(p2)(p);
  return Less(0, l1) && Less(l1, 1) && Less(0, l2) && Less(l2, 1)
    && !(Equal(p, roundPoint(a, roundoff)) || Equal(p, roundPoint(b, roundoff)) || Equal(p, roundPoint(c, roundoff)) || Equal(p, roundPoint(d, roundoff)));
}

/** getAngle[{{x1_, y1_}, {x2_, y2_}}] := Mod[ArcTan[x2 − x1, y2 − y1], 2π]: the direction of the second point seen
 *  from the first, in [0, 2π). */
export const getAngle = ([[x1, y1], [x2, y2]]) => Mod(ArcTan(x2 - x1, y2 - y1), 2 * Pi);

/** intersectInteriorQRev2[p_, {w1_, w2_, w3_}]: "True if w2 is Interior vertex from p" — the angle at w2 from w3 to
 *  w1 is larger than the angle from w3 to p (both getClockwiseAngle); an angle 0 to p counts as 6.28319. */
export function intersectInteriorQRev2(p, [w1, w2, w3]) {
  const a = getClockwiseAngle(w1, w2, w3);
  let b = getClockwiseAngle(p, w2, w3);
  if (Equal(b, 0)) b = 6.28319;
  return Greater(a, b);
}

/** getClockwiseAngle[p1_, p2_, p3_]: with a = p3 − p2 and b = p1 − p2 (made 3D), 2π − VectorAngle[a, b] when
 *  Cross[a, b][[3]] < 0, else VectorAngle[a, b], each Chopped — the angle turned counter-clockwise from a to b, in
 *  [0, 2π) (despite the name). */
export function getClockwiseAngle(p1, p2, p3) {
  const a = [...Subtract(p3, p2), 0], b = [...Subtract(p1, p2), 0];
  return Less(Cross(a, b)[2], 0) ? Chop(2 * Pi - VectorAngle(a, b)) : Chop(VectorAngle(a, b));
}

/** testpoint[poly_, pt_] := Round[Total@Mod[(# − RotateRight[#]) &@(ArcTan @@ (pt − #) & /@ poly), 2π, −π]/2/π] != 0:
 *  "true if pt is inside polygon" — its winding number about pt is not 0. */
export function testpoint(poly, pt) {
  const angles = poly.map((v) => ArcTan(...Subtract(pt, v)));
  const turns = Subtract(angles, RotateRight(angles)).map((x) => Mod(x, 2 * Pi, -Pi));
  return Round(Total(turns) / 2 / Pi) !== 0;
}

/** glancingBlow[a_, {p1_, p2_, p3_}] := Xor[reflex[p1, p2, a], reflex[p3, p2, a]] — True when p1 and p3 lie on
 *  different sides of the line from a through p2 (the ray crosses the boundary there; the body calls the other case,
 *  False, the glancing blow). */
export const glancingBlow = (a, [p1, p2, p3]) => reflex(p1, p2, a) !== reflex(p3, p2, a);

/** reflex[{x1_, y1_}, {x2_, y2_}, {x3_, y3_}] := Chop[Det[{{1, x1, y1}, {1, x2, y2}, {1, x3, y3}}]] > 0: the three
 *  points turn counter-clockwise. */
export const reflex = ([x1, y1], [x2, y2], [x3, y3]) => Greater(Chop(Det([[1, x1, y1], [1, x2, y2], [1, x3, y3]])), 0);

/** extendedLine[p1_, p2_] := {p1, p1 + 40 Normalize[p2 − p1]}: the ray from p1 through p2, 40 long. */
export const extendedLine = (p1, p2) => [p1, Plus(p1, Times(40, Normalize(Subtract(p2, p1))))];

/** pointOnSegmentQ[{{x1_, y1_}, {x2_, y2_}}, {x3_, y3_}]: "true if p3 lies on the line formed by p1 and p2" — the
 *  cross product Chops to 0 (|cross| < 1e-10) and 0 < Kac < Kab (strictly between the end points). */
export function pointOnSegmentQ([[x1, y1], [x2, y2]], [x3, y3]) {
  const ABv = [x2 - x1, y2 - y1, 0], ACv = [x3 - x1, y3 - y1, 0];
  if (Cross(ABv, ACv).every((x) => Equal(Chop(x), 0))) {
    const Kac = Dot(ABv, ACv), Kab = Dot(ABv, ABv);
    if (Less(Kac, 0)) return false;
    if (Greater(Kac, Kab)) return false;
    return Less(0, Kac) && Less(Kac, Kab);
  }
  return false;
}

/** leftOrRight[a : {x1_, y1_}, b : {x2_, y2_}, p : {x_, y_}] := ((x − x1)(y2 − y1) − (y − y1)(x2 − x1)) >= 0: p on
 *  the right of the line a → b (or on it). */
export const leftOrRight = ([x1, y1], [x2, y2], [x, y]) => GreaterEqual((x - x1) * (y2 - y1) - (y - y1) * (x2 - x1), 0);

/** noIntersection[p1_, p2_, linelist_] := Nor @@ (SegmentIntersectionQ[{{p1, p2}, #}] & /@ linelist): the segment
 *  p1 p2 crosses none of the lines. */
export const noIntersection = (p1, p2, linelist) => !linelist.some((l) => SegmentIntersectionQ([[p1, p2], l]));

/** angleSortCond[point_, l1_, l2_]: l1's middle vertex comes first by its angle from point, ties by distance. */
export function angleSortCond(point, l1, l2) {
  const a = getAngle([point, l1[1]]), b = getAngle([point, l2[1]]);
  const c = Norm(Subtract(point, l1[1])), d = Norm(Subtract(point, l2[1]));
  return Less(a, b) || (Equal(a, b) && Less(c, d));
}

/** distSortCond[line_, l1_, l2_, point_]: l1 crosses `line` nearer to point than l2 (the lines Chopped first). */
export function distSortCond(line, l1, l2, point) {
  const a = EuclideanDistance(LineIntersectionPoint(Chop([line, l1])), point);
  const b = EuclideanDistance(LineIntersectionPoint(Chop([line, l2])), point);
  return Less(a, b);
}

// ---- the Manipulate --------------------------------------------------------------------------------------------------

/** CirclePoints[4] — exact in Mathematica: {{1/√2, −1/√2}, {1/√2, 1/√2}, {−1/√2, 1/√2}, {−1/√2, −1/√2}}
 *  (counter-clockwise from the lower right corner). */
const CirclePoints4 = () => { const r = Math.SQRT1_2; return [[r, -r], [r, r], [-r, r], [-r, -r]]; };

/** The polygon of the Module, before its `1.5 Reverse@`: the building outline (clockwise). */
export const POLYGON = Object.freeze([[-2, -3.5], [-2, -2], [-3.5, -2], [-3.5, 0], [-1.5, 0], [-1.5, 0.5], [-3.5, 0.5],
  [-3.5, 3.5], [-1.5, 3.5], [-1.5, 2], [0.5, 2], [0.5, 2.5], [-1, 2.5], [-1, 3.5], [3.5, 3.5], [3.5, 2.5], [1.5, 2.5],
  [1.5, 2], [3.5, 2], [3.5, -0.5], [1.5, -0.5], [1.5, -1.5], [2, -1.5], [2, -1], [3.5, -1], [3.5, -3.5], [2, -3.5],
  [2, -3], [1.5, -3], [1.5, -3.5], [-0.5, -3.5], [-0.5, -1], [0, -1], [0, -0.5], [-1, -0.5], [-1, -3.5]].map((v) => Object.freeze(v)));

/** The 13 locator points saved in the notebook; pts[[13]] is the reference point p (blue), pts[[11]] and pts[[12]]
 *  make the unused `o`, the others are not used at all (Q-VR-01). */
export const SAVED_PTS = Object.freeze([[0.5, 5], [-4.3, 2.65], [-5, -0.169], [-5, -3.0], [3.5, -5], [0, -2.5], [1.25, 0],
  [4.25, 0], [0.5, 1.15], [-1.15, 0.75], [1.22, -4.19], [-1.5, 1.5], [-1.83, 0.47]].map((v) => Object.freeze(v)));

/** The state saved in the notebook (states[0]) = the Manipulate's stored initial values (specs): step 3 of 42. */
export const SAVED = Object.freeze({ s: 3, m: 40, pts: SAVED_PTS });
export const initialState = () => ({ s: SAVED.s, m: SAVED.m, pts: SAVED.pts.map((v) => [...v]) });

/** DeleteCases[list, {_, b}] / {b, _}: Mathematica matches the pattern structurally (the same numbers). */
const samePoint = (u, v) => u.length === v.length && u.every((x, i) => x === v[i]);

/**
 * The visibility computation of the body (everything before Graphics) for the reference point pts[[13]]: the sweep
 * over the 40 vertices sorted by angle, statement by statement. Returns the original's lists after the final
 * Prepend/Append: sortedList, visibleSList, JlineList, lvLineList (42 entries each; entry s is what slider step s
 * shows), visibleList (the region), p (after the original's nudges), fvPoint, the polygons and m.
 */
export function visibility(pts) {
  let p = [...pts[12]];
  const o = [pts[10], pts[11]]; // unused, as in the original
  let workspace = Times(6 * (2 * 0.707107), CirclePoints4());
  let listofAllLines, sortedList, infiniteLine, lvLine, fvPoint, m;
  let a, b, c, prevA, prevB, prevC, postA, postB, postC, tb, abcList, ba, bc, pb;
  let pbAngle, pprevbAngle, pbaAngle, pbcAngle, index, gLine, giList, giPoint, giLine;
  let bcVisiInt, abNotVisInt, bcNotVisInt, abNotGlaInt, startJlistInt;
  let JlineList = [], oldP = [], jList = [], visibleList = [], lvLineList = [], visibleSList = [];
  let wi = false, wip = false, gFlag = false;
  let complexPoly = Times(1.5, Reverse(POLYGON));
  let inside; // testpoint[complexPoly, p], kept for the view

  // Only If p Locator are changed (oldP is {} at every evaluation: always)
  if (Unequal(oldP, p)) {
    // Restrict the p Locator
    for (let j = 1; j <= 2; j++) if (Greater(p[j - 1], 6) || Less(p[j - 1], -6)) { if (Greater(p[j - 1], 6)) p[j - 1] = 6; else p[j - 1] = -6; }
    // p on a vertex of the polygon: p − 0.00001 (2 v1 − v_index−1 − v_index+1) — the Map leaves index at the LAST
    // vertex, so p always moves by 0.00001 (v35 − v1), whichever vertex it is on (E-VR-01)
    if (complexPoly.map((v) => { index = Flatten(Position(complexPoly, v)); return Equal(p, v); }).some(Boolean)) {
      // RotateLeft[list, {n}] rotates level 1 by n
      p = Subtract(p, Times(0.00001, Subtract(Subtract(Times(2, complexPoly[0]), RotateLeft(complexPoly, index[0] - 2)[0]), RotateLeft(complexPoly, index[0])[0])));
    }
    // p on an edge: shift it 0.00001 against the edge's right-hand normal, into the building (each edge in turn, with
    // the p shifted so far)
    for (const e of lineList(complexPoly)) if (pointOnSegmentQ(e, p)) p = Subtract(p, Times(0.00001, normalVector(e)));

    // Reverse the order of the list representing a polygon if point p is inside the polygon
    inside = testpoint(complexPoly, p);
    if (inside) complexPoly = Reverse(complexPoly);
    if (testpoint(workspace, p)) workspace = Reverse(workspace);

    // make a List of all Lines
    listofAllLines = Join(lineList(workspace), lineList(complexPoly));

    // get a Line Parallel to x axis
    infiniteLine = [p, Plus([0.1, 0], [Max(Join(workspace, complexPoly).map((v) => v[0])), p[1]])];

    // Sort the lines based on the angle w.r.t to point p
    sortedList = Sort(Join(vertexList(workspace), vertexList(complexPoly)), (l1, l2) => angleSortCond(p, l1, l2));

    // get the intersection of lines for the Infinteline
    for (const l of listofAllLines) if (SegmentIntersectionQ([infiniteLine, l])) jList = Append(jList, Reverse(l));

    // Store the sorted values in jList
    jList = Sort(jList, (l1, l2) => distSortCond(infiniteLine, l1, l2, p));
    JlineList = Append(JlineList, jList);
    JlineList = Append(JlineList, jList); // twice: the J list drawn at step s is the one after vertex s − 2 (Q-VR-03)
    lvLine = First(jList);
    fvPoint = LineIntersectionPoint([lvLine, infiniteLine]);
    visibleSList = Append(visibleSList, [p, fvPoint]);

    // Find the line which is closest and also visible
    for (let i = 1, n = jList.length; i <= n; i++) {
      if (SegmentIntersectionQ([lvLine, jList[i - 1]])) {
        startJlistInt = LineIntersectionPoint([lvLine, jList[i - 1]]);
        if (noIntersection(p, startJlistInt, listofAllLines)) {
          visibleList = Append(visibleList, startJlistInt);
          if (Greater(startJlistInt[1], p[1])) lvLine = jList[i - 1];
        }
      }
    }
    lvLineList = Append(lvLineList, lvLine);

    // Total number of polygon vertices
    m = sortedList.length;

    // Loop around all the vertices of all the polygons
    for (let i = 1; i <= m; i++) {
      // Intialize all the variables
      [a, b, c] = sortedList[i - 1].slice(0, 3);
      [prevA, prevB, prevC] = (i !== 1 ? sortedList[i - 2] : sortedList[m - 1]).slice(0, 3);
      [postA, postB, postC] = (i !== m ? sortedList[i] : sortedList[0]).slice(0, 3);

      // for collinearity between current vertex, next vertex and point p then make them noncollinear — pbaAngle is
      // still the previous vertex's here (and has no value at i = 1: D-VR-01, E-VR-04)
      tb = pointOnSegmentQ([p, postB], b)
        ? (Equal(postB, a) || LessEqual(pbaAngle, Pi / 3) ? Plus(b, Times(0.00001, normalVector([a, p]))) : Subtract(b, Times(0.00001, normalVector([postB, p]))))
        : b;

      // List variables
      abcList = [a, tb, c];
      ba = [b, a]; bc = [b, c]; pb = [p, b];

      // get all the angles
      pbAngle = getAngle([p, b]); pprevbAngle = getAngle([p, prevB]);
      pbaAngle = getClockwiseAngle(p, b, a); pbcAngle = getClockwiseAngle(p, b, c);

      // Conditions to determine whether a vertex is visible or not
      if (intersectInteriorQRev2(p, abcList)) wi = false;
      else if (i === 1 || !pointOnSegmentQ(pb, a)) {
        if (noIntersection(p, b, jList)) {
          if (i !== 1) {
            if (Unequal(pbAngle, pprevbAngle)) wi = true;
            else if (Equal(b, prevA) || Equal(b, prevC) || Equal(b, postA) || Equal(b, postC) || gFlag) wi = true;
            else wi = false;
          } else wi = true;
        } else wi = false;
      } else if (wip) wi = noIntersection(b, a, jList);
      else wi = false;

      if (wi) { // If the vertices are visible
        // the intersection of the latest visible line with the line bc is visible
        if (SegmentIntersectionQ([lvLine, bc])) {
          bcVisiInt = LineIntersectionPoint([lvLine, bc]);
          if (noIntersection(p, bcVisiInt, listofAllLines)) visibleList = Append(visibleList, bcVisiInt);
        }
        // glancing blow condition (gFlag is True for a glancing blow)
        if (glancingBlow(p, abcList)) gFlag = false; else gFlag = true;
        // If glancing blow and previous vertex do not lie on the line pb
        if (gFlag && !pointOnSegmentQ(pb, prevB)) {
          // Extend the glancing line pb; its nearest crossing with a line not at b (or a line's end point on it)
          gLine = extendedLine(p, tb);
          const candidates = listofAllLines.filter((l) => !samePoint(l[0], b)).filter((l) => !samePoint(l[1], b));
          giList = Sort(candidates.map((l) => {
            if (SegmentIntersectionQ([gLine, l]) || (Unequal(b, l[1]) && pointOnSegmentQ(gLine, l[1])) || (Unequal(b, l[0]) && pointOnSegmentQ(gLine, l[0]))) {
              if (SegmentIntersectionQ([gLine, l])) return [LineIntersectionPoint([gLine, l]), l];
              if (Unequal(b, l[1]) && pointOnSegmentQ(gLine, l[1])) return [l[1], l];
              if (Unequal(b, l[0]) && pointOnSegmentQ(gLine, l[0])) return [l[0], l];
            }
            return null; // Null, deleted by DeleteCases[…, Null]
          }).filter((x) => x !== null), (u, v) => Less(EuclideanDistance(p, u[0]), EuclideanDistance(p, v[0])));
          if (giList.length !== 0) {
            // giPoint: the nearest crossing of the extended glancing line; giLine: its line
            giPoint = giList[0][0]; giLine = giList[0][1];
            // Condition to decide the order of appending the vertex and the intersection point
            if ((pointOnSegmentQ(lvLine, giPoint) && Unequal(Chop(getAngle(pb)), 0)) || (i === 1 && LessEqual(pbaAngle, Pi / 2))
              || (SegmentIntersectionQ([gLine, lvLine]) && Equal(LineIntersectionPoint([gLine, lvLine]), giPoint)) || Equal(giPoint, lvLine[1])) {
              visibleList = Join(visibleList, [giPoint, b]); lvLine = ba;
            } else {
              visibleList = Join(visibleList, [b, giPoint]); lvLine = giLine;
            }
          }
        } else {
          // If not glancing blow then just append the vertex
          if (Unequal(pbAngle, pprevbAngle)) visibleList = Append(visibleList, b);
          lvLine = ba;
          // an intersection of a line in the J list with the line ba is visible
          for (let i = 1, n = jList.length; i <= n; i++) {
            if (SegmentIntersectionQ([ba, jList[i - 1]])) {
              abNotGlaInt = LineIntersectionPoint([ba, jList[i - 1]]);
              if (noIntersection(p, abNotGlaInt, listofAllLines)) { visibleList = Append(visibleList, abNotGlaInt); lvLine = jList[i - 1]; }
            }
          }
        }
      } else if (SegmentIntersectionQ([pb, lvLine])) { // not visible, and pb crosses the latest visible line
        // the line ba on the left of pb: its intersection with the latest visible line is visible
        if (Less(pbaAngle, Pi)) {
          if (!leftOrRight(p, b, a) && SegmentIntersectionQ([lvLine, ba])) {
            abNotVisInt = LineIntersectionPoint([lvLine, ba]);
            if (noIntersection(p, abNotVisInt, listofAllLines)) { visibleList = Append(visibleList, abNotVisInt); lvLine = ba; }
          }
        }
        // the line bc on the left of pb: likewise
        if (Less(pbcAngle, Pi)) {
          if (!leftOrRight(p, b, c) && SegmentIntersectionQ([lvLine, bc])) {
            bcNotVisInt = LineIntersectionPoint([lvLine, bc]);
            if (noIntersection(p, bcNotVisInt, listofAllLines)) { visibleList = Append(visibleList, bcNotVisInt); lvLine = bc; }
          }
        }
      } else {
        // otherwise a line of the J list crossing the latest visible line (Map: lvLine changes on the way)
        for (const l of jList) if (SegmentIntersectionQ([l, lvLine])) { visibleList = Append(visibleList, LineIntersectionPoint([l, lvLine])); lvLine = l; }
      }

      // Update the Jlist and wip: add the lines that go counter-clockwise, remove the lines that end at b
      if (Less(pbaAngle, Pi)) jList = Append(jList, ba);
      if (Less(pbcAngle, Pi)) jList = Append(jList, bc);
      jList = jList.filter((l) => !samePoint(l[1], b));
      wip = wi;

      // Append all the sets of lists
      visibleSList = Append(visibleSList, Join(Join([p, fvPoint], visibleList), [p]));
      JlineList = Append(JlineList, jList);
      lvLineList = Append(lvLineList, lvLine);
    }
    // Update the prev P
    oldP = p;
  }
  // Append the final visible region
  sortedList = Append(Prepend(sortedList, [p, fvPoint]), [p, fvPoint]);
  visibleSList = Append(visibleSList, visibleList);
  lvLineList = Append(lvLineList, [[], []]);
  return { p, inside, fvPoint, m, complexPoly, workspace, sortedList, visibleSList, JlineList, lvLineList, visibleList };
}

/**
 * One evaluation of the Manipulate body: the visibility computation for pts[[13]] (it writes m = Length@sortedList, a
 * Manipulate variable: the slider's range is 1 … m + 2) and the picture of step s.
 */
export function evaluate(state) {
  const { s, pts } = state;
  const r = visibility(pts);
  const { p, sortedList, visibleSList, JlineList, lvLineList, visibleList } = r;
  const k = Math.min(Math.max(Math.round(s), 1), sortedList.length) - 1; // list index of step s (the slider: 1 … m + 2)
  const target = sortedList[k][1]; // sortedList[[s, 2]]: this step's vertex (the first ray's end at steps 1 and m + 2)
  const angle = getAngle([p, target]);
  const lv = lvLineList[k].filter((q) => q.length); // Line@{{}, {}} at step m + 2: nothing
  const graphics = [
    [[Opacity(0.5), EdgeForm(Thin), Transparent, Annotation(Polygon(r.complexPoly), 'polygon')]],
    [[Opacity(0.5), EdgeForm(Thin), Transparent, Annotation(Polygon(r.workspace), 'workspace')]],
    [[EdgeForm(Lighter(Purple, 0.8)), Opacity(0.5), Yellow, Annotation(Polygon(visibleList), 'visibility-region')]],
    [[EdgeForm(Lighter(Purple, 0.8)), Opacity(0.3), Orange, Annotation(Polygon(visibleSList[k]), 'partial-region')]],
    // the original writes PointSize -> Medium (a rule in the list); its snapshots show the Medium size (N-VR-02). An
    // arc {0, 0} is empty (the renderer would draw a dot for it)
    [[Blue, PointSize('Medium'), Annotation(Point(p), 'reference-point'), angle !== 0 && Annotation(Circle(p, 0.2, [0, angle]), 'angle-arc')]],
    [[Opacity(0.4), Blue, Annotation(Line([p, target]), 'sweep-ray')]],
    [[Orange, Thickness(0.01), Annotation(Line(lv), 'active-edge')]],
    [[Thickness(0.005), Green, Annotation(Line(JlineList[k]), 'j-list')]],
    [[Red, visibleList.length > 0 && Annotation(Point(visibleList), 'visible-points')]],
  ];
  return {
    state: { ...state, m: r.m },
    view: {
      p, inside: r.inside, fvPoint: r.fvPoint, m: r.m, step: k + 1, vertex: target, angle,
      sorted: sortedList.map((t) => t[1]), activeEdge: lvLineList[k], jList: JlineList[k], partial: visibleSList[k], visibleList,
    },
    graphics,
  };
}
