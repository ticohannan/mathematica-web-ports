// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Ravi Patel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/unit-balls.golden.test.js — the port against the ORIGINAL notebook's saved state
// (tests/golden/unit-balls.original-state.json) and numbers read from its snapshot pictures
// (docs/original-snapshots/unit-balls-1…7.png; how they were measured: demos/unit-balls/DESIGN.md §6).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  INITIAL, plotLabelText, pText, setterSelection, sliderPosition, plotRange2D, padded, meshValues3D, unitBallSurface,
} from '../../demos/unit-balls/norms.js';

const saved = JSON.parse(fs.readFileSync('tests/golden/unit-balls.original-state.json', 'utf8')).state;

describe('unit-balls golden', () => {
  it('unit-balls: the saved state is the initial state of the port', () => {
    expect(saved).toEqual({ dimension: '3D', p: 0.5 });
    expect(INITIAL).toEqual(saved);
    expect(typeof INITIAL.p).toBe('number'); // 0.5 is a machine real, not the setter's exact 1/2
  });

  it('unit-balls: the saved p = 0.5 shows as in snapshot 1 (label 0.5-norm, button 1/2 selected, slider 0.5)', () => {
    expect(plotLabelText(saved.p)).toBe('0.5‐norm');
    expect(setterSelection(saved.p)).toBe('1/2');
    expect(pText(saved.p)).toBe('0.5');
    expect(sliderPosition(saved.p)).toBe(0.5);
  });

  it('unit-balls: plot labels and slider values of the snapshots', () => {
    // snapshots 2 (3D) — "1-norm", button 1, slider "1"; 3 and 6 — "2-norm", button 2, slider "2";
    // 4 and 7 — "∞-norm", button ∞, slider "∞" with the thumb at the left end
    for (const [p, label, button, slider] of [['1', '1‐norm', '1', '1'], ['2', '2‐norm', '2', '2'], ['Infinity', '∞‐norm', 'Infinity', '∞']]) {
      expect(plotLabelText(p)).toBe(label);
      expect(setterSelection(p)).toBe(button);
      expect(pText(p)).toBe(slider);
    }
    expect(sliderPosition('Infinity')).toBe(0.1);
  });

  it('unit-balls: plane height in the 2D snapshots matches the full-range rule', () => {
    // Height of the plane z = 1 as a fraction of the box height, measured at three corners of the blue plane in
    // snapshots 5 (p = 0.5), 6 (p = 2) and 7 (p = ∞) with the camera fitted to the box (mean of the corners).
    const measured = [[0.5, 0.181], ['2', 0.475], ['Infinity', 0.661]];
    for (const [p, frac] of measured) {
      const [lo, hi] = padded(plotRange2D(p)[2]);
      expect(Math.abs((1 - lo) / (hi - lo) - frac), String(p)).toBeLessThan(0.01);
    }
    // a range clipped at e.g. 4 for p = 0.5 would put the plane at about 0.25: not what the snapshot shows
    const [lo, hi] = padded([0, 4]);
    expect((1 - lo) / (hi - lo)).toBeGreaterThan(0.181 + 0.05);
  });

  it('unit-balls: the 3D snapshots show mesh lines at multiples of 1/8', () => {
    // positions of mesh lines measured along paths on the surfaces: snapshot 4, cube top face (x-lines; the
    // profile from -1 to 1 shows no line at the edges ±1); snapshot 2, octahedron face x - y + z = 1 (x-lines);
    // snapshot 3, sphere (x-lines near the front)
    const cube = [-0.873, -0.75, -0.623, -0.503, -0.376, -0.252, -0.122, -0.002, 0.125, 0.245, 0.369, 0.496, 0.623, 0.753, 0.876];
    const octahedron = [0.126, 0.252, 0.377, 0.501, 0.625, 0.75, 0.875];
    const sphere = [-0.001, 0.121, 0.247, 0.371, 0.501];
    const near = (m, vals) => Math.min(...vals.map((v) => Math.abs(v - m))) < 0.01;
    for (const m of [...octahedron, ...sphere]) expect(near(m, meshValues3D('2')), String(m)).toBe(true);
    // the cube: every measured line is a mesh value and every mesh value is a measured line (15 per direction)
    const vc = meshValues3D('Infinity');
    for (const m of cube) expect(near(m, vc), String(m)).toBe(true);
    for (const v of vc) expect(near(v, cube), String(v)).toBe(true);
  });

  it('unit-balls: the p = 0.5 star reaches the points ±1 on the axes, as the spikes in snapshot 1', () => {
    const { positions } = unitBallSurface(0.5);
    const tips = new Set();
    for (let i = 0; i < positions.length; i += 3) {
      const v = [positions[i], positions[i + 1], positions[i + 2]];
      if (v.filter((x) => x === 0).length === 2) tips.add(v.map((x) => x + 0).join(','));
    }
    expect([...tips].sort()).toEqual(['-1,0,0', '0,-1,0', '0,0,-1', '0,0,1', '0,1,0', '1,0,0'].sort());
  });
});
