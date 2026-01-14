import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Flag from "react-world-flags";
import {
  Building2,
  Copy,
} from "lucide-react";
import { getCountryCode } from "@/lib/country-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OrganizationActionMenu } from "@/components/organizations/OrganizationActionMenu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getSortIcon,
} from "@/components/ui/table";

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
  totalBudgeted?: number;
  totalDisbursed?: number;
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

type SortField = 'name' | 'acronym' | 'type' | 'location' | 'activities' | 'reported' | 'associated' | 'funding' | 'created_at';
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
}

// Format currency helper - returns JSX with gray currency code
const formatCurrency = (amount: number | null | undefined): React.ReactNode => {
  if (amount == null || isNaN(amount)) return '-';
  const formattedValue = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return (
    <>
      <span className="text-muted-foreground">USD</span> {formattedValue}
    </>
  );
};

// Format date helper
const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

// Copy to clipboard helper
const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text).then(() => {
    toast.success(`${label} copied to clipboard`);
  }).catch(() => {
    toast.error('Failed to copy to clipboard');
  });
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
}) => {
  const router = useRouter();


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
      <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-slate-500">No organizations found</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow-sm border border-gray-200">
      <div className="overflow-x-auto overflow-y-visible">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/80 transition-colors w-[28%]"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center gap-1">
                  <span>Organization Name</span>
                  {getSortIcon('name', sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/80 transition-colors w-[13%]"
                onClick={() => onSort('type')}
              >
                <div className="flex items-center gap-1">
                  <span>Type</span>
                  {getSortIcon('type', sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/80 transition-colors w-[12%]"
                onClick={() => onSort('location')}
              >
                <div className="flex items-center gap-1">
                  <span>Location</span>
                  {getSortIcon('location', sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer hover:bg-muted/80 transition-colors w-[7%]"
                onClick={() => onSort('reported')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Reported</span>
                  {getSortIcon('reported', sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer hover:bg-muted/80 transition-colors w-[7%]"
                onClick={() => onSort('associated')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Associated</span>
                  {getSortIcon('associated', sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:bg-muted/80 transition-colors w-[13%]"
                onClick={() => onSort('funding')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Funding</span>
                  {getSortIcon('funding', sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/80 transition-colors w-[12%]"
                onClick={() => onSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  <span>Date Created</span>
                  {getSortIcon('created_at', sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead className="text-right w-[13%]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => {
              const typeLabel = getOrganizationTypeLabel(org.Organisation_Type_Code, availableTypes);

              return (
                <TableRow
                  key={org.id}
                  className="group hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={(e) => handleRowClick(org.id, e)}
                >
                  <TableCell className="px-4 py-3 text-sm text-foreground">
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
                          <Building2 className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      
                      {/* Name, Acronym, and IATI ID */}
                      <div className="flex-1 min-w-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="font-medium line-clamp-2 flex items-start gap-1.5">
                                <span className="flex-1">
                                  {org.name}
                                  {org.acronym && (
                                    <span className="text-muted-foreground font-normal">
                                      {' '}({org.acronym})
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(org.name, 'Organization name');
                                  }}
                                  className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                                  title="Copy organization name"
                                >
                                  <Copy className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                                </button>
                              </div>
                            </TooltipTrigger>
                            {org.description && (
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{org.description}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                        {org.iati_org_id && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {org.iati_org_id}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(org.iati_org_id!, 'IATI ID');
                              }}
                              className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                              title="Copy IATI ID"
                            >
                              <Copy className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-foreground">
                    <span className="text-sm text-gray-700">
                      {typeLabel}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-foreground">
                    {org.country_represented ? (
                      <div className="flex items-start gap-2">
                        {getCountryCode(org.country_represented) && (
                          <Flag
                            code={getCountryCode(org.country_represented)!}
                            className="h-4 w-5 flex-shrink-0 rounded-sm object-cover mt-0.5"
                          />
                        )}
                        <span>{org.country_represented}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-foreground text-center">
                    <span className="font-medium">
                      {org.reportedActivities ?? org.activeProjects ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-foreground text-center">
                    <span className="font-medium">
                      {org.associatedActivities ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-foreground text-right font-medium">
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
                          <p className="text-sm">Total budgeted funding</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-foreground">
                    <span className="text-muted-foreground">
                      {formatDate(org.created_at)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-foreground text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end">
                      <OrganizationActionMenu
                        organizationId={org.id}
                        onView={() => router.push(`/organizations/${org.id}`)}
                        onEdit={() => onEdit(org)}
                        onExportPDF={onExportPDF ? () => onExportPDF(org.id) : undefined}
                        onExportExcel={onExportExcel ? () => onExportExcel(org.id) : undefined}
                        onDelete={() => onDelete(org)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

