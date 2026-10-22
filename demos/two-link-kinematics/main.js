// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Lillian Lin
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/two-link-kinematics/main.js — the Manipulate: r1 slider, the two dials, elbow up?, the joint-velocity pad, the
// two invisible locators and the Graphics (workspace, manipulability ellipse, arm, velocity arcs, locator icons), on
// shared/manipulate.js (browser only).
import { Manipulate, Locator, None, Control, Checkbox } from '../../shared/manipulate.js';
import {
  Annotation, Rotate, Rectangle, Disk, Point, Line, Text, Style, RGBColor, Directive, EdgeForm, FaceForm, Opacity, Thickness,
  AbsoluteThickness, AbsolutePointSize, PointSize, CapForm, FontSize, FontFamily, Italic,
} from '../../shared/graphics.js';
import { mmaSliderText } from '../../shared/ui.js';
import { NAMED, darker } from '../../shared/mma-colors.js';
import { mEqual } from '../../shared/mma.js';
import { makeDialControl } from '../common/dial-control.js';
import { arcArrowGraphics, arrowheadPolygon } from '../common/arrow-graphics.js';
import { make2VelControl } from './velocity-pad.js';
import { initialState, cloneState, evaluate, scene, PLOT_RANGE, IMAGE_SIZE, LOCATOR_RANGE } from './model.js';

const COLOURS = { ...NAMED, DarkerGray: darker(NAMED.Gray), DarkerGreen: darker(NAMED.Green) };
const col = (name) => RGBColor(...COLOURS[name]);
// Default arrowhead (Arrowheads[Automatic]) as one fitted length in plot units: about 27–30 px of the 801 px plot
// width of snapshot 1 (D-TK-04, K-TK-05). POINT: the default point size.
const HEAD_LEN = 0.21;
const POINT = AbsolutePointSize(3.5);
// Thin = AbsoluteThickness[0.25]: the shared 'Thin' (0.5 px) drew the workspace circle much darker than the snapshots
// (cf. car-paths D-CP-03); Thick = AbsoluteThickness[2]
const THIN = AbsoluteThickness(0.25), THICK = AbsoluteThickness(2);
const FONT = { default: 11, Medium: 13 };
const FAMILY = 'system-ui, "Segoe UI", Helvetica, Arial, sans-serif';
const deg = (a) => (a * 180) / Math.PI;
const thick = (t) => (t === 'Thick' ? THICK : null);

/** Arrow[{from, to}]: the shaft to 0.6 of the head, the head (nothing for a zero-length arrow, K-TK-05). */
function arrow(d) {
  const [dx, dy] = [d.to[0] - d.from[0], d.to[1] - d.from[1]], len = Math.hypot(dx, dy), u = [dx / len, dy / len];
  return Annotation(len === 0 ? [] : [col(d.color), thick(d.thickness), CapForm('Butt'), EdgeForm(),
    len > HEAD_LEN && Line([d.from, [d.to[0] - u[0] * HEAD_LEN * 0.6, d.to[1] - u[1] * HEAD_LEN * 0.6]]),
    arrowheadPolygon(d.to, u, HEAD_LEN)], d.role, d.opacity != null ? { opacity: d.opacity } : {}); // Opacity of the whole arrow
}
/** Text[Style["θ₁", Medium], …]: the Greek letter in italics as Mathematica sets symbols. */
function text(d) {
  const t = [col(d.color), Annotation(Text(Style(d.text, ...(/^θ/.test(d.text) ? [Italic] : []), FontSize(FONT[d.size ?? 'default']), FontFamily(FAMILY)), d.at), d.role)];
  return d.rotate ? Rotate(t, d.rotate.angle, d.rotate.about) : t;
}
/** loc[col, c]: four hair lines, Circle[c, 2 sc] and the half-transparent Circle[c, 1.4 sc] with Thickness[1/100]. */
const locIcon = (d) => Annotation([col(d.color), CapForm('Butt'), d.hairs.map((s) => Line(s)), FaceForm(None),
  [EdgeForm(col(d.color)), Disk(d.circle.center, d.circle.r)],
  [EdgeForm(Directive(col(d.color), Thickness(d.ring.thickness), Opacity(d.ring.opacity))), Disk(d.ring.center, d.ring.r)]], d.role);

/** The model's scene (model.js scene: the Graphics list in the original's order) as Graphics data. */
function draw({ scene: sc }) {
  // r1 = 0 or 2: the white hole's edge lies exactly on the workspace edge; the circle is stroked once (by the hole,
  // drawn last), not twice, which would draw it darker than the snapshot (snapshot 4; D-TK-04)
  const hole = sc.find((d) => d.role === 'hole');
  const holeOnEdge = hole && mEqual(hole.r, sc.find((d) => d.role === 'workspace').r);
  return sc.map((d) => {
    switch (d.kind) {
      case 'disk': {
        const edge = holeOnEdge && d.role === 'workspace' ? EdgeForm() : EdgeForm(Directive(col(d.edge.color), THIN));
        return [col(d.fill), edge, Annotation(Disk(d.center, d.r), d.role)];
      }
      case 'text': return text(d);
      case 'ellipse': // Ellipsoid[{0, 0}, Σ^2] under GeometricTransformation[…, {U, pEnd}], Opacity[0.5]
        return [col(d.fill), Opacity(d.opacity), EdgeForm(Directive(col(d.edge.color), THIN, Opacity(d.opacity))),
          Annotation(Rotate(Disk(d.center, d.radii), Math.atan2(d.axis[1], d.axis[0]), d.center), d.role)];
      case 'arrow': return arrow(d);
      case 'stadium': // Rotate[Rectangle[{x0, y0}, {x1, y1}, RoundingRadius -> w], angle, about] (EdgeForm[Black], Gray)
        return [col(d.fill), EdgeForm(col(d.edgeColor)), Annotation(Rotate(Rectangle(...d.rect, { RoundingRadius: d.radius }), d.angle, d.about), d.role)];
      case 'point': return [col(d.color), POINT, Annotation(Point(d.at), d.role)];
      case 'arc': return [col(d.color), Annotation(arcArrowGraphics(d.data, {
        thickness: thick(d.thickness), headLength: HEAD_LEN, pointSize: d.pointSize === 'Large' ? PointSize('Large') : POINT,
      }), d.role, { 'data-kind': d.data.kind })];
      case 'loc': return locIcon(d);
      default: throw new Error(`unknown primitive ${d.kind}`);
    }
  });
}

// One evaluation of the body. D-TK-07: where the original computes with Indeterminate (pEnd at the origin), the
// previous state and picture stay; a state assigned through the hook's setState is kept as assigned.
let last = null, keepAssigned = false;
function body(s) {
  const r = evaluate(s);
  if (!r.indeterminate) last = { state: cloneState(r.state), view: { locals: r.locals, scene: scene(r.state, r.locals) } };
  else if (keepAssigned) last = { ...last, state: cloneState(s) };
  return { state: cloneState(last.state), view: last.view };
}
const DESCR = { pEnd: 'end-effector locator (black)', pVel: 'end-effector velocity locator (green)' };
const lo = (n) => LOCATOR_RANGE[n].map((r) => r[0]), hi = (n) => LOCATOR_RANGE[n].map((r) => r[1]);
const dial = (color) => Control(makeDialControl, { color, imageSize: 140 });

Manipulate({
  name: 'two-link-kinematics',
  initial: initialState, // the live state: one evaluation of the initial settings (F-TK-16)
  body,
  draw,
  graphics: { // Graphics[…, PlotRange -> 3{{-1, 1}, {-1, 1}}, ImageSize -> 400]
    PlotRange: PLOT_RANGE, ImageSize: IMAGE_SIZE,
    label: 'Two-link arm in its workspace (blue), with the manipulability ellipse, the joint angles and velocities, and the end-effector velocity (green)',
  },
  controls: [
    // {{r1, 1, "r₁"}, 0, 2, ImageSize -> 80, Appearance -> "Labeled"}: continuous; the value shown as Mathematica shows it
    [['r1', 1, 'r₁'], 0, 2, { Appearance: 'Labeled', ImageSize: 80, steps: undefined, format: (v, { moved }) => mmaSliderText(v, { moved, realValues: true }) }],
    [['pEnd', [2, 0]], lo('pEnd'), hi('pEnd'), Locator, { Appearance: None }], // drawn as the loc[…] icons
    [['pEndp', [2, 0]], None],
    [['pVel', [2, 1]], lo('pVel'), hi('pVel'), Locator, { Appearance: None }],
    [['pVelp', [1, 1]], None],
    [['p1', [1, 0], 'θ₁'], dial(NAMED.Red)], // (makeDialControl[#1, {0, 0}, Red] &), ImageSize -> 140
    [['p2', [1, 0], 'θ₂'], dial(NAMED.Blue)],
    [['IsElbowUp', true, 'elbow up?'], [true, false], { ControlType: Checkbox }],
    [['IsElbowUpp', true], None],
    [['jointVel', [1, 0], 'joint\nvelocity'], Control(make2VelControl)], // (make2VelControl[#1] &)
  ],
  // the two invisible locators of the picture (LocatorPane picking, D-TK-06)
  locators: { keyStep: 0.05, describe: (n) => `${DESCR[n]}; arrow keys move it` },
  hook: { // port addition A-TK-03
    getState: (c) => () => cloneState(c.state),
    locals: (c) => () => JSON.parse(JSON.stringify(c.view.locals)),
    scene: (c) => () => JSON.parse(JSON.stringify(c.view.scene)),
    /** move the locator pEnd or pVel to world point p, as one front-end update (the locator range applies) */
    moveLocator: (c) => (name, p) => { c.moveLocator(name, p); return cloneState(c.state); },
    /** assign variables (e.g. a snapshot's Settings), then evaluate once, as the front end shows a snapshot */
    setState: (c) => (partial) => {
      const s = JSON.parse(JSON.stringify(partial));
      if ('r1' in s) c.controls.get('r1').set(s.r1, { moved: s.r1 !== 1 });
      keepAssigned = true;
      try { c.setState(s); } finally { keepAssigned = false; }
      return cloneState(c.state);
    },
    /** a point of a control's own picture (dial p1, p2 or the pad jointVel) in page pixels */
    controlToClient: (c) => (name, p) => c.controls.get(name).plot.worldToClient(p),
  },
});
