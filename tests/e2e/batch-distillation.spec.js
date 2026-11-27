// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Neil Hendren and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/batch-distillation.spec.js — browser tests of the "Batch Distillation" page (attribution, start-up notice,
// UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo } from './helpers.js';

const URL = '/demos/batch-distillation/';
const golden = JSON.parse(fs.readFileSync('tests/golden/batch-distillation.original-states.json', 'utf8'));
const saved = (s) => ({ ...s, xb: s.xb?.sym === 'z' ? s.z : s.xb });
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());

test.describe('batch-distillation', () => {
  test('loads without errors and draws the still, the flask and the labels of snapshot 1', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['still-liquid', 'still-surface', 'coil', 'receiver', 'thermometer', 'label-T', 'label-still', 'label-vapor', 'arrow-vapor', 'inset-1']) {
      await expect(page.getByTestId(id)).toHaveCount(1);
    }
    await expect(page.getByTestId('label-T')).toContainText('86.4° C');
    await expect(page.getByTestId('label-still')).toContainText('0.50');
    await expect(page.getByTestId('label-vapor')).toContainText('0.74');
    expect((await view(page)).labels).toEqual({ T: '86.4° C', still: '0.50', stillMol: '1.00 mol', vapor: '0.74', receiver: '0.74', receiverMol: '0.00 mol' });
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-z')).toHaveValue('0.5');
    await expect(page.getByTestId('value-molesToEvap')).toHaveValue('0.1');
    await expect(page.getByTestId('popup-az')).toHaveValue('0');
    await expect(page.getByTestId('radio-graph-1')).toBeChecked();
    await expect(page.getByTestId('trigger-play-evapProg')).toBeEnabled();
    await expect(page.getByTestId('button-reset-flasks')).toBeEnabled();
    const s = await state(page);
    expect([s.stage, s.evapProg, s.inProg, s.boilDry]).toEqual([1, 0, false, false]);
  });

  test('the display buttons show the x–y and the T–x–y plots (snapshots 2 and 4)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('popup-az').selectOption({ label: 'minimum boiling azeotrope' });
    await page.getByTestId('radio-graph-2').check();
    await expect(page.getByTestId('inset-2')).toHaveCount(1);
    await expect(page.getByTestId('xy-point')).toHaveCount(1);
    await expect(page.getByTestId('label-T')).toContainText('81.9° C');
    await page.evaluate((s) => window.__demo.setState(s), saved(golden.snapshots[4]));
    await expect(page.getByTestId('inset-3')).toHaveCount(1);
    await expect(page.getByTestId('bubble-point')).toHaveCount(1);
    await expect(page.getByTestId('dew-point')).toHaveCount(1);
    expect((await view(page)).labels.T).toBe('86.9° C');
  });

  test('click to collect fills a flask in 4 s, sets it aside and moves to the next stage', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('trigger-play-evapProg').click();
    // while it runs the controls of the still are disabled and the button reset too
    await expect.poll(async () => (await state(page)).inProg).toBe(true);
    await expect(page.getByTestId('slider-z')).toBeDisabled();
    await expect(page.getByTestId('popup-az')).toBeDisabled();
    await expect(page.getByTestId('button-reset-flasks')).toBeDisabled();
    await expect.poll(async () => (await state(page)).stage, { timeout: 8000 }).toBe(2);
    const s = await state(page);
    expect(s.evapProg).toBe(0);
    expect(s.flasksMol[0]).toBe(0.1);
    expect(s.flasksFrac[0]).toBeCloseTo(0.733, 3);
    await expect(page.getByTestId('flask-1')).toHaveCount(1);
    await expect(page.getByTestId('flask-label-1')).toContainText('0.10 mol');
    await expect(page.getByTestId('label-still')).toContainText('0.90 mol');
    // after the first flask z and the mixture are fixed; the amount and reset are free again
    await expect(page.getByTestId('slider-z')).toBeDisabled();
    await expect(page.getByTestId('popup-az')).toBeDisabled();
    await expect(page.getByTestId('slider-molesToEvap')).toBeEnabled();
    await expect(page.getByTestId('button-reset-flasks')).toBeEnabled();
  });

  test('reset empties the flasks; at 0.2 mol left the collection is disabled', async ({ page }) => {
    await openDemo(page, URL);
    const flasks = Array(10).fill(0);
    for (let k = 0; k < 8; k++) flasks[k] = 0.1;
    await page.evaluate((s) => window.__demo.setState(s), { stage: 9, flasksMol: flasks, flasksFrac: [0.73, 0.71, 0.68, 0.64, 0.6, 0.54, 0.46, 0.35, 0, 0] });
    await expect.poll(async () => (await state(page)).inProg).toBe(true);
    await expect(page.getByTestId('trigger-play-evapProg')).toBeDisabled();
    await expect(page.getByTestId('label-still')).toContainText('0.20 mol');
    await expect(page.getByTestId('flask-8')).toHaveCount(1);
    await page.getByTestId('button-reset-flasks').click();
    await expect.poll(async () => (await state(page)).stage).toBe(1);
    await expect(page.getByTestId('trigger-play-evapProg')).toBeEnabled();
    await expect(page.getByTestId('flask-1')).toHaveCount(0);
    expect((await view(page)).labels.stillMol).toBe('1.00 mol');
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ z: 0.3, az: 3, graph: 3, stage: 2, flasksMol: [0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
