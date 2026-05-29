import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import sectorGroupData from '@/data/SectorGroup.json'
import { parseISO, differenceInDays, max as dateMax, min as dateMin } from 'date-fns'
import { getOrganizationTypeCode } from '@/data/iati-organization-types'

/**
 * Per-activity financial aggregation for the "Activities with Humanitarian
 * Components" chart. Mirrors the structure of `/api/analytics/all-donors`
 * (overlap-allocated budgets/PDs, per-IATI-transaction-type sums, sector
 * pro-rating, recipient-country exclusion) but groups by ACTIVITY instead of
 * donor, restricts the result set to activities that have a humanitarian
 * component, and additionally returns a humanitarian-vs-development split of
 * actual spend (disbursements + expenditures) for the chart's "split" mode.
 */

// Pro-rata the portion of a period-spanning record that falls inside the window.
function overlapAllocate(
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined,
  value: number,
  windowStart: Date,
  windowEnd: Date
): number {
  if (!periodStart || !value) return 0
  const startRaw = parseISO(periodStart)
  const endRaw = periodEnd ? parseISO(periodEnd) : startRaw
  if (isNaN(startRaw.getTime()) || isNaN(endRaw.getTime())) return 0
  const start = startRaw < endRaw ? startRaw : endRaw
  const end = startRaw < endRaw ? endRaw : startRaw
  const totalDays = differenceInDays(end, start) + 1
  if (totalDays <= 0) return 0
  const overlapStart = dateMax([start, windowStart])
  const overlapEnd = dateMin([end, windowEnd])
  if (overlapStart > overlapEnd) return 0
  const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1
  return value * (overlapDays / totalDays)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Sector hierarchy lookup (same source as all-donors / disbursements-by-sector)
interface SectorHierarchy {
  groupCode: string
  groupName: string
  categoryCode: string
  categoryName: string
}
const sectorHierarchyMap = new Map<string, SectorHierarchy>()
;(sectorGroupData.data as any[]).forEach((sector) => {
  sectorHierarchyMap.set(sector.code, {
    groupCode: sector['codeforiati:group-code'] || '998',
    groupName: sector['codeforiati:group-name'] || 'Other / Uncategorized',
    categoryCode: sector['codeforiati:category-code'] || '998',
    categoryName: sector['codeforiati:category-name'] || 'Unallocated / Unspecified',
  })
})
function getSectorHierarchy(sectorCode: string): SectorHierarchy {
  return sectorHierarchyMap.get(sectorCode) || {
    groupCode: '998', groupName: 'Other / Uncategorized',
    categoryCode: '998', categoryName: 'Unallocated / Unspecified',
  }
}

// A transaction/activity is humanitarian when the IATI humanitarian flag is set
// or the aid type is an emergency code. Mirrors HumanitarianChart's logic so the
// classification is consistent across the dashboard.
const HUMANITARIAN_AID_TYPES = new Set(['01', '02', '03'])
const TX_TYPE_CODES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
// "Actual spend" for the humanitarian/development split = disbursements + expenditures.
const ACTUAL_SPEND_TYPES = new Set(['3', '4'])

const makeEmptyByTxType = (): Record<string, number> => {
  const m: Record<string, number> = {}
  for (const c of TX_TYPE_CODES) m[c] = 0
  return m
}

// Simple in-memory cache (60s TTL), matching the all-donors route.
interface CacheEntry { data: any; expiresAt: number }
const analyticsCache = new Map<string, CacheEntry>()
const CACHE_TTL = 60 * 1000
function getCached(key: string): any | null {
  const entry = analyticsCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { analyticsCache.delete(key); return null }
  return entry.data
}
function setCache(key: string, data: any): void {
  analyticsCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL })
}

interface ActivityAgg {
  byTxType: Record<string, number>
  humanitarianActual: number
  developmentActual: number
  totalBudget: number
  totalPlannedDisbursement: number
  hasHumanitarianTx: boolean
}

export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)

    const dateFrom = searchParams.get('dateFrom') || '1900-01-01'
    const dateTo = searchParams.get('dateTo') || '2099-12-31'
    const orgType = searchParams.get('orgType') || 'all'
    const aidType = searchParams.get('aidType') || 'all'
    const financeType = searchParams.get('financeType') || 'all'
    const partnerIds = searchParams.get('partnerIds') || ''
    const sectorGroups = searchParams.get('sectorGroups') || ''
    const sectorCategories = searchParams.get('sectorCategories') || ''
    const sectorSubSectors = searchParams.get('sectorSubSectors') || ''
    const customYearId = searchParams.get('customYearId') || ''

    const windowStart = parseISO(dateFrom)
    const windowEnd = parseISO(dateTo)
    if (isNaN(windowStart.getTime()) || isNaN(windowEnd.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid dateFrom/dateTo' }, { status: 400 })
    }

    const cacheKey = `hum-activities:v1:${dateFrom}:${dateTo}:${orgType}:${aidType}:${financeType}:${partnerIds}:${sectorGroups}:${sectorCategories}:${sectorSubSectors}:${customYearId}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    })

    // All activities (humanitarian data frequently lives in draft activities,
    // so — like the sibling HumanitarianChart / HumanitarianShareChart — this
    // chart does NOT restrict to published). Note: `activities` has no
    // `is_humanitarian` column; activity-level humanitarian status is derived
    // from `default_aid_type` and transaction flags below.
    const { data: activitiesAll, error: actErr } = await supabase
      .from('activities')
      .select('id, title_narrative, acronym, iati_identifier, reporting_org_id, default_aid_type, default_finance_type')
    if (actErr) console.error('[HumActivities API] Error fetching activities:', actErr)
    const activityMap = new Map((activitiesAll || []).map((a: any) => [a.id, a]))
    if (activityMap.size === 0) {
      return NextResponse.json({ success: true, data: [], count: 0, partners: [], availableYears: [] }, {
        headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
      })
    }

    // Organizations (for reporting-org name/type + recipient-country exclusion).
    const { data: orgsData } = await supabase
      .from('organizations')
      .select('id, name, acronym, type, country')
    const normalizeOrgType = (raw: string | null | undefined): string | null => {
      if (!raw) return null
      const code = getOrganizationTypeCode(String(raw).trim())
      return code ?? String(raw).trim() ?? null
    }
    const orgMap = new Map(
      (orgsData || []).map((o: any) => [o.id, { name: o.name, acronym: o.acronym, type: normalizeOrgType(o.type) }])
    )

    // Sector filter → matching activity IDs + per-activity matched percentage.
    let sectorFilteredActivityIds: Set<string> | null = null
    const sectorPercentages = new Map<string, number>()
    const groupSet = new Set(sectorGroups.split(',').map((s) => s.trim()).filter(Boolean))
    const categorySet = new Set(sectorCategories.split(',').map((s) => s.trim()).filter(Boolean))
    const subSectorSet = new Set(sectorSubSectors.split(',').map((s) => s.trim()).filter(Boolean))
    const anySectorFilter = groupSet.size > 0 || categorySet.size > 0 || subSectorSet.size > 0
    if (anySectorFilter) {
      const { data: activitySectors } = await supabase
        .from('activity_sectors')
        .select('activity_id, sector_code, percentage')
      sectorFilteredActivityIds = new Set<string>()
      const sectorsByActivity = new Map<string, Array<{ code: string; percentage: number }>>()
      ;(activitySectors || []).forEach((as: any) => {
        if (!as.sector_code || !as.activity_id) return
        if (!sectorsByActivity.has(as.activity_id)) sectorsByActivity.set(as.activity_id, [])
        sectorsByActivity.get(as.activity_id)!.push({ code: as.sector_code, percentage: parseFloat(as.percentage) || 100 })
      })
      sectorsByActivity.forEach((sectors, activityId) => {
        let matchingPercentage = 0
        sectors.forEach((sector) => {
          const h = getSectorHierarchy(sector.code)
          if (subSectorSet.has(sector.code) || categorySet.has(h.categoryCode) || groupSet.has(h.groupCode)) {
            matchingPercentage += sector.percentage
          }
        })
        if (matchingPercentage > 0) {
          sectorFilteredActivityIds!.add(activityId)
          sectorPercentages.set(activityId, Math.min(matchingPercentage, 100) / 100)
        }
      })
    }

    const agg = new Map<string, ActivityAgg>()
    const ensure = (id: string): ActivityAgg => {
      if (!agg.has(id)) {
        agg.set(id, {
          byTxType: makeEmptyByTxType(),
          humanitarianActual: 0,
          developmentActual: 0,
          totalBudget: 0,
          totalPlannedDisbursement: 0,
          hasHumanitarianTx: false,
        })
      }
      return agg.get(id)!
    }
    const availableYears = new Set<number>()
    const sectorPct = (activityId: string): number =>
      sectorFilteredActivityIds ? (sectorPercentages.get(activityId) ?? 0) : 1

    // USD value with the same fallback the sibling humanitarian charts use:
    // prefer the converted value_usd, else fall back to the raw value when it is
    // already in USD (many rows have value_usd unset but a USD value).
    const usdValue = (valueUsd: any, value: any, currency: any): number => {
      let v = parseFloat(valueUsd) || 0
      if (!v && String(currency) === 'USD') v = parseFloat(value) || 0
      return v
    }

    // 1. Transactions (status=actual, all IATI types) inside the window.
    const { data: txs } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value, value_usd, currency, is_humanitarian, aid_type, transaction_date')
      .in('transaction_type', TX_TYPE_CODES)
      .eq('status', 'actual')
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo)
    ;(txs || []).forEach((tx: any) => {
      if (!tx.activity_id || !activityMap.has(tx.activity_id)) return
      if (sectorFilteredActivityIds && !sectorFilteredActivityIds.has(tx.activity_id)) return
      const code = String(tx.transaction_type || '').trim()
      if (!TX_TYPE_CODES.includes(code)) return
      let v = usdValue(tx.value_usd, tx.value, tx.currency)
      if (isNaN(v) || v === 0) return
      const pct = sectorPct(tx.activity_id)
      if (pct === 0) return
      v *= pct
      const a = ensure(tx.activity_id)
      a.byTxType[code] += v
      const isHum = !!tx.is_humanitarian || HUMANITARIAN_AID_TYPES.has(String(tx.aid_type || '').trim())
      if (isHum) a.hasHumanitarianTx = true
      if (ACTUAL_SPEND_TYPES.has(code)) {
        if (isHum) a.humanitarianActual += v
        else a.developmentActual += v
      }
      if (tx.transaction_date) {
        const y = new Date(tx.transaction_date).getFullYear()
        if (!isNaN(y)) availableYears.add(y)
      }
    })

    // 2. Budgets (overlap-allocated to the window).
    const { data: budgets } = await supabase
      .from('activity_budgets')
      .select('activity_id, value, usd_value, currency, period_start, period_end')
      .lte('period_start', dateTo)
      .gte('period_end', dateFrom)
    ;(budgets || []).forEach((b: any) => {
      if (!b.activity_id || !activityMap.has(b.activity_id)) return
      if (sectorFilteredActivityIds && !sectorFilteredActivityIds.has(b.activity_id)) return
      const raw = usdValue(b.usd_value, b.value, b.currency)
      if (!raw) return
      let v = overlapAllocate(b.period_start, b.period_end, raw, windowStart, windowEnd)
      if (!v) return
      v *= sectorPct(b.activity_id)
      if (!v) return
      ensure(b.activity_id).totalBudget += v
      if (b.period_start) { const y = new Date(b.period_start).getFullYear(); if (!isNaN(y)) availableYears.add(y) }
    })

    // 3. Planned disbursements (overlap-allocated to the window).
    const { data: pds } = await supabase
      .from('planned_disbursements')
      .select('activity_id, usd_amount, period_start, period_end')
      .lte('period_start', dateTo)
      .gte('period_end', dateFrom)
    ;(pds || []).forEach((pd: any) => {
      if (!pd.activity_id || !activityMap.has(pd.activity_id)) return
      if (sectorFilteredActivityIds && !sectorFilteredActivityIds.has(pd.activity_id)) return
      const raw = parseFloat(pd.usd_amount) || 0
      if (!raw) return
      let v = overlapAllocate(pd.period_start, pd.period_end, raw, windowStart, windowEnd)
      if (!v) return
      v *= sectorPct(pd.activity_id)
      if (!v) return
      ensure(pd.activity_id).totalPlannedDisbursement += v
      if (pd.period_start) { const y = new Date(pd.period_start).getFullYear(); if (!isNaN(y)) availableYears.add(y) }
    })

    // Build records, keeping only activities that have a humanitarian component.
    let records = Array.from(agg.entries())
      .map(([activityId, a]) => {
        const act: any = activityMap.get(activityId)
        if (!act) return null
        const isHumanitarianActivity =
          HUMANITARIAN_AID_TYPES.has(String(act.default_aid_type || '').trim()) ||
          a.hasHumanitarianTx
        if (!isHumanitarianActivity) return null
        const reportingOrgId = act.reporting_org_id || null
        const orgInfo = reportingOrgId ? (orgMap.get(reportingOrgId) as any) : null
        return {
          id: activityId,
          name: act.title_narrative || 'Untitled activity',
          acronym: act.acronym || null,
          iati_identifier: act.iati_identifier || null,
          reportingOrgId,
          reportingOrgName: orgInfo?.name || null,
          reportingOrgAcronym: orgInfo?.acronym || null,
          reportingOrgType: orgInfo?.type || null,
          defaultAidType: act.default_aid_type || null,
          defaultFinanceType: act.default_finance_type || null,
          totalBudget: a.totalBudget,
          totalPlannedDisbursement: a.totalPlannedDisbursement,
          byTxType: a.byTxType,
          humanitarianActual: a.humanitarianActual,
          developmentActual: a.developmentActual,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    // Apply org-type / aid-type / finance-type filters (comma-separated codes).
    const asSet = (raw: string) => new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))
    if (orgType && orgType !== 'all') {
      const wanted = asSet(orgType)
      if (wanted.size) records = records.filter((r) => r.reportingOrgType && wanted.has(String(r.reportingOrgType)))
    }
    if (aidType && aidType !== 'all') {
      const wanted = asSet(aidType)
      if (wanted.size) records = records.filter((r) => r.defaultAidType && wanted.has(String(r.defaultAidType)))
    }
    if (financeType && financeType !== 'all') {
      const wanted = asSet(financeType)
      if (wanted.size) records = records.filter((r) => r.defaultFinanceType && wanted.has(String(r.defaultFinanceType)))
    }

    // Development-partner options reflect the filtered universe (minus the
    // partner filter itself, so toggling partners never empties the dropdown).
    const partnersMap = new Map<string, { id: string; name: string; acronym: string | null }>()
    records.forEach((r) => {
      if (r.reportingOrgId && r.reportingOrgName) {
        partnersMap.set(r.reportingOrgId, { id: r.reportingOrgId, name: r.reportingOrgName, acronym: r.reportingOrgAcronym })
      }
    })
    const partners = Array.from(partnersMap.values()).sort((a, b) => a.name.localeCompare(b.name))

    if (partnerIds.trim()) {
      const wanted = asSet(partnerIds)
      records = records.filter((r) => r.reportingOrgId && wanted.has(r.reportingOrgId))
    }

    records.sort(
      (a, b) => (b.humanitarianActual + b.developmentActual) - (a.humanitarianActual + a.developmentActual)
    )

    const result = {
      success: true,
      data: records,
      count: records.length,
      partners,
      availableYears: Array.from(availableYears).sort((a, b) => a - b),
    }
    setCache(cacheKey, result)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    })
  } catch (error) {
    console.error('[HumActivities API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch humanitarian activities' },
      { status: 500 }
    )
  }
}
