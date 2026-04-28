import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Fetch government inputs for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params;

  const { response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }
    // Query government inputs directly with RLS
    const { data: governmentInputs, error } = await supabase
      .from('government_inputs')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching government inputs:', error);
      console.error('Supabase error details:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch government inputs',
        details: error.message 
      }, { status: 500 });
    }

    // Return the first (and only) record, or null if none exists
    const governmentInput = governmentInputs && governmentInputs.length > 0 ? governmentInputs[0] : null;

    if (!governmentInput) {
      // Return empty structure if no government inputs exist yet
      return NextResponse.json({
        governmentInputs: {
          onBudgetClassification: {},
          rgcContribution: {},
          riskAssessment: {},
          evaluationResults: {}
        }
      });
    }

    // Transform database format to frontend format
    const frontendFormat = {
      onBudgetClassification: governmentInput.on_budget_classification || {},
      rgcContribution: governmentInput.rgc_contribution || {},
      riskAssessment: governmentInput.risk_assessment || {},
      evaluationResults: governmentInput.evaluation_results || {},
      // Legacy fields (read-only, kept for backward compat)
      nationalPlanAlignment: governmentInput.national_plan_alignment || {},
      technicalCoordination: governmentInput.technical_coordination || {},
      oversightAgreement: governmentInput.oversight_agreement || {},
      geographicContext: governmentInput.geographic_context || {},
      strategicConsiderations: governmentInput.strategic_considerations || {},
    };

    return NextResponse.json({
      governmentInputs: frontendFormat,
      metadata: {
        id: governmentInput.id,
        activityId: governmentInput.activity_id,
        createdAt: governmentInput.created_at,
        updatedAt: governmentInput.updated_at,
        createdBy: governmentInput.created_by,
        updatedBy: governmentInput.updated_by
      }
    });

  } catch (error) {
    console.error('Error in government inputs GET:', error);
    console.error('GET Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      activityId
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST/PUT - Create or update government inputs for an activity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params;
  let body: any;

  const { response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    body = await request.json();

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }
    // Verify the activity exists and user has access
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Transform frontend format to database format.
    // Only include JSONB fields that actually have content. This keeps saves
    // robust against schema drift (e.g. a deploy where the `risk_assessment`
    // column migration hasn't been applied yet) — we only write columns the
    // user is actively touching.
    const hasContent = (v: unknown) =>
      v != null && (typeof v !== 'object' || Array.isArray(v) || Object.keys(v as object).length > 0);

    const databaseFormat: any = { activity_id: activityId };
    if (hasContent(body.onBudgetClassification)) databaseFormat.on_budget_classification = body.onBudgetClassification;
    if (hasContent(body.rgcContribution)) databaseFormat.rgc_contribution = body.rgcContribution;
    if (hasContent(body.riskAssessment)) databaseFormat.risk_assessment = body.riskAssessment;
    if (hasContent(body.evaluationResults)) databaseFormat.evaluation_results = body.evaluationResults;
    // Legacy fields — only include when the client actually sends content
    if (hasContent(body.nationalPlanAlignment)) databaseFormat.national_plan_alignment = body.nationalPlanAlignment;
    if (hasContent(body.technicalCoordination)) databaseFormat.technical_coordination = body.technicalCoordination;
    if (hasContent(body.oversightAgreement)) databaseFormat.oversight_agreement = body.oversightAgreement;
    if (hasContent(body.geographicContext)) databaseFormat.geographic_context = body.geographicContext;
    if (hasContent(body.strategicConsiderations)) databaseFormat.strategic_considerations = body.strategicConsiderations;

    // Handle user tracking fields
    // Check if this is an update (record already exists)
    const { data: existing } = await supabase
      .from('government_inputs')
      .select('id, created_by')
      .eq('activity_id', activityId)
      .maybeSingle();

    if (existing) {
      // Update only updated_by for existing records, set to null if no userId
      databaseFormat.updated_by = body.userId || null;
    } else {
      // For new records, set both fields (or null if no userId)
      databaseFormat.created_by = body.userId || null;
      databaseFormat.updated_by = body.userId || null;
    }

    // Use upsert to create or update. If PostgREST reports an unknown column
    // (migration not yet applied), drop that column and retry — we prefer to
    // save the remaining fields than fail the whole save.
    let governmentInput: any = null;
    let error: any = null;
    let remaining = { ...databaseFormat };
    for (let attempt = 0; attempt < 10; attempt++) {
      const result = await supabase
        .from('government_inputs')
        .upsert(remaining, { onConflict: 'activity_id', ignoreDuplicates: false })
        .select()
        .single();
      error = result.error;
      governmentInput = result.data;
      if (!error) break;
      // PGRST204: "Could not find the 'X' column of 'Y' in the schema cache"
      if (error.code === 'PGRST204' && typeof error.message === 'string') {
        const match = error.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1] && match[1] !== 'activity_id' && match[1] in remaining) {
          console.warn(`[government-inputs] Dropping unknown column "${match[1]}" and retrying.`);
          const { [match[1]]: _dropped, ...rest } = remaining;
          remaining = rest;
          continue;
        }
      }
      break;
    }

    if (error) {
      console.error('Error saving government inputs:', error);
      console.error('Supabase error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json({ 
        error: 'Failed to save government inputs',
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }

    // Transform back to frontend format for response
    const frontendFormat = {
      onBudgetClassification: governmentInput.on_budget_classification || {},
      rgcContribution: governmentInput.rgc_contribution || {},
      riskAssessment: governmentInput.risk_assessment || {},
      evaluationResults: governmentInput.evaluation_results || {},
    };

    return NextResponse.json({
      governmentInputs: frontendFormat,
      metadata: {
        id: governmentInput.id,
        activityId: governmentInput.activity_id,
        createdAt: governmentInput.created_at,
        updatedAt: governmentInput.updated_at,
        createdBy: governmentInput.created_by,
        updatedBy: governmentInput.updated_by
      }
    });

  } catch (error) {
    console.error('Error in government inputs POST:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      activityId,
      body: body
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Update government inputs (alias for POST for consistency)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return POST(request, { params });
}

// DELETE - Delete government inputs for an activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id: activityId } = await params;
    
    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }
    const { error } = await supabase
      .from('government_inputs')
      .delete()
      .eq('activity_id', activityId);

    if (error) {
      console.error('Error deleting government inputs:', error);
      return NextResponse.json({ error: 'Failed to delete government inputs' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Government inputs deleted successfully' });

  } catch (error) {
    console.error('Error in government inputs DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
