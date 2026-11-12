// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rob Lockhart
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/forward-kinematics.spec.js — browser tests of the "Forward Kinematics" page (attribution, start-up notice, UI
// inventory and bundle are in site.spec.js and bundle.spec.js; the errata switch in errata-mode.spec.js). Review
// screenshots at the snapshot settings (compare: docs/original-snapshots/forward-kinematics-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/forward-kinematics/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const tableText = (page) => page.evaluate(() => window.__demo.tableText());
const plain = (v) => JSON.parse(JSON.stringify(v), (k, x) => (x && typeof x === 'object' && !Array.isArray(x) && typeof x.wl === 'string' && 'n' in x ? x.n : x));
const fx = plain(JSON.parse(fs.readFileSync('tests/golden/forward-kinematics.original-states.json', 'utf8')));
/** a saved setting (angles in radians, nπ/32) as the port's state (the integers n) */
const settings = (s) => ({ T1: Math.round((s.T1 * 32) / Math.PI), T2: Math.round((s.T2 * 32) / Math.PI), T3: Math.round((s.T3 * 32) / Math.PI), T4: Math.round((s.T4 * 32) / Math.PI), FT: s.FT });
// the first row of each matrix as the snapshot pictures show it (docs/original-snapshots/forward-kinematics-k.png)
const FIRST_ROWS = {
  1: [['1', '0', '0', '0'], ['sin(3π/16)', '0', '-cos(3π/16)', '0'], ['0', '0', '1', '20'], ['cos(7π/32)', '0', '-sin(7π/32)', '20']],
  2: [['1', '0', '0', '0'], ['sin(7π/32)', '0', '-cos(7π/32)', '0'], ['sin(π/8)', '0', 'cos(π/8)', '20'], ['sin(3π/32)', '0', '-cos(3π/32)', '20']],
  3: [['-cos(π/16)', 'sin(π/16)', '0', '0'], ['-cos(7π/32)', '0', '-sin(7π/32)', '0'], ['sin(7π/32)', '0', 'cos(7π/32)', '20'], ['sin(π/32)', '0', '-cos(π/32)', '20']],
  4: [['1', '0', '0', '0'], ['0', '0', '-1', '0'], ['0', '0', '1', '20'], ['1', '0', '0', '20']],
};

test.describe('forward-kinematics', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas')).toBeVisible();
    expect(await page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.005);
    for (let k = 0; k < 4; k++) await expect(page.getByTestId(`matrix-${k}`)).toBeVisible();
    await expect(page.getByTestId('table-header')).toHaveText('local rotation matrix');
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toMatchObject({ T1: 0, T2: 10, T3: -16, T4: 7, FT: false });
    await expect(page.getByTestId('check-FT')).not.toBeChecked();
    for (const n of ['T1', 'T2', 'T3', 'T4']) await expect(page.getByTestId(`slider-${n}`)).toBeVisible();
  });

  test('a control changes the picture', async ({ page }) => {
    await openDemo(page, URL);
    const before = JSON.stringify(await view(page));
    await page.getByTestId('slider-T2').focus();
    await page.keyboard.press('ArrowRight'); // one step of the π/32 grid in every browser
    await expect.poll(async () => (await state(page)).T2).toBe(11);
    await expect.poll(async () => JSON.stringify(await view(page))).not.toBe(before);
    expect((await tableText(page))[1][1][0]).toEqual(['sin(5π/32)', '0', '-cos(5π/32)', '0']);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), settings(fx.snapshots[k]));
      const t = await tableText(page);
      expect(t.map(([, m]) => m[0]), `snapshot ${k}`).toEqual(FIRST_ROWS[k]);
      expect((await view(page)).framesShown).toBe(fx.snapshots[k].FT);
      await reviewShot(page, testInfo, `forward-kinematics-snapshot-${k}`);
    }
  });

  test('show frames draws the 15 frame arrows', async ({ page }) => {
    await openDemo(page, URL);
    const ink0 = await page.evaluate(() => window.__demo.inkFraction());
    await page.getByTestId('check-FT').check();
    await expect.poll(async () => (await view(page)).framesShown).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(ink0);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ T1: 34, T2: 25, T3: -9, T4: 15, FT: true }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
