// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Hiroki Sayama
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/predator-prey-agents.spec.js — browser tests of the "Predator-Prey Ecosystem: A Real-Time Agent-Based
// Simulation" page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo } from './helpers.js';

const URL = '/demos/predator-prey-agents/?seed=7';
const golden = JSON.parse(fs.readFileSync('tests/golden/predator-prey-agents.original-states.json', 'utf8'));
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());

test.describe('predator-prey-agents', () => {
  test('loads without errors and draws the saved foxes and rabbits', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('foxes')).toHaveCount(1);
    await expect(page.getByTestId('rabbits')).toHaveCount(1);
    expect(await view(page)).toEqual({ foxes: 7, rabbits: 93, agents: 100 });
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-foxEndurance')).toHaveValue('10');
    await expect(page.getByTestId('check-moving')).not.toBeChecked();
    const s = await state(page);
    expect([s.rabbitGrowthRate, s.rabbitMobility, s.foxGrowthRate, s.foxMobility]).toEqual([0.5, 0.03, 0.5, 0.05]);
  });

  test('run simulation moves the agents step after step until it is unchecked', async ({ page }) => {
    await openDemo(page, URL);
    const before = (await state(page)).ag;
    await page.getByTestId('check-moving').click();
    await expect.poll(async () => JSON.stringify((await state(page)).ag) !== JSON.stringify(before)).toBe(true);
    await page.getByTestId('check-moving').click();
    await expect.poll(async () => (await state(page)).moving).toBe(false);
    const stopped = JSON.stringify((await state(page)).ag);
    await page.waitForTimeout(300);
    expect(JSON.stringify((await state(page)).ag)).toBe(stopped);
  });

  test('Reset stops the run and places 100 new agents', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('check-moving').click();
    await page.getByTestId('button-reset-agents').click();
    await expect.poll(async () => (await state(page)).moving).toBe(false);
    expect((await view(page)).agents).toBe(100);
    await expect(page.getByTestId('check-moving')).not.toBeChecked();
  });

  test('a slider changes its rate; the saved snapshot agents are drawn', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-foxEndurance').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).foxEndurance).toBe(11);
    await page.evaluate((s) => window.__demo.setState(s), golden.snapshots[4]);
    await expect.poll(async () => (await view(page)).agents).toBe(632);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ rabbitGrowthRate: 0.9, foxEndurance: 3, ag: [[0.5, 0.5, 0, 1]] }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
