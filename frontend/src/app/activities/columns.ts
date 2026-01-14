import { ColumnConfig } from "@/components/ui/column-selector";

/**
 * Column IDs for the Activities list table
 */
export type ActivityColumnId =
  // Default columns
  | "checkbox"
  | "title"
  | "activityStatus"
  | "publicationStatus"
  | "reportedBy"
  | "totalBudgeted"
  | "totalPlannedDisbursement"
  | "lastEdited"
  | "modalityClassification"
  | "actions"
  // Optional default fields
  | "aidType"
  | "defaultFinanceType"
  | "defaultFlowType"
  | "defaultTiedStatus"
  | "defaultModality"
  | "humanitarian"
  // Transaction type totals
  | "totalIncomingCommitments"
  | "totalCommitments"
  | "totalDisbursements"
  | "totalExpenditures"
  | "totalInterestRepayment"
  | "totalLoanRepayment"
  | "totalReimbursement"
  | "totalPurchaseOfEquity"
  | "totalSaleOfEquity"
  | "totalCreditGuarantee"
  | "totalIncomingFunds"
  | "totalCommitmentCancellation"
  // Publication status columns
  | "isPublished"
  | "isValidated"
  | "iatiSyncStatus"
  // Participating organisation columns
  | "fundingOrganisations"
  | "extendingOrganisations"
  | "implementingOrganisations"
  | "accountableOrganisations"
  // Description columns
  | "descriptionGeneral"
  | "descriptionObjectives"
  | "descriptionTargetGroups"
  | "descriptionOther"
  // Progress & Metrics columns
  | "timeElapsed"
  | "committedSpentPercent"
  | "budgetSpentPercent"
  // Portfolio Share columns
  | "budgetShare"
  | "plannedDisbursementShare"
  | "commitmentShare"
  | "disbursementShare"
  // Duration columns
  | "actualLength"
  | "totalExpectedLength"
  | "implementationToDate"
  | "remainingDuration"
  | "durationBand"
  // Date columns
  | "plannedStartDate"
  | "plannedEndDate"
  | "actualStartDate"
  | "actualEndDate"
  // Sector allocation columns
  | "sectorCategories"
  | "sectors"
  | "subSectors"
  // Location columns
  | "locations"
  // SDG column
  | "sdgs"
  // Budget status column
  | "budgetStatus"
  // Capital Spend columns
  | "capitalSpendPercent"
  | "capitalSpendTotalBudget"
  | "capitalSpendPlannedDisbursements"
  | "capitalSpendCommitments"
  | "capitalSpendDisbursements"
  // Engagement columns
  | "voteScore"
  | "upvotes"
  | "downvotes"
  // Policy Markers column
  | "policyMarkers"
  // Metadata columns
  | "createdByName"
  | "createdAt"
  | "createdByDepartment";

/**
 * Column configuration for the Activities table
 */
export const activityColumns: ColumnConfig<ActivityColumnId>[] = [
  // Default columns
  { id: "checkbox", label: "Select", group: "default", alwaysVisible: true, defaultVisible: true },
  { id: "title", label: "Activity Title", group: "default", defaultVisible: true },
  { id: "activityStatus", label: "Activity Status", group: "default", defaultVisible: true },
  { id: "publicationStatus", label: "Publication Status", group: "default", defaultVisible: true },
  { id: "reportedBy", label: "Reported By", group: "default", defaultVisible: true },
  { id: "totalBudgeted", label: "Total Budgeted", group: "default", defaultVisible: true },
  { id: "totalPlannedDisbursement", label: "Total Planned Disbursements", group: "default", defaultVisible: true },
  { id: "lastEdited", label: "Last Edited", group: "default", defaultVisible: true },
  { id: "modalityClassification", label: "Modality & Classification", group: "default", defaultVisible: true },
  { id: "sectorCategories", label: "Sector Categories", group: "sectors", defaultVisible: false },
  { id: "sectors", label: "Sectors", group: "sectors", defaultVisible: false },
  { id: "subSectors", label: "Sub-sectors", group: "sectors", defaultVisible: false },
  { id: "locations", label: "Locations", group: "locations", defaultVisible: false },
  { id: "actions", label: "Actions", group: "default", alwaysVisible: true, defaultVisible: true },

  // Activity defaults (optional columns)
  { id: "aidType", label: "Default Aid Type", group: "activityDefaults", defaultVisible: false },
  { id: "defaultFinanceType", label: "Default Finance Type", group: "activityDefaults", defaultVisible: false },
  { id: "defaultFlowType", label: "Default Flow Type", group: "activityDefaults", defaultVisible: false },
  { id: "defaultTiedStatus", label: "Default Tied Status", group: "activityDefaults", defaultVisible: false },
  { id: "defaultModality", label: "Default Modality", group: "activityDefaults", defaultVisible: false },
  { id: "humanitarian", label: "Humanitarian", group: "activityDefaults", defaultVisible: false },

  // Transaction type totals
  { id: "totalIncomingCommitments", label: "Incoming Commitments", group: "transactionTypeTotals", defaultVisible: false },
  { id: "totalCommitments", label: "Outgoing Commitments", group: "transactionTypeTotals", defaultVisible: false },
  { id: "totalDisbursements", label: "Disbursements", group: "transactionTypeTotals", defaultVisible: false },
  { id: "totalExpenditures", label: "Expenditures", group: "transactionTypeTotals", defaultVisible: false },
  { id: "totalInterestRepayment", label: "Interest Payment", group: "transactionTypeTotals", defaultVisible: false },
  { id: "totalLoanRepayment", label: "Loan Repayment", group: "transactionTypeTotals", defaultVisible: false },
  { id: "totalReimbursement", label: "Reimbursement", group: "transactionTypeTotals", defaultVisible: false },
  { id: "totalPurchaseOfEquity", label: "Purchase of Equity", group: "transactionTypeTotals", defaultVisible: false },
  { id: "totalSaleOfEquity", label: "Sale of Equity", group: "transactionTypeTotals", defaultVisible: false },
  { id: "totalCreditGuarantee", label: "Credit Guarantee", group: "transactionTypeTotals", defaultVisible: false },
  { id: "totalIncomingFunds", label: "Incoming Funds", group: "transactionTypeTotals", defaultVisible: false },
  { id: "totalOutgoingPledge", label: "Outgoing Pledge", group: "transactionTypeTotals", defaultVisible: false },
  { id: "totalIncomingPledge", label: "Incoming Pledge", group: "transactionTypeTotals", defaultVisible: false },

  // Publication status columns
  { id: "isPublished", label: "Published", group: "publicationStatuses", defaultVisible: false },
  { id: "isValidated", label: "Validated", group: "publicationStatuses", defaultVisible: false },
  { id: "iatiSyncStatus", label: "IATI Synced", group: "publicationStatuses", defaultVisible: false },

  // Participating organisation columns
  { id: "fundingOrganisations", label: "Funding Organisations", group: "participatingOrgs", defaultVisible: false },
  { id: "extendingOrganisations", label: "Extending Organisations", group: "participatingOrgs", defaultVisible: false },
  { id: "implementingOrganisations", label: "Implementing Organisations", group: "participatingOrgs", defaultVisible: false },
  { id: "accountableOrganisations", label: "Accountable Organisations", group: "participatingOrgs", defaultVisible: false },

  // SDG column
  { id: "sdgs", label: "SDGs", group: "sdgs", defaultVisible: false },

  // Budget status column
  { id: "budgetStatus", label: "Budget Status", group: "governmentSystemsAlignment", defaultVisible: false },

  // Description columns
  { id: "descriptionGeneral", label: "Activity Description – General", group: "descriptions", defaultVisible: false },
  { id: "descriptionObjectives", label: "Activity Description – Objectives", group: "descriptions", defaultVisible: false },
  { id: "descriptionTargetGroups", label: "Activity Description – Target Groups", group: "descriptions", defaultVisible: false },
  { id: "descriptionOther", label: "Activity Description – Other", group: "descriptions", defaultVisible: false },

  // Progress & Metrics columns
  { id: "timeElapsed", label: "Time Elapsed", group: "progressMetrics", defaultVisible: false },
  { id: "committedSpentPercent", label: "% Committed Spent", group: "progressMetrics", defaultVisible: false },
  { id: "budgetSpentPercent", label: "% Budget Spent", group: "progressMetrics", defaultVisible: false },

  // Portfolio Share columns
  { id: "budgetShare", label: "Budget Share", group: "portfolioShares", defaultVisible: false },
  { id: "plannedDisbursementShare", label: "Planned Disb. Share", group: "portfolioShares", defaultVisible: false },
  { id: "commitmentShare", label: "Commitment Share", group: "portfolioShares", defaultVisible: false },
  { id: "disbursementShare", label: "Disbursement Share", group: "portfolioShares", defaultVisible: false },

  // Duration columns
  { id: "totalExpectedLength", label: "Total Expected Length", group: "durations", defaultVisible: false },
  { id: "implementationToDate", label: "Implementation to Date", group: "durations", defaultVisible: false },
  { id: "remainingDuration", label: "Remaining Duration", group: "durations", defaultVisible: false },
  { id: "actualLength", label: "Actual Length", group: "durations", defaultVisible: false },
  { id: "durationBand", label: "Duration Band", group: "durations", defaultVisible: false },

  // Date columns
  { id: "plannedStartDate", label: "Planned Start Date", group: "dates", defaultVisible: false },
  { id: "plannedEndDate", label: "Planned End Date", group: "dates", defaultVisible: false },
  { id: "actualStartDate", label: "Actual Start Date", group: "dates", defaultVisible: false },
  { id: "actualEndDate", label: "Actual End Date", group: "dates", defaultVisible: false },

  // Capital Spend columns
  { id: "capitalSpendPercent", label: "Capital Spend %", group: "capitalSpend", defaultVisible: false },
  { id: "capitalSpendTotalBudget", label: "Capital Spend - Total Budget", group: "capitalSpend", defaultVisible: false },
  { id: "capitalSpendPlannedDisbursements", label: "Capital Spend - Planned Disb.", group: "capitalSpend", defaultVisible: false },
  { id: "capitalSpendCommitments", label: "Capital Spend - Commitments", group: "capitalSpend", defaultVisible: false },
  { id: "capitalSpendDisbursements", label: "Capital Spend - Disbursements", group: "capitalSpend", defaultVisible: false },

  // Engagement columns
  { id: "voteScore", label: "Vote Score", group: "engagement", defaultVisible: false },
  { id: "upvotes", label: "Upvotes", group: "engagement", defaultVisible: false },
  { id: "downvotes", label: "Downvotes", group: "engagement", defaultVisible: false },

  // Policy Markers column
  { id: "policyMarkers", label: "Policy Markers", group: "policyMarkers", defaultVisible: false },

  // Metadata columns
  { id: "createdByName", label: "Created By", group: "metadata", defaultVisible: false },
  { id: "createdAt", label: "Created Date & Time", group: "metadata", defaultVisible: false },
  { id: "createdByDepartment", label: "Creator's Department", group: "metadata", defaultVisible: false },
];

/**
 * Group labels for column selector display
 */
export const activityColumnGroups: Record<string, string> = {
  default: "Default Columns",
  sectors: "Sectors",
  locations: "Locations",
  publicationStatuses: "Publication Status",
  activityDefaults: "Activity Defaults",
  transactionTypeTotals: "Transaction Type Totals",
  flowTypeTotals: "Flow Type Totals",
  participatingOrgs: "Participating Organisations",
  descriptions: "Descriptions",
  progressMetrics: "Progress & Metrics",
  portfolioShares: "Portfolio Shares",
  durations: "Activity Durations",
  dates: "Activity Dates",
  sdgs: "SDGs",
  governmentSystemsAlignment: "Government Systems Alignment",
  capitalSpend: "Capital Spend",
  engagement: "Engagement",
  policyMarkers: "Policy Markers",
  metadata: "Metadata",
};

/**
 * Default visible columns
 */
export const defaultVisibleActivityColumns: ActivityColumnId[] = activityColumns
  .filter((col) => col.defaultVisible)
  .map((col) => col.id);

/**
 * localStorage key for persisting column visibility
 */
export const ACTIVITY_COLUMNS_LOCALSTORAGE_KEY = "aims_activity_list_visible_columns";
