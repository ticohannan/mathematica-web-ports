// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original (ECE 6311 Lecture 22 notebook) by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/potential-fields.spec.js — browser tests of the "Potential Fields" page: the four tabs (mouse and keys),
// each tab's controls and picture, Initial settings per tab, and the contour tab at the notebook's second saved
// state against Tico's screenshot (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openDemo } from './helpers.js';

const URL = '/demos/potential-fields/';
const saved = JSON.parse(fs.readFileSync('tests/golden/potential-fields.screenshot-contours.json', 'utf8')).pictures[1];
const demo = (page, k, fn, arg) => page.evaluate(([k, fn, arg]) => window.__demos[k][fn](arg), [k, fn, arg]);
const state = (page, k) => demo(page, k, 'getState');
const view = (page, k) => demo(page, k, 'view');
/** A review picture of the tab on show (helpers.js reviewShot takes the page's only .manipulate; here there are four). */
async function shot(page, testInfo, k, name) {
  const dir = path.join('test-output', 'review-screenshots', testInfo.project.name);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `potential-fields-${name}.png`);
  await page.locator(`#panel-${k}`).screenshot({ path: file });
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
}

test.describe('potential-fields', () => {
  test('loads without errors; the first tab shows its surface, the others are hidden', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('tab-att')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('scene-canvas-att')).toBeVisible();
    for (const k of ['rep', 'comb', 'cont']) await expect(page.locator(`#panel-${k}`)).toBeHidden();
    expect(await demo(page, 'att', 'inkFraction')).toBeGreaterThan(0.05);
    await expect(page.getByTestId('label-att')).toHaveText('Attractive Potential');
  });

  test('a click on a tab shows its panel and makes its hook window.__demo', async ({ page }) => {
    await openDemo(page, URL);
    for (const [k, testid] of [['rep', 'scene-canvas-rep'], ['comb', 'scene-canvas-comb'], ['cont', 'contour-cont'], ['att', 'scene-canvas-att']]) {
      await page.getByTestId(`tab-${k}`).click();
      await expect(page.getByTestId(`tab-${k}`)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(`#panel-${k}`)).toBeVisible();
      await expect(page.getByTestId(testid)).toBeVisible();
      expect(await page.evaluate(() => window.__demo.tab)).toBe(k);
    }
    await expect(page).toHaveURL(/#att$/);
  });

  test('arrow keys, Home and End move between the tabs', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('tab-att').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('tab-rep')).toBeFocused();
    await expect(page.locator('#panel-rep')).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.locator('#panel-cont')).toBeVisible();
    await page.keyboard.press('ArrowRight'); // wraps round
    await expect(page.locator('#panel-att')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#panel-cont')).toBeVisible();
    await page.keyboard.press('Home');
    await expect(page.getByTestId('tab-att')).toHaveAttribute('aria-selected', 'true');
  });

  test('a link to a tab opens it', async ({ page }) => {
    await openDemo(page, `${URL}#cont`);
    await expect(page.locator('#panel-cont')).toBeVisible();
    await expect(page.locator('#panel-att')).toBeHidden();
    expect(await page.evaluate(() => window.__demo.tab)).toBe('cont');
  });

  test('attractive: the d slider moves the switch line; ζ = 0 is flat', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page, 'att')).toEqual({ di: 1, 'ζi': 1 });
    await page.getByTestId('slider-att-di').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page, 'att')).di).toBe(4);
    expect((await view(page, 'att')).switchHeight).toBeCloseTo(8, 12); // ζ d²/2 = 16/2
    await page.getByTestId('slider-att-zi').focus();
    await page.keyboard.press('Home');
    await expect.poll(async () => (await state(page, 'att'))['ζi']).toBe(0);
    expect((await view(page, 'att')).switchHeight).toBe(0);
  });

  test('repulsive: dragging in the pad moves the obstacle; the surface stays within −0.1 … 10', async ({ page }) => {
    await openDemo(page, `${URL}#rep`);
    const box = await page.getByTestId('pad-rep-obs').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.25, { steps: 4 });
    await page.mouse.up();
    const obs = (await state(page, 'rep')).obs;
    expect(obs[0]).toBeCloseTo(2, 0);
    expect(obs[1]).toBeCloseTo(2, 0);
    expect((await view(page, 'rep')).box[2]).toEqual([-0.1, 10]);
    expect(await demo(page, 'rep', 'inkFraction')).toBeGreaterThan(0.05);
  });

  test('attractive + repulsive: the two pads move the two obstacles; the z range cuts off the poles', async ({ page }) => {
    await openDemo(page, `${URL}#comb`);
    for (const [name, fx] of [['obs', 0.25], ['obs2', 0.75]]) {
      const box = await page.getByTestId(`pad-comb-${name}`).boundingBox();
      await page.mouse.click(box.x + box.width * fx, box.y + box.height * 0.5);
    }
    const s = await state(page, 'comb');
    expect(s.obs[0]).toBeCloseTo(-2, 0);
    expect(s.obs2[0]).toBeCloseTo(2, 0);
    const v = await view(page, 'comb');
    expect(v.zRange[1]).toBeLessThan(10);
    expect(v.zRange[1]).toBeGreaterThan(4); // at least the corners (d ζ (4√2 − d/2) = 5.16)
  });

  test('contour: at saved state 2, the levels of the Mathematica screenshot and the red exclusions', async ({ page }, testInfo) => {
    await openDemo(page, `${URL}#cont`);
    await demo(page, 'cont', 'setState', saved.state);
    expect((await view(page, 'cont')).levels).toEqual(saved.levels);
    const g = await page.evaluate(() => window.__demos.cont.graphics());
    expect(JSON.stringify(g)).toContain('exclusions');
    await shot(page, testInfo, 'cont', 'contour-saved-state');
  });

  test('Initial settings restores the opening state of each tab', async ({ page }) => {
    await openDemo(page, URL);
    for (const k of ['att', 'rep', 'comb', 'cont']) {
      await page.getByTestId(`tab-${k}`).click();
      const opening = await state(page, k);
      await demo(page, k, 'setState', k === 'rep' ? { 'ρ0': 4, 'ηi': 100 } : { di: 3 });
      await page.getByTestId(`reset-${k}`).click();
      expect(await state(page, k)).toEqual(opening);
    }
  });

  test('review pictures of the four tabs at their opening states', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of ['att', 'rep', 'comb', 'cont']) {
      await page.getByTestId(`tab-${k}`).click();
      await shot(page, testInfo, k, `tab-${k}`);
    }
  });
});
