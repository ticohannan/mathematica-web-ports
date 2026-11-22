// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Gerard Balmens
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/hypercube-4d-rotation/main.js — the page: the original's Manipulate (shared/manipulate.js) with its controls on
// the left (ControlPlacement -> Left) and the Graphics3D picture drawn by shared/graphics3d-view.js. The Grid of the
// rotation controls is written as rows: the fixed plane, its Animator and the angle in degrees (written by `after`).
import { Manipulate, Animator, RadioButton, Checkbox, Slider, Button, Delimiter, Row, Rule } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { THREE } from '../../shared/three-helpers.js';
import { Graphics3D, Line } from '../../shared/graphics3d.js';
import { initialState, initialSettings, evaluate, angleText } from './model.js';

const ANGLES = ['a', 'b', 'c', 'd', 'e', 'f'];
const PLANES = ['W‐X', 'W‐Y', 'W‐Z', 'X‐Y', 'X‐Z', 'Y‐Z'];
const RUNNING = { a: false, b: false, c: true, d: true, e: false, f: false };

/** The axis labels under Opacity[0] stay in the plot range (as in Mathematica) but are not drawn: the shared 3D text
 *  labels ignore Opacity, so a hidden label becomes an invisible line to its position (D-HY-03). */
function hideLabels(g) {
  const walk = (c, hidden) => {
    if (!Array.isArray(c)) return c;
    let h = hidden;
    return c.map((e) => {
      if (e && e.directive === 'opacity') h = e.value === 0;
      if (h && e && e.prim === 'text') return Line([e.pos.map((x) => 0.9 * x), e.pos]);
      return Array.isArray(e) ? walk(e, h) : e;
    });
  };
  return Graphics3D(walk(g.content, false), g.options);
}
const body = (s) => {
  const r = evaluate(s);
  return { ...r, graphics: hideLabels(r.graphics) };
};

/** Lighting -> {{"Ambient", White}}: the viewer's default lights replaced by one white ambient light (colours shown as given) */
function ambientWhite(viewer) {
  viewer.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  for (const o of [...viewer.camera.children, ...viewer.scene.children]) if (o.isLight) o.removeFromParent();
  viewer.scene.add(new THREE.AmbientLight(new THREE.Color(1, 1, 1), Math.PI));
}

/** {{x, 0, ""}, 0., 2. π, ImageSize -> Tiny, Animator, AppearanceElements -> {…}, AnimationRunning -> …, DefaultDuration -> dur} */
const rotation = (k, i) => Row([
  [[k, 0, PLANES[i]], 0, 2 * Math.PI, {
    ControlType: Animator, ImageSize: 'Tiny', AppearanceElements: ['ProgressSlider', 'PlayPauseButton', 'DirectionButton', 'ResetButton'],
    AnimationRunning: RUNNING[k], DefaultDuration: (s) => s.dur,
  }],
], { name: `rot-${k}`, class: 'rot-row' });

/** ViewAngle -> 18.5°, widened by the padding Mathematica adds around the plot range (the port's picture was 4.5% larger
 *  than snapshots 1 and 4 with the plain angle; D-HY-02) */
const PADDING = 1.045;
const VIEW_ANGLE = 2 * Math.atan(Math.tan((18.5 * Math.PI) / 360) * PADDING);

Manipulate({
  name: 'hypercube-4d-rotation',
  initial: initialState, // the notebook's live state (c and d a few degrees into their animations), F-HY-01
  initialSettings, // "Initial settings": the Manipulate's own initial values (all angles 0)
  body,
  graphics: {
    id: 'graphic',
    renderer: View3D({ ImageSize: 350, ViewAngle: VIEW_ANGLE, testid: 'scene-canvas', label: 'the projected hypercube (3D, drag to rotate)', onCreate: ambientWhite }),
  },
  controls: [
    [['hyp', 1, 'hypercube'], [Rule(1, 'full'), Rule(2, '1 hole'), Rule(3, '3 holes')], { ControlType: RadioButton }],
    [['graph', 1, 'faces'], [Rule(1, 'color'), Rule(2, 'blue'), Rule(3, 'edges only')], { ControlType: RadioButton }],
    [['op', 0.4, 'opacity'], 0, 1, { ControlType: Slider, ImageSize: 'Small', Appearance: 'Labeled' }],
    [['axe', 0, 'axes'], [0, 1], { ControlType: Checkbox }],
    'stereographic projection',
    [['pw', 1, ''], 0.001, 1, { ControlType: Slider, ImageSize: 'Small', Appearance: 'Labeled' }],
    Delimiter,
    'rotations 4D',
    [['dur', 20, 'duration'], 5, 40, 5, { ControlType: Slider, ImageSize: 'Small', Appearance: 'Labeled' }],
    'fixed plane · control · angle of rotation',
    ...ANGLES.map(rotation),
    Delimiter,
    Button('reset rotations (with animations stopped)', (s) => { for (const k of ANGLES) s[k] = 0; }, { name: 'reset-rotations' }),
  ],
  // the angle column of the Grid: Dynamic[NumberForm[Chop[x/N[Degree]], {4, 0}]] beside each Animator
  after: (ctx) => {
    // Opacity[0] (the axes switched off): nothing drawn — the shared lines at opacity 0 still hide what is behind them
    // in the depth buffer (white streaks across the faces), so they are made invisible; the plot range keeps them (D-HY-03)
    ctx.renderer(0)?.viewer?.scene.traverse((o) => { if (o.material && !Array.isArray(o.material) && o.material.opacity === 0) o.visible = false; });
    for (const k of ANGLES) {
      const row = document.querySelector(`[data-testid="row-rot-${k}"]`);
      if (!row) continue;
      let out = row.querySelector('.rot-angle');
      if (!out) {
        out = document.createElement('span');
        out.className = 'rot-angle';
        out.dataset.testid = `angle-${k}`;
        row.append(out);
      }
      out.textContent = angleText(ctx.state[k]);
    }
  },
  hook: {
    inkFraction: (c) => () => c.renderer().inkFraction(),
    pixelAt: (c) => (p) => c.renderer().pixelAt(p),
    sceneToClient: (c) => (p) => c.renderer().worldToClient(p),
    animator: (c) => (k) => { const a = c.controls.get(k); return { playing: a.isPlaying(), direction: a.direction(), speed: a.speed() }; },
  },
});
