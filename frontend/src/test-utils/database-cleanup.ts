/**
 * Database cleanup utilities for IATI import tests
 *
 * All test data uses a 'TEST-' prefix to allow easy cleanup without
 * affecting production/development data.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test data prefix - all test records should use this prefix
export const TEST_PREFIX = 'TEST-';

/**
 * Creates a Supabase client for test operations
 */
export function createTestSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables for tests');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Cleanup test data by specific IDs
 */
export async function cleanupTestData(
  supabase: SupabaseClient,
  ids: {
    activityIds?: string[];
    organizationIds?: string[];
    transactionIds?: string[];
  }
): Promise<{ success: boolean; errors: string[] }> {
  const { activityIds = [], organizationIds = [], transactionIds = [] } = ids;
  const errors: string[] = [];

  try {
    // Delete transactions first (due to foreign keys)
    if (transactionIds.length > 0) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('uuid', transactionIds);
      if (error) errors.push(`Transaction cleanup error: ${error.message}`);
    }

    // Delete activity-related data
    if (activityIds.length > 0) {
      // Delete activity sectors
      const { error: sectorsError } = await supabase
        .from('activity_sectors')
        .delete()
        .in('activity_id', activityIds);
      if (sectorsError) errors.push(`Activity sectors cleanup error: ${sectorsError.message}`);

      // Delete activity financing terms
      const { error: financingError } = await supabase
        .from('activity_financing_terms')
        .delete()
        .in('activity_id', activityIds);
      if (financingError) errors.push(`Financing terms cleanup error: ${financingError.message}`);

      // Delete activity loan status
      const { error: loanStatusError } = await supabase
        .from('activity_loan_status')
        .delete()
        .in('activity_id', activityIds);
      if (loanStatusError) errors.push(`Loan status cleanup error: ${loanStatusError.message}`);

      // Delete activity locations
      const { error: locationsError } = await supabase
        .from('activity_locations')
        .delete()
        .in('activity_id', activityIds);
      if (locationsError) errors.push(`Locations cleanup error: ${locationsError.message}`);

      // Delete activity recipient countries
      const { error: countriesError } = await supabase
        .from('activity_recipient_countries')
        .delete()
        .in('activity_id', activityIds);
      if (countriesError) errors.push(`Recipient countries cleanup error: ${countriesError.message}`);

      // Delete activity participating organizations
      const { error: partOrgsError } = await supabase
        .from('activity_participating_organizations')
        .delete()
        .in('activity_id', activityIds);
      if (partOrgsError) errors.push(`Participating orgs cleanup error: ${partOrgsError.message}`);

      // Delete transactions by activity_id
      const { error: txByActivityError } = await supabase
        .from('transactions')
        .delete()
        .in('activity_id', activityIds);
      if (txByActivityError) errors.push(`Transactions by activity cleanup error: ${txByActivityError.message}`);

      // Delete activities
      const { error: activitiesError } = await supabase
        .from('activities')
        .delete()
        .in('id', activityIds);
      if (activitiesError) errors.push(`Activities cleanup error: ${activitiesError.message}`);
    }

    // Delete organizations
    if (organizationIds.length > 0) {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .in('id', organizationIds);
      if (error) errors.push(`Organizations cleanup error: ${error.message}`);
    }

    return { success: errors.length === 0, errors };
  } catch (error) {
    return {
      success: false,
      errors: [`Unexpected cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Cleanup all test data by prefix
 * This finds and deletes all records with IATI IDs starting with 'TEST-'
 */
export async function cleanupTestDataByPrefix(
  supabase: SupabaseClient,
  prefix: string = TEST_PREFIX
): Promise<{
  success: boolean;
  errors: string[];
  deleted: { activities: number; organizations: number; transactions: number }
}> {
  const errors: string[] = [];
  const deleted = { activities: 0, organizations: 0, transactions: 0 };

  try {
    // Find activities with test prefix
    const { data: activities, error: activitiesQueryError } = await supabase
      .from('activities')
      .select('id')
      .like('iati_id', `${prefix}%`);

    if (activitiesQueryError) {
      errors.push(`Error finding test activities: ${activitiesQueryError.message}`);
    } else if (activities && activities.length > 0) {
      const activityIds = activities.map(a => a.id);
      const result = await cleanupTestData(supabase, { activityIds });
      if (!result.success) {
        errors.push(...result.errors);
      } else {
        deleted.activities = activityIds.length;
      }
    }

    // Find organizations with test prefix
    const { data: orgs, error: orgsQueryError } = await supabase
      .from('organizations')
      .select('id')
      .like('iati_org_id', `${prefix}%`);

    if (orgsQueryError) {
      errors.push(`Error finding test organizations: ${orgsQueryError.message}`);
    } else if (orgs && orgs.length > 0) {
      const organizationIds = orgs.map(o => o.id);
      const result = await cleanupTestData(supabase, { organizationIds });
      if (!result.success) {
        errors.push(...result.errors);
      } else {
        deleted.organizations = organizationIds.length;
      }
    }

    // Find transactions with test activity refs
    const { data: transactions, error: txQueryError } = await supabase
      .from('transactions')
      .select('uuid')
      .or(`provider_org_ref.like.${prefix}%,receiver_org_ref.like.${prefix}%`);

    if (txQueryError) {
      errors.push(`Error finding test transactions: ${txQueryError.message}`);
    } else if (transactions && transactions.length > 0) {
      const transactionIds = transactions.map(t => t.uuid);
      const result = await cleanupTestData(supabase, { transactionIds });
      if (!result.success) {
        errors.push(...result.errors);
      } else {
        deleted.transactions = transactionIds.length;
      }
    }

    return { success: errors.length === 0, errors, deleted };
  } catch (error) {
    return {
      success: false,
      errors: [`Unexpected cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      deleted
    };
  }
}

/**
 * Generate a unique test ID with prefix
 */
export function generateTestId(suffix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6);
  return `${TEST_PREFIX}${timestamp}-${random}${suffix ? `-${suffix}` : ''}`;
}

/**
 * Check if an ID is a test ID
 */
export function isTestId(id: string): boolean {
  return id.startsWith(TEST_PREFIX);
}
