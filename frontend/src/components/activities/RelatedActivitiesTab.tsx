'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Loader2, Link2, ArrowRight, ArrowLeft, Network, List } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import RelatedActivitiesNetworkGraph from './RelatedActivitiesNetworkGraph';

interface RelatedActivity {
  id: string;
  title: string;
  acronym?: string;
  iatiIdentifier?: string;
  status?: string;
  organizationName?: string;
  organizationAcronym?: string;
  icon?: string;
  relationshipType: string;
  relationshipNarrative?: string;
  source: string;
  direction: 'incoming' | 'outgoing';
}

interface RelatedActivitiesTabProps {
  activityId: string;
  activityTitle?: string;
}

const getStatusColor = (status?: string) => {
  if (!status) return 'bg-slate-100 text-slate-800';
  
  const statusNum = parseInt(status);
  if (statusNum === 2) return 'bg-green-100 text-green-800'; // Active
  if (statusNum === 3) return 'bg-blue-100 text-blue-800'; // Completed
  if (statusNum === 1) return 'bg-yellow-100 text-yellow-800'; // Pipeline
  if (statusNum === 5) return 'bg-red-100 text-red-800'; // Cancelled
  return 'bg-slate-100 text-slate-800';
};

const getStatusLabel = (status?: string) => {
  if (!status) return 'Unknown';
  
  const statusMap: { [key: string]: string } = {
    '1': 'Pipeline',
    '2': 'Active',
    '3': 'Completed',
    '4': 'Suspended',
    '5': 'Cancelled',
    '6': 'Post-Completion'
  };
  
  return statusMap[status] || 'Unknown';
};

export function RelatedActivitiesTab({ activityId, activityTitle = 'Current Activity' }: RelatedActivitiesTabProps) {
  const [loading, setLoading] = useState(true);
  const [relatedActivities, setRelatedActivities] = useState<RelatedActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');

  useEffect(() => {
    const fetchRelatedActivities = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/activities/${activityId}/related-activities`);

        if (!response.ok) {
          throw new Error('Failed to fetch related activities');
        }

        const data = await response.json();
        setRelatedActivities(data || []);
      } catch (err: any) {
        console.error('Error fetching related activities:', err);
        setError(err.message || 'Failed to load related activities');
      } finally {
        setLoading(false);
      }
    };

    if (activityId) {
      fetchRelatedActivities();
    }
  }, [activityId]);

  // Transform data for network graph
  const networkGraphData = useMemo(() => {
    if (!relatedActivities || relatedActivities.length === 0) {
      return null;
    }

    // Create nodes: current activity + related activities
    const nodes = [
      {
        id: activityId,
        type: 'current' as const,
        name: activityTitle,
        group: 0
      },
      ...relatedActivities.map((activity, index) => ({
        id: activity.id,
        type: 'activity' as const,
        name: activity.title,
        acronym: activity.acronym,
        iatiIdentifier: activity.iatiIdentifier,
        organizationName: activity.organizationName,
        organizationAcronym: activity.organizationAcronym,
        relationshipType: activity.relationshipType,
        source: activity.source,
        status: activity.status,
        group: index + 1
      }))
    ];

    // Create links
    const links = relatedActivities.map(activity => ({
      source: activity.direction === 'incoming' ? activity.id : activityId,
      target: activity.direction === 'incoming' ? activityId : activity.id,
      relationshipType: activity.relationshipType,
      direction: activity.direction
    }));

    return { nodes, links };
  }, [relatedActivities, activityId, activityTitle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (relatedActivities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-slate-500">
            <Link2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No related activities found</p>
            <p className="text-xs mt-1 text-slate-400">
              Related activities can be linked through the Activity Editor or Transaction forms
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Related Activities</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4 mr-2" />
                Table
              </Button>
              <Button
                variant={viewMode === 'graph' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('graph')}
              >
                <Network className="h-4 w-4 mr-2" />
                Network Graph
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === 'table' ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[50px]">Direction</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>IATI Identifier</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatedActivities.map((activity) => (
                      <TableRow key={activity.id} className="hover:bg-slate-50">
                        <TableCell>
                          {activity.direction === 'incoming' ? (
                            <ArrowLeft className="h-4 w-4 text-green-600" title="Incoming" />
                          ) : (
                            <ArrowRight className="h-4 w-4 text-blue-600" title="Outgoing" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">
                              {activity.title}
                            </span>
                            {activity.acronym && (
                              <span className="text-xs text-slate-500">
                                {activity.acronym}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {activity.iatiIdentifier || 'N/A'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-700">
                            {activity.organizationAcronym || activity.organizationName || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusColor(activity.status)}
                          >
                            {getStatusLabel(activity.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">
                              {activity.relationshipType}
                            </span>
                            {activity.relationshipNarrative && (
                              <span className="text-xs text-slate-500 mt-1">
                                {activity.relationshipNarrative}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-600">
                            {activity.source}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/activities/${activity.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="sr-only">View activity</span>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-600">
                  Showing {relatedActivities.length} related {relatedActivities.length === 1 ? 'activity' : 'activities'}
                </p>
              </div>
            </>
          ) : (
            <div className="p-6">
              <RelatedActivitiesNetworkGraph
                data={networkGraphData}
                loading={loading}
                currentActivityName={activityTitle}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default RelatedActivitiesTab;







