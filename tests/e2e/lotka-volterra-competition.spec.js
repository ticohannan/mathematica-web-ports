// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Richard Cangelosi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/lotka-volterra-competition.spec.js — browser tests of the "Lotka-Volterra Competition Model" page
// (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). Review screenshots
// at the snapshot settings (compare: docs/original-snapshots/lotka-volterra-competition-1…4.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/lotka-volterra-competition/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/lotka-volterra-competition.original-states.json', 'utf8'));
const KIND = { 1: 'coexistence', 2: 'coexistence', 3: 'exclusion', 4: 'bistable' };

test.describe('lotka-volterra-competition', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['stream-lines', 'stream-arrows', 'equilibria', 'u-nullcline', 'v-nullcline', 'axis-green', 'axis-brown', 'plot-label']) {
      await expect(page.getByTestId('graphic').getByTestId(id)).toHaveCount(1);
    }
    await expect(page.getByTestId('phase-svg')).toBeVisible();
    await expect(page.getByTestId('time-svg')).toBeVisible();
    await expect(page.getByTestId('graphic').getByTestId('plot-label')).toContainText('stable coexistence of competing species');
    expect((await view(page)).kind).toBe('coexistence');
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toEqual({ ...fx.specs, errata: 'original' }); // errata: the port's switch (A-LV-08)
    for (const [name, v] of Object.entries({ α: '0.63', β: '0.53', r1: '0.55', r2: '0.55', k1: '100', k2: '100' })) {
      await expect(page.getByTestId(`value-${name}`)).toHaveValue(v);
    }
    await expect(page.getByTestId('button-reset-button')).toHaveText('reset');
    await expect(page.locator('#controls')).toContainText('competition coefficients');
  });

  test('the time plot and its legend', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('time-legend')).toContainText('species 1');
    await expect(page.getByTestId('time-legend')).toContainText('species 2');
    await expect(page.getByTestId('graphic2').getByTestId('plot-label')).toContainText('percent of carrying capacity');
    const v = await view(page);
    expect(v.u120).toBeCloseTo(0.5555, 3);
    expect(v.v120).toBeCloseTo(0.7056, 3);
  });

  test('a keyboard step on a slider changes the picture', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-β').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).β).toBeCloseTo(0.54, 12);
    await expect.poll(async () => (await view(page)).yEq).toBeCloseTo(0.46 / (1 - 0.63 * 0.54), 9);
  });

  test('dragging the β slider with the mouse to the right end gives the exclusion case', async ({ page }) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('slider-β').boundingBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width + 30, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).β).toBeCloseTo(2, 12);
    await expect.poll(async () => (await view(page)).kind).toBe('exclusion');
    await expect(page.getByTestId('graphic').getByTestId('axis-arrows')).toHaveCount(1);
  });

  test('typing values gives the bistable case with separatrices and basins', async ({ page }) => {
    await openDemo(page, URL);
    for (const [name, v] of [['α', '1.45'], ['β', '1.4']]) {
      await page.getByTestId(`value-${name}`).fill(v);
      await page.getByTestId(`value-${name}`).press('Enter');
    }
    await expect.poll(async () => (await view(page)).kind).toBe('bistable');
    for (const id of ['basins', 'separatrices']) await expect(page.getByTestId('graphic').getByTestId(id)).toHaveCount(1);
    await expect(page.getByTestId('graphic').getByTestId('plot-label')).toContainText('pale blue - basin of attraction for species 2');
  });

  test('the reset button sets the original values', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('button-reset-button').click();
    await expect.poll(() => state(page)).toEqual({ α: 0.63, β: 0.53, r1: 0.15, r2: 0.15, k1: 120, k2: 120, errata: 'original' });
    await expect(page.getByTestId('value-k1')).toHaveValue('120');
    await expect(page.getByTestId('value-r2')).toHaveValue('0.15');
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ α: 1.45, β: 1.4, r1: 1.2 }));
    await expect.poll(async () => (await view(page)).kind).toBe('bistable');
    await page.getByTestId('reset').click();
    await expect.poll(() => state(page)).toEqual(opening);
    expect((await view(page)).kind).toBe('coexistence');
  });

  test('the four snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of ['1', '2', '3', '4']) {
      await page.evaluate((s) => window.__demo.setState(s), fx.snapshots[k]);
      await expect.poll(async () => (await view(page)).kind).toBe(KIND[k]);
      for (const [name, v] of Object.entries(fx.snapshots[k])) expect((await state(page))[name]).toBe(v);
      if (k === '4') {
        const v = await view(page);
        expect(v.xEq).toBeCloseTo(0.4369, 4);
        expect(v.yEq).toBeCloseTo(0.3883, 4);
      }
      await reviewShot(page, testInfo, `lotka-volterra-competition-snapshot-${k}`);
    }
  });
});
