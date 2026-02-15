'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { DollarSign, Download, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import { exportToCSV } from '@/lib/csv-export';
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
interface OrganizationBudget {
  id: string;
  activity_id: string;
  activity_title: string;
  activity_acronym?: string | null;
  type: 1 | 2; // 1 = Original, 2 = Revised
  status: 1 | 2; // 1 = Indicative, 2 = Committed
  period_start: string;
  period_end: string;
  value: number;
  currency: string;
  value_date: string;
  usd_value?: number | null;
}

interface OrganizationBudgetsTabProps {
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

export function OrganizationBudgetsTab({ organizationId, defaultCurrency = 'USD' }: OrganizationBudgetsTabProps) {
  const [budgets, setBudgets] = useState<OrganizationBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>('period_start');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Grouped view
  const [groupedView, setGroupedView] = useState(false);

  // Fetch budgets
  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetch(`/api/organizations/${organizationId}/budgets`);
        if (!response.ok) throw new Error('Failed to fetch budgets');
        const data = await response.json();
        setBudgets(data || []);
      } catch (err) {
        console.error('Error fetching budgets:', err);
        setError('Failed to load budgets');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchBudgets();
    }
  }, [organizationId]);

  // Get unique activities for filter dropdown
  const uniqueActivities = useMemo(() => {
    const activityMap = new Map<string, { id: string; title: string; acronym?: string | null }>();
    budgets.forEach(budget => {
      if (!activityMap.has(budget.activity_id)) {
        activityMap.set(budget.activity_id, {
          id: budget.activity_id,
          title: budget.activity_title,
          acronym: budget.activity_acronym
        });
      }
    });
    return Array.from(activityMap.values()).sort((a, b) =>
      (a.title || '').localeCompare(b.title || '')
    );
  }, [budgets]);

  // Apply filters
  const filteredBudgets = useMemo(() => {
    return budgets.filter(budget => {
      if (statusFilter !== 'all' && budget.status !== Number(statusFilter)) return false;
      if (typeFilter !== 'all' && budget.type !== Number(typeFilter)) return false;
      if (activityFilter !== 'all' && budget.activity_id !== activityFilter) return false;
      return true;
    });
  }, [budgets, statusFilter, typeFilter, activityFilter]);

  // Apply sorting
  const sortedBudgets = useMemo(() => {
    if (!sortColumn) return filteredBudgets;

    return [...filteredBudgets].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      switch (sortColumn) {
        case 'activity':
          return direction * (a.activity_title || '').localeCompare(b.activity_title || '');
        case 'period_start':
          return direction * ((a.period_start || '').localeCompare(b.period_start || ''));
        case 'status':
          return direction * (a.status - b.status);
        case 'type':
          return direction * (a.type - b.type);
        case 'value':
          return direction * ((a.value || 0) - (b.value || 0));
        case 'value_date':
          return direction * ((a.value_date || '').localeCompare(b.value_date || ''));
        case 'usd_value':
          return direction * ((a.usd_value || 0) - (b.usd_value || 0));
        default:
          return 0;
      }
    });
  }, [filteredBudgets, sortColumn, sortDirection]);

  // Group budgets by activity for grouped view
  const groupedBudgets = useMemo(() => {
    const groups: Record<string, { activity: { id: string; title: string; acronym?: string | null }; budgets: OrganizationBudget[]; total: number }> = {};
    sortedBudgets.forEach(budget => {
      const activityId = budget.activity_id;
      if (!groups[activityId]) {
        groups[activityId] = {
          activity: { id: activityId, title: budget.activity_title, acronym: budget.activity_acronym },
          budgets: [],
          total: 0
        };
      }
      groups[activityId].budgets.push(budget);
      groups[activityId].total += budget.usd_value || 0;
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [sortedBudgets]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedBudgets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBudgets = sortedBudgets.slice(startIndex, endIndex);

  // Calculate totals for summary card
  const totalUSD = useMemo(() => {
    return filteredBudgets.reduce((sum, b) => sum + (b.usd_value || 0), 0);
  }, [filteredBudgets]);

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
    const exportData = sortedBudgets.map(b => ({
      Activity: b.activity_title,
      'Activity Acronym': b.activity_acronym || '',
      'Period Start': b.period_start,
      'Period End': b.period_end,
      Status: b.status === 1 ? 'Indicative' : 'Committed',
      Type: b.type === 1 ? 'Original' : 'Revised',
      Amount: b.value,
      Currency: b.currency,
      'Value Date': b.value_date,
      'USD Value': b.usd_value || ''
    }));
    exportToCSV(exportData, 'organization-budgets.csv');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-64" />
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
      {/* Summary Card */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4 flex-wrap">
          <HeroCard
            title="Total Budgets"
            value={formatCurrencyAbbreviated(totalUSD)}
            subtitle={`${filteredBudgets.length} budget${filteredBudgets.length !== 1 ? 's' : ''}`}
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>
        <Button variant="outline" size="icon" onClick={handleExport} title="Export CSV">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters and Export */}
      <div className="flex items-end gap-4 flex-wrap">
          <div className="space-y-2">
            <Label htmlFor="statusFilter" className="text-xs text-muted-foreground">Status</Label>
            <div className="relative">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger id="statusFilter" className={`w-[140px] ${statusFilter !== 'all' ? 'pr-8' : ''}`}>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="1">
                    <span className="flex items-center gap-1">
                      <code className="text-xs font-mono bg-muted px-1 rounded">1</code> Indicative
                    </span>
                  </SelectItem>
                  <SelectItem value="2">
                    <span className="flex items-center gap-1">
                      <code className="text-xs font-mono bg-muted px-1 rounded">2</code> Committed
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {statusFilter !== 'all' && (
                <button
                  onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                  className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-sm"
                  title="Clear filter"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="typeFilter" className="text-xs text-muted-foreground">Type</Label>
            <div className="relative">
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                <SelectTrigger id="typeFilter" className={`w-[140px] ${typeFilter !== 'all' ? 'pr-8' : ''}`}>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="1">
                    <span className="flex items-center gap-1">
                      <code className="text-xs font-mono bg-muted px-1 rounded">1</code> Original
                    </span>
                  </SelectItem>
                  <SelectItem value="2">
                    <span className="flex items-center gap-1">
                      <code className="text-xs font-mono bg-muted px-1 rounded">2</code> Revised
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {typeFilter !== 'all' && (
                <button
                  onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
                  className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-sm"
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
          {filteredBudgets.length > 0 && (
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
            <TableHeader className="bg-surface-muted border-b border-border/70">
              <TableRow>
                <TableHead
                  className="text-sm font-medium py-3 px-4 cursor-pointer hover:bg-muted/30"
                  style={{ width: '250px' }}
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
                  style={{ width: '180px' }}
                  onClick={() => handleSort('period_start')}
                >
                  <div className="flex items-center gap-1">
                    Period
                    {sortColumn === 'period_start' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-sm font-medium py-3 px-4 cursor-pointer hover:bg-muted/30"
                  style={{ width: '120px' }}
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortColumn === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-sm font-medium py-3 px-4 cursor-pointer hover:bg-muted/30"
                  style={{ width: '110px' }}
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {sortColumn === 'type' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-sm font-medium py-3 px-4 text-right cursor-pointer hover:bg-muted/30"
                  style={{ width: '150px' }}
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
                  style={{ width: '120px' }}
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
                  style={{ width: '130px' }}
                  onClick={() => handleSort('usd_value')}
                >
                  <div className="flex items-center justify-end gap-1">
                    USD Value
                    {sortColumn === 'usd_value' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBudgets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No budgets found for activities this organization participates in.
                  </TableCell>
                </TableRow>
              ) : groupedView ? (
                // Grouped view - group by activity
                groupedBudgets.map((group) => (
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
                            ({group.budgets.length} budget{group.budgets.length !== 1 ? 's' : ''})
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
                    {/* Budget rows for this group */}
                    {group.budgets.map((budget) => (
                      <TableRow key={budget.id} className="border-b border-border/40 hover:bg-muted/30">
                        <TableCell className="py-3 px-4 pl-8" style={{ width: '250px' }}>
                          {/* Indented, no link since header has it */}
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '180px' }}>
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
                        <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '150px' }}>
                          <span className="font-medium">
                            <span className="text-muted-foreground">{budget.currency}</span>{' '}
                            {budget.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '120px' }}>
                          {safeFormatDate(budget.value_date, 'MMM d, yyyy', '-')}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '130px' }}>
                          {budget.usd_value != null ? (
                            <span className="font-medium">
                              <span className="text-muted-foreground">USD</span>{' '}
                              {budget.usd_value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                paginatedBudgets.map((budget) => (
                  <TableRow key={budget.id} className="border-b border-border/40 hover:bg-muted/30">
                    <TableCell className="py-3 px-4" style={{ width: '250px' }}>
                      <Link
                        href={`/activities/${budget.activity_id}`}
                        className="hover:underline"
                      >
                        {budget.activity_title}
                        {budget.activity_acronym && (
                          <span className="ml-1">({budget.activity_acronym})</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '180px' }}>
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
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '150px' }}>
                      <span className="font-medium">
                        <span className="text-muted-foreground">{budget.currency}</span>{' '}
                        {budget.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '120px' }}>
                      {safeFormatDate(budget.value_date, 'MMM d, yyyy', '-')}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '130px' }}>
                      {budget.usd_value != null ? (
                        <span className="font-medium">
                          <span className="text-muted-foreground">USD</span>{' '}
                          {budget.usd_value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
      {sortedBudgets.length > 0 && !groupedView && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {Math.min(startIndex + 1, sortedBudgets.length)} to {Math.min(endIndex, sortedBudgets.length)} of {sortedBudgets.length} budgets
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
