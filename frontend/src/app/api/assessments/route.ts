import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { escapeIlikeWildcards } from '@/lib/security-utils';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || undefined;
    const documentType = searchParams.get('document_type') || undefined;
    const sector = searchParams.get('sector') || undefined;
    const region = searchParams.get('region') || undefined;
    const organization = searchParams.get('organization') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const tags = searchParams.get('tags') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('assessments')
      .select(`
        *,
        lead_organization:lead_organization_id (
          id,
          name,
          acronym
        )
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      const escaped = escapeIlikeWildcards(search);
      query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }

    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    if (sector) {
      query = query.contains('sector_codes', [sector]);
    }

    if (region) {
      query = query.contains('region_names', [region]);
    }

    if (organization) {
      query = query.eq('lead_organization_id', organization);
    }

    if (dateFrom) {
      query = query.gte('publication_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('publication_date', dateTo);
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query = query.contains('tags', tagArray);
    }

    // Order, paginate
    query = query
      .order('publication_date', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data: assessments, error, count } = await query;

    if (error) {
      console.error('[Assessments API] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch type breakdown for stats
    const { data: typeStats } = await supabase
      .from('assessments')
      .select('document_type');

    const typeBreakdown: Record<string, number> = {};
    if (typeStats) {
      typeStats.forEach((row: any) => {
        typeBreakdown[row.document_type] = (typeBreakdown[row.document_type] || 0) + 1;
      });
    }

    const total = count || 0;

    return NextResponse.json({
      assessments: assessments || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        byType: typeBreakdown,
      },
    });
  } catch (error) {
    console.error('[Assessments API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessments', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();

    if (!body.title || !body.document_type) {
      return NextResponse.json(
        { error: 'Title and document_type are required' },
        { status: 400 }
      );
    }

    const validTypes = ['assessment', 'survey', 'evaluation', 'research', 'report', 'policy_brief', 'case_study', 'lessons_learned', 'guidance', 'other'];
    if (!validTypes.includes(body.document_type)) {
      return NextResponse.json(
        { error: 'Invalid document_type' },
        { status: 400 }
      );
    }

    const insertData = {
      title: body.title,
      description: body.description || null,
      document_type: body.document_type,
      sector_codes: body.sector_codes || [],
      sector_names: body.sector_names || [],
      lead_organization_id: body.lead_organization_id || null,
      contributing_organization_ids: body.contributing_organization_ids || [],
      author_names: body.author_names || [],
      geographic_scope: body.geographic_scope || null,
      region_names: body.region_names || [],
      pcodes: body.pcodes || [],
      publication_date: body.publication_date || null,
      data_collection_start: body.data_collection_start || null,
      data_collection_end: body.data_collection_end || null,
      url: body.url || null,
      file_path: body.file_path || null,
      file_name: body.file_name || null,
      file_size: body.file_size || null,
      format: body.format || null,
      language: body.language || 'en',
      is_public: body.is_public !== undefined ? body.is_public : true,
      methodology: body.methodology || null,
      sample_size: body.sample_size || null,
      activity_ids: body.activity_ids || [],
      tags: body.tags || [],
      created_by: user?.id || null,
    };

    const { data: assessment, error } = await supabase
      .from('assessments')
      .insert(insertData)
      .select(`
        *,
        lead_organization:lead_organization_id (
          id,
          name,
          acronym
        )
      `)
      .single();

    if (error) {
      console.error('[Assessments API] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ assessment, message: 'Assessment created successfully' }, { status: 201 });
  } catch (error) {
    console.error('[Assessments API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to create assessment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
