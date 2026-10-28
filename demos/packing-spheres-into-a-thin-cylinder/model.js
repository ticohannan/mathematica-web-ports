// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Li Huang
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/packing-spheres-into-a-thin-cylinder/model.js — the Demonstration's two Initialization definitions
// (tubeSphereStackParamsFAST, sphereToSphereContacts), its precomputed plot BestCompressionPlot and one evaluation of
// the Manipulate body: the state in, { view, graphics: [plot, Graphics3D] } out (pure, no DOM). Simple mode: plain
// arithmetic with shared/wl.js names, written as close to the Wolfram code as JavaScript allows.
import { Sqrt, Sin, Cos, Pi, ArcTan, ArcCos, Ceiling, EvenQ, Mod, Max, Length, Last, Riffle, Join, Flatten, Table, span,
  DeleteCases, StringForm, Times } from '../../shared/wl.js';
import { Graphics, Line, Point, Circle, Disk, Black, Red, Thin, PointSize, EdgeForm, Row, Style, Italic, Inset, Text, Dotted }
  from '../../shared/graphics.js';
import { Plot, Placed, Show } from '../../shared/plot.js';
import * as G3 from '../../shared/graphics3d.js';

/** r = 1 (a global constant of the notebook; the sphere radius). */
export const r = 1;

/** The saved live state of the notebook (= the Manipulate's initial values): F-PS-15. */
export const initialState = () => ({ R: r, θ: 0, SphereOpacity: 0.6, NumSpheres: 8 });

const sqrt3 = Sqrt(3), sqrt2 = Sqrt(2), sqrt5 = Sqrt(5), sqrt6 = Sqrt(6);
/** The bounds of the Piecewise in tubeSphereStackParamsFAST (Wn = W/r), in order. */
export const BOUNDS = Object.freeze({
  zigzag: 2 + sqrt3, twistedZigzag: 4, two: 2 * (2 / sqrt3 + 1), three: (2 / 7) * (7 + Sqrt(70)), twoBack: 2 + sqrt6,
  twoTwisted: 2 * (1 + sqrt2), four: (2 / 79) * (79 + Sqrt(1106 * (2 + 9 * sqrt2))), threeBack: 2 + Sqrt(8 + 8 / sqrt5),
  five: 2 + 16 * Sqrt((2 * (155 - 9 * sqrt5)) / 5905), threeAgain: 2 * (1 + sqrt3), threeTwisted: 6,
});

/**
 * tubeSphereStackParamsFAST[W, r]: for a cylinder of width W (= 2R) and spheres of radius r, {Alpha, e, z, numsides,
 * IsTwist, Ang2, z2} — Alpha the plane angle between successive spheres, e the edge length, z the compression ratio
 * (axial advance per sphere / 2r), numsides the spheres per level, IsTwist whether alternate levels are twisted by Ang2
 * and offset by z2. The Piecewise as an if chain in the original's order (comments: the original's).
 */
export function tubeSphereStackParamsFAST(W, r) {
  const Wn = W / r;
  let IsTwist = false, Ang2 = 0, z2 = 0, z, numsides;
  const B = BOUNDS;
  if (Wn <= B.zigzag) [z, numsides] = [Sqrt((4 * r - W) * W) / 2, 1]; // 1 at a time
  else if (Wn < B.twistedZigzag) { // 2, twisted zigzag
    [z, numsides] = [(1 / (4 * r)) * (4 * Sqrt((-2 + W) ** 2) * W - Sqrt((-2 + W) ** 2) * W ** 2 - 2 * Sqrt(W) * Sqrt((-4 + W) * (-8 + (-4 + W) * W))
      + W ** (3 / 2) * Sqrt((-4 + W) * (-8 + (-4 + W) * W))) / (2 * Sqrt(-(-4 + W) * (-2 + W) ** 2 * W)), 2];
  } else if (Wn <= B.two) [z, numsides] = [(1 / (4 * r)) * Sqrt(4 * r ** 2 - ((W - 2 * r) ** 2) / 2), 2]; // 2 at a time
  else if (Wn <= B.three) [z, numsides] = [(1 / (6 * r)) * Sqrt(4 * r ** 2 - (W / 2 - r) ** 2), 3]; // 3 at a time
  else if (Wn <= B.twoBack) [z, numsides] = [(1 / (4 * r)) * Sqrt(4 * r ** 2 - ((W - 2 * r) ** 2) / 2), 2]; // back 2 at a time
  else if (Wn <= B.twoTwisted) { // 2 at a time, twisted
    [z, numsides] = [(1 / (8 * r)) * (Sqrt(4 - (-4 + W) * W) + Sqrt(4 - (-4 + W) * W + 8 * sqrt2 * Sqrt((-4 + W) * W))) / (2 * sqrt2), 4];
  } else if (Wn <= B.four) [z, numsides] = [(1 / (8 * r)) * Sqrt(4 * r ** 2 + (1 / 4) * (-2 + sqrt2) * (-2 * r + W) ** 2), 4]; // 4 at a time
  else if (Wn <= B.threeBack) [z, numsides] = [(1 / (6 * r)) * Sqrt(4 * r ** 2 - (W / 2 - r) ** 2), 3]; // back to 3 at a time
  else if (Wn <= B.five) [z, numsides] = [(1 / (10 * r)) * Sqrt(4 + (1 / 32) * (-5 + sqrt5) * (-2 + W) ** 2), 5]; // 5 at a time (E-PS-01)
  else if (Wn <= B.threeAgain) [z, numsides] = [(1 / (6 * r)) * Sqrt(4 * r ** 2 - (W / 2 - r) ** 2), 3]; // back to 3 at a time
  else if (Wn <= B.threeTwisted) { // 3 at a time, twisted
    [z, numsides] = [(1 / (12 * r)) * ((1 / 4) * Sqrt(-(-6 + W) * (2 + W)) + (1 / 4) * Sqrt(-52 + 4 * W - W ** 2 + 16 * sqrt3 * Sqrt(4 - 4 * W + W ** 2))), 6];
  } else [z, numsides] = [1 / 8, 4]; // 4 at a time, no compression
  if (B.zigzag < Wn && Wn < B.twistedZigzag) { // 1 zig zag
    IsTwist = true;
    z2 = Sqrt(4 * r ** 2 - (W - 2 * r) ** 2);
    Ang2 = ArcTan(-(Sqrt(W) * Sqrt((-4 + W) * (-8 + (-4 + W) * W))) / (2 * Sqrt((-2 + W) ** 2)), 2 * Sqrt(1 - 3 / ((-2 + W) ** 2)));
  }
  if (B.twoBack < Wn && Wn < B.twoTwisted) { // 2 zigzag
    IsTwist = true;
    z2 = Sqrt(4 * r ** 2 - (1 / 2) * (W - 2 * r) ** 2);
    const a = Sqrt(4 - (-4 + Wn) * Wn), b = Sqrt(4 - (-4 + Wn) * Wn + 8 * sqrt2 * Sqrt((-4 + Wn) * Wn)), c = -4 + (-4 + Wn) * Wn + 4 * sqrt2 * Sqrt((-4 + Wn) * Wn);
    Ang2 = ArcTan(-(c + a * b) / (4 * (-2 + Wn)), (c - a * b) / (4 * (-2 + Wn)));
  }
  if (B.threeAgain < Wn) { // 3 zigzag (E-PS-03: Wn where W is meant)
    IsTwist = true;
    z2 = Sqrt(4 * r ** 2 - (Wn / 2 - r) ** 2);
    Ang2 = ArcCos((-4 - 4 * Wn + Wn ** 2 + (1 / 8) * (Sqrt(-(-6 + Wn) * (2 + Wn)) + Sqrt(-52 + 16 * sqrt3 * Sqrt((-2 + Wn) ** 2) - (-4 + Wn) * Wn)) ** 2) / ((-2 + Wn) ** 2));
  }
  const Alpha = Pi / numsides;
  const e = (W / 2 - r) * 2 * Sin(Pi / numsides); // never used by the body (Q-PS-03)
  return { Alpha, e, z, numsides, IsTwist, Ang2, z2 };
}

/** c[[a ;; -1 ;; s]] */
const sp = (c, a, s) => span(c, a, -1, s);
/**
 * sphereToSphereContacts[W, r, c]: the polylines through the centres c of touching spheres, for the structure of W/r
 * (the original's Piecewise, same bounds as tubeSphereStackParamsFAST but ≤ at 4). One polyline (the line and zigzag)
 * or a list of polylines.
 */
export function sphereToSphereContacts(W, r, c) {
  const Wn = W / r, B = BOUNDS;
  const threes = () => [sp(c, 1, 3), sp(c, 2, 3), sp(c, 3, 3), Riffle(sp(c, 1, 6), sp(c, 6, 6)), Riffle(sp(c, 2, 6), sp(c, 4, 6)), Riffle(sp(c, 3, 6), sp(c, 5, 6))];
  const twos = () => [sp(c, 1, 2), sp(c, 2, 2), Riffle(sp(c, 1, 4), sp(c, 4, 4)), Riffle(sp(c, 2, 4), sp(c, 3, 4))];
  if (Wn <= B.zigzag) return c; // 1 at a time
  if (Wn <= B.twistedZigzag) return [c, sp(c, 1, 2), sp(c, 2, 2)]; // 1, zig zag
  if (Wn <= B.two) return twos(); // 2 at a time
  if (Wn <= B.three) return threes(); // 3 at a time
  if (Wn <= B.twoBack) return twos(); // back 2 at a time
  if (Wn <= B.twoTwisted) { // 2 at a time, zigzag (the original's "FIX")
    return [c, Riffle(sp(c, 1, 4), sp(c, 4, 4)), Riffle(sp(c, 2, 4), sp(c, 7, 4)), Riffle(sp(c, 1, 8), sp(c, 7, 8)),
      Riffle(sp(c, 2, 8), sp(c, 8, 8)), Riffle(sp(c, 3, 8), sp(c, 5, 8)), Riffle(sp(c, 4, 8), sp(c, 6, 8))];
  }
  if (Wn <= B.four) { // 4 at a time
    return [sp(c, 1, 4), sp(c, 2, 4), sp(c, 3, 4), sp(c, 4, 4), Riffle(sp(c, 1, 8), sp(c, 8, 8)), Riffle(sp(c, 2, 8), sp(c, 5, 8)),
      Riffle(sp(c, 3, 8), sp(c, 6, 8)), Riffle(sp(c, 4, 8), sp(c, 7, 8))];
  }
  if (Wn <= B.threeBack) return threes(); // back to 3 at a time
  if (Wn <= B.five) { // 5 at a time
    return [sp(c, 1, 5), sp(c, 2, 5), sp(c, 3, 5), sp(c, 4, 5), sp(c, 5, 5), Riffle(sp(c, 1, 10), sp(c, 10, 10)),
      Riffle(sp(c, 2, 10), sp(c, 6, 10)), Riffle(sp(c, 3, 10), sp(c, 7, 10)), Riffle(sp(c, 4, 10), sp(c, 8, 10)), Riffle(sp(c, 5, 10), sp(c, 9, 10))];
  }
  if (Wn <= B.threeAgain) return threes(); // back to 3 at a time
  if (Wn <= B.threeTwisted) { // 3 at a time, zigzag: pairs by Mod[i, 12], then the columns
    const pairs = DeleteCases(Table((i) => {
      const k = { 1: 5, 2: 7, 4: 7, 8: 7, 10: 7 }[Mod(i, 12)];
      return k === undefined ? null : [c[i - 1], c[i + k - 1]];
    }, [1, Length(c) - 7]), null);
    return Join(pairs, [c, sp(c, 1, 6), sp(c, 2, 6), sp(c, 3, 6), sp(c, 4, 6), sp(c, 5, 6), sp(c, 6, 6)]);
  }
  return [sp(c, 1, 2), sp(c, 2, 2)]; // 4 at a time, no compression
}

/** Re[Sqrt[x]] for a real x: 0 when x < 0 (the root is imaginary). */
export const reSqrt = (x) => (x < 0 ? 0 : Sqrt(x));
/** Mathematica's I: no real value (the plot leaves a gap). */
const I = NaN;

/** The eight curves of BestCompressionPlot at R (W = 2R, r = 1): five structures, then the three twisted ones. */
export function compressionCurves(R) {
  const W = 2 * R;
  return [
    /* 1 */ (W < 2 + sqrt3 ? Sqrt((4 * r - W) * W) : r) / (2 * r),
    /* 2 */ W < 4 * r ? 1 : Max(reSqrt(4 * r ** 2 - ((W - 2 * r) ** 2) / 2) / (4 * r), 1 / 4),
    /* 3 */ W < 2 * ((2 / sqrt3) * r + r) ? 1 : Max(reSqrt(4 * r ** 2 - (W / 2 - r) ** 2) / (6 * r), 1 / 6),
    /* 4 */ W < 2 * r * (1 + sqrt2) ? 1 : Max(reSqrt(4 * r ** 2 + (1 / 4) * (-2 + sqrt2) * (-2 * r + W) ** 2) / (8 * r), 1 / 8),
    /* 5 */ W < 2 + Sqrt(8 + 8 / sqrt5) ? 1 : Max(reSqrt(4 + (1 / 32) * (-5 + sqrt5) * (-2 + W) ** 2) / (10 * r), 1 / 10),
    /* twisted */ W < 2 * r + Sqrt(3 * r ** 2) ? I : W < 4 * r
      ? (1 / (4 * r)) * (4 * Sqrt((-2 + W) ** 2) * W - Sqrt((-2 + W) ** 2) * W ** 2 - 2 * Sqrt(W) * Sqrt((-4 + W) * (-8 + (-4 + W) * W))
        + W ** (3 / 2) * Sqrt((-4 + W) * (-8 + (-4 + W) * W))) / (2 * Sqrt(-(-4 + W) * (-2 + W) ** 2 * W)) : I,
    /* 2 twisted zigzag */ W < (2 + sqrt6) * r ? I : W < 2 * (1 + sqrt2) * r
      ? (1 / (8 * r)) * ((Sqrt(4 - (-4 + W) * W) + Sqrt(4 - (-4 + W) * W + 8 * sqrt2 * Sqrt((-4 + W) * W))) / (2 * sqrt2)) : I,
    /* 3 twisted zigzag */ W < 2 * (1 + sqrt3) * r ? I : W < 6 * r
      ? (1 / (12 * r)) * ((1 / 4) * Sqrt(-(-6 + W) * (2 + W)) + (1 / 4) * Sqrt(-52 + 4 * W - W ** 2 + 16 * sqrt3 * Sqrt(4 - 4 * W + W ** 2))) : I,
  ];
}

/** The legend's icons: a circle with one to five red disks (Graphics[…, ImageSize -> 15]). */
const icon = (disks) => Graphics([Circle([0, 0], 0.25), EdgeForm(Thin), Red, disks], { ImageSize: 15 });
export const LEGEND_ICONS = Object.freeze([
  icon([Disk([0, 0], 0.15)]),
  icon([Disk([0.1, 0], 0.1), Disk([-0.1, 0], 0.1)]),
  icon(Table((i) => Disk(Times(0.125, [Cos((i * 2 * Pi) / 3), Sin((i * 2 * Pi) / 3)]), 0.1), [1, 3])),
  icon(Table((i) => Disk(Times(0.15, [Cos((i * Pi) / 2), Sin((i * Pi) / 2)]), 0.09), [1, 4])),
  icon(Table((i) => Disk(Times(0.15, [Cos((i * Pi * 2) / 5), Sin((i * Pi * 2) / 5)]), 0.09), [1, 5])),
]);

/** BestCompressionPlot: computed once (the notebook computes it in its Initialization). */
let bestPlot = null;
export function BestCompressionPlot() {
  bestPlot ??= Plot((R) => compressionCurves(R), [r, 3 * r], {
    PlotStyle: ['Automatic', 'Automatic', 'Automatic', 'Automatic', 'Automatic', Dotted, Dotted, Dotted],
    // Placed[…, {.08, .51}]: Mathematica puts the legend's own point {.08, .51} there (D-PS-05)
    PlotLegends: Placed(LEGEND_ICONS, [[0.08, 0.51], [0.08, 0.51]]),
    AxesLabel: [Row([Style('R', Italic), ' / ', Style('r', Italic)]), 'compression ratio'],
    ImageSize: [600, 160], AspectRatio: 1 / 4,
    // Show[plot, Graphics[{…, Line[{…, {w/2r, 0}}]}]] makes Mathematica's range reach down to 0 (the marker's foot)
    PlotRange: [[1, 3], [0, 1]], PlotRangePadding: [0.02, 0.03],
    // Mathematica's automatic margins of this plot, measured on the snapshots (left, right; bottom, top px; D-PS-06)
    ImagePadding: [[44, 46], [20, 26]],
  });
  return bestPlot;
}

/** The sphere centres of the body (F-PS-07). */
export function centers({ w, NumSpheres, θ }, { Alpha, z, numsides, IsTwist, Ang2, z2 }) {
  const ρ = w / 2 - r;
  return Flatten(Table((i) => Table((j) => {
    if (IsTwist) {
      if (numsides === 2) {
        const a = Alpha * 2 * j + (Ang2 + 2 * Alpha) * i + θ;
        return [r + 2 * z * i * numsides + j * z2, ρ * Cos(a), ρ * Sin(a)];
      }
      const a = Alpha * 2 * j + (2 * Pi - Ang2) * i + θ;
      return [r + 2 * z * i * numsides + (EvenQ(j) ? 0 : 1) * z2, ρ * Cos(a), ρ * Sin(a)];
    }
    const a = Alpha * (2 * j + (EvenQ(i) ? 0 : 1)) + θ;
    return [r + 2 * z * i * numsides, ρ * Cos(a), ρ * Sin(a)];
  }, [0, numsides - 1]), [0, Ceiling(NumSpheres / numsides) - 1]), 1);
}

/** The pushing rods' colour (the notebook's colour swatch: RGBColor[0.5, 0, 0.5]). */
export const ROD = G3.RGBColor(0.5, 0, 0.5);

/** One evaluation of the Manipulate body. */
export function evaluate(s) {
  const { R, θ, SphereOpacity, NumSpheres } = s;
  const w = 2 * R;
  const p = tubeSphereStackParamsFAST(w, r);
  const { z } = p;
  const c = centers({ w, NumSpheres, θ }, p);
  const endC = Last(c)[0] + r;
  const contacts = sphereToSphereContacts(w, r, c);
  const plot = Show(BestCompressionPlot(), Graphics([Black, Thin, Line([[1, z], [w / (2 * r), z], [w / (2 * r), 0]]), PointSize('Large'), Point([w / (2 * r), z])]));
  const caption = StringForm('compression ratio = ``\n', z);
  const scene = G3.Graphics3D([
    [G3.Blue, G3.Thick, G3.Line(contacts)] /* one polyline or several */,
    // sphere-tube contact lines
    w > 2 * r ? [G3.Black, G3.Thick, c.map((q) => G3.Line([q, [q[0], ((w / 2) / (w / 2 - r)) * q[1], ((w / 2) / (w / 2 - r)) * q[2]]]))] : [],
    // spheres
    [G3.Opacity(SphereOpacity), G3.Red, c.map((q) => G3.Sphere(q))],
    // cylinder
    [G3.LightBlue, G3.Opacity(0.3), G3.Cylinder([[0, 0, 0], [2 * r + endC, 0, 0]], w / 2)],
    // pushing rods
    [ROD, G3.Opacity(0.2), G3.Cylinder([[-2 * r, 0, 0], [0, 0, 0]], w / 2), G3.Cylinder([[endC, 0, 0], [2 * r + endC, 0, 0]], w / 2)],
  ], { Boxed: false, ImageSize: [600, 250], Epilog: Inset(Text(Style(caption, 20)), ['Center', 'Bottom']) });
  return {
    view: { z, numsides: p.numsides, IsTwist: p.IsTwist, spheres: c.length, centers: c, contacts, endC, caption: caption.trim() },
    graphics: [plot, scene],
  };
}
