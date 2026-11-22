// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Kenneth E. Caviness
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/longitudinal-standing-waves/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on top:
// harmonic n (setter buttons), pipe end, the TogglerBar of display options, the time Trigger; the plot as Graphics data.
import { Manipulate, Rule, SetterBar, TogglerBar, Trigger, Row } from '../../shared/manipulate.js';
import { Style, Italic, Tooltip, Cases } from '../../shared/graphics.js';
import { ColorData } from '../../shared/plot.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate, transverseIcon } from './model.js';

// "->" in a string is shown as an arrow by Mathematica's front end (the snapshots show "→"); the other labels are the
// original's strings. Option 6's label is the picture transverseIcon: the toggler's text is a stand-in ("∿", also its
// accessible name) and the picture is drawn into the button below (N-LS-03).
const OPTIONS = [
  Rule(1, Tooltip('  +  ', 'standing wave: sum of left and right waves')),
  Rule(2, Tooltip('  →  ', 'wave moving right')),
  Rule(3, Tooltip('  ←  ', 'wave reflected back left')),
  Rule(4, Tooltip('  |||||  ', 'longitudinal contours')),
  Rule(5, Tooltip('  ⋮⋮⋮⋮⋮  ', 'longitudinal density')),
  Rule(6, Tooltip('∿', 'transverse wave')),
  Rule(7, Tooltip(' ≡≡ ', 'longitudinal envelope')),
  Rule(8, Tooltip(' ⋰⋱ ', 'transverse envelope')),
  Rule(9, Tooltip('displacement nodes', 'show displacement nodes and antinodes')),
  Rule(10, Tooltip('pressure nodes', 'show pressure nodes and antinodes')),
];

Manipulate({
  name: 'longitudinal-standing-waves',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  graphics: { label: 'Longitudinal Standing Waves' },
  controls: [
    // {{n, 3, Row[{"harmonic ", Style["n", Italic]}]}, Range[7], ControlType -> Setter}: one Setter button per value,
    // drawn as the layer's setter bar (N-LS-02)
    [['n', 3, Row(['harmonic ', Style('n', Italic)])], [1, 2, 3, 4, 5, 6, 7], { ControlType: SetterBar }],
    [['end', 'open', 'pipe end'], ['open', 'closed', 'none']],
    [['options', [1, 4, 7, 8]], OPTIONS, { ControlType: TogglerBar }],
    [['t', 0, Row(['time ', Style('t', Italic)])], 0, 1, {
      ControlType: Trigger, AnimationRepetitions: Infinity, AppearanceElements: ['PlayPauseButton', 'FasterSlowerButtons'],
    }],
    ErrataControl(CORRECTIONS),
  ],
});

// transverseIcon = Plot[Cos[t], {t, 0, 3π}, PlotRange -> All, ImageSize -> 19, Axes -> False] as the label of option 6:
// its curve drawn into a 19 px wide SVG (AspectRatio 1/GoldenRatio, PlotRange All padded as the Plot pads it)
function iconSvg(g) {
  const [line] = Cases(g, 'Line');
  const pts = Array.isArray(line.pts[0][0]) ? line.pts.flat() : line.pts;
  const [[x0, x1], [y0, y1]] = g.options.PlotRange, [px, py] = g.options.PlotRangePadding;
  const w = 19, h = w * (2 / (1 + Math.sqrt(5)));
  const X = (x) => ((x - x0 + (x1 - x0) * px) / ((x1 - x0) * (1 + 2 * px))) * w;
  const Y = (y) => h - ((y - y0 + (y1 - y0) * py) / ((y1 - y0) * (1 + 2 * py))) * h;
  const c = ColorData(97, 1).rgb.map((v) => Math.round(v * 255)).join(',');
  const d = pts.map(([x, y]) => `${X(x).toFixed(2)},${Y(y).toFixed(2)}`).join(' ');
  return `<svg width="${w}" height="${h.toFixed(2)}" viewBox="0 0 ${w} ${h.toFixed(2)}" aria-hidden="true" style="vertical-align:middle">`
    + `<polyline points="${d}" fill="none" stroke="rgb(${c})" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
const iconButton = document.querySelector('[data-testid="toggler-options-6"] span');
if (iconButton) { iconButton.innerHTML = iconSvg(transverseIcon); iconButton.dataset.testid = 'transverse-icon'; }
