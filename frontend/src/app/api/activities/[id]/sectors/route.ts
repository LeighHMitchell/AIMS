import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    
    // Fetch existing sector allocations for this activity
    const { data: sectors, error } = await getSupabaseAdmin()
      .from('activity_sectors')
      .select('*')
      .eq('activity_id', activityId)
      .order('percentage', { ascending: false });

    if (error) {
      console.error('Error fetching sectors:', error);
      return NextResponse.json({ error: 'Failed to fetch sectors' }, { status: 500 });
    }

    return NextResponse.json({ sectors: sectors || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    const { sectors } = await request.json();

    // Validate total percentage
    const total = sectors.reduce((sum: number, s: any) => sum + s.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      return NextResponse.json(
        { error: 'Sector allocations must sum to 100%' },
        { status: 400 }
      );
    }

    // Start a transaction to update sectors
    // First, delete existing sectors for this activity
    const { error: deleteError } = await getSupabaseAdmin()
      .from('activity_sectors')
      .delete()
      .eq('activity_id', activityId);

    if (deleteError) {
      console.error('Error deleting existing sectors:', deleteError);
      return NextResponse.json({ error: 'Failed to update sectors' }, { status: 500 });
    }

    // Insert new sectors
    const sectorsToInsert = sectors.map((s: any) => ({
      activity_id: activityId,
      dac5_code: s.dac5_code,
      dac5_name: s.dac5_name,
      dac3_code: s.dac3_code,
      dac3_name: s.dac3_name,
      percentage: s.percentage
    }));

    const { data: insertedSectors, error: insertError } = await getSupabaseAdmin()
      .from('activity_sectors')
      .insert(sectorsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting sectors:', insertError);
      return NextResponse.json({ error: 'Failed to save sectors' }, { status: 500 });
    }

    // Update activity updated_at timestamp
    const { error: updateError } = await getSupabaseAdmin()
      .from('activities')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activityId);

    if (updateError) {
      console.error('Error updating activity timestamp:', updateError);
    }

    return NextResponse.json({ 
      success: true, 
      sectors: insertedSectors,
      message: 'Sectors saved successfully' 
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 