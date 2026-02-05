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
}

export interface ImportRules {
  activityMatching: 'update_existing' | 'skip_existing' | 'create_new_version'
  transactionHandling: 'replace_all' | 'append_new' | 'skip'
  autoMatchOrganizations: boolean
}

export const DEFAULT_IMPORT_RULES: ImportRules = {
  activityMatching: 'update_existing',
  transactionHandling: 'replace_all',
  autoMatchOrganizations: true,
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
  }>
  budgets?: Array<{
    type?: string
    periodStart: string
    periodEnd: string
    value: number
    currency: string
  }>
  hierarchy?: number
  matched?: boolean
  matchedActivityId?: string
  validationIssues?: ValidationIssue[]
  financingTerms?: any
  activity_status?: string
  iati_id?: string
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
  errorMessage?: string
  validationIssues?: ValidationIssue[]
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
