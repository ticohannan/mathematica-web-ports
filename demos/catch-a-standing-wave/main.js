// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by D. Meliga, S. Z. Lavagnino and A. Ratti
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/catch-a-standing-wave/main.js — the page: the original's Manipulate (shared/manipulate.js), controls on the left
// (ControlPlacement -> Left), the Column of the two plots on the right, and the LocatorPane of the cavity end over both.
import { Manipulate, Locator, Delimiter, None, Rule, SetterBar, Trigger, Control, hookCopy } from '../../shared/manipulate.js';
import { Style } from '../../shared/graphics.js';
import { addVerticalSlider } from '../../shared/ui-extra.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { initialState, evaluate, firstHarmonic, isPiOverF, fAt, fIndex, PI_OVER_F, PLOT_RANGE } from './model.js';

// {{f, .18, "frequency"}, 1.4, .18, .01, ControlType -> VerticalSlider, Appearance -> "Labeled"}: min 1.4 at the bottom,
// max 0.18 at the top (F-CA-01, Q-CA-01). The browser's range input cannot run from a larger to a smaller value, so it holds the
// grid index k = 0 … 122 (bottom … top) and the variable is 1.4 − k·0.01 (0.18 at the top); the value is shown below.
const frequencySlider = (controls, o) => {
  let value = o.value;
  const api = addVerticalSlider(controls, {
    name: o.name, label: o.label, min: 0, max: 122, step: 1, value: fIndex(value), parent: o.parent,
    onInput: (k) => { value = fAt(k); show(); o.onInput(value); },
  });
  const range = api.row.querySelector('input'), out = api.row.querySelector('.ctl-vvalue');
  range.style.height = '190px';
  range.setAttribute('aria-valuetext', String(value));
  const show = () => { out.textContent = mmaNumberString(value, { isReal: true }); range.setAttribute('aria-valuetext', out.textContent); };
  show();
  return { row: api.row, get: () => value, set: (v) => { value = v; range.value = String(fIndex(v)); show(); } };
};

const ctx = Manipulate({
  name: 'catch-a-standing-wave',
  initial: initialState,
  body: evaluate, // { state (pt's value written back), view, graphics: [the waves plot, the standing-wave plot] }
  // Column[{Plot[…, ImageSize -> {300, 200}], ListLinePlot[…, ImageSize -> {300, 200}]}]
  graphics: [{ id: 'graphic' }, { id: 'graphic2' }],
  controls: [
    [['f', 0.18, 'frequency'], Control(frequencySlider)],
    '',
    // {{t, 1, "time"}, 0, ∞, ControlType -> Trigger, AppearanceElements -> {"PlayPauseButton", "ResetButton", "FasterSlowerButtons"}}
    [['t', 1, 'time'], 0, Infinity, { ControlType: Trigger, AppearanceElements: ['PlayPauseButton', 'ResetButton', 'FasterSlowerButtons'] }],
    '',
    [['a', 1, 'harmonics'], [Rule(1, '1st'), Rule(2, '2nd'), Rule(3, '3rd'), Rule(4, '4th'), Rule(5, '5th')]],
    '',
    // {{pt, {π/f, 0}, ""}, {{π/f, 0} -> "first harmonic"}, ControlType -> SetterBar}: Manipulate makes the value list
    // Dynamic (the notebook stores Dynamic[{{Pi/f, 0} -> "first harmonic"}]), so a click sets pt to {π/f, 0} at the
    // current f, a number that stays when f changes (F-CA-07)
    [['pt', initialState().pt, ''], [Rule('first harmonic', 'first harmonic')], {
      ControlType: SetterBar,
      Assign: (s) => { s.pt = firstHarmonic(s.f); s.ptExpr = null; },
    }],
    Delimiter,
    '',
    Style('click and drag the line', 13),
    Style('to change the cavity length', 13),
    // LocatorPane[Dynamic[pt], …, Appearance -> None]: an invisible locator in the coordinates of the Column's first plot,
    // limited to its plot range (K-CA-01); presses in the second plot are passed on below
    [['pt', initialState().pt], [PLOT_RANGE[0][0], PLOT_RANGE[1][0]], [PLOT_RANGE[0][1], PLOT_RANGE[1][1]], Locator, { Appearance: None }],
  ],
  // the setState of a saved state: pt given as the expression {π/f, 0} (the notebook's form) holds it again
  merge: (s, p) => {
    const out = { ...s, ...p };
    if ('pt' in p) {
      if (isPiOverF(p.pt)) { out.ptExpr = PI_OVER_F; out.pt = firstHarmonic(out.f); } else if (!('ptExpr' in p)) out.ptExpr = null;
    }
    return out;
  },
  locators: {
    throttle: 'frame', keyStep: 0.05,
    describe: () => 'cavity end; arrow keys move it',
    onPlace: (n, c) => { c.state.ptExpr = null; }, // a dragged pt is a number: it no longer follows f
  },
  // the SetterBar shows "first harmonic" pressed while pt equals its value {π/f, 0} at the current f
  after: (c) => {
    document.querySelector('[data-testid="setter-pt-first-harmonic"]')?.setAttribute('aria-pressed', String(!!c.view.firstHarmonicPressed));
  },
  hook: {
    moveLocator: (c) => (n, p) => { c.state.ptExpr = null; c.moveLocator(n, p); return hookCopy(c.state); },
  },
});

// The LocatorPane spans the whole Column: a press in the standing-wave plot moves the cavity end too. Its coordinates
// are the first plot's (K-CA-01): the press is handed to the first plot's locator pane at the same screen point, so x
// is the same (both plots have the same horizontal layout) and y, below the first plot, is held at −2.1.
const second = ctx.plots[1].svg;
second.style.cursor = 'pointer';
second.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  ctx.plots[0].svg.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true, cancelable: true, button: 0, buttons: 1, clientX: e.clientX, clientY: e.clientY,
    pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary,
  }));
});
