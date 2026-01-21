import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

/**
 * Aid Ecosystem Analytics API
 *
 * This endpoint aggregates organization-level financial data for two ecosystem visualizations:
 *
 * 1. Organizational Positioning Map (Figure 2 equivalent)
 *    - X-axis: Humanitarian ←→ Development orientation
 *    - Y-axis: Funder ←→ Implementer role
 *
 * 2. Aid Ecosystem Solar System (Figure 3 equivalent)
 *    - Organizations ranked by transaction volume
 *    - Positioned in concentric rings by financial gravity
 *
 * Key design decisions:
 * - Uses disbursements only by default (reflects realized behavior)
 * - Humanitarian flag: transaction-level with activity fallback
 * - Provider/receiver: from transaction-level fields
 * - Minimum threshold applied to reduce noise
 *
 * Axes are explicitly defined (no ML embeddings):
 * - Humanitarian score: (humanitarian_value - development_value) / total_value * 100
 * - Funder score: (outgoing_value - incoming_value) / max_flow * 100
 */

interface EcosystemOrganization {
  id: string
  name: string
  acronym: string | null
  organisationType: string | null
  // Financial metrics
  totalValue: number
  humanitarianValue: number
  developmentValue: number
  outgoingValue: number  // As provider
  incomingValue: number  // As receiver
  // Calculated positions
  humanitarianScore: number  // -100 (humanitarian) to +100 (development)
  funderScore: number        // Positive = net funder, Negative = net implementer
  rank: number
  ringTier: 'inner' | 'middle' | 'outer'
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const supabaseAdmin = supabase
    const { searchParams } = new URL(request.url)

    // Parse filter parameters
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const flowType = searchParams.get('flowType') || 'all' // 'ODA', 'OOF', 'all'
    const includeHumanitarian = searchParams.get('includeHumanitarian') !== 'false'
    const transactionType = searchParams.get('transactionType') || '3' // Default: disbursements only
    const minValueUSD = parseInt(searchParams.get('minValueUSD') || '100000') // Default: $100K threshold (lower for smaller datasets)
    const sectorCodes = searchParams.get('sectors')?.split(',').filter(Boolean) || [] // Comma-separated sector codes

    // If sector filter specified, get activity IDs that have transactions in those sectors
    let sectorActivityIds: string[] | null = null
    if (sectorCodes.length > 0) {
      const { data: sectorActivities, error: sectorError } = await supabaseAdmin
        .from('activity_sectors')
        .select('activity_id')
        .in('sector_code', sectorCodes)

      if (sectorError) {
        console.error('[EcosystemAPI] Sector filter query error:', sectorError)
      } else {
        // Deduplicate activity IDs
        sectorActivityIds = [...new Set(sectorActivities?.map(s => s.activity_id) || [])]
        console.log('[EcosystemAPI] Sector filter: found', sectorActivityIds.length, 'activities for sectors:', sectorCodes)
      }
    }

    // Build the query for transactions with organization details
    // We need to aggregate by both provider and receiver roles
    // Note: transactions table uses uuid, not id, and has value_usd for USD amounts
    // Also fetch reporting_org_id as fallback provider when provider_org_id is not set
    let query = supabaseAdmin
      .from('transactions')
      .select(`
        value,
        value_usd,
        transaction_type,
        transaction_date,
        flow_type,
        is_humanitarian,
        provider_org_id,
        provider_org_name,
        receiver_org_id,
        receiver_org_name,
        activity_id,
        activities!transactions_activity_id_fkey1 (
          humanitarian,
          reporting_org_id
        )
      `)
      .eq('status', 'actual')

    // Apply transaction type filter (default: disbursements)
    if (transactionType !== 'all') {
      query = query.eq('transaction_type', transactionType)
    }

    // Apply date range filter
    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('transaction_date', dateTo)
    }

    // Apply flow type filter
    if (flowType === 'ODA') {
      query = query.eq('flow_type', '10')
    } else if (flowType === 'OOF') {
      query = query.eq('flow_type', '20')
    }

    // Apply sector filter (limit to activities in selected sectors)
    if (sectorActivityIds !== null) {
      if (sectorActivityIds.length > 0) {
        query = query.in('activity_id', sectorActivityIds)
      } else {
        // No activities match the selected sectors - return empty results
        // Use an impossible UUID to ensure no results are returned
        query = query.eq('activity_id', '00000000-0000-0000-0000-000000000000')
      }
    }

    const { data: transactions, error: txError } = await query

    if (txError) {
      console.error('[EcosystemAPI] Transaction query error:', txError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch transactions'
      }, { status: 500 })
    }

    console.log('[EcosystemAPI] Transactions fetched:', transactions?.length || 0)

    // Log data availability for debugging
    const withProviderId = transactions?.filter(tx => tx.provider_org_id).length || 0
    const withReceiverId = transactions?.filter(tx => tx.receiver_org_id).length || 0
    const withProviderName = transactions?.filter(tx => tx.provider_org_name).length || 0
    const withReceiverName = transactions?.filter(tx => tx.receiver_org_name).length || 0
    console.log('[EcosystemAPI] Transactions with provider_org_id:', withProviderId)
    console.log('[EcosystemAPI] Transactions with receiver_org_id:', withReceiverId)
    console.log('[EcosystemAPI] Transactions with provider_org_name:', withProviderName)
    console.log('[EcosystemAPI] Transactions with receiver_org_name:', withReceiverName)

    // Debug humanitarian flags
    const withTxHumanitarian = transactions?.filter(tx => tx.is_humanitarian === true).length || 0
    const withActivityHumanitarian = transactions?.filter(tx => (tx.activities as any)?.humanitarian === true).length || 0
    const withActivityJoin = transactions?.filter(tx => tx.activities !== null).length || 0
    console.log('[EcosystemAPI] Transactions with is_humanitarian=true:', withTxHumanitarian)
    console.log('[EcosystemAPI] Transactions with activity.humanitarian=true:', withActivityHumanitarian)
    console.log('[EcosystemAPI] Transactions with activities join data:', withActivityJoin)

    // Log a sample transaction to see the structure
    if (transactions?.length) {
      console.log('[EcosystemAPI] Sample transaction:', JSON.stringify(transactions[0], null, 2))
    }

    // Fetch all organizations for metadata
    // Note: Database column is 'type', not 'organisation_type'
    const { data: organizations, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, acronym, type')

    if (orgError) {
      console.error('[EcosystemAPI] Organization query error:', orgError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch organizations'
      }, { status: 500 })
    }

    // Fetch activity contributors for fallback data
    // This helps determine funder vs implementer roles when transaction org IDs aren't set
    const { data: contributors, error: contribError } = await supabaseAdmin
      .from('activity_contributors')
      .select('activity_id, organization_id, contribution_type')
      .in('contribution_type', ['funding', 'implementing', 'funder', 'implementer'])

    if (contribError) {
      console.log('[EcosystemAPI] Activity contributors query warning (optional data):', contribError)
    }

    // Build lookup map of activity_id -> { funders: [], implementers: [] }
    const activityOrgRoles = new Map<string, { funders: string[], implementers: string[] }>()
    for (const contrib of contributors || []) {
      if (!activityOrgRoles.has(contrib.activity_id)) {
        activityOrgRoles.set(contrib.activity_id, { funders: [], implementers: [] })
      }
      const roles = activityOrgRoles.get(contrib.activity_id)!
      const isFunder = contrib.contribution_type === 'funding' || contrib.contribution_type === 'funder'
      if (isFunder) {
        roles.funders.push(contrib.organization_id)
      } else {
        roles.implementers.push(contrib.organization_id)
      }
    }
    console.log('[EcosystemAPI] Activities with contributor roles:', activityOrgRoles.size)

    // Create organization lookup map with explicit typing
    interface OrgInfo {
      name: string
      acronym: string | null
      organisationType: string | null
    }
    const orgMap = new Map<string, OrgInfo>(
      organizations?.map(org => [
        org.id,
        {
          name: org.name,
          acronym: org.acronym,
          organisationType: org.type
        }
      ]) || []
    )

    // Also create a name-to-id lookup for fallback matching
    const orgNameToId = new Map<string, string>()
    organizations?.forEach(org => {
      if (org.name) orgNameToId.set(org.name.toLowerCase(), org.id)
      if (org.acronym) orgNameToId.set(org.acronym.toLowerCase(), org.id)
    })

    // Aggregate data by organization
    const orgAggregates = new Map<string, {
      id: string
      name: string
      acronym: string | null
      organisationType: string | null
      humanitarianValue: number
      developmentValue: number
      outgoingValue: number
      incomingValue: number
    }>()

    // Helper function to add or update organization aggregate
    const addOrgAggregate = (
      orgId: string,
      name: string,
      value: number,
      isHumanitarian: boolean,
      isOutgoing: boolean
    ) => {
      if (!orgAggregates.has(orgId)) {
        const orgInfo = orgMap.get(orgId)
        orgAggregates.set(orgId, {
          id: orgId,
          name: orgInfo?.name || name || 'Unknown',
          acronym: orgInfo?.acronym || null,
          organisationType: orgInfo?.organisationType || null,
          humanitarianValue: 0,
          developmentValue: 0,
          outgoingValue: 0,
          incomingValue: 0
        })
      }
      const org = orgAggregates.get(orgId)!
      if (isOutgoing) {
        org.outgoingValue += value
      } else {
        org.incomingValue += value
      }
      if (isHumanitarian) {
        org.humanitarianValue += value
      } else {
        org.developmentValue += value
      }
    }

    // Process each transaction
    let processedWithProvider = 0
    let processedWithReceiver = 0
    let usedReportingOrgFallback = 0
    let usedContributorFallback = 0

    for (const tx of transactions || []) {
      // Use value_usd if available, otherwise fall back to value
      const value = parseFloat(tx.value_usd?.toString() || tx.value?.toString() || '0') || 0
      if (value <= 0) continue

      // Determine humanitarian status using precedence:
      // 1. If transaction.is_humanitarian is explicitly true, use it
      // 2. Otherwise, check activity.humanitarian
      // 3. Default to false
      // Note: We check for === true because is_humanitarian might be false explicitly,
      // but we still want to fall back to the activity's humanitarian flag
      const isHumanitarian = tx.is_humanitarian === true
        ? true
        : ((tx.activities as any)?.humanitarian === true ? true : false)

      // Skip humanitarian transactions if filter excludes them
      if (!includeHumanitarian && isHumanitarian) continue

      // Get activity info for fallbacks
      const activityId = tx.activity_id
      const reportingOrgId = (tx.activities as any)?.reporting_org_id
      const activityRoles = activityId ? activityOrgRoles.get(activityId) : null

      // Determine provider organization ID with fallback chain:
      // 1. Transaction provider_org_id
      // 2. Match provider_org_name to organization
      // 3. Activity reporting_org_id
      // 4. Activity funder from contributors
      let providerId = tx.provider_org_id
      let providerName = tx.provider_org_name

      if (!providerId && providerName) {
        providerId = orgNameToId.get(providerName.toLowerCase())
      }
      if (!providerId && reportingOrgId) {
        providerId = reportingOrgId
        usedReportingOrgFallback++
      }
      if (!providerId && activityRoles?.funders.length) {
        providerId = activityRoles.funders[0] // Use primary funder
        usedContributorFallback++
      }

      // Process provider organization (outgoing flow)
      if (providerId) {
        addOrgAggregate(providerId, providerName || '', value, isHumanitarian, true)
        processedWithProvider++
      }

      // Determine receiver organization ID with fallback chain:
      // 1. Transaction receiver_org_id
      // 2. Match receiver_org_name to organization
      // 3. Activity implementer from contributors
      let receiverId = tx.receiver_org_id
      let receiverName = tx.receiver_org_name

      if (!receiverId && receiverName) {
        receiverId = orgNameToId.get(receiverName.toLowerCase())
      }
      if (!receiverId && activityRoles?.implementers.length) {
        receiverId = activityRoles.implementers[0] // Use primary implementer
        usedContributorFallback++
      }

      // Process receiver organization (incoming flow)
      if (receiverId) {
        addOrgAggregate(receiverId, receiverName || '', value, isHumanitarian, false)
        processedWithReceiver++
      }
    }

    console.log('[EcosystemAPI] Transactions processed with provider:', processedWithProvider)
    console.log('[EcosystemAPI] Transactions processed with receiver:', processedWithReceiver)
    console.log('[EcosystemAPI] Used reporting_org fallback:', usedReportingOrgFallback)
    console.log('[EcosystemAPI] Used contributor fallback:', usedContributorFallback)

    // Convert to array and calculate derived metrics
    const orgList = Array.from(orgAggregates.values())

    // Calculate total value for each org and apply minimum threshold
    const orgsWithTotals = orgList.map(org => {
      const totalValue = org.humanitarianValue + org.developmentValue
      return { ...org, totalValue }
    }).filter(org => org.totalValue >= minValueUSD)

    // Calculate max flow for normalization
    const maxFlow = Math.max(
      ...orgsWithTotals.map(org => Math.abs(org.outgoingValue - org.incomingValue)),
      1 // Prevent division by zero
    )

    // Calculate scores and rankings
    const ecosystemOrgs: EcosystemOrganization[] = orgsWithTotals.map(org => {
      // Humanitarian score: -100 (fully humanitarian) to +100 (fully development)
      // Formula: (development - humanitarian) / total * 100
      const humanitarianScore = org.totalValue > 0
        ? ((org.developmentValue - org.humanitarianValue) / org.totalValue) * 100
        : 0

      // Funder score: Positive = net funder, Negative = net implementer
      // Normalized to roughly -100 to +100 range
      const netFlow = org.outgoingValue - org.incomingValue
      const funderScore = (netFlow / maxFlow) * 100

      return {
        id: org.id,
        name: org.name,
        acronym: org.acronym,
        organisationType: org.organisationType,
        totalValue: org.totalValue,
        humanitarianValue: org.humanitarianValue,
        developmentValue: org.developmentValue,
        outgoingValue: org.outgoingValue,
        incomingValue: org.incomingValue,
        humanitarianScore,
        funderScore,
        rank: 0, // Will be set after sorting
        ringTier: 'outer' as const // Will be set after ranking
      }
    })

    // Sort by total value and assign ranks + ring tiers
    ecosystemOrgs.sort((a, b) => b.totalValue - a.totalValue)

    const totalOrgs = ecosystemOrgs.length
    const innerThreshold = Math.ceil(totalOrgs * 0.10) // Top 10%
    const middleThreshold = Math.ceil(totalOrgs * 0.40) // Top 40% (10% + 30%)

    ecosystemOrgs.forEach((org, index) => {
      org.rank = index + 1
      if (index < innerThreshold) {
        org.ringTier = 'inner'
      } else if (index < middleThreshold) {
        org.ringTier = 'middle'
      } else {
        org.ringTier = 'outer'
      }
    })

    console.log('[EcosystemAPI] Organizations before threshold filter:', orgList.length)
    console.log('[EcosystemAPI] Organizations after threshold filter:', orgsWithTotals.length)
    console.log('[EcosystemAPI] Final ecosystem orgs:', ecosystemOrgs.length)

    // Calculate summary statistics
    const summary = {
      totalOrganizations: ecosystemOrgs.length,
      totalTransactionValue: ecosystemOrgs.reduce((sum, org) => sum + org.totalValue, 0),
      humanitarianShare: ecosystemOrgs.length > 0
        ? (ecosystemOrgs.reduce((sum, org) => sum + org.humanitarianValue, 0) /
           ecosystemOrgs.reduce((sum, org) => sum + org.totalValue, 0)) * 100
        : 0,
      ringDistribution: {
        inner: ecosystemOrgs.filter(org => org.ringTier === 'inner').length,
        middle: ecosystemOrgs.filter(org => org.ringTier === 'middle').length,
        outer: ecosystemOrgs.filter(org => org.ringTier === 'outer').length
      },
      orgTypeDistribution: ecosystemOrgs.reduce((acc, org) => {
        const type = org.organisationType || '90'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      success: true,
      data: ecosystemOrgs,
      summary,
      filters: {
        dateFrom,
        dateTo,
        flowType,
        includeHumanitarian,
        transactionType,
        minValueUSD,
        sectors: sectorCodes
      }
    })

  } catch (error) {
    console.error('[EcosystemAPI] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
