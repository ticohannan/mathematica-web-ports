// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Stephen Wilkerson, Frank A. Wattenberg and Russell Park
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/solar-energy-earth-surface.test.js — the model of "Solar Energy Incident on Earth's Surface". Expected
// values come from hand derivations (noon at the solstice: 1367.6 cos(φ − ε)), from an independent computation with the
// solar declination and hour angle (written here, sharing no code with the port), and from the notebook's saved states.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { initialState, evaluate, energy, normal, sun, hourly, SPECS, TILT, SOLAR, LEGEND } from '../../demos/solar-energy-earth-surface/model.js';
import { CORRECTIONS } from '../../demos/solar-energy-earth-surface/errata-mode.js';
import { flatten, apply4 } from '../../shared/graphics3d.js';

const saved = JSON.parse(fs.readFileSync('tests/golden/solar-energy-earth-surface.original-states.json', 'utf8'));
const rad = (deg) => (deg * Math.PI) / 180;

/**
 * Independent: the Sun's direction in the Earth's frame (axis = z before the tilt) has declination δ and right ascension
 * α; the point at latitude φ on the meridian turned by the Earth's rotation angle r has hour angle H = r − α, and
 * cos(zenith) = sin φ sin δ + cos φ cos δ cos H (spherical astronomy). The tilt ε turns the axis towards the Sun's
 * season-0 direction, so sin δ = sin ε cos λ and α = atan2(sin λ, cos ε cos λ) with λ = 2π season.
 */
function irradiance(latDeg, hour, season, eps = TILT) {
  const lam = 2 * Math.PI * season;
  const sinDec = Math.sin(eps) * Math.cos(lam);
  const dec = Math.asin(sinDec);
  const ra = Math.atan2(Math.sin(lam), Math.cos(eps) * Math.cos(lam));
  const r = (2 * Math.PI * (hour - 12 + 24 * season)) / 24;
  const phi = rad(latDeg);
  const cosZ = Math.sin(phi) * sinDec + Math.cos(phi) * Math.cos(dec) * Math.cos(r - ra);
  return 1367.6 * Math.max(0, cosZ);
}
/** the lines of a 2D plot's Graphics data, by colour: { 'r,g,b': [[x, y], …] } */
const partsOf = (list) => list.flatMap((x) => (Array.isArray(x) && x.every(Array.isArray) ? partsOf(x) : [x]));
function linesByColour(g) {
  const out = {};
  for (const part of partsOf(g.list)) {
    if (!Array.isArray(part)) continue;
    const colours = part.filter((d) => d && d.dir === 'color');
    const line = part.find((d) => d && d.head === 'Line');
    if (line && colours.length) out[colours.at(-1).rgb.join(',')] = line.pts;
  }
  return out;
}
const RED = '1,0,0', BLACK = '0,0,0', BLUE = '0,0,1';

describe('solar-energy-earth-surface model', () => {
  it("the opening state is the notebook's live state and its initial settings", () => {
    expect(initialState()).toEqual(saved.states[0]);
    expect(initialState()).toEqual(saved.specs);
    expect(SPECS).toEqual({ sea: 0, lat: 51.47885, h: 12 });
  });

  it('noon at the summer solstice: 1367.6 cos(φ − 0.408) at latitude φ, 1367.6 sin 0.408 at the pole', () => {
    for (const lat of [0, 23.5, 51.47885, 66.5]) expect(energy(lat, 12, 0)).toBeCloseTo(SOLAR * Math.cos(rad(lat) - TILT), 9);
    expect(energy(0, 12, 0)).toBeCloseTo(1255.3422, 3);
    expect(energy(51.47885, 12, 0)).toBeCloseTo(1206.3723, 3);
    for (const t of [0, 5.5, 12, 23]) expect(energy(90, t, 0)).toBeCloseTo(1367.6 * Math.sin(0.408), 9);
  });

  it('energy agrees with the declination and hour-angle formula at 200 random settings', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 200; i++) {
      const lat = 90 * rnd(), h = 24 * rnd(), sea = rnd();
      expect(energy(lat, h, sea)).toBeCloseTo(irradiance(lat, h, sea), 8);
    }
  });

  it('equinox (season 0.25): the equator gets the full 1367.6 at noon and the pole nothing', () => {
    expect(energy(0, 12, 0.25)).toBeCloseTo(1367.6, 9);
    expect(energy(90, 12, 0.25)).toBeCloseTo(0, 9);
    expect(sun(0.25)[1]).toBeCloseTo(1, 15);
  });

  it('the season term keeps solar noon near 12 h all year (within the ±10 min of the obliquity), N-SE-02', () => {
    for (const sea of [0, 0.1, 0.125, 0.3, 0.5, 0.62, 0.875]) {
      // the hour of the maximum at the equator, by golden-section search
      let a = 6, b = 18;
      for (let k = 0; k < 80; k++) {
        const m1 = b - (b - a) * 0.618, m2 = a + (b - a) * 0.618;
        if (energy(0, m1, sea) > energy(0, m2, sea)) b = m2; else a = m1;
      }
      expect(Math.abs((a + b) / 2 - 12)).toBeLessThan(10.5 / 60);
    }
  });

  it('the tables: 25 hourly values t = 0 … 24 and their running sums (Q-SE-05)', () => {
    const { view } = evaluate(initialState());
    expect(view.eng).toHaveLength(25);
    expect(view.eng[12]).toBeCloseTo(energy(51.47885, 12, 0), 12);
    expect(view.aeng.at(-1)).toBeCloseTo(view.eng.reduce((s, x) => s + x, 0), 9);
    // the pole at the solstice: 25 equal values, midnight counted twice
    expect(view.totals.northPole).toBeCloseTo(25 * 1367.6 * Math.sin(0.408), 6);
    expect(view.totals.northPole).toBeCloseTo(13565.71, 1);
    // the equator: the day's sum of 1255.34 cos(2π(t − 12)/24) over the hours with the Sun up
    let eq = 0;
    for (let t = 0; t <= 24; t++) eq += Math.max(0, 1367.6 * Math.cos(0.408) * Math.cos((2 * Math.PI * (t - 12)) / 24));
    expect(view.totals.equator).toBeCloseTo(eq, 6);
  });

  it('the energy plot: three curves red (equator), black (latitude), blue (pole) and the point at the time of day', () => {
    const { graphics } = evaluate({ sea: 0.798, lat: 23.5, h: 16.55 });
    const plt = graphics[1];
    expect(plt.options.PlotRange[1]).toEqual([0, 1400]);
    const lines = linesByColour(plt);
    const at = (pts, x) => pts.reduce((best, p) => (Math.abs(p[0] - x) < Math.abs(best[0] - x) ? p : best));
    expect(at(lines[RED], 12)[1]).toBeCloseTo(energy(0, at(lines[RED], 12)[0], 0.798), 9);
    expect(at(lines[BLACK], 12)[1]).toBeCloseTo(energy(23.5, at(lines[BLACK], 12)[0], 0.798), 9);
    expect(at(lines[BLUE], 3)[1]).toBeCloseTo(irradiance(90, at(lines[BLUE], 3)[0], 0.798), 8);
    const pt = partsOf(plt.list).at(-1).find((d) => d.head === 'Point');
    expect(pt.pts[0][0]).toBe(16.55);
    expect(pt.pts[0][1]).toBeCloseTo(irradiance(23.5, 16.55, 0.798), 8);
    expect(pt.pts[0][1]).toBeCloseTo(498.53, 1); // snapshot 4: the black point at about 500
    expect(LEGEND).toEqual(['equator', 'latitude', 'north pole']);
  });

  it('the accumulated plot draws the latitude in red and the equator in black, x = 1 … 25 (Q-SE-03)', () => {
    const { graphics, view } = evaluate(initialState());
    const lines = linesByColour(graphics[2]);
    expect(lines[RED].map((p) => p[0])).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(lines[RED].at(-1)[1]).toBeCloseTo(view.totals.latitude, 9);
    expect(lines[BLACK].at(-1)[1]).toBeCloseTo(view.totals.equator, 9);
    expect(lines[BLUE].at(-1)[1]).toBeCloseTo(view.totals.northPole, 9);
    // snapshot 1: the red curve ends near 12 000, the black near 9 500, the blue near 13 600
    expect(view.totals.latitude).toBeCloseTo(11969.26, 1);
    expect(view.totals.equator).toBeCloseTo(9535.27, 1);
  });

  it('the point, the normal and the Sun arrow are drawn with sea + .5: 12 hours away from the plotted energy (Q-SE-01)', () => {
    const { view, graphics } = evaluate(initialState());
    // tilt . rotate[h, sea + .5] . point = normal at h + 12
    normal(51.47885, 24, 0).forEach((x, k) => expect(view.drawnAt[k]).toBeCloseTo(x, 12));
    // at noon the drawn point faces away from the Sun although its energy is the day's maximum
    expect(view.drawnAt[0] * view.sun[0] + view.drawnAt[1] * view.sun[1]).toBeLessThan(-0.2);
    expect(view.energyAt.latitude).toBeCloseTo(1206.37, 2);
    const prims = flatten(graphics[0]);
    const sphere = prims.find((p) => p.type === 'sphere');
    expect(sphere.radius).toBe(0.02);
    sphere.centers[0].forEach((x, k) => expect(x).toBeCloseTo(view.drawnAt[k], 12));
    const [black, red] = prims.filter((p) => p.type === 'arrow');
    black.points[1].forEach((x, k) => expect(x).toBeCloseTo(1.3 * view.drawnAt[k], 12));
    red.points[1].forEach((x, k) => expect(x).toBeCloseTo(view.drawnAt[k] + 0.5 * view.sun[k], 12));
    expect(red.color).toEqual([1, 0, 0]);
  });

  it('the globe: a plain sphere, a 24 × 9 mesh, the night half at x ≤ 0, poles, tropics and polar circles', () => {
    const { graphics, view } = evaluate({ sea: 0.798, lat: 23.5, h: 16.55 });
    const prims = flatten(graphics[0]);
    const surfaces = prims.filter((p) => p.type === 'parametricSurface');
    expect(surfaces).toHaveLength(2);
    const [earth, night] = surfaces;
    expect(earth.opacity).toBe(1);
    expect(earth.texture).toBeUndefined();
    expect(night.opacity).toBe(0.7);
    expect(night.color).toEqual([0.3, 0.3, 0.3]);
    for (const [v, u] of [[0.3, -1.2], [1.5, 0], [2.9, 1.5]]) {
      const q = night.matrix ? apply4(night.matrix, night.f(v, u)) : night.f(v, u);
      expect(q[0]).toBeLessThanOrEqual(1e-12);
    }
    // the mesh: 24 meridians and 9 parallels, the equator one of them
    const lines = prims.filter((p) => p.type === 'line');
    const mesh = lines.filter((p) => p.opacity < 1);
    expect(mesh).toHaveLength(33);
    // the pole tubes along the tilted axis
    const tubes = prims.filter((p) => p.type === 'tube');
    expect(tubes.map((t) => t.color)).toEqual([[0, 0, 1], [0, 1, 0]]);
    const axis = view.rotvec1.map((row) => row[2]);
    tubes[0].points[1].forEach((x, k) => expect(x).toBeCloseTo(1.2 * axis[k], 12));
    // the Arctic circle: polar angle 23.5° from the axis
    const arctic = lines.find((p) => p.opacity === 1 && p.color?.join() === '0,0,1' && p.thickness === 'Large' && p.points.length > 100);
    const c = arctic.points[17];
    expect(c[0] * axis[0] + c[1] * axis[1] + c[2] * axis[2]).toBeCloseTo(Math.cos(rad(23.5)), 12);
  });

  it('the axis tilt 0.408 rad is 23.38°, the circles are drawn at 23.5° (E-SE-08)', () => {
    expect((TILT * 180) / Math.PI).toBeCloseTo(23.377, 3);
    // at the drawn Tropic of Cancer the noon Sun at the solstice is 0.12° from the zenith
    expect(energy(23.5, 12, 0) / SOLAR).toBeCloseTo(Math.cos(rad(23.5 - 23.377)), 5);
    expect(1 - energy(23.5, 12, 0) / SOLAR).toBeLessThan(3e-6);
  });

  it("the snapshots' settings give the values their pictures show", () => {
    const want = { 1: [1206.37, 1255.34, 542.63], 2: [0, 0, 542.63], 3: [868.43, 711.03, 542.63], 4: [498.53, 473.53, 161.18] };
    for (const [k, s] of Object.entries(saved.snapshots)) {
      const { view } = evaluate(s);
      const [lat, eq, pole] = want[k];
      expect(view.energyAt.latitude).toBeCloseTo(lat, 1);
      expect(view.energyAt.equator).toBeCloseTo(eq, 1);
      expect(view.energyAt.northPole).toBeCloseTo(pole, 1);
    }
  });
});

describe('corrected mode (E-SE)', () => {
  const C = (s) => ({ ...s, errata: 'corrected' });
  it('lists E-SE-01 … E-SE-04', () => {
    expect(CORRECTIONS.map((c) => c.id)).toEqual(['E-SE-01', 'E-SE-02', 'E-SE-03', 'E-SE-04']);
  });
  it('E-SE-01: the point and its arrows are drawn where the energy is computed', () => {
    const { view } = evaluate(C(initialState()));
    normal(51.47885, 12, 0).forEach((x, k) => expect(view.drawnAt[k]).toBeCloseTo(x, 12));
    // at noon it faces the Sun: sun · normal = cos(φ − ε)
    expect(view.drawnAt[0]).toBeCloseTo(Math.cos(rad(51.47885) - 0.408), 12);
  });
  it('E-SE-02: the night half covers the side turned away from the Sun', () => {
    for (const sea of [0, 0.25, 0.5, 0.798]) {
      const { graphics } = evaluate(C({ sea, lat: 30, h: 7 }));
      const night = flatten(graphics[0]).filter((p) => p.type === 'parametricSurface')[1];
      const s = sun(sea);
      for (const [v, u] of [[0.3, -1.2], [1.5, 0], [2.9, 1.5], [1.2, 0.7]]) {
        const q = night.matrix ? apply4(night.matrix, night.f(v, u)) : night.f(v, u);
        expect(q[0] * s[0] + q[1] * s[1] + q[2] * s[2]).toBeLessThanOrEqual(1e-12);
      }
    }
    // kept: at season 0.5 the night half covers the sunlit side
    const kept = flatten(evaluate({ sea: 0.5, lat: 30, h: 7 }).graphics[0]).filter((p) => p.type === 'parametricSurface')[1];
    expect(kept.f(1.5, 0)[0] * sun(0.5)[0]).toBeGreaterThan(0.9);
  });
  it("E-SE-03: the accumulated plot uses the legend's colours (equator red, latitude black)", () => {
    const { graphics, view } = evaluate(C(initialState()));
    const lines = linesByColour(graphics[2]);
    expect(lines[RED].at(-1)[1]).toBeCloseTo(view.totals.equator, 9);
    expect(lines[BLACK].at(-1)[1]).toBeCloseTo(view.totals.latitude, 9);
  });
  it("E-SE-04: the day's sum runs over the 24 hours 0 … 23 (the pole: 24 × 542.63 = 13 023.1)", () => {
    const { view } = evaluate(C(initialState()));
    expect(view.eng).toHaveLength(24);
    expect(hourly(90, 0, true)).toHaveLength(24);
    expect(view.totals.northPole).toBeCloseTo(24 * 1367.6 * Math.sin(0.408), 6);
    expect(view.totals.northPole).toBeCloseTo(13023.08, 1);
    // where midnight is dark nothing changes
    expect(view.totals.latitude).toBeCloseTo(evaluate(initialState()).view.totals.latitude, 9);
  });
  it('kept is the default: a state without errata, and errata "original", give the values of the original', () => {
    const a = evaluate(initialState()).view, b = evaluate({ ...initialState(), errata: 'original' }).view;
    expect(b).toEqual(a);
    expect(a.eng).toHaveLength(25);
  });
});
