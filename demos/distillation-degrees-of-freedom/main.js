// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann, Janet deGrazia, John L. Falconer, Nathan S. Nelson and Nick Bongiardina
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/distillation-degrees-of-freedom/main.js — the page: the original's Manipulate (shared/manipulate.js), its Grid
// of controls above the pictures (balance popup, species B setter, "new problem" button; the number of unknowns of the
// chosen representation; the condenser setter while the condenser is chosen), the title, the flowsheet and the explanation.
import { Manipulate, Row, Rule, PopupMenu, Button, None } from '../../shared/manipulate.js';
import { Row as RowG, Subscript, Style, Italic } from '../../shared/graphics.js';
import { initialState, evaluate } from './model.js';

const it = (s) => Style(s, Italic);

Manipulate({
  name: 'distillation-degrees-of-freedom',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: [
    // the Grid's first row: Text@Style[Row@{Style["unknowns", Blue], " - species balances - …"}, 17]
    { id: 'title', PlotRange: [[0, 600], [0, 24]], PlotRangePadding: 0, ImageSize: [600, 24], testid: 'title-svg', label: 'unknowns − species balances − extra information = degrees of freedom' },
    // Graphics[…, ImageSize -> {405, 375}, AspectRatio -> Full, PlotRange -> {-7.51, 7.51}]: PlotRange {min, max} is the
    // y range; x is automatic, the primitives' −4.2 … 11 with 2 % padding; AspectRatio Full stretches it to 405 × 375
    { id: 'flowsheet', PlotRange: [[-4.504, 11.304], [-7.51, 7.51]], AspectRatio: 'Full', PlotRangePadding: 0, ImageSize: [405, 375], testid: 'flowsheet-svg', label: 'Flowsheet of the distillation process with its stream variables' },
    { id: 'explanation', PlotRange: [[0, 195], [0, 375]], PlotRangePadding: 0, ImageSize: [195, 375], testid: 'explanation-svg', label: 'Degree-of-freedom analysis of the chosen balance' },
  ],
  controls: [
    Row([
      [['select', 2, 'balance on'], [Rule(1, 'column'), Rule(2, 'condenser'), Rule(3, 'reboiler'), Rule(4, 'overall')], { ControlType: PopupMenu }],
      [['view', 1, 'species B representation'], [Rule(1, RowG([' 1−', Subscript(it('z'), 'A')])), Rule(2, Subscript(it(' z'), 'B'))]],
      // Button[" new problem ", If[reset < 1000, reset = reset + 1, reset = reset - 1], Background -> RGBColor[0, 1, 1]]
      Button(' new problem ', (s) => { s.reset = s.reset < 1000 ? s.reset + 1 : s.reset - 1; }, { name: 'new-problem' }),
    ], { name: 'row-1' }),
    [['reset', 1], None], // Control[{{reset, 1}, 1, 1000, 1, None}]
    Row([
      // PaneSelector[{1 -> u1 slider, 2 -> u2 slider}, Dynamic@view]
      [['u1', 5, 'total number of unknowns'], 1, 13, 1, { Appearance: 'Labeled', Visible: (s) => s.view === 1 }],
      [['u2', 10, 'total number of unknowns'], 1, 20, 1, { Appearance: 'Labeled', Visible: (s) => s.view === 2 }],
      // PaneSelector[{2 -> Control[{{cond, 1, ""}, {1 -> " partial condenser ", 2 -> " total condenser "}, Setter}]}, Dynamic@select]
      [['cond', 1, ''], [Rule(1, ' partial condenser '), Rule(2, ' total condenser ')], { Visible: (s) => s.select === 2 }],
    ], { name: 'row-2' }),
  ],
});
