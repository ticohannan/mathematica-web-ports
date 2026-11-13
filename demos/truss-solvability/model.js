// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/truss-solvability/model.js — one evaluation of the Manipulate body of "Determine If a Truss Can Be Solved"
// (pure): the count of members, reactions and joint balances, the verdict, and the picture (the truss, its pin and roller
// supports as insets, the reactions in blue, the loads in green, the counting text as an inset). Names follow the
// original (docs/original-source/truss-solvability.txt). The corrected mode (E-TD-01) also uses shared/truss.js to test
// the arrangement.
import { Graphics, Annotation, Line, Polygon, Disk, Point, Text, Inset, Arrow, Style, Subscript, Row, Grid, Framed, Italic,
  RGBColor, GrayLevel, White, Black, Blue, EdgeForm, FaceForm, None, Thick, Thin, PointSize, Arrowheads } from '../../shared/graphics.js';
import { isCorrected } from '../../shared/errata.js';
import { determinacy } from '../../shared/truss.js';

export const initialState = () => ({ ADTR: true, labels: false, SA: 1, SB: 1, SF: 1 });
const w = 5, h = 5, δ = 2;
export const GREEN = RGBColor(0, 0.6, 0), RED = RGBColor(0.8, 0, 0), LOAD = RGBColor(0, 0.5, 0);

// the initialization's pin and roller pictures (ImageSize -> 25); the roller turned by −π/2 for joint B
const r1 = 1, r2 = 1.5;
const turn = (pts, q) => (q ? pts.map(([x, y]) => [y, -x]) : pts); // Rotate[…, −π/2] about the centre
function pin(q = false) {
  const r = 1, poly = [[-r, 0], [-1.1 * r, -1.3 * r], [1.1 * r, -1.3 * r], [r, 0]];
  return Graphics([
    [GrayLevel(0.5), [EdgeForm(Black), Disk([0, 0], r)], Polygon(turn(poly, q))],
    Line(turn(poly, q)),
  ], { PlotRange: q ? [[-1.3, 1], [-1.1, 1.1]] : [[-1.1, 1.1], [-1.3, 1]], ImageSize: q ? 25 * 2.3 / 2.2 : 25 }); // rotated: as tall as the upright one is wide
}
function roller(q = false) {
  const poly = [[-0.975, 0.175], [-1.38, -0.93], [1.38, -0.93], [0.975, 0.175]];
  const c2 = q ? [-r2, 0] : [0, -r2];
  return Graphics([
    [GrayLevel(0.5), [EdgeForm(Black), Disk([0, 0], r1), Disk(c2, r2)], Polygon(turn(poly, q))],
    Line(turn([[-0.975, 0.175], [-1.38, -0.93]], q)), Line(turn([[0.975, 0.175], [1.38, -0.93]], q)),
  ], { PlotRange: q ? [[-3, 1], [-1.5, 1.5]] : [[-1.5, 1.5], [-3, 1]], ImageSize: q ? 25 * 4 / 3 : 25 });
}

/** the counts and the verdict: var = members + reactions, eq = 2 × joints */
export function counts({ ADTR, SA, SB, SF }) {
  const members = ADTR ? 13 : 11, joints = ADTR ? 8 : 7;
  const reactions = SA + (ADTR ? SB : 0) + SF;
  return { members, reactions, joints, variables: members + reactions, equations: 2 * joints, difference: members + reactions - 2 * joints };
}

/** the truss as shared/truss.js describes it (for the corrected verdict and the tests) */
export function trussOf({ ADTR, SA, SB, SF }) {
  // ADTR: A(0,0) B(0,h) C(w/2,h) D(3w/2,h) E(5w/2,h) F(3w,0) G(2w,0) H(w,0); else A B C D (top) E(3w,0) F(2w,0) G(w,0)
  const sup = (joint, s, roll) => ({ joint, dirs: s === 1 ? [roll] : [[1, 0], [0, 1]] });
  if (ADTR) {
    const joints = [[0, 0], [0, h], [w / 2, h], [1.5 * w, h], [2.5 * w, h], [3 * w, 0], [2 * w, 0], [w, 0]];
    const members = [[0, 7], [7, 6], [6, 5], [0, 2], [2, 7], [7, 3], [3, 6], [6, 4], [4, 5], [0, 1], [1, 2], [2, 3], [3, 4]];
    return { joints, members, supports: [sup(0, SA, [0, 1]), sup(1, SB, [1, 0]), sup(5, SF, [0, 1])] };
  }
  const joints = [[0, 0], [w / 2, h], [1.5 * w, h], [2.5 * w, h], [3 * w, 0], [2 * w, 0], [w, 0]];
  const members = [[0, 6], [6, 5], [5, 4], [0, 1], [1, 6], [6, 2], [2, 5], [5, 3], [3, 4], [1, 2], [2, 3]];
  return { joints, members, supports: [sup(0, SA, [0, 1]), sup(4, SF, [0, 1])] };
}

/** the verdict line: the original's (≤ 0: solvable) or, corrected (E-TD-01), with the mechanism case */
export function verdict(st) {
  const c = counts(st);
  if (!isCorrected(st)) return c.difference <= 0 ? { text: 'solvable', color: GREEN, kind: 'solvable' } : { text: 'statically indeterminate', color: RED, kind: 'indeterminate' };
  const d = determinacy(trussOf(st));
  if (d.status === 'mechanism') return { text: 'unstable (a mechanism)', color: RED, kind: 'mechanism' };
  return d.status === 'determinate' ? { text: 'solvable', color: GREEN, kind: 'solvable' } : { text: 'statically indeterminate', color: RED, kind: 'indeterminate' };
}

const it = (s) => Style(s, Italic);
const R = (j, d) => Subscript(it('R'), Row([`${j}, `, it(d)]));
export function evaluate(st) {
  const { ADTR, labels, SA, SB, SF } = st;
  const c = counts(st), v = verdict(st);
  const equations = Graphics([
    Text(Style(Grid([[Row([c.members, ' members'])], [Row([c.reactions, ' reaction forces'])], [Row([c.joints, ' joints × 2 balances'])]], { Alignment: 'Right', Spacings: [0, 0.25] }), 17), [0.5 * w, 8]),
    [Thin, Line([[5.3, 8.88], [6, 8.465], [5.3, 8.05]]), Line([[5.3, 7.25], [6, 7.25]]), Line([[9.65, 8.465], [10.35, 7.833], [9.65, 7.2]])],
    Text(Style(Row([c.variables, ' variables']), 17), [6, 8.465], [-1.2, 0]),
    Text(Style(Row([c.equations, ' equations']), 17), [6, 7.25], [-1.2, 0]),
    Text(Style(Grid([[Row(['variables − equations = ', c.difference])], [Style(v.text, v.color)]], { Spacings: [0, 0.25] }), 17), [10.35, 7.833], [-1.2, 0]),
  ], { ImageSize: 600, PlotRange: [[-3, 18], [7.17, 8.91]] }); // PlotRange -> {{-3, 18}, All}: the y range of its contents (+2 %)
  const sym = (s, q = false) => (s === 1 ? roller(q) : pin(q));
  const fLabel = (a, b) => Subscript(it('F'), ADTR ? a : b);
  const content = [Thick, Arrowheads(0.03), // Arrowheads(0.03): the size Automatic gives these Thick arrows in the snapshots
    Annotation([[EdgeForm(Thick), FaceForm(None), Polygon([[0, 0], [w, 0], [0.5 * w, h]]), Polygon([[w, 0], [2 * w, 0], [1.5 * w, h]]), Polygon([[2 * w, 0], [3 * w, 0], [2.5 * w, h]])],
    ADTR ? Line([[0, 0], [0, h], [2.5 * w, h]]) : Line([[0.5 * w, h], [2.5 * w, h]])], 'truss'),
    Annotation([Inset(sym(SA), [0, -0.25]), ADTR ? Inset(sym(SB, true), [-0.25, h]) : [], Inset(sym(SF), [3 * w, -0.25])], 'supports'),
    Annotation([Blue,
      SA === 1 ? [Arrow([[0, -δ], [0, 0]]), Text(Style(R('A', 'y'), 17), [0, -δ], [0, 1])]
        : [Arrow([[0, -δ], [0, 0]]), Arrow([[-δ, 0], [0, 0]]), Text(Style(R('A', 'x'), 17), [-δ, 0], [1, 0]), Text(Style(R('A', 'y'), 17), [0, -δ], [0, 1])],
      ADTR ? (SB === 1 ? [Arrow([[-δ, h], [0, h]]), Text(Style(R('B', 'x'), 17), [-δ, h], [1, 0])]
        : [Arrow([[-δ, h], [0, h]]), Arrow([[0, h + δ], [0, h]]), Text(Style(R('B', 'x'), 17), [-δ, h], [1, 0]), Text(Style(R('B', 'y'), 17), [0, h + δ], [0, -1])]) : [],
      SF === 1 ? [Arrow([[3 * w, -δ], [3 * w, 0]]), Text(Style(R(ADTR ? 'F' : 'E', 'y'), 17), [3 * w, -δ], [0, 1])]
        : [Arrow([[3 * w, -δ], [3 * w, 0]]), Arrow([[3 * w + δ, 0], [3 * w, 0]]), Text(Style(R(ADTR ? 'F' : 'E', 'x'), 17), [3 * w + δ, 0], [-1, 0]), Text(Style(R(ADTR ? 'F' : 'E', 'y'), 17), [3 * w, -δ], [0, 1])]], 'reactions'),
    Annotation([LOAD,
      Arrow([[w, 0], [w, -δ]]), Arrow([[2 * w, 0], [2 * w, -δ]]),
      Text(Style(fLabel('H', 'G'), 17), [w, -δ], [0, 1]), Text(Style(fLabel('G', 'F'), 17), [2 * w, -δ], [0, 1]),
      Arrow([[3 * w, h], [2.5 * w, h]]), Text(Style(fLabel('E', 'D'), 17), [3 * w, h], [-1.2, 0])], 'loads'),
    Annotation(Inset(equations, [1.5 * w, 9]), 'counts'),
    ...[[0, 0], [0.5 * w, h], [w, 0], [1.5 * w, h], [2 * w, 0], [2.5 * w, h], [3 * w, 0], ...(ADTR ? [[0, h]] : [])].map((p) => [PointSize(0.015), Black, Point(p), White, PointSize(0.01), Point(p)]),
    labels ? Annotation((ADTR
      ? [['A', [0, 0]], ['B', [0, h]], ['C', [0.5 * w, h]], ['D', [1.5 * w, h]], ['E', [2.5 * w, h]], ['F', [3 * w, 0]], ['G', [2 * w, 0]], ['H', [w, 0]]]
      : [['A', [0, 0]], ['B', [0.5 * w, h]], ['C', [1.5 * w, h]], ['D', [2.5 * w, h]], ['E', [3 * w, 0]], ['F', [2 * w, 0]], ['G', [w, 0]]]
    ).map(([l, p]) => Text(Framed(Style(` ${l} `, 16), { Background: White, RoundingRadius: 15 }), p)), 'joint-labels') : [],
  ];
  const view = { ...c, verdict: v.kind, verdictText: v.text, supports: { SA, SB: ADTR ? SB : null, SF }, ADTR, labels };
  return { view, graphics: Graphics(content, { ImageSize: [600, 415], PlotRange: [[-3.5, 19], [-2.85, 10.37]] }) }; // {-2.85, All}: All reaches the top of the inset of the counts (measured on the snapshots)
}
