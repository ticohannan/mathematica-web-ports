// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original (ECE 6311 Lecture 22 notebook) by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/potential-fields.spec.js — browser tests of the "Artificial Potential Fields" page: the four tabs (mouse and keys),
// each tab's controls and picture, Initial settings per tab, and the contour tab at the notebook's second saved
// state against Tico's screenshot (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openDemo } from './helpers.js';

const URL = '/demos/potential-fields/';
const saved = JSON.parse(fs.readFileSync('tests/golden/potential-fields.screenshot-contours.json', 'utf8')).pictures[1];
// the notebook's state (obs, obs2; ρ0 = 2 fixed) as the port's (a list of obstacles and ρ_0)
const savedState = (({ obs2, ...rest }) => ({ ...rest, obs: [saved.state.obs, obs2], 'ρ0': 2 }))(saved.state);
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

  test('repulsive: dragging a locator moves its obstacle; the surface stays within −0.1 … 10', async ({ page }) => {
    await openDemo(page, `${URL}#rep`);
    await expect(page.locator('[data-testid^="locator-rep-obs-"]')).toHaveCount(1);
    await expect(page.getByTestId('remove-rep-obs')).toBeDisabled(); // at least one obstacle
    const dot = await page.getByTestId('locator-rep-obs-1').boundingBox();
    const box = await page.getByTestId('pad-rep-obs').boundingBox();
    await page.mouse.move(dot.x + dot.width / 2, dot.y + dot.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.25, { steps: 4 });
    await page.mouse.up();
    const [obs] = (await state(page, 'rep')).obs;
    expect(obs[0]).toBeCloseTo(2, 0);
    expect(obs[1]).toBeCloseTo(2, 0);
    await expect(page.getByTestId('value-rep-obs-x')).toHaveValue(String(obs[0]));
    expect((await view(page, 'rep')).box[2]).toEqual([-0.1, 10]);
    expect(await demo(page, 'rep', 'inkFraction')).toBeGreaterThan(0.05);
  });

  test('attractive + repulsive: one pad for all the obstacles, Add and Remove, and the rho_0 slider', async ({ page }) => {
    await openDemo(page, `${URL}#comb`);
    await expect(page.locator('[data-testid^="locator-comb-obs-"]')).toHaveCount(2);
    const box = await page.getByTestId('pad-comb-obs').boundingBox();
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.5); // the nearest locator jumps there
    expect((await state(page, 'comb')).obs[0][0]).toBeCloseTo(-2, 0);
    await page.getByTestId('add-comb-obs').click();
    await expect(page.locator('[data-testid^="locator-comb-obs-"]')).toHaveCount(3);
    expect((await state(page, 'comb')).obs).toHaveLength(3);
    expect((await state(page, 'comb')).obs[2]).toEqual([2, -2]); // a free spot
    const colours = await page.locator('[data-testid^="locator-comb-obs-"]').evaluateAll((els) => els.map((e) => e.getAttribute('fill')));
    expect(new Set(colours).size).toBe(3); // a colour each
    await page.getByTestId('remove-comb-obs').click(); // the selected one: the one just added
    expect((await state(page, 'comb')).obs).toHaveLength(2);
    await expect(page.getByTestId('count-comb-obs')).toHaveText('2 obstacles');
    await page.getByTestId('slider-comb-rho0').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page, 'comb'))['ρ0']).toBe(5);
    const v = await view(page, 'comb');
    expect(v.zRange[1]).toBeGreaterThan(4); // at least the corners (d ζ (4√2 − d/2) = 5.16)
  });

  test('contour: a focused locator moves with the arrow keys and Delete removes it', async ({ page }) => {
    await openDemo(page, `${URL}#cont`);
    await page.getByTestId('locator-cont-obs-1').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowUp');
    expect((await state(page, 'cont')).obs[0]).toEqual([-0.8, 1.5]);
    await page.keyboard.press('Delete');
    expect((await state(page, 'cont')).obs).toEqual([[-1, 1]]);
    await expect(page.getByTestId('remove-cont-obs')).toBeDisabled();
    for (let k = 0; k < 7; k++) await page.getByTestId('add-cont-obs').click();
    expect((await state(page, 'cont')).obs).toHaveLength(8);
    await expect(page.getByTestId('add-cont-obs')).toBeDisabled(); // at most eight
  });

  test('contour: at saved state 2, the levels of the Mathematica screenshot and the exclusion circles', async ({ page }, testInfo) => {
    await openDemo(page, `${URL}#cont`);
    await demo(page, 'cont', 'setState', savedState);
    expect((await view(page, 'cont')).levels).toEqual(saved.levels);
    const g = await page.evaluate(() => window.__demos.cont.graphics());
    expect(JSON.stringify(g)).toContain('exclusions-rho');
    expect(JSON.stringify(g)).toContain('exclusions-d');
    await expect(page.locator('[data-testid^="locator-cont-obs-"]')).toHaveCount(2);
    await shot(page, testInfo, 'cont', 'contour-saved-state');
  });

  test('Initial settings restores the opening state of each tab', async ({ page }) => {
    await openDemo(page, URL);
    for (const k of ['att', 'rep', 'comb', 'cont']) {
      await page.getByTestId(`tab-${k}`).click();
      const opening = await state(page, k);
      await demo(page, k, 'setState', k === 'rep' ? { 'ρ0': 4, 'ηi': 100 } : { di: 3 });
      if (k !== 'att') await page.getByTestId(`add-${k}-obs`).click();
      await page.getByTestId(`reset-${k}`).click();
      expect(await state(page, k)).toEqual(opening);
      if (k !== 'att') await expect(page.locator(`[data-testid^="locator-${k}-obs-"]`)).toHaveCount(opening.obs.length);
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
