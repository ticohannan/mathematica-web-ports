// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Adapted from Wolfram Demonstrations Project content (see LICENSE.md)
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/three-parametrizations.spec.js — Three Parametrizations of Rotations (browser tests)
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';
import fs from 'node:fs';

const URL = '/demos/three-parametrizations/';
const golden = JSON.parse(fs.readFileSync('tests/golden/three-parametrizations.original-states.json', 'utf8'));
const maxDiff = (A, B) => Math.max(...A.flat().map((v, i) => Math.abs(v - B.flat()[i])));

test.describe('Three parametrizations demo', () => {
  test('loads without errors and draws a non-blank scene', async ({ page }) => {
    const problems = await openDemo(page, URL);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => { window.__demo.renderNow(); return window.__demo.inkFraction(); })).toBeGreaterThan(0.02);
    expect(problems).toEqual([]);
  });

  test('method setter enables exactly the sliders of the chosen parametrization', async ({ page }) => {
    await openDemo(page, URL);
    const expectEnabled = async (on) => {
      const en = await page.evaluate(() => window.__demo.controlsEnabled());
      for (const [k, v] of Object.entries(en)) expect(v, k).toBe(on.includes(k));
    };
    await expectEnabled(['phi', 'theta', 'psi']);
    await page.getByTestId('setter-typeRot-2').click();
    await expectEnabled(['angle']);
    await page.getByTestId('setter-typeRot-3').click();
    await expectEnabled(['alpha', 'beta', 'gamma']);
  });

  for (const [i, s] of golden.states.entries()) {
    if (i === 0) continue;
    test(`original snapshot ${i}: displayed converted values equal the original's (method ${s.typeRot})`, async ({ page }, testInfo) => {
      await openDemo(page, URL);
      const input = { typeRot: s.typeRot, progress: s.progress };
      if (s.typeRot === 1) Object.assign(input, { phi: s.Phi, theta: s.Theta, psi: s.Psi });
      if (s.typeRot === 2) Object.assign(input, { angle: s.angle, axis: s.axis });
      if (s.typeRot === 3) Object.assign(input, { alpha: s.Alpha, beta: s.Beta, gamma: s.Gamma });
      await page.evaluate((x) => window.__demo.setState(x), input);
      const shown = async (id) => Number(await page.getByTestId(id).inputValue());
      // Values shown in the (disabled) fields of the other two parametrizations
      if (s.typeRot !== 1) for (const [id, v] of [['value-phi', s.Phi], ['value-theta', s.Theta], ['value-psi', s.Psi]]) expect(await shown(id)).toBeCloseTo(v, 3);
      if (s.typeRot !== 2) {
        expect(await shown('value-angle')).toBeCloseTo(s.angle, 3);
        expect(await shown('value-axis-x')).toBeCloseTo(s.axis[0], 3);
        expect(await shown('value-axis-y')).toBeCloseTo(s.axis[1], 3);
      }
      if (s.typeRot !== 3) for (const [id, v] of [['value-alpha', s.Alpha], ['value-beta', s.Beta], ['value-gamma', s.Gamma]]) expect(await shown(id)).toBeCloseTo(v, 3);
      await reviewShot(page, testInfo, `three-snapshot-${i}-method-${s.typeRot}`);
    });
  }

  test('teapots in the scene use exactly the computed R and Rprog', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ typeRot: 3, alpha: 0.4, beta: -0.7, gamma: 1.2, progress: 0.5 }));
    const { R, Rprog } = await page.evaluate(() => window.__demo.matrices());
    const rendered = await page.evaluate(() => window.__demo.renderedMatrices());
    expect(maxDiff(rendered.R, R)).toBeLessThan(1e-6);
    expect(maxDiff(rendered.Rprog, Rprog)).toBeLessThan(1e-6);
  });

  test('progress slider: 0 = start orientation (identity), 1 = final orientation', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ typeRot: 1, phi: 1, theta: 1, psi: 1 }));
    await page.getByTestId('value-progress').fill('0');
    await page.getByTestId('value-progress').press('Enter');
    let m = await page.evaluate(() => window.__demo.matrices());
    expect(maxDiff(m.Rprog, [[1, 0, 0], [0, 1, 0], [0, 0, 1]])).toBeLessThan(1e-9);
    await page.getByTestId('value-progress').fill('1');
    await page.getByTestId('value-progress').press('Enter');
    m = await page.evaluate(() => window.__demo.matrices());
    expect(maxDiff(m.Rprog, m.R)).toBeLessThan(1e-9);
  });

  test('2D axis slider responds to mouse drag in axis/angle mode only', async ({ page }) => {
    await openDemo(page, URL);
    const pad = page.getByTestId('pad-axis');
    const box = await pad.boundingBox();
    await pad.click({ position: { x: box.width * 0.75, y: box.height * 0.25 }, force: true }); // method 1: disabled, click must be ignored
    expect((await page.evaluate(() => window.__demo.getState())).axis).toEqual([0, 0]);
    await page.getByTestId('setter-typeRot-2').click();
    await pad.click({ position: { x: box.width * 0.75, y: box.height * 0.25 } });
    const ax = (await page.evaluate(() => window.__demo.getState())).axis;
    expect(ax[0]).toBeGreaterThan(1); // longitude to the right
    expect(ax[1]).toBeGreaterThan(0.5); // latitude up
  });

  test('screenshots per method at progress 0.5 (for side-by-side review)', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const typeRot of [1, 2, 3]) {
      await page.evaluate((t) => window.__demo.setState({ typeRot: t, progress: 0.5, phi: -2.51, theta: 1.55, psi: 2.31 }), typeRot);
      await page.waitForTimeout(150);
      await reviewShot(page, testInfo, `three-method-${typeRot}-progress-0.5`);
    }
  });
});
