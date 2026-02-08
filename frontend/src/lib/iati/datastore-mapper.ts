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
  // Note: IATI Datastore Solr API does NOT return sector_percentage
  // Use d-portal API (dportal-mapper.ts) for complete data with percentages
  const sectorCodes = ensureArray(doc.sector_code)
  const sectorVocabs = ensureArray(doc.sector_vocabulary)
  const sectorPcts = ensureArray(doc.sector_percentage)
  const sectorNames = ensureArray(doc.sector_narrative)

  const sectors: ParsedActivity['sectors'] = sectorCodes.map(
    (code: string, i: number) => ({
      code: String(code),
      vocabulary: sectorVocabs[i] || undefined,
      percentage: sectorPcts[i] != null && !isNaN(parseFloat(sectorPcts[i])) ? parseFloat(sectorPcts[i]) : undefined,
      name: sectorNames[i] || undefined,
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
  const budgetStatuses = ensureArray(doc.budget_status)
  const budgetValueDates = ensureArray(doc.budget_value_value_date)
  const budgets: ParsedActivity['budgets'] = budgetValues
    .map((val: any, i: number) => {
      const parsed = parseFloat(val)
      if (isNaN(parsed)) return null
      return {
        type: budgetTypes[i] || undefined,
        status: budgetStatuses[i] || undefined,
        periodStart: budgetStarts[i] || '',
        periodEnd: budgetEnds[i] || '',
        value: parsed,
        currency: budgetCurrencies[i] || defaultCurrency,
        valueDate: budgetValueDates[i] || undefined,
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

  // --- Locations ---
  // IATI Datastore fields: location_point_pos (format: "lat lng"), location_name, location_description
  const locationPositions = ensureArray(doc.location_point_pos)
  const locationNames = ensureArray(doc.location_name_narrative)
  const locationDescriptions = ensureArray(doc.location_description_narrative)
  const locationReaches = ensureArray(doc.location_reach_code)
  const locationExactnesses = ensureArray(doc.location_exactness_code)
  const locationClasses = ensureArray(doc.location_location_class_code)
  const locationFeatureDesignations = ensureArray(doc.location_feature_designation_code)

  const locations: ParsedActivity['locations'] = locationPositions
    .map((pos: string, i: number) => {
      if (!pos) return null
      // Parse "lat lng" format (e.g., "43.8562586 18.4130763")
      const parts = pos.trim().split(/\s+/)
      if (parts.length < 2) return null
      const latitude = parseFloat(parts[0])
      const longitude = parseFloat(parts[1])
      if (isNaN(latitude) || isNaN(longitude)) return null
      return {
        name: locationNames[i] || undefined,
        description: locationDescriptions[i] || undefined,
        coordinates: { latitude, longitude },
        reach: locationReaches[i] || undefined,
        exactness: locationExactnesses[i] || undefined,
        locationClass: locationClasses[i] || undefined,
        featureDesignation: locationFeatureDesignations[i] || undefined,
      }
    })
    .filter(Boolean) as NonNullable<ParsedActivity['locations']>

  // --- DAC/CRS Classification Fields ---
  const collaborationType = doc.collaboration_type_code || undefined
  const defaultAidType = ensureArray(doc.default_aid_type_code)[0] || undefined
  const defaultFinanceType = ensureArray(doc.default_finance_type_code)[0] || undefined
  const defaultFlowType = ensureArray(doc.default_flow_type_code)[0] || undefined
  const defaultTiedStatus = ensureArray(doc.default_tied_status_code)[0] || undefined

  // Note: capital_spend and planned_disbursement are NOT indexed in IATI Datastore
  // They're only available via XML upload (d-portal mapper handles them)

  // --- Humanitarian flag ---
  const humanitarian = doc.humanitarian === true || doc.humanitarian === 'true' || doc.humanitarian === '1'

  // --- Activity scope & language ---
  const activityScope = doc.activity_scope_code ? String(doc.activity_scope_code) : undefined
  const language = doc.default_lang ? String(doc.default_lang) : undefined

  // --- Policy markers ---
  const pmCodes = ensureArray(doc.policy_marker_code)
  const pmVocabs = ensureArray(doc.policy_marker_vocabulary)
  const pmSignificances = ensureArray(doc.policy_marker_significance)
  const pmNarratives = ensureArray(doc.policy_marker_narrative)

  const policyMarkers = pmCodes.map((code: string, i: number) => ({
    code: String(code),
    vocabulary: pmVocabs[i] ? String(pmVocabs[i]) : '1',
    significance: pmSignificances[i] != null ? Number(pmSignificances[i]) : undefined,
    narrative: pmNarratives[i] || undefined,
  })).filter((pm: any) => pm.code)

  // --- Humanitarian scope ---
  const hsCodes = ensureArray(doc.humanitarian_scope_code)
  const hsTypes = ensureArray(doc.humanitarian_scope_type)
  const hsVocabs = ensureArray(doc.humanitarian_scope_vocabulary)
  const hsNarratives = ensureArray(doc.humanitarian_scope_narrative)

  const humanitarianScopes = hsCodes.map((code: string, i: number) => ({
    type: hsTypes[i] ? String(hsTypes[i]) : '1',
    vocabulary: hsVocabs[i] ? String(hsVocabs[i]) : '1-2',
    code: String(code),
    narrative: hsNarratives[i] || undefined,
  })).filter((hs: any) => hs.code)

  // --- Tags (including SDGs) ---
  const tagCodes = ensureArray(doc.tag_code)
  const tagVocabs = ensureArray(doc.tag_vocabulary)
  const tagNarratives = ensureArray(doc.tag_narrative)

  const tags = tagCodes.map((code: string, i: number) => ({
    code: String(code),
    vocabulary: tagVocabs[i] ? String(tagVocabs[i]) : '99',
    narrative: tagNarratives[i] || undefined,
  })).filter((t: any) => t.code)

  // --- Contacts (contact-info) ---
  // IATI Datastore fields: contact_info_type, contact_info_organisation_narrative,
  // contact_info_department_narrative, contact_info_person_name_narrative,
  // contact_info_job_title_narrative, contact_info_telephone, contact_info_email,
  // contact_info_website, contact_info_mailing_address_narrative
  const contactTypes = ensureArray(doc.contact_info_type)
  const contactOrgs = ensureArray(doc.contact_info_organisation_narrative)
  const contactDepts = ensureArray(doc.contact_info_department_narrative)
  const contactPersons = ensureArray(doc.contact_info_person_name_narrative)
  const contactJobTitles = ensureArray(doc.contact_info_job_title_narrative)
  const contactPhones = ensureArray(doc.contact_info_telephone)
  const contactEmails = ensureArray(doc.contact_info_email)
  const contactWebsites = ensureArray(doc.contact_info_website)
  const contactAddresses = ensureArray(doc.contact_info_mailing_address_narrative)

  // Use the longest array as the anchor (contacts may have sparse data)
  const contactCount = Math.max(
    contactTypes.length, contactOrgs.length, contactPersons.length,
    contactEmails.length, contactPhones.length
  )
  const contacts: ParsedActivity['contacts'] = []
  for (let i = 0; i < contactCount; i++) {
    // Only add if we have at least some useful data
    if (contactOrgs[i] || contactPersons[i] || contactEmails[i] || contactPhones[i]) {
      contacts.push({
        type: contactTypes[i] || undefined,
        organisationName: contactOrgs[i] || undefined,
        departmentName: contactDepts[i] || undefined,
        personName: contactPersons[i] || undefined,
        jobTitle: contactJobTitles[i] || undefined,
        telephone: contactPhones[i] || undefined,
        email: contactEmails[i] || undefined,
        website: contactWebsites[i] || undefined,
        mailingAddress: contactAddresses[i] || undefined,
      })
    }
  }

  // --- Documents (document-link) ---
  // IATI Datastore fields: document_link_url, document_link_format,
  // document_link_title_narrative, document_link_description_narrative,
  // document_link_category_code, document_link_language_code, document_link_document_date_iso_date
  const docUrls = ensureArray(doc.document_link_url)
  const docFormats = ensureArray(doc.document_link_format)
  const docTitles = ensureArray(doc.document_link_title_narrative)
  const docDescriptions = ensureArray(doc.document_link_description_narrative)
  const docCategories = ensureArray(doc.document_link_category_code)
  const docLanguages = ensureArray(doc.document_link_language_code)
  const docDates = ensureArray(doc.document_link_document_date_iso_date)

  const documents: ParsedActivity['documents'] = docUrls
    .map((url: string, i: number) => {
      if (!url) return null
      return {
        url,
        format: docFormats[i] || undefined,
        title: docTitles[i] || undefined,
        description: docDescriptions[i] || undefined,
        categoryCode: docCategories[i] || undefined,
        languageCode: docLanguages[i] || undefined,
        documentDate: docDates[i] || undefined,
      }
    })
    .filter(Boolean) as NonNullable<ParsedActivity['documents']>

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
    locations: locations.length > 0 ? locations : undefined,
    // DAC/CRS classification
    collaborationType: collaborationType ? String(collaborationType) : undefined,
    defaultAidType: defaultAidType ? String(defaultAidType) : undefined,
    defaultFinanceType: defaultFinanceType ? String(defaultFinanceType) : undefined,
    defaultFlowType: defaultFlowType ? String(defaultFlowType) : undefined,
    defaultTiedStatus: defaultTiedStatus ? String(defaultTiedStatus) : undefined,
    // Contacts and documents
    contacts: contacts.length > 0 ? contacts : undefined,
    documents: documents.length > 0 ? documents : undefined,
    // Humanitarian flag, scope, language
    humanitarian,
    activityScope,
    language,
    // Policy markers, humanitarian scope, tags
    policyMarkers: policyMarkers.length > 0 ? policyMarkers : undefined,
    humanitarianScopes: humanitarianScopes.length > 0 ? humanitarianScopes : undefined,
    tags: tags.length > 0 ? tags : undefined,
    // Note: capitalSpend and plannedDisbursements are not available from IATI Datastore
    // They're only available via XML upload (see dportal-mapper.ts)
  }

  // Attach reporting-org ref for org-scope verification
  ;(activity as any)._reportingOrgRef =
    ensureArray(doc.reporting_org_ref)[0] || ''

  return activity
}
