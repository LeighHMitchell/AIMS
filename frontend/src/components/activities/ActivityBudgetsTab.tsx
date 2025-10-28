'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addMonths, addQuarters, addYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, differenceInMonths, parseISO, isValid, isBefore, isAfter, getQuarter, getYear } from 'date-fns';
import { format as formatDateFns } from 'date-fns';
import { Trash2, Copy, Loader2, CheckCircle, Lock, Unlock, FastForward, AlertCircle, Info, MoreVertical, Plus, Calendar, Download, Edit } from 'lucide-react';
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
import { FinancialSummaryCards } from '@/components/FinancialSummaryCards';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { ChevronsUpDown, ChevronDown, ChevronUp, Trash2 as TrashIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

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
}

// Granularity types removed - users can now create any period length they want



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
  readOnly = false
}: ActivityBudgetsTabProps) {
  console.log('[ActivityBudgetsTab] Component mounted with:', { activityId, startDate, endDate, defaultCurrency });

  const [budgets, setBudgets] = useState<ActivityBudget[]>([]);
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
  const [copyOverlapWarning, setCopyOverlapWarning] = useState<string | null>(null);

  // Modal state for budget creation/editing
  const [showModal, setShowModal] = useState(false);
  const [modalBudget, setModalBudget] = useState<ActivityBudget | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isCalculatingUSD, setIsCalculatingUSD] = useState(false);
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [currencyPopoverOpen, setCurrencyPopoverOpen] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [isEditingValue, setIsEditingValue] = useState(false);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Bulk selection state
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  // Sorted budgets
  const sortedBudgets = useMemo(() => {
    if (!sortColumn) return budgets;

    const sorted = [...budgets].sort((a, b) => {
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
  }, [budgets, sortColumn, sortDirection]);

  // Fetch existing budgets
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[ActivityBudgetsTab] Fetching budgets for activity:', activityId);
        if (!supabase) {
          console.error('[ActivityBudgetsTab] Supabase client not initialized');
          setError('Supabase client not initialized');
          return;
        }
        // Fetch budgets
        const { data: budgetsData, error: budgetsError } = await supabase
          .from('activity_budgets')
          .select('*')
          .eq('activity_id', activityId)
          .order('period_start', { ascending: true });
        if (budgetsError) {
          console.error('[ActivityBudgetsTab] Budgets fetch error:', budgetsError);
          setError(budgetsError.message || 'Failed to load budget data');
        }
        // Just load existing budgets - no auto-generation
          setBudgets(budgetsData || []);
      } catch (err: any) {
        console.error('[ActivityBudgetsTab] Error fetching budget data:', err);
        setError(err.message || 'Failed to load budget data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activityId, defaultCurrency]);

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

  // Convert all budgets to USD when budgets change
  useEffect(() => {
    let cancelled = false;
    async function convertAll() {
      const newUsdValues: Record<string, { usd: number|null, rate: number|null, date: string, loading: boolean, error?: string }> = {};
      for (const budget of budgets) {
        if (!budget.value || !budget.currency || !budget.value_date) {
          newUsdValues[budget.id || `${budget.period_start}-${budget.period_end}`] = { usd: null, rate: null, date: budget.value_date, loading: false, error: 'Missing data' };
          continue;
        }
        newUsdValues[budget.id || `${budget.period_start}-${budget.period_end}`] = { usd: null, rate: null, date: budget.value_date, loading: true };
        try {
          const result = await fixedCurrencyConverter.convertToUSD(budget.value, budget.currency, new Date(budget.value_date));
          if (!cancelled) {
            newUsdValues[budget.id || `${budget.period_start}-${budget.period_end}`] = {
              usd: result.usd_amount,
              rate: result.exchange_rate,
              date: result.conversion_date || budget.value_date,
              loading: false,
              error: result.success ? undefined : result.error || 'Conversion failed'
            };
          }
        } catch (err) {
          if (!cancelled) {
            newUsdValues[budget.id || `${budget.period_start}-${budget.period_end}`] = { usd: null, rate: null, date: budget.value_date, loading: false, error: 'Conversion error' };
          }
        }
      }
      if (!cancelled) setUsdValues(newUsdValues);
    }
    if (budgets.length > 0) convertAll();
    return () => { cancelled = true; };
  }, [budgets]);

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

  // Memoized budgets data for FinancialSummaryCards to prevent unnecessary re-renders
  const memoizedBudgetsForSummary = useMemo(() => {
    return budgets.map(b => ({
      id: b.id,
      usd_value: b.usd_value === null ? undefined : b.usd_value,
      value: b.value
    }));
  }, [budgets, usdValues]);

  // Calculate chart data
  const chartData = useMemo(() => {
    const sortedBudgets = [...budgets].sort((a, b) => 
      parseISO(a.period_start).getTime() - parseISO(b.period_start).getTime()
    );

    // Group budgets by period for quarterly view
    const periodMap = new Map<string, number>();
    
    sortedBudgets.forEach(budget => {
      const startDate = parseISO(budget.period_start);
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

  // Validation helper - now only blocks critical errors, allows overlaps
  function validateBudget(budget: ActivityBudget, allBudgets: ActivityBudget[]) {
    if (!budget.activity_id || !budget.type || !budget.status || !budget.period_start || !budget.period_end || !budget.value_date || !budget.currency) {
      return 'Missing required fields';
    }
    // Overlaps are now allowed - we just show warnings instead
    return null;
  }

  // Check for overlaps and return warning info
  function checkBudgetOverlap(budget: ActivityBudget, allBudgets: ActivityBudget[]): ActivityBudget[] | null {
    const budgetStart = parseISO(budget.period_start);
    const budgetEnd = parseISO(budget.period_end);
    
    const overlappingBudgets = allBudgets.filter(b => {
      // Skip if it's the same budget (comparing by ID or by reference)
      if (b === budget || (budget.id && b.id === budget.id)) return false;
      
      const bStart = parseISO(b.period_start);
      const bEnd = parseISO(b.period_end);
      
      // Check if periods overlap
      return (
        (budgetStart >= bStart && budgetStart <= bEnd) ||
        (budgetEnd >= bStart && budgetEnd <= bEnd) ||
        (budgetStart <= bStart && budgetEnd >= bEnd)
      );
    });
    
    return overlappingBudgets.length > 0 ? overlappingBudgets : null;
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

  const handleBulkDelete = useCallback(async () => {
    const selectedArray = Array.from(selectedBudgetIds);
    if (selectedArray.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedArray.length} budget(s)?`)) return;
    
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
    const originalStart = parseISO(sourceStart);
    const originalEnd = parseISO(sourceEnd);
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
        const existingStart = parseISO(budget.period_start);
        const existingEnd = parseISO(budget.period_end);
        
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
        const response = await fetch(`/api/activities/${activityId}/budgets`, {
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
      setCopyOverlapWarning(null);
    } else {
      // If no period found, default to 1 year later
      const sourceStart = parseISO(budget.period_start);
      const sourceEnd = parseISO(budget.period_end);
      const newStart = addYears(sourceStart, 1);
      const newEnd = addYears(sourceEnd, 1);
      setCopyPeriodStart(format(newStart, 'yyyy-MM-dd'));
      setCopyPeriodEnd(format(newEnd, 'yyyy-MM-dd'));
      checkCopyOverlap(format(newStart, 'yyyy-MM-dd'), format(newEnd, 'yyyy-MM-dd'));
    }
    setShowCopyDialog(true);
  }, [budgets, findNextAvailablePeriod]);

  // Check for overlaps in copy dialog
  const checkCopyOverlap = useCallback((startDate: string, endDate: string) => {
    if (!startDate || !endDate) {
      setCopyOverlapWarning(null);
      return;
    }

    const newStart = parseISO(startDate);
    const newEnd = parseISO(endDate);

    const conflictingBudget = budgets.find(budget => {
      const existingStart = parseISO(budget.period_start);
      const existingEnd = parseISO(budget.period_end);
      
      return (
        (isBefore(newStart, existingEnd) && isAfter(newEnd, existingStart)) ||
        (isBefore(existingStart, newEnd) && isAfter(existingEnd, newStart))
      );
    });

    if (conflictingBudget) {
      setCopyOverlapWarning(
        `Period overlaps with existing budget: ${conflictingBudget.period_start} to ${conflictingBudget.period_end}`
      );
    } else {
      setCopyOverlapWarning(null);
    }
  }, [budgets]);

  // Execute the copy with the adjusted period
  const executeCopy = useCallback(() => {
    if (!copySourceBudget) return;
    // Note: copyOverlapWarning no longer blocks the copy, it's just informational

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
        const response = await fetch(`/api/activities/${activityId}/budgets`, {
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
    setCopyOverlapWarning(null);
      } catch (error) {
        console.error('Error copying budget:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to copy budget');
      }
    })();
  }, [copySourceBudget, copyPeriodStart, copyPeriodEnd, copyOverlapWarning, activityId, defaultCurrency]);

  // Update overlap check when dates change
  useEffect(() => {
    if (showCopyDialog && copyPeriodStart && copyPeriodEnd) {
      checkCopyOverlap(copyPeriodStart, copyPeriodEnd);
    }
  }, [copyPeriodStart, copyPeriodEnd, showCopyDialog, checkCopyOverlap]);

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

  // Duplicate Forward - creates next period based on current period length
  const duplicateForward = useCallback((index: number) => {
    console.log('[DuplicateForward] Starting duplicate forward for index:', index);
    
    const budget = budgets[index];
    console.log('[DuplicateForward] Source budget:', budget);
    
    const currentStart = parseISO(budget.period_start);
    const currentEnd = parseISO(budget.period_end);
    console.log('[DuplicateForward] Current period:', {
      start: budget.period_start,
      end: budget.period_end,
      parsedStart: currentStart,
      parsedEnd: currentEnd,
      isValidStart: isValid(currentStart),
      isValidEnd: isValid(currentEnd)
    });
    
    if (!isValid(currentStart) || !isValid(currentEnd)) {
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
    const nextPeriodStart = parseISO(format(dayAfterEnd, 'yyyy-MM-dd'));
    
    // Calculate period end based on detected length (use endOfMonth for proper month boundaries)
    const nextPeriodEnd = endOfMonth(addMonths(nextPeriodStart, Math.max(periodLengthMonths, 1) - 1));
    
    console.log('[DuplicateForward] Calculated next period:', {
      nextStart: format(nextPeriodStart, 'yyyy-MM-dd'),
      nextEnd: format(nextPeriodEnd, 'yyyy-MM-dd'),
      periodLength: periodLengthMonths
    });
    
    // Ensure period doesn't exceed project end date
    const projectEnd = parseISO(endDate);
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
      const existingStart = parseISO(b.period_start);
      const existingEnd = parseISO(b.period_end);
      
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
        const response = await fetch(`/api/activities/${activityId}/budgets`, {
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
      const lastEnd = parseISO(lastBudget.period_end);
      const dayAfterLastEnd = new Date(lastEnd);
      dayAfterLastEnd.setDate(dayAfterLastEnd.getDate() + 1);
      
      periodStartDate = format(dayAfterLastEnd, 'yyyy-MM-dd');
      const start = parseISO(periodStartDate);
      
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
      const start = parseISO(periodStartDate);
      
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
    const projectEnd = parseISO(endDate);
    if (isAfter(parseISO(periodEndDate), projectEnd)) {
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

  // Real-time USD conversion
  useEffect(() => {
    if (!modalBudget || !modalBudget.value || !modalBudget.currency || !modalBudget.value_date) {
      return;
    }

    const calculateUSD = async () => {
      setIsCalculatingUSD(true);
      try {
        if (modalBudget.currency === 'USD') {
          setModalBudget(prev => prev ? { ...prev, usd_value: modalBudget.value } : null);
        } else {
          const result = await fixedCurrencyConverter.convertToUSD(
            modalBudget.value,
            modalBudget.currency,
            new Date(modalBudget.value_date)
          );
          setModalBudget(prev => prev ? { ...prev, usd_value: result.usd_amount } : null);
        }
      } catch (error) {
        console.error('USD conversion error:', error);
      } finally {
        setIsCalculatingUSD(false);
      }
    };

    calculateUSD();
  }, [modalBudget?.value, modalBudget?.currency, modalBudget?.value_date]);

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
      if (modalBudget.id) {
        // Update existing budget
        const response = await fetch(`/api/activities/${activityId}/budgets`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modalBudget)
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
        const response = await fetch(`/api/activities/${activityId}/budgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modalBudget)
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
  }, [modalBudget, activityId]);

  // Granularity change handlers removed - users can now create any period length they want


  // Add helper for bulk insert
  const bulkInsertBudgets = async (budgets: ActivityBudget[]) => {
    if (!budgets.length) {
      console.log('No budgets to insert');
      return;
    }
    
    console.log('[BulkInsert] Starting bulk insert of', budgets.length, 'budgets:', budgets);
    
    try {
      // Calculate usd_value for each budget
      console.log('[BulkInsert] Converting currencies for all budgets...');
      const budgetsWithUsd = await Promise.all(budgets.map(async (b, index) => {
        console.log(`[BulkInsert] Converting budget ${index + 1}/${budgets.length}:`, b);
        try {
          const result = await fixedCurrencyConverter.convertToUSD(b.value, b.currency, new Date(b.value_date));
          const converted = { 
            activity_id: b.activity_id,
            type: b.type,
            status: b.status,
            period_start: b.period_start,
            period_end: b.period_end,
            value: b.value,
            currency: b.currency,
            value_date: b.value_date,
            usd_value: result.usd_amount !== undefined && result.usd_amount !== null ? result.usd_amount : null
          };
          console.log(`[BulkInsert] Budget ${index + 1} converted:`, converted);
          return converted;
        } catch (conversionError) {
          console.warn(`[BulkInsert] Currency conversion failed for budget ${index + 1}:`, b, conversionError);
          const fallback = { 
            activity_id: b.activity_id,
            type: b.type,
            status: b.status,
            period_start: b.period_start,
            period_end: b.period_end,
            value: b.value,
            currency: b.currency,
            value_date: b.value_date,
            usd_value: null
          };
          console.log(`[BulkInsert] Budget ${index + 1} fallback:`, fallback);
          return fallback;
        }
      }));
      
      console.log('[BulkInsert] All conversions complete. Inserting', budgetsWithUsd.length, 'budgets with USD values:', budgetsWithUsd);
      
      const { data, error } = await supabase
        .from('activity_budgets')
        .insert(budgetsWithUsd)
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
      {/* Financial Summary Cards - Unified component */}
      {activityId && !hideSummaryCards && (
        <FinancialSummaryCards 
          activityId={activityId} 
          className="mb-6" 
          budgets={memoizedBudgetsForSummary}
          showBudgetChart={false}
        />
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Budgets</CardTitle>
              <CardDescription>Activity budget allocations by period</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!readOnly && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModalForNewBudget('month')}
                  >
                    + Monthly
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModalForNewBudget('quarter')}
                  >
                    + Quarterly
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModalForNewBudget('half-year')}
                  >
                    + Semi-Annual
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModalForNewBudget('year')}
                  >
                    + Annual
                  </Button>
                </>
              )}
              {budgets.length > 0 && !loading && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              )}
            </div>
          </div>
          {selectedBudgetIds.size > 0 && (
            <div className="flex items-center justify-end mt-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedBudgetIds.size})
                  </>
                )}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>

          {/* Copy Budget Dialog */}
          <Dialog open={showCopyDialog} onOpenChange={(open) => {
            if (!open) {
              setShowCopyDialog(false);
              setCopySourceBudget(null);
              setCopyPeriodStart('');
              setCopyPeriodEnd('');
              setCopyOverlapWarning(null);
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
                      <UITooltip>
                        <TooltipTrigger className="ml-1">
                          <AlertCircle className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>⚠ Budget periods overlap (allowed, but not recommended)</p>
                        </TooltipContent>
                      </UITooltip>
                    </Label>
                    <Input
                      id="copy-period-start"
                      type="date"
                      value={copyPeriodStart}
                      onChange={(e) => setCopyPeriodStart(e.target.value)}
                      className={copyOverlapWarning ? "border-red-500" : ""}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="copy-period-end">
                      Period End
                      <UITooltip>
                        <TooltipTrigger className="ml-1">
                          <AlertCircle className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>⚠ Budget periods overlap (allowed, but not recommended)</p>
                        </TooltipContent>
                      </UITooltip>
                    </Label>
                    <Input
                      id="copy-period-end"
                      type="date"
                      value={copyPeriodEnd}
                      onChange={(e) => setCopyPeriodEnd(e.target.value)}
                      className={copyOverlapWarning ? "border-red-500" : ""}
                    />
                  </div>
                </div>
                
                {copyOverlapWarning && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {copyOverlapWarning}
                    </AlertDescription>
                  </Alert>
                )}
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
                  disabled={!!copyOverlapWarning || !copyPeriodStart || !copyPeriodEnd}
                >
                  Copy Budget
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


          {/* Budget table */}
          <div className="rounded-md border">
            <Table aria-label="Budgets table">
              <TableHeader className="bg-muted/50 border-b border-border/70">
                <TableRow>
                  {!readOnly && (
                    <TableHead className="w-[50px] text-center">
                      <Checkbox
                        checked={selectedBudgetIds.size === sortedBudgets.length && sortedBudgets.length > 0}
                        onCheckedChange={handleSelectAll}
                        disabled={isBulkDeleting || sortedBudgets.length === 0}
                        aria-label="Select all"
                      />
                    </TableHead>
                  )}
                  <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 w-[180px]">
                    <div 
                      className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => handleSort('period_start')}
                    >
                      Period
                      {sortColumn === 'period_start' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>⚠ Budget periods overlap (allowed, but not recommended)</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  {[
                    { label: "Status", width: "w-[110px]", sortKey: "status", align: "left" },
                    { label: "Type", width: "w-[100px]", sortKey: "type", align: "left" },
                    { label: "Amount", width: "w-[140px]", sortKey: "value", align: "right" },
                    { label: "Value Date", width: "w-[130px]", sortKey: "value_date", align: "left" },
                    { label: "USD Value", width: "w-[120px]", sortKey: "usd_value", align: "right" }
                  ].map((header, i) => (
                    <TableHead key={i + 2} className={`text-sm font-medium text-foreground/90 py-3 px-4 ${header.width} ${header.align === 'right' ? 'text-right' : ''}`}>
                      {header.sortKey ? (
                        <div 
                          className={`flex items-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors ${header.align === 'right' ? 'justify-end' : ''}`}
                          onClick={() => handleSort(header.sortKey)}
                        >
                          {header.label}
                          {sortColumn === header.sortKey && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      ) : (
                        header.label
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBudgets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center px-2 py-8">
                      No budgets added yet. Use the "Add Period" buttons above to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedBudgets.map((budget, index) => {
                    const overlappingBudgets = checkBudgetOverlap(budget, sortedBudgets);
                    const hasOverlapWarning = overlappingBudgets && overlappingBudgets.length > 0;
                    
                    return (
                    <TableRow 
                      key={budget.id || `budget-${index}`} 
                      className={cn(
                        "border-b border-border/40 cursor-pointer hover:bg-muted/30 transition-colors",
                        budget.hasError ? 'bg-red-50' : hasOverlapWarning ? 'bg-orange-50/30' : '',
                        selectedBudgetIds.has(budget.id!) && "bg-blue-50 border-blue-200"
                      )}
                    > 
                      {!readOnly && (
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedBudgetIds.has(budget.id!)}
                            onCheckedChange={(checked) => handleSelectBudget(budget.id!, !!checked)}
                            disabled={isBulkDeleting || !budget.id}
                            aria-label={`Select budget ${budget.id}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            {format(parseISO(budget.period_start), 'MMM yyyy')} - {format(parseISO(budget.period_end), 'MMM yyyy')}
                          </span>
                          {hasOverlapWarning && (
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="text-xs">
                                    <div className="font-semibold mb-1">⚠️ Period Overlap Warning</div>
                                    <div className="mb-1">This budget period overlaps with:</div>
                                    {overlappingBudgets.map((ob, i) => (
                                      <div key={i} className="text-muted-foreground">
                                        • {format(parseISO(ob.period_start), 'MMM d, yyyy')} - {format(parseISO(ob.period_end), 'MMM d, yyyy')}
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs">
                          {budget.status === 1 ? 'Indicative' : 'Committed'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs">
                          {budget.type === 1 ? 'Original' : 'Revised'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <span className="font-medium">
                          <span className="text-muted-foreground">{budget.currency}</span> {budget.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <span>
                          {budget.value_date ? format(parseISO(budget.value_date), 'MMM d, yyyy') : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                        {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.loading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.usd != null ? (
                          <TooltipProvider>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <span className="font-medium cursor-help">
                                  ${usdValues[budget.id || `${budget.period_start}-${budget.period_end}`].usd?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                            {budget.value === 0 ? (
                                <AlertCircle className="h-3 w-3 text-orange-500" />
                            ) : (
                              <span className="text-sm text-red-500">
                                {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.error || '-'}
                              </span>
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
                        <TableCell className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openModalForEditBudget(budget)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateForward(index)}>
                                <Copy className="h-4 w-4 mr-2" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteBudget(index)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Budget Charts */}
      {budgets.length > 0 && !readOnly && (
        <>
          <div className="flex flex-wrap gap-2 items-center mb-4 mt-8">
            <Button
              variant={aggregationMode === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAggregationMode('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={aggregationMode === 'quarterly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAggregationMode('quarterly')}
            >
              Quarterly
            </Button>
            <Button
              variant={aggregationMode === 'semi-annual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAggregationMode('semi-annual')}
            >
              Semi-Annual
            </Button>
            <Button
              variant={aggregationMode === 'annual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAggregationMode('annual')}
            >
              Annual
            </Button>
          </div>
          <div className="w-full">
            <BudgetLineChart 
              title="Cumulative Budget"
              data={chartData.cumulativeData}
              dataKey="total"
              color="#64748b"
              currencyMode={currencyMode}
              usdValues={usdValues}
              budgets={budgets}
              defaultCurrency={defaultCurrency}
            />
          </div>
        </>
      )}
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

              {/* USD Value (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="usd_value">USD Value</Label>
                <Input
                  id="usd_value"
                  type="text"
                  value={isCalculatingUSD ? 'Calculating...' : (modalBudget.usd_value !== null && modalBudget.usd_value !== undefined ? `USD ${modalBudget.usd_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A')}
                  disabled
                  className="bg-muted"
                />
              </div>

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
                                  <TrashIcon className="h-4 w-4" />
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
    </div>
  );
} 