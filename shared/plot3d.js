// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/plot3d.js — the frame of a Plot3D / RegionPlot3D picture drawn with three.js, as Mathematica draws one:
// content redrawn per evaluation inside a group scaled to BoxRatios (data → box with centre 0, longest side 1),
// surfaces lit by one light fixed to the camera and computed on the displayed (sRGB) colour values, screen-space line
// segments, the 12 box edges, tick marks on chosen box edges, CSS2D labels anchored at a point, a plot label over the
// picture and the framing of the image by view angle and offset. Browser only (the pure helpers are unit-tested).
//
// Every number that shapes a particular picture (the light, the colours, the framing, tick values and lengths, label
// offsets) is an option of the caller: nothing here is taken from a notebook.
//
//   const plot = createPlot3D(container, { box, viewPoint, maxSize: 400, plotLabel: { className, testid } });
//   plot.clear();
//   const g = scaledBoxGroup(range, boxRatios); plot.root.add(g);
//   g.add(triangleMesh(surface, litSurfaceMaterial(base, { lighting })));
//   g.add(plot.lines(boxEdgeSegments(range), [0.6, 0.6, 0.6]));
//   plot.frame({ fov, offset: [dx, dy], size: 400 });
import { THREE, createViewer, label, inkFraction } from './three-helpers.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

/**
 * The surface shader: colour = min(1, base · (ambient + diffuse · max(0, n·l)) + specular · max(0, n·h)^shininess) on
 * the displayed colour values, n the normal in camera space (back faces lit with the reversed normal), l the light
 * direction in camera space (fixed to the camera), h the half vector of l and the view direction; clip planes honoured.
 */
export const LIT_VERTEX_SHADER = /* glsl */ `
#include <clipping_planes_pars_vertex>
varying vec3 vN;
void main() {
  vN = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  #include <clipping_planes_vertex>
  gl_Position = projectionMatrix * mvPosition;
}`;
export const LIT_FRAGMENT_SHADER = /* glsl */ `
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

/**
 * A two-sided surface material with the shader above. lighting = { ambient, diffuse, direction: [x, y, z] (camera
 * space, normalised here), specular, shininess }; opacity < 1 makes it translucent (no depth writes). A polygon offset
 * keeps lines drawn on the surface (mesh, boundary) in front of it.
 */
export function litSurfaceMaterial(base, { opacity = 1, clippingPlanes = [], lighting }) {
  const l = new THREE.Vector3(...lighting.direction).normalize();
  const m = new THREE.ShaderMaterial({
    vertexShader: LIT_VERTEX_SHADER,
    fragmentShader: LIT_FRAGMENT_SHADER,
    uniforms: {
      base: { value: new THREE.Vector3(...base) },
      alpha: { value: opacity },
      lightDir: { value: l },
      ambient: { value: lighting.ambient },
      diffuse: { value: lighting.diffuse },
      specular: { value: lighting.specular },
      shininess: { value: lighting.shininess },
    },
    side: THREE.DoubleSide,
    clipping: true,
    clippingPlanes,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  if (opacity < 1) { m.transparent = true; m.depthWrite = false; }
  return m;
}

/** A mesh of unindexed triangles { positions: [x, y, z, …], normals: [nx, ny, nz, …] }. */
export function triangleMesh({ positions, normals }, material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return new THREE.Mesh(g, material);
}

/** Boxed -> True: the 12 edges of the box {{x0, x1}, {y0, y1}, {z0, z1}} as segment end points [x, y, z, x, y, z, …]
 * (the 4 edges along x, then along y, then along z). Pure. */
export function boxEdgeSegments([[X0, X1], [Y0, Y1], [Z0, Z1]]) {
  const e = [];
  for (const y of [Y0, Y1]) for (const z of [Z0, Z1]) e.push(X0, y, z, X1, y, z);
  for (const x of [X0, X1]) for (const z of [Z0, Z1]) e.push(x, Y0, z, x, Y1, z);
  for (const x of [X0, X1]) for (const y of [Y0, Y1]) e.push(x, y, Z0, x, y, Z1);
  return e;
}

/**
 * Tick marks on box edges (Ticks on the edges chosen by the caller), as segment end points. For every value v (in
 * order) and every edge (in order) whose axis range contains v: from the edge point at v, a segment of length len(v)
 * (a fraction of the scaled box, whose longest side is 1) along box direction `toward`, sign +1 or −1.
 *   edges: [{ axis, at: [x, y, z] (the edge's other two coordinates; the axis coordinate is replaced by v), toward, sign }]
 * Pure.
 */
export function tickSegments(box, boxRatios, values, len, edges) {
  const W = box.map(([a, b]) => b - a);
  const t = [];
  for (const v of values) {
    for (const { axis, at, toward, sign } of edges) {
      if (v < box[axis][0] || v > box[axis][1]) continue;
      const p = at.slice();
      p[axis] = v;
      const q = p.slice();
      const d = len(v) * W[toward] / boxRatios[toward];
      q[toward] = sign > 0 ? p[toward] + d : p[toward] - d;
      t.push(...p, ...q);
    }
  }
  return t;
}

/** BoxRatios: a group mapping the data box onto the scaled box (centre 0, side i = boxRatios[i]). */
export function scaledBoxGroup(box, boxRatios) {
  const scale = box.map(([a, b], i) => boxRatios[i] / (b - a));
  const centre = box.map(([a, b]) => (a + b) / 2);
  const g = new THREE.Group();
  g.scale.set(...scale);
  g.position.set(...centre.map((c, i) => -c * scale[i]));
  return g;
}

/**
 * A viewer for Plot3D-like pictures in `container`. Options: box (the viewer's initial box, default the scaled cube
 * [−0.5, 0.5]³), viewPoint, maxSize (px), colorSpace ('display': colours combined on their displayed values, no
 * conversion on output — the default), plotLabel: { className, testid } (an HTML element over the picture), anchorClass /
 * anchoredClass (CSS classes of anchored labels and the text inside them).
 * Returns { viewer, root, plotLabelEl, lines(pts, color, { opacity, width, clippingPlanes }), anchored(html, pos, cls),
 * clear(), frame({ fov, offset: [dx, dy], size }), setPlotLabel(html, dx), inkFraction(), cameraPosition() }.
 */
export function createPlot3D(container, o = {}) {
  const viewer = createViewer(container, { box: o.box ?? [[-0.5, 0.5], [-0.5, 0.5], [-0.5, 0.5]], viewPoint: o.viewPoint, maxSize: o.maxSize });
  if ((o.colorSpace ?? 'display') === 'display') viewer.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  viewer.renderer.localClippingEnabled = true;
  const root = new THREE.Group();
  viewer.scene.add(root);

  let plotLabelEl = null;
  if (o.plotLabel) {
    plotLabelEl = document.createElement('div');
    plotLabelEl.className = o.plotLabel.className;
    if (o.plotLabel.testid) plotLabelEl.setAttribute('data-testid', o.plotLabel.testid);
    container.append(plotLabelEl);
  }
  const anchorClass = o.anchorClass ?? 'plot3d-anchor', anchoredClass = o.anchoredClass ?? 'plot3d-anchored';

  /** line segments [x, y, z, x, y, z, …] of width px (screen space) */
  const lines = (pts, color, { opacity = 1, width = 1, clippingPlanes = [] } = {}) => {
    const geo = new LineSegmentsGeometry();
    geo.setPositions(pts);
    const mat = new LineMaterial({ color: new THREE.Color(...color), linewidth: width, transparent: opacity < 1, opacity, clippingPlanes });
    const size = viewer.renderer.getSize(new THREE.Vector2());
    mat.resolution.set(size.x, size.y);
    viewer.lineMaterials.add(mat);
    return new LineSegments2(geo, mat);
  };

  /** a CSS2D element of size 0 at the point; the text inside is placed by the CSS class `cls` (offsets in px) */
  const anchored = (html, pos, cls) => {
    const obj = label('', pos, [0, 0, 0], { cls: `${anchorClass} ${cls}` });
    const span = document.createElement('span');
    span.className = anchoredClass;
    span.innerHTML = html;
    obj.element.append(span);
    return obj;
  };

  /** remove and dispose of everything drawn (geometries, materials, label elements) */
  function clear() {
    for (const obj of [...root.children]) {
      root.remove(obj);
      obj.traverse((x) => {
        x.geometry?.dispose();
        if (x.material) { viewer.lineMaterials.delete(x.material); x.material.dispose(); }
        if (x.element) x.element.remove();
      });
    }
  }

  /** the default view again, with view angle fov (degrees) and the box centre shown offset [dx, dy] px from the image
   * centre (x right, y down) in an image of size px */
  function frame({ fov, offset, size }) {
    viewer.resetView();
    viewer.camera.fov = fov;
    viewer.camera.setViewOffset(size, size, -offset[0], -offset[1], size, size);
    viewer.camera.updateProjectionMatrix();
  }

  /** the plot label's HTML, centred dx px right of the picture's centre */
  function setPlotLabel(html, dx = 0) {
    plotLabelEl.innerHTML = html;
    plotLabelEl.style.left = `calc(50% + ${dx}px)`;
  }

  return {
    viewer, root, plotLabelEl, lines, anchored, clear, frame, setPlotLabel,
    inkFraction: () => inkFraction(viewer.renderer),
    cameraPosition: () => viewer.camera.position.toArray(),
  };
}
