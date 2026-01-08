import { ColumnConfig } from "@/components/ui/column-selector";

/**
 * Column IDs for the Organizations list table
 * Note: Organizations table currently doesn't have a column selector,
 * but this config is prepared for future use.
 */
export type OrganizationColumnId =
  | "name"
  | "acronym"
  | "type"
  | "location"
  | "activities"
  | "reported"
  | "associated"
  | "funding"
  | "created_at";

/**
 * Column configuration for the Organizations table
 */
export const organizationColumns: ColumnConfig<OrganizationColumnId>[] = [
  { id: "name", label: "Name", group: "default", defaultVisible: true },
  { id: "acronym", label: "Acronym", group: "default", defaultVisible: true },
  { id: "type", label: "Type", group: "default", defaultVisible: true },
  { id: "location", label: "Location", group: "default", defaultVisible: true },
  { id: "activities", label: "Active Projects", group: "default", defaultVisible: true },
  { id: "reported", label: "Reported", group: "details", defaultVisible: false },
  { id: "associated", label: "Associated", group: "details", defaultVisible: false },
  { id: "funding", label: "Total Funding", group: "default", defaultVisible: true },
  { id: "created_at", label: "Created", group: "details", defaultVisible: false },
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
