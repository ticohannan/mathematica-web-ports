// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Victor M. Baez and Nikhil Navkar
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/segment-distance/model.js — one evaluation of the Manipulate body: the state in, { view, graphics } out (pure, no DOM).
// The original's initialization functions are transcribed with their names (simple mode: plain machine arithmetic,
// shared/wl.js list functions); the picture is Graphics3D data of shared/graphics3d.js.
import { Graphics3D, Red, Green, Blue, Yellow, White, Opacity, FontSize, Sphere, Tube, Polygon, InfiniteLine, InfinitePlane, Text } from '../../shared/graphics3d.js';
import { Plus, Subtract, Times, Divide, Dot, Cross, Norm, Det, Sort, Join, Round } from '../../shared/wl.js';

/** the Manipulate's initial settings (the notebook's stored Variables) */
export const initialState = () => ({
  axy: [-3, 3], bxy: [1, 1], cxy: [-2, -4], dxy: [4, -2],
  az: 1, bz: 2, cz: -1, dz: -2,
  showPlaneAB: true, showPlaneCD: true,
});

const same = (p, q) => p.every((x, k) => x === q[k]);

/** drawShortestLineSeg[a, b] */
export const drawShortestLineSeg = (a, b) => [Red, Sphere(a, 0.4), Sphere(b, 0.4), Tube([a, b], 0.05)];

/** drawPerpLineSeg[a, b, ua, ub, aPerp, bPerp]: yellow segment ab with a perpendicular mark at a (aPerp) and at b (bPerp). */
export function drawPerpLineSeg(a, b, ua, ub, aPerp, bPerp) {
  const len = 0.5;
  const dNorm = Norm(Subtract(b, a));
  let marks = null;
  if (dNorm > 0) {
    const uba = Divide(Subtract(b, a), dNorm);
    marks = [
      aPerp ? Polygon([a, Plus(a, Times(len, ua)), Plus(a, Times(len, ua), Times(len, uba)), Plus(a, Times(len, uba))]) : null,
      bPerp ? Polygon([b, Plus(b, Times(len, ub)), Subtract(Plus(b, Times(len, ub)), Times(len, uba)), Subtract(b, Times(len, uba))]) : null,
    ];
  }
  return [Yellow, Sphere(a, 0.4), Sphere(b, 0.4), Tube([a, b], 0.04), marks];
}

/** drawClosestPointLineSegment[p, l1, l2]: the projection of p on the line (yellow) and the closest point of the segment (red). */
export function drawClosestPointLineSegment(p, l1, l2) {
  const [px, py, pz] = p, [lx1, ly1, lz1] = l1, [lx2, ly2, lz2] = l2;
  const lineLengthSq = (lx2 - lx1) ** 2 + (ly2 - ly1) ** 2 + (lz2 - lz1) ** 2;
  if (lineLengthSq === 0) return l1.slice(); // special case for zero-length line (never reached from the body)
  const t = ((px - lx1) * (lx2 - lx1) + (py - ly1) * (ly2 - ly1) + (pz - lz1) * (lz2 - lz1)) / lineLengthSq;
  let tC = t;
  if (t > 1) tC = 1;
  if (t < 0) tC = 0; // constrain t to [0, 1]
  const pb = Plus(l1, Times(t, Subtract(l2, l1)));
  const pbC = Plus(l1, Times(tC, Subtract(l2, l1)));
  const lu = Divide(Subtract(l2, l1), Norm(Subtract(l2, l1)));
  return [drawPerpLineSeg(p, pb, null, t > 0.5 ? lu : Times(-1, lu), false, true), drawShortestLineSeg(p, pbC)];
}

/** findClosestPointLineSegment[p, l1, l2]: the closest point of segment l1 l2 to p. */
export function findClosestPointLineSegment(p, l1, l2) {
  const [px, py, pz] = p, [lx1, ly1, lz1] = l1, [lx2, ly2, lz2] = l2;
  const lineLengthSq = (lx2 - lx1) ** 2 + (ly2 - ly1) ** 2 + (lz2 - lz1) ** 2;
  if (lineLengthSq === 0) return l1.slice();
  let t = ((px - lx1) * (lx2 - lx1) + (py - ly1) * (ly2 - ly1) + (pz - lz1) * (lz2 - lz1)) / lineLengthSq;
  if (t > 1) t = 1;
  if (t < 0) t = 0;
  return Plus(l1, Times(t, Subtract(l2, l1)));
}

/**
 * The common part of drawClosestDistanceBetweenLines and closestDistanceBetweenLines (the StackOverflow algorithm,
 * transcribed): for parallel lines the branch taken; otherwise the projected points pA, pB (t0, t1 along uA, uB) and
 * the clamped points pAc, pBc. The clamping steps use the UNCLAMPED pA, pB, as the original does (§11 E-SD-01).
 */
export function segmentsData(a0, a1, b0, b1) {
  const vA = Subtract(a1, a0), vB = Subtract(b1, b0);
  const magA = Norm(vA), magB = Norm(vB);
  const uA = Divide(vA, magA), uB = Divide(vB, magB);
  const cross = Cross(uA, uB);
  const denom = Norm(cross) ** 2;
  const base = { vA, vB, magA, magB, uA, uB, cross, denom };
  if (denom === 0) {
    const d0 = Dot(uA, Subtract(b0, a0));
    const d1 = Dot(uA, Subtract(b1, a0));
    if (d0 <= 0 && d1 <= 0) return { ...base, parallel: 'before', d0, d1 }; // is segment B before A?
    if (d0 >= magA && d1 >= magA) return { ...base, parallel: 'after', d0, d1 }; // is segment B after A?
    return { ...base, parallel: 'overlap', d0, d1 };
  }
  // lines not parallel: the projected closest points
  const t = Subtract(b0, a0);
  const detA = Det([t, uB, cross]);
  const detB = Det([t, uA, cross]);
  const t0 = detA / denom, t1 = detB / denom;
  const pA = Plus(a0, Times(uA, t0)); // projected closest point on segment A
  const pB = Plus(b0, Times(uB, t1)); // projected closest point on segment B
  let pAc = pA, pBc = pB;
  // clamp projections
  if (t0 < 0) pAc = a0;
  if (t0 > magA) pAc = a1;
  if (t1 < 0) pBc = b0;
  if (t1 > magB) pBc = b1;
  let dot;
  // clamp projection A
  if (t0 < 0 || t0 > magA) {
    dot = Dot(uB, Subtract(pA, b0));
    if (dot < 0) dot = 0;
    if (dot > magB) dot = magB;
    pBc = Plus(b0, Times(uB, dot));
  }
  // clamp projection B
  if (t1 < 0 || t1 > magB) {
    dot = Dot(uA, Subtract(pB, a0));
    if (dot < 0) dot = 0;
    if (dot > magA) dot = magA;
    pAc = Plus(a0, Times(uA, dot));
  }
  return { ...base, parallel: null, t0, t1, pA, pB, pAc, pBc };
}

/** drawClosestDistanceBetweenLines[a0, a1, b0, b1]: the drawings for the closest points of the two segments. */
export function drawClosestDistanceBetweenLines(a0, a1, b0, b1) {
  const s = segmentsData(a0, a1, b0, b1);
  const { magA, uA, uB, d0, d1 } = s;
  if (s.parallel === 'before') {
    if (Math.abs(d0) < Math.abs(d1)) return [drawShortestLineSeg(a0, b0), drawPerpLineSeg(a0, Subtract(b0, Times(d0, uA)), uA, uB, true, true), drawPerpLineSeg(b0, Plus(a0, Times(d0, uA)), uA, uB, true, true)];
    return [drawShortestLineSeg(a0, b1), drawPerpLineSeg(a0, Subtract(b1, Times(d1, uA)), uA, uB, true, true), drawPerpLineSeg(b1, Plus(a0, Times(d1, uA)), uA, uB, true, true)];
  }
  if (s.parallel === 'after') {
    if (Math.abs(d0) < Math.abs(d1)) return [drawShortestLineSeg(a1, b0), drawPerpLineSeg(a1, Plus(b0, Times(magA - d0, uA)), uA, uB, true, true), drawPerpLineSeg(b0, Subtract(a1, Times(magA - d0, uA)), uA, uB, true, true)];
    return [drawShortestLineSeg(a1, b1), drawPerpLineSeg(a1, Plus(b1, Times(magA - d1, uA)), uA, uB, true, true), drawPerpLineSeg(b1, Subtract(a1, Times(magA - d1, uA)), uA, uB, true, true)];
  }
  if (s.parallel === 'overlap') { // segments overlap: the polygon of possibilities
    const projs = Sort([0, d0, d1, magA]);
    const off = Subtract(b0, Plus(Times(d0, uA), a0));
    const p2 = Plus(a0, Times(uA, projs[1])), p3 = Plus(a0, Times(uA, projs[2]));
    return [drawShortestLineSeg(p2, Plus(p2, off)), Red, Opacity(0.5), Polygon([p2, Plus(p2, off), Plus(p3, off), p3])];
  }
  const { t0, t1, pA, pB, pAc, pBc } = s;
  return [drawShortestLineSeg(pAc, pBc), drawPerpLineSeg(pA, pB, t0 > 0.5 ? Times(-1, uA) : uA, t1 > 0.5 ? Times(-1, uB) : uB, true, true)];
}

/** closestDistanceBetweenLines[a0, a1, b0, b1]: the distance of the two segments. */
export function closestDistanceBetweenLines(a0, a1, b0, b1) {
  const s = segmentsData(a0, a1, b0, b1);
  const { uA, d0, d1 } = s;
  if (s.parallel === 'before') return Math.abs(d0) < Math.abs(d1) ? Norm(Subtract(a0, b0)) : Norm(Subtract(a0, b1));
  if (s.parallel === 'after') return Math.abs(d0) < Math.abs(d1) ? Norm(Subtract(a1, b0)) : Norm(Subtract(a1, b1));
  if (s.parallel === 'overlap') return Norm(Subtract(Plus(Times(d0, uA), a0), b0));
  return Norm(Subtract(s.pAc, s.pBc));
}

/**
 * InfinitePlane[p, {v1, v2}] as the three-point form of shared/graphics3d.js; nothing when v1, v2 do not span a plane
 * (parallel segments or a segment of length 0: D-SD-03).
 */
export function infinitePlane(p, [v1, v2]) {
  if (Norm(Cross(v1, v2)) === 0) return null;
  return InfinitePlane([p, Plus(p, v1), Plus(p, v2)]);
}

/** Round[dist, 0.01] as the PlotLabel shows it (a machine real: "5.51", "14.14", "0.") */
export function roundedText(dist) {
  const r = Number(Round(dist, 0.01).toPrecision(6));
  return Number.isInteger(r) ? `${r}.` : String(r);
}

export const PLOT_RANGE = [[-5.2, 5.2], [-5.2, 5.2], [-5.2, 5.2]];

/** The Manipulate body. */
export function evaluate({ axy, bxy, cxy, dxy, az, bz, cz, dz, showPlaneAB, showPlaneCD }) {
  const a = Join(axy, [az]); // the four end points of the line segments
  const b = Join(bxy, [bz]);
  const c = Join(cxy, [cz]);
  const d = Join(dxy, [dz]);
  let dist, closest, kind;
  if (!same(a, b) && !same(c, d)) {
    dist = closestDistanceBetweenLines(a, b, c, d);
    closest = drawClosestDistanceBetweenLines(a, b, c, d);
    kind = segmentsData(a, b, c, d).parallel ?? 'skew';
  } else if (same(a, b) && same(c, d)) {
    dist = Norm(Subtract(a, c)); // draw line between them
    closest = drawShortestLineSeg(a, c);
    kind = 'points';
  } else if (same(a, b)) {
    dist = Norm(Subtract(a, findClosestPointLineSegment(a, c, d)));
    closest = drawClosestPointLineSegment(a, c, d);
    kind = 'A=B';
  } else {
    dist = Norm(Subtract(c, findClosestPointLineSegment(c, a, b)));
    closest = drawClosestPointLineSegment(c, a, b);
    kind = 'C=D';
  }
  const n = Cross(Subtract(b, a), Subtract(d, c));
  const planeAB = showPlaneAB && dist > 0 ? infinitePlane(a, [Subtract(b, a), Cross(n, Subtract(b, a))]) : null;
  const planeCD = showPlaneCD && dist > 0 ? infinitePlane(d, [Subtract(d, c), Cross(n, Subtract(d, c))]) : null;
  const label = `minimum distance is ${roundedText(dist)}`;
  const graphics = Graphics3D([
    Green, Sphere(a, 0.4), Sphere(b, 0.4), // draw a and b
    !same(a, b) ? [InfiniteLine([a, b]), Tube([a, b], 0.05)] : null,
    Blue, Sphere(c, 0.4), Sphere(d, 0.4), // draw c and d
    !same(c, d) ? [InfiniteLine([c, d]), Tube([c, d], 0.05)] : null,
    closest,
    [Opacity(0.4), planeAB && [Green, planeAB], planeCD && [Blue, planeCD]], // the planes
    [FontSize(14), White, Text('A', a), Text('B', b), Text('C', c), Text('D', d)],
  ], {
    Axes: true, AxesLabel: ['<i>x</i>', '<i>y</i>', '<i>z</i>'],
    PlotRange: PLOT_RANGE, PlotLabel: label, ImageSize: [450, 400],
  });
  return { view: { a, b, c, d, dist, kind, label, planes: [!!planeAB, !!planeCD] }, graphics };
}
