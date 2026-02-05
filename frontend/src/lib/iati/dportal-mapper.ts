/**
 * Maps d-portal XSON JSON format to ParsedActivity.
 *
 * D-portal returns activities in a format that mirrors the IATI XML structure,
 * with paths like "/sector" and attributes like "@percentage".
 */

import type { ParsedActivity } from '@/components/iati/bulk-import/types'

/** Safely get first element from array or return the value itself */
function first(val: unknown): any {
  if (Array.isArray(val)) return val[0]
  return val
}

/** Extract text from narrative structure */
function extractNarrative(narrativeObj: any): string {
  if (!narrativeObj) return ''
  if (typeof narrativeObj === 'string') return narrativeObj

  // Handle array of narratives
  const narr = Array.isArray(narrativeObj) ? narrativeObj[0] : narrativeObj
  if (!narr) return ''

  // d-portal stores text in "" key or "narrative" key
  if (narr['']) return narr['']
  if (narr.narrative) return extractNarrative(narr.narrative)
  if (typeof narr === 'string') return narr

  return ''
}

/** Extract date from activity-date array by type code */
function extractDate(activityDates: any, typeCode: string): string | undefined {
  if (!activityDates) return undefined
  const dates = Array.isArray(activityDates) ? activityDates : [activityDates]

  const found = dates.find((d: any) => d['@type'] === typeCode)
  if (found && found['@iso-date']) {
    const raw = found['@iso-date']
    // Strip time component if present
    return raw.includes('T') ? raw.split('T')[0] : raw
  }
  return undefined
}

/**
 * Map a d-portal XSON activity document to ParsedActivity.
 */
export function mapDportalXsonToParsedActivity(doc: any): ParsedActivity {
  const iatiIdentifier = doc['iati-identifier'] || ''

  // Title
  const titleObj = doc.title || doc['/title']
  const title = extractNarrative(titleObj?.narrative || titleObj?.['/narrative']) || `Activity ${iatiIdentifier}`

  // Description
  const descObj = doc.description || doc['/description']
  let description: string | undefined
  if (Array.isArray(descObj)) {
    // Find type 1 (general) description
    const general = descObj.find((d: any) => d['@type'] === '1')
    description = extractNarrative(general?.narrative || general?.['/narrative'])
  } else if (descObj) {
    description = extractNarrative(descObj.narrative || descObj['/narrative'])
  }

  // Status
  const statusObj = doc['activity-status'] || doc['/activity-status']
  const status = statusObj?.['@code'] || undefined

  // Hierarchy
  const hierarchy = doc['@hierarchy'] != null ? Number(doc['@hierarchy']) : undefined

  // Dates
  const activityDates = doc['activity-date'] || doc['/activity-date']
  const planned_start_date = extractDate(activityDates, '1')
  const actual_start_date = extractDate(activityDates, '2')
  const planned_end_date = extractDate(activityDates, '3')
  const actual_end_date = extractDate(activityDates, '4')

  // Sectors - THIS IS THE KEY PART WITH PERCENTAGES
  const sectorData = doc.sector || doc['/sector'] || []
  const sectorArray = Array.isArray(sectorData) ? sectorData : [sectorData]
  const sectors: ParsedActivity['sectors'] = sectorArray
    .filter((s: any) => s && s['@code'])
    .map((s: any) => ({
      code: String(s['@code']),
      vocabulary: s['@vocabulary'] || undefined,
      percentage: s['@percentage'] != null ? Number(s['@percentage']) : undefined,
      name: extractNarrative(s.narrative || s['/narrative']) || undefined,
    }))

  // Participating Organizations
  const poData = doc['participating-org'] || doc['/participating-org'] || []
  const poArray = Array.isArray(poData) ? poData : [poData]
  const participatingOrgs: ParsedActivity['participatingOrgs'] = poArray
    .filter((o: any) => o)
    .map((o: any) => ({
      ref: o['@ref'] || undefined,
      name: extractNarrative(o.narrative || o['/narrative']) || 'Unknown',
      role: o['@role'] || '',
      type: o['@type'] || undefined,
    }))

  // Recipient Countries
  const rcData = doc['recipient-country'] || doc['/recipient-country'] || []
  const rcArray = Array.isArray(rcData) ? rcData : [rcData]
  const recipientCountries = rcArray
    .filter((c: any) => c && c['@code'])
    .map((c: any) => ({
      code: String(c['@code']),
      percentage: c['@percentage'] != null ? Number(c['@percentage']) : undefined,
    }))

  // Locations
  const locData = doc.location || doc['/location'] || []
  const locArray = Array.isArray(locData) ? locData : [locData]
  const locations: ParsedActivity['locations'] = locArray
    .filter((l: any) => l)
    .map((l: any) => {
      const point = l.point || l['/point']
      const pos = point?.pos || point?.['/pos']
      let coordinates: { latitude: number; longitude: number } | undefined

      if (pos) {
        // d-portal pos is typically "lat lng" string
        const posStr = typeof pos === 'string' ? pos : pos[''] || ''
        const parts = posStr.trim().split(/\s+/)
        if (parts.length >= 2) {
          const lat = parseFloat(parts[0])
          const lng = parseFloat(parts[1])
          if (!isNaN(lat) && !isNaN(lng)) {
            coordinates = { latitude: lat, longitude: lng }
          }
        }
      }

      return {
        name: extractNarrative(l.name || l['/name']) || undefined,
        description: extractNarrative(l.description || l['/description']) || undefined,
        coordinates,
      }
    })
    .filter((l: any) => l.name || l.coordinates)

  // Transactions
  const txData = doc.transaction || doc['/transaction'] || []
  const txArray = Array.isArray(txData) ? txData : [txData]
  const transactions: ParsedActivity['transactions'] = txArray
    .filter((t: any) => t)
    .map((t: any) => {
      const txType = t['transaction-type'] || t['/transaction-type']
      const txDate = t['transaction-date'] || t['/transaction-date']
      const txValue = t.value || t['/value']
      const providerOrg = t['provider-org'] || t['/provider-org']
      const receiverOrg = t['receiver-org'] || t['/receiver-org']

      const value = txValue?.[''] != null ? parseFloat(txValue['']) :
                    txValue?.['#text'] != null ? parseFloat(txValue['#text']) :
                    typeof txValue === 'number' ? txValue : 0

      return {
        type: txType?.['@code'] || '',
        date: txDate?.['@iso-date'] || '',
        value: isNaN(value) ? 0 : value,
        currency: txValue?.['@currency'] || doc['@default-currency'] || 'USD',
        description: extractNarrative(t.description || t['/description']) || undefined,
        providerOrg: extractNarrative(providerOrg) || undefined,
        providerOrgRef: providerOrg?.['@ref'] || undefined,
        receiverOrg: extractNarrative(receiverOrg) || undefined,
        receiverOrgRef: receiverOrg?.['@ref'] || undefined,
      }
    })
    .filter((t: any) => t.type && t.value)

  // Budgets
  const budgetData = doc.budget || doc['/budget'] || []
  const budgetArray = Array.isArray(budgetData) ? budgetData : [budgetData]
  const budgets: ParsedActivity['budgets'] = budgetArray
    .filter((b: any) => b)
    .map((b: any) => {
      const periodStart = b['period-start'] || b['/period-start']
      const periodEnd = b['period-end'] || b['/period-end']
      const budgetValue = b.value || b['/value']

      const value = budgetValue?.[''] != null ? parseFloat(budgetValue['']) :
                    budgetValue?.['#text'] != null ? parseFloat(budgetValue['#text']) :
                    typeof budgetValue === 'number' ? budgetValue : 0

      return {
        type: b['@type'] || undefined,
        status: b['@status'] || undefined,
        periodStart: periodStart?.['@iso-date'] || '',
        periodEnd: periodEnd?.['@iso-date'] || '',
        value: isNaN(value) ? 0 : value,
        currency: budgetValue?.['@currency'] || doc['@default-currency'] || 'USD',
        valueDate: budgetValue?.['@value-date'] || undefined,
      }
    })
    .filter((b: any) => b.value > 0)

  // DAC/CRS Classification fields
  const collabType = doc['collaboration-type'] || doc['/collaboration-type']
  const aidType = doc['default-aid-type'] || doc['/default-aid-type']
  const financeType = doc['default-finance-type'] || doc['/default-finance-type']
  const flowType = doc['default-flow-type'] || doc['/default-flow-type']
  const tiedStatus = doc['default-tied-status'] || doc['/default-tied-status']

  // Capital Spend
  const capitalSpendObj = doc['capital-spend'] || doc['/capital-spend']
  const capitalSpend = capitalSpendObj?.['@percentage'] != null
    ? Number(capitalSpendObj['@percentage'])
    : undefined

  // Planned Disbursements
  const pdData = doc['planned-disbursement'] || doc['/planned-disbursement'] || []
  const pdArray = Array.isArray(pdData) ? pdData : [pdData]
  const plannedDisbursements: ParsedActivity['plannedDisbursements'] = pdArray
    .filter((pd: any) => pd)
    .map((pd: any) => {
      const periodStart = pd['period-start'] || pd['/period-start']
      const periodEnd = pd['period-end'] || pd['/period-end']
      const pdValue = pd.value || pd['/value']

      const value = pdValue?.[''] != null ? parseFloat(pdValue['']) :
                    pdValue?.['#text'] != null ? parseFloat(pdValue['#text']) :
                    typeof pdValue === 'number' ? pdValue : 0

      return {
        type: pd['@type'] || undefined,
        periodStart: periodStart?.['@iso-date'] || '',
        periodEnd: periodEnd?.['@iso-date'] || '',
        value: isNaN(value) ? 0 : value,
        currency: pdValue?.['@currency'] || doc['@default-currency'] || 'USD',
        valueDate: pdValue?.['@value-date'] || undefined,
      }
    })
    .filter((pd: any) => pd.value > 0)

  // Build ParsedActivity
  const activity: ParsedActivity = {
    iatiIdentifier,
    iati_id: iatiIdentifier,
    title: String(title),
    description: description || undefined,
    status,
    activity_status: status,
    hierarchy,
    planned_start_date,
    actual_start_date,
    planned_end_date,
    actual_end_date,
    transactions: transactions.length > 0 ? transactions : undefined,
    recipientCountries: recipientCountries.length > 0 ? recipientCountries : undefined,
    sectors: sectors.length > 0 ? sectors : undefined,
    participatingOrgs: participatingOrgs.length > 0 ? participatingOrgs : undefined,
    budgets: budgets.length > 0 ? budgets : undefined,
    locations: locations.length > 0 ? locations : undefined,
    // DAC/CRS classification
    collaborationType: collabType?.['@code'] || undefined,
    defaultAidType: first(aidType)?.['@code'] || aidType?.['@code'] || undefined,
    defaultFinanceType: first(financeType)?.['@code'] || financeType?.['@code'] || undefined,
    defaultFlowType: first(flowType)?.['@code'] || flowType?.['@code'] || undefined,
    defaultTiedStatus: first(tiedStatus)?.['@code'] || tiedStatus?.['@code'] || undefined,
    // Capital spend
    capitalSpend,
    // Planned disbursements
    plannedDisbursements: plannedDisbursements.length > 0 ? plannedDisbursements : undefined,
  }

  // Attach reporting-org ref for org-scope verification
  const reportingOrg = doc['reporting-org'] || doc['/reporting-org']
  ;(activity as any)._reportingOrgRef = reportingOrg?.['@ref'] || ''

  return activity
}
