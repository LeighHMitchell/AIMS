'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { DollarSign, Download, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, ArrowRight, X, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { OrganizationLogo } from '@/components/ui/organization-logo';
import { exportToCSV } from '@/lib/csv-export';
import { TRANSACTION_TYPE_LABELS } from '@/types/transaction';
import { apiFetch } from '@/lib/api-fetch';

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

// Simple Hero Card Component
interface HeroCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon?: React.ReactNode;
}

function HeroCard({ title, value, subtitle, icon }: HeroCardProps) {
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
interface OrganizationTransaction {
  uuid: string;
  activity_id: string;
  activity_title: string;
  activity_acronym?: string | null;
  transaction_type: string;
  transaction_date: string;
  value: number;
  currency: string;
  value_usd?: number | null;
  value_date?: string;
  description?: string;
  provider_org_id?: string;
  provider_org_name?: string;
  provider_org_acronym?: string | null;
  provider_org_logo?: string | null;
  receiver_org_id?: string;
  receiver_org_name?: string;
  receiver_org_acronym?: string | null;
  receiver_org_logo?: string | null;
  finance_type?: string;
  status?: string;
}

interface OrganizationTransactionsTabProps {
  organizationId: string;
  defaultCurrency?: string;
}

// Helper function to safely format dates
const safeFormatDate = (dateStr: string | null | undefined, formatStr: string, fallback: string = '-'): string => {
  if (!dateStr) return fallback;
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? format(parsed, formatStr) : fallback;
  } catch {
    return fallback;
  }
};

// Get transaction type label
const getTransactionTypeLabel = (type: string): string => {
  return TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] || `Type ${type}`;
};

// Plural labels for hero cards
const TRANSACTION_TYPE_LABELS_PLURAL: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitments',
  '3': 'Disbursements',
  '4': 'Expenditures',
  '5': 'Interest Payments',
  '6': 'Loan Repayments',
  '7': 'Reimbursements',
  '8': 'Equity Purchases',
  '9': 'Equity Sales',
  '10': 'Credit Guarantees',
  '11': 'Incoming Commitments',
  '12': 'Outgoing Pledges',
  '13': 'Incoming Pledges'
};

const getTransactionTypeLabelPlural = (type: string): string => {
  return TRANSACTION_TYPE_LABELS_PLURAL[type] || `Type ${type}`;
};

export function OrganizationTransactionsTab({ organizationId, defaultCurrency = 'USD' }: OrganizationTransactionsTabProps) {
  const [transactions, setTransactions] = useState<OrganizationTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>('transaction_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Grouped view
  const [groupedView, setGroupedView] = useState(false);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetch(`/api/organizations/${organizationId}/transactions`);
        const data = await response.json();
        if (!response.ok) {
          console.error('API error:', data);
          throw new Error(data?.error || 'Failed to fetch transactions');
        }
        setTransactions(data || []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchTransactions();
    }
  }, [organizationId]);

  // Get unique transaction types for filter
  const transactionTypes = useMemo(() => {
    const types = new Set(transactions.map(t => t.transaction_type));
    return Array.from(types).sort();
  }, [transactions]);

  // Get unique activities for filter dropdown
  const uniqueActivities = useMemo(() => {
    const activityMap = new Map<string, { id: string; title: string; acronym?: string | null }>();
    transactions.forEach(t => {
      if (!activityMap.has(t.activity_id)) {
        activityMap.set(t.activity_id, {
          id: t.activity_id,
          title: t.activity_title,
          acronym: t.activity_acronym
        });
      }
    });
    return Array.from(activityMap.values()).sort((a, b) =>
      (a.title || '').localeCompare(b.title || '')
    );
  }, [transactions]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
      if (activityFilter !== 'all' && t.activity_id !== activityFilter) return false;
      return true;
    });
  }, [transactions, typeFilter, activityFilter]);

  // Apply sorting
  const sortedTransactions = useMemo(() => {
    if (!sortColumn) return filteredTransactions;

    return [...filteredTransactions].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      switch (sortColumn) {
        case 'activity':
          return direction * (a.activity_title || '').localeCompare(b.activity_title || '');
        case 'transaction_date':
          return direction * ((a.transaction_date || '').localeCompare(b.transaction_date || ''));
        case 'transaction_type':
          return direction * ((a.transaction_type || '').localeCompare(b.transaction_type || ''));
        case 'provider':
          return direction * ((a.provider_org_name || '').localeCompare(b.provider_org_name || ''));
        case 'value':
          return direction * ((a.value || 0) - (b.value || 0));
        case 'value_date':
          return direction * ((a.value_date || '').localeCompare(b.value_date || ''));
        case 'value_usd':
          return direction * ((a.value_usd || 0) - (b.value_usd || 0));
        default:
          return 0;
      }
    });
  }, [filteredTransactions, sortColumn, sortDirection]);

  // Group transactions by activity for grouped view
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { activity: { id: string; title: string; acronym?: string | null }; transactions: OrganizationTransaction[]; total: number }> = {};
    sortedTransactions.forEach(t => {
      const activityId = t.activity_id;
      if (!groups[activityId]) {
        groups[activityId] = {
          activity: { id: activityId, title: t.activity_title, acronym: t.activity_acronym },
          transactions: [],
          total: 0
        };
      }
      groups[activityId].transactions.push(t);
      groups[activityId].total += t.value_usd || 0;
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [sortedTransactions]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

  // Calculate summary stats by transaction type
  const summaryByType = useMemo(() => {
    const summary: Record<string, { count: number; total: number }> = {};
    filteredTransactions.forEach(t => {
      const type = t.transaction_type;
      if (!summary[type]) {
        summary[type] = { count: 0, total: 0 };
      }
      summary[type].count++;
      summary[type].total += t.value_usd || 0;
    });
    return summary;
  }, [filteredTransactions]);

  // Total USD value
  const totalUSD = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + (t.value_usd || 0), 0);
  }, [filteredTransactions]);

  // Active days (unique transaction dates)
  const activeDays = useMemo(() => {
    const uniqueDates = new Set(
      filteredTransactions
        .map(t => t.transaction_date?.split('T')[0])
        .filter(Boolean)
    );
    return uniqueDates.size;
  }, [filteredTransactions]);

  // Average transactions per active day
  const avgPerDay = useMemo(() => {
    return activeDays > 0 ? filteredTransactions.length / activeDays : 0;
  }, [filteredTransactions.length, activeDays]);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Handle export
  const handleExport = () => {
    const exportData = sortedTransactions.map(t => ({
      Activity: t.activity_title,
      'Activity Acronym': t.activity_acronym || '',
      Date: t.transaction_date,
      Type: getTransactionTypeLabel(t.transaction_type),
      'Type Code': t.transaction_type,
      'Provider Organization': t.provider_org_name || '',
      'Receiver Organization': t.receiver_org_name || '',
      Amount: t.value,
      Currency: t.currency,
      'Value Date': t.value_date || '',
      'USD Value': t.value_usd || '',
      Description: t.description || ''
    }));
    exportToCSV(exportData, 'organization-transactions.csv');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-24 w-48" />
          <Skeleton className="h-24 w-48" />
          <Skeleton className="h-24 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4 flex-wrap">
          <HeroCard
            title="Total Transactions"
            value={formatCurrencyAbbreviated(totalUSD)}
            subtitle={`${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''}`}
            icon={<DollarSign className="h-5 w-5" />}
          />
          {/* Show top transaction types */}
          {Object.entries(summaryByType)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 3)
            .map(([type, data]) => (
              <HeroCard
                key={type}
                title={getTransactionTypeLabelPlural(type)}
                value={formatCurrencyAbbreviated(data.total)}
                subtitle={`${data.count} transaction${data.count !== 1 ? 's' : ''}`}
                icon={<DollarSign className="h-5 w-5" />}
              />
            ))}
          <HeroCard
            title="Active Days"
            value={activeDays.toString()}
            subtitle="unique transaction dates"
            icon={<Calendar className="h-5 w-5" />}
          />
          <HeroCard
            title="Avg/Day"
            value={avgPerDay.toFixed(1)}
            subtitle="transactions per active day"
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>
        <Button variant="outline" size="icon" onClick={handleExport} title="Export CSV">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters and Export */}
      <div className="flex items-end gap-4 flex-wrap">
          <div className="space-y-2">
            <Label htmlFor="typeFilter" className="text-xs text-muted-foreground">Transaction Type</Label>
            <div className="relative">
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                <SelectTrigger id="typeFilter" className={`min-w-[280px] ${typeFilter !== 'all' ? 'pr-12' : ''}`}>
                  {typeFilter === 'all' ? (
                    <SelectValue placeholder="All Types" />
                  ) : (
                    <span className="flex items-center text-sm">
                      <code className="text-xs font-mono bg-muted px-1 rounded">{typeFilter}</code>
                      <span className="ml-2">{getTransactionTypeLabel(typeFilter)}</span>
                    </span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {transactionTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-1">
                        <code className="text-xs font-mono bg-muted px-1 rounded">{type}</code>
                        {getTransactionTypeLabel(type)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeFilter !== 'all' && (
                <button
                  onClick={(e) => { e.stopPropagation(); setTypeFilter('all'); setCurrentPage(1); }}
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-sm z-10"
                  title="Clear filter"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activityFilter" className="text-xs text-muted-foreground">Activity</Label>
            <div className="relative">
              <Select value={activityFilter} onValueChange={(v) => { setActivityFilter(v); setCurrentPage(1); }}>
                <SelectTrigger id="activityFilter" className={`w-[450px] ${activityFilter !== 'all' ? 'pr-8' : ''}`}>
                  <SelectValue placeholder="All Activities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  {uniqueActivities.map(activity => (
                    <SelectItem key={activity.id} value={activity.id}>
                      <span className="truncate">
                        {activity.title}{activity.acronym && ` (${activity.acronym})`}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activityFilter !== 'all' && (
                <button
                  onClick={() => { setActivityFilter('all'); setCurrentPage(1); }}
                  className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-sm"
                  title="Clear filter"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Group by Activity Toggle */}
          {filteredTransactions.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-background">
              <Switch
                id="grouped-view"
                checked={groupedView}
                onCheckedChange={setGroupedView}
              />
              <Label htmlFor="grouped-view" className="text-sm cursor-pointer whitespace-nowrap">
                Group by Activity
              </Label>
            </div>
          )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50 border-b border-border/70">
              <TableRow>
                <TableHead
                  className="text-sm font-medium py-3 px-4 cursor-pointer hover:bg-muted/30"
                  style={{ width: '180px' }}
                  onClick={() => handleSort('activity')}
                >
                  <div className="flex items-center gap-1">
                    Activity
                    {sortColumn === 'activity' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-sm font-medium py-3 px-4 cursor-pointer hover:bg-muted/30"
                  style={{ width: '100px' }}
                  onClick={() => handleSort('transaction_date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortColumn === 'transaction_date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-sm font-medium py-3 px-4 cursor-pointer hover:bg-muted/30"
                  style={{ width: '160px' }}
                  onClick={() => handleSort('transaction_type')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {sortColumn === 'transaction_type' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-sm font-medium py-3 px-4 cursor-pointer hover:bg-muted/30"
                  style={{ width: '280px' }}
                  onClick={() => handleSort('provider')}
                >
                  <div className="flex items-center gap-1">
                    Provider → Receiver
                    {sortColumn === 'provider' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-sm font-medium py-3 px-4 text-right cursor-pointer hover:bg-muted/30"
                  style={{ width: '120px' }}
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Amount
                    {sortColumn === 'value' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-sm font-medium py-3 px-4 cursor-pointer hover:bg-muted/30"
                  style={{ width: '100px' }}
                  onClick={() => handleSort('value_date')}
                >
                  <div className="flex items-center gap-1">
                    Value Date
                    {sortColumn === 'value_date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-sm font-medium py-3 px-4 text-right cursor-pointer hover:bg-muted/30"
                  style={{ width: '120px' }}
                  onClick={() => handleSort('value_usd')}
                >
                  <div className="flex items-center justify-end gap-1">
                    USD Value
                    {sortColumn === 'value_usd' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No transactions found for activities this organization participates in.
                  </TableCell>
                </TableRow>
              ) : groupedView ? (
                // Grouped view - group by activity
                groupedTransactions.map((group) => (
                  <React.Fragment key={group.activity.id}>
                    {/* Group Header Row */}
                    <TableRow className="bg-muted/50 border-b border-border/70">
                      <TableCell colSpan={6} className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/activities/${group.activity.id}`}
                            className="font-medium hover:underline"
                          >
                            {group.activity.title}
                            {group.activity.acronym && (
                              <span className="ml-1">({group.activity.acronym})</span>
                            )}
                          </Link>
                          <span className="text-muted-foreground text-sm">
                            ({group.transactions.length} transaction{group.transactions.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4 text-right">
                        <span className="font-medium">
                          <span className="text-muted-foreground">USD</span>{' '}
                          {group.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </TableCell>
                    </TableRow>
                    {/* Transaction rows for this group */}
                    {group.transactions.map((transaction) => (
                      <TableRow key={transaction.uuid} className="border-b border-border/40 hover:bg-muted/30">
                        <TableCell className="py-3 px-4 pl-8" style={{ width: '180px' }}>
                          {/* Indented, no link since header has it */}
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '100px' }}>
                          {safeFormatDate(transaction.transaction_date, 'MMM d, yyyy', '-')}
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap text-sm" style={{ width: '160px' }}>
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded mr-1.5">{transaction.transaction_type}</code>
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </TableCell>
                        <TableCell className="py-3 px-4" style={{ width: '280px' }}>
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Provider */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
                              <OrganizationLogo
                                src={transaction.provider_org_logo || undefined}
                                alt={transaction.provider_org_acronym || transaction.provider_org_name || 'Provider'}
                                size="sm"
                              />
                              <span className="text-sm">
                                {transaction.provider_org_acronym || transaction.provider_org_name || '-'}
                              </span>
                            </div>
                            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            {/* Receiver */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
                              <OrganizationLogo
                                src={transaction.receiver_org_logo || undefined}
                                alt={transaction.receiver_org_acronym || transaction.receiver_org_name || 'Receiver'}
                                size="sm"
                              />
                              <span className="text-sm">
                                {transaction.receiver_org_acronym || transaction.receiver_org_name || '-'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '120px' }}>
                          <span className="font-medium">
                            <span className="text-muted-foreground">{transaction.currency}</span>{' '}
                            {transaction.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '100px' }}>
                          {safeFormatDate(transaction.value_date, 'MMM d, yyyy', '-')}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '120px' }}>
                          {transaction.value_usd != null ? (
                            <span className="font-medium">
                              <span className="text-muted-foreground">USD</span>{' '}
                              {transaction.value_usd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                // Regular paginated view
                paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.uuid} className="border-b border-border/40 hover:bg-muted/30">
                    <TableCell className="py-3 px-4" style={{ width: '180px' }}>
                      <Link
                        href={`/activities/${transaction.activity_id}`}
                        className="hover:underline"
                      >
                        {transaction.activity_title}
                        {transaction.activity_acronym && (
                          <span className="ml-1">({transaction.activity_acronym})</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '100px' }}>
                      {safeFormatDate(transaction.transaction_date, 'MMM d, yyyy', '-')}
                    </TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap text-sm" style={{ width: '160px' }}>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded mr-1.5">{transaction.transaction_type}</code>
                      {getTransactionTypeLabel(transaction.transaction_type)}
                    </TableCell>
                    <TableCell className="py-3 px-4" style={{ width: '280px' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Provider */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
                          <OrganizationLogo
                            src={transaction.provider_org_logo || undefined}
                            alt={transaction.provider_org_acronym || transaction.provider_org_name || 'Provider'}
                            size="sm"
                          />
                          <span className="text-sm">
                            {transaction.provider_org_acronym || transaction.provider_org_name || '-'}
                          </span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        {/* Receiver */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
                          <OrganizationLogo
                            src={transaction.receiver_org_logo || undefined}
                            alt={transaction.receiver_org_acronym || transaction.receiver_org_name || 'Receiver'}
                            size="sm"
                          />
                          <span className="text-sm">
                            {transaction.receiver_org_acronym || transaction.receiver_org_name || '-'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '120px' }}>
                      <span className="font-medium">
                        <span className="text-muted-foreground">{transaction.currency}</span>{' '}
                        {transaction.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '100px' }}>
                      {safeFormatDate(transaction.value_date, 'MMM d, yyyy', '-')}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '120px' }}>
                      {transaction.value_usd != null ? (
                        <span className="font-medium">
                          <span className="text-muted-foreground">USD</span>{' '}
                          {transaction.value_usd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination - Hide in grouped view */}
      {sortedTransactions.length > 0 && !groupedView && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {Math.min(startIndex + 1, sortedTransactions.length)} to {Math.min(endIndex, sortedTransactions.length)} of {sortedTransactions.length} transactions
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
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
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
  );
}
