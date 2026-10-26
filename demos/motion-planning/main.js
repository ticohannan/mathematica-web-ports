// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/motion-planning/main.js — the Manipulate: view, side counts, progress, six locators and the Graphics
// (workspace or configuration space, visibility lines, C-obstacles), on shared/manipulate.js (browser only).
import { Manipulate, Locator, Delimiter, cacheLast } from '../../shared/manipulate.js';
import {
  Annotation, Rectangle, Polygon, Line, Point, Text, Style, EdgeForm, Directive, Opacity, Thickness, PointSize, CapForm,
  Transparent, Thin, Thick, FontFamily, RGBColor, Darker, Lighter, White, Black, Red, Gray, Green, Blue, Orange, Purple,
  LightGray, LightRed, LightGreen, LightBlue,
} from '../../shared/graphics.js';
import { svgNode } from '../../shared/svg-plot.js';
import { computeScene, lineList, pathLength, regularPolygon, DEFAULTS, LOCATOR_RANGES, PLOT_RANGE } from './planner.js';

const LOCATORS = ['r1', 'r2', 'o1', 'o2', 'o3', 'o4'];
const clampTo = (k, [x, y]) => { const [[x0, y0], [x1, y1]] = LOCATOR_RANGES[k]; return [Math.min(Math.max(x, x0), x1), Math.min(Math.max(y, y0), y1)]; };
// PORT DEVIATION (D-MP-05): Thin and Thick as 0.5 and 2 screen pixels at any picture size (SVG non-scaling strokes;
// Graphics has no such thickness, so the widths are set as attributes; a butt cap, as before v0.1.20, because
// browsers draw the corners of a non-scaling polygon edge differently with svg-plot's round cap). The tests read
// fill="#ff0000".
const onScreen = (w) => ({ 'vector-effect': 'non-scaling-stroke', 'stroke-width': w, 'stroke-linecap': 'butt' });
const THIN = onScreen(0.5), THICK = onScreen(2);
const LightYellow = RGBColor(1, 1, 0.85); // Mathematica's LightYellow
const red = (c) => (c === Red ? { fill: '#ff0000' } : {});

/** PORT ADDITION (A-MP-03): a scene from a link, e.g. ?r1=-2,2.75&r2=0.5,-3&o1=…&o4=…&n=3&x=4&view=config. */
function sceneFromUrl() {
  const q = new URLSearchParams(location.search), st = {};
  for (const k of LOCATORS) {
    const v = q.get(k)?.split(',').map(Number);
    if (v && v.length === 2 && v.every(Number.isFinite)) st[k] = clampTo(k, v);
  }
  for (const k of ['n', 'x']) { const v = Number(q.get(k)); if ([3, 4, 5].includes(v)) st[k] = v; }
  if (q.get('view') === 'config') st.configOrWork = 'configuration space';
  return st;
}
const sceneLink = (st) => {
  const p = (v) => `${+v[0].toFixed(4)},${+v[1].toFixed(4)}`;
  return `${location.origin}${location.pathname}?r1=${p(st.r1)}&r2=${p(st.r2)}&o1=${p(st.o1)}&o2=${p(st.o2)}&o3=${p(st.o3)}&o4=${p(st.o4)}&n=${st.n}&x=${st.x}${st.configOrWork === 'workspace' ? '' : '&view=config'}`;
};

let fromUrl = sceneFromUrl(); // the first evaluation only: "Initial settings" restores the original's defaults
const computed = cacheLast(); // the original's prev… variables: the scene is recomputed only when its inputs change
let scene = null;
let restart = null; // F-MP-07: progress restarts — true/false decided by a robot-sides click or setState; null: a moved locator decides
let prevLocators = null;

// The Manipulate body: computeScene (planner.js) and the progress s, reset to 1 when a locator moves (each move,
// even one held at its range limit, gives a new point) or a robot-sides button is pressed.
// PORT DEVIATION (D-MP-01): s is clamped to the new path length.
function body(st) {
  scene = computed([...LOCATORS.map((k) => st[k]), st.n, st.x], () => computeScene(st));
  const moved = restart ?? (prevLocators !== null && LOCATORS.some((k, i) => st[k] !== prevLocators[i]));
  restart = null;
  prevLocators = LOCATORS.map((k) => st[k]);
  return { state: { ...st, s: moved ? 1 : Math.min(st.s, Math.max(1, scene.discretePath.length)) }, view: scene };
}

// Graphics[{…}] of the original, in its order
function draw(sc, st) {
  const ws = st.configOrWork === 'workspace';
  const inside = sc.robotinsideobstcond.some(Boolean);
  const sIdx = Math.min(Math.max(st.s, 1), Math.max(sc.discretePath.length, 1)) - 1;
  const atS = sc.discretePath[sIdx];
  const bg = ws ? White : inside ? Red : White;
  return [
    CapForm('Butt'),
    bg, Annotation(Rectangle([-4.75, -4.75], [4.75, 4.75]), 'background', red(bg)),
    EdgeForm(Thin),
    ws ? [LightYellow, Annotation(Polygon(sc.borderpoly), 'boundary', THIN)]
      : [LightGray, EdgeForm(Directive(Black, Thickness(0.003))), Annotation(Polygon(sc.configBoundary), 'config-boundary-fill'),
        Opacity(0.5), [Opacity(1), Lighter(Green), Thick, sc.path.length && Annotation(Line(sc.path), 'path', THICK)],
        EdgeForm(Directive(Black, Thickness(0.003), Opacity(0.5))),
        sc.robotobstconfig.map((cob, i) => [sc.obstCollision[0][i] || sc.obstCollision[1][i] ? Red : White, Annotation(Polygon(cob), `cobstacle-fill-${i + 1}`)]),
        [Darker(Green), Opacity(1), PointSize(0.01), st.s !== 1 && atS && Annotation(Point(atS), 'progress-point')]],
    ws && [
      [LightRed, sc.obstaclepoly.map((ob, i) => Annotation(Polygon(ob), `obstacle-${i + 1}`, THIN))],
      [sc.robotinsideobstcond[1] ? Red : LightGreen, Annotation(Polygon(sc.robotEndPoly), 'robot-end', THIN)],
      [Darker(Green), Opacity(0.5), Thick, sc.path.length && Annotation(Line(sc.path), 'path', THICK)],
      sc.robotinsideobstcond[0] ? [Red, Annotation(Polygon(sc.robotStartPoly), 'robot-start', { ...THIN, ...red(Red) })]
        : [LightBlue, Thickness(0.003), Annotation(Polygon(sc.robotStartPoly), 'robot-start', THIN), !inside && sc.path.length && [
          Opacity(1), Darker(Green), Annotation(Line(lineList(sc.discretePath).slice(0, Math.max(0, sIdx))), 'path-traveled'),
          Orange, Opacity(0.5), EdgeForm(Directive(Thin, Opacity(0.5))), Annotation(Polygon(regularPolygon(atS, st.n)), 'robot-moving', THIN),
          // Opacity(1): the point stays opaque as drawn up to v0.1.23 (D-MP-07; the original fades it with the Opacity[0.5] above)
          Opacity(1), Red, PointSize(0.01), Annotation(Point(atS), 'progress-point')]],
    ],
    [Orange, Thickness(0.003), Opacity(0.25), Annotation(Line(sc.linesStarttoObstacles), 'lines-start')],
    [Purple, Thickness(0.003), Opacity(0.25), Annotation(Line(sc.linesEndtoObstacles), 'lines-end')],
    [Blue, Thickness(0.003), Opacity(0.25), Annotation(Line(sc.verticestoVertices), 'lines-bitangent')],
    [Transparent, EdgeForm(Directive(Gray, Opacity(0.7), Thickness(0.003))),
      sc.robotobstconfig.map((cob, i) => Annotation(Polygon(cob), `cobstacle-${i + 1}`)), Annotation(Polygon(sc.configBoundary), 'config-boundary'),
      [Opacity(1), Red, PointSize(0.01), Annotation(Point(sc.robotobstconfig.flat()), 'cobstacle-vertices')]],
    sc.path.length === 0 && Annotation(Text(Style('No path exists.', Darker(Red), { FontSize: 18 }, FontFamily('Times New Roman, serif')),
      [st.r1[0], st.r1[1] + 0.5]), 'no-path'),
  ];
}

// PORT DEVIATION (D-MP-04): the port's locator glyph (ring and hairs one screen pixel wide, styled in index.html),
// kept as SVG: the shared glyphs differ from it
function locatorGlyph(plot) {
  const R = 7 * plot.unitsPerPx;
  const g = svgNode('g');
  g.append(svgNode('circle', { r: R, class: 'ring', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));
  for (const [x1, y1, x2, y2] of [[-R * 1.5, 0, -R * 0.45, 0], [R * 0.45, 0, R * 1.5, 0], [0, -R * 1.5, 0, -R * 0.45], [0, R * 0.45, 0, R * 1.5]]) {
    g.append(svgNode('line', { x1, y1, x2, y2, class: 'hair', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));
  }
  g.append(svgNode('circle', { r: R * 2, fill: 'transparent' })); // the area the focus outline surrounds
  return g;
}

// PORT ADDITION (A-MP-02): numeric readout and scene link, outside the Manipulate
const readout = document.getElementById('readout');
const showReadout = document.getElementById('show-readout');
const f = (v) => v.toFixed(4);
function updateReadout(st, sc) {
  if (readout.hidden) return;
  readout.textContent = [
    `start ${st.r1.map(f)}  end ${st.r2.map(f)}  robot sides ${st.n}  boundary sides ${st.x}`,
    `start valid: ${!sc.robotinsideobstcond[0]}  end valid: ${!sc.robotinsideobstcond[1]}`,
    `path vertices: ${sc.path.map((p) => `(${p.map(f).join(', ')})`).join(' → ') || '(none)'}`,
    `path length: ${sc.path.length ? f(pathLength(sc.path)) : '–'}   discretised points: ${sc.discretePath.length}   progress s = ${st.s}`,
    sc.graph ? `graph: ${sc.graph.allPoints.length} nodes, ${sc.graph.allLines.length} edges` : 'graph: not needed (direct line or invalid start/end)',
    sc.diagnostics.length ? `diagnostics: ${sc.diagnostics.join('; ')}` : '',
    `link to this scene: ${sceneLink(st)}`,
  ].filter(Boolean).join('\n');
  readout.style.whiteSpace = 'pre-wrap';
}
const compact = (sc) => structuredClone({ ...sc, graph: sc.graph && { nodes: sc.graph.allPoints.length, edges: sc.graph.allLines.length } });
const DESCR = { r1: 'robot start', r2: 'robot end', o1: 'obstacle 1', o2: 'obstacle 2', o3: 'obstacle 3', o4: 'obstacle 4' };

const M = Manipulate({
  name: 'motion-planning',
  initial: () => { const st = structuredClone({ ...DEFAULTS, ...fromUrl }); fromUrl = {}; return st; },
  body,
  draw,
  graphics: { PlotRange: [[-PLOT_RANGE, PLOT_RANGE], [-PLOT_RANGE, PLOT_RANGE]], ImageSize: 425, PlotRangePadding: 0, label: 'Workspace with robot, obstacles and planned path',
    svgClass: 'scene', maxWidth: null }, // the page's own picture style: no svg-plot locator CSS, no width cap
  controls: [
    [['configOrWork', 'workspace', ''], ['workspace', 'configuration space']],
    Delimiter,
    'number of sides',
    [['x', 4, 'boundary'], [3, 4, 5]],
    [['n', 3, 'robot'], [3, 4, 5], { onChange: (v) => { restart = true; M.set('n', v); } }], // F-MP-07: any click restarts
    Delimiter,
    // {{s, 1, ""}, 1, Length@discretePath, 1}: disabled while start or goal is invalid (D-MP-03); the slider's own
    // value grid (steps: null; its max attribute is the path length); the track is at most 120 px wide (D-MP-05, index.html)
    [['s', 1, 'progress'], 1, () => Math.max(1, scene?.discretePath.length ?? 0), 1,
      { Enabled: () => !scene || scene.discretePath.length > 0, animSeconds: 8, steps: null }],
    ...LOCATORS.map((k) => [[k, DEFAULTS[k]], ...LOCATOR_RANGES[k], Locator]),
  ],
  // a press away from every locator moves none (D-MP-04); arrow keys 0.05, Shift 0.25 (A-MP-04)
  // pointer: false — presses are handled on the glyphs below; arrow keys move the glyph at once, the scene follows on the
  // next frame with progress restarted (as before)
  locators: {
    pickAnywhere: false, pointer: false, throttle: 'frame', onPlace: (n, m) => { m.state.s = 1; }, keyStep: 0.05,
    appearance: (n, plot) => locatorGlyph(plot), describe: (n) => `${DESCR[n]} locator; arrow keys move it`,
  },
  after: (m) => updateReadout(m.state, m.view),
  hook: { // port addition A-MP-05
    copy: structuredClone,
    view: compact,
    scene: (m) => () => compact(m.view),
    setState: (m) => (partial) => { // locators clamped; progress restarts when the scene moves and s is not given
      const p = structuredClone(partial);
      for (const k of LOCATORS) if (k in p) p[k] = clampTo(k, p[k]);
      restart = (LOCATORS.some((k) => k in p) || 'n' in p) && !('s' in p);
      m.setState(p);
    },
    /** client (page) pixel coordinates of a locator centre, for real mouse-drag tests */
    locatorClientPoint: (m) => (name) => {
      const r = m.plot.svg.querySelector(`[data-testid="locator-${name}"] circle`).getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    worldToClient: (m) => ([x, y]) => { const p = svgPoint(m, x, y).matrixTransform(m.plot.world.getScreenCTM()); return { x: p.x, y: p.y }; },
    sceneLink: (m) => () => sceneLink(m.state),
  },
});

// The port's locator dragging (D-MP-04), kept instead of the layer's LocatorPane picking: a press on a locator's glyph
// grabs it without focusing it, its centre follows the pointer (screen → world through the SVG's own matrix), the
// scene is evaluated once per animation frame; a press elsewhere moves none.
function svgPoint(m, x, y) { const pt = m.plot.svg.createSVGPoint(); pt.x = x; pt.y = y; return pt; }
for (const k of LOCATORS) {
  const g = M.plot.svg.querySelector(`[data-testid="locator-${k}"]`);
  let dragging = false, frame = 0;
  g.addEventListener('pointerdown', (e) => { dragging = true; g.setPointerCapture(e.pointerId); g.classList.add('dragging'); e.preventDefault(); });
  g.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = svgPoint(M, e.clientX, e.clientY).matrixTransform(M.plot.world.getScreenCTM().inverse());
    M.state[k] = clampTo(k, [p.x, p.y]);
    M.state.s = 1; // F-MP-07; the glyph follows at once, the scene on the next frame
    g.setAttribute('transform', `translate(${M.state[k][0]},${M.state[k][1]})`);
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; M.moveLocator(k, M.state[k]); });
  });
  const end = () => { dragging = false; g.classList.remove('dragging'); };
  g.addEventListener('pointerup', end);
  g.addEventListener('pointercancel', end);
}
showReadout.addEventListener('change', () => { readout.hidden = !showReadout.checked; updateReadout(M.state, M.view); });
