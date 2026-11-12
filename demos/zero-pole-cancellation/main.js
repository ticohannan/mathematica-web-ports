// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Hugo Tadashi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/zero-pole-cancellation/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on top:
// the gain slider and the setter bar of the three transfer functions; the root locus as Graphics data.
import { Manipulate, Rule } from '../../shared/manipulate.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate, CHOICES } from './model.js';

Manipulate({
  name: 'zero-pole-cancellation',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: { id: 'graphic' },
  controls: [
    [['gain', 0, 'gain'], 0, 1, { Appearance: 'Labeled' }],
    [['tf', 1, ''], CHOICES.map(([v, l]) => Rule(v, l))],
    ErrataControl(CORRECTIONS),
  ],
});
