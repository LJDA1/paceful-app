import { test, expect } from '@playwright/test';

test.describe('API Documentation', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/api-docs');
    // Check for any main heading on the page
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('displays sidebar navigation', async ({ page }) => {
    await page.goto('/api-docs');
    await expect(page.getByRole('link', { name: /getting started/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /authentication/i })).toBeVisible();
  });

  test('displays endpoint documentation', async ({ page }) => {
    await page.goto('/api-docs');
    await expect(page.getByRole('heading', { name: /aggregate/i }).first()).toBeVisible();
  });

  test('shows code examples', async ({ page }) => {
    await page.goto('/api-docs');
    await expect(page.locator('pre').first()).toBeVisible();
  });

  test('has rate limits section', async ({ page }) => {
    await page.goto('/api-docs');
    await expect(page.getByRole('heading', { name: /rate limits/i })).toBeVisible();
  });
});
