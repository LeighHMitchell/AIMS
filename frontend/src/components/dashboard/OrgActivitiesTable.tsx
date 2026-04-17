"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getSortIcon,
  sortableHeaderClasses,
} from '@/components/ui/table';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import {
  FileText,
  Clock,
  ArrowRight,
  Calendar,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import type { ActivityTableVariant, TableFilterConfig, ReportedByFilter } from '@/types/dashboard';
import { TableRowActionMenu } from './TableRowActionMenu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrgActivitiesTableProps {
  organizationId: string;
  variant: ActivityTableVariant;
  limit?: number;
  embedded?: boolean;
  userId?: string;
  filterConfig?: TableFilterConfig;
}

interface ActivityRow {
  id: string;
  title: string;
  iatiIdentifier?: string;
  status: string;
  activityStatus?: string;
  totalBudget?: number;
  totalBudgetOriginal?: number;
  totalPlannedDisbursements?: number;
  totalPlannedDisbursementsOriginal?: number;
  currency?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  validationStatus?: string;
  lastUpdated: string;
  updatedBy?: string;
  createdBy?: string;
  daysRemaining?: number;
}

// Activity status labels
const ACTIVITY_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  '1': { label: 'Pipeline', color: 'bg-muted text-foreground' },
  '2': { label: 'Implementation', color: 'bg-blue-100 text-blue-700' },
  '3': { label: 'Finalisation', color: 'bg-purple-100 text-purple-700' },
  '4': { label: 'Closed', color: 'bg-muted text-foreground' },
  '5': { label: 'Cancelled', color: 'bg-destructive/10 text-destructive' },
  '6': { label: 'Suspended', color: 'bg-orange-100 text-orange-700' },
};

// Validation status labels
const VALIDATION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-foreground' },
  submitted: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  validated: { label: 'Validated', color: 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))]' },
  rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive' },
  more_info_requested: { label: 'Info Requested', color: 'bg-orange-100 text-orange-700' },
};

// Variant configuration
const VARIANT_CONFIG: Record<ActivityTableVariant, {
  title: string;
  description: string;
  icon: React.ElementType;
  emptyMessage: string;
}> = {
  main: {
    title: 'Your Activities',
    description: 'All activities reported by your organization',
    icon: FileText,
    emptyMessage: 'No activities found',
  },
  recently_edited: {
    title: 'Recently Edited',
    description: 'Activities recently updated by your team',
    icon: Clock,
    emptyMessage: 'No recent edits',
  },
  closing_soon: {
    title: 'Closing Soon',
    description: 'Activities ending within 90 days',
    icon: Calendar,
    emptyMessage: 'No activities closing soon',
  },
};

// Format currency without symbol
function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function OrgActivitiesTable({
  organizationId,
  variant,
  limit = variant === 'main' ? 10 : 5,
  embedded = false,
  userId,
  filterConfig,
}: OrgActivitiesTableProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reportedBy, setReportedBy] = useState<ReportedByFilter>(filterConfig?.defaultFilter ?? 'all');

  type SortField = 'title' | 'activityStatus' | 'status' | 'validationStatus' | 'budget' | 'plannedDisb' | 'updated' | 'endDate' | 'daysRemaining';
  const [sortField, setSortField] = useState<SortField>('updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'title':
          return dir * a.title.localeCompare(b.title);
        case 'activityStatus':
          return dir * (a.activityStatus || '').localeCompare(b.activityStatus || '');
        case 'status':
          return dir * a.status.localeCompare(b.status);
        case 'validationStatus':
          return dir * (a.validationStatus || '').localeCompare(b.validationStatus || '');
        case 'budget':
          return dir * ((a.totalBudget || 0) - (b.totalBudget || 0));
        case 'plannedDisb':
          return dir * ((a.totalPlannedDisbursements || 0) - (b.totalPlannedDisbursements || 0));
        case 'updated':
          return dir * (a.lastUpdated || '').localeCompare(b.lastUpdated || '');
        case 'endDate':
          return dir * (a.plannedEndDate || '').localeCompare(b.plannedEndDate || '');
        case 'daysRemaining':
          return dir * ((a.daysRemaining || 0) - (b.daysRemaining || 0));
        default:
          return 0;
      }
    });
  }, [activities, sortField, sortDirection]);

  const filteredActivities = useMemo(() => {
    if (reportedBy === 'me' && userId) {
      return sortedActivities.filter((a) => a.createdBy === userId || a.updatedBy === userId);
    }
    if (reportedBy === 'other_orgs') {
      return [];
    }
    // 'all' and 'my_org' show everything (API already filters by org)
    return sortedActivities;
  }, [sortedActivities, reportedBy, userId]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query params for the API
        const params = new URLSearchParams({
          reportedByOrgs: organizationId,
          limit: limit.toString(),
          sortField: variant === 'closing_soon' ? 'planned_end_date' : 'updated_at',
          sortOrder: variant === 'closing_soon' ? 'asc' : 'desc',
        });

        // For closing soon, filter by activity status
        if (variant === 'closing_soon') {
          params.append('activityStatuses', '2,3');
        }

        const response = await fetch(`/api/activities-optimized?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }

        const data = await response.json();
        const activitiesData = data.data || data || [];
        const now = new Date();
        const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        // Process activities
        let processedActivities: ActivityRow[] = activitiesData.map((activity: any) => {
          let daysRemaining: number | undefined;

          if (variant === 'closing_soon' && activity.planned_end_date) {
            daysRemaining = differenceInDays(new Date(activity.planned_end_date), now);
          }

          return {
            id: activity.id,
            title: activity.title_narrative || activity.title || 'Untitled Activity',
            iatiIdentifier: activity.iatiIdentifier || activity.iati_identifier,
            status: activity.publication_status || 'draft',
            activityStatus: activity.activity_status,
            totalBudget: activity.totalBudget || activity.total_budget || 0,
            totalBudgetOriginal: activity.totalBudgetOriginal || 0,
            totalPlannedDisbursements: activity.totalPlannedDisbursementsUSD || activity.totalPlannedDisbursements || 0,
            totalPlannedDisbursementsOriginal: activity.totalPlannedDisbursementsOriginal || 0,
            currency: activity.default_currency || 'USD',
            plannedStartDate: activity.planned_start_date,
            plannedEndDate: activity.planned_end_date,
            validationStatus: activity.submission_status,
            lastUpdated: activity.updated_at,
            updatedBy: activity.updated_by,
            createdBy: activity.created_by || activity.updated_by,
            daysRemaining,
          };
        });

        // For closing soon, filter only activities within 90 days
        if (variant === 'closing_soon') {
          processedActivities = processedActivities.filter((a) => {
            if (!a.plannedEndDate) return false;
            const endDate = new Date(a.plannedEndDate);
            return endDate >= now && endDate <= ninetyDaysFromNow;
          });
        }

        setActivities(processedActivities.slice(0, limit));
      } catch (err) {
        console.error('[OrgActivitiesTable] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load activities');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchActivities();
    }
  }, [organizationId, variant, limit]);

  const handleRowClick = (activityId: string) => {
    router.push(`/activities/${activityId}`);
  };

  const handleViewAll = () => {
    switch (variant) {
      case 'recently_edited':
        router.push('/activities?sortField=updated_at&sortOrder=desc');
        break;
      case 'closing_soon':
        router.push('/activities?filter=closing-soon');
        break;
      default:
        router.push('/activities');
    }
  };

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  if (loading) {
    const skeleton = (
      <div className="space-y-2">
        {[...Array(limit > 5 ? 5 : limit)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
    if (embedded) return skeleton;
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent>{skeleton}</CardContent>
      </Card>
    );
  }

  if (error) {
    const errorContent = <p className="text-sm text-destructive">Failed to load activities: {error}</p>;
    if (embedded) return errorContent;
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>{errorContent}</CardContent>
      </Card>
    );
  }

  const mainContent = (
    <>
      {filterConfig && (
        <div className="flex items-center gap-3 mb-4">
          <Select value={reportedBy} onValueChange={(val: ReportedByFilter) => { setReportedBy(val); }}>
            <SelectTrigger className="w-[280px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterConfig.allowedFilters.map((filter) => (
                <SelectItem key={filter} value={filter}>
                  {filterConfig.filterLabels[filter] || filter}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Icon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{config.emptyMessage}</p>
        </div>
      ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={`${variant === 'main' ? 'w-[30%]' : 'w-[35%]'} ${sortableHeaderClasses}`} onClick={() => handleSort('title')}>
                  <div className="flex items-center gap-1">Activity Title {getSortIcon('title', sortField, sortDirection)}</div>
                </TableHead>
                {variant === 'main' && (
                  <>
                    <TableHead className={sortableHeaderClasses} onClick={() => handleSort('activityStatus')}>
                      <div className="flex items-center gap-1">Activity Status {getSortIcon('activityStatus', sortField, sortDirection)}</div>
                    </TableHead>
                    <TableHead className={sortableHeaderClasses} onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">Publication Status {getSortIcon('status', sortField, sortDirection)}</div>
                    </TableHead>
                    <TableHead className={sortableHeaderClasses} onClick={() => handleSort('validationStatus')}>
                      <div className="flex items-center gap-1">Validation Status {getSortIcon('validationStatus', sortField, sortDirection)}</div>
                    </TableHead>
                    <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => handleSort('budget')}>
                      <div className="flex items-center justify-end gap-1">Total Budget {getSortIcon('budget', sortField, sortDirection)}</div>
                    </TableHead>
                    <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => handleSort('plannedDisb')}>
                      <div className="flex items-center justify-end gap-1">Total Planned Disbursements {getSortIcon('plannedDisb', sortField, sortDirection)}</div>
                    </TableHead>
                    <TableHead className={sortableHeaderClasses} onClick={() => handleSort('updated')}>
                      <div className="flex items-center gap-1">Last Updated {getSortIcon('updated', sortField, sortDirection)}</div>
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </>
                )}
                {variant === 'recently_edited' && (
                  <>
                    <TableHead className={sortableHeaderClasses} onClick={() => handleSort('updated')}>
                      <div className="flex items-center gap-1">Last Updated {getSortIcon('updated', sortField, sortDirection)}</div>
                    </TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </>
                )}
                {variant === 'closing_soon' && (
                  <>
                    <TableHead className={sortableHeaderClasses} onClick={() => handleSort('endDate')}>
                      <div className="flex items-center gap-1">End Date {getSortIcon('endDate', sortField, sortDirection)}</div>
                    </TableHead>
                    <TableHead className={sortableHeaderClasses} onClick={() => handleSort('daysRemaining')}>
                      <div className="flex items-center gap-1">Days Left {getSortIcon('daysRemaining', sortField, sortDirection)}</div>
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => (
                <TableRow
                  key={activity.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(activity.id)}
                >
                  <TableCell>
                    <p className="font-medium" title={activity.title}>
                      {activity.title}
                      {activity.iatiIdentifier && (
                        <> <code className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded whitespace-nowrap">{activity.iatiIdentifier}</code></>
                      )}
                    </p>
                  </TableCell>

                  {variant === 'main' && (
                    <>
                      <TableCell>
                        {activity.activityStatus && (
                          <span className="text-sm text-foreground">
                            {ACTIVITY_STATUS_LABELS[activity.activityStatus]?.label || activity.activityStatus}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize text-foreground">
                          {activity.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {activity.validationStatus && (
                          <span className="text-sm text-foreground">
                            {VALIDATION_STATUS_LABELS[activity.validationStatus]?.label || activity.validationStatus}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {activity.totalBudgetOriginal && activity.totalBudgetOriginal > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-medium">
                              <span className="text-xs text-muted-foreground mr-1 font-normal">
                                {activity.currency}
                              </span>
                              {formatCurrency(activity.totalBudgetOriginal, activity.currency)}
                            </span>
                            {activity.totalBudget && activity.totalBudget > 0 && (
                              <span className="text-xs text-muted-foreground mt-0.5">
                                <span className="mr-1 font-normal">USD</span>
                                {formatCurrency(activity.totalBudget, 'USD')}
                              </span>
                            )}
                          </div>
                        ) : activity.totalBudget && activity.totalBudget > 0 ? (
                          <span className="font-medium">
                            <span className="text-xs text-muted-foreground mr-1 font-normal">USD</span>
                            {formatCurrency(activity.totalBudget, 'USD')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {activity.totalPlannedDisbursementsOriginal && activity.totalPlannedDisbursementsOriginal > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-medium">
                              <span className="text-xs text-muted-foreground mr-1 font-normal">
                                {activity.currency}
                              </span>
                              {formatCurrency(activity.totalPlannedDisbursementsOriginal, activity.currency)}
                            </span>
                            {activity.totalPlannedDisbursements && activity.totalPlannedDisbursements > 0 && (
                              <span className="text-xs text-muted-foreground mt-0.5">
                                <span className="mr-1 font-normal">USD</span>
                                {formatCurrency(activity.totalPlannedDisbursements, 'USD')}
                              </span>
                            )}
                          </div>
                        ) : activity.totalPlannedDisbursements && activity.totalPlannedDisbursements > 0 ? (
                          <span className="font-medium">
                            <span className="text-xs text-muted-foreground mr-1 font-normal">USD</span>
                            {formatCurrency(activity.totalPlannedDisbursements, 'USD')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground" title={format(new Date(activity.lastUpdated), 'PPpp')}>
                          {formatDistanceToNow(new Date(activity.lastUpdated), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <TableRowActionMenu activityId={activity.id} entityType="activity" onDelete={() => {/* TODO: implement delete */}} />
                      </TableCell>
                    </>
                  )}

                  {variant === 'recently_edited' && (
                    <>
                      <TableCell>
                        <span className="text-sm text-muted-foreground" title={format(new Date(activity.lastUpdated), 'PPpp')}>
                          {formatDistanceToNow(new Date(activity.lastUpdated), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/activities/${activity.id}/edit`);
                          }}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </>
                  )}

                  {variant === 'closing_soon' && (
                    <>
                      <TableCell>
                        {activity.plannedEndDate ? format(new Date(activity.plannedEndDate), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {activity.daysRemaining !== undefined && (
                          <div className="flex items-center gap-1">
                            {activity.daysRemaining <= 30 && (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                            <span className={activity.daysRemaining <= 30 ? 'text-orange-600 font-medium' : ''}>
                              {activity.daysRemaining} days
                            </span>
                          </div>
                        )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
    </>
  );

  if (embedded) {
    return mainContent;
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              {config.title}
            </CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          {activities.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleViewAll}>
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {mainContent}
      </CardContent>
    </Card>
  );
}
