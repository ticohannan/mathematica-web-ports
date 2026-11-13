// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/truss-method-of-sections.spec.js — browser tests of the "Method of Sections to Solve a Truss" page
// (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js; the errata switch in
// errata-mode.spec.js). Review screenshots at the snapshot settings (compare: docs/original-snapshots/truss-method-of-sections-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/truss-method-of-sections/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/truss-method-of-sections.original-states.json', 'utf8'));
const visible = (page, id) => page.getByTestId(id).filter({ visible: true });

test.describe('truss-method-of-sections', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['truss', 'calculate-moment', 'moment-balance']) await expect(page.getByTestId(id), id).toHaveCount(1);
    await expect(page.getByTestId('graphic')).toContainText('RG = 17.5 kN');
    await expect(page.getByTestId('graphic2')).toHaveClass(/collapsed/);
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toMatchObject(fx.specs);
    await expect(visible(page, 'setter-steps-1')).toHaveCount(1);
    await expect(visible(page, 'setter-opt-1')).toHaveCount(1);
    await expect(visible(page, 'setter-cuts-1')).toHaveCount(0);
    await expect(visible(page, 'check-zoom')).toHaveCount(0);
  });

  test('the moment balance explains itself under the pointer (Mouseover)', async ({ page }) => {
    await openDemo(page, URL);
    const m = page.getByTestId('moment-balance'); // the Mouseover group carries the annotation's test id
    await expect(m.locator('[data-role=mouseover-b]')).toBeHidden();
    await m.hover(); // the explanation replaces the equations while the pointer stays over it
    await expect(m.locator('[data-role=mouseover-b]')).toBeVisible();
    await expect(m.locator('[data-role=mouseover-b]')).toContainText('clockwise rotation');
    await page.mouse.move(2, 2);
    await expect(m.locator('[data-role=mouseover-a]')).toBeVisible();
    await m.focus(); // the keyboard reaches it too
    await expect(m.locator('[data-role=mouseover-b]')).toBeVisible();
  });

  test('making cuts: the cut setter, "make cut" and "solve moment" appear in turn; the equations go under the picture', async ({ page }) => {
    await openDemo(page, URL);
    await visible(page, 'setter-steps-2').click();
    await expect(page.getByTestId('cut-line')).toHaveCount(1);
    await visible(page, 'setter-cuts-3').click();
    await expect(visible(page, 'check-moment')).toHaveCount(0);
    await visible(page, 'check-zoom').click();
    await expect.poll(async () => (await view(page)).showEquations).toBe(true);
    await expect(page.getByTestId('graphic2')).not.toHaveClass(/collapsed/);
    await expect(page.getByTestId('equations')).toContainText('10.6 kN');
    await visible(page, 'check-moment').click();
    expect((await state(page)).moment).toBe(true);
    await visible(page, 'setter-cuts-7').click();
    await expect(page.getByTestId('graphic2')).toHaveClass(/collapsed/);
    await expect(page.getByTestId('member-forces')).toHaveCount(1);
  });

  test('a slider changes the angle and the forces', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ steps: 2, cuts: 1, zoom: true }));
    const before = (await view(page)).F0;
    await page.getByTestId('slider-h').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).h).toBeCloseTo(7.9, 9);
    expect((await view(page)).F0).not.toBe(before);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      expect((await view(page)).RG, `snapshot ${k}`).toBe(17.5);
      await reviewShot(page, testInfo, `truss-method-of-sections-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ steps: 2, cuts: 4, zoom: true, w: 7 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.getByTestId('graphic2')).toHaveClass(/collapsed/);
  });
});
