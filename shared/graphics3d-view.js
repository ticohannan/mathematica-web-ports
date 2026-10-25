// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/graphics3d-view.js — a Graphics3D picture for shared/manipulate.js: the picture option { renderer: View3D({…}) }
// draws the Graphics3D data a Manipulate body returns (shared/graphics3d.js) with three.js. Browser only.
//
// One viewer per picture, made at the first evaluation and kept: every evaluation rebuilds only the content groups, so
// the user's rotation stays, as in Mathematica. With an automatic PlotRange the camera is refitted (SphericalRegion)
// only when the bounds change.
//
// View3D(options) — Mathematica's options where they exist, port options in lower case. The Mathematica options may
// also come from the Graphics3D the body returns (graphics.options; the View3D options win), read at every evaluation
// (ImageSize, ViewPoint, ViewAngle and Lighting only when the viewer is made):
//   ImageSize (px, default 400; {w, h}: a non-square image, the width follows the page up to maxSize ?? w),
//   ViewPoint (default {1.3, -2.4, 2}), ViewAngle (radians: the vertical view angle instead of the SphericalRegion fit;
//   with an explicit PlotRange the camera is then never refitted), PlotRange ('Automatic': the bounds of the
//   primitives, refitted when they change; or {{x0, x1}, {y0, y1}, {z0, z1}}: clipping planes, fitted once),
//   BoxRatios ({rx, ry, rz}: the content is drawn in a scaled group so that the plot range box becomes a box of these
//   ratios, longest side 1, centred at the origin; clipping, frame and fit work in those coordinates),
//   Boxed / Axes / Ticks / AxesLabel / AxesEdge (a frame group after the content: the 12 box edges unless Boxed is
//   false, and with Axes -> True ticks (Ticks: Automatic = graphics3d.js niceTicks, or per axis a list
//   {{v, label, length}}), tick labels and AxesLabel (HTML strings) as CSS2D labels on the AxesEdge edges; drawn only
//   when Axes or Boxed is True — the ports' default is no box, unlike Mathematica), PlotLabel (written into
//   plotLabelElement), Lighting: 'Automatic' (Mathematica's documented default lights, linear output,
//   shared/mma-lighting.js) or 'Viewer' (createViewer's own setting, as the oldest ports had it);
//   maxSize (px cap of the canvas, default ImageSize), zoom (SphericalRegion fit, > 1 draws larger, default 1),
//   thickPx / thinPx (Thickness[Large] / normal lines in px, defaults 3 / 1), size(box, prims) (the length for
//   PointSize and Arrowheads, default the box diagonal), pointLength ('ImageWidth' — the width the image shows at the
//   centre, graphics3d.js imageWidth — or a function (box, prims): the PointSize length; the points of each part are
//   then drawn after its other primitives), testid (canvas data-testid), label (canvas aria-label),
//   initialBox (the box the viewer is first made with, default the first plot range), refitDigits (decimals of the
//   bounds compared for a refit, default 6), clipPadding / clipOrder (graphics3d.js clipPlaneData), resetView (the
//   "Initial settings" button also restores the view), webgl2Fallback (without WebGL 2 the picture is left out and the
//   page keeps working: renderer.webgl is false), plotLabelElement (element or selector for PlotLabel), frame look:
//   frameColor ([0.55, 0.55, 0.55]), frameLabelColor ([0.33, 0.33, 0.33]), tickClass / axisLabelClass (CSS classes of
//   the labels), tickLabelOffset / axisLabelOffset (0.06 / 0.14 of the box side),
//   draw(viewer, graphics, ctx) (escape hatch: draw the content yourself; called instead of the primitive drawing),
//   onCreate(viewer) (after the viewer is made: extra lights, materials, objects that stay).
// Parts: each top-level Group3D of the graphic is drawn into its own group, runs of other content into one group each
// (graphics3d.js groupsOf); a Group3D with a key keeps its last drawing while the key is the same. The groups are
// children of the scene (or of the BoxRatios group); a frame group comes after a BoxRatios group, before plain groups.
// The renderer object: draw(graphics, ctx) (called by Manipulate), reset() (called by Initial settings), viewer (the
// shared/three-helpers.js viewer: scene, camera, renderer, controls), group (the first content group), groups, box (the
// last plot range), clip (the clipping planes or null), webgl, inkFraction(), camera(), pixelAt(p), worldToClient(p).
import { THREE, createViewer, inkFraction, fatLine, label, requireWebGL2, webgl2Available } from './three-helpers.js';
import { addMathematicaLighting } from './mma-lighting.js';
import { flatten, primitiveBounds, groupsOf, clipPlaneData, boxRatioTransform, niceTicks, frameData, imageWidth } from './graphics3d.js';
import { addPrims, disposeGroup, fitViewer, VIEWPOINT } from './graphics3d-three.js';

const boxKeyOf = (box, digits = 6) => box.map(([a, b]) => `${a.toFixed(digits)},${b.toFixed(digits)}`).join(';');
const diagonal = (box) => Math.hypot(...box.map(([a, b]) => b - a));
const toPlanes = (data) => data.map(([n, c]) => new THREE.Plane(new THREE.Vector3(...n), c));

/** Clipping planes that keep the inside of the box {{x0, x1}, {y0, y1}, {z0, z1}} (explicit PlotRange). */
export function clipPlanes(box, options) {
  return toPlanes(clipPlaneData(box, options));
}

export { requireWebGL2, webgl2Available };

export function View3D(o = {}) {
  let viewer = null, container = null, dataGroup = null, frameGroup = null, webgl = true;
  let boxKey = null, clip = null, clipKey = null, box = null, frameKey = null;
  const slots = []; // content groups: { group, key }

  function mount(element, firstBox, op) {
    const imageSize = op.ImageSize ?? 400;
    const sizes = Array.isArray(imageSize) ? { imageSize, maxSize: o.maxSize } : { size: imageSize, maxSize: o.maxSize ?? imageSize };
    viewer = createViewer(element, { box: o.initialBox ?? firstBox, viewPoint: op.ViewPoint ?? VIEWPOINT, viewAngle: op.ViewAngle, ...sizes });
    if (o.testid) viewer.renderer.domElement.setAttribute('data-testid', o.testid);
    if (o.label) viewer.renderer.domElement.setAttribute('aria-label', o.label);
    if ((op.Lighting ?? 'Automatic') === 'Automatic') {
      // Mathematica lights and blends the displayed colour values directly, with its documented default lights
      viewer.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      addMathematicaLighting(viewer.camera);
    }
    if (Array.isArray(op.PlotRange)) viewer.renderer.localClippingEnabled = true;
    container = viewer.scene;
    if (op.BoxRatios) { dataGroup = new THREE.Group(); viewer.scene.add(dataGroup); container = dataGroup; }
    if (op.Axes || op.Boxed === true) { frameGroup = new THREE.Group(); viewer.scene.add(frameGroup); }
  }
  const slot = (i) => {
    if (!slots[i]) { const group = new THREE.Group(); container.add(group); slots[i] = { group, key: undefined }; }
    return slots[i];
  };

  function drawPrims(group, prims, ctx) {
    const base = { viewer, clip, box, size: ctx.size, thickPx: o.thickPx ?? 3, thinPx: o.thinPx ?? 1 };
    if (!ctx.pointLength) { addPrims(group, prims, base); return; }
    addPrims(group, prims.filter((p) => p.type !== 'point'), base);
    addPrims(group, prims.filter((p) => p.type === 'point'), { ...base, size: ctx.pointLength });
  }

  function drawFrame(op, worldBox) {
    const key = JSON.stringify([box, worldBox, op.Axes, op.Boxed, op.Ticks, op.AxesLabel, op.AxesEdge]);
    if (key === frameKey) return;
    frameKey = key;
    disposeGroup(frameGroup, [viewer]);
    const ticks = [0, 1, 2].map((k) => (Array.isArray(op.Ticks) ? op.Ticks[k] : niceTicks(box[k])));
    const f = frameData({ box, worldBox, AxesEdge: op.AxesEdge, ticks, tickLabelOffset: o.tickLabelOffset, axisLabelOffset: o.axisLabelOffset });
    const color = o.frameColor ?? [0.55, 0.55, 0.55], text = o.frameLabelColor ?? [0.33, 0.33, 0.33];
    if (op.Boxed !== false) for (const e of f.edges) frameGroup.add(fatLine(viewer, e, color, 1));
    if (!op.Axes) return;
    f.axes.forEach((ax, k) => {
      for (const t of ax.ticks) frameGroup.add(fatLine(viewer, t, color, 1));
      for (const t of ax.tickLabels) frameGroup.add(label(t.text, t.pos, text, { cls: o.tickClass ?? '' }));
      const L = op.AxesLabel?.[k];
      if (L != null) frameGroup.add(label(String(L), ax.label.pos, text, { html: true, cls: o.axisLabelClass ?? '' }));
    });
  }

  const self = {
    /** before the controls: without WebGL 2 (and no webgl2Fallback) throw, as creating the viewer would */
    prepare() { if (!o.webgl2Fallback) requireWebGL2(); },
    get viewer() { return viewer; },
    get group() { return slots[0]?.group ?? null; },
    get groups() { return slots.map((s) => s.group); },
    get box() { return box; },
    get clip() { return clip; },
    get webgl() { return webgl; },
    draw(graphics, ctx) {
      if (!webgl) return;
      const op = { ...(graphics?.options ?? {}), ...o };
      const explicit = Array.isArray(op.PlotRange) ? op.PlotRange : null;
      const parts = o.draw ? null : groupsOf(graphics);
      const all = o.draw || (explicit && !o.size && o.pointLength === undefined) ? null : flatten(graphics);
      box = explicit ?? (all ? primitiveBounds(all) : graphics.options?.PlotRange);
      if (!box) throw new Error('View3D: give a PlotRange (option or Graphics3D option) when the content is drawn by `draw`');
      const br = op.BoxRatios ? boxRatioTransform(box, op.BoxRatios) : null;
      const worldBox = br ? br.worldBox : box;
      if (explicit) { // the clipping planes also exist without WebGL (hook clipping())
        const ck = boxKeyOf(worldBox, 17);
        if (ck !== clipKey) { clip = clipPlanes(worldBox, { padding: o.clipPadding ?? 0, order: o.clipOrder }); clipKey = ck; }
      }
      if (!viewer) {
        if (o.webgl2Fallback && !webgl2Available()) { webgl = false; return; }
        mount(ctx.element, worldBox, op);
        if (parts) parts.forEach((_, i) => slot(i)); else slot(0);
        o.onCreate?.(viewer);
      }
      if (br) { dataGroup.scale.set(...br.scale); dataGroup.position.set(...br.position); }
      if (o.draw) o.draw(viewer, graphics, { ...ctx, group: slot(0).group, box, clip });
      else {
        const size = o.size ? o.size(box, all) : diagonal(box);
        const pointLength = typeof o.pointLength === 'function' ? o.pointLength(box, all)
          : o.pointLength === 'ImageWidth' ? imageWidth(box, { viewPoint: op.ViewPoint ?? VIEWPOINT, viewAngle: op.ViewAngle, imageSize: op.ImageSize ?? 400 }) : null;
        parts.forEach((part, i) => {
          const s = slot(i);
          if (part.key !== undefined && s.key === part.key) return; // a cached part: its last drawing stays
          disposeGroup(s.group, [viewer]);
          drawPrims(s.group, parts.length === 1 && all ? all : flatten(part.content), { size, pointLength });
          s.key = part.key;
        });
        while (slots.length > parts.length) { const s = slots.pop(); disposeGroup(s.group, [viewer]); s.group.removeFromParent(); }
      }
      if (frameGroup) drawFrame(op, worldBox);
      if (op.PlotLabel !== undefined && o.plotLabelElement) {
        const el = typeof o.plotLabelElement === 'string' ? document.querySelector(o.plotLabelElement) : o.plotLabelElement;
        el.textContent = op.PlotLabel;
      }
      const key = boxKeyOf(worldBox, o.refitDigits ?? 6);
      if (key !== boxKey && (!explicit || boxKey === null)) {
        // a fixed ViewAngle with a fixed PlotRange: the camera createViewer made stays (no SphericalRegion fit)
        if (!(explicit && op.ViewAngle !== undefined)) fitViewer(viewer, { box: worldBox, zoom: o.zoom ?? 1, viewPoint: op.ViewPoint ?? VIEWPOINT, viewAngle: op.ViewAngle });
        boxKey = key;
      }
      viewer.render();
    },
    /** "Initial settings": with resetView, the view returns to the initial ViewPoint (refitted at the next draw) */
    reset() { if (o.resetView && viewer) { viewer.resetView(); boxKey = null; } },
    /** fraction of non-white pixels of the canvas (drawn now) */
    inkFraction() { viewer.renderer.render(viewer.scene, viewer.camera); return inkFraction(viewer.renderer); },
    camera() { return { position: viewer.camera.position.toArray(), target: viewer.controls.target.toArray(), fov: viewer.camera.fov }; },
    /** RGB of the pixel where world point p is drawn (drawn now) */
    pixelAt(p) {
      viewer.renderer.render(viewer.scene, viewer.camera);
      const s = new THREE.Vector3(...p).project(viewer.camera);
      const gl = viewer.renderer.getContext();
      const x = Math.round(((s.x + 1) / 2) * gl.drawingBufferWidth), y = Math.round(((s.y + 1) / 2) * gl.drawingBufferHeight);
      const px = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return [px[0], px[1], px[2]];
    },
    /** page (client) coordinates of world point p */
    worldToClient(p) {
      const s = new THREE.Vector3(...p).project(viewer.camera);
      const r = viewer.renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((s.x + 1) / 2) * r.width, y: r.top + ((1 - s.y) / 2) * r.height };
    },
  };
  return self;
}
