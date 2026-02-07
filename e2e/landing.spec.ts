import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Paceful/);
  });

  test('displays hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /heal at your pace/i })).toBeVisible();
  });

  test('has working navigation links', async ({ page }) => {
    await page.goto('/');

    // Check signup link
    const signupLink = page.getByRole('link', { name: /start free/i }).first();
    await expect(signupLink).toBeVisible();

    // Check demo link
    const demoLink = page.getByRole('link', { name: /demo/i }).first();
    await expect(demoLink).toBeVisible();
  });

  test('displays stats section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('84%')).toBeVisible();
    await expect(page.getByText('Prediction Accuracy')).toBeVisible();
  });

  test('has enterprise section with API docs link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('For Enterprise')).toBeVisible();
    await expect(page.getByRole('link', { name: /api documentation/i })).toBeVisible();
  });
});
