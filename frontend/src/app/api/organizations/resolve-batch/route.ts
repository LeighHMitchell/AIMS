import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api-fetch';

export const dynamic = 'force-dynamic'

interface BatchResolveRequest {
  organizations: Array<{
    ref: string | null
    narrative: string | null
    context?: any
  }>
}

interface BatchResolveResponse {
  results: Array<{
    matched: boolean
    organization?: {
      id: string
      name: string
      iati_org_id: string | null
      country_represented: string | null
      acronym: string | null
    }
    method?: 'direct' | 'alias_ref' | 'fuzzy_name' | 'fuzzy_alias'
    similarity?: number
    matched_by?: string
  }>
}

/**
 * POST /api/organizations/resolve-batch
 * Resolve multiple organization references in a single request
 */
export async function POST(request: NextRequest): Promise<NextResponse<BatchResolveResponse>> {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' } as any, { status: 500 });
  }

  try {
    const body: BatchResolveRequest = await request.json()
    const { organizations } = body

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({
        results: []
      })
    }

    const results = []

    // Resolve each organization sequentially
    // We could optimize this with parallel processing, but sequential is simpler and avoids overwhelming the DB
    for (const org of organizations) {
      const resolveResponse = await apiFetch(`${request.nextUrl.origin}/api/organizations/resolve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ref: org.ref,
            narrative: org.narrative
          })
        }
      )

      const resolveResult = await resolveResponse.json()
      results.push(resolveResult)
    }

    return NextResponse.json({
      results
    })

  } catch (error) {
    console.error('[Batch Resolve] Error:', error)
    return NextResponse.json(
      {
        results: []
      },
      { status: 500 }
    )
  }
}

