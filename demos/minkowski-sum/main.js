// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/minkowski-sum/main.js — the Manipulate: view setter, the static-view controls or the animated move slider, the
// ten locators and the Graphics (static view: sum, obstacle, robot, sorted normals; move view: the robot moving around
// the sum), on shared/manipulate.js (browser only).
import { Manipulate, Locator, None, Row, Checkbox } from '../../shared/manipulate.js';
import { evaluate, openingState, RANGE, IMAGE_SIZE, VIEWS, MOVE_VIEW, LOCATOR_BOX, DEFAULT_PTS, robotAt } from './minkowski.js';

let sMax = null; // the move slider's maximum dl (Dynamic); kept while there is no sum (D-MS-05)
let shown = null; // pts as last evaluated: Enabled -> c, a locator moved while c is False is put back
/** AnimationRunning -> True, Appearance -> "Open": open the panel and run the animation when the move slider appears */
function animate(ctx) {
  if (ctx.state.stableOrMove !== MOVE_VIEW) return;
  const q = (id) => ctx.controls.get('s').row.querySelector(`[data-testid=${id}-s]`);
  if (q('anim').hidden) q('plus').click();
  if (q('play').getAttribute('aria-pressed') !== 'true') q('play').click();
}

const m = Manipulate({
  name: 'minkowski-sum',
  initial: openingState, // the opening (live) state, F-MS-17
  body: (s) => {
    const r = evaluate(s.c || !shown ? s : { ...s, pts: shown });
    shown = r.state.pts.map((p) => [...p]);
    return r; // { state, view, graphics: the static or the move view (minkowski.js picture) }
  },
  graphics: { PlotRange: RANGE, ImageSize: IMAGE_SIZE[0], label: 'Obstacle (red), robot (blue), their sorted edge normals and the Minkowski sum (green)' },
  controls: [
    [['stableOrMove', 'static', 'view'], VIEWS, { onChange: (v) => { m.set('stableOrMove', v); animate(m); } }],
    ['step', 0.01, None], ['dl', null, None], ['rl', null, None], ['ol', null, None],
    // Dynamic@If[stableOrMove != "move around Minkowski", Row[{a, c, m, n}], s]: both in the page, one hidden (F-MS-07)
    Row([
      [['a', false, 'show normals'], [true, false], { ControlType: Checkbox }],
      [['c', true, 'enable locators'], [true, false], { ControlType: Checkbox }],
      [['m', 3, 'number of robot edges'], [1, 2, 3, 4, 5]],
      [['n', 5, 'number of obstacle edges'], [1, 2, 3, 4, 5]],
    ], { name: 'static', class: 'label-first' }),
    // Control@{{s, 1, "move"}, 1, dl, 1, AnimationRunning -> True, Appearance -> "Open"} (D-MS-03)
    [['s', 1, 'move'], 1, (s) => (Number.isInteger(s.dl) ? (sMax = s.dl) : sMax), 1, { Appearance: 'Open', labeled: true }],
    // {{pts, {…}}, {-3.249, 1.489}, {3.249, 3.298}, ControlType -> Locator, Appearance -> None, Enabled -> c}. ORIGINAL QUIRK
    // (Q-MS-02): all ten are active, also those not in use. PORT DEVIATION (D-MS-04): LocatorPane picking. PORT DEVIATION
    // (D-MS-01): one evaluation per animation frame while dragging.
    [['pts', DEFAULT_PTS], ...LOCATOR_BOX, Locator, { Appearance: None }],
  ],
  locators: { describe: (n) => { const k = Number(n.slice(4)); return `${k <= 5 ? 'robot' : 'obstacle'} vertex locator ${k}; arrow keys move it`; } },
  after: (ctx) => {
    const move = ctx.state.stableOrMove === MOVE_VIEW;
    document.querySelector('[data-testid=row-static]').hidden = move;
    ctx.controls.get('s').row.hidden = !move;
    if (!move) ctx.controls.get('s').stop();
    ctx.plot.svg.dataset.view = ctx.state.stableOrMove;
  },
  hook: { // port addition A-MS-03
    view: (v, s) => ({
      robot: v.robot, obstacle: v.obstacle, rc: v.rc, oc: v.oc, rl: v.rl, ol: v.ol, pos: v.pos,
      order: v.orderOfNormals.map((r) => r.key), keys: v.orderOfNormalsKeys, minkowskiPoints: v.minkowskiPoints,
      shiftedMink: v.shiftedMink, sumOk: v.sumOk, robotAt: v.sumOk ? robotAt(v, s.s) : null,
    }),
    /** move locator n (1…10 = pts[[n]]) to world point p, as one front-end update (inactive while c is False) */
    moveLocator: (ctx) => (n, p) => { if (ctx.state.c) ctx.moveLocator(`pts-${n}`, p); return window.__demo.getState(); },
    setState: (ctx) => (partial) => { shown = null; ctx.setState(JSON.parse(JSON.stringify(partial))); animate(ctx); },
    /** pause the move animation (tests, screenshots) */
    stopAnimation: (ctx) => () => ctx.controls.get('s').stop(),
  },
});
