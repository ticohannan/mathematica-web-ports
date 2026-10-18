// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Lillian Lin
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/two-link-kinematics.spec.js — browser tests of the two-link arm page with the real mouse and keyboard.
// Expected values: the TESTPLAN rows T-TK-59 … T-TK-69 (hand-derived, see tests/unit/two-link-kinematics.test.js).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/two-link-kinematics/';
const toClient = (page, p) => page.evaluate((q) => window.__demo.worldToClient(q), p);
const ctlToClient = (page, name, p) => page.evaluate(([n, q]) => window.__demo.controlToClient(n, q), [name, p]);
const getState = (page) => page.evaluate(() => window.__demo.getState());
const getLocals = (page) => page.evaluate(() => window.__demo.locals());
async function dragClient(page, a, b, steps = 8) {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}
const drag = async (page, from, to) => dragClient(page, await toClient(page, from), await toClient(page, to));
const dialAngle = (page, name) => page.locator(`[data-testid=dial-svg-${name}] [data-layer=hand]`).getAttribute('data-ang').then(Number);
const near = (a, b, tol) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);

test.describe('two-link kinematics', () => {
  test('loads without errors and draws workspace, arm, ellipse arrows and the two locator icons', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['workspace', 'workspace-label', 'link1', 'link2', 'sigma1-plus', 'sigma1-minus', 'loc-pEnd', 'loc-pVel', 'velocity', 'base', 'elbow']) {
      await expect(page.getByTestId(id), id).toHaveCount(1);
    }
    await expect(page.getByTestId('workspace-label')).toHaveText('Workspace');
    await expect(page.getByTestId('robot-arm')).toHaveText('Robot Arm');
    await expect(page.getByTestId('ellipse')).toHaveCount(0); // rank 1 at the opening state
    await expect(page.getByTestId('hole')).toHaveCount(0); // r1 = 1
    await expect(page.locator('[data-testid=theta1-arc]')).toHaveAttribute('data-kind', 'Point'); // gray dot at (1/4, 0)
    await reviewShot(page, testInfo, 'two-link-kinematics-initial');
  });

  test('has the controls of the original with their defaults: r1, two dials, elbow up, joint velocity pad', async ({ page }) => {
    await openDemo(page, URL);
    const order = await page.locator('#controls > [data-testid^=ctl-]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    expect(order).toEqual(['ctl-r1', 'ctl-p1', 'ctl-p2', 'ctl-IsElbowUp', 'ctl-jointVel']);
    await expect(page.getByTestId('value-r1')).toHaveValue('1');
    expect(await dialAngle(page, 'p1')).toBe(0);
    expect(await dialAngle(page, 'p2')).toBe(0);
    await expect(page.getByTestId('check-IsElbowUp')).toBeChecked();
    expect((await getState(page)).jointVel).toEqual([0.4, 0.2]); // the saved state (Q-TK-01)
    await expect(page.getByTestId('ctl-jointVel').locator('.ctl-label')).toHaveText('joint\nvelocity');
  });

  test('dragging the end-effector locator with the mouse moves the arm (inverse kinematics) and turns the dials', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [2, 0], [1, 1]);
    const L = await getLocals(page);
    near(L.Theta1, Math.PI / 2, 0.02);
    near(L.Theta2, -Math.PI / 2, 0.02);
    near(await dialAngle(page, 'p1'), Math.PI / 2, 0.02);
    near(await dialAngle(page, 'p2'), -Math.PI / 2, 0.02);
    await expect(page.getByTestId('check-IsElbowUp')).toBeChecked();
  });

  test('a press away from both locators moves the nearer one there', async ({ page }) => {
    await openDemo(page, URL);
    const c = await toClient(page, [-1, -1]); // nearer to pEnd (2, 0) than to pVel (2, 1)
    await page.mouse.click(c.x, c.y);
    const s = await getState(page);
    near(s.pEnd[0], -1, 0.02);
    near(s.pEnd[1], -1, 0.02);
    const L = await getLocals(page);
    expect(L.kinematics).toBe('IK');
  });

  test('dragging the green locator changes the joint velocity pad (inverse velocity)', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [2, 0], [1, 1]);
    const s0 = await getState(page);
    // exact (1, 1) through the hook, then the green icon with the mouse
    await page.evaluate(() => window.__demo.moveLocator('pEnd', [1, 1]));
    const s1 = await getState(page);
    expect(s1.pEnd).toEqual([1, 1]);
    expect(s0.pEnd[0]).toBeCloseTo(1, 1);
    await drag(page, s1.pVel, [1.2, 1.3]);
    const s = await getState(page);
    near(s.jointVel[0], -0.2, 0.03);
    near(s.jointVel[1], 0.5, 0.03);
    expect(s.pVelp).toEqual(s.pVel);
  });

  test('dragging a dial turns the arm and moves the end effector (forward kinematics)', async ({ page }) => {
    await openDemo(page, URL);
    const c = await ctlToClient(page, 'p1', [0, 1]);
    await page.mouse.click(c.x, c.y);
    const s = await getState(page);
    near(s.p1[0], 0, 0.01);
    near(s.p1[1], 1, 0.01);
    near(s.pEnd[0], 0, 0.03);
    near(s.pEnd[1], 2, 0.03);
    expect((await getLocals(page)).kinematics).toBe('FK');
    // θ2 dial: a press on its rim at π/2 bends the arm, the check box follows the sign of θ2 (Q-TK-02)
    const d = await ctlToClient(page, 'p2', [0, 0.9]);
    await page.mouse.click(d.x, d.y);
    await expect(page.getByTestId('check-IsElbowUp')).not.toBeChecked();
  });

  test('clicking elbow up flips the arm to the other solution', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [2, 0], [1, 1]);
    const before = await getState(page);
    await page.getByTestId('check-IsElbowUp').click();
    await expect(page.getByTestId('check-IsElbowUp')).not.toBeChecked();
    const L = await getLocals(page);
    near(L.Theta1, 0, 0.02);
    near(L.Theta2, Math.PI / 2, 0.02);
    const s = await getState(page);
    expect(s.pEnd).toEqual(before.pEnd); // the tip stays (Q-TK-06)
  });

  test('the joint velocity pad keeps its locator inside the unit disk', async ({ page }) => {
    await openDemo(page, URL);
    const before = await page.evaluate(() => window.__demo.scene().find((d) => d.role === 'jointVel1').data);
    const a = await ctlToClient(page, 'jointVel', [0.4, 0.2]);
    const b = await ctlToClient(page, 'jointVel', [1.6, 1.4]);
    await dragClient(page, a, b);
    const s = await getState(page);
    near(Math.hypot(...s.jointVel), 1, 1e-9);
    const after = await page.evaluate(() => window.__demo.scene().find((d) => d.role === 'jointVel1').data);
    expect(after.tip).not.toEqual(before.tip);
  });

  test('moving the r1 slider changes the link lengths and the white inner disk', async ({ page }) => {
    await openDemo(page, URL);
    const range = page.getByTestId('slider-r1');
    const box = await range.boundingBox();
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    const s = await getState(page);
    expect(s.r1).toBeGreaterThan(1.2);
    expect(s.r1).toBeLessThan(1.8);
    const hole = await page.evaluate(() => window.__demo.scene().find((d) => d.role === 'hole'));
    near(hole.r, Math.abs(s.r1 - (2 - s.r1)), 1e-12);
    await expect(page.getByTestId('hole')).toHaveCount(1);
    expect(s.p1).toEqual([1, 0]); // angles unchanged (FK)
    expect(s.p2).toEqual([1, 0]);
    expect(s.pEnd).toEqual([2, 0]);
    const link1 = await page.evaluate(() => window.__demo.scene().find((d) => d.role === 'link1').rect);
    near(link1[1][0], s.r1 + 1 / 8, 1e-12);
    await expect(page.getByTestId('value-r1')).toHaveValue(/^1\.\d+$/);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await getState(page);
    await drag(page, [2, 0], [0.5, -1]);
    await page.getByTestId('check-IsElbowUp').click();
    const range = page.getByTestId('slider-r1');
    const box = await range.boundingBox();
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2);
    expect(await getState(page)).not.toEqual(opening);
    await page.getByTestId('reset').click();
    expect(await getState(page)).toEqual(opening);
    await expect(page.getByTestId('value-r1')).toHaveValue('1');
    await expect(page.getByTestId('check-IsElbowUp')).toBeChecked();
  });

  test('arrow keys move a focused locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-pEnd').focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
    const s = await getState(page);
    near(s.pEnd[0], 1.85, 1e-12);
    expect(s.pEnd[1]).toBe(0);
    expect((await getLocals(page)).kinematics).toBe('IK');
    // a dial (from the opening state): keyStep 0.05 in the dial's coordinates, then Normalize: ArcTan[1, 0.05]
    await page.getByTestId('reset').click();
    await page.getByTestId('locator-p1').focus();
    await page.keyboard.press('ArrowUp');
    near(await dialAngle(page, 'p1'), 0.04995839572194276, 1e-15);
    near((await getLocals(page)).Theta1, 0.04995839572194276, 1e-15);
    // the pad: 0.05 per key in its own coordinates, then its setter
    await page.getByTestId('locator-jointVel').focus();
    await page.keyboard.press('ArrowRight');
    near((await getState(page)).jointVel[0], 0.45, 1e-15);
  });

  test('review screenshots at the four snapshot states', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/two-link-kinematics.original-states.json', 'utf8'));
    const plain = (v) => (Array.isArray(v) ? v.map(plain) : v && typeof v === 'object' && 'n' in v ? v.n : v);
    for (const k of ['1', '2', '3', '4']) {
      const s = Object.fromEntries(Object.entries(fx.snapshots[k]).map(([a, b]) => [a, plain(b)]));
      const after = await page.evaluate((st) => window.__demo.setState(st), s);
      for (const n of ['p1', 'p2', 'IsElbowUp']) expect(after[n], `snapshot ${k} ${n}`).toEqual(s[n]);
      await reviewShot(page, testInfo, `two-link-kinematics-snapshot-${k}`);
    }
  });
});
