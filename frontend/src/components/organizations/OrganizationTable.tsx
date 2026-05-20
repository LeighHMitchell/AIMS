import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Flag from "react-world-flags";
import {
  Building2,
} from "lucide-react";
import { getCountryCode } from "@/lib/country-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OrganizationActionMenu } from "@/components/organizations/OrganizationActionMenu";
import { useOrganizationBookmarks } from "@/hooks/use-organization-bookmarks";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  getSortIcon,
} from "@/components/ui/table";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { useColumnOrder } from "@/hooks/use-column-order";
import {
  organizationColumns,
  OrganizationColumnId,
  ORGANIZATION_COLUMN_ORDER_LOCALSTORAGE_KEY,
} from "@/app/organizations/columns";
import { CopyableIdBadge } from "@/components/ui/copyable-id-badge";
import { formatDate as formatDateCanonical } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";

type Organization = {
  id: string;
  name: string;
  acronym?: string;
  iati_org_id?: string;
  Organisation_Type_Code?: string;
  country_represented?: string;
  description?: string;
  website?: string;
  activeProjects: number;
  reportedActivities?: number;
  associatedActivities?: number;
  providerTransactionCount?: number;
  receiverTransactionCount?: number;
  totalTransactionCount?: number;
  totalBudgeted?: number;
  totalDisbursed?: number;
  residency_status?: string;
  logo?: string;
  tags?: string[];
  created_at: string;
};

type OrganizationType = {
  code: string;
  label: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
};

type SortField = 'name' | 'acronym' | 'type' | 'location' | 'activities' | 'reported' | 'associated' | 'providerReceiver' | 'funding' | 'residency' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface OrganizationTableProps {
  organizations: Organization[];
  availableTypes: OrganizationType[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
  onExportPDF?: (orgId: string) => void;
  onExportExcel?: (orgId: string) => void;
  /** When provided, a leading selection checkbox column is rendered. */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (orgId: string, checked: boolean) => void;
  onToggleSelectAll?: (checked: boolean) => void;
}

// Format currency helper - returns JSX with gray currency code
const formatCurrency = (amount: number | null | undefined): React.ReactNode => {
  if (amount == null || isNaN(amount)) return '-';
  const abs = Math.abs(amount);
  const formattedValue =
    abs >= 1_000_000_000
      ? `${(amount / 1_000_000_000).toFixed(1)}b`
      : abs >= 1_000_000
      ? `${(amount / 1_000_000).toFixed(1)}m`
      : abs >= 1_000
      ? `${(amount / 1_000).toFixed(0)}k`
      : amount.toLocaleString('en-US', { maximumFractionDigits: 0 });

  return (
    <>
      <span className="text-helper text-muted-foreground font-normal">USD</span> {formattedValue}
    </>
  );
};

// Format date helper
const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  return formatDateCanonical(dateString) || '-';
};

// Get organization type label
const getOrganizationTypeLabel = (
  typeCode: string | undefined,
  availableTypes: OrganizationType[]
): string => {
  if (!typeCode) return 'Unknown';
  const type = availableTypes.find((t) => t.code === typeCode);
  return type?.label || typeCode;
};

// Get type badge colors for inline span styling
// Using cohesive palette: Primary Scarlet #dc2625, Pale Slate #cfd0d5, Blue Slate #4c5568, Cool Steel #7b95a7, Platinum #f1f4f8
const getTypeInlineColors = (typeCode: string | undefined): string => {
  if (!typeCode) return 'bg-[#f1f4f8] text-[#7b95a7]'; // Platinum / Cool Steel
  const code = parseInt(typeCode);

  // Government (10, 11, 15) - Pale Slate bg, Blue Slate text (solid, official)
  if (code === 10 || code === 11 || code === 15) return 'bg-[#cfd0d5] text-[#4c5568]';

  // NGO (21, 22, 23, 24) - Platinum bg, Blue Slate text (clean)
  if (code >= 21 && code <= 24) return 'bg-[#f1f4f8] text-[#4c5568]';

  // Partnership (30) - Platinum bg, Cool Steel text (collaborative)
  if (code === 30) return 'bg-[#f1f4f8] text-[#7b95a7]';

  // Multilateral (40) - Pale Slate bg, Blue Slate text (prominent)
  if (code === 40) return 'bg-[#cfd0d5] text-[#4c5568]';

  // Foundation (60) - Platinum bg, Cool Steel text (gentle)
  if (code === 60) return 'bg-[#f1f4f8] text-[#7b95a7]';

  // Private Sector (70, 71, 72, 73) - Pale Slate bg, Blue Slate text (business-like)
  if (code >= 70 && code <= 73) return 'bg-[#cfd0d5] text-[#4c5568]';

  // Academic (80) - Pale Slate bg, Cool Steel text (scholarly)
  if (code === 80) return 'bg-[#cfd0d5] text-[#7b95a7]';

  // Other (90) and unknown - Platinum bg, Cool Steel text (neutral)
  return 'bg-[#f1f4f8] text-[#7b95a7]';
};

export const OrganizationTable: React.FC<OrganizationTableProps> = ({
  organizations,
  availableTypes,
  sortField,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  onExportPDF,
  onExportExcel,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}) => {
  const router = useRouter();
  const { isBookmarked, toggleBookmark } = useOrganizationBookmarks();

  const selectedSet = selectedIds ?? new Set<string>();
  const selectedOnPage = organizations.filter((o) => selectedSet.has(o.id)).length;
  const allOnPageSelected =
    organizations.length > 0 && selectedOnPage === organizations.length;
  const someOnPageSelected =
    selectedOnPage > 0 && selectedOnPage < organizations.length;

  const { getOrderedVisibleColumns, handleReorder } = useColumnOrder<OrganizationColumnId>({
    storageKey: ORGANIZATION_COLUMN_ORDER_LOCALSTORAGE_KEY,
    columns: organizationColumns,
  });

  const allColumnIds = useMemo(() => organizationColumns.map((c) => c.id), []);
  const orderedColumns = getOrderedVisibleColumns(allColumnIds);

  const handleRowClick = (orgId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]')) {
      return;
    }
    router.push(`/organizations/${orgId}`);
  };

  if (organizations.length === 0) {
    return (
      <div className="bg-white rounded-md shadow-sm border border-border p-8 text-center">
        <div className="text-muted-foreground">No organisations found</div>
      </div>
    );
  }

  // Build header map
  const headerMap: Record<OrganizationColumnId, React.ReactNode> = {
    name: (
      <SortableTableHeader
        key="name"
        id="name"
        className="cursor-pointer hover:bg-muted/80 transition-colors w-[28%]"
        onClick={() => onSort('name')}
      >
        <div className="flex items-center gap-1">
          <span>Organisation Name</span>
          {getSortIcon('name', sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    type: (
      <SortableTableHeader
        key="type"
        id="type"
        className="cursor-pointer hover:bg-muted/80 transition-colors w-[13%]"
        onClick={() => onSort('type')}
      >
        <div className="flex items-center gap-1">
          <span>Organisation Type</span>
          {getSortIcon('type', sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    location: (
      <SortableTableHeader
        key="location"
        id="location"
        className="cursor-pointer hover:bg-muted/80 transition-colors w-[12%]"
        onClick={() => onSort('location')}
      >
        <div className="flex items-center gap-1">
          <span>Location</span>
          {getSortIcon('location', sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    residency: (
      <SortableTableHeader
        key="residency"
        id="residency"
        className="cursor-pointer hover:bg-muted/80 transition-colors w-[8%]"
        onClick={() => onSort('residency')}
      >
        <div className="flex items-center gap-1">
          <span>Residency</span>
          {getSortIcon('residency', sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    reported: (
      <SortableTableHeader
        key="reported"
        id="reported"
        className="text-center cursor-pointer hover:bg-muted/80 transition-colors w-[7%]"
        onClick={() => onSort('reported')}
      >
        <div className="flex items-center justify-center gap-1">
          <span>Activities Reported</span>
          {getSortIcon('reported', sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    associated: (
      <SortableTableHeader
        key="associated"
        id="associated"
        className="text-center cursor-pointer hover:bg-muted/80 transition-colors w-[9%]"
        onClick={() => onSort('providerReceiver')}
      >
        <div className="flex items-center justify-center gap-1">
          <span>Provider/Receiver</span>
          {getSortIcon('providerReceiver', sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    funding: (
      <SortableTableHeader
        key="funding"
        id="funding"
        className="text-right cursor-pointer hover:bg-muted/80 transition-colors w-[13%]"
        onClick={() => onSort('funding')}
      >
        <div className="flex items-center justify-end gap-1">
          <span>Total Budgeted</span>
          {getSortIcon('funding', sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    created_at: (
      <SortableTableHeader
        key="created_at"
        id="created_at"
        className="cursor-pointer hover:bg-muted/80 transition-colors w-[12%]"
        onClick={() => onSort('created_at')}
      >
        <div className="flex items-center gap-1">
          <span>Date Created</span>
          {getSortIcon('created_at', sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
  };

  return (
    <TableContainer className="bg-white shadow-sm">
      <Table>
        <TableHeader>
            <TableRow>
                {selectable && (
                  <TableHead className="w-[44px] px-3">
                    <Checkbox
                      aria-label="Select all organisations on this page"
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected}
                      onCheckedChange={(checked) =>
                        onToggleSelectAll?.(!!checked)
                      }
                    />
                  </TableHead>
                )}
                {orderedColumns.map((colId) => headerMap[colId])}
              <TableHead className="text-right w-[13%]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => {
              const typeLabel = getOrganizationTypeLabel(org.Organisation_Type_Code, availableTypes);

              // Build cell map
              const cellMap: Record<OrganizationColumnId, React.ReactNode> = {
                name: (
                  <TableCell key="name" className="px-4 py-3 text-body text-foreground">
                    <div className="flex items-start gap-3">
                      {/* Logo */}
                      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                        {org.logo ? (
                          <img
                            src={org.logo}
                            alt={`${org.name} logo`}
                            className="w-10 h-10 rounded object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Name, Acronym, and IATI ID */}
                      <div className="flex-1 min-w-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="line-clamp-2 flex items-start gap-1.5">
                                <span className="flex-1">
                                  <Link
                                    href={`/organizations/${org.id}`}
                                    className="hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {org.name}
                                    {org.acronym && (
                                      <span>
                                        {' '}({org.acronym})
                                      </span>
                                    )}
                                  </Link>
                                  {org.iati_org_id && (
                                    <>
                                      {' '}
                                      <CopyableIdBadge value={org.iati_org_id} label="IATI Org ID" />
                                    </>
                                  )}
                                </span>
                              </div>
                            </TooltipTrigger>
                            {org.description && (
                              <TooltipContent className="max-w-xs">
                                <p className="text-body">{org.description}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </TableCell>
                ),
                type: (
                  <TableCell key="type" className="px-4 py-3 text-body text-foreground">
                    <span>
                      {typeLabel}
                    </span>
                  </TableCell>
                ),
                location: (
                  <TableCell key="location" className="px-4 py-3 text-body text-foreground">
                    {org.country_represented ? (
                      <div>
                        {org.country_represented === 'United Nations' ? (
                          <img
                            src="/images/flags/united-nations.svg"
                            alt="UN Flag"
                            className="inline-block h-4 w-5 rounded-sm object-cover align-middle mr-2"
                          />
                        ) : org.country_represented === 'European Union Institutions' ? (
                          <img
                            src="/images/flags/european-union.svg"
                            alt="EU Flag"
                            className="inline-block h-4 w-5 rounded-sm object-cover align-middle mr-2"
                          />
                        ) : getCountryCode(org.country_represented) ? (
                          <Flag
                            code={getCountryCode(org.country_represented)!}
                            className="inline-block h-4 w-5 rounded-sm object-cover align-middle mr-2"
                          />
                        ) : (
                          <Building2 className="inline-block h-4 w-4 text-muted-foreground align-middle mr-2" />
                        )}
                        {org.country_represented}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                ),
                residency: (
                  <TableCell key="residency" className="px-4 py-3 text-body text-foreground">
                    {org.residency_status ? (
                      <span>{org.residency_status === 'resident' ? 'Resident' : 'Non-Resident'}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                ),
                reported: (
                  <TableCell key="reported" className="px-4 py-3 text-body text-foreground text-center">
                    <span>
                      {org.reportedActivities ?? org.activeProjects ?? 0}
                    </span>
                  </TableCell>
                ),
                associated: (
                  <TableCell key="associated" className="px-4 py-3 text-body text-foreground text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {org.totalTransactionCount ?? 0}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-body">
                            <div className="flex justify-between gap-4">
                              <span>Provider:</span>
                              <span className="font-medium">{org.providerTransactionCount ?? 0}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span>Receiver:</span>
                              <span className="font-medium">{org.receiverTransactionCount ?? 0}</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                ),
                funding: (
                  <TableCell key="funding" className="px-4 py-3 text-body text-foreground text-right font-medium">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-end gap-1">
                            <span>
                              {formatCurrency(org.totalBudgeted)}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-body">Total budgeted funding</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                ),
                created_at: (
                  <TableCell key="created_at" className="px-4 py-3 text-body text-foreground">
                    <span>
                      {formatDate(org.created_at)}
                    </span>
                  </TableCell>
                ),
              };

              return (
                <TableRow
                  key={org.id}
                  data-state={selectable && selectedSet.has(org.id) ? "selected" : undefined}
                  className="group hover:bg-muted/50 transition-colors cursor-pointer data-[state=selected]:bg-muted/60"
                  onClick={(e) => handleRowClick(org.id, e)}
                >
                  {selectable && (
                    <TableCell
                      className="w-[44px] px-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        aria-label={`Select ${org.name}`}
                        checked={selectedSet.has(org.id)}
                        onCheckedChange={(checked) =>
                          onToggleSelect?.(org.id, !!checked)
                        }
                      />
                    </TableCell>
                  )}
                  {orderedColumns.map((colId) => cellMap[colId])}
                  <TableCell className="px-4 py-3 text-body text-foreground text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end">
                      <OrganizationActionMenu
                        organizationId={org.id}
                        onView={() => router.push(`/organizations/${org.id}`)}
                        onEdit={() => onEdit(org)}
                        onExportPDF={onExportPDF ? () => onExportPDF(org.id) : undefined}
                        onExportExcel={onExportExcel ? () => onExportExcel(org.id) : undefined}
                        onDelete={() => onDelete(org)}
                        isBookmarked={isBookmarked(org.id)}
                        onToggleBookmark={() => toggleBookmark(org.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
      </Table>
    </TableContainer>
  );
};
