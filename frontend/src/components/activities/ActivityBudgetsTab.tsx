'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addMonths, addQuarters, addYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, differenceInMonths, parseISO, isValid, isBefore, isAfter, getQuarter, getYear } from 'date-fns';
import { format as formatDateFns } from 'date-fns';
import { Trash2, Copy, Loader2, Wallet, CheckCircle, Lock, Unlock, FastForward, AlertCircle, Info, MoreVertical } from 'lucide-react';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FinancialSummaryCards } from '@/components/FinancialSummaryCards';
import { Skeleton } from '@/components/ui/skeleton';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar } from 'recharts';
import { useUser } from '@/hooks/useUser';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { showValidationError } from '@/lib/toast-manager';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

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
  usd_value?: number | null;
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

type Granularity = 'quarterly' | 'monthly' | 'annual' | 'custom';

// Interface for custom granularity
interface CustomGranularity {
  type: 'custom';
  months: number;
  label: string;
}



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
export const generateBudgetPeriods = (startDate: string, endDate: string, granularity: Granularity | CustomGranularity): Array<{ start: string; end: string }> => {
  const periods: Array<{ start: string; end: string }> = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (!isValid(start) || !isValid(end) || !isBefore(start, end)) {
    return periods;
  }

  // Handle custom granularity
  if (typeof granularity === 'object' && granularity.type === 'custom') {
    let currentStart = start;
    while (isBefore(currentStart, end)) {
      const periodEnd = addMonths(currentStart, granularity.months);
      const actualEnd = isAfter(periodEnd, end) ? end : periodEnd;
      
      periods.push({
        start: format(currentStart, 'yyyy-MM-dd'),
        end: format(actualEnd, 'yyyy-MM-dd')
      });
      
      currentStart = addMonths(currentStart, granularity.months);
    }
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
      default:
        // Default case to ensure variables are always initialized
        periodStart = startOfMonth(current);
        periodEnd = endOfMonth(current);
        current = addMonths(current, 1);
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
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error' | 'idle'>>({});
  // Add state for currency and aggregation toggles
  const [currencyMode, setCurrencyMode] = useState<'original' | 'usd'>('original');
  const [aggregationMode, setAggregationMode] = useState<'quarterly' | 'annual'>('quarterly');
  const [isLocked, setIsLocked] = useState(true);
  const [pendingGranularity, setPendingGranularity] = useState<Granularity | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  // Copy dialog state
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copySourceBudget, setCopySourceBudget] = useState<ActivityBudget | null>(null);
  const [copyPeriodStart, setCopyPeriodStart] = useState('');
  const [copyPeriodEnd, setCopyPeriodEnd] = useState('');
  const [copyOverlapWarning, setCopyOverlapWarning] = useState<string | null>(null);
  
  // Custom granularity state
  const [showCustomGranularityDialog, setShowCustomGranularityDialog] = useState(false);
  const [customGranularity, setCustomGranularity] = useState<CustomGranularity>({ type: 'custom', months: 6, label: '6 months' });

  const currencies = useMemo(() => getAllCurrenciesWithPinned(), []);
  const { user, isLoading: userLoading } = useUser();

  // Generate periods based on granularity
  const generatedPeriods = useMemo(() => {
    if (!startDate || !endDate) return [];
    if (granularity === 'custom') {
      return generateBudgetPeriods(startDate, endDate, customGranularity);
    }
    return generateBudgetPeriods(startDate, endDate, granularity);
  }, [startDate, endDate, granularity, customGranularity]);

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

  // Notify parent component when budgets change
  useEffect(() => {
    if (onBudgetsChange) {
      onBudgetsChange(budgets);
    }
  }, [budgets, onBudgetsChange]);

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
    if (userLoading) {
      // Still loading user data, stop saving and clear spinner
      setBudgets(prev => prev.map(b => b === budget ? { ...b, isSaving: false } : b));
      setSaveStatus(prev => ({ ...prev, [rowKey]: 'idle' }));
      return;
    }
    
    if (!user) {
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

  // Helper function to format dates based on granularity
  const formatDateBasedOnGranularity = useCallback((date: string, isEndDate: boolean = false) => {
    if (!date) return date;
    
    const parsedDate = parseISO(date);
    if (!isValid(parsedDate)) return date;
    
    let formattedDate: Date;
    
    switch (granularity) {
      case 'monthly':
        formattedDate = isEndDate ? endOfMonth(parsedDate) : startOfMonth(parsedDate);
        break;
      case 'quarterly':
        formattedDate = isEndDate ? endOfQuarter(parsedDate) : startOfQuarter(parsedDate);
        break;
      case 'annual':
        formattedDate = isEndDate ? endOfYear(parsedDate) : startOfYear(parsedDate);
        break;
      case 'custom':
        // For custom granularity, don't force specific formatting
        return date;
      default:
        return date;
    }
    
    return format(formattedDate, 'yyyy-MM-dd');
  }, [granularity]);

  // Update budget field without auto-save
  const updateBudgetField = useCallback((index: number, field: keyof ActivityBudget, value: any) => {
    setBudgets(prev => {
      const updated = [...prev];
      let finalValue = value;
      
      // Format dates based on granularity
      if (field === 'period_start') {
        finalValue = formatDateBasedOnGranularity(value, false);
      } else if (field === 'period_end') {
        finalValue = formatDateBasedOnGranularity(value, true);
      }
      
      updated[index] = { ...updated[index], [field]: finalValue };
      return updated;
    });
  }, [formatDateBasedOnGranularity]);

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
    
    // Find next available period that doesn't overlap
    const nextPeriod = findNextAvailablePeriod(
      budget.period_start, 
      budget.period_end, 
      budgets.filter((_, i) => i !== index) // Exclude current budget from comparison
    );
    
    if (!nextPeriod) {
      // Use alert for now since toast is not available
      alert('Cannot create duplicate budget: Unable to find a non-overlapping period. Please create the budget manually with custom dates.');
      return;
    }

    const newBudget: ActivityBudget = {
      ...budget,
      id: undefined,
      period_start: nextPeriod.period_start,
      period_end: nextPeriod.period_end,
      value_date: today, // Default to today
    };

    setBudgets(prev => [...prev, newBudget]);
    
    // Save the new budget
    setTimeout(() => {
      saveBudgetField(newBudget, 'value');
    }, 100);
    
    // Show success feedback
    console.log(`Budget duplicated with period ${nextPeriod.period_start} to ${nextPeriod.period_end}`);
  }, [budgets, saveBudgetField, findNextAvailablePeriod]);

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
    if (!copySourceBudget || copyOverlapWarning) return;

    const today = formatDateFns(new Date(), 'yyyy-MM-dd');
    const newBudget: ActivityBudget = {
      ...copySourceBudget,
      id: undefined,
      period_start: copyPeriodStart,
      period_end: copyPeriodEnd,
      value_date: today,
    };

    setBudgets(prev => [...prev, newBudget]);
    
    // Save the new budget
    setTimeout(() => {
      saveBudgetField(newBudget, 'value');
    }, 100);
    
    // Show success feedback
    console.log(`Budget duplicated with period ${copyPeriodStart} to ${copyPeriodEnd}`);

    // Close dialog
    setShowCopyDialog(false);
    setCopySourceBudget(null);
    setCopyPeriodStart('');
    setCopyPeriodEnd('');
    setCopyOverlapWarning(null);
  }, [copySourceBudget, copyPeriodStart, copyPeriodEnd, copyOverlapWarning, saveBudgetField]);

  // Update overlap check when dates change
  useEffect(() => {
    if (showCopyDialog && copyPeriodStart && copyPeriodEnd) {
      checkCopyOverlap(copyPeriodStart, copyPeriodEnd);
    }
  }, [copyPeriodStart, copyPeriodEnd, showCopyDialog, checkCopyOverlap]);

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
      showValidationError('Cannot create budget period beyond project end date');
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
      showValidationError('Cannot create budget period - it would overlap with an existing budget period');
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
    
    if (g === 'custom') {
      setShowCustomGranularityDialog(true);
      return;
    }
    
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
      const granularityToUse = pendingGranularity === 'custom' ? customGranularity : pendingGranularity;
      const newPeriods = generateBudgetPeriods(startDate, endDate, granularityToUse);
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
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="p-6 border-b bg-gray-50">
            <Skeleton className="h-6 w-32" />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-muted">
                <tr>
                  {['Period', 'Type', 'Status', 'Value', 'Currency', 'Value Date', 'Actions'].map((header, i) => (
                    <th key={i} className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                      <Skeleton className="h-4 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-muted">
                {[...Array(4)].map((_, rowIndex) => (
                  <tr key={rowIndex} className={`hover:bg-muted/10 transition-colors ${rowIndex % 2 === 1 ? 'bg-muted/5' : ''}`}>
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

  // Granularity tab order: Monthly, Quarterly, Annual, Custom
  const granularityOrder: Granularity[] = ['monthly', 'quarterly', 'annual', 'custom'];

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards - Unified component */}
      {activityId && (
        <FinancialSummaryCards 
          activityId={activityId} 
          className="mb-6" 
          budgets={memoizedBudgetsForSummary}
        />
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
                          <p>⚠ Budget periods must not overlap</p>
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
                          <p>⚠ Budget periods must not overlap</p>
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

          {/* Custom Granularity Dialog */}
          <Dialog open={showCustomGranularityDialog} onOpenChange={setShowCustomGranularityDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Custom Budget Frequency</DialogTitle>
                <DialogDescription>
                  Set a custom reporting period for your budgets. This will create budget periods based on your specified number of months.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-months">Period Length (months)</Label>
                  <Input
                    id="custom-months"
                    type="number"
                    value={customGranularity.months}
                    onChange={(e) => {
                      const months = parseInt(e.target.value) || 6;
                      setCustomGranularity({
                        type: 'custom',
                        months,
                        label: `${months} month${months !== 1 ? 's' : ''}`
                      });
                    }}
                    min="1"
                    max="60"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the number of months for each budget period (1-60 months)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="custom-label">Display Label</Label>
                  <Input
                    id="custom-label"
                    type="text"
                    value={customGranularity.label}
                    onChange={(e) => setCustomGranularity(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g., 6 months, Bi-annual, etc."
                    className="mt-1"
                  />
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Preview:</strong> This will create budget periods of {customGranularity.months} month{customGranularity.months !== 1 ? 's' : ''} each, 
                    labeled as "{customGranularity.label}".
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCustomGranularityDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    setPendingGranularity('custom');
                    setShowCustomGranularityDialog(false);
                    setShowWarning(true);
                  }}
                  disabled={customGranularity.months < 1 || customGranularity.months > 60}
                >
                  Apply Custom Frequency
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Budget table */}
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      Period Start
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>⚠ Budget periods must not overlap</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      Period End
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>⚠ Budget periods must not overlap</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </div>
                  </th>
                  {["Type", "Status", "Value", "Currency", "Value Date", "USD VALUE", "Actions"].map((header, i) => (
                    <th key={i + 2} className="px-2 py-1 text-left text-xs font-medium text-muted-foreground">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-muted">
                {budgets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-2 py-8 text-center text-gray-500">
                      No budgets added yet. Click "Add Custom Period" to get started.
                    </td>
                  </tr>
                ) : (
                  budgets.map((budget, index) => (
                    <tr key={budget.id || `budget-${index}`} className={budget.hasError ? 'bg-red-50' : `hover:bg-muted/10 transition-colors ${index % 2 === 1 ? 'bg-muted/5' : ''}`}> 
                      <td className="px-2 py-4">
                        <Input
                          type="date"
                          value={budget.period_start}
                          onChange={(e) => updateBudgetField(index, 'period_start', e.target.value)}
                          onBlur={() => handleFieldBlur(index, 'period_start')}
                          className="h-10 text-xs"
                        />
                      </td>
                      <td className="px-2 py-4">
                        <Input
                          type="date"
                          value={budget.period_end}
                          onChange={(e) => updateBudgetField(index, 'period_end', e.target.value)}
                          onBlur={() => handleFieldBlur(index, 'period_end')}
                          className="h-10 text-xs"
                        />
                      </td>
                      <td className="px-2 py-4">
                        <Select
                          value={budget.type.toString()}
                          onValueChange={(value) => handleSelectChange(index, 'type', parseInt(value) as 1 | 2)}
                        >
                          <SelectTrigger className="h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Original</SelectItem>
                            <SelectItem value="2">Revised</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-4">
                        <Select
                          value={budget.status.toString()}
                          onValueChange={(value) => handleSelectChange(index, 'status', parseInt(value) as 1 | 2)}
                        >
                          <SelectTrigger className="h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Indicative</SelectItem>
                            <SelectItem value="2">Committed</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={budget.value === 0 ? '' : budget.value}
                            placeholder="0.00"
                            onChange={(e) => updateBudgetField(index, 'value', parseFloat(e.target.value) || 0)}
                            onBlur={() => handleFieldBlur(index, 'value')}
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => e.currentTarget.select()}
                            className="h-10 text-xs w-28"
                            step="0.01"
                            min="0"
                          />
                          {budget.isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <BudgetCurrencySelect
                          value={budget.currency}
                          onValueChange={(value) => handleSelectChange(index, 'currency', value || 'USD')}
                          placeholder="Select currency"
                          className="w-full"
                        />
                      </td>
                      <td className="px-2 py-4">
                        <Input
                          type="date"
                          value={budget.value_date || formatDateFns(new Date(), 'yyyy-MM-dd')}
                          onChange={(e) => updateBudgetField(index, 'value_date', e.target.value)}
                          onBlur={() => handleFieldBlur(index, 'value_date')}
                          className="h-10 text-xs"
                        />
                      </td>
                      <td className="px-2 py-4">
                        {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.loading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.usd != null ? (
                          <TooltipProvider>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <span className="font-mono cursor-help text-xs">
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
                          <div className="flex items-center gap-1">
                            {budget.value === 0 ? (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            ) : (
                              <span className="text-xs text-red-500">
                                {usdValues[budget.id || `${budget.period_start}-${budget.period_end}`]?.error || '-'}
                              </span>
                            )}
                          </div>
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
                      <td className="px-2 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => duplicateForward(index)}>
                              <Copy className="h-4 w-4 mr-2" /> Duplicate Forward
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteBudget(index)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with add button and optional budget summary */}
          <div className="border-t p-4">
            <div className="flex justify-between items-center">
              {budgets.length > 0 && (
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                        <Info className="h-3 w-3" />
                        <span>Budget Summary</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <div className="font-medium">Original Currency Total:</div>
                        <div>{budgetSummary.total.toLocaleString()} {budgetSummary.currency}</div>
                        <div className="font-medium">USD Equivalent:</div>
                        <div>${budgetSummary.usdTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="text-xs opacity-75">(Using {budgetSummary.type} values)</div>
                      </div>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              )}
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