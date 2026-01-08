/**
 * Types for the Individual User Dashboard
 * All data is scoped to the logged-in user's organization
 */

// Recency item for last created/edited activities
export interface RecencyItem {
  id: string;
  title: string;
  timestamp: string;
  iatiIdentifier?: string;
}

// Extended recency item for edited activities with user context
export interface EditedRecencyItem extends RecencyItem {
  editedByYou: boolean;
  editedByName?: string;
}

// Validation event types matching government endorsement statuses
export type ValidationEventType = 'validated' | 'rejected' | 'more_info_requested' | 'submitted';

// Validation event for last validation activity
export interface ValidationEvent {
  activityId: string;
  activityTitle: string;
  eventType: ValidationEventType;
  timestamp: string;
  validatingAuthority?: string;
}

// Organization dashboard statistics
export interface OrgDashboardStats {
  totalActivities: number;
  unpublishedCount: number;
  pendingValidationCount: number;
  validatedCount: number;
  lastActivityCreated: RecencyItem | null;
  lastActivityEdited: EditedRecencyItem | null;
  lastValidationEvent: ValidationEvent | null;
}

// Dashboard hero cards statistics
export interface DashboardHeroStats {
  // Validation Status card
  pendingValidationCount: number;
  validatedCount: number;
  // Activities card
  publishedCount: number;
  draftCount: number;
  // Financial Transactions card
  orgTransactionCount: number;
  userTransactionCount: number;
  // Budgets & Planned Disbursements card
  orgBudgetCount: number;
  orgPlannedDisbursementCount: number;
  orgBudgetAndDisbursementCount: number;
  userBudgetCount: number;
  userPlannedDisbursementCount: number;
  userBudgetAndDisbursementCount: number;
}

// Action types for the actions required panel
export type ActionType =
  | 'validation_returned'
  | 'missing_data'
  | 'closing_soon'
  | 'out_of_date'
  | 'new_comment';

// Priority levels for actions (1 = highest)
export const ACTION_PRIORITY: Record<ActionType, number> = {
  validation_returned: 1,
  missing_data: 2,
  closing_soon: 3,
  out_of_date: 4,
  new_comment: 5,
};

// Action item for the actions required panel
export interface ActionItem {
  id: string;
  type: ActionType;
  priority: number;
  activityId: string;
  activityTitle: string;
  message: string;
  createdAt: string;
  metadata?: {
    // For missing_data
    missingFields?: string[];
    // For closing_soon
    endDate?: string;
    daysRemaining?: number;
    // For out_of_date
    lastUpdated?: string;
    daysSinceUpdate?: number;
    // For new_comment
    commentId?: string;
    commenterName?: string;
    // For validation_returned
    validationStatus?: string;
    validationNotes?: string;
  };
}

// IATI v2.03 mandatory fields for missing data detection
export const IATI_MANDATORY_FIELDS = [
  'iati_identifier',
  'reporting_org_id',
  'title_narrative',
  'description_narrative',
  'participating_org',
  'activity_status',
  'activity_dates',
  'sector',
  'recipient_location', // country OR region
  'transaction', // at least one
] as const;

export type IATIMandatoryField = typeof IATI_MANDATORY_FIELDS[number];

// Field labels for display
export const IATI_FIELD_LABELS: Record<IATIMandatoryField, string> = {
  iati_identifier: 'Activity Identifier',
  reporting_org_id: 'Reporting Organization',
  title_narrative: 'Activity Title',
  description_narrative: 'Activity Description',
  participating_org: 'Participating Organization',
  activity_status: 'Activity Status',
  activity_dates: 'Activity Dates',
  sector: 'Sector',
  recipient_location: 'Recipient Country/Region',
  transaction: 'Transaction',
};

// Sankey diagram node
export interface SankeyNode {
  id: string;
  name: string;
  type: 'self' | 'counterparty';
}

// Sankey diagram link
export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  transactionType?: string;
}

// Organization Sankey flow data
export interface OrgSankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  totalIncoming: number;
  totalOutgoing: number;
}

// Transaction type filter for Sankey
export type SankeyTransactionFilter = 'disbursements' | 'all';

// Activity table row data
export interface ActivityTableRow {
  id: string;
  title: string;
  status: string;
  activityStatus?: string;
  totalBudget?: number;
  currency?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  validationStatus?: string;
  lastUpdated: string;
  updatedBy?: string;
  daysRemaining?: number; // For closing soon variant
}

// Transaction table row data
export interface TransactionTableRow {
  id: string;
  transactionType: string;
  transactionTypeName: string;
  value: number;
  currency: string;
  transactionDate: string;
  activityId: string;
  activityTitle: string;
  counterpartyOrgId?: string;
  counterpartyOrgName: string;
  status: string;
  isProvider: boolean; // true if org is provider, false if receiver
}

// Activity list variant types
export type ActivityTableVariant = 'main' | 'recently_edited' | 'closing_soon';

// Map marker data
export interface MapMarker {
  id: string;
  activityId: string;
  activityTitle: string;
  latitude: number;
  longitude: number;
  locationName: string;
  value?: number;
}
