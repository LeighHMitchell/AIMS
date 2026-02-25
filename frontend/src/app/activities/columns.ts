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
  | "recipientCountries"
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
  | "createdByDepartment"
  | "importedFromIrt"
  | "origin";

/**
 * Column configuration for the Activities table
 */
export const activityColumns: ColumnConfig<ActivityColumnId>[] = [
  // Default columns
  { id: "checkbox", label: "Select", group: "default", alwaysVisible: true, defaultVisible: true, description: "Select activities for bulk actions like export or delete." },
  { id: "title", label: "Activity Title", group: "default", defaultVisible: true, description: "The name of the activity. Click to view or edit details." },
  { id: "activityStatus", label: "Activity Status", group: "default", defaultVisible: true, description: "Current lifecycle stage: Pipeline, Implementation, Completion, etc." },
  { id: "publicationStatus", label: "Publication Status", group: "default", defaultVisible: true, description: "Whether the activity is Draft or Published to external systems." },
  { id: "reportedBy", label: "Reported By", group: "default", defaultVisible: true, description: "The organisation responsible for reporting this activity." },
  { id: "totalBudgeted", label: "Total Budgeted", group: "default", defaultVisible: true, description: "Sum of all budget periods for this activity in USD." },
  { id: "totalPlannedDisbursement", label: "Total Planned Disbursements", group: "default", defaultVisible: true, description: "Sum of all planned disbursement amounts in USD." },
  { id: "lastEdited", label: "Last Edited", group: "default", defaultVisible: true, description: "Date and time of the most recent update to this activity." },
  { id: "modalityClassification", label: "Modality & Classification", group: "default", defaultVisible: true, description: "Aid modality (e.g., Project, Budget Support) and finance classification." },
  { id: "sectorCategories", label: "Sector Categories", group: "sectors", defaultVisible: false, description: "High-level DAC sector categories (e.g., Education, Health)." },
  { id: "sectors", label: "Sectors", group: "sectors", defaultVisible: false, description: "Specific DAC 3-digit sector codes allocated to this activity." },
  { id: "subSectors", label: "Sub-sectors", group: "sectors", defaultVisible: false, description: "Detailed DAC 5-digit purpose codes for precise classification." },
  { id: "locations", label: "Locations", group: "locations", defaultVisible: false, description: "Subnational allocation showing percentage breakdown by state/region." },
  { id: "recipientCountries", label: "Country/Region", group: "locations", defaultVisible: false, description: "Recipient countries or regions where this activity takes place." },

  // Activity defaults (optional columns)
  { id: "aidType", label: "Default Aid Type", group: "activityDefaults", defaultVisible: false, description: "The primary type of aid (e.g., Grant, Loan, Technical Assistance)." },
  { id: "defaultFinanceType", label: "Default Finance Type", group: "activityDefaults", defaultVisible: false, description: "How the activity is financed (e.g., Grant, Standard Loan)." },
  { id: "defaultFlowType", label: "Default Flow Type", group: "activityDefaults", defaultVisible: false, description: "Classification of resource flow (e.g., ODA, OOF, Private)." },
  { id: "defaultTiedStatus", label: "Default Tied Status", group: "activityDefaults", defaultVisible: false, description: "Whether procurement is tied to specific countries or untied." },
  { id: "defaultModality", label: "Default Modality", group: "activityDefaults", defaultVisible: false, description: "Calculated delivery channel based on aid and finance type." },
  { id: "humanitarian", label: "Humanitarian", group: "activityDefaults", defaultVisible: false, description: "Indicates if this is a humanitarian response activity." },

  // Transaction type totals
  { id: "totalIncomingCommitments", label: "Incoming Commitments", group: "transactionTypeTotals", defaultVisible: false, description: "Total commitments received from funders in USD." },
  { id: "totalCommitments", label: "Outgoing Commitments", group: "transactionTypeTotals", defaultVisible: false, description: "Total commitments made to partners/recipients in USD." },
  { id: "totalDisbursements", label: "Disbursements", group: "transactionTypeTotals", defaultVisible: false, description: "Actual funds transferred to recipients in USD." },
  { id: "totalExpenditures", label: "Expenditures", group: "transactionTypeTotals", defaultVisible: false, description: "Funds spent directly by the reporting organisation in USD." },
  { id: "totalInterestRepayment", label: "Interest Payment", group: "transactionTypeTotals", defaultVisible: false, description: "Interest payments made on loans in USD." },
  { id: "totalLoanRepayment", label: "Loan Repayment", group: "transactionTypeTotals", defaultVisible: false, description: "Principal repayments received on loans in USD." },
  { id: "totalReimbursement", label: "Reimbursement", group: "transactionTypeTotals", defaultVisible: false, description: "Funds reimbursed for expenses in USD." },
  { id: "totalPurchaseOfEquity", label: "Purchase of Equity", group: "transactionTypeTotals", defaultVisible: false, description: "Equity investments made in USD." },
  { id: "totalSaleOfEquity", label: "Sale of Equity", group: "transactionTypeTotals", defaultVisible: false, description: "Proceeds from equity sales in USD." },
  { id: "totalCreditGuarantee", label: "Credit Guarantee", group: "transactionTypeTotals", defaultVisible: false, description: "Value of credit guarantees provided in USD." },
  { id: "totalIncomingFunds", label: "Incoming Funds", group: "transactionTypeTotals", defaultVisible: false, description: "Total funds received from all sources in USD." },
  { id: "totalCommitmentCancellation", label: "Commitment Cancellation", group: "transactionTypeTotals", defaultVisible: false, description: "Total commitment cancellations in USD." },
  { id: "totalOutgoingPledge", label: "Outgoing Pledge", group: "transactionTypeTotals", defaultVisible: false, description: "Pledges made to future funding in USD." },
  { id: "totalIncomingPledge", label: "Incoming Pledge", group: "transactionTypeTotals", defaultVisible: false, description: "Pledges received for future funding in USD." },

  // Publication status columns
  { id: "isPublished", label: "Published", group: "publicationStatuses", defaultVisible: false, description: "Whether the activity has been published for public access." },
  { id: "isValidated", label: "Validated", group: "publicationStatuses", defaultVisible: false, description: "Whether the activity has been validated and endorsed by the partner government." },
  { id: "iatiSyncStatus", label: "IATI Synced", group: "publicationStatuses", defaultVisible: false, description: "Sync status with the IATI Registry (live, pending, outdated)." },

  // Participating organisation columns
  { id: "fundingOrganisations", label: "Funding Organisations", group: "participatingOrgs", defaultVisible: false, description: "Organisations providing financial resources for this activity." },
  { id: "extendingOrganisations", label: "Extending Organisations", group: "participatingOrgs", defaultVisible: false, description: "Organisations managing or channeling funds downstream." },
  { id: "implementingOrganisations", label: "Implementing Organisations", group: "participatingOrgs", defaultVisible: false, description: "Organisations executing the activity on the ground." },
  { id: "accountableOrganisations", label: "Accountable Organisations", group: "participatingOrgs", defaultVisible: false, description: "Organisations with overall responsibility and accountability." },

  // SDG column
  { id: "sdgs", label: "SDGs", group: "sdgs", defaultVisible: false, description: "Sustainable Development Goals this activity contributes to." },

  // Budget status column
  { id: "budgetStatus", label: "Budget Status", group: "governmentSystemsAlignment", defaultVisible: false, description: "Whether funding is on-budget, off-budget, or partially on-budget." },

  // Description columns
  { id: "descriptionGeneral", label: "Activity Description – General", group: "descriptions", defaultVisible: false, description: "Main narrative describing the activity's purpose and scope." },
  { id: "descriptionObjectives", label: "Activity Description – Objectives", group: "descriptions", defaultVisible: false, description: "Specific objectives and expected outcomes of the activity." },
  { id: "descriptionTargetGroups", label: "Activity Description – Target Groups", group: "descriptions", defaultVisible: false, description: "Beneficiaries and target populations for this activity." },
  { id: "descriptionOther", label: "Activity Description – Other", group: "descriptions", defaultVisible: false, description: "Additional descriptive information not covered elsewhere." },

  // Progress & Metrics columns
  { id: "timeElapsed", label: "Time Elapsed", group: "progressMetrics", defaultVisible: false, description: "Percentage of planned duration that has passed." },
  { id: "committedSpentPercent", label: "% Committed Spent", group: "progressMetrics", defaultVisible: false, description: "Percentage of commitments that have been disbursed." },
  { id: "budgetSpentPercent", label: "% Budget Spent", group: "progressMetrics", defaultVisible: false, description: "Percentage of total budget that has been spent." },

  // Portfolio Share columns
  { id: "budgetShare", label: "Budget Share", group: "portfolioShares", defaultVisible: false, description: "This activity's budget as a percentage of total portfolio budget." },
  { id: "plannedDisbursementShare", label: "Planned Disb. Share", group: "portfolioShares", defaultVisible: false, description: "This activity's planned disbursements as a percentage of portfolio." },
  { id: "commitmentShare", label: "Commitment Share", group: "portfolioShares", defaultVisible: false, description: "This activity's commitments as a percentage of total portfolio." },
  { id: "disbursementShare", label: "Disbursement Share", group: "portfolioShares", defaultVisible: false, description: "This activity's disbursements as a percentage of total portfolio." },

  // Duration columns
  { id: "totalExpectedLength", label: "Total Expected Length", group: "durations", defaultVisible: false, description: "Planned duration from start to end date in months." },
  { id: "implementationToDate", label: "Implementation to Date", group: "durations", defaultVisible: false, description: "Time elapsed since actual start date in months." },
  { id: "remainingDuration", label: "Remaining Duration", group: "durations", defaultVisible: false, description: "Time remaining until planned end date in months." },
  { id: "actualLength", label: "Actual Length", group: "durations", defaultVisible: false, description: "Duration from actual start to actual end date in months." },
  { id: "durationBand", label: "Duration Band", group: "durations", defaultVisible: false, description: "Categorisation: Short (<1yr), Medium (1-3yr), Long (3+yr)." },

  // Date columns
  { id: "plannedStartDate", label: "Planned Start Date", group: "dates", defaultVisible: false, description: "Originally scheduled start date for the activity." },
  { id: "plannedEndDate", label: "Planned End Date", group: "dates", defaultVisible: false, description: "Originally scheduled completion date for the activity." },
  { id: "actualStartDate", label: "Actual Start Date", group: "dates", defaultVisible: false, description: "Date when implementation actually began." },
  { id: "actualEndDate", label: "Actual End Date", group: "dates", defaultVisible: false, description: "Date when the activity was actually completed." },

  // Capital Spend columns
  { id: "capitalSpendPercent", label: "Capital Spend %", group: "capitalSpend", defaultVisible: false, description: "Percentage of spending that is capital expenditure vs. current." },
  { id: "capitalSpendTotalBudget", label: "Capital Spend - Total Budget", group: "capitalSpend", defaultVisible: false, description: "Capital expenditure portion of total budgeted amount." },
  { id: "capitalSpendPlannedDisbursements", label: "Capital Spend - Planned Disb.", group: "capitalSpend", defaultVisible: false, description: "Capital expenditure portion of planned disbursements." },
  { id: "capitalSpendCommitments", label: "Capital Spend - Commitments", group: "capitalSpend", defaultVisible: false, description: "Capital expenditure portion of total commitments." },
  { id: "capitalSpendDisbursements", label: "Capital Spend - Disbursements", group: "capitalSpend", defaultVisible: false, description: "Capital expenditure portion of actual disbursements." },

  // Engagement columns
  { id: "voteScore", label: "Vote Score", group: "engagement", defaultVisible: false, description: "Net score from user upvotes minus downvotes." },
  { id: "upvotes", label: "Upvotes", group: "engagement", defaultVisible: false, description: "Number of positive votes from users." },
  { id: "downvotes", label: "Downvotes", group: "engagement", defaultVisible: false, description: "Number of negative votes from users." },

  // Policy Markers column
  { id: "policyMarkers", label: "Policy Markers", group: "policyMarkers", defaultVisible: false, description: "OECD DAC policy markers (Gender, Environment, etc.) and their significance." },

  // Metadata columns
  { id: "createdByName", label: "Created By", group: "metadata", defaultVisible: false, description: "Name of the user who originally created this activity." },
  { id: "createdAt", label: "Created Date & Time", group: "metadata", defaultVisible: false, description: "When this activity record was first created." },
  { id: "createdByDepartment", label: "Creator's Department", group: "metadata", defaultVisible: false, description: "Department or unit of the user who created the activity." },
  { id: "importedFromIrt", label: "Imported from IRT", group: "metadata", defaultVisible: false, description: "Whether this activity was imported from the IATI Registry Tool (IRT) or created manually." },
  { id: "origin", label: "Origin", group: "metadata", defaultVisible: false, description: "Where this activity originated from — donor-reported or Project Bank." },
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

/**
 * localStorage key for persisting column order
 */
export const ACTIVITY_COLUMN_ORDER_LOCALSTORAGE_KEY = "aims_activity_list_column_order";

/**
 * Column descriptions lookup map for tooltips
 */
export const columnDescriptions: Record<ActivityColumnId, string> = Object.fromEntries(
  activityColumns.map(col => [col.id, col.description || ''])
) as Record<ActivityColumnId, string>;
