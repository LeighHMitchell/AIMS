import { ColumnConfig } from "@/components/ui/column-selector";

/**
 * Column IDs for the Organizations list table
 */
export type OrganizationColumnId =
  | "name"
  | "type"
  | "location"
  | "residency"
  | "reported"
  | "associated"
  | "funding"
  | "created_at";

/**
 * Column configuration for the Organizations table
 */
export const organizationColumns: ColumnConfig<OrganizationColumnId>[] = [
  { id: "name", label: "Organization Name", group: "default", defaultVisible: true },
  { id: "type", label: "Type", group: "default", defaultVisible: true },
  { id: "location", label: "Location", group: "default", defaultVisible: true },
  { id: "residency", label: "Residency", group: "default", defaultVisible: true },
  { id: "reported", label: "Reported", group: "default", defaultVisible: true },
  { id: "associated", label: "Provider/Receiver", group: "default", defaultVisible: true },
  { id: "funding", label: "Funding", group: "default", defaultVisible: true },
  { id: "created_at", label: "Date Created", group: "default", defaultVisible: true },
];

/**
 * Group labels for column selector display
 */
export const organizationColumnGroups: Record<string, string> = {
  default: "Default Columns",
  details: "Additional Details",
};

/**
 * Default visible columns
 */
export const defaultVisibleOrganizationColumns: OrganizationColumnId[] = organizationColumns
  .filter((col) => col.defaultVisible)
  .map((col) => col.id);

/**
 * localStorage key for persisting column visibility
 */
export const ORGANIZATION_COLUMNS_LOCALSTORAGE_KEY = "aims_organization_table_visible_columns";

/**
 * localStorage key for persisting column order
 */
export const ORGANIZATION_COLUMN_ORDER_LOCALSTORAGE_KEY = "aims_organization_table_column_order";
