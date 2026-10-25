// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Ravi Patel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/unit-balls/plot3d.js — the picture of one evaluation of the Manipulate body, drawn the way Mathematica draws
// Plot3D (2D mode) / RegionPlot3D (3D mode): this app's fitted lighting, colours and framing, the two plots, the plane
// z = 1, axes, ticks and labels on the edges Mathematica uses, the plot label. The generic frame (viewer, BoxRatios
// group, lit-surface shader, line segments, box edges, tick segments, anchored labels) is shared/plot3d.js (browser only).
import {
  createPlot3D, litSurfaceMaterial, triangleMesh, boxEdgeSegments, tickSegments, scaledBoxGroup,
} from '../../shared/plot3d.js';
import { THREE, requireWebGL2 } from '../../shared/three-helpers.js';
import { padded, plotLabel, meshLines } from './norms.js';

/** Mathematica's default ViewPoint. */
export const VIEW_POINT = [1.3, -2.4, 2];

/**
 * Image framing per mode, fitted to the original's snapshots (ImageSize {400, 400}): the view angle that gives the
 * box the same size, and where the centre of the box appears, in points from the image centre (x right, y down).
 * Mathematica fits the whole graphic (box, labels, plot label) into the image; these numbers reproduce the result
 * for the default view (DESIGN.md §6).
 */
export const FRAMING = {
  '2D': { fov: 27.23, offset: [14.4, 14.1] },
  '3D': { fov: 32.33, offset: [-1.0, 12.2] },
};

/**
 * Lighting and surface colours, FITTED to the snapshots (PORT DEVIATION D-UB-04: Mathematica's own default lighting
 * and Plot3D/RegionPlot3D default styles are not reproduced from their definitions). Colour in the snapshot =
 * min(1, base · (ambient + diffuse · max(0, n·l)) + specular · max(0, n·h)^shininess), computed on sRGB values,
 * with n the normal in camera space (back faces lit with the reversed normal), l a light fixed to the camera
 * (up-right, towards the viewer) and h the half vector of l and the view direction (shared/plot3d.js litSurfaceMaterial).
 */
export const LIGHTING = { ambient: 0.227, diffuse: 0.982, direction: [0.414, 0.411, 0.79], specular: 0.212, shininess: 5 };
export const COLORS = {
  surface: [1.0, 0.565, 0.0], // first surface (the norm; the unit ball) — orange/yellow under the lighting
  plane: [0.348, 0.593, 1.0], // second Plot3D surface (z = 1), drawn with Opacity[0.5]
  planeOpacity: 0.5,
  box: [0.6, 0.6, 0.6], // box edges and axes
  mesh: [0.15, 0.15, 0.15], // RegionPlot3D mesh lines
  meshOpacity: 0.75,
  boundary: [0.2, 0.2, 0.2], // Plot3D BoundaryStyle
};
const IMAGE = 400; // ImageSize -> {400, 400}

const surfaceMaterial = (base, opacity = 1, clippingPlanes = []) => litSurfaceMaterial(base, { opacity, clippingPlanes, lighting: LIGHTING });

/** fmt of a tick label: −1.0, −0.5, 0.0, 0.5, 1.0 (U+2212 minus, one decimal) */
const tickText = (v) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;

function htmlOf(part) {
  if (part.kind === 'fraction') {
    return `<span class="ub-frac${part.invisible ? ' ub-invisible' : ''}"><span>${part.num}</span><span>${part.den}</span></span>`;
  }
  return `<span>${part.text}</span>`;
}

/** Plot label HTML: invisible ½, space, p, "‐norm" (Q-UB-01). */
export function plotLabelHtml(p) {
  const l = plotLabel(p);
  return `${htmlOf(l.prefix)} <span class="ub-label-text">${htmlOf(l.value)}${l.suffix}</span>`;
}

/**
 * Draw one evaluation into the plot (shared/plot3d.js createPlot3D). `sc` = norms.js scene(state); `p` = the value of
 * p (for the label). As in the original, every evaluation makes a new graphic, so the view returns to the default
 * ViewPoint (ORIGINAL QUIRK Q-UB-03). Returns the drawing's statistics (hook stats()).
 */
export function drawUnitBalls(plot, sc, p) {
  plot.clear();
  const mode = sc.dimension;
  const box = sc.range.map(padded);
  const g = scaledBoxGroup(box, sc.boxRatios); // data → scaled box (centre 0, longest side 1, BoxRatios)
  plot.root.add(g);
  const scale = g.scale.toArray(), centre = box.map(([a, b]) => (a + b) / 2);

  // clipping to the plot range in z: only when the range (PLOT_RANGE_2D_Z_MEASURED) actually cuts the
  // surface; the margin of 1e-4 of the box height keeps boundary lines lying exactly at the range's ends whole
  const [z0, z1] = sc.range[2];
  // (a measured range that differs from the drawn surface only by rounding, like Mathematica's zmax = corner ·
  // (1 − 1.43e-7), does not count as a cut)
  const tolZ = 1e-4 * (z1 - z0);
  const cuts = mode === '2D' && (z1 < Math.max(sc.surface.zMax, 1) - tolZ || z0 > Math.min(sc.surface.zMin, 1) + tolZ);
  const m = 1e-4 * sc.boxRatios[2];
  const clip = cuts ? [
    new THREE.Plane(new THREE.Vector3(0, 0, -1), (z1 - centre[2]) * scale[2] + m),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -(z0 - centre[2]) * scale[2] + m),
  ] : [];

  // surfaces
  g.add(triangleMesh(sc.surface, surfaceMaterial(COLORS.surface, 1, clip)));
  if (mode === '2D') {
    // second function: the plane z = 1 (flat: one quad is exact), with its boundary
    const [[x0, x1], [y0, y1]] = sc.range;
    const q = [x0, y0, 1, x1, y0, 1, x1, y1, 1, x0, y0, 1, x1, y1, 1, x0, y1, 1];
    g.add(triangleMesh({ positions: q, normals: Array(6).fill([0, 0, 1]).flat() }, surfaceMaterial(COLORS.plane, COLORS.planeOpacity, clip)));
    const pl = [x0, y0, 1, x1, y0, 1, x1, y0, 1, x1, y1, 1, x1, y1, 1, x0, y1, 1, x0, y1, 1, x0, y0, 1];
    g.add(plot.lines(pl, COLORS.boundary, { clippingPlanes: clip }));
    // BoundaryStyle of the norm surface: the curve over the edge of the domain
    const b = [];
    const B = sc.surface.boundary;
    for (let i = 0; i + 1 < B.length; i++) b.push(...B[i], ...B[i + 1]);
    g.add(plot.lines(b, COLORS.boundary, { clippingPlanes: clip }));
  } else {
    g.add(plot.lines(sc.mesh ?? meshLines(sc.surface.positions, sc.meshValues), COLORS.mesh, { opacity: COLORS.meshOpacity }));
  }

  // bounding box (Boxed -> True)
  g.add(plot.lines(boxEdgeSegments(box), COLORS.box));

  // axes on the edges Mathematica uses for the default view (D-UB-05): x at (y min, z min), y at (x min, z max),
  // z at (x min, y min); ticks point into the box
  const [[X0, X1], [Y0, Y1], [Z0, Z1]] = box;
  if (mode === '3D') {
    const major = [-1, -0.5, 0, 0.5, 1];
    const values = Array.from({ length: 23 }, (_, k) => (k - 11) / 10);
    // lengths as a fraction of the scaled box (longest side 1); x ticks → +y, y ticks → −z, z ticks → +x
    g.add(plot.lines(tickSegments(box, sc.boxRatios, values, (v) => (major.includes(v) ? 0.016 : 0.009), [
      { axis: 0, at: [0, Y0, Z0], toward: 1, sign: 1 },
      { axis: 1, at: [X0, 0, Z1], toward: 2, sign: -1 },
      { axis: 2, at: [X0, Y0, 0], toward: 0, sign: 1 },
    ]), COLORS.box));
    for (const v of major) {
      g.add(plot.anchored(tickText(v), [v, Y0, Z0], 'ub-tick ub-tick-x'));
      g.add(plot.anchored(tickText(v), [X0, v, Z1], 'ub-tick ub-tick-y'));
      g.add(plot.anchored(tickText(v), [X0, Y0, v], 'ub-tick ub-tick-z'));
    }
    g.add(plot.anchored('<i>x</i>', [(X0 + X1) / 2, Y0, Z0], 'ub-axislabel ub-ax3-x'));
    g.add(plot.anchored('<i>y</i>', [X0, (Y0 + Y1) / 2, Z1], 'ub-axislabel ub-ax3-y'));
    g.add(plot.anchored('<i>z</i>', [X0, Y0, (Z0 + Z1) / 2], 'ub-axislabel ub-ax3-z'));
  } else {
    // Ticks -> None; AxesLabel -> {x, y, "distance"}
    g.add(plot.anchored('<i>x</i>', [(X0 + X1) / 2, Y0, Z0], 'ub-axislabel ub-ax2-x'));
    g.add(plot.anchored('<i>y</i>', [X0, (Y0 + Y1) / 2, Z1], 'ub-axislabel ub-ax2-y'));
    g.add(plot.anchored('distance', [X0, Y0, (Z0 + Z1) / 2], 'ub-axislabel ub-ax2-z'));
  }

  // framing of the image and the plot label (centred over the box centre, as in the snapshots)
  const f = FRAMING[mode];
  plot.frame({ fov: f.fov, offset: f.offset, size: IMAGE });
  plot.setPlotLabel(plotLabelHtml(p), f.offset[0]);
  plot.viewer.render();
  return { mode, triangles: sc.surface.triangles, meshSegments: mode === '3D' ? (sc.mesh?.length ?? 0) / 6 : 0, boundaryPoints: mode === '2D' ? sc.surface.boundary.length : 0, box };
}

/**
 * The picture as a renderer of shared/manipulate.js ({ draw(graphics, ctx) }): the plot is made at the first
 * evaluation in the picture's element; graphics = norms.js scene(state).
 */
export function UnitBallsView() {
  let plot = null, last = null;
  return {
    get plot() { return plot; },
    prepare: requireWebGL2, // no WebGL 2: stop before the controls, as the old page did
    draw(sc, { element, state }) {
      plot ??= createPlot3D(element, {
        viewPoint: VIEW_POINT, maxSize: IMAGE, plotLabel: { className: 'ub-plotlabel', testid: 'plot-label' },
        anchorClass: 'ub-anchor', anchoredClass: 'ub-anchored',
      });
      last = drawUnitBalls(plot, sc, state.p);
    },
    stats: () => (last ? JSON.parse(JSON.stringify(last)) : null),
  };
}
