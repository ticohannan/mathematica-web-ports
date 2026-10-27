// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Renuka Pakeetharan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/probabilistic-motion/main.js — the page: the original's Manipulate (shared/manipulate.js) with its picture as
// Graphics data (a DensityPlot, or an empty framed plot with the samples, and the robots on top).
import { Manipulate, Delimiter, PopupMenu } from '../../shared/manipulate.js';
import { Style, Subscript, Italic } from '../../shared/graphics.js';
import { MODES, SPECS, initialState, evaluate } from './model.js';

const labeled = { Appearance: 'Labeled', ImageSize: 'Tiny' };
const α = (k) => Subscript(Style('α', Italic), k);
const velocityMode = (s) => s.mode === 'VelocityPDF' || s.mode === 'VelocitySample';

Manipulate({
  name: 'probabilistic-motion',
  initial: initialState, // the notebook's saved state (= the Manipulate's initial values)
  body: evaluate,
  throttle: 'frame', // at most one evaluation per animation frame while a slider is dragged (a DensityPlot takes tens of ms)
  graphics: { label: 'Density or samples of the final position, with the initial pose (green) and the nominal final pose (red)' },
  controls: [ // ControlPlacement -> Left: the pages' default (controls beside the picture)
    'mode',
    [['mode', SPECS.mode, ''], MODES, { ControlType: PopupMenu }],
    '',
    'heading θ',
    [['θ', SPECS.θ, ''], -3.14, 3.14, 0.001, labeled],
    '',
    'linear velocity v', // Row[{"linear velocity ", Style["v", Italic]}]
    [['v', SPECS.v, ''], -2, 2, 0.001, labeled],
    '',
    'angular velocity ω',
    [['ω', SPECS.ω, ''], -2, 2, 0.001, labeled],
    '',
    Delimiter,
    '',
    'noise parameters',
    '',
    [['α1', SPECS.α1, α(1)], 0, 0.1, 0.001, labeled],
    [['α2', SPECS.α2, α(2)], 0, 0.1, 0.001, labeled],
    [['α3', SPECS.α3, α(3)], 0, 0.1, 0.001, labeled],
    [['α4', SPECS.α4, α(4)], 0, 0.1, 0.001, labeled],
    [['α5', SPECS.α5, α(5)], 0, 0.5, 0.001, { ...labeled, Enabled: velocityMode }],
    [['α6', SPECS.α6, α(6)], 0, 0.5, 0.001, { ...labeled, Enabled: velocityMode }],
  ],
});

// The headings' letters are italic in the original (Style["v", Italic]; the θ and ω of its strings show italic too);
// the layer writes a heading as plain text, so the last letter is set in italics here (N-PM-05).
for (const h of document.querySelectorAll('#controls .ctl-heading')) {
  const m = /^(.* )([θvω])$/.exec(h.textContent);
  if (m) { h.textContent = m[1]; h.append(Object.assign(document.createElement('i'), { textContent: m[2] })); }
}
