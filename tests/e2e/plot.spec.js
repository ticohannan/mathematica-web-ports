// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/e2e/plot.spec.js — shared/plot.js on the Manipulate layer in a real browser (tests/e2e/fixtures/plot.html):
// AspectRatio scaling, a legend outside and one Placed inside, a partial Frame, π tick labels, a Locator on a scaled
// plot, and the frame drawn again when the automatic plot range changes.
import { test, expect } from '@playwright/test';

test('plots: legend, partial frame, π ticks, scaled locator, frame redrawn when the plot range changes', async ({ page }) => {
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/tests/e2e/fixtures/plot.html');
  await page.waitForFunction(() => window.__demo?.ready);
  const svg1 = page.getByTestId('scene-svg'), svg2 = page.getByTestId('scene-svg-2');
  await expect(svg1.getByTestId('legend')).toContainText('measurement 1');
  await expect(svg1.getByTestId('legend-2')).toContainText('combined');
  await expect(svg1.getByTestId('frame')).toContainText('0.8');
  await expect(svg1.getByTestId('frame-label-bottom')).toContainText('Drag locators');
  await expect(svg2.getByTestId('axis-x')).toContainText('3π/2');
  await expect(svg2.getByTestId('legend')).toContainText('a sin');
  // the plot is wider than high (AspectRatio 1/GoldenRatio of a 20 × 1 data range)
  const box = await svg1.boundingBox();
  expect(box.width / box.height).toBeGreaterThan(1.3);
  // the locator sits on the x axis at x = 2 in data coordinates; a drag in data coordinates moves the variable
  // (the locator's own origin, not the glyph's box: a text glyph's box depends on the system font)
  const at = await page.evaluate(() => window.__demo.worldToClient([2, 0], 0));
  const origin = await page.getByTestId('locator-m').evaluate((n) => {
    const m = n.getScreenCTM(); return { x: m.e, y: m.f };
  });
  expect(Math.abs(origin.x - at.x)).toBeLessThan(1);
  expect(Math.abs(origin.y - at.y)).toBeLessThan(1);
  await page.mouse.move(at.x, at.y); await page.mouse.down(); await page.mouse.move(at.x + 40, at.y, { steps: 4 }); await page.mouse.up();
  const m = (await page.evaluate(() => window.__demo.getState())).m;
  expect(m[0]).toBeGreaterThan(2.5); expect(m[1]).toBe(0);
  // the second plot's automatic range follows the amplitude: its y ticks are redrawn
  const before = await svg2.getByTestId('axis-y').textContent();
  await page.evaluate(() => window.__demo.setState({ a: 3 }));
  const after = await page.getByTestId('scene-svg-2').getByTestId('axis-y').textContent();
  expect(after).not.toBe(before);
  expect(after).toContain('3');
  expect(problems).toEqual([]);
});
