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

/**
 * Simulate a WebGL context loss and restore on the demo's scene canvas (WEBGL_lose_context), then
 * read how much of the canvas is drawn WITHOUT forcing a render: the page must redraw by itself.
 * Returns { supported: false } where the browser does not offer the extension.
 */
export async function inkAfterContextRestore(page) {
  const supported = await page.evaluate(async () => {
    const canvas = document.querySelector('[data-testid=scene-canvas]');
    const gl = canvas.getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    const lost = new Promise((r) => canvas.addEventListener('webglcontextlost', r, { once: true }));
    ext.loseContext();
    await lost;
    // restore from a later task: a call made while the "lost" event is still being dispatched is ignored
    await new Promise((r) => setTimeout(r, 200));
    const restored = new Promise((r) => canvas.addEventListener('webglcontextrestored', r, { once: true }));
    ext.restoreContext();
    await restored;
    return true;
  });
  if (!supported) return { supported };
  // The page redraws on its next animation frame. Until then the restored canvas is empty, which
  // reads as fully "inked" (transparent black); a black background would too.
  let ink = 1;
  await expect.poll(async () => (ink = await page.evaluate(() => window.__demo.inkFraction())), { timeout: 5000 }).toBeLessThan(0.5);
  return { supported, ink };
}

export const near =(a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
