// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/camera-apparent-velocity/main.js — the page: the original's Manipulate (shared/manipulate.js), ControlPlacement
// -> Left, with its two pictures in one place: the Graphics3D scene (shared/graphics3d-view.js, #graphic) and, with "show
// 2D view", the image plane as 2D Graphics (#graphic2); the body draws one of them, the page shows that one.
import { Manipulate, Control, None } from '../../shared/manipulate.js';
import { Style, Italic, Subscript, htmlOf } from '../../shared/graphics.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { SPECS, initialState, evaluate, settles, sphericaldist, imagePlaneCoor } from './model.js';

/**
 * Control@{{unusedVariable, 1, ""}, (sphericaldist[#1, xc, yc, zc, r] &), ImageSize -> 45}: a control that only shows a
 * Grid of the body's numbers (Alignment -> {{Right, Left}}); its rows are written after every evaluation (after).
 */
const gridDisplay = (testid) => (controls, { parent }) => {
  const row = document.createElement('div');
  row.className = 'ctl cv-grid';
  row.dataset.testid = testid;
  (parent ?? controls.root).append(row);
  return { row, get: () => 1, set: () => {} };
};
const writeGrid = (testid, rows) => {
  const el = document.querySelector(`[data-testid="${testid}"]`);
  if (el) el.innerHTML = `<table><tbody>${rows.map(([v, w]) => `<tr><td class="cv-var">${htmlOf(v)}</td><td class="cv-val">${htmlOf(w)}</td></tr>`).join('')}</tbody></table>`;
};
const xyzLabel = (c) => Subscript(Style(c, Italic), 'c');

Manipulate({
  name: 'camera-apparent-velocity',
  initial: initialState, // the notebook's saved state = the Manipulate's initial settings
  body: evaluate,
  settle: settles, // "animate": the body moves a by 0.1 and so evaluates itself again (Mathematica re-evaluates it)
  settleInterval: 0.1, // at most ten evaluations a second (D-CV-05)
  graphics: [
    {
      id: 'graphic',
      // PointSize[s] × the width the image shows at the centre; Arrowheads[s] × the plot range's diagonal (View3D default)
      renderer: View3D({ pointLength: 'ImageWidth', testid: 'scene-canvas', label: "Maximizing Apparent Velocity in a Camera's Frame (3D, drag to rotate)" }),
    },
    { id: 'graphic2', testid: 'scene-svg', label: 'the image plane seen from the camera (2D view)' },
  ],
  controls: [
    'drone starting location (green point)',
    [['a', SPECS.a], 0, 1, 0.1, { ControlType: None }], // the animated drone's fraction of the way (no control)
    [['xc', SPECS.xc, xyzLabel('x')], -10, 10, 1, { Appearance: 'Labeled', ImageSize: 60 }],
    [['yc', SPECS.yc, xyzLabel('y')], -10, 10, 1, { Appearance: 'Labeled', ImageSize: 60 }],
    [['zc', SPECS.zc, xyzLabel('z')], 10, 20, 1, { Appearance: 'Labeled', ImageSize: 60 }],
    '',
    'sphere radius',
    [['r', SPECS.r, Style('r', Italic)], 1, 5, { Appearance: 'Labeled', ImageSize: 60 }],
    '',
    [['Silhouette', SPECS.Silhouette, 'show sphere'], [true, false]],
    [['imPlaneView', SPECS.imPlaneView, 'show 2D view'], [true, false]],
    [['showDrone', SPECS.showDrone, 'show drone'], [true, false]],
    [['animation', SPECS.animation, 'animate'], [true, false]],
    '',
    'Red point maximizes pixel change.\n\ncoordinates in camera frame',
    [['unusedVariable', SPECS.unusedVariable, ''], Control(gridDisplay('coords-camera'))],
    '',
    'image plane coordinates',
    [['unusedVariable', SPECS.unusedVariable, ''], Control(gridDisplay('coords-image'))],
  ],
  after: (ctx) => {
    const { xc, yc, zc, r, imPlaneView } = ctx.state;
    document.getElementById('graphic').hidden = imPlaneView;
    document.getElementById('graphic2').hidden = !imPlaneView;
    // the 3D labels drawn now: View3D renders on the next animation frame, and an evaluation of the "animate" loop runs in
    // a frame after that render, so the page would be painted without the rebuilt labels (K-CV-02)
    const v = ctx.renderer(0)?.viewer;
    if (v && !imPlaneView) v.labelRenderer.render(v.scene, v.camera);
    writeGrid('coords-camera', sphericaldist(xc, yc, zc, r));
    writeGrid('coords-image', imagePlaneCoor(xc, yc, zc, r));
  },
  hook: {
    inkFraction: (c) => () => c.renderer().inkFraction(),
    /** RGB of the 3D canvas where world point p is drawn */
    pixelAt: (c) => (p) => c.renderer().pixelAt(p),
    /** the 3D scene's textured meshes: their image sizes and how much of each image's top and bottom half is ink */
    textures: (c) => () => {
      const out = [];
      c.renderer().viewer.scene.traverse((o) => {
        const img = o.material?.map?.image;
        if (!img) return;
        const { data } = img.getContext('2d').getImageData(0, 0, img.width, img.height);
        const half = (from, to) => { let n = 0; for (let k = from * img.width * 4 + 3; k < to * img.width * 4; k += 4) if (data[k] > 128) n++; return n; };
        out.push({ width: img.width, height: img.height, inkTop: half(0, img.height >> 1), inkBottom: half(img.height >> 1, img.height), opacity: o.material.opacity });
      });
      return out;
    },
  },
});
