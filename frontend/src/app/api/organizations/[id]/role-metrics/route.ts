import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: orgId } = params;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get role distribution to determine primary role
    const { data: participatingOrgs } = await supabase
      .from('activity_participating_organizations')
      .select('role_type')
      .eq('organization_id', orgId);

    const roleCounts = {
      funding: 0,
      implementing: 0,
      extending: 0,
      government: 0
    };

    (participatingOrgs || []).forEach((po: any) => {
      const role = po.role_type;
      if (role === 'funding') roleCounts.funding++;
      else if (role === 'implementing') roleCounts.implementing++;
      else if (role === 'extending') roleCounts.extending++;
      else if (role === 'government') roleCounts.government++;
    });

    const isFundingOrg = roleCounts.funding > roleCounts.implementing;

    // Get all activity IDs where org participates
    const { data: participatingActivities } = await supabase
      .from('activity_participating_organizations')
      .select('activity_id')
      .eq('organization_id', orgId);

    const activityIds = participatingActivities?.map(pa => pa.activity_id) || [];

    if (activityIds.length === 0) {
      return NextResponse.json({
        isFundingOrg,
        ...(isFundingOrg ? {
          totalOutboundFunding: 0,
          uniqueImplementingPartners: 0,
          disbursementVsCommitmentRate: 0
        } : {
          totalInboundFunding: 0,
          uniqueDonors: 0,
          averageActivitySize: 0
        })
      });
    }

    if (isFundingOrg) {
      // Funding org metrics
      // Total outbound funding: Sum of commitments where org is provider
      const { data: outboundTransactions } = await supabase
        .from('transactions')
        .select('value, value_usd, currency, receiver_org_id')
        .eq('provider_org_id', orgId)
        .in('transaction_type', ['1', '2']) // Commitments
        .in('activity_id', activityIds);

      const totalOutboundFunding = (outboundTransactions || []).reduce((sum, txn) => {
        const value = txn.value_usd || (txn.currency === 'USD' ? txn.value : 0);
        return sum + (value || 0);
      }, 0);

      // Unique implementing partners: Count unique orgs where org is funder
      const uniquePartnerIds = new Set<string>();
      (outboundTransactions || []).forEach((txn: any) => {
        if (txn.receiver_org_id) {
          uniquePartnerIds.add(txn.receiver_org_id);
        }
      });

      // Also check activity_participating_organizations for implementing partners
      const { data: implementingPartners } = await supabase
        .from('activity_participating_organizations')
        .select('organization_id')
        .eq('role_type', 'implementing')
        .in('activity_id', activityIds)
        .neq('organization_id', orgId);

      (implementingPartners || []).forEach((ip: any) => {
        uniquePartnerIds.add(ip.organization_id);
      });

      const uniqueImplementingPartners = uniquePartnerIds.size;

      // Disbursement vs commitment rate
      const { data: disbursements } = await supabase
        .from('transactions')
        .select('value, value_usd, currency')
        .eq('provider_org_id', orgId)
        .eq('transaction_type', '3') // Disbursements
        .in('activity_id', activityIds);

      const totalDisbursed = (disbursements || []).reduce((sum, txn) => {
        const value = txn.value_usd || (txn.currency === 'USD' ? txn.value : 0);
        return sum + (value || 0);
      }, 0);

      const disbursementVsCommitmentRate = totalOutboundFunding > 0
        ? (totalDisbursed / totalOutboundFunding) * 100
        : 0;

      return NextResponse.json({
        isFundingOrg: true,
        totalOutboundFunding,
        uniqueImplementingPartners,
        disbursementVsCommitmentRate: Math.round(disbursementVsCommitmentRate * 10) / 10
      });
    } else {
      // Implementing org metrics
      // Total inbound funding: Sum of commitments where org is receiver
      const { data: inboundTransactions } = await supabase
        .from('transactions')
        .select('value, value_usd, currency, provider_org_id, activity_id')
        .eq('receiver_org_id', orgId)
        .in('transaction_type', ['1', '2']) // Commitments
        .in('activity_id', activityIds);

      const totalInboundFunding = (inboundTransactions || []).reduce((sum, txn) => {
        const value = txn.value_usd || (txn.currency === 'USD' ? txn.value : 0);
        return sum + (value || 0);
      }, 0);

      // Unique donors: Count unique orgs where org is implementer
      const uniqueDonorIds = new Set<string>();
      (inboundTransactions || []).forEach((txn: any) => {
        if (txn.provider_org_id) {
          uniqueDonorIds.add(txn.provider_org_id);
        }
      });

      // Also check activity_participating_organizations for funding partners
      const { data: fundingPartners } = await supabase
        .from('activity_participating_organizations')
        .select('organization_id')
        .eq('role_type', 'funding')
        .in('activity_id', activityIds)
        .neq('organization_id', orgId);

      (fundingPartners || []).forEach((fp: any) => {
        uniqueDonorIds.add(fp.organization_id);
      });

      const uniqueDonors = uniqueDonorIds.size;

      // Average activity size: Average commitment amount per activity
      const commitmentsByActivity = new Map<string, number>();
      (inboundTransactions || []).forEach((txn: any) => {
        const activityId = txn.activity_id;
        const value = txn.value_usd || (txn.currency === 'USD' ? txn.value : 0);
        if (activityId) {
          commitmentsByActivity.set(
            activityId,
            (commitmentsByActivity.get(activityId) || 0) + (value || 0)
          );
        }
      });

      const activitySizes = Array.from(commitmentsByActivity.values());
      const averageActivitySize = activitySizes.length > 0
        ? activitySizes.reduce((sum, size) => sum + size, 0) / activitySizes.length
        : 0;

      return NextResponse.json({
        isFundingOrg: false,
        totalInboundFunding,
        uniqueDonors,
        averageActivitySize: Math.round(averageActivitySize * 100) / 100
      });
    }
  } catch (error: any) {
    console.error('[AIMS] Error calculating role metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate role metrics' },
      { status: 500 }
    );
  }
}






