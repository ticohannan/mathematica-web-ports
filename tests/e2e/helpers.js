// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/e2e/helpers.js — shared helpers for the browser tests
import { expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/** Open a demo page, fail on uncaught errors, wait for window.__demo.ready. */
export async function openDemo(page, url) {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  // The site has no favicon (none is specified); some browser builds request /favicon.ico anyway.
  page.on('console', (m) => {
    if (m.type() === 'error' && !/\/favicon\.ico$/.test(m.location()?.url ?? '')) problems.push(`console.error: ${m.text()}`);
  });
  await page.goto(url);
  await page.waitForFunction(() => window.__demo && window.__demo.ready === true);
  return problems;
}

/** Save a screenshot of the demo panel for HUMAN review (not compared automatically). */
export async function reviewShot(page, testInfo, name) {
  const dir = path.join('test-output', 'review-screenshots', testInfo.project.name);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.locator('.manipulate').screenshot({ path: file });
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
}

export const near = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
