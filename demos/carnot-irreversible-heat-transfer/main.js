// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann, Megan Maguire and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/carnot-irreversible-heat-transfer/main.js — the page: the original's Manipulate (shared/manipulate.js), its
// controls in one row above the picture (Grid[{{setter, Spacer, slider, slider}}]), the picture as Graphics data.
import { Manipulate, Row, Rule } from '../../shared/manipulate.js';
import { Row as RowG, Subscript, Style, Italic } from '../../shared/graphics.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate } from './model.js';

const T = (sub) => Subscript(Style('T', Italic), sub);
// Row[{"|", Subscript[T, "h"], " - ", Subscript[T, "H"], "|"}]
const diff = (a, b) => RowG(['|', T(a), ' − ', T(b), '|']);

Manipulate({
  name: 'carnot-irreversible-heat-transfer',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  // PlotRange: Mathematica's automatic range of the primitives (x −6.25 … 8.95, y −5 … 5) with the default padding of
  // 2 % on each side (measured on the snapshots: 38 px per unit); the ImageSize {600, 430} adds room above and below,
  // where the reservoirs' labels stand (y ±5.665: the padded width 15.808 × 430/600, centred)
  graphics: { id: 'graphic', ImageSize: [600, 430], PlotRange: [[-6.25 - 0.304, 8.95 + 0.304], [-5.665, 5.665]], label: 'Carnot cycle with the reservoirs, heats, work and entropy changes' },
  controls: [
    Row([
      // Control[{{csb, 1, ""}, {1 -> " heat engine ", 2 -> " heat pump "}, Setter}]
      [['csb', 1, ''], [Rule(1, ' heat engine '), Rule(2, ' heat pump ')]],
      // Control[{{ΔT1, 10, |Th − TH|}, 0, 50, 2, Appearance -> "Labeled", ImageSize -> Small}]
      [['ΔT1', 10, diff('h', 'H')], 0, 50, 2, { Appearance: 'Labeled', ImageSize: 'Small', name: 'dT1' }],
      [['ΔT2', 12, diff('c', 'C')], 0, 50, 2, { Appearance: 'Labeled', ImageSize: 'Small', name: 'dT2' }],
    ], { name: 'controls-row' }),
    ErrataControl(CORRECTIONS),
  ],
});
