import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'

interface ResolveRequest {
  ref: string | null
  narrative: string | null
}

interface ResolveResponse {
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
}

/**
 * POST /api/organizations/resolve
 * Resolve an organization reference from IATI XML to a database organization
 * 
 * Resolution order:
 * 1. Direct match by iati_org_id (exact)
 * 2. Match by alias_refs array (exact)
 * 3. Fuzzy match by name using pg_trgm (similarity > 0.6)
 * 4. Fuzzy match by name_aliases array using pg_trgm
 */
export async function POST(request: NextRequest): Promise<NextResponse<ResolveResponse>> {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' } as any, { status: 500 });
  }

  try {
    const body: ResolveRequest = await request.json()
    const { ref, narrative } = body

    if (!ref && !narrative) {
      return NextResponse.json({
        matched: false
      })
    }
    // Step 1: Try direct match by iati_org_id
    if (ref) {
      const { data: directMatch } = await supabase
        .from('organizations')
        .select('id, name, iati_org_id, country_represented, acronym')
        .eq('iati_org_id', ref)
        .maybeSingle()

      if (directMatch) {
        return NextResponse.json({
          matched: true,
          organization: directMatch,
          method: 'direct',
          matched_by: 'iati_org_id'
        })
      }

      // Step 2: Try match by alias_refs array
      const { data: aliasRefMatches } = await supabase
        .from('organizations')
        .select('id, name, iati_org_id, country_represented, acronym, alias_refs')
        .not('alias_refs', 'is', null)

      if (aliasRefMatches && aliasRefMatches.length > 0) {
        for (const org of aliasRefMatches) {
          if (org.alias_refs && org.alias_refs.includes(ref)) {
            return NextResponse.json({
              matched: true,
              organization: {
                id: org.id,
                name: org.name,
                iati_org_id: org.iati_org_id,
                country_represented: org.country_represented,
                acronym: org.acronym
              },
              method: 'alias_ref',
              matched_by: ref
            })
          }
        }
      }
    }

    // Step 3 & 4: Fuzzy match by name and name_aliases
    if (narrative) {
      const normalizedNarrative = narrative.trim().toLowerCase()
      
      // Use PostgreSQL's similarity function from pg_trgm
      // similarity() returns a value between 0 and 1
      const { data: fuzzyMatches } = await supabase
        .rpc('find_similar_organizations', {
          search_name: normalizedNarrative,
          similarity_threshold: 0.6
        })
        .limit(5)

      if (fuzzyMatches && fuzzyMatches.length > 0) {
        // Return the best match
        const bestMatch = fuzzyMatches[0]
        return NextResponse.json({
          matched: true,
          organization: {
            id: bestMatch.id,
            name: bestMatch.name,
            iati_org_id: bestMatch.iati_org_id,
            country_represented: bestMatch.country_represented,
            acronym: bestMatch.acronym
          },
          method: bestMatch.match_field === 'name_aliases' ? 'fuzzy_alias' : 'fuzzy_name',
          similarity: bestMatch.similarity,
          matched_by: bestMatch.match_field
        })
      }
    }

    // No match found
    return NextResponse.json({
      matched: false
    })

  } catch (error) {
    console.error('[Org Resolve] Error:', error)
    return NextResponse.json(
      {
        matched: false
      },
      { status: 500 }
    )
  }
}

