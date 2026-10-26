// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Haoran Zhao and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/swarm-circle.spec.js — browser tests of the "Distribution of a Swarm of Robots in a Circular Workplace
// under Gravity" page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/swarm-circle/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());

test.describe('swarm-circle', () => {
  test('loads without errors and draws the five pictures', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['plot-mean', 'plot-correlation', 'plot-covariance', 'scene-svg', 'plot-variance']) await expect(page.getByTestId(id)).toBeVisible();
    for (const id of ['workplace', 'robot-free', 'height', 'obstacle', 'mean-path', 'gravity', 'mean', 'ellipse',
      'mean-points', 'correlation-point', 'covariance-point', 'variance-points']) await expect(page.getByTestId(id)).toHaveCount(1);
    await expect(page.getByTestId('particles')).toHaveCount(0);
    await expect(page.getByTestId('stats')).toHaveCount(0);
    // two columns: the plots on the left, the workplace to their right with the variance plot below it
    const b = async (id) => page.getByTestId(id).boundingBox();
    const [m, c, w, v] = [await b('graphic'), await b('graphic3'), await b('graphic4'), await b('graphic5')];
    expect(w.x).toBeGreaterThan(m.x + m.width - 2);
    expect(v.y).toBeGreaterThan(w.y + w.height - 2);
    expect(c.y).toBeGreaterThan(m.y + m.height - 2);
  });
  test('has the controls of the original in one row above the pictures, with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-β')).toHaveValue('4.712');
    await expect(page.getByTestId('value-h')).toHaveValue('0.66');
    await expect(page.getByTestId('check-showParticles')).not.toBeChecked();
    await expect(page.getByTestId('check-showStats')).not.toBeChecked();
    const ctl = await page.locator('#controls').boundingBox();
    const pic = await page.getByTestId('graphic').boundingBox();
    expect(ctl.y + ctl.height).toBeLessThanOrEqual(pic.y + 1);
    const ys = await Promise.all(['slider-β', 'slider-h', 'check-showParticles', 'check-showStats'].map(async (id) => (await page.getByTestId(id).boundingBox()).y));
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(20);
  });
  test('a β slider step by keyboard turns the swarm, the mean and the plot points', async ({ page }) => {
    await openDemo(page, URL);
    const before = await view(page);
    await page.getByTestId('slider-β').focus();
    await page.keyboard.press('ArrowRight');
    // the default 4.712 is off the slider's 0.01 grid: one step goes to the next grid value (Q-SC-01)
    await expect.poll(async () => (await state(page)).β).toBeCloseTo(4.72, 12);
    const after = await view(page);
    expect(Math.hypot(...after.mean)).toBeCloseTo(Math.hypot(...before.mean), 12);
    expect(after.mean[0]).toBeGreaterThan(before.mean[0]);
  });
  test('an h slider step by keyboard changes the fill level and the statistics', async ({ page }) => {
    await openDemo(page, URL);
    const before = await view(page);
    await page.getByTestId('slider-h').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).h).toBeCloseTo(0.659, 12);
    const after = await view(page);
    expect(after.area).toBeLessThan(before.area);
    expect(after.meanRadius).toBeGreaterThan(before.meanRadius);
  });
  test('the checkboxes show the particles and the values', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('check-showParticles').click();
    await expect(page.getByTestId('particles')).toHaveCount(1);
    expect((await state(page)).showParticles).toBe(true);
    expect((await view(page)).particles).toBeGreaterThan(300);
    await page.getByTestId('check-showStats').click();
    await expect(page.getByTestId('stats')).toHaveCount(1);
    await expect(page.getByTestId('stats')).toContainText('area=0.904135');
    await page.getByTestId('check-showStats').click();
    await expect(page.getByTestId('stats')).toHaveCount(0);
  });
  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ β: 1, h: 1.5, showParticles: true, showStats: true }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.getByTestId('particles')).toHaveCount(0);
  });
  test('review screenshots at the four snapshot settings (and the opening state)', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await reviewShot(page, testInfo, 'swarm-circle-opening');
    const fx = JSON.parse(fs.readFileSync('tests/golden/swarm-circle.original-states.json', 'utf8'));
    for (const k of Object.keys(fx.snapshots)) {
      const s = fx.snapshots[k];
      const after = await page.evaluate((st) => window.__demo.setState(st), s);
      expect(after.β).toBe(s.β);
      await expect(page.getByTestId('particles')).toHaveCount(s.showParticles ? 1 : 0);
      await reviewShot(page, testInfo, `swarm-circle-snapshot-${k}`);
    }
  });
});
