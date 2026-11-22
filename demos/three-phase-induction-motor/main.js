// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Harley H. Hartman
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/three-phase-induction-motor/main.js — the page: the original's Manipulate (shared/manipulate.js) with its
// controls on top (Mathematica's default placement) and its Grid of two pictures side by side: the motor (#graphic,
// Graphics3D drawn by shared/graphics3d-view.js) and the plot of the three-phase supply (#graphic2, SVG).
import { Manipulate, Animator } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { Graphics3D, Line, Opacity, RGBColor, flatten } from '../../shared/graphics3d.js';
import { initialState, initialSettings, evaluate } from './model.js';

/** Mathematica draws the rims of a cylinder whose Opacity is negative (its faces are invisible: snapshots 1-4), while
 *  the shared renderer fades the rims with the faces; the port draws those rims as thin black circles (D-TB-05). */
function bandRims(g) {
  const rims = [];
  for (const c of flatten(g)) {
    if (c.type !== 'cylinder' || !(c.opacity <= 0)) continue;
    for (const [x, y, z] of [c.p1, c.p2]) {
      rims.push(Line(Array.from({ length: 49 }, (_, k) => [x + c.radius * Math.cos((k * Math.PI) / 24), y + c.radius * Math.sin((k * Math.PI) / 24), z])));
    }
  }
  return rims;
}
const body = (s) => {
  const r = evaluate(s);
  const [motor, plot] = r.graphics;
  const rims = bandRims(motor);
  return { ...r, graphics: [rims.length ? Graphics3D([...motor.content, [Opacity(0.6), RGBColor(0, 0, 0), ...rims]], motor.options) : motor, plot] };
};

/** The motor's size in the image as in the snapshots (the stator about 235 px wide of 275; D-TB-02). */
const ZOOM = 1.36;

Manipulate({
  name: 'three-phase-induction-motor',
  initial: initialState, // the notebook's live state (a = 5.63), F-TB-09
  initialSettings, // "Initial settings": the Manipulate's own initial values (a = 0)
  body,
  ControlPlacement: 'Top',
  graphics: [
    { id: 'graphic', renderer: View3D({ ImageSize: 275, SphericalRegion: false, zoom: ZOOM, testid: 'scene-canvas', label: 'rotor and stator of the induction motor (3D, drag to rotate)' }) },
    { id: 'graphic2', testid: 'plot-svg', label: 'the three phase currents and the relative flux over one period' },
  ],
  controls: [
    // {{a, 0, "animate"}, 0, 2π, .01, ControlType -> Animator, AppearanceElements -> {"PlayPauseButton",
    //   "FasterSlowerButtons"}, AnimationRate -> 30, AnimationRunning -> False}
    [['a', 0, 'animate'], 0, 2 * Math.PI, 0.01, {
      ControlType: Animator, AppearanceElements: ['PlayPauseButton', 'FasterSlowerButtons'], AnimationRate: 30, AnimationRunning: false,
    }],
    // a second control of the same variable a: the layer keeps the two in step
    [['a', 0, 'phase position'], 0, 2 * Math.PI, { Appearance: 'Labeled' }],
    [['m', 1, 'magnitude (±40%)'], 0.6, 1.4, { Appearance: 'Labeled' }],
    [['p', 0, 'phase shift (±80°)'], -80, 80, { Appearance: 'Labeled' }],
    [['f', 50, 'skew (% bar pitch)'], 0, 100, { Appearance: 'Labeled' }],
  ],
  // the two controls of a in step: when the phase position slider moves a, the Animator runs on from the new value, as
  // in Mathematica (the layer updates only the later control of a variable after the first changed it; N-TB-04)
  after: (ctx) => {
    const animator = ctx.controls.get('a');
    if (animator && animator.get() !== ctx.state.a) animator.set(ctx.state.a);
  },
  hook: {
    inkFraction: (c) => () => c.renderer(0).inkFraction(),
    pixelAt: (c) => (p) => c.renderer(0).pixelAt(p),
    sceneToClient: (c) => (p) => c.renderer(0).worldToClient(p),
  },
});
