// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/e2e/graphics-v040.spec.js — the v0.1.40 additions to shared/graphics.js drawn in a real browser
// (tests/e2e/fixtures/graphics-v040.html).
import { test, expect } from '@playwright/test';

const open = async (page) => {
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/tests/e2e/fixtures/graphics-v040.html');
  await page.waitForFunction(() => window.__demo?.ready);
  return problems;
};

test('heads at given places, rounded and line-less frames, a turned label, a styled script, "=" alignment, Mouseover', async ({ page }) => {
  const problems = await open(page);
  // two heads, at 30 % and (backwards) 70 % of the arrow
  await expect(page.getByTestId('two-heads').locator('polygon')).toHaveCount(2);
  // the rounded frame keeps the spaces of " A " and has round corners; the other frame has no line
  const rr = page.getByTestId('rounded').locator('rect[data-role=framed]');
  expect(Number(await rr.getAttribute('rx'))).toBeGreaterThan(0);
  const rounded = await rr.boundingBox(), nl = await page.getByTestId('no-line').locator('rect[data-role=framed]');
  expect(rounded.width).toBeGreaterThan(rounded.height * 0.9);
  expect(await nl.getAttribute('stroke')).toBe('none');
  // the turned label follows its angle
  const tr = () => page.getByTestId('turned').locator('text').getAttribute('transform');
  expect(await tr()).toMatch(/rotate\(-28\.6/);
  await page.evaluate(() => window.__demo.setState({ a: 1 }));
  expect(await tr()).toMatch(/rotate\(-57\.2/);
  // the script keeps its italic y; the baseline comes back after it
  await expect(page.getByTestId('script').locator('tspan[font-style=italic]', { hasText: 'y' })).toHaveCount(1);
  // "=" alignment: the two "=" of the grid are above each other
  const xs = await page.getByTestId('eq-grid').locator('text').evaluateAll((ts) => ts.map((t) => {
    const i = t.textContent.indexOf('='); const p = t.getStartPositionOfChar(i); const m = t.getScreenCTM();
    return p.x * m.a + m.e;
  }));
  expect(Math.abs(xs[0] - xs[1])).toBeLessThan(1);
  // Mouseover: the second form under the pointer and with keyboard focus
  const hover = page.getByTestId('hover');
  await expect(hover.locator('[data-role=mouseover-b]')).toBeHidden();
  await hover.hover();
  await expect(hover.locator('[data-role=mouseover-b]')).toBeVisible();
  await page.mouse.move(1, 1);
  await expect(hover.locator('[data-role=mouseover-a]')).toBeVisible();
  await hover.focus();
  await expect(hover.locator('[data-role=mouseover-b]')).toBeVisible();
  expect(problems).toEqual([]);
});
