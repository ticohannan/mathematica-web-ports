// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/minkowski-sum/main.js — the Manipulate: view setter, the static-view controls or the animated move slider, the
// ten locators and the Graphics (static view: sum, obstacle, robot, sorted normals; move view: the robot moving around
// the sum), on shared/manipulate.js (browser only).
import { Manipulate, Locator, None, Row, Checkbox } from '../../shared/manipulate.js';
import {
  Annotation, Polygon, Line, Point, Disk, Text, EdgeForm, Opacity, AbsoluteThickness, AbsolutePointSize, Black, White, Red,
  Blue, LightRed, LightBlue, LightGreen,
} from '../../shared/graphics.js';
import { pxSize, notchedArrowhead, tspanText } from '../common/plot-extras.js';
import { evaluate, openingState, robotAt, FRAME_HALF, FRAME_SQUARE, IMAGE_SIZE, VIEWS, MOVE_VIEW, OFFSET, LOCATOR_BOX, DEFAULT_PTS } from './minkowski.js';

// Graphics[{…}, ImageSize -> .9{620, 450}]: no PlotRange, so Mathematica takes the square 7 CirclePoints[4] (§6.5) with
// the default padding; the 558 × 405 image shows that square centred, white left and right. The port widens the x range
// so that the SVG has the original's 558 × 405 shape with the square in the middle.
const [IW, IH] = IMAGE_SIZE;
const RANGE = [[-(FRAME_HALF * IW) / IH, (FRAME_HALF * IW) / IH], [-FRAME_HALF, FRAME_HALF]];
const PX = pxSize(RANGE, IW); // world units per pixel
// PORT DEVIATION (D-MS-02): Mathematica's sizes approximated. PointSize[0.01] of the 405-pixel plot width; default line
// width 1 px; Thin 0.5 px; default arrowheads about 12 px long (0.0215 of the image width, as four-bar-linkage); text 12 px.
const POINT = AbsolutePointSize(0.01 * IH), THIN = AbsoluteThickness(0.5), HEAD = [12, 4.6];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], neg = (a) => [-a[0], -a[1]];

/** Arrow[{a, b}] with the notched head: the shaft to the notch, then the head (shorter arrows get smaller heads) */
function arrow([a, b], id) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  if (L === 0) return Annotation([], id, { class: 'arrow' });
  const len = Math.min(HEAD[0] * PX, L);
  const { head, notch } = notchedArrowhead(b, [dx / L, dy / L], len, HEAD[1] * PX * (len / (HEAD[0] * PX)));
  return Annotation([Line([a, notch]), head], id, { class: 'arrow' });
}
const arrows = (list, id) => [Black, ...list.map((a) => arrow(a, `arrow-${id}`))];
const points = (pts, id) => Annotation(pts.map(Point), id);
/** Text[Subscript[α, i], pos]: italic letter, subscript 0.35em down at 75 % (snapshot 1), as before */
const labels = (col, list, id) => list.map((l) => tspanText([{ text: l.key.slice(0, 1), 'font-style': 'italic' },
  { text: l.key.slice(1), dy: '0.35em', 'font-size': '75%' }], l.at, { color: col, id: `label-${id}`, attrs: { 'data-key': l.key } }));
const text = (str, pos, id) => [Black, Annotation(Text(str, pos), `text-${id}`)];
const lines = (col, segs, id) => [col, Annotation(segs.map((s) => Line(s)), id)];
const frame = [EdgeForm(THIN), White, Annotation(Polygon(FRAME_SQUARE.map((p) => [...p])), 'frame')]; // {EdgeForm[Thin], White, Polygon@(7CirclePoints[4])}

/** If[stableOrMove != "move around Minkowski", …]: the static view (the sum drawn only when it exists, D-MS-05) */
const staticView = (v, { a, m, n, pts }) => [
  v.sumOk && [[Opacity(0.5), LightGreen, Annotation(Polygon(v.shiftedMink), 'mink-polygon')],
    lines(Blue, v.minkRobotlinelist, 'mink-robot-lines'), lines(Red, v.minkObstlinelist, 'mink-obstacle-lines'), [Black, points(v.shiftedMink, 'mink-points')]],
  text('Minkowski sum', [2.3, -4.75], 'mink-text'),
  v.sumOk && [a && arrows(v.minkowskiSidesNormalArrows, 'mink-arrows'),
    labels(Blue, v.minkowskiRobotSidesLabels, 'mink-label'), labels(Red, v.minkowskiObstacleSidesLabels, 'mink-label')],
  [[EdgeForm(Red), LightRed, Annotation(Polygon(v.obstacle), 'obstacle-polygon')], [Red, points(pts.slice(5, n + 5), 'obstacle-locator-points')],
    [Black, points(v.obstacle, 'obstacle-points'), points([v.oc], 'obstacle-centroid')], a && arrows(v.obstacleArrows, 'obstacle-arrows'),
    labels(Red, v.obstaclelabel, 'obstacle-label'), text('obstacle', [-2.3, 0.8], 'obstacle-text')],
  [[EdgeForm(Blue), LightBlue, Annotation(Polygon(v.robot), 'robot-polygon')], [Blue, points(pts.slice(0, m), 'robot-locator-points')],
    [Black, points(v.robot, 'robot-points'), points([v.rc], 'robot-centroid')], a && arrows(v.robotArrows, 'robot-arrows'),
    labels(Blue, v.robotlabel, 'robot-label'), text('robot', [2.3, 0.8], 'robot-text')],
  [arrows(v.sortedArrows, 'sorted-arrows'), [EdgeForm(THIN), White, Annotation(Disk([-2.3, -1.5], 0.5), 'sorted-disk')],
    labels(Blue, v.sortedNormalRobot, 'sorted-label'), labels(Red, v.sortedNormalObstacle, 'sorted-label'), text('sorted normals', [-2.3, -3.2], 'sorted-text')],
];

/** the move view: the sum and the obstacle around the origin, the robot at discretPolygon[[s]] */
const moveView = (v, { s }) => {
  const moc = neg(v.oc), sum = v.minkowskiPoints.map((p) => add(moc, p)), obst = v.obstacle.map((p) => add(moc, p));
  const back = (l) => [add(neg(OFFSET), l[0]), add(neg(OFFSET), l[1])];
  const r = v.sumOk ? robotAt(v, s) : null;
  return [
    v.sumOk && [[Opacity(0.5), LightGreen, Annotation(Polygon(sum), 'mink-polygon')], [Black, points(sum, 'mink-points')],
      lines(Blue, v.minkRobotlinelist.map(back), 'mink-robot-lines'), lines(Red, v.minkObstlinelist.map(back), 'mink-obstacle-lines')],
    text('Minkowski sum', [0, 1.1], 'mink-text'),
    [EdgeForm(Red), LightRed, Annotation(Polygon(obst), 'obstacle-polygon')], [Black, points(obst, 'obstacle-points')], text('obstacle', [0, 0], 'obstacle-text'),
    // K-MS-10: {EdgeForm[Blue], Opacity[0.5], LightBlue, Polygon} — the port draws the edge opaque
    r && [[EdgeForm(Blue), Opacity(0.5), LightBlue, Annotation(Polygon(r.vertices), 'robot-polygon')], [Black, points(r.vertices, 'robot-points')],
      [Red, points([r.centroid], 'robot-centroid')], text('robot', add(r.centroid, [0.2, 0.2]), 'robot-text')],
  ];
};

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
    return r;
  },
  draw: (v, s) => [POINT, frame, s.stableOrMove !== MOVE_VIEW ? staticView(v, s) : moveView(v, s)],
  graphics: { PlotRange: RANGE, ImageSize: IW, label: 'Obstacle (red), robot (blue), their sorted edge normals and the Minkowski sum (green)' },
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
