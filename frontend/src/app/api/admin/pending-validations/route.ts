import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/pending-validations
 * Fetches activities and transactions pending government validation
 *
 * Query params:
 * - type: 'activities' | 'transactions' | 'all' (default: 'all')
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const results: {
      activities?: any[];
      transactions?: any[];
      counts?: { activities: number; transactions: number };
      totalUnvalidatedActivities?: number;
    } = {};

    // Fetch pending activities
    if (type === 'all' || type === 'activities') {
      // Get ALL activities with their government endorsement data
      // Activities are pending validation if submission_status is not 'validated'
      // The validation_status in government_endorsements is synced to activities.submission_status
      const { data: allActivities, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          id,
          iati_identifier,
          title_narrative,
          activity_status,
          planned_start_date,
          actual_start_date,
          created_at,
          updated_at,
          publication_status,
          submission_status,
          created_by_org_name,
          reporting_org_id,
          reporting_org_name,
          government_endorsements (
            validation_status,
            validation_date,
            validating_authority
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(500); // Fetch more to allow for filtering

      // Filter to only unvalidated activities (submission_status is null or not 'validated')
      const filteredActivities = (allActivities || []).filter(a =>
        !a.submission_status || a.submission_status !== 'validated'
      );
      const totalUnvalidatedActivities = filteredActivities.length;
      const activities = filteredActivities.slice(offset, offset + limit);

      if (activitiesError) {
        console.error('Error fetching pending activities:', activitiesError);
        results.activities = []; // Ensure we return empty array on error
        results.totalUnvalidatedActivities = 0;
      } else {
        console.log('[Pending Validations] Filtered activities count:', activities?.length, 'Total unvalidated:', totalUnvalidatedActivities);
        results.totalUnvalidatedActivities = totalUnvalidatedActivities;
        // Map activities - all returned are pending validation
        // Use the government endorsement validation_status if available, otherwise use submission_status
        results.activities = (activities || []).map(activity => {
          const endorsement = Array.isArray(activity.government_endorsements)
            ? activity.government_endorsements[0]
            : activity.government_endorsements;
          return {
            id: activity.id,
            iati_identifier: activity.iati_identifier,
            title: activity.title_narrative,
            status: activity.activity_status,
            start_date: activity.actual_start_date || activity.planned_start_date,
            organization: activity.reporting_org_name || activity.created_by_org_name,
            publication_status: activity.publication_status,
            submission_status: activity.submission_status,
            updated_at: activity.updated_at,
            validation_status: endorsement?.validation_status || activity.submission_status || null,
            validation_date: endorsement?.validation_date || null,
            validating_authority: endorsement?.validating_authority || null,
          };
        });
      }
    }

    // Fetch pending transactions
    if (type === 'all' || type === 'transactions') {
      // Get transactions that have not been validated (validated_by is null)
      // This matches the Transactions list which shows "-" when validated_by is null
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          uuid,
          activity_id,
          transaction_type,
          transaction_date,
          value,
          currency,
          status,
          description,
          provider_org_name,
          receiver_org_name,
          created_at,
          updated_at,
          validated_by,
          validated_at,
          activities!inner (
            id,
            iati_identifier,
            title_narrative,
            reporting_org_name,
            created_by_org_name
          )
        `)
        .is('validated_by', null)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (transactionsError) {
        console.error('Error fetching pending transactions:', transactionsError);
      } else {
        results.transactions = (transactions || []).map(txn => ({
          id: txn.uuid,
          activity_id: txn.activity_id,
          activity_iati_id: (txn.activities as any)?.iati_identifier,
          activity_title: (txn.activities as any)?.title_narrative,
          transaction_type: txn.transaction_type,
          transaction_date: txn.transaction_date,
          value: txn.value,
          currency: txn.currency,
          status: txn.status,
          description: txn.description,
          provider_org: txn.provider_org_name,
          receiver_org: txn.receiver_org_name,
          organization: (txn.activities as any)?.reporting_org_name || (txn.activities as any)?.created_by_org_name,
          updated_at: txn.updated_at,
          validated_by: txn.validated_by,
          validated_at: txn.validated_at,
        }));
      }
    }

    // Get counts for badges - use the total we already calculated
    const activitiesCount = results.totalUnvalidatedActivities || 0;

    const { count: transactionsCount } = await supabase
      .from('transactions')
      .select('uuid', { count: 'exact', head: true })
      .is('validated_by', null);

    results.counts = {
      activities: activitiesCount || 0,
      transactions: transactionsCount || 0,
    };

    console.log('[Pending Validations] Final results:', {
      activitiesLength: results.activities?.length,
      transactionsLength: results.transactions?.length,
      counts: results.counts,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in pending validations GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/pending-validations
 * Validate an activity or transaction
 *
 * Body:
 * - type: 'activity' | 'transaction'
 * - id: string (activity ID or transaction UUID)
 * - validated: boolean
 * - comments?: string
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const body = await request.json();
    const { type, id, validated, comments } = body;

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing required fields: type, id' }, { status: 400 });
    }

    if (type === 'activity') {
      // Update submission_status on the activity directly
      // This matches what the Activities list uses to display validation status
      const updateData: any = {
        submission_status: validated ? 'validated' : 'draft',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error validating activity:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Also update the government_endorsements table if an endorsement exists
      // This keeps both tables in sync
      const endorsementData: any = {
        validation_status: validated ? 'validated' : 'more_info_requested',
        validation_date: validated ? new Date().toISOString().split('T')[0] : null,
        updated_at: new Date().toISOString(),
      };

      // Try to update existing endorsement, or create one if none exists
      const { data: existingEndorsement } = await supabase
        .from('government_endorsements')
        .select('id')
        .eq('activity_id', id)
        .single();

      if (existingEndorsement) {
        // Update existing endorsement
        await supabase
          .from('government_endorsements')
          .update(endorsementData)
          .eq('activity_id', id);
      } else {
        // Create new endorsement with validation status
        await supabase
          .from('government_endorsements')
          .insert({
            activity_id: id,
            ...endorsementData,
          });
      }

      return NextResponse.json({ success: true, activity: data });
    }

    if (type === 'transaction') {
      // Update transaction validation status
      // This matches the Transactions list which uses validated_by to show validation
      const updateData: any = {
        validation_comments: comments || null,
        updated_at: new Date().toISOString(),
      };

      if (validated) {
        updateData.validated_by = 'admin'; // Placeholder - should be actual user ID from auth context
        updateData.validated_at = new Date().toISOString();
      } else {
        updateData.validated_by = null;
        updateData.validated_at = null;
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('uuid', id)
        .select()
        .single();

      if (error) {
        console.error('Error validating transaction:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, transaction: data });
    }

    return NextResponse.json({ error: 'Invalid type. Must be "activity" or "transaction"' }, { status: 400 });
  } catch (error) {
    console.error('Error in pending validations POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
