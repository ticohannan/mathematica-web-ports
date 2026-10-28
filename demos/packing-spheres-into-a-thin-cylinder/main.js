// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Li Huang
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/packing-spheres-into-a-thin-cylinder/main.js — the page: the original's Manipulate (shared/manipulate.js) with
// its Grid of four Controls above a Column of two pictures: the compression plot (#graphic, SVG) and the packing in its
// tube (#graphic2, shared/graphics3d-view.js) with its caption as the Graphics3D's Epilog.
import { Manipulate, Row } from '../../shared/manipulate.js';
import { Fraction } from '../../shared/graphics.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { r, initialState, evaluate } from './model.js';

Manipulate({
  name: 'packing-spheres-into-a-thin-cylinder',
  initial: initialState, // the notebook's saved state = the Manipulate's initial settings (F-PS-15)
  body: evaluate,
  ControlPlacement: 'Top', // Mathematica's default placement, as in the snapshots
  graphics: [
    { id: 'graphic', testid: 'plot-svg', label: 'compression ratio against R / r' },
    // SphericalRegion -> False is Mathematica's default (the library's default is True): the long tube fills the width;
    // zoom 1.05: the box's square corners stick out of the round tube, Mathematica fits tighter (D-PS-07)
    { id: 'graphic2', renderer: View3D({ SphericalRegion: false, zoom: 1.05, testid: 'scene-canvas', label: 'the spheres in the cylinder (3D, drag to rotate)' }) },
  ],
  // Grid[{{Control@…, Control@…}, {Control@…, Control@…}}]: two rows of two small labelled sliders (F-PS-05)
  controls: [
    Row([
      [['R', r, Fraction('tube radius', 'sphere radius')], r, 3 * r, 0.01, { ImageSize: 'Small', Appearance: 'Labeled' }],
      [['θ', 0, 'stacking plane angle'], 0, 3.14159, 0.001, { ImageSize: 'Small', Appearance: 'Labeled' }],
    ], { name: 'first' }),
    Row([
      [['SphereOpacity', 0.6, 'sphere opacity'], 0, 1, 0.01, { ImageSize: 'Small', Appearance: 'Labeled' }],
      [['NumSpheres', 8, 'spheres'], 8, 32, 1, { ImageSize: 'Small', Appearance: 'Labeled' }],
    ], { name: 'second' }),
  ],
  hook: {
    inkFraction: (c) => () => c.renderer(1).inkFraction(),
    sceneToClient: (c) => (p) => c.renderer(1).worldToClient(p), // page coordinates of a 3D point (tests)
  },
});
