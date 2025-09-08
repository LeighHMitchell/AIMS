import { test, expect } from '@playwright/test';

test('Check login page structure', async ({ page }) => {
  await page.goto('https://aims-pi.vercel.app/login');
  
  // Take a screenshot to see what the login page looks like
  await page.screenshot({ path: 'test-results/login-page.png' });
  
  // Check for various possible login elements
  const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').count();
  const passwordInput = await page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').count();
  const submitButton = await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').count();
  
  console.log('Login page elements:');
  console.log('- Email inputs found:', emailInput);
  console.log('- Password inputs found:', passwordInput);
  console.log('- Submit buttons found:', submitButton);
  
  // Check if we're already logged in (redirected to another page)
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  if (currentUrl.includes('/login')) {
    expect(emailInput).toBeGreaterThan(0);
    expect(passwordInput).toBeGreaterThan(0);
  } else {
    console.log('Appears to be redirected - might already be logged in or login not required');
  }
});