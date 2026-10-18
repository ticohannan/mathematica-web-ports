// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Lillian Lin
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/two-link-kinematics/main.js — page: controls (ControlPlacement -> Left), SVG drawing, locators (browser only).
import { Controls, mmaSliderText } from '../../shared/ui.js';
import { addCheckbox } from '../../shared/ui-extra.js';
import { createPlot, addLocators, svgNode } from '../../shared/svg-plot.js';
import { NAMED, darker, css } from '../../shared/mma-colors.js';
import { makeDialControl, drawArcArrow, drawArrowhead } from '../common/dial-control.js';
import { mEqual } from '../../shared/mma.js';
import { make2VelControl } from './velocity-pad.js';
import {
  initialState, cloneState, evaluate, scene, PLOT_RANGE, IMAGE_SIZE, clampLocator,
} from './model.js';

const COLOURS = {
  ...NAMED, DarkerGray: darker(NAMED.Gray), DarkerGreen: darker(NAMED.Green),
};
// Default arrowhead (Arrowheads[Automatic]) as one fitted length in plot units: about 27–30 px of the 801 px plot
// width of snapshot 1 (D-TK-04, K-TK-05). POINT: the default point size; Large: PointSize[Large].
const HEAD_LEN = 0.21;
const POINT = { abs: 3.5 };
// Thin = AbsoluteThickness[0.25]: the shared 'Thin' (0.5 px) drew the workspace circle much darker than the snapshots
// (cf. car-paths D-CP-03)
const THIN = { abs: 0.25 };
const FONT = { default: 11, Medium: 13 };

// ---- state -----------------------------------------------------------------------------------------
let state, locals, sceneData;
function evaluateInto(next) {
  const r = evaluate(next);
  if (r.indeterminate) return false; // D-TK-07: the original computes with Indeterminate; keep the state
  state = r.state;
  locals = r.locals;
  sceneData = scene(state, locals);
  return true;
}
evaluateInto(initialState()); // the live state: one evaluation of the initial settings (F-TK-16)

// ---- the picture: Graphics[…, PlotRange -> 3{{-1, 1}, {-1, 1}}, ImageSize -> 400] ----------------------------
const graphicEl = document.getElementById('graphic');
const plot = createPlot(graphicEl, {
  plotRange: PLOT_RANGE, imageSize: IMAGE_SIZE,
  label: 'Two-link arm in its workspace (blue), with the manipulability ellipse, the joint angles and velocities, and the end-effector velocity (green)',
});
const sceneLayer = plot.layer('scene');
const headSize = HEAD_LEN / (plot.unitsPerPx * plot.imageSize); // drawArrowhead's fraction of the graphic width
const deg = (a) => (a * 180) / Math.PI;

function drawArrow(g, from, to, { color, opacity, thickness, testid }) {
  const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy);
  const grp = plot.group(g, { 'data-testid': testid, opacity });
  if (len === 0) return grp; // a zero-length arrow has no direction: nothing is drawn (K-TK-05)
  const u = [dx / len, dy / len];
  const shaftEnd = len > HEAD_LEN ? [to[0] - u[0] * HEAD_LEN * 0.6, to[1] - u[1] * HEAD_LEN * 0.6] : from;
  if (shaftEnd !== from) plot.line(grp, [from, shaftEnd], { stroke: color, thickness, cap: 'butt' });
  drawArrowhead(plot, grp, to, u, { size: headSize, color });
  return grp;
}

function drawText(g, { text, at, color, size, rotate, role }) {
  const parent = rotate ? plot.group(g, { transform: `rotate(${deg(rotate.angle)},${rotate.about[0]},${rotate.about[1]})` }) : g;
  const fontPx = FONT[size ?? 'default'];
  // Text[Style["θ₁", Medium]]: the Greek letter in italics as Mathematica sets symbols
  return plot.text(parent, text, at, { fontPx, color: COLOURS[color], italic: /^θ/.test(text), testid: role, family: 'system-ui, "Segoe UI", Helvetica, Arial, sans-serif' });
}

function drawLoc(g, d) {
  const grp = plot.group(g, { 'data-testid': d.role });
  const c = COLOURS[d.color];
  for (const seg of d.hairs) plot.line(grp, seg, { stroke: c, cap: 'butt' });
  plot.disk(grp, d.circle.center, d.circle.r, { stroke: c });
  plot.disk(grp, d.ring.center, d.ring.r, { stroke: c, thickness: d.ring.thickness, strokeOpacity: d.ring.opacity });
}

function draw() {
  plot.clear('scene');
  const g = sceneLayer;
  // r1 = 0 or 2: the white hole's edge lies exactly on the workspace edge; the circle is stroked once (by the hole,
  // drawn last), not twice, which would draw it darker than the snapshot (snapshot 4; D-TK-04)
  const hole = sceneData.find((d) => d.role === 'hole');
  const holeOnEdge = hole && mEqual(hole.r, sceneData.find((d) => d.role === 'workspace').r);
  for (const d of sceneData) {
    const c = COLOURS[d.color ?? d.fill];
    switch (d.kind) {
      case 'disk': {
        const stroke = holeOnEdge && d.role === 'workspace' ? undefined : COLOURS[d.edge.color];
        plot.disk(g, d.center, d.r, { fill: COLOURS[d.fill], stroke, thickness: THIN, testid: d.role });
        break;
      }
      case 'text': drawText(g, d); break;
      case 'ellipse':
        g.appendChild(svgNode('ellipse', {
          cx: d.center[0], cy: d.center[1], rx: d.radii[0], ry: d.radii[1],
          transform: `rotate(${deg(Math.atan2(d.axis[1], d.axis[0]))},${d.center[0]},${d.center[1]})`,
          fill: css(COLOURS[d.fill]), 'fill-opacity': d.opacity, stroke: css(COLOURS[d.edge.color]), 'stroke-opacity': d.opacity,
          'stroke-width': plot.strokeWidth(THIN), 'data-testid': d.role,
        }));
        break;
      case 'arrow': drawArrow(g, d.from, d.to, { color: c, opacity: d.opacity, thickness: d.thickness, testid: d.role }); break;
      case 'stadium': {
        // Rotate[Rectangle[{x0, y0}, {x1, y1}, RoundingRadius -> w], angle, about] (EdgeForm[Black], Gray)
        const [[x0, y0], [x1, y1]] = d.rect;
        g.appendChild(svgNode('rect', {
          x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: d.radius, ry: d.radius,
          transform: `rotate(${deg(d.angle)},${d.about[0]},${d.about[1]})`,
          fill: css(COLOURS[d.fill]), stroke: css(COLOURS[d.edgeColor]), 'stroke-width': plot.strokeWidth(), 'data-testid': d.role,
        }));
        break;
      }
      case 'point': plot.point(g, d.at, POINT, c, d.role); break;
      case 'arc': {
        const grp = plot.group(g, { 'data-testid': d.role, 'data-kind': d.data.kind });
        drawArcArrow(plot, grp, d.data, { color: c, thickness: d.thickness, headSize, pointSize: d.pointSize === 'Large' ? 'Large' : POINT });
        break;
      }
      case 'loc': drawLoc(g, d); break;
      default: throw new Error(`unknown primitive ${d.kind}`);
    }
  }
  locators.redraw();
}

// ---- controls (in the original's order) --------------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
// {{r1, 1, "r₁"}, 0, 2, ImageSize -> 80, Appearance -> "Labeled"}: continuous; the value shown as Mathematica shows it
const r1Ctl = controls.slider({
  name: 'r1', label: 'r₁', min: 0, max: 2, step: 0, value: state.r1,
  format: (v, { moved }) => mmaSliderText(v, { moved, realValues: true }),
  onInput: (v) => update({ r1: v }),
});
const r1Range = r1Ctl.row.querySelector('input[type=range]');
Object.assign(r1Range.style, { flex: '0 0 80px', width: '80px', minWidth: '80px' });
r1Ctl.row.classList.add('ctl-r1');
// {{p1, {1, 0}, "θ₁"}, (makeDialControl[#1, {0, 0}, Red] &), ImageSize -> 140}; p2 the same in Blue
const p1Ctl = makeDialControl(controls, { name: 'p1', label: 'θ₁', color: NAMED.Red, value: state.p1, imageSize: 140, onInput: (pt) => update({ p1: pt }) });
const p2Ctl = makeDialControl(controls, { name: 'p2', label: 'θ₂', color: NAMED.Blue, value: state.p2, imageSize: 140, onInput: (pt) => update({ p2: pt }) });
// {{IsElbowUp, True, "elbow up?"}, {True, False}}
const elbowCtl = addCheckbox(controls, { name: 'IsElbowUp', label: 'elbow up?', value: state.IsElbowUp, onChange: (b) => update({ IsElbowUp: b }) });
// {{jointVel, {1, 0}, "joint\nvelocity"}, (make2VelControl[#1] &)}
const padCtl = make2VelControl(controls, { name: 'jointVel', label: 'joint\nvelocity', value: state.jointVel, onInput: (pt) => update({ jointVel: pt }) });

// ---- the two invisible locators of the picture (LocatorPane picking, D-TK-06) ----------------------------
const DESCR = { pEnd: 'end-effector locator (black)', pVel: 'end-effector velocity locator (green)' };
const locators = addLocators(plot, {
  names: ['pEnd', 'pVel'],
  get: (n) => state[n],
  appearance: () => null, // Appearance -> None: drawn as the loc[…] icons
  pickAnywhere: true,
  keyStep: 0.05,
  describe: (n) => `${DESCR[n]}; arrow keys move it`,
  onMove: (n, p) => update({ [n]: clampLocator(n, p) }),
});

/** One front-end update: the changed variables, one evaluation of the body, every control follows the state. */
function update(partial) {
  const ok = evaluateInto({ ...cloneState(state), ...partial });
  syncControls();
  if (ok) draw();
  else locators.redraw();
}
function syncControls() {
  p1Ctl.set(state.p1);
  p2Ctl.set(state.p2);
  elbowCtl.set(state.IsElbowUp);
  padCtl.set(state.jointVel);
}

document.getElementById('reset').addEventListener('click', () => {
  evaluateInto(initialState()); // A-TK-01: the initial settings, evaluated once
  r1Ctl.set(state.r1, { moved: false });
  syncControls();
  draw();
});

draw();

// ---- test / automation hook (port addition A-TK-03) ---------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
const controlPlots = { p1: p1Ctl.plot, p2: p2Ctl.plot, jointVel: padCtl.plot };
window.__demo = {
  name: 'two-link-kinematics',
  getState: () => cloneState(state),
  locals: () => clone(locals),
  scene: () => clone(sceneData),
  /** move the locator pEnd or pVel to world point p, as one front-end update (the locator range applies) */
  moveLocator: (name, p) => { update({ [name]: clampLocator(name, p) }); return cloneState(state); },
  /** assign variables (e.g. a snapshot's Settings), then evaluate once, as the front end shows a snapshot */
  setState: (partial) => {
    state = { ...cloneState(state), ...clone(partial) };
    if ('r1' in partial) r1Ctl.set(state.r1, { moved: !Number.isInteger(state.r1) || state.r1 !== 1 });
    update({});
    return cloneState(state);
  },
  worldToClient: (p) => plot.worldToClient(p),
  /** a point of a control's own picture (dial p1, p2 or the pad jointVel) in page pixels */
  controlToClient: (name, p) => controlPlots[name].worldToClient(p),
  ready: true,
};
