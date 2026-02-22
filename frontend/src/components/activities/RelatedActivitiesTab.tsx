'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Loader2, Link2, ArrowRight, ArrowLeft, Network, List, Plus, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import RelatedActivitiesNetworkGraph from './RelatedActivitiesNetworkGraph';
import { AddLinkedActivityModal } from '@/components/modals/AddLinkedActivityModal';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';

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
  isExternal?: boolean;
  isResolved?: boolean;
}

interface RelatedActivitiesTabProps {
  activityId: string;
  activityTitle?: string;
  readOnly?: boolean;
}

const getStatusColor = (status?: string) => {
  if (!status) return 'bg-muted text-foreground';
  
  const statusNum = parseInt(status);
  if (statusNum === 2) return 'bg-green-100 text-green-800'; // Active
  if (statusNum === 3) return 'bg-blue-100 text-blue-800'; // Completed
  if (statusNum === 1) return 'bg-yellow-100 text-yellow-800'; // Pipeline
  if (statusNum === 5) return 'bg-red-100 text-red-800'; // Cancelled
  return 'bg-muted text-foreground';
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

export function RelatedActivitiesTab({ activityId, activityTitle = 'Current Activity', readOnly = false }: RelatedActivitiesTabProps) {
  const [loading, setLoading] = useState(true);
  const [relatedActivities, setRelatedActivities] = useState<RelatedActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const fetchRelatedActivities = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch(`/api/activities/${activityId}/related-activities`);

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

  const handleSync = async () => {
    // TODO: Implement sync functionality to check if external IATI IDs now exist in database
    setSyncing(true);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/sync-external-links`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Synced ${data.resolvedCount || 0} external link(s)`);
        // Refresh the list
        const refreshResponse = await apiFetch(`/api/activities/${activityId}/related-activities`);
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json();
          setRelatedActivities(refreshedData || []);
        }
      } else {
        toast.error('Failed to sync external links');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Failed to sync external links');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (relationshipId: string) => {
    if (!confirm('Are you sure you want to remove this linked activity?')) {
      return;
    }

    try {
      const response = await apiFetch(`/api/activities/${activityId}/related-activities?relationship_id=${relationshipId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast.success('Link removed successfully');
        setRelatedActivities(prev => prev.filter(a => a.id !== relationshipId));
      } else {
        toast.error('Failed to remove link');
      }
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Failed to remove link');
    }
  };

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

  const hasExternalLinks = relatedActivities.some(a => a.isExternal && !a.isResolved);

  if (relatedActivities.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm mb-4">No related activities found</p>
              {!readOnly && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Linked Activity
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        {!readOnly && (
          <AddLinkedActivityModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            activityId={activityId}
            onSuccess={() => {
              const refresh = async () => {
                const response = await apiFetch(`/api/activities/${activityId}/related-activities`);
                if (response.ok) {
                  const data = await response.json();
                  setRelatedActivities(data || []);
                }
              };
              refresh();
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {!readOnly && hasExternalLinks && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have external activity links that haven't been resolved yet. Click "Sync External Links" to check if these activities now exist in your database.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Related Activities</CardTitle>
            <div className="flex gap-2">
              {!readOnly && (
                <Button
                  onClick={() => setShowAddModal(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              )}
              {!readOnly && hasExternalLinks && (
                <Button
                  onClick={handleSync}
                  variant="outline"
                  size="sm"
                  disabled={syncing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  Sync External Links
                </Button>
              )}
              <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={cn(viewMode === 'table' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
                >
                  <List className="h-4 w-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('graph')}
                  className={cn(viewMode === 'graph' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
                >
                  <Network className="h-4 w-4 mr-2" />
                  Network Graph
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === 'table' ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="w-[50px]">Direction</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>IATI Identifier</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Source</TableHead>
                      {!readOnly && <TableHead className="w-[80px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatedActivities.map((activity) => (
                      <TableRow key={activity.id} className="hover:bg-muted/50">
                        <TableCell>
                          {activity.direction === 'incoming' ? (
                            <ArrowLeft className="h-4 w-4 text-green-600" title="Incoming" />
                          ) : (
                            <ArrowRight className="h-4 w-4 text-blue-600" title="Outgoing" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {activity.title}
                            </span>
                            {activity.acronym && (
                              <span className="text-xs text-muted-foreground">
                                {activity.acronym}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {activity.iatiIdentifier || 'N/A'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">
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
                            <span className="text-sm font-medium text-foreground">
                              {activity.relationshipType}
                            </span>
                            {activity.relationshipNarrative && (
                              <span className="text-xs text-muted-foreground mt-1">
                                {activity.relationshipNarrative}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">
                              {activity.source}
                            </span>
                            {activity.isExternal && (
                              <Badge variant="outline" className="text-xs w-fit bg-yellow-50 text-yellow-700 border-yellow-200">
                                External
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {!readOnly && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {!activity.isExternal && (
                                <Link
                                  href={`/activities/${activity.id}`}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span className="sr-only">View activity</span>
                                </Link>
                              )}
                              {activity.source === 'Linked Activities' || activity.isExternal ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(activity.id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted">
                <p className="text-xs text-muted-foreground">
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

      {!readOnly && (
        <AddLinkedActivityModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          activityId={activityId}
          onSuccess={() => {
            const refresh = async () => {
              const response = await apiFetch(`/api/activities/${activityId}/related-activities`);
              if (response.ok) {
                const data = await response.json();
                setRelatedActivities(data || []);
              }
            };
            refresh();
          }}
        />
      )}
    </div>
  );
}

export default RelatedActivitiesTab;











