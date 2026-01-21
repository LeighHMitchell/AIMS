import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Fetch all IATI budgets for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const { data: budgets, error } = await supabase
      .from('organization_budgets')
      .select('*')
      .eq('organization_id', organizationId)
      .order('budget_type', { ascending: true })
      .order('period_start', { ascending: false });

    if (error) {
      console.error('[AIMS] Error fetching organization budgets:', error);
      return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
    }

    // Transform to component-friendly format
    const transformedBudgets = (budgets || []).map(b => ({
      id: b.id,
      budgetType: b.budget_type,
      budgetStatus: b.budget_status,
      periodStart: b.period_start,
      periodEnd: b.period_end,
      value: b.value ? parseFloat(b.value) : undefined,
      currency: b.currency,
      valueDate: b.value_date,
      recipientRef: b.recipient_ref,
      recipientNarrative: b.recipient_narrative,
      recipientVocabulary: b.recipient_vocabulary,
      recipientVocabularyUri: b.recipient_vocabulary_uri,
      budgetLines: b.budget_lines || [],
    }));

    return NextResponse.json(transformedBudgets);
  } catch (error) {
    console.error('[AIMS] Unexpected error fetching organization budgets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new budget
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.budgetType) {
      return NextResponse.json({ error: 'Budget type is required' }, { status: 400 });
    }

    const budgetData = {
      organization_id: organizationId,
      budget_type: body.budgetType,
      budget_status: body.budgetStatus || '1',
      period_start: body.periodStart || null,
      period_end: body.periodEnd || null,
      value: body.value || null,
      currency: body.currency || 'USD',
      value_date: body.valueDate || null,
      recipient_ref: body.recipientRef || null,
      recipient_narrative: body.recipientNarrative || null,
      recipient_vocabulary: body.recipientVocabulary || null,
      recipient_vocabulary_uri: body.recipientVocabularyUri || null,
      budget_lines: body.budgetLines || [],
    };

    const { data: budget, error } = await supabase
      .from('organization_budgets')
      .insert(budgetData)
      .select()
      .single();

    if (error) {
      console.error('[AIMS] Error creating organization budget:', error);
      return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
    }

    // Transform to component-friendly format
    const transformed = {
      id: budget.id,
      budgetType: budget.budget_type,
      budgetStatus: budget.budget_status,
      periodStart: budget.period_start,
      periodEnd: budget.period_end,
      value: budget.value ? parseFloat(budget.value) : undefined,
      currency: budget.currency,
      valueDate: budget.value_date,
      recipientRef: budget.recipient_ref,
      recipientNarrative: budget.recipient_narrative,
      recipientVocabulary: budget.recipient_vocabulary,
      recipientVocabularyUri: budget.recipient_vocabulary_uri,
      budgetLines: budget.budget_lines || [],
    };

    return NextResponse.json(transformed, { status: 201 });
  } catch (error) {
    console.error('[AIMS] Unexpected error creating organization budget:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a budget
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    const budgetData: Record<string, any> = {};

    if (body.budgetType !== undefined) budgetData.budget_type = body.budgetType;
    if (body.budgetStatus !== undefined) budgetData.budget_status = body.budgetStatus;
    if (body.periodStart !== undefined) budgetData.period_start = body.periodStart;
    if (body.periodEnd !== undefined) budgetData.period_end = body.periodEnd;
    if (body.value !== undefined) budgetData.value = body.value;
    if (body.currency !== undefined) budgetData.currency = body.currency;
    if (body.valueDate !== undefined) budgetData.value_date = body.valueDate;
    if (body.recipientRef !== undefined) budgetData.recipient_ref = body.recipientRef;
    if (body.recipientNarrative !== undefined) budgetData.recipient_narrative = body.recipientNarrative;
    if (body.recipientVocabulary !== undefined) budgetData.recipient_vocabulary = body.recipientVocabulary;
    if (body.recipientVocabularyUri !== undefined) budgetData.recipient_vocabulary_uri = body.recipientVocabularyUri;
    if (body.budgetLines !== undefined) budgetData.budget_lines = body.budgetLines;

    const { data: budget, error } = await supabase
      .from('organization_budgets')
      .update(budgetData)
      .eq('id', body.id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('[AIMS] Error updating organization budget:', error);
      return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
    }

    // Transform to component-friendly format
    const transformed = {
      id: budget.id,
      budgetType: budget.budget_type,
      budgetStatus: budget.budget_status,
      periodStart: budget.period_start,
      periodEnd: budget.period_end,
      value: budget.value ? parseFloat(budget.value) : undefined,
      currency: budget.currency,
      valueDate: budget.value_date,
      recipientRef: budget.recipient_ref,
      recipientNarrative: budget.recipient_narrative,
      recipientVocabulary: budget.recipient_vocabulary,
      recipientVocabularyUri: budget.recipient_vocabulary_uri,
      budgetLines: budget.budget_lines || [],
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('[AIMS] Unexpected error updating organization budget:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a budget
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('budgetId');

    if (!budgetId) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('organization_budgets')
      .delete()
      .eq('id', budgetId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[AIMS] Error deleting organization budget:', error);
      return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AIMS] Unexpected error deleting organization budget:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
