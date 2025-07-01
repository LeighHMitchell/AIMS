import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST() {
  const supabase = getSupabaseAdmin();

  try {
    // Create a test activity with missing IATI fields
    const { data, error } = await supabase
      .from('activities')
      .insert({
        title: '[TEST] Activity with Missing IATI Fields',
        description: 'This is a test activity created to demonstrate the Data Clinic functionality. It has several missing IATI fields.',
        activity_status: '2', // Implementation status
        // Deliberately missing: default_aid_type, default_finance_type, flow_type, tied_status
        // Also missing dates and sectors
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      activity: data,
      message: 'Test activity created with missing IATI fields'
    });
  } catch (error) {
    console.error('Error creating test activity:', error);
    return NextResponse.json(
      { error: 'Failed to create test activity' },
      { status: 500 }
    );
  }
} 