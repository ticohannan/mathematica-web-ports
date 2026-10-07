// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/mma-lighting.js — Mathematica's documented default lighting (Lighting -> Automatic) for a three.js camera.
//
// Source: https://reference.wolfram.com/language/ref/Lighting.html — the default light sources are
//   {"Ambient", RGBColor[0.4, 0.2, 0.2]},
//   {"Directional", RGBColor[0, 0.18, 0.5], ImageScaled[{2, 0, 2}]},
//   {"Directional", RGBColor[0.18, 0.5, 0.18], ImageScaled[{2, 2, 3}]},
//   {"Directional", RGBColor[0.5, 0.18, 0], ImageScaled[{0, 2, 2}]},
//   {"Directional", RGBColor[0, 0, 0.18], ImageScaled[{0, 0, 2}]}.
// ImageScaled: {0, 0} is the bottom-left and {1, 1} the top-right corner of the image, z points toward the viewer.
// The lights are attached to the camera (they move with the view, as in Mathematica). Each directional light shines
// from its ImageScaled position toward the image centre ImageScaled[{1/2, 1/2, 0}] (an assumption about the anchor
// of the direction; the light colours and corners are as documented).
// Mathematica adds these colours in the displayed (sRGB) values: use it with
// renderer.outputColorSpace = THREE.LinearSRGBColorSpace and colours given as plain RGB triples.
// shared/three-helpers.js (used unchanged by the two rotation demos) has its own, different placement.
import * as THREE from 'three';

/** The default light sources, as documented. */
export const MMA_DEFAULT_LIGHTS = [
  { kind: 'Ambient', color: [0.4, 0.2, 0.2] },
  { kind: 'Directional', color: [0, 0.18, 0.5], imageScaled: [2, 0, 2] },
  { kind: 'Directional', color: [0.18, 0.5, 0.18], imageScaled: [2, 2, 3] },
  { kind: 'Directional', color: [0.5, 0.18, 0], imageScaled: [0, 2, 2] },
  { kind: 'Directional', color: [0, 0, 0.18], imageScaled: [0, 0, 2] },
];

/** Camera-space direction (x right, y up, z toward the viewer) of a light at ImageScaled[{x, y, z}]. */
export const imageScaledDirection = ([x, y, z]) => [x - 0.5, y - 0.5, z];

/**
 * Add Mathematica's default lights to `camera` (which must be in the scene). Existing lights attached to the
 * camera are removed first unless replace = false. Intensity π makes a Lambert surface reflect colour × cos(angle),
 * as Mathematica's lights do.
 */
export function addMathematicaLighting(camera, { replace = true, intensity = Math.PI } = {}) {
  if (replace) for (const o of [...camera.children]) if (o.isLight || o.userData.mmaLightTarget) camera.remove(o);
  // the target sits at the camera's origin, so each light shines along -imageScaledDirection(...) in camera space
  const target = new THREE.Object3D();
  target.userData.mmaLightTarget = true;
  camera.add(target);
  const lights = [];
  for (const L of MMA_DEFAULT_LIGHTS) {
    const color = new THREE.Color().setRGB(L.color[0], L.color[1], L.color[2], THREE.LinearSRGBColorSpace);
    let light;
    if (L.kind === 'Ambient') light = new THREE.AmbientLight(color, intensity);
    else {
      light = new THREE.DirectionalLight(color, intensity);
      light.position.set(...imageScaledDirection(L.imageScaled));
      light.target = target;
    }
    camera.add(light);
    lights.push(light);
  }
  return lights;
}
