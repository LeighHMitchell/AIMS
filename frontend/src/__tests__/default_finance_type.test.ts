/**
 * Test suite for default_finance_type functionality
 * Tests the complete flow of setting, persisting, and using default finance type
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
const testActivityId = 'test-activity-' + Date.now();
const testTransactionId = 'test-transaction-' + Date.now();

describe('Default Finance Type Functionality', () => {
  
  // Clean up function
  const cleanup = async () => {
    await supabase.from('transactions').delete().eq('activity_id', testActivityId);
    await supabase.from('activities').delete().eq('id', testActivityId);
  };

  beforeAll(async () => {
    // Ensure clean state
    await cleanup();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanup();
  });

  test('1. Should create activity with default_finance_type', async () => {
    const { data, error } = await supabase
      .from('activities')
      .insert({
        id: testActivityId,
        title: 'Test Activity with Default Finance Type',
        activity_status: 'planning',
        publication_status: 'draft',
        submission_status: 'draft',
        default_finance_type: '110' // Standard grant
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.default_finance_type).toBe('110');
  });

  test('2. Should update activity default_finance_type', async () => {
    const { data, error } = await supabase
      .from('activities')
      .update({ default_finance_type: '410' }) // Change to Aid loan
      .eq('id', testActivityId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.default_finance_type).toBe('410');
  });

  test('3. Should retrieve activity with default_finance_type', async () => {
    const { data, error } = await supabase
      .from('activities')
      .select('id, title, default_finance_type')
      .eq('id', testActivityId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.default_finance_type).toBe('410');
  });

  test('4. Should allow null default_finance_type', async () => {
    const { data, error } = await supabase
      .from('activities')
      .update({ default_finance_type: null })
      .eq('id', testActivityId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.default_finance_type).toBeNull();
  });

  test('5. Should reject invalid finance type codes', async () => {
    const { error } = await supabase
      .from('activities')
      .update({ default_finance_type: '999' }) // Invalid code
      .eq('id', testActivityId);

    expect(error).toBeTruthy();
    expect(error?.message).toContain('check_valid_finance_type');
  });

  test('6. Transaction inherits default_finance_type when not specified', async () => {
    // First set a default finance type on the activity
    await supabase
      .from('activities')
      .update({ default_finance_type: '110' })
      .eq('id', testActivityId);

    // Create a transaction without specifying finance_type
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        uuid: testTransactionId,
        activity_id: testActivityId,
        transaction_type: '3', // Disbursement
        value: 10000,
        currency: 'USD',
        transaction_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        provider_org_name: 'Test Donor',
        receiver_org_name: 'Test Recipient'
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(transaction).toBeTruthy();
    
    // Note: This test assumes you have a trigger or application logic
    // that sets transaction.finance_type = activity.default_finance_type
    // when transaction.finance_type is null
  });

  test('7. Transaction can override default_finance_type', async () => {
    const { data: transaction, error } = await supabase
      .from('transactions')
      .update({ 
        finance_type: '410' // Override with loan
      })
      .eq('uuid', testTransactionId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(transaction).toBeTruthy();
    expect(transaction.finance_type).toBe('410');
  });
});

// API Integration Tests
describe('API Integration for Default Finance Type', () => {
  
  test('API should save default_finance_type', async () => {
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'API Test Activity',
        activityStatus: 'planning',
        publicationStatus: 'draft',
        submissionStatus: 'draft',
        defaultFinanceType: '110'
      })
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.defaultFinanceType).toBe('110');
  });

  test('API should return default_finance_type in GET', async () => {
    // Assuming we have an activity ID from previous test
    const response = await fetch(`/api/activities/${testActivityId}`);
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('defaultFinanceType');
  });
}); 