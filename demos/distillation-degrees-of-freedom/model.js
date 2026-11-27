// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann, Janet deGrazia, John L. Falconer, Nathan S. Nelson and Nick Bongiardina
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/distillation-degrees-of-freedom/model.js — "Degree-of-Freedom Analysis on a Distillation Process": one
// evaluation of the Manipulate body, the state in, { view, graphics } out (pure, no DOM). Simple mode: the original's
// stream variables, the random choice of the known ones (SeedRandom[reset]; RandomSample — a seeded generator here,
// D-DD-01), the balance on the chosen unit and the count of the degrees of freedom; the flowsheet and the explanation
// as two pictures.
import {
  Annotation, Text, Style, Row, Column, Subscript, Italic, Bold, Rectangle, Arrow, Thick, Black, Blue, RGBColor,
  EdgeForm, FaceForm, None, FontSize, Opacity, Green, Yellow, Red, AbsoluteDashing, Dashed, Line, Arrowheads,
} from '../../shared/graphics.js';
import { createRng } from '../../shared/random.js';

export const initialState = () => ({ select: 2, view: 1, reset: 1, u1: 5, u2: 10, cond: 1 });

/** RGBColor[0, 0.6, 0]: the chosen unit and its streams. */
export const GREEN = RGBColor(0, 0.6, 0);

/** The seven streams: number, letter of the composition, label position (the original's `variables`). */
export const STREAMS = Object.freeze([
  { n: 1, c: 'z', pos: [-2.9, 0] }, { n: 2, c: 'y', pos: [3.05, 5.25] }, { n: 3, c: 'x', pos: [2.75, -5.25] },
  { n: 4, c: 'y', pos: [9.2, 5.25] }, { n: 5, c: 'x', pos: [9.2, -5.25] }, { n: 6, c: 'x', pos: [3.3, 2] }, { n: 7, c: 'y', pos: [3.05, -2] },
].map(Object.freeze));
/** The streams of each balance: column {1, 2, 3, 6, 7}, condenser {2, 4, 6}, reboiler {3, 5, 7}, overall {1, 4, 5}. */
export const UNITS = Object.freeze({ 1: [1, 2, 3, 6, 7], 2: [2, 4, 6], 3: [3, 5, 7], 4: [1, 4, 5] });
export const UNIT_NAMES = Object.freeze({ 1: 'distillation column', 2: 'condenser', 3: 'reboiler', 4: 'overall' });
/** The extra information the unit adds besides the stream sums: Switch[select, 1, 0, 2, If[cond == 1, 1, 2], 3, 1, 4, 0]. */
export const extraOf = (select, cond) => ({ 1: 0, 2: cond === 1 ? 1 : 2, 3: 1, 4: 0 })[select];

/**
 * A variable: { n, kind: 'm' | 'A' | 'B' | '1-A', c } — the flow m_n, the mole fraction c_{n,A}, c_{n,B} or 1 − c_{n,A}.
 * Stream 4's letter is y for a partial condenser and x for a total one (the original's `replace`).
 */
const letter = (s, cond) => (s.n === 4 ? (cond === 1 ? 'y' : 'x') : s.c);
export const key = (v) => `${v.kind === 'm' ? 'm' : v.c}${v.n}${v.kind === 'm' ? '' : v.kind}`;

/** Flatten@varSelect: per stream m, A (and B in view 2); view 1 leaves out 1 − A (it follows from A). */
export function selectable(view, cond = 1) {
  return STREAMS.flatMap((s) => [
    { n: s.n, kind: 'm', c: 'm' }, { n: s.n, kind: 'A', c: letter(s, cond) },
    ...(view === 2 ? [{ n: s.n, kind: 'B', c: letter(s, cond) }] : []),
  ]);
}

/** RandomSample[list, k] after SeedRandom[seed]: a seeded Fisher–Yates draw (Mathematica's own stream: D-DD-01). */
export function randomSample(list, k, seed) {
  const rng = createRng({ seed });
  const a = [...list];
  for (let i = 0; i < Math.min(k, a.length); i++) {
    const j = i + Math.floor(rng.randomReal([0, 1]) * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.max(0, k));
}

/**
 * Complement's order of the labels: by the letter (m before x, y, z), then the stream number, then A before B —
 * Mathematica's canonical order of the Text[Style[Subscript[Style[letter], …]]] expressions.
 */
export const canonical = (a, b) => (a.c < b.c ? -1 : a.c > b.c ? 1 : a.n - b.n || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));

/** The analysis of the original's Module, in its order: the known variables drawn at random, then the count. */
export function analyse(state) {
  const { view, reset, u1, u2, cond } = state;
  const all = selectable(view, cond);
  const unknowns = view === 1 ? u1 : u2;
  return analyseKnown(state, randomSample(all, all.length - unknowns, reset));
}

/** The count for a given list of known variables (the snapshots' choices can be given: unit tests). */
export function analyseKnown({ select, view, cond }, known) {
  const all = selectable(view, cond);
  const knownKeys = new Set(known.map(key));
  // view 1: 1 − A is known with A, unknown without it
  const full = view === 1 ? [...all, ...STREAMS.map((s) => ({ n: s.n, kind: '1-A', c: letter(s, cond) }))] : all;
  const isKnown = (v) => (v.kind === '1-A' ? knownKeys.has(key({ ...v, kind: 'A' })) : knownKeys.has(key(v)));
  const unknownVars = full.filter((v) => !isKnown(v)).sort(canonical);
  const unitStreams = new Set(UNITS[select]);
  const balUnknown = unknownVars.filter((v) => unitStreams.has(v.n) && v.kind !== '1-A');
  // view 2: a "Σ c_n = 1" for each stream whose A or B is an unknown of the balance (the extraInfo of the original)
  const sums = view === 2 ? STREAMS.filter((s) => balUnknown.some((v) => v.n === s.n && (v.kind === 'A' || v.kind === 'B'))).map((s) => ({ n: s.n, c: letter(s, cond) })) : [];
  const extra = sums.length + extraOf(select, cond);
  const dof = balUnknown.length - 2 - extra;
  return { all, full, known, isKnown, unknownVars, balUnknown, sums, extra, dof, status: dof === 0 ? 'solvable' : dof < 0 ? 'overspecified' : 'underspecified' };
}

const it = (s) => Style(s, Italic);
/** The label of a variable as the original writes it: m_n, c_{n,A}, c_{n,B}; 1 − c_{n,A} with its "1−" always black. */
export function labelOf(v) {
  if (v.kind === 'm') return Subscript(it('m'), String(v.n));
  return Subscript(it(v.c), `${v.n},${v.kind === 'B' ? 'B' : 'A'}`);
}

const outline = (r) => [[r.a[0], r.a[1]], [r.b[0], r.a[1]], [r.b[0], r.b[1]], [r.a[0], r.b[1]], [r.a[0], r.a[1]]];

/** The flowsheet: equipment, streams and the 14 (view 1: and seven "1−") or 21 labels. */
function flowsheet(state, a) {
  const { select, view, cond } = state;
  const eq = [
    { name: ['distillation', 'column'], c: [0, 0], h: 2.5 }, { name: ['condenser'], c: [6, 5.25], h: 1 }, { name: ['reboiler'], c: [6, -5.25], h: 1 },
  ];
  const boxes = eq.map((e) => Rectangle([e.c[0] - 1.5, e.c[1] - e.h * 1.5], [e.c[0] + 1.5, e.c[1] + e.h * 1.5]));
  const outer = [...eq.map((e) => Rectangle([e.c[0] - 1.9, e.c[1] - (e.h * 1.5 + 0.4)], [e.c[0] + 1.9, e.c[1] + (e.h * 1.5 + 0.4)])), Rectangle([-3.9, -7.45], [10.25, 7.5])];
  const names = eq.map((e, i) => Text(Style(e.name.length > 1 ? Column(e.name) : e.name[0], 16, ...(select === i + 1 ? [Bold, GREEN] : [])), e.c));
  const streams = [
    Arrow([[-4.2, 0], [-1.5, 0]]), Arrow([[0, 3.75], [0, 5.25], [4.5, 5.25]]), Arrow([[0, -3.75], [0, -5.25], [4.5, -5.25]]),
    Arrow([[7.5, 5.25], [11, 5.25]]), Arrow([[7.5, -5.25], [11, -5.25]]), Arrow([[6, 3.75], [6, 2], [1.5, 2]]), Arrow([[6, -3.75], [6, -2], [1.5, -2]]),
  ];
  const labels = [];
  for (const s of STREAMS) {
    const [x, y] = s.pos;
    const c = letter(s, cond);
    const mv = { n: s.n, kind: 'm', c: 'm' }, av = { n: s.n, kind: 'A', c };
    const col = (v) => (a.isKnown(v) ? Black : Blue);
    labels.push(Annotation(Text(Style(labelOf(mv), 17, col(mv)), [x, y + 0.55]), `var-m${s.n}`));
    labels.push(Annotation(Text(Style(labelOf(av), 17, col(av)), [x, y - 0.55]), `var-${c}${s.n}A`));
    if (view === 2) {
      const bv = { n: s.n, kind: 'B', c };
      labels.push(Annotation(Text(Style(labelOf(bv), 17, col(bv)), [x, y - 1.55]), `var-${c}${s.n}B`));
    } else {
      // Row[{Style["1-", Transparent], c_{n,A}}] in the variable's colour with the heads' Row[{"1-", Style[c_{n,A},
      // Transparent]}] in black over it: one label, "1−" black and c_{n,A} in the variable's colour
      const ov = { n: s.n, kind: '1-A', c };
      labels.push(Annotation(Text(Style(Row([Style('1\u2212', Black), Style(labelOf(av), col(ov))]), 17), [x, y - 1.55]), `var-1-${c}${s.n}A`));
    }
  }
  return [
    FaceForm(None), EdgeForm(Thick), Annotation(boxes, 'equipment'),
    // EdgeForm[{Thick, Dashed, RGBColor[0, 0.6, 0]}] on the chosen unit's outer rectangle: drawn as a dashed line (D-DD-04)
    Thick, Dashed, GREEN, Annotation(Line(outline(outer[select - 1])), 'unit-outline'),
    AbsoluteDashing([]), EdgeForm(), FaceForm(Black), Black,
    Annotation(names, 'unit-names'),
    // arrowheads 0.03 of the width, as measured on the snapshots (D-DD-05)
    Thick, Black, Arrowheads(0.03), Annotation(streams, 'streams'), GREEN, Annotation(UNITS[select].map((k) => streams[k - 1]), 'unit-streams'),
    Black, ...labels,
  ];
}

/** The explanation at the right: the Column of the original, drawn line by line (px of a 195 × 375 picture). */
function explanation(state, a) {
  const { select, view, cond } = state;
  const rows = [];
  const add = (expr, h = 24, id) => rows.push({ expr, h, id });
  add(Style(UNIT_NAMES[select], Bold), 24, 'unit-name');
  add(`unknowns = ${a.balUnknown.length}`, 24, 'count-unknowns');
  // Grid@ArrayReshape[…, {If[Length <= 5, 1, 2], 5}]: five per row, one or two rows (more than ten are not shown)
  const shown = a.balUnknown.slice(0, a.balUnknown.length <= 5 ? 5 : 10);
  for (let r = 0; r < (a.balUnknown.length <= 5 ? 1 : 2); r++) {
    add(Style(Row(shown.slice(r * 5, r * 5 + 5).flatMap((v, i) => (i ? ['  ', Style(labelOf(v), Blue)] : [Style(labelOf(v), Blue)]))), 15), 18, `unknowns-row-${r + 1}`);
  }
  add('', 12);
  add('species balances = 2', 24, 'count-balances');
  if (view === 2) add('A    B', 22);
  add('', 12);
  add(`extra information = ${a.extra}`, 24, 'count-extra');
  if (view === 2) {
    const items = a.sums.map((s) => Row(['∑', Subscript(it(s.c), String(s.n)), ' = 1']));
    for (let r = 0; r < (items.length <= 3 ? 1 : 2) && items.length; r++) add(Row(items.slice(r * 3, r * 3 + 3).flatMap((x, i) => (i ? ['  ', x] : [x]))), 20, `sums-row-${r + 1}`);
  }
  if (select === 2 && cond === 2) add(Row([Subscript(it('y'), '2'), ' = ', Subscript(it('x'), '4'), ' = ', Subscript(it('x'), '6')]), 24, 'relation');
  if (select === 2 && cond === 1) add(Row([Subscript(it('K'), 'c'), ' = ', Subscript(it('y'), '4'), '/', Subscript(it('x'), '6')]), 24, 'relation');
  if (select === 3) add(Row([Subscript(it('K'), 'r'), ' = ', Subscript(it('y'), '7'), '/', Subscript(it('x'), '5')]), 24, 'relation');
  add('', 12);
  add(`degrees of freedom = ${a.dof < 0 ? `\u2212${-a.dof}` : a.dof}`, 24, 'count-dof');
  const total = rows.reduce((s, r) => s + r.h, 0) + 28;
  let y = 375 / 2 + total / 2;
  const prims = [FontSize(17), Black];
  for (const r of rows) {
    y -= r.h;
    if (r.expr !== '') prims.push(r.id ? Annotation(Text(r.expr, [97.5, y + r.h / 2]), r.id) : Text(r.expr, [97.5, y + r.h / 2]));
  }
  // Framed["solvable", Background -> Opacity[0.3, Green]] (overspecified: Opacity[0.6, Yellow]; underspecified: Opacity[0.35, Red])
  const box = { solvable: [Green, 0.3], overspecified: [Yellow, 0.6], underspecified: [Red, 0.35] }[a.status];
  const w = a.status.length * 8.2 + 10;
  y -= 26;
  prims.push(Annotation([FaceForm(box[0]), Opacity(box[1]), EdgeForm(Black), Rectangle([97.5 - w / 2, y], [97.5 + w / 2, y + 22])], 'status-box'));
  prims.push(Opacity(1), Black, Annotation(Text(a.status, [97.5, y + 11]), 'status'));
  return prims;
}

export function evaluate(state) {
  const a = analyse(state);
  const title = [FontSize(17), Annotation(Text(Row([Style('unknowns', Blue), ' - species balances - extra information = degrees of freedom']), [300, 12]), 'title')];
  const view = {
    seed: state.reset, known: a.known.map(key).sort(), unknown: a.unknownVars.map(key), balUnknown: a.balUnknown.map(key), sums: a.sums.map((s) => `${s.c}${s.n}`),
    extra: a.extra, dof: a.dof, status: a.status, unit: UNIT_NAMES[state.select],
  };
  return { view, graphics: [title, flowsheet(state, a), explanation(state, a)] };
}
