// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Ravi Patel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/unit-balls/main.js — page: the Manipulate's controls (ControlPlacement -> Left, one Column), evaluation of
// the body on every change, test hook (browser only).
import { Controls, el } from '../../shared/ui.js';
import {
  INITIAL, SETTER_VALUES, SLIDER, DIMENSIONS, parseP, pText, pNumber, setterSelection, sliderPosition, scene,
  plotLabelText, plotRange,
} from './norms.js';
import { createPlot } from './plot3d.js';

let state = { ...INITIAL };
const plot = createPlot(document.getElementById('graphic'));

// ---- the formula line: Dynamic[If[dimension == "2D", ‖(x, y)‖_p = …, ‖(x, y, z)‖_p = …]] (TraditionalForm) ----
const mo = (s) => `<mo stretchy="false" lspace="0" rspace="0">${s}</mo>`;
const absP = (v) => `<msup><mrow>${mo('|')}<mi>${v}</mi>${mo('|')}</mrow><mi>p</mi></msup>`;
const formulaFor = (vars) => `<math display="inline"><msub><mrow>${mo('‖')}${mo('(')}${vars.map((v) => `<mi>${v}</mi>`).join('<mo>,</mo>')}${mo(')')}${mo('‖')}</mrow><mi>p</mi></msub><mo>=</mo><msup><mrow>${mo('(')}${vars.map(absP).join('<mo>+</mo>')}${mo(')')}</mrow><mrow><mn>1</mn><mo>/</mo><mi>p</mi></mrow></msup></math>`;
const FORMULA = { '2D': formulaFor(['x', 'y']), '3D': formulaFor(['x', 'y', 'z']) };

// ---- controls -----------------------------------------------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
// Control@{{dimension, "3D", "dimension"}, {"2D", "3D"}} — a setter bar with its label in front
const dimCtl = controls.setterBar({
  name: 'dimension', label: 'dimension', value: state.dimension,
  options: DIMENSIONS.map((v) => ({ value: v })),
  onChange: (v) => { state.dimension = v; changed(); },
});
dimCtl.row.classList.add('ub-inline');
const formula = el('div', { class: 'ub-formula', 'data-testid': 'formula' });
controls.root.append(formula);
controls.root.append(el('div', { class: 'ub-gap' })); // ""
controls.root.append(el('div', { class: 'ub-ctl-text' }, 'discrete ', el('i', {}, 'p')));
// Control@{{p, 0.5, ""}, {1/4, 1/2, 1, 2, 3, 4, 9, 16, Infinity}, ControlType -> SetterBar}
const frac = (n, d) => el('span', { class: 'ub-frac' }, el('span', {}, n), el('span', {}, d));
const setterLabel = (v) => (v === 'Infinity' ? '∞' : v.includes('/') ? frac(...v.split('/')) : v);
const pSetter = controls.setterBar({
  name: 'p', label: '', value: setterSelection(state.p),
  options: SETTER_VALUES.map((v) => ({ value: v, label: setterLabel(v) })),
  onChange: (v) => { state.p = v; changed(); },
});
pSetter.row.setAttribute('data-testid', 'ctl-p-setter');
controls.root.append(el('div', { class: 'ub-gap' })); // ""
controls.root.append(el('div', { class: 'ub-ctl-text' }, 'continuous ', el('i', {}, 'p')));
// Control@{{p, 1, ""}, 0.1, 16, .01, Appearance -> "Labeled", ImageSize -> 150}; the label is our own value
// field (p can be a fraction or ∞, which a number field cannot show)
const pSlider = controls.slider({
  name: 'p', label: '', min: SLIDER.min, max: SLIDER.max, step: SLIDER.step, value: sliderPosition(state.p), labeled: false,
  onInput: (v) => { state.p = v; changed({ coalesce: true }); },
});
pSlider.row.setAttribute('data-testid', 'ctl-p-slider');
const valueField = el('input', { type: 'text', class: 'ctl-field ub-value', 'data-testid': 'value-p', 'aria-label': 'p value', spellcheck: 'false', autocomplete: 'off' });
pSlider.row.querySelector('.ctl-line').append(valueField);
valueField.addEventListener('change', () => {
  const v = parseP(valueField.value);
  if (v === null) { syncControls(); return; } // not a number Mathematica would accept for a norm: keep p
  state.p = v;
  changed();
});

/** Show the current values in every control (both p controls show the same variable). */
function syncControls() {
  dimCtl.set(state.dimension);
  pSetter.set(setterSelection(state.p));
  pSlider.set(sliderPosition(state.p));
  valueField.value = pText(state.p);
  formula.innerHTML = FORMULA[state.dimension];
}

// ---- evaluation of the Manipulate body ------------------------------------------------------------------------
let evaluations = 0;
let current = null;
function evaluate() {
  current = scene(state);
  plot.show(current, state.p);
  evaluations++;
}
let pending = 0;
/** A control changed: update the controls, re-evaluate (slider drags: at most once per animation frame). */
function changed({ coalesce = false } = {}) {
  syncControls();
  if (!coalesce) { cancelAnimationFrame(pending); pending = 0; evaluate(); return; }
  if (!pending) pending = requestAnimationFrame(() => { pending = 0; evaluate(); });
}

document.getElementById('reset').addEventListener('click', () => {
  pSlider.stop();
  state = { ...INITIAL };
  changed();
});

syncControls();
evaluate();

// ---- test / automation hook (port addition A-UB-03) -------------------------------------------------------------
window.__demo = {
  name: 'unit-balls',
  getState: () => ({ ...state }),
  /** setState({dimension, p}): p as a number (machine real) or an exact string ("1/4", "2", "Infinity") */
  setState: (partial) => { pSlider.stop(); state = { ...state, ...partial }; changed(); return { ...state }; },
  view: () => ({
    plotLabel: plotLabelText(state.p),
    plotLabelShown: plot.plotLabelEl.querySelector('.ub-label-text')?.textContent ?? '',
    formula: formula.textContent,
    setterSelected: setterSelection(state.p),
    sliderValue: Number(pSlider.row.querySelector('input[type=range]').value),
    valueText: valueField.value,
    pNumber: pNumber(state.p),
    plotRange: plotRange(state.dimension, state.p),
    kind: current?.kind,
    plotPoints: current?.plotPoints ?? null,
  }),
  stats: () => plot.stats(),
  inkFraction: () => plot.inkFraction(),
  cameraPosition: () => plot.cameraPosition(),
  frames: () => plot.viewer.frames,
  evaluations: () => evaluations,
  pending: () => pending !== 0,
  ready: true,
};
