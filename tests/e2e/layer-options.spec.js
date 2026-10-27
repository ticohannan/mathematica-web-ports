// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/e2e/layer-options.spec.js — the Manipulate layer's v0.1.26 additions in a real browser
// (tests/e2e/fixtures/layer-options.html): ImageSize -> {w, h} fits the plot range, runs of spaces in text are kept,
// settleInterval spaces a self-evaluating body's evaluations, setState(partial, { moved: [names] }) marks only those
// sliders as moved, and empty Point/Line draw nothing.
import { test, expect } from '@playwright/test';

const open = async (page, query = '') => {
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(`/tests/e2e/fixtures/layer-options.html${query}`);
  await page.waitForFunction(() => window.__demo?.ready);
  return problems;
};

test('layer options: ImageSize {600, 400} fits the 30 × 21 range into 571.4 × 400', async ({ page }) => {
  const problems = await open(page);
  const vb = (await page.getByTestId('scene-svg').getAttribute('viewBox')).split(' ').map(Number);
  expect(vb[2]).toBeCloseTo(30, 6); // the viewBox spans the plot range (no padding)
  const maxWidth = await page.getByTestId('scene-svg').evaluate((n) => parseFloat(n.style.maxWidth));
  expect(maxWidth / 1.25).toBeCloseTo((400 * 30) / 21, 0); // the layer draws pictures 1.25 × their ImageSize (style.css)
  expect(problems).toEqual([]);
});

test('layer options: runs of spaces in a Text are kept (wider than the single-space text)', async ({ page }) => {
  await open(page);
  const spaced = await page.getByTestId('spaced-text').boundingBox();
  const single = await page.getByTestId('single-text').boundingBox();
  expect(spaced.width).toBeGreaterThan(single.width + 4);
  expect(await page.getByTestId('single-text').evaluate((n) => (n.tagName === 'text' ? n : n.querySelector('text')).getAttribute('style'))).toBeNull();
});

test('layer options: empty Point and Line draw nothing', async ({ page }) => {
  const problems = await open(page);
  await expect(page.getByTestId('empty-point').locator('circle, ellipse, path, polyline')).toHaveCount(0);
  await expect(page.getByTestId('empty-line').locator('polyline, line, path')).toHaveCount(0);
  // a list of lines whose first run is empty draws the other runs (it was taken for one line of undefined points)
  const runs = page.getByTestId('partly-empty-line').locator('polyline');
  await expect(runs).toHaveCount(1);
  expect(await runs.getAttribute('points')).not.toContain('undefined');
  // an Arrow of one point draws nothing (it threw)
  await expect(page.getByTestId('one-point-arrow').locator('polyline, path, polygon')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('layer options: settleInterval keeps at least that much real time between self-evaluations', async ({ page }) => {
  await open(page, '?interval=0.1');
  await page.evaluate(() => window.__demo.setState({ go: true, evaluations: 0 }));
  await page.waitForTimeout(1000);
  const n = (await page.evaluate(() => window.__demo.getState())).evaluations;
  await page.evaluate(() => window.__demo.setState({ go: false }));
  expect(n).toBeGreaterThan(3); // it keeps evaluating …
  expect(n).toBeLessThanOrEqual(12); // … about every 0.1 s (one per animation frame would be about 60)
});

test('layer options: setState(partial, { moved: [names] }) shows only those sliders as moved machine reals', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.__demo.setState({ a: 5, b: 5 }, { moved: ['a'] }));
  await expect(page.getByTestId('value-a')).toHaveValue('5.');
  await expect(page.getByTestId('value-b')).toHaveValue('5');
});
