// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/e2e/realtime.spec.js — the Manipulate layer's v0.1.24 additions in a real browser (tests/e2e/fixtures/realtime.html):
// the clock (AbsoluteTime[] as `time`, fixed by the hook's setClock), settle (the body evaluates again while it moves a
// point), a Locator variable that changes between a list of points and one point, a sector Disk and Opacity on points
// and text.
import { test, expect } from '@playwright/test';

const URL = '/tests/e2e/fixtures/realtime.html';
const open = async (page) => {
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.__demo?.ready);
  return problems;
};
const state = (page) => page.evaluate(() => window.__demo.getState());

test('realtime: the body reads the clock as AbsoluteTime[] (seconds since 1900); setClock fixes it', async ({ page }) => {
  const problems = await open(page);
  const t = (await page.evaluate(() => window.__demo.view())).time;
  const now = Date.now() / 1000 + 2208988800;
  expect(Math.abs(t - now)).toBeLessThan(60);
  await page.evaluate(() => { window.__demo.setClock(1000); window.__demo.setState({}); });
  expect((await page.evaluate(() => window.__demo.view())).time).toBe(1000);
  await page.evaluate(() => { window.__demo.setClock(null); window.__demo.setState({}); });
  expect((await page.evaluate(() => window.__demo.view())).time).toBeGreaterThan(now - 60);
  expect(problems).toEqual([]);
});

test('realtime: a Locator list becomes one locator and back when the body changes the variable', async ({ page }) => {
  const problems = await open(page);
  await expect(page.locator('[data-testid^="locator-loc-"]')).toHaveCount(3);
  await expect(page.getByTestId('locator-loc')).toHaveCount(0);
  await page.evaluate(() => window.__demo.setState({ mode: 'follow' }));
  await expect(page.getByTestId('locator-loc')).toHaveCount(1);
  await expect(page.locator('[data-testid^="locator-loc-"]')).toHaveCount(0);
  // the single locator is dragged as a point
  const s = await page.evaluate(() => window.__demo.moveLocator('loc', [1, 1]));
  expect(s.loc).toEqual([1, 1]);
  await page.evaluate(() => window.__demo.setState({ mode: 'pick' }));
  await expect(page.locator('[data-testid^="locator-loc-"]')).toHaveCount(3);
  expect((await state(page)).loc[0]).toEqual([1, 1]);
  expect(problems).toEqual([]);
});

test('realtime: settle — the body keeps evaluating while it moves the point, and stops when it arrives', async ({ page }) => {
  const problems = await open(page);
  await page.evaluate(() => window.__demo.setState({ mode: 'follow' })); // loc = (0, 1): one unit away
  await expect.poll(async () => (await state(page)).runner[1], { timeout: 5000 }).toBe(1);
  const s = await state(page);
  expect(s.runner).toEqual([0, 1]);
  const n = s.evaluations;
  expect(n).toBeGreaterThan(10); // at most 0.1 per evaluation: at least ten evaluations
  await page.waitForTimeout(300);
  expect((await state(page)).evaluations).toBe(n); // arrived: no more evaluations
  // the runner is drawn where the state says
  const at = await page.evaluate(() => window.__demo.worldToClient([0, 1]));
  const box = await page.getByTestId('runner').boundingBox();
  expect(Math.abs(box.x + box.width / 2 - at.x)).toBeLessThan(1.5);
  expect(Math.abs(box.y + box.height / 2 - at.y)).toBeLessThan(1.5);
  expect(problems).toEqual([]);
});

test('realtime: a sector Disk is a filled half disk with edges; Opacity fades points and text', async ({ page }) => {
  const problems = await open(page);
  const janus = page.getByTestId('janus');
  await expect(janus.locator('circle')).toHaveCount(1);
  const half = janus.locator('polygon');
  await expect(half).toHaveCount(1);
  expect(await half.getAttribute('fill')).toBe('rgb(0,255,0)');
  const box = await half.boundingBox(), whole = await janus.locator('circle').boundingBox();
  // the right half (angles −π/2 … π/2): as high as the disk, half as wide, on its right side
  expect(Math.abs(box.height - whole.height)).toBeLessThan(2);
  expect(Math.abs(box.width - whole.width / 2)).toBeLessThan(2);
  expect(Math.abs(box.x - (whole.x + whole.width / 2))).toBeLessThan(2);
  const faded = page.getByTestId('faded');
  for (const n of await faded.locator('circle, text').all()) {
    const o = await n.evaluate((e) => e.closest('[opacity]')?.getAttribute('opacity'));
    expect(o).toBe('0.5');
  }
  expect(problems).toEqual([]);
});
