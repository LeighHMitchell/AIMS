"use client"

import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { showUndoToast, useFlushDeletesOnUnmount } from "@/lib/toast-manager";
import { Download, ChevronLeft, ChevronRight, FileText, Building2, CalendarClock, AlignLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  PlannedDisbursementsTable, 
  PlannedDisbursementColumnSelector,
  DEFAULT_VISIBLE_PLANNED_DISBURSEMENT_COLUMNS,
  PLANNED_DISBURSEMENT_COLUMNS_LOCALSTORAGE_KEY,
  type PlannedDisbursementColumnId 
} from "@/components/planned-disbursements/PlannedDisbursementsTable";
import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { BulkDeleteDialog } from "@/components/dialogs/bulk-delete-dialog";
import { useLoadingBar } from "@/hooks/useLoadingBar";
import { PlannedDisbursementsListSkeleton } from "@/components/skeletons/FullScreenSkeletons";
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { apiFetch } from '@/lib/api-fetch';

export default function PlannedDisbursementsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [pageLimit, setPageLimit] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("period_start");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [totalDisbursements, setTotalDisbursements] = useState(0);
  const [loading, setLoading] = useState(true);

  const { confirm, ConfirmDialog } = useConfirmDialog();

  // Bulk selection state
  const [selectedDisbursementIds, setSelectedDisbursementIds] = useState<Set<string>>(new Set());
  useFlushDeletesOnUnmount("planned-disbursements-list");
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const [filters, setFilters] = useState({
    types: [] as string[],
    organizations: [] as string[],
    dateFrom: "",
    dateTo: "",
  });

  // Show descriptions toggle with localStorage persistence
  const [showDescriptions, setShowDescriptions] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('plannedDisbursements_showDescriptions') === 'true';
    }
    return false;
  });

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<PlannedDisbursementColumnId[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PLANNED_DISBURSEMENT_COLUMNS_LOCALSTORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return DEFAULT_VISIBLE_PLANNED_DISBURSEMENT_COLUMNS;
        }
      }
    }
    return DEFAULT_VISIBLE_PLANNED_DISBURSEMENT_COLUMNS;
  });

  // Save column visibility to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PLANNED_DISBURSEMENT_COLUMNS_LOCALSTORAGE_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  // Global loading bar for top-of-screen progress indicator
  const { startLoading, stopLoading } = useLoadingBar();
  
  // Show/hide global loading bar based on loading state
  useEffect(() => {
    if (loading && disbursements.length === 0) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [loading, disbursements.length, startLoading, stopLoading]);

  // Load saved page limit preference
  useEffect(() => {
    const saved = localStorage.getItem("planned-disbursements-page-limit");
    if (saved) {
      const savedLimit = Number(saved);
      if (savedLimit > 0) {
        setPageLimit(savedLimit);
      }
    }

    fetchOrganizations();
  }, []);

  // Fetch organizations for filter dropdown
  const fetchOrganizations = async () => {
    try {
      const response = await apiFetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || data);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  // Fetch planned disbursements
  useEffect(() => {
    fetchDisbursements();
  }, [currentPage, pageLimit, searchQuery, filters, sortField, sortOrder]);

  const fetchDisbursements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageLimit.toString(),
        search: searchQuery,
        sortField,
        sortOrder,
      });
      // Add array filters
      if (filters.types.length > 0) params.append('types', filters.types.join(','));
      if (filters.organizations.length > 0) params.append('organizations', filters.organizations.join(','));

      const response = await apiFetch(`/api/planned-disbursements/list?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDisbursements(data.disbursements || []);
        setTotalDisbursements(data.total || 0);
      } else {
        toast.error("Failed to load planned disbursements");
      }
    } catch (error) {
      console.error('Error fetching planned disbursements:', error);
      toast.error("Failed to load planned disbursements");
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  // Pagination logic
  const totalPages = Math.ceil(totalDisbursements / pageLimit);
  const startIndex = (currentPage - 1) * pageLimit;
  const endIndex = Math.min(startIndex + pageLimit, totalDisbursements);

  const handlePageLimitChange = (newLimit: number) => {
    setPageLimit(newLimit);
    setCurrentPage(1);
    localStorage.setItem("planned-disbursements-page-limit", newLimit.toString());
  };

  const exportDisbursements = () => {
    const dataToExport = disbursements.map((disb) => ({
      "Activity": disb.activity?.title_narrative || disb.activity_id,
      "Provider Organisation": disb.provider_org_name || "",
      "Provider Activity": disb.provider_activity?.title_narrative || "",
      "Receiver Organisation": disb.receiver_org_name || "",
      "Receiver Activity": disb.receiver_activity?.title_narrative || "",
      "Type": disb.type || "",
      "Period Start": disb.period_start ? format(new Date(disb.period_start), "yyyy-MM-dd") : "",
      "Period End": disb.period_end ? format(new Date(disb.period_end), "yyyy-MM-dd") : "",
      "Value": disb.value || "",
      "Currency": disb.currency || "",
      "Value USD": disb.value_usd || "",
      "Value Date": disb.value_date ? format(new Date(disb.value_date), "yyyy-MM-dd") : "",
    }));

    const headers = Object.keys(dataToExport[0] || {});
    const csv = [
      headers.join(","),
      ...dataToExport.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row];
            return typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planned-disbursements-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Planned disbursements exported successfully");
  };


  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleEdit = (disbursement: any) => {
    if (disbursement && disbursement.activity_id) {
      router.push(`/activities/new?id=${disbursement.activity_id}&section=finances&tab=planned-disbursements&disbursementId=${disbursement.id}`);
    }
  };

  const handleDelete = async (disbursementId: string) => {
    if (!disbursementId || disbursementId === 'undefined') {
      toast.error("Invalid disbursement ID");
      return;
    }

    if (!(await confirm({ title: 'Delete this planned disbursement?', description: 'You can undo this within 5 seconds.', confirmLabel: 'Delete', cancelLabel: 'Cancel' }))) {
      return;
    }

    const snapshot = disbursements;
    setDisbursements(prev => prev.filter(d => d.id !== disbursementId));

    showUndoToast("Planned disbursement deleted", {
      id: `delete-pd-${disbursementId}`,
      source: "planned-disbursements-list",
      commit: async () => {
        const response = await apiFetch(`/api/planned-disbursements/${disbursementId}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete planned disbursement');
        await fetchDisbursements();
      },
      onUndo: () => setDisbursements(snapshot),
      onCommitError: (err: any) => {
        console.error('Error deleting planned disbursement:', err);
        setDisbursements(snapshot);
        toast.error(err?.message || "Failed to delete planned disbursement");
      },
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = disbursements.map(d => d.id).filter(Boolean);
      setSelectedDisbursementIds(new Set(allIds));
    } else {
      setSelectedDisbursementIds(new Set());
    }
  };

  const handleSelectDisbursement = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedDisbursementIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedDisbursementIds(newSelected);
  };

  const handleBulkDelete = async () => {
    const selectedArray = Array.from(selectedDisbursementIds);
    if (selectedArray.length === 0) return;

    setShowBulkDeleteDialog(false);

    const snapshot = disbursements;
    setDisbursements(prev => prev.filter(d => !selectedDisbursementIds.has(d.id)));
    setSelectedDisbursementIds(new Set());

    const count = selectedArray.length;
    showUndoToast(`${count} ${count === 1 ? 'disbursement' : 'disbursements'} deleted`, {
      id: `delete-pd-bulk-${Date.now()}`,
      source: "planned-disbursements-list",
      commit: async () => {
        const response = await apiFetch('/api/planned-disbursements/bulk-delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedArray }),
        });
        if (!response.ok) throw new Error('Failed to delete planned disbursements');
        await fetchDisbursements();
      },
      onUndo: () => setDisbursements(snapshot),
      onCommitError: (err) => {
        console.error('Bulk delete failed:', err);
        setDisbursements(snapshot);
        toast.error('Failed to delete some planned disbursements');
      },
    });
  };

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Planned Disbursements</h1>
              <p className="text-muted-foreground mt-1">View and manage all planned disbursements</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {disbursements.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={exportDisbursements}
                title="Export CSV"
                aria-label="Export CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <FilterBar>
            {/* Search Input */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="planned-disbursements-search" className="text-helper text-muted-foreground">Search</Label>
              <Input
                id="planned-disbursements-search"
                placeholder="Search planned disbursements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[240px] h-9"
              />
            </div>

            {/* Filters */}
              <div className="flex flex-col gap-1">
                <Label className="text-helper text-muted-foreground">Type</Label>
                <MultiSelectFilter
                  options={[
                    { value: "1", label: "Original", code: "1", color: "#3b82f6" },
                    { value: "2", label: "Revised", code: "2", color: "#f59e0b" },
                  ]}
                  value={filters.types}
                  onChange={(value) => setFilters({...filters, types: value})}
                  placeholder="All"
                  searchPlaceholder="Search types..."
                  emptyText="No types found."
                  icon={<FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                  className="w-[180px] h-9"
                  dropdownClassName="w-[240px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-helper text-muted-foreground">Organisation</Label>
                <MultiSelectFilter
                  options={organizations.map((org) => ({
                    value: org.id,
                    label: org.name && org.acronym && org.name !== org.acronym
                      ? `${org.name} (${org.acronym})`
                      : org.name || org.acronym,
                    code: org.acronym || undefined,
                  }))}
                  value={filters.organizations}
                  onChange={(value) => setFilters({...filters, organizations: value})}
                  placeholder="All"
                  searchPlaceholder="Search organisations..."
                  emptyText="No organisations found."
                  icon={<Building2 className="h-4 w-4 text-muted-foreground shrink-0" />}
                  className="w-[220px] h-9"
                  dropdownClassName="w-[400px]"
                />
              </div>

            {/* Column Selector */}
            <div className="flex flex-col gap-1">
              <Label className="text-helper text-muted-foreground">Columns</Label>
              <PlannedDisbursementColumnSelector
                visibleColumns={visibleColumns}
                onColumnsChange={setVisibleColumns}
              />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Descriptions Toggle */}
            <Button
              variant={showDescriptions ? "default" : "outline"}
              size="sm"
              className="h-9 w-9 flex-shrink-0 p-0"
              title={showDescriptions ? "Hide descriptions" : "Show descriptions"}
              onClick={() => {
                const next = !showDescriptions;
                setShowDescriptions(next);
                localStorage.setItem('plannedDisbursements_showDescriptions', String(next));
              }}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
        </FilterBar>

        {/* Planned Disbursements Table */}
        {loading && disbursements.length === 0 ? (
          <PlannedDisbursementsListSkeleton />
        ) : disbursements.length === 0 ? (
          <EmptyState
            illustration="/images/empty-hourglass.webp"
            title="No planned disbursements found"
            message="There are no planned disbursements in the system yet."
          />
        ) : (
          <div className="bg-white rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <PlannedDisbursementsTable
                key={`disbursements-table-${disbursements.length}-${selectedDisbursementIds.size}`}
                disbursements={disbursements}
                loading={loading}
                error={null}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                onEdit={handleEdit}
                onDelete={handleDelete}
                selectedIds={selectedDisbursementIds}
                onSelectAll={handleSelectAll}
                onSelectDisbursement={handleSelectDisbursement}
                visibleColumns={visibleColumns}
                onColumnsChange={setVisibleColumns}
                showDescriptions={showDescriptions}
              />
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalDisbursements > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-body text-muted-foreground">
                  Showing {Math.min(startIndex + 1, totalDisbursements)} to {Math.min(endIndex, totalDisbursements)} of {totalDisbursements} planned disbursements
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
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
                      setCurrentPage(newPage);
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
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 p-0 ${currentPage === pageNum ? "bg-muted text-foreground" : ""}`}
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
                      setCurrentPage(newPage);
                    }}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Last
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-body text-muted-foreground">Items per page:</label>
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
            </CardContent>
          </Card>
        )}

        {/* Bulk Action Toolbar */}
        <BulkActionToolbar
          selectedCount={selectedDisbursementIds.size}
          itemType="planned disbursements"
          onDelete={() => setShowBulkDeleteDialog(true)}
          onCancel={() => setSelectedDisbursementIds(new Set())}
          isDeleting={isBulkDeleting}
        />

        {/* Bulk Delete Confirmation Dialog */}
        <BulkDeleteDialog
          isOpen={showBulkDeleteDialog}
          itemCount={selectedDisbursementIds.size}
          itemType="planned disbursements"
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteDialog(false)}
          isDeleting={isBulkDeleting}
        />
      </div>
      <ConfirmDialog />
    </MainLayout>
  );
}
