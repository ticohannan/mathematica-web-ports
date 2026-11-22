// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alexander Perepelitsa
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/tesseract-perspective/picture3d.js — draws the tubes of the picture with CapForm and Specularity (browser
// only), through View3D's `draw` option (shared/graphics3d-view.js): View3D makes the viewer, the Neutral lights, the
// clipping planes of the explicit PlotRange and the SphericalRegion fit; this file draws the content (D-TT-01).
//   * Tube[{p1, p2}, r]: an open cylinder of radius r; CapForm["Round"] adds a sphere of radius r at each end (the
//     shared Tube has flat ends and no CapForm);
//   * the surface colour with Lighting -> "Neutral" and Specularity[s, n] (the shared renderer has no Specularity):
//       colour = min(1, c ⊙ (a + Σ dᵢ max(0, n·lᵢ)) + Σ_{n·lᵢ > 0} s ⊙ dᵢ max(0, n·hᵢ)^n)
//     c the surface colour, a the ambient light, dᵢ the directional lights of MMA_NEUTRAL_LIGHTS at their ImageScaled
//     positions (camera space, as shared/mma-lighting.js places them, the depth component scaled by LIGHT_DEPTH,
//     measured on the snapshots: D-TT-03), n the normal, hᵢ the half vector of lᵢ and the
//     direction to the eye — the model demos/dubins-reachability-3d/picture3d.js matched to its snapshots; computed on
//     the displayed colour values, which View3D's renderer outputs unencoded with this Lighting.
import { THREE } from '../../shared/three-helpers.js';
import { disposeGroup } from '../../shared/graphics3d-three.js';
import { MMA_NEUTRAL_LIGHTS, imageScaledDirection } from '../../shared/mma-lighting.js';
import { styledTubes } from './model.js';

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
uniform vec3 specColor;
uniform float shininess;
varying vec3 vN;
varying vec3 vView;
void main() {
  #include <clipping_planes_fragment>
  vec3 n = normalize(vN);
  vec3 v = normalize(vView);
  vec3 c = base * ambient;
  for (int i = 0; i < 3; i++) {
    float d = dot(n, lightDir[i]);
    if (d > 0.0) {
      c += base * lightColor[i] * d;
      c += specColor * lightColor[i] * pow(max(dot(normalize(lightDir[i] + v), n), 0.0), shininess);
    }
  }
  gl_FragColor = vec4(min(c, vec3(1.0)), 1.0);
}`;

/** The light directions' depth component scaled by 0.6, measured on the four snapshots (D-TT-03): with the shared
 *  directions (ImageScaled position minus the image centre) the tubes' sides come out lighter than in the snapshots
 *  (mean |error| 15 / 20 of 255 in red / blue on the tube pixels); with 0.6 it is 7 / 6 and the mean error about 0. */
export const LIGHT_DEPTH = 0.6;
/** unit camera-space direction toward a light at ImageScaled[{x, y, z}] */
export function lightDirection(imageScaled) {
  const [x, y, z] = imageScaledDirection(imageScaled);
  const h = Math.hypot(x, y, z * LIGHT_DEPTH);
  return [x / h, y / h, (z * LIGHT_DEPTH) / h];
}

const AMBIENT = MMA_NEUTRAL_LIGHTS.find((L) => L.kind === 'Ambient').color;
const DIRECTIONAL = MMA_NEUTRAL_LIGHTS.filter((L) => L.kind === 'Directional');

/** The material of a tube: colour `base`, Specularity `spec` ({ color, exponent } or null), clipping planes. */
export function tubeMaterial(base, spec, clippingPlanes) {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      base: { value: new THREE.Vector3(...base) },
      ambient: { value: new THREE.Vector3(...AMBIENT) },
      lightColor: { value: DIRECTIONAL.map((L) => new THREE.Vector3(...L.color)) },
      lightDir: { value: DIRECTIONAL.map((L) => new THREE.Vector3(...lightDirection(L.imageScaled))) },
      specColor: { value: new THREE.Vector3(...(spec ? spec.color : [0, 0, 0])) },
      shininess: { value: spec ? spec.exponent : 1 },
    },
    clipping: true,
    clippingPlanes: clippingPlanes ?? [],
  });
}

/** View3D `draw`: the tubes of the graphic into ctx.group (the previous drawing freed first). */
export function drawTubes(viewer, graphics, ctx) {
  disposeGroup(ctx.group, [viewer]);
  const materials = new Map();
  const sphere = new THREE.SphereGeometry(1, 32, 16);
  let usedSphere = false;
  for (const t of styledTubes(graphics)) {
    const key = JSON.stringify([t.color, t.specularity]);
    if (!materials.has(key)) materials.set(key, tubeMaterial(t.color, t.specularity, ctx.clip));
    const m = materials.get(key);
    for (let i = 0; i + 1 < t.points.length; i++) {
      const a = new THREE.Vector3(...t.points[i]), b = new THREE.Vector3(...t.points[i + 1]);
      const len = a.distanceTo(b);
      if (len === 0) continue;
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(t.radius, t.radius, len, 32, 1, true), m);
      cyl.position.copy(a.clone().add(b).multiplyScalar(0.5));
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      ctx.group.add(cyl);
    }
    // the joints of a polyline and, with CapForm["Round"], its two ends
    const at = t.capForm === 'Round' ? t.points : t.points.slice(1, -1);
    for (const q of at) {
      const s = new THREE.Mesh(sphere, m);
      s.position.set(...q);
      s.scale.setScalar(t.radius);
      ctx.group.add(s);
      usedSphere = true;
    }
  }
  if (!usedSphere) sphere.dispose();
}
