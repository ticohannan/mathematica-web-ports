// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Nasser M. Abbasi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/feedback-control-simulation/main.js — the page: the original's Manipulate (shared/manipulate.js) with its own
// control panel (run / stop, the simulation time and speed, the plant, the controller) and its dashboard of pictures:
// the two mass–spring–damper animations, the Nyquist plot, the transfer functions, the step response, the Bode plots and
// the poles in the s-plane. "run" animates: currentTime advances by `delta` per evaluation (settle) up to the time.
import { Manipulate, Button, Rule, PopupMenu, Row } from '../../shared/manipulate.js';
import { Subscript, Style } from '../../shared/graphics.js';
import { initialState, evaluate, TYPES, poleText } from './model.js';

// every control of the plant and the controller stops the animation and resets the time (the Manipulators' Dynamic
// setters: currentTime = 0; doSimulation = False)
const stopping = (name) => (st, v) => { st[name] = v; st.currentTime = 0; st.doSimulation = false; };
const L = (name, extra = {}) => ({ Appearance: 'Labeled', ImageSize: 'Tiny', ContinuousAction: false, Assign: stopping(name), ...extra });
const graphics = ['graphic', 'graphic2', 'graphic3', 'graphic4', 'graphic5', 'graphic6', 'graphic7', 'graphic8'].map((id) => ({ id }));
Manipulate({
  name: 'feedback-control-simulation',
  initial: initialState,
  body: evaluate,
  graphics,
  settle: (s) => s.doSimulation && s.currentTime < s.simulationTime,
  settleInterval: 1 / 30,
  controls: [
    Row([
      Button('run', (st) => { st.currentTime = 0; st.doSimulation = true; }, { name: 'run' }),
      Button('stop', (st) => { st.currentTime = 0; st.doSimulation = false; }, { name: 'stop' }),
    ], { name: 'buttons' }),
    [['simulationTime', 20, 'time'], 1, 50, 1, { Appearance: 'Labeled', ImageSize: 'Tiny', ContinuousAction: false, Assign: (st, v) => { st.simulationTime = v; st.currentTime = 0; } }],
    [['delta', 0.2, 'slow → fast'], 0.1, 3, 0.1, { ImageSize: 'Tiny', ContinuousAction: false, Assign: (st, v) => { st.delta = v; st.currentTime = 0; } }],
    [['zeta', 0.77, 'ζ'], 0.01, 2, 0.01, L('zeta')],
    [['wn', 1, Subscript('ω', 'n')], 0.1, 2, 0.1, L('wn')],
    [['dcGain', 1, 'DC gain'], 0.01, 1.5, 0.01, L('dcGain')],
    [['controllerType', 'PID', ''], TYPES, { ControlType: PopupMenu, Assign: stopping('controllerType') }],
    [['showPlantResponse', true, 'show plant'], [true, false]],
    [['propertional', 10, 'P'], 0.001, 10, 0.001, L('propertional')],
    [['integral', 3.73, 'I'], 0, 5, 0.001, L('integral', { Enabled: (s) => s.controllerType === 'PI' || s.controllerType === 'PID' })],
    [['derivative', 0.697, 'D'], 0, 5, 0.001, L('derivative', { Enabled: (s) => s.controllerType === 'PD' || s.controllerType === 'PID' })],
    [['doSimulation', false], None0()],
    [['currentTime', 0], None0()],
  ],
  // the running time beside the buttons and the closed-loop poles under the s-plane picture
  after: (ctx) => {
    const t = document.querySelector('[data-testid=current-time]');
    if (t) t.textContent = `time ${Number.isInteger(ctx.state.currentTime) ? ctx.state.currentTime : ctx.state.currentTime.toFixed(1)}`;
    const p = document.querySelector('[data-testid=closed-loop-poles]');
    if (p) p.innerHTML = '<div>closed loop poles</div>' + ctx.view.poles.map((q) => `<div>${poleText(q)}</div>`).join('');
  },
});
function None0() { return { dir: 'none' }; }
void Rule; void Style;
