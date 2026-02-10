import { mapDatastoreDocToParsedActivity } from '@/lib/iati/datastore-mapper'
import type { ParsedActivity } from '@/components/iati/bulk-import/types'

// IATI Datastore is the PRIMARY source (has everything except sector percentages)
export const IATI_DATASTORE_BASE = 'https://api.iatistandard.org/datastore/activity/select'
export const DATASTORE_PAGE_SIZE = 1000

/** Filters applied at the IATI Datastore level for performance */
export interface DatastoreFilters {
  /** ISO country code (e.g., "MM" for Myanmar) */
  country?: string
  /**
   * How to match country:
   * - 'activity': Only activity-level recipient_country_code (default)
   * - 'transaction': Only transaction-level recipient_country_code
   * - 'both': Either activity OR transaction level
   */
  countryFilterMode?: 'activity' | 'transaction' | 'both'
  /** Start of date range (ISO date string, e.g., "2021-01-01") */
  dateStart?: string
  /** End of date range (ISO date string, e.g., "2028-12-31") */
  dateEnd?: string
  /** Activity hierarchy level (1 = parent, 2 = sub-activity) */
  hierarchy?: number
}

/** All Solr fields requested from the IATI Datastore */
export const DATASTORE_FIELDS = [
  'iati_identifier',
  'title_narrative',
  'description_narrative',
  'activity_status_code',
  'hierarchy',
  'default_currency',
  // Dates
  'activity_date_type',
  'activity_date_iso_date',
  // Countries (with percentages!)
  'recipient_country_code',
  'recipient_country_percentage',
  // Sectors
  'sector_code',
  'sector_vocabulary',
  'sector_percentage',
  'sector_narrative',
  // Transactions
  'transaction_transaction_type_code',
  'transaction_transaction_date_iso_date',
  'transaction_value',
  'transaction_value_currency',
  'transaction_value_value_date',
  'transaction_description_narrative',
  'transaction_provider_org_narrative',
  'transaction_provider_org_ref',
  'transaction_receiver_org_narrative',
  'transaction_receiver_org_ref',
  // Participating orgs
  'participating_org_ref',
  'participating_org_narrative',
  'participating_org_role',
  'participating_org_type',
  // Budgets
  'budget_value',
  'budget_value_currency',
  'budget_period_start_iso_date',
  'budget_period_end_iso_date',
  'budget_type',
  'budget_status',
  'budget_value_value_date',
  // Locations
  'location_point_pos',
  'location_name_narrative',
  'location_description_narrative',
  'location_reach_code',
  'location_exactness_code',
  'location_location_class_code',
  'location_feature_designation_code',
  // DAC/CRS classification
  'collaboration_type_code',
  'default_aid_type_code',
  'default_finance_type_code',
  'default_flow_type_code',
  'default_tied_status_code',
  // Contacts (contact-info)
  'contact_info_type',
  'contact_info_organisation_narrative',
  'contact_info_department_narrative',
  'contact_info_person_name_narrative',
  'contact_info_job_title_narrative',
  'contact_info_telephone',
  'contact_info_email',
  'contact_info_website',
  'contact_info_mailing_address_narrative',
  // Documents (document-link)
  'document_link_url',
  'document_link_format',
  'document_link_title_narrative',
  'document_link_description_narrative',
  'document_link_category_code',
  'document_link_language_code',
  'document_link_document_date_iso_date',
  // Reporting org
  'reporting_org_ref',
  'reporting_org_narrative',
  // Humanitarian flag
  'humanitarian',
  // Activity scope & language
  'activity_scope_code',
  'default_lang',
  // Policy markers
  'policy_marker_code',
  'policy_marker_vocabulary',
  'policy_marker_significance',
  'policy_marker_narrative',
  // Humanitarian scope
  'humanitarian_scope_type',
  'humanitarian_scope_vocabulary',
  'humanitarian_scope_code',
  'humanitarian_scope_narrative',
  // Tags (including SDGs)
  'tag_code',
  'tag_vocabulary',
  'tag_narrative',
  // Related activities
  'related_activity_ref',
  'related_activity_type',
  // Other identifiers
  'other_identifier_ref',
  'other_identifier_type',
  'other_identifier_owner_org_ref',
  'other_identifier_owner_org_narrative',
  // Conditions
  'conditions_attached',
  'condition_type',
  'condition_narrative',
  // Recipient regions
  'recipient_region_code',
  'recipient_region_vocabulary',
  'recipient_region_percentage',
  // Country budget items
  'country_budget_items_vocabulary',
  'country_budget_items_budget_item_code',
  'country_budget_items_budget_item_percentage',
  'country_budget_items_budget_item_description_narrative',
  // Transaction-level classification overrides
  'transaction_aid_type_code',
  'transaction_finance_type_code',
  'transaction_flow_type_code',
  'transaction_tied_status_code',
  // Transaction-level geography
  'transaction_recipient_country_code',
  'transaction_recipient_region_code',
  // FSS (Forward Spending Survey)
  'fss_extraction_date',
  'fss_priority',
  'fss_phaseout_year',
  'fss_forecast_year',
  'fss_forecast_value',
  'fss_forecast_currency',
  'fss_forecast_value_date',
  // CRS additional data
  'crs_add_other_flags_code',
  'crs_add_other_flags_significance',
  'crs_add_loan_terms_rate_1',
  'crs_add_loan_terms_rate_2',
  'crs_add_repayment_type_code',
  'crs_add_repayment_plan_code',
  'crs_add_commitment_date_iso_date',
  'crs_add_repayment_first_date_iso_date',
  'crs_add_repayment_final_date_iso_date',
  'crs_add_loan_status_year',
  'crs_add_loan_status_currency',
  'crs_add_loan_status_value_date',
  'crs_add_loan_status_interest_received',
  'crs_add_loan_status_principal_outstanding',
  'crs_add_loan_status_principal_arrears',
  'crs_add_loan_status_interest_arrears',
  // Last updated (for change detection)
  'last_updated_datetime',
].join(',')

/**
 * Build Solr filter query (fq) parameters for IATI Datastore filters.
 */
export function buildSolrFilterQuery(filters: DatastoreFilters): string[] {
  const fq: string[] = []

  if (filters.country) {
    const mode = filters.countryFilterMode || 'both'
    const code = filters.country

    if (mode === 'activity') {
      fq.push(`recipient_country_code:${code}`)
    } else if (mode === 'transaction') {
      fq.push(`transaction_recipient_country_code:${code}`)
    } else {
      fq.push(`(recipient_country_code:${code} OR transaction_recipient_country_code:${code})`)
    }
  }

  if (filters.hierarchy != null) {
    fq.push(`hierarchy:${filters.hierarchy}`)
  }

  if (filters.dateStart || filters.dateEnd) {
    const start = filters.dateStart ? `${filters.dateStart}T00:00:00Z` : '*'
    const end = filters.dateEnd ? `${filters.dateEnd}T23:59:59Z` : '*'
    fq.push(`activity_date_iso_date:[${start} TO ${end}]`)
  }

  return fq
}

/**
 * Parse DatastoreFilters from URL search params.
 */
export function parseFiltersFromParams(searchParams: URLSearchParams): DatastoreFilters {
  const countryFilterMode = searchParams.get('country_filter_mode')
  return {
    country: searchParams.get('country') || undefined,
    countryFilterMode: (countryFilterMode === 'activity' || countryFilterMode === 'transaction' || countryFilterMode === 'both')
      ? countryFilterMode
      : 'both',
    dateStart: searchParams.get('date_start') || undefined,
    dateEnd: searchParams.get('date_end') || undefined,
    hierarchy: searchParams.get('hierarchy') ? parseInt(searchParams.get('hierarchy')!, 10) : undefined,
  }
}

/**
 * Build the Solr query URL base components (reporting_org_ref query + filter query string).
 */
export function buildSolrQueryParts(orgRefs: string[], filters: DatastoreFilters): { refQuery: string, fqString: string } {
  const refQuery = orgRefs.map(ref => `"${ref}"`).join(' OR ')
  const fqParams = buildSolrFilterQuery(filters)
  const fqString = fqParams.length > 0 ? `&${fqParams.map(f => `fq=${encodeURIComponent(f)}`).join('&')}` : ''
  return { refQuery, fqString }
}

/**
 * Quick count query - returns just the total number of activities (no data).
 */
export async function getDatastoreCount(orgRefs: string[], filters: DatastoreFilters, apiKey: string): Promise<number> {
  const { refQuery, fqString } = buildSolrQueryParts(orgRefs, filters)
  const url = `${IATI_DATASTORE_BASE}?q=reporting_org_ref:(${encodeURIComponent(refQuery)})${fqString}&rows=0&wt=json`

  console.log('[Datastore Helpers] Count query:', url.substring(0, 250) + (url.length > 250 ? '...' : ''))

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AIMS-IATI-Import/1.0',
      'Ocp-Apim-Subscription-Key': apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`IATI Datastore returned ${response.status}`)
  }

  const data = await response.json()
  return data.response?.numFound || 0
}

/**
 * Fetch a single page of activities from the IATI Datastore.
 * Returns raw Solr docs and the total count.
 */
export async function fetchDatastorePage(
  orgRefs: string[],
  filters: DatastoreFilters,
  page: number,
  apiKey: string
): Promise<{ docs: any[], numFound: number }> {
  const { refQuery, fqString } = buildSolrQueryParts(orgRefs, filters)
  const start = page * DATASTORE_PAGE_SIZE

  const url = `${IATI_DATASTORE_BASE}?q=reporting_org_ref:(${encodeURIComponent(refQuery)})${fqString}&rows=${DATASTORE_PAGE_SIZE}&start=${start}&wt=json&fl=${encodeURIComponent(DATASTORE_FIELDS)}`

  console.log(`[Datastore Helpers] Fetching page ${page}:`, url.substring(0, 300) + '...')

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), 55000) // 55s timeout (leave buffer for maxDuration)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AIMS-IATI-Import/1.0',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      signal: abortController.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 429) {
        throw new RateLimitError('IATI Datastore rate limit exceeded')
      }
      const errorText = await response.text().catch(() => '')
      console.error('[Datastore Helpers] Datastore error:', response.status, errorText.substring(0, 200))
      throw new Error(`IATI Datastore returned ${response.status}`)
    }

    const data = await response.json()
    return {
      docs: data.response?.docs || [],
      numFound: data.response?.numFound || 0,
    }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Map raw Solr docs to ParsedActivity objects.
 */
export function mapDocsToActivities(docs: any[]): ParsedActivity[] {
  const activities: ParsedActivity[] = []
  for (const doc of docs) {
    activities.push(mapDatastoreDocToParsedActivity(doc))
  }
  return activities
}

/**
 * Mark which activities already exist in the local database.
 */
export async function markExistingActivities(
  supabase: any,
  activities: ParsedActivity[]
): Promise<ParsedActivity[]> {
  if (activities.length === 0) return activities

  const iatiIds = activities
    .map(a => a.iatiIdentifier)
    .filter(Boolean)

  if (iatiIds.length === 0) return activities

  const { data: existing } = await supabase
    .from('activities')
    .select('id, iati_identifier')
    .in('iati_identifier', iatiIds)

  const existingMap = new Map<string, string>()
  if (existing) {
    for (const row of existing) {
      if (row.iati_identifier) existingMap.set(row.iati_identifier, row.id)
    }
  }

  return activities.map(a => ({
    ...a,
    matched: existingMap.has(a.iatiIdentifier),
    matchedActivityId: existingMap.get(a.iatiIdentifier) || undefined,
  }))
}

/** Custom error class for rate limiting so callers can detect 429s */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}
