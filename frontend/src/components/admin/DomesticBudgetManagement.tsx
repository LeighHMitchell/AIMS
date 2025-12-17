"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  TrendingUp,
  Wallet,
  Receipt,
  Calculator,
  ChevronsUpDown,
  Check,
  Search,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  DomesticBudgetData,
  DomesticBudgetFormData,
  getFiscalYearOptions,
  CURRENCY_OPTIONS,
  calculateExecutionRate,
} from "@/types/domestic-budget";
import {
  BudgetClassification,
  ClassificationType,
  CLASSIFICATION_TYPE_LABELS,
} from "@/types/aid-on-budget";

interface BudgetSummary {
  totalBudget: number;
  totalExpenditure: number;
  executionRate: number;
  count: number;
}

export function DomesticBudgetManagement() {
  const [budgetData, setBudgetData] = useState<DomesticBudgetData[]>([]);
  const [classifications, setClassifications] = useState<BudgetClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BudgetSummary>({
    totalBudget: 0,
    totalExpenditure: 0,
    executionRate: 0,
    count: 0,
  });

  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [filterType, setFilterType] = useState<ClassificationType | "all">("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DomesticBudgetData | null>(null);
  const [saving, setSaving] = useState(false);

  // Classification combobox state
  const [classificationOpen, setClassificationOpen] = useState(false);
  const [classificationSearch, setClassificationSearch] = useState("");

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Form state
  const [formData, setFormData] = useState<DomesticBudgetFormData & { valueDate?: string }>({
    budgetClassificationId: "",
    fiscalYear: new Date().getFullYear(),
    budgetAmount: 0,
    expenditureAmount: 0,
    currency: "USD",
    notes: "",
    valueDate: new Date().toISOString().split('T')[0],
  });

  const fiscalYearOptions = getFiscalYearOptions();

  // Fetch budget classifications
  const fetchClassifications = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/budget-classifications?flat=true");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch classifications");
      }

      setClassifications(data.data || []);
    } catch (err: any) {
      console.error("Error fetching classifications:", err);
    }
  }, []);

  // Fetch domestic budget data
  const fetchBudgetData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("fiscalYear", selectedYear.toString());
      if (filterType !== "all") {
        params.set("classificationType", filterType);
      }

      const response = await fetch(`/api/admin/domestic-budget?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch budget data");
      }

      setBudgetData(data.data || []);
      setSummary(data.summary || {
        totalBudget: 0,
        totalExpenditure: 0,
        executionRate: 0,
        count: 0,
      });
      setError(null);
    } catch (err: any) {
      console.error("Error fetching budget data:", err);
      setError(err.message || "Failed to load budget data");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, filterType]);

  useEffect(() => {
    fetchClassifications();
  }, [fetchClassifications]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  // Format currency
  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter classifications for searchable combobox
  const filteredClassifications = React.useMemo(() => {
    if (!classificationSearch) return classifications;
    const query = classificationSearch.toLowerCase();
    return classifications.filter(c =>
      c.code?.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      (c.classificationType && CLASSIFICATION_TYPE_LABELS[c.classificationType]?.toLowerCase().includes(query))
    );
  }, [classifications, classificationSearch]);

  // Group filtered classifications by type
  const groupedClassifications = React.useMemo(() => {
    const groups: Record<string, BudgetClassification[]> = {};
    filteredClassifications.forEach(c => {
      const type = c.classificationType || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(c);
    });
    return groups;
  }, [filteredClassifications]);

  // Sort budget data
  const sortedBudgetData = React.useMemo(() => {
    if (!sortColumn) return budgetData;

    return [...budgetData].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sortColumn) {
        case "code":
          aVal = a.budgetClassification?.code || "";
          bVal = b.budgetClassification?.code || "";
          break;
        case "classification":
          aVal = a.budgetClassification?.name || "";
          bVal = b.budgetClassification?.name || "";
          break;
        case "type":
          aVal = a.budgetClassification?.classificationType || "";
          bVal = b.budgetClassification?.classificationType || "";
          break;
        case "budget":
          aVal = a.budgetAmount;
          bVal = b.budgetAmount;
          break;
        case "expenditure":
          aVal = a.expenditureAmount;
          bVal = b.expenditureAmount;
          break;
        case "execution":
          aVal = calculateExecutionRate(a.budgetAmount, a.expenditureAmount);
          bVal = calculateExecutionRate(b.budgetAmount, b.expenditureAmount);
          break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [budgetData, sortColumn, sortDirection]);

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Get sort icon for column
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === "asc"
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Get selected classification
  const selectedClassification = classifications.find(c => c.id === formData.budgetClassificationId);

  // Open modal for creating
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      budgetClassificationId: "",
      fiscalYear: selectedYear,
      budgetAmount: 0,
      expenditureAmount: 0,
      currency: "USD",
      notes: "",
      valueDate: new Date().toISOString().split('T')[0],
    });
    setClassificationSearch("");
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEdit = (item: DomesticBudgetData) => {
    setEditingItem(item);
    setFormData({
      budgetClassificationId: item.budgetClassificationId,
      fiscalYear: item.fiscalYear,
      budgetAmount: item.budgetAmount,
      expenditureAmount: item.expenditureAmount,
      currency: item.currency,
      notes: item.notes || "",
      valueDate: (item as any).valueDate || new Date().toISOString().split('T')[0],
    });
    setClassificationSearch("");
    setIsModalOpen(true);
  };

  // Delete budget entry
  const handleDelete = async (item: DomesticBudgetData) => {
    const classificationName = item.budgetClassification?.name || "this entry";
    if (
      !confirm(
        `Are you sure you want to delete the budget entry for "${classificationName}" (${item.fiscalYear})?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/domestic-budget/${item.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete budget entry");
      }

      toast.success("Budget entry deleted successfully");
      fetchBudgetData();
    } catch (err: any) {
      console.error("Error deleting budget entry:", err);
      toast.error(err.message || "Failed to delete budget entry");
    }
  };

  // Save budget entry
  const handleSave = async () => {
    if (!formData.budgetClassificationId) {
      toast.error("Please select a budget classification");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/domestic-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save budget entry");
      }

      toast.success(
        editingItem
          ? "Budget entry updated successfully"
          : "Budget entry created successfully"
      );
      setIsModalOpen(false);
      fetchBudgetData();
    } catch (err: any) {
      console.error("Error saving budget entry:", err);
      toast.error(err.message || "Failed to save budget entry");
    } finally {
      setSaving(false);
    }
  };

  // Quick inline edit for amounts
  const handleQuickEdit = async (
    item: DomesticBudgetData,
    field: "budgetAmount" | "expenditureAmount",
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return;

    try {
      const response = await fetch("/api/admin/domestic-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetClassificationId: item.budgetClassificationId,
          fiscalYear: item.fiscalYear,
          budgetAmount: field === "budgetAmount" ? numValue : item.budgetAmount,
          expenditureAmount: field === "expenditureAmount" ? numValue : item.expenditureAmount,
          currency: item.currency,
          notes: item.notes,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update");
      }

      toast.success("Updated successfully");
      fetchBudgetData();
    } catch (err: any) {
      console.error("Error updating:", err);
      toast.error(err.message || "Failed to update");
    }
  };


  if (loading && budgetData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Domestic Budget Data
          </CardTitle>
          <CardDescription>
            Manage government budget and expenditure data by fiscal year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Domestic Budget Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-red-600">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error: {error}</p>
              <Button onClick={fetchBudgetData} variant="outline" className="mt-4">
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Domestic Budget Data
              </CardTitle>
              <CardDescription>
                Manage government budget and expenditure data by fiscal year
              </CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Wallet className="h-4 w-4" />
                  Total Budget
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.totalBudget)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Receipt className="h-4 w-4" />
                  Total Expenditure
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.totalExpenditure)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Execution Rate
                </div>
                <div className="text-2xl font-bold">
                  {summary.executionRate.toFixed(1)}%
                </div>
                <Progress value={Math.min(summary.executionRate, 100)} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calculator className="h-4 w-4" />
                  Entries
                </div>
                <div className="text-2xl font-bold">{summary.count}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="year-select">Fiscal Year:</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger id="year-select" className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fiscalYearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="type-filter">Classification Type:</Label>
              <Select
                value={filterType}
                onValueChange={(value) =>
                  setFilterType(value as ClassificationType | "all")
                }
              >
                <SelectTrigger id="type-filter" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="administrative">Administrative</SelectItem>
                  <SelectItem value="economic">Economic</SelectItem>
                  <SelectItem value="programme">Programme</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Table */}
          {budgetData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <DollarSign className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No budget data for {selectedYear}</p>
              <p className="text-sm mb-4">
                Add budget entries for your budget classifications
              </p>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="w-[100px] cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("code")}
                    >
                      <div className="flex items-center">
                        Code
                        {getSortIcon("code")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("classification")}
                    >
                      <div className="flex items-center">
                        Classification
                        {getSortIcon("classification")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center">
                        Type
                        {getSortIcon("type")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("budget")}
                    >
                      <div className="flex items-center justify-end">
                        Budget
                        {getSortIcon("budget")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("expenditure")}
                    >
                      <div className="flex items-center justify-end">
                        Expenditure
                        {getSortIcon("expenditure")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("execution")}
                    >
                      <div className="flex items-center justify-center">
                        Progress
                        {getSortIcon("execution")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("execution")}
                    >
                      <div className="flex items-center justify-end">
                        Execution %
                        {getSortIcon("execution")}
                      </div>
                    </TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBudgetData.map((item) => {
                    const executionRate = calculateExecutionRate(
                      item.budgetAmount,
                      item.expenditureAmount
                    );
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {item.budgetClassification?.code || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {item.budgetClassification?.name || "Unknown"}
                            </div>
                            {item.notes && (
                              <div className="text-xs text-muted-foreground">
                                {item.notes}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.budgetClassification?.classificationType
                            ? CLASSIFICATION_TYPE_LABELS[
                                item.budgetClassification.classificationType
                              ]
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.budgetAmount, item.currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.expenditureAmount, item.currency)}
                        </TableCell>
                        <TableCell>
                          <div
                            className="w-full rounded-full h-2.5 overflow-hidden"
                            style={{ backgroundColor: '#f1f4f8' }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(executionRate, 100)}%`,
                                backgroundColor: executionRate > 100 ? '#dc2625' : '#7b95a7'
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className="font-medium"
                              style={{
                                color: executionRate > 100 ? '#dc2625' : '#4c5568'
                              }}
                            >
                              {executionRate.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Budget Entry" : "Add Budget Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the budget and expenditure amounts"
                : "Add budget data for a classification and fiscal year"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Classification - Searchable Combobox */}
            <div className="space-y-2">
              <Label htmlFor="classification">Classification *</Label>
              <Popover open={classificationOpen} onOpenChange={setClassificationOpen}>
                <PopoverTrigger
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
                    !selectedClassification && "text-muted-foreground",
                    !!editingItem && "cursor-not-allowed opacity-50"
                  )}
                  disabled={!!editingItem}
                >
                  <span className="truncate">
                    {selectedClassification ? (
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {selectedClassification.code}
                        </span>
                        <span className="font-medium">{selectedClassification.name}</span>
                      </span>
                    ) : (
                      "Select classification..."
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedClassification && !editingItem && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, budgetClassificationId: "" });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            setFormData({ ...formData, budgetClassificationId: "" });
                          }
                        }}
                        className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Clear selection"
                      >
                        <span className="text-xs">×</span>
                      </div>
                    )}
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] min-w-[400px] p-0 shadow-lg border"
                  align="start"
                  sideOffset={4}
                >
                  <Command>
                    <div className="flex items-center border-b px-3 py-2">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        placeholder="Search classifications..."
                        value={classificationSearch}
                        onChange={(e) => setClassificationSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setClassificationOpen(false);
                            setClassificationSearch("");
                          }
                        }}
                        className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
                        autoFocus
                      />
                      {classificationSearch && (
                        <button
                          type="button"
                          onClick={() => setClassificationSearch("")}
                          className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                          aria-label="Clear search"
                        >
                          <span className="text-xs">×</span>
                        </button>
                      )}
                    </div>
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      {Object.entries(groupedClassifications).map(([type, items]) => (
                        <CommandGroup key={type}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            {CLASSIFICATION_TYPE_LABELS[type as ClassificationType] || type}
                          </div>
                          {items.map((classification) => (
                            <CommandItem
                              key={classification.id}
                              onSelect={() => {
                                setFormData({ ...formData, budgetClassificationId: classification.id });
                                setClassificationOpen(false);
                                setClassificationSearch("");
                              }}
                              className="pl-6 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.budgetClassificationId === classification.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {classification.code}
                                  </span>
                                  <span className="font-medium text-foreground">{classification.name}</span>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                      {Object.keys(groupedClassifications).length === 0 && (
                        <div className="py-8 text-center">
                          <div className="text-sm text-muted-foreground">
                            No classifications found.
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Try adjusting your search terms
                          </div>
                        </div>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Budget Amount, Currency, and Value Date in a row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetAmount">Budget Amount *</Label>
                <Input
                  id="budgetAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budgetAmount || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      budgetAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valueDate">Value Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="valueDate"
                    type="date"
                    value={formData.valueDate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, valueDate: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Fiscal Year and Expenditure Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fiscalYear">Fiscal Year *</Label>
                <Select
                  value={formData.fiscalYear.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, fiscalYear: parseInt(value) })
                  }
                  disabled={!!editingItem}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fiscalYearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenditureAmount">Expenditure Amount</Label>
                <Input
                  id="expenditureAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.expenditureAmount || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expenditureAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any notes about this budget entry"
                rows={2}
              />
            </div>

            {/* Preview execution rate */}
            {formData.budgetAmount > 0 && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">
                  Execution Rate Preview
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">
                    {calculateExecutionRate(
                      formData.budgetAmount,
                      formData.expenditureAmount
                    ).toFixed(1)}
                    %
                  </span>
                  <Progress
                    value={Math.min(
                      calculateExecutionRate(
                        formData.budgetAmount,
                        formData.expenditureAmount
                      ),
                      100
                    )}
                    className="flex-1"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
