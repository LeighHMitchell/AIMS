import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get organizations that are donors (participating in activities with role = 1)
    const { data: donors, error } = await supabaseAdmin
      .from('organizations')
      .select(`
        id,
        name,
        type,
        participating_orgs!inner (
          role
        )
      `)
      .eq('participating_orgs.role', 1)
      .order('name');

    if (error) {
      console.error('Error fetching donors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch donors' },
        { status: 500 }
      );
    }

    // Remove duplicates and format response
    const uniqueDonors = donors?.reduce((acc: any[], org: any) => {
      if (!acc.find(d => d.id === org.id)) {
        acc.push({
          id: org.id,
          name: org.name,
          type: org.type
        });
      }
      return acc;
    }, []) || [];

    return NextResponse.json(uniqueDonors);

  } catch (error) {
    console.error('Error in donors API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}