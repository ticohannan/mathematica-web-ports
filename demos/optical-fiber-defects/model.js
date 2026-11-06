// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Hoang Nguyen
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/optical-fiber-defects/model.js — "Defects in an Optical Fiber": the initialization cells (angtest, testpoint,
// incidentAng, normAng, TraceLaser) and one evaluation of the Manipulate body, the state in, { view, graphics } out
// (pure, no DOM). Simple mode: plain arithmetic; the segment helpers Gamma, LineIntersectionPoint and
// SegmentIntersectionQ are the shared definitions of demos/common/segments.js (D-OF-01).
import {
  Rectangle, Polygon, Line, Opacity, Red, Blue, White, LightGray, Thick, Thickness, Dashed, CapForm, JoinForm, Annotation,
} from '../../shared/graphics.js';
import { ArcTan, ArcSin, Sin, Cos, Pi, Norm, RotateLeft } from '../../shared/wl.js';
import { lineIntersectionPoint, segmentIntersectionQ } from '../common/segments.js';

export const LEN = 5, DD = 1;
export const initialState = () => ({ h: 3 * 0.135, w: 3 * 0.26, θ1: (-4 * Pi) / 64, θ2: (-4 * Pi) / 64, p: [[-1.8, 1 / 2], [-3.8, 1 / 2]] });

/** angtest[p1, p2] := p1.{{0, -1}, {1, 0}}.p2 > 0 (the sign of the angle between two vectors). */
export const angtest = ([x1, y1], [x2, y2]) => y1 * x2 - x1 * y2 > 0;
/** testpoint[poly, pt]: pt inside the convex polygon (all angles between adjacent vertex vectors of one sign). */
export function testpoint(poly, pt) {
  const v = poly.map((q) => [q[0] - pt[0], q[1] - pt[1]]);
  const w = RotateLeft(v);
  const signs = v.map((a, i) => angtest(a, w[i]));
  return signs.every((s) => s === signs[0]);
}
/** The angle in (−π, π] (the two If's of incidentAng). */
const wrap = (a) => (a > Pi ? a - 2 * Pi : a < -Pi ? a + 2 * Pi : a);
/**
 * incidentAng[ray, seg]: the signed angle of incidence between the ray {start, hit} and the normal of seg on the
 * incoming side, and that normal's direction: {incAng, normalAngle}.
 */
export function incidentAng([s, t], [[x1, y1], [x2, y2]]) {
  const a = [s[0] - t[0], s[1] - t[1]], b = [-(y2 - y1), x2 - x1];
  const ang1 = wrap(ArcTan(a[0], a[1]) - ArcTan(b[0], b[1]));
  const ang2 = wrap(ArcTan(a[0], a[1]) - ArcTan(-b[0], -b[1]));
  return Math.abs(ang1) < Math.abs(ang2) ? [ang1, ArcTan(b[0], b[1])] : [ang2, ArcTan(-b[0], -b[1])];
}
/** normAng[seg] (defined in the notebook, not used by TraceLaser). */
export const normAng = ([[x1, y1], [x2, y2]]) => ArcTan(-(y2 - y1), x2 - x1);

/**
 * TraceLaser[pt, θ, pow, segs, N1, N2] (F-OF-07) as Graphics data: the ray to the nearest boundary (Opacity[5 pow]),
 * then — when it hit a boundary within 25 of the origin and pow > 1/100 — the refracted ray (unless beyond the critical
 * angle), the boundary normal (blue) and the reflected ray, each traced again. `rays` collects { from, to, pow } (for
 * the hook and the tests).
 */
export function TraceLaser(pt, θ, pow, segs, N1, N2, rays = []) {
  const MaxRay = 50, sθ = Sin(θ), cθ = Cos(θ);
  let powReflect = pow;
  const critAng = N1 > N2 ? ArcSin(N2 / N1) : Pi;
  let incAng = θ, normAngle;
  const far = [pt[0] + MaxRay * cθ, pt[1] + MaxRay * sθ];
  let int = far;
  const s1 = [pt, far];
  for (const seg of segs) {
    if (!segmentIntersectionQ([s1, seg])) continue;
    const T = lineIntersectionPoint([s1, seg]);
    const d = (T[0] - pt[0]) ** 2 + (T[1] - pt[1]) ** 2;
    if (0.001 < d && d < (int[0] - pt[0]) ** 2 + (int[1] - pt[1]) ** 2) { int = T; [incAng, normAngle] = incidentAng(s1, seg); }
  }
  rays.push({ from: pt, to: int, pow });
  const out = [Opacity(5 * pow), Line([pt, int])];
  if ((int[0] !== far[0] || int[1] !== far[1]) && Norm(int) < MaxRay / 2 && pow > 1 / 100) {
    const transAng = ArcSin((N1 / N2) * Sin(incAng)); // NaN beyond the critical angle (not used then)
    const part = [];
    if (Math.abs(incAng) < critAng) {
      powReflect = pow * ((N1 - N2) / (N1 + N2)) ** 2; // the normal-incidence reflectance (E-OF-01)
      part.push(TraceLaser(int, θ - incAng + transAng, pow - powReflect, segs, N2, N1, rays));
    }
    const n = [0.2 * Cos(normAngle), 0.2 * Sin(normAngle)];
    part.push([Blue, Thickness(0.002), Annotation(Line([int, [int[0] + n[0], int[1] + n[1]]]), 'normal'), Dashed, Line([int, [int[0] - n[0], int[1] - n[1]]])]);
    part.push(TraceLaser(int, θ - Pi - 2 * incAng, powReflect, segs, N1, N2, rays));
    out.push(part);
  }
  return out;
}

/** The five boundaries (F-OF-05): the bottom left of the defect, its two sides, the bottom right, the top. */
export const edgesOf = (h, w) => [
  [[-LEN, 0], [-w / 2, 0]],
  [[-w / 2, 0], [0, h]],
  [[0, h], [w / 2, 0]],
  [[w / 2, 0], [LEN, 0]],
  [[-LEN, DD], [LEN, DD]],
];
/** The indices {N1, N2} where a ray starts (F-OF-06): inside the fiber and not in the defect, {1.5, 1}. */
export function startIndices(h, w, q) {
  return DD > q[1] && q[1] > 0 && !testpoint([[-w / 2, 0], [0, h], [w / 2, 0]], q) ? [1.5, 1] : [1, 1.5];
}

/** The Manipulate body (F-OF-04). */
export function evaluate({ h, w, θ1, θ2, p }) {
  const edges = edgesOf(h, w), Θ = [θ1, θ2];
  const rays = p.map(() => []);
  const light = p.map((q, n) => {
    const [N1, N2] = startIndices(h, w, q);
    return Annotation(TraceLaser(q, Θ[n], 1, edges, N1, N2, rays[n]), `light-${n + 1}`);
  });
  const graphics = [
    LightGray, Annotation(Rectangle([-LEN, 0], [LEN, DD]), 'fiber'),
    White, Annotation(Polygon([[0, h], [w / 2, 0], [-w / 2, 0]]), 'defect'),
    Red, Thick, CapForm('Butt'), JoinForm('Bevel'),
    light,
  ];
  return {
    view: {
      rays: rays.map((r) => r.map(({ from, to, pow }) => ({ from, to, pow }))),
      indices: p.map((q) => startIndices(h, w, q)),
    },
    graphics,
  };
}
