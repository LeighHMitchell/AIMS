'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addMonths, addQuarters, addYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, differenceInMonths, parseISO, isValid, isBefore, isAfter, getQuarter, getYear } from 'date-fns';
import { Trash2, Copy, Loader2, Wallet } from 'lucide-react';
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

interface ActivityBudgetException {
  id?: string;
  activity_id: string;
  reason: string;
}

interface ActivityBudgetsTabProps {
  activityId: string;
  startDate: string;
  endDate: string;
  defaultCurrency?: string;
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

function BudgetLineChart({ title, data, dataKey, color = "#3B82F6" }: BudgetChartProps) {
  return (
    <div className="bg-white border rounded-xl p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#6B7280" />
            <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #E5E7EB',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }} 
            />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2}
              dot={{ fill: color, r: 4 }} 
            />
          </LineChart>
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
  defaultCurrency = 'USD' 
}: ActivityBudgetsTabProps) {
  console.log('[ActivityBudgetsTab] Component mounted with:', { activityId, startDate, endDate, defaultCurrency });

  const [budgets, setBudgets] = useState<ActivityBudget[]>([]);
  const [budgetNotProvided, setBudgetNotProvided] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingException, setSavingException] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>('quarterly');
  const [error, setError] = useState<string | null>(null);

  const currencies = useMemo(() => getAllCurrenciesWithPinned(), []);

  // Generate periods based on granularity
  const generatedPeriods = useMemo(() => {
    if (!startDate || !endDate) return [];
    return generateBudgetPeriods(startDate, endDate, granularity);
  }, [startDate, endDate, granularity]);

  // Fetch existing budgets and exception
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[ActivityBudgetsTab] Fetching budgets for activity:', activityId);
        console.log('[ActivityBudgetsTab] Supabase client:', supabase ? 'initialized' : 'null');

        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }

        // Fetch budgets
        const { data: budgetsData, error: budgetsError } = await supabase
          .from('activity_budgets')
          .select('*')
          .eq('activity_id', activityId)
          .order('period_start', { ascending: true });

        if (budgetsError) throw budgetsError;

        console.log('[ActivityBudgetsTab] Fetched budgets:', budgetsData?.length || 0);
        console.log('[ActivityBudgetsTab] Budget data:', budgetsData);

        // Fetch exception
        const { data: exceptionData, error: exceptionError } = await supabase
          .from('activity_budget_exceptions')
          .select('*')
          .eq('activity_id', activityId)
          .single();

        if (exceptionError && exceptionError.code !== 'PGRST116') {
          throw exceptionError;
        }

        if (exceptionData) {
          setBudgetNotProvided(true);
          setExceptionReason(exceptionData.reason);
        }

        // If no budgets exist and budget is provided, generate default budgets
        if (!exceptionData && (!budgetsData || budgetsData.length === 0) && generatedPeriods.length > 0) {
          const defaultBudgets = generatedPeriods.map(period => ({
            activity_id: activityId,
            type: 1 as const,
            status: 1 as const,
            period_start: period.start,
            period_end: period.end,
            value: 0,
            currency: defaultCurrency,
            value_date: period.start,
          }));
          setBudgets(defaultBudgets);
        } else {
          setBudgets(budgetsData || []);
        }
      } catch (err: any) {
        console.error('[ActivityBudgetsTab] Error fetching budget data:', err);
        console.error('[ActivityBudgetsTab] Error details:', err.message, err.code);
        setError(err.message || 'Failed to load budget data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activityId, defaultCurrency, generatedPeriods]);

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
      
      switch (granularity) {
        case 'quarterly':
          periodLabel = `Q${getQuarter(startDate)} ${getYear(startDate)}`;
          break;
        case 'monthly':
          periodLabel = format(startDate, 'MMM yyyy');
          break;
        case 'annual':
          periodLabel = format(startDate, 'yyyy');
          break;
      }
      
      // Use revised value if available, otherwise original
      const value = budget.type === 2 || !periodMap.has(periodLabel) 
        ? Number(budget.value) 
        : Math.max(periodMap.get(periodLabel) || 0, Number(budget.value));
      
      periodMap.set(periodLabel, value);
    });

    // Convert to array for charts
    const quarterlyData: ChartData[] = Array.from(periodMap.entries()).map(([period, value]) => ({
      period,
      value
    }));

    // Calculate cumulative data
    let cumulativeTotal = 0;
    const cumulativeData: ChartData[] = quarterlyData.map(item => {
      cumulativeTotal += item.value;
      return {
        period: item.period,
        value: item.value,
        total: cumulativeTotal
      };
    });

    return { quarterlyData, cumulativeData };
  }, [budgets, granularity]);

  // Auto-save budget field
  const saveBudgetField = useCallback(async (budget: ActivityBudget, field: keyof ActivityBudget) => {
    console.log('[ActivityBudgetsTab] Saving budget field:', field, 'for budget:', budget);
    
    // Mark as saving
    setBudgets(prev => prev.map(b => 
      b === budget ? { ...b, isSaving: true, hasError: false } : b
    ));

    try {
      const budgetData = {
        activity_id: budget.activity_id,
        type: budget.type,
        status: budget.status,
        period_start: budget.period_start,
        period_end: budget.period_end,
        value: budget.value,
        currency: budget.currency,
        value_date: budget.value_date,
      };

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

        // Update with the returned ID
        setBudgets(prev => prev.map(b => 
          b === budget ? { ...data, isSaving: false } : b
        ));
        return;
      }

      // Mark as saved
      setBudgets(prev => prev.map(b => 
        b === budget ? { ...b, isSaving: false } : b
      ));
    } catch (err) {
      console.error('Error saving budget:', err);
      setBudgets(prev => prev.map(b => 
        b === budget ? { ...b, isSaving: false, hasError: true } : b
      ));
    }
  }, []);

  // Update budget field with debounce
  const updateBudgetField = useCallback((index: number, field: keyof ActivityBudget, value: any) => {
    const budget = budgets[index];
    const updatedBudget = { ...budget, [field]: value };
    
    setBudgets(prev => {
      const updated = [...prev];
      updated[index] = updatedBudget;
      return updated;
    });

    // Auto-save after a short delay
    const timeoutId = setTimeout(() => {
      saveBudgetField(updatedBudget, field);
    }, 500);

    return () => clearTimeout(timeoutId);
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
    const budget = budgets[index];
    const newBudget: ActivityBudget = {
      ...budget,
      id: undefined,
      period_start: format(addMonths(parseISO(budget.period_start), 3), 'yyyy-MM-dd'),
      period_end: format(addMonths(parseISO(budget.period_end), 3), 'yyyy-MM-dd'),
    };

    setBudgets(prev => [...prev, newBudget]);
    
    // Save the new budget
    setTimeout(() => {
      saveBudgetField(newBudget, 'value');
    }, 100);
  }, [budgets, saveBudgetField]);

  // Duplicate Forward - creates next period based on granularity
  const duplicateForward = useCallback((index: number) => {
    const budget = budgets[index];
    const currentStart = parseISO(budget.period_start);
    const currentEnd = parseISO(budget.period_end);
    
    let nextPeriodStart: Date;
    let nextPeriodEnd: Date;
    
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
    }
    
    // Ensure period doesn't exceed 12 months
    const monthDiff = differenceInMonths(nextPeriodEnd, nextPeriodStart);
    if (monthDiff > 12) {
      nextPeriodEnd = addMonths(nextPeriodStart, 11);
      nextPeriodEnd = endOfMonth(nextPeriodEnd);
    }
    
    // Ensure period doesn't exceed project end date
    const projectEnd = parseISO(endDate);
    if (isAfter(nextPeriodEnd, projectEnd)) {
      nextPeriodEnd = projectEnd;
    }
    
    // Check if period is still valid
    if (!isBefore(nextPeriodStart, projectEnd)) {
      return; // Can't create period beyond project end
    }
    
    const nextPeriodStartStr = format(nextPeriodStart, 'yyyy-MM-dd');
    const nextPeriodEndStr = format(nextPeriodEnd, 'yyyy-MM-dd');
    
    // Check for overlaps with existing budgets
    const hasOverlap = budgets.some((b, i) => {
      if (i === index) return false; // Skip current budget
      const existingStart = parseISO(b.period_start);
      const existingEnd = parseISO(b.period_end);
      
      return (
        (nextPeriodStart >= existingStart && nextPeriodStart <= existingEnd) ||
        (nextPeriodEnd >= existingStart && nextPeriodEnd <= existingEnd) ||
        (nextPeriodStart <= existingStart && nextPeriodEnd >= existingEnd)
      );
    });
    
    if (hasOverlap) {
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
    
    // Insert after current row
    setBudgets(prev => {
      const updated = [...prev];
      updated.splice(index + 1, 0, newBudget);
      return updated;
    });
    
    // Auto-save the new budget
    setTimeout(() => {
      saveBudgetField(newBudget, 'value');
    }, 100);
  }, [budgets, granularity, endDate, saveBudgetField]);

  // Add custom budget period
  const addCustomPeriod = useCallback(() => {
    const lastBudget = budgets[budgets.length - 1];
    const startDate = lastBudget 
      ? format(addMonths(parseISO(lastBudget.period_end), 1), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd');
    
    const newBudget: ActivityBudget = {
      activity_id: activityId,
      type: 1,
      status: 1,
      period_start: startDate,
      period_end: format(addMonths(parseISO(startDate), 3), 'yyyy-MM-dd'),
      value: 0,
      currency: defaultCurrency,
      value_date: startDate,
    };

    setBudgets(prev => [...prev, newBudget]);
  }, [budgets, activityId, defaultCurrency]);

  // Save exception
  const saveException = useCallback(async () => {
    setSavingException(true);
    
    try {
      if (budgetNotProvided) {
        // Save or update exception
        const { error } = await supabase
          .from('activity_budget_exceptions')
          .upsert({
            activity_id: activityId,
            reason: exceptionReason,
          }, {
            onConflict: 'activity_id'
          });

        if (error) throw error;
      } else {
        // Delete exception if exists
        await supabase
          .from('activity_budget_exceptions')
          .delete()
          .eq('activity_id', activityId);
      }
    } catch (err) {
      console.error('Error saving exception:', err);
      setError('Failed to save budget exception');
    } finally {
      setSavingException(false);
    }
  }, [budgetNotProvided, exceptionReason, activityId]);

  // Handle granularity change
  const handleGranularityChange = useCallback((newGranularity: Granularity) => {
    if (!confirm('Changing granularity will regenerate the budget table. Any unsaved changes may be lost. Continue?')) {
      return;
    }

    setGranularity(newGranularity);
    
    // Regenerate budgets based on new granularity
    const newPeriods = generateBudgetPeriods(startDate, endDate, newGranularity);
    const newBudgets = newPeriods.map(period => ({
      activity_id: activityId,
      type: 1 as const,
      status: 1 as const,
      period_start: period.start,
      period_end: period.end,
      value: 0,
      currency: defaultCurrency,
      value_date: period.start,
    }));
    
    setBudgets(newBudgets);
  }, [startDate, endDate, activityId, defaultCurrency]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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



      {/* Budget not provided toggle */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <Label htmlFor="budget-not-provided" className="text-base font-medium">
            Budget not provided
          </Label>
          <Switch
            id="budget-not-provided"
            checked={budgetNotProvided}
            onCheckedChange={(checked) => {
              setBudgetNotProvided(checked);
              saveException();
            }}
          />
        </div>

        {budgetNotProvided && (
          <div className="space-y-2">
            <Label htmlFor="exception-reason">Reason</Label>
            <Textarea
              id="exception-reason"
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              onBlur={saveException}
              placeholder="Please explain why budget information is not provided..."
              className="min-h-24"
              disabled={savingException}
            />
            {savingException && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Budget table */}
      {!budgetNotProvided && (
        <div className="bg-white rounded-lg border">
          {/* Granularity switcher */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">View by:</span>
              <div className="flex gap-2">
                <Button
                  variant={granularity === 'quarterly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleGranularityChange('quarterly')}
                >
                  Quarterly
                </Button>
                <Button
                  variant={granularity === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleGranularityChange('monthly')}
                >
                  Monthly
                </Button>
                <Button
                  variant={granularity === 'annual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleGranularityChange('annual')}
                >
                  Annual
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period Start
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period End
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budgets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
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
                          onValueChange={(value) => updateBudgetField(index, 'type', parseInt(value) as 1 | 2)}
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
                          onValueChange={(value) => updateBudgetField(index, 'status', parseInt(value) as 1 | 2)}
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
                          onValueChange={(value) => updateBudgetField(index, 'currency', value)}
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
                          value={budget.value_date}
                          onChange={(e) => updateBudgetField(index, 'value_date', e.target.value)}
                          className="h-8 text-sm"
                        />
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
                          <button
                            type="button"
                            onClick={() => duplicateForward(index)}
                            className="text-sm underline cursor-pointer"
                          >
                            Duplicate Forward
                          </button>
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
      )}

      {/* Budget Charts */}
      {!budgetNotProvided && budgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <BudgetLineChart 
            title={`${granularity.charAt(0).toUpperCase() + granularity.slice(1)} Budget`}
            data={chartData.quarterlyData}
            dataKey="value"
            color="#3B82F6"
          />
          <BudgetLineChart 
            title="Cumulative Budget"
            data={chartData.cumulativeData}
            dataKey="total"
            color="#10B981"
          />
        </div>
      )}
    </div>
  );
} 