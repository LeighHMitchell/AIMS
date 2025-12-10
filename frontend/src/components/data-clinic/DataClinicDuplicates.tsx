"use client"

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  AlertCircle, 
  RefreshCw,
  Copy,
  Link2,
  Merge,
  X,
  ExternalLink,
  Building2,
  FileText,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import { DuplicatePairCard } from "./DuplicatePairCard";

// Types
interface DuplicateStats {
  total: number;
  activities: {
    total: number;
    byDetectionType: {
      exact_iati_id: number;
      exact_crs_id: number;
      cross_org: number;
      similar_name: number;
    };
    byConfidence: {
      high: number;
      medium: number;
      low: number;
    };
    suggestedLinks: number;
  };
  organizations: {
    total: number;
    byDetectionType: {
      exact_iati_id: number;
      exact_name: number;
      exact_acronym: number;
      similar_name: number;
    };
    byConfidence: {
      high: number;
      medium: number;
      low: number;
    };
  };
  byConfidence: {
    high: number;
    medium: number;
    low: number;
  };
  lastDetectedAt: string | null;
  dismissals: {
    total: number;
    byAction: {
      not_duplicate: number;
      linked: number;
      merged: number;
    };
  };
  migrationRequired?: boolean;
  message?: string;
}

interface DuplicatePair {
  id: string;
  entity_type: 'activity' | 'organization';
  entity_id_1: string;
  entity_id_2: string;
  detection_type: string;
  confidence: 'high' | 'medium' | 'low';
  similarity_score: number | null;
  match_details: Record<string, any>;
  is_suggested_link: boolean;
  detected_at: string;
  entity1: any;
  entity2: any;
  recommendedPrimaryId?: string;
}

// Detection type labels
const DETECTION_TYPE_LABELS: Record<string, string> = {
  exact_iati_id: 'Exact IATI ID',
  exact_crs_id: 'Exact CRS ID',
  exact_name: 'Exact Name',
  exact_acronym: 'Exact Acronym',
  similar_name: 'Similar Name',
  cross_org: 'Cross-Organization',
};

// Confidence colors
const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-orange-100 text-orange-800 border-orange-200',
  low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const CONFIDENCE_ICONS: Record<string, React.ReactNode> = {
  high: <AlertCircle className="h-3 w-3" />,
  medium: <AlertTriangle className="h-3 w-3" />,
  low: <Clock className="h-3 w-3" />,
};

export function DataClinicDuplicates() {
  const { user } = useUser();
  const [stats, setStats] = useState<DuplicateStats | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'activities' | 'organizations'>('activities');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [detectionTypeFilter, setDetectionTypeFilter] = useState<string>('all');

  const isSuperUser = user?.role === 'super_user';

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/data-clinic/duplicates/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('[DataClinicDuplicates] Error fetching stats:', error);
      toast.error('Failed to load duplicate statistics');
    }
  }, []);

  // Fetch duplicates
  const fetchDuplicates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('entity_type', activeSubTab === 'activities' ? 'activity' : 'organization');
      if (confidenceFilter !== 'all') params.set('confidence', confidenceFilter);
      if (detectionTypeFilter !== 'all') params.set('detection_type', detectionTypeFilter);
      params.set('limit', '100');

      const res = await fetch(`/api/data-clinic/duplicates?${params}`);
      if (!res.ok) throw new Error('Failed to fetch duplicates');
      const data = await res.json();
      setDuplicates(data.duplicates || []);
    } catch (error) {
      console.error('[DataClinicDuplicates] Error fetching duplicates:', error);
      toast.error('Failed to load duplicates');
    }
  }, [activeSubTab, confidenceFilter, detectionTypeFilter]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchDuplicates()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchDuplicates]);

  // Refresh detection
  const handleRefresh = async () => {
    if (!isSuperUser) {
      toast.error('Only super users can refresh duplicate detection');
      return;
    }

    setRefreshing(true);
    try {
      const res = await fetch('/api/data-clinic/duplicates/refresh', {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to refresh');
      
      const data = await res.json();
      toast.success(`Detection complete: Found ${data.stats.total} duplicates`);
      
      // Reload data
      await Promise.all([fetchStats(), fetchDuplicates()]);
    } catch (error) {
      console.error('[DataClinicDuplicates] Error refreshing:', error);
      toast.error('Failed to refresh duplicate detection');
    } finally {
      setRefreshing(false);
    }
  };

  // Dismiss duplicate
  const handleDismiss = async (pair: DuplicatePair, action: 'not_duplicate' | 'linked' | 'merged') => {
    try {
      const res = await fetch('/api/data-clinic/duplicates/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: pair.entity_type,
          entity_id_1: pair.entity_id_1,
          entity_id_2: pair.entity_id_2,
          action_taken: action,
          user_id: user?.id,
        }),
      });

      if (!res.ok) throw new Error('Failed to dismiss');

      toast.success(
        action === 'not_duplicate' 
          ? 'Marked as not a duplicate' 
          : action === 'linked'
          ? 'Activities linked'
          : 'Organizations merged'
      );

      // Remove from list
      setDuplicates(prev => prev.filter(d => d.id !== pair.id));
      
      // Update stats
      await fetchStats();
    } catch (error) {
      console.error('[DataClinicDuplicates] Error dismissing:', error);
      toast.error('Failed to dismiss duplicate');
    }
  };

  // Get current entity type stats
  const currentStats = activeSubTab === 'activities' ? stats?.activities : stats?.organizations;

  // Get detection type options based on entity type
  const detectionTypeOptions = activeSubTab === 'activities'
    ? ['exact_iati_id', 'exact_crs_id', 'cross_org', 'similar_name']
    : ['exact_iati_id', 'exact_name', 'exact_acronym', 'similar_name'];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Show migration required message
  if (stats?.migrationRequired) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-8 w-8 text-amber-500 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Database Setup Required</h3>
              <p className="text-muted-foreground mb-4">
                The duplicate detection tables have not been created yet. To enable this feature, 
                please run the following SQL migration in your Supabase database:
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <code className="text-sm">frontend/sql/create_duplicates_tables.sql</code>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                After running the migration, click &quot;Refresh Detection&quot; to scan for duplicates.
              </p>
              {isSuperUser && (
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="mt-4"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Detecting...' : 'Run Detection After Migration'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs for Activities vs Organizations */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'activities' | 'organizations')}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Activities
              {stats?.activities.total ? (
                <Badge variant="secondary" className="ml-1">
                  {stats.activities.total}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organizations
              {stats?.organizations.total ? (
                <Badge variant="secondary" className="ml-1">
                  {stats.organizations.total}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          {isSuperUser && (
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Detecting...' : 'Refresh Detection'}
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {activeSubTab === 'activities' ? 'Activity' : 'Organization'} Duplicate Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* By Confidence */}
              <div 
                className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-50 ${confidenceFilter === 'high' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setConfidenceFilter(confidenceFilter === 'high' ? 'all' : 'high')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <p className="text-sm text-muted-foreground">High Confidence</p>
                </div>
                <p className="text-2xl font-semibold">{currentStats?.byConfidence.high || 0}</p>
              </div>

              <div 
                className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-50 ${confidenceFilter === 'medium' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setConfidenceFilter(confidenceFilter === 'medium' ? 'all' : 'medium')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <p className="text-sm text-muted-foreground">Medium</p>
                </div>
                <p className="text-2xl font-semibold">{currentStats?.byConfidence.medium || 0}</p>
              </div>

              <div 
                className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-50 ${confidenceFilter === 'low' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setConfidenceFilter(confidenceFilter === 'low' ? 'all' : 'low')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <p className="text-sm text-muted-foreground">Low / Review</p>
                </div>
                <p className="text-2xl font-semibold">{currentStats?.byConfidence.low || 0}</p>
              </div>

              {/* Detection Types */}
              {detectionTypeOptions.slice(0, 3).map((type) => (
                <div 
                  key={type}
                  className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-50 ${detectionTypeFilter === type ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setDetectionTypeFilter(detectionTypeFilter === type ? 'all' : type)}
                >
                  <p className="text-sm text-muted-foreground mb-1">{DETECTION_TYPE_LABELS[type]}</p>
                  <p className="text-2xl font-semibold">
                    {(currentStats?.byDetectionType as any)?.[type] || 0}
                  </p>
                </div>
              ))}
            </div>

            {/* Suggested Links (for activities) */}
            {activeSubTab === 'activities' && stats?.activities.suggestedLinks > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {stats.activities.suggestedLinks} cross-organization pairs may be related activities (funder/implementer)
                  </span>
                </div>
              </div>
            )}

            {/* Last detection time */}
            {stats?.lastDetectedAt && (
              <p className="text-xs text-muted-foreground mt-4">
                Last detection: {new Date(stats.lastDetectedAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence Levels</SelectItem>
                  <SelectItem value="high">High Confidence</SelectItem>
                  <SelectItem value="medium">Medium Confidence</SelectItem>
                  <SelectItem value="low">Low / Review</SelectItem>
                </SelectContent>
              </Select>

              <Select value={detectionTypeFilter} onValueChange={setDetectionTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by detection type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Detection Types</SelectItem>
                  {detectionTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DETECTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(confidenceFilter !== 'all' || detectionTypeFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfidenceFilter('all');
                    setDetectionTypeFilter('all');
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}

              <div className="ml-auto text-sm text-muted-foreground">
                Showing {duplicates.length} duplicate pairs
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Duplicate Pairs List */}
        <TabsContent value="activities" className="mt-0">
          {duplicates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium mb-2">No Activity Duplicates Found</h3>
                <p className="text-muted-foreground">
                  {confidenceFilter !== 'all' || detectionTypeFilter !== 'all'
                    ? 'No duplicates match your current filters. Try adjusting your filters.'
                    : 'Great! No potential duplicate activities have been detected.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {duplicates.map((pair) => (
                <DuplicatePairCard
                  key={pair.id}
                  pair={pair}
                  onDismiss={handleDismiss}
                  isSuperUser={isSuperUser}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="organizations" className="mt-0">
          {duplicates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium mb-2">No Organization Duplicates Found</h3>
                <p className="text-muted-foreground">
                  {confidenceFilter !== 'all' || detectionTypeFilter !== 'all'
                    ? 'No duplicates match your current filters. Try adjusting your filters.'
                    : 'Great! No potential duplicate organizations have been detected.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {duplicates.map((pair) => (
                <DuplicatePairCard
                  key={pair.id}
                  pair={pair}
                  onDismiss={handleDismiss}
                  isSuperUser={isSuperUser}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
