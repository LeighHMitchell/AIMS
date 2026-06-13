import { NextRequest, NextResponse } from 'next/server'
import { requireSuperUser } from '@/lib/auth';

export const dynamic = 'force-dynamic'

/**
 * PUT /api/glossary/[id]
 * Update a glossary term. Glossary is global admin content — super_user only.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireSuperUser();
  if (authResponse) return authResponse;

  try {
    const { id } = await params
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

    const { data: updated, error } = await supabase
      .from('glossary_terms')
      .update({
        term: term.trim(),
        category: category.trim(),
        simple_definition: simple_definition.trim(),
        detailed_definition: detailed_definition.trim(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Glossary term not found' }, { status: 404 })
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A term with this name already exists' }, { status: 409 })
      }
      console.error('Error updating glossary term:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/glossary/[id]
 * Delete a glossary term. Glossary is global admin content — super_user only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireSuperUser();
  if (authResponse) return authResponse;

  try {
    const { id } = await params
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { error } = await supabase
      .from('glossary_terms')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting glossary term:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Glossary term deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
