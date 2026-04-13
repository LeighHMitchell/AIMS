"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { formatDistanceToNow, format } from 'date-fns';
import {
  Bookmark,
  BookmarkX,
  ArrowRight,
  LayoutGrid,
  TableIcon,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import ActivityCardModern from '@/components/activities/ActivityCardModern';

type ViewMode = 'card' | 'table';
type SortField = 'title' | 'reporting_org' | 'updated_at';
type SortDirection = 'asc' | 'desc';

interface BookmarkedActivity {
  id: string;
  title_narrative: string;
  iati_identifier?: string;
  acronym?: string;
  activity_status?: string;
  publication_status?: string;
  submission_status?: string;
  totalBudget?: number;
  totalPlannedDisbursements?: number;
  updated_at: string;
  bookmarkedAt: string;
  created_by_org_name?: string;
  created_by_org_acronym?: string;
  // Organization details
  reporting_org_id?: string;
  reporting_org_logo?: string;
  reporting_org_name?: string;
  reporting_org_acronym?: string;
  // Banner/icon
  banner?: string;
  icon?: string;
  // Budget with currency
  totalBudgetOriginal?: number;
  totalBudgetCurrency?: string;
  totalBudgetUSD?: number;
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


export function BookmarkedActivitiesTable() {
  const router = useRouter();
  const { user } = useUser();
  const { removeBookmark } = useBookmarks();
  const [activities, setActivities] = useState<BookmarkedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedActivities = useMemo(() => {
    const sorted = [...activities];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = (a.title_narrative || '').localeCompare(b.title_narrative || '');
          break;
        case 'reporting_org':
          cmp = (a.reporting_org_name || a.created_by_org_name || '').localeCompare(
            b.reporting_org_name || b.created_by_org_name || ''
          );
          break;
        case 'updated_at':
          cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [activities, sortField, sortDirection]);

  const fetchBookmarkedActivities = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch(`/api/bookmarks/activities?userId=${user.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch bookmarked activities');
      }

      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err) {
      console.error('[BookmarkedActivitiesTable] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bookmarked activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarkedActivities();
  }, [user?.id]);

  const handleRowClick = (activityId: string) => {
    router.push(`/activities/${activityId}`);
  };

  const handleRemoveBookmark = async (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation();
    setRemovingId(activityId);

    try {
      await removeBookmark(activityId);
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    } catch (error) {
      console.error('[BookmarkedActivitiesTable] Error removing bookmark:', error);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
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
            <Bookmark className="h-5 w-5" />
            Bookmarked Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load bookmarked activities: {error}</p>
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
              <Bookmark className="h-5 w-5 text-slate-600" />
              Bookmarked Activities
            </CardTitle>
            <CardDescription>
              Your saved activities for quick access
            </CardDescription>
          </div>
          {activities.length > 0 && (
            <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-8 p-0',
                  viewMode === 'card'
                    ? 'bg-white shadow-sm text-slate-900 hover:bg-white'
                    : 'text-slate-500 hover:text-slate-700'
                )}
                onClick={() => setViewMode('card')}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-8 p-0',
                  viewMode === 'table'
                    ? 'bg-white shadow-sm text-slate-900 hover:bg-white'
                    : 'text-slate-500 hover:text-slate-700'
                )}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-2">No bookmarked activities</p>
            <p className="text-xs text-slate-400">
              Bookmark activities from the activity profile or activity cards to see them here.
            </p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedActivities.map((activity) => (
              <ActivityCardModern
                key={activity.id}
                activity={{
                  id: activity.id,
                  title: activity.title_narrative,
                  iati_id: activity.iati_identifier,
                  acronym: activity.acronym,
                  activity_status: activity.activity_status,
                  publication_status: activity.publication_status,
                  banner: activity.banner,
                  icon: activity.icon,
                  updated_at: activity.updated_at,
                  created_by_org_name: activity.reporting_org_name || activity.created_by_org_name,
                  created_by_org_acronym: activity.reporting_org_acronym || activity.created_by_org_acronym,
                  totalBudget: activity.totalBudgetUSD || activity.totalBudgetOriginal || activity.totalBudget || 0,
                }}
              />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={`w-[40%] ${sortableHeaderClasses}`} onClick={() => handleSort('title')}>
                  <div className="flex items-center gap-1">
                    Activity
                    {getSortIcon('title', sortField, sortDirection)}
                  </div>
                </TableHead>
                <TableHead className={sortableHeaderClasses} onClick={() => handleSort('reporting_org')}>
                  <div className="flex items-center gap-1">
                    Reported By
                    {getSortIcon('reporting_org', sortField, sortDirection)}
                  </div>
                </TableHead>
                <TableHead className={sortableHeaderClasses} onClick={() => handleSort('updated_at')}>
                  <div className="flex items-center gap-1">
                    Updated
                    {getSortIcon('updated_at', sortField, sortDirection)}
                  </div>
                </TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedActivities.map((activity) => (
                <TableRow
                  key={activity.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(activity.id)}
                >
                  <TableCell>
                    <div>
                      <p className="text-sm text-foreground" title={activity.title_narrative}>
                        {activity.title_narrative}
                        {activity.acronym && (
                          <span> ({activity.acronym})</span>
                        )}
                      </p>
                      {activity.iati_identifier && (
                        <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded inline-block mt-1">
                          {activity.iati_identifier}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {activity.reporting_org_logo && (
                        <img
                          src={activity.reporting_org_logo}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-sm text-foreground">
                        {activity.reporting_org_name || activity.created_by_org_name || '-'}
                        {(activity.reporting_org_acronym || activity.created_by_org_acronym) && (
                          <> ({activity.reporting_org_acronym || activity.created_by_org_acronym})</>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground" title={format(new Date(activity.updated_at), 'PPpp')}>
                      {formatDistanceToNow(new Date(activity.updated_at), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-red-50"
                      onClick={(e) => handleRemoveBookmark(e, activity.id)}
                      disabled={removingId === activity.id}
                      title="Remove bookmark"
                    >
                      <BookmarkX className="h-4 w-4 text-slate-500 hover:text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
