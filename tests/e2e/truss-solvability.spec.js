// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/truss-solvability.spec.js — browser tests of the "Determine If a Truss Can Be Solved" page (attribution,
// start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js; the errata switch in
// errata-mode.spec.js). Review screenshots at the snapshot settings (compare: docs/original-snapshots/truss-solvability-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/truss-solvability/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/truss-solvability.original-states.json', 'utf8'));
const visible = (page, id) => page.getByTestId(id).filter({ visible: true });

test.describe('truss-solvability', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['truss', 'supports', 'reactions', 'loads', 'counts']) await expect(page.getByTestId(id), id).toHaveCount(1);
    await expect(page.getByTestId('graphic')).toContainText('16 variables');
    await expect(page.getByTestId('graphic')).toContainText('solvable');
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toMatchObject(fx.specs);
    await expect(page.getByTestId('check-ADTR')).toBeChecked();
    await expect(page.getByTestId('check-labels')).not.toBeChecked();
    for (const n of ['SA', 'SB', 'SF']) await expect(visible(page, `setter-${n}-1`)).toHaveCount(1);
  });

  test('the support at B: unchecking it hides joint B\'s setter bar and renames the last joint E', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.locator('#controls')).toContainText('joint F');
    await page.getByTestId('check-ADTR').click();
    await expect(visible(page, 'setter-SB-1')).toHaveCount(0);
    await expect(page.getByTestId('graphic')).toContainText('11 members');
    await visible(page, 'setter-SF-2').click();
    expect((await state(page)).SF).toBe(2);
    expect(await view(page)).toMatchObject({ reactions: 3, variables: 14, equations: 14 });
    await expect(page.getByTestId('graphic')).toContainText('RE, x');
  });

  test('a setter bar changes the count and the verdict', async ({ page }) => {
    await openDemo(page, URL);
    await visible(page, 'setter-SA-2').click();
    await expect.poll(async () => (await view(page)).verdict).toBe('indeterminate');
    await expect(page.getByTestId('graphic')).toContainText('statically indeterminate');
    await page.getByTestId('check-labels').click();
    await expect(page.getByTestId('joint-labels')).toHaveCount(1);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const expected = { 1: 16, 2: 15, 3: 14, 4: 17 };
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      expect((await view(page)).variables, `snapshot ${k}`).toBe(expected[k]);
      await reviewShot(page, testInfo, `truss-solvability-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ ADTR: false, labels: true, SA: 2, SF: 2 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
