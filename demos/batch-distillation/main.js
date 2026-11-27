// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Neil Hendren and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/batch-distillation/main.js — the page: the original's Manipulate (shared/manipulate.js) with its Column of two
// Rows — the slider of z, the button "reset" and the popup menu of the mixture; the slider of the amount to evaporate,
// the Trigger "click to collect" (evapProg from 0 to 1 in 4 s) and the radio buttons of the display — and the hidden
// variables. The Trigger and the button are enabled and disabled as the original's Enabled -> Dynamic[…] say (in
// `after`: the layer's Trigger and Button have no Enabled option).
import { Manipulate, Rule, PopupMenu, RadioButton, Button, Control, None, Row } from '../../shared/manipulate.js';
import { Style, Italic } from '../../shared/graphics.js';
import { initialState, evaluate, reset } from './model.js';

const idle = (s) => !s.inProg && s.stage < 2;

/**
 * Trigger[Dynamic[evapProg], {0, 1}, DefaultDuration -> 4, AppearanceElements -> {"PlayButton"}, AnimationRepetitions -> 1,
 * DisplayAllSteps -> True]: a play button that runs evapProg from 0 to 1 in 4 s and stops at 1, where the body sets
 * evapProg = 0 (the end of a collection). An app-local control: the layer's Trigger runs on when the body resets its
 * variable at the end.
 */
function collectTrigger(controls, { name, label, value, onInput, parent }) {
  let v = value, running = false;
  const play = document.createElement('button');
  Object.assign(play, { type: 'button', className: 'trigger-play', textContent: '\u25B6' });
  play.dataset.testid = `trigger-play-${name}`;
  play.setAttribute('aria-label', 'click to collect');
  const caption = document.createElement('span');
  caption.className = 'ctl-label bd-collect';
  caption.innerHTML = 'click to<br>collect:';
  const row = document.createElement('div');
  row.className = 'ctl ctl-trigger';
  row.dataset.testid = `ctl-${name}`;
  row.append(caption, play);
  (parent ?? controls.root).append(row);
  play.addEventListener('click', () => {
    if (running) return;
    running = true;
    const t0 = performance.now();
    const frame = (now) => {
      const x = Math.min(1, ((now - t0) / 1000) * 0.25);
      v = x;
      onInput(x);
      if (x < 1) requestAnimationFrame(frame); else running = false;
    };
    requestAnimationFrame(frame);
  });
  void label;
  return { row, get: () => v, set: (x) => { v = x; }, isPlaying: () => running };
}
const init = initialState();

Manipulate({
  name: 'batch-distillation',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  // Show[Graphics[{columnGraphic, Inset[…, {11, 4}]}], PlotRange -> {{-3, 16}, {-0.8, 9}}, ImageSize -> {600, 340}, AspectRatio -> Full]
  graphics: {
    id: 'graphic', PlotRange: [[-3, 16], [-0.8, 9]], PlotRangePadding: 0, ImageSize: [600, 340], AspectRatio: 'Full',
    label: 'The still, the condenser and the collection flask, with the flasks, the x–y plot or the T–x–y plot at the right',
  },
  controls: [
    Row([
      [['z', 0.5, 'initial mole fraction in still '], 0.05, 0.95, 0.01, { Appearance: 'Labeled', ImageSize: 135, Enabled: idle }],
      // Button["reset", {stage = 1, flasksMol[[;;]] = 0, z = 0.5, flasksFrac[[;;]] = 0}, Enabled -> Dynamic[evapProg == 0]]
      Button('reset', (s) => Object.assign(s, reset(s)), { name: 'reset-flasks' }),
      [['az', 1, ''], [Rule(1, 'no azeotrope'), Rule(2, 'minimum boiling azeotrope'), Rule(3, 'maximum boiling azeotrope')],
        { ControlType: PopupMenu, Enabled: idle }],
    ], { name: 'first' }),
    Row([
      [['molesToEvap', 0.1, 'amount to evaporate (moles)'], 0.05, 0.25, 0.01, { Appearance: 'Labeled', ImageSize: 120, Enabled: (s) => !s.inProg }],
      [['evapProg', 0, 'click to collect:'], Control(collectTrigger)],
      [['graph', 1, 'display: '], [
        Rule(1, 'flasks'),
        Rule(2, Row([Style('x', Italic), '–', Style('y', Italic), ' plot'])),
        Rule(3, Row([Style('T', Italic), '–', Style('x', Italic), '–', Style('y', Italic), ' plot'])),
      ], { ControlType: RadioButton, Appearance: 'Vertical' }],
    ], { name: 'second' }),
    [['inProg', false], None],
    [['xb', init.xb], None],
    [['xt', init.xt], None],
    [['stage', 1], None],
    [['flasksMol', init.flasksMol], None],
    [['flasksFrac', init.flasksFrac], None],
    [['boilDry', false], None],
  ],
  after: ({ state }) => {
    const play = document.querySelector('[data-testid=trigger-play-evapProg]');
    // Enabled -> Dynamic@Not[inProg]; a collection that runs is not stopped (inProg is True while evapProg > 0)
    if (play && !(state.evapProg > 0)) play.disabled = !!state.inProg;
    const button = document.querySelector('[data-testid=button-reset-flasks]');
    if (button) button.disabled = state.evapProg !== 0;
    // Tooltip[…, "Boiling the pot dry will damage it!", TooltipDelay -> Dynamic@If[boilDry, 0, ∞]]
    const amount = document.querySelector('[data-testid=ctl-molesToEvap]');
    if (amount) { if (state.boilDry) amount.title = 'Boiling the pot dry will damage it!'; else amount.removeAttribute('title'); }
  },
});
