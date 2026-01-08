import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Fetch government inputs for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params;
  
  try {
    
    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

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
          nationalPlanAlignment: {},
          technicalCoordination: {},
          oversightAgreement: {},
          geographicContext: {},
          strategicConsiderations: {},
          evaluationResults: {}
        }
      });
    }

    // Transform database format to frontend format
    const frontendFormat = {
      onBudgetClassification: governmentInput.on_budget_classification || {},
      rgcContribution: governmentInput.rgc_contribution || {},
      nationalPlanAlignment: governmentInput.national_plan_alignment || {},
      technicalCoordination: governmentInput.technical_coordination || {},
      oversightAgreement: governmentInput.oversight_agreement || {},
      geographicContext: governmentInput.geographic_context || {},
      strategicConsiderations: governmentInput.strategic_considerations || {},
      evaluationResults: governmentInput.evaluation_results || {}
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
  
  try {
    body = await request.json();
    
    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify the activity exists and user has access
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Transform frontend format to database format
    const databaseFormat: any = {
      activity_id: activityId,
      on_budget_classification: body.onBudgetClassification || {},
      rgc_contribution: body.rgcContribution || {},
      national_plan_alignment: body.nationalPlanAlignment || {},
      technical_coordination: body.technicalCoordination || {},
      oversight_agreement: body.oversightAgreement || {},
      geographic_context: body.geographicContext || {},
      strategic_considerations: body.strategicConsiderations || {},
      evaluation_results: body.evaluationResults || {}
    };

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

    // Use upsert to create or update
    const { data: governmentInput, error } = await supabase
      .from('government_inputs')
      .upsert(databaseFormat, { 
        onConflict: 'activity_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

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
      nationalPlanAlignment: governmentInput.national_plan_alignment || {},
      technicalCoordination: governmentInput.technical_coordination || {},
      oversightAgreement: governmentInput.oversight_agreement || {},
      geographicContext: governmentInput.geographic_context || {},
      strategicConsiderations: governmentInput.strategic_considerations || {},
      evaluationResults: governmentInput.evaluation_results || {}
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
  try {
    const { id: activityId } = await params;
    
    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

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
