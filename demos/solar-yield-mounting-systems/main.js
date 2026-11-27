// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Michel de Spot
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/solar-yield-mounting-systems/main.js — the page: the original's Manipulate (shared/manipulate.js) with
// ControlPlacement -> Left: three panels (latitude, panel angle with the "optimized @" setters, date with the season
// setters) whose headings show the current values, and below them the bar chart of the daily yields; the plot at the right.
import { Manipulate, Rule, Control, SetterBar } from '../../shared/manipulate.js';
import { el } from '../../shared/ui.js';
import { ErrataControl } from '../../shared/errata.js';
import { CORRECTIONS } from './errata-mode.js';
import { initialState, evaluate, dayLabel, BAR_SCALE } from './model.js';

// Item[Style[Dynamic["latitude " <> ToString[lat] <> " °"], Bold, 12, Hue[0]]]: a heading that follows the state
const headings = [];
function liveHeading(controls, { name, parent, text, color }) {
  const row = el('div', { class: 'sy-heading', 'data-testid': `heading-${name}`, style: `color: ${color}` });
  (parent ?? controls.root).append(row);
  headings.push((s) => { row.textContent = text(s); });
  return { get: () => null, set: () => {}, row };
}
// ToString of a slider value with step .1 (49.7, 58, 26.3: Mathematica prints the machine real with up to six digits)
const str = (v) => String(Number(v.toPrecision(6)));

Manipulate({
  name: 'solar-yield-mounting-systems',
  ControlPlacement: 'Left',
  initial: initialState,
  body: evaluate,
  graphics: [
    { id: 'plot', testid: 'plot-svg', label: 'Daily solar energy yield of the five mountings against the hour' },
    { id: 'legend', PlotRange: [[0, 361], [0, 46]], PlotRangePadding: 0, ImageSize: [361, 46], testid: 'legend-svg', label: 'Legend of the plot' },
    { id: 'bars', PlotRange: [[-0.4, 5.9], [0, BAR_SCALE * 12]], PlotRangePadding: 0, ImageSize: [210, 120], testid: 'bars-svg', label: 'Daily energy yield of the five mountings' },
  ],
  controls: [
    [['h-lat', null], Control(liveHeading, { text: (s) => `latitude ${str(s.lat)} °`, color: 'rgb(255, 0, 0)' })],
    // Control@{{lat, 49.7, ""}, 24, 65., .1}
    [['lat', 49.7, ''], 24, 65, 0.1],
    [['h-sl', null], Control(liveHeading, { text: (s) => `panel angle ${str(s.sl)} °`, color: 'rgb(170, 85, 0)' })],
    [['sl', 58, ''], 0, 90, 0.1],
    'optimized @',
    // Control@{{sl, , ""}, {(lat + 23.4) -> "winter solstice", (lat - 23.4) -> "summer solstice"}, ControlType -> SetterBar}:
    // the values follow lat (Dynamic in the Manipulate); a click sets sl to lat ± 23.4 at the current latitude
    [['optimize', null, ''], [Rule('winter', 'winter solstice'), Rule('summer', 'summer solstice')], {
      ControlType: SetterBar, Assign: (s, v) => { s.sl = v === 'winter' ? s.lat + 23.4 : s.lat - 23.4; },
    }],
    [['equinox', null, ''], [Rule('equinox', 'equinox')], { ControlType: SetterBar, Assign: (s) => { s.sl = s.lat; } }],
    [['h-dp', null], Control(liveHeading, { text: (s) => dayLabel(s.dp), color: 'rgb(0, 0, 255)' })],
    [['dp', 171, ''], 1, 365, 1],
    // Control@{{dp, , ""}, {354 -> "winter", 79 -> "spring", 171 -> "summer", 263 -> "autumn"}, ControlType -> SetterBar}:
    // a second control of dp; here the variable season, which the body keeps equal to dp (shown pressed while dp is 354, …)
    [['season', 171, ''], [Rule(354, 'winter'), Rule(79, 'spring'), Rule(171, 'summer'), Rule(263, 'autumn')], {
      ControlType: SetterBar, Assign: (s, v) => { s.dp = v; },
    }],
    ErrataControl(CORRECTIONS),
  ],
  after: (ctx) => {
    for (const h of headings) h(ctx.state);
    document.querySelector('[data-testid=bars-label]').textContent = ctx.view.yieldLabel; // Item[Style["Energy Yield kW/h/da ", 12, Gray]]
  },
});
