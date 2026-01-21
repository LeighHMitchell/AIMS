import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Helper function to check user permissions
async function checkUserPermissions(supabaseClient: any, userId: string, organizationId?: string) {
  if (!supabaseClient) return false;

  // Get user info
  const { data: user, error: userError } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError || !user) return false;

  // Super users and government users have access to all
  if (user.role === 'super_user' || user.role === 'government_user') {
    return true;
  }

  // For specific organization, check if user belongs to it
  if (organizationId) {
    const { data: userOrg, error: orgError } = await supabaseClient
      .from('user_organizations')
      .select('user_id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    return !orgError && userOrg;
  }

  return false;
}

// GET - Fetch strategies
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const supabaseAdmin = supabase;
    
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const publicOnly = searchParams.get('publicOnly') === 'true';
    const userId = searchParams.get('userId');

    let query = supabaseAdmin
      .from('development_strategies')
      .select(`
        *,
        organization:organizations(id, name, acronym),
        created_by_user:users!created_by(id, name),
        last_edited_by_user:users!last_edited_by(id, name)
      `);

    // Apply filters
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    // If public only, filter for public strategies with files
    if (publicOnly) {
      query = query.eq('public', true).eq('has_file', true);
    } else if (userId) {
      // Check permissions for non-public view
      const hasPermission = organizationId
        ? await checkUserPermissions(supabaseAdmin, userId, organizationId)
        : await checkUserPermissions(supabaseAdmin, userId);

      if (!hasPermission) {
        // If no permission, only return public strategies
        query = query.eq('public', true).eq('has_file', true);
      }
    } else {
      // No user provided, only return public strategies
      query = query.eq('public', true).eq('has_file', true);
    }

    // Order by created_at desc
    query = query.order('created_at', { ascending: false });

    const { data: strategies, error } = await query;

    if (error) {
      console.error('[AIMS] Error fetching strategies:', error);
      return NextResponse.json({ error: 'Failed to fetch strategies' }, { status: 500 });
    }

    console.log(`[AIMS] Successfully fetched ${strategies?.length || 0} strategies`);
    return NextResponse.json(strategies || []);

  } catch (error) {
    console.error('[AIMS] Strategies GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new strategy
export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      organizationId,
      title,
      documentType,
      status,
      thematicPillars,
      languages,
      publicLink,
      notes,
      governmentCounterparts,
      userId,
      // Date fields
      startDate,
      endDate,
      startYear,
      endYear,
      startMonth,
      endMonth,
      estimatedStartDate,
      estimatedEndDate,
      expectedPublicationDate,
      // File info (if uploading)
      hasFile,
      fileName,
      fileSize,
      fileType,
      fileUrl
    } = body;

    // Validate required fields
    if (!organizationId || !title || !documentType || !status || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, title, documentType, status, userId' },
        { status: 400 }
      );
    }

    // Get admin client
    const supabaseAdmin = supabase;

    // Check permissions
    const hasPermission = await checkUserPermissions(supabaseAdmin, userId, organizationId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Determine if strategy should be public
    const isPublic = status === 'Published' && hasFile;
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Create strategy
    const { data: strategy, error } = await supabaseAdmin
      .from('development_strategies')
      .insert({
        organization_id: organizationId,
        title,
        document_type: documentType,
        status,
        start_date: startDate,
        end_date: endDate,
        start_year: startYear,
        end_year: endYear,
        start_month: startMonth,
        end_month: endMonth,
        estimated_start_date: estimatedStartDate,
        estimated_end_date: estimatedEndDate,
        expected_publication_date: expectedPublicationDate,
        thematic_pillars: thematicPillars || [],
        languages: languages || ['English'],
        public_link: publicLink,
        notes,
        government_counterparts: governmentCounterparts || [],
        has_file: hasFile || false,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        file_url: fileUrl,
        public: isPublic,
        created_by: userId,
        last_edited_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('[AIMS] Error creating strategy:', error);
      return NextResponse.json({ error: 'Failed to create strategy' }, { status: 500 });
    }

    console.log('[AIMS] Successfully created strategy:', strategy.id);
    return NextResponse.json(strategy, { status: 201 });

  } catch (error) {
    console.error('[AIMS] Strategies POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update strategy
export async function PUT(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const supabaseAdmin = supabase;
    
    const body = await request.json();
    const { id, userId, ...updateData } = body;

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: id, userId' },
        { status: 400 }
      );
    }

    // Get existing strategy to check permissions
    const { data: existingStrategy, error: fetchError } = await supabaseAdmin
      .from('development_strategies')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingStrategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    // Check permissions
    const hasPermission = await checkUserPermissions(supabaseAdmin, userId, existingStrategy.organization_id);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update public status based on status and file
    if (updateData.status && updateData.hasFile !== undefined) {
      updateData.public = updateData.status === 'Published' && updateData.hasFile;
    }

    // Add last_edited_by
    updateData.last_edited_by = userId;

    const { data: strategy, error } = await supabaseAdmin
      .from('development_strategies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[AIMS] Error updating strategy:', error);
      return NextResponse.json({ error: 'Failed to update strategy' }, { status: 500 });
    }

    console.log('[AIMS] Successfully updated strategy:', id);
    return NextResponse.json(strategy);

  } catch (error) {
    console.error('[AIMS] Strategies PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete strategy
export async function DELETE(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const supabaseAdmin = supabase;
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: id, userId' },
        { status: 400 }
      );
    }

    // Get existing strategy to check permissions
    const { data: existingStrategy, error: fetchError } = await supabaseAdmin
      .from('development_strategies')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingStrategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    // Check permissions
    const hasPermission = await checkUserPermissions(supabaseAdmin, userId, existingStrategy.organization_id);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('development_strategies')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[AIMS] Error deleting strategy:', error);
      return NextResponse.json({ error: 'Failed to delete strategy' }, { status: 500 });
    }

    console.log('[AIMS] Successfully deleted strategy:', id);
    return NextResponse.json({ message: 'Strategy deleted successfully' });

  } catch (error) {
    console.error('[AIMS] Strategies DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 