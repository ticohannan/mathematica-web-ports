// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dubins-reachability-3d/picture3d.js — the 3D picture where shared/graphics3d-view.js (View3D) draws differently
// from the original's snapshots (browser only). Workarounds reported to the lead; each is applied after View3D has drawn
// (Manipulate's `after`), changes only the three.js objects View3D made, and is undone by View3D's next drawing of them:
//   * theme lighting (D-D3-03): View3D lights every surface with Mathematica's default Lighting -> Automatic and has no
//     per-primitive Lighting or Specularity; Mathematica's plot theme gives each ParametricPlot3D surface its own lights
//     (model.js THEME_LIGHTING). The six surface meshes get this material:
//       colour = min(1, c ⊙ (a + Σ dᵢ max(0, n·lᵢ)) + Σ_{n·lᵢ > 0} dᵢ max(0, n·hᵢ)^s)
//     c the surface colour, a the ambient light, dᵢ the directional lights at their ImageScaled positions (camera space,
//     from the image centre, as shared/mma-lighting.js places them), n the normal (reversed on back faces: both sides
//     lit), hᵢ the half vector of lᵢ and the direction to the eye, s the Specularity exponent (white highlights; with
//     the half vector the colours of snapshots 1 and 3 are reproduced, with the reflection vector they are too dark);
//     computed on the displayed colour values, which View3D's renderer outputs unencoded;
//   * the box behind the content (D-D3-07): in the snapshots the box edges and axes are hidden wherever the surfaces
//     cover them, the front edges too; View3D depth-tests them. Its frame lines are drawn first and hide nothing;
//   * refit (D-D3-05): with an explicit PlotRange View3D fits the camera only once; Mathematica scales every new picture
//     to the image: when the plot range changes (r, t, the sphere), the camera is fitted again, keeping the user's view
//     direction.
import { THREE } from '../../shared/three-helpers.js';
import { fitViewer } from '../../shared/graphics3d-three.js';
import { THEME_LIGHTING, THEME_LIGHT_POSITIONS } from './model.js';

const VERTEX = /* glsl */ `
#include <clipping_planes_pars_vertex>
varying vec3 vN;
varying vec3 vView;
void main() {
  vN = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vView = -mvPosition.xyz;
  #include <clipping_planes_vertex>
  gl_Position = projectionMatrix * mvPosition;
}`;
const FRAGMENT = /* glsl */ `
#include <clipping_planes_pars_fragment>
uniform vec3 base;
uniform vec3 ambient;
uniform vec3 lightColor[3];
uniform vec3 lightDir[3];
uniform float shininess;
varying vec3 vN;
varying vec3 vView;
void main() {
  #include <clipping_planes_fragment>
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vView);
  vec3 c = base * ambient;
  for (int i = 0; i < 3; i++) {
    float d = dot(n, lightDir[i]);
    if (d > 0.0) {
      c += base * lightColor[i] * d;
      c += lightColor[i] * pow(max(dot(normalize(lightDir[i] + v), n), 0.0), shininess);
    }
  }
  gl_FragColor = vec4(min(c, vec3(1.0)), 1.0);
}`;

const DIRECTIONS = THEME_LIGHT_POSITIONS.map(([x, y, z]) => new THREE.Vector3(x - 0.5, y - 0.5, z).normalize());

/** The material of surface k (THEME_LIGHTING order) in colour `base`, with View3D's clipping planes. */
export function themeMaterial(k, base, clippingPlanes) {
  const L = THEME_LIGHTING[k];
  const m = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      base: { value: new THREE.Vector3(...base) },
      ambient: { value: new THREE.Vector3(...L.ambient) },
      lightColor: { value: L.directional.map((d) => new THREE.Vector3(...d)) },
      lightDir: { value: DIRECTIONS },
      shininess: { value: L.specularity },
    },
    side: THREE.DoubleSide,
    clipping: true,
    clippingPlanes: clippingPlanes ?? [],
  });
  m.userData.themeSurface = k;
  return m;
}

/**
 * The surfaces of View3D's plot group (the Group3D part; the curves and mesh lines there are Line2 objects, the surfaces
 * the meshes with a Lambert material, in SURFACE_COLORS order) get the theme material; a group already done is left
 * alone. Returns the number of surfaces changed.
 */
export function applyThemeLighting(group, surfaceColors, clippingPlanes) {
  if (!group) return 0;
  const surfaces = group.children.filter((o) => o.isMesh && o.material?.isMeshLambertMaterial);
  surfaces.forEach((mesh, k) => {
    const old = mesh.material;
    mesh.material = themeMaterial(k, surfaceColors[k], clippingPlanes);
    old.dispose();
  });
  return surfaces.length;
}

/** View3D's frame group (box edges, ticks; the scene's group that is not a content group) drawn first, hiding nothing. */
export function frameBehind(renderer) {
  let changed = 0;
  for (const g of renderer.viewer.scene.children) {
    if (!g.isGroup || renderer.groups.includes(g)) continue;
    g.traverse((o) => {
      if (!o.material || o.material.depthWrite === false) return;
      o.material.depthTest = false; o.material.depthWrite = false; o.renderOrder = -1; changed++;
    });
  }
  return changed;
}

const boxKey = (box) => box.map(([a, b]) => `${a.toFixed(6)},${b.toFixed(6)}`).join(';');

/**
 * The three adjustments for View3D renderer R after a drawing of the 3D picture: refit when the plot range changed since
 * the last call (the first drawing is View3D's own fit), theme lighting of a new plot, the frame behind the content.
 */
export function createAdjust3D({ surfaceColors, zoom }) {
  let fitted = null;
  return (R) => {
    if (!R.viewer || !R.box) return;
    const key = boxKey(R.box);
    if (fitted !== null && key !== fitted) fitViewer(R.viewer, { box: R.box, zoom });
    fitted = key;
    if (applyThemeLighting(R.groups[0], surfaceColors, R.clip) + frameBehind(R)) R.viewer.render();
  };
}
