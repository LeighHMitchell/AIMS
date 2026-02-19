'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addMonths, addQuarters, addYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, differenceInMonths, parseISO, isValid, isBefore, isAfter, getQuarter, getYear } from 'date-fns';
import { format as formatDateFns } from 'date-fns';
import { Trash2, Copy, Loader2, CheckCircle, Lock, Unlock, FastForward, AlertCircle, Info, MoreVertical, Plus, Calendar, Download, Pencil, DollarSign, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAllCurrenciesWithPinned, type Currency } from '@/data/currencies';
import { BudgetCurrencySelect } from '@/components/ui/budget-currency-select';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-fetch';
// USD conversion now happens server-side - no client-side API needed
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// Removed shared HeroCard import - using local simple version
import { useUser } from '@/hooks/useUser';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { showValidationError } from '@/lib/toast-manager';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BUDGET_TYPES } from '@/data/budget-type';
import { BUDGET_STATUSES } from '@/data/budget-status';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import { exportToCSV } from '@/lib/csv-export';
import { BulkActionToolbar } from '@/components/ui/bulk-action-toolbar';

// Format currency with abbreviations (K, M, B)
const formatCurrencyAbbreviated = (value: number) => {
  const absValue = Math.abs(value);
  let formattedValue: string;

  if (absValue >= 1_000_000_000) {
    formattedValue = (value / 1_000_000_000).toFixed(1) + 'B';
  } else if (absValue >= 1_000_000) {
    formattedValue = (value / 1_000_000).toFixed(1) + 'M';
  } else if (absValue >= 1_000) {
    formattedValue = (value / 1_000).toFixed(1) + 'K';
  } else {
    formattedValue = value.toFixed(0);
  }

  return '$' + formattedValue;
};

// Simple Hero Card Component (matching TransactionsManager style)
interface SimpleHeroCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon?: React.ReactNode;
}

function HeroCard({ title, value, subtitle, icon }: SimpleHeroCardProps) {
  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </div>
  );
}

// Types
interface BudgetLine {
  ref: string;
  value: number;
  currency: string;
  value_date: string;
  narrative: string;
}

interface ActivityBudget {
  id?: string;
  activity_id: string;
  type: 1 | 2; // 1 = Original, 2 = Revised
  status: 1 | 2; // 1 = Indicative, 2 = Committed
  period_start: string;
  period_end: string;
  value: number;
  currency: string;
  value_date: string;
  usd_value?: number | null;
  budget_lines?: BudgetLine[];
  isSaving?: boolean;
  hasError?: boolean;
}


interface ActivityBudgetsTabProps {
  activityId: string;
  startDate: string;
  endDate: string;
  defaultCurrency?: string;
  onBudgetsChange?: (budgets: ActivityBudget[]) => void;
  hideSummaryCards?: boolean;
  readOnly?: boolean;
  renderFilters?: (filters: React.ReactNode) => React.ReactNode;
  onLoadingChange?: (loading: boolean) => void;
}

// Granularity types removed - users can now create any period length they want



// Helper function to safely parse dates
const safeParseDateOrNull = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr || dateStr === '') return null;
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : null;
  } catch (e) {
    console.error('[ActivityBudgetsTab] Invalid date string:', dateStr, e);
    return null;
  }
};

// Helper function to safely format dates for display
const safeFormatDate = (dateStr: string | null | undefined, formatStr: string, fallback: string = 'Invalid Date'): string => {
  const date = safeParseDateOrNull(dateStr);
  return date ? format(date, formatStr) : fallback;
};

// Chart Components
interface ChartData {
  period: string;
  value: number;
  total?: number;
}

interface BudgetChartProps {
  title: string;
  data: ChartData[];
  dataKey: string;
  color?: string;
}

// Helper for dynamic Y-axis domain and tick formatting
function getYAxisProps(data: any[], keys: string[], currency: string) {
  const allValues = data.flatMap(d => keys.map(k => d[k] || 0));
  const max = Math.max(...allValues, 0);
  let domain = [0, Math.ceil(max * 1.1)];
  let tickFormatter = (v: number) => {
    if (max < 10000) return `${currency === 'USD' ? '$' : ''}${v.toLocaleString()}`;
    return `${currency === 'USD' ? '$' : ''}${(v / 1000).toFixed(0)}k`;
  };
  return { domain, tickFormatter };
}

// Update BudgetLineChart props for type safety and access to budgets/defaultCurrency
interface BudgetLineChartProps {
  title: string;
  data: ChartData[];
  dataKey: string;
  color?: string;
  currencyMode: 'original' | 'usd';
  usdValues: Record<string, { usd: number|null, rate: number|null, date: string, loading: boolean, error?: string }>;
  budgets: ActivityBudget[];
  defaultCurrency: string;
}

function BudgetLineChart({ title, data, dataKey, color = "#64748b", currencyMode, usdValues, budgets, defaultCurrency }: BudgetLineChartProps) {
  return (
    <div className="bg-white border rounded-xl p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#64748b" />
            <YAxis 
              {...getYAxisProps(data, [dataKey], 'USD')} 
              stroke="#64748b" 
              fontSize={12}
              label={{
                value: 'USD',
                angle: -90,
                position: 'insideLeft',
                offset: -10,
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 13, fontWeight: 600 }
              }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-semibold text-gray-900 mb-1">{data.period}</p>
                      <p className="text-sm text-gray-600">Cumulative Budget</p>
                      <p className="text-lg font-bold text-gray-900">USD {Number(data.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={3}
              dot={{ fill: color, r: 4 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// generateBudgetPeriods function removed - users can now create custom periods freely

export default function ActivityBudgetsTab({
  activityId,
  startDate,
  endDate,
  defaultCurrency = 'USD',
  onBudgetsChange,
  hideSummaryCards = false,
  readOnly = false,
  renderFilters,
  onLoadingChange
}: ActivityBudgetsTabProps) {
  const [budgets, setBudgets] = useState<ActivityBudget[]>([]);
  
  // Log only on mount or when key props change (not on every render)
  useEffect(() => {
    console.log('[ActivityBudgetsTab] Component mounted with:', { activityId, startDate, endDate, defaultCurrency });
  }, [activityId, startDate, endDate, defaultCurrency]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usdValues, setUsdValues] = useState<Record<string, { usd: number|null, rate: number|null, date: string, loading: boolean, error?: string }>>({});
  // Add saveStatus state to track per-row save status
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error' | 'idle'>>({});
  // Add state for currency and aggregation toggles
  const [currencyMode, setCurrencyMode] = useState<'original' | 'usd'>('original');
  const [aggregationMode, setAggregationMode] = useState<'monthly' | 'quarterly' | 'semi-annual' | 'annual'>('quarterly');
  // Copy dialog state
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copySourceBudget, setCopySourceBudget] = useState<ActivityBudget | null>(null);
  const [copyPeriodStart, setCopyPeriodStart] = useState('');
  const [copyPeriodEnd, setCopyPeriodEnd] = useState('');

  // Modal state for budget creation/editing
  const [showModal, setShowModal] = useState(false);
  const [modalBudget, setModalBudget] = useState<ActivityBudget | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);
  // isCalculatingUSD removed - USD conversion now happens server-side
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [currencyPopoverOpen, setCurrencyPopoverOpen] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [isEditingValue, setIsEditingValue] = useState(false);
  
  // Exchange rate state for modal
  const [modalExchangeRateManual, setModalExchangeRateManual] = useState(false);
  const [modalExchangeRate, setModalExchangeRate] = useState<number | null>(null);
  const [isLoadingModalRate, setIsLoadingModalRate] = useState(false);
  const [modalRateError, setModalRateError] = useState<string | null>(null);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Bulk selection state
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter]);

  // Expand all rows on current page
  const expandAllRows = () => {
    const allIds = new Set(paginatedBudgets.map(b => b.id || 'new'));
    setExpandedRows(allIds);
  };

  // Collapse all rows
  const collapseAllRows = () => {
    setExpandedRows(new Set());
  };
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const currencies = useMemo(() => getAllCurrenciesWithPinned(), []);
  const { user, isLoading: userLoading } = useUser();

  // Sort handler
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  // Filtered and sorted budgets
  const sortedBudgets = useMemo(() => {
    // Apply filters first
    let filtered = [...budgets];
    
    if (statusFilter !== 'all') {
      const statusValue = statusFilter === 'indicative' ? 1 : 2;
      filtered = filtered.filter(b => b.status === statusValue);
    }
    
    if (typeFilter !== 'all') {
      const typeValue = typeFilter === 'original' ? 1 : 2;
      filtered = filtered.filter(b => b.type === typeValue);
    }

    // Then apply sorting
    if (!sortColumn) return filtered;

    const sorted = filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'period_start':
        case 'period_end':
          aValue = new Date(a[sortColumn as keyof ActivityBudget] as string).getTime();
          bValue = new Date(b[sortColumn as keyof ActivityBudget] as string).getTime();
          break;
        case 'type':
        case 'status':
        case 'value':
          aValue = a[sortColumn as keyof ActivityBudget];
          bValue = b[sortColumn as keyof ActivityBudget];
          break;
        case 'currency':
          aValue = (a.currency || '').toLowerCase();
          bValue = (b.currency || '').toLowerCase();
          break;
        case 'value_date':
          aValue = new Date(a.value_date).getTime();
          bValue = new Date(b.value_date).getTime();
          break;
        case 'usd_value':
          aValue = a.usd_value || 0;
          bValue = b.usd_value || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [budgets, sortColumn, sortDirection, statusFilter, typeFilter]);

  // Pagination logic
  const totalPages = useMemo(() => 
    Math.ceil(sortedBudgets.length / itemsPerPage)
  , [sortedBudgets.length, itemsPerPage]);
  
  // Ensure currentPage is within bounds - using callback form to avoid dependency issues
  useEffect(() => {
    if (totalPages > 0) {
      setCurrentPage(prev => prev > totalPages ? totalPages : prev);
    }
  }, [totalPages]);
  
  const paginatedBudgets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedBudgets.slice(startIndex, endIndex);
  }, [sortedBudgets, currentPage, itemsPerPage]);

  // Fetch existing budgets
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        onLoadingChange?.(true);
        setError(null);
        console.log('[ActivityBudgetsTab] Fetching budgets for activity:', activityId);

        // Use API endpoint instead of direct Supabase query to avoid RLS issues
        const response = await apiFetch(`/api/activities/${activityId}/budgets`, {
          cache: 'no-store'
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch budgets');
        }

        const budgetsData = await response.json();
        console.log('[ActivityBudgetsTab] Fetched budgets:', budgetsData?.length || 0);

        // Filter out budgets with invalid dates
        const validBudgets = (budgetsData || []).filter((budget: ActivityBudget) => {
          const hasValidDates =
            safeParseDateOrNull(budget.period_start) !== null &&
            safeParseDateOrNull(budget.period_end) !== null;

          if (!hasValidDates) {
            console.warn('[ActivityBudgetsTab] Filtering out budget with invalid dates:', budget);
          }

          return hasValidDates;
        });

        if (validBudgets.length < (budgetsData || []).length) {
          const invalidCount = (budgetsData || []).length - validBudgets.length;
          console.warn(`[ActivityBudgetsTab] Filtered out ${invalidCount} budget(s) with invalid dates`);
          toast.error(`${invalidCount} budget(s) have invalid dates and cannot be displayed. Please check your data.`);
        }

        // Just load existing budgets - no auto-generation
        setBudgets(validBudgets);
      } catch (err: any) {
        console.error('[ActivityBudgetsTab] Error fetching budget data:', err);
        setError(err.message || 'Failed to load budget data');
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };
    fetchData();
  }, [activityId, defaultCurrency, onLoadingChange]);

  // Notify parent component when budgets change (only after initial load)
  useEffect(() => {
    // Only notify parent after initial data load is complete
    // This prevents the green tick from disappearing when switching tabs
    if (onBudgetsChange && !loading) {
      // Filter out generated empty budgets - only count actual saved budgets with IDs
      const actualBudgets = budgets.filter(b => b.id);
      onBudgetsChange(actualBudgets);
    }
  }, [budgets, onBudgetsChange, loading]);

  // Read stored USD values from database (no conversion needed)
  useEffect(() => {
    const newUsdValues: Record<string, { usd: number|null, rate: number|null, date: string, loading: boolean, error?: string }> = {};
    for (const budget of paginatedBudgets) {
      const key = budget.id || `${budget.period_start}-${budget.period_end}`;
      newUsdValues[key] = {
        usd: budget.usd_value ?? null,
        rate: null,
        date: budget.value_date,
        loading: false,
        error: budget.usd_value === null && budget.currency !== 'USD' ? 'Not converted' : undefined
      };
    }
    setUsdValues(newUsdValues);
  }, [paginatedBudgets]);

  // Calculate budget totals for optional tooltip display
  const budgetSummary = useMemo(() => {
    const revisedTotal = budgets
      .filter(b => b.type === 2)
      .reduce((sum, b) => sum + Number(b.value), 0);

    const originalTotal = budgets
      .filter(b => b.type === 1)
      .reduce((sum, b) => sum + Number(b.value), 0);

    const usdTotal = Object.values(usdValues).reduce((sum, v) => sum + (v.usd || 0), 0);
    const mainCurrency = budgets[0]?.currency || defaultCurrency;
    const budgetType = budgets.some(b => b.type === 2) ? 'revised' : 'original';
    const mainTotal = revisedTotal > 0 ? revisedTotal : originalTotal;

    return {
      total: mainTotal,
      usdTotal,
      currency: mainCurrency,
      type: budgetType
    };
  }, [budgets, usdValues, defaultCurrency]);


  // Calculate chart data
  const chartData = useMemo(() => {
    // Filter out budgets with invalid dates first
    const validBudgets = budgets.filter(b => {
      const startDate = safeParseDateOrNull(b.period_start);
      return startDate !== null;
    });

    const sortedBudgets = [...validBudgets].sort((a, b) => {
      const aDate = safeParseDateOrNull(a.period_start);
      const bDate = safeParseDateOrNull(b.period_start);
      if (!aDate || !bDate) return 0;
      return aDate.getTime() - bDate.getTime();
    });

    // Group budgets by period for quarterly view
    const periodMap = new Map<string, number>();

    sortedBudgets.forEach(budget => {
      const startDate = safeParseDateOrNull(budget.period_start);
      if (!startDate) return;
      let periodLabel: string;
      
      switch (aggregationMode) {
        case 'monthly':
          periodLabel = format(startDate, 'MMM yyyy');
          break;
        case 'quarterly':
          periodLabel = `Q${getQuarter(startDate)} ${getYear(startDate)}`;
          break;
        case 'semi-annual':
          const half = getQuarter(startDate) <= 2 ? 'H1' : 'H2';
          periodLabel = `${half} ${getYear(startDate)}`;
          break;
        case 'annual':
          periodLabel = format(startDate, 'yyyy');
          break;
        default:
          periodLabel = `Q${getQuarter(startDate)} ${getYear(startDate)}`;
          break;
      }
      
      // Use revised value if available, otherwise original
      const value = budget.type === 2 || !periodMap.has(periodLabel) 
        ? Number(budget.value) 
        : Math.max(periodMap.get(periodLabel) || 0, Number(budget.value));
      
      periodMap.set(periodLabel, value);
    });

    // Convert to array for charts
    const aggregatedData: ChartData[] = Array.from(periodMap.entries()).map(([period, value]) => ({
      period,
      value
    }));

    // Calculate cumulative data
    let cumulativeTotal = 0;
    const cumulativeData: ChartData[] = aggregatedData.map(item => {
      cumulativeTotal += item.value;
      return {
        period: item.period,
        value: item.value,
        total: cumulativeTotal
      };
    });

    return { aggregatedData, cumulativeData };
  }, [budgets, aggregationMode]);

  // Validation helper - only blocks critical errors
  function validateBudget(budget: ActivityBudget, allBudgets: ActivityBudget[]) {
    if (!budget.activity_id || !budget.type || !budget.status || !budget.period_start || !budget.period_end || !budget.value_date || !budget.currency) {
      return 'Missing required fields';
    }
    // Overlapping budget periods are allowed
    return null;
  }




  // Delete budget
  const deleteBudget = useCallback(async (index: number) => {
    const budget = budgets[index];

    if (!budget.id) {
      // Just remove from local state if not saved yet
      setBudgets(prev => prev.filter((_, i) => i !== index));
      return;
    }

    if (!confirm('Are you sure you want to delete this budget?')) return;

    try {
      const { error } = await supabase
        .from('activity_budgets')
        .delete()
        .eq('id', budget.id);

      if (error) throw error;

      setBudgets(prev => prev.filter((_, i) => i !== index));
      
      // Refresh summary cards after deletion
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('refreshFinancialSummaryCards');
        window.dispatchEvent(event);
      }
    } catch (err) {
      console.error('Error deleting budget:', err);
      setError('Failed to delete budget');
    }
  }, [budgets]);

  const handleSelectBudget = useCallback((id: string, checked: boolean) => {
    const newSelected = new Set(selectedBudgetIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedBudgetIds(newSelected);
  }, [selectedBudgetIds]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = new Set(sortedBudgets.filter(b => b.id).map(b => b.id!));
      setSelectedBudgetIds(allIds);
    } else {
      setSelectedBudgetIds(new Set());
    }
  }, [sortedBudgets]);

  const confirmBulkDelete = useCallback(async () => {
    const selectedArray = Array.from(selectedBudgetIds);
    if (selectedArray.length === 0) return;

    setIsBulkDeleting(true);
    
    try {
      // Delete all selected budgets
      await Promise.all(selectedArray.map(async (id) => {
        const { error } = await supabase
          .from('activity_budgets')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      }));
      
      // Remove deleted budgets from state
      setBudgets(prev => prev.filter(b => !selectedBudgetIds.has(b.id!)));
      
      // Clear selection
      setSelectedBudgetIds(new Set());
      
      // Refresh summary cards
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('refreshFinancialSummaryCards');
        window.dispatchEvent(event);
      }
      
      toast.success(`Successfully deleted ${selectedArray.length} budget(s)`);
    } catch (err) {
      console.error('Error deleting budgets:', err);
      toast.error('Failed to delete some budgets');
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedBudgetIds]);

  // Helper function to find next non-overlapping period
  const findNextAvailablePeriod = useCallback((sourceStart: string, sourceEnd: string, existingBudgets: ActivityBudget[]) => {
    const originalStart = safeParseDateOrNull(sourceStart);
    const originalEnd = safeParseDateOrNull(sourceEnd);

    if (!originalStart || !originalEnd) {
      return null; // Invalid source dates
    }

    const periodDuration = differenceInMonths(originalEnd, originalStart);

    // Start with original period duration (or minimum 3 months)
    let incrementMonths = Math.max(periodDuration + 1, 3);
    let attempts = 0;
    const maxAttempts = 50; // Prevent infinite loop

    while (attempts < maxAttempts) {
      const candidateStart = addMonths(originalStart, incrementMonths);
      const candidateEnd = addMonths(candidateStart, periodDuration);

      // Check if this period overlaps with any existing budget
      const hasOverlap = existingBudgets.some(budget => {
        const existingStart = safeParseDateOrNull(budget.period_start);
        const existingEnd = safeParseDateOrNull(budget.period_end);

        if (!existingStart || !existingEnd) return false; // Skip invalid budgets

        return (
          (candidateStart >= existingStart && candidateStart <= existingEnd) ||
          (candidateEnd >= existingStart && candidateEnd <= existingEnd) ||
          (candidateStart <= existingStart && candidateEnd >= existingEnd)
        );
      });
      
      if (!hasOverlap) {
        return {
          period_start: format(candidateStart, 'yyyy-MM-dd'),
          period_end: format(candidateEnd, 'yyyy-MM-dd')
        };
      }
      
      // Try next period
      incrementMonths += Math.max(periodDuration + 1, 3);
      attempts++;
    }
    
    // If we can't find a slot, return null
    return null;
  }, []);

  // Duplicate budget with smart period calculation
  const duplicateBudget = useCallback((index: number) => {
    const today = formatDateFns(new Date(), 'yyyy-MM-dd');
    const budget = budgets[index];
    
    // Try to find next available period that doesn't overlap (preferred)
    const nextPeriod = findNextAvailablePeriod(
      budget.period_start, 
      budget.period_end, 
      budgets.filter((_, i) => i !== index) // Exclude current budget from comparison
    );
    
    // If no non-overlapping period found, just duplicate with same dates (overlap is allowed)
    const finalPeriod = nextPeriod || {
      period_start: budget.period_start,
      period_end: budget.period_end
    };

    // Ensure all required fields are present with valid defaults
    const newBudget: ActivityBudget = {
      activity_id: activityId,
      type: budget.type || 1, // Default to Original if missing
      status: budget.status || 1, // Default to Indicative if missing
      period_start: finalPeriod.period_start,
      period_end: finalPeriod.period_end,
      value: budget.value !== undefined ? budget.value : 0,
      currency: budget.currency || defaultCurrency || 'USD',
      value_date: today,
      budget_lines: budget.budget_lines || []
    };

    // Validate required fields before sending
    if (!newBudget.type || !newBudget.status || !newBudget.period_start || 
        !newBudget.period_end || newBudget.value === undefined || 
        !newBudget.currency || !newBudget.value_date) {
      toast.error('Cannot duplicate budget: missing required fields');
      console.error('Missing required fields in budget:', newBudget);
      return;
    }

    // Save the new budget via API
    (async () => {
      try {
        const response = await apiFetch(`/api/activities/${activityId}/budgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBudget)
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Budget creation error:', error);
          throw new Error(error.error || error.details || 'Failed to duplicate budget');
        }

        const createdBudget = await response.json();
        setBudgets(prev => [...prev, createdBudget].sort((a, b) => 
          new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
        ));
        toast.success('Budget duplicated successfully');
    
        // Show success feedback
        if (!nextPeriod) {
          console.log(`Budget duplicated with same period (overlapping) ${finalPeriod.period_start} to ${finalPeriod.period_end}`);
        } else {
          console.log(`Budget duplicated with period ${finalPeriod.period_start} to ${finalPeriod.period_end}`);
        }
      } catch (error) {
        console.error('Error duplicating budget:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to duplicate budget');
      }
    })();
  }, [budgets, findNextAvailablePeriod, activityId, defaultCurrency]);

  // Enhanced copy functionality with dialog
  const openCopyDialog = useCallback((index: number) => {
    const budget = budgets[index];
    const nextPeriod = findNextAvailablePeriod(
      budget.period_start, 
      budget.period_end, 
      budgets.filter((_, i) => i !== index)
    );
    
    setCopySourceBudget(budget);
    if (nextPeriod) {
      setCopyPeriodStart(nextPeriod.period_start);
      setCopyPeriodEnd(nextPeriod.period_end);
    } else {
      // If no period found, default to 1 year later
      const sourceStart = safeParseDateOrNull(budget.period_start);
      const sourceEnd = safeParseDateOrNull(budget.period_end);
      if (sourceStart && sourceEnd) {
        const newStart = addYears(sourceStart, 1);
        const newEnd = addYears(sourceEnd, 1);
        setCopyPeriodStart(format(newStart, 'yyyy-MM-dd'));
        setCopyPeriodEnd(format(newEnd, 'yyyy-MM-dd'));
      }
    }
    setShowCopyDialog(true);
  }, [budgets, findNextAvailablePeriod]);


  // Execute the copy with the adjusted period
  const executeCopy = useCallback(() => {
    if (!copySourceBudget) return;

    const today = formatDateFns(new Date(), 'yyyy-MM-dd');
    // Explicitly set fields to avoid copying unwanted metadata
    const newBudget: ActivityBudget = {
      activity_id: activityId,
      type: copySourceBudget.type || 1,
      status: copySourceBudget.status || 1,
      period_start: copyPeriodStart,
      period_end: copyPeriodEnd,
      value: copySourceBudget.value !== undefined ? copySourceBudget.value : 0,
      currency: copySourceBudget.currency || defaultCurrency || 'USD',
      value_date: today,
      budget_lines: copySourceBudget.budget_lines || []
    };

    // Save the new budget via API
    (async () => {
      try {
        const response = await apiFetch(`/api/activities/${activityId}/budgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBudget)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to copy budget');
        }

        const createdBudget = await response.json();
        setBudgets(prev => [...prev, createdBudget].sort((a, b) => 
          new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
        ));
        toast.success('Budget copied successfully');
    
    // Show success feedback
    console.log(`Budget duplicated with period ${copyPeriodStart} to ${copyPeriodEnd}`);

    // Close dialog
    setShowCopyDialog(false);
    setCopySourceBudget(null);
    setCopyPeriodStart('');
    setCopyPeriodEnd('');
      } catch (error) {
        console.error('Error copying budget:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to copy budget');
      }
    })();
  }, [copySourceBudget, copyPeriodStart, copyPeriodEnd, activityId, defaultCurrency]);


  // Export budgets to CSV
  const handleExport = useCallback(() => {
    const dataToExport = budgets.map(b => ({
      period_start: b.period_start,
      period_end: b.period_end,
      type: b.type === 1 ? 'Original' : 'Revised',
      status: b.status === 1 ? 'Indicative' : 'Committed',
      value: b.value,
      currency: b.currency,
      value_date: b.value_date,
      usd_value: b.usd_value || 0
    }));

    const csv = [
      Object.keys(dataToExport[0] || {}).join(","),
      ...dataToExport.map(row => Object.values(row).map(v => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budgets-${activityId}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [budgets, activityId]);

  // Export single budget details to CSV
  const handleExportBudget = (budget: ActivityBudget) => {
    const budgetKey = budget.id || `${budget.period_start}-${budget.period_end}`;
    const usdValue = usdValues[budgetKey];
    
    const exportData = [];

    // Budget Details
    const periodStart = safeParseDateOrNull(budget.period_start);
    const periodEnd = safeParseDateOrNull(budget.period_end);
    const valueDate = safeParseDateOrNull(budget.value_date);

    exportData.push(
      { label: 'Type', value: `${budget.type} - ${budget.type === 1 ? 'Original' : 'Revised'}` },
      { label: 'Status', value: `${budget.status} - ${budget.status === 1 ? 'Indicative' : 'Committed'}` },
      { label: 'Period Start', value: periodStart ? format(periodStart, 'MMM d, yyyy') : 'Invalid Date' },
      { label: 'Period End', value: periodEnd ? format(periodEnd, 'MMM d, yyyy') : 'Invalid Date' },
      { label: 'Value Date', value: valueDate ? format(valueDate, 'MMM d, yyyy') : '—' },
      { label: 'Original Value', value: `${budget.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${budget.currency}` },
      { label: 'USD Value', value: usdValue?.usd != null ? `USD ${usdValue.usd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—' },
    );

    // Budget Lines
    if (budget.budget_lines && budget.budget_lines.length > 0) {
      budget.budget_lines.forEach((line, idx) => {
        exportData.push({ label: `Budget Line ${idx + 1} - Ref`, value: line.ref });
        exportData.push({ label: `Budget Line ${idx + 1} - Value`, value: `${line.value?.toLocaleString()} ${line.currency}` });
        if (line.narrative) {
          exportData.push({ label: `Budget Line ${idx + 1} - Narrative`, value: line.narrative });
        }
      });
    }

    // System Identifiers
    if (budget.id) {
      exportData.push({ label: 'Budget ID', value: budget.id });
    }
    exportData.push({ label: 'Activity ID', value: budget.activity_id });

    const filename = `budget-export-${format(new Date(), 'yyyy-MM-dd')}`;
    exportToCSV(exportData, filename);
  };

  // Duplicate Forward - creates next period based on current period length
  const duplicateForward = useCallback((index: number) => {
    console.log('[DuplicateForward] Starting duplicate forward for index:', index);

    const budget = budgets[index];
    console.log('[DuplicateForward] Source budget:', budget);

    const currentStart = safeParseDateOrNull(budget.period_start);
    const currentEnd = safeParseDateOrNull(budget.period_end);
    console.log('[DuplicateForward] Current period:', {
      start: budget.period_start,
      end: budget.period_end,
      parsedStart: currentStart,
      parsedEnd: currentEnd,
      isValidStart: currentStart ? isValid(currentStart) : false,
      isValidEnd: currentEnd ? isValid(currentEnd) : false
    });

    if (!currentStart || !currentEnd || !isValid(currentStart) || !isValid(currentEnd)) {
      console.log('[DuplicateForward] ERROR: Invalid dates in source budget');
      alert('Cannot duplicate - source budget has invalid dates');
      return;
    }

    // Calculate period length in months from the current budget
    const periodLengthMonths = differenceInMonths(currentEnd, currentStart);
    console.log('[DuplicateForward] Detected period length:', periodLengthMonths, 'months');

    // Calculate next period start (day after current period end)
    const dayAfterEnd = new Date(currentEnd);
    dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
    const nextPeriodStart = safeParseDateOrNull(format(dayAfterEnd, 'yyyy-MM-dd'));

    if (!nextPeriodStart) {
      console.log('[DuplicateForward] ERROR: Failed to calculate next period start');
      alert('Cannot duplicate - failed to calculate next period');
      return;
    }

    // Calculate period end based on detected length (use endOfMonth for proper month boundaries)
    const nextPeriodEnd = endOfMonth(addMonths(nextPeriodStart, Math.max(periodLengthMonths, 1) - 1));

    console.log('[DuplicateForward] Calculated next period:', {
      nextStart: format(nextPeriodStart, 'yyyy-MM-dd'),
      nextEnd: format(nextPeriodEnd, 'yyyy-MM-dd'),
      periodLength: periodLengthMonths
    });

    // Ensure period doesn't exceed project end date
    const projectEnd = safeParseDateOrNull(endDate);
    if (!projectEnd) {
      console.log('[DuplicateForward] ERROR: Invalid project end date');
      alert('Cannot duplicate - invalid project end date');
      return;
    }
    let adjustedEnd = nextPeriodEnd;
    
    if (isAfter(adjustedEnd, projectEnd)) {
      console.log('[DuplicateForward] Period end exceeds project end, adjusting...');
      adjustedEnd = projectEnd;
    }
    
    // Check if period is still valid
    if (!isBefore(nextPeriodStart, projectEnd)) {
      console.log('[DuplicateForward] ERROR: Next period start is after project end, cannot create');
      showValidationError('Cannot create budget period beyond project end date');
      return;
    }
    
    const nextPeriodStartStr = format(nextPeriodStart, 'yyyy-MM-dd');
    const nextPeriodEndStr = format(adjustedEnd, 'yyyy-MM-dd');
    
    console.log('[DuplicateForward] Formatted next period:', {
      start: nextPeriodStartStr,
      end: nextPeriodEndStr
    });
    
    // Check for overlaps with existing budgets (just for logging, not blocking)
    const hasOverlap = budgets.some((b, i) => {
      if (i === index) return false; // Skip current budget
      const existingStart = safeParseDateOrNull(b.period_start);
      const existingEnd = safeParseDateOrNull(b.period_end);

      if (!existingStart || !existingEnd) return false; // Skip invalid budgets

      const overlaps = (
        (nextPeriodStart >= existingStart && nextPeriodStart <= existingEnd) ||
        (adjustedEnd >= existingStart && adjustedEnd <= existingEnd) ||
        (nextPeriodStart <= existingStart && adjustedEnd >= existingEnd)
      );
      
      if (overlaps) {
        console.log('[DuplicateForward] Overlap detected with budget (allowed):', {
          index: i,
          existingPeriod: `${b.period_start} to ${b.period_end}`,
          newPeriod: `${nextPeriodStartStr} to ${nextPeriodEndStr}`
        });
      }
      
      return overlaps;
    });
    
    if (hasOverlap) {
      console.log('[DuplicateForward] Note: Period overlaps with existing budget - this is allowed and a warning will be shown');
    }
    
    // Create new budget with next period - explicitly set fields to avoid copying unwanted metadata
    const newBudget: ActivityBudget = {
      activity_id: activityId,
      type: budget.type || 1,
      status: budget.status || 1,
      period_start: nextPeriodStartStr,
      period_end: nextPeriodEndStr,
      value: budget.value !== undefined ? budget.value : 0,
      currency: budget.currency || defaultCurrency || 'USD',
      value_date: nextPeriodStartStr,
      budget_lines: budget.budget_lines || []
    };
    
    console.log('[DuplicateForward] Creating new budget:', newBudget);
    
    // Insert after current row
    // Save the new budget via API
    (async () => {
      try {
        const response = await apiFetch(`/api/activities/${activityId}/budgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBudget)
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[DuplicateForward] API Error Response:', error);
          const errorMsg = error.details ? `${error.error}: ${error.details}` : (error.error || 'Failed to duplicate budget');
          throw new Error(errorMsg);
        }

        const createdBudget = await response.json();
        setBudgets(prev => [...prev, createdBudget].sort((a, b) => 
          new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
        ));
        toast.success('Budget duplicated successfully');
    console.log('[DuplicateForward] SUCCESS: Budget duplicated forward');
      } catch (error) {
        console.error('[DuplicateForward] Full Error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to duplicate budget');
      }
    })();
  }, [budgets, endDate, activityId, defaultCurrency]);

  // Open modal for creating a new budget
  const openModalForNewBudget = useCallback((periodType: 'month' | 'quarter' | 'half-year' | 'year') => {
    const today = formatDateFns(new Date(), 'yyyy-MM-dd');
    const lastBudget = budgets[budgets.length - 1];

    let periodStartDate: string;
    let periodEndDate: string;

    if (lastBudget) {
      // Start from day AFTER last budget ends
      const lastEnd = safeParseDateOrNull(lastBudget.period_end);
      if (!lastEnd) {
        toast.error('Last budget has invalid end date');
        return;
      }
      const dayAfterLastEnd = new Date(lastEnd);
      dayAfterLastEnd.setDate(dayAfterLastEnd.getDate() + 1);

      periodStartDate = format(dayAfterLastEnd, 'yyyy-MM-dd');
      const start = safeParseDateOrNull(periodStartDate);
      if (!start) {
        toast.error('Failed to calculate period start date');
        return;
      }

      // Calculate end date based on period type
      switch (periodType) {
        case 'month':
          periodEndDate = format(endOfMonth(start), 'yyyy-MM-dd');
          break;
        case 'quarter':
          periodEndDate = format(endOfMonth(addMonths(start, 2)), 'yyyy-MM-dd');
          break;
        case 'half-year':
          periodEndDate = format(endOfMonth(addMonths(start, 5)), 'yyyy-MM-dd');
          break;
        case 'year':
          periodEndDate = format(endOfMonth(addMonths(start, 11)), 'yyyy-MM-dd');
          break;
      }
    } else {
      // First budget - use activity start date or today
      periodStartDate = startDate || today;
      const start = safeParseDateOrNull(periodStartDate);
      if (!start) {
        toast.error('Invalid activity start date');
        return;
      }
      
      switch (periodType) {
        case 'month':
          periodEndDate = format(endOfMonth(start), 'yyyy-MM-dd');
          break;
        case 'quarter':
          periodEndDate = format(endOfQuarter(start), 'yyyy-MM-dd');
          break;
        case 'half-year':
          periodEndDate = format(endOfMonth(addMonths(start, 5)), 'yyyy-MM-dd');
          break;
        case 'year':
          periodEndDate = format(endOfMonth(addMonths(start, 11)), 'yyyy-MM-dd');
          break;
      }
    }
    
    // Ensure end date doesn't exceed project end date
    const projectEnd = safeParseDateOrNull(endDate);
    const periodEnd = safeParseDateOrNull(periodEndDate);
    if (!projectEnd) {
      toast.error('Invalid project end date');
      return;
    }
    if (periodEnd && isAfter(periodEnd, projectEnd)) {
      periodEndDate = endDate;
    }
    
    const newBudget: ActivityBudget = {
        activity_id: activityId,
      type: 1,
      status: 1,
      period_start: periodStartDate,
      period_end: periodEndDate,
        value: 0,
        currency: defaultCurrency,
      value_date: today,
      budget_lines: []
    };

    setModalBudget(newBudget);
    setFieldErrors({});
    setIsFormDirty(false);
    setShowModal(true);
  }, [budgets, activityId, defaultCurrency, startDate, endDate]);

  // Open modal for editing existing budget
  const openModalForEditBudget = useCallback((budget: ActivityBudget) => {
    setModalBudget({ ...budget });
    setFieldErrors({});
    setIsFormDirty(false);
    // Auto-expand advanced fields if budget has budget lines
    setShowAdvancedFields((budget.budget_lines?.length || 0) > 0);
    setShowModal(true);
  }, []);

  // Close modal with unsaved changes confirmation
  const closeModal = useCallback(() => {
    if (isFormDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        setShowModal(false);
        setModalBudget(null);
        setFieldErrors({});
        setIsFormDirty(false);
        setShowAdvancedFields(false);
      }
    } else {
      setShowModal(false);
      setModalBudget(null);
      setFieldErrors({});
      setIsFormDirty(false);
      setShowAdvancedFields(false);
    }
  }, [isFormDirty]);

  // Budget line management
  const addBudgetLine = useCallback(() => {
    if (!modalBudget) return;
    
    const newLine: BudgetLine = {
      ref: String((modalBudget.budget_lines?.length || 0) + 1),
      value: 0,
      currency: modalBudget.currency,
      value_date: modalBudget.value_date,
      narrative: ''
    };
    
    setModalBudget(prev => prev ? {
      ...prev,
      budget_lines: [...(prev.budget_lines || []), newLine]
    } : null);
    setIsFormDirty(true);
  }, [modalBudget]);

  const updateBudgetLine = useCallback((index: number, field: keyof BudgetLine, value: any) => {
    setModalBudget(prev => {
      if (!prev) return null;
      const lines = [...(prev.budget_lines || [])];
      lines[index] = { ...lines[index], [field]: value };
      return { ...prev, budget_lines: lines };
    });
    setIsFormDirty(true);
  }, []);

  const removeBudgetLine = useCallback((index: number) => {
    setModalBudget(prev => {
      if (!prev) return null;
      const lines = [...(prev.budget_lines || [])];
      lines.splice(index, 1);
      return { ...prev, budget_lines: lines };
    });
    setIsFormDirty(true);
  }, []);

  // Update form field with validation
  const updateFormField = useCallback((field: keyof ActivityBudget, value: any) => {
    setModalBudget(prev => prev ? { ...prev, [field]: value } : null);
    setIsFormDirty(true);
    
    // Clear field error when user starts typing
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Fetch exchange rate for modal
  const fetchModalExchangeRate = useCallback(async () => {
    if (!modalBudget) return;
    
    const currency = modalBudget.currency;
    if (!currency || currency === 'USD') {
      setModalExchangeRate(1);
      setModalRateError(null);
      return;
    }

    const valueDate = modalBudget.value_date || modalBudget.period_start;
    if (!valueDate) {
      setModalRateError('Please set a value date or period start first');
      return;
    }

    setIsLoadingModalRate(true);
    setModalRateError(null);

    try {
      const result = await fixedCurrencyConverter.convertToUSD(
        1,
        currency,
        new Date(valueDate)
      );

      if (result.success && result.exchange_rate) {
        setModalExchangeRate(result.exchange_rate);
        setModalRateError(null);
        console.log(`[ActivityBudgetsTab] Fetched exchange rate: 1 ${currency} = ${result.exchange_rate} USD`);
      } else {
        setModalRateError(result.error || 'Failed to fetch exchange rate');
        setModalExchangeRate(null);
      }
    } catch (err) {
      console.error('[ActivityBudgetsTab] Error fetching exchange rate:', err);
      setModalRateError('Failed to fetch exchange rate');
      setModalExchangeRate(null);
    } finally {
      setIsLoadingModalRate(false);
    }
  }, [modalBudget]);

  // Calculate modal USD value
  const modalCalculatedUsdValue = modalBudget?.value && modalExchangeRate 
    ? Math.round(modalBudget.value * modalExchangeRate * 100) / 100 
    : null;

  // Auto-fetch exchange rate when currency or date changes in modal (only if not manual)
  useEffect(() => {
    if (!modalExchangeRateManual && modalBudget?.currency && modalBudget.currency !== 'USD') {
      const valueDate = modalBudget.value_date || modalBudget.period_start;
      if (valueDate) {
        fetchModalExchangeRate();
      }
    } else if (modalBudget?.currency === 'USD') {
      setModalExchangeRate(1);
      setModalRateError(null);
    }
  }, [modalBudget?.currency, modalBudget?.value_date, modalBudget?.period_start, modalExchangeRateManual, fetchModalExchangeRate]);

  // Reset exchange rate state when modal opens
  useEffect(() => {
    if (showModal && modalBudget) {
      // Check if existing budget has manual rate
      const existingManual = (modalBudget as any).exchange_rate_manual ?? false;
      const existingRate = (modalBudget as any).exchange_rate_used ?? null;
      setModalExchangeRateManual(existingManual);
      setModalExchangeRate(existingRate);
      setModalRateError(null);
    }
  }, [showModal, modalBudget?.id]);

  // Validate and save budget
  const saveBudget = useCallback(async () => {
    if (!modalBudget) return;

    // Validation
    const errors: Record<string, string> = {};
    
    if (!modalBudget.type) errors.type = 'Type is required';
    if (!modalBudget.status) errors.status = 'Status is required';
    if (!modalBudget.period_start) errors.period_start = 'Start date is required';
    if (!modalBudget.period_end) errors.period_end = 'End date is required';
    if (!modalBudget.value || modalBudget.value <= 0) errors.value = 'Value must be greater than 0';
    if (!modalBudget.currency) errors.currency = 'Currency is required';
    if (!modalBudget.value_date) errors.value_date = 'Value date is required';

    // Date validation
    if (modalBudget.period_start && modalBudget.period_end) {
      if (new Date(modalBudget.period_start) >= new Date(modalBudget.period_end)) {
        errors.period_end = 'End date must be after start date';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      // Prepare budget data with exchange rate fields
      const budgetPayload = {
        ...modalBudget,
        exchange_rate_manual: modalExchangeRateManual,
        exchange_rate_used: modalExchangeRate,
        usd_value: modalCalculatedUsdValue
      };

      if (modalBudget.id) {
        // Update existing budget
        const response = await apiFetch(`/api/activities/${activityId}/budgets`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(budgetPayload)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update budget');
        }

        const updatedBudget = await response.json();
        setBudgets(prev => prev.map(b => b.id === updatedBudget.id ? updatedBudget : b));
        toast.success('Budget updated successfully');
      } else {
        // Create new budget
        const response = await apiFetch(`/api/activities/${activityId}/budgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(budgetPayload)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create budget');
        }

        const newBudget = await response.json();
        setBudgets(prev => [...prev, newBudget].sort((a, b) => 
          new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
        ));
        toast.success('Budget created successfully');
      }

      setShowModal(false);
      setModalBudget(null);
      setFieldErrors({});
      setIsFormDirty(false);
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save budget');
    }
  }, [modalBudget, activityId, modalExchangeRateManual, modalExchangeRate, modalCalculatedUsdValue]);

  // Granularity change handlers removed - users can now create any period length they want


  // Add helper for bulk insert
  const bulkInsertBudgets = async (budgets: ActivityBudget[]) => {
    if (!budgets.length) {
      console.log('No budgets to insert');
      return;
    }
    
    console.log('[BulkInsert] Starting bulk insert of', budgets.length, 'budgets:', budgets);
    
    try {
      // API will handle USD conversion, just prepare the budget data
      console.log('[BulkInsert] Preparing', budgets.length, 'budgets for insert:', budgets);
      
      const budgetData = budgets.map(b => ({
        activity_id: b.activity_id,
        type: b.type,
        status: b.status,
        period_start: b.period_start,
        period_end: b.period_end,
        value: b.value,
        currency: b.currency,
        value_date: b.value_date
        // usd_value will be calculated by the API
      }));
      
      console.log('[BulkInsert] Inserting', budgetData.length, 'budgets:', budgetData);
      
      const { data, error} = await supabase
        .from('activity_budgets')
        .insert(budgetData)
        .select();
        
      if (error) {
        console.error('[BulkInsert] Supabase insert error:', error);
        throw error;
      }
      
      console.log('[BulkInsert] Supabase insert successful. Returned data:', data);
      console.log('[BulkInsert] Successfully inserted', data?.length || 0, 'budgets');
      
      // Update local state with the inserted budgets (which now have IDs)
      if (data) {
        console.log('[BulkInsert] Updating local state with inserted budgets');
        setBudgets(data);
      } else {
        console.warn('[BulkInsert] No data returned from insert');
      }
      
      // Trigger refresh of financial summary cards
      console.log('[BulkInsert] Triggering financial summary refresh');
      window.dispatchEvent(new CustomEvent('refreshFinancialSummaryCards'));
      
    } catch (e) {
      console.error('[BulkInsert] Bulk insert failed:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to save new budgets: ${errorMessage}`);
      throw e; // Re-throw to handle in the calling function
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center text-gray-500">Loading budgets...</div>
        {/* Financial Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
              <Skeleton className="h-7 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Budget Configuration Skeleton */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-48" />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>

        {/* Budget Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-10 w-full" />
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {['Period', 'Type', 'Status', 'Amount', 'Value Date', 'USD Value', 'Actions'].map((header, i) => (
                      <TableHead key={i} className="font-medium">
                        <Skeleton className="h-4 w-16" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                {[...Array(4)].map((_, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {[...Array(7)].map((_, colIndex) => (
                        <TableCell key={colIndex}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </div>
          </CardContent>
        </Card>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white border rounded-xl p-6">
              <Skeleton className="h-5 w-40 mb-4" />
              <Skeleton className="h-64 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="text-center text-gray-500">Unable to load budgets. Please try refreshing the page or contact support if the problem persists.</div>
      </div>
    );
  }

  // Granularity removed - users can now create any period length

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
          {/* Budget Summary Cards */}
          {!hideSummaryCards && budgets.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
              {/* Total Budget Value Card */}
              <HeroCard
                title="Total Budgets"
                value={formatCurrencyAbbreviated(budgets.reduce((sum, budget) => sum + (budget.usd_value || 0), 0))}
                subtitle={`${budgets.length} budget${budgets.length !== 1 ? 's' : ''}`}
                icon={<DollarSign className="h-5 w-5" />}
              />
            </div>
          )}
          
          {/* Budgets Table */}
          <Card data-budgets-tab className={hideSummaryCards ? "border-0 shadow-none" : ""}>
        <CardHeader className={hideSummaryCards ? "hidden" : ""}>
          <div className="flex items-center justify-between">
            {!hideSummaryCards && (
              <div>
                <CardTitle>Budgets</CardTitle>
                <CardDescription>Activity budget allocations by period</CardDescription>
              </div>
            )}
            {hideSummaryCards && <div />}
            <div className={`flex items-center gap-2 ${hideSummaryCards ? 'hidden' : ''}`}>
              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Budget
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openModalForNewBudget('month')}>
                      Monthly Budget
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openModalForNewBudget('quarter')}>
                      Quarterly Budget
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openModalForNewBudget('half-year')}>
                      Semi-Annual Budget
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openModalForNewBudget('year')}>
                      Annual Budget
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {!hideSummaryCards && budgets.length > 0 && !loading && (
                <>
                  <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[160px] h-9">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="indicative">
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">1</span>
                            <span>Indicative</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="committed">
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">2</span>
                            <span>Committed</span>
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[160px] h-9">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="original">
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">1</span>
                            <span>Original</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="revised">
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">2</span>
                            <span>Revised</span>
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {expandedRows.size > 0 ? (
                    <Button
                      variant="outline"
                      onClick={collapseAllRows}
                      title="Collapse all expanded rows"
                      data-collapse-all
                    >
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Collapse All
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={expandAllRows}
                      title="Expand all rows"
                      data-expand-all
                    >
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Expand All
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleExport} data-export title="Export">
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          {/* Filters for when hideSummaryCards is true - shown between title and buttons */}
          {hideSummaryCards && budgets.length > 0 && !loading && !renderFilters && (
            <div className="px-6 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="indicative">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">1</span>
                          <span>Indicative</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="committed">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">2</span>
                          <span>Committed</span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="original">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">1</span>
                          <span>Original</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="revised">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">2</span>
                          <span>Revised</span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  {expandedRows.size > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={collapseAllRows}
                      title="Collapse all expanded rows"
                      data-collapse-all
                    >
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Collapse All
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={expandAllRows}
                      title="Expand all rows"
                      data-expand-all
                    >
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Expand All
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleExport} data-export title="Export">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Render filters externally if callback provided */}
          {renderFilters && hideSummaryCards && budgets.length > 0 && !loading && renderFilters(
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="indicative">
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">1</span>
                        <span>Indicative</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="committed">
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">2</span>
                        <span>Committed</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="original">
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">1</span>
                        <span>Original</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="revised">
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">2</span>
                        <span>Revised</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {expandedRows.size > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAllRows}
                  title="Collapse all expanded rows"
                  data-collapse-all
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse All
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAllRows}
                  title="Expand all rows"
                  data-expand-all
                >
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Expand All
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExport} data-export title="Export">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className={hideSummaryCards ? "p-0" : ""}>

          {/* Copy Budget Dialog */}
          <Dialog open={showCopyDialog} onOpenChange={(open) => {
            if (!open) {
              setShowCopyDialog(false);
              setCopySourceBudget(null);
              setCopyPeriodStart('');
              setCopyPeriodEnd('');
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Copy Budget</DialogTitle>
                <DialogDescription>
                  Adjust the period dates for the copied budget. The system has automatically suggested non-overlapping dates.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {copySourceBudget && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">Copying budget:</p>
                    <p className="text-sm text-gray-600">
                      {copySourceBudget.period_start} to {copySourceBudget.period_end} 
                      ({copySourceBudget.currency} {copySourceBudget.value?.toLocaleString()})
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="copy-period-start">
                      Period Start
                    </Label>
                    <Input
                      id="copy-period-start"
                      type="date"
                      value={copyPeriodStart}
                      onChange={(e) => setCopyPeriodStart(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="copy-period-end">
                      Period End
                    </Label>
                    <Input
                      id="copy-period-end"
                      type="date"
                      value={copyPeriodEnd}
                      onChange={(e) => setCopyPeriodEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCopyDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={executeCopy}
                  disabled={!copyPeriodStart || !copyPeriodEnd}
                >
                  Copy Budget
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


          {/* Budget table */}
          {paginatedBudgets.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No budgets</h3>
              <p className="text-muted-foreground mb-4">
                Use the button above to add your first budget period.
              </p>
            </div>
          ) : (
          <div className="rounded-md border w-full">
            <Table aria-label="Budgets table" className="w-full">
              <TableHeader className="bg-surface-muted border-b border-border/70">
                <TableRow>
                  <TableHead className="py-3 px-2 whitespace-nowrap" style={{ width: '50px' }}></TableHead>
                  {!readOnly && (
                    <TableHead className="text-center" style={{ width: '50px' }}>
                      <Checkbox
                        checked={selectedBudgetIds.size === sortedBudgets.length && sortedBudgets.length > 0}
                        onCheckedChange={handleSelectAll}
                        disabled={isBulkDeleting || sortedBudgets.length === 0}
                        aria-label="Select all"
                      />
                    </TableHead>
                  )}
                  <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4" style={{ width: '200px' }}>
                    <div
                      className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => handleSort('period_start')}
                    >
                      Period
                      {sortColumn === 'period_start' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </TableHead>
                  {[
                    { label: "Status", width: 120, sortKey: "status", align: "left" },
                    { label: "Type", width: 110, sortKey: "type", align: "left" },
                    { label: "Amount", width: 160, sortKey: "value", align: "right" },
                    { label: "Value Date", width: 140, sortKey: "value_date", align: "left" },
                    { label: "USD Value", width: 150, sortKey: "usd_value", align: "right" }
                  ].map((header, i) => (
                    <TableHead
                      key={i + 2}
                      className={`text-sm font-medium text-foreground/90 py-3 px-4 ${header.align === 'right' ? 'text-right' : ''}`}
                      style={{ width: `${header.width}px` }}
                    >
                      {header.sortKey ? (
                        <div
                          className={`flex items-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors ${header.align === 'right' ? 'justify-end' : ''}`}
                          onClick={() => handleSort(header.sortKey)}
                        >
                          {header.label}
                          {sortColumn === header.sortKey ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      ) : (
                        header.label
                      )}
                    </TableHead>
                  ))}
                  {!readOnly && (
                    <TableHead className="py-3 px-4 text-right" style={{ width: '60px' }}></TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {
                  paginatedBudgets.map((budget, index) => {
                    const budgetId = budget.id || `budget-${index}`;
                    const isExpanded = expandedRows.has(budgetId);
                    
                    return (
                    <React.Fragment key={budgetId}>
                    <TableRow 
                      className={cn(
                        "border-b border-border/40 hover:bg-muted/30 transition-colors",
                        budget.hasError ? 'bg-red-50' : '',
                        selectedBudgetIds.has(budget.id!) && "bg-blue-50 border-blue-200"
                      )}
                    > 
                      {/* Chevron for expand/collapse */}
                      <TableCell className="py-3 px-2 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRows(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(budgetId)) {
                                newSet.delete(budgetId);
                              } else {
                                newSet.add(budgetId);
                              }
                              return newSet;
                            });
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      {!readOnly && (
                        <TableCell className="text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedBudgetIds.has(budget.id!)}
                            onCheckedChange={(checked) => handleSelectBudget(budget.id!, !!checked)}
                            disabled={isBulkDeleting || !budget.id}
                            aria-label={`Select budget ${budget.id}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '200px' }}>
                        <span className="font-medium">
                          {safeFormatDate(budget.period_start, 'MMM yyyy')} - {safeFormatDate(budget.period_end, 'MMM yyyy')}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 whitespace-nowrap text-sm" style={{ width: '120px' }}>
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded mr-1.5">{budget.status}</code>
                        {budget.status === 1 ? 'Indicative' : 'Committed'}
                      </TableCell>
                      <TableCell className="py-3 px-4 whitespace-nowrap text-sm" style={{ width: '110px' }}>
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded mr-1.5">{budget.type}</code>
                        {budget.type === 1 ? 'Original' : 'Revised'}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '160px' }}>
                        <span className="font-medium">
                          <span className="text-muted-foreground">{budget.currency}</span> {budget.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '140px' }}>
                        <span>
                          {safeFormatDate(budget.value_date, 'MMM d, yyyy', '-')}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '150px' }}>
                        <div className="flex items-center justify-end gap-1">
                        {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.loading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.usd != null ? (
                          <TooltipProvider>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <span className="font-medium cursor-help">
                                  <span className="text-muted-foreground">USD</span> {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`].usd?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div>
                                  <div>Original: {budget.value} {budget.currency}</div>
                                  <div>Rate: {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`].rate}</div>
                                  <div>Date: {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`].date}</div>
                                </div>
                              </TooltipContent>
                            </UITooltip>
                          </TooltipProvider>
                        ) : (
                          <div className="flex items-center gap-1">
                            {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.error ? (
                              <span className="text-sm text-red-500">
                                {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`].error}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        )}
                        {saveStatus[budget.id || `${budget.period_start}-${budget.period_end}`] === 'saving' && (
                            <Loader2 className="h-3 w-3 animate-spin text-orange-500" aria-label="Saving..." />
                        )}
                        {saveStatus[budget.id || `${budget.period_start}-${budget.period_end}`] === 'saved' && (
                            <CheckCircle className="h-3 w-3 text-green-600" aria-label="Saved" />
                        )}
                        {saveStatus[budget.id || `${budget.period_start}-${budget.period_end}`] === 'error' && (
                            <span className="text-xs text-red-500">Failed</span>
                        )}
                        </div>
                      </TableCell>
                      {!readOnly && (
                        <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openModalForEditBudget(budget)}>
                                <Pencil className="h-4 w-4 mr-2 text-slate-500 ring-1 ring-slate-300 rounded-sm" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateForward(index)}>
                                <Copy className="h-4 w-4 mr-2" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteBudget(index)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2 text-red-500" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                    
                    {/* Expandable Detail Row */}
                    {isExpanded && (
                      <TableRow className="bg-muted/20 animate-in fade-in-from-top-2 duration-200">
                        <TableCell colSpan={readOnly ? 8 : 9} className="py-4 px-4 relative">
                          {/* CSV Export Button */}
                          <div className="absolute top-4 right-4 z-10">
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleExportBudget(budget)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Export to CSV</p>
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                          </div>
                          <div className="space-y-4 text-sm">
                            {/* Budget Details */}
                            <div>
                              <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Budget Details</h4>
                              <div className="ml-4">
                                <div className="flex flex-wrap gap-x-12 gap-y-3">
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[100px]">Type:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{budget.type}</span>
                                      <span className="text-xs">{budget.type === 1 ? 'Original' : 'Revised'}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[100px]">Status:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{budget.status}</span>
                                      <span className="text-xs">{budget.status === 1 ? 'Indicative' : 'Committed'}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2 ml-auto">
                                    <span className="text-muted-foreground">USD Value:</span>
                                    <div className="text-right flex items-center gap-1">
                                      {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.usd != null ? (
                                        <>
                                          <span className="font-medium"><span className="text-muted-foreground">USD</span> {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`].usd?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                          {(budget as any).exchange_rate_manual && (
                                            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4 bg-orange-50 text-orange-600 border-orange-200">Manual</Badge>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[100px]">Period Start:</span>
                                    <span className="font-medium">{safeFormatDate(budget.period_start, 'MMM d, yyyy')}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[100px]">Original Value:</span>
                                    <span className="font-medium">{budget.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {budget.currency}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[100px]">Period End:</span>
                                    <span className="font-medium">{safeFormatDate(budget.period_end, 'MMM d, yyyy')}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[100px]">Value Date:</span>
                                    <span className="font-medium">
                                      {safeFormatDate(budget.value_date, 'MMM d, yyyy', '—')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Budget Lines */}
                            {budget.budget_lines && budget.budget_lines.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Budget Lines</h4>
                                <div className="ml-4 space-y-2">
                                  {budget.budget_lines.map((line, idx) => (
                                    <div key={idx} className="grid grid-cols-2 gap-x-12 gap-y-1 text-xs bg-muted/30 p-2 rounded">
                                      <div>
                                        <span className="text-muted-foreground">Ref:</span>
                                        <span className="ml-2 font-mono">{line.ref}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Value:</span>
                                        <span className="ml-2 font-medium">{line.value?.toLocaleString()} {line.currency}</span>
                                      </div>
                                      {line.narrative && (
                                        <div className="col-span-2">
                                          <span className="text-muted-foreground">Narrative:</span>
                                          <span className="ml-2">{line.narrative}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* System Identifiers */}
                            <div>
                              <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">System Identifiers</h4>
                              <div className="grid grid-cols-2 gap-x-12 gap-y-3 ml-4">
                                {budget.id && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground min-w-[160px]">Budget ID:</span>
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{budget.id}</span>
                                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(budget.id!)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground min-w-[160px]">Activity ID:</span>
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{budget.activity_id}</span>
                                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(budget.activity_id)}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
                    );
                  })
                }
                {/* Total Row */}
                {sortedBudgets.length > 0 && (
                  <TableRow className="bg-slate-50 border-t-2 border-slate-300 font-semibold">
                    <TableCell colSpan={readOnly ? 6 : 7} className="py-3 px-4 text-right">
                      Total:
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="font-semibold">
                        <span className="text-muted-foreground">USD</span>{' '}
                        {Object.values(usdValues)
                          .reduce((sum, val) => sum + (val.usd || 0), 0)
                          .toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="py-3 px-4"></TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          )}

          {/* Pagination Controls */}
          {budgets.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedBudgets.length)} of {sortedBudgets.length} budgets
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
                  onClick={() => setCurrentPage(currentPage - 1)}
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
                  onClick={() => setCurrentPage(currentPage + 1)}
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
            </div>
          )}
        </CardContent>
      </Card>

      </div>

      {/* If not authenticated, show message and disable editing */}
      {!user && !userLoading && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-center">
          You must be logged in to edit or save budgets.
        </div>
      )}

      {/* Budget Modal */}
      <Dialog open={showModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalBudget?.id ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
            <DialogDescription>
              {modalBudget?.id ? 'Update budget information' : 'Create a new budget entry'}
            </DialogDescription>
          </DialogHeader>

          {modalBudget && (
            <div className="space-y-4 py-4">
              {/* Type and Status in same row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
                    <PopoverTrigger
                      className={cn(
                        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
                        fieldErrors.type && "border-red-500",
                        !modalBudget?.type && "text-muted-foreground"
                      )}
                    >
                      <span className="truncate">
                        {modalBudget?.type ? (() => {
                          const selectedType = BUDGET_TYPES.find(t => t.code === String(modalBudget.type));
                          return selectedType ? (
                            <span className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedType.code}</span>
                              <span className="font-medium">{selectedType.name}</span>
                            </span>
                          ) : (
                            "Select type"
                          );
                        })() : (
                          "Select type"
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {modalBudget?.type && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateFormField('type', 1);
                              setTypePopoverOpen(false);
                            }}
                            className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                            aria-label="Clear selection"
                          >
                            <span className="text-xs">×</span>
                          </button>
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <div className="max-h-[200px] overflow-y-auto">
                        {BUDGET_TYPES.map(type => (
                          <button
                            key={type.code}
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                              modalBudget?.type === Number(type.code) && "bg-accent text-accent-foreground"
                            )}
                            onClick={() => {
                              updateFormField('type', Number(type.code) as 1 | 2);
                              setTypePopoverOpen(false);
                            }}
                          >
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{type.code}</span>
                            <span className="font-medium">{type.name}</span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {fieldErrors.type && (
                    <p className="text-xs text-red-500">{fieldErrors.type}</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                    <PopoverTrigger
                      className={cn(
                        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
                        fieldErrors.status && "border-red-500",
                        !modalBudget?.status && "text-muted-foreground"
                      )}
                    >
                      <span className="truncate">
                        {modalBudget?.status ? (() => {
                          const selectedStatus = BUDGET_STATUSES.find(s => s.code === String(modalBudget.status));
                          return selectedStatus ? (
                            <span className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedStatus.code}</span>
                              <span className="font-medium">{selectedStatus.name}</span>
                            </span>
                          ) : (
                            "Select status"
                          );
                        })() : (
                          "Select status"
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {modalBudget?.status && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateFormField('status', 1);
                              setStatusPopoverOpen(false);
                            }}
                            className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                            aria-label="Clear selection"
                          >
                            <span className="text-xs">×</span>
                          </button>
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <div className="max-h-[200px] overflow-y-auto">
                        {BUDGET_STATUSES.map(status => (
                        <button
                          key={status.code}
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                            modalBudget?.status === Number(status.code) && "bg-accent text-accent-foreground"
                          )}
                          onClick={() => {
                            updateFormField('status', Number(status.code) as 1 | 2);
                            setStatusPopoverOpen(false);
                          }}
                        >
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{status.code}</span>
                          <span className="font-medium">{status.name}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {fieldErrors.status && (
                  <p className="text-xs text-red-500">{fieldErrors.status}</p>
                )}
              </div>
              </div>

              {/* Period Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period_start">Period Start Date</Label>
                  <Input
                    id="period_start"
                    type="date"
                    value={modalBudget.period_start}
                    onChange={(e) => updateFormField('period_start', e.target.value)}
                    className={fieldErrors.period_start ? 'border-red-500' : ''}
                  />
                  {fieldErrors.period_start && (
                    <p className="text-xs text-red-500">{fieldErrors.period_start}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period_end">Period End Date</Label>
                  <Input
                    id="period_end"
                    type="date"
                    value={modalBudget.period_end}
                    onChange={(e) => updateFormField('period_end', e.target.value)}
                    className={fieldErrors.period_end ? 'border-red-500' : ''}
                  />
                  {fieldErrors.period_end && (
                    <p className="text-xs text-red-500">{fieldErrors.period_end}</p>
                  )}
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Popover open={currencyPopoverOpen} onOpenChange={setCurrencyPopoverOpen}>
                  <PopoverTrigger
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
                      fieldErrors.currency && "border-red-500",
                      !modalBudget?.currency && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate">
                      {modalBudget?.currency ? (() => {
                        const selectedCurrency = currencies.find(c => c.code === modalBudget.currency);
                        return selectedCurrency ? (
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedCurrency.code}</span>
                            <span className="font-medium">{selectedCurrency.name}</span>
                          </span>
                        ) : (
                          "Select currency"
                        );
                      })() : (
                        "Select currency"
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {modalBudget?.currency && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateFormField('currency', 'USD');
                            setCurrencyPopoverOpen(false);
                          }}
                          className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                          aria-label="Clear selection"
                        >
                          <span className="text-xs">×</span>
                        </button>
                      )}
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <div className="max-h-[300px] overflow-y-auto">
                      {currencies.map(currency => (
                        <button
                          key={currency.code}
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                            modalBudget?.currency === currency.code && "bg-accent text-accent-foreground"
                          )}
                          onClick={() => {
                            updateFormField('currency', currency.code);
                            setCurrencyPopoverOpen(false);
                          }}
                        >
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{currency.code}</span>
                          <span className="font-medium">{currency.name}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {fieldErrors.currency && (
                  <p className="text-xs text-red-500">{fieldErrors.currency}</p>
                )}
              </div>

              {/* Value and Value Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    type="text"
                    value={isEditingValue ? (modalBudget.value || '').toString() : (modalBudget.value ? modalBudget.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')}
                    onChange={(e) => {
                      // Remove all non-numeric characters except decimal point
                      const rawValue = e.target.value.replace(/[^\d.]/g, '');
                      const numValue = parseFloat(rawValue);
                      if (!isNaN(numValue)) {
                        updateFormField('value', numValue);
                      } else if (rawValue === '' || rawValue === '.') {
                        updateFormField('value', 0);
                      }
                    }}
                    onFocus={(e) => {
                      setIsEditingValue(true);
                      e.target.select();
                    }}
                    onBlur={() => {
                      setIsEditingValue(false);
                    }}
                    placeholder="0.00"
                    className={fieldErrors.value ? 'border-red-500' : ''}
                  />
                  {fieldErrors.value && (
                    <p className="text-xs text-red-500">{fieldErrors.value}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value_date">Value Date</Label>
                  <Input
                    id="value_date"
                    type="date"
                    value={modalBudget.value_date}
                    onChange={(e) => updateFormField('value_date', e.target.value)}
                    className={fieldErrors.value_date ? 'border-red-500' : ''}
                  />
                  {fieldErrors.value_date && (
                    <p className="text-xs text-red-500">{fieldErrors.value_date}</p>
                  )}
                </div>
              </div>

              {/* USD Conversion Section */}
              {modalBudget.currency && modalBudget.currency !== 'USD' && (
                <div className="border border-green-200 bg-green-50/50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <Label className="text-sm font-medium">USD Conversion</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {modalExchangeRateManual ? 'Manual' : 'API Rate'}
                      </span>
                      <Switch 
                        checked={!modalExchangeRateManual}
                        onCheckedChange={(checked) => {
                          setModalExchangeRateManual(!checked);
                          if (checked) {
                            fetchModalExchangeRate();
                          }
                        }}
                      />
                      {modalExchangeRateManual ? (
                        <Unlock className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {modalExchangeRateManual 
                      ? 'Enter your own exchange rate below'
                      : 'Exchange rate is automatically fetched based on value date'
                    }
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        Exchange Rate
                        {!modalExchangeRateManual && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={fetchModalExchangeRate}
                            disabled={isLoadingModalRate}
                          >
                            <RefreshCw className={`h-3 w-3 ${isLoadingModalRate ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.000001"
                          value={modalExchangeRate || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setModalExchangeRate(isNaN(value) ? null : value);
                          }}
                          disabled={!modalExchangeRateManual || isLoadingModalRate}
                          className={!modalExchangeRateManual ? 'bg-gray-100' : ''}
                          placeholder={isLoadingModalRate ? 'Loading...' : 'Enter rate'}
                        />
                        {isLoadingModalRate && (
                          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      {modalExchangeRate && (
                        <p className="text-xs text-muted-foreground">
                          1 {modalBudget.currency} = {modalExchangeRate.toFixed(6)} USD
                        </p>
                      )}
                      {modalRateError && (
                        <p className="text-xs text-red-500">{modalRateError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">USD Value</Label>
                      <div className="h-10 px-3 py-2 border rounded-md bg-gray-100 flex items-center font-medium text-green-700">
                        {modalCalculatedUsdValue !== null ? (
                          <>$ {modalCalculatedUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Calculated from {modalBudget.currency} {modalBudget.value?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced IATI Fields - Budget Lines */}
              <div 
                onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                className="flex items-center justify-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-800 transition-colors py-2"
              >
                <span>Advanced IATI Fields</span>
                {showAdvancedFields ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>

              {showAdvancedFields && (
                <div className="space-y-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    These optional fields provide additional IATI-compliant budget breakdown for detailed financial reporting.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Budget Lines</Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Optional breakdown of budget into line items. Sum of lines does not need to equal total budget.
                        </p>
                      </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addBudgetLine}
                          type="button"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Line
                        </Button>
                      </div>

                      {modalBudget.budget_lines && modalBudget.budget_lines.length > 0 && (
                        <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
                          {modalBudget.budget_lines.map((line, index) => (
                            <div key={index} className="space-y-3 p-3 border rounded-lg bg-white">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Line {index + 1}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeBudgetLine(index)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  type="button"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label htmlFor={`line-ref-${index}`}>Reference</Label>
                                  <Input
                                    id={`line-ref-${index}`}
                                    value={line.ref}
                                    onChange={(e) => updateBudgetLine(index, 'ref', e.target.value)}
                                    placeholder="e.g., 1, SALARIES"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`line-value-${index}`}>Value</Label>
                                  <Input
                                    id={`line-value-${index}`}
                                    type="text"
                                    value={line.value === 0 ? '' : line.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    onChange={(e) => {
                                      const rawValue = e.target.value.replace(/[^\d.]/g, '');
                                      const numValue = parseFloat(rawValue);
                                      if (!isNaN(numValue)) {
                                        updateBudgetLine(index, 'value', numValue);
                                      } else if (rawValue === '' || rawValue === '.') {
                                        updateBudgetLine(index, 'value', 0);
                                      }
                                    }}
                                    onFocus={(e) => {
                                      if (line.value > 0) {
                                        e.target.value = line.value.toString();
                                      }
                                      e.target.select();
                                    }}
                                    onBlur={(e) => {
                                      if (line.value > 0) {
                                        e.target.value = line.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                      }
                                    }}
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label htmlFor={`line-currency-${index}`}>Currency</Label>
                                  <Select
                                    value={line.currency}
                                    onValueChange={(value) => updateBudgetLine(index, 'currency', value)}
                                  >
                                    <SelectTrigger id={`line-currency-${index}`}>
                                      <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {currencies.map(currency => (
                                        <SelectItem key={currency.code} value={currency.code}>
                                          {currency.code} - {currency.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`line-value-date-${index}`}>Value Date</Label>
                                  <Input
                                    id={`line-value-date-${index}`}
                                    type="date"
                                    value={line.value_date}
                                    onChange={(e) => updateBudgetLine(index, 'value_date', e.target.value)}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`line-narrative-${index}`}>Description</Label>
                                <Input
                                  id={`line-narrative-${index}`}
                                  value={line.narrative}
                                  onChange={(e) => updateBudgetLine(index, 'narrative', e.target.value)}
                                  placeholder="e.g., Salary costs, Equipment purchases"
                                />
                              </div>
                            </div>
                          ))}
                          
                          {modalBudget.budget_lines.length > 0 && (
                            <div className="text-xs text-gray-500 mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                              <strong>Note:</strong> Budget lines are optional. The sum of line items does not need to equal the total budget value.
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={saveBudget} disabled={Object.keys(fieldErrors).length > 0}>
              {modalBudget?.id ? 'Update Budget' : 'Create Budget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Toolbar - appears from bottom when items selected */}
      <BulkActionToolbar
        selectedCount={selectedBudgetIds.size}
        itemType="transactions"
        onDelete={confirmBulkDelete}
        onCancel={() => setSelectedBudgetIds(new Set())}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
} 