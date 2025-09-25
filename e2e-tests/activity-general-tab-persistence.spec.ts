import { test, expect } from '@playwright/test';

test.describe('Activity General Tab Persistence', () => {
  test('single refresh shows both Title and Acronym', async ({ page }) => {
    await page.goto('/activities/new');

    // Enter Title first to trigger activity creation
    const title = 'E2E Test Activity ' + Math.random().toString(36).slice(2, 7);
    const acronym = 'E2E' + Math.random().toString(36).slice(2, 4).toUpperCase();

    await page.getByLabel('Activity Title').fill(title);

    // Wait briefly for creation to occur
    await page.waitForTimeout(1200);

    // Fill Acronym
    await page.getByLabel('Activity Acronym').fill(acronym);

    // Wait for atomic debounce and save
    await page.waitForTimeout(1500);

    // Single refresh
    await page.reload();

    // Assert both fields are present after a single refresh
    await expect(page.getByLabel('Activity Title')).toHaveValue(title);
    await expect(page.getByLabel('Activity Acronym')).toHaveValue(acronym);
  });
});


