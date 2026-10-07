// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Ravi Patel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/unit-balls/plot3d.js — draws one evaluation of the Manipulate body with three.js the way Mathematica draws
// Plot3D / RegionPlot3D: bounding box with BoxRatios, axes on the box edges, ticks and labels, the plot label,
// the surfaces with Mathematica-like lighting, mesh and boundary lines (browser only).
import { THREE, createViewer, label, inkFraction } from '../../shared/three-helpers.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
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
 * (up-right, towards the viewer) and h the half vector of l and the view direction.
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

const VERT = /* glsl */ `
#include <clipping_planes_pars_vertex>
varying vec3 vN;
void main() {
  vN = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  #include <clipping_planes_vertex>
  gl_Position = projectionMatrix * mvPosition;
}`;
const FRAG = /* glsl */ `
#include <clipping_planes_pars_fragment>
uniform vec3 base;
uniform float alpha;
uniform vec3 lightDir;
uniform float ambient, diffuse, specular, shininess;
varying vec3 vN;
void main() {
  #include <clipping_planes_fragment>
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 h = normalize(lightDir + vec3(0.0, 0.0, 1.0));
  float d = max(dot(n, lightDir), 0.0);
  float s = pow(max(dot(n, h), 0.0), shininess);
  gl_FragColor = vec4(min(base * (ambient + diffuse * d) + specular * s, vec3(1.0)), alpha);
}`;

function surfaceMaterial(base, opacity = 1, clippingPlanes = []) {
  const l = new THREE.Vector3(...LIGHTING.direction).normalize();
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      base: { value: new THREE.Vector3(...base) },
      alpha: { value: opacity },
      lightDir: { value: l },
      ambient: { value: LIGHTING.ambient },
      diffuse: { value: LIGHTING.diffuse },
      specular: { value: LIGHTING.specular },
      shininess: { value: LIGHTING.shininess },
    },
    side: THREE.DoubleSide,
    clipping: true,
    clippingPlanes,
    polygonOffset: true, // keep mesh and boundary lines (drawn on the surface) in front of it
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  if (opacity < 1) { m.transparent = true; m.depthWrite = false; }
  return m;
}

function triangleMesh({ positions, normals }, material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return new THREE.Mesh(g, material);
}

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

export function createPlot(container) {
  const viewer = createViewer(container, { box: [[-0.5, 0.5], [-0.5, 0.5], [-0.5, 0.5]], viewPoint: VIEW_POINT, maxSize: 400 });
  // Colours are combined on their sRGB values, as Mathematica does: no conversion on output.
  viewer.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  viewer.renderer.localClippingEnabled = true;
  const root = new THREE.Group();
  viewer.scene.add(root);

  const plotLabelEl = document.createElement('div');
  plotLabelEl.className = 'ub-plotlabel';
  plotLabelEl.setAttribute('data-testid', 'plot-label');
  container.append(plotLabelEl);

  const lines = (pts, color, { opacity = 1, width = 1, clippingPlanes = [] } = {}) => {
    const geo = new LineSegmentsGeometry();
    geo.setPositions(pts);
    const mat = new LineMaterial({ color: new THREE.Color(...color), linewidth: width, transparent: opacity < 1, opacity, clippingPlanes });
    const size = viewer.renderer.getSize(new THREE.Vector2());
    mat.resolution.set(size.x, size.y);
    viewer.lineMaterials.add(mat);
    return new LineSegments2(geo, mat);
  };

  const anchored = (text, pos, cls) => {
    // CSS2D element of size 0 at the point; the text inside is placed by the class (offsets in px = pt)
    const obj = label('', pos, [0, 0, 0], { cls: `ub-anchor ${cls}` });
    const span = document.createElement('span');
    span.className = 'ub-anchored';
    span.innerHTML = text;
    obj.element.append(span);
    return obj;
  };

  function clear() {
    for (const obj of [...root.children]) {
      root.remove(obj);
      obj.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) { viewer.lineMaterials.delete(o.material); o.material.dispose(); }
        if (o.element) o.element.remove();
      });
    }
  }

  let last = null;
  /**
   * Draw one evaluation. `sc` = norms.js scene(state); `p` = the value of p (for the label).
   * As in the original, every evaluation makes a new graphic, so the view returns to the default ViewPoint
   * (ORIGINAL QUIRK Q-UB-03).
   */
  function show(sc, p) {
    clear();
    const mode = sc.dimension;
    const box = sc.range.map(padded);
    // data → scaled box (centre 0, longest side 1, BoxRatios)
    const scale = box.map(([a, b], i) => sc.boxRatios[i] / (b - a));
    const centre = box.map(([a, b]) => (a + b) / 2);
    const g = new THREE.Group();
    g.scale.set(...scale);
    g.position.set(...centre.map((c, i) => -c * scale[i]));
    root.add(g);

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
      g.add(lines(pl, COLORS.boundary, { clippingPlanes: clip }));
      // BoundaryStyle of the norm surface: the curve over the edge of the domain
      const b = [];
      const B = sc.surface.boundary;
      for (let i = 0; i + 1 < B.length; i++) b.push(...B[i], ...B[i + 1]);
      g.add(lines(b, COLORS.boundary, { clippingPlanes: clip }));
    } else {
      g.add(lines(sc.mesh ?? meshLines(sc.surface.positions, sc.meshValues), COLORS.mesh, { opacity: COLORS.meshOpacity }));
    }

    // bounding box (Boxed -> True)
    const [[X0, X1], [Y0, Y1], [Z0, Z1]] = box;
    const e = [];
    for (const y of [Y0, Y1]) for (const z of [Z0, Z1]) e.push(X0, y, z, X1, y, z);
    for (const x of [X0, X1]) for (const z of [Z0, Z1]) e.push(x, Y0, z, x, Y1, z);
    for (const x of [X0, X1]) for (const y of [Y0, Y1]) e.push(x, y, Z0, x, y, Z1);
    g.add(lines(e, COLORS.box));

    // axes on the edges Mathematica uses for the default view (D-UB-05): x at (y min, z min), y at (x min, z max),
    // z at (x min, y min); ticks point into the box
    const W = box.map(([a, b]) => b - a);
    if (mode === '3D') {
      const t = [];
      const major = [-1, -0.5, 0, 0.5, 1];
      for (let k = -11; k <= 11; k++) {
        const v = k / 10;
        if (v < X0 || v > X1) continue;
        const len = major.includes(v) ? 0.016 : 0.009; // as a fraction of the scaled box (longest side 1)
        t.push(v, Y0, Z0, v, Y0 + len * W[1] / sc.boxRatios[1], Z0); // x ticks → +y
        t.push(X0, v, Z1, X0, v, Z1 - len * W[2] / sc.boxRatios[2]); // y ticks → −z
        t.push(X0, Y0, v, X0 + len * W[0] / sc.boxRatios[0], Y0, v); // z ticks → +x
      }
      g.add(lines(t, COLORS.box));
      for (const v of major) {
        g.add(anchored(tickText(v), [v, Y0, Z0], 'ub-tick ub-tick-x'));
        g.add(anchored(tickText(v), [X0, v, Z1], 'ub-tick ub-tick-y'));
        g.add(anchored(tickText(v), [X0, Y0, v], 'ub-tick ub-tick-z'));
      }
      g.add(anchored('<i>x</i>', [(X0 + X1) / 2, Y0, Z0], 'ub-axislabel ub-ax3-x'));
      g.add(anchored('<i>y</i>', [X0, (Y0 + Y1) / 2, Z1], 'ub-axislabel ub-ax3-y'));
      g.add(anchored('<i>z</i>', [X0, Y0, (Z0 + Z1) / 2], 'ub-axislabel ub-ax3-z'));
    } else {
      // Ticks -> None; AxesLabel -> {x, y, "distance"}
      g.add(anchored('<i>x</i>', [(X0 + X1) / 2, Y0, Z0], 'ub-axislabel ub-ax2-x'));
      g.add(anchored('<i>y</i>', [X0, (Y0 + Y1) / 2, Z1], 'ub-axislabel ub-ax2-y'));
      g.add(anchored('distance', [X0, Y0, (Z0 + Z1) / 2], 'ub-axislabel ub-ax2-z'));
    }

    // framing of the image and the plot label (centred over the box centre, as in the snapshots)
    const f = FRAMING[mode];
    viewer.resetView();
    viewer.camera.fov = f.fov;
    viewer.camera.setViewOffset(400, 400, -f.offset[0], -f.offset[1], 400, 400);
    viewer.camera.updateProjectionMatrix();
    plotLabelEl.innerHTML = plotLabelHtml(p);
    plotLabelEl.style.left = `calc(50% + ${f.offset[0]}px)`;
    last = { mode, triangles: sc.surface.triangles, meshSegments: mode === '3D' ? (sc.mesh?.length ?? 0) / 6 : 0, boundaryPoints: mode === '2D' ? sc.surface.boundary.length : 0, box };
    viewer.render();
  }

  return {
    viewer,
    show,
    stats: () => (last ? JSON.parse(JSON.stringify(last)) : null),
    inkFraction: () => inkFraction(viewer.renderer),
    cameraPosition: () => viewer.camera.position.toArray(),
    plotLabelEl,
  };
}
