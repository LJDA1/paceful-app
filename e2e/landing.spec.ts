import { test, expect } from '@playwright/test';

// Homepage tests - use HTTP requests for reliability
test.describe('Homepage', () => {
  test('returns 200', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
  });

  test('contains expected content', async ({ request }) => {
    const response = await request.get('/');
    const html = await response.text();
    expect(html).toContain('Paceful');
  });
});
