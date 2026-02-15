import { ColumnConfig } from "@/components/ui/column-selector";

/**
 * Column IDs for the Transactions list table
 */
export type TransactionColumnId =
  // Always visible
  | "checkbox"
  | "actions"
  // Default visible
  | "activity"
  | "transactionDate"
  | "transactionType"
  | "organizations"
  | "amount"
  | "valueDate"
  | "usdValue"
  | "financeType"
  // Activity Context (optional)
  | "activityId"
  | "iatiIdentifier"
  | "reportingOrg"
  // Transaction Details (optional)
  | "currency"
  | "transactionUuid"
  | "transactionReference"
  // Status Indicators (optional)
  | "linkedStatus"
  | "acceptanceStatus"
  | "validatedStatus"
  // Classification (optional)
  | "aidType"
  | "flowType"
  | "tiedStatus"
  | "humanitarian"
  // Organization Details (optional)
  | "providerActivity"
  | "receiverActivity"
  // Additional Details (optional)
  | "description"
  | "disbursementChannel";

/**
 * Column configuration for the Transactions table
 */
export const transactionColumns: ColumnConfig<TransactionColumnId>[] = [
  // Default columns (8 default visible + 2 always visible)
  { id: "checkbox", label: "Select", group: "default", alwaysVisible: true, defaultVisible: true },
  { id: "activity", label: "Activity", group: "default", defaultVisible: true },
  { id: "transactionDate", label: "Date", group: "default", defaultVisible: true },
  { id: "transactionType", label: "Type", group: "default", defaultVisible: true },
  { id: "organizations", label: "Provider → Receiver", group: "default", defaultVisible: true },
  { id: "amount", label: "Amount", group: "default", defaultVisible: true },
  { id: "valueDate", label: "Value Date", group: "default", defaultVisible: true },
  { id: "usdValue", label: "USD Value", group: "default", defaultVisible: true },
  { id: "financeType", label: "Finance Type", group: "default", defaultVisible: true },
  { id: "actions", label: "Actions", group: "default", alwaysVisible: true, defaultVisible: true },

  // Activity Context
  { id: "activityId", label: "Activity ID", group: "activityContext", defaultVisible: false },
  { id: "iatiIdentifier", label: "IATI Identifier", group: "activityContext", defaultVisible: false },
  { id: "reportingOrg", label: "Reporting Org", group: "activityContext", defaultVisible: false },

  // Transaction Details
  { id: "currency", label: "Currency", group: "transactionDetails", defaultVisible: false },
  { id: "transactionUuid", label: "Transaction UUID", group: "transactionDetails", defaultVisible: false },
  { id: "transactionReference", label: "Transaction Reference", group: "transactionDetails", defaultVisible: false },

  // Status Indicators
  { id: "linkedStatus", label: "Linked Status", group: "statusIndicators", defaultVisible: false },
  { id: "acceptanceStatus", label: "Acceptance Status", group: "statusIndicators", defaultVisible: false },
  { id: "validatedStatus", label: "Validated", group: "statusIndicators", defaultVisible: false },

  // Classification (gray if inherited)
  { id: "aidType", label: "Aid Type", group: "classification", defaultVisible: false },
  { id: "flowType", label: "Flow Type", group: "classification", defaultVisible: false },
  { id: "tiedStatus", label: "Tied Status", group: "classification", defaultVisible: false },
  { id: "humanitarian", label: "Humanitarian", group: "classification", defaultVisible: false },

  // Organization Details
  { id: "providerActivity", label: "Provider Activity", group: "organizationDetails", defaultVisible: false },
  { id: "receiverActivity", label: "Receiver Activity", group: "organizationDetails", defaultVisible: false },

  // Additional Details
  { id: "description", label: "Description", group: "additionalDetails", defaultVisible: false },
  { id: "disbursementChannel", label: "Disbursement Channel", group: "additionalDetails", defaultVisible: false },
];

/**
 * Group labels for column selector display
 */
export const transactionColumnGroups: Record<string, string> = {
  default: "Default Columns",
  activityContext: "Activity Context",
  transactionDetails: "Transaction Details",
  statusIndicators: "Status Indicators",
  classification: "Classification",
  organizationDetails: "Organization Details",
  additionalDetails: "Additional Details",
};

/**
 * Default visible columns
 */
export const defaultVisibleTransactionColumns: TransactionColumnId[] = transactionColumns
  .filter((col) => col.defaultVisible)
  .map((col) => col.id);

/**
 * localStorage key for persisting column visibility
 */
export const TRANSACTION_COLUMNS_LOCALSTORAGE_KEY = "aims_transaction_list_visible_columns";

/**
 * localStorage key for persisting column order
 */
export const TRANSACTION_COLUMN_ORDER_LOCALSTORAGE_KEY = "aims_transaction_list_column_order";
