"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Clock, Pencil, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { differenceInDays, format, parseISO } from 'date-fns'

// Types
interface StaleActivity {
  id: string;
  title_narrative: string | null;
  iati_identifier: string | null;
  activity_status: string;
  reporting_org_name: string | null;
  reporting_org_acronym: string | null;
  last_transaction_date: string | null;
  last_transaction_type: string | null;
  last_transaction_value: number | null;
  last_transaction_currency: string | null;
  last_transaction_value_usd: number | null;
  days_since_transaction: number | null;
}

type SortField = 'title' | 'reporting_org' | 'last_transaction_date' | 'transaction_type' | 'value' | 'value_usd';
type SortDirection = 'asc' | 'desc';

// Configuration
const TIME_PERIOD_OPTIONS = [
  { value: '1', label: '1 Month', days: 30 },
  { value: '3', label: '3 Months', days: 90 },
  { value: '6', label: '6 Months', days: 180 },
  { value: '12', label: '12 Months', days: 365 },
];

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '11': 'Incoming Commitment',
  '12': 'Outgoing Pledge',
  '13': 'Incoming Pledge',
};

// Helper to format currency
const formatCurrency = (value: number | null, currency: string | null): string => {
  if (value == null) return '—';
  const safeCurrency = currency?.toUpperCase() || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${safeCurrency} ${value.toLocaleString()}`;
  }
};

// Main Component
export function StaleTransactionsTable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<StaleActivity[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('3'); // Default: 3 months
  const [sortField, setSortField] = useState<SortField>('last_transaction_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const router = useRouter();

  // Fetch data on mount
  useEffect(() => {
    fetchStaleActivities();
  }, []);

  const fetchStaleActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch ongoing activities (status = '2' = Implementation) with reporting org fields
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, title_narrative, iati_identifier, activity_status, created_by_org_name, created_by_org_acronym')
        .eq('activity_status', '2');

      if (activitiesError) throw activitiesError;

      if (!activitiesData || activitiesData.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const activityIds = activitiesData.map(a => a.id);

      // 2. Fetch all transactions for those activities
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('activity_id, transaction_date, transaction_type, value, currency, value_usd')
        .in('activity_id', activityIds)
        .order('transaction_date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // 3. Find the latest transaction for each activity
      const latestTransactionByActivity = new Map<string, any>();
      (transactionsData || []).forEach(tx => {
        if (!latestTransactionByActivity.has(tx.activity_id)) {
          latestTransactionByActivity.set(tx.activity_id, tx);
        }
      });

      // 4. Build the stale activities list
      const now = new Date();
      const staleActivities: StaleActivity[] = activitiesData.map(activity => {
        const latestTx = latestTransactionByActivity.get(activity.id);
        const daysSince = latestTx?.transaction_date
          ? differenceInDays(now, new Date(latestTx.transaction_date))
          : null;

        return {
          id: activity.id,
          title_narrative: activity.title_narrative,
          iati_identifier: activity.iati_identifier,
          activity_status: activity.activity_status,
          reporting_org_name: activity.created_by_org_name || null,
          reporting_org_acronym: activity.created_by_org_acronym || null,
          last_transaction_date: latestTx?.transaction_date || null,
          last_transaction_type: latestTx?.transaction_type || null,
          last_transaction_value: latestTx?.value || null,
          last_transaction_currency: latestTx?.currency || null,
          last_transaction_value_usd: latestTx?.value_usd || null,
          days_since_transaction: daysSince,
        };
      });

      setActivities(staleActivities);
    } catch (err: any) {
      console.error('[StaleTransactionsTable] Error:', err);
      setError(err.message || 'Failed to fetch activity data');
    } finally {
      setLoading(false);
    }
  };

  // Filter activities based on selected time period
  const filteredActivities = useMemo(() => {
    const periodOption = TIME_PERIOD_OPTIONS.find(opt => opt.value === selectedPeriod);
    const thresholdDays = periodOption?.days || 90;

    return activities.filter(activity => {
      // Include if no transaction at all
      if (activity.days_since_transaction === null) return true;
      // Include if last transaction is older than threshold
      return activity.days_since_transaction > thresholdDays;
    });
  }, [activities, selectedPeriod]);

  // Sort activities
  const sortedActivities = useMemo(() => {
    return [...filteredActivities].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = (a.title_narrative || '').localeCompare(b.title_narrative || '');
          break;
        case 'reporting_org':
          comparison = (a.reporting_org_name || '').localeCompare(b.reporting_org_name || '');
          break;
        case 'last_transaction_date':
          // Null dates should be at the top (most urgent)
          if (a.last_transaction_date === null && b.last_transaction_date === null) comparison = 0;
          else if (a.last_transaction_date === null) comparison = -1;
          else if (b.last_transaction_date === null) comparison = 1;
          else comparison = new Date(a.last_transaction_date).getTime() - new Date(b.last_transaction_date).getTime();
          break;
        case 'transaction_type':
          comparison = (a.last_transaction_type || '').localeCompare(b.last_transaction_type || '');
          break;
        case 'value':
          comparison = (a.last_transaction_value || 0) - (b.last_transaction_value || 0);
          break;
        case 'value_usd':
          comparison = (a.last_transaction_value_usd || 0) - (b.last_transaction_value_usd || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredActivities, sortField, sortDirection]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const periodLabel = TIME_PERIOD_OPTIONS.find(o => o.value === selectedPeriod)?.label || '';
    const headers = [
      'Activity Title',
      'IATI Identifier',
      'Reporting Organisation',
      'Last Transaction Date',
      'Days Since Transaction',
      'Transaction Type',
      'Original Currency',
      'Original Amount',
      'USD Amount'
    ];

    const rows = sortedActivities.map(activity => [
      activity.title_narrative || 'Untitled',
      activity.iati_identifier || '',
      activity.reporting_org_acronym 
        ? `${activity.reporting_org_acronym} - ${activity.reporting_org_name}`
        : activity.reporting_org_name || '',
      activity.last_transaction_date || 'No transactions',
      activity.days_since_transaction?.toString() || 'N/A',
      activity.last_transaction_type 
        ? TRANSACTION_TYPE_LABELS[activity.last_transaction_type] || activity.last_transaction_type
        : '',
      activity.last_transaction_currency || '',
      activity.last_transaction_value?.toString() || '',
      activity.last_transaction_value_usd?.toString() || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stale-transactions-${periodLabel.replace(' ', '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Loading state
  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Clock className="h-5 w-5" />
            Activities Without Recent Transactions
          </CardTitle>
          <CardDescription>
            Ongoing activities that may need transaction updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Clock className="h-5 w-5" />
            Activities Without Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">Failed to load data</p>
              <p className="text-sm text-slate-500 mt-2">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Clock className="h-5 w-5" />
              Activities Without Recent Transactions
            </CardTitle>
            <CardDescription>
              Ongoing activities that haven't had a transaction in the selected time period
            </CardDescription>
          </div>
          {filteredActivities.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Time Period Filter */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">No transaction in:</span>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIOD_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Empty state */}
        {filteredActivities.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] bg-slate-50 rounded-lg">
            <div className="text-center">
              <Clock className="h-12 w-12 text-green-400 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">All caught up!</p>
              <p className="text-sm text-slate-500 mt-2">
                All ongoing activities have transactions within the last {TIME_PERIOD_OPTIONS.find(o => o.value === selectedPeriod)?.label.toLowerCase()}
              </p>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead
                    className="min-w-[250px] cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Activity
                      <SortIcon field="title" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="min-w-[180px] cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('reporting_org')}
                  >
                    <div className="flex items-center">
                      Reporting Organisation
                      <SortIcon field="reporting_org" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('last_transaction_date')}
                  >
                    <div className="flex items-center">
                      Last Transaction
                      <SortIcon field="last_transaction_date" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('transaction_type')}
                  >
                    <div className="flex items-center">
                      Type
                      <SortIcon field="transaction_type" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('value')}
                  >
                    <div className="flex items-center justify-end">
                      Original Amount
                      <SortIcon field="value" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('value_usd')}
                  >
                    <div className="flex items-center justify-end">
                      USD Amount
                      <SortIcon field="value_usd" />
                    </div>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedActivities.slice(0, 100).map((activity) => (
                  <TableRow key={activity.id} className="hover:bg-muted/50">
                    <TableCell>
                      <span className="font-medium line-clamp-2">
                        {activity.title_narrative || 'Untitled'}
                      </span>
                      {activity.iati_identifier && (
                        <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded inline-block mt-1">
                          {activity.iati_identifier}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {activity.reporting_org_name ? (
                        <div className="min-w-[150px]">
                          {activity.reporting_org_acronym && (
                            <span className="font-medium text-slate-700">
                              {activity.reporting_org_acronym}
                            </span>
                          )}
                          <span className="block text-xs text-slate-500 break-words">
                            {activity.reporting_org_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {activity.last_transaction_date ? (
                        <div>
                          <span className="text-slate-700">
                            {format(parseISO(activity.last_transaction_date), 'MMM d, yyyy')}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {activity.days_since_transaction} days ago
                          </span>
                        </div>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          No transactions
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {activity.last_transaction_type
                        ? TRANSACTION_TYPE_LABELS[activity.last_transaction_type] || activity.last_transaction_type
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right text-slate-700">
                      {formatCurrency(activity.last_transaction_value, activity.last_transaction_currency)}
                    </TableCell>
                    <TableCell className="text-right text-slate-700">
                      {formatCurrency(activity.last_transaction_value_usd, 'USD')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/activities/new?id=${activity.id}&section=finances`)}
                        title="Edit transactions"
                      >
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {sortedActivities.length > 100 && (
              <div className="p-3 text-center text-sm text-slate-500 border-t">
                Showing 100 of {sortedActivities.length} activities
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



