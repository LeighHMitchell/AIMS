import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { codeAndName } from '@/lib/iati/codelist-resolver';
import { titleWithAcronym, orgWithAcronym } from '@/lib/reports/format-helpers';
import { txUsd, excludeInternalTransfers, getPooledFundIds } from '@/lib/analytics-transaction-filters';
import { safeUsd } from '@/lib/safe-usd';
import { getModalityName } from '@/utils/modality-calculation';

export const dynamic = 'force-dynamic'

// Keep cents so money columns reconcile with the charts (no per-row rounding loss).
const round2 = (n: number) => Math.round(n * 100) / 100
const yesNo = (v: any) => (v === true ? 'Yes' : v === false ? 'No' : '')
const SEP = '; '

// IATI transaction-type codes — one "Total <type> (USD)" column each.
const TX_TYPE_CODES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // 1) Activities (published, non-deleted). select('*') so a single column
    //    rename can't break the whole report; fields are read defensively below.
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('publication_status', 'published')
      .is('deleted_at', null)
      .order('title_narrative', { ascending: true })

    if (activitiesError) {
      console.error('[Reports API] Error fetching activities:', activitiesError)
      return NextResponse.json(
        { error: 'Failed to fetch activities', details: activitiesError.message },
        { status: 500 }
      )
    }
    if (!activities || activities.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    const acts = activities as any[]
    const activityIds = acts.map(a => a.id)

    // 2) Activity-level sectors
    const { data: actSectors } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, sector_name, percentage')
      .in('activity_id', activityIds)

    // 3) Locations (admin areas vs named sites)
    const { data: locations } = await supabase
      .from('activity_locations')
      .select('activity_id, location_name, state_region_name, district_name, township_name, location_type, latitude, longitude')
      .in('activity_id', activityIds)

    // 4) Transactions — actual, non-deleted, internal pooled-fund transfers excluded.
    //    Drives per-type totals, transaction-level sector weighting, and
    //    transaction-level country/region detection.
    let txQuery = supabase
      .from('transactions')
      .select('uuid, activity_id, transaction_type, value, value_usd, currency, recipient_country_code, recipient_region_code')
      .in('activity_id', activityIds)
      .eq('status', 'actual')
      .is('deleted_at', null)
    const pooledFundIds = await getPooledFundIds(supabase)
    txQuery = excludeInternalTransfers(txQuery, pooledFundIds)
    const { data: txns } = await txQuery
    const transactions = (txns as any[]) || []

    // 5) Transaction sector lines (transaction-level weighted sectors)
    const txIds = transactions.map(t => t.uuid)
    let sectorLines: any[] = []
    if (txIds.length > 0) {
      const { data: sl } = await supabase
        .from('transaction_sector_lines')
        .select('transaction_id, sector_code, sector_name, percentage')
        .in('transaction_id', txIds)
        .is('deleted_at', null)
      sectorLines = (sl as any[]) || []
    }

    // 6) Budgets
    const { data: budgets } = await supabase
      .from('activity_budgets')
      .select('activity_id, value, usd_value, currency')
      .in('activity_id', activityIds)
      .is('deleted_at', null)
      .not('period_start', 'is', null)

    // 7) Planned disbursements
    const { data: plannedDisb } = await supabase
      .from('planned_disbursements')
      .select('activity_id, amount, usd_amount, currency')
      .in('activity_id', activityIds)

    // 8) Reporting organisations
    const reportingOrgIds = Array.from(new Set(acts.map(a => a.reporting_org_id).filter(Boolean)))
    const { data: reportingOrgs } = reportingOrgIds.length > 0
      ? await supabase.from('organizations').select('id, name, acronym').in('id', reportingOrgIds)
      : { data: [] as any[] }

    // 9) Participating organisations (+ org name/acronym)
    const { data: partOrgs } = await supabase
      .from('activity_participating_organizations')
      .select('activity_id, iati_role_code, role_type, narrative, organization:organizations(id, name, acronym)')
      .in('activity_id', activityIds)

    // 10) Focal points (activity_contacts)
    const { data: contacts } = await supabase
      .from('activity_contacts')
      .select('activity_id, type, first_name, last_name, email, phone, organisation, position')
      .in('activity_id', activityIds)
      .in('type', ['government_focal_point', 'development_partner_focal_point'])

    // 11) SDG mappings
    const { data: sdgRows } = await supabase
      .from('activity_sdg_mappings')
      .select('activity_id, sdg_goal, sdg_target')
      .in('activity_id', activityIds)

    // 12) Policy markers (+ marker reference table)
    const { data: apmRows } = await supabase
      .from('activity_policy_markers')
      .select('activity_id, policy_marker_id, significance')
      .in('activity_id', activityIds)
    const { data: markerDefs } = await supabase
      .from('policy_markers')
      .select('id, uuid, code, name, iati_code')
    const markerById = new Map<string, any>()
    ;(markerDefs as any[] || []).forEach(m => {
      if (m.id != null) markerById.set(String(m.id), m)
      if (m.uuid != null) markerById.set(String(m.uuid), m)
    })

    // 13) Tags
    const { data: tagLinks } = await supabase
      .from('activity_tags')
      .select('activity_id, tag_id')
      .in('activity_id', activityIds)
    const tagIds = Array.from(new Set((tagLinks as any[] || []).map(t => t.tag_id).filter(Boolean)))
    const { data: tagDefs } = tagIds.length > 0
      ? await supabase.from('tags').select('id, name').in('id', tagIds)
      : { data: [] as any[] }
    const tagNameById = new Map<string, string>()
    ;(tagDefs as any[] || []).forEach(t => tagNameById.set(String(t.id), t.name))

    // 14) Working groups
    const { data: wgLinks } = await supabase
      .from('activity_working_groups')
      .select('activity_id, working_group_id')
      .in('activity_id', activityIds)
    const wgIds = Array.from(new Set((wgLinks as any[] || []).map(w => w.working_group_id).filter(Boolean)))
    const { data: wgDefs } = wgIds.length > 0
      ? await supabase.from('working_groups').select('id, code, label').in('id', wgIds)
      : { data: [] as any[] }
    const wgById = new Map<string, any>()
    ;(wgDefs as any[] || []).forEach(w => wgById.set(String(w.id), w))

    // 15) Government financial inputs
    const { data: govInputs } = await supabase
      .from('government_inputs')
      .select('activity_id, rgc_contribution')
      .in('activity_id', activityIds)

    // ---- Lookup maps ----
    const orgById = new Map<string, any>()
    ;(reportingOrgs as any[] || []).forEach(o => orgById.set(o.id, o))

    const actSectorsByActivity = new Map<string, any[]>()
    ;(actSectors as any[] || []).forEach(s => {
      const arr = actSectorsByActivity.get(s.activity_id) || []
      arr.push(s)
      actSectorsByActivity.set(s.activity_id, arr)
    })

    const txUsdByUuid = new Map<string, number>()
    const activityByTxUuid = new Map<string, string>()
    const txTotalsByActivity = new Map<string, Record<string, number>>()
    const txTotalUsdByActivity = new Map<string, number>()
    const txCountryByActivity = new Map<string, Set<string>>()
    const txRegionByActivity = new Map<string, Set<string>>()
    transactions.forEach(t => {
      const usd = txUsd(t)
      txUsdByUuid.set(t.uuid, usd)
      activityByTxUuid.set(t.uuid, t.activity_id)
      txTotalUsdByActivity.set(t.activity_id, (txTotalUsdByActivity.get(t.activity_id) || 0) + usd)
      const code = String(t.transaction_type ?? '')
      if (code) {
        const rec = txTotalsByActivity.get(t.activity_id) || {}
        rec[code] = (rec[code] || 0) + usd
        txTotalsByActivity.set(t.activity_id, rec)
      }
      if (t.recipient_country_code) {
        const s = txCountryByActivity.get(t.activity_id) || new Set<string>()
        s.add(t.recipient_country_code); txCountryByActivity.set(t.activity_id, s)
      }
      if (t.recipient_region_code) {
        const s = txRegionByActivity.get(t.activity_id) || new Set<string>()
        s.add(t.recipient_region_code); txRegionByActivity.set(t.activity_id, s)
      }
    })

    // Transaction-level weighted sectors: activity -> sector_code -> {name, weighted}
    const txSectorAccum = new Map<string, Map<string, { name: string; weighted: number }>>()
    sectorLines.forEach(line => {
      const activityId = activityByTxUuid.get(line.transaction_id)
      if (!activityId) return
      const usd = txUsdByUuid.get(line.transaction_id) || 0
      const pct = parseFloat(String(line.percentage ?? '0')) || 0
      const m = txSectorAccum.get(activityId) || new Map<string, { name: string; weighted: number }>()
      const cur = m.get(line.sector_code) || { name: line.sector_name || '', weighted: 0 }
      cur.weighted += usd * (pct / 100)
      m.set(line.sector_code, cur)
      txSectorAccum.set(activityId, m)
    })

    const budgetByActivity = new Map<string, number>()
    ;(budgets as any[] || []).forEach(b => {
      const usd = safeUsd(b)
      if (usd > 0) budgetByActivity.set(b.activity_id, (budgetByActivity.get(b.activity_id) || 0) + usd)
    })

    const plannedByActivity = new Map<string, number>()
    ;(plannedDisb as any[] || []).forEach(pd => {
      const usd = safeUsd({ usd_value: pd.usd_amount, amount: pd.amount, currency: pd.currency })
      if (usd > 0) plannedByActivity.set(pd.activity_id, (plannedByActivity.get(pd.activity_id) || 0) + usd)
    })

    const adminByActivity = new Map<string, Set<string>>()
    const sitesByActivity = new Map<string, Set<string>>()
    ;(locations as any[] || []).forEach(l => {
      if (l.state_region_name) {
        const s = adminByActivity.get(l.activity_id) || new Set<string>()
        s.add(l.state_region_name); adminByActivity.set(l.activity_id, s)
      }
      const isSite = l.location_type === 'site' || l.latitude != null || l.longitude != null || (!l.state_region_name && !!l.location_name)
      if (isSite && l.location_name) {
        const s = sitesByActivity.get(l.activity_id) || new Set<string>()
        s.add(l.location_name); sitesByActivity.set(l.activity_id, s)
      }
    })

    const ROLE_FROM_TYPE: Record<string, number> = { funding: 1, government: 2, extending: 3, implementing: 4 }
    const partByActivity = new Map<string, Record<number, string[]>>()
    ;(partOrgs as any[] || []).forEach(p => {
      const org = Array.isArray(p.organization) ? p.organization[0] : p.organization
      const label = orgWithAcronym(org?.name, org?.acronym, p.narrative)
      if (!label) return
      const role = Number(p.iati_role_code) || ROLE_FROM_TYPE[p.role_type] || 0
      if (!role) return
      const rec = partByActivity.get(p.activity_id) || {}
      rec[role] = rec[role] || []
      if (!rec[role].includes(label)) rec[role].push(label)
      partByActivity.set(p.activity_id, rec)
    })

    const fpFmt = (c: any) => {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || ''
      const posOrg = [c.position, c.organisation].filter(Boolean).join(', ')
      return [name, posOrg, c.email, c.phone].filter(Boolean).join(' — ')
    }
    const fpByActivity = new Map<string, Record<string, string[]>>()
    ;(contacts as any[] || []).forEach(c => {
      const rec = fpByActivity.get(c.activity_id) || {}
      rec[c.type] = rec[c.type] || []
      const f = fpFmt(c)
      if (f) rec[c.type].push(f)
      fpByActivity.set(c.activity_id, rec)
    })

    const sdgByActivity = new Map<string, Set<string>>()
    ;(sdgRows as any[] || []).forEach(s => {
      const label = s.sdg_target ? `SDG${s.sdg_target}` : (s.sdg_goal ? `SDG${s.sdg_goal}` : '')
      if (label) {
        const set = sdgByActivity.get(s.activity_id) || new Set<string>()
        set.add(label); sdgByActivity.set(s.activity_id, set)
      }
    })

    const cn = (list: any, code: any) => {
      if (code == null || code === '') return { code: '', name: '' }
      try { return codeAndName(list, code) } catch { return { code: String(code), name: '' } }
    }

    const pmByActivity = new Map<string, string[]>()
    ;(apmRows as any[] || []).forEach(am => {
      const m = markerById.get(String(am.policy_marker_id))
      const markerName = m?.name || m?.code || (m?.iati_code ? `Marker ${m.iati_code}` : '')
      if (!markerName) return
      const sig = cn('policy_significance', am.significance)
      const sigLabel = sig.name ? `${sig.code} - ${sig.name}` : (am.significance != null ? String(am.significance) : '')
      const label = sigLabel ? `${markerName} (${sigLabel})` : markerName
      const arr = pmByActivity.get(am.activity_id) || []
      if (!arr.includes(label)) arr.push(label)
      pmByActivity.set(am.activity_id, arr)
    })

    const tagsByActivity = new Map<string, string[]>()
    ;(tagLinks as any[] || []).forEach(t => {
      const name = tagNameById.get(String(t.tag_id))
      if (!name) return
      const label = `#${name}`
      const arr = tagsByActivity.get(t.activity_id) || []
      if (!arr.includes(label)) arr.push(label)
      tagsByActivity.set(t.activity_id, arr)
    })

    const wgByActivity = new Map<string, string[]>()
    ;(wgLinks as any[] || []).forEach(w => {
      const g = wgById.get(String(w.working_group_id))
      if (!g) return
      const label = [g.code, g.label].filter(Boolean).join(' – ')
      const arr = wgByActivity.get(w.activity_id) || []
      if (label && !arr.includes(label)) arr.push(label)
      wgByActivity.set(w.activity_id, arr)
    })

    const govByActivity = new Map<string, string>()
    ;(govInputs as any[] || []).forEach(gi => {
      const rgc = gi.rgc_contribution || {}
      const provided = rgc.isProvided === true || (Array.isArray(rgc.contributions) && rgc.contributions.length > 0)
      govByActivity.set(gi.activity_id, provided ? 'Government Contributes' : 'No Contribution')
    })

    // recipient countries/regions from JSONB → {codes, names}
    const jsonbGeo = (arr: any, kind: 'country' | 'region') => {
      const codes: string[] = []; const names: string[] = []
      if (!Array.isArray(arr)) return { codes, names }
      arr.forEach((el: any) => {
        let code = ''; let name = ''
        if (typeof el === 'string') { code = el }
        else if (el && typeof el === 'object') {
          const obj = el[kind] || el
          code = obj?.code || el?.code || ''
          name = obj?.name || el?.name || ''
        }
        if (code && !name) name = cn(kind, code).name
        if (code) { codes.push(code); names.push(name || code) }
      })
      return { codes, names }
    }

    const fmtSectors = (rows: any[]) => rows
      .map(s => {
        const pct = s.percentage != null ? ` (${round2(Number(s.percentage))}%)` : ''
        return `${[s.sector_code, s.sector_name].filter(Boolean).join(' – ')}${pct}`
      })
      .filter(Boolean)
      .join(SEP)

    const reportData = acts.map(a => {
      const aid = a.id
      const org = a.reporting_org_id ? orgById.get(a.reporting_org_id) : null

      // Sector reporting level + sectors cell
      const actSecRows = actSectorsByActivity.get(aid) || []
      let sectorLevel = ''
      let sectorsCell = ''
      if (a.sector_allocation_mode === 'transaction' || (actSecRows.length === 0 && txSectorAccum.has(aid))) {
        sectorLevel = 'Transaction'
        const total = txTotalUsdByActivity.get(aid) || 0
        const m = txSectorAccum.get(aid)
        if (m && total > 0) {
          sectorsCell = Array.from(m.entries())
            .map(([code, v]) => ({ code, name: v.name, pct: round2((v.weighted / total) * 100) }))
            .sort((x, y) => y.pct - x.pct)
            .map(s => `${[s.code, s.name].filter(Boolean).join(' – ')} (${s.pct}%)`)
            .join(SEP)
        }
      } else {
        sectorLevel = actSecRows.length > 0 ? 'Activity' : ''
        sectorsCell = fmtSectors(actSecRows)
      }

      // Countries & regions level + codes + names
      let crLevel = ''
      const crPairs = new Map<string, string>()
      const rc = jsonbGeo(a.recipient_countries, 'country')
      const rr = jsonbGeo(a.recipient_regions, 'region')
      if (rc.codes.length || rr.codes.length) {
        crLevel = 'Activity'
        rc.codes.forEach((c, i) => { if (c && !crPairs.has(c)) crPairs.set(c, rc.names[i] || c) })
        rr.codes.forEach((c, i) => { if (c && !crPairs.has(c)) crPairs.set(c, rr.names[i] || c) })
      } else {
        const tc = Array.from(txCountryByActivity.get(aid) || [])
        const tr = Array.from(txRegionByActivity.get(aid) || [])
        if (tc.length || tr.length) {
          crLevel = 'Transaction'
          tc.forEach(c => { if (!crPairs.has(c)) crPairs.set(c, cn('country', c).name || c) })
          tr.forEach(r => { if (!crPairs.has(r)) crPairs.set(r, cn('region', r).name || r) })
        }
      }

      const part = partByActivity.get(aid) || {}
      const fp = fpByActivity.get(aid) || {}
      const txTotals = txTotalsByActivity.get(aid) || {}

      const status = cn('activity_status', a.activity_status)
      const collab = cn('collaboration_type', a.collaboration_type)
      const scope = cn('activity_scope', a.activity_scope)
      const daid = cn('aid_type', a.default_aid_type)
      const dfin = cn('finance_type', a.default_finance_type)
      const dflow = cn('flow_type', a.default_flow_type)
      const dtied = cn('tied_status', a.default_tied_status)
      const dcur = cn('currency', a.default_currency)
      const ddc = cn('disbursement_channel', a.default_disbursement_channel)

      const row: Record<string, any> = {
        activity_identifier: a.other_identifier || '',
        iati_identifier: a.iati_identifier || '',
        title: titleWithAcronym(a.title_narrative, a.acronym),
        activity_status_code: status.code,
        activity_status_name: status.name,
        activity_type: a.is_pooled_fund ? 'Pooled Fund' : 'Standard',
        reporting_org: orgWithAcronym(org?.name, org?.acronym, a.created_by_org_name),
        description_general: a.description_narrative || '',
        description_objectives: a.description_objectives || '',
        description_other: a.description_other || '',
        description_target_groups: a.description_target_groups || '',
        default_modality_code: a.default_modality || '',
        default_modality_name: a.default_modality ? getModalityName(String(a.default_modality)) : '',
        collaboration_type_code: collab.code,
        collaboration_type_name: collab.name,
        activity_scope_code: scope.code,
        activity_scope_name: scope.name,
        hierarchy: a.hierarchy != null ? a.hierarchy : '',
        default_aid_type_code: daid.code,
        default_aid_type_name: daid.name,
        default_finance_type_code: dfin.code,
        default_finance_type_name: dfin.name,
        default_flow_type_code: dflow.code,
        default_flow_type_name: dflow.name,
        default_tied_status_code: dtied.code,
        default_tied_status_name: dtied.name,
        default_currency_code: dcur.code,
        default_currency_name: dcur.name,
        default_disbursement_channel_code: ddc.code,
        default_disbursement_channel_name: ddc.name,
        humanitarian_marker: yesNo(a.humanitarian),
        capital_spend: a.capital_spend_percentage != null ? round2(Number(a.capital_spend_percentage)) : '',
        sector_reporting_level: sectorLevel,
        sectors: sectorsCell,
        countries_regions_level: crLevel,
        country_region_codes: Array.from(crPairs.keys()).join(SEP),
        country_region_names: Array.from(crPairs.values()).join(SEP),
        locations: Array.from(adminByActivity.get(aid) || []).join(SEP),
        specific_sites: Array.from(sitesByActivity.get(aid) || []).join(SEP),
        participating_funding: (part[1] || []).join(SEP),
        participating_accountable: (part[2] || []).join(SEP),
        participating_extending: (part[3] || []).join(SEP),
        participating_implementing: (part[4] || []).join(SEP),
        government_focal_points: (fp['government_focal_point'] || []).join(SEP),
        development_partner_focal_points: (fp['development_partner_focal_point'] || []).join(SEP),
        planned_start_date: a.planned_start_date || '',
        actual_start_date: a.actual_start_date || '',
        planned_end_date: a.planned_end_date || '',
        actual_end_date: a.actual_end_date || '',
        total_budget: round2(budgetByActivity.get(aid) || 0),
        total_planned_disbursements: round2(plannedByActivity.get(aid) || 0),
      }
      TX_TYPE_CODES.forEach(code => { row[`total_type_${code}`] = round2(txTotals[code] || 0) })
      row.sdg_alignment = Array.from(sdgByActivity.get(aid) || []).join(SEP)
      row.policy_markers = (pmByActivity.get(aid) || []).join(SEP)
      row.tags = (tagsByActivity.get(aid) || []).join(SEP)
      row.working_groups = (wgByActivity.get(aid) || []).join(SEP)
      row.government_financial_inputs = govByActivity.get(aid) || 'No Contribution'
      return row
    })

    const response = NextResponse.json({ data: reportData, error: null })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response

  } catch (error) {
    console.error('[Reports API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
