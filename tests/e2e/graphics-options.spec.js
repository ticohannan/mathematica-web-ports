// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/e2e/graphics-options.spec.js — the Graphics options Axes, Ticks, AxesLabel, Frame, FrameLabel, PlotLabel of
// the Manipulate layer in a real browser (tests/e2e/fixtures/graphics-options.html).
import { test, expect } from '@playwright/test';

test('Axes, Ticks and AxesLabel; Frame, FrameLabel and PlotLabel are drawn outside the content and stay when it changes', async ({ page }) => {
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/tests/e2e/fixtures/graphics-options.html');
  await page.waitForFunction(() => window.__demo?.ready);
  const svg1 = page.getByTestId('scene-svg'), svg2 = page.getByTestId('scene-svg-2');
  await expect(svg1.getByTestId('axis-x')).toBeVisible();
  await expect(svg1.getByTestId('axis-y')).toContainText('0.5');
  await expect(svg1.getByTestId('axis-x')).toContainText('x');
  await expect(svg2.getByTestId('frame')).toBeVisible();
  await expect(svg2.getByTestId('plot-label')).toHaveText('Frame and labels');
  await expect(svg2.getByTestId('frame-label-bottom')).toHaveText('t');
  await expect(svg2.getByTestId('frame-label-left')).toHaveText('value');
  // the decorations are not redrawn by an evaluation; the content is
  const before = await svg1.getByTestId('axis-x').evaluate((n) => n.outerHTML);
  await page.evaluate(() => window.__demo.setState({ a: 0.5 }));
  expect(await svg1.getByTestId('axis-x').evaluate((n) => n.outerHTML)).toBe(before);
  const g = await page.evaluate(() => window.__demo.graphics(1));
  expect(JSON.stringify(g)).toContain('0.25'); // a / 2
  // the frame's labels lie inside the picture (the layer made room for them)
  const box = await svg2.boundingBox(), lab = await svg2.getByTestId('frame-label-left').boundingBox();
  expect(lab.x).toBeGreaterThanOrEqual(box.x - 0.5);
  expect(problems).toEqual([]);
});

test('ControlPlacement Top puts the controls above the picture; a locator Appearance given as Graphics follows the state', async ({ page }) => {
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/tests/e2e/fixtures/graphics-options.html');
  await page.waitForFunction(() => window.__demo?.ready);
  await expect(page.locator('section.manipulate')).toHaveClass(/controls-top/);
  const controls = await page.locator('#controls').boundingBox(), pic = await page.getByTestId('graphic').boundingBox();
  expect(controls.y + controls.height).toBeLessThanOrEqual(pic.y + 1);
  const look = page.getByTestId('locator-p').getByTestId('p-look');
  await expect(look).toHaveCount(1);
  const fill0 = await look.evaluate((n) => (n.querySelector('[fill]') ?? n).getAttribute('fill'));
  await page.evaluate(() => window.__demo.setState({ a: 1.4 }));
  const fill1 = await look.evaluate((n) => (n.querySelector('[fill]') ?? n).getAttribute('fill'));
  expect(fill1).not.toBe(fill0);
  // still a locator: dragging it moves the variable
  await page.evaluate(() => window.__demo.moveLocator('p', [1, -1]));
  expect((await page.evaluate(() => window.__demo.getState())).p).toEqual([1, -1]);
  expect(problems).toEqual([]);
});

test('the example of docs/NEW_APP.md runs: a body returning a bare list, a slider and a locator', async ({ page }) => {
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/tests/e2e/fixtures/new-app-example.html');
  await page.waitForFunction(() => window.__demo?.ready);
  // the fixture holds the doc's code unchanged
  const fs = await import('node:fs');
  const doc = fs.readFileSync('docs/NEW_APP.md', 'utf8'), html = fs.readFileSync('tests/e2e/fixtures/new-app-example.html', 'utf8');
  const code = doc.match(/```js\n(import \{ Manipulate[\s\S]*?)```/)[1].replaceAll("'../../shared/", "'../../../shared/");
  expect(html).toContain(code.trim());
  await expect(page.getByTestId('scene-svg').getByTestId('axis-x')).toBeVisible();
  await page.evaluate(() => window.__demo.setState({ r: 0.5 }));
  await page.evaluate(() => window.__demo.moveLocator('p', [-1, 0.5]));
  const g = await page.evaluate(() => window.__demo.graphics(0));
  expect(JSON.stringify(g)).toContain('[-1,0.5]');
  expect(JSON.stringify(g)).toContain('"r":0.5');
  expect(problems).toEqual([]);
});
