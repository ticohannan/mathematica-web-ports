// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original (ECE 6311 Lecture 22 notebook) by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/potential-fields/main.js — the page: the notebook's four Manipulates (shared/manipulate.js), one per tab.
// Three draw a 3D picture (shared/graphics3d-view.js), the fourth an SVG contour plot. Each tab has its own controls,
// picture and "Initial settings" button; window.__demo is the hook of the tab on show (window.__demos has all four).
import { Manipulate, Control } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { Subscript, Style, Italic } from '../../shared/graphics.js';
import { TABS, initialStates, evaluators } from './model.js';
import { obstaclePad } from './obstacle-pad.js';

const sub = (base, i) => Subscript(Style(base, Italic), Style(i, Italic));
const DI = (tab) => [['di', 1, sub('d', 'i')], 0.01, 4, { name: `${tab}-di` }]; // {{di, 1, "d_i"}, 0.01, 4}
const ZI = (tab) => [['ζi', 1, sub('ζ', 'i')], 0, 4, { name: `${tab}-zi` }]; // {{ζi, 1, "ζ_i"}, 0, 4}
// The obstacles: one pad with a locator per obstacle and buttons to add and remove them (Dr. Becker, 2026-11-24; the
// notebook: {{obs, {-1, 1}}, {-4, -4}, {4, 4}} in the second Manipulate, a Row of two unlabelled 2D sliders obs and
// obs2 in the last two, A-PF-11). Labels with subscripts: ρ_0, η_i (the notebook: the variable names ρ0, ηi; A-PF-13).
const OBS = (tab, init) => [['obs', init, 'obstacles'], Control(obstaclePad, { name: `${tab}-obs`, min: [-4, -4], max: [4, 4], minCount: 1 })];
const RHO0 = (tab) => [['ρ0', 2, Subscript(Style('ρ', Italic), '0')], 0, 5, { name: `${tab}-rho0` }]; // {{ρ0, 2}, 0, 5}

const CONTROLS = {
  att: [DI('att'), ZI('att')],
  // {{obs, {-1, 1}}, {-4, -4}, {4, 4}}, {{ρ0, 2}, 0, 5}, {{ηi, 10}, 0, 200}
  rep: [OBS('rep', [[-1, 1]]), RHO0('rep'), [['ηi', 10, sub('η', 'i')], 0, 200, { name: 'rep-eta' }]],
  // the notebook: di, ζi and the Row of obs and obs2 (ρ0 = 2 fixed); ρ_0 added (A-PF-10)
  comb: [DI('comb'), ZI('comb'), RHO0('comb'), OBS('comb', [[-1, 1], [-1, 1]])],
  cont: [DI('cont'), ZI('cont'), RHO0('cont'), OBS('cont', [[-1, 1], [-1, 1]])],
};

const hooks = {};
for (const t of TABS) {
  const k = t.key, is3D = k !== 'cont';
  Manipulate({
    name: 'potential-fields',
    initial: initialStates[k],
    body: evaluators[k],
    elements: { controls: `controls-${k}`, graphic: `graphic-${k}`, reset: `reset-${k}` },
    graphics: is3D
      ? { id: `graphic-${k}`, renderer: View3D({ SphericalRegion: false, zoom: 0.86, testid: `scene-canvas-${k}`, plotLabelElement: `#label-${k}`, label: `${t.label} (3D, drag to rotate)` }) }
      : { id: `graphic-${k}`, ImageSize: 360, label: t.label, testid: `contour-${k}` },
    controls: CONTROLS[k],
    hook: is3D ? {
      inkFraction: (c) => () => c.renderer().inkFraction(),
      camera: (c) => () => c.renderer().camera(),
      pixelAt: (c) => (p) => c.renderer().pixelAt(p),
    } : {},
  });
  hooks[k] = window.__demo;
  hooks[k].tab = k;
}

// ---- tabs (WAI-ARIA tab pattern: arrow keys, Home, End) -----------------------------------------------------------
const tabs = TABS.map((t) => document.querySelector(`[data-testid="tab-${t.key}"]`));
const panels = TABS.map((t) => document.getElementById(`panel-${t.key}`));
function show(i, focus = false, hash = true) {
  tabs.forEach((b, j) => {
    const on = i === j;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
    panels[j].hidden = !on;
  });
  window.__demo = hooks[TABS[i].key];
  if (focus) tabs[i].focus();
  if (hash && location.hash.slice(1) !== TABS[i].key) history.replaceState(null, '', `#${TABS[i].key}`);
}
tabs.forEach((b, i) => {
  b.addEventListener('click', () => show(i));
  b.addEventListener('keydown', (e) => {
    const n = tabs.length;
    const j = { ArrowRight: (i + 1) % n, ArrowLeft: (i + n - 1) % n, Home: 0, End: n - 1 }[e.key];
    if (j === undefined) return;
    e.preventDefault();
    show(j, true);
  });
});
window.__demos = hooks;
window.__showTab = (key) => show(TABS.findIndex((t) => t.key === key));
const start = TABS.findIndex((t) => t.key === location.hash.slice(1));
show(start >= 0 ? start : 0, false, false);
