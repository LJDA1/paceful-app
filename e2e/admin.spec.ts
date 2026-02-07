import { test, expect } from '@playwright/test';

// Admin pages require database - test URL accessibility only
test.describe('Admin Pages', () => {
  test('admin routes exist', async ({ page }) => {
    // Just verify the routes don't 404
    const response1 = await page.goto('/admin/predictions');
    expect(response1?.status()).not.toBe(404);
  });
});
