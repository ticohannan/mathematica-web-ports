// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Renuka Pakeetharan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/probabilistic-motion.spec.js — browser tests of the "Probabilistic Models for Robot Motion" page
// (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/probabilistic-motion/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/probabilistic-motion.original-states.json', 'utf8'));
const SLIDERS = ['θ', 'v', 'ω', 'α1', 'α2', 'α3', 'α4', 'α5', 'α6'];

test.describe('probabilistic-motion', () => {
  test('loads without errors and draws the opening picture: the density, the two robots, the path of the velocity model', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['density-raster', 'robot-start', 'robot-end', 'velocity-path', 'frame']) await expect(page.getByTestId(id)).toHaveCount(1);
    for (const id of ['samples', 'odometry-path', 'gap-cuts']) await expect(page.getByTestId(id)).toHaveCount(0);
    await expect(page.getByTestId('density-raster')).toHaveAttribute('data-width', '150'); // the 150 × 150 raster (D-PM-02)
    await expect(page.getByTestId('density-raster')).toHaveAttribute('data-height', '150');
    await expect(page.getByTestId('scene-svg')).toBeVisible();
    const v = await view(page);
    expect(v.mode).toBe('VelocityPDF');
    expect(v.nominal[0]).toBeCloseTo(1.27388, 4);
    expect(v.nominal[1]).toBeCloseTo(1.27287, 4);
  });
  test('has the controls of the original with their saved values', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('popup-mode')).toHaveValue('0');
    await expect(page.getByTestId('popup-mode').locator('option')).toHaveText(['VelocityPDF', 'VelocitySample', 'OdometryPDF', 'OdometrySample']);
    const shown = { θ: '0', v: '2', ω: '1.57', α1: '0.02', α2: '0.02', α3: '0.02', α4: '0.02', α5: '0.02', α6: '0.02' };
    for (const n of SLIDERS) {
      await expect(page.getByTestId(`value-${n}`)).toHaveValue(shown[n]);
      await expect(page.getByTestId(`slider-${n}`)).toBeEnabled();
    }
    const controls = page.locator('#controls');
    for (const t of ['mode', 'heading θ', 'linear velocity v', 'angular velocity ω', 'noise parameters']) await expect(controls).toContainText(t);
    await expect(controls.locator('.ctl-heading i')).toHaveText(['θ', 'v', 'ω']); // the letters in italics
    await expect(page.getByTestId('ctl-α1').locator('sub')).toHaveText('1');
    expect(await state(page)).toEqual(fx.states[0]);
  });
  test('the mode popup switches the picture; α5 and α6 are disabled in the odometry modes', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('popup-mode').selectOption({ label: 'OdometryPDF' });
    expect((await state(page)).mode).toBe('OdometryPDF');
    for (const id of ['density-raster', 'odometry-path', 'gap-cuts', 'gap-circle', 'gap-support-1', 'gap-support-2']) await expect(page.getByTestId(id)).toHaveCount(1);
    await expect(page.getByTestId('velocity-path')).toHaveCount(0);
    await expect(page.getByTestId('slider-α5')).toBeDisabled();
    await expect(page.getByTestId('slider-α6')).toBeDisabled();
    await page.getByTestId('popup-mode').selectOption({ label: 'OdometrySample' });
    await expect(page.getByTestId('samples').locator('circle')).toHaveCount(500);
    await expect(page.getByTestId('density-raster')).toHaveCount(0);
    await expect(page.getByTestId('slider-α5')).toBeDisabled();
    await page.getByTestId('popup-mode').selectOption({ label: 'VelocitySample' });
    await expect(page.getByTestId('samples').locator('circle')).toHaveCount(500);
    await expect(page.getByTestId('velocity-path')).toHaveCount(1);
    await expect(page.getByTestId('slider-α5')).toBeEnabled();
    await expect(page.getByTestId('slider-α6')).toBeEnabled();
    expect((await view(page)).samples.count).toBe(500);
  });
  test('a slider step by keyboard changes the picture: ω one step up moves the red robot', async ({ page }) => {
    await openDemo(page, URL);
    const before = (await view(page)).nominal;
    await page.getByTestId('slider-ω').focus();
    await page.keyboard.press('ArrowRight');
    // throttle 'frame': the variable changes at once, the body is evaluated on the next animation frame
    await expect.poll(async () => (await view(page)).nominal[2]).toBeCloseTo(1.571, 12);
    expect((await state(page)).ω).toBeCloseTo(1.571, 12);
    await expect(page.getByTestId('value-ω')).toHaveValue('1.571');
    expect((await view(page)).nominal[0]).not.toBeCloseTo(before[0], 6);
    // the heading: one step down from 0 gives −0.001, a machine real
    await page.getByTestId('slider-θ').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).θ).toBeCloseTo(-0.001, 12);
    await expect(page.getByTestId('value-θ')).toHaveValue('-0.001');
    // the ⊕ panel: one step back from v = 2
    await page.getByTestId('plus-v').click();
    await page.getByTestId('stepback-v').click();
    await expect.poll(async () => (await state(page)).v).toBeCloseTo(1.999, 12);
    await expect(page.getByTestId('value-v')).toHaveValue('1.999');
  });
  test('a typed value is taken; the samples are repeatable (SeedRandom[1]) and follow the noise sliders', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('popup-mode').selectOption({ label: 'VelocitySample' });
    await expect.poll(async () => (await view(page)).mode).toBe('VelocitySample'); // evaluated on the next frame
    const m0 = (await view(page)).samples.mean;
    await page.getByTestId('value-α1').fill('0.1');
    await page.getByTestId('value-α1').press('Enter');
    await expect.poll(async () => (await view(page)).samples.mean).not.toEqual(m0); // evaluated on the next frame
    expect((await state(page)).α1).toBe(0.1);
    await page.getByTestId('value-α1').fill('0.02');
    await page.getByTestId('value-α1').press('Enter');
    await expect.poll(async () => (await view(page)).samples.mean).toEqual(m0); // the same draws again
  });
  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ mode: 'OdometrySample', θ: 1, v: -1, ω: -0.5, α1: 0.1, α5: 0.3 }, { moved: true }));
    await expect(page.getByTestId('value-θ')).toHaveValue('1.');
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.getByTestId('popup-mode')).toHaveValue('0');
    await expect(page.getByTestId('value-θ')).toHaveValue('0');
    await expect(page.getByTestId('value-v')).toHaveValue('2');
    await expect(page.getByTestId('slider-α5')).toBeEnabled();
    await expect(page.getByTestId('density-raster')).toHaveCount(1);
  });
  test('review screenshots at the five snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fields = {
      1: { θ: '0', v: '2', ω: '1.57', α1: '0.02', α5: '0.02' },
      2: { θ: '0.150796', v: '1.99', ω: '2.', α1: '0.0726', α2: '0.016', α5: '0.' },
      3: { α1: '0.0298', α2: '0.0386', α3: '0.0828', α4: '0.064', α6: '0.' },
      4: { α1: '0.', α2: '0.0214', α3: '0.0828', α4: '0.064' },
      5: { θ: '0.150796', α1: '0.', α2: '0.0214', α5: '0.' },
    };
    for (const k of Object.keys(fx.snapshots)) {
      const s = fx.snapshots[k];
      // snapshot 1 is the opening state (exact 0 and 2); the others hold machine reals only ("2.", "0.")
      await page.evaluate(([st, moved]) => window.__demo.setState(st, { moved }), [s, k !== '1']);
      expect(await state(page)).toEqual(s);
      for (const [n, text] of Object.entries(fields[k])) await expect(page.getByTestId(`value-${n}`)).toHaveValue(text);
      await expect(page.getByTestId(s.mode.endsWith('PDF') ? 'density-raster' : 'samples')).toHaveCount(1);
      await expect(page.getByTestId('slider-α5')).toBeEnabled({ enabled: s.mode.startsWith('Velocity') });
      await reviewShot(page, testInfo, `probabilistic-motion-snapshot-${k}`);
    }
  });
});
