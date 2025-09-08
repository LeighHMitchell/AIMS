import { test, expect } from '@playwright/test';

test.describe('Activity Title Validation Bug - Diagnostic Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the new activity page
    await page.goto('/activities/new');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Add a small delay to ensure all React components are mounted
    await page.waitForTimeout(1000);
  });

  test('Activity Title field should NOT show green tick on initial load', async ({ page }) => {
    console.log('Testing: Activity Title should have no validation icon on load');
    
    // Find the Activity Title label and its container
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    
    // Check for the presence of any validation icons (green tick or orange spinner)
    const greenTick = titleLabel.locator('.text-green-600');
    const orangeSpinner = titleLabel.locator('.text-orange-600');
    
    // Log the current state
    const greenTickCount = await greenTick.count();
    const orangeSpinnerCount = await orangeSpinner.count();
    
    console.log(`Green tick count on load: ${greenTickCount}`);
    console.log(`Orange spinner count on load: ${orangeSpinnerCount}`);
    
    // Take a screenshot for evidence
    await page.screenshot({ 
      path: 'test-artifacts/activity-title-initial-state.png',
      fullPage: false 
    });
    
    // ASSERTION: No green tick should be visible on initial load
    expect(greenTickCount).toBe(0);
    
    // ASSERTION: No orange spinner should be visible on initial load
    expect(orangeSpinnerCount).toBe(0);
  });

  test('Activity Title field should show orange spinner while saving', async ({ page }) => {
    console.log('Testing: Orange spinner should appear during save');
    
    // Find the Activity Title input field
    const titleInput = page.locator('input[id="title"]').first();
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    
    // Type into the field
    await titleInput.fill('Test Activity Title');
    
    // Check for orange spinner immediately after typing
    const orangeSpinner = titleLabel.locator('.text-orange-600.animate-spin');
    
    // Wait a brief moment for the spinner to appear
    await page.waitForTimeout(100);
    
    // Check if spinner is visible
    const spinnerVisible = await orangeSpinner.isVisible();
    
    console.log(`Orange spinner visible during save: ${spinnerVisible}`);
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'test-artifacts/activity-title-saving-state.png',
      fullPage: false 
    });
    
    // ASSERTION: Orange spinner should be visible while saving
    expect(spinnerVisible).toBe(true);
  });

  test('Activity Title field should show green tick only after successful save', async ({ page }) => {
    console.log('Testing: Green tick should appear only after backend confirmation');
    
    // Find the Activity Title input field
    const titleInput = page.locator('input[id="title"]').first();
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    
    // Type into the field
    await titleInput.fill('Test Activity Title for Save');
    
    // Wait for the save to complete (orange spinner to disappear and green tick to appear)
    await page.waitForTimeout(3000); // Allow time for debounce and save
    
    // Check for green tick
    const greenTick = titleLabel.locator('.text-green-600');
    const orangeSpinner = titleLabel.locator('.text-orange-600');
    
    const greenTickVisible = await greenTick.isVisible();
    const orangeSpinnerVisible = await orangeSpinner.isVisible();
    
    console.log(`Green tick visible after save: ${greenTickVisible}`);
    console.log(`Orange spinner still visible: ${orangeSpinnerVisible}`);
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'test-artifacts/activity-title-saved-state.png',
      fullPage: false 
    });
    
    // ASSERTION: Green tick should be visible after save
    expect(greenTickVisible).toBe(true);
    
    // ASSERTION: Orange spinner should NOT be visible after save
    expect(orangeSpinnerVisible).toBe(false);
  });

  test('Check isPersistentlySaved state initialization', async ({ page }) => {
    console.log('Testing: Checking initial isPersistentlySaved state');
    
    // Add console log listener to capture React component logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('FieldAutosave')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Navigate to the page again to capture logs from the start
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    
    // Wait for React to render
    await page.waitForTimeout(2000);
    
    // Print captured logs
    console.log('Captured FieldAutosave logs:');
    consoleLogs.forEach(log => console.log(log));
    
    // Check the title field state
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    const greenTick = titleLabel.locator('.text-green-600');
    
    const greenTickCount = await greenTick.count();
    
    // Log the HTML of the label to see what's being rendered
    const labelHTML = await titleLabel.innerHTML();
    console.log('Activity Title label HTML:', labelHTML);
    
    // ASSERTION: Should not have green tick on load
    expect(greenTickCount).toBe(0);
  });

  test('Validate LabelSaveIndicator props on initial render', async ({ page }) => {
    console.log('Testing: LabelSaveIndicator initial props validation');
    
    // Inject debugging code to check React component props
    await page.addInitScript(() => {
      // Hook into React DevTools if available
      const originalCreateElement = (window as any).React?.createElement;
      if (originalCreateElement) {
        (window as any).React.createElement = function(...args: any[]) {
          const [component, props] = args;
          
          // Log LabelSaveIndicator props
          if (component?.name === 'LabelSaveIndicator' && props?.children?.includes?.('Activity Title')) {
            console.log('LabelSaveIndicator props for Activity Title:', {
              isSaving: props.isSaving,
              isSaved: props.isSaved,
              hasValue: props.hasValue
            });
          }
          
          return originalCreateElement.apply(this, args);
        };
      }
    });
    
    // Navigate to the page
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    
    // Check the rendered state
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    const greenTick = titleLabel.locator('.text-green-600');
    
    // Take a detailed screenshot
    await page.screenshot({ 
      path: 'test-artifacts/activity-title-label-detail.png',
      fullPage: false 
    });
    
    const greenTickExists = await greenTick.count() > 0;
    
    console.log(`Green tick exists on initial render: ${greenTickExists}`);
    
    // ASSERTION: No green tick should exist
    expect(greenTickExists).toBe(false);
  });
});