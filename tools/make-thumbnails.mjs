#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/make-thumbnails.mjs — the landing-page thumbnail of every app: demos/<dir>/thumbnail.webp.
//
//   npm run thumbnails                          every app in tests/e2e/apps.js
//   npm run thumbnails -- rrt prm-3d            only these apps
//
// For each app: open its page at the initial settings (Playwright's Chromium, 1100×900, as the browser tests),
// wait for window.__demo.ready, take a screenshot of the area covered by its graphics (every .graphic in the
// Manipulate panel; the whole panel if there is none), fit it, letterboxed on white, into a 480×300 picture and
// save it as WebP (encoded by the browser itself: no extra dependency). The pictures are generated files: run this
// again after a change that alters an app's initial picture. tests/e2e/site.spec.js checks that every card has one.
// Set PW_CHROMIUM_PATH to use a specific Chromium/Chrome binary (as for the browser tests).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { startServer } from './serve.mjs';
import { APPS } from '../tests/e2e/apps.js';

export const THUMB = { width: 480, height: 300, file: 'thumbnail.webp', quality: 0.85 };

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const unknown = only.filter((d) => !APPS.some((a) => a.dir === d));
if (unknown.length) { console.error(`✘ not an app in tests/e2e/apps.js: ${unknown.join(', ')}`); process.exit(1); }
const apps = only.length ? APPS.filter((a) => only.includes(a.dir)) : APPS;

const server = await startServer({ root: repo, port: 0 });
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
let failed = 0;
try {
  for (const app of apps) {
    const page = await context.newPage();
    try {
      await page.goto(server.url + app.url);
      await page.waitForFunction(() => window.__demo && window.__demo.ready === true, null, { timeout: 30000 });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.waitForTimeout(400); // let WebGL scenes and first animation frames settle
      // the box around every graphic of the panel (several apps have two or more side by side)
      const box = await page.evaluate(() => {
        const panel = document.querySelector('.manipulate');
        const els = panel ? [...panel.querySelectorAll('.graphic')].filter((e) => e.offsetWidth && e.offsetHeight) : [];
        const rects = (els.length ? els : [panel || document.body]).map((e) => e.getBoundingClientRect());
        const x0 = Math.min(...rects.map((r) => r.left)) + window.scrollX, y0 = Math.min(...rects.map((r) => r.top)) + window.scrollY;
        const x1 = Math.max(...rects.map((r) => r.right)) + window.scrollX, y1 = Math.max(...rects.map((r) => r.bottom)) + window.scrollY;
        return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
      });
      const png = await page.screenshot({ clip: box, fullPage: true });
      // fit into THUMB (letterbox on white) and encode as WebP in the page
      const dataUrl = await page.evaluate(async ({ b64, W, H, q }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
        const s = Math.min(W / img.width, H / img.height);
        const w = img.width * s, h = img.height * s;
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        return c.toDataURL('image/webp', q);
      }, { b64: png.toString('base64'), W: THUMB.width, H: THUMB.height, q: THUMB.quality });
      if (!dataUrl.startsWith('data:image/webp')) throw new Error('this browser cannot encode WebP (use Chromium)');
      const out = path.join(repo, 'demos', app.dir, THUMB.file);
      fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
      console.log(`✔ demos/${app.dir}/${THUMB.file}  (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
    } catch (e) {
      failed++;
      console.error(`✘ ${app.dir}: ${e.message.split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
if (failed) { console.error(`\n✘ ${failed} of ${apps.length} thumbnails failed.`); process.exit(1); }
console.log(`\n✔ ${apps.length} thumbnails written.`);
