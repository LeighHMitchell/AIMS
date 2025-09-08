import { test, expect } from '@playwright/test';

test('Debug page structure', async ({ page }) => {
  console.log('=== DEBUGGING PAGE STRUCTURE ===');
  
  await page.goto('/activities/new');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Check if page loaded properly
  const title = await page.title();
  const url = page.url();
  console.log(`Page title: ${title}`);
  console.log(`Current URL: ${url}`);
  
  // Look for any text content
  const bodyText = await page.locator('body').textContent();
  const hasActivityText = bodyText?.includes('Activity');
  const hasTitleText = bodyText?.includes('Title');
  
  console.log(`Body contains "Activity": ${hasActivityText}`);
  console.log(`Body contains "Title": ${hasTitleText}`);
  
  // Look for form elements
  const inputs = await page.locator('input').count();
  const labels = await page.locator('label').count();
  
  console.log(`Total inputs on page: ${inputs}`);
  console.log(`Total labels on page: ${labels}`);
  
  // Get first few input types and IDs
  if (inputs > 0) {
    for (let i = 0; i < Math.min(inputs, 5); i++) {
      const input = page.locator('input').nth(i);
      const type = await input.getAttribute('type');
      const id = await input.getAttribute('id');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`Input ${i}: type=${type}, id=${id}, placeholder=${placeholder}`);
    }
  }
  
  // Take full page screenshot
  await page.screenshot({ 
    path: 'test-artifacts/debug-page-structure.png',
    fullPage: true 
  });
  
  // Check console errors
  const logs: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.push(`Console error: ${msg.text()}`);
    }
  });
  
  await page.waitForTimeout(1000);
  
  if (logs.length > 0) {
    console.log('Console errors found:');
    logs.forEach(log => console.log(`  ${log}`));
  } else {
    console.log('No console errors found');
  }
  
  console.log('=== DEBUG COMPLETE ===');
});