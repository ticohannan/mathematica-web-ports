// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/manipulability-ellipsoid/main.js — page: the three dials θ1, θ2, θ3 at the left (ControlPlacement -> Left), the
// μ label and the model's Graphics3D (fixed PlotRange with clipping, ViewAngle 18°, ImageSize {440, 420}) drawn by
// shared/graphics3d-view.js, the test hook (browser only).
// On the shared Manipulate layer since v0.1.21 (behaviour unchanged: tests and 3D parity of scene graph and pixels).
import { Manipulate, Control } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { Graphics3D, PointSize } from '../../shared/graphics3d.js';
import { NAMED } from '../../shared/mma-colors.js';
import { makeDialControl, nearest32Index } from '../common/dial-control.js';
import { initialState, cloneState, settle, ellipsoidSummary, pointXY, wrapK, pointOfAngle, POINT_SIZE } from './model.js';

// ---- the μ label (D-ME-09) ----------------------------------------------------------------------------------------
const muEl = document.querySelector('[data-testid=mu-label]');
function drawMu(view) {
  const [mant, exp] = view.text.split('×10^');
  muEl.textContent = '';
  muEl.append(mant.replace('-', '−'));
  if (exp !== undefined) {
    muEl.append('×10');
    const sup = document.createElement('sup');
    sup.textContent = exp.replace('-', '−');
    muEl.append(sup);
  }
  muEl.dataset.text = view.text;
}

// ---- the three dials --------------------------------------------------------------------------------------------------
// Control@{{p1, {1,0}, "θ1"}, (makeDialControl[#1, {0,0}, Red] &)}, p2 Blue, p3 Green; the stored makeDialControl has no
// ImageSize (automatic size, F-ME-01) and the Nearest-π/32 setter (F-ME-02); the dial shows the point of m[i]
const DIAL_OPTIONS = { imageSize: 'automatic', setter: 'nearest32', arc: 'myArrowArc2', keyStep: 'grid', labels: 'stacked' };
const DIAL_COLORS = [NAMED.Red, NAMED.Blue, NAMED.Green];
const SUB = ['₁', '₂', '₃'];
const dials = [];
const dial = (i) => [[`m.${i}`, 0, `θ${SUB[i]}`], Control((controls, { label, value, onInput }) => {
  const d = makeDialControl(controls, { ...DIAL_OPTIONS, name: `p${i + 1}`, label, color: DIAL_COLORS[i], value: pointXY(value), onInput });
  const set = d.set;
  d.set = (m) => set(pointXY(m));
  dials[i] = d;
  return d;
}), { Assign: (s, pt) => { s.m[i] = wrapK(nearest32Index(pt)); } }];

let evaluations = 0;
const clone = (x) => JSON.parse(JSON.stringify(x));

Manipulate({
  name: 'manipulability-ellipsoid',
  initial: initialState,
  /**
   * A change, then evaluations of the body until it no longer changes a variable (D-ME-10): the body assigns θi itself
   * (Theta1 = ArcTan[…]), which makes the front end evaluate it again; that second evaluation brings θiprev up to date
   * (Q-ME-06). With a single evaluation the next dial move would be undone by the stale θiprev.
   */
  body: (st) => {
    const view = settle(st);
    evaluations += view.evaluations;
    // PointSize[s] of a point without one: the port's default (D-ME-03)
    return { state: view.state, view, graphics: Graphics3D([PointSize(POINT_SIZE.Default), view.graphics.content], view.graphics.options) };
  },
  graphics: {
    id: 'view',
    // the graphic's PlotRange (clipping, F-ME-11), ViewAngle and ImageSize: a fixed camera, a user rotation is kept
    // (D-ME-08); Thick 3 px; Arrowheads[s] × the PlotRange box diagonal, PointSize[s] × the width the image shows at
    // the centre (D-ME-03); Mathematica's documented lights (D-ME-02); without WebGL 2 only the picture is missing
    renderer: View3D({
      thickPx: 3, clipOrder: 'max-first', pointLength: 'ImageWidth', webgl2Fallback: true,
      testid: 'scene-canvas-workspace', label: 'Elbow arm with its manipulability ellipsoid (3D, drag to rotate)',
    }),
  },
  controls: [dial(0), dial(1), dial(2)],
  after: (ctx) => drawMu(ctx.view),
  /**
   * setState({k, kprev, m}) — assigns the given variables, then one evaluation (as the harness's "set"). Only k given:
   * a consistent state (kprev = k, p = {Cos θ, Sin θ}); only m given: as a dial move.
   */
  merge: (state, partial) => {
    const next = cloneState(state);
    if (partial.k) next.k = clone(partial.k);
    if (partial.kprev) next.kprev = clone(partial.kprev);
    if (partial.m) next.m = clone(partial.m);
    if (partial.k && !partial.kprev) next.kprev = clone(partial.k);
    if (partial.k && !partial.m) next.m = next.k.map(pointOfAngle);
    return next;
  },
  hook: { // port addition A-ME-03
    view: () => null,
    webgl: (c) => c.renderer().webgl,
    mu: (c) => () => ({ value: c.view.mu, text: c.view.text, shown: muEl.textContent }),
    svd: (c) => () => clone({ U: c.view.U, S: c.view.S, V: c.view.V, rank: c.view.rank, J: c.view.J }),
    points: (c) => () => clone(c.view.points),
    ellipsoid: (c) => () => ellipsoidSummary(c.view),
    primitives: (c) => () => clone(c.view.prims),
    clipping: (c) => () => c.renderer().clip.map((p) => ({ normal: p.normal.toArray(), constant: p.constant })),
    /** materials of the picture with the six PlotRange planes (the point markers have none: they never leave the box) */
    clipCoverage: (c) => () => {
      let total = 0, clipped = 0;
      c.renderer().group.traverse((o) => {
        if (!o.material || o.material.isMeshBasicMaterial) return;
        total++;
        if ((o.material.clippingPlanes ?? []).length === 6) clipped++;
      });
      return { total, clipped };
    },
    dialAngle: () => (i) => dials[i - 1].graphics().ang,
    /** a point of dial i's own picture (dial coordinates) in page pixels */
    dialToClient: () => (i, p) => dials[i - 1].plot.worldToClient(p),
    inkFraction: (c) => () => (c.renderer().webgl ? c.renderer().inkFraction() : 0),
    /** client (page) coordinates of a world point in the 3D picture */
    worldToClient: (c) => (p) => c.renderer().worldToClient(p),
    cameraPosition: (c) => () => (c.renderer().webgl ? c.renderer().viewer.camera.position.toArray() : null),
    camera: (c) => () => (c.renderer().webgl ? { ...c.renderer().camera(), aspect: c.renderer().viewer.camera.aspect } : null),
    evaluations: () => () => evaluations,
  },
});
