// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Li Huang
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/rrt/main.js — the Manipulate: tree type, obstacle type, the add buttons, the two sliders, the goal locator and
// the Graphics (workspace, goal, obstacles, tree, path, label), on shared/manipulate.js (browser only).
import { Manipulate, Locator, Rule, Button, Row, PopupMenu, Slider, darkLocatorGlyph, hookCopy } from '../../shared/manipulate.js';
import {
  Annotation, Rectangle, Disk, Point, Polygon, Line, Text, Tooltip, Superscript, cachedGraphics, AbsolutePointSize,
  AbsoluteThickness, AbsoluteDashing, CapForm, FontSize, FontFamily, Darker, White, Yellow, Green, Blue, Black, Red,
} from '../../shared/graphics.js';
import { initialSettings, evaluate, fromSaved, OBSTACLE_TYPES, PLOT_RANGE, GOAL_RANGE, STYLE } from './model.js';

const LARGE = AbsolutePointSize(STYLE.largePointPx), MEDIUM = AbsolutePointSize(STYLE.mediumPointPx); // D-RT-05
const COLOUR = { Green, Yellow };
// the tree (a thousand nodes and edges) is drawn again only when it changed: by the body, or by a new state (reset,
// loadState, setState)
const edgesPart = cachedGraphics(), nodesPart = cachedGraphics();
let tree = 0, lastVerts = null;
const plainSlider = { ControlType: Slider, ImageSize: 80, Appearance: 'Labeled' };

Manipulate({
  name: 'rrt',
  initial: initialSettings,
  random: true, // A-RT-07: unseeded like the original; ?seed=N for reproducible trees
  body: (s, { rng }) => {
    const r = evaluate(s, rng);
    if (r.treeChanged || s.verts !== lastVerts) tree++;
    lastVerts = r.state.verts;
    return r;
  },
  // the body changed nodestoadd and left it above 0: the front end evaluates again (F-RT-17), on the next frame (D-RT-02)
  settle: (s) => s.nodestoadd > 0,
  draw: (v) => [
    White, Annotation(Rectangle(...v.workspace), 'workspace'), // White, Rectangle[-20{1,1}, 20{1,1}]
    [COLOUR[v.goal.color], Annotation(Disk(v.goal.center, v.goal.r), 'goal-disk')], // {If[reachGoal, Green, Yellow], Disk[…]}
    [Yellow, LARGE, Annotation(Point(v.goalPoint), 'goal-point')],
    [Blue, ...v.walls.map(([a, b]) => Annotation(Rectangle(a, b), 'wall')), ...v.obstacles.map((p) => Annotation(Polygon(p), 'obstacle'))],
    [AbsoluteThickness(STYLE.thinPx), Black, edgesPart([tree], () => v.edges.map((e) => Annotation(Line(e), 'edge')))],
    // {If[Length[verts] > 1, {Dashed, Black, Line[{Last[verts][[1]], newrand}], Blue, PointSize[Large], Point[…]}]}
    v.newest && [AbsoluteDashing(STYLE.dashPx), CapForm('Butt'), Black, v.newest.line && Annotation(Line(v.newest.line), 'newest-line'),
      Blue, LARGE, Annotation(Point(v.newest.point), 'newest-point')],
    // Red, PointSize[Medium], Table[Tooltip[Point[verts[[n, 1]]], verts[[n, 4]]], …] (tooltip as an SVG <title>, D-RT-05)
    [Red, MEDIUM, nodesPart([tree], () => v.nodes.map((n) => Tooltip(Annotation(Point(n.at), 'node'), n.tooltip)))],
    v.newrand && [Green, LARGE, Annotation(Point(v.newrand), 'newrand-point')],
    v.path && [AbsoluteThickness(STYLE.thickPx), Darker(Green), Annotation(Line(v.path), 'path')], // {Thick, Darker[Green], Line[…]}
    // {Black, Text[Style[StringForm["``, ``", …], 18], {0, 22}]} (font as measured, D-RT-05)
    [Black, FontSize(v.label.fontPx), FontFamily('Arial, Helvetica, sans-serif'), Annotation(Text(v.label.text, v.label.at), 'plot-label')],
  ],
  // Graphics[{…}, ImageSize -> 400, PlotRange -> {{-21, 21}, {-21, 23}}] (no padding, measured in the snapshots)
  graphics: {
    PlotRange: PLOT_RANGE, ImageSize: STYLE.imageSize, PlotRangePadding: 0,
    label: 'Workspace with obstacles (blue), the tree (red nodes, black edges), the goal disk and the path (dark green)',
  },
  controls: [ // ControlPlacement -> Left
    [['finalGoal', [18, -18]], ...GOAL_RANGE, Locator],
    'tree type',
    [['treeType', 'RRT', ''], ['Random Tree', 'RRT', Rule('RRT*', Superscript('RRT', '*'))]],
    'obstacle type',
    [['obstacles', 'narrow passage', ''], OBSTACLE_TYPES, { ControlType: PopupMenu }],
    'number of nodes to add:',
    // ButtonBar[{"1" :> (nodestoadd += 1), …, "500" :> (nodestoadd += 500)}]
    Row([1, 10, 100, 200, 500].map((k) => Button(String(k), (s) => { s.nodestoadd += k; }, { name: `add-${k}` })), { name: 'add', class: 'button-bar' }),
    'exploration bias',
    [['explorationBias', 0, ''], 0, 0.9, 0.05, plainSlider],
    'goal radius',
    [['goalRadius', 1, ''], 0, 5, 0.1, plainSlider],
  ],
  // the default glyph as measured (black lines, dark ring; F-RT-06); a press anywhere moves the goal there (D-RT-06)
  locators: { appearance: (n, plot) => darkLocatorGlyph(plot), keyStep: 0.1, describe: () => 'goal locator; arrow keys move it' },
  hook: { // A-RT-03
    labelText: (m) => () => m.view.label.text,
    /** load a state (the port's form, or a saved one with plain numbers: the typeset RRT* is mapped), then evaluate once */
    loadState: (m) => (s) => hookCopy(m.setState(fromSaved(JSON.parse(JSON.stringify(s))), { moved: true })),
    /** one more evaluation of the body (what the front end does after a control change) */
    evaluate: (m) => () => { m.run(); return hookCopy(m.state); },
    /** move the goal locator to world point p (the locator range applies), as one front-end update */
    moveLocator: (m) => (p) => { m.moveLocator('finalGoal', p); return hookCopy(m.state); },
  },
});
