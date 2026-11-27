// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Sergio Hannibal Mejía and Simon Lorimer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/planetary-atmosphere-single-layer.spec.js — browser tests of the "Single-Layer Model for Planetary
// Atmospheres" page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo } from './helpers.js';

const URL = '/demos/planetary-atmosphere-single-layer/';
const golden = JSON.parse(fs.readFileSync('tests/golden/planetary-atmosphere-single-layer.original-states.json', 'utf8'));
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const text = (page, id) => page.getByTestId(id).textContent();

test.describe('planetary-atmosphere-single-layer', () => {
  test('loads without errors and draws the planet, the arrows, the numbers and the plot', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['space', 'layer-air', 'ground', 'cloud-layer', 'arrow-sun', 'arrow-reflected', 'arrow-transmitted', 'arrow-planet',
      'arrow-planet-up', 'arrow-layer-up', 'arrow-layer-down', 'num-S', 'num-planet', 'label-distance', 'label-units', 'label-Tp', 'label-Ta', 'point-Tp']) {
      await expect(page.getByTestId(id)).toHaveCount(1);
    }
    expect(await text(page, 'label-Tp')).toContain('286 K = 13 °C');
    expect(await text(page, 'num-planet')).toContain('381');
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-alpha')).toHaveValue('0.3');
    await expect(page.getByTestId('value-eps')).toHaveValue('0.742');
    await expect(page.getByTestId('value-d')).toHaveValue('1');
    await expect(page.getByTestId('setter-planet-1')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('check-reset')).not.toBeChecked();
    await expect(page.getByTestId('setter-scale-DegreesCelsius')).toHaveAttribute('aria-pressed', 'true');
  });

  test('the emissivity slider moves the temperature along the curve', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('value-eps').fill('0.852');
    await page.getByTestId('value-eps').press('Enter');
    await expect.poll(() => text(page, 'label-Tp')).toContain('293 K = 20 °C');
    expect(await text(page, 'label-Ta')).toContain('246 K = −27 °C');
  });

  test('Mars with reset takes the Mars presets; Earth sets the distance back to 1', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-planet-2').click();
    await page.getByTestId('check-reset').click();
    await expect.poll(async () => (await state(page))['ϵ']).toBe(0.3);
    expect((await state(page))['α']).toBe(0.25);
    await expect(page.getByTestId('check-reset')).not.toBeChecked(); // the body sets reset back to False
    // a typed 1.52 goes to the slider's step 0.1: d = 1.5 (D-AT-03; the snapshot's 1.52 is set through its Settings)
    await page.getByTestId('value-d').fill('1.52');
    await page.getByTestId('value-d').press('Enter');
    await expect.poll(() => text(page, 'label-Tp')).toContain('221 K = −53 °C');
    await page.getByTestId('setter-planet-1').click();
    await expect.poll(async () => (await state(page)).d).toBe(1);
    await expect(page.getByTestId('value-d')).toHaveValue(/^1\.?$/); // the field shows the slider's real 1.
  });

  test('the scale shows degrees Fahrenheit', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-scale-DegreesFahrenheit').click();
    await expect.poll(() => text(page, 'label-Tp')).toContain('286 K = 56 °F');
  });

  test('the snapshot settings show the snapshots temperatures', async ({ page }) => {
    await openDemo(page, URL);
    const want = { 3: '219 K = −54 °C', 4: '113 K = −160 °C', 5: '113 K = −160 °C' };
    for (const [k, tp] of Object.entries(want)) {
      await page.evaluate((st) => window.__demo.setState(st), golden.snapshots[k]);
      await expect.poll(() => text(page, 'label-Tp')).toContain(tp);
    }
    expect((await view(page)).planet).toBe('my own');
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ 'α': 0.6, 'ϵ': 0.1, planet: 4, d: 7, scale: 'DegreesFahrenheit' }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
