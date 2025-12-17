import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/faq/[id]
 * Get a single FAQ with attachments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()
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
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Permission check will be handled on frontend for now

    const body = await request.json()
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
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Permission check will be handled on frontend for now

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
