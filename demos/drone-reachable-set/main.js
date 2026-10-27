// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/drone-reachable-set/main.js — the page: the original's Manipulate (shared/manipulate.js, ControlPlacement ->
// Left) with its two pictures as Graphics data: the reachable set (#graphic) and the LocatorPane of the switching times
// in the control column (#graphic2, placed there by index.html), whose locator is the Locator variable tRtT.
import { Manipulate, Locator, None, Control, IntervalSlider } from '../../shared/manipulate.js';
import { Controls, el } from '../../shared/ui.js';
import { Style, Subscript, Row, Italic, htmlOf, textOf } from '../../shared/graphics.js';
import { SPECS, initialState, initialSettings, evaluate, tValue } from './model.js';

/**
 * The t slider {{t, T, t̂}, 0, T, T/100, Appearance -> "Labeled", ImageSize -> 80}: its range and its step T/100 follow T,
 * and its value may be the symbol T (t follows T until the slider is moved, Q-DR-01). The layer's dynamic ranges keep the
 * first step and its sliders need a number, so this control (Control of shared/manipulate.js) holds a slider of
 * shared/ui.js that it makes again when T changes and that shows the value of t (refresh after every evaluation).
 */
function tSlider(controls, { name, label, html, value, onInput, imageSize }) {
  const row = el('div', { class: 'dr-tslider' });
  controls.root.append(row);
  let inner = null, builtT = null, moved = false, shownValue = value;
  const build = (T, v) => {
    const wasOpen = inner && !inner.row.querySelector('.ctl-anim').hidden;
    inner?.stop();
    row.replaceChildren();
    inner = new Controls(row).slider({
      name, label, min: 0, max: T, step: T / 100, steps: 'mma', value: v, labeled: true, plus: true,
      onInput: (x) => { moved = true; onInput(x); },
    });
    inner.row.querySelector('.ctl-label').innerHTML = html;
    const r = inner.row.querySelector('input[type=range]');
    Object.assign(r.style, { flex: `0 0 ${imageSize}px`, width: `${imageSize}px`, minWidth: `${imageSize}px` });
    if (wasOpen) inner.row.querySelector('.ctl-plus').click();
    inner.set(v, { moved });
    builtT = T;
  };
  return {
    row,
    get: () => inner?.get(),
    // a reset or setState (how.moved) or the body's write-back; the shown number is set in refresh (it needs T)
    set: (v, how) => { if (how && 'moved' in how) moved = !!how.moved; shownValue = v; },
    setEnabled: (b) => inner?.setEnabled(b),
    /** after every evaluation: the range and step for the current T, the value of t (T while t is the symbol T) */
    refresh: ({ T, t }) => {
      const v = tValue(t, T);
      if (T !== builtT) build(T, v);
      else if (inner.get() !== v || shownValue !== t) inner.set(v, { moved });
      shownValue = t;
    },
  };
}
let tControl = null;
const T_LABEL = Style('t̂', Italic);
const tFactory = (controls, opts) => { tControl = tSlider(controls, opts); tControl.refresh(initialState()); return tControl; };

Manipulate({
  name: 'drone-reachable-set',
  initial: initialState, // the notebook's saved state
  initialSettings, // Initial settings: the Manipulate's own initial values (tfold, r1old = −1: the plots are made again)
  body: evaluate,
  throttle: 'frame', // a new T or thrust range makes the region again (up to about 40 ms): at most one evaluation per frame
  graphics: [
    { id: 'graphic', testid: 'scene-svg', label: 'the reachable set of the drone' },
    { id: 'graphic2', testid: 'pane-svg', label: 'switching times t̂R and t̂T' },
  ],
  controls: [
    [['T', SPECS.T, Row([Style('T̂', Italic), ' final'])], 0.1, 10, { Appearance: 'Labeled', ImageSize: 80 }],
    [['t', SPECS.t, T_LABEL], Control(tFactory, { html: htmlOf(T_LABEL), imageSize: 80 })],
    [['r1', SPECS.r1, Subscript(Style('U', Italic), 'min/max')], 0, 5, 0.1,
      { ControlType: IntervalSlider, Method: 'Push', Appearance: 'Labeled', MinIntervalSize: 0.1, ImageSize: 50,
        steps: 'mma', look: 'mma', Moved: () => true }], // values shown as machine reals ("{0.1, 4.}")
    [['Drone', SPECS.Drone, 'drone'], [true, false]],
    [['Optimum', SPECS.Optimum, 'optimum'], [true, false]],
    // {regionsd, -1, ControlType -> None}, {regionsOpt, -1, …}: the plots are cached by the model (N-DR-02)
    [['tfold', SPECS.tfold], None],
    [['r1old', SPECS.r1old], None],
    // {{tRtT, {1, 0}, Row[{t̂R, t̂T, "\ncontrol"}]}, (tRtTControl[#1, T] &), ImageSize -> 10}: a LocatorPane in the control
    // column — the locator on picture 1 (its label is in index.html); the body's checks keep it in [0, T]², as the
    // LocatorPane's Dynamic setter (model.js clampToSquare) does in the original
    [['tRtT', SPECS.tRtT, textOf(Row([Subscript('t̂', 'R'), Subscript('t̂', 'T'), ' control']))], [0, 0], [10, 10], Locator, { picture: 1 }],
  ],
  after: (ctx) => tControl.refresh(ctx.state), // the t slider follows T (range, step, the symbol T)
});
