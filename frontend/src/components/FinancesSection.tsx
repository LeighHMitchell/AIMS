"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wallet, CheckCircle } from "lucide-react";
import TransactionsManager from "@/components/TransactionsManager";
import { Transaction } from "@/types/transaction";
import LinkedTransactionsEditorTab from "@/components/activities/LinkedTransactionsEditorTab";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { categorizeTransactionType } from "@/utils/transactionTypes";
import { DefaultAidTypeSelect } from "@/components/forms/DefaultAidTypeSelect";
import { DefaultFinanceTypeSelect } from "@/components/forms/DefaultFinanceTypeSelect";
import { FlowTypeSelect } from "@/components/forms/FlowTypeSelect";
import { CurrencySelector } from "@/components/forms/CurrencySelector";
import { TiedStatusSelect } from "@/components/forms/TiedStatusSelect";
import { Label } from "@/components/ui/label";
import { FinancialSummaryCards } from "@/components/FinancialSummaryCards";
import { SupabaseFieldsTest } from "@/components/forms/SupabaseFieldsTest";
import { DefaultFieldsAutosave } from '@/components/forms/DefaultFieldsAutosave';
import { useUser } from '@/hooks/useUser';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import { Loader2 } from 'lucide-react';
import { areAllDefaultFieldsCompleted } from '@/utils/defaultFieldsValidation';

interface FinancesSectionProps {
  activityId?: string;
  activityTitle?: string;
  transactions?: Transaction[];
  onTransactionsChange?: (transactions: Transaction[]) => void;
  onRefreshTransactions?: () => Promise<void>;
  defaultFinanceType?: string;
  defaultAidType?: string;
  defaultFlowType?: string;
  defaultCurrency?: string;
  defaultTiedStatus?: string;
  defaultDisbursementChannel?: string;
  onDefaultsChange?: (field: string, value: string) => void;
  defaults?: {
    default_modality?: string;
    default_aid_modality?: string;
  };
  tabCompletionStatus?: Record<string, { isComplete: boolean }>;
}

// Hero Card Component
interface HeroCardProps {
  title: string;
  value: string;
  subtitle: string;
}

const HeroCard: React.FC<HeroCardProps> = ({ title, value, subtitle }) => {
  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
    </div>
  );
};

// Transaction Trend Chart Component
interface TransactionTrendChartProps {
  data: any[];
  transactions: Transaction[];
  aggregationMode: 'quarter' | 'year';
  currencyMode: 'original' | 'usd';
}

const TransactionTrendChart: React.FC<TransactionTrendChartProps> = ({ data, transactions, aggregationMode, currencyMode }) => {
  // Recalculate data based on aggregation mode
  const chartData = useMemo(() => {
    const transactionsByPeriod = new Map<string, {
      commitment: number;
      disbursement: number;
      expenditure: number;
      incoming: number;
    }>();
    
    // Sort transactions by date first
    const sortedTransactions = [...transactions]
      .filter(t => t.transaction_date)
      .sort((a, b) => {
        const dateA = new Date(a.transaction_date || 0);
        const dateB = new Date(b.transaction_date || 0);
        return dateA.getTime() - dateB.getTime();
      });
    
    sortedTransactions.forEach(tx => {
      const date = new Date(tx.transaction_date || 0);
      if (isNaN(date.getTime())) return;
      
      // Get period key based on aggregation mode
      let periodKey: string;
      if (aggregationMode === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKey = `Q${quarter} ${date.getFullYear()}`;
      } else {
        periodKey = date.getFullYear().toString();
      }
      
      const value = currencyMode === 'usd' && tx.value_usd != null ? tx.value_usd : (parseFloat(tx.value?.toString() || '0') || 0);
      const category = categorizeTransactionType(tx.transaction_type);
      
      // Initialize period if not exists
      if (!transactionsByPeriod.has(periodKey)) {
        transactionsByPeriod.set(periodKey, {
          commitment: 0,
          disbursement: 0,
          expenditure: 0,
          incoming: 0
        });
      }
      
      const periodData = transactionsByPeriod.get(periodKey)!;
      
      switch (category) {
        case 'commitment':
          periodData.commitment += value;
          break;
        case 'disbursement':
          periodData.disbursement += value;
          break;
        case 'expenditure':
          periodData.expenditure += value;
          break;
        case 'incoming':
          periodData.incoming += value;
          break;
      }
    });
    
    // Convert to array format for charts
    return Array.from(transactionsByPeriod.entries())
      .sort((a, b) => {
        if (aggregationMode === 'quarter') {
          // Sort by year and quarter
          const [qA, yearA] = a[0].split(' ');
          const [qB, yearB] = b[0].split(' ');
          if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
          return parseInt(qA.substring(1)) - parseInt(qB.substring(1));
        } else {
          // Sort by year
          return parseInt(a[0]) - parseInt(b[0]);
        }
      })
      .map(([period, data]) => ({
        period,
        ...data
      }));
  }, [transactions, aggregationMode, currencyMode]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Transactions Over Time</CardTitle>
          {/* Remove aggregation toggle buttons from here */}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="period" 
              stroke="#64748b"
              fontSize={12}
            />
            <YAxis 
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              stroke="#64748b"
              fontSize={12}
            />
            <RechartsTooltip 
              formatter={(value: any) => `$${new Intl.NumberFormat().format(value)}`}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Bar dataKey="commitment" fill="#64748b" name="Commitment" />
            <Bar dataKey="disbursement" fill="#1d4ed8" name="Disbursement" />
            <Bar dataKey="expenditure" fill="#475569" name="Expenditure" />
            <Bar dataKey="incoming" fill="#334155" name="Incoming Funds" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Cumulative Disbursement Chart Component
interface CumulativeDisbursementChartProps {
  data: any[];
  aggregationMode: 'quarter' | 'year';
  currencyMode: 'original' | 'usd';
}

const CumulativeDisbursementChart: React.FC<CumulativeDisbursementChartProps> = ({ data, aggregationMode, currencyMode }) => {
  // Recalculate data based on aggregation mode
  const chartData = useMemo(() => {
    const transactionsByPeriod = new Map<string, {
      cumulativeDisbursement: number;
      cumulativeExpenditure: number;
    }>();
    
    // Sort transactions by date first
    const sortedTransactions = [...data]
      .filter(t => t.period) // Assuming data is already grouped by period
      .sort((a, b) => {
        const dateA = new Date(a.period.split(' ')[1]); // Extract year from period
        const dateB = new Date(b.period.split(' ')[1]); // Extract year from period
        return dateA.getTime() - dateB.getTime();
      });
    
    sortedTransactions.forEach(item => {
      const periodKey = item.period;
      const date = new Date(periodKey.split(' ')[1]); // Extract year from period
      if (isNaN(date.getTime())) return;
      
      // Get period key based on aggregation mode
      let periodKeyForChart: string;
      if (aggregationMode === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKeyForChart = `Q${quarter} ${date.getFullYear()}`;
      } else {
        periodKeyForChart = date.getFullYear().toString();
      }
      
      // Initialize period if not exists
      if (!transactionsByPeriod.has(periodKeyForChart)) {
        transactionsByPeriod.set(periodKeyForChart, {
          cumulativeDisbursement: 0,
          cumulativeExpenditure: 0
        });
      }
      
      const periodData = transactionsByPeriod.get(periodKeyForChart)!;
      
      periodData.cumulativeDisbursement += item.cumulativeDisbursement;
      periodData.cumulativeExpenditure += item.cumulativeExpenditure;
    });
    
    // Convert to array format for charts
    return Array.from(transactionsByPeriod.entries())
      .sort((a, b) => {
        if (aggregationMode === 'quarter') {
          // Sort by year and quarter
          const [qA, yearA] = a[0].split(' ');
          const [qB, yearB] = b[0].split(' ');
          if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
          return parseInt(qA.substring(1)) - parseInt(qB.substring(1));
        } else {
          // Sort by year
          return parseInt(a[0]) - parseInt(b[0]);
        }
      })
      .map(([period, data]) => ({
        period,
        ...data
      }));
  }, [data, aggregationMode]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Cumulative Disbursement</CardTitle>
          {/* Remove aggregation toggle buttons from here */}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="period" 
              stroke="#64748b"
              fontSize={12}
            />
            <YAxis 
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              stroke="#64748b"
              fontSize={12}
            />
            <RechartsTooltip 
              formatter={(value: any) => `$${new Intl.NumberFormat().format(value)}`}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="cumulativeDisbursement" 
              stroke="#1d4ed8" 
              strokeWidth={3}
              name="Total Disbursed" 
            />
            <Line 
              type="monotone" 
              dataKey="cumulativeExpenditure" 
              stroke="#64748b" 
              strokeWidth={3}
              name="Total Spent" 
              strokeDasharray="5 5" 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default function FinancesSection({ 
  activityId = "new", 
  activityTitle,
  transactions = [], 
  onTransactionsChange = () => {},
  onRefreshTransactions,
  defaultFinanceType,
  defaultAidType,
  defaultFlowType,
  defaultCurrency,
  defaultTiedStatus,
  defaultDisbursementChannel,
  onDefaultsChange = () => {},
  defaults,
  tabCompletionStatus
}: FinancesSectionProps) {
  const [tab, setTab] = useState("transactions");
  const { user } = useUser();
  const [currencyMode, setCurrencyMode] = useState<'original' | 'usd'>('original');
  const [aggregationMode, setAggregationMode] = useState<'quarter' | 'year'>('quarter');
  const [chartData, setChartData] = useState<{ trendData: any[]; cumulativeData: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if all default fields are completed (include fallback for currency)
  const allDefaultsCompleted = areAllDefaultFieldsCompleted({
    defaultAidType,
    defaultFinanceType,
    defaultFlowType,
    defaultCurrency: defaultCurrency || 'USD', // Use fallback like the UI does
    defaultTiedStatus,
    default_aid_modality: defaults?.default_aid_modality,
    defaultDisbursementChannel: defaults?.defaultDisbursementChannel || defaultDisbursementChannel,
  });
  
  // Debug log to check values (include fallback for currency)
  console.log('[FinancesSection] Default fields check:', {
    defaultAidType,
    defaultFinanceType,
    defaultFlowType,
    defaultCurrency: defaultCurrency || 'USD',
    defaultTiedStatus,
    default_aid_modality: defaults?.default_aid_modality,
    defaultDisbursementChannel: defaults?.defaultDisbursementChannel || defaultDisbursementChannel,
    allDefaultsCompleted
  });

  // Helper function to safely format dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return "";
    }
  };

  // Helper to get period key based on aggregation mode
  const getPeriodKey = useCallback((date: Date) => {
    if (aggregationMode === 'quarter') {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    } else {
      return date.getFullYear().toString();
    }
  }, [aggregationMode]);

  // Calculate hero card data
  const heroCardData = useMemo(() => {
    const totalDisbursed = transactions
      .filter(t => categorizeTransactionType(t.transaction_type) === 'disbursement')
      .reduce((sum, t) => {
        const value = parseFloat(t.value_usd?.toString() || '0') || 0;
        return sum + (value > 0 ? value : 0);
      }, 0);
    
    const totalExpenditure = transactions
      .filter(t => categorizeTransactionType(t.transaction_type) === 'expenditure')
      .reduce((sum, t) => {
        const value = parseFloat(t.value_usd?.toString() || '0') || 0;
        return sum + (value > 0 ? value : 0);
      }, 0);
    
    const totalCommitment = transactions
      .filter(t => categorizeTransactionType(t.transaction_type) === 'commitment')
      .reduce((sum, t) => {
        let value = parseFloat(t.value_usd?.toString() || '0') || 0;
        
        // FIXED: If transaction is in USD but value_usd is missing, use the original value
        if (!value && t.currency === 'USD' && t.value && Number(t.value) > 0) {
          value = parseFloat(t.value.toString()) || 0;
        }
        
        return sum + (value > 0 ? value : 0);
      }, 0);
    
    const outstandingCommitments = totalCommitment - totalDisbursed;
    
    const mostRecentDate = transactions
      .map(t => new Date(t.transaction_date || 0))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    
    return {
      totalDisbursed,
      totalExpenditure,
      outstandingCommitments,
      mostRecentDate: mostRecentDate ? formatDate(mostRecentDate.toISOString()) : 'No transactions'
    };
  }, [transactions]);

  // Calculate chart data
  const chartDataMemo = useMemo(() => {
    // Group transactions by quarter
    const transactionsByPeriod = new Map<string, {
      commitment: number;
      disbursement: number;
      expenditure: number;
      incoming: number;
    }>();
    
    // Sort transactions by date first
    const sortedTransactions = [...transactions]
      .filter(t => t.transaction_date)
      .sort((a, b) => {
        const dateA = new Date(a.transaction_date || 0);
        const dateB = new Date(b.transaction_date || 0);
        return dateA.getTime() - dateB.getTime();
      });
    
    sortedTransactions.forEach(tx => {
      const date = new Date(tx.transaction_date || 0);
      if (isNaN(date.getTime())) return;
      // Get period key based on aggregation mode
      const periodKey = getPeriodKey(date);
      // Use value_usd from backend when in USD mode, otherwise use original value
      const value = currencyMode === 'usd' && tx.value_usd != null ? tx.value_usd : (parseFloat(tx.value?.toString() || '0') || 0);
      const category = categorizeTransactionType(tx.transaction_type);
      // Initialize period if not exists
      if (!transactionsByPeriod.has(periodKey)) {
        transactionsByPeriod.set(periodKey, {
          commitment: 0,
          disbursement: 0,
          expenditure: 0,
          incoming: 0
        });
      }
      const periodData = transactionsByPeriod.get(periodKey)!;
      switch (category) {
        case 'commitment':
          periodData.commitment += value;
          break;
        case 'disbursement':
          periodData.disbursement += value;
          break;
        case 'expenditure':
          periodData.expenditure += value;
          break;
        case 'incoming':
          periodData.incoming += value;
          break;
      }
    });
    
    // Convert to array format for charts
    const trendData = Array.from(transactionsByPeriod.entries())
      .sort((a, b) => {
        // Sort by year and quarter
        const [qA, yearA] = a[0].split(' ');
        const [qB, yearB] = b[0].split(' ');
        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
        return parseInt(qA.substring(1)) - parseInt(qB.substring(1));
      })
      .map(([period, data]) => ({
        period,
        ...data
      }));
    
    // Generate cumulative data
    let runningDisbursement = 0;
    let runningExpenditure = 0;
    
    const cumulativeChartData = trendData.map(item => {
      runningDisbursement += item.disbursement;
      runningExpenditure += item.expenditure;
      
      return {
        period: item.period,
        cumulativeDisbursement: runningDisbursement,
        cumulativeExpenditure: runningExpenditure
      };
    });
    
    return {
      trendData,
      cumulativeData: cumulativeChartData
    };
  }, [transactions, aggregationMode, getPeriodKey, currencyMode]);

  // Prepare USD chart data asynchronously
  useEffect(() => {
    let cancelled = false;
    async function convertAllToUSD() {
      setLoading(true);
      setError(null);
      try {
        // Group transactions by period (quarter/year) and convert each value to USD
        const txs = transactions.filter(t => t.transaction_date && t.value && t.currency);
        const periodMap: Record<string, { commitment: number; disbursement: number; expenditure: number; incoming: number }> = {};
        const cumPeriods: string[] = [];
        let runningDisbursement = 0;
        let runningExpenditure = 0;
        for (const tx of txs) {
          const date = new Date(tx.transaction_date);
          if (isNaN(date.getTime())) continue;
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          const periodKey = `Q${quarter} ${date.getFullYear()}`;
          if (!periodMap[periodKey]) {
            periodMap[periodKey] = { commitment: 0, disbursement: 0, expenditure: 0, incoming: 0 };
            cumPeriods.push(periodKey);
          }
          const category = categorizeTransactionType(tx.transaction_type);
          // Convert to USD
          const result = await fixedCurrencyConverter.convertToUSD(tx.value, tx.currency, date);
          if (!result.success || !result.usd_amount) continue;
          switch (category) {
            case 'commitment':
              periodMap[periodKey].commitment += result.usd_amount;
              break;
            case 'disbursement':
              periodMap[periodKey].disbursement += result.usd_amount;
              break;
            case 'expenditure':
              periodMap[periodKey].expenditure += result.usd_amount;
              break;
            case 'incoming':
              periodMap[periodKey].incoming += result.usd_amount;
              break;
          }
        }
        // Prepare trend data
        const trendData = cumPeriods.map(period => ({ period, ...periodMap[period] }));
        // Prepare cumulative data
        const cumulativeData = trendData.map(item => {
          runningDisbursement += item.disbursement;
          runningExpenditure += item.expenditure;
          return {
            period: item.period,
            cumulativeDisbursement: runningDisbursement,
            cumulativeExpenditure: runningExpenditure
          };
        });
        if (!cancelled) setChartData({ trendData, cumulativeData });
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to convert chart data to USD');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (currencyMode === 'usd') {
      convertAllToUSD();
    }
    return () => { cancelled = true; };
  }, [transactions, currencyMode]);

  // Helper for dynamic Y-axis domain and tick formatting
  function getYAxisProps(data: any[], keys: string[], currency: string) {
    const allValues = data.flatMap(d => keys.map(k => d[k] || 0));
    const max = Math.max(...allValues, 0);
    const min = Math.min(...allValues, 0);
    let domain = [0, Math.ceil(max * 1.1)];
    let tickFormatter = (v: number) => {
      if (max < 10000) return `${currency === 'USD' ? '$' : ''}${v.toLocaleString()}`;
      return `${currency === 'USD' ? '$' : ''}${(v / 1000).toFixed(0)}k`;
    };
    return { domain, tickFormatter };
  }

  return (
    <div className="max-w-6xl">
      {/* Financial Summary Cards - New unified component */}
      {activityId && activityId !== "new" && (
        <FinancialSummaryCards activityId={activityId} className="mb-6" />
      )}

      <div className="flex items-center gap-2 mt-6 mb-4">
        <Wallet className="w-5 h-5 text-muted-foreground" />
        <span className="text-lg font-semibold text-muted-foreground">Finances</span>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="linked-transactions">Linked Transactions</TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            Defaults
            {/* Show checkmark if all default fields are completed */}
            {allDefaultsCompleted && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <TransactionsManager 
            activityId={activityId}
            transactions={transactions}
            onTransactionsChange={onTransactionsChange}
            onRefreshNeeded={onRefreshTransactions}
            defaultFinanceType={defaultFinanceType}
            defaultAidType={defaultAidType}
            defaultCurrency={defaultCurrency}
            defaultTiedStatus={defaultTiedStatus}
            defaultFlowType={defaultFlowType}
            defaultDisbursementChannel={defaultDisbursementChannel}
          />
          {/* Move toggles here: below transaction list, above charts */}
          <div className="flex flex-wrap gap-4 items-center mb-4 mt-4">
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
              variant={aggregationMode === 'quarter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAggregationMode('quarter')}
            >
              By Quarter
            </Button>
            <Button
              variant={aggregationMode === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAggregationMode('year')}
            >
              By Calendar Year
            </Button>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
            {error && <span className="text-red-500 text-xs ml-2">{error}</span>}
          </div>
          {/* Dual Charts Section */}
          {transactions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Transactions Over Time Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Transactions Over Time</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartDataMemo.trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="period" 
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <YAxis 
                        {...getYAxisProps(chartDataMemo.trendData, ['commitment','disbursement','expenditure','incoming'], currencyMode === 'usd' ? 'USD' : (defaultCurrency || 'USD'))}
                        stroke="#64748b"
                        fontSize={12}
                        label={{
                          value: `Amount (${currencyMode === 'usd' ? 'USD' : (defaultCurrency || 'Original')})`,
                          angle: -90,
                          position: 'insideLeft',
                          offset: 10,
                          style: { textAnchor: 'middle', fill: '#64748b', fontSize: 13 }
                        }}
                      />
                      <RechartsTooltip 
                        formatter={(value, name, props) => {
                          const tx = props?.payload?.originalTx;
                          if (!tx) return [`${currencyMode === 'usd' ? '$' : ''}${value}`];
                          const orig = `${tx.value} ${tx.currency}`;
                          const usd = tx.value_usd ? `$${Number(tx.value_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
                          const rate = tx.exchange_rate_used ? `@ ${tx.exchange_rate_used}` : '';
                          const date = tx.value_date || tx.transaction_date || '';
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
                      <Legend formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                      <Bar dataKey="commitment" fill="#64748b" name="Commitment" />
                      <Bar dataKey="disbursement" fill="#1d4ed8" name="Disbursement" />
                      <Bar dataKey="expenditure" fill="#475569" name="Expenditure" />
                      <Bar dataKey="incoming" fill="#334155" name="Incoming Funds" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              {/* Cumulative Disbursement Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cumulative Disbursement</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartDataMemo.cumulativeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="period" 
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <YAxis 
                        {...getYAxisProps(chartDataMemo.cumulativeData, ['cumulativeDisbursement','cumulativeExpenditure'], currencyMode === 'usd' ? 'USD' : (defaultCurrency || 'USD'))}
                        stroke="#64748b"
                        fontSize={12}
                        label={{
                          value: `Amount (${currencyMode === 'usd' ? 'USD' : (defaultCurrency || 'Original')})`,
                          angle: -90,
                          position: 'insideLeft',
                          offset: 10,
                          style: { textAnchor: 'middle', fill: '#64748b', fontSize: 13 }
                        }}
                      />
                      <RechartsTooltip 
                        formatter={(value: any) => `${currencyMode === 'usd' ? '$' : ''}${new Intl.NumberFormat().format(value)}`}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px'
                        }}
                      />
                      <Legend formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                      <Line 
                        type="monotone" 
                        dataKey="cumulativeDisbursement" 
                        stroke="#1d4ed8" 
                        strokeWidth={3}
                        name="Total Disbursed" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulativeExpenditure" 
                        stroke="#64748b" 
                        strokeWidth={3}
                        name="Total Spent" 
                        strokeDasharray="5 5" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Linked Transactions Tab */}
        <TabsContent value="linked-transactions">
          <LinkedTransactionsEditorTab 
            activityId={activityId}
          />
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults">
          <div className="space-y-6">
            <DefaultFieldsAutosave
              activityId={activityId}
              userId={user?.id || ''}
              defaults={{
                defaultAidType,
                defaultFinanceType,
                defaultFlowType,
                defaultCurrency,
                defaultTiedStatus,
                defaultDisbursementChannel,
              }}
              onDefaultsChange={onDefaultsChange}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 