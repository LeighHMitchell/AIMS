import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { field, value, userId } = body;

    if (!field || value === undefined) {
      return NextResponse.json(
        { error: 'Field and value are required' },
        { status: 400 }
      );
    }

    // Validate and update the budget field
    const updateData: any = {
      [field]: value,
      updated_by: userId || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('activity_budgets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ budget: data });

  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}
