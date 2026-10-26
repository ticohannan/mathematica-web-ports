// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Victor M. Baez and Nikhil Navkar
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/segment-distance.spec.js — browser tests of the "Shortest Distance between Two Line Segments" page (attribution, start-up notice, UI inventory and
// bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/segment-distance/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const plotLabel = (page) => page.getByTestId('plot-label');

test.describe('segment-distance', () => {
  test('loads without errors and draws the segments, the labels A–D and the PlotLabel', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas')).toBeVisible();
    expect(await page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.005);
    await expect(page.locator('[data-testid=text3d]')).toHaveText(['A', 'B', 'C', 'D']);
    await expect(plotLabel(page)).toHaveText('minimum distance is 5.51');
    const v = await view(page);
    expect(v.kind).toBe('skew');
    expect(v.planes).toEqual([true, true]);
  });
  test('has the controls of the original with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    for (const [n, x, y] of [['axy', -3, 3], ['bxy', 1, 1], ['cxy', -2, -4], ['dxy', 4, -2]]) {
      await expect(page.getByTestId(`pad-${n}`)).toBeVisible();
      await expect(page.getByTestId(`value-${n}-x`)).toHaveValue(String(x));
      await expect(page.getByTestId(`value-${n}-y`)).toHaveValue(String(y));
    }
    for (const [n, v] of [['az', 1], ['bz', 2], ['cz', -1], ['dz', -2]]) await expect(page.getByTestId(`vslider-${n}`)).toHaveValue(String(v));
    await expect(page.getByTestId('ctl-axy')).toContainText('Axy');
    await expect(page.getByTestId('ctl-az')).toContainText('Az');
    await expect(page.getByTestId('check-showPlaneAB')).toBeChecked();
    await expect(page.getByTestId('check-showPlaneCD')).toBeChecked();
    await expect(page.getByTestId('ctl-showPlaneAB')).toHaveText('show plane for AB');
  });
  test('a z slider moves by keyboard and the distance follows', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('vslider-az').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).az).toBe(5);
    expect((await view(page)).a).toEqual([-3, 3, 5]);
    await page.keyboard.press('Home');
    await expect.poll(async () => (await state(page)).az).toBe(-5);
    const d = (await view(page)).dist;
    await expect(plotLabel(page)).toHaveText(`minimum distance is ${Math.round(d * 100) / 100}`);
  });
  test('dragging in an xy pad with the mouse moves the point', async ({ page }) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('pad-bxy').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1, { steps: 4 });
    await page.mouse.up();
    const b = (await state(page)).bxy;
    expect(b[0]).toBeGreaterThan(3); expect(b[1]).toBeGreaterThan(3);
    expect((await view(page)).b).toEqual([b[0], b[1], 2]);
    await expect(plotLabel(page)).not.toHaveText('minimum distance is 5.51');
  });
  test('the plane checkboxes switch the planes', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('check-showPlaneAB').uncheck();
    await expect.poll(async () => (await view(page)).planes).toEqual([false, true]);
    await page.getByTestId('check-showPlaneCD').uncheck();
    await expect.poll(async () => (await view(page)).planes).toEqual([false, false]);
    expect((await state(page)).showPlaneAB).toBe(false);
  });
  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ axy: [5, 5], cz: 4, showPlaneCD: false }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.getByTestId('check-showPlaneCD')).toBeChecked();
    await expect(plotLabel(page)).toHaveText('minimum distance is 5.51');
  });
  test('review screenshots at the four snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/segment-distance.original-states.json', 'utf8'));
    const labels = { 1: '5.51', 2: '5.35', 3: '14.14', 4: '3.42' }; // read off the snapshot pictures
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      await expect(plotLabel(page)).toHaveText(`minimum distance is ${labels[k]}`);
      await reviewShot(page, testInfo, `segment-distance-snapshot-${k}`);
    }
  });
});
