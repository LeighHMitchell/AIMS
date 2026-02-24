"use client"

/*
 * PERFORMANCE OPTIMIZED ACTIVITIES PAGE
 * 
 * Optimizations implemented:
 * 1. Server-side pagination with optimized API endpoint
 * 2. Debounced search to reduce API calls
 * 3. Request cancellation to prevent race conditions
 * 4. Smart caching for better UX
 * 5. Memoized components to prevent unnecessary re-renders
 * 
 * Backward compatibility: Maintains exact same UI/UX
 * Rollback: Set NEXT_PUBLIC_ENABLE_ACTIVITY_OPTIMIZATION=false
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { usePreCache } from "@/hooks/use-pre-cached-data";
import { useOptimizedActivities, SystemTotals } from "@/hooks/use-optimized-activities";
import { calculatePortfolioShare, formatPercentage } from "@/lib/system-totals";
import { useLoadingBar } from "@/hooks/useLoadingBar";
import { AsyncErrorBoundary } from "@/components/errors/AsyncErrorBoundary";
import { PerformanceMetrics } from "@/components/optimization/OptimizedActivityList";
import { MainLayout } from "@/components/layout/main-layout";
import { ActivityList } from "@/components/activities/ActivityList";
import { ActivityActionMenu } from "@/components/activities/ActivityActionMenu";
import { SectorMiniBar } from "@/components/activities/SectorMiniBar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { ActivityStatusFilterSelect } from "@/components/forms/ActivityStatusFilterSelect";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatReportedBy, formatSubmittedBy } from "@/utils/format-helpers";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import {
  Plus, Download, Pencil, Trash2, AlertCircle, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Users, LayoutGrid, TableIcon, Search, MoreVertical, BookOpenCheck, BookLock, CheckCircle2, AlertTriangle, Circle, Info, ReceiptText, Handshake, Shuffle, Link2,
  FileCheck, ShieldCheck, Globe, DatabaseZap, RefreshCw, Copy, Check, Blocks, DollarSign, Settings, ExternalLink, FileCode, Columns3, ChevronDown, ChevronUp, Heart,
  Building2, ArrowRightLeft, X, FileText, FileSpreadsheet, Bookmark, BookmarkCheck
} from "lucide-react";
import { exportActivityToPDF, exportActivityToExcel } from "@/lib/activity-export";
import { useUser } from "@/hooks/useUser";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { Transaction, TIED_STATUS_LABELS } from "@/types/transaction";
import { LEGACY_TRANSACTION_TYPE_MAP } from "@/utils/transactionMigrationHelper";
import { USER_ROLES } from "@/types/user";
import { ActivityListSkeleton } from '@/components/ui/skeleton-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LocationMiniBar, LocationData } from "@/components/activities/LocationMiniBar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from 'next/link';
import { IATISyncStatusIndicator, IATISyncStatusBadge } from '@/components/activities/IATISyncStatusIndicator';
import { CurrencyTooltip, InfoIconTooltip } from '@/components/ui/currency-tooltip';
import { CodelistTooltip } from '@/components/ui/codelist-tooltip';
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { BulkDeleteDialog } from "@/components/dialogs/bulk-delete-dialog";
import dynamic from 'next/dynamic';
import { SectorFilterSelection, matchesSectorFilter } from "@/components/maps/SectorHierarchyFilter";
import { SafeHtml } from '@/components/ui/safe-html';
import { htmlToPlainText } from '@/lib/sanitize';
import { OrganizationAvatarGroup } from '@/components/ui/organization-avatar-group';
import { SDGAvatarGroup } from '@/components/ui/sdg-avatar-group';
import { PolicyMarkerAvatarGroup } from '@/components/ui/policy-marker-avatar-group';
import { Progress } from "@/components/ui/progress";
import { 
  calculateDurationDetailed,
  formatDurationHuman,
  getDurationBand,
  calculateImplementationToDate,
  calculateRemainingDuration,
  calculateImplementationPercent,
  calculateRemainingPercent,
  DurationResult,
  DurationBand
} from '@/lib/date-utils';
import {
  BudgetStatusType,
  getBudgetStatusLabel,
  BUDGET_STATUS_COLORS
} from '@/types/activity-budget-status';
import { ColumnSelector } from "@/components/ui/column-selector";
import {
  ActivityColumnId,
  activityColumns,
  activityColumnGroups,
  defaultVisibleActivityColumns,
  columnDescriptions,
  ACTIVITY_COLUMNS_LOCALSTORAGE_KEY,
  ACTIVITY_COLUMN_ORDER_LOCALSTORAGE_KEY,
} from "./columns";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { DndColumnProvider } from "@/components/ui/dnd-column-provider";
import { useColumnOrder } from "@/hooks/use-column-order";
import { apiFetch } from '@/lib/api-fetch';
import { getActivityStatusLabel } from '@/lib/activity-status-utils';

// Dynamically import SectorHierarchyFilter to avoid hydration issues
const SectorHierarchyFilter = dynamic(
  () => import("@/components/maps/SectorHierarchyFilter").then(mod => mod.SectorHierarchyFilter),
  { ssr: false }
);

// Aid Type mappings (simplified)
const AID_TYPE_LABELS: Record<string, string> = {
  'A01': 'General budget support',
  'A02': 'Sector budget support',
  'B01': 'Core support to NGOs',
  'B02': 'Core contributions to multilateral institutions',
  'B03': 'Contributions to pooled programmes and funds',
  'B04': 'Basket funds/pooled funding',
  'C01': 'Project-type interventions',
  'D01': 'Donor country personnel',
  'D02': 'Other technical assistance',
  'E01': 'Scholarships/training in donor country',
  'E02': 'Imputed student costs',
  'F01': 'Debt relief',
  'G01': 'Administrative costs not included elsewhere',
  'H01': 'Development awareness',
  'H02': 'Refugees in donor countries'
};

// Flow Type mappings
const FLOW_TYPE_LABELS: Record<string, string> = {
  '10': 'Official Development Assistance',
  '20': 'Other Official Flows',
  '21': 'Non-export credit OOF',
  '22': 'Officially supported export credits',
  '30': 'Private grants',
  '35': 'Private market',
  '36': 'Private Foreign Direct Investment',
  '37': 'Other private flows at market terms',
  '40': 'Non flow',
  '50': 'Other flows'
};

// Finance Type mappings
const FINANCE_TYPE_LABELS: Record<string, string> = {
  '110': 'Standard grant',
  '111': 'Subsidies to national private investors',
  '210': 'Interest subsidy',
  '211': 'Interest subsidy to national private exporters',
  '310': 'Capital subscription on deposit basis',
  '311': 'Capital subscription on encashment basis',
  '410': 'Aid loan excluding debt reorganisation',
  '411': 'Investment-related loan to developing countries',
  '412': 'Loan in a joint venture with the recipient',
  '413': 'Loan to national private investor',
  '421': 'Standard loan',
  '422': 'Reimbursable grant',
  '510': 'Bonds',
  '520': 'Asset-backed securities',
  '530': 'Other debt securities'
};

// Modality mappings
const MODALITY_LABELS: Record<string, string> = {
  '1': 'Grant',
  '2': 'Loan',
  '3': 'Technical Assistance',
  '4': 'Reimbursable Grant or Other',
  '5': 'Investment/Guarantee'
};

// Tied Status mappings imported from @/types/transaction

type Organization = {
  id: string;
  name: string;
  acronym?: string;
  logo?: string;
  type?: string;
  country?: string;
  iati_org_id?: string;
  reporting_org_ref?: string;
};

type Activity = {
  id: string;
  title: string;
  acronym?: string; // Activity acronym/abbreviation
  activityStatus?: string; // IATI activity status (planning, implementation, etc.)
  publicationStatus?: string; // Publication status (draft, published)
  submissionStatus?: string; // Changed to string to match interface
  submittedByName?: string;
  submittedAt?: string;
  status?: string; // Legacy status field for backward compatibility
  createdAt: string;
  updatedAt: string;
  partnerId?: string;
  iatiId?: string;
  description?: string;
  created_by_org_name?: string;
  created_by_org_acronym?: string;
  targetGroups?: string;
  collaborationType?: string;
  banner?: string;
  icon?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  sectors?: any[];
  transactions?: Transaction[];
  createdByOrg?: string; // Organization that created the activity (legacy)
  reportingOrgId?: string; // Organization that created/reports the activity
  reportingOrgRef?: string; // IATI reporting organization reference (e.g., "AU-5")
  reportingOrgName?: string; // Reporting organization name
  createdBy?: { id: string; name: string; role: string }; // User who created the activity
  contributors?: any[]; // Added for contributors
  
  // Transaction type totals from API
  incomingCommitments?: number;
  commitments?: number;
  disbursements?: number;
  expenditures?: number;
  interestRepayment?: number;
  loanRepayment?: number;
  reimbursement?: number;
  purchaseOfEquity?: number;
  saleOfEquity?: number;
  creditGuarantee?: number;
  incomingFunds?: number;
  commitmentCancellation?: number;
  inflows?: number;
  totalTransactions?: number;
  
  // Flow type totals from API
  flowTypeODA?: number;
  flowTypeOOF?: number;
  flowTypeNonExportOOF?: number;
  flowTypeExportCredits?: number;
  flowTypePrivateGrants?: number;
  flowTypePrivateMarket?: number;
  flowTypePrivateFDI?: number;
  flowTypeOtherPrivate?: number;
  flowTypeNonFlow?: number;
  flowTypeOther?: number;
  
  // Budget summaries from API  
  totalPlannedBudgetUSD?: number;
  totalDisbursementsAndExpenditureUSD?: number;
  totalBudget?: number;
  totalDisbursed?: number;
  
  // Organization data
  funders?: Organization[];
  implementers?: Organization[];
  extendingOrganizations?: Organization[];
  transactionOrganizations?: Organization[];
  
  // IATI Sync fields
  iatiIdentifier?: string;
  autoSync?: boolean;
  lastSyncTime?: string;
  syncStatus?: 'live' | 'pending' | 'outdated' | 'error' | 'never';
  autoSyncFields?: string[];
  
  // Default financial fields
  default_aid_type?: string;
  default_finance_type?: string;
  default_flow_type?: string;
  default_tied_status?: string;
  default_aid_modality?: string;
  default_aid_modality_override?: boolean;
  tied_status?: string; // Legacy field
  
  // Participating organisation arrays (by role) - with logo support
  fundingOrgs?: Array<{ name: string; acronym?: string | null; logo?: string | null }>;
  extendingOrgs?: Array<{ name: string; acronym?: string | null; logo?: string | null }>;
  implementingOrgs?: Array<{ name: string; acronym?: string | null; logo?: string | null }>;
  accountableOrgs?: Array<{ name: string; acronym?: string | null; logo?: string | null }>;
  
  // Description fields (IATI description types)
  description_general?: string;
  description_objectives?: string;
  description_target_groups?: string;
  description_other?: string;
  
  // SDG mappings
  sdgMappings?: Array<{
    id?: string;
    sdgGoal: number | string;
    sdgTarget?: string;
    contributionPercent?: number;
    notes?: string;
  }>;

  // Budget status
  budgetStatus?: BudgetStatusType;
  onBudgetPercentage?: number;

  // Capital Spend
  capitalSpendPercentage?: number | null;

  // Humanitarian flag
  humanitarian?: boolean;

  // Locations data
  locations?: {
    site_locations?: Array<{
      id?: string;
      location_name: string;
      description?: string;
      lat?: number;
      lng?: number;
      category?: string;
    }>;
    broad_coverage_locations?: Array<{
      id?: string;
      admin_unit: string;
      description?: string;
      percentage?: number | null;
      state_region_name?: string;
      state_region_code?: string;
    }>;
  };

  // Recipient country/region data
  recipient_countries?: Array<{
    country: { code: string; name: string };
    percentage: number;
  }>;
  recipient_regions?: Array<{
    region: { code: string; name: string };
    percentage: number;
  }>;

  // Policy markers
  policyMarkers?: Array<{
    policy_marker_id: string;
    significance?: number;
    code?: string;
    name?: string;
    iati_code?: string;
    is_iati_standard?: boolean;
  }>;

  // Creator profile for metadata columns
  creatorProfile?: {
    name: string;
    department: string | null;
  } | null;
};

type SortField = 'title' | 'partnerId' | 'createdBy' | 'commitments' | 'disbursements' | 'plannedDisbursements' | 'createdAt' | 'updatedAt' | 'activityStatus' | 'actualLength' | 'totalExpectedLength' | 'implementationToDate' | 'remainingDuration' | 'durationBand' | 'plannedStartDate' | 'plannedEndDate' | 'actualStartDate' | 'actualEndDate';
type SortOrder = 'asc' | 'desc';


// getActivityStatusLabel imported from @/lib/activity-status-utils



// Helper function to format currency
const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    // Format millions with 1 decimal place
    const millions = amount / 1000000;
    return `${millions.toFixed(1)}m`;
  } else if (amount >= 1000) {
    // Format thousands with 1 decimal place
    const thousands = amount / 1000;
    return `${thousands.toFixed(1)}k`;
  } else {
    // Format regular numbers with no decimals
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
};

// Helper function to format organisation list for display
// Shows condensed view: "Name 1, Name 2 + X more" if more than 2
const formatOrganisationList = (orgs: string[]): { display: string; full: string[] } => {
  if (!orgs || orgs.length === 0) return { display: '—', full: [] };
  if (orgs.length === 1) return { display: orgs[0], full: orgs };
  if (orgs.length === 2) return { display: `${orgs[0]}, ${orgs[1]}`, full: orgs };
  return { 
    display: `${orgs[0]}, ${orgs[1]} + ${orgs.length - 2} more`, 
    full: orgs 
  };
};

// Helper function to truncate description text for display
// Shows first 120 characters with ellipsis, full text in tooltip
// Handles HTML content by converting to plain text for truncated display
const truncateDescription = (text: string | null | undefined, maxLength: number = 120): { display: string; full: string | null; isHtml: boolean } => {
  if (!text) return { display: '—', full: null, isHtml: false };
  
  // Check if content contains HTML tags
  const hasHtml = /<[^>]+>/.test(text);
  
  if (hasHtml) {
    // Convert to plain text for display truncation
    const plainText = htmlToPlainText(text);
    if (plainText.length <= maxLength) {
      return { display: plainText, full: text, isHtml: true };
    }
    return { display: plainText.slice(0, maxLength) + '…', full: text, isHtml: true };
  }
  
  // Plain text handling (no HTML)
  if (text.length <= maxLength) return { display: text, full: text, isHtml: false };
  return { display: text.slice(0, maxLength) + '…', full: text, isHtml: false };
};

// Helper function to check if user can edit an activity
const canUserEditActivity = (user: any, activity: Activity): boolean => {
  if (!user) return false;
  
  // Superuser can edit all activities
  if (user.role === USER_ROLES.SUPER_USER) {
    return true;
  }
  
  // User associated with the organization that created the activity
  if (user.organizationId && activity.createdByOrg && user.organizationId === activity.createdByOrg) {
    return true;
  }
  
  return false;
};

// Helper function to calculate time elapsed percentage between start and end dates
const calculateTimeElapsedPercent = (activity: Activity): number | null => {
  const startDate = activity.actualStartDate || activity.plannedStartDate;
  const endDate = activity.plannedEndDate;
  
  if (!startDate || !endDate) return null;
  
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  
  if (end <= start) return null; // Invalid date range
  
  const elapsed = now - start;
  const total = end - start;
  const percent = (elapsed / total) * 100;
  
  return Math.min(Math.max(0, percent), 100); // Clamp between 0-100
};

// Helper function to calculate % of committed funds spent
const calculateCommittedSpentPercent = (activity: Activity): number | null => {
  const committed = activity.commitments || 0;
  if (committed === 0) return null;
  
  const spent = (activity.disbursements || 0) + (activity.expenditures || 0);
  return Math.min((spent / committed) * 100, 100);
};

// Helper function to calculate % of budget spent
const calculateBudgetSpentPercent = (activity: Activity): number | null => {
  const budget = (activity as any).totalBudget || 0;
  if (budget === 0) return null;
  
  const spent = (activity.disbursements || 0) + (activity.expenditures || 0);
  return Math.min((spent / budget) * 100, 100);
};

// Helper function to format date as "1 January 2021"
const formatDateLong = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'd MMMM yyyy');
  } catch {
    return dateString;
  }
};


function ActivitiesPageContent() {
  // Enable optimization to get conditional image loading
  const enableOptimization = true;
  
  // Common state regardless of optimization (moved before hook call)
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [pageLimit, setPageLimit] = useState<number>(20);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Bulk selection state
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    activityId: string;
    x: number;
    y: number;
  } | null>(null);
  
  // Sector filter state (hierarchical filter like Map & Analysis page)
  const [sectorFilter, setSectorFilter] = useState<SectorFilterSelection>({
    sectorCategories: [],
    sectors: [],
    subSectors: [],
  });
  
  // Track which filter dropdown is currently open (only one at a time)
  const [openFilterId, setOpenFilterId] = useState<string | null>(null);
  
  // Helper to handle filter open/close - ensures only one filter is open at a time
  const handleFilterOpenChange = (filterId: string) => (isOpen: boolean) => {
    setOpenFilterId(isOpen ? filterId : null);
  };
  
  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<ActivityColumnId[]>(defaultVisibleActivityColumns);

  const { getOrderedVisibleColumns, handleReorder: handleColumnReorder } = useColumnOrder<ActivityColumnId>({
    storageKey: ACTIVITY_COLUMN_ORDER_LOCALSTORAGE_KEY,
    columns: activityColumns,
  });

  // Get draggable columns (exclude always-visible checkbox/actions)
  const draggableColumnIds = visibleColumns.filter((id) => id !== 'checkbox' && id !== 'actions');
  const orderedDraggableColumns = getOrderedVisibleColumns(draggableColumnIds);

  // User's saved default columns from profile (used as reset target)
  const [userDefaultColumns, setUserDefaultColumns] = useState<ActivityColumnId[] | null>(null);

  // Location display mode state (percentage or USD)
  const [locationDisplayMode, setLocationDisplayMode] = useState<'percentage' | 'usd'>('percentage');

  // Load visible columns from localStorage on mount, falling back to user profile defaults
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACTIVITY_COLUMNS_LOCALSTORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ActivityColumnId[];
        // Validate that all saved columns are valid column IDs
        const validColumns = parsed.filter(id =>
          activityColumns.some(config => config.id === id)
        );
        // Ensure always-visible columns are included
        const alwaysVisible = activityColumns
          .filter(c => c.alwaysVisible)
          .map(c => c.id);
        const merged = [...new Set([...alwaysVisible, ...validColumns])];
        setVisibleColumns(merged);
      } else {
        // No localStorage — try to load user's saved defaults from profile
        apiFetch('/api/users/column-preferences')
          .then(res => res.json())
          .then(data => {
            if (data.columns && Array.isArray(data.columns)) {
              const validColumns = (data.columns as string[]).filter(id =>
                activityColumns.some(config => config.id === id)
              ) as ActivityColumnId[];
              const alwaysVisible = activityColumns
                .filter(c => c.alwaysVisible)
                .map(c => c.id);
              const merged = [...new Set([...alwaysVisible, ...validColumns])];
              setVisibleColumns(merged);
              setUserDefaultColumns(validColumns);
            }
          })
          .catch(() => {
            // Silently fall back to system defaults (already set)
          });
      }
    } catch (e) {
      console.error('Failed to load column preferences from localStorage:', e);
    }

    // Also fetch user defaults for the reset button regardless
    apiFetch('/api/users/column-preferences')
      .then(res => res.json())
      .then(data => {
        if (data.columns && Array.isArray(data.columns)) {
          const validColumns = (data.columns as string[]).filter(id =>
            activityColumns.some(config => config.id === id)
          ) as ActivityColumnId[];
          setUserDefaultColumns(validColumns);
        }
      })
      .catch(() => {});
  }, []);

  // Save visible columns to localStorage when they change
  const handleColumnsChange = useCallback((newColumns: ActivityColumnId[]) => {
    setVisibleColumns(newColumns);
    try {
      localStorage.setItem(ACTIVITY_COLUMNS_LOCALSTORAGE_KEY, JSON.stringify(newColumns));
    } catch (e) {
      console.error('Failed to save column preferences to localStorage:', e);
    }
  }, []);
  
  // Use optimized hook if enabled, otherwise fall back to original implementation
  const optimizedData = useOptimizedActivities({
    pageSize: pageLimit,
    enableOptimization,
    viewMode: viewMode,
    onError: (error) => {
      console.error('[Activities Page] Optimization error:', error);
      // Could fall back to original implementation here if needed
    }
  });
  
  // Legacy state for backward compatibility when optimizations are disabled
  const [legacyActivities, setLegacyActivities] = useState<Activity[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(true);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [legacyCurrentPage, setLegacyCurrentPage] = useState(1);
  
  // Legacy sorting state for non-optimized version
  const [legacySortField, setLegacySortField] = useState<SortField>('updatedAt');
  const [legacySortOrder, setLegacySortOrder] = useState<SortOrder>('desc');
  
const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  // Track if we've ever successfully loaded data to prevent flash of empty state
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Debounced empty-state flag to avoid flicker (skeleton → empty → list)
  const [showEmptyState, setShowEmptyState] = useState(false);
  const emptyTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Global loading bar for top-of-screen progress indicator
  const { startLoading, stopLoading } = useLoadingBar();
  
  // Use optimization mode to get conditional image loading
  const usingOptimization = enableOptimization;
  
  // Safely extract optimized data with fallbacks
  const safeOptimizedData = {
    activities: optimizedData?.activities || [],
    loading: optimizedData?.loading || false,
    error: optimizedData?.error || null,
    searchQuery: optimizedData?.searchQuery || '',
    setSearchQuery: optimizedData?.setSearchQuery || (() => {}),
    currentPage: optimizedData?.currentPage || 1,
    totalCount: optimizedData?.totalCount || 0,
    totalPages: optimizedData?.totalPages || 1,
    setPage: optimizedData?.setPage || (() => {}),
    refetch: optimizedData?.refetch || (() => {}),
    removeActivity: optimizedData?.removeActivity || (() => {}),
    systemTotals: optimizedData?.systemTotals || null,
    sorting: {
      sortField: optimizedData?.sorting?.sortField || 'updatedAt',
      sortOrder: optimizedData?.sorting?.sortOrder || 'desc',
      handleSort: optimizedData?.sorting?.handleSort || (() => {})
    },
    filters: {
      // Multi-select array-based filters
      activityStatuses: optimizedData?.filters?.activityStatuses || [],
      setActivityStatuses: optimizedData?.filters?.setActivityStatuses || (() => {}),
      submissionStatuses: optimizedData?.filters?.submissionStatuses || [],
      setSubmissionStatuses: optimizedData?.filters?.setSubmissionStatuses || (() => {}),
      reportedByOrgs: optimizedData?.filters?.reportedByOrgs || [],
      setReportedByOrgs: optimizedData?.filters?.setReportedByOrgs || (() => {}),
      aidTypes: optimizedData?.filters?.aidTypes || [],
      setAidTypes: optimizedData?.filters?.setAidTypes || (() => {}),
      flowTypes: optimizedData?.filters?.flowTypes || [],
      setFlowTypes: optimizedData?.filters?.setFlowTypes || (() => {}),
      tiedStatuses: optimizedData?.filters?.tiedStatuses || [],
      setTiedStatuses: optimizedData?.filters?.setTiedStatuses || (() => {}),
      // Legacy single-value getters for backward compatibility
      activityStatus: optimizedData?.filters?.activityStatus || 'all',
      setActivityStatus: optimizedData?.filters?.setActivityStatus || (() => {}),
      submissionStatus: optimizedData?.filters?.submissionStatus || 'all',
      setSubmissionStatus: optimizedData?.filters?.setSubmissionStatus || (() => {}),
      reportedBy: optimizedData?.filters?.reportedBy || 'all',
      setReportedBy: optimizedData?.filters?.setReportedBy || (() => {}),
      aidType: optimizedData?.filters?.aidType || 'all',
      setAidType: optimizedData?.filters?.setAidType || (() => {}),
      flowType: optimizedData?.filters?.flowType || 'all',
      setFlowType: optimizedData?.filters?.setFlowType || (() => {}),
    }
  };
  
  const activities = usingOptimization ? safeOptimizedData.activities : legacyActivities;
  const sortField = usingOptimization ? safeOptimizedData.sorting.sortField : legacySortField;
  const sortOrder = usingOptimization ? safeOptimizedData.sorting.sortOrder : legacySortOrder;
  const systemTotals = usingOptimization ? safeOptimizedData.systemTotals : null;
  
  const loading = usingOptimization ? safeOptimizedData.loading : legacyLoading;
  const error = usingOptimization ? safeOptimizedData.error : legacyError;
  const searchQuery = usingOptimization ? safeOptimizedData.searchQuery : '';
  const setSearchQuery = usingOptimization ? safeOptimizedData.setSearchQuery : () => {};
  const currentPage = usingOptimization ? safeOptimizedData.currentPage : legacyCurrentPage;
  const totalActivitiesCount = usingOptimization ? safeOptimizedData.totalCount : legacyActivities.length;
  const setCurrentPage = usingOptimization ? safeOptimizedData.setPage : setLegacyCurrentPage;
  
  // Filter states - use safe optimized filters (multi-select arrays)
  const filterStatuses = usingOptimization ? safeOptimizedData.filters.activityStatuses : [];
  const setFilterStatuses = usingOptimization ? safeOptimizedData.filters.setActivityStatuses : () => {};

  const filterValidations = usingOptimization ? safeOptimizedData.filters.submissionStatuses : [];
  const setFilterValidations = usingOptimization ? safeOptimizedData.filters.setSubmissionStatuses : () => {};

  // Additional filters (multi-select arrays)
  const filterReportedByOrgs = usingOptimization ? safeOptimizedData.filters.reportedByOrgs : [];
  const setFilterReportedByOrgs = usingOptimization ? safeOptimizedData.filters.setReportedByOrgs : () => {};
  const filterAidTypes = usingOptimization ? safeOptimizedData.filters.aidTypes : [];
  const setFilterAidTypes = usingOptimization ? safeOptimizedData.filters.setAidTypes : () => {};
  const filterFlowTypes = usingOptimization ? safeOptimizedData.filters.flowTypes : [];
  const setFilterFlowTypes = usingOptimization ? safeOptimizedData.filters.setFlowTypes : () => {};

  // Legacy single-value getters for backward compatibility
  const filterStatus = usingOptimization ? safeOptimizedData.filters.activityStatus : 'all';
  const setFilterStatus = usingOptimization ? safeOptimizedData.filters.setActivityStatus : () => {};
  const filterValidation = usingOptimization ? safeOptimizedData.filters.submissionStatus : 'all';
  const setFilterValidation = usingOptimization ? safeOptimizedData.filters.setSubmissionStatus : () => {};
  const filterReportedBy = usingOptimization ? safeOptimizedData.filters.reportedBy : 'all';
  const setFilterReportedBy = usingOptimization ? safeOptimizedData.filters.setReportedBy : () => {};
  const filterAidType = usingOptimization ? safeOptimizedData.filters.aidType : 'all';
  const setFilterAidType = usingOptimization ? safeOptimizedData.filters.setAidType : () => {};
  const filterFlowType = usingOptimization ? safeOptimizedData.filters.flowType : 'all';
  const setFilterFlowType = usingOptimization ? safeOptimizedData.filters.setFlowType : () => {};


  // Debounced empty state display will be handled after totalActivities is computed

  // Copy ID to clipboard
  const copyToClipboard = (text: string, type: 'partnerId' | 'iatiIdentifier' | 'acronym', activityId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`${activityId}-${type}`);
    setTimeout(() => setCopiedId(null), 2000);
    const message = type === 'partnerId' ? 'Activity ID' : type === 'iatiIdentifier' ? 'IATI Identifier' : 'Activity title';
    toast.success(`${message} copied to clipboard`);
  };

  const fetchOrganizations = async () => {
    try {
      const res = await apiFetch("/api/organizations", {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      });
      if (res.ok) {
        const orgs = await res.json();
        setOrganizations(orgs);
      } else {
        console.error("[AIMS] Organizations request failed:", res.status, res.statusText);
      }
    } catch (error) {
      console.error("[AIMS] Error fetching organizations:", error);
    }
  };

  // Organization lookup maps for O(1) access instead of O(n) array searches
  const orgByIdMap = useMemo(() => {
    const map = new Map<string, Organization>();
    organizations.forEach(org => {
      map.set(org.id, org);
    });
    return map;
  }, [organizations]);

  const orgByNameMap = useMemo(() => {
    const map = new Map<string, Organization>();
    organizations.forEach(org => {
      if (org.name) {
        map.set(org.name.toLowerCase(), org);
      }
      if (org.acronym) {
        map.set(org.acronym.toLowerCase(), org);
      }
    });
    return map;
  }, [organizations]);

  const orgByIatiRefMap = useMemo(() => {
    const map = new Map<string, Organization>();
    organizations.forEach(org => {
      // Some organizations might have iati_org_id field
      const iatiRef = (org as any).iati_org_id;
      if (iatiRef) {
        map.set(iatiRef, org);
      }
    });
    return map;
  }, [organizations]);

  const formatOrganizationAcronyms = (acronyms: string[]): string => {
    if (acronyms.length === 0) return "";
    if (acronyms.length <= 3) return acronyms.join(", ");
    return `${acronyms.slice(0, 3).join(", ")} +${acronyms.length - 3} more`;
  };

  // Removed duplicate - using memoized version below

  // Legacy AbortController for non-optimized requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Pre-caching for better performance (still useful for other data)
  const { preCacheActivityList } = usePreCache();
  
  // Initialize activity list pre-caching (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined' && !usingOptimization) {
      preCacheActivityList().catch(console.warn);
    }
  }, [preCacheActivityList, usingOptimization]);

  // Legacy fetch function for when optimizations are disabled
  const fetchActivities = useCallback(async (page: number = 1, fetchAll: boolean = false) => {
    console.log('[AIMS] fetchActivities called - usingOptimization:', usingOptimization);
    
    if (usingOptimization) {
      // Use optimized hook's refetch instead
      console.log('[AIMS] Using optimized refetch');
      optimizedData?.refetch();
      return;
    }
    
    console.log('[AIMS] Using legacy fetch');
    
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      setLegacyError(null);
      const timestamp = new Date().getTime();
      const limitParam = `limit=500`;
      const res = await apiFetch(`/api/activities-simple?page=1&${limitParam}&t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        signal: abortControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'same-origin'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("[AIMS] API Error:", res.status, errorText);
        throw new Error(`Failed to fetch activities: ${res.status}`);
      }
      
      const response = await res.json();
      const data = response.data || response;
      setLegacyActivities(Array.isArray(data) ? data : []);
      console.log("[AIMS Debug] Legacy fetch - Activities:", Array.isArray(data) ? data.length : 0);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[AIMS] Legacy request aborted');
        return;
      }

      console.error("[AIMS] Legacy fetch error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load activities";
      setLegacyError(errorMessage);
      toast.error(errorMessage);
      setLegacyActivities([]);
    }
  }, [usingOptimization]);

  // Load saved page limit preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('activities-page-limit');
    if (saved) {
      setPageLimit(Number(saved));
    }
  }, []);

  // Fetch organizations and legacy activities if needed
  useEffect(() => {
    const fetchData = async () => {
      if (!usingOptimization) {
        setLegacyLoading(true);
      }
      
      try {
        const promises = [fetchOrganizations()];
        
        // Only fetch activities if not using optimization
        if (!usingOptimization) {
          promises.push(fetchActivities(1, false));
        }
        
        await Promise.all(promises);
      } finally {
        if (!usingOptimization) {
          setLegacyLoading(false);
        }
      }
    };
    
    if (!userLoading) {
      fetchData();
    }
  }, [userLoading, usingOptimization]);

  // Track when we've successfully loaded data at least once
  useEffect(() => {
    if (!loading && !userLoading) {
      // Add a small delay on initial load to ensure skeleton shows
      if (isInitialLoad) {
        setTimeout(() => {
          setHasLoadedOnce(true);
          setIsInitialLoad(false);
        }, 500);
      } else {
        setHasLoadedOnce(true);
      }
    }
  }, [loading, userLoading, isInitialLoad]);

  // Show/hide global loading bar based on loading state
  useEffect(() => {
    const isPageLoading = loading || userLoading || !hasLoadedOnce || isInitialLoad;
    if (isPageLoading) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [loading, userLoading, hasLoadedOnce, isInitialLoad, startLoading, stopLoading]);

  // NOTE: debounced empty-state effect moved below where dependent variables are initialized

  // Don't refetch on filter changes - we do client-side filtering
  // Only refetch if we need fresh data

  const handleDelete = async (id: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    // Get the activity title for better toast feedback
    let activityTitle = '';
    if (usingOptimization) {
      const activity = safeOptimizedData.activities.find(a => a.id === id);
      activityTitle = (activity as any)?.title_narrative || activity?.title || 'Activity';
    } else {
      const activity = legacyActivities.find(a => a.id === id);
      activityTitle = (activity as any)?.title_narrative || activity?.title || 'Activity';
    }
    
    try {
      // Immediately remove the activity from the UI (optimistic update)
      if (retryCount === 0) {
        setDeleteActivityId(null);
        
        if (usingOptimization) {
          safeOptimizedData.removeActivity(id);
        } else {
          setLegacyActivities(prev => prev.filter(activity => activity.id !== id));
        }
      }
      
      const res = await apiFetch("/api/activities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id,
          user: user ? {
            id: user.id,
            name: user.name,
            role: user.role,
          } : undefined,
        }),
      });
      
      if (!res.ok) {
        let errorData: any = { error: 'Unknown error' };
        try {
          errorData = await res.json();
        } catch (e) {
          console.error("[AIMS] Delete API error (no JSON response):", {
            status: res.status,
            statusText: res.statusText,
            url: res.url
          });
        }
        
        console.error("[AIMS] Delete API error:", {
          status: res.status,
          statusText: res.statusText,
          error: errorData,
          activityId: id
        });
        
        // If it's a 404, check if it's "Activity not found" (already deleted) or route not found
        if (res.status === 404) {
          // If the error message indicates the activity wasn't found, treat as success
          if (errorData.error === "Activity not found" || errorData.error === "No activities found") {
            console.log("[AIMS] Activity already deleted:", id);
            toast.success(`"${activityTitle}" was deleted successfully`);

            // Refetch to ensure UI is in sync with backend (prevents reappearing activity)
            // Increased delay to ensure database transaction has committed
            setTimeout(() => {
              if (usingOptimization) {
                safeOptimizedData.refetch();
              } else {
                fetchActivities(currentPage, false);
              }
            }, 500);

            return;
          } else {
            // Route not found - this is a deployment/build issue
            console.error("[AIMS] DELETE route not found (404) - this is a deployment issue");
            toast.error("Delete endpoint not found. Please contact support or try refreshing the page.");
            // Revert optimistic update
            if (usingOptimization) {
              safeOptimizedData.refetch();
            } else {
              window.location.reload();
            }
            throw new Error("Delete endpoint not found");
          }
        }
        
        // For other errors, we need to revert the optimistic update or refetch
        if (retryCount === 0) {
          console.error("[AIMS] Delete failed, reverting optimistic update");
          if (usingOptimization) {
            safeOptimizedData.refetch(); // Refetch to get current state
          } else {
            // For legacy mode, we'd need to restore the activity or refetch
            // For now, just refetch by calling the fetch function
            window.location.reload(); // Simple fallback
          }
        }
        
        throw new Error(errorData.error || "Failed to delete activity");
      }
      
      console.log('[AIMS] About to show success toast for deletion:', activityTitle);
      toast.success(`"${activityTitle}" was deleted successfully`);
      
      // Refetch to ensure UI is in sync with backend (prevents reappearing activity)
      // Use a longer delay to ensure backend has processed the deletion and database has committed
      setTimeout(() => {
        if (usingOptimization) {
          safeOptimizedData.refetch();
        } else {
          fetchActivities(currentPage, false);
        }
      }, 500);
      
    } catch (error) {
      console.error(`[AIMS] Error deleting activity (attempt ${retryCount + 1}):`, error);
      
      // Check if it's a network/connection error
      const isNetworkError = error instanceof Error && 
        (error.message.includes('fetch failed') || 
         error.message.includes('network') ||
         error.message.includes('Failed to fetch'));
      
      if (isNetworkError && retryCount < MAX_RETRIES) {
        // Retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        toast.error(`Connection error. Retrying in ${delay/1000}s...`);
        
        setTimeout(() => {
          handleDelete(id, retryCount + 1);
        }, delay);
      } else {
        // Max retries reached or non-network error
        fetchActivities(currentPage, false); // Restore the activity in the list
        toast.error(
          isNetworkError 
            ? "Unable to connect to database. Please check your internet connection and try again."
            : error instanceof Error ? error.message : "Failed to delete activity"
        );
      }
    }
  };

  // Export handlers
  const handleExportActivityPDF = async (activityId: string) => {
    toast.loading("Generating PDF...", { id: "export-pdf" });
    try {
      await exportActivityToPDF(activityId);
      toast.success("PDF exported successfully", { id: "export-pdf" });
    } catch (error) {
      console.error("Error exporting activity to PDF:", error);
      toast.error("Failed to export PDF", { id: "export-pdf" });
    }
  };

  const handleExportActivityExcel = async (activityId: string) => {
    toast.loading("Generating Excel...", { id: "export-excel" });
    try {
      await exportActivityToExcel(activityId);
      toast.success("Excel exported successfully", { id: "export-excel" });
    } catch (error) {
      console.error("Error exporting activity to Excel:", error);
      toast.error("Failed to export Excel", { id: "export-excel" });
    }
  };

  const handleExportActivityXML = async (activityId: string) => {
    toast.loading("Generating IATI XML...", { id: "export-xml" });
    try {
      const response = await apiFetch(`/api/activities/${activityId}/export-iati`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activityId}.xml`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("IATI XML exported successfully", { id: "export-xml" });
    } catch (error) {
      console.error("Error exporting activity to IATI XML:", error);
      toast.error("Failed to export IATI XML", { id: "export-xml" });
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = paginatedActivities.map(activity => activity.id);
      setSelectedActivityIds(new Set(allIds));
    } else {
      setSelectedActivityIds(new Set());
    }
  };

  const handleSelectActivity = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedActivityIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedActivityIds(newSelected);
  };

  const handleBulkDelete = async () => {
    const selectedArray = Array.from(selectedActivityIds);
    if (selectedArray.length === 0) return;
    
    setShowBulkDeleteDialog(false);
    setIsBulkDeleting(true);
    
    try {
      // Optimistic update - remove from UI immediately
      const remainingActivities = activities.filter(activity => !selectedActivityIds.has(activity.id));
      
      if (usingOptimization) {
        // Remove each activity from optimized data
        selectedArray.forEach(id => safeOptimizedData.removeActivity(id));
      } else {
        setLegacyActivities(remainingActivities);
      }
      
      const response = await apiFetch('/api/activities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedArray,
          user: user ? {
            id: user.id,
            name: user.name,
            role: user.role
          } : undefined
        })
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to delete activities';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('[Activities] Delete API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
        } catch (e) {
          console.error('[Activities] Delete API error (no JSON):', {
            status: response.status,
            statusText: response.statusText
          });
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      toast.success(`${result.deletedCount} ${result.deletedCount === 1 ? 'activity' : 'activities'} deleted successfully`);
      
      // Clear selection
      setSelectedActivityIds(new Set());
      
      // Force refresh to ensure list is up to date and remove any stale entries
      // Use delay to ensure database has committed the deletion
      setTimeout(() => {
        if (usingOptimization) {
          safeOptimizedData.refetch();
        } else {
          fetchActivities(currentPage, false);
        }
      }, 500);
      
    } catch (error) {
      console.error('Bulk delete failed:', error);
      
      // Check if it's a 404 (route not found) vs other error
      if (error instanceof Error && error.message.includes('Delete endpoint not found')) {
        toast.error('Delete feature is temporarily unavailable. Please refresh the page.');
      } else {
        toast.error('Failed to delete some activities');
      }
      
      // Revert optimistic updates by refetching
      setTimeout(() => {
        if (usingOptimization) {
          safeOptimizedData.refetch();
        } else {
          fetchActivities(currentPage, false);
        }
      }, 500);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (usingOptimization) {
      safeOptimizedData.sorting.handleSort(field);
    } else {
      if (legacySortField === field) {
        setLegacySortOrder(legacySortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setLegacySortField(field);
        setLegacySortOrder('asc');
      }
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-gray-400" />
      : <ArrowDown className="h-4 w-4 text-gray-400" />;
  };

  // Helper to render column header text with tooltip
  const ColumnHeaderText = ({ columnId, children }: { columnId: ActivityColumnId; children: React.ReactNode }) => {
    const description = columnDescriptions[columnId];
    if (!description) return <>{children}</>;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help border-b border-dotted border-muted-foreground/50">{children}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const exportActivities = () => {
    const dataToExport = activities.map(activity => {
      const sectors = activity.sectors?.map((s: any) => `${s.name} (${s.percentage}%)`).join("; ") || "";
      
      return {
        "Activity ID": activity.partnerId || "",
        "IATI ID": activity.iatiId || "",
        "UUID": activity.id,
        "Title": activity.title,
        "Description": activity.description || "",
        "Activity Status": activity.activityStatus || activity.status || "",
        "Submission Status": activity.submissionStatus || "draft",
        "Publication Status": activity.publicationStatus || "draft",
        "Reported by Organization": activity.created_by_org_name || "",
          "Organization Acronym": activity.created_by_org_acronym || "",
        "Target Groups": activity.targetGroups || "",
        "Collaboration Type": activity.collaborationType || "",
        "Sectors": sectors,
        "Planned Budget (USD)": activity.totalPlannedBudgetUSD || 0,
        "Disbursements & Expenditure (USD)": activity.totalDisbursementsAndExpenditureUSD || (activity.disbursements || 0) + (activity.expenditures || 0),
        "Inflows (USD)": activity.inflows || 0,
        "Default Currency": (activity as any).defaultCurrency || "USD",
        "Currency Note": "Financial amounts are aggregated in USD using historical exchange rates. For detailed transaction-level currency information, export individual activity transactions.",
        "Created Date": format(new Date(activity.createdAt), "yyyy-MM-dd"),
        "Updated Date": format(new Date(activity.updatedAt), "yyyy-MM-dd"),
      };
    });

    const headers = Object.keys(dataToExport[0] || {});
    const csv = [
      headers.join(","),
      ...dataToExport.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === "string" && value.includes(",") 
            ? `"${value}"` 
            : value;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activities-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Activities exported successfully");
  };

  // Client-side filtering for legacy implementation only
  // Optimized implementation handles most filtering on server-side, but sector filter is client-side
  const filteredActivities = useMemo(() => {
    // Check if sector filter is active
    const hasSectorFilter = 
      sectorFilter.sectorCategories.length > 0 || 
      sectorFilter.sectors.length > 0 || 
      sectorFilter.subSectors.length > 0;
    
    if (usingOptimization) {
      let result = activities;
      if (hasSectorFilter) {
        result = result.filter(activity => {
          const activitySectors = activity.sectors || [];
          const sectorCodes = activitySectors.map((s: any) => s.code || s.sector_code);
          return matchesSectorFilter(sectorCodes, sectorFilter);
        });
      }
      return result;
    }
    
    // Legacy client-side filtering (search removed as it's now global)
    return activities.filter(activity => {
      const activityStatus = activity.activityStatus || 
        (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "1");
      const publicationStatus = activity.publicationStatus || 
        (activity.status === "published" ? "published" : "draft");
      const submissionStatus = activity.submissionStatus || 'draft';
      
      const matchesActivityStatus = filterStatus === "all" || activityStatus === filterStatus;
      const matchesValidationStatus = filterValidation === "all" || 
        (filterValidation === "validated" && submissionStatus === "validated") ||
        (filterValidation === "rejected" && submissionStatus === "rejected") ||
        (filterValidation === "pending" && !["validated", "rejected"].includes(submissionStatus));
      
      // Apply sector filter
      let matchesSectorSelection = true;
      if (hasSectorFilter) {
        const activitySectors = activity.sectors || [];
        const sectorCodes = activitySectors.map((s: any) => s.code || s.sector_code);
        matchesSectorSelection = matchesSectorFilter(sectorCodes, sectorFilter);
      }
      
      return matchesActivityStatus && matchesValidationStatus && matchesSectorSelection;
    });
  }, [usingOptimization, activities, filterStatus, filterValidation, sectorFilter]);

  // Pre-compute creator organization strings for all filtered activities
  // This cache eliminates repeated lookups during rendering and sorting
  const creatorOrgCache = useMemo(() => {
    const cache = new Map<string, string>();
    
    filteredActivities.forEach(activity => {
      let result: string;
      
      // First, check if we have a stored acronym
      if (activity.created_by_org_acronym) {
        result = activity.created_by_org_acronym;
      }
      // Second, check if we have a stored name (return it directly - this is the source of truth)
      // IMPORTANT: If created_by_org_name is set, use it even if reportingOrgId points elsewhere
      // This handles cases where activity was imported as "original publisher"
      else if (activity.created_by_org_name && activity.created_by_org_name !== 'Unknown' && activity.created_by_org_name.trim() !== '') {
        // Try to find org to get acronym, but return name if not found
        const org = orgByNameMap.get(activity.created_by_org_name.toLowerCase());
        result = org?.acronym || activity.created_by_org_name;
      }
      // Only fall back to ID lookups if created_by_org_name is not set
      // Look up by reporting_org_id (new field)
      else if (activity.reportingOrgId) {
        const org = orgByIdMap.get(activity.reportingOrgId);
        result = org?.acronym || org?.name || "Unknown";
      }
      // Look up by legacy createdByOrg field
      else if (activity.createdByOrg) {
        const org = orgByIdMap.get(activity.createdByOrg);
        result = org?.acronym || org?.name || "Unknown";
      }
      // Fallback: Use reporting_org_ref if available (IATI identifier like "AU-5")
      else if (activity.reportingOrgRef) {
        // Try to find by IATI ref first
        const orgByRef = orgByIatiRefMap.get(activity.reportingOrgRef);
        if (orgByRef) {
          result = orgByRef.acronym || orgByRef.name || activity.reportingOrgRef;
        } else {
          result = activity.reportingOrgRef;
        }
      }
      else {
        result = "Unknown";
      }
      
      cache.set(activity.id, result);
    });
    
    return cache;
  }, [filteredActivities, orgByIdMap, orgByNameMap, orgByIatiRefMap]);

  // Pre-compute organization acronyms for all filtered activities
  // This cache eliminates repeated lookups during rendering
  const organizationAcronymsCache = useMemo(() => {
    const cache = new Map<string, string[]>();
    
    filteredActivities.forEach(activity => {
      const orgIds = new Set<string>();
      const acronyms: string[] = [];

      // Collect organization IDs from activity creator
      if (activity.createdByOrg) {
        orgIds.add(activity.createdByOrg);
      }
      
      // Collect from activity contributors
      if ((activity as any).activity_contributors) {
        (activity as any).activity_contributors.forEach((contributor: any) => {
          if (contributor.organization_id && (contributor.status === 'accepted' || contributor.status === 'active')) {
            orgIds.add(contributor.organization_id);
          }
        });
      }
      
      // Collect from transactions using organization_id
      activity.transactions?.forEach(transaction => {
        if ((transaction as any).organization_id) {
          orgIds.add((transaction as any).organization_id);
        }
      });

      // Convert IDs to acronyms using lookup map (O(1) instead of O(n))
      Array.from(orgIds).forEach(id => {
        const org = orgByIdMap.get(id);
        if (org && org.acronym) {
          acronyms.push(org.acronym);
        }
      });

      // Remove duplicates and sort alphabetically
      cache.set(activity.id, Array.from(new Set(acronyms)).sort());
    });
    
    return cache;
  }, [filteredActivities, orgByIdMap]);

  const getOrganizationAcronyms = useCallback((activity: Activity): string[] => {
    // Use pre-computed cache for O(1) lookup
    return organizationAcronymsCache.get(activity.id) || [];
  }, [organizationAcronymsCache]);

  // Memoized helper function - defined after cache creation
  // Optimized to use pre-computed cache instead of performing lookups
  const getCreatorOrganization = useCallback((activity: Activity): string => {
    // Use pre-computed cache for O(1) lookup
    return creatorOrgCache.get(activity.id) || "Unknown";
  }, [creatorOrgCache]);

  // Client-side sorting for legacy implementation only
  const sortedActivities = useMemo(() => {
    if (usingOptimization) {
      // Server-side sorting already applied
      return filteredActivities;
    }
    
    // Legacy client-side sorting
    return [...filteredActivities].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (legacySortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'partnerId':
          aValue = a.partnerId?.toLowerCase() || '';
          bValue = b.partnerId?.toLowerCase() || '';
          break;
        case 'commitments':
          aValue = (a as any).totalBudget || 0;
          bValue = (b as any).totalBudget || 0;
          break;
        case 'disbursements':
          aValue = (a as any).totalDisbursed || 0;
          bValue = (b as any).totalDisbursed || 0;
          break;
        case 'plannedDisbursements':
          aValue = (a as any).totalPlannedDisbursementsUSD || 0;
          bValue = (b as any).totalPlannedDisbursementsUSD || 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'createdBy':
          // Use cached values directly instead of calling getCreatorOrganization
          aValue = (creatorOrgCache.get(a.id) || "Unknown").toLowerCase();
          bValue = (creatorOrgCache.get(b.id) || "Unknown").toLowerCase();
          break;
        case 'activityStatus':
          aValue = getActivityStatusLabel(a.activityStatus || a.status || '1').toLowerCase();
          bValue = getActivityStatusLabel(b.activityStatus || b.status || '1').toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return legacySortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return legacySortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredActivities, legacySortField, legacySortOrder, usingOptimization, creatorOrgCache]);

  // Pagination logic - use server-side pagination for optimized, client-side for legacy
  const totalActivities = usingOptimization ? totalActivitiesCount : filteredActivities.length;
  const isShowingAll = false;
  const effectiveLimit = pageLimit;
  const totalPages = usingOptimization ? safeOptimizedData.totalPages : Math.ceil(totalActivities / pageLimit);
  
  let paginatedActivities: Activity[];
  let startIndex: number;
  let endIndex: number;
  
  if (usingOptimization) {
    // Server-side pagination already applied
    paginatedActivities = sortedActivities;
    startIndex = (currentPage - 1) * pageLimit;
    endIndex = Math.min(startIndex + sortedActivities.length, totalActivities);
  } else {
    // Legacy client-side pagination
    startIndex = (currentPage - 1) * pageLimit;
    endIndex = Math.min(startIndex + pageLimit, totalActivities);
    paginatedActivities = sortedActivities.slice(startIndex, endIndex);
  }

  // Debounce empty state display to avoid brief flashes during fetch transitions
  useEffect(() => {
    const isLoading = loading || userLoading || !hasLoadedOnce || isInitialLoad;

    if (isLoading) {
      if (emptyTimerRef.current) {
        clearTimeout(emptyTimerRef.current);
        emptyTimerRef.current = null;
      }
      setShowEmptyState(false);
      return;
    }

    if (totalActivities === 0) {
      if (!emptyTimerRef.current) {
        emptyTimerRef.current = setTimeout(() => {
          setShowEmptyState(true);
          emptyTimerRef.current = null;
        }, 400);
      }
    } else {
      if (emptyTimerRef.current) {
        clearTimeout(emptyTimerRef.current);
        emptyTimerRef.current = null;
      }
      setShowEmptyState(false);
    }
  }, [totalActivities, loading, userLoading, hasLoadedOnce, isInitialLoad]);

  // Close context menu on outside click or Escape key
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = () => {
      setContextMenu(null);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);

  // Page limit change handler
  const handlePageLimitChange = useCallback((newLimit: number) => {
    setPageLimit(newLimit);
    if (usingOptimization) {
      // This will be handled by the optimized hook
      safeOptimizedData.setPage(1);
    } else {
      setLegacyCurrentPage(1);
    }
    localStorage.setItem('activities-page-limit', newLimit.toString());
  }, [usingOptimization, safeOptimizedData]);
  
  // Legacy effects for non-optimized version
  useEffect(() => {
    if (!usingOptimization) {
      setLegacyCurrentPage(1);
    }
  }, [pageLimit, usingOptimization]);

  // Component render
  return (
    <MainLayout>
      <div className="max-w-screen-2xl mx-auto px-6 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6" data-tour="activities-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-800">Activities</h1>
            <HelpTextTooltip 
              content="View key information about each activity. Users with appropriate permissions can update or remove activities from this list."
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportActivities}
            className="h-9"
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters and View Controls - All in One Row */}
      <div className="flex items-end gap-3 py-2 bg-surface-muted rounded-lg px-3 border border-gray-200" data-tour="activities-filters">
        {/* Status Filter */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <MultiSelectFilter
            options={[
              { value: "1", label: "Pipeline/identification", code: "1" },
              { value: "2", label: "Implementation", code: "2" },
              { value: "3", label: "Completion", code: "3" },
              { value: "4", label: "Post-completion", code: "4" },
              { value: "5", label: "Cancelled", code: "5" },
              { value: "6", label: "Suspended", code: "6" },
            ]}
            value={filterStatuses}
            onChange={setFilterStatuses}
            placeholder="All"
            searchPlaceholder="Search statuses..."
            emptyText="No statuses found."
            icon={<Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
            className="w-[180px] h-9"
            dropdownClassName="w-[280px]"
            open={openFilterId === 'status'}
            onOpenChange={handleFilterOpenChange('status')}
          />
        </div>

        {/* Validation Filter */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Validation</Label>
          <MultiSelectFilter
            options={[
              { value: "validated", label: "Validated" },
              { value: "rejected", label: "Rejected" },
              { value: "pending", label: "Not Validated" },
            ]}
            value={filterValidations}
            onChange={setFilterValidations}
            placeholder="All"
            searchPlaceholder="Search validations..."
            emptyText="No validations found."
            icon={<ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />}
            className="w-[160px] h-9"
            dropdownClassName="w-[240px]"
            open={openFilterId === 'validation'}
            onOpenChange={handleFilterOpenChange('validation')}
          />
        </div>

        {/* Reported By Filter */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Reported by</Label>
          <MultiSelectFilter
            options={organizations.map((org) => ({
              value: org.id,
              label: org.name,
              code: org.acronym || undefined,
            }))}
            value={filterReportedByOrgs}
            onChange={setFilterReportedByOrgs}
            placeholder="All"
            searchPlaceholder="Search organisations..."
            emptyText="No organisations found."
            icon={<Building2 className="h-4 w-4 text-muted-foreground shrink-0" />}
            className="w-[200px] h-9"
            dropdownClassName="w-[400px]"
            open={openFilterId === 'reportedBy'}
            onOpenChange={handleFilterOpenChange('reportedBy')}
          />
        </div>

        {/* Sector Filter */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Sector</Label>
          <SectorHierarchyFilter
            selected={sectorFilter}
            onChange={setSectorFilter}
            className="w-[180px]"
            open={openFilterId === 'sector'}
            onOpenChange={handleFilterOpenChange('sector')}
          />
        </div>

        {/* Aid Type Filter */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Aid Type</Label>
          <MultiSelectFilter
            options={Object.entries(AID_TYPE_LABELS).map(([code, label]) => ({
              value: code,
              label: label,
              code: code,
            }))}
            value={filterAidTypes}
            onChange={setFilterAidTypes}
            placeholder="All"
            searchPlaceholder="Search aid types..."
            emptyText="No aid types found."
            icon={<Handshake className="h-4 w-4 text-muted-foreground shrink-0" />}
            className="w-[180px] h-9"
            dropdownClassName="w-[360px]"
            open={openFilterId === 'aidType'}
            onOpenChange={handleFilterOpenChange('aidType')}
          />
        </div>

        {/* Flow Type Filter */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Flow Type</Label>
          <MultiSelectFilter
            options={Object.entries(FLOW_TYPE_LABELS).map(([code, label]) => ({
              value: code,
              label: label,
              code: code,
            }))}
            value={filterFlowTypes}
            onChange={setFilterFlowTypes}
            placeholder="All"
            searchPlaceholder="Search flow types..."
            emptyText="No flow types found."
            icon={<ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />}
            className="w-[180px] h-9"
            dropdownClassName="w-[340px]"
            open={openFilterId === 'flowType'}
            onOpenChange={handleFilterOpenChange('flowType')}
          />
        </div>

        {/* Column Selector - Only visible in table view */}
        {viewMode === 'table' && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Columns</Label>
            <ColumnSelector
              columns={activityColumns}
              visibleColumns={visibleColumns}
              defaultVisibleColumns={userDefaultColumns || defaultVisibleActivityColumns}
              onChange={handleColumnsChange}
              groupLabels={activityColumnGroups}
              open={openFilterId === 'columns'}
              onOpenChange={handleFilterOpenChange('columns')}
            />
          </div>
        )}

        {/* Spacer to push view toggle to the right */}
        <div className="flex-1 min-w-[8px]" />

        {/* View Mode Toggle */}
        <div className="flex items-center border rounded-md flex-shrink-0" data-tour="activities-view-toggle">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('table')}
            className={`rounded-r-none h-9 ${viewMode === 'table' ? 'bg-slate-200 text-slate-900' : 'text-slate-400'}`}
          >
            <TableIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('card')}
            className={`rounded-l-none h-9 ${viewMode === 'card' ? 'bg-slate-200 text-slate-900' : 'text-slate-400'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
      

      {/* Activities Content */}
      {loading || userLoading || !hasLoadedOnce || isInitialLoad ? (
        <ActivityListSkeleton />
      ) : error ? (
        <div className="bg-card rounded-md shadow-sm border border-border p-8 text-center">
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Unable to Load Activities</h3>
              <p className="text-slate-500 mb-4">{error}</p>
              <Button 
                onClick={() => usingOptimization ? safeOptimizedData.refetch() : fetchActivities(1, true)} 
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      ) : showEmptyState ? (
        <div className="bg-card rounded-md shadow-sm border border-border p-8 text-center">
          <div className="space-y-4">
            <div className="text-slate-500">No activities found</div>
            <p className="text-sm text-slate-400">
              {filterStatus !== "all" || filterValidation !== "all" ? 
                "Try adjusting your filters to see more results." : 
                "There are no activities in the system yet."
              }
            </p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden fade-in" data-tour="activities-table">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse activities-table data-table-balanced">
              <colgroup>
                <col style={{ width: '48px' }} />
                {orderedDraggableColumns.map((colId) => {
                  if (colId === 'title') return <col key={colId} />;
                  const w =
                    colId === 'reportedBy'
                      ? '140px'
                      : ['totalBudgeted', 'totalPlannedDisbursement'].includes(colId)
                        ? '130px'
                        : ['lastEdited', 'activityStatus'].includes(colId)
                          ? '120px'
                          : '110px';
                  return <col key={colId} style={{ width: w }} />;
                })}
                <col style={{ width: '48px' }} />
                <col style={{ width: '8px' }} />
              </colgroup>
              <thead className="bg-surface-muted border-b border-border">
                <tr>
                  {/* Checkbox column - always visible */}
                  <th className="h-12 px-4 py-3 text-center align-middle w-[50px]">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={selectedActivityIds.size === paginatedActivities.length && paginatedActivities.length > 0}
                        indeterminate={selectedActivityIds.size > 0 && selectedActivityIds.size < paginatedActivities.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all activities"
                      />
                    </div>
                  </th>
                  
                  {/* Draggable column headers */}
                  <DndColumnProvider items={orderedDraggableColumns} onReorder={handleColumnReorder}>
                    {orderedDraggableColumns.map((colId) => {
                      const actHeaderMap: Record<string, React.ReactNode> = {
                        title: (
                          <SortableTableHeader
                            key="title"
                            id="title"
                            className="py-3 cursor-pointer hover:bg-muted/80 transition-colors data-table-col-activity min-w-0"
                            onClick={() => handleSort('title')}
                          >
                            <div className="flex items-center gap-1">
                              <ColumnHeaderText columnId="title">Activity Title</ColumnHeaderText>
                              {getSortIcon('title')}
                            </div>
                          </SortableTableHeader>
                        ),
                        activityStatus: (
                          <SortableTableHeader
                            key="activityStatus"
                            id="activityStatus"
                            className="py-3 cursor-pointer hover:bg-muted/80 transition-colors w-[120px]"
                            onClick={() => handleSort('activityStatus')}
                          >
                            <div className="flex items-center gap-1">
                              <ColumnHeaderText columnId="activityStatus">Activity Status</ColumnHeaderText>
                              {getSortIcon('activityStatus')}
                            </div>
                          </SortableTableHeader>
                        ),
                        publicationStatus: (
                          <SortableTableHeader
                            key="publicationStatus"
                            id="publicationStatus"
                            className="py-3 text-center w-[120px]"
                          >
                            <ColumnHeaderText columnId="publicationStatus">Publication Status</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        reportedBy: (
                          <SortableTableHeader
                            key="reportedBy"
                            id="reportedBy"
                            className="py-3 cursor-pointer hover:bg-muted/80 transition-colors min-w-[140px]"
                            onClick={() => handleSort('createdBy')}
                          >
                            <div className="flex items-center gap-1">
                              <ColumnHeaderText columnId="reportedBy">Reported by</ColumnHeaderText>
                              {getSortIcon('createdBy')}
                            </div>
                          </SortableTableHeader>
                        ),
                        totalBudgeted: (
                          <SortableTableHeader
                            key="totalBudgeted"
                            id="totalBudgeted"
                            className="py-3 text-right cursor-pointer hover:bg-muted/80 transition-colors min-w-[120px]"
                            onClick={() => handleSort('commitments')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <ColumnHeaderText columnId="totalBudgeted">Total Budgeted</ColumnHeaderText>
                              {getSortIcon('commitments')}
                            </div>
                          </SortableTableHeader>
                        ),
                        totalPlannedDisbursement: (
                          <SortableTableHeader
                            key="totalPlannedDisbursement"
                            id="totalPlannedDisbursement"
                            className="py-3 text-right cursor-pointer hover:bg-muted/80 transition-colors min-w-[100px]"
                            onClick={() => handleSort('plannedDisbursements')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <ColumnHeaderText columnId="totalPlannedDisbursement">Total Planned Disbursements</ColumnHeaderText>
                              {getSortIcon('plannedDisbursements')}
                            </div>
                          </SortableTableHeader>
                        ),
                        lastEdited: (
                          <SortableTableHeader
                            key="lastEdited"
                            id="lastEdited"
                            className="py-3 text-right cursor-pointer hover:bg-muted/80 transition-colors min-w-[100px]"
                            onClick={() => handleSort('updatedAt')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <ColumnHeaderText columnId="lastEdited">Last Edited</ColumnHeaderText>
                              {getSortIcon('updatedAt')}
                            </div>
                          </SortableTableHeader>
                        ),
                        modalityClassification: (
                          <SortableTableHeader
                            key="modalityClassification"
                            id="modalityClassification"
                            className="py-3 text-center w-[120px]"
                          >
                            <ColumnHeaderText columnId="modalityClassification">Modality & Classification</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        sectorCategories: (
                          <SortableTableHeader
                            key="sectorCategories"
                            id="sectorCategories"
                            className="py-3 text-center min-w-[160px]"
                          >
                            <ColumnHeaderText columnId="sectorCategories">Sector Categories</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        sectors: (
                          <SortableTableHeader
                            key="sectors"
                            id="sectors"
                            className="py-3 text-center min-w-[160px]"
                          >
                            <ColumnHeaderText columnId="sectors">Sectors</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        subSectors: (
                          <SortableTableHeader
                            key="subSectors"
                            id="subSectors"
                            className="py-3 text-center min-w-[180px]"
                          >
                            <ColumnHeaderText columnId="subSectors">Sub-sectors</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        locations: (
                          <SortableTableHeader
                            key="locations"
                            id="locations"
                            className="py-3 text-center min-w-[160px]"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <ColumnHeaderText columnId="locations">Locations</ColumnHeaderText>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocationDisplayMode(prev => prev === 'percentage' ? 'usd' : 'percentage');
                                }}
                                className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors"
                                title={`Switch to ${locationDisplayMode === 'percentage' ? 'USD' : 'percentage'} view`}
                              >
                                {locationDisplayMode === 'percentage' ? '%' : '$'}
                              </button>
                            </div>
                          </SortableTableHeader>
                        ),
                        recipientCountries: (
                          <SortableTableHeader
                            key="recipientCountries"
                            id="recipientCountries"
                            className="py-3 text-center min-w-[160px]"
                          >
                            <ColumnHeaderText columnId="recipientCountries">Country/Region</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        aidType: (
                          <SortableTableHeader key="aidType" id="aidType" className="py-3 min-w-[150px]">
                            <ColumnHeaderText columnId="aidType">Default Aid Type</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        defaultFinanceType: (
                          <SortableTableHeader key="defaultFinanceType" id="defaultFinanceType" className="py-3 min-w-[150px]">
                            <ColumnHeaderText columnId="defaultFinanceType">Default Finance Type</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        defaultFlowType: (
                          <SortableTableHeader key="defaultFlowType" id="defaultFlowType" className="py-3 min-w-[150px]">
                            <ColumnHeaderText columnId="defaultFlowType">Default Flow Type</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        defaultTiedStatus: (
                          <SortableTableHeader key="defaultTiedStatus" id="defaultTiedStatus" className="py-3 min-w-[130px]">
                            <ColumnHeaderText columnId="defaultTiedStatus">Default Tied Status</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        defaultModality: (
                          <SortableTableHeader key="defaultModality" id="defaultModality" className="py-3 min-w-[130px]">
                            <ColumnHeaderText columnId="defaultModality">Default Modality</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        humanitarian: (
                          <SortableTableHeader key="humanitarian" id="humanitarian" className="py-3 text-center w-[100px]">
                            <ColumnHeaderText columnId="humanitarian">Humanitarian</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalIncomingCommitments: (
                          <SortableTableHeader key="totalIncomingCommitments" id="totalIncomingCommitments" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalIncomingCommitments">Incoming Commitments</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalCommitments: (
                          <SortableTableHeader key="totalCommitments" id="totalCommitments" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalCommitments">Outgoing Commitments</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalDisbursements: (
                          <SortableTableHeader key="totalDisbursements" id="totalDisbursements" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalDisbursements">Disbursements</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalExpenditures: (
                          <SortableTableHeader key="totalExpenditures" id="totalExpenditures" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalExpenditures">Expenditures</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalInterestRepayment: (
                          <SortableTableHeader key="totalInterestRepayment" id="totalInterestRepayment" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalInterestRepayment">Interest Payment</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalLoanRepayment: (
                          <SortableTableHeader key="totalLoanRepayment" id="totalLoanRepayment" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalLoanRepayment">Loan Repayment</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalReimbursement: (
                          <SortableTableHeader key="totalReimbursement" id="totalReimbursement" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalReimbursement">Reimbursement</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalPurchaseOfEquity: (
                          <SortableTableHeader key="totalPurchaseOfEquity" id="totalPurchaseOfEquity" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalPurchaseOfEquity">Purchase of Equity</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalSaleOfEquity: (
                          <SortableTableHeader key="totalSaleOfEquity" id="totalSaleOfEquity" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalSaleOfEquity">Sale of Equity</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalCreditGuarantee: (
                          <SortableTableHeader key="totalCreditGuarantee" id="totalCreditGuarantee" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalCreditGuarantee">Credit Guarantee</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalIncomingFunds: (
                          <SortableTableHeader key="totalIncomingFunds" id="totalIncomingFunds" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalIncomingFunds">Incoming Funds</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalCommitmentCancellation: (
                          <SortableTableHeader key="totalCommitmentCancellation" id="totalCommitmentCancellation" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalCommitmentCancellation">Commitment Cancellation</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalOutgoingPledge: (
                          <SortableTableHeader key="totalOutgoingPledge" id="totalOutgoingPledge" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalOutgoingPledge">Outgoing Pledge</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalIncomingPledge: (
                          <SortableTableHeader key="totalIncomingPledge" id="totalIncomingPledge" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="totalIncomingPledge">Incoming Pledge</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        flowTypeODATotal: (
                          <SortableTableHeader key="flowTypeODATotal" id="flowTypeODATotal" className="py-3 text-right min-w-[120px]">
                            ODA Total
                          </SortableTableHeader>
                        ),
                        flowTypeOOFTotal: (
                          <SortableTableHeader key="flowTypeOOFTotal" id="flowTypeOOFTotal" className="py-3 text-right min-w-[120px]">
                            OOF Total
                          </SortableTableHeader>
                        ),
                        flowTypeNonExportOOFTotal: (
                          <SortableTableHeader key="flowTypeNonExportOOFTotal" id="flowTypeNonExportOOFTotal" className="py-3 text-right min-w-[120px]">
                            Non-export OOF
                          </SortableTableHeader>
                        ),
                        flowTypeExportCreditsTotal: (
                          <SortableTableHeader key="flowTypeExportCreditsTotal" id="flowTypeExportCreditsTotal" className="py-3 text-right min-w-[120px]">
                            Export Credits
                          </SortableTableHeader>
                        ),
                        flowTypePrivateGrantsTotal: (
                          <SortableTableHeader key="flowTypePrivateGrantsTotal" id="flowTypePrivateGrantsTotal" className="py-3 text-right min-w-[120px]">
                            Private Grants
                          </SortableTableHeader>
                        ),
                        flowTypePrivateMarketTotal: (
                          <SortableTableHeader key="flowTypePrivateMarketTotal" id="flowTypePrivateMarketTotal" className="py-3 text-right min-w-[120px]">
                            Private Market
                          </SortableTableHeader>
                        ),
                        flowTypePrivateFDITotal: (
                          <SortableTableHeader key="flowTypePrivateFDITotal" id="flowTypePrivateFDITotal" className="py-3 text-right min-w-[120px]">
                            Private FDI
                          </SortableTableHeader>
                        ),
                        flowTypeOtherPrivateTotal: (
                          <SortableTableHeader key="flowTypeOtherPrivateTotal" id="flowTypeOtherPrivateTotal" className="py-3 text-right min-w-[120px]">
                            Other Private
                          </SortableTableHeader>
                        ),
                        flowTypeNonFlowTotal: (
                          <SortableTableHeader key="flowTypeNonFlowTotal" id="flowTypeNonFlowTotal" className="py-3 text-right min-w-[120px]">
                            Non-flow
                          </SortableTableHeader>
                        ),
                        flowTypeOtherTotal: (
                          <SortableTableHeader key="flowTypeOtherTotal" id="flowTypeOtherTotal" className="py-3 text-right min-w-[120px]">
                            Other Flows
                          </SortableTableHeader>
                        ),
                        isPublished: (
                          <SortableTableHeader key="isPublished" id="isPublished" className="py-3 w-[100px]">
                            <ColumnHeaderText columnId="isPublished">Published</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        isValidated: (
                          <SortableTableHeader key="isValidated" id="isValidated" className="py-3 w-[100px]">
                            <ColumnHeaderText columnId="isValidated">Validated</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        iatiSyncStatus: (
                          <SortableTableHeader key="iatiSyncStatus" id="iatiSyncStatus" className="py-3 min-w-[120px]">
                            <ColumnHeaderText columnId="iatiSyncStatus">IATI Synced</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        fundingOrganisations: (
                          <SortableTableHeader key="fundingOrganisations" id="fundingOrganisations" className="py-3 min-w-[180px]">
                            <ColumnHeaderText columnId="fundingOrganisations">Funding Organisations</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        extendingOrganisations: (
                          <SortableTableHeader key="extendingOrganisations" id="extendingOrganisations" className="py-3 min-w-[180px]">
                            <ColumnHeaderText columnId="extendingOrganisations">Extending Organisations</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        implementingOrganisations: (
                          <SortableTableHeader key="implementingOrganisations" id="implementingOrganisations" className="py-3 min-w-[180px]">
                            <ColumnHeaderText columnId="implementingOrganisations">Implementing Organisations</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        accountableOrganisations: (
                          <SortableTableHeader key="accountableOrganisations" id="accountableOrganisations" className="py-3 min-w-[180px]">
                            <ColumnHeaderText columnId="accountableOrganisations">Accountable Organisations</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        sdgs: (
                          <SortableTableHeader key="sdgs" id="sdgs" className="py-3 min-w-[120px]">
                            <ColumnHeaderText columnId="sdgs">SDGs</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        policyMarkers: (
                          <SortableTableHeader key="policyMarkers" id="policyMarkers" className="py-3 min-w-[140px]">
                            <ColumnHeaderText columnId="policyMarkers">Policy Markers</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        createdByName: (
                          <SortableTableHeader key="createdByName" id="createdByName" className="py-3 min-w-[150px]">
                            <ColumnHeaderText columnId="createdByName">Created By</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        createdAt: (
                          <SortableTableHeader key="createdAt" id="createdAt" className="py-3 min-w-[160px]">
                            <ColumnHeaderText columnId="createdAt">Created Date & Time</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        createdByDepartment: (
                          <SortableTableHeader key="createdByDepartment" id="createdByDepartment" className="py-3 min-w-[150px]">
                            <ColumnHeaderText columnId="createdByDepartment">Creator's Department</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        importedFromIrt: (
                          <SortableTableHeader key="importedFromIrt" id="importedFromIrt" className="py-3 text-center min-w-[140px]">
                            <ColumnHeaderText columnId="importedFromIrt">Imported from IRT</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        budgetStatus: (
                          <SortableTableHeader key="budgetStatus" id="budgetStatus" className="py-3 text-center min-w-[130px]">
                            <ColumnHeaderText columnId="budgetStatus">Budget Status</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        capitalSpendPercent: (
                          <SortableTableHeader key="capitalSpendPercent" id="capitalSpendPercent" className="py-3 text-right min-w-[100px]">
                            <ColumnHeaderText columnId="capitalSpendPercent">Capital Spend %</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        capitalSpendTotalBudget: (
                          <SortableTableHeader key="capitalSpendTotalBudget" id="capitalSpendTotalBudget" className="py-3 text-right min-w-[180px]">
                            <ColumnHeaderText columnId="capitalSpendTotalBudget">Capital Spend - Total Budget</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        capitalSpendPlannedDisbursements: (
                          <SortableTableHeader key="capitalSpendPlannedDisbursements" id="capitalSpendPlannedDisbursements" className="py-3 text-right min-w-[200px]">
                            <ColumnHeaderText columnId="capitalSpendPlannedDisbursements">Capital Spend - Planned Disb.</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        capitalSpendCommitments: (
                          <SortableTableHeader key="capitalSpendCommitments" id="capitalSpendCommitments" className="py-3 text-right min-w-[180px]">
                            <ColumnHeaderText columnId="capitalSpendCommitments">Capital Spend - Commitments</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        capitalSpendDisbursements: (
                          <SortableTableHeader key="capitalSpendDisbursements" id="capitalSpendDisbursements" className="py-3 text-right min-w-[180px]">
                            <ColumnHeaderText columnId="capitalSpendDisbursements">Capital Spend - Disbursements</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        voteScore: (
                          <SortableTableHeader key="voteScore" id="voteScore" className="py-3 text-center min-w-[80px]">
                            <div className="flex items-center justify-center gap-1">
                              <ArrowUpDown className="h-4 w-4" />
                              <ColumnHeaderText columnId="voteScore">Score</ColumnHeaderText>
                            </div>
                          </SortableTableHeader>
                        ),
                        upvotes: (
                          <SortableTableHeader key="upvotes" id="upvotes" className="py-3 text-center min-w-[80px]">
                            <div className="flex items-center justify-center gap-1">
                              <ChevronUp className="h-4 w-4 text-primary" />
                              <ColumnHeaderText columnId="upvotes">Upvotes</ColumnHeaderText>
                            </div>
                          </SortableTableHeader>
                        ),
                        downvotes: (
                          <SortableTableHeader key="downvotes" id="downvotes" className="py-3 text-center min-w-[80px]">
                            <div className="flex items-center justify-center gap-1">
                              <ChevronDown className="h-4 w-4 text-red-500" />
                              <ColumnHeaderText columnId="downvotes">Downvotes</ColumnHeaderText>
                            </div>
                          </SortableTableHeader>
                        ),
                        descriptionGeneral: (
                          <SortableTableHeader key="descriptionGeneral" id="descriptionGeneral" className="py-3 min-w-[200px]">
                            <ColumnHeaderText columnId="descriptionGeneral">Activity Description – General</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        descriptionObjectives: (
                          <SortableTableHeader key="descriptionObjectives" id="descriptionObjectives" className="py-3 min-w-[200px]">
                            <ColumnHeaderText columnId="descriptionObjectives">Activity Description – Objectives</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        descriptionTargetGroups: (
                          <SortableTableHeader key="descriptionTargetGroups" id="descriptionTargetGroups" className="py-3 min-w-[200px]">
                            <ColumnHeaderText columnId="descriptionTargetGroups">Activity Description – Target Groups</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        descriptionOther: (
                          <SortableTableHeader key="descriptionOther" id="descriptionOther" className="py-3 min-w-[200px]">
                            <ColumnHeaderText columnId="descriptionOther">Activity Description – Other</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        timeElapsed: (
                          <SortableTableHeader key="timeElapsed" id="timeElapsed" className="py-3 min-w-[140px]">
                            <ColumnHeaderText columnId="timeElapsed">Time Elapsed</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        committedSpentPercent: (
                          <SortableTableHeader key="committedSpentPercent" id="committedSpentPercent" className="py-3 min-w-[140px]">
                            <ColumnHeaderText columnId="committedSpentPercent">% Committed Spent</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        budgetSpentPercent: (
                          <SortableTableHeader key="budgetSpentPercent" id="budgetSpentPercent" className="py-3 min-w-[140px]">
                            <ColumnHeaderText columnId="budgetSpentPercent">% Budget Spent</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        budgetShare: (
                          <SortableTableHeader key="budgetShare" id="budgetShare" className="py-3 text-right min-w-[100px]">
                            <ColumnHeaderText columnId="budgetShare">Budget Share</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        plannedDisbursementShare: (
                          <SortableTableHeader key="plannedDisbursementShare" id="plannedDisbursementShare" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="plannedDisbursementShare">Planned Disb. Share</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        commitmentShare: (
                          <SortableTableHeader key="commitmentShare" id="commitmentShare" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="commitmentShare">Commitment Share</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        disbursementShare: (
                          <SortableTableHeader key="disbursementShare" id="disbursementShare" className="py-3 text-right min-w-[120px]">
                            <ColumnHeaderText columnId="disbursementShare">Disbursement Share</ColumnHeaderText>
                          </SortableTableHeader>
                        ),
                        totalExpectedLength: (
                          <SortableTableHeader
                            key="totalExpectedLength"
                            id="totalExpectedLength"
                            className="py-3 cursor-pointer hover:bg-muted/80 transition-colors min-w-[160px]"
                            onClick={() => handleSort('totalExpectedLength')}
                          >
                            <div className="flex items-center gap-1">
                              <ColumnHeaderText columnId="totalExpectedLength">Total Expected Length</ColumnHeaderText>
                              {getSortIcon('totalExpectedLength')}
                            </div>
                          </SortableTableHeader>
                        ),
                        implementationToDate: (
                          <SortableTableHeader
                            key="implementationToDate"
                            id="implementationToDate"
                            className="py-3 cursor-pointer hover:bg-muted/80 transition-colors min-w-[160px]"
                            onClick={() => handleSort('implementationToDate')}
                          >
                            <div className="flex items-center gap-1">
                              <ColumnHeaderText columnId="implementationToDate">Implementation to Date</ColumnHeaderText>
                              {getSortIcon('implementationToDate')}
                            </div>
                          </SortableTableHeader>
                        ),
                        remainingDuration: (
                          <SortableTableHeader
                            key="remainingDuration"
                            id="remainingDuration"
                            className="py-3 cursor-pointer hover:bg-muted/80 transition-colors min-w-[160px]"
                            onClick={() => handleSort('remainingDuration')}
                          >
                            <div className="flex items-center gap-1">
                              <ColumnHeaderText columnId="remainingDuration">Remaining Duration</ColumnHeaderText>
                              {getSortIcon('remainingDuration')}
                            </div>
                          </SortableTableHeader>
                        ),
                        actualLength: (
                          <SortableTableHeader
                            key="actualLength"
                            id="actualLength"
                            className="py-3 cursor-pointer hover:bg-muted/80 transition-colors min-w-[160px]"
                            onClick={() => handleSort('actualLength')}
                          >
                            <div className="flex items-center gap-1">
                              <ColumnHeaderText columnId="actualLength">Actual Length</ColumnHeaderText>
                              {getSortIcon('actualLength')}
                            </div>
                          </SortableTableHeader>
                        ),
                        durationBand: (
                          <SortableTableHeader
                            key="durationBand"
                            id="durationBand"
                            className="py-3 cursor-pointer hover:bg-muted/80 transition-colors min-w-[180px]"
                            onClick={() => handleSort('durationBand')}
                          >
                            <div className="flex items-center gap-1">
                              <ColumnHeaderText columnId="durationBand">Duration Band</ColumnHeaderText>
                              {getSortIcon('durationBand')}
                            </div>
                          </SortableTableHeader>
                        ),
                        plannedStartDate: (
                          <SortableTableHeader
                            key="plannedStartDate"
                            id="plannedStartDate"
                            className="py-3 cursor-pointer hover:bg-muted/80 transition-colors min-w-[130px]"
                            onClick={() => handleSort('plannedStartDate')}
                          >
                            <div className="flex items-center gap-1">
                              <ColumnHeaderText columnId="plannedStartDate">Planned Start</ColumnHeaderText>
                              {getSortIcon('plannedStartDate')}
                            </div>
                          </SortableTableHeader>
                        ),
                        plannedEndDate: (
                          <SortableTableHeader
                            key="plannedEndDate"
                            id="plannedEndDate"
                            className="py-3 cursor-pointer hover:bg-muted/80 transition-colors min-w-[130px]"
                            onClick={() => handleSort('plannedEndDate')}
                          >
                            <div className="flex items-center gap-1">
                              <ColumnHeaderText columnId="plannedEndDate">Planned End</ColumnHeaderText>
                              {getSortIcon('plannedEndDate')}
                            </div>
                          </SortableTableHeader>
                        ),
                        actualStartDate: (
                          <SortableTableHeader
                            key="actualStartDate"
                            id="actualStartDate"
                            className="py-3 cursor-pointer hover:bg-muted/80 transition-colors min-w-[130px]"
                            onClick={() => handleSort('actualStartDate')}
                          >
                            <div className="flex items-center gap-1">
                              <ColumnHeaderText columnId="actualStartDate">Actual Start</ColumnHeaderText>
                              {getSortIcon('actualStartDate')}
                            </div>
                          </SortableTableHeader>
                        ),
                        actualEndDate: (
                          <SortableTableHeader
                            key="actualEndDate"
                            id="actualEndDate"
                            className="py-3 cursor-pointer hover:bg-muted/80 transition-colors min-w-[130px]"
                            onClick={() => handleSort('actualEndDate')}
                          >
                            <div className="flex items-center gap-1">
                              <ColumnHeaderText columnId="actualEndDate">Actual End</ColumnHeaderText>
                              {getSortIcon('actualEndDate')}
                            </div>
                          </SortableTableHeader>
                        ),
                      };
                      /* Always render a cell so column count matches header (keeps Actions column aligned) */
                      return actHeaderMap[colId] ?? (
                        <th key={colId} className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground" />
                      );
                    })}
                  </DndColumnProvider>

                  {/* Actions column - no header text, just kebab in rows */}
                  <th className="h-12 px-2" />
                  {/* Filler column so row hover extends to the scroll container edge */}
                  <th className="h-12 p-0 bg-surface-muted border-0 data-table-col-filler" aria-hidden="true" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {paginatedActivities.map(activity => {
                  const organizationAcronyms = getOrganizationAcronyms(activity);
                  const acronymsText = formatOrganizationAcronyms(organizationAcronyms);
                  const creatorOrg = getCreatorOrganization(activity);
                  const activityStatus = activity.activityStatus || activity.status || '1';
                  const publicationStatus = activity.publicationStatus || 'draft';
                  const submissionStatus = activity.submissionStatus || 'draft';
                  
                  const isSelected = selectedActivityIds.has(activity.id);
                  
                  return (
                    <tr
                      key={activity.id}
                      className={`group hover:bg-muted [&:hover>td]:bg-muted transition-colors ${isSelected ? 'bg-muted border-border' : ''}`}
                    >
                      {/* Checkbox cell - always visible */}
                      <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectActivity(activity.id, !!checked)}
                            disabled={isBulkDeleting}
                            aria-label={`Select activity: ${activity.title}`}
                          />
                        </div>
                      </td>
                      
                      {/* Draggable body cells */}
                      {orderedDraggableColumns.map((colId) => {
                        const actCellMap: Record<string, React.ReactNode> = {
                          title: (
<td key="title" className="px-4 py-2 text-sm text-foreground whitespace-normal break-words leading-tight">
                        <a 
                          href={`/activities/${activity.id}`}
                          className="cursor-pointer block"
                          onClick={async (e) => {
                            // Allow Cmd+Click (Mac) or Ctrl+Click (Windows) to open in new tab
                            if (e.metaKey || e.ctrlKey) {
                              return; // Let the default link behavior happen
                            }
                            
                            e.preventDefault();
                            // Verify activity exists before navigating (lightweight check)
                            try {
                              const checkRes = await apiFetch(`/api/activities/${activity.id}?fields=id`, {
                                method: 'GET'
                              });
                              
                              if (checkRes.status === 404) {
                                // Activity was deleted, remove from list
                                toast.warning('This activity has been deleted');
                                if (usingOptimization) {
                                  safeOptimizedData.removeActivity(activity.id);
                                } else {
                                  setLegacyActivities(prev => prev.filter(a => a.id !== activity.id));
                                }
                                return;
                              }
                              
                              // Activity exists, navigate to it
                              router.push(`/activities/${activity.id}`);
                            } catch (error) {
                              // On error, still try to navigate (might be network issue)
                              console.error('[Activities] Error checking activity:', error);
                              router.push(`/activities/${activity.id}`);
                            }
                          }}
                        >
                          <div className="flex items-start gap-2">
                            {/* Activity Icon */}
                            {activity.icon && activity.icon.trim() !== '' && (
                              <div className="flex-shrink-0 mt-0.5">
                                <div className="w-6 h-6 rounded-sm overflow-hidden border border-gray-200 bg-white">
                                  <img 
                                    src={activity.icon} 
                                    alt="Activity icon" 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Activity Title and Details */}
                            <div className="space-y-1 pr-2 flex-1 min-w-0">
                              <h3
                                className="group/title font-medium text-foreground leading-tight line-clamp-2"
                                title={activity.title}
                              >
                                {activity.title}
                                {activity.acronym && (
                                  <span className="font-medium text-foreground">
                                    {' '}({activity.acronym})
                                  </span>
                                )}
                                {activity.autoSync && activity.syncStatus === 'live' && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center ml-1 align-middle">
                                          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <span className="text-sm">IATI Synced</span>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const textToCopy = activity.acronym 
                                      ? `${activity.title} (${activity.acronym})` 
                                      : activity.title;
                                    copyToClipboard(textToCopy, 'title', activity.id);
                                  }}
                                  className="ml-1 opacity-0 group-hover/title:opacity-100 transition-opacity duration-200 hover:text-gray-700"
                                  title={activity.acronym ? "Copy Activity Title and Acronym" : "Copy Activity Title"}
                                >
                                  {copiedId === `${activity.id}-title` ? (
                                    <Check className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </h3>
                            {(activity.partnerId || activity.iatiIdentifier) && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 text-left overflow-hidden">
                                {activity.partnerId && (
                                  <div className="group/pid flex items-center gap-1 flex-shrink-0">
                                    <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded truncate max-w-[200px]">{activity.partnerId}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        copyToClipboard(activity.partnerId!, 'partnerId', activity.id);
                                      }}
                                      className="opacity-0 group-hover/pid:opacity-100 transition-opacity duration-200 hover:text-gray-700 flex-shrink-0"
                                      title="Copy Activity ID"
                                    >
                                      {copiedId === `${activity.id}-partnerId` ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                )}

                                {activity.iatiIdentifier && (
                                  <div className={`group/iati flex items-center gap-1 flex-shrink min-w-0 ${activity.partnerId ? 'ml-2' : ''}`}>
                                    <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded truncate">{activity.iatiIdentifier}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        copyToClipboard(activity.iatiIdentifier!, 'iatiIdentifier', activity.id);
                                      }}
                                      className="opacity-0 group-hover/iati:opacity-100 transition-opacity duration-200 hover:text-gray-700 flex-shrink-0"
                                      title="Copy IATI Identifier"
                                    >
                                      {copiedId === `${activity.id}-iatiIdentifier` ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          </div>
                        </a>
                      </td>
                          ),
                          activityStatus: (
<td key="activityStatus" className="px-4 py-2 text-sm text-foreground text-left">
                        {getActivityStatusLabel(activityStatus)}
                      </td>
                          ),
                          publicationStatus: (
<td key="publicationStatus" className="px-4 py-2 text-sm text-foreground">
                        <div className="flex items-center justify-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <DatabaseZap className={`${publicationStatus === 'published' ? 'h-5 w-5' : 'h-4 w-4'} text-gray-500 hover:text-primary cursor-pointer`} strokeWidth={publicationStatus === 'published' ? 2.5 : 1} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-2 p-1">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <FileCheck className="h-4 w-4" />
                                    <span className="text-sm"><span className="font-semibold">Published:</span> {publicationStatus === 'published' ? 'Yes' : 'No'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span className="text-sm"><span className="font-semibold">Validation:</span> {submissionStatus === 'validated' ? 'Validated' : submissionStatus === 'rejected' ? 'Rejected' : 'Pending'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    {activity.autoSync && activity.syncStatus === 'live' ? (
                                      <RefreshCw className="h-4 w-4" />
                                    ) : (
                                      <Globe className="h-4 w-4" />
                                    )}
                                    <span className="text-sm"><span className="font-semibold">IATI:</span> {activity.autoSync && activity.syncStatus === 'live' ? 'Synced' : activity.autoSync && activity.syncStatus === 'pending' ? 'Pending' : activity.autoSync && activity.syncStatus === 'error' ? 'Error' : 'Not synced'}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                          ),
                          reportedBy: (
<td key="reportedBy" className="px-4 py-2 text-sm text-foreground text-left" style={{textAlign: 'left'}}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 text-left cursor-pointer" style={{textAlign: 'left'}}>
                                {/* Organization Logo */}
                                {(() => {
                                  const orgId = activity.reportingOrgId || activity.createdByOrg;
                                  const org = orgByIdMap.get(orgId || '');
                                  
                                  if (org?.logo) {
                                    return (
                                      <div className="flex-shrink-0">
                                        <div className="w-5 h-5 rounded-sm overflow-hidden border border-gray-200 bg-white">
                                          <img 
                                            src={org.logo} 
                                            alt={`${org.name} logo`} 
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                              const parent = target.parentElement;
                                              if (parent) {
                                                parent.innerHTML = `
                                                  <div class="w-5 h-5 bg-green-100 rounded-sm flex items-center justify-center">
                                                    <span class="text-green-600 font-semibold text-xs">O</span>
                                                  </div>
                                                `;
                                              }
                                            }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                <span>{creatorOrg}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent 
                              className="max-w-sm p-4 bg-white border border-gray-200 shadow-lg"
                              sideOffset={8}
                            >
                              <div className="text-sm">
                                <p className="font-semibold">
                                  Reported by {formatReportedBy({ 
                                    name: activity.created_by_org_name || "Unknown Organization", 
                                    shortName: activity.created_by_org_acronym 
                                  })}
                                  {user && (
                                    <span className="text-gray-600 font-normal">
                                      {' '}Submitted by {formatSubmittedBy({
                                        title: user.title,
                                        firstName: user.firstName || '',
                                        middleName: user.middleName,
                                        lastName: user.lastName || '',
                                        jobTitle: user.jobTitle
                                      })} on {format(new Date(activity.createdAt), "d MMMM yyyy 'at' h:mm a")}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                          ),
                          totalBudgeted: (
<td key="totalBudgeted" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-pointer"><span className="text-muted-foreground">USD</span> {formatCurrency((activity as any).totalBudget || 0)}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                              <p className="text-sm text-gray-600 font-normal">
                                Total budget amount across all budget entries for this activity. All values are displayed in USD for consistency across different currencies.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                          ),
                          totalPlannedDisbursement: (
<td key="totalPlannedDisbursement" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-pointer"><span className="text-muted-foreground">USD</span> {formatCurrency((activity as any).totalPlannedDisbursementsUSD || 0)}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left whitespace-normal">
                              <p className="text-sm text-gray-600 font-normal">
                                Total value of all planned disbursements for this activity. All values are displayed in USD for consistency across different currencies.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                          ),
                          lastEdited: (
<td key="lastEdited" className="px-4 py-2 text-sm text-foreground whitespace-nowrap text-right">
                        {format(new Date(activity.updatedAt), "dd MMM yyyy")}
                      </td>
                          ),
                          modalityClassification: (
<td key="modalityClassification" className="px-4 py-2 text-sm text-foreground text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <ReceiptText className="h-4 w-4 text-gray-500 hover:text-primary cursor-pointer mx-auto" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-2 p-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Handshake className="h-4 w-4" />
                                  <span className="text-sm"><span className="font-semibold">Aid Type:</span> {activity.default_aid_type ? AID_TYPE_LABELS[activity.default_aid_type] || activity.default_aid_type : 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <DollarSign className="h-4 w-4" />
                                  <span className="text-sm"><span className="font-semibold">Default Finance Type:</span> {activity.default_finance_type ? FINANCE_TYPE_LABELS[activity.default_finance_type] || activity.default_finance_type : 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Shuffle className="h-4 w-4" />
                                  <span className="text-sm"><span className="font-semibold">Flow Type:</span> {activity.default_flow_type ? FLOW_TYPE_LABELS[activity.default_flow_type] || activity.default_flow_type : 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Link2 className="h-4 w-4" />
                                  <span className="text-sm"><span className="font-semibold">Tied Status:</span> {activity.default_tied_status ? TIED_STATUS_LABELS[activity.default_tied_status as keyof typeof TIED_STATUS_LABELS] || activity.default_tied_status : 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Settings className="h-4 w-4" />
                                  <span className="text-sm"><span className="font-semibold">Default Modality:</span> {activity.default_aid_modality ? MODALITY_LABELS[activity.default_aid_modality] || activity.default_aid_modality : 'Not specified'}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                          ),
                          sectorCategories: (
<td key="sectorCategories" className="px-4 py-2 text-sm text-foreground">
                          <SectorMiniBar sectors={activity.sectors} level="category" height={14} />
                        </td>
                          ),
                          sectors: (
<td key="sectors" className="px-4 py-2 text-sm text-foreground">
                          <SectorMiniBar sectors={activity.sectors} level="sector" height={14} />
                        </td>
                          ),
                          subSectors: (
<td key="subSectors" className="px-4 py-2 text-sm text-foreground">
                          <SectorMiniBar sectors={activity.sectors} level="subsector" height={14} />
                        </td>
                          ),
                          locations: (
<td key="locations" className="px-4 py-2 text-sm text-foreground">
                          <LocationMiniBar 
                            locations={activity.locations?.broad_coverage_locations as LocationData[] | undefined}
                            displayMode={locationDisplayMode}
                            totalValue={(activity.totalTransactions || 0) + (activity.totalBudget || 0)}
                            height={14}
                          />
                        </td>
                          ),
                          recipientCountries: (
<td key="recipientCountries" className="px-4 py-2 text-sm text-foreground">
                          <div className="flex flex-col gap-0.5">
                            {activity.recipient_countries && activity.recipient_countries.length > 0 ? (
                              activity.recipient_countries.slice(0, 3).map((rc, idx) => (
                                <span key={`country-${idx}`}>
                                  {rc.country?.name || rc.country?.code || 'Unknown'}
                                  {rc.percentage > 0 && <span className="text-muted-foreground ml-1">{rc.percentage}%</span>}
                                </span>
                              ))
                            ) : activity.recipient_regions && activity.recipient_regions.length > 0 ? (
                              activity.recipient_regions.slice(0, 3).map((rr, idx) => (
                                <span key={`region-${idx}`}>
                                  {rr.region?.name || rr.region?.code || 'Unknown'}
                                  {rr.percentage > 0 && <span className="text-muted-foreground ml-1">{rr.percentage}%</span>}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {((activity.recipient_countries?.length || 0) > 3 || (activity.recipient_regions?.length || 0) > 3) && (
                              <span className="text-muted-foreground text-xs">
                                +{Math.max((activity.recipient_countries?.length || 0) - 3, (activity.recipient_regions?.length || 0) - 3)} more
                              </span>
                            )}
                          </div>
                        </td>
                          ),
                          aidType: (
<td key="aidType" className="px-4 py-2 text-sm text-foreground text-left">
                          {activity.default_aid_type ? (
                            <CodelistTooltip
                              type="aid_type"
                              code={activity.default_aid_type}
                              displayLabel={AID_TYPE_LABELS[activity.default_aid_type] || activity.default_aid_type}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                          ),
                          defaultFinanceType: (
<td key="defaultFinanceType" className="px-4 py-2 text-sm text-foreground text-left">
                          {activity.default_finance_type ? (
                            <CodelistTooltip
                              type="finance_type"
                              code={activity.default_finance_type}
                              displayLabel={FINANCE_TYPE_LABELS[activity.default_finance_type] || activity.default_finance_type}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                          ),
                          defaultFlowType: (
<td key="defaultFlowType" className="px-4 py-2 text-sm text-foreground text-left">
                          {activity.default_flow_type ? (
                            <CodelistTooltip
                              type="flow_type"
                              code={activity.default_flow_type}
                              displayLabel={FLOW_TYPE_LABELS[activity.default_flow_type] || activity.default_flow_type}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                          ),
                          defaultTiedStatus: (
<td key="defaultTiedStatus" className="px-4 py-2 text-sm text-foreground text-left">
                          {activity.default_tied_status ? (
                            <CodelistTooltip
                              type="tied_status"
                              code={activity.default_tied_status}
                              displayLabel={TIED_STATUS_LABELS[activity.default_tied_status as keyof typeof TIED_STATUS_LABELS] || activity.default_tied_status}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                          ),
                          defaultModality: (
<td key="defaultModality" className="px-4 py-2 text-sm text-foreground text-left">
                          {activity.default_aid_modality ? MODALITY_LABELS[activity.default_aid_modality] || activity.default_aid_modality : <span className="text-muted-foreground">—</span>}
                        </td>
                          ),
                          humanitarian: (
<td key="humanitarian" className="px-4 py-2 text-sm text-foreground text-left">
                          {activity.humanitarian ? (
                            <span>Humanitarian Activity</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                          ),
                          totalIncomingCommitments: (
<td key="totalIncomingCommitments" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.incomingCommitments || 0)}
                        </td>
                          ),
                          totalCommitments: (
<td key="totalCommitments" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.commitments || 0)}
                        </td>
                          ),
                          totalDisbursements: (
<td key="totalDisbursements" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.disbursements || 0)}
                        </td>
                          ),
                          totalExpenditures: (
<td key="totalExpenditures" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.expenditures || 0)}
                        </td>
                          ),
                          totalInterestRepayment: (
<td key="totalInterestRepayment" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.interestRepayment || 0)}
                        </td>
                          ),
                          totalLoanRepayment: (
<td key="totalLoanRepayment" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.loanRepayment || 0)}
                        </td>
                          ),
                          totalReimbursement: (
<td key="totalReimbursement" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.reimbursement || 0)}
                        </td>
                          ),
                          totalPurchaseOfEquity: (
<td key="totalPurchaseOfEquity" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.purchaseOfEquity || 0)}
                        </td>
                          ),
                          totalSaleOfEquity: (
<td key="totalSaleOfEquity" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.saleOfEquity || 0)}
                        </td>
                          ),
                          totalCreditGuarantee: (
<td key="totalCreditGuarantee" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.creditGuarantee || 0)}
                        </td>
                          ),
                          totalIncomingFunds: (
<td key="totalIncomingFunds" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.incomingFunds || 0)}
                        </td>
                          ),
                          totalCommitmentCancellation: (
<td key="totalCommitmentCancellation" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.commitmentCancellation || 0)}
                        </td>
                          ),
                          totalOutgoingPledge: (
<td key="totalOutgoingPledge" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.outgoingPledge || 0)}
                        </td>
                          ),
                          totalIncomingPledge: (
<td key="totalIncomingPledge" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.incomingPledge || 0)}
                        </td>
                          ),
                          flowTypeODATotal: (
<td key="flowTypeODATotal" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.flowTypeODA || 0)}
                        </td>
                          ),
                          flowTypeOOFTotal: (
<td key="flowTypeOOFTotal" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.flowTypeOOF || 0)}
                        </td>
                          ),
                          flowTypeNonExportOOFTotal: (
<td key="flowTypeNonExportOOFTotal" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.flowTypeNonExportOOF || 0)}
                        </td>
                          ),
                          flowTypeExportCreditsTotal: (
<td key="flowTypeExportCreditsTotal" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.flowTypeExportCredits || 0)}
                        </td>
                          ),
                          flowTypePrivateGrantsTotal: (
<td key="flowTypePrivateGrantsTotal" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.flowTypePrivateGrants || 0)}
                        </td>
                          ),
                          flowTypePrivateMarketTotal: (
<td key="flowTypePrivateMarketTotal" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.flowTypePrivateMarket || 0)}
                        </td>
                          ),
                          flowTypePrivateFDITotal: (
<td key="flowTypePrivateFDITotal" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.flowTypePrivateFDI || 0)}
                        </td>
                          ),
                          flowTypeOtherPrivateTotal: (
<td key="flowTypeOtherPrivateTotal" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.flowTypeOtherPrivate || 0)}
                        </td>
                          ),
                          flowTypeNonFlowTotal: (
<td key="flowTypeNonFlowTotal" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.flowTypeNonFlow || 0)}
                        </td>
                          ),
                          flowTypeOtherTotal: (
<td key="flowTypeOtherTotal" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <span className="text-muted-foreground">USD</span> {formatCurrency(activity.flowTypeOther || 0)}
                        </td>
                          ),
                          isPublished: (
<td key="isPublished" className="px-4 py-2 text-sm text-foreground text-left">
                          {publicationStatus === 'published' ? 'Yes' : 'No'}
                        </td>
                          ),
                          isValidated: (
<td key="isValidated" className="px-4 py-2 text-sm text-foreground text-left">
                          {submissionStatus === 'validated' ? 'Yes' : submissionStatus === 'rejected' ? 'Rejected' : 'Pending'}
                        </td>
                          ),
                          iatiSyncStatus: (
<td key="iatiSyncStatus" className="px-4 py-2 text-sm text-foreground text-left">
                          {activity.autoSync && activity.syncStatus === 'live' ? 'Synced' : activity.autoSync && activity.syncStatus === 'pending' ? 'Pending' : activity.autoSync && activity.syncStatus === 'error' ? 'Error' : 'Not synced'}
                        </td>
                          ),
                          fundingOrganisations: (
<td key="fundingOrganisations" className="px-4 py-2 text-sm text-foreground text-left">
                          <OrganizationAvatarGroup
                            organizations={activity.fundingOrgs || []}
                            maxDisplay={3}
                            size="sm"
                            label="Funding Organisations"
                            showAcronym={true}
                          />
                        </td>
                          ),
                          extendingOrganisations: (
<td key="extendingOrganisations" className="px-4 py-2 text-sm text-foreground text-left">
                          <OrganizationAvatarGroup
                            organizations={activity.extendingOrgs || []}
                            maxDisplay={3}
                            size="sm"
                            label="Extending Organisations"
                            showAcronym={true}
                          />
                        </td>
                          ),
                          implementingOrganisations: (
<td key="implementingOrganisations" className="px-4 py-2 text-sm text-foreground text-left">
                          <OrganizationAvatarGroup
                            organizations={activity.implementingOrgs || []}
                            maxDisplay={3}
                            size="sm"
                            label="Implementing Organisations"
                            showAcronym={true}
                          />
                        </td>
                          ),
                          accountableOrganisations: (
<td key="accountableOrganisations" className="px-4 py-2 text-sm text-foreground text-left">
                          <OrganizationAvatarGroup
                            organizations={activity.accountableOrgs || []}
                            maxDisplay={3}
                            size="sm"
                            label="Accountable Organisations"
                            showAcronym={true}
                          />
                        </td>
                          ),
                          sdgs: (
<td key="sdgs" className="px-4 py-2 text-sm text-foreground text-left">
                          <SDGAvatarGroup
                            sdgMappings={activity.sdgMappings || []}
                            maxDisplay={3}
                            size="sm"
                          />
                        </td>
                          ),
                          policyMarkers: (
<td key="policyMarkers" className="px-4 py-2 text-sm text-foreground text-left">
                          <PolicyMarkerAvatarGroup
                            policyMarkers={activity.policyMarkers || []}
                            maxDisplay={3}
                            size="sm"
                          />
                        </td>
                          ),
                          createdByName: (
<td key="createdByName" className="px-4 py-2 text-sm text-foreground text-left">
                          {activity.creatorProfile?.name || '—'}
                        </td>
                          ),
                          createdAt: (
<td key="createdAt" className="px-4 py-2 text-sm text-foreground text-left">
                          {activity.createdAt ? (
                            <span title={new Date(activity.createdAt).toLocaleString()}>
                              {new Date(activity.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}{' '}
                              <span className="text-muted-foreground">
                                {new Date(activity.createdAt).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </span>
                          ) : '—'}
                        </td>
                          ),
                          createdByDepartment: (
<td key="createdByDepartment" className="px-4 py-2 text-sm text-foreground text-left">
                          {activity.creatorProfile?.department || '—'}
                        </td>
                          ),
                          importedFromIrt: (
<td key="importedFromIrt" className="px-4 py-2 text-sm text-foreground text-center">
                          {activity.createdVia === 'import' ? (
                            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800">
                              <DatabaseZap className="h-3 w-3 mr-1" />
                              IRT Import
                            </Badge>
                          ) : activity.createdVia === 'quick_add' ? (
                            <span className="text-muted-foreground">Quick Add</span>
                          ) : (
                            <span className="text-muted-foreground">Manual</span>
                          )}
                        </td>
                          ),
                          budgetStatus: (
<td key="budgetStatus" className="px-4 py-2 text-sm text-foreground text-center">
                          {(() => {
                            const status = activity.budgetStatus || 'unknown';
                            const statusLabel = getBudgetStatusLabel(status);
                            const colorClass = BUDGET_STATUS_COLORS[status] || BUDGET_STATUS_COLORS.unknown;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className={`${colorClass} cursor-pointer`}>
                                      {statusLabel}
                                      {status === 'partial' && activity.onBudgetPercentage && (
                                        <span className="ml-1">({activity.onBudgetPercentage}%)</span>
                                      )}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs bg-white border shadow-lg p-2">
                                    <p className="text-sm">
                                      {status === 'on_budget' && 'This activity is fully reflected in the government budget.'}
                                      {status === 'off_budget' && 'This activity is not included in the government budget.'}
                                      {status === 'partial' && `${activity.onBudgetPercentage || 0}% of this activity is reflected in the government budget.`}
                                      {status === 'unknown' && 'Budget status has not been determined for this activity.'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          capitalSpendPercent: (
<td key="capitalSpendPercent" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-pointer">
                                  {activity.capitalSpendPercentage != null 
                                    ? `${activity.capitalSpendPercentage}%` 
                                    : <span className="text-muted-foreground">—</span>
                                  }
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                                <p className="text-sm text-gray-600">
                                  Percentage of activity budget allocated to capital investment (infrastructure, equipment, fixed assets).
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                          ),
                          capitalSpendTotalBudget: (
<td key="capitalSpendTotalBudget" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-pointer">
                                  {activity.capitalSpendPercentage != null 
                                    ? <><span className="text-muted-foreground">USD</span> {formatCurrency(((activity as any).totalBudget || 0) * (activity.capitalSpendPercentage / 100))}</>
                                    : <span className="text-muted-foreground">—</span>
                                  }
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                                <p className="text-sm text-gray-600">
                                  Capital spend portion of Total Budget (Total Budget × Capital Spend %).
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                          ),
                          capitalSpendPlannedDisbursements: (
<td key="capitalSpendPlannedDisbursements" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-pointer">
                                  {activity.capitalSpendPercentage != null 
                                    ? <><span className="text-muted-foreground">USD</span> {formatCurrency(((activity as any).totalPlannedDisbursementsUSD || 0) * (activity.capitalSpendPercentage / 100))}</>
                                    : <span className="text-muted-foreground">—</span>
                                  }
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                                <p className="text-sm text-gray-600">
                                  Capital spend portion of Planned Disbursements (Planned Disbursements × Capital Spend %).
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                          ),
                          capitalSpendCommitments: (
<td key="capitalSpendCommitments" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-pointer">
                                  {activity.capitalSpendPercentage != null 
                                    ? <><span className="text-muted-foreground">USD</span> {formatCurrency((activity.commitments || 0) * (activity.capitalSpendPercentage / 100))}</>
                                    : <span className="text-muted-foreground">—</span>
                                  }
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                                <p className="text-sm text-gray-600">
                                  Capital spend portion of Commitments (Commitments × Capital Spend %).
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                          ),
                          capitalSpendDisbursements: (
<td key="capitalSpendDisbursements" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-pointer">
                                  {activity.capitalSpendPercentage != null 
                                    ? <><span className="text-muted-foreground">USD</span> {formatCurrency((activity.disbursements || 0) * (activity.capitalSpendPercentage / 100))}</>
                                    : <span className="text-muted-foreground">—</span>
                                  }
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                                <p className="text-sm text-gray-600">
                                  Capital spend portion of Disbursements (Disbursements × Capital Spend %).
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                          ),
                          voteScore: (
<td key="voteScore" className="px-4 py-2 text-sm text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`font-medium ${(activity.vote_score || 0) > 0 ? 'text-primary' : (activity.vote_score || 0) < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {(activity.vote_score || 0) > 0 ? '+' : ''}{activity.vote_score || 0}
                            </span>
                          </div>
                        </td>
                          ),
                          upvotes: (
<td key="upvotes" className="px-4 py-2 text-sm text-center">
                          <div className="flex items-center justify-center gap-1">
                            <ChevronUp className="h-4 w-4 text-primary" />
                            <span className={(activity.upvote_count || 0) > 0 ? 'font-medium text-primary' : 'text-muted-foreground'}>
                              {activity.upvote_count || 0}
                            </span>
                          </div>
                        </td>
                          ),
                          downvotes: (
<td key="downvotes" className="px-4 py-2 text-sm text-center">
                          <div className="flex items-center justify-center gap-1">
                            <ChevronDown className="h-4 w-4 text-red-500" />
                            <span className={(activity.downvote_count || 0) > 0 ? 'font-medium text-red-500' : 'text-muted-foreground'}>
                              {activity.downvote_count || 0}
                            </span>
                          </div>
                        </td>
                          ),
                          descriptionGeneral: (
<td key="descriptionGeneral" className="px-4 py-2 text-sm text-foreground text-left">
                          {(() => {
                            const truncated = truncateDescription(activity.description_general);
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-pointer line-clamp-2">{truncated.display}</span>
                                  </TooltipTrigger>
                                  {truncated.full && (
                                    <TooltipContent className="max-w-md bg-white border shadow-lg p-3">
                                      <div className="space-y-1">
                                        <p className="font-medium text-xs text-muted-foreground mb-2">Activity Description – General</p>
                                        <SafeHtml html={truncated.full} level="rich" className="text-sm" />
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          descriptionObjectives: (
<td key="descriptionObjectives" className="px-4 py-2 text-sm text-foreground text-left">
                          {(() => {
                            const truncated = truncateDescription(activity.description_objectives);
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-pointer line-clamp-2">{truncated.display}</span>
                                  </TooltipTrigger>
                                  {truncated.full && (
                                    <TooltipContent className="max-w-md bg-white border shadow-lg p-3">
                                      <div className="space-y-1">
                                        <p className="font-medium text-xs text-muted-foreground mb-2">Activity Description – Objectives</p>
                                        <SafeHtml html={truncated.full} level="rich" className="text-sm" />
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          descriptionTargetGroups: (
<td key="descriptionTargetGroups" className="px-4 py-2 text-sm text-foreground text-left">
                          {(() => {
                            const truncated = truncateDescription(activity.description_target_groups);
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-pointer line-clamp-2">{truncated.display}</span>
                                  </TooltipTrigger>
                                  {truncated.full && (
                                    <TooltipContent className="max-w-md bg-white border shadow-lg p-3">
                                      <div className="space-y-1">
                                        <p className="font-medium text-xs text-muted-foreground mb-2">Activity Description – Target Groups</p>
                                        <SafeHtml html={truncated.full} level="rich" className="text-sm" />
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          descriptionOther: (
<td key="descriptionOther" className="px-4 py-2 text-sm text-foreground text-left">
                          {(() => {
                            const truncated = truncateDescription(activity.description_other);
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-pointer line-clamp-2">{truncated.display}</span>
                                  </TooltipTrigger>
                                  {truncated.full && (
                                    <TooltipContent className="max-w-md bg-white border shadow-lg p-3">
                                      <div className="space-y-1">
                                        <p className="font-medium text-xs text-muted-foreground mb-2">Activity Description – Other</p>
                                        <SafeHtml html={truncated.full} level="rich" className="text-sm" />
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          timeElapsed: (
<td key="timeElapsed" className="px-4 py-2 text-sm text-foreground text-left">
                          {(() => {
                            const percent = calculateTimeElapsedPercent(activity);
                            if (percent === null) return <span className="text-muted-foreground">—</span>;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex flex-col items-start gap-1 cursor-pointer">
                                      <Progress 
                                        value={percent} 
                                        className="h-2 w-20"
                                      />
                                      <span className="text-xs text-muted-foreground">{percent.toFixed(0)}%</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="p-0 bg-white border shadow-lg">
                                    <table className="text-sm">
                                      <tbody>
                                        <tr className="border-b">
                                          <td className="px-3 py-1.5 text-muted-foreground text-left">Start</td>
                                          <td className="px-3 py-1.5 font-medium text-right">{formatDateLong(activity.actualStartDate || activity.plannedStartDate)}</td>
                                        </tr>
                                        <tr className="border-b">
                                          <td className="px-3 py-1.5 text-muted-foreground text-left">End</td>
                                          <td className="px-3 py-1.5 font-medium text-right">{formatDateLong(activity.plannedEndDate)}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-3 py-1.5 text-muted-foreground text-left">Progress</td>
                                          <td className="px-3 py-1.5 font-medium text-right">{percent.toFixed(1)}%</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          committedSpentPercent: (
<td key="committedSpentPercent" className="px-4 py-2 text-sm text-foreground text-left">
                          {(() => {
                            const percent = calculateCommittedSpentPercent(activity);
                            if (percent === null) return <span className="text-muted-foreground">—</span>;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex flex-col items-start gap-1 cursor-pointer">
                                      <Progress 
                                        value={percent} 
                                        className="h-2 w-20"
                                      />
                                      <span className="text-xs text-muted-foreground">{percent.toFixed(0)}%</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="p-0 bg-white border shadow-lg">
                                    <table className="text-sm">
                                      <tbody>
                                        <tr className="border-b">
                                          <td className="px-3 py-1.5 text-muted-foreground text-left">Committed</td>
                                          <td className="px-3 py-1.5 font-medium text-right">USD {formatCurrency(activity.commitments || 0)}</td>
                                        </tr>
                                        <tr className="border-b">
                                          <td className="px-3 py-1.5 text-muted-foreground text-left">Spent</td>
                                          <td className="px-3 py-1.5 font-medium text-right">USD {formatCurrency((activity.disbursements || 0) + (activity.expenditures || 0))}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-3 py-1.5 text-muted-foreground text-left">Usage</td>
                                          <td className="px-3 py-1.5 font-medium text-right">{percent.toFixed(1)}%</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          budgetSpentPercent: (
<td key="budgetSpentPercent" className="px-4 py-2 text-sm text-foreground text-left">
                          {(() => {
                            const percent = calculateBudgetSpentPercent(activity);
                            if (percent === null) return <span className="text-muted-foreground">—</span>;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex flex-col items-start gap-1 cursor-pointer">
                                      <Progress
                                        value={percent}
                                        className="h-2 w-20"
                                      />
                                      <span className="text-xs text-muted-foreground">{percent.toFixed(0)}%</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="p-0 bg-white border shadow-lg">
                                    <table className="text-sm">
                                      <tbody>
                                        <tr className="border-b">
                                          <td className="px-3 py-1.5 text-muted-foreground text-left">Budget</td>
                                          <td className="px-3 py-1.5 font-medium text-right">USD {formatCurrency((activity as any).totalBudget || 0)}</td>
                                        </tr>
                                        <tr className="border-b">
                                          <td className="px-3 py-1.5 text-muted-foreground text-left">Spent</td>
                                          <td className="px-3 py-1.5 font-medium text-right">USD {formatCurrency((activity.disbursements || 0) + (activity.expenditures || 0))}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-3 py-1.5 text-muted-foreground text-left">Usage</td>
                                          <td className="px-3 py-1.5 font-medium text-right">{percent.toFixed(1)}%</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          budgetShare: (
<td key="budgetShare" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-pointer">
                                  {formatPercentage(calculatePortfolioShare(
                                    (activity as any).totalBudget,
                                    systemTotals?.totalBudget
                                  ))}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                                <p className="text-sm text-gray-600 font-normal">
                                  Activity budget: USD {formatCurrency((activity as any).totalBudget || 0)}<br/>
                                  System total: USD {formatCurrency(systemTotals?.totalBudget || 0)}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                          ),
                          plannedDisbursementShare: (
<td key="plannedDisbursementShare" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-pointer">
                                  {formatPercentage(calculatePortfolioShare(
                                    (activity as any).totalPlannedDisbursementsUSD,
                                    systemTotals?.totalPlannedDisbursements
                                  ))}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                                <p className="text-sm text-gray-600 font-normal">
                                  Activity planned disbursements: USD {formatCurrency((activity as any).totalPlannedDisbursementsUSD || 0)}<br/>
                                  System total: USD {formatCurrency(systemTotals?.totalPlannedDisbursements || 0)}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                          ),
                          commitmentShare: (
<td key="commitmentShare" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-pointer">
                                  {formatPercentage(calculatePortfolioShare(
                                    activity.commitments,
                                    systemTotals?.totalCommitments
                                  ))}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                                <p className="text-sm text-gray-600 font-normal">
                                  Activity commitments: USD {formatCurrency(activity.commitments || 0)}<br/>
                                  System total: USD {formatCurrency(systemTotals?.totalCommitments || 0)}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                          ),
                          disbursementShare: (
<td key="disbursementShare" className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-pointer">
                                  {formatPercentage(calculatePortfolioShare(
                                    activity.disbursements,
                                    systemTotals?.totalDisbursements
                                  ))}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                                <p className="text-sm text-gray-600 font-normal">
                                  Activity disbursements: USD {formatCurrency(activity.disbursements || 0)}<br/>
                                  System total: USD {formatCurrency(systemTotals?.totalDisbursements || 0)}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                          ),
                          totalExpectedLength: (
<td key="totalExpectedLength" className="px-4 py-2 text-sm text-foreground text-left">
                          {(() => {
                            const duration = calculateDurationDetailed(
                              activity.plannedStartDate,
                              activity.plannedEndDate
                            );
                            if (!duration) return <span className="text-muted-foreground">Not available</span>;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-pointer">{formatDurationHuman(duration)}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white border shadow-lg p-2">
                                    <p className="text-sm font-medium">{duration.totalDays.toLocaleString()} days</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          implementationToDate: (
<td key="implementationToDate" className="px-4 py-2 text-sm text-foreground text-left">
                          {(() => {
                            const duration = calculateImplementationToDate(activity.actualStartDate);
                            const percent = calculateImplementationPercent(activity.actualStartDate, activity.plannedEndDate);
                            if (!duration) return <span className="text-muted-foreground">Not available</span>;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-pointer">
                                      <span>{formatDurationHuman(duration)}</span>
                                      {percent !== null && (
                                        <span className="text-xs text-muted-foreground ml-1">{percent.toFixed(0)}%</span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white border shadow-lg p-2">
                                    <p className="text-sm font-medium">{duration.totalDays.toLocaleString()} days</p>
                                    {percent !== null && <p className="text-sm text-muted-foreground">{percent.toFixed(1)}% of planned duration</p>}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          remainingDuration: (
<td key="remainingDuration" className="px-4 py-2 text-sm text-foreground text-left">
                          {(() => {
                            const duration = calculateRemainingDuration(activity.plannedEndDate);
                            const percent = calculateRemainingPercent(activity.plannedStartDate, activity.plannedEndDate);
                            if (!duration) return <span className="text-muted-foreground">Not available</span>;
                            const isOverdue = duration.totalDays === 0 && activity.plannedEndDate;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`cursor-pointer ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                                      <span>{isOverdue ? 'Overdue' : formatDurationHuman(duration)}</span>
                                      {percent !== null && !isOverdue && (
                                        <span className="text-xs text-muted-foreground ml-1">{percent.toFixed(0)}%</span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white border shadow-lg p-2">
                                    <p className="text-sm font-medium">{duration.totalDays.toLocaleString()} days remaining</p>
                                    {percent !== null && <p className="text-sm text-muted-foreground">{percent.toFixed(1)}% of planned duration</p>}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          actualLength: (
<td key="actualLength" className="px-4 py-2 text-sm text-foreground text-left">
                          {(() => {
                            const duration = calculateDurationDetailed(
                              activity.actualStartDate,
                              activity.actualEndDate
                            );
                            if (!duration) return <span className="text-muted-foreground">Not available</span>;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-pointer">{formatDurationHuman(duration)}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white border shadow-lg p-2">
                                    <p className="text-sm font-medium">{duration.totalDays.toLocaleString()} days</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          durationBand: (
<td key="durationBand" className="px-4 py-2 text-sm text-foreground text-left">
                          {(() => {
                            const duration = calculateDurationDetailed(
                              activity.plannedStartDate,
                              activity.plannedEndDate
                            );
                            if (!duration) return <span className="text-muted-foreground">Not available</span>;
                            const band = getDurationBand(duration.totalDays);
                            
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-pointer">
                                      {band || 'Unknown'}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white border shadow-lg p-2">
                                    <p className="text-sm font-medium">{duration.totalDays.toLocaleString()} total days</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </td>
                          ),
                          plannedStartDate: (
<td key="plannedStartDate" className="px-4 py-2 text-sm text-foreground text-left whitespace-nowrap">
                          {activity.plannedStartDate ? formatDateLong(activity.plannedStartDate) : <span className="text-muted-foreground">—</span>}
                        </td>
                          ),
                          plannedEndDate: (
<td key="plannedEndDate" className="px-4 py-2 text-sm text-foreground text-left whitespace-nowrap">
                          {activity.plannedEndDate ? formatDateLong(activity.plannedEndDate) : <span className="text-muted-foreground">—</span>}
                        </td>
                          ),
                          actualStartDate: (
<td key="actualStartDate" className="px-4 py-2 text-sm text-foreground text-left whitespace-nowrap">
                          {activity.actualStartDate ? formatDateLong(activity.actualStartDate) : <span className="text-muted-foreground">—</span>}
                        </td>
                          ),
                          actualEndDate: (
<td key="actualEndDate" className="px-4 py-2 text-sm text-foreground text-left whitespace-nowrap">
                          {activity.actualEndDate ? formatDateLong(activity.actualEndDate) : <span className="text-muted-foreground">—</span>}
                        </td>
                          ),
                        };
                        /* Always render a cell so column count matches header (keeps Actions column aligned) */
                        return actCellMap[colId] ?? (
                          <td key={colId} className="px-4 py-2 text-sm text-foreground" />
                        );
                      })}

                      {/* Actions cell */}
                      <td className="px-2 py-2 text-center align-middle">
                        <ActivityActionMenu
                          activityId={activity.id}
                          isBookmarked={isBookmarked(activity.id)}
                          canEdit={canUserEditActivity(user, activity)}
                          onToggleBookmark={() => toggleBookmark(activity.id)}
                          onEdit={() => router.push(`/activities/new?id=${activity.id}`)}
                          onExportXML={() => handleExportActivityXML(activity.id)}
                          onExportPDF={() => handleExportActivityPDF(activity.id)}
                          onExportExcel={() => handleExportActivityExcel(activity.id)}
                          onDelete={() => setDeleteActivityId(activity.id)}
                        />
                      </td>
                      {/* Filler cell so row hover extends to the scroll container edge */}
                      <td className="p-0 data-table-col-filler" aria-hidden="true" />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Card View - Using new ActivityList component
        <ActivityList
          activities={paginatedActivities.map(activity => ({
            id: activity.id,
            title: activity.title,
            iati_id: activity.iatiIdentifier || activity.iatiId,
            description: activity.description,
            acronym: activity.acronym,
            activity_status: activity.activityStatus,
            publication_status: activity.publicationStatus,
            planned_start_date: activity.plannedStartDate,
            planned_end_date: activity.plannedEndDate,
            updated_at: activity.updatedAt,
            partner_id: activity.partnerId,
            banner: activity.banner,
            icon: activity.icon,
            // Add aid modality fields
            default_aid_type: activity.default_aid_type,
            default_finance_type: activity.default_finance_type,
            default_flow_type: activity.default_flow_type,
            default_tied_status: activity.default_tied_status,
            default_aid_modality: activity.default_aid_modality,
            default_aid_modality_override: activity.default_aid_modality_override,
            // Add financial and reporting fields
            created_by_org_name: activity.created_by_org_name,
            created_by_org_acronym: activity.created_by_org_acronym,
            totalBudget: (activity as any).totalBudget || 0,
            totalDisbursed: (activity as any).totalDisbursed || 0,
            sdgMappings: (activity as any).sdgMappings || []
          }))}
          loading={loading}
          onEdit={canUserEditActivity(user, {} as Activity) ? (activityId) => router.push(`/activities/new?id=${activityId}`) : undefined}
          onDelete={(activityId) => setDeleteActivityId(activityId)}
          className="fade-in"
        />
      )}

      {/* Pagination */}
      {!isShowingAll && totalActivities > 0 && (
        <div className="bg-card rounded-lg border border-border shadow-sm p-4" data-tour="activities-pagination">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {Math.min(startIndex + 1, totalActivities)} to {Math.min(endIndex, totalActivities)} of {totalActivities} activities
            </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    usingOptimization ? safeOptimizedData.setPage(1) : setCurrentPage(1);
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = Math.max(1, currentPage - 1);
                    usingOptimization ? safeOptimizedData.setPage(newPage) : setCurrentPage(newPage);
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          usingOptimization ? safeOptimizedData.setPage(pageNum) : setCurrentPage(pageNum);
                        }}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = Math.min(totalPages, currentPage + 1);
                    usingOptimization ? safeOptimizedData.setPage(newPage) : setCurrentPage(newPage);
                  }}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    usingOptimization ? safeOptimizedData.setPage(totalPages) : setCurrentPage(totalPages);
                  }}
                  disabled={currentPage === totalPages}
                >
                  Last
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Items per page:</label>
                <Select 
                  value={pageLimit.toString()} 
                  onValueChange={(value) => handlePageLimitChange(Number(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteActivityId} onOpenChange={() => setDeleteActivityId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Activity</DialogTitle>
            <DialogDesc>
              Are you sure you want to delete this activity? This action cannot be undone.
            </DialogDesc>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteActivityId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteActivityId && handleDelete(deleteActivityId)}
            >
              Delete Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedActivityIds.size}
        itemType="activities"
        onDelete={() => setShowBulkDeleteDialog(true)}
        onCancel={() => setSelectedActivityIds(new Set())}
        isDeleting={isBulkDeleting}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <BulkDeleteDialog
        isOpen={showBulkDeleteDialog}
        itemCount={selectedActivityIds.size}
        itemType="activities"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteDialog(false)}
        isDeleting={isBulkDeleting}
      />

      {/* Context Menu for Activity Title */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              window.open(`/activities/${contextMenu.activityId}`, '_blank');
              setContextMenu(null);
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in new tab
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  );
}

export default function ActivitiesPage() {
  return (
    <AsyncErrorBoundary 
      fallback="page"
      onError={(error, errorInfo) => {
        console.error('Activities Page Error:', error, errorInfo);
      }}
    >
      <ActivitiesPageContent />
    </AsyncErrorBoundary>
  );
}
