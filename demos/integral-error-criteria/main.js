// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Housam Binous, Mohammad Mozahar Hossain and Ahmed Bellagi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/integral-error-criteria/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on top
// (ControlPlacement -> Top); the picture is the closed-loop response or one of the three tuning plots.
import { Manipulate, Rule, RadioButton } from '../../shared/manipulate.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate } from './model.js';

Manipulate({
  name: 'integral-error-criteria',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: { id: 'graphic' },
  controls: [
    [['ctrl2', 1, ''], [Rule(1, 'response'), Rule(2, 'tuning')]],
    [['Kc', 1.25, 'controller gain'], 1.0, 7.6, 0.05, { Appearance: 'Labeled', Enabled: (s) => s.ctrl2 === 1 }],
    [['ctrl', 1, 'tuning criteria'], [Rule(1, 'IAE'), Rule(2, 'ISE'), Rule(3, 'ITAE')], { ControlType: RadioButton }],
    ErrataControl(CORRECTIONS),
  ],
});
