// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Lillian Lin
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/two-link-kinematics/velocity-pad.js — the original's joint-velocity control (F-TK-05):
//
//   make2VelControl[Dynamic[pt_]] := Module[{ang, cent = {0, 0}},
//     LocatorPane[Dynamic[pt, (pt = If[Norm[Re[#]] > 1, Normalize[Re[#]], Re[#]]) &],
//       Graphics[{{LightGreen, Disk[cent, 1]},
//         {Thin, Black, Line[{{-1, 0}, {1, 0}}], Line[{{0, -1}, {0, 1}}], Text[θ̇₁, {0.9, 0.2}], Text[θ̇₂, {0.2, 0.9}],
//          Table[Line[{{a, 0}, {a, 0.05}}], {a, -1, 1, 0.2}], Table[Line[{{0, a}, {0.05, a}}], {a, -1, 1, 0.2}],
//          Table[Text[a, {-0.1, a}], {a, {-1, 1}}], Table[Text[a, {a, -0.1}], {a, {-1, 1}}]},
//         Arrowheads[{0, .1}], Thick, Red, Arrow[Dynamic[{{0, pt[[2]]}, pt}]], Blue, Arrow[Dynamic[{{pt[[1]], 0}, pt}]]},
//        ImageSize -> 140]]]
//
// padSetter is pure (Node-testable); make2VelControl needs the DOM. The LocatorPane limits the pointer to the pad's
// plot range (±1, with the default 2 % padding) before the setter runs, as for the dials (COMMON-DECISIONS §5,
// K-TK-13). Normalize is normalizeCR (K-TK-11); Norm is Mathematica's (dnrm2); `Norm > 1` is the tolerant Greater, so
// a point a rounding error outside the disk is kept (Q-TK-09). `Re` of a real point changes nothing.
import { NAMED } from '../../shared/mma-colors.js';
import { mGreater } from '../../shared/mma.js';
import { norm } from '../../shared/mma-exact.js';
import { normalizeCR } from '../../shared/mma-extra.js';
import { createPlot, addLocators } from '../../shared/svg-plot.js';
import { el } from '../../shared/ui.js';
import { dialPaneRange, clampToRange, drawArrowhead } from '../common/dial-control.js';

/** pt = If[Norm[Re[#]] > 1, Normalize[Re[#]], Re[#]] */
export function padSetter(p) {
  const q = [p[0], p[1]];
  return mGreater(norm(q), 1) ? normalizeCR(q) : q;
}

/** One pointer position → the pad's new point: limited to the pane's plot range, then padSetter. */
export const padPointer = (p, { clamp = true } = {}) => padSetter(clamp ? clampToRange(p, dialPaneRange([0, 0])) : p);

/** Table[a, {a, -1, 1, 0.2}]: −1 + k·0.2, k = 0 … 10 (machine arithmetic, the drawn tick positions). */
export const PAD_TICKS = Array.from({ length: 11 }, (_, k) => -1 + k * 0.2);

/**
 * make2VelControl(controls, {name, label, value, onInput(pt, {source})}) — the pad in the control column.
 * Returns {get(), set(pt) (programmatic, no onInput), redraw(), plot, row, box}; registered in controls.controls.
 */
export function make2VelControl(controls, { name, label = '', value = [1, 0], onInput, parent, imageSize = 140 }) {
  let pt = value.slice();
  const box = el('div', { class: 'velocity-pad', 'data-testid': `pad-${name}`, style: `width:${imageSize}px;max-width:100%` });
  const row = el('div', { class: 'ctl ctl-pad-row', 'data-testid': `ctl-${name}`, style: 'flex-direction:row;align-items:center;gap:6px' },
    label ? el('label', { class: 'ctl-label' }, label) : null, box);
  (parent ?? controls.root).append(row);
  const plot = createPlot(box, { plotRange: [[-1, 1], [-1, 1]], imageSize, testid: `pad-svg-${name}`, label: `${label || name} pad` });
  Object.assign(plot.svg.style, { display: 'block', width: '100%', height: 'auto', touchAction: 'none' });
  const back = plot.layer('pad'), front = plot.layer('arrows');
  const black = NAMED.Black;
  plot.disk(back, [0, 0], 1, { fill: NAMED.LightGreen });
  plot.line(back, [[-1, 0], [1, 0]], { stroke: black, thickness: 'Thin' });
  plot.line(back, [[0, -1], [0, 1]], { stroke: black, thickness: 'Thin' });
  // θ̇ᵢ: Text["\!\(\*SubscriptBox[OverscriptBox[\(θ\), \(.\)], \(i\)]\)"] — italic θ, a dot above it, subscript i
  const u = plot.unitsPerPx;
  const thetaDot = (sub, [x, y]) => {
    const grp = plot.group(back, { class: 'theta-dot' });
    plot.text(grp, 'θ', [x - 2 * u, y], { fontPx: 12, color: black, italic: true });
    plot.point(grp, [x - 1.2 * u, y + 7.5 * u], { abs: 1.6 }, black);
    plot.text(grp, sub, [x + 4.5 * u, y - 3.5 * u], { fontPx: 8.5, color: black });
  };
  thetaDot('1', [0.9, 0.2]);
  thetaDot('2', [0.2, 0.9]);
  for (const a of PAD_TICKS) {
    plot.line(back, [[a, 0], [a, 0.05]], { stroke: black, thickness: 'Thin' });
    plot.line(back, [[0, a], [0.05, a]], { stroke: black, thickness: 'Thin' });
  }
  for (const a of [-1, 1]) {
    const txt = a < 0 ? '−1' : '1';
    plot.text(back, txt, [-0.1, a], { fontPx: 11, color: black });
    plot.text(back, txt, [a, -0.1], { fontPx: 11, color: black });
  }
  const arrow = (from, to, color) => { // Thick arrow with Arrowheads[{0, .1}]: only the end head, 0.1 of the width
    const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy);
    plot.line(front, [from, to], { stroke: color, thickness: 'Thick', cap: 'butt' });
    if (len > 0) drawArrowhead(plot, front, to, [dx / len, dy / len], { size: 0.1, color });
  };
  const draw = () => {
    plot.clear('arrows');
    arrow([0, pt[1]], pt, NAMED.Red);
    arrow([pt[0], 0], pt, NAMED.Blue);
  };
  const loc = addLocators(plot, {
    names: [name], get: () => pt, pickAnywhere: true, keyStep: 0.05,
    describe: () => `${(label || name).replace(/\s+/g, ' ')} pad; arrow keys move it`,
    onMove: (_n, p, { source }) => {
      pt = padPointer(p);
      draw();
      loc.redraw();
      onInput?.(pt.slice(), { source });
    },
  });
  draw();
  const api = {
    get: () => pt.slice(),
    set: (v) => { pt = [Number(v[0]), Number(v[1])]; draw(); loc.redraw(); },
    redraw: () => { draw(); loc.redraw(); },
    plot, row, box,
  };
  controls.controls?.set(name, api);
  return api;
}
