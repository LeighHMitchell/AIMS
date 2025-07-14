'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addMonths, addQuarters, addYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, differenceInMonths, parseISO, isValid, isBefore, isAfter, getQuarter, getYear } from 'date-fns';
import { format as formatDateFns } from 'date-fns';
import { Trash2, Copy, Loader2, Wallet, CheckCircle, Lock, Unlock, FastForward } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAllCurrenciesWithPinned, type Currency } from '@/data/currencies';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FinancialSummaryCards } from '@/components/FinancialSummaryCards';
import { Skeleton } from '@/components/ui/skeleton';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar } from 'recharts';
import { useUser } from '@/hooks/useUser';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/dialog';

// Types
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
  isSaving?: boolean;
  hasError?: boolean;
}


interface ActivityBudgetsTabProps {
  activityId: string;
  startDate: string;
  endDate: string;
  defaultCurrency?: string;
  onBudgetsChange?: (budgets: ActivityBudget[]) => void;
}

type Granularity = 'quarterly' | 'monthly' | 'annual';



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
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#64748b" />
            <YAxis {...getYAxisProps(data, [dataKey], currencyMode === 'usd' ? 'USD' : (budgets[0]?.currency || defaultCurrency))} stroke="#64748b" fontSize={12}
              label={{
                value: `Amount (${currencyMode === 'usd' ? 'USD' : (budgets[0]?.currency || defaultCurrency)})`,
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 13 }
              }}
            />
            <Tooltip 
              formatter={(value, name, props) => {
                // Enhanced tooltip: show original, USD, rate, date
                const period = props?.payload?.period;
                const orig = `${props?.payload?.originalValue} ${props?.payload?.originalCurrency}`;
                const usd = props?.payload?.usdValue ? `$${Number(props?.payload?.usdValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
                const rate = props?.payload?.rate ? `@ ${props?.payload?.rate}` : '';
                const date = props?.payload?.date || '';
                if (currencyMode === 'usd') {
                  return [`${usd} (${orig} ${rate}, ${date})`];
                } else {
                  return [`${orig} (${usd} ${rate}, ${date})`];
                }
              }}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke="#64748b" 
              strokeWidth={3}
              dot={{ fill: "#64748b", r: 4 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BudgetBarChart({ title, data, dataKey, color = "#64748b", currencyMode, usdValues, budgets, defaultCurrency }: BudgetLineChartProps) {
  return (
    <div className="bg-white border rounded-xl p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#64748b" />
            <YAxis {...getYAxisProps(data, [dataKey], currencyMode === 'usd' ? 'USD' : (budgets[0]?.currency || defaultCurrency))} stroke="#64748b" fontSize={12}
              label={{
                value: `Amount (${currencyMode === 'usd' ? 'USD' : (budgets[0]?.currency || defaultCurrency)})`,
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 13 }
              }}
            />
            <Tooltip 
              formatter={(value, name, props) => {
                const period = props?.payload?.period;
                const orig = `${props?.payload?.originalValue} ${props?.payload?.originalCurrency}`;
                const usd = props?.payload?.usdValue ? `$${Number(props?.payload?.usdValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
                const rate = props?.payload?.rate ? `@ ${props?.payload?.rate}` : '';
                const date = props?.payload?.date || '';
                if (currencyMode === 'usd') {
                  return [`${usd} (${orig} ${rate}, ${date})`];
                } else {
                  return [`${orig} (${usd} ${rate}, ${date})`];
                }
              }}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Bar dataKey={dataKey} fill={color} name={title} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Helper functions to generate budget periods
export const generateBudgetPeriods = (startDate: string, endDate: string, granularity: Granularity): Array<{ start: string; end: string }> => {
  const periods: Array<{ start: string; end: string }> = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (!isValid(start) || !isValid(end) || !isBefore(start, end)) {
    return periods;
  }

  let current = start;

  while (isBefore(current, end)) {
    let periodStart: Date;
    let periodEnd: Date;

    switch (granularity) {
      case 'monthly':
        periodStart = startOfMonth(current);
        periodEnd = endOfMonth(current);
        current = addMonths(current, 1);
        break;
      case 'quarterly':
        periodStart = startOfQuarter(current);
        periodEnd = endOfQuarter(current);
        current = addQuarters(current, 1);
        break;
      case 'annual':
        periodStart = startOfYear(current);
        periodEnd = endOfYear(current);
        current = addYears(current, 1);
        break;
    }

    // Ensure period doesn't exceed 12 months
    const monthDiff = differenceInMonths(periodEnd, periodStart);
    if (monthDiff > 12) {
      periodEnd = addMonths(periodStart, 11);
      periodEnd = endOfMonth(periodEnd);
    }

    // Ensure period doesn't exceed project end date
    if (isAfter(periodEnd, end)) {
      periodEnd = end;
    }

    periods.push({
      start: format(periodStart, 'yyyy-MM-dd'),
      end: format(periodEnd, 'yyyy-MM-dd')
    });

    // Break if we've reached the end
    if (!isBefore(periodEnd, end)) {
      break;
    }
  }

  return periods;
};

export default function ActivityBudgetsTab({ 
  activityId, 
  startDate, 
  endDate, 
  defaultCurrency = 'USD',
  onBudgetsChange
}: ActivityBudgetsTabProps) {
  console.log('[ActivityBudgetsTab] Component mounted with:', { activityId, startDate, endDate, defaultCurrency });

  const [budgets, setBudgets] = useState<ActivityBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<Granularity>('quarterly');
  const [error, setError] = useState<string | null>(null);
  const [usdValues, setUsdValues] = useState<Record<string, { usd: number|null, rate: number|null, date: string, loading: boolean, error?: string }>>({});
  // Add saveStatus state to track per-row save status
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  // Add state for currency and aggregation toggles
  const [currencyMode, setCurrencyMode] = useState<'original' | 'usd'>('original');
  const [aggregationMode, setAggregationMode] = useState<'quarterly' | 'annual'>('quarterly');
  const [isLocked, setIsLocked] = useState(true);
  const [pendingGranularity, setPendingGranularity] = useState<Granularity | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  const currencies = useMemo(() => getAllCurrenciesWithPinned(), []);
  const { user, isLoading: userLoading } = useUser();

  // Generate periods based on granularity
  const generatedPeriods = useMemo(() => {
    if (!startDate || !endDate) return [];
    return generateBudgetPeriods(startDate, endDate, granularity);
  }, [startDate, endDate, granularity]);

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
        // Always generate default budgets if no budgets exist
        if ((!budgetsData || budgetsData.length === 0) && generatedPeriods.length > 0) {
          const todayStr = formatDateFns(new Date(), 'yyyy-MM-dd');
          const defaultBudgets = generatedPeriods.map(period => ({
            activity_id: activityId,
            type: 1 as const,
            status: 1 as const,
            period_start: period.start,
            period_end: period.end,
            value: 0,
            currency: defaultCurrency,
            value_date: todayStr,
          }));
          setBudgets(defaultBudgets);
        } else {
          setBudgets(budgetsData || []);
        }
      } catch (err: any) {
        console.error('[ActivityBudgetsTab] Error fetching budget data:', err);
        setError(err.message || 'Failed to load budget data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activityId, defaultCurrency, generatedPeriods]);

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

  // Calculate total budget
  const totalBudget = useMemo(() => {
    const revisedTotal = budgets
      .filter(b => b.type === 2)
      .reduce((sum, b) => sum + Number(b.value), 0);

    const originalTotal = budgets
      .filter(b => b.type === 1)
      .reduce((sum, b) => sum + Number(b.value), 0);

    return revisedTotal > 0 ? revisedTotal : originalTotal;
  }, [budgets]);

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
        case 'quarterly':
          periodLabel = `Q${getQuarter(startDate)} ${getYear(startDate)}`;
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

  // Validation helper
  function validateBudget(budget: ActivityBudget, allBudgets: ActivityBudget[]) {
    if (!budget.activity_id || !budget.type || !budget.status || !budget.period_start || !budget.period_end || !budget.value_date || !budget.currency) {
      return 'Missing required fields';
    }
    // Check for overlapping periods (excluding self)
    const hasOverlap = allBudgets.some(b => {
      // Skip if it's the same budget (comparing by ID or by reference)
      if (b === budget || (budget.id && b.id === budget.id)) return false;
      
      const bStart = parseISO(b.period_start);
      const bEnd = parseISO(b.period_end);
      const budgetStart = parseISO(budget.period_start);
      const budgetEnd = parseISO(budget.period_end);
      
      // Check if periods overlap
      return (
        (budgetStart >= bStart && budgetStart <= bEnd) ||
        (budgetEnd >= bStart && budgetEnd <= bEnd) ||
        (budgetStart <= bStart && budgetEnd >= bEnd)
      );
    });
    
    if (hasOverlap) {
      return 'Budget periods cannot overlap for the same activity';
    }
    return null;
  }

  // Improved saveBudgetField with error handling and validation
  const saveBudgetField = useCallback(async (budget: ActivityBudget, field: keyof ActivityBudget) => {
    const rowKey = budget.id || `${budget.period_start}-${budget.period_end}`;
    setSaveStatus(prev => ({ ...prev, [rowKey]: 'saving' }));
    setBudgets(prev => prev.map(b => b === budget ? { ...b, isSaving: true, hasError: false } : b));
    // Validation
    const validationError = validateBudget(budget, budgets);
    if (validationError) {
      setBudgets(prev => prev.map(b => b === budget ? { ...b, isSaving: false, hasError: true } : b));
      setSaveStatus(prev => ({ ...prev, [rowKey]: 'error' }));
      setError(validationError);
      return;
    }
    // Auth check
    if (!user && !userLoading) {
      setBudgets(prev => prev.map(b => b === budget ? { ...b, isSaving: false, hasError: true } : b));
      setSaveStatus(prev => ({ ...prev, [rowKey]: 'error' }));
      setError('You must be logged in to save budgets.');
      return;
    }
    try {
      // Always recalculate USD value before saving
      const result = await fixedCurrencyConverter.convertToUSD(budget.value, budget.currency, new Date(budget.value_date));
      const usd_value = result.usd_amount;
      const budgetData = {
        activity_id: budget.activity_id,
        type: budget.type,
        status: budget.status,
        period_start: budget.period_start,
        period_end: budget.period_end,
        value: budget.value,
        currency: budget.currency,
        value_date: budget.value_date,
        usd_value,
      };
      let updatedBudget = { ...budget, usd_value };
      if (budget.id) {
        // Update existing
        const { error } = await supabase
          .from('activity_budgets')
          .update(budgetData)
          .eq('id', budget.id);
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('activity_budgets')
          .insert(budgetData)
          .select()
          .single();
        if (error) throw error;
        updatedBudget = { ...data, isSaving: false };
        setBudgets(prev => prev.map(b => b === budget ? updatedBudget : b));
      }
      setBudgets(prev => prev.map(b => b === budget ? { ...b, isSaving: false, usd_value } : b));
      setSaveStatus(prev => ({ ...prev, [rowKey]: 'saved' }));
      // Update USD values for display
      setUsdValues(prev => ({
        ...prev,
        [rowKey]: {
          usd: usd_value,
          rate: result.exchange_rate,
          date: result.conversion_date || budget.value_date,
          loading: false,
          error: result.success ? undefined : result.error || 'Conversion failed'
        }
      }));
      // Refresh summary cards if present
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('refreshFinancialSummaryCards');
        window.dispatchEvent(event);
      }
    } catch (err: any) {
      setBudgets(prev => prev.map(b => b === budget ? { ...b, isSaving: false, hasError: true } : b));
      setSaveStatus(prev => ({ ...prev, [rowKey]: 'error' }));
      setError(err?.message || err?.error_description || 'Save failed');
    }
  }, [budgets, user, userLoading]);

  // Update budget field without auto-save
  const updateBudgetField = useCallback((index: number, field: keyof ActivityBudget, value: any) => {
    setBudgets(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // Handle field blur to save
  const handleFieldBlur = useCallback((index: number, field: keyof ActivityBudget) => {
    const budget = budgets[index];
    saveBudgetField(budget, field);
  }, [budgets, saveBudgetField]);

  // Handle select field change (save immediately)
  const handleSelectChange = useCallback((index: number, field: keyof ActivityBudget, value: any) => {
    const updatedBudget = { ...budgets[index], [field]: value };
    setBudgets(prev => {
      const updated = [...prev];
      updated[index] = updatedBudget;
      return updated;
    });
    // Save immediately for select fields
    saveBudgetField(updatedBudget, field);
  }, [budgets, saveBudgetField]);

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
    } catch (err) {
      console.error('Error deleting budget:', err);
      setError('Failed to delete budget');
    }
  }, [budgets]);

  // Duplicate budget
  const duplicateBudget = useCallback((index: number) => {
    const today = formatDateFns(new Date(), 'yyyy-MM-dd');
    const budget = budgets[index];
    const newBudget: ActivityBudget = {
      ...budget,
      id: undefined,
      period_start: format(addMonths(parseISO(budget.period_start), 3), 'yyyy-MM-dd'),
      period_end: format(addMonths(parseISO(budget.period_end), 3), 'yyyy-MM-dd'),
      value_date: today, // Default to today
    };

    setBudgets(prev => [...prev, newBudget]);
    
    // Save the new budget
    setTimeout(() => {
      saveBudgetField(newBudget, 'value');
    }, 100);
  }, [budgets, saveBudgetField]);

  // Duplicate Forward - creates next period based on granularity
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
    
    let nextPeriodStart: Date | undefined;
    let nextPeriodEnd: Date | undefined;
    
    // Calculate next period based on granularity
    switch (granularity) {
      case 'monthly':
        nextPeriodStart = addMonths(currentStart, 1);
        nextPeriodEnd = endOfMonth(nextPeriodStart);
        break;
      case 'quarterly':
        nextPeriodStart = addQuarters(currentStart, 1);
        nextPeriodEnd = endOfQuarter(nextPeriodStart);
        break;
      case 'annual':
        nextPeriodStart = addYears(currentStart, 1);
        nextPeriodEnd = endOfYear(nextPeriodStart);
        break;
      default:
        console.log('[DuplicateForward] ERROR: Unknown granularity:', granularity);
        alert(`Unknown granularity: ${granularity}`);
        return;
    }
    
    if (!nextPeriodStart || !nextPeriodEnd) {
      console.log('[DuplicateForward] ERROR: Failed to calculate next period');
      alert('Failed to calculate next period');
      return;
    }
    
    console.log('[DuplicateForward] Calculated next period:', {
      granularity,
      nextStart: format(nextPeriodStart, 'yyyy-MM-dd'),
      nextEnd: format(nextPeriodEnd, 'yyyy-MM-dd')
    });
    
    // Ensure period doesn't exceed 12 months
    const monthDiff = differenceInMonths(nextPeriodEnd, nextPeriodStart);
    if (monthDiff > 12) {
      console.log('[DuplicateForward] Period exceeds 12 months, adjusting...');
      nextPeriodEnd = addMonths(nextPeriodStart, 11);
      nextPeriodEnd = endOfMonth(nextPeriodEnd);
    }
    
    // Ensure period doesn't exceed project end date
    const projectEnd = parseISO(endDate);
    console.log('[DuplicateForward] Project end date:', endDate, projectEnd);
    
    if (isAfter(nextPeriodEnd, projectEnd)) {
      console.log('[DuplicateForward] Period end exceeds project end, adjusting...');
      nextPeriodEnd = projectEnd;
    }
    
    // Check if period is still valid
    if (!isBefore(nextPeriodStart, projectEnd)) {
      console.log('[DuplicateForward] ERROR: Next period start is after project end, cannot create');
      alert('Cannot create budget period beyond project end date');
      return; // Can't create period beyond project end
    }
    
    const nextPeriodStartStr = format(nextPeriodStart, 'yyyy-MM-dd');
    const nextPeriodEndStr = format(nextPeriodEnd, 'yyyy-MM-dd');
    
    console.log('[DuplicateForward] Formatted next period:', {
      start: nextPeriodStartStr,
      end: nextPeriodEndStr
    });
    
    // Check for overlaps with existing budgets
    const hasOverlap = budgets.some((b, i) => {
      if (i === index) return false; // Skip current budget
      const existingStart = parseISO(b.period_start);
      const existingEnd = parseISO(b.period_end);
      
      const overlaps = (
        (nextPeriodStart >= existingStart && nextPeriodStart <= existingEnd) ||
        (nextPeriodEnd >= existingStart && nextPeriodEnd <= existingEnd) ||
        (nextPeriodStart <= existingStart && nextPeriodEnd >= existingEnd)
      );
      
      if (overlaps) {
        console.log('[DuplicateForward] Overlap detected with budget:', {
          index: i,
          existingPeriod: `${b.period_start} to ${b.period_end}`,
          newPeriod: `${nextPeriodStartStr} to ${nextPeriodEndStr}`
        });
      }
      
      return overlaps;
    });
    
    if (hasOverlap) {
      console.log('[DuplicateForward] ERROR: Period would overlap with existing budget');
      alert('Cannot create budget period - it would overlap with an existing budget period');
      return; // Period would overlap, don't create
    }
    
    // Create new budget with next period
    const newBudget: ActivityBudget = {
      ...budget,
      id: undefined,
      period_start: nextPeriodStartStr,
      period_end: nextPeriodEndStr,
      value_date: nextPeriodStartStr, // Set value_date to start of new period
    };
    
    console.log('[DuplicateForward] Creating new budget:', newBudget);
    
    // Insert after current row
    setBudgets(prev => {
      const updated = [...prev];
      updated.splice(index + 1, 0, newBudget);
      console.log('[DuplicateForward] Updated budgets array:', updated);
      return updated;
    });
    
    console.log('[DuplicateForward] SUCCESS: Budget duplicated forward');
    
    // Auto-save the new budget
    setTimeout(() => {
      console.log('[DuplicateForward] Auto-saving new budget...');
      saveBudgetField(newBudget, 'value');
    }, 100);
  }, [budgets, granularity, endDate, saveBudgetField]);

  // Add custom budget period
  const addCustomPeriod = useCallback(() => {
    const today = formatDateFns(new Date(), 'yyyy-MM-dd');
    const lastBudget = budgets[budgets.length - 1];
    const startDate = lastBudget 
      ? format(addMonths(parseISO(lastBudget.period_end), 1), 'yyyy-MM-dd')
      : today;
    
    const newBudget: ActivityBudget = {
      activity_id: activityId,
      type: 1,
      status: 1,
      period_start: startDate,
      period_end: format(addMonths(parseISO(startDate), 3), 'yyyy-MM-dd'),
      value: 0,
      currency: defaultCurrency,
      value_date: today, // Default to today
    };

    setBudgets(prev => [...prev, newBudget]);
  }, [budgets, activityId, defaultCurrency]);


  // Handle granularity change
  const handleGranularityChange = useCallback((newGranularity: Granularity) => {
    if (!confirm('Changing granularity will regenerate the budget table. Any unsaved changes may be lost. Continue?')) {
      return;
    }

    setGranularity(newGranularity);
    
    // Regenerate budgets based on new granularity
    const newPeriods = generateBudgetPeriods(startDate, endDate, newGranularity);
    const todayStr = formatDateFns(new Date(), 'yyyy-MM-dd');
    const newBudgets = newPeriods.map(period => ({
      activity_id: activityId,
      type: 1 as const,
      status: 1 as const,
      period_start: period.start,
      period_end: period.end,
      value: 0,
      currency: defaultCurrency,
      value_date: todayStr,
    }));
    
    setBudgets(newBudgets);
  }, [startDate, endDate, activityId, defaultCurrency]);

  const handleGranularityTabClick = (g: Granularity) => {
    if (g === granularity) return; // Don't change to same granularity
    setPendingGranularity(g);
    setShowWarning(true);
  };

  const confirmGranularityChange = async () => {
    if (!pendingGranularity) return;
    setIsWiping(true);
    
    try {
      // Clear any existing error first
      setError(null);
      
      console.log('Starting granularity change to:', pendingGranularity);
      
      // Step 1: Delete existing budgets
      const deleteRes = await fetch(`/api/activities/${activityId}/budgets`, { method: 'DELETE' });
      if (!deleteRes.ok) {
        const errorText = await deleteRes.text();
        console.error('DELETE budgets failed:', deleteRes.status, errorText);
        throw new Error(`Failed to delete budgets: ${deleteRes.status} ${errorText}`);
      }
      
      const deleteResult = await deleteRes.json();
      console.log('Delete result:', deleteResult);
      
      // Step 2: Clear local budgets state immediately
      setBudgets([]);
      
      // Step 3: Wait a moment for database consistency
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 4: Verify deletion (optional - the deletion was successful if we got here)
      try {
        const verifyRes = await fetch(`/api/activities/${activityId}/budgets`);
        if (verifyRes.ok) {
          const remainingBudgets = await verifyRes.json();
          if (Array.isArray(remainingBudgets) && remainingBudgets.length > 0) {
            console.warn('Some budgets may still exist after deletion:', remainingBudgets);
            // Don't fail here - proceed anyway as the DELETE endpoint succeeded
          }
        }
      } catch (verifyError) {
        console.warn('Verification step failed but proceeding:', verifyError);
        // Don't fail here - the main deletion succeeded
      }
      
      console.log('Deletion successful, proceeding with granularity change');
      
    } catch (e) {
      console.error('Granularity change failed:', e);
      setError(`Failed to change granularity: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setIsWiping(false);
      setShowWarning(false);
      setPendingGranularity(null);
      return;
    }
    // Step 5: Generate and save new budgets
    try {
      console.log('[GranularityChange] Step 5: Starting budget generation and save');
      setGranularity(pendingGranularity);
      
      // Regenerate budgets based on new granularity
      console.log('[GranularityChange] Generating periods with:', { startDate, endDate, pendingGranularity });
      const newPeriods = generateBudgetPeriods(startDate, endDate, pendingGranularity);
      console.log('[GranularityChange] Generated periods:', newPeriods);
      
      const todayStr = formatDateFns(new Date(), 'yyyy-MM-dd');
      const newBudgets = newPeriods.map(period => ({
        activity_id: activityId,
        type: 1 as const,
        status: 1 as const,
        period_start: period.start,
        period_end: period.end,
        value: 0,
        currency: defaultCurrency,
        value_date: todayStr,
      }));
      
      console.log('[GranularityChange] Generated', newBudgets.length, 'new budgets for', pendingGranularity, 'granularity:', newBudgets);
      
      if (newBudgets.length === 0) {
        console.warn('[GranularityChange] No budgets generated - this is likely the problem!');
        setError('No budget periods could be generated for the selected granularity');
        return;
      }
      
      // Set budgets locally first
      console.log('[GranularityChange] Setting budgets in local state');
      setBudgets(newBudgets);
      
      // Then save to database
      console.log('[GranularityChange] About to save', newBudgets.length, 'new budgets to database');
      await bulkInsertBudgets(newBudgets);
      
      console.log('[GranularityChange] Granularity change completed successfully');
      
    } catch (saveError) {
      console.error('[GranularityChange] Failed to save new budgets during granularity change:', saveError);
      setError(`Failed to save new budgets: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
      // Keep the UI in the loading state and show the error
      // Don't reset the dialog yet
      return;
    }
    
    // Success - reset the UI
    setIsWiping(false);
    setShowWarning(false);
    setPendingGranularity(null);
  };

  const cancelGranularityChange = () => {
    setShowWarning(false);
    setPendingGranularity(null);
  };

  // Calculate USD total
  const totalUsd = useMemo(() => {
    return Object.values(usdValues).reduce((sum, v) => sum + (v.usd || 0), 0);
  }, [usdValues]);

  // Call onBudgetsChange whenever budgets changes
  useEffect(() => {
    if (onBudgetsChange) onBudgetsChange(budgets);
  }, [budgets, onBudgetsChange]);

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
            usd_value: result.usd_amount || 0
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
            usd_value: 0
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
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="p-6 border-b bg-gray-50">
            <Skeleton className="h-6 w-32" />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Period', 'Type', 'Status', 'Value', 'Currency', 'Value Date', 'Actions'].map((header, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      <Skeleton className="h-4 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(4)].map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b">
                    {[...Array(7)].map((_, colIndex) => (
                      <td key={colIndex} className="px-4 py-3">
                        <Skeleton className="h-5 w-24" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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

  // Granularity tab order: Monthly, Quarterly, Annual
  const granularityOrder: Granularity[] = ['monthly', 'quarterly', 'annual'];

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards - Unified component */}
      {activityId && (
        <FinancialSummaryCards activityId={activityId} className="mb-6" />
      )}

      {/* Budgets Heading */}
      <div className="flex items-center gap-2 mt-6 mb-2">
        <Wallet className="w-5 h-5 text-muted-foreground" />
        <span className="text-lg font-semibold text-muted-foreground">Budgets</span>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Granularity switcher in correct order */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Budget Frequency:</span>
              <div className="flex gap-2">
                {granularityOrder.map((g) => (
                  <Button
                    key={g}
                    variant={granularity === g ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleGranularityTabClick(g)}
                    disabled={isWiping}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                    {isWiping && pendingGranularity === g && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  </Button>
                ))}
              </div>
              {isWiping && (
                <span className="text-sm text-orange-600 font-medium">
                  Changing frequency...
                </span>
              )}
            </div>
          </div>
          <Dialog open={showWarning} onOpenChange={cancelGranularityChange}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Warning: Change Budget Frequency?</DialogTitle>
                <DialogDescription>
                  Switching the budget frequency (monthly, quarterly, annual) will wipe all previously reported budgets for this activity. This action cannot be undone.<br />
                  Are you sure you want to continue?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={cancelGranularityChange} disabled={isWiping}>Cancel</Button>
                <Button variant="destructive" onClick={confirmGranularityChange} disabled={isWiping}>Yes, Wipe Budgets</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Budget table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Period Start', 'Period End', 'Type', 'Status', 'Value', 'Currency', 'Value Date', 'USD VALUE', 'Actions'].map((header, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budgets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No budgets added yet. Click "Add Custom Period" to get started.
                    </td>
                  </tr>
                ) : (
                  budgets.map((budget, index) => (
                    <tr key={budget.id || `budget-${index}`} className={budget.hasError ? 'bg-red-50' : ''}>
                      <td className="px-4 py-4 text-sm">
                        {format(parseISO(budget.period_start), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {format(parseISO(budget.period_end), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-4">
                        <Select
                          value={budget.type.toString()}
                          onValueChange={(value) => handleSelectChange(index, 'type', parseInt(value) as 1 | 2)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Original</SelectItem>
                            <SelectItem value="2">Revised</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-4">
                        <Select
                          value={budget.status.toString()}
                          onValueChange={(value) => handleSelectChange(index, 'status', parseInt(value) as 1 | 2)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Indicative</SelectItem>
                            <SelectItem value="2">Committed</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={budget.value}
                            onChange={(e) => updateBudgetField(index, 'value', parseFloat(e.target.value) || 0)}
                            onBlur={() => handleFieldBlur(index, 'value')}
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => e.currentTarget.select()}
                            className="h-8 text-sm"
                            step="0.01"
                            min="0"
                          />
                          {budget.isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Select
                          value={budget.currency}
                          onValueChange={(value) => handleSelectChange(index, 'currency', value)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency: Currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                {currency.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-4">
                        <Input
                          type="date"
                          value={budget.value_date || formatDateFns(new Date(), 'yyyy-MM-dd')}
                          onChange={(e) => updateBudgetField(index, 'value_date', e.target.value)}
                          onBlur={() => handleFieldBlur(index, 'value_date')}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-4 py-4">
                        {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.loading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.usd != null ? (
                          <TooltipProvider>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <span className="font-mono cursor-help">
                                  ${usdValues[budget.id || `${budget.period_start}-${budget.period_end}`].usd?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          <span className="text-xs text-red-500">
                            {budget.value === 0 ? 'Please enter a value' : (usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.error || '-')}
                          </span>
                        )}
                        {saveStatus[budget.id || `${budget.period_start}-${budget.period_end}`] === 'saving' && (
                          <Loader2 className="h-4 w-4 animate-spin text-orange-500 inline ml-2" aria-label="Saving..." />
                        )}
                        {saveStatus[budget.id || `${budget.period_start}-${budget.period_end}`] === 'saved' && (
                          <CheckCircle className="h-4 w-4 text-green-600 inline ml-2" aria-label="Saved" />
                        )}
                        {saveStatus[budget.id || `${budget.period_start}-${budget.period_end}`] === 'error' && (
                          <span className="text-xs text-red-500 ml-1">Save failed</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2 items-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteBudget(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => duplicateBudget(index)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => duplicateForward(index)}
                            title="Duplicate Forward"
                          >
                            <FastForward className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with total and add button */}
          <div className="border-t p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  Total Budget: <span className="font-semibold text-gray-900">
                    {totalBudget.toLocaleString()} {budgets[0]?.currency || defaultCurrency}
                  </span>
                  <span className="ml-4 text-xs text-muted-foreground">USD: ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  (Using {budgets.some(b => b.type === 2) ? 'revised' : 'original'} values)
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomPeriod}
              >
                Add Custom Period
              </Button>
            </div>
          </div>
        </div>

      {/* Budget Charts */}
      {budgets.length > 0 && (
        <>
          <div className="flex flex-wrap gap-4 items-center mb-4 mt-8">
            <span className="text-sm font-medium">Show in:</span>
            <Button
              variant={currencyMode === 'original' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrencyMode('original')}
            >
              Original Currency
            </Button>
            <Button
              variant={currencyMode === 'usd' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrencyMode('usd')}
            >
              Standardized USD
            </Button>
            <span className="ml-4 text-sm font-medium">Aggregate by:</span>
            <Button
              variant={aggregationMode === 'quarterly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAggregationMode('quarterly')}
            >
              By Quarter
            </Button>
            <Button
              variant={aggregationMode === 'annual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAggregationMode('annual')}
            >
              By Calendar Year
            </Button>
          </div>
          <div className="flex flex-row gap-6 w-full items-stretch">
            <div className="flex-1 flex flex-col">
              <BudgetBarChart 
                title={`${aggregationMode.charAt(0).toUpperCase() + aggregationMode.slice(1)} ${currencyMode.charAt(0).toUpperCase() + currencyMode.slice(1)} Budget`}
                data={chartData.aggregatedData}
                dataKey="value"
                color="#64748b"
                currencyMode={currencyMode}
                usdValues={usdValues}
                budgets={budgets}
                defaultCurrency={defaultCurrency}
              />
            </div>
            <div className="flex-1 flex flex-col">
              <BudgetLineChart 
                title="Cumulative Budget"
                data={chartData.cumulativeData}
                dataKey="total"
                color="#10B981"
                currencyMode={currencyMode}
                usdValues={usdValues}
                budgets={budgets}
                defaultCurrency={defaultCurrency}
              />
            </div>
          </div>
        </>
      )}
      {/* If not authenticated, show message and disable editing */}
      {!user && !userLoading && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-center">
          You must be logged in to edit or save budgets.
        </div>
      )}
    </div>
  );
} 