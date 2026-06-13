import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSuperUser } from '@/lib/auth';

export const dynamic = 'force-dynamic'

/**
 * GET /api/glossary
 * List all glossary terms, alphabetically.
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: terms, error } = await supabase
      .from('glossary_terms')
      .select('id, term, category, simple_definition, detailed_definition, created_at, updated_at')
      .order('term', { ascending: true })

    if (error) {
      console.error('Error fetching glossary terms:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(terms)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/glossary
 * Create a glossary term. Glossary is global admin content — super_user only.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireSuperUser();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    const { term, category, simple_definition, detailed_definition } = body

    if (!term?.trim() || !category?.trim() || !simple_definition?.trim() || !detailed_definition?.trim()) {
      return NextResponse.json(
        { error: 'Term, category, simple definition, and detailed definition are required' },
        { status: 400 }
      )
    }

    const { data: created, error } = await supabase
      .from('glossary_terms')
      .insert({
        term: term.trim(),
        category: category.trim(),
        simple_definition: simple_definition.trim(),
        detailed_definition: detailed_definition.trim(),
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A term with this name already exists' }, { status: 409 })
      }
      console.error('Error creating glossary term:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
