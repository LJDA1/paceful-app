import { test, expect } from '@playwright/test';

test.describe('Investor Page', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/investors');
    await expect(page.getByRole('heading', { name: /paceful/i })).toBeVisible();
  });

  test('displays key metrics section', async ({ page }) => {
    await page.goto('/investors');
    await expect(page.getByText('Platform Metrics')).toBeVisible();
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('Predictions Generated')).toBeVisible();
  });

  test('displays problem and solution sections', async ({ page }) => {
    await page.goto('/investors');
    await expect(page.getByText('The Problem')).toBeVisible();
    await expect(page.getByText('Our Solution')).toBeVisible();
  });

  test('displays prediction accuracy stats', async ({ page }) => {
    await page.goto('/investors');
    await expect(page.getByText('Prediction Accuracy')).toBeVisible();
    await expect(page.getByText('87%')).toBeVisible();
  });

  test('displays the ask section', async ({ page }) => {
    await page.goto('/investors');
    await expect(page.getByText('The Ask')).toBeVisible();
    await expect(page.getByText('$1.5M')).toBeVisible();
  });

  test('has contact links', async ({ page }) => {
    await page.goto('/investors');
    await expect(page.getByRole('link', { name: /contact us/i })).toBeVisible();
  });
});
