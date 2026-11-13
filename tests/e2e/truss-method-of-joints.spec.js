// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/truss-method-of-joints.spec.js — browser tests of the "Method of Joints to Solve a Truss Problem" page
// (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js; the errata switch in
// errata-mode.spec.js). Review screenshots at the snapshot settings (compare: docs/original-snapshots/truss-method-of-joints-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/truss-method-of-joints/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/truss-method-of-joints.original-states.json', 'utf8'));
const visible = (page, id) => page.getByTestId(id).filter({ visible: true });

test.describe('truss-method-of-joints', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('truss')).toHaveCount(1);
    await expect(page.getByTestId('graphic')).toContainText('FC = 1 kN');
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toMatchObject(fx.specs);
    await expect(page.getByTestId('popup-opt').locator('option')).toHaveText(['truss', 'calculate moment', 'x-force balance', 'y-force balance', 'solved']);
    await expect(visible(page, 'setter-joints-1')).toHaveCount(0);
  });

  test('the popup menu steps through the reaction forces', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('popup-opt').selectOption({ label: 'y-force balance' });
    await expect.poll(async () => (await state(page)).opt).toBe(3);
    await expect(page.getByTestId('y-balance')).toContainText('RA = 0.50 kN');
    await page.getByTestId('popup-opt').selectOption({ label: 'calculate moment' });
    await expect(page.getByTestId('moment-balance')).toHaveCount(1);
  });

  test('balances at joints: a joint in focus shows its balances under the picture', async ({ page }) => {
    await openDemo(page, URL);
    await visible(page, 'setter-steps-2').click();
    await expect(page.getByTestId('joint-circle')).toHaveCount(1);
    await visible(page, 'setter-joints-2').click();
    await visible(page, 'check-focus').click();
    await expect.poll(async () => (await view(page)).showEquations).toBe(true);
    await expect(page.getByTestId('joint-B')).toHaveCount(1);
    await expect(page.getByTestId('equations')).toContainText('0.58 kN (compression)');
    await visible(page, 'setter-joints-5').click();
    await expect(visible(page, 'check-focus')).toHaveCount(0);
    await expect(page.getByTestId('member-forces')).toHaveCount(1);
    await expect(page.getByTestId('graphic2')).toHaveClass(/collapsed/);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      expect((await view(page)).RA, `snapshot ${k}`).toBe(0.5);
      await reviewShot(page, testInfo, `truss-method-of-joints-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ steps: 2, joints: 3, focus: true }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
