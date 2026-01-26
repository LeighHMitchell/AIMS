"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import {
  Users,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Download,
} from 'lucide-react';
import { FocalPointAvatarGroup, FocalPointInfo } from '@/components/ui/focal-point-avatar-group';
import { toast } from 'sonner';
import { convertToCSV, downloadCSV, CSVColumn } from '@/lib/csv-utils';
import { apiFetch } from '@/lib/api-fetch';

interface FocalPointCheckCardProps {
  organizationId: string;
  limit?: number;
}

interface FocalPoint {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  type: 'government_focal_point' | 'development_partner_focal_point';
}

interface ActivityWithFocalPoints {
  id: string;
  title: string;
  iatiIdentifier?: string;
  governmentFocalPoints: FocalPoint[];
  developmentPartnerFocalPoints: FocalPoint[];
}

export function FocalPointCheckCard({
  organizationId,
  limit = 10,
}: FocalPointCheckCardProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityWithFocalPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        organization_id: organizationId,
      });

      const response = await apiFetch(`/api/data-clinic/focal-points?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch focal points data');
      }

      const data = await response.json();
      
      setTotal(data.missingCount || 0);
      setActivities((data.activities || []).slice(0, limit));
    } catch (err) {
      console.error('[FocalPointCheckCard] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [organizationId, limit]);

  useEffect(() => {
    if (organizationId) {
      fetchActivities();
    }
  }, [organizationId, fetchActivities]);

  const handleActivityClick = (activityId: string) => {
    router.push(`/activities/${activityId}?tab=focal-points`);
  };

  const handleViewAll = () => {
    router.push('/activities');
  };

  const handleDownloadCSV = async () => {
    try {
      const params = new URLSearchParams({
        organization_id: organizationId,
      });

      const response = await apiFetch(`/api/data-clinic/focal-points?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      const allActivities: ActivityWithFocalPoints[] = data.activities || [];

      if (allActivities.length === 0) {
        toast.info('No activities to export');
        return;
      }

      const columns: CSVColumn<ActivityWithFocalPoints>[] = [
        { header: 'Activity ID', accessor: 'id' },
        { header: 'IATI Identifier', accessor: 'iatiIdentifier' },
        { header: 'Activity Title', accessor: 'title' },
        { 
          header: 'Missing Government FP', 
          accessor: (row) => row.governmentFocalPoints.length === 0 
        },
        { 
          header: 'Missing Development Partner FP', 
          accessor: (row) => row.developmentPartnerFocalPoints.length === 0 
        },
        { 
          header: 'Government Focal Points', 
          accessor: (row) => row.governmentFocalPoints.map(fp => `${fp.name} (${fp.email})`).join('; ') 
        },
        { 
          header: 'Development Partner Focal Points', 
          accessor: (row) => row.developmentPartnerFocalPoints.map(fp => `${fp.name} (${fp.email})`).join('; ') 
        },
      ];

      const csv = convertToCSV(allActivities, columns);
      downloadCSV(csv, 'activities_missing_focal_points');
      toast.success(`Exported ${allActivities.length} activities`);
    } catch (err) {
      console.error('CSV export error:', err);
      toast.error('Failed to export CSV');
    }
  };

  // Convert FocalPoint to FocalPointInfo for the avatar group
  const toFocalPointInfo = (fps: FocalPoint[]): FocalPointInfo[] => {
    return fps.map(fp => ({
      name: fp.name,
      email: fp.email,
      avatar_url: fp.avatar_url,
    }));
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
            <AlertCircle className="h-5 w-5 text-red-500" />
            Focal Point Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load focal points data: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state - all activities have focal points!
  if (activities.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-500" />
            Focal Point Check
          </CardTitle>
          <CardDescription>
            Ensure all activities have government and development partner focal points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-lg font-medium text-slate-700">All activities have focal points!</p>
            <p className="text-sm text-slate-500 mt-1">
              Great job! All your activities have both government and development partner focal points assigned.
            </p>
          </div>
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
              <Users className="h-5 w-5 text-[#7b95a7]" />
              Focal Point Check
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({total} {total === 1 ? 'activity' : 'activities'})
              </span>
            </CardTitle>
            <CardDescription>
              Activities missing government and/or development partner focal points
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              title="Download as CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
            {total > limit && (
              <Button variant="outline" size="sm" onClick={handleViewAll}>
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Activity</TableHead>
              <TableHead className="w-[180px]">Government FP</TableHead>
              <TableHead className="w-[180px]">Development Partner FP</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow
                key={activity.id}
                className="hover:bg-slate-50"
              >
                <TableCell
                  className="cursor-pointer"
                  onClick={() => handleActivityClick(activity.id)}
                >
                  <div>
                    <p className="font-medium text-slate-900 line-clamp-1 hover:text-blue-600 hover:underline">
                      {activity.title}
                    </p>
                    {activity.iatiIdentifier && (
                      <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {activity.iatiIdentifier}
                      </code>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <FocalPointAvatarGroup
                    focalPoints={toFocalPointInfo(activity.governmentFocalPoints)}
                    maxDisplay={2}
                    size="sm"
                    label="Government Focal Points"
                  />
                </TableCell>
                <TableCell>
                  <FocalPointAvatarGroup
                    focalPoints={toFocalPointInfo(activity.developmentPartnerFocalPoints)}
                    maxDisplay={2}
                    size="sm"
                    label="Development Partner Focal Points"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-slate-900"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivityClick(activity.id);
                    }}
                  >
                    Edit
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

