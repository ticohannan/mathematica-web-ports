// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original (ECE 6311 Lecture 22 notebook) by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/potential-fields.test.js — the model of "Artificial Potential Fields": the two potentials against hand-derived values,
// the four tabs' initial settings against the notebook's stored specs, and the contour tab against Tico's screenshots
// of it in Mathematica (tests/golden/potential-fields.screenshot-contours.json: levels and the colour of 800 points)
// and the notebook's own older saved contour picture (tests/golden/potential-fields.saved-contour.json).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  Uatt, Urep, Ucombined, initialStates, TABS, automaticZRange, automaticContours, bandColor, contourColor, switchLine,
  evaluateAttractive, evaluateRepulsive, evaluateCombined, evaluateContour, exclusionCircles, CONTOUR_GRADIENT,
  UrepAll, RHO0_FIXED,
} from '../../demos/potential-fields/model.js';

const golden = JSON.parse(readFileSync(new URL('../golden/potential-fields.original-states.json', import.meta.url), 'utf8'));
const saved = JSON.parse(readFileSync(new URL('../golden/potential-fields.saved-contour.json', import.meta.url), 'utf8'));
const shots = JSON.parse(readFileSync(new URL('../golden/potential-fields.screenshot-contours.json', import.meta.url), 'utf8'));
// the notebook's states (obs, and obs2 in the last two Manipulates; ρ0 = 2 fixed there) as the port's (a list of obstacles)
const fromNotebook = (st) => {
  const { obs2, ...rest } = st;
  return obs2 ? { ...rest, obs: [st.obs, obs2], 'ρ0': RHO0_FIXED } : { ...rest, obs: [st.obs] };
};

describe('the potentials', () => {
  it('Uatt: quadratic inside d, conic beyond, continuous with equal slopes at d', () => {
    expect(Uatt(0, 0, 1, 1)).toBe(0);
    expect(Uatt(0.6, 0.8, 2, 1)).toBeCloseTo(1, 14); // ½·2·1 at dist = d = 1
    expect(Uatt(3, 4, 2, 1)).toBeCloseTo(9, 14); // d ζ (5 − ½) = 1·2·4.5
    const d = 1.3, z = 0.7, e = 1e-7;
    expect(Uatt(d + e, 0, z, d) - Uatt(d - e, 0, z, d)).toBeCloseTo(0, 6);
    expect((Uatt(d + 2 * e, 0, z, d) - Uatt(d + e, 0, z, d)) / e).toBeCloseTo(z * d, 4); // slope ζ d on both sides
    expect((Uatt(d - e, 0, z, d) - Uatt(d - 2 * e, 0, z, d)) / e).toBeCloseTo(z * d, 4);
  });
  it('Urep: ½ η (1/ρ − 1/ρ0)² inside ρ0, 0 beyond, Infinity at the obstacle', () => {
    expect(Urep(-1, 2, -1, 1, 10, 2)).toBeCloseTo(0.5 * 10 * (1 - 0.5) ** 2, 14); // ρ = 1
    expect(Urep(1, 1, -1, 1, 10, 2)).toBe(0); // ρ = ρ0: (1/2 − 1/2)² = 0
    expect(Urep(3, 3, -1, 1, 10, 2)).toBe(0);
    expect(Urep(-1, 1, -1, 1, 10, 2)).toBe(Infinity);
  });
  it('the sum of the last two tabs uses η = 1 and ρ0 = 2', () => {
    const s = { di: 1, 'ζi': 1, obs: [[-1, 1], [2, 0]], 'ρ0': 2 };
    expect(Ucombined(s)(0, 1)).toBeCloseTo(Uatt(0, 1, 1, 1) + 0.5 * (1 - 0.5) ** 2, 14); // obs2 is √5 > ρ0 away: 0
    expect(Ucombined(s)(1, 0)).toBeCloseTo(Uatt(1, 0, 1, 1) + 0.5 * (1 - 0.5) ** 2, 14); // obs √5 away, obs2 at 1
    // ρ_0 from the slider: with ρ_0 = 3 the second obstacle (√5 away) also counts
    expect(Ucombined({ ...s, 'ρ0': 3 })(0, 1)).toBeCloseTo(Uatt(0, 1, 1, 1) + 0.5 * (1 - 1 / 3) ** 2 + 0.5 * (1 / Math.sqrt(5) - 1 / 3) ** 2, 14);
  });
  it('any number of obstacles: their Urep add up (none: 0)', () => {
    const obs = [[-1, 1], [1, -1], [0, 2]];
    expect(UrepAll(0.5, 0.5, obs, 10, 2)).toBeCloseTo(obs.reduce((u, [a, b]) => u + Urep(0.5, 0.5, a, b, 10, 2), 0), 14);
    expect(UrepAll(0.5, 0.5, [], 10, 2)).toBe(0);
    const one = { di: 1, 'ζi': 1, obs: [[-1, 1]], 'ρ0': 2 };
    expect(Ucombined(one)(0, 1)).toBeCloseTo(Uatt(0, 1, 1, 1) + Urep(0, 1, -1, 1, 1, 2), 14);
  });
});

describe('the four tabs and their initial settings', () => {
  it('the notebook order and titles', () => {
    expect(TABS.map((t) => t.key)).toEqual(['att', 'rep', 'comb', 'cont']);
    expect(TABS.map((t) => t.label)).toEqual(['Attractive Potential', 'Repulsive Potential', 'Attractive+Repulsive Potential', 'Attractive+Repulsive Potential']);
  });
  it('the opening states are the initial values of each Manipulate', () => {
    expect(initialStates.att()).toEqual(golden.specs); // {di: 1, ζi: 1}, the first Manipulate's stored "Variables"
    expect(initialStates.rep()).toEqual(fromNotebook(golden.states[4])); // its saved state = its initial values
    // the last two: the notebook's variables (obs and obs2 as one list) and the added ρ_0 at the notebook's fixed 2
    const keys = (o) => Object.keys(o).sort();
    expect(keys(initialStates.comb())).toEqual(keys(fromNotebook(golden.states[5])));
    expect(keys(initialStates.cont())).toEqual(keys(fromNotebook(golden.states[6])));
    for (const k of ['comb', 'cont']) expect(initialStates[k]()).toMatchObject({ obs: [[-1, 1], [-1, 1]], 'ρ0': 2 });
  });
});

describe('the 3D tabs', () => {
  it('attractive: the switch line is the circle dist = d at height ζ d²/2, 65 points', () => {
    const pts = switchLine(1.5, 2);
    expect(pts).toHaveLength(65);
    for (const [x, y, z] of pts) { expect(Math.hypot(x, y)).toBeCloseTo(1.5, 12); expect(z).toBeCloseTo(2.25, 12); }
    const { view } = evaluateAttractive({ di: 1, 'ζi': 1 });
    expect(view.box[2][0]).toBe(0);
    expect(view.box[2][1]).toBeCloseTo(4 * Math.SQRT2 - 0.5, 12); // the corner: d ζ (4√2 − d/2)
    expect(view.switchHeight).toBe(0.5);
  });
  it('repulsive: the z range of the notebook, the surface cut at 10 (no hole at the pole)', () => {
    const { view, graphics } = evaluateRepulsive(initialStates.rep());
    expect(view.box[2]).toEqual([-0.1, 10]);
    const caps = graphics.content.filter((p) => p.prim === 'plotSurface');
    expect(caps).toHaveLength(2); // the surface and its light top
    expect(caps[1].triangles.length).toBeGreaterThan(0);
    const [gap] = graphics.content.filter((p) => p.prim === 'line'); // the excluded circle dist = ρ0, in white
    expect(gap.points).toHaveLength(129);
    for (const [x, y, z] of gap.points) { expect(Math.hypot(x + 1, y - 1)).toBeCloseTo(2, 12); expect(z).toBeCloseTo(0, 12); }
    const three = evaluateRepulsive({ ...initialStates.rep(), obs: [[-2, 2], [2, 2], [0, -2]] }).graphics;
    expect(three.content.filter((p) => p.prim === 'line')).toHaveLength(3); // one white circle per obstacle
  });
  it('attractive + repulsive: the d_i circle in red, the rho_0 circles in white, and the switch line', () => {
    const s = { di: 1.5, 'ζi': 1, obs: [[1, 1], [-2, 0]], 'ρ0': 2.5 };
    expect(exclusionCircles(s)).toEqual([{ c: [0, 0], r: 1.5, kind: 'd' }, { c: [1, 1], r: 2.5, kind: 'rho' }, { c: [-2, 0], r: 2.5, kind: 'rho' }]);
    const { view, graphics } = evaluateCombined(s);
    // the colour in force for each line: the last colour directive before it
    let colour = null; const drawn = [];
    for (const p of graphics.content) { if (p.prim === 'line') drawn.push(colour); else if (p.directive === 'color') colour = p.value; }
    expect(drawn).toHaveLength(4); // two ρ_0 circles, the d_i circle, the switch line
    expect(drawn.map((c) => JSON.stringify(c))).toEqual([...Array(2).fill(JSON.stringify(drawn[0])), ...Array(2).fill(JSON.stringify(drawn[2]))]);
    expect(drawn[0]).toEqual([1, 1, 1]); // White
    expect(drawn[2]).toEqual([1, 0, 0]); // Red
    expect(view.switchHeight).toBeCloseTo(1.125, 14);
  });
});

describe('the contour tab against the screenshots of Mathematica', () => {
  const levelsOf = (pic) => {
    const zr = automaticZRange(Ucombined(fromNotebook(pic.state)));
    expect(automaticContours(zr)).toEqual(pic.levels);
    expect(evaluateContour(fromNotebook(pic.state)).view.levels).toEqual(pic.levels);
  };
  const coloursOf = (pic) => {
    const f = Ucombined(fromNotebook(pic.state)), zr = automaticZRange(f), levels = automaticContours(zr);
    let worst = 0, n = 0;
    for (const { xy, rgb } of pic.samples) {
      const v = f(...xy);
      if (levels.some((c) => Math.abs(v - c) < 0.03 * (levels[1] - levels[0]))) continue; // on or next to a contour line
      n++;
      const c = bandColor(v, levels, zr);
      expect(c, `point ${xy}`).not.toBeNull();
      worst = Math.max(worst, ...c.map((x, i) => Math.abs(x * 255 - rgb[i])));
    }
    expect(n).toBeGreaterThan(350);
    expect(worst).toBeLessThan(6); // in 0 … 255 (D-PF-06)
  };
  const [initial, saved2] = shots.pictures;
  it('initial settings: the automatic contour levels of the screenshot', () => levelsOf(initial));
  it('initial settings: every sampled point has the band colour of the screenshot', () => coloursOf(initial));
  it('saved state 2: the automatic contour levels of the screenshot', () => levelsOf(saved2));
  it('saved state 2: every sampled point has the band colour of the screenshot', () => coloursOf(saved2));
  it('the default state: the top of the range near 7.2, between the last level and the next', () => {
    const [z0, z1] = automaticZRange(Ucombined(initialStates.cont()));
    expect(z0).toBeCloseTo(0.0303, 3); // the minimum of the sum
    expect(z1).toBeGreaterThan(7);
    expect(z1).toBeLessThan(7.5);
  });
  it('the notebook older saved picture: its seven levels are the lowest levels of the port', () => {
    // saved with an older Mathematica (other colours, a top of 1.55 where the port's rule gives 1.64, N-PF-02)
    const zr = automaticZRange(Ucombined(fromNotebook(saved.state)));
    expect(automaticContours(zr).slice(0, saved.levels.length)).toEqual(saved.levels);
    expect(zr[0]).toBeCloseTo(saved.zRange[0], 2);
    expect(Math.abs(zr[1] - saved.zRange[1])).toBeLessThan(0.1);
  });
  it('the gradient passes through the stored band colours, from dark purple to light orange', () => {
    for (const [t, c] of CONTOUR_GRADIENT) contourColor(t).forEach((v, i) => expect(v).toBeCloseTo(c[i], 12));
    expect(contourColor(-1)).toEqual(CONTOUR_GRADIENT[0][1]);
    expect(contourColor(2)).toEqual(CONTOUR_GRADIENT[CONTOUR_GRADIENT.length - 1][1]);
    for (let k = 1; k < CONTOUR_GRADIENT.length; k++) expect(CONTOUR_GRADIENT[k][0]).toBeGreaterThan(CONTOUR_GRADIENT[k - 1][0]);
  });
  it('the contour plot: the rho_0 circles white, the d_i circle red, one rho_0 circle per obstacle', () => {
    const s = { ...initialStates.cont(), obs: [[-2, 2], [2, 2], [0, -2]], 'ρ0': 1.5 };
    const epi = JSON.stringify(evaluateContour(s).graphics);
    expect(epi).toContain('exclusions-rho');
    expect(epi).toContain('exclusions-d');
    expect(evaluateContour(s).view.levels.length).toBeGreaterThan(3);
  });
  it('values above the range (and the poles) are white, values below it the lowest band', () => {
    const zr = [0, 1], levels = [0.5];
    expect(bandColor(2, levels, zr)).toBeNull();
    expect(bandColor(Infinity, levels, zr)).toBeNull();
    expect(bandColor(-1, levels, zr)).toEqual(bandColor(0.1, levels, zr));
  });
  it('a smooth function keeps its whole range; contour steps of 1, 2 or 5 × 10^k', () => {
    expect(automaticZRange((x, y) => x + y)).toEqual([-8, 8]);
    expect(automaticContours([0.03, 5.16])).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
    expect(automaticContours([0, 1])).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);
  });
});

describe('the obstacle pad (no DOM)', () => {
  it('eight colours, the plot colours of Mathematica in order; Add picks a free spot', async () => {
    const { OBSTACLE_COLORS, MAX_OBSTACLES, nextSpot } = await import('../../demos/potential-fields/obstacle-pad.js');
    expect(MAX_OBSTACLES).toBe(8);
    expect(new Set(OBSTACLE_COLORS).size).toBe(8);
    expect(OBSTACLE_COLORS[0]).toBe('#5e81b5'); // ColorData[97][1] = RGBColor[0.368417, 0.506779, 0.709798]
    expect(nextSpot([[-1, 1], [-1, 1]])).toEqual([2, -2]);
    expect(nextSpot([[-1, 1], [2, -2]])).toEqual([-2, -2]);
    const full = [[2, -2], [-2, -2], [2, 2], [-2, 2], [0, -3], [3, 0], [0, 3], [-3, 0], [0, 0]];
    expect(nextSpot(full)).toEqual([0, 0]); // none free: the origin
  });
});
