import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: markers, error } = await getSupabaseAdmin()
      .from('policy_markers')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching policy markers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch policy markers' },
        { status: 500 }
      );
    }

    return NextResponse.json(markers || []);
  } catch (error) {
    console.error('Error in policy markers API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}