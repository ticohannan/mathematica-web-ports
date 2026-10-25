// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Francesco Bernardini and Aaron T. Becker; Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/support/car-records.js — read the car icon (demos/common/car-icon.js drawCar, Graphics data since v0.1.21) and
// the car Demonstrations' path pieces back into the record forms of v0.1.19–v0.1.20, through shared/graphics.js
// annotations()/Cases(), so that tests compare the drawn numbers exactly with fixtures recorded before the change.
import { annotations, Cases, Darker, Gray } from '../../shared/graphics.js';
import { NAMED } from '../../shared/mma-colors.js';

const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * drawCar's Graphics as { prims: [{ kind, role, pts, fill | stroke, opacity, edge | arrowhead }] } (the v0.1.19 form).
 *   caller  RGB triple of the colour in effect where the car is drawn ({Green, drawCar[…]}): the body's 'inherit'
 *   id      the car's id (drawCar option `id`; taken from the car when it is that Annotation itself)
 * Accepts the car with or without `id` (parts `<id>-<role>`) and with the arrow drawn as the layer's Arrow or (option
 * arrowSize) as the shaft to the head's base plus the head: its points are then [shaft start, head tip].
 */
export function carRecords(car, caller, id = null) {
  const name = (rgb) => (same(rgb, caller) ? 'inherit' : same(rgb, NAMED.Yellow) ? 'Yellow' : same(rgb, NAMED.Black) ? 'Black'
    : same(rgb, Darker(Gray).rgb) ? 'DarkerGray' : `unexpected ${rgb}`);
  // EdgeForm[Directive[Opacity[o], Black]] (1 px, svg-plot's default stroke) | with Thin (AbsoluteThickness[0.25]) | none
  const edge = (e) => e && { color: name(e.color), opacity: e.opacity,
    ...(e.thickness?.abs === 0.25 ? { thin: true } : e.thickness?.abs === 1 ? {} : { thickness: e.thickness }), ...(e.dash ? { dash: e.dash } : {}) };
  const top = id ?? (car.head === 'Annotation' && Array.isArray(car.g) ? car.id : null);
  const role = (x) => (top && x.startsWith(`${top}-`) ? x.slice(top.length + 1) : x);
  const g = { head: 'Graphics', list: [{ dir: 'color', rgb: caller }, car] };
  const head = Cases(g, 'Polygon').at(-1);
  return { prims: annotations(g).filter((a) => a.id !== top).map(({ id: part, g: q, style: st }) => {
    const r = role(part);
    if (r === 'arrow') {
      const pts = q.head === 'Arrow' ? q.pts : [q.pts[0], head.pts[0]];
      return { kind: 'arrow', role: r, pts, stroke: name(st.color), opacity: st.opacity, arrowhead: st.arrowheads };
    }
    if (q.head === 'Polygon') return { kind: 'polygon', role: r, pts: q.pts, fill: name(st.color), opacity: st.opacity, edge: edge(st.edge) };
    if (q.head === 'Line') return { kind: 'line', role: r, pts: q.pts, stroke: name(st.color), opacity: st.opacity };
    return { unexpected: q.head };
  }) };
}

/** Circle[c, r, {a1, a2}] / Line[{from, to}] as the records of dubins-path and dubins-isochrons before v0.1.21. */
export const pieceRecord = (q) => (q.head === 'Circle' ? { kind: 'arc', c: q.c, r: q.r, a1: q.angles[0], a2: q.angles[1] }
  : q.head === 'Line' ? { kind: 'line', from: q.pts[0], to: q.pts[1] } : { unexpected: q.head });
