import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: orgId } = params;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get role distribution from activity_participating_organizations
    const { data: participatingOrgs, error } = await supabase
      .from('activity_participating_organizations')
      .select('role_type')
      .eq('organization_id', orgId);

    if (error) {
      console.error('[AIMS] Error fetching role distribution:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Count roles
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

    return NextResponse.json(roleCounts);
  } catch (error: any) {
    console.error('[AIMS] Error calculating role distribution:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate role distribution' },
      { status: 500 }
    );
  }
}






