// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Whasington Silvestre
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/three-charges-electrostatics/main.js — the page: the original's Manipulate (shared/manipulate.js) with its
// picture as Graphics data. Controls in a Grid at the top: q1, q2, qt (Manipulator over Drop[Range[−20, 20], {21}]),
// x1, x2 (−10 … 10, step 1), xt (−9.5 … 9.5), then a Row of four checkboxes.
import { Manipulate, Control, Row } from '../../shared/manipulate.js';
import { Style, Subscript, Italic } from '../../shared/graphics.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { initialState, evaluate, CHARGES } from './model.js';

/**
 * {{q, q0, label}, list, ControlType -> Manipulator, Appearance -> "Labeled"}: a slider whose positions are the list's
 * values in order (Mathematica's Manipulator over a list). The layer's sliders run over numeric ranges, so this one runs
 * over the position k = 1 … n and shows and reports list[[k]] (N-TA-01; a shared candidate). A typed value goes to the
 * nearest value of the list (the left one on a tie).
 */
function listManipulator(controls, { name, label, value, onInput, values, ImageSize }) {
  const pos = (v) => {
    let best = 0;
    values.forEach((w, i) => { if (Math.abs(w - v) < Math.abs(values[best] - v)) best = i; });
    return best + 1;
  };
  const api = controls.slider({
    name, label, min: 1, max: values.length, step: 1, value: pos(value), steps: 'mma', labeled: true,
    format: (kk) => String(values[Math.round(kk) - 1]),
    parse: (t) => { const v = Number(String(t).trim().replace(/[−–]/g, '-')); return Number.isFinite(v) ? pos(v) : NaN; },
    onInput: (kk) => onInput(values[Math.round(kk) - 1]),
  });
  const px = { Tiny: 60, Small: 100, Medium: 180, Large: 300 }[ImageSize] ?? ImageSize;
  const r = api.row.querySelector('input[type=range]');
  if (r && px) Object.assign(r.style, { flex: `0 0 ${px}px`, width: `${px}px`, minWidth: `${px}px` });
  return { ...api, get: () => values[Math.round(api.get()) - 1], set: (v, how) => api.set(pos(v), how) };
}

const lab = (L, s, unit) => Row([Subscript(Style(L, Italic), s), unit]);
const tI = Style('t', Italic);
const chargeSlider = (name, q0, sub) => [[name, q0, lab('q', sub, ' (μC)')], Control(listManipulator, { values: CHARGES, ImageSize: 'Small' })];

Manipulate({
  name: 'three-charges-electrostatics',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  controls: [
    Row([chargeSlider('q1', 5, '1'), chargeSlider('q2', 5, '2'), chargeSlider('qt', -5, tI)], { class: 'ta-grid-row' }),
    Row([
      [['x1', 0, lab('x', '1', ' (m)')], -10, 10, 1, { Appearance: 'Labeled', ImageSize: 'Small' }],
      [['x2', 5, lab('x', '2', ' (m)')], -10, 10, 1, { Appearance: 'Labeled', ImageSize: 'Small' }],
      // {{xt, -8., …}, -10 + 0.5, 10 - 0.5}: a machine real from the start, shown as Mathematica writes reals ("-8.")
      [['xt', -8, lab('x', tI, ' (m)')], -10 + 0.5, 10 - 0.5, { Appearance: 'Labeled', ImageSize: 'Small', format: (v) => mmaNumberString(v, { isReal: true }) }],
    ], { class: 'ta-grid-row' }),
    Row([
      [['force', false, 'plot net force (N)'], [true, false]],
      [['field', false, 'plot net field (MN/C)'], [true, false]],
      [['status', false, Row(['show data at ', Subscript(Style('x', Italic), tI)])], [true, false]],
      [['edata', false, 'show equilibrium data'], [true, false]],
    ], { class: 'ta-checks' }), // label before its box, as Mathematica's Control@{{force, False, "…"}, {True, False}}
  ],
});
