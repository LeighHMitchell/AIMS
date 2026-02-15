"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  AlertCircle,
  Search,
  RefreshCw,
  Edit2,
  Save,
  X,
  Calendar,
  DollarSign
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { useUser } from "@/hooks/useUser";
import { BUDGET_TYPE_LABELS, BUDGET_STATUS_LABELS } from "@/types/budget";

type Budget = {
  id: string;
  activity_id: string;
  activityTitle?: string;
  type?: string | number;
  status?: string | number;
  period_start?: string;
  period_end?: string;
  value?: number;
  currency?: string;
  value_date?: string;
  value_usd?: number | null;
  usd_value?: number | null;
  [key: string]: any;
};

type DataGap = {
  field: string;
  label: string;
  count: number;
};

export function DataClinicBudgets() {
  const { user } = useUser();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [filteredBudgets, setFilteredBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBudgets, setSelectedBudgets] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ budgetId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [bulkEditField, setBulkEditField] = useState<string>('');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [dataGaps, setDataGaps] = useState<DataGap[]>([]);

  const isSuperUser = user?.role === 'super_user';

  useEffect(() => {
    fetchBudgetsWithGaps();
  }, []);

  useEffect(() => {
    filterBudgets();
  }, [budgets, selectedFilter, searchQuery]);

  const fetchBudgetsWithGaps = async () => {
    try {
      const res = await fetch('/api/data-clinic/budgets?missing_fields=true');
      if (!res.ok) throw new Error('Failed to fetch budgets');

      const data = await res.json();
      setBudgets(data.budgets || []);
      setDataGaps(data.dataGaps || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const filterBudgets = () => {
    let filtered = [...budgets];

    // Apply field filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(budget => {
        switch (selectedFilter) {
          case 'missing_type':
            return !budget.type;
          case 'missing_status':
            return !budget.status;
          case 'missing_period_start':
            return !budget.period_start;
          case 'missing_period_end':
            return !budget.period_end;
          case 'missing_value':
            return !budget.value;
          case 'missing_currency':
            return !budget.currency;
          case 'missing_value_date':
            return !budget.value_date;
          case 'missing_usd_value':
            return !budget.value_usd && !budget.usd_value;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(budget =>
        budget.activityTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        budget.activity_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredBudgets(filtered);
  };

  const saveFieldValue = async (budgetId: string, field: string, value: string) => {
    try {
      const res = await fetch(`/api/data-clinic/budgets/${budgetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value, userId: user?.id })
      });

      if (!res.ok) throw new Error('Failed to update budget');

      // Update local state
      setBudgets(prev => prev.map(budget =>
        budget.id === budgetId ? { ...budget, [field]: value } : budget
      ));

      toast.success('Budget updated successfully');
      setEditingField(null);
      setEditingValue('');
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget');
    }
  };

  const handleInlineEditBlur = (budgetId: string, field: string) => {
    if (editingValue !== undefined && editingValue !== null) {
      saveFieldValue(budgetId, field, editingValue);
    }
  };

  const handleInlineEditKeyDown = (e: React.KeyboardEvent, budgetId: string, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveFieldValue(budgetId, field, editingValue);
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditingValue('');
    }
  };

  const startEditing = (budgetId: string, field: string, currentValue: string) => {
    setEditingField({ budgetId, field });
    setEditingValue(currentValue || '');
  };

  const handleBulkUpdate = async () => {
    if (!bulkEditField || !bulkEditValue || selectedBudgets.size === 0) {
      toast.error('Please select budgets and provide a field and value');
      return;
    }

    try {
      const res = await fetch('/api/data-clinic/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'budget',
          field: bulkEditField,
          value: bulkEditValue,
          ids: Array.from(selectedBudgets),
          user_id: user?.id
        })
      });

      if (!res.ok) throw new Error('Failed to bulk update');

      toast.success(`Updated ${selectedBudgets.size} budgets`);
      setSelectedBudgets(new Set());
      setBulkEditField('');
      setBulkEditValue('');
      fetchBudgetsWithGaps();
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('Failed to bulk update budgets');
    }
  };

  const renderFieldValue = (budget: Budget, field: string) => {
    const value = budget[field];

    if (editingField?.budgetId === budget.id && editingField?.field === field) {
      switch (field) {
        case 'type':
          return (
            <div className="flex items-center gap-2">
              <Select
                value={String(value) || ''}
                onValueChange={(newValue) => saveFieldValue(budget.id, field, newValue)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BUDGET_TYPE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingField(null);
                  setEditingValue('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        case 'status':
          return (
            <div className="flex items-center gap-2">
              <Select
                value={String(value) || ''}
                onValueChange={(newValue) => saveFieldValue(budget.id, field, newValue)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BUDGET_STATUS_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingField(null);
                  setEditingValue('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        default:
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => handleInlineEditBlur(budget.id, field)}
                onKeyDown={(e) => handleInlineEditKeyDown(e, budget.id, field)}
                className="w-48"
                type={field === 'value' || field === 'value_usd' ? 'number' : field.includes('date') ? 'date' : 'text'}
                placeholder="Enter value"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingField(null);
                  setEditingValue('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
      }
    }

    // Display value with edit button for super users
    return (
      <div className="flex items-center gap-2">
        {value ? (
          <span className="text-sm">
            {field === 'type' && BUDGET_TYPE_LABELS[String(value) as keyof typeof BUDGET_TYPE_LABELS] ?
              BUDGET_TYPE_LABELS[String(value) as keyof typeof BUDGET_TYPE_LABELS] :
              field === 'status' && BUDGET_STATUS_LABELS[String(value) as keyof typeof BUDGET_STATUS_LABELS] ?
                BUDGET_STATUS_LABELS[String(value) as keyof typeof BUDGET_STATUS_LABELS] :
                field.includes('date') && value ? formatDate(value) :
                  field === 'value' || field === 'value_usd' ? formatCurrency(Number(value), budget.currency) :
                    value
            }
          </span>
        ) : (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Missing
          </Badge>
        )}
        {isSuperUser && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => startEditing(budget.id, field, String(value || ''))}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return format(date, "dd MMM yyyy");
    } catch (error) {
      return '—';
    }
  };

  const formatCurrency = (value: number, currency: string = "USD") => {
    if (value == null) return '—';
    const safeCurrency = currency && currency.length === 3 && /^[A-Z]{3}$/.test(currency.toUpperCase())
      ? currency.toUpperCase()
      : "USD";

    try {
      const formattedValue = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);

      return `${safeCurrency} ${formattedValue}`;
    } catch (error) {
      return `${safeCurrency} ${value}`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Gaps Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Data Gaps Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dataGaps.map((gap) => (
              <div
                key={gap.field}
                className="p-4 rounded-lg border cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedFilter(gap.field)}
              >
                <p className="text-sm text-muted-foreground">{gap.label}</p>
                <p className="text-2xl font-semibold">{gap.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search budgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by missing field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Budgets</SelectItem>
                <SelectItem value="missing_type">Missing Type</SelectItem>
                <SelectItem value="missing_status">Missing Status</SelectItem>
                <SelectItem value="missing_period_start">Missing Start Date</SelectItem>
                <SelectItem value="missing_period_end">Missing End Date</SelectItem>
                <SelectItem value="missing_value">Missing Value</SelectItem>
                <SelectItem value="missing_currency">Missing Currency</SelectItem>
                <SelectItem value="missing_value_date">Missing Value Date</SelectItem>
                <SelectItem value="missing_usd_value">Missing USD Value</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => fetchBudgetsWithGaps()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Bulk Actions for Super Users */}
          {isSuperUser && selectedBudgets.size > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium">
                  {selectedBudgets.size} budgets selected
                </p>
                <Select value={bulkEditField} onValueChange={setBulkEditField}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="type">Budget Type</SelectItem>
                    <SelectItem value="status">Budget Status</SelectItem>
                    <SelectItem value="currency">Currency</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Enter value"
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  className="w-[200px]"
                />
                <Button onClick={handleBulkUpdate}>
                  <Save className="h-4 w-4 mr-2" />
                  Apply to Selected
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-surface-muted">
                <tr>
                  {isSuperUser && (
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={selectedBudgets.size === filteredBudgets.length && filteredBudgets.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBudgets(new Set(filteredBudgets.map(b => b.id)));
                          } else {
                            setSelectedBudgets(new Set());
                          }
                        }}
                      />
                    </th>
                  )}
                  <th className="p-4 text-left text-sm font-medium">Activity</th>
                  <th className="p-4 text-left text-sm font-medium">Start Date</th>
                  <th className="p-4 text-left text-sm font-medium">End Date</th>
                  <th className="p-4 text-left text-sm font-medium">Type</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-left text-sm font-medium">Currency</th>
                  <th className="p-4 text-right text-sm font-medium">Value</th>
                  <th className="p-4 text-left text-sm font-medium">Value Date</th>
                  <th className="p-4 text-right text-sm font-medium">USD Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredBudgets.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperUser ? 11 : 10} className="p-8 text-center text-muted-foreground">
                      No budgets found with data gaps
                    </td>
                  </tr>
                ) : (
                  filteredBudgets.map((budget) => (
                    <tr key={budget.id} className="border-b hover:bg-muted/50">
                      {isSuperUser && (
                        <td className="p-4">
                          <Checkbox
                            checked={selectedBudgets.has(budget.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedBudgets);
                              if (checked) {
                                newSelected.add(budget.id);
                              } else {
                                newSelected.delete(budget.id);
                              }
                              setSelectedBudgets(newSelected);
                            }}
                          />
                        </td>
                      )}
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="font-medium truncate">
                            {budget.activityTitle || 'Untitled Activity'}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        {renderFieldValue(budget, 'period_start')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(budget, 'period_end')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(budget, 'type')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(budget, 'status')}
                      </td>
                      <td className="p-4">
                        {budget.currency ? (
                          <span className="text-sm font-mono">{budget.currency}</span>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {renderFieldValue(budget, 'value')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(budget, 'value_date')}
                      </td>
                      <td className="p-4 text-right">
                        {budget.value_usd || budget.usd_value ? (
                          <span className="text-sm font-medium">
                            {formatCurrency(budget.value_usd || budget.usd_value || 0, 'USD')}
                          </span>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
