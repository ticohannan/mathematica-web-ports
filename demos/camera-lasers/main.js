// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/camera-lasers/main.js — the Manipulate: the object locator, the orientation dial, the s and λ sliders and the
// two pictures Column[{Graphics[top view], Framed[Graphics[camera image]]}], on shared/manipulate.js (browser only).
import { Manipulate, Locator, None, Control, hookCopy } from '../../shared/manipulate.js';
import { Style, Italic } from '../../shared/graphics.js';
import { mmaGrid } from '../../shared/ui.js';
import { addVerticalSlider } from '../../shared/ui-extra.js';
import { makeDialControl } from '../common/dial-control.js';
import { initialSettings, evaluate, fromSaved, PLOT_RANGE, CAM_RANGE, IMSZ, DIAL_OPTIONS } from './model.js';

// {{s, 1}, 0.1, 2, 0.01, VerticalSlider, …}: the values 0.1 + k·0.01 of Mathematica's slider (the layer's vertical
// slider passes the input's own value)
const sGrid = mmaGrid(0.1, 2, 0.01);
const sSlider = (controls, o) => addVerticalSlider(controls, { ...o, onInput: (v) => o.onInput(sGrid.valueAt(sGrid.indexOf(v))) });

const m = Manipulate({
  name: 'camera-lasers',
  initial: initialSettings,
  body: evaluate, // one evaluation of the Manipulate body (model.js): { state, view, graphics: [top view, camera image] }
  // Column[{Graphics[…, PlotRange -> plotRange, ImageSize -> imsz], Framed[Graphics[…, PlotRange -> camera, …]]}]
  graphics: [
    { PlotRange: PLOT_RANGE, ImageSize: IMSZ, PlotRangePadding: 0, id: 'top-view', testid: 'scene-svg', label: 'Top view: camera, lasers, beams and the brown object' },
    { PlotRange: CAM_RANGE, ImageSize: IMSZ, PlotRangePadding: 0, id: 'camera-image', testid: 'camera-svg', label: 'Camera image with the laser dots and the distance reticule' },
  ],
  controls: [
    // {{p, {3, -1/5}}, Locator, Appearance -> None}; range: the top view's plot range (K-CL-01); loc[Black] drawn above
    [['p', [3, -0.2]], [PLOT_RANGE[0][0], PLOT_RANGE[1][0]], [PLOT_RANGE[0][1], PLOT_RANGE[1][1]], Locator, { Appearance: None }],
    [['pFixed', [3, -0.2]], None],
    'object orientation',
    [['p1', [1, 0], 'θ'], Control(makeDialControl, DIAL_OPTIONS)], // (makeDialControl[#1, {0, 0}, Red] &), ImageSize -> {120, 120}
    '\nlaser spacing',
    // {{s, 1}, 0.1, 2, 0.01, VerticalSlider, ImageSize -> {Automatic, 80}, Appearance -> "Labeled"}
    [['s', 1], Control(sSlider, { min: 0.1, max: 2, step: 0.01 })],
    'camera focal length',
    [['lambda', 0.5, Style('λ', Italic)], 0.1, 2, 0.01, { ImageSize: 80, Appearance: 'Labeled' }],
  ],
  // LocatorPane: a press anywhere in the top view moves the object there (D-CL-06)
  locators: { keyStep: 0.1, describe: () => 'object locator; arrow keys move it' },
  hook: { // port addition A-CL-04
    /** texts of the reticule labels, left to right */
    tickLabels: (c) => () => [...c.plots[1].svg.querySelectorAll('[data-testid=tick-label]')].map((g) => ({ text: g.getAttribute('data-text'), u: Number(g.querySelector('text').getAttribute('transform').match(/translate\(([-\d.e]+)/)[1]) })).sort((a, b) => a.u - b.u).map((l) => l.text),
    /** load a state (the port's form or a saved one with plain numbers, λ under its own name), then evaluate once */
    loadState: (c) => (s) => hookCopy(c.setState(fromSaved(JSON.parse(JSON.stringify(s))))),
    moveLocator: (c) => (q) => { c.moveLocator('p', q); return hookCopy(c.state); },
    camWorldToClient: (c) => (q) => c.plots[1].worldToClient(q),
    dialToClient: (c) => (q) => c.controls.get('p1').plot.worldToClient(q),
  },
});
document.getElementById('reset').addEventListener('click', () => m.controls.get('lambda').stop()); // stop the ⊕ animation
