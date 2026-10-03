// tests/e2e/site.spec.js — landing page and links
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
