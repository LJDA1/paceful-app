import { test, expect } from '@playwright/test';

// Investor page tests - use HTTP requests for reliability
test.describe('Investor Page', () => {
  test('returns 200', async ({ request }) => {
    const response = await request.get('/investors');
    expect(response.status()).toBe(200);
  });

  test('contains expected content', async ({ request }) => {
    const response = await request.get('/investors');
    const html = await response.text();
    expect(html).toContain('Paceful');
    expect(html).toContain('investor');
  });
});
