import { test, expect } from '@playwright/test';

test('Basic application test', async ({ page }) => {
  await page.goto('https://aims-pi.vercel.app');
  
  // Check if page loads - the app is called æther
  await expect(page).toHaveTitle(/æther/i, { timeout: 10000 });
  
  console.log('✅ Application is accessible');
});