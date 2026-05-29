import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSuperUser } from '@/lib/auth';

export const dynamic = 'force-dynamic'

/**
 * GET /api/faq/[id]
 * Get a single FAQ with attachments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: faq, error } = await supabase
      .from('faq')
      .select(`
        *,
        faq_attachments (
          id,
          file_url,
          filename,
          file_type,
          file_size,
          display_order,
          caption,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
      }
      console.error('Error fetching FAQ:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Increment view count
    await supabase
      .from('faq')
      .update({ view_count: (faq.view_count || 0) + 1 })
      .eq('id', id)

    return NextResponse.json(faq)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // FAQ is global admin content — editing requires a super_user.
  const { supabase, response: authResponse } = await requireSuperUser();
  if (authResponse) return authResponse;

  try {
    const { id } = await params
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Authorisation enforced by requireSuperUser() above.

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    const { question, answer, category, tags } = body

    if (!question || !answer || !category) {
      return NextResponse.json({ error: 'Question, answer, and category are required' }, { status: 400 })
    }

    const { data: faq, error } = await supabase
      .from('faq')
      .update({
        question,
        answer,
        category,
        tags: tags || []
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating FAQ:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(faq)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // FAQ is global admin content — deleting requires a super_user.
  const { supabase, response: authResponse } = await requireSuperUser();
  if (authResponse) return authResponse;

  try {
    const { id } = await params
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Authorisation enforced by requireSuperUser() above.

    const { error } = await supabase
      .from('faq')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting FAQ:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ message: 'FAQ deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
