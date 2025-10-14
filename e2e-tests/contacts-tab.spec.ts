import { test, expect } from '@playwright/test';

test.describe('Contacts Tab - Rewritten', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to activity editor
    await page.goto('/login');
    // Add login steps as needed
    
    // Navigate to a test activity or create one
    await page.goto('/activities/new');
    
    // Navigate to contacts tab
    await page.click('text=Contacts');
  });

  test('should display search bar and create new button', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search existing contacts"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create New Contact")')).toBeVisible();
  });

  test('should search for existing contacts', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search existing contacts"]');
    
    // Type search query
    await searchInput.fill('john');
    
    // Wait for search results (debounced)
    await page.waitForTimeout(400);
    
    // Should show results dropdown
    await expect(page.locator('text=Found').first()).toBeVisible({ timeout: 5000 });
  });

  test('should create a new contact with all IATI fields', async ({ page }) => {
    // Click create new
    await page.click('button:has-text("Create New Contact")');
    
    // Fill in form
    await page.selectOption('#type', '2'); // Project Management
    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'Contact');
    await page.fill('#position', 'Project Manager');
    await page.fill('#jobTitle', 'Senior PM');
    await page.fill('#organisation', 'Test Org');
    await page.fill('#department', 'PMU');
    await page.fill('#email', 'test@example.org');
    await page.fill('#phoneNumber', '+1234567890');
    await page.fill('#website', 'https://example.org');
    await page.fill('#mailingAddress', '123 Test St, City, Country');
    
    // Check focal point
    await page.check('#isFocalPoint');
    
    // Submit form
    await page.click('button:has-text("Add Contact to Activity")');
    
    // Wait for success toast
    await expect(page.locator('text=Contacts updated successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify contact appears in list
    await expect(page.locator('text=Test Contact')).toBeVisible();
    await expect(page.locator('text=Project Manager')).toBeVisible();
    await expect(page.locator('text=💼')).toBeVisible(); // Project Management icon
    await expect(page.locator('text=⭐ Focal Point')).toBeVisible();
  });

  test('should mark contact as having editing rights', async ({ page }) => {
    await page.click('button:has-text("Create New Contact")');
    
    await page.fill('#firstName', 'Editor');
    await page.fill('#lastName', 'Contact');
    await page.check('#hasEditingRights');
    
    await page.click('button:has-text("Add Contact to Activity")');
    
    await expect(page.locator('text=✏️ Editor')).toBeVisible({ timeout: 5000 });
  });

  test('should search and add existing user', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search existing contacts"]');
    
    await searchInput.fill('existing');
    await page.waitForTimeout(400);
    
    // Click on first search result
    await page.click('.hover\\:bg-blue-50 >> nth=0');
    
    // Form should be pre-filled
    await expect(page.locator('#firstName')).not.toHaveValue('');
    
    // User can adjust and save
    await page.check('#isFocalPoint');
    await page.click('button:has-text("Add Contact to Activity")');
    
    await expect(page.locator('text=Contacts updated successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should edit an existing contact', async ({ page }) => {
    // Assuming there's already a contact
    await page.click('button[aria-label="Edit contact"] >> nth=0');
    
    // Modify position
    await page.fill('#position', 'Updated Position');
    await page.click('button:has-text("Update Contact")');
    
    await expect(page.locator('text=Updated Position')).toBeVisible({ timeout: 5000 });
  });

  test('should delete a contact', async ({ page }) => {
    // Assuming there's already a contact
    const deleteButton = page.locator('button:has-text("Delete") >> nth=0');
    
    page.on('dialog', dialog => dialog.accept());
    await deleteButton.click();
    
    await expect(page.locator('text=Contacts updated successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should prevent duplicate contacts', async ({ page }) => {
    // Create first contact
    await page.click('button:has-text("Create New Contact")');
    await page.fill('#firstName', 'Duplicate');
    await page.fill('#lastName', 'Test');
    await page.fill('#email', 'duplicate@test.org');
    await page.click('button:has-text("Add Contact to Activity")');
    
    await page.waitForTimeout(1000);
    
    // Try to create same contact again
    await page.click('button:has-text("Create New Contact")');
    await page.fill('#firstName', 'Duplicate');
    await page.fill('#lastName', 'Test');
    await page.fill('#email', 'duplicate@test.org');
    await page.click('button:has-text("Add Contact to Activity")');
    
    // Should show duplicate error
    await expect(page.locator('text=Duplicate Contact')).toBeVisible({ timeout: 3000 });
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('button:has-text("Create New Contact")');
    
    // Try to submit without required fields
    await page.click('button:has-text("Add Contact to Activity")');
    
    // Should show validation errors
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.click('button:has-text("Create New Contact")');
    
    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'User');
    await page.fill('#email', 'invalid-email');
    await page.click('button:has-text("Add Contact to Activity")');
    
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should validate website URL format', async ({ page }) => {
    await page.click('button:has-text("Create New Contact")');
    
    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'User');
    await page.fill('#website', 'not-a-url');
    await page.click('button:has-text("Add Contact to Activity")');
    
    await expect(page.locator('text=Website must start with http')).toBeVisible();
  });

  test('should display contact type badges correctly', async ({ page }) => {
    // Create contacts with different types
    const types = [
      { value: '1', icon: '📧', label: 'General Enquiries' },
      { value: '2', icon: '💼', label: 'Project Management' },
      { value: '3', icon: '💰', label: 'Financial Management' },
      { value: '4', icon: '📢', label: 'Communications' }
    ];

    for (const type of types) {
      await page.click('button:has-text("Create New Contact")');
      await page.selectOption('#type', type.value);
      await page.fill('#firstName', 'Contact');
      await page.fill('#lastName', type.label);
      await page.click('button:has-text("Add Contact to Activity")');
      await page.waitForTimeout(1000);
    }

    // Verify all badges appear
    for (const type of types) {
      await expect(page.locator(`text=${type.icon}`)).toBeVisible();
      await expect(page.locator(`text=${type.label}`).first()).toBeVisible();
    }
  });

  test('should show linked user provenance', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search existing contacts"]');
    
    // Search and add a user
    await searchInput.fill('user');
    await page.waitForTimeout(400);
    await page.click('.hover\\:bg-blue-50 >> nth=0');
    await page.click('button:has-text("Add Contact to Activity")');
    
    // Should show "Linked to" text
    await expect(page.locator('text=🔗 Linked to:')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('XML Import - Contacts', () => {
  test('should import contacts from IATI XML', async ({ page }) => {
    // Navigate to XML Import tab
    await page.goto('/activities/new');
    await page.click('text=XML Import');
    
    // Upload or paste XML with contacts
    const xmlContent = `
      <iati-activity>
        <contact-info type="1">
          <organisation><narrative>Agency A</narrative></organisation>
          <department><narrative>Department B</narrative></department>
          <person-name><narrative>A. Example</narrative></person-name>
          <job-title><narrative>Transparency Lead</narrative></job-title>
          <telephone>0044111222333444</telephone>
          <email>transparency@example.org</email>
          <website>http://www.example.org</website>
          <mailing-address><narrative>123 Main St, City, Postcode</narrative></mailing-address>
        </contact-info>
      </iati-activity>
    `;
    
    await page.fill('textarea', xmlContent);
    await page.click('button:has-text("Parse XML")');
    
    // Select contacts for import
    await page.check('input[type="checkbox"]:near(:text("Contact"))');
    await page.click('button:has-text("Import Selected")');
    
    // Navigate to contacts tab and verify
    await page.click('text=Contacts');
    await expect(page.locator('text=A. Example')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Transparency Lead')).toBeVisible();
    await expect(page.locator('text=transparency@example.org')).toBeVisible();
  });

  test('should deduplicate contacts on XML import', async ({ page }) => {
    // First, manually add a contact
    await page.goto('/activities/new');
    await page.click('text=Contacts');
    await page.click('button:has-text("Create New Contact")');
    await page.fill('#firstName', 'A.');
    await page.fill('#lastName', 'Example');
    await page.fill('#email', 'transparency@example.org');
    await page.click('button:has-text("Add Contact to Activity")');
    
    // Now import XML with same contact
    await page.click('text=XML Import');
    const xmlContent = `
      <iati-activity>
        <contact-info type="1">
          <person-name><narrative>A. Example</narrative></person-name>
          <email>transparency@example.org</email>
          <job-title><narrative>Transparency Lead</narrative></job-title>
        </contact-info>
      </iati-activity>
    `;
    
    await page.fill('textarea', xmlContent);
    await page.click('button:has-text("Parse XML")');
    await page.check('input[type="checkbox"]:near(:text("Contact"))');
    await page.click('button:has-text("Import Selected")');
    
    // Go back to contacts - should only have ONE contact with merged data
    await page.click('text=Contacts');
    const contacts = await page.locator('text=A. Example').count();
    expect(contacts).toBe(1);
    
    // Should have the job title from XML
    await expect(page.locator('text=Transparency Lead')).toBeVisible();
  });
});

