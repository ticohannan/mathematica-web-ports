// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/mma-lighting.test.js — shared/mma-lighting.js (Mathematica's default Lighting -> Automatic in three.js);
// moved out of tests/unit/robot-singularities.test.js in v0.1.21 (it tests an MIT helper only).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MMA_DEFAULT_LIGHTS, addMathematicaLighting, imageScaledDirection } from '../../shared/mma-lighting.js';

describe('shared/mma-lighting.js', () => {
  it('mma-lighting: the documented default lights of Lighting -> Automatic', () => {
    // https://reference.wolfram.com/language/ref/Lighting.html
    expect(MMA_DEFAULT_LIGHTS).toEqual([
      { kind: 'Ambient', color: [0.4, 0.2, 0.2] },
      { kind: 'Directional', color: [0, 0.18, 0.5], imageScaled: [2, 0, 2] },
      { kind: 'Directional', color: [0.18, 0.5, 0.18], imageScaled: [2, 2, 3] },
      { kind: 'Directional', color: [0.5, 0.18, 0], imageScaled: [0, 2, 2] },
      { kind: 'Directional', color: [0, 0, 0.18], imageScaled: [0, 0, 2] },
    ]);
    expect(imageScaledDirection([0, 2, 2])).toEqual([-0.5, 1.5, 2]); // orange from the top left, toward the viewer
  });
  it('mma-lighting: replaces the lights of a camera with one ambient and four directional lights', () => {
    const cam = new THREE.PerspectiveCamera();
    cam.add(new THREE.AmbientLight(0xffffff, 1), new THREE.DirectionalLight(0xffffff, 1));
    addMathematicaLighting(cam);
    const lights = cam.children.filter((o) => o.isLight);
    expect(lights.map((l) => l.type)).toEqual(['AmbientLight', 'DirectionalLight', 'DirectionalLight', 'DirectionalLight', 'DirectionalLight']);
    expect(lights[4].color.toArray()).toEqual([0, 0, 0.18]);
    expect(lights[2].position.toArray()).toEqual([1.5, 1.5, 3]);
    expect(lights[1].intensity).toBeCloseTo(Math.PI, 14);
  });
});
