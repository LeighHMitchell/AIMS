/**
 * Maps IATI Datastore API Solr JSON documents to ParsedActivity format.
 *
 * The Datastore returns multi-valued IATI fields as parallel arrays.
 * For example, transaction_type: ["1","2"] and transaction_value: [50000,30000]
 * are zipped by index — index 0 is the first transaction, index 1 the second, etc.
 */

import type { ParsedActivity } from '@/components/iati/bulk-import/types'

/** Ensure a value is always an array (Datastore sometimes returns scalars for single-value fields) */
function ensureArray(val: unknown): any[] {
  if (val == null) return []
  return Array.isArray(val) ? val : [val]
}

/**
 * Map a single IATI Datastore Solr document to a ParsedActivity.
 *
 * Datastore field reference:
 *   iati_identifier, title_narrative, description_narrative,
 *   activity_status_code, activity_date_type + activity_date_iso_date,
 *   transaction_type/value/date_iso_date/value_currency/description_narrative/
 *     provider_org_narrative/provider_org_ref/receiver_org_narrative/receiver_org_ref,
 *   sector_code/vocabulary/percentage,
 *   participating_org_ref/narrative/role/type,
 *   budget_value/value_currency/period_start_iso_date/period_end_iso_date,
 *   reporting_org_ref, reporting_org_narrative
 */
export function mapDatastoreDocToParsedActivity(
  doc: Record<string, any>
): ParsedActivity {
  // --- Dates (parallel arrays: activity_date_type + activity_date_iso_date) ---
  const dateTypes = ensureArray(doc.activity_date_type)
  const dateValues = ensureArray(doc.activity_date_iso_date)
  const dateByType: Record<string, string> = {}
  dateTypes.forEach((type: string, i: number) => {
    if (dateValues[i]) {
      // Strip time component from ISO timestamps (e.g. "2022-01-01T00:00:00Z" → "2022-01-01")
      const raw = dateValues[i]
      dateByType[String(type)] = raw.includes('T') ? raw.split('T')[0] : raw
    }
  })

  // --- Transactions ---
  // Actual Datastore Solr field names (verified against live API):
  //   transaction_transaction_type_code, transaction_transaction_date_iso_date,
  //   transaction_value, transaction_value_value_date, transaction_value_currency (rare),
  //   transaction_description_narrative,
  //   transaction_provider_org_narrative, transaction_provider_org_ref,
  //   transaction_receiver_org_narrative, transaction_receiver_org_ref
  const txTypes = ensureArray(doc.transaction_transaction_type_code)
  const txDates = ensureArray(doc.transaction_transaction_date_iso_date)
  const txValues = ensureArray(doc.transaction_value)
  const txCurrencies = ensureArray(doc.transaction_value_currency)
  const txValueDates = ensureArray(doc.transaction_value_value_date)
  const txDescriptions = ensureArray(doc.transaction_description_narrative)
  const txProviderNames = ensureArray(doc.transaction_provider_org_narrative)
  const txProviderRefs = ensureArray(doc.transaction_provider_org_ref)
  const txReceiverNames = ensureArray(doc.transaction_receiver_org_narrative)
  const txReceiverRefs = ensureArray(doc.transaction_receiver_org_ref)
  const defaultCurrency = doc.default_currency || 'USD'

  const txCount = txValues.length // anchor on values — the most reliable field
  const transactions: ParsedActivity['transactions'] = []
  for (let i = 0; i < txCount; i++) {
    const val = parseFloat(txValues[i])
    if (isNaN(val)) continue
    // Dates may include time component (e.g. "2022-12-31T00:00:00Z") — extract date part
    const rawDate = txDates[i] || txValueDates[i] || ''
    const date = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate
    transactions.push({
      type: txTypes[i] || '',
      date,
      value: val,
      currency: txCurrencies[i] || defaultCurrency,
      description: txDescriptions[i] || undefined,
      providerOrg: txProviderNames[i] || undefined,
      providerOrgRef: txProviderRefs[i] || undefined,
      receiverOrg: txReceiverNames[i] || undefined,
      receiverOrgRef: txReceiverRefs[i] || undefined,
    })
  }

  // --- Sectors ---
  const sectorCodes = ensureArray(doc.sector_code)
  const sectorVocabs = ensureArray(doc.sector_vocabulary)
  const sectorPcts = ensureArray(doc.sector_percentage)
  const sectors: ParsedActivity['sectors'] = sectorCodes.map(
    (code: string, i: number) => ({
      code: String(code),
      vocabulary: sectorVocabs[i] || undefined,
      percentage: sectorPcts[i] != null && !isNaN(parseFloat(sectorPcts[i])) ? parseFloat(sectorPcts[i]) : undefined,
    })
  )

  // --- Participating Organisations ---
  const poRefs = ensureArray(doc.participating_org_ref)
  const poNames = ensureArray(doc.participating_org_narrative)
  const poRoles = ensureArray(doc.participating_org_role)
  const poTypes = ensureArray(doc.participating_org_type)
  const poCount = poRoles.length // role is the most reliable anchor field
  const participatingOrgs: ParsedActivity['participatingOrgs'] = []
  for (let i = 0; i < poCount; i++) {
    if (!poRoles[i] && !poRefs[i] && !poNames[i]) continue
    participatingOrgs.push({
      ref: poRefs[i] || undefined,
      name: poNames[i] || 'Unknown',
      role: poRoles[i] || '',
      type: poTypes[i] || undefined,
    })
  }

  // --- Budgets ---
  const budgetValues = ensureArray(doc.budget_value)
  const budgetCurrencies = ensureArray(doc.budget_value_currency)
  const budgetStarts = ensureArray(doc.budget_period_start_iso_date)
  const budgetEnds = ensureArray(doc.budget_period_end_iso_date)
  const budgetTypes = ensureArray(doc.budget_type)
  const budgets: ParsedActivity['budgets'] = budgetValues
    .map((val: any, i: number) => {
      const parsed = parseFloat(val)
      if (isNaN(parsed)) return null
      return {
        type: budgetTypes[i] || undefined,
        periodStart: budgetStarts[i] || '',
        periodEnd: budgetEnds[i] || '',
        value: parsed,
        currency: budgetCurrencies[i] || 'USD',
      }
    })
    .filter(Boolean) as NonNullable<ParsedActivity['budgets']>

  // --- Recipient Countries ---
  const rcCodes = ensureArray(doc.recipient_country_code)
  const rcPcts = ensureArray(doc.recipient_country_percentage)
  const recipientCountries = rcCodes.map((code: string, i: number) => ({
    code: String(code),
    percentage: rcPcts[i] != null && !isNaN(parseFloat(rcPcts[i])) ? parseFloat(rcPcts[i]) : undefined,
  }))

  // --- Build ParsedActivity ---
  const iatiIdentifier = doc.iati_identifier || ''
  const title = ensureArray(doc.title_narrative)[0] || `Activity ${iatiIdentifier}`
  const description = ensureArray(doc.description_narrative)[0] || undefined

  const activity: ParsedActivity = {
    iatiIdentifier,
    iati_id: iatiIdentifier,
    title: String(title),
    description: description ? String(description) : undefined,
    activity_status: doc.activity_status_code || undefined,
    status: doc.activity_status_code || undefined,
    hierarchy: doc.hierarchy != null ? Number(doc.hierarchy) : undefined,
    planned_start_date: dateByType['1'] || undefined,
    actual_start_date: dateByType['2'] || undefined,
    planned_end_date: dateByType['3'] || undefined,
    actual_end_date: dateByType['4'] || undefined,
    transactions,
    recipientCountries: recipientCountries.length > 0 ? recipientCountries : undefined,
    sectors: sectors.length > 0 ? sectors : undefined,
    participatingOrgs: participatingOrgs.length > 0 ? participatingOrgs : undefined,
    budgets: budgets.length > 0 ? budgets : undefined,
  }

  // Attach reporting-org ref for org-scope verification
  ;(activity as any)._reportingOrgRef =
    ensureArray(doc.reporting_org_ref)[0] || ''

  return activity
}
