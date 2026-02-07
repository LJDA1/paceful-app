import { test, expect } from '@playwright/test';

test.describe('Admin Pages', () => {
  test('predictions dashboard loads', async ({ page }) => {
    await page.goto('/admin/predictions');
    await expect(page.getByText('Prediction Analytics')).toBeVisible();
  });

  test('predictions dashboard shows metrics', async ({ page }) => {
    await page.goto('/admin/predictions');
    await expect(page.getByText('Total Predictions')).toBeVisible();
  });

  test('api-keys page loads', async ({ page }) => {
    await page.goto('/admin/api-keys');
    // Should load without error
    await expect(page).toHaveURL('/admin/api-keys');
  });

  test('usage analytics page loads', async ({ page }) => {
    await page.goto('/admin/usage');
    // Should load without error
    await expect(page).toHaveURL('/admin/usage');
  });
});
