/**
 * IATI Auto-Sync Service
 *
 * Provides helper functions for the daily IATI sync cron job.
 * Fetches activities from the IATI Datastore API and syncs them
 * with local database records.
 *
 * Reuses patterns from:
 * - fetch-org-activities/route.ts (Solr query, pagination, rate limiting)
 * - bulk-import/route.ts (child record insert patterns, USD conversion)
 * - datastore-mapper.ts (mapDatastoreDocToParsedActivity)
 */

import { mapDatastoreDocToParsedActivity } from '@/lib/iati/datastore-mapper'
import { convertTransactionToUSD, addUSDFieldsToTransaction } from '@/lib/transaction-usd-helper'
import { getOrCreateOrganization } from '@/lib/organization-helpers'
import { getOrCreateContact, contactDedupKey } from '@/lib/contact-helpers'
import type { ParsedActivity } from '@/components/iati/bulk-import/types'
import type { SupabaseClient } from '@supabase/supabase-js'

// IATI Datastore Solr endpoint
const IATI_DATASTORE_BASE = 'https://api.iatistandard.org/datastore/activity/select'

// All fields we need from the Datastore (same as fetch-org-activities)
const DATASTORE_FIELDS = [
  'iati_identifier',
  'title_narrative',
  'description_narrative',
  'activity_status_code',
  'hierarchy',
  'default_currency',
  'activity_date_type',
  'activity_date_iso_date',
  'recipient_country_code',
  'recipient_country_percentage',
  'sector_code',
  'sector_vocabulary',
  'sector_narrative',
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
  'participating_org_ref',
  'participating_org_narrative',
  'participating_org_role',
  'participating_org_type',
  'budget_value',
  'budget_value_currency',
  'budget_period_start_iso_date',
  'budget_period_end_iso_date',
  'budget_type',
  'budget_status',
  'budget_value_value_date',
  'location_point_pos',
  'location_name_narrative',
  'location_description_narrative',
  'location_reach_code',
  'location_exactness_code',
  'location_location_class_code',
  'location_feature_designation_code',
  'collaboration_type_code',
  'default_aid_type_code',
  'default_finance_type_code',
  'default_flow_type_code',
  'default_tied_status_code',
  'contact_info_type',
  'contact_info_organisation_narrative',
  'contact_info_department_narrative',
  'contact_info_person_name_narrative',
  'contact_info_job_title_narrative',
  'contact_info_telephone',
  'contact_info_email',
  'contact_info_website',
  'contact_info_mailing_address_narrative',
  'document_link_url',
  'document_link_format',
  'document_link_title_narrative',
  'document_link_description_narrative',
  'document_link_category_code',
  'document_link_language_code',
  'document_link_document_date_iso_date',
  'reporting_org_ref',
  'reporting_org_narrative',
  'humanitarian',
  'activity_scope_code',
  'default_lang',
  'policy_marker_code',
  'policy_marker_vocabulary',
  'policy_marker_significance',
  'policy_marker_narrative',
  'humanitarian_scope_type',
  'humanitarian_scope_vocabulary',
  'humanitarian_scope_code',
  'humanitarian_scope_narrative',
  'tag_code',
  'tag_vocabulary',
  'tag_narrative',
].join(',')

export interface SyncResult {
  action: 'updated' | 'unchanged' | 'skipped' | 'failed'
  fieldsChanged: string[]
  error?: string
}

/**
 * Map IATI organisation role code to database role_type.
 * IATI codes: 1=Funding, 2=Accountable, 3=Extending, 4=Implementing
 */
function mapIatiRoleToRoleType(iatiRoleCode: string | undefined): string {
  switch (iatiRoleCode) {
    case '1': return 'funding'
    case '2': return 'government'
    case '3': return 'extending'
    case '4': return 'implementing'
    default: return 'implementing'
  }
}

/**
 * Batch insert with fallback: if batch fails, try individual inserts.
 */
async function batchInsertWithFallback(
  supabase: SupabaseClient,
  table: string,
  records: any[],
  label: string
): Promise<number> {
  if (records.length === 0) return 0

  const { error } = await supabase.from(table).insert(records)
  if (!error) return records.length

  console.warn(`[IATI Sync] Batch ${label} insert failed, falling back to individual:`, error.message)
  let count = 0
  for (const record of records) {
    const { error: singleError } = await supabase.from(table).insert(record)
    if (singleError) {
      console.error(`[IATI Sync] ${label} individual insert error:`, singleError.message)
    } else {
      count++
    }
  }
  return count
}

// USD rate cache for a single sync run
const rateCache = new Map<string, any>()

async function getCachedUSDConversion(value: number, currency: string, date: string) {
  const key = `${currency}_${date}`
  if (!rateCache.has(key)) {
    rateCache.set(key, await convertTransactionToUSD(1, currency, date))
  }
  const unitRate = rateCache.get(key)
  if (!unitRate || unitRate.value_usd == null) {
    return await convertTransactionToUSD(value, currency, date)
  }
  return {
    ...unitRate,
    value_usd: unitRate.value_usd * value,
  }
}

/**
 * Fetch a single activity by IATI identifier from the IATI Datastore.
 * Much faster than fetchActivitiesFromDatastore() which fetches ALL org activities.
 * Returns null if the activity is not found.
 */
export async function fetchSingleActivityFromDatastore(
  iatiIdentifier: string,
  apiKey: string
): Promise<ParsedActivity | null> {
  const url = `${IATI_DATASTORE_BASE}?q=iati_identifier:"${encodeURIComponent(iatiIdentifier)}"&rows=1&wt=json&fl=${encodeURIComponent(DATASTORE_FIELDS)}`

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), 30000)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AIMS-IATI-Sync/1.0',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      signal: abortController.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`IATI Datastore returned ${response.status}`)
    }

    const data = await response.json()
    const docs = data.response?.docs || []

    if (docs.length === 0) return null

    return mapDatastoreDocToParsedActivity(docs[0])
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Fetch all activities for a reporting org from the IATI Datastore.
 * Paginates with 1000/page, 13s delay between pages, 60s timeout per request.
 */
export async function fetchActivitiesFromDatastore(
  orgRef: string,
  apiKey: string
): Promise<ParsedActivity[]> {
  const PAGE_SIZE = 1000
  const MAX_RETRIES = 10
  const activities: ParsedActivity[] = []

  let start = 0
  let total = Infinity
  let retryCount = 0

  while (start < total) {
    const url = `${IATI_DATASTORE_BASE}?q=reporting_org_ref:"${encodeURIComponent(orgRef)}"&rows=${PAGE_SIZE}&start=${start}&wt=json&fl=${encodeURIComponent(DATASTORE_FIELDS)}`

    if (start === 0) {
      console.log(`[IATI Sync] Fetching activities for org: ${orgRef}`)
    }

    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 60000)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AIMS-IATI-Sync/1.0',
          'Ocp-Apim-Subscription-Key': apiKey,
        },
        signal: abortController.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 429) {
          retryCount++
          if (retryCount > MAX_RETRIES) {
            throw new Error('IATI Datastore rate limit exceeded after multiple retries')
          }
          const waitTime = Math.min(2000 * retryCount, 15000)
          console.log(`[IATI Sync] Rate limited, retry ${retryCount}/${MAX_RETRIES}, waiting ${waitTime / 1000}s...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
        throw new Error(`IATI Datastore returned ${response.status}`)
      }

      retryCount = 0
      const data = await response.json()
      const docs = data.response?.docs || []
      total = data.response?.numFound || 0

      console.log(`[IATI Sync] Page ${start / PAGE_SIZE + 1}: ${docs.length} docs (total: ${total})`)

      for (const doc of docs) {
        activities.push(mapDatastoreDocToParsedActivity(doc))
      }

      start += PAGE_SIZE

      // 13s delay between pages to respect rate limits (5 calls/min)
      if (start < total) {
        console.log(`[IATI Sync] Fetched ${Math.min(start, total)}/${total}, waiting 13s for rate limit...`)
        await new Promise(resolve => setTimeout(resolve, 13000))
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  return activities
}

/**
 * Build the activity update data from a ParsedActivity.
 * Maps ParsedActivity fields to database column names.
 */
function buildActivityUpdateData(iatiActivity: ParsedActivity): Record<string, any> {
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (iatiActivity.title) updateData.title_narrative = iatiActivity.title
  if (iatiActivity.description) updateData.description_narrative = iatiActivity.description
  if (iatiActivity.activity_status) updateData.activity_status = iatiActivity.activity_status
  if (iatiActivity.planned_start_date) updateData.planned_start_date = iatiActivity.planned_start_date
  if (iatiActivity.planned_end_date) updateData.planned_end_date = iatiActivity.planned_end_date
  if (iatiActivity.actual_start_date) updateData.actual_start_date = iatiActivity.actual_start_date
  if (iatiActivity.actual_end_date) updateData.actual_end_date = iatiActivity.actual_end_date
  if (iatiActivity.hierarchy != null) updateData.hierarchy = iatiActivity.hierarchy
  if (iatiActivity.recipientCountries) updateData.recipient_countries = iatiActivity.recipientCountries
  if (iatiActivity.collaborationType) updateData.collaboration_type = iatiActivity.collaborationType
  if (iatiActivity.defaultAidType) updateData.default_aid_type = iatiActivity.defaultAidType
  if (iatiActivity.defaultFinanceType) updateData.default_finance_type = iatiActivity.defaultFinanceType
  if (iatiActivity.defaultFlowType) updateData.default_flow_type = iatiActivity.defaultFlowType
  if (iatiActivity.defaultTiedStatus) updateData.default_tied_status = iatiActivity.defaultTiedStatus
  if (iatiActivity.humanitarian != null) updateData.humanitarian = iatiActivity.humanitarian
  if (iatiActivity.activityScope) updateData.activity_scope = iatiActivity.activityScope
  if (iatiActivity.language) updateData.language = iatiActivity.language

  return updateData
}

/**
 * Compare whether a specific sync field group has changed between local and IATI data.
 */
function hasFieldChanged(
  field: string,
  localActivity: any,
  iatiActivity: ParsedActivity
): boolean {
  switch (field) {
    case 'title':
      return iatiActivity.title !== undefined &&
        iatiActivity.title !== localActivity.title_narrative
    case 'description':
      return iatiActivity.description !== undefined &&
        iatiActivity.description !== localActivity.description_narrative
    case 'status':
      return iatiActivity.activity_status !== undefined &&
        iatiActivity.activity_status !== localActivity.activity_status
    case 'dates':
      return (
        (iatiActivity.planned_start_date !== undefined &&
          iatiActivity.planned_start_date !== localActivity.planned_start_date) ||
        (iatiActivity.planned_end_date !== undefined &&
          iatiActivity.planned_end_date !== localActivity.planned_end_date) ||
        (iatiActivity.actual_start_date !== undefined &&
          iatiActivity.actual_start_date !== localActivity.actual_start_date) ||
        (iatiActivity.actual_end_date !== undefined &&
          iatiActivity.actual_end_date !== localActivity.actual_end_date)
      )
    case 'transactions':
      return (iatiActivity.transactions?.length || 0) !== (localActivity._txCount ?? 0)
    case 'budgets':
      return (iatiActivity.budgets?.length || 0) !== (localActivity._budgetCount ?? 0)
    case 'sectors':
      return (iatiActivity.sectors?.length || 0) !== (localActivity._sectorCount ?? 0)
    case 'organizations':
      return (iatiActivity.participatingOrgs?.length || 0) !== (localActivity._orgCount ?? 0)
    case 'locations':
      return (iatiActivity.locations?.length || 0) !== (localActivity._locationCount ?? 0)
    case 'contacts':
      return (iatiActivity.contacts?.length || 0) !== (localActivity._contactCount ?? 0)
    case 'documents':
      return (iatiActivity.documents?.length || 0) !== (localActivity._documentCount ?? 0)
    case 'countries':
      return JSON.stringify(iatiActivity.recipientCountries || []) !==
        JSON.stringify(localActivity.recipient_countries || [])
    case 'policy_markers':
      return (iatiActivity.policyMarkers?.length || 0) !== (localActivity._policyMarkerCount ?? 0)
    case 'planned_disbursements':
      return (iatiActivity.plannedDisbursements?.length || 0) !== (localActivity._plannedDisbursementCount ?? 0)
    default:
      return false
  }
}

/**
 * Sync a single activity from IATI Datastore data into the local database.
 *
 * Compares fields listed in syncFields, and if any differences are found,
 * updates the activity record and replaces child records.
 */
export async function syncSingleActivity(
  supabase: SupabaseClient,
  localActivity: any,
  iatiActivity: ParsedActivity,
  syncFields: string[] | null
): Promise<SyncResult> {
  const fields = syncFields || ['title', 'description', 'status', 'dates']
  const activityId = localActivity.id

  try {
    // Determine which fields have changed
    const changedFields = fields.filter(f => hasFieldChanged(f, localActivity, iatiActivity))

    if (changedFields.length === 0) {
      // No changes — just update last_sync_time
      await supabase
        .from('activities')
        .update({
          last_sync_time: new Date().toISOString(),
          sync_status: 'live',
        })
        .eq('id', activityId)

      return { action: 'unchanged', fieldsChanged: [] }
    }

    console.log(`[IATI Sync] Activity ${localActivity.iati_identifier}: changes in [${changedFields.join(', ')}]`)

    // Build the basic activity update
    const updateData = buildActivityUpdateData(iatiActivity)
    updateData.last_sync_time = new Date().toISOString()
    updateData.sync_status = 'live'

    // Update the activity record
    const { error: updateError } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', activityId)

    if (updateError) {
      throw new Error(`Activity update failed: ${updateError.message}`)
    }

    // Replace child records for changed field groups
    const now = new Date().toISOString()

    // --- Transactions ---
    if (changedFields.includes('transactions') && iatiActivity.transactions?.length) {
      await supabase.from('transactions').delete().eq('activity_id', activityId)

      const txRecords: any[] = []
      for (const tx of iatiActivity.transactions) {
        const currency = tx.currency || 'USD'
        const txValue = parseFloat(String(tx.value))
        if (isNaN(txValue)) continue
        const txDate = tx.date || ''

        let providerOrgId: string | null = null
        let receiverOrgId: string | null = null
        if (tx.providerOrgRef || tx.providerOrg) {
          providerOrgId = await getOrCreateOrganization(supabase, {
            ref: tx.providerOrgRef,
            name: tx.providerOrg,
          })
        }
        if (tx.receiverOrgRef || tx.receiverOrg) {
          receiverOrgId = await getOrCreateOrganization(supabase, {
            ref: tx.receiverOrgRef,
            name: tx.receiverOrg,
          })
        }

        const transactionData: any = {
          activity_id: activityId,
          transaction_type: tx.type,
          transaction_date: txDate,
          value: txValue,
          currency,
          status: 'actual',
          value_date: txDate,
          description: tx.description || null,
          provider_org_id: providerOrgId,
          provider_org_ref: tx.providerOrgRef || null,
          provider_org_name: tx.providerOrg || null,
          receiver_org_id: receiverOrgId,
          receiver_org_ref: tx.receiverOrgRef || null,
          receiver_org_name: tx.receiverOrg || null,
          activity_iati_ref: localActivity.iati_identifier,
          created_at: now,
          updated_at: now,
        }

        const usdResult = await getCachedUSDConversion(txValue, currency, txDate)
        txRecords.push(addUSDFieldsToTransaction(transactionData, usdResult))
      }

      await batchInsertWithFallback(supabase, 'transactions', txRecords, 'transaction')
    }

    // --- Budgets ---
    if (changedFields.includes('budgets') && iatiActivity.budgets?.length) {
      await supabase.from('activity_budgets').delete().eq('activity_id', activityId)

      const budgetRecords: any[] = []
      for (const budget of iatiActivity.budgets) {
        const periodStart = budget.periodStart?.includes('T') ? budget.periodStart.split('T')[0] : budget.periodStart || null
        const periodEnd = budget.periodEnd?.includes('T') ? budget.periodEnd.split('T')[0] : budget.periodEnd || null
        const budgetValue = parseFloat(String(budget.value))
        if (isNaN(budgetValue)) continue
        const rawValueDate = budget.valueDate || budget.periodStart
        const valueDate = rawValueDate?.includes('T') ? rawValueDate.split('T')[0] : rawValueDate || periodStart

        budgetRecords.push({
          activity_id: activityId,
          type: Number(budget.type) || 1,
          status: Number(budget.status) || 1,
          period_start: periodStart,
          period_end: periodEnd,
          value: budgetValue,
          currency: budget.currency || 'USD',
          value_date: valueDate,
          created_at: now,
          updated_at: now,
        })
      }

      await batchInsertWithFallback(supabase, 'activity_budgets', budgetRecords, 'budget')
    }

    // --- Sectors ---
    if (changedFields.includes('sectors') && iatiActivity.sectors?.length) {
      await supabase.from('activity_sectors').delete().eq('activity_id', activityId)

      const importableSectors = iatiActivity.sectors.filter(
        (s: any) => !s.vocabulary || s.vocabulary === '1' || s.vocabulary === '2' || s.vocabulary === '99'
      )
      const totalPct = importableSectors.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0)
      const needsDistribution = totalPct === 0 && importableSectors.length > 0
      const equalPct = needsDistribution ? Math.round(100 / importableSectors.length * 100) / 100 : 0

      const sectorRecords: any[] = []
      for (const sector of importableSectors) {
        const sectorCode = String(sector.code)
        const categoryCode = sectorCode.substring(0, 3)
        const percentage = sector.percentage ?? equalPct

        sectorRecords.push({
          activity_id: activityId,
          sector_code: sectorCode,
          sector_name: sector.name || `Sector ${sectorCode}`,
          percentage,
          level: sectorCode.length === 5 ? 'subsector' : 'category',
          category_code: categoryCode,
          category_name: sector.name ? sector.name.split(' - ')[0] : null,
          type: 'secondary',
          sector_vocabulary: sector.vocabulary || '1',
          created_at: now,
          updated_at: now,
        })
      }

      await batchInsertWithFallback(supabase, 'activity_sectors', sectorRecords, 'sector')
    }

    // --- Participating Organizations ---
    if (changedFields.includes('organizations') && iatiActivity.participatingOrgs?.length) {
      await supabase.from('activity_participating_organizations').delete().eq('activity_id', activityId)

      const poRecords: any[] = []
      for (const org of iatiActivity.participatingOrgs) {
        let matchedOrgId: string | null = null
        if (org.ref) {
          matchedOrgId = await getOrCreateOrganization(supabase, {
            ref: org.ref,
            name: org.name || 'Unknown',
            type: org.type,
          })
        }

        poRecords.push({
          activity_id: activityId,
          organization_id: matchedOrgId,
          role_type: mapIatiRoleToRoleType(org.role),
          iati_role_code: org.role ? Number(org.role) : null,
          iati_org_ref: org.ref || null,
          org_type: org.type || null,
          narrative: org.name || null,
          created_at: now,
          updated_at: now,
        })
      }

      await batchInsertWithFallback(supabase, 'activity_participating_organizations', poRecords, 'participating org')
    }

    // --- Locations ---
    if (changedFields.includes('locations') && iatiActivity.locations?.length) {
      await supabase.from('activity_locations').delete().eq('activity_id', activityId)

      const locationRecords: any[] = []
      for (const loc of iatiActivity.locations) {
        if (!loc.coordinates?.latitude || !loc.coordinates?.longitude) continue

        locationRecords.push({
          activity_id: activityId,
          location_type: 'site',
          location_name: loc.name || 'Imported Location',
          description: loc.description || null,
          latitude: loc.coordinates.latitude,
          longitude: loc.coordinates.longitude,
          source: 'iati_import',
          location_reach: loc.reach || null,
          exactness: loc.exactness || null,
          location_class: loc.locationClass || null,
          feature_designation: loc.featureDesignation || null,
          srs_name: 'http://www.opengis.net/def/crs/EPSG/0/4326',
          created_at: now,
          updated_at: now,
        })
      }

      await batchInsertWithFallback(supabase, 'activity_locations', locationRecords, 'location')
    }

    // --- Contacts (only imported_from_iati records, normalized via contacts table) ---
    if (changedFields.includes('contacts') && iatiActivity.contacts?.length) {
      await supabase.from('activity_contacts').delete()
        .eq('activity_id', activityId)
        .eq('imported_from_iati', true)

      const contactRecords: any[] = []
      for (const contact of iatiActivity.contacts) {
        let firstName: string | null = null
        let lastName: string | null = null
        if (contact.personName) {
          const nameParts = contact.personName.trim().split(/\s+/)
          if (nameParts.length >= 2) {
            firstName = nameParts[0]
            lastName = nameParts.slice(1).join(' ')
          } else {
            lastName = contact.personName
          }
        }

        // Resolve contact_id via getOrCreateContact
        let resolvedContactId: string | null = null
        try {
          resolvedContactId = await getOrCreateContact(supabase, {
            email: contact.email || undefined,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            jobTitle: contact.jobTitle || undefined,
            position: contact.jobTitle || undefined,
            organisation: contact.organisationName || undefined,
            department: contact.departmentName || undefined,
            phone: contact.telephone || undefined,
            website: contact.website || undefined,
            mailingAddress: contact.mailingAddress || undefined,
          })
        } catch (err) {
          console.warn(`[IATI Sync] Failed to resolve contact, proceeding without contact_id:`, err)
        }

        contactRecords.push({
          activity_id: activityId,
          contact_id: resolvedContactId,
          type: contact.type || '1',
          // Keep old columns during transition period
          organisation_name: contact.organisationName || null,
          department: contact.departmentName || null,
          first_name: firstName,
          last_name: lastName,
          job_title: contact.jobTitle || null,
          phone_number: contact.telephone || null,
          primary_email: contact.email || null,
          website: contact.website || null,
          mailing_address: contact.mailingAddress || null,
          imported_from_iati: true,
          created_at: now,
          updated_at: now,
        })
      }

      await batchInsertWithFallback(supabase, 'activity_contacts', contactRecords, 'contact')
    }

    // --- Documents (only is_external records) ---
    if (changedFields.includes('documents') && iatiActivity.documents?.length) {
      await supabase.from('activity_documents').delete()
        .eq('activity_id', activityId)
        .eq('is_external', true)

      const documentRecords: any[] = []
      for (const doc of iatiActivity.documents) {
        if (!doc.url) continue

        const titleNarrative = doc.title
          ? [{ text: doc.title, lang: doc.languageCode || 'en' }]
          : [{ text: 'Untitled Document', lang: 'en' }]
        const descriptionNarrative = doc.description
          ? [{ text: doc.description, lang: doc.languageCode || 'en' }]
          : [{ text: '', lang: 'en' }]

        documentRecords.push({
          activity_id: activityId,
          url: doc.url,
          format: doc.format || 'application/octet-stream',
          title: titleNarrative,
          description: descriptionNarrative,
          category_code: doc.categoryCode || 'A01',
          language_codes: doc.languageCode ? [doc.languageCode] : ['en'],
          document_date: doc.documentDate || null,
          is_external: true,
          created_at: now,
          updated_at: now,
        })
      }

      await batchInsertWithFallback(supabase, 'activity_documents', documentRecords, 'document')
    }

    // --- Policy Markers ---
    if (changedFields.includes('policy_markers') && iatiActivity.policyMarkers?.length) {
      await supabase.from('activity_policy_markers').delete().eq('activity_id', activityId)

      const pmRecords: any[] = []
      for (const pm of iatiActivity.policyMarkers) {
        const { data: marker } = await supabase
          .from('policy_markers')
          .select('id')
          .eq('iati_code', pm.code)
          .limit(1)
          .single()

        if (marker) {
          pmRecords.push({
            activity_id: activityId,
            policy_marker_id: marker.id,
            significance: pm.significance ?? 0,
            created_at: now,
            updated_at: now,
          })
        }
      }

      await batchInsertWithFallback(supabase, 'activity_policy_markers', pmRecords, 'policy marker')
    }

    // --- Planned Disbursements ---
    if (changedFields.includes('planned_disbursements') && iatiActivity.plannedDisbursements?.length) {
      await supabase.from('planned_disbursements').delete().eq('activity_id', activityId)

      const pdRecords: any[] = []
      for (const pd of iatiActivity.plannedDisbursements) {
        const periodStart = pd.periodStart?.includes('T') ? pd.periodStart.split('T')[0] : pd.periodStart || null
        const periodEnd = pd.periodEnd?.includes('T') ? pd.periodEnd.split('T')[0] : pd.periodEnd || null
        const pdValue = parseFloat(String(pd.value))
        if (isNaN(pdValue)) continue

        pdRecords.push({
          activity_id: activityId,
          type: Number(pd.type) || 1,
          period_start: periodStart,
          period_end: periodEnd,
          value: pdValue,
          currency: pd.currency || 'USD',
          value_date: pd.valueDate || periodStart,
          created_at: now,
          updated_at: now,
        })
      }

      await batchInsertWithFallback(supabase, 'planned_disbursements', pdRecords, 'planned disbursement')
    }

    return { action: 'updated', fieldsChanged: changedFields }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[IATI Sync] Error syncing activity ${localActivity.iati_identifier}:`, errorMsg)
    return { action: 'failed', fieldsChanged: [], error: errorMsg }
  }
}

/**
 * Clear the USD rate cache. Should be called at the start of each sync run.
 */
export function clearRateCache() {
  rateCache.clear()
}
