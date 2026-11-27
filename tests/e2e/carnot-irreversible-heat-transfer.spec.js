// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann, Megan Maguire and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/carnot-irreversible-heat-transfer.spec.js — browser tests of the "Carnot Cycles with Irreversible Heat
// Transfer" page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo } from './helpers.js';

const URL = '/demos/carnot-irreversible-heat-transfer/';
const golden = JSON.parse(fs.readFileSync('tests/golden/carnot-irreversible-heat-transfer.original-states.json', 'utf8'));
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const text = (page, id) => page.getByTestId(id).textContent();

test.describe('carnot-irreversible-heat-transfer', () => {
  test('loads without errors and draws the cycle, the reservoirs, the boxes and the labels', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['cycle-circle', 'cycle-strokes', 'arrow-work', 'hot-reservoir', 'cold-reservoir', 'box-work', 'box-QH',
      'label-W', 'label-performance', 'label-dStotal']) await expect(page.getByTestId(id)).toHaveCount(1);
    expect(await text(page, 'label-W')).toContain('−518. J');
    expect(await text(page, 'label-performance')).toContain('0.41');
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-dT1')).toHaveValue('10');
    await expect(page.getByTestId('value-dT2')).toHaveValue('12');
    await expect(page.getByTestId('setter-csb-1')).toHaveAttribute('aria-pressed', 'true');
  });

  test('the heat pump setter switches the cycle, the work box and the performance label', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-csb-2').click();
    await expect.poll(async () => (await state(page)).csb).toBe(2);
    expect(await text(page, 'label-performance')).toContain('COP');
    expect(await text(page, 'label-Qc')).toContain('−600. J');
    const v = await view(page);
    expect([v.Th, v.TH, v.TC]).toEqual([325, 335, 263]);
  });

  test('the arrow keys move a temperature difference in steps of 2', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-dT1').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page))['ΔT1']).toBe(12);
    expect((await view(page)).TH).toBe(488);
    await page.getByTestId('slider-dT2').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page))['ΔT2']).toBe(10);
    expect((await view(page)).TC).toBe(285);
  });

  test('the snapshot settings show the snapshots numbers', async ({ page }) => {
    await openDemo(page, URL);
    const want = { 1: ['−518. J', '0.16 J/K'], 2: ['−498. J', '0.23 J/K'], 3: ['236. J', '0.39 J/K'] };
    for (const [k, [w, s]] of Object.entries(want)) {
      await page.evaluate((st) => window.__demo.setState(st), golden.snapshots[k]);
      await expect.poll(() => text(page, 'label-W')).toContain(w);
      expect(await text(page, 'label-dStotal')).toContain(s);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ csb: 2, 'ΔT1': 40, 'ΔT2': 0 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
