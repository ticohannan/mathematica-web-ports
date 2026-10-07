// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/art-gallery.spec.js — browser tests of the art gallery page
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/art-gallery/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());

/** drag with the real mouse from world point a to world point b */
async function drag(page, a, b, steps = 6) {
  const from = await page.evaluate((p) => window.__demo.worldToClient(p), a);
  const to = await page.evaluate((p) => window.__demo.worldToClient(p), b);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
}

test.describe('art gallery', () => {
  test('loads without errors and draws the cubicle, guard 1 and its visible region', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('env-cubicle')).toHaveCount(1);
    await expect(page.locator('[data-testid^=guard-]')).toHaveCount(1);
    await expect(page.locator('[data-testid^=region-]')).toHaveCount(1);
    expect((await state(page)).visibleRegion[0].length).toBe(25); // as the original's saved state
    await reviewShot(page, testInfo, 'art-gallery-initial');
  });

  test('has the controls of the original: number of guards 1 to 8 and environment, with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    for (let s = 1; s <= 8; s++) await expect(page.getByTestId(`setter-s-${s}`)).toBeVisible();
    for (const r of ['movable-obstacles', 'irregular', 'cubicle']) await expect(page.getByTestId(`setter-reg-${r}`)).toBeVisible();
    await expect(page.getByTestId('setter-s-1')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-reg-cubicle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('ctl-s')).toContainText('number of guards');
    await expect(page.getByTestId('ctl-reg')).toContainText('environment');
  });

  test('dragging guard 1 with the mouse moves it and recomputes only its region', async ({ page }) => {
    await openDemo(page, URL);
    const before = await page.getByTestId('region-1').getAttribute('points');
    await drag(page, [0, 0], [2.5, 1]);
    const s = await state(page);
    expect(s.pts[2][0]).toBeCloseTo(2.5, 1);
    expect(s.pts[2][1]).toBeCloseTo(1, 1);
    expect((await view(page)).recomputed).toEqual([1]);
    await expect(page.getByTestId('region-1')).not.toHaveAttribute('points', before);
  });

  test('number of guards 8 shows eight guards and eight regions', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-s-8').click();
    await expect(page.getByTestId('setter-s-8')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid^=guard-]')).toHaveCount(8);
    await expect(page.locator('[data-testid^=region-]')).toHaveCount(8);
    expect((await view(page)).recomputed).toEqual([2, 3, 4, 5, 6, 7, 8]);
    await reviewShot(page, testInfo, 'art-gallery-8-guards');
  });

  test('the environment setter switches to movable obstacles and to the irregular polygon', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-s-2').click();
    await page.getByTestId('setter-reg-movable-obstacles').click();
    for (const id of ['env-bound', 'env-square', 'env-triangle']) await expect(page.getByTestId(id)).toHaveCount(1);
    await expect(page.getByTestId('env-cubicle')).toHaveCount(0);
    expect((await view(page)).recomputed).toEqual([1, 2]);
    await reviewShot(page, testInfo, 'art-gallery-movable-obstacles');
    await page.getByTestId('setter-reg-irregular').click();
    await expect(page.getByTestId('env-irregular')).toHaveCount(1);
    await expect(page.getByTestId('env-square')).toHaveCount(0);
    await reviewShot(page, testInfo, 'art-gallery-irregular');
  });

  test('dragging the square obstacle moves it and recomputes every guard', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-s-3').click();
    await page.getByTestId('setter-reg-movable-obstacles').click();
    await drag(page, [1, 0], [-1, -2.5]);
    const s = await state(page);
    expect(s.pts[0][0]).toBeCloseTo(-1, 1);
    expect(s.pts[0][1]).toBeCloseTo(-2.5, 1);
    expect((await view(page)).recomputed).toEqual([1, 2, 3]);
    const sq = await page.getByTestId('env-square').getAttribute('points');
    expect(sq.split(' ')[0].split(',').map(Number)[1]).toBeCloseTo(-2.5 - 0.7071, 1);
  });

  test('the invisible locators of an unused guard and of an obstacle can be dragged (original quirk)', async ({ page }) => {
    await openDemo(page, URL); // cubicle, one guard: guard 2 (pts 4) and the obstacles are not drawn
    await drag(page, [0, -1.5], [0.5, -2.5]);
    let s = await state(page);
    expect(s.pts[3][0]).toBeCloseTo(0.5, 1);
    await expect(page.locator('[data-testid^=guard-]')).toHaveCount(1);
    await drag(page, [2, 2], [3, 3]); // the triangle locator (pts 2) in the cubicle
    s = await state(page);
    expect(s.pts[1][0]).toBeCloseTo(3, 1);
    expect((await view(page)).recomputed).toEqual([1]); // an obstacle moved: guard 1 is recomputed
  });

  test('a press away from every locator moves the nearest locator there', async ({ page }) => {
    await openDemo(page, URL); // cubicle, 1 guard; nearest to (0.3, 0.9) is guard 1 at (0, 0), about 66 px away
    const at = await page.evaluate((p) => window.__demo.worldToClient(p), [0.3, 0.9]);
    await page.mouse.click(at.x, at.y);
    const s = await state(page);
    expect(s.pts[2][0]).toBeCloseTo(0.3, 1);
    expect(s.pts[2][1]).toBeCloseTo(0.9, 1);
    expect((await view(page)).recomputed).toEqual([1]);
  });

  test('in movable obstacles a press on the body of the square drags the square', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-reg-movable-obstacles').click();
    // (1.5, 0.4) lies inside the square around pts 1 = (1, 0); the square centre is the nearest locator
    await drag(page, [1.5, 0.4], [-1.5, -2]);
    const s = await state(page);
    expect(s.pts[0][0]).toBeCloseTo(-1.5, 1);
    expect(s.pts[0][1]).toBeCloseTo(-2, 1);
    expect(s.pts[2]).toEqual([0, 0]); // guard 1 did not move
  });

  test('a guard on a vertex of the movable square draws no region (port deviation)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-reg-movable-obstacles').click();
    await page.evaluate(() => {
      const pts = window.__demo.getState().pts;
      pts[2] = [1.7071067811865475, -0.7071067811865475]; // vertex of the square around pts 1 = (1, 0)
      window.__demo.setState({ pts });
    });
    await expect(page.getByTestId('guard-1')).toHaveCount(1);
    await expect(page.getByTestId('region-1')).toHaveCount(0);
    expect((await view(page)).traces['1'].partError).toBe(true);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-s-5').click();
    await page.getByTestId('setter-reg-irregular').click();
    await page.evaluate(() => window.__demo.moveLocator(3, [1, 1]));
    await page.getByTestId('reset').click();
    const s = await state(page);
    expect(s.s).toBe(1);
    expect(s.reg).toBe('cubicle');
    expect(s.pts[2]).toEqual([0, 0]);
    await expect(page.getByTestId('setter-reg-cubicle')).toHaveAttribute('aria-pressed', 'true');
    expect(s.visibleRegion[0].length).toBe(25);
  });

  test('arrow keys move a focused guard locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-pts-3').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowUp');
    const s = await state(page);
    expect(s.pts[2][0]).toBeCloseTo(0.05, 12);
    expect(s.pts[2][1]).toBeCloseTo(0.25, 12);
  });

  test('eight guards in the cubicle: time of a full computation in the browser (reported)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-s-8').click();
    await page.getByTestId('setter-reg-irregular').click();
    await page.getByTestId('setter-reg-cubicle').click(); // recomputes all eight guards
    const v = await view(page);
    expect(v.recomputed).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    console.log(`art-gallery: 8 guards in the cubicle computed in ${v.ms.toFixed(1)} ms (${test.info().project.name})`);
    expect(v.ms).toBeLessThan(2000);
  });
});
