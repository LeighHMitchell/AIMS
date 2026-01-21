import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const searchParams = request.nextUrl.searchParams
    const includeFollowUps = searchParams.get('includeFollowUps') === 'true'

    // Only show published FAQs (or those without status for backwards compatibility)
    const { data: faqs, error } = await supabase
      .from('faq')
      .select('*')
      .or('status.eq.published,status.is.null')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching FAQs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Optionally fetch follow-up questions for each FAQ
    if (includeFollowUps && faqs && faqs.length > 0) {
      const faqIds = faqs.map(f => f.id)

      // Fetch all follow-up questions related to these FAQs
      const { data: followUps } = await supabase
        .from('faq_questions')
        .select('id, question, status, created_at, related_faq_id, user_id')
        .in('related_faq_id', faqIds)
        .order('created_at', { ascending: true })

      // Fetch user info for follow-ups
      const userIds = [...new Set((followUps || []).map(f => f.user_id).filter(Boolean))]
      let usersMap: Record<string, any> = {}

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', userIds)

        usersMap = (users || []).reduce((acc: Record<string, any>, u: any) => {
          acc[u.id] = u
          return acc
        }, {})
      }

      // Group follow-ups by FAQ ID
      const followUpsByFaq: Record<string, any[]> = {}
      ;(followUps || []).forEach(f => {
        if (!followUpsByFaq[f.related_faq_id]) {
          followUpsByFaq[f.related_faq_id] = []
        }
        followUpsByFaq[f.related_faq_id].push({
          id: f.id,
          question: f.question,
          status: f.status,
          created_at: f.created_at,
          user: usersMap[f.user_id] || null
        })
      })

      // Attach follow-ups to FAQs
      const faqsWithFollowUps = faqs.map(faq => ({
        ...faq,
        followUps: followUpsByFaq[faq.id] || []
      }))

      return NextResponse.json(faqsWithFollowUps)
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
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

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
        tags: tags || [],
        status: 'published'  // Direct creation is immediately published
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
