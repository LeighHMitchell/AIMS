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
import { Download, ChevronLeft, ChevronRight, FileText, Building2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { 
  PlannedDisbursementsTable, 
  PlannedDisbursementColumnSelector,
  DEFAULT_VISIBLE_PLANNED_DISBURSEMENT_COLUMNS,
  PLANNED_DISBURSEMENT_COLUMNS_LOCALSTORAGE_KEY,
  type PlannedDisbursementColumnId 
} from "@/components/planned-disbursements/PlannedDisbursementsTable";
import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { BulkDeleteDialog } from "@/components/dialogs/bulk-delete-dialog";
import { YearlyTotalsBarChart, SingleSeriesDataPoint } from "@/components/charts/YearlyTotalsBarChart";
import { useLoadingBar } from "@/hooks/useLoadingBar";
import { CustomYearSelector } from "@/components/ui/custom-year-selector";
import { useCustomYears } from "@/hooks/useCustomYears";

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

  // Bulk selection state
  const [selectedDisbursementIds, setSelectedDisbursementIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const [filters, setFilters] = useState({
    types: [] as string[],
    organizations: [] as string[],
    dateFrom: "",
    dateTo: "",
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

  // Yearly summary state for chart
  const [yearlySummary, setYearlySummary] = useState<SingleSeriesDataPoint[]>([]);
  const [yearlySummaryLoading, setYearlySummaryLoading] = useState(true);

  // Custom year selection for chart
  const { customYears, selectedId: selectedCustomYearId, setSelectedId: setSelectedCustomYearId, selectedYear, loading: customYearsLoading } = useCustomYears();
  
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
      const response = await fetch('/api/organizations');
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

      const response = await fetch(`/api/planned-disbursements/list?${params}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[Planned Disbursements Page] Sample disbursement from API:', data.disbursements?.[0]);
        console.log('[Planned Disbursements Page] Sample activity:', data.disbursements?.[0]?.activity);
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

  // Fetch yearly summary when filters change
  useEffect(() => {
    const fetchYearlySummary = async () => {
      setYearlySummaryLoading(true);
      try {
        const params = new URLSearchParams();
        // Pass types as comma-separated values if any are selected
        if (filters.types.length > 0) params.append('types', filters.types.join(','));
        // Pass organizations as comma-separated values if any are selected
        if (filters.organizations.length > 0) params.append('organizations', filters.organizations.join(','));
        if (searchQuery) params.append('search', searchQuery);
        
        // Add custom year params if selected
        if (selectedYear) {
          params.append('startMonth', selectedYear.startMonth.toString());
          params.append('startDay', selectedYear.startDay.toString());
          params.append('endMonth', selectedYear.endMonth.toString());
          params.append('endDay', selectedYear.endDay.toString());
        }

        const response = await fetch(`/api/planned-disbursements/yearly-summary?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setYearlySummary(data.years || []);
        }
      } catch (error) {
        console.error('Error fetching yearly summary:', error);
      } finally {
        setYearlySummaryLoading(false);
      }
    };

    fetchYearlySummary();
  }, [filters, searchQuery, selectedYear]);

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

  const handleRowClick = (disbursementId: string) => {
    const disbursement = disbursements.find(d => d.id === disbursementId);
    if (disbursement && disbursement.activity_id) {
      router.push(`/activities/new?id=${disbursement.activity_id}&section=finances&tab=planned-disbursements`);
    }
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

    if (!confirm("Are you sure you want to delete this planned disbursement?")) {
      return;
    }

    try {
      const response = await fetch(`/api/planned-disbursements/${disbursementId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete planned disbursement');
      }

      toast.success("Planned disbursement deleted successfully");
      fetchDisbursements();
    } catch (error: any) {
      console.error('Error deleting planned disbursement:', error);
      toast.error(error.message || "Failed to delete planned disbursement");
    }
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
    setIsBulkDeleting(true);

    try {
      const response = await fetch('/api/planned-disbursements/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedArray
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete planned disbursements');
      }

      const result = await response.json();
      toast.success(`${result.deletedCount} ${result.deletedCount === 1 ? 'disbursement' : 'disbursements'} deleted successfully`);

      // Refresh data first
      await fetchDisbursements();

      // Clear selection AFTER refresh completes to ensure proper state sync
      setSelectedDisbursementIds(new Set());

    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Failed to delete some planned disbursements');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-screen-2xl mx-auto px-6 py-4 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Planned Disbursements</h1>
            <p className="text-slate-500">View and manage all planned disbursements</p>
          </div>
          <div className="flex items-center space-x-4">
            {disbursements.length > 0 && (
              <Button
                variant="outline"
                onClick={exportDisbursements}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-end gap-3 py-3 bg-slate-50 rounded-lg px-3 border border-gray-200">
            {/* Search Input */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <Input
                placeholder="Search planned disbursements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[240px] h-9"
              />
            </div>

            {/* Filters */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <MultiSelectFilter
                  options={[
                    { value: "1", label: "Original", code: "1" },
                    { value: "2", label: "Revised", code: "2" },
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
                <Label className="text-xs text-muted-foreground">Organisation</Label>
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

            {/* Spacer */}
            <div className="flex-1" />

            {/* Column Selector */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Columns</Label>
              <PlannedDisbursementColumnSelector
                visibleColumns={visibleColumns}
                onColumnsChange={setVisibleColumns}
              />
            </div>
        </div>

        {/* Yearly Summary Chart */}
        <YearlyTotalsBarChart
          title="Planned Disbursement Totals by Year"
          description="Yearly planned disbursement totals in USD (filtered)"
          loading={yearlySummaryLoading}
          singleSeriesData={yearlySummary}
          singleSeriesColor="#7b95a7"
          singleSeriesLabel="Planned Disbursement"
          height={280}
          headerControls={
            <CustomYearSelector
              customYears={customYears}
              selectedId={selectedCustomYearId}
              onSelect={setSelectedCustomYearId}
              loading={customYearsLoading}
              placeholder="Year Type"
            />
          }
        />

        {/* Planned Disbursements Table */}
        {loading && disbursements.length === 0 ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-slate-500">Loading...</p>
          </div>
        ) : disbursements.length === 0 ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-slate-500">No planned disbursements found</p>
          </div>
        ) : (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <PlannedDisbursementsTable
                key={`disbursements-table-${disbursements.length}-${selectedDisbursementIds.size}`}
                disbursements={disbursements}
                loading={loading}
                error={null}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                onRowClick={handleRowClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
                selectedIds={selectedDisbursementIds}
                onSelectAll={handleSelectAll}
                onSelectDisbursement={handleSelectDisbursement}
                visibleColumns={visibleColumns}
                onColumnsChange={setVisibleColumns}
              />
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalDisbursements > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
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
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
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
    </MainLayout>
  );
}
