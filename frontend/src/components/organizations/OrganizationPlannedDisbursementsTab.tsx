'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { DollarSign, Download, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, ArrowRight, X } from 'lucide-react';
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
interface OrganizationPlannedDisbursement {
  id: string;
  activity_id: string;
  activity_title: string;
  activity_acronym?: string | null;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  provider_org_id?: string;
  provider_org_name?: string;
  provider_org_acronym?: string | null;
  provider_org_logo?: string | null;
  receiver_org_id?: string;
  receiver_org_name?: string;
  receiver_org_acronym?: string | null;
  receiver_org_logo?: string | null;
  status?: string;
  value_date?: string;
  usd_amount?: number | null;
}

interface OrganizationPlannedDisbursementsTabProps {
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

export function OrganizationPlannedDisbursementsTab({ organizationId, defaultCurrency = 'USD' }: OrganizationPlannedDisbursementsTabProps) {
  const [disbursements, setDisbursements] = useState<OrganizationPlannedDisbursement[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>('period_start');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Grouped view
  const [groupedView, setGroupedView] = useState(false);

  // Fetch planned disbursements and organizations
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch disbursements and organizations in parallel
        const [disbursementsResponse, orgsResponse] = await Promise.all([
          apiFetch(`/api/organizations/${organizationId}/planned-disbursements`),
          apiFetch('/api/organizations')
        ]);

        if (!disbursementsResponse.ok) throw new Error('Failed to fetch planned disbursements');
        const disbursementsData = await disbursementsResponse.json();
        setDisbursements(disbursementsData || []);

        if (orgsResponse.ok) {
          const orgsData = await orgsResponse.json();
          setOrganizations(orgsData || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load planned disbursements');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  // Helper to get org logo by ID
  const getOrgLogo = (orgId: string | undefined): string | null => {
    if (!orgId) return null;
    const org = organizations.find((o: any) => o.id === orgId);
    return org?.logo || null;
  };

  // Helper to get org acronym or name
  const getOrgAcronymOrName = (orgId: string | undefined, fallbackName?: string): string => {
    if (orgId) {
      const org = organizations.find((o: any) => o.id === orgId);
      if (org) {
        return org.acronym || org.name;
      }
    }
    return fallbackName || '-';
  };

  // Get unique activities for filter dropdown
  const uniqueActivities = useMemo(() => {
    const activityMap = new Map<string, { id: string; title: string; acronym?: string | null }>();
    disbursements.forEach(d => {
      if (!activityMap.has(d.activity_id)) {
        activityMap.set(d.activity_id, {
          id: d.activity_id,
          title: d.activity_title,
          acronym: d.activity_acronym
        });
      }
    });
    return Array.from(activityMap.values()).sort((a, b) =>
      (a.title || '').localeCompare(b.title || '')
    );
  }, [disbursements]);

  // Apply filters
  const filteredDisbursements = useMemo(() => {
    return disbursements.filter(d => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (activityFilter !== 'all' && d.activity_id !== activityFilter) return false;
      return true;
    });
  }, [disbursements, statusFilter, activityFilter]);

  // Apply sorting
  const sortedDisbursements = useMemo(() => {
    if (!sortColumn) return filteredDisbursements;

    return [...filteredDisbursements].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      switch (sortColumn) {
        case 'activity':
          return direction * (a.activity_title || '').localeCompare(b.activity_title || '');
        case 'period_start':
          return direction * ((a.period_start || '').localeCompare(b.period_start || ''));
        case 'status':
          return direction * ((a.status || '').localeCompare(b.status || ''));
        case 'provider':
          return direction * ((a.provider_org_name || '').localeCompare(b.provider_org_name || ''));
        case 'amount':
          return direction * ((a.amount || 0) - (b.amount || 0));
        case 'value_date':
          return direction * ((a.value_date || '').localeCompare(b.value_date || ''));
        case 'usd_amount':
          return direction * ((a.usd_amount || 0) - (b.usd_amount || 0));
        default:
          return 0;
      }
    });
  }, [filteredDisbursements, sortColumn, sortDirection]);

  // Group disbursements by activity for grouped view
  const groupedDisbursements = useMemo(() => {
    const groups: Record<string, { activity: { id: string; title: string; acronym?: string | null }; disbursements: OrganizationPlannedDisbursement[]; total: number }> = {};
    sortedDisbursements.forEach(d => {
      const activityId = d.activity_id;
      if (!groups[activityId]) {
        groups[activityId] = {
          activity: { id: activityId, title: d.activity_title, acronym: d.activity_acronym },
          disbursements: [],
          total: 0
        };
      }
      groups[activityId].disbursements.push(d);
      groups[activityId].total += d.usd_amount || 0;
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [sortedDisbursements]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedDisbursements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDisbursements = sortedDisbursements.slice(startIndex, endIndex);

  // Calculate totals for summary card
  const totalUSD = useMemo(() => {
    return filteredDisbursements.reduce((sum, d) => sum + (d.usd_amount || 0), 0);
  }, [filteredDisbursements]);

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
    const exportData = sortedDisbursements.map(d => ({
      Activity: d.activity_title,
      'Activity Acronym': d.activity_acronym || '',
      'Period Start': d.period_start,
      'Period End': d.period_end,
      Status: d.status || '',
      'Provider Organization': d.provider_org_name || '',
      'Receiver Organization': d.receiver_org_name || '',
      Amount: d.amount,
      Currency: d.currency,
      'Value Date': d.value_date || '',
      'USD Amount': d.usd_amount || ''
    }));
    exportToCSV(exportData, 'organization-planned-disbursements.csv');
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
            title="Total Planned Disbursements"
            value={formatCurrencyAbbreviated(totalUSD)}
            subtitle={`${filteredDisbursements.length} disbursement${filteredDisbursements.length !== 1 ? 's' : ''}`}
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
                  <SelectItem value="original">
                    <span className="flex items-center gap-1">
                      <code className="text-xs font-mono bg-muted px-1 rounded">1</code> Original
                    </span>
                  </SelectItem>
                  <SelectItem value="revised">
                    <span className="flex items-center gap-1">
                      <code className="text-xs font-mono bg-muted px-1 rounded">2</code> Revised
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
          {filteredDisbursements.length > 0 && (
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
                  style={{ width: '200px' }}
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
                  style={{ width: '160px' }}
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
                  style={{ width: '100px' }}
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {sortColumn === 'status' ? (
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
                  style={{ width: '130px' }}
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Amount
                    {sortColumn === 'amount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-sm font-medium py-3 px-4 cursor-pointer hover:bg-muted/30"
                  style={{ width: '110px' }}
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
                  onClick={() => handleSort('usd_amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    USD Value
                    {sortColumn === 'usd_amount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDisbursements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No planned disbursements found for activities this organization participates in.
                  </TableCell>
                </TableRow>
              ) : groupedView ? (
                // Grouped view - group by activity
                groupedDisbursements.map((group) => (
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
                            ({group.disbursements.length} disbursement{group.disbursements.length !== 1 ? 's' : ''})
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
                    {/* Disbursement rows for this group */}
                    {group.disbursements.map((disbursement) => (
                      <TableRow key={disbursement.id} className="border-b border-border/40 hover:bg-muted/30">
                        <TableCell className="py-3 px-4 pl-8" style={{ width: '200px' }}>
                          {/* Indented, no link since header has it */}
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '160px' }}>
                          <span className="font-medium">
                            {safeFormatDate(disbursement.period_start, 'MMM yyyy')} - {safeFormatDate(disbursement.period_end, 'MMM yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap text-sm" style={{ width: '100px' }}>
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded mr-1.5">
                            {disbursement.status === 'original' ? '1' : disbursement.status === 'revised' ? '2' : '-'}
                          </code>
                          {disbursement.status === 'original' ? 'Original' : disbursement.status === 'revised' ? 'Revised' : '-'}
                        </TableCell>
                        <TableCell className="py-3 px-4" style={{ width: '280px' }}>
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Provider */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
                              <OrganizationLogo
                                logo={getOrgLogo(disbursement.provider_org_id) || disbursement.provider_org_logo}
                                name={getOrgAcronymOrName(disbursement.provider_org_id, disbursement.provider_org_name)}
                                size="sm"
                              />
                              <span className="text-sm">
                                {getOrgAcronymOrName(disbursement.provider_org_id, disbursement.provider_org_name)}
                              </span>
                            </div>
                            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            {/* Receiver */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
                              <OrganizationLogo
                                logo={getOrgLogo(disbursement.receiver_org_id) || disbursement.receiver_org_logo}
                                name={getOrgAcronymOrName(disbursement.receiver_org_id, disbursement.receiver_org_name)}
                                size="sm"
                              />
                              <span className="text-sm">
                                {getOrgAcronymOrName(disbursement.receiver_org_id, disbursement.receiver_org_name)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '130px' }}>
                          <span className="font-medium">
                            <span className="text-muted-foreground">{disbursement.currency}</span>{' '}
                            {disbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '110px' }}>
                          {safeFormatDate(disbursement.value_date, 'MMM d, yyyy', '-')}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '120px' }}>
                          {disbursement.usd_amount != null ? (
                            <span className="font-medium">
                              <span className="text-muted-foreground">USD</span>{' '}
                              {disbursement.usd_amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                paginatedDisbursements.map((disbursement) => (
                  <TableRow key={disbursement.id} className="border-b border-border/40 hover:bg-muted/30">
                    <TableCell className="py-3 px-4" style={{ width: '200px' }}>
                      <Link
                        href={`/activities/${disbursement.activity_id}`}
                        className="hover:underline"
                      >
                        {disbursement.activity_title}
                        {disbursement.activity_acronym && (
                          <span className="ml-1">({disbursement.activity_acronym})</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '160px' }}>
                      <span className="font-medium">
                        {safeFormatDate(disbursement.period_start, 'MMM yyyy')} - {safeFormatDate(disbursement.period_end, 'MMM yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap text-sm" style={{ width: '100px' }}>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded mr-1.5">
                        {disbursement.status === 'original' ? '1' : disbursement.status === 'revised' ? '2' : '-'}
                      </code>
                      {disbursement.status === 'original' ? 'Original' : disbursement.status === 'revised' ? 'Revised' : '-'}
                    </TableCell>
                    <TableCell className="py-3 px-4" style={{ width: '280px' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Provider */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
                          <OrganizationLogo
                            logo={getOrgLogo(disbursement.provider_org_id) || disbursement.provider_org_logo}
                            name={getOrgAcronymOrName(disbursement.provider_org_id, disbursement.provider_org_name)}
                            size="sm"
                          />
                          <span className="text-sm">
                            {getOrgAcronymOrName(disbursement.provider_org_id, disbursement.provider_org_name)}
                          </span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        {/* Receiver */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
                          <OrganizationLogo
                            logo={getOrgLogo(disbursement.receiver_org_id) || disbursement.receiver_org_logo}
                            name={getOrgAcronymOrName(disbursement.receiver_org_id, disbursement.receiver_org_name)}
                            size="sm"
                          />
                          <span className="text-sm">
                            {getOrgAcronymOrName(disbursement.receiver_org_id, disbursement.receiver_org_name)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '130px' }}>
                      <span className="font-medium">
                        <span className="text-muted-foreground">{disbursement.currency}</span>{' '}
                        {disbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap" style={{ width: '110px' }}>
                      {safeFormatDate(disbursement.value_date, 'MMM d, yyyy', '-')}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap" style={{ width: '120px' }}>
                      {disbursement.usd_amount != null ? (
                        <span className="font-medium">
                          <span className="text-muted-foreground">USD</span>{' '}
                          {disbursement.usd_amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
      {sortedDisbursements.length > 0 && !groupedView && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {Math.min(startIndex + 1, sortedDisbursements.length)} to {Math.min(endIndex, sortedDisbursements.length)} of {sortedDisbursements.length} planned disbursements
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
