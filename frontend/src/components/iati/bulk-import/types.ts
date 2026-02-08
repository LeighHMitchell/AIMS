export type BulkImportStep = 'source' | 'preview' | 'rules' | 'import' | 'results'

export type ImportSourceMode = 'datastore' | 'xml_upload'

export interface BulkImportMeta {
  sourceMode: ImportSourceMode
  // File-specific (xml_upload only)
  fileName?: string
  fileSize?: number
  fileHash?: string
  // Common
  iatiVersion?: string
  reportingOrgRef: string
  reportingOrgName: string
  activityCount: number
  // Datastore-specific
  fetchedAt?: string
  /** For super users: import on behalf of this organization */
  organizationId?: string
}

export interface ImportRules {
  activityMatching: 'update_existing' | 'skip_existing' | 'create_new_version'
  transactionHandling: 'replace_all' | 'append_new' | 'skip'
  autoMatchOrganizations: boolean
  /** Enable automatic 24-hour sync with IATI Datastore (only for datastore imports) */
  enableAutoSync?: boolean
}

export const DEFAULT_IMPORT_RULES: ImportRules = {
  activityMatching: 'update_existing',
  transactionHandling: 'replace_all',
  autoMatchOrganizations: true,
  enableAutoSync: false,
}

export interface ValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface ParsedActivity {
  iatiIdentifier: string
  title: string
  description?: string
  status?: string
  planned_start_date?: string
  planned_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  participatingOrgs?: Array<{
    ref?: string
    name: string
    role: string
    type?: string
  }>
  sectors?: Array<{
    code: string
    vocabulary?: string
    percentage?: number
    name?: string
  }>
  recipientCountries?: Array<{
    code: string
    percentage?: number
  }>
  locations?: Array<{
    name?: string
    description?: string
    coordinates?: { latitude: number; longitude: number }
    reach?: string
    exactness?: string
    locationClass?: string
    featureDesignation?: string
  }>
  transactions?: Array<{
    type: string
    date: string
    value: number
    currency: string
    description?: string
    providerOrg?: string
    receiverOrg?: string
    providerOrgRef?: string
    receiverOrgRef?: string
    aidType?: string
    financeType?: string
    flowType?: string
    tiedStatus?: string
    recipientCountryCode?: string
    recipientRegionCode?: string
  }>
  budgets?: Array<{
    type?: string
    status?: string
    periodStart: string
    periodEnd: string
    value: number
    currency: string
    valueDate?: string
  }>
  hierarchy?: number
  matched?: boolean
  matchedActivityId?: string
  validationIssues?: ValidationIssue[]
  financingTerms?: any
  activity_status?: string
  iati_id?: string
  // DAC/CRS classification fields
  collaborationType?: string
  defaultAidType?: string
  defaultFinanceType?: string
  defaultFlowType?: string
  defaultTiedStatus?: string
  // Capital spend
  capitalSpend?: number
  // Planned disbursements
  plannedDisbursements?: Array<{
    type?: string
    periodStart: string
    periodEnd: string
    value: number
    currency: string
    valueDate?: string
  }>
  // Contacts (IATI contact-info)
  contacts?: Array<{
    type?: string // IATI contact type code (1=General, 2=Project Manager, etc.)
    organisationName?: string
    departmentName?: string
    personName?: string
    jobTitle?: string
    telephone?: string
    email?: string
    website?: string
    mailingAddress?: string
  }>
  // Documents (IATI document-link)
  documents?: Array<{
    url: string
    format?: string // MIME type
    title?: string
    description?: string
    categoryCode?: string // IATI document category code
    languageCode?: string
    documentDate?: string
  }>
  // Humanitarian flag
  humanitarian?: boolean
  // Activity scope & language
  activityScope?: string
  language?: string
  // Policy markers
  policyMarkers?: Array<{
    code: string
    vocabulary?: string
    significance?: number
    narrative?: string
  }>
  // Humanitarian scope
  humanitarianScopes?: Array<{
    type: string   // '1' = Emergency, '2' = Appeal
    vocabulary: string
    code: string
    narrative?: string
  }>
  // Tags (including SDGs)
  tags?: Array<{
    code: string
    vocabulary?: string  // '2' = SDG Goal, '3' = SDG Target
    narrative?: string
  }>
  // Related activities
  relatedActivities?: Array<{
    ref: string
    type: string // 1=Parent, 2=Child, 3=Sibling, 4=Co-funded, 5=Third-party
  }>
  // Other identifiers
  otherIdentifiers?: Array<{
    ref: string
    type: string // A1=Internal, A2=CRS, A3=Previous, B1=Donor
    ownerOrgRef?: string
    ownerOrgNarrative?: string
  }>
  // Conditions
  conditionsAttached?: boolean
  conditions?: Array<{
    type: string // 1=Policy, 2=Performance, 3=Fiduciary
    narrative?: string
  }>
  // Recipient regions
  recipientRegions?: Array<{
    code: string
    vocabulary?: string
    percentage?: number
  }>
  // Country budget items
  countryBudgetItems?: {
    vocabulary?: string
    items: Array<{
      code: string
      percentage?: number
      description?: string
    }>
  }
  // FSS (Forward Spending Survey)
  fss?: {
    extractionDate?: string
    priority?: number
    phaseoutYear?: number
    forecasts: Array<{
      year: number
      value: number
      currency?: string
      valueDate?: string
    }>
  }
  // CRS additional data
  crsAdd?: {
    otherFlags?: Array<{
      code: string
      significance: string
    }>
    loanTerms?: {
      rate1?: number
      rate2?: number
      repaymentType?: string
      repaymentPlan?: string
      commitmentDate?: string
      repaymentFirstDate?: string
      repaymentFinalDate?: string
    }
    loanStatus?: Array<{
      year: number
      currency?: string
      valueDate?: string
      interestReceived?: number
      principalOutstanding?: number
      principalArrears?: number
      interestArrears?: number
    }>
  }
  // Last updated datetime (for change detection)
  lastUpdatedDatetime?: string
}

export interface BatchStatus {
  id: string
  sourceMode?: ImportSourceMode
  fileName?: string
  fileHash?: string
  iatiVersion?: string
  reportingOrgRef: string
  reportingOrgName: string
  totalActivities: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  status: 'pending' | 'validating' | 'validated' | 'importing' | 'completed' | 'failed' | 'cancelled'
  importRules: ImportRules
  errorMessage?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
  items: BatchItemStatus[]
}

export interface ImportDetails {
  // Expected totals (from source data)
  budgetsTotal?: number
  organizationsTotal?: number
  sectorsTotal?: number
  locationsTotal?: number
  contactsTotal?: number
  documentsTotal?: number
  policyMarkersTotal?: number
  humanitarianScopesTotal?: number
  tagsTotal?: number
  // Imported counts
  budgets?: number
  organizations?: number
  sectors?: number
  locations?: number
  contacts?: number
  documents?: number
  policyMarkers?: number
  humanitarianScopes?: number
  tags?: number
  // Results framework
  results?: number
  indicators?: number
  periods?: number
}

export interface BatchItemStatus {
  id: string
  batchId: string
  iatiIdentifier: string
  activityTitle: string
  activityId?: string
  action: 'create' | 'update' | 'skip' | 'fail' | 'pending'
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'skipped'
  transactionsCount: number
  transactionsImported: number
  importDetails?: ImportDetails
  errorMessage?: string
  validationIssues?: ValidationIssue[]
  completedAt?: string
}

export interface BulkImportState {
  step: BulkImportStep
  sourceMode: ImportSourceMode
  file: File | null
  meta: BulkImportMeta | null
  parsedActivities: ParsedActivity[]
  allParsedData: any | null
  selectedActivityIds: Set<string>
  importRules: ImportRules
  batchId: string | null
  batchStatus: BatchStatus | null
  validationSummary: {
    total: number
    valid: number
    warnings: number
    errors: number
  } | null
  fetchStatus: 'idle' | 'fetching' | 'success' | 'error'
  fetchError: string | null
}

export interface ImpactPreview {
  toCreate: number
  toUpdate: number
  toSkip: number
  totalTransactions: number
}
