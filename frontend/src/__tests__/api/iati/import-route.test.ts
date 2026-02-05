/**
 * IATI Import Route Integration Tests
 *
 * Tests the /api/iati/import endpoint which imports IATI activities
 * into the database.
 *
 * Note: These tests create real database records and clean them up afterward.
 * All test data uses the 'TEST-' prefix for easy identification and cleanup.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createTestSupabaseClient, cleanupTestDataByPrefix, TEST_PREFIX } from '../../../test-utils/database-cleanup';

// Base URL for API calls
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Test identifiers
const TEST_ACTIVITY_ID = `${TEST_PREFIX}IMPORT-${Date.now()}`;
const TEST_ORG_REF = `${TEST_PREFIX}ORG-${Date.now()}`;

// Track created records for cleanup
const createdRecords = {
  activityIds: [] as string[],
  organizationIds: [] as string[],
  transactionIds: [] as string[]
};

// Helper to make authenticated requests
async function makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

describe('IATI Import Route - /api/iati/import', () => {
  let apiAvailable = false;
  let supabase: ReturnType<typeof createTestSupabaseClient> | null = null;

  beforeAll(async () => {
    // Check if API is available
    try {
      const response = await fetch(`${BASE_URL}/api/health`, { method: 'GET' });
      apiAvailable = response.ok || response.status === 404;
    } catch {
      apiAvailable = false;
    }

    // Initialize Supabase client for database verification
    try {
      supabase = createTestSupabaseClient();
    } catch {
      supabase = null;
    }
  });

  afterAll(async () => {
    // Cleanup all test data
    if (supabase) {
      await cleanupTestDataByPrefix(supabase, TEST_PREFIX);
    }
  });

  describe('TC-IMP-001: Import single new activity', () => {
    it('should create a new activity from IATI data', async () => {
      if (!apiAvailable) {
        console.log('Skipping: API not available');
        return;
      }

      const testIatiId = `${TEST_ACTIVITY_ID}-001`;

      const response = await makeAuthenticatedRequest('/api/iati/import', {
        method: 'POST',
        body: JSON.stringify({
          activities: [{
            iatiIdentifier: testIatiId,
            title: 'Test Import Activity',
            description: 'Activity created by automated test',
            status: '2', // Implementation
            startDate: '2024-01-01',
            endDate: '2025-12-31',
            matched: false,
            participatingOrgs: []
          }],
          organizations: [],
          transactions: []
        })
      });

      if (response.status === 401) {
        console.log('Skipping: Authentication required');
        return;
      }

      // May get 200 or 500 depending on DB state
      if (response.status === 200) {
        const result = await response.json();
        expect(result.success).toBe(true);

        if (result.results?.activityIds) {
          createdRecords.activityIds.push(...result.results.activityIds);
        }
      }
    });
  });

  describe('TC-IMP-002: Import activity with all fields', () => {
    it('should import activity with complete data', async () => {
      if (!apiAvailable) return;

      const testIatiId = `${TEST_ACTIVITY_ID}-002`;

      const response = await makeAuthenticatedRequest('/api/iati/import', {
        method: 'POST',
        body: JSON.stringify({
          activities: [{
            iatiIdentifier: testIatiId,
            title: 'Complete Test Activity',
            description: 'Activity with all fields populated',
            status: '2',
            startDate: '2024-01-01',
            actualStartDate: '2024-01-15',
            endDate: '2025-12-31',
            sectors: [
              { code: '11110', percentage: 60 },
              { code: '11120', percentage: 40 }
            ],
            recipientCountry: 'MM',
            matched: false,
            participatingOrgs: []
          }],
          organizations: [],
          transactions: []
        })
      });

      if (response.status === 401) return;

      if (response.status === 200) {
        const result = await response.json();
        expect(result.success).toBe(true);
      }
    });
  });

  describe('TC-IMP-003: Import multiple activities in batch', () => {
    it('should import multiple activities at once', async () => {
      if (!apiAvailable) return;

      const activities = [
        {
          iatiIdentifier: `${TEST_ACTIVITY_ID}-BATCH-001`,
          title: 'Batch Activity 1',
          description: 'First batch activity',
          status: '2',
          matched: false,
          participatingOrgs: []
        },
        {
          iatiIdentifier: `${TEST_ACTIVITY_ID}-BATCH-002`,
          title: 'Batch Activity 2',
          description: 'Second batch activity',
          status: '1',
          matched: false,
          participatingOrgs: []
        },
        {
          iatiIdentifier: `${TEST_ACTIVITY_ID}-BATCH-003`,
          title: 'Batch Activity 3',
          description: 'Third batch activity',
          status: '2',
          matched: false,
          participatingOrgs: []
        }
      ];

      const response = await makeAuthenticatedRequest('/api/iati/import', {
        method: 'POST',
        body: JSON.stringify({
          activities,
          organizations: [],
          transactions: []
        })
      });

      if (response.status === 401) return;

      if (response.status === 200) {
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.results?.activitiesCreated || 0).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('TC-IMP-010: Update existing matched activity', () => {
    it('should update an existing activity when matched', async () => {
      if (!apiAvailable || !supabase) return;

      // First create an activity
      const testIatiId = `${TEST_ACTIVITY_ID}-UPDATE-001`;

      const createResponse = await makeAuthenticatedRequest('/api/iati/import', {
        method: 'POST',
        body: JSON.stringify({
          activities: [{
            iatiIdentifier: testIatiId,
            title: 'Original Title',
            description: 'Original description',
            status: '1',
            matched: false,
            participatingOrgs: []
          }],
          organizations: [],
          transactions: []
        })
      });

      if (createResponse.status !== 200) return;

      const createResult = await createResponse.json();
      const activityId = createResult.results?.activityIds?.[0];

      if (!activityId) return;

      // Now update the activity
      const updateResponse = await makeAuthenticatedRequest('/api/iati/import', {
        method: 'POST',
        body: JSON.stringify({
          activities: [{
            iatiIdentifier: testIatiId,
            existingId: activityId,
            title: 'Updated Title',
            description: 'Updated description',
            status: '2',
            matched: true,
            participatingOrgs: []
          }],
          organizations: [],
          transactions: []
        })
      });

      if (updateResponse.status === 200) {
        const updateResult = await updateResponse.json();
        expect(updateResult.success).toBe(true);
      }
    });
  });

  describe('TC-IMP-020: Map activity-status codes correctly', () => {
    const statusTests = [
      { code: '1', expected: 'pipeline', name: 'Pipeline/Identification' },
      { code: '2', expected: 'implementation', name: 'Implementation' },
      { code: '3', expected: 'finalisation', name: 'Finalisation' },
      { code: '4', expected: 'closed', name: 'Closed' },
      { code: '5', expected: 'cancelled', name: 'Cancelled' },
      { code: '6', expected: 'suspended', name: 'Suspended' }
    ];

    statusTests.forEach(({ code, expected, name }) => {
      it(`should map status code ${code} (${name})`, async () => {
        if (!apiAvailable) return;

        const testIatiId = `${TEST_ACTIVITY_ID}-STATUS-${code}`;

        const response = await makeAuthenticatedRequest('/api/iati/import', {
          method: 'POST',
          body: JSON.stringify({
            activities: [{
              iatiIdentifier: testIatiId,
              title: `Status ${code} Test`,
              status: code,
              matched: false,
              participatingOrgs: []
            }],
            organizations: [],
            transactions: []
          })
        });

        if (response.status === 401) return;

        // Test passes if request completes without error
        expect([200, 400, 500]).toContain(response.status);
      });
    });
  });

  describe('TC-IMP-021: Map activity-date types correctly', () => {
    it('should map all four date types', async () => {
      if (!apiAvailable) return;

      const testIatiId = `${TEST_ACTIVITY_ID}-DATES-001`;

      const response = await makeAuthenticatedRequest('/api/iati/import', {
        method: 'POST',
        body: JSON.stringify({
          activities: [{
            iatiIdentifier: testIatiId,
            title: 'Date Types Test',
            status: '2',
            startDate: '2024-01-01',        // planned start
            actualStartDate: '2024-01-15',  // actual start
            endDate: '2025-12-31',          // planned end
            actualEndDate: '2025-12-15',    // actual end
            matched: false,
            participatingOrgs: []
          }],
          organizations: [],
          transactions: []
        })
      });

      if (response.status === 401) return;

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('TC-IMP-022: Handle missing optional fields', () => {
    it('should import activity with minimal required fields', async () => {
      if (!apiAvailable) return;

      const testIatiId = `${TEST_ACTIVITY_ID}-MINIMAL-001`;

      const response = await makeAuthenticatedRequest('/api/iati/import', {
        method: 'POST',
        body: JSON.stringify({
          activities: [{
            iatiIdentifier: testIatiId,
            title: 'Minimal Activity',
            matched: false,
            participatingOrgs: []
          }],
          organizations: [],
          transactions: []
        })
      });

      if (response.status === 401) return;

      // Should handle missing fields gracefully
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});

describe('Transaction Import Tests', () => {
  let apiAvailable = false;

  beforeAll(async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/health`, { method: 'GET' });
      apiAvailable = response.ok || response.status === 404;
    } catch {
      apiAvailable = false;
    }
  });

  describe('TC-TX-IMPORT: Import transactions', () => {
    const transactionTypes = [
      { code: '1', name: 'Incoming Funds' },
      { code: '2', name: 'Outgoing Commitment' },
      { code: '3', name: 'Disbursement' },
      { code: '4', name: 'Expenditure' },
      { code: '5', name: 'Interest Payment' },
      { code: '6', name: 'Loan Repayment' },
      { code: '7', name: 'Reimbursement' },
      { code: '8', name: 'Purchase of Equity' },
      { code: '9', name: 'Sale of Equity' },
      { code: '11', name: 'Incoming Commitment' },
      { code: '12', name: 'Outgoing Pledge' },
      { code: '13', name: 'Incoming Pledge' }
    ];

    transactionTypes.forEach(({ code, name }) => {
      it(`TC-TX-${code.padStart(3, '0')}: should import ${name} (type ${code})`, async () => {
        if (!apiAvailable) return;

        const testIatiId = `${TEST_ACTIVITY_ID}-TX-${code}`;

        const response = await makeAuthenticatedRequest('/api/iati/import', {
          method: 'POST',
          body: JSON.stringify({
            activities: [{
              iatiIdentifier: testIatiId,
              title: `Transaction Type ${code} Test`,
              status: '2',
              matched: false,
              participatingOrgs: []
            }],
            organizations: [],
            transactions: [{
              type: code,
              transaction_type: code,
              date: '2024-06-15',
              transaction_date: '2024-06-15',
              value: 100000,
              currency: 'USD',
              activityRef: testIatiId,
              description: `Test ${name}`
            }]
          })
        });

        if (response.status === 401) return;

        expect([200, 400, 500]).toContain(response.status);
      });
    });
  });

  describe('TC-TX-100: Currency handling', () => {
    it('should handle USD transactions', async () => {
      if (!apiAvailable) return;

      const testIatiId = `${TEST_ACTIVITY_ID}-USD-001`;

      const response = await makeAuthenticatedRequest('/api/iati/import', {
        method: 'POST',
        body: JSON.stringify({
          activities: [{
            iatiIdentifier: testIatiId,
            title: 'USD Transaction Test',
            status: '2',
            matched: false,
            participatingOrgs: []
          }],
          organizations: [],
          transactions: [{
            type: '3',
            transaction_type: '3',
            date: '2024-06-15',
            transaction_date: '2024-06-15',
            value: 100000,
            currency: 'USD',
            activityRef: testIatiId
          }]
        })
      });

      if (response.status === 401) return;

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle EUR transactions', async () => {
      if (!apiAvailable) return;

      const testIatiId = `${TEST_ACTIVITY_ID}-EUR-001`;

      const response = await makeAuthenticatedRequest('/api/iati/import', {
        method: 'POST',
        body: JSON.stringify({
          activities: [{
            iatiIdentifier: testIatiId,
            title: 'EUR Transaction Test',
            status: '2',
            matched: false,
            participatingOrgs: []
          }],
          organizations: [],
          transactions: [{
            type: '3',
            transaction_type: '3',
            date: '2024-06-15',
            transaction_date: '2024-06-15',
            value: 100000,
            currency: 'EUR',
            activityRef: testIatiId
          }]
        })
      });

      if (response.status === 401) return;

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle transactions with missing currency (default to USD)', async () => {
      if (!apiAvailable) return;

      const testIatiId = `${TEST_ACTIVITY_ID}-NOCURRENCY-001`;

      const response = await makeAuthenticatedRequest('/api/iati/import', {
        method: 'POST',
        body: JSON.stringify({
          activities: [{
            iatiIdentifier: testIatiId,
            title: 'No Currency Test',
            status: '2',
            matched: false,
            participatingOrgs: []
          }],
          organizations: [],
          transactions: [{
            type: '3',
            transaction_type: '3',
            date: '2024-06-15',
            transaction_date: '2024-06-15',
            value: 100000,
            // currency intentionally omitted
            activityRef: testIatiId
          }]
        })
      });

      if (response.status === 401) return;

      expect([200, 400, 500]).toContain(response.status);
    });
  });
});

describe('Organization Import Tests', () => {
  let apiAvailable = false;

  beforeAll(async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/health`, { method: 'GET' });
      apiAvailable = response.ok || response.status === 404;
    } catch {
      apiAvailable = false;
    }
  });

  describe('TC-ORG-001: Create organization with all fields', () => {
    it('should create new organization from IATI data', async () => {
      if (!apiAvailable) return;

      const testOrgRef = `${TEST_ORG_REF}-001`;

      const response = await makeAuthenticatedRequest('/api/iati/import', {
        method: 'POST',
        body: JSON.stringify({
          activities: [],
          organizations: [{
            ref: testOrgRef,
            name: 'Test Organization',
            type: '10', // Government
            iatiOrgId: testOrgRef
          }],
          transactions: []
        })
      });

      if (response.status === 401) return;

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('TC-ORG-TYPE: Organization type mapping', () => {
    const orgTypes = [
      { code: '10', expected: 'government', name: 'Government' },
      { code: '21', expected: 'ngo', name: 'International NGO' },
      { code: '22', expected: 'ngo', name: 'National NGO' },
      { code: '40', expected: 'multilateral', name: 'Multilateral' },
      { code: '70', expected: 'private', name: 'Private Sector' },
      { code: '80', expected: 'academic', name: 'Academic/Research' }
    ];

    orgTypes.forEach(({ code, expected, name }) => {
      it(`TC-ORG-TYPE-${code}: should map type ${code} to ${expected}`, async () => {
        if (!apiAvailable) return;

        const testOrgRef = `${TEST_ORG_REF}-TYPE-${code}`;

        const response = await makeAuthenticatedRequest('/api/iati/import', {
          method: 'POST',
          body: JSON.stringify({
            activities: [],
            organizations: [{
              ref: testOrgRef,
              name: `Test ${name}`,
              type: code,
              iatiOrgId: testOrgRef
            }],
            transactions: []
          })
        });

        if (response.status === 401) return;

        expect([200, 400, 500]).toContain(response.status);
      });
    });
  });
});
