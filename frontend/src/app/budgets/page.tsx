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
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { BudgetTable, BudgetColumnSelector, DEFAULT_VISIBLE_BUDGET_COLUMNS, BUDGET_COLUMNS_LOCALSTORAGE_KEY, type BudgetColumnId } from "@/components/budgets/BudgetTable";
import { useBudgets } from "@/hooks/useBudgets";
import { Budget, BudgetFilter } from "@/types/budget";
import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { BulkDeleteDialog } from "@/components/dialogs/bulk-delete-dialog";
import { YearlyTotalsBarChart, SingleSeriesDataPoint } from "@/components/charts/YearlyTotalsBarChart";
import { useLoadingBar } from "@/hooks/useLoadingBar";

export default function BudgetsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [pageLimit, setPageLimit] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("period_start");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [organizations, setOrganizations] = useState<any[]>([]);
  
  // Bulk selection state
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  
  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<BudgetColumnId[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(BUDGET_COLUMNS_LOCALSTORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return DEFAULT_VISIBLE_BUDGET_COLUMNS;
        }
      }
    }
    return DEFAULT_VISIBLE_BUDGET_COLUMNS;
  });
  
  // Save column visibility to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(BUDGET_COLUMNS_LOCALSTORAGE_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  const [filters, setFilters] = useState<BudgetFilter>({
    type: "all",
    status: "all",
    organization: "all",
    dateFrom: "",
    dateTo: "",
  });

  // Yearly summary state for chart
  const [yearlySummary, setYearlySummary] = useState<SingleSeriesDataPoint[]>([]);
  const [yearlySummaryLoading, setYearlySummaryLoading] = useState(true);

  // Use the custom hook to fetch budgets
  const { budgets, loading, error, refetch, deleteBudget, addBudget } = useBudgets({
    searchQuery,
    filters,
    page: currentPage,
    limit: pageLimit,
  });
  
  // Global loading bar for top-of-screen progress indicator
  const { startLoading, stopLoading } = useLoadingBar();
  
  // Show/hide global loading bar based on loading state
  useEffect(() => {
    if (loading && (!budgets.budgets || budgets.budgets.length === 0)) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [loading, budgets.budgets, startLoading, stopLoading]);

  // Load saved page limit preference and fetch organizations on mount
  useEffect(() => {
    const saved = localStorage.getItem("budgets-page-limit");
    if (saved) {
      const savedLimit = Number(saved);
      if (savedLimit > 0 && savedLimit !== 9999) {
        setPageLimit(savedLimit);
      }
    }

    fetchOrganizations();
  }, []);

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

  // Fetch yearly summary when filters change
  useEffect(() => {
    const fetchYearlySummary = async () => {
      setYearlySummaryLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.type !== 'all') params.append('type', filters.type);
        if (filters.status !== 'all') params.append('status', filters.status);
        if (filters.organization !== 'all') params.append('organization', filters.organization);
        if (searchQuery) params.append('search', searchQuery);

        const response = await fetch(`/api/budgets/yearly-summary?${params.toString()}`);
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
  }, [filters, searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  // Client-side sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Sort budgets client-side
  const sortedBudgets = React.useMemo(() => {
    if (!budgets.budgets?.length) return budgets.budgets || [];
    
    return [...budgets.budgets].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'period_start':
        case 'period_end':
        case 'value_date':
          aValue = a[sortField as keyof Budget] ? new Date(a[sortField as keyof Budget] as string).getTime() : 0;
          bValue = b[sortField as keyof Budget] ? new Date(b[sortField as keyof Budget] as string).getTime() : 0;
          break;
        case 'type':
        case 'status':
          aValue = String(a[sortField as keyof Budget]);
          bValue = String(b[sortField as keyof Budget]);
          break;
        case 'value':
          aValue = a.value || 0;
          bValue = b.value || 0;
          break;
        case 'value_usd':
          aValue = a.value_usd || 0;
          bValue = b.value_usd || 0;
          break;
        case 'activity':
          aValue = (a.activity?.title_narrative || a.activity?.title || 'Untitled Activity').toLowerCase();
          bValue = (b.activity?.title_narrative || b.activity?.title || 'Untitled Activity').toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [budgets.budgets, sortField, sortOrder]);

  // Pagination logic
  const totalBudgets = budgets.total || 0;
  const totalPages = Math.ceil(totalBudgets / pageLimit);
  const startIndex = (currentPage - 1) * pageLimit;
  const endIndex = Math.min(startIndex + pageLimit, totalBudgets);

  const handlePageLimitChange = (newLimit: number) => {
    setPageLimit(newLimit);
    setCurrentPage(1);
    localStorage.setItem("budgets-page-limit", newLimit.toString());
  };

  const exportBudgets = () => {
    const dataToExport = sortedBudgets.map((budget) => ({
      "Activity": budget.activity?.title_narrative || budget.activity_id,
      "Type": budget.type === 1 || budget.type === '1' ? 'Original' : budget.type === 2 || budget.type === '2' ? 'Revised' : budget.type,
      "Status": budget.status === 1 || budget.status === '1' ? 'Indicative' : budget.status === 2 || budget.status === '2' ? 'Committed' : budget.status,
      "Period Start": budget.period_start ? format(new Date(budget.period_start), "yyyy-MM-dd") : "",
      "Period End": budget.period_end ? format(new Date(budget.period_end), "yyyy-MM-dd") : "",
      "Value": budget.value || "",
      "Currency": budget.currency || "",
      "Value USD": budget.value_usd || "",
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
    a.download = `budgets-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Budgets exported successfully");
  };

  const handleRowClick = (budgetId: string) => {
    const budget = sortedBudgets.find(b => b.id === budgetId);
    if (budget && budget.activity_id) {
      router.push(`/activities/new?id=${budget.activity_id}&section=finances&tab=budgets`);
    }
  };

  const handleEdit = (budget: Budget) => {
    if (budget && budget.activity_id) {
      router.push(`/activities/new?id=${budget.activity_id}&section=finances&tab=budgets&budgetId=${budget.id}`);
    }
  };

  const handleDelete = async (budgetId: string) => {
    if (!budgetId || budgetId === 'undefined') {
      toast.error("Invalid budget ID");
      return;
    }

    if (!confirm("Are you sure you want to delete this budget?")) {
      return;
    }

    // Find the budget to delete (for potential recovery)
    const budgetToDelete = sortedBudgets.find(b => b.id === budgetId);
    
    // Optimistic update - remove from UI immediately
    deleteBudget(budgetId);

    try {
      // Use bulk delete endpoint with single ID
      const response = await fetch('/api/budgets/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: [budgetId]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete budget');
      }

      toast.success("Budget deleted successfully");
    } catch (error: any) {
      console.error('Error deleting budget:', error);
      toast.error(error.message || "Failed to delete budget");
      
      // Revert the optimistic update on error
      if (budgetToDelete) {
        addBudget(budgetToDelete);
      } else {
        refetch(); // Fallback: refresh the entire list
      }
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = sortedBudgets.map(b => b.id).filter(Boolean);
      setSelectedBudgetIds(new Set(allIds));
    } else {
      setSelectedBudgetIds(new Set());
    }
  };

  const handleSelectBudget = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedBudgetIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedBudgetIds(newSelected);
  };

  const handleBulkDelete = async () => {
    const selectedArray = Array.from(selectedBudgetIds);
    if (selectedArray.length === 0) return;

    setShowBulkDeleteDialog(false);
    setIsBulkDeleting(true);

    try {
      const response = await fetch('/api/budgets/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedArray
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete budgets');
      }

      const result = await response.json();

      // Optimistic update - remove from UI after successful delete
      selectedArray.forEach(id => deleteBudget(id));

      toast.success(`${result.deletedCount} ${result.deletedCount === 1 ? 'budget' : 'budgets'} deleted successfully`);

      // Clear selection AFTER optimistic update completes to ensure proper state sync
      setSelectedBudgetIds(new Set());

    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Failed to delete some budgets');
      // Revert optimistic updates by refetching
      refetch();
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
            <h1 className="text-2xl font-semibold text-slate-800">Budgets</h1>
            <p className="text-slate-500">View and manage all activity budgets</p>
          </div>
          <div className="flex items-center space-x-4">
            {sortedBudgets.length > 0 && (
              <Button
                variant="outline"
                onClick={exportBudgets}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search, Filters, and View Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-4 bg-slate-50 rounded-lg px-4">
          {/* Left Side: Search + Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="w-full sm:w-auto sm:min-w-[240px] lg:min-w-[300px]">
              <Input
                placeholder="Search budgets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="1">Original</SelectItem>
                  <SelectItem value="2">Revised</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="1">Indicative</SelectItem>
                  <SelectItem value="2">Committed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.organization} onValueChange={(value) => setFilters({...filters, organization: value})}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name && org.acronym && org.name !== org.acronym
                        ? `${org.name} (${org.acronym})`
                        : org.name || org.acronym}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Side: Column Selector + Results Count */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <BudgetColumnSelector
              visibleColumns={visibleColumns}
              onColumnsChange={setVisibleColumns}
            />
            {/* Results Summary */}
            <p className="text-sm text-slate-600 whitespace-nowrap">
              {totalBudgets === 0
                ? "No budgets"
                : `Showing ${(currentPage - 1) * pageLimit + 1}–${Math.min(currentPage * pageLimit, totalBudgets)} of ${totalBudgets} budgets`}
            </p>
          </div>
        </div>

        {/* Yearly Summary Chart */}
        <YearlyTotalsBarChart
          title="Budget Totals by Year"
          description="Yearly budget totals in USD (filtered)"
          loading={yearlySummaryLoading}
          singleSeriesData={yearlySummary}
          singleSeriesColor="#6366f1"
          singleSeriesLabel="Budget"
          height={280}
        />

        {/* Budgets Table */}
        {loading && sortedBudgets.length === 0 && !searchQuery ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-slate-500">Loading...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Unable to Load Budgets</h3>
                <p className="text-slate-500 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        ) : sortedBudgets.length === 0 ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-slate-500">No budgets found</p>
          </div>
        ) : (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <BudgetTable
                key={`budget-table-${budgets.length}-${selectedBudgetIds.size}`}
                budgets={sortedBudgets}
                loading={loading}
                error={null}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                onRowClick={handleRowClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
                selectedIds={selectedBudgetIds}
                onSelectAll={handleSelectAll}
                onSelectBudget={handleSelectBudget}
                visibleColumns={visibleColumns}
                onColumnsChange={setVisibleColumns}
              />
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalBudgets > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {Math.min(startIndex + 1, totalBudgets)} to {Math.min(endIndex, totalBudgets)} of {totalBudgets} budgets
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
          selectedCount={selectedBudgetIds.size}
          itemType="budgets"
          onDelete={() => setShowBulkDeleteDialog(true)}
          onCancel={() => setSelectedBudgetIds(new Set())}
          isDeleting={isBulkDeleting}
        />

        {/* Bulk Delete Confirmation Dialog */}
        <BulkDeleteDialog
          isOpen={showBulkDeleteDialog}
          itemCount={selectedBudgetIds.size}
          itemType="budgets"
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteDialog(false)}
          isDeleting={isBulkDeleting}
        />
      </div>
    </MainLayout>
  );
}
