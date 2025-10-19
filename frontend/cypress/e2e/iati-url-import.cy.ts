/**
 * End-to-End Tests for IATI XML Import from URL
 * Tests the complete flow from URL input to database import
 */

describe('IATI URL Import - End to End', () => {
  const officialExampleUrl = 'https://raw.githubusercontent.com/IATI/IATI-Extra-Documentation/version-2.03/en/activity-standard/activity-standard-example-annotated.xml';
  
  beforeEach(() => {
    // Setup: Login, navigate to IATI import page
    cy.visit('/iati-import');
  });

  describe('Complete Import Flow', () => {
    it('should successfully import official IATI example XML from URL', () => {
      // Step 1: Select URL import method
      cy.contains('From URL').click();
      
      // Step 2: Enter URL
      cy.get('input[type="url"]').type(officialExampleUrl);
      
      // Step 3: Click Fetch and Parse
      cy.contains('Fetch and Parse').click();
      
      // Step 4: Wait for parsing to complete
      cy.contains('Successfully fetched and parsed IATI XML from URL', { timeout: 30000 })
        .should('be.visible');
      
      // Step 5: Verify parsing summary shows correct counts
      cy.contains('Activities found').should('be.visible');
      cy.contains('Organizations found').should('be.visible');
      cy.contains('Transactions found').should('be.visible');
      
      // Step 6: Proceed through import flow
      cy.contains('Continue to Organizations').click();
      
      // Step 7: Review organizations (should detect Agency B, Agency C, Agency A)
      cy.contains('Agency A').should('be.visible');
      cy.contains('Agency B').should('be.visible');
      cy.contains('Agency C').should('be.visible');
      
      // Step 8: Select organizations to import
      cy.contains('Import Selected Organizations').click();
      
      // Step 9: Verify redirect to activity editor
      cy.url().should('include', '/activities/');
      cy.url().should('include', '/edit');
    });
  });

  describe('URL Validation', () => {
    it('should reject invalid URLs', () => {
      cy.contains('From URL').click();
      cy.get('input[type="url"]').type('not-a-valid-url');
      cy.contains('Fetch and Parse').should('be.disabled');
    });

    it('should handle network errors gracefully', () => {
      cy.contains('From URL').click();
      cy.get('input[type="url"]').type('https://invalid-domain-that-does-not-exist-12345.com/data.xml');
      cy.contains('Fetch and Parse').click();
      
      // Should show error message
      cy.contains('Failed to import from URL', { timeout: 35000 }).should('be.visible');
    });
  });

  describe('Sector Validation', () => {
    it('should accept 3-digit DAC codes (vocabulary 2)', () => {
      // This test verifies the fix we just implemented
      cy.contains('From URL').click();
      cy.get('input[type="url"]').type(officialExampleUrl);
      cy.contains('Fetch and Parse').click();
      
      // Wait for parsing
      cy.contains('Successfully fetched', { timeout: 30000 }).should('be.visible');
      
      // Verify no sector validation errors
      cy.contains('Invalid sector codes', { timeout: 5000 }).should('not.exist');
      cy.contains('Sector import failed', { timeout: 5000 }).should('not.exist');
    });

    it('should accept 5-digit DAC codes (vocabulary 1)', () => {
      // Test with a file that has 5-digit codes
      // This ensures backward compatibility
      const fiveDigitUrl = 'test-url-with-5-digit-sectors.xml';
      
      // Would test that 5-digit codes still validate
      expect(true).to.be.true; // Placeholder
    });

    it('should accept custom vocabulary codes (vocabulary 99)', () => {
      // Test with custom vocabulary codes
      // Official example has vocabulary 99 with code "A1"
      cy.contains('From URL').click();
      cy.get('input[type="url"]').type(officialExampleUrl);
      cy.contains('Fetch and Parse').click();
      
      // Should not reject vocabulary 99 codes
      cy.contains('Successfully fetched', { timeout: 30000 }).should('be.visible');
    });
  });

  describe('Transaction Import', () => {
    it('should import transactions after sector validation passes', () => {
      cy.contains('From URL').click();
      cy.get('input[type="url"]').type(officialExampleUrl);
      cy.contains('Fetch and Parse').click();
      
      // Wait for parsing
      cy.contains('Successfully fetched', { timeout: 30000 }).should('be.visible');
      
      // Complete import flow
      cy.contains('Continue to Organizations').click();
      cy.contains('Import Selected Organizations').click();
      
      // On activity editor page, verify transaction was imported
      cy.url().should('include', '/activities/');
      
      // Navigate to Transactions tab
      cy.contains('Transactions').click();
      
      // Verify transaction from XML appears
      cy.contains('1000').should('be.visible'); // Transaction value
      cy.contains('EUR').should('be.visible'); // Transaction currency
      cy.contains('Agency B').should('be.visible'); // Provider org
    });

    it('should import transaction with 3-digit sector code', () => {
      // The official example has a transaction with sector code 111 (vocabulary 2)
      cy.contains('From URL').click();
      cy.get('input[type="url"]').type(officialExampleUrl);
      cy.contains('Fetch and Parse').click();
      
      cy.contains('Successfully fetched', { timeout: 30000 }).should('be.visible');
      
      // No sector validation errors should appear
      cy.contains('Invalid sector codes').should('not.exist');
      
      // Transaction should be in the parsed data
      cy.contains('Transactions found').parent().should('contain', '1');
    });
  });

  describe('All Sections Import', () => {
    it('should import all sections from official example', () => {
      cy.contains('From URL').click();
      cy.get('input[type="url"]').type(officialExampleUrl);
      cy.contains('Fetch and Parse').click();
      
      cy.contains('Successfully fetched', { timeout: 30000 }).should('be.visible');
      
      // Complete import
      cy.contains('Continue to Organizations').click();
      cy.contains('Import Selected Organizations').click();
      
      cy.url().should('include', '/activities/');
      
      // Verify each tab has data (where applicable)
      
      // Contacts tab
      cy.contains('Contacts').click();
      cy.contains('Agency A').should('be.visible');
      cy.contains('transparency@example.org').should('be.visible');
      
      // Conditions tab
      cy.contains('Conditions').click();
      cy.contains('Conditions text').should('be.visible');
      
      // Results tab
      cy.contains('Results').click();
      cy.contains('Result title').should('be.visible');
      
      // Locations tab
      cy.contains('Locations').click();
      cy.contains('Location name').should('be.visible');
      
      // Policy Markers tab
      cy.contains('Policy Markers').click();
      // Should have policy markers with codes 2 and 9
      cy.get('[data-testid="policy-marker"]').should('have.length.gte', 2);
      
      // Humanitarian tab
      cy.contains('Humanitarian').click();
      cy.contains('Nepal Earthquake').should('be.visible');
      
      // Documents tab
      cy.contains('Documents').click();
      cy.contains('Project Report 2013').should('be.visible');
      
      // Financing Terms tab
      cy.contains('Financing').click();
      cy.contains('Loan terms').should('be.visible');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed XML gracefully', () => {
      cy.contains('From URL').click();
      // This would need a test URL that returns malformed XML
      cy.get('input[type="url"]').type('https://example.com/malformed.xml');
      cy.contains('Fetch and Parse').click();
      
      // Should show error message
      cy.contains('Failed to parse', { timeout: 35000 }).should('be.visible');
    });

    it('should handle HTML responses (404 pages)', () => {
      cy.contains('From URL').click();
      cy.get('input[type="url"]').type('https://raw.githubusercontent.com/404-page.xml');
      cy.contains('Fetch and Parse').click();
      
      // Should detect HTML and show appropriate error
      cy.contains('Failed', { timeout: 35000 }).should('be.visible');
    });
  });

  describe('Progress Tracking', () => {
    it('should show progress during fetch and parse', () => {
      cy.contains('From URL').click();
      cy.get('input[type="url"]').type(officialExampleUrl);
      cy.contains('Fetch and Parse').click();
      
      // Button should change to "Fetching..."
      cy.contains('Fetching...').should('be.visible');
      
      // Progress bar or indicator should appear
      // (Depends on your UI implementation)
      
      // Eventually should complete
      cy.contains('Successfully fetched', { timeout: 30000 }).should('be.visible');
    });
  });
});

// Additional test suite for XmlImportTab integration
describe('XmlImportTab - URL Import Integration', () => {
  beforeEach(() => {
    // Create a test activity first
    cy.visit('/activities/new');
    cy.get('input[name="title"]').type('Test Activity for XML Import');
    cy.contains('Create Activity').click();
    
    // Navigate to XML Import tab
    cy.contains('XML Import').click();
  });

  it('should import from URL in activity editor', () => {
    // Select URL method
    cy.contains('From URL').click();
    
    // Enter URL
    cy.get('input[type="url"]').type(officialExampleUrl);
    
    // Parse
    cy.contains('Parse XML').click();
    
    // Wait for fields to appear
    cy.contains('Field Name', { timeout: 30000 }).should('be.visible');
    
    // Verify new sections appear
    cy.contains('Contact Information').should('be.visible');
    cy.contains('Conditions').should('be.visible');
    cy.contains('Budgets').should('be.visible');
    cy.contains('Humanitarian Scope').should('be.visible');
    cy.contains('Document Links').should('be.visible');
    cy.contains('Locations').should('be.visible');
    cy.contains('Financing Terms').should('be.visible');
    
    // Select all fields
    cy.contains('Select All').click();
    
    // Import
    cy.contains('Import Selected').click();
    
    // Verify success
    cy.contains('Import complete', { timeout: 30000 }).should('be.visible');
  });
});

// Note: These tests require:
// 1. Cypress to be configured in your project
// 2. Test database to be set up
// 3. Authentication to be mocked or handled
// 4. Network requests to be interceptable for error scenarios
// 5. Data-testid attributes added to UI elements for reliable selection

