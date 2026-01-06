import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

interface ActivityMetadata {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  created_by?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  updated_by?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  publication_status?: string;
  submission_status?: string;
  activity_status?: string;
  iati_identifier?: string;
  partner_id?: string;
  total_budget?: number;
  total_disbursed?: number;
  version?: number;
  sync_status?: string;
  last_sync_time?: string;
  auto_sync?: boolean;
  reporting_org_id?: string;
  created_by_org_name?: string;
  created_by_org_acronym?: string;
  language?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  user_id?: string;
  activity_id: string;
  details: {
    entityType?: string;
    entityId?: string;
    activityTitle?: string;
    user?: {
      id: string;
      name: string;
      role: string;
    };
    metadata?: {
      fieldChanged?: string;
      oldValue?: any;
      newValue?: any;
    };
  };
  created_at: string;
  updated_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    // Handle both sync and async params (Next.js 14/15 compatibility)
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }
    
    // Fetch activity metadata (simplified query with only confirmed fields)
    const { data: activityData, error: activityError } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        created_at,
        updated_at,
        publication_status,
        submission_status,
        activity_status,
        iati_identifier,
        other_identifier,
        created_by,
        last_edited_by,
        created_by_org_name,
        created_by_org_acronym,
        reporting_org_id,
        language
      `)
      .eq('id', id)
      .single();

    if (activityError) {
      console.error('[AIMS] Error fetching activity metadata:', activityError);
      return NextResponse.json(
        { error: 'Activity not found', details: activityError.message },
        { status: 404 }
      );
    }

    if (!activityData) {
      console.error('[AIMS] No activity data returned for ID:', id);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Fetch activity logs for this specific activity
    const { data: logsData, error: logsError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('activity_id', id)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to last 50 changes

    if (logsError) {
      console.error('[AIMS] Error fetching activity logs:', logsError);
      // Continue without logs rather than failing completely
    }

    // Fetch creator and updater user information
    const userIds = [activityData.created_by, activityData.last_edited_by].filter(Boolean);
    let usersData: any[] = [];
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, role, first_name, last_name')
        .in('id', userIds);
      
      if (!usersError) {
        usersData = users || [];
        console.log('[AIMS] Found user data:', usersData);
      } else {
        console.error('[AIMS] Error fetching users:', usersError);
      }
    }

    // Fetch activity contacts (focal points)
    const { data: contactsData, error: contactsError } = await supabase
      .from('activity_contacts')
      .select('*')
      .eq('activity_id', id);

    if (contactsError) {
      console.error('[AIMS] Error fetching activity contacts:', contactsError);
    }

    // Calculate financial totals from transactions if needed
    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('transaction_type, value')
      .eq('activity_id', id);

    let totalBudget = 0;
    let totalDisbursed = 0;

    if (transactionsData) {
      transactionsData.forEach((transaction: any) => {
        const value = transaction.value || 0;
        switch (transaction.transaction_type) {
          case '1': // Incoming Funds
          case '2': // Commitment
            totalBudget += value;
            break;
          case '3': // Disbursement
          case '4': // Expenditure
            totalDisbursed += value;
            break;
        }
      });
    }

    // Build metadata response
    const createdBy = usersData.find(u => u.id === activityData.created_by);
    const updatedBy = usersData.find(u => u.id === activityData.last_edited_by);

    const metadata: ActivityMetadata = {
      id: activityData.id,
      title: activityData.title_narrative || 'Untitled Activity',
      created_at: activityData.created_at,
      updated_at: activityData.updated_at,
      created_by: createdBy ? {
        id: createdBy.id,
        name: createdBy.name || `${createdBy.first_name || ''} ${createdBy.last_name || ''}`.trim() || 'Unknown User',
        email: createdBy.email,
        role: createdBy.role
      } : {
        id: 'unknown',
        name: activityData.created_by_org_name || 'Unknown Organization',
        email: '',
        role: 'organization'
      },
      updated_by: updatedBy ? {
        id: updatedBy.id,
        name: updatedBy.name || `${updatedBy.first_name || ''} ${updatedBy.last_name || ''}`.trim() || 'Unknown User',
        email: updatedBy.email,
        role: updatedBy.role
      } : undefined,
      publication_status: activityData.publication_status,
      submission_status: activityData.submission_status,
      activity_status: activityData.activity_status,
      iati_identifier: activityData.iati_identifier,
      partner_id: activityData.other_identifier,
      total_budget: totalBudget,
      total_disbursed: totalDisbursed,
      version: 1,
      sync_status: 'never',
      last_sync_time: undefined,
      auto_sync: false,
      reporting_org_id: activityData.reporting_org_id,
      created_by_org_name: activityData.created_by_org_name,
      created_by_org_acronym: activityData.created_by_org_acronym,
      language: activityData.language
    };

    // Transform logs data
    const logs: ActivityLog[] = (logsData || []).map((log: any) => ({
      id: log.id,
      action: log.action,
      user_id: log.user_id,
      activity_id: log.activity_id,
      details: log.details || {},
      created_at: log.created_at,
      updated_at: log.updated_at
    }));

    // Process contacts data for focal points
    const governmentFocalPoints = contactsData?.filter((contact: any) => 
      contact.type === 'government_focal_point' || contact.type === 'government' || contact.type === 'recipient_government'
    ) || [];
    
    const developmentPartnerFocalPoints = contactsData?.filter((contact: any) => 
      contact.type === 'development_partner_focal_point' || contact.type === 'development_partner' || contact.type === 'extending_organisation'
    ) || [];

    return NextResponse.json({
      metadata,
      logs,
      contacts: {
        government_focal_points: governmentFocalPoints,
        development_partner_focal_points: developmentPartnerFocalPoints,
        all_contacts: contactsData || []
      },
      stats: {
        totalLogs: logs.length,
        lastModified: activityData.updated_at,
        createdDaysAgo: Math.floor((Date.now() - new Date(activityData.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        lastModifiedDaysAgo: Math.floor((Date.now() - new Date(activityData.updated_at).getTime()) / (1000 * 60 * 60 * 24))
      }
    });

  } catch (error) {
    console.error('[AIMS] Error in metadata API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
