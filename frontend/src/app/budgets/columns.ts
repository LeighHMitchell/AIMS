import { ColumnConfig } from "@/components/ui/column-selector";

/**
 * Column IDs for the Budgets list table
 */
export type BudgetColumnId =
  | "activity"
  | "periodStart"
  | "periodEnd"
  | "type"
  | "status"
  | "value"
  | "valueDate"
  | "valueUsd"
  | "reportingOrganisation";

/**
 * Column configuration for the Budgets table
 */
export const budgetColumns: ColumnConfig<BudgetColumnId>[] = [
  { id: "activity", label: "Activity Title", group: "default", defaultVisible: true },
  { id: "periodStart", label: "Start Date", group: "default", defaultVisible: true },
  { id: "periodEnd", label: "End Date", group: "default", defaultVisible: true },
  { id: "type", label: "Type", group: "default", defaultVisible: true },
  { id: "status", label: "Status", group: "default", defaultVisible: true },
  { id: "value", label: "Currency Value", group: "default", defaultVisible: true },
  { id: "valueDate", label: "Value Date", group: "details", defaultVisible: false },
  { id: "valueUsd", label: "USD Value", group: "default", defaultVisible: true },
  { id: "reportingOrganisation", label: "Reporting Organisation", group: "details", defaultVisible: false },
];

/**
 * Group labels for column selector display
 */
export const budgetColumnGroups: Record<string, string> = {
  default: "Default Columns",
  details: "Additional Details",
};

/**
 * Default visible columns
 */
export const defaultVisibleBudgetColumns: BudgetColumnId[] = budgetColumns
  .filter((col) => col.defaultVisible)
  .map((col) => col.id);

/**
 * localStorage key for persisting column visibility
 */
export const BUDGET_COLUMNS_LOCALSTORAGE_KEY = "aims_budget_table_visible_columns";
