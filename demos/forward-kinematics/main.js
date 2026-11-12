// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rob Lockhart
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/forward-kinematics/main.js — the page: the original's Manipulate (shared/manipulate.js) with its five controls at
// the top (four π/32 sliders with ⊕ panels, the checkbox "show frames"), and its output: a framed two-cell Grid with the
// Graphics3D (shared/graphics3d-view.js) and the table of the four local matrices (shared/traditional-form.js).
import { Manipulate, Checkbox } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { piFraction, parsePiFraction } from '../../shared/mma-text.js';
import { matrixElement, entryText } from '../../shared/traditional-form.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate, DEN, RANGES, OPTIONS } from './model.js';

/** a typed angle in the ⊕ panel: "5π/16", "5 Pi/16", "-π/2" (exact), or a number (radians) → n of nπ/32 */
function parseAngle(text) {
  const p = parsePiFraction(text);
  if (p) return (p.num * DEN) / p.den;
  const t = String(text).trim().replace(/[−–]/g, '-');
  if (t === '' || !Number.isFinite(Number(t))) return null;
  return (Number(t) * DEN) / Math.PI;
}
// {{T1, 0, "base"}, 0, 2Pi, Pi/32}: positions are the exact values nπ/32; no value label (the original sets no Appearance)
const angle = (name, init, label) => [[name, init, label], RANGES[name][0], RANGES[name][1], 1,
  { name, realValues: false, format: (n) => piFraction(n, DEN), parse: parseAngle, animSeconds: 8 }];

/** the right cell: Text@Style[Grid[{{"  ", header}, {"base", M1}, …}], FontSize -> 10] as an HTML table */
const MatrixTable = {
  draw(table, { element }) {
    const grid = document.createElement('table');
    grid.className = 'fk-table';
    const row = (label, content, testid) => {
      const tr = document.createElement('tr');
      const a = document.createElement('td'); a.textContent = label;
      const b = document.createElement('td'); b.append(content);
      if (testid) tr.setAttribute('data-testid', testid);
      tr.append(a, b);
      grid.append(tr);
    };
    const head = document.createElement('span'); head.textContent = table.header; head.setAttribute('data-testid', 'table-header');
    row('  ', head);
    table.rows.forEach(([label, m], k) => row(label, matrixElement(m, { testid: `matrix-${k}` }), `row-${k}`));
    element.replaceChildren(grid);
  },
};

const clone = (x) => JSON.parse(JSON.stringify(x));
Manipulate({
  name: 'forward-kinematics',
  initial: initialState,
  body: evaluate,
  graphics: [
    // ImageSize -> {350, 350}, ViewAngle -> π/15, explicit PlotRange (clipping), Boxed -> False, Lighting -> "Neutral";
    // Mathematica's SphericalRegion default (False) with the camera on the plot range's centre; the clipping box widened
    // by 0.05 so that the base's top face, in the plane z = 0 of the range, is drawn (D-FK-03)
    { id: 'graphic', renderer: View3D({ ...OPTIONS, SphericalRegion: false, clipPadding: 0.05, resetView: true, testid: 'scene-canvas', label: 'Robot arm (3D, drag to rotate)' }) },
    { id: 'graphic2', renderer: MatrixTable },
  ],
  controls: [
    angle('T1', 0, 'base'),
    angle('T2', 10, 'link 1'),
    angle('T3', -16, 'link 2'),
    angle('T4', 7, 'end effector'),
    [['FT', false, 'show frames'], [true, false], { ControlType: Checkbox }],
    ErrataControl(CORRECTIONS),
  ],
  resetStops: true,
  hook: {
    view: (view) => clone(view),
    /** the matrices of the table as plain text, row by row (entryText of shared/traditional-form.js) */
    tableText: (c) => () => c.graphics(1).rows.map(([label, m]) => [label, m.map((r) => r.map((e) => entryText(e, { minus: '-' })))]),
    inkFraction: (c) => () => c.renderer().inkFraction(),
    camera: (c) => () => c.renderer().camera(),
  },
});
