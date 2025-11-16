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

export default function BudgetsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [pageLimit, setPageLimit] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("period_start");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [totalBudgets, setTotalBudgets] = useState(0);
  const [loading, setLoading] = useState(true);

  // Bulk selection state
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    organization: "all",
    dateFrom: "",
    dateTo: "",
  });

  // Load saved page limit preference
  useEffect(() => {
    const saved = localStorage.getItem("budgets-page-limit");
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

  // Fetch budgets
  useEffect(() => {
    fetchBudgets();
  }, [currentPage, pageLimit, searchQuery, filters, sortField, sortOrder]);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageLimit.toString(),
        search: searchQuery,
        sortField,
        sortOrder,
        ...filters,
      });

      const response = await fetch(`/api/budgets/list?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBudgets(data.budgets || []);
        setTotalBudgets(data.total || 0);
      } else {
        toast.error("Failed to load budgets");
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast.error("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  // Pagination logic
  const totalPages = Math.ceil(totalBudgets / pageLimit);
  const startIndex = (currentPage - 1) * pageLimit;
  const endIndex = Math.min(startIndex + pageLimit, totalBudgets);

  const handlePageLimitChange = (newLimit: number) => {
    setPageLimit(newLimit);
    setCurrentPage(1);
    localStorage.setItem("budgets-page-limit", newLimit.toString());
  };

  const exportBudgets = () => {
    const dataToExport = budgets.map((budget) => ({
      "Activity": budget.activity?.title_narrative || budget.activity_id,
      "Type": budget.type || "",
      "Status": budget.status || "",
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
    const budget = budgets.find(b => b.id === budgetId);
    if (budget && budget.activity_id) {
      router.push(`/activities/new?id=${budget.activity_id}&section=finances&tab=budgets`);
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
            {budgets.length > 0 && (
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

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-4 bg-slate-50 rounded-lg px-4">
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
                <SelectTrigger className="w-[180px]">
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

          {/* Results Summary */}
          <p className="text-sm text-slate-600 whitespace-nowrap">
            {totalBudgets === 0
              ? "No budgets"
              : `Showing ${startIndex + 1}–${endIndex} of ${totalBudgets} budgets`}
          </p>
        </div>

        {/* Budgets Table */}
        {loading ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-slate-500">Loading...</p>
          </div>
        ) : budgets.length === 0 ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-slate-500">No budgets found</p>
          </div>
        ) : (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('activity')}>
                      Activity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('type')}>
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('period_start')}>
                      Period Start
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('period_end')}>
                      Period End
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('value')}>
                      Value
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('value_usd')}>
                      Value (USD)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {budgets.map((budget) => (
                    <tr
                      key={budget.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(budget.id)}
                    >
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {budget.activity?.title_narrative || budget.activity?.title || 'Untitled Activity'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {budget.type === '1' ? 'Original' : budget.type === '2' ? 'Revised' : budget.type || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {budget.status === '1' ? 'Indicative' : budget.status === '2' ? 'Committed' : budget.status || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {budget.period_start ? format(new Date(budget.period_start), "MMM d, yyyy") : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {budget.period_end ? format(new Date(budget.period_end), "MMM d, yyyy") : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                        {budget.value ? `${budget.currency} ${Number(budget.value).toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                        {budget.value_usd ? `$${Number(budget.value_usd).toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalBudgets > pageLimit && (
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
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
      </div>
    </MainLayout>
  );
}
