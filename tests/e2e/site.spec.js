// tests/e2e/site.spec.js — landing page, links, attribution
import { test, expect } from '@playwright/test';

test('landing page links to all three demos and they load', async ({ page }) => {
  await page.goto('/index.html');
  const links = page.locator('a[data-testid^="demo-link-"]');
  await expect(links).toHaveCount(3);
  for (const href of await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
    const res = await page.request.get(new URL(href, page.url()).toString());
    expect(res.status(), href).toBe(200);
  }
});

test('private folders are not served by the local server', async ({ page }) => {
  const res = await page.request.get('/_internal/RULES_AND_GUIDANCE.md');
  expect(res.status()).toBe(403);
});

// CC BY-NC-SA 3.0 requires every copy (each page) to credit the authors, the title, the source,
// the licence, and to say that this is an adaptation.
const pages = [
  { url: '/demos/motion-planning/', authors: ['Shreyas Poyrekar', 'Aaron T. Becker', 'Arifa Sultana'], title: 'Motion Planning for Robot Path around Obstacles' },
  { url: '/demos/three-parametrizations/', authors: ['Aaron T. Becker', 'Benedict Isichei'], title: 'Three Parametrizations of Rotations' },
  { url: '/demos/euler-angles/', authors: ['Kevin Hernandez', 'Sándor Kabai'], title: 'Euler Angles: Precession, Nutation, and Spin' },
];
for (const p of pages) {
  test(`attribution on ${p.url}`, async ({ page }) => {
    await page.goto(p.url);
    const credits = page.getByTestId('credits');
    for (const a of p.authors) await expect(credits).toContainText(a);
    await expect(credits).toContainText(p.title);
    await expect(credits).toContainText('Adapted from');
    await expect(credits.locator('a[href="https://creativecommons.org/licenses/by-nc-sa/3.0/"]')).toHaveCount(1);
    await expect(credits.locator('a[href^="https://demonstrations.wolfram.com/"]')).toHaveCount(1);
    await expect(credits).toContainText('Not affiliated with or endorsed');
  });
}

test('attribution on the landing page', async ({ page }) => {
  await page.goto('/index.html');
  const credits = page.getByTestId('credits');
  await expect(credits.locator('a[href="https://creativecommons.org/licenses/by-nc-sa/3.0/"]')).toHaveCount(1);
  await expect(credits).toContainText('Not affiliated with or endorsed');
});
