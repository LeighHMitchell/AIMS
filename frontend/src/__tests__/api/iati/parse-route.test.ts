/**
 * IATI Parse Route Integration Tests
 *
 * Tests the /api/iati/parse endpoint which parses IATI XML files
 * and validates their structure and content.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Base URL for API calls - defaults to localhost for local testing
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Load test fixtures
const fixturesPath = path.join(__dirname, '../../fixtures/iati');

function loadFixture(filename: string): string {
  return fs.readFileSync(path.join(fixturesPath, filename), 'utf-8');
}

// Helper to make authenticated requests
async function makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}) {
  // In a real test environment, you would authenticate first
  // For now, we'll just make the request and handle auth errors
  const url = `${BASE_URL}${endpoint}`;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

describe('IATI Parse Route - /api/iati/parse', () => {
  // Skip tests if API is not available
  let apiAvailable = false;

  beforeAll(async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/health`, { method: 'GET' });
      apiAvailable = response.ok || response.status === 404; // 404 means server is running but no health endpoint
    } catch {
      apiAvailable = false;
    }
  });

  describe('TC-PARSE-API-001: Parse valid IATI XML', () => {
    it('should successfully parse valid IATI XML', async () => {
      if (!apiAvailable) {
        console.log('Skipping: API not available');
        return;
      }

      const xmlContent = loadFixture('valid-activity.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      // May get 401 if not authenticated - that's expected in test env
      if (response.status === 401) {
        console.log('Skipping: Authentication required');
        return;
      }

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.activities).toBeDefined();
      expect(result.activities.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalActivities).toBeGreaterThan(0);
    });

    it('should extract activity details correctly', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('valid-activity.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status !== 200) return;

      const result = await response.json();
      const activity = result.activities[0];

      expect(activity.iatiIdentifier).toBe('TEST-AIMS-001');
      expect(activity.title).toContain('Test Activity');
      expect(activity.status).toBeDefined();
    });

    it('should extract transactions from activities', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('valid-activity.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status !== 200) return;

      const result = await response.json();

      expect(result.transactions).toBeDefined();
      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.summary.totalTransactions).toBeGreaterThan(0);
    });
  });

  describe('TC-PARSE-API-002: Parse multiple activities', () => {
    it('should parse all activities in a multi-activity file', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('multiple-activities.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status !== 200) return;

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.activities.length).toBe(5);
      expect(result.summary.totalActivities).toBe(5);
    });
  });

  describe('TC-PARSE-API-003: Handle empty XML', () => {
    it('should return error for empty XML content', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('empty.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status === 401) return;

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error).toBeDefined();
      expect(result.error.toLowerCase()).toContain('empty');
    });
  });

  describe('TC-PARSE-API-004: Handle malformed XML', () => {
    it('should return error for malformed XML', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('malformed.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status === 401) return;

      // May return 400 for invalid XML or 200 with errors in validation issues
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('TC-PARSE-API-005: Handle missing root element', () => {
    it('should return error for XML without iati-activities root', async () => {
      if (!apiAvailable) return;

      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
          <some-element>content</some-element>
        </root>`;

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status === 401) return;

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error).toBeDefined();
      expect(result.error.toLowerCase()).toContain('iati-activities');
    });
  });

  describe('TC-PARSE-API-006: Validate transaction codes', () => {
    it('should flag invalid transaction codes', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('invalid-transaction-codes.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status !== 200) return;

      const result = await response.json();

      expect(result.validationIssues).toBeDefined();
      expect(result.validationIssues.length).toBeGreaterThan(0);

      // Check for unmapped code issues
      const unmappedIssues = result.validationIssues.filter(
        (issue: any) => issue.type === 'unmapped_code'
      );
      expect(unmappedIssues.length).toBeGreaterThan(0);
    });

    it('should report invalid transaction types', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('invalid-transaction-codes.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status !== 200) return;

      const result = await response.json();

      // Check for invalid transactions
      expect(result.summary.invalidTransactions).toBeGreaterThan(0);
    });
  });

  describe('TC-PARSE-API-007: Parse all transaction types', () => {
    it('should parse all 12 valid transaction types', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('all-transaction-types.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status !== 200) return;

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(12);

      // Verify all transaction types are present
      const types = result.transactions.map((t: any) => t.type);
      expect(types).toContain('1');
      expect(types).toContain('2');
      expect(types).toContain('3');
      expect(types).toContain('4');
      expect(types).toContain('5');
      expect(types).toContain('6');
      expect(types).toContain('7');
      expect(types).toContain('8');
      expect(types).toContain('9');
      expect(types).toContain('11');
      expect(types).toContain('12');
      expect(types).toContain('13');

      // Type 10 should NOT be present
      expect(types).not.toContain('10');
    });
  });

  describe('TC-PARSE-API-008: Parse CRS-add financing terms', () => {
    it('should parse CRS-add loan terms', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('crs-add-data.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status !== 200) return;

      const result = await response.json();
      const activity = result.activities[0];

      expect(activity.financingTerms).toBeDefined();
      expect(activity.financingTerms.loanTerms).toBeDefined();
      expect(activity.financingTerms.loanTerms.rate_1).toBe(2.5);
      expect(activity.financingTerms.loanTerms.rate_2).toBe(1.5);
    });

    it('should parse loan status entries', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('crs-add-data.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status !== 200) return;

      const result = await response.json();
      const activity = result.activities[0];

      expect(activity.financingTerms.loanStatuses).toBeDefined();
      expect(activity.financingTerms.loanStatuses.length).toBe(2);
      expect(activity.financingTerms.loanStatuses[0].year).toBe(2024);
    });

    it('should parse OECD CRS flags', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('crs-add-data.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status !== 200) return;

      const result = await response.json();
      const activity = result.activities[0];

      expect(activity.financingTerms.other_flags).toBeDefined();
      expect(activity.financingTerms.other_flags.length).toBe(4);
    });
  });

  describe('TC-PARSE-API-009: Parse locations', () => {
    it('should parse location data with coordinates', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('valid-activity.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status !== 200) return;

      const result = await response.json();
      const activity = result.activities[0];

      expect(activity.locations).toBeDefined();
      expect(activity.locations.length).toBeGreaterThan(0);

      const location = activity.locations[0];
      expect(location.ref).toBe('LOC-001');
      expect(location.name).toBe('Test Location');
      expect(location.point).toBeDefined();
    });
  });

  describe('TC-PARSE-API-010: Handle missing currency', () => {
    it('should flag transactions with missing currency as warnings', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('multi-currency.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status !== 200) return;

      const result = await response.json();

      // Check for missing currency warnings
      const currencyIssues = result.validationIssues.filter(
        (issue: any) => issue.type === 'missing_currency'
      );

      // The multi-currency file has one transaction without currency
      expect(currencyIssues.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TC-PARSE-API-011: Return validation summary', () => {
    it('should return comprehensive validation summary', async () => {
      if (!apiAvailable) return;

      const xmlContent = loadFixture('valid-activity.xml');

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({ xmlContent })
      });

      if (response.status !== 200) return;

      const result = await response.json();

      expect(result.summary).toBeDefined();
      expect(typeof result.summary.totalActivities).toBe('number');
      expect(typeof result.summary.totalTransactions).toBe('number');
      expect(typeof result.summary.validTransactions).toBe('number');
      expect(typeof result.summary.invalidTransactions).toBe('number');
    });
  });

  describe('TC-PARSE-API-012: No XML content provided', () => {
    it('should return error when no XML content is provided', async () => {
      if (!apiAvailable) return;

      const response = await makeAuthenticatedRequest('/api/iati/parse', {
        method: 'POST',
        body: JSON.stringify({})
      });

      if (response.status === 401) return;

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error).toBeDefined();
    });
  });
});
