// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Stephen Wilkerson, Frank A. Wattenberg and Russell Park
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/solar-energy-earth-surface.spec.js — browser tests of the "Solar Energy Incident on Earth's Surface" page
// (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js; the errors switch's
// scenario in errata-mode.spec.js). Expected values are computed here from the original's formula, independently of the
// page's code.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/solar-energy-earth-surface/';
const saved = JSON.parse(fs.readFileSync('tests/golden/solar-energy-earth-surface.original-states.json', 'utf8'));
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());

/** energy[latitude, hour, season] of the original, written out: 1367.6 Max[0, sun . tilt . rotate . point] */
function energy(lat, hour, season) {
  const e = 0.408, a = (2 * Math.PI * (hour - 12 + season * 24)) / 24, p = (lat * Math.PI) / 180;
  const q = [Math.cos(a) * Math.cos(p), Math.sin(a) * Math.cos(p), Math.sin(p)]; // rotateEarth . point
  const n = [Math.cos(e) * q[0] + Math.sin(e) * q[2], q[1], -Math.sin(e) * q[0] + Math.cos(e) * q[2]]; // tiltEarth . q
  return 1367.6 * Math.max(0, Math.cos(2 * Math.PI * season) * n[0] + Math.sin(2 * Math.PI * season) * n[1]);
}
/** the point of the energy plot (Show[…, Graphics[{PointSize[Large], Point[{h, energy[lat, h, sea]}]}]]) */
const plotPoint = (page) => page.evaluate(() => {
  const find = (x) => (Array.isArray(x) ? x.map(find).find(Boolean) : x && x.head === 'Point' ? x.pts[0] : null);
  return find(window.__demo.graphics(1).list.at(-1));
});

test.describe('solar-energy-earth-surface', () => {
  test('loads without errors and draws the globe, the two plots and the legend', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.1);
    await expect(page.getByTestId('plot-energy')).toBeVisible();
    await expect(page.getByTestId('plot-total')).toBeVisible();
    await expect(page.getByTestId('legend')).toHaveText(/equator\s*latitude\s*north pole/);
    await expect(page.getByTestId('plot-energy')).toContainText('energy');
    await expect(page.getByTestId('plot-energy')).toContainText('time (hr)');
    await expect(page.getByTestId('plot-total')).toContainText('watts/m');
    // the globe's colour where the sphere faces the viewer (lit light blue): blue the strongest channel
    const rgb = await page.evaluate(() => window.__demo.pixelAt([0.35, -0.85, -0.2]));
    expect(rgb[2]).toBeGreaterThan(rgb[0] + 30);
    await reviewShot(page, testInfo, 'solar-energy-earth-surface-opening');
  });

  test("has its controls with their defaults (the notebook's live state)", async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-sea')).toHaveValue('0');
    await expect(page.getByTestId('value-lat')).toHaveValue('51.4789');
    await expect(page.getByTestId('value-h')).toHaveValue('12');
    expect(await state(page)).toMatchObject(saved.states[0]);
    const v = await view(page);
    expect(v.energyAt.latitude).toBeCloseTo(energy(51.47885, 12, 0), 6);
    expect(v.eng).toHaveLength(25);
    const p = await plotPoint(page);
    expect(p[0]).toBe(12);
    expect(p[1]).toBeCloseTo(1206.37, 1);
  });

  test('dragging the season slider with the mouse moves the Sun and changes the energies', async ({ page }) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('slider-sea').boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 4, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, y, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).sea).toBeGreaterThan(0.4);
    const { sea } = await state(page);
    expect(sea).toBeLessThan(0.6);
    const v = await view(page);
    expect(v.sun[0]).toBeCloseTo(Math.cos(2 * Math.PI * sea), 9);
    expect(v.energyAt.northPole).toBeCloseTo(energy(90, 12, sea), 6);
    expect(v.energyAt.equator).toBeCloseTo(energy(0, 12, sea), 6);
  });

  test('a click on the latitude slider and arrow keys on the time slider move the point of the energy plot', async ({ page }) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('slider-lat').boundingBox();
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height / 2);
    await expect.poll(async () => (await state(page)).lat).toBeLessThan(35);
    const { lat } = await state(page);
    expect(lat).toBeGreaterThan(10);
    await page.getByTestId('slider-h').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).h).toBeLessThan(12);
    const { h } = await state(page);
    await expect.poll(async () => (await plotPoint(page))[0]).toBe(h);
    expect((await plotPoint(page))[1]).toBeCloseTo(energy(lat, h, 0), 6);
  });

  test('typed values in the fields set the variables', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('value-h').fill('6.5');
    await page.getByTestId('value-h').press('Enter');
    await page.getByTestId('value-sea').fill('0.25');
    await page.getByTestId('value-sea').press('Enter');
    await expect.poll(async () => (await state(page)).sea).toBe(0.25);
    expect((await state(page)).h).toBe(6.5);
    const v = await view(page);
    expect(v.energyAt.latitude).toBeCloseTo(energy(51.47885, 6.5, 0.25), 6);
    expect(v.energyAt.northPole).toBeCloseTo(0, 6); // equinox: the Sun on the pole's horizon
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ sea: 0.6, lat: 80, h: 3, errata: 'corrected' }));
    await page.getByTestId('reset').click();
    await expect.poll(() => state(page)).toEqual(opening);
    await expect(page.getByTestId('value-lat')).toHaveValue('51.4789');
    await expect(page.getByTestId('setter-errata-original')).toHaveAttribute('aria-pressed', 'true');
  });

  /** the checks at snapshot k's settings (tests/golden/…original-states.json) */
  const atSnapshot = async (page, testInfo, k) => {
    const s = saved.snapshots[k];
    await openDemo(page, URL);
    await page.evaluate((st) => window.__demo.setState(st), s);
    await expect.poll(async () => (await state(page)).h).toBe(s.h);
    const v = await view(page);
    expect(v.energyAt.latitude).toBeCloseTo(energy(s.lat, s.h, s.sea), 6);
    expect(v.energyAt.equator).toBeCloseTo(energy(0, s.h, s.sea), 6);
    expect(v.energyAt.northPole).toBeCloseTo(energy(90, s.h, s.sea), 6);
    const p = await plotPoint(page);
    expect(p[1]).toBeCloseTo(energy(s.lat, s.h, s.sea), 6);
    // the marked point is drawn half a turn away (sea + .5, Q-SE-01): the energy there is that of h + 12
    const sunDotDrawn = v.drawnAt[0] * v.sun[0] + v.drawnAt[1] * v.sun[1];
    expect(1367.6 * Math.max(0, sunDotDrawn)).toBeCloseTo(energy(s.lat, s.h + 12, s.sea), 6);
    expect(await page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.1);
    await reviewShot(page, testInfo, `solar-energy-earth-surface-snapshot-${k}`);
  };
  test('snapshot 1 settings: the energies, the point and the drawn arrows', async ({ page }, testInfo) => atSnapshot(page, testInfo, '1'));
  test('snapshot 2 settings: the energies, the point and the drawn arrows', async ({ page }, testInfo) => atSnapshot(page, testInfo, '2'));
  test('snapshot 3 settings: the energies, the point and the drawn arrows', async ({ page }, testInfo) => atSnapshot(page, testInfo, '3'));
  test('snapshot 4 settings: the energies, the point and the drawn arrows', async ({ page }, testInfo) => atSnapshot(page, testInfo, '4'));

  test('the errors switch: corrected draws the point where its energy is computed and sums 24 hours', async ({ page }) => {
    await openDemo(page, URL);
    const kept = await view(page);
    await page.getByTestId('setter-errata-corrected').click();
    await expect.poll(async () => (await view(page)).eng.length).toBe(24);
    const fixed = await view(page);
    // at noon the corrected point faces the Sun: sun . point = cos(φ − 0.408)
    expect(fixed.drawnAt[0]).toBeCloseTo(Math.cos((51.47885 * Math.PI) / 180 - 0.408), 6);
    expect(kept.drawnAt[0]).toBeLessThan(0);
    expect(fixed.totals.northPole).toBeCloseTo(24 * 1367.6 * Math.sin(0.408), 3);
    await expect(page.getByTestId('errata-details')).toContainText('E-SE-04');
  });
});
