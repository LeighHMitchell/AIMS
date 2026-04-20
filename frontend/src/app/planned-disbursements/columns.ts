import { ColumnConfig } from "@/components/ui/column-selector";

/**
 * Column IDs for the Planned Disbursements list table
 */
export type PlannedDisbursementColumnId =
  | "activity"
  | "systemId"
  | "period"
  | "type"
  | "providerReceiver"
  | "amount"
  | "valueDate"
  | "valueUsd"
  | "notes";

/**
 * Column configuration for the Planned Disbursements table
 */
export const plannedDisbursementColumns: ColumnConfig<PlannedDisbursementColumnId>[] = [
  { id: "activity", label: "Activity", group: "default", defaultVisible: true },
  { id: "systemId", label: "Planned Disbursement ID", group: "default", defaultVisible: true },
  { id: "period", label: "Period", group: "default", defaultVisible: true },
  { id: "type", label: "Type", group: "default", defaultVisible: true },
  { id: "providerReceiver", label: "Provider → Receiver", group: "default", defaultVisible: true },
  { id: "amount", label: "Amount", group: "default", defaultVisible: true },
  { id: "valueDate", label: "Value Date", group: "details", defaultVisible: false },
  { id: "valueUsd", label: "USD Value", group: "default", defaultVisible: true },
  { id: "notes", label: "Notes", group: "details", defaultVisible: false },
];

/**
 * Group labels for column selector display
 */
export const plannedDisbursementColumnGroups: Record<string, string> = {
  default: "Default Columns",
  details: "Additional Details",
};

/**
 * Default visible columns
 */
export const defaultVisiblePlannedDisbursementColumns: PlannedDisbursementColumnId[] = plannedDisbursementColumns
  .filter((col) => col.defaultVisible)
  .map((col) => col.id);

/**
 * localStorage key for persisting column visibility
 */
export const PLANNED_DISBURSEMENT_COLUMNS_LOCALSTORAGE_KEY = "aims_planned_disbursement_table_visible_columns_v3";

/**
 * localStorage key for persisting column order
 */
export const PLANNED_DISBURSEMENT_COLUMN_ORDER_LOCALSTORAGE_KEY = "aims_planned_disbursement_table_column_order_v3";
