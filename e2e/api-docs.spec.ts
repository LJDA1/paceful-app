import { test, expect } from '@playwright/test';

test.describe('API Documentation', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/api-docs');
    await expect(page.getByRole('heading', { name: /api reference/i })).toBeVisible();
  });

  test('displays sidebar navigation', async ({ page }) => {
    await page.goto('/api-docs');
    await expect(page.getByText('Getting Started')).toBeVisible();
    await expect(page.getByText('Authentication')).toBeVisible();
    await expect(page.getByText('Endpoints')).toBeVisible();
  });

  test('displays endpoint documentation', async ({ page }) => {
    await page.goto('/api-docs');
    await expect(page.getByText('/api/b2b/predictions')).toBeVisible();
  });

  test('shows code examples', async ({ page }) => {
    await page.goto('/api-docs');
    // Check for code block
    await expect(page.locator('pre').first()).toBeVisible();
  });

  test('has rate limits section', async ({ page }) => {
    await page.goto('/api-docs');
    await expect(page.getByText('Rate Limits')).toBeVisible();
  });
});
