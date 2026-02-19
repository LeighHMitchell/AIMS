"use client";

import React, { useState, useEffect } from 'react';
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
} from '@/components/ui/table';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Bookmark,
  BookmarkX,
  ArrowRight,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { apiFetch } from '@/lib/api-fetch';

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

// Format currency without $ sign
function formatCurrencyAmount(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function BookmarkedActivitiesTable() {
  const router = useRouter();
  const { user } = useUser();
  const { removeBookmark } = useBookmarks();
  const [activities, setActivities] = useState<BookmarkedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
      // Remove from local state for immediate feedback
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
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Activity</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[60px]"></TableHead>
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
                    <div>
                      <p className="font-medium" title={activity.title_narrative}>
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
                      <span className="text-sm text-slate-700">
                        {activity.reporting_org_name || activity.created_by_org_name || '-'}
                        {(activity.reporting_org_acronym || activity.created_by_org_acronym) && (
                          <> ({activity.reporting_org_acronym || activity.created_by_org_acronym})</>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {activity.totalBudgetOriginal && activity.totalBudgetOriginal > 0 ? (
                      <div className="text-sm">
                        <div className="font-medium">
                          <span className="text-xs text-gray-500 mr-1">
                            {activity.totalBudgetCurrency || 'USD'}
                          </span>
                          {formatCurrencyAmount(activity.totalBudgetOriginal, activity.totalBudgetCurrency || 'USD')}
                        </div>
                        {activity.totalBudgetCurrency && activity.totalBudgetCurrency !== 'USD' && activity.totalBudgetUSD && activity.totalBudgetUSD > 0 && (
                          <div className="text-xs text-slate-500">
                            <span className="text-xs text-gray-500 mr-1">USD</span>
                            {formatCurrencyAmount(activity.totalBudgetUSD, 'USD')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500" title={format(new Date(activity.updated_at), 'PPpp')}>
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
