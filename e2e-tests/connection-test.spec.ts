import { test, expect } from '@playwright/test';
import SupabaseHelper from './helpers/supabase';

test.describe('Connection Test', () => {
  test('Can connect to Supabase and create test activity', async () => {
    console.log('Testing Supabase connection...');
    
    // Test creating an activity
    const activityId = await SupabaseHelper.createActivity({
      title: 'Connection Test Activity',
      description: 'Testing E2E setup'
    });
    
    expect(activityId).not.toBeNull();
    console.log('Created test activity with ID:', activityId);
    
    if (activityId) {
      // Test fetching the activity
      const activity = await SupabaseHelper.getActivityById(activityId);
      expect(activity).not.toBeNull();
      expect(activity?.title).toBe('Connection Test Activity');
      
      // Clean up
      await SupabaseHelper.deleteActivity(activityId);
      console.log('Cleaned up test activity');
    }
  });
  
  test('Can access the application', async ({ page }) => {
    await page.goto(process.env.APP_BASE_URL || 'https://aims-pi.vercel.app');
    
    // Check if page loads
    await expect(page).toHaveTitle(/AIMS/i);
    
    // Check for login page or main content
    const hasLoginForm = await page.locator('input[type="email"], input[type="password"]').count() > 0;
    const hasMainContent = await page.locator('nav, header, main').count() > 0;
    
    expect(hasLoginForm || hasMainContent).toBe(true);
    console.log('Application is accessible');
  });
});