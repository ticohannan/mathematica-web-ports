// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original (ECE 6311 Lecture 22 notebook) by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/potential-fields/main.js — the page: the notebook's four Manipulates (shared/manipulate.js), one per tab.
// Three draw a 3D picture (shared/graphics3d-view.js), the fourth an SVG contour plot. Each tab has its own controls,
// picture and "Initial settings" button; window.__demo is the hook of the tab on show (window.__demos has all four).
import { Manipulate, Row } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { Subscript, Style, Italic } from '../../shared/graphics.js';
import { TABS, initialStates, evaluators } from './model.js';

const sub = (base, i) => Subscript(Style(base, Italic), Style(i, Italic));
const DI = (tab) => [['di', 1, sub('d', 'i')], 0.01, 4, { name: `${tab}-di` }]; // {{di, 1, "d_i"}, 0.01, 4}
const ZI = (tab) => [['ζi', 1, sub('ζ', 'i')], 0, 4, { name: `${tab}-zi` }]; // {{ζi, 1, "ζ_i"}, 0, 4}
// Row[{Control[{{obs, {-1, 1}}, {-4, -4}, {4, 4}, ControlType -> Slider2D}], Control[{{obs2, …}}]}]: no labels
const OBS2 = (tab) => Row([
  [['obs', [-1, 1], ''], [-4, -4], [4, 4], { name: `${tab}-obs` }],
  [['obs2', [-1, 1], ''], [-4, -4], [4, 4], { name: `${tab}-obs2` }],
]);

const CONTROLS = {
  att: [DI('att'), ZI('att')],
  // {{obs, {-1, 1}}, {-4, -4}, {4, 4}}, {{ρ0, 2}, 0, 5}, {{ηi, 10}, 0, 200}
  rep: [
    [['obs', [-1, 1], 'obs'], [-4, -4], [4, 4], { name: 'rep-obs' }],
    [['ρ0', 2, 'ρ0'], 0, 5, { name: 'rep-rho0' }],
    [['ηi', 10, 'ηi'], 0, 200, { name: 'rep-eta' }],
  ],
  comb: [DI('comb'), ZI('comb'), OBS2('comb')],
  cont: [DI('cont'), ZI('cont'), OBS2('cont')],
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
