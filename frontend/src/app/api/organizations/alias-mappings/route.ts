import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface CreateMappingRequest {
  original_ref?: string | null
  original_narrative?: string | null
  resolved_organization_id: string
  resolution_method: 'direct' | 'alias_ref' | 'fuzzy_name' | 'fuzzy_alias' | 'manual'
  matched_by?: string | null
  similarity_score?: number | null
  import_session_id?: string | null
  notes?: string | null
}

interface MappingRecord {
  id: string
  original_ref: string | null
  original_narrative: string | null
  resolved_organization_id: string
  resolution_method: string
  matched_by: string | null
  similarity_score: number | null
  import_session_id: string | null
  created_by: string | null
  created_at: string
  notes: string | null
}

/**
 * POST /api/organizations/alias-mappings
 * Create a new alias mapping record
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CreateMappingRequest = await request.json()
    const {
      original_ref,
      original_narrative,
      resolved_organization_id,
      resolution_method,
      matched_by,
      similarity_score,
      import_session_id,
      notes
    } = body

    // Validate required fields
    if (!resolved_organization_id || !resolution_method) {
      return NextResponse.json(
        { error: 'Missing required fields: resolved_organization_id, resolution_method' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Insert mapping record
    const { data: mapping, error } = await supabase
      .from('organization_alias_mappings')
      .insert({
        original_ref,
        original_narrative,
        resolved_organization_id,
        resolution_method,
        matched_by,
        similarity_score,
        import_session_id,
        created_by: null, // No auth system in place yet
        notes
      })
      .select()
      .single()

    if (error) {
      console.error('[Alias Mappings] Create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ mapping })

  } catch (error) {
    console.error('[Alias Mappings] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create alias mapping' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/organizations/alias-mappings
 * Retrieve alias mapping history
 * Query params: org_id, session_id, limit, offset
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl
    const orgId = searchParams.get('org_id')
    const sessionId = searchParams.get('session_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('organization_alias_mappings')
      .select(`
        id,
        original_ref,
        original_narrative,
        resolved_organization_id,
        resolution_method,
        matched_by,
        similarity_score,
        import_session_id,
        created_by,
        created_at,
        notes,
        organization:organizations!resolved_organization_id (
          id,
          name,
          iati_org_id,
          acronym
        ),
        user:auth.users!created_by (
          id,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (orgId) {
      query = query.eq('resolved_organization_id', orgId)
    }

    if (sessionId) {
      query = query.eq('import_session_id', sessionId)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: mappings, error, count } = await query

    if (error) {
      console.error('[Alias Mappings] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      mappings: mappings || [],
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('[Alias Mappings] Error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve alias mappings' },
      { status: 500 }
    )
  }
}

