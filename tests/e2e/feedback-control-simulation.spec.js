// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Nasser M. Abbasi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/feedback-control-simulation.spec.js — browser tests of the "Simulation of Feedback Control System with Controller and Second-Order Plant" page (attribution, start-up notice, UI inventory and
// bundle are in site.spec.js and bundle.spec.js; the errata switch, where there is one, in errata-mode.spec.js). Review
// screenshots at the snapshot settings (compare: docs/original-snapshots/feedback-control-simulation-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/feedback-control-simulation/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const plain = (v) => JSON.parse(JSON.stringify(v), (k, x) => (x && typeof x === 'object' && !Array.isArray(x) && typeof x.wl === 'string' && 'n' in x ? x.n : x));
const fx = plain(JSON.parse(fs.readFileSync('tests/golden/feedback-control-simulation.original-states.json', 'utf8')));
const SKIP = new Set(['tick', 'del', 'finalPlot', 'plant', 'controller', 'feedBack', 'lowerGrid', 'bodePlot', 'stepResponsePlot', 'nyquistPlot', 'needToUpdateSystem']);
const settings = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !SKIP.has(k)));

test.describe('feedback-control-simulation', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['step-plot', 'bode-magnitude', 'bode-phase', 'nyquist-plot', 'legend']) await expect(page.getByTestId(id).first(), id).toBeAttached();
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    const s = await state(page);
    for (const [k, v] of Object.entries({ controllerType: 'PID', propertional: 10, integral: 3.73, derivative: 0.697, zeta: 0.77, wn: 1, dcGain: 1, simulationTime: 20, delta: 0.2, showPlantResponse: true, currentTime: 0, doSimulation: false })) expect(s[k], k).toEqual(v);
  });

  test('a control changes the picture', async ({ page }) => {
    await openDemo(page, URL);
    const before = JSON.stringify(await view(page));
    await page.getByTestId('slider-zeta').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page))['zeta']).toBeCloseTo(0.78, 9);
    await expect.poll(async () => JSON.stringify(await view(page))).not.toBe(before);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), settings(fx.snapshots[k]));
      const v = await view(page);
      expect(v.poles).toHaveLength(3);
      await reviewShot(page, testInfo, `feedback-control-simulation-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ controllerType: 'PI', zeta: 0.3, doSimulation: false }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });

  test('run animates the masses and stop resets the time', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('button-run').click();
    await expect.poll(async () => (await state(page)).currentTime, { timeout: 10000 }).toBeGreaterThan(1);
    await page.getByTestId('button-stop').click();
    await expect.poll(async () => (await state(page)).currentTime).toBe(0);
    expect((await state(page)).doSimulation).toBe(false);
  });

  test('the controller type enables I and D', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('popup-controllerType').selectOption('P');
    await expect(page.getByTestId('slider-integral')).toBeDisabled();
    await expect(page.getByTestId('slider-derivative')).toBeDisabled();
    await page.getByTestId('popup-controllerType').selectOption('PD');
    await expect(page.getByTestId('slider-derivative')).toBeEnabled();
    expect((await view(page)).stable).toBe(true);
  });
});
