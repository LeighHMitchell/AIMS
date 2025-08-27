import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }
    
    const { data: faqs, error } = await supabase
      .from('faq')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching FAQs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(faqs)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }
    
    // For now, we'll skip user authentication in the API and rely on frontend permissions
    // TODO: Add proper authentication when user context is available
    
    // Permission check will be handled on frontend for now
    
    const body = await request.json()
    const { question, answer, category, tags } = body
    
    if (!question || !answer || !category) {
      return NextResponse.json({ error: 'Question, answer, and category are required' }, { status: 400 })
    }
    
    const { data: faq, error } = await supabase
      .from('faq')
      .insert({
        question,
        answer,
        category,
        tags: tags || []
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating FAQ:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(faq, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
