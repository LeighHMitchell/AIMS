import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth()
    if (authResponse) return authResponse
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 })
    }

    const resolvedParams = await Promise.resolve(params)
    const fundId = resolvedParams.id

    // Get fund details
    const { data: fund, error: fundError } = await supabase
      .from('activities')
      .select('id, title_narrative, created_by_org, is_pooled_fund')
      .eq('id', fundId)
      .single()

    if (fundError || !fund) {
      return NextResponse.json({ error: 'Fund not found' }, { status: 404 })
    }

    // Get already-linked child IDs
    const { data: parentRels } = await supabase
      .from('activity_relationships')
      .select('related_activity_id')
      .eq('activity_id', fundId)
      .eq('relationship_type', '1')
      .not('related_activity_id', 'is', null)

    const { data: reverseRels } = await supabase
      .from('activity_relationships')
      .select('activity_id')
      .eq('related_activity_id', fundId)
      .eq('relationship_type', '2')

    const linkedIds = new Set<string>()
    linkedIds.add(fundId)
    parentRels?.forEach(r => { if (r.related_activity_id) linkedIds.add(r.related_activity_id) })
    reverseRels?.forEach(r => { if (r.activity_id) linkedIds.add(r.activity_id) })

    const suggestions: Record<string, {
      activityId: string
      title: string
      status: string
      reasons: string[]
      confidence: number
      financialAmount: number
    }> = {}

    // Method 1: Transaction references — activities with transactions referencing this fund
    const { data: providerRefs } = await supabase
      .from('transactions')
      .select('activity_id, value, value_usd, usd_value')
      .eq('provider_activity_uuid', fundId)
      .not('activity_id', 'in', `(${Array.from(linkedIds).join(',')})`)

    const { data: receiverRefs } = await supabase
      .from('transactions')
      .select('activity_id, value, value_usd, usd_value')
      .eq('receiver_activity_uuid', fundId)
      .not('activity_id', 'in', `(${Array.from(linkedIds).join(',')})`)

    const txnActivityIds = new Set<string>()
    providerRefs?.forEach(t => {
      if (t.activity_id && !linkedIds.has(t.activity_id)) {
        txnActivityIds.add(t.activity_id)
        if (!suggestions[t.activity_id]) {
          suggestions[t.activity_id] = {
            activityId: t.activity_id,
            title: '',
            status: '',
            reasons: [],
            confidence: 0,
            financialAmount: 0,
          }
        }
        suggestions[t.activity_id].reasons.push('Has transactions referencing this fund as provider')
        suggestions[t.activity_id].confidence += 40
        suggestions[t.activity_id].financialAmount += getUsdValue(t)
      }
    })

    receiverRefs?.forEach(t => {
      if (t.activity_id && !linkedIds.has(t.activity_id)) {
        txnActivityIds.add(t.activity_id)
        if (!suggestions[t.activity_id]) {
          suggestions[t.activity_id] = {
            activityId: t.activity_id,
            title: '',
            status: '',
            reasons: [],
            confidence: 0,
            financialAmount: 0,
          }
        }
        if (!suggestions[t.activity_id].reasons.includes('Has transactions referencing this fund as provider')) {
          suggestions[t.activity_id].reasons.push('Has transactions referencing this fund as receiver')
        }
        suggestions[t.activity_id].confidence += 30
        suggestions[t.activity_id].financialAmount += getUsdValue(t)
      }
    })

    // Method 2: Funding org match — activities where fund's org is a funding participating org
    if (fund.created_by_org) {
      const { data: orgMatches } = await supabase
        .from('activity_participating_organizations')
        .select('activity_id')
        .eq('organization_id', fund.created_by_org)
        .eq('role_type', 'funding')

      orgMatches?.forEach(m => {
        if (m.activity_id && !linkedIds.has(m.activity_id)) {
          if (!suggestions[m.activity_id]) {
            suggestions[m.activity_id] = {
              activityId: m.activity_id,
              title: '',
              status: '',
              reasons: [],
              confidence: 0,
              financialAmount: 0,
            }
          }
          suggestions[m.activity_id].reasons.push('Fund\'s organisation is listed as a funding partner')
          suggestions[m.activity_id].confidence += 20
        }
      })
    }

    // Method 3: Fuzzy title match
    if (fund.title && fund.title.length > 3) {
      const searchTerms = fund.title
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 3)

      if (searchTerms.length > 0) {
        for (const term of searchTerms) {
          const { data: titleMatches } = await supabase
            .from('activities')
            .select('id, title, activity_status')
            .ilike('title', `%${term}%`)
            .neq('id', fundId)
            .limit(20)

          titleMatches?.forEach(m => {
            if (!linkedIds.has(m.id)) {
              if (!suggestions[m.id]) {
                suggestions[m.id] = {
                  activityId: m.id,
                  title: m.title,
                  status: m.activity_status || '',
                  reasons: [],
                  confidence: 0,
                  financialAmount: 0,
                }
              }
              if (!suggestions[m.id].reasons.some(r => r.startsWith('Title contains'))) {
                suggestions[m.id].reasons.push(`Title contains "${term}"`)
                suggestions[m.id].confidence += 10
              }
              if (m.title) suggestions[m.id].title = m.title
              if (m.activity_status) suggestions[m.id].status = m.activity_status
            }
          })
        }
      }
    }

    // Fetch titles for activities found via transaction/org methods
    const missingTitleIds = Object.values(suggestions)
      .filter(s => !s.title)
      .map(s => s.activityId)

    if (missingTitleIds.length > 0) {
      const { data: activityDetails } = await supabase
        .from('activities')
        .select('id, title, activity_status')
        .in('id', missingTitleIds)

      activityDetails?.forEach(a => {
        if (suggestions[a.id]) {
          suggestions[a.id].title = a.title
          suggestions[a.id].status = a.activity_status || ''
        }
      })
    }

    // Cap confidence at 100 and sort by confidence
    const result = Object.values(suggestions)
      .map(s => ({ ...s, confidence: Math.min(s.confidence, 100) }))
      .filter(s => s.title)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20)

    return NextResponse.json({ suggestions: result })
  } catch (error: any) {
    console.error('[Fund Suggestions] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

function getUsdValue(t: any): number {
  return t.value_usd || t.usd_value || t.value || 0
}
