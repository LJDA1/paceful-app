import { test, expect } from '@playwright/test';

// Basic smoke tests that don't require database
test.describe('Basic Smoke Tests', () => {
  test('homepage returns 200', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
  });

  test('investors page returns 200', async ({ request }) => {
    const response = await request.get('/investors');
    expect(response.status()).toBe(200);
  });

  test('api-docs page returns 200', async ({ request }) => {
    const response = await request.get('/api-docs');
    expect(response.status()).toBe(200);
  });

  test('demo page returns 200', async ({ request }) => {
    const response = await request.get('/demo');
    expect(response.status()).toBe(200);
  });

  test('login page returns 200', async ({ request }) => {
    const response = await request.get('/login');
    expect(response.status()).toBe(200);
  });

  test('signup page returns 200', async ({ request }) => {
    const response = await request.get('/signup');
    expect(response.status()).toBe(200);
  });
});
