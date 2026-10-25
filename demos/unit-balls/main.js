// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Ravi Patel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/unit-balls/main.js — page: the Manipulate (ControlPlacement -> Left, one Column of controls), its body
// norms.js scene(state) drawn by plot3d.js, the test hook (browser only).
// On the shared Manipulate layer since v0.1.21 (behaviour unchanged: tests and 3D parity of scene graph and pixels).
import { Manipulate, Control } from '../../shared/manipulate.js';
import { el } from '../../shared/ui.js';
import {
  INITIAL, SETTER_VALUES, SLIDER, DIMENSIONS, parseP, pText, pNumber, setterSelection, sliderPosition, scene,
  plotLabelText, plotRange,
} from './norms.js';
import { UnitBallsView } from './plot3d.js';

// ---- the formula line: Dynamic[If[dimension == "2D", ‖(x, y)‖_p = …, ‖(x, y, z)‖_p = …]] (TraditionalForm) ----
const mo = (s) => `<mo stretchy="false" lspace="0" rspace="0">${s}</mo>`;
const absP = (v) => `<msup><mrow>${mo('|')}<mi>${v}</mi>${mo('|')}</mrow><mi>p</mi></msup>`;
const formulaFor = (vars) => `<math display="inline"><msub><mrow>${mo('‖')}${mo('(')}${vars.map((v) => `<mi>${v}</mi>`).join('<mo>,</mo>')}${mo(')')}${mo('‖')}</mrow><mi>p</mi></msub><mo>=</mo><msup><mrow>${mo('(')}${vars.map(absP).join('<mo>+</mo>')}${mo(')')}</mrow><mrow><mn>1</mn><mo>/</mo><mi>p</mi></mrow></msup></math>`;
const FORMULA = { '2D': formulaFor(['x', 'y']), '3D': formulaFor(['x', 'y', 'z']) };

// Control@{{dimension, "3D", "dimension"}, {"2D", "3D"}} — a setter bar with its label in front
function dimensionSetter(controls, { name, label, value, onChange }) {
  const api = controls.setterBar({ name, label, value, options: DIMENSIONS.map((v) => ({ value: v })), onChange });
  api.row.classList.add('ub-inline');
  return api;
}

// The rest of the Column: the formula, "discrete p" with Control@{{p, 0.5, ""}, {1/4, 1/2, 1, 2, 3, 4, 9, 16, Infinity},
// ControlType -> SetterBar}, "continuous p" with Control@{{p, 1, ""}, 0.1, 16, .01, Appearance -> "Labeled",
// ImageSize -> 150}: two controls of the one variable p; the slider's label is our own value field (p can be a
// fraction or ∞, which a number field cannot show). Slider drags evaluate at most once per animation frame.
let page = null, formula = null, pSlider = null, valueField = null, pending = 0;
const cancelSlide = () => { if (pending) { cancelAnimationFrame(pending); pending = 0; } };
function pControls(controls, { value, onInput }) {
  formula = el('div', { class: 'ub-formula', 'data-testid': 'formula' });
  const text = (t) => el('div', { class: 'ub-ctl-text' }, `${t} `, el('i', {}, 'p'));
  controls.root.append(formula, el('div', { class: 'ub-gap' }), text('discrete'));
  const frac = (n, d) => el('span', { class: 'ub-frac' }, el('span', {}, n), el('span', {}, d));
  const setterLabel = (v) => (v === 'Infinity' ? '∞' : v.includes('/') ? frac(...v.split('/')) : v);
  const pSetter = controls.setterBar({
    name: 'p', label: '', value: setterSelection(value), options: SETTER_VALUES.map((v) => ({ value: v, label: setterLabel(v) })),
    onChange: (v) => { show(v); onInput(v); },
  });
  pSetter.row.setAttribute('data-testid', 'ctl-p-setter');
  controls.root.append(el('div', { class: 'ub-gap' }), text('continuous'));
  pSlider = controls.slider({
    name: 'p', label: '', min: SLIDER.min, max: SLIDER.max, step: SLIDER.step, value: sliderPosition(value), labeled: false,
    onInput: (v) => { show(v); page.state.p = v; if (!pending) pending = requestAnimationFrame(() => { pending = 0; page.run(); }); },
  });
  pSlider.row.setAttribute('data-testid', 'ctl-p-slider');
  valueField = el('input', { type: 'text', class: 'ctl-field ub-value', 'data-testid': 'value-p', 'aria-label': 'p value', spellcheck: 'false', autocomplete: 'off' });
  pSlider.row.querySelector('.ctl-line').append(valueField);
  valueField.addEventListener('change', () => {
    const v = parseP(valueField.value);
    if (v === null) { show(page.state.p); return; } // not a number Mathematica would accept for a norm: keep p
    show(v); onInput(v);
  });
  /** both p controls show the same variable */
  const show = (p) => { pSetter.set(setterSelection(p)); pSlider.set(sliderPosition(p)); valueField.value = pText(p); };
  show(value);
  return { get: () => page.state.p, set: show, stop: pSlider.stop, row: pSlider.row };
}

let evaluations = 0;
const plot = UnitBallsView();
page = Manipulate({
  name: 'unit-balls',
  initial: () => ({ ...INITIAL }),
  body: (s) => { cancelSlide(); evaluations++; const sc = scene(s); return { view: sc, graphics: sc }; },
  graphics: { id: 'graphic', renderer: plot },
  controls: [
    [['dimension', INITIAL.dimension, 'dimension'], Control(dimensionSetter)],
    [['p', INITIAL.p, ''], Control(pControls)],
  ],
  resetStops: true,
  after: (c) => { formula.innerHTML = FORMULA[c.state.dimension]; },
  hook: { // port addition A-UB-03; setState({dimension, p}): p as a number (machine real) or an exact string ("1/4", "2", "Infinity")
    copy: (x) => (x && typeof x === 'object' ? { ...x } : x),
    view: (sc, s) => ({
      plotLabel: plotLabelText(s.p),
      plotLabelShown: plot.plot.plotLabelEl.querySelector('.ub-label-text')?.textContent ?? '',
      formula: formula.textContent,
      setterSelected: setterSelection(s.p),
      sliderValue: Number(pSlider.row.querySelector('input[type=range]').value),
      valueText: valueField.value,
      pNumber: pNumber(s.p),
      plotRange: plotRange(s.dimension, s.p),
      kind: sc?.kind,
      plotPoints: sc?.plotPoints ?? null,
    }),
    stats: () => () => plot.stats(),
    inkFraction: () => () => plot.plot.inkFraction(),
    cameraPosition: () => () => plot.plot.cameraPosition(),
    frames: () => () => plot.plot.viewer.frames,
    evaluations: () => () => evaluations,
    pending: () => () => pending !== 0,
  },
});
