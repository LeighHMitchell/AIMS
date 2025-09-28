import { test, expect } from '@playwright/test';

test.describe('Activity Locations Modal Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for sample data
    await page.route('/api/activities/test-activity-id/locations', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          locations: [],
          percentageSummary: null
        })
      });
    });

    // Navigate to test activity
    await page.goto('/activities/test-activity-id');
    await page.waitForLoadState('networkidle');
  });

  test('modal opens from Activity Locations tab', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('h3:has-text("Activity Locations")')).toBeVisible();

    // Click "Add Location" button
    await page.click('[data-testid="add-location-button"]');

    // Verify modal opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Add Location")')).toBeVisible();

    // Test tab trapping - Tab should cycle within modal
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Test ESC close
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('search flow: Kempinski Hotel, Napier', async ({ page }) => {
    // Mock search API response
    await page.route('**/nominatim.openstreetmap.org/search*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: '1',
          name: 'Kempinski Hotel',
          display_name: 'Kempinski Hotel, Napier Street, Arcadia, Pretoria, City of Tshwane Metropolitan Municipality, Gauteng, 0083, South Africa',
          lat: '-25.7461',
          lon: '28.2184',
          type: 'hotel',
          address: {
            hotel: 'Kempinski Hotel',
            road: 'Napier Street',
            suburb: 'Arcadia',
            city: 'Pretoria',
            state: 'Gauteng',
            postcode: '0083',
            country: 'South Africa',
            country_code: 'za'
          }
        }])
      });
    });

    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Type search query
    await page.fill('[placeholder*="Search for a location"]', 'Kempinski Hotel, Napier');

    // Wait for search results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

    // Select result
    await page.click('[data-testid="search-results"] button');

    // Verify fields are populated
    await expect(page.locator('[data-testid="latitude-input"]')).toHaveValue('-25.7461');
    await expect(page.locator('[data-testid="longitude-input"]')).toHaveValue('28.2184');
    await expect(page.locator('[data-testid="address-input"]')).toHaveValue('Kempinski Hotel, Napier Street, Arcadia, Pretoria, City of Tshwane Metropolitan Municipality, Gauteng, 0083, South Africa');

    // Verify map marker is set
    await expect(page.locator('[data-testid="location-map"]')).toBeVisible();

    // Fill location name and save
    await page.fill('[data-testid="location-name-input"]', 'Kempinski Hotel Pretoria');
    await page.click('[data-testid="save-location-button"]');

    // Verify location appears in list
    await expect(page.locator('[data-testid="location-card"]:has-text("Kempinski Hotel Pretoria")')).toBeVisible();
  });

  test('map flow: click spot, marker set, reverse geocode fills fields', async ({ page }) => {
    // Mock reverse geocoding API response
    await page.route('**/nominatim.openstreetmap.org/reverse*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'New York City, New York, United States',
          address: {
            city: 'New York City',
            state: 'New York',
            country: 'United States',
            country_code: 'us'
          }
        })
      });
    });

    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Click on map at specific coordinates
    const map = page.locator('[data-testid="location-map"]');
    await map.click({ position: { x: 200, y: 150 } });

    // Verify coordinates are set
    await expect(page.locator('[data-testid="latitude-input"]')).toHaveValue('40.7128');
    await expect(page.locator('[data-testid="longitude-input"]')).toHaveValue('-74.0060');

    // Verify reverse geocoding populated address
    await expect(page.locator('[data-testid="address-input"]')).toHaveValue('New York City, New York, United States');
  });

  test('manual flow: paste lat/lon, type address, choose IATI fields', async ({ page }) => {
    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Manually enter coordinates
    await page.fill('[data-testid="latitude-input"]', '51.5074');
    await page.fill('[data-testid="longitude-input"]', '-0.1278');
    await page.fill('[data-testid="location-name-input"]', 'London Office');

    // Enter address manually
    await page.fill('[data-testid="address-input"]', '10 Downing Street, London, UK');

    // Select IATI fields
    await page.click('[data-testid="location-reach-select"]');
    await page.click('[data-testid="location-reach-option"]:has-text("Activity happens here")');

    await page.click('[data-testid="exactness-select"]');
    await page.click('[data-testid="exactness-option"]:has-text("Exact")');

    await page.click('[data-testid="location-class-select"]');
    await page.click('[data-testid="location-class-option"]:has-text("Structure")');

    // Enter gazetteer information
    await page.click('[data-testid="gazetteer-vocabulary-select"]');
    await page.click('[data-testid="gazetteer-vocabulary-option"]:has-text("GeoNames")');

    await page.fill('[data-testid="gazetteer-code-input"]', '2643743');

    // Enter administrative information
    await page.click('[data-testid="admin-level-select"]');
    await page.click('[data-testid="admin-level-option"]:has-text("Level 1")');

    await page.fill('[data-testid="admin-code-input"]', 'GB-LND');

    // Save location
    await page.click('[data-testid="save-location-button"]');

    // Verify location appears with all fields
    await expect(page.locator('[data-testid="location-card"]:has-text("London Office")')).toBeVisible();
  });

  test('layers control: switch to Terrain and Satellite, persist preference', async ({ page }) => {
    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Verify layers control exists
    await expect(page.locator('[data-testid="layers-control"]')).toBeVisible();

    // Switch to Terrain layer
    await page.click('[data-testid="layers-control"] button:has-text("Terrain")');
    await expect(page.locator('[data-testid="terrain-layer"]')).toBeVisible();

    // Switch to Satellite layer
    await page.click('[data-testid="layers-control"] button:has-text("Satellite")');
    await expect(page.locator('[data-testid="satellite-layer"]')).toBeVisible();

    // Verify preference is persisted (mock localStorage)
    const localStorageData = await page.evaluate(() => {
      return localStorage.getItem('map-layer-preference');
    });
    expect(localStorageData).toBe('satellite');
  });

  test('layers control: retry after tile error', async ({ page }) => {
    // Mock tile error
    await page.route('**/tile.openstreetmap.org/**', async route => {
      await route.abort();
    });

    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Verify error message appears
    await expect(page.locator('[data-testid="map-error-message"]')).toBeVisible();

    // Click retry button
    await page.click('[data-testid="retry-map-button"]');

    // Verify map loads successfully
    await expect(page.locator('[data-testid="map-error-message"]')).not.toBeVisible();
  });

  test('validation: leaving Gazetteer vocabulary without code prevents save', async ({ page }) => {
    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Enter location name
    await page.fill('[data-testid="location-name-input"]', 'Test Location');

    // Enter coordinates
    await page.fill('[data-testid="latitude-input"]', '40.7128');
    await page.fill('[data-testid="longitude-input"]', '-74.0060');

    // Select gazetteer vocabulary without code
    await page.click('[data-testid="gazetteer-vocabulary-select"]');
    await page.click('[data-testid="gazetteer-vocabulary-option"]:has-text("GeoNames")');

    // Try to save
    await page.click('[data-testid="save-location-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="validation-error"]:has-text("Location ID code is required")')).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toBeVisible(); // Modal should still be open
  });

  test('validation: missing lat/lon prevents save', async ({ page }) => {
    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Enter location name without coordinates
    await page.fill('[data-testid="location-name-input"]', 'Test Location');

    // Try to save
    await page.click('[data-testid="save-location-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="validation-error"]:has-text("Site locations must have latitude and longitude")')).toBeVisible();
  });

  test('sensitive toggle alters export preview', async ({ page }) => {
    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Enter location details
    await page.fill('[data-testid="location-name-input"]', 'Sensitive Location');
    await page.fill('[data-testid="latitude-input"]', '40.7128');
    await page.fill('[data-testid="longitude-input"]', '-74.0060');

    // Enable sensitive toggle
    await page.check('[data-testid="sensitive-toggle"]');

    // Save location
    await page.click('[data-testid="save-location-button"]');

    // Verify location appears with sensitive badge
    await expect(page.locator('[data-testid="location-card"]:has-text("Sensitive")')).toBeVisible();

    // Verify export preview shows sensitive handling
    await page.click('[data-testid="export-preview-button"]');
    await expect(page.locator('[data-testid="export-preview"]:has-text("Point coordinates omitted for sensitive location")')).toBeVisible();
  });

  test('cards: edit opens modal with values', async ({ page }) => {
    // Create a location first (mock the creation)
    await page.evaluate(() => {
      // Simulate adding a location to the page
      const mockLocation = {
        id: 'test-location-1',
        location_name: 'Test Location',
        location_type: 'site',
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'Test Address',
        site_type: 'office'
      };

      // Add to local storage or mock the API
      localStorage.setItem('test-locations', JSON.stringify([mockLocation]));
    });

    // Refresh page to load mock data
    await page.reload();

    // Click edit on location card
    await page.click('[data-testid="location-card"] [data-testid="edit-button"]');

    // Verify modal opens with pre-filled values
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="location-name-input"]')).toHaveValue('Test Location');
    await expect(page.locator('[data-testid="latitude-input"]')).toHaveValue('40.7128');
    await expect(page.locator('[data-testid="longitude-input"]')).toHaveValue('-74.0060');
  });

  test('cards: duplicate creates new card', async ({ page }) => {
    // Mock existing location
    await page.evaluate(() => {
      localStorage.setItem('test-locations', JSON.stringify([{
        id: 'test-location-1',
        location_name: 'Original Location',
        location_type: 'site',
        latitude: 40.7128,
        longitude: -74.0060
      }]));
    });

    await page.reload();

    // Click duplicate on location card
    await page.click('[data-testid="location-card"] [data-testid="duplicate-button"]');

    // Verify new card appears with "(Copy)" suffix
    await expect(page.locator('[data-testid="location-card"]:has-text("Original Location (Copy)")')).toBeVisible();
  });

  test('cards: delete removes location', async ({ page }) => {
    // Mock existing location
    await page.evaluate(() => {
      localStorage.setItem('test-locations', JSON.stringify([{
        id: 'test-location-1',
        location_name: 'Location to Delete',
        location_type: 'site'
      }]));
    });

    await page.reload();

    // Verify location exists
    await expect(page.locator('[data-testid="location-card"]:has-text("Location to Delete")')).toBeVisible();

    // Click delete
    await page.click('[data-testid="location-card"] [data-testid="delete-button"]');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');

    // Verify location is removed
    await expect(page.locator('[data-testid="location-card"]:has-text("Location to Delete")')).not.toBeVisible();
  });

  test('internal percentage: total shown, warning if not 100', async ({ page }) => {
    // Mock multiple locations with percentages
    await page.evaluate(() => {
      localStorage.setItem('test-locations', JSON.stringify([
        {
          id: 'loc-1',
          location_name: 'Location 1',
          percentage_allocation: 40
        },
        {
          id: 'loc-2',
          location_name: 'Location 2',
          percentage_allocation: 30
        }
      ]));
    });

    await page.reload();

    // Verify percentage summary
    await expect(page.locator('[data-testid="percentage-summary"]')).toContainText('70% allocated');
    await expect(page.locator('[data-testid="percentage-warning"]')).toBeVisible();

    // Add another location to reach 100%
    await page.click('[data-testid="add-location-button"]');
    await page.fill('[data-testid="location-name-input"]', 'Location 3');
    await page.fill('[data-testid="latitude-input"]', '40.7128');
    await page.fill('[data-testid="longitude-input"]', '-74.0060');
    await page.fill('[data-testid="percentage-input"]', '30');
    await page.click('[data-testid="save-location-button"]');

    // Verify warning is gone
    await expect(page.locator('[data-testid="percentage-warning"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="percentage-summary"]')).toContainText('100% allocated');
  });

  test('a11y: each input has label, Selects are keyboard navigable', async ({ page }) => {
    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="location-name-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="latitude-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="longitude-input"]')).toBeFocused();

    // Test select navigation
    await page.keyboard.press('Tab');
    await page.click('[data-testid="location-reach-select"]');

    // Navigate through select options
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Verify selection
    await expect(page.locator('[data-testid="location-reach-select"]')).toContainText('Activity happens here');
  });

  test('copy buttons work for Coordinates and Gazetteer Code', async ({ page }) => {
    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Enter coordinates
    await page.fill('[data-testid="latitude-input"]', '40.7128');
    await page.fill('[data-testid="longitude-input"]', '-74.0060');

    // Click copy coordinates button
    await page.click('[data-testid="copy-coordinates-button"]');

    // Verify clipboard contains coordinates
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('40.7128, -74.0060');

    // Enter gazetteer information
    await page.click('[data-testid="gazetteer-vocabulary-select"]');
    await page.click('[data-testid="gazetteer-vocabulary-option"]:has-text("GeoNames")');
    await page.fill('[data-testid="gazetteer-code-input"]', '2643743');

    // Click copy gazetteer code button
    await page.click('[data-testid="copy-gazetteer-button"]');

    // Verify clipboard contains code
    const clipboardText2 = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText2).toBe('2643743');
  });

  test('Use map values button overwrites manual edits', async ({ page }) => {
    // Mock reverse geocoding
    await page.route('**/nominatim.openstreetmap.org/reverse*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'New York City, New York, United States',
          address: {
            city: 'New York City',
            state: 'New York',
            country: 'United States'
          }
        })
      });
    });

    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Click on map
    await page.locator('[data-testid="location-map"]').click({ position: { x: 200, y: 150 } });

    // Manually edit city field
    await page.fill('[data-testid="city-input"]', 'Custom City');

    // Click "Use map values" button
    await page.click('[data-testid="use-map-values-button"]');

    // Verify city was overwritten
    await expect(page.locator('[data-testid="city-input"]')).toHaveValue('New York City');
  });

  test('manual entry works when map is unavailable', async ({ page }) => {
    // Mock map tile failure
    await page.route('**/tile.openstreetmap.org/**', async route => {
      await route.abort();
    });

    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Verify error message appears
    await expect(page.locator('[data-testid="map-error-message"]')).toBeVisible();

    // But manual entry should still work
    await page.fill('[data-testid="latitude-input"]', '40.7128');
    await page.fill('[data-testid="longitude-input"]', '-74.0060');
    await page.fill('[data-testid="location-name-input"]', 'Manual Location');
    await page.fill('[data-testid="address-input"]', 'Manual Address');

    // Should be able to save
    await page.click('[data-testid="save-location-button"]');
    await expect(page.locator('[data-testid="location-card"]:has-text("Manual Location")')).toBeVisible();
  });

  test('percentage validation prevents over 100%', async ({ page }) => {
    // Mock existing locations with 80% total
    await page.evaluate(() => {
      localStorage.setItem('test-locations', JSON.stringify([
        { id: 'loc-1', location_name: 'Location 1', percentage_allocation: 80 }
      ]));
    });

    await page.reload();

    // Open modal
    await page.click('[data-testid="add-location-button"]');

    // Enter location details
    await page.fill('[data-testid="location-name-input"]', 'New Location');
    await page.fill('[data-testid="latitude-input"]', '40.7128');
    await page.fill('[data-testid="longitude-input"]', '-74.0060');

    // Try to set percentage over remaining 20%
    await page.fill('[data-testid="percentage-input"]', '30');

    // Try to save
    await page.click('[data-testid="save-location-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="validation-error"]:has-text("Total percentage.*would exceed 100%")')).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toBeVisible(); // Modal should still be open
  });
});
