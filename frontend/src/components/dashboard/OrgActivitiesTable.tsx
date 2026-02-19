"use client";

import React, { useState, useEffect } from 'react';
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
import type { ActivityTableVariant } from '@/types/dashboard';

interface OrgActivitiesTableProps {
  organizationId: string;
  variant: ActivityTableVariant;
  limit?: number;
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
  daysRemaining?: number;
}

// Activity status labels
const ACTIVITY_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  '1': { label: 'Pipeline', color: 'bg-gray-100 text-gray-700' },
  '2': { label: 'Implementation', color: 'bg-blue-100 text-blue-700' },
  '3': { label: 'Finalisation', color: 'bg-purple-100 text-purple-700' },
  '4': { label: 'Closed', color: 'bg-slate-100 text-slate-700' },
  '5': { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  '6': { label: 'Suspended', color: 'bg-orange-100 text-orange-700' },
};

// Validation status labels
const VALIDATION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  validated: { label: 'Validated', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
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
}: OrgActivitiesTableProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <CardContent>
          <div className="space-y-2">
            {[...Array(limit > 5 ? 5 : limit)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load activities: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-slate-600" />
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
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Icon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">{config.emptyMessage}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={variant === 'main' ? 'w-[30%]' : 'w-[35%]'}>Activity</TableHead>
                {variant === 'main' && (
                  <>
                    <TableHead>Activity Status</TableHead>
                    <TableHead>Publication Status</TableHead>
                    <TableHead>Validation Status</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Planned Disb.</TableHead>
                    <TableHead>Updated</TableHead>
                  </>
                )}
                {variant === 'recently_edited' && (
                  <>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </>
                )}
                {variant === 'closing_soon' && (
                  <>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days Left</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
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
                          <span className="text-sm text-slate-700">
                            {ACTIVITY_STATUS_LABELS[activity.activityStatus]?.label || activity.activityStatus}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize text-slate-700">
                          {activity.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {activity.validationStatus && (
                          <span className="text-sm text-slate-700">
                            {VALIDATION_STATUS_LABELS[activity.validationStatus]?.label || activity.validationStatus}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {activity.totalBudgetOriginal && activity.totalBudgetOriginal > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-medium">
                              <span className="text-xs text-gray-500 mr-1 font-normal">
                                {activity.currency}
                              </span>
                              {formatCurrency(activity.totalBudgetOriginal, activity.currency)}
                            </span>
                            {activity.totalBudget && activity.totalBudget > 0 && (
                              <span className="text-xs text-gray-500 mt-0.5">
                                <span className="mr-1">USD</span>
                                {formatCurrency(activity.totalBudget, 'USD')}
                              </span>
                            )}
                          </div>
                        ) : activity.totalBudget && activity.totalBudget > 0 ? (
                          <span className="font-medium">
                            <span className="text-xs text-gray-500 mr-1 font-normal">USD</span>
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
                              <span className="text-xs text-gray-500 mr-1 font-normal">
                                {activity.currency}
                              </span>
                              {formatCurrency(activity.totalPlannedDisbursementsOriginal, activity.currency)}
                            </span>
                            {activity.totalPlannedDisbursements && activity.totalPlannedDisbursements > 0 && (
                              <span className="text-xs text-gray-500 mt-0.5">
                                <span className="mr-1">USD</span>
                                {formatCurrency(activity.totalPlannedDisbursements, 'USD')}
                              </span>
                            )}
                          </div>
                        ) : activity.totalPlannedDisbursements && activity.totalPlannedDisbursements > 0 ? (
                          <span className="font-medium">
                            <span className="text-xs text-gray-500 mr-1 font-normal">USD</span>
                            {formatCurrency(activity.totalPlannedDisbursements, 'USD')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500" title={format(new Date(activity.lastUpdated), 'PPpp')}>
                          {formatDistanceToNow(new Date(activity.lastUpdated), { addSuffix: true })}
                        </span>
                      </TableCell>
                    </>
                  )}

                  {variant === 'recently_edited' && (
                    <>
                      <TableCell>
                        <span className="text-sm text-slate-600" title={format(new Date(activity.lastUpdated), 'PPpp')}>
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
                          <Pencil className="h-4 w-4 hover: text-slate-500 ring-1 ring-slate-300 rounded-sm" />
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
      </CardContent>
    </Card>
  );
}
