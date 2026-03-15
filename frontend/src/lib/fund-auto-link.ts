/**
 * Fund Auto-Link Utility
 *
 * Shared logic for generating fund child suggestions and automatically
 * creating parent-child relationships for high-confidence matches.
 *
 * Used by:
 * - fund-suggestions API route (returns suggestions to the UI)
 * - Transaction save (auto-links high-confidence matches)
 */

export interface FundSuggestion {
  activityId: string
  title: string
  status: string
  reasons: string[]
  confidence: number
  financialAmount: number
}

function getUsdValue(t: any): number {
  return t.value_usd || t.usd_value || t.value || 0
}

/**
 * Generate fund child activity suggestions using 3-method scoring:
 * - Transaction references (provider: 40pts, receiver: 30pts)
 * - Org match (20pts)
 * - Title match (10pts per word)
 */
export async function generateFundSuggestions(
  supabase: any,
  fundId: string
): Promise<FundSuggestion[]> {
  // Get fund details
  const { data: fund, error: fundError } = await supabase
    .from('activities')
    .select('id, title_narrative, reporting_org_id, is_pooled_fund')
    .eq('id', fundId)
    .single()

  if (fundError || !fund) {
    return []
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
  parentRels?.forEach((r: any) => { if (r.related_activity_id) linkedIds.add(r.related_activity_id) })
  reverseRels?.forEach((r: any) => { if (r.activity_id) linkedIds.add(r.activity_id) })

  const suggestions: Record<string, FundSuggestion> = {}

  // Method 1: Transaction references — activities with transactions referencing this fund
  const { data: providerRefs } = await supabase
    .from('transactions')
    .select('activity_id, value, value_usd')
    .eq('provider_activity_uuid', fundId)
    .not('activity_id', 'in', `(${Array.from(linkedIds).join(',')})`)

  const { data: receiverRefs } = await supabase
    .from('transactions')
    .select('activity_id, value, value_usd')
    .eq('receiver_activity_uuid', fundId)
    .not('activity_id', 'in', `(${Array.from(linkedIds).join(',')})`)

  providerRefs?.forEach((t: any) => {
    if (t.activity_id && !linkedIds.has(t.activity_id)) {
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

  receiverRefs?.forEach((t: any) => {
    if (t.activity_id && !linkedIds.has(t.activity_id)) {
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
  if (fund.reporting_org_id) {
    const { data: orgMatches } = await supabase
      .from('activity_participating_organizations')
      .select('activity_id')
      .eq('organization_id', fund.reporting_org_id)
      .eq('role_type', 'funding')

    orgMatches?.forEach((m: any) => {
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
  if (fund.title_narrative && fund.title_narrative.length > 3) {
    const searchTerms = fund.title_narrative
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
      .slice(0, 3)

    if (searchTerms.length > 0) {
      for (const term of searchTerms) {
        const { data: titleMatches } = await supabase
          .from('activities')
          .select('id, title_narrative, activity_status')
          .ilike('title_narrative', `%${term}%`)
          .neq('id', fundId)
          .limit(20)

        titleMatches?.forEach((m: any) => {
          if (!linkedIds.has(m.id)) {
            if (!suggestions[m.id]) {
              suggestions[m.id] = {
                activityId: m.id,
                title: m.title_narrative,
                status: m.activity_status || '',
                reasons: [],
                confidence: 0,
                financialAmount: 0,
              }
            }
            if (!suggestions[m.id].reasons.some((r: string) => r.startsWith('Title contains'))) {
              suggestions[m.id].reasons.push(`Title contains "${term}"`)
              suggestions[m.id].confidence += 10
            }
            if (m.title_narrative) suggestions[m.id].title = m.title_narrative
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
      .select('id, title_narrative, activity_status')
      .in('id', missingTitleIds)

    activityDetails?.forEach((a: any) => {
      if (suggestions[a.id]) {
        suggestions[a.id].title = a.title_narrative
        suggestions[a.id].status = a.activity_status || ''
      }
    })
  }

  // Cap confidence at 100 and sort by confidence
  return Object.values(suggestions)
    .map(s => ({ ...s, confidence: Math.min(s.confidence, 100) }))
    .filter(s => s.title)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20)
}

/**
 * Automatically create parent-child relationships for high-confidence
 * fund suggestions. Only operates on pooled fund activities.
 *
 * @returns List of newly linked activity IDs and count of skipped suggestions
 */
export async function autoLinkFundChildren(
  supabase: any,
  fundId: string,
  options?: { confidenceThreshold?: number }
): Promise<{ linked: string[]; skipped: number }> {
  const threshold = options?.confidenceThreshold ?? 60

  // Verify the activity is a pooled fund
  const { data: activity } = await supabase
    .from('activities')
    .select('is_pooled_fund')
    .eq('id', fundId)
    .single()

  if (!activity?.is_pooled_fund) {
    return { linked: [], skipped: 0 }
  }

  const suggestions = await generateFundSuggestions(supabase, fundId)

  const linked: string[] = []
  let skipped = 0

  for (const suggestion of suggestions) {
    if (suggestion.confidence < threshold) {
      skipped++
      continue
    }

    // Check if relationship already exists (idempotent)
    const { data: existing } = await supabase
      .from('activity_relationships')
      .select('id')
      .eq('activity_id', fundId)
      .eq('related_activity_id', suggestion.activityId)
      .eq('relationship_type', '1')
      .maybeSingle()

    if (existing) {
      continue
    }

    // Insert parent→child relationship
    const { error } = await supabase
      .from('activity_relationships')
      .insert({
        activity_id: fundId,
        related_activity_id: suggestion.activityId,
        relationship_type: '1',
        narrative: `Auto-linked (confidence: ${suggestion.confidence}%)`
      })

    if (!error) {
      linked.push(suggestion.activityId)
    }
  }

  return { linked, skipped }
}
