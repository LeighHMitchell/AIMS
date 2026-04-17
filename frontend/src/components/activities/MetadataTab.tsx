"use client";

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Clock, 
  User, 
  Calendar, 
  FileText, 
  Database, 
  Activity, 
  AlertCircle,
  Pencil,
  Trash2,
  Plus,
  Upload,
  Download,
  RefreshCw,
  Eye,
  UserCheck,
  DollarSign,
  Hash,
  Globe,
  History,
  Building
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LockedOrganizationField } from '@/components/ui/locked-organization-field';
import { useOrganizations } from '@/hooks/use-organizations';
import { getActivityStatusByCode } from '@/data/activity-status-types';
import { useUser } from '@/hooks/useUser';
import { USER_ROLES } from '@/types/user';
import { toast } from 'sonner';
import { LanguageSearchableSelect } from '@/components/forms/LanguageSearchableSelect';
import { useFieldAutosave } from '@/hooks/use-field-autosave-new';
import { LabelSaveIndicator } from '@/components/ui/save-indicator';
import { apiFetch } from '@/lib/api-fetch';

interface MetadataTabProps {
  activityId: string;
}

interface ActivityMetadata {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  created_by?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  updated_by?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  publication_status?: string;
  submission_status?: string;
  activity_status?: string;
  iati_identifier?: string;
  partner_id?: string;
  total_budget?: number;
  total_disbursed?: number;
  version?: number;
  sync_status?: string;
  last_sync_time?: string;
  auto_sync?: boolean;
  reporting_org_id?: string;
  created_by_org_name?: string;
  created_by_org_acronym?: string;
  language?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  user_id?: string;
  activity_id: string;
  details: {
    entityType?: string;
    entityId?: string;
    activityTitle?: string;
    user?: {
      id: string;
      name: string;
      role: string;
    };
    metadata?: {
      fieldChanged?: string;
      oldValue?: any;
      newValue?: any;
    };
  };
  created_at: string;
  updated_at: string;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  organisation?: string;
  type: string;
  role?: string;
}

interface MetadataResponse {
  metadata: ActivityMetadata;
  logs: ActivityLog[];
  contacts: {
    all_contacts: Contact[];
  };
  stats: {
    totalLogs: number;
    lastModified: string;
    createdDaysAgo: number;
    lastModifiedDaysAgo: number;
  };
}

const getActionIcon = (action: string) => {
  switch (action.toLowerCase()) {
    case 'create':
    case 'created':
      return <Plus className="h-4 w-4 text-muted-foreground" />;
    case 'edit':
    case 'update':
    case 'updated':
      return <Pencil className="h-4 w-4 text-muted-foreground" />;
    case 'delete':
    case 'deleted':
      return <Trash2 className="h-4 w-4 text-destructive" />;
    case 'publish':
    case 'published':
      return <Upload className="h-4 w-4 text-muted-foreground" />;
    case 'unpublish':
    case 'unpublished':
      return <Download className="h-4 w-4 text-muted-foreground" />;
    case 'sync':
    case 'synced':
      return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
    case 'view':
    case 'viewed':
      return <Eye className="h-4 w-4 text-muted-foreground" />;
    case 'validate':
    case 'validated':
      return <UserCheck className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};

const getActionDescription = (log: ActivityLog): string => {
  const user = log.details.user?.name || 'Unknown user';
  const action = log.action;
  const metadata = log.details.metadata;

  if (metadata?.fieldChanged) {
    return `${user} updated ${metadata.fieldChanged}`;
  }

  switch (action.toLowerCase()) {
    case 'create':
    case 'created':
      return `${user} created this activity`;
    case 'edit':
    case 'update':
    case 'updated':
      return `${user} made changes to this activity`;
    case 'delete':
    case 'deleted':
      return `${user} deleted this activity`;
    case 'publish':
    case 'published':
      return `${user} published this activity`;
    case 'unpublish':
    case 'unpublished':
      return `${user} unpublished this activity`;
    case 'sync':
    case 'synced':
      return `${user} synced this activity with IATI`;
    case 'validate':
    case 'validated':
      return `${user} validated this activity`;
    default:
      return `${user} performed ${action} on this activity`;
  }
};

const ACTIVITY_STATUS_WORD_TO_CODE: Record<string, string> = {
  pipeline: '1',
  implementation: '2',
  finalisation: '3',
  closed: '4',
  cancelled: '5',
  suspended: '6',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Module-level cache so re-mounts don't flash a skeleton for already-fetched data
const metadataCache = new Map<string, MetadataResponse>();

export default function MetadataTab({ activityId }: MetadataTabProps) {
  const cached = activityId ? metadataCache.get(activityId) : null;
  const [data, setData] = useState<MetadataResponse | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [savingReportingOrg, setSavingReportingOrg] = useState(false);
  const [language, setLanguage] = useState<string>('en');
  
  const { user } = useUser();
  const { organizations, loading: organizationsLoading } = useOrganizations();

  const languageAutosave = useFieldAutosave('language', {
    activityId,
    userId: user?.id,
    onSuccess: () => {
      toast.success('Language saved', { position: 'top-center' });
    },
  });

  const handleReportingOrgSave = async (newReportingOrgId: string) => {
    setSavingReportingOrg(true);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/reporting-org`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reporting_org_id: newReportingOrgId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update reporting organization');
      }

      const result = await response.json();
      
      // Update the local data with the new values
      if (data) {
        setData({
          ...data,
          metadata: {
            ...data.metadata,
            reporting_org_id: result.data.reporting_org_id,
            created_by_org_name: result.data.created_by_org_name,
            created_by_org_acronym: result.data.created_by_org_acronym
          }
        });
      }

      toast.success('Reporting organization updated');
      
      // Refresh metadata to ensure UI is synchronized
      await fetchMetadata();
      
      // Also trigger a page refresh to update other parts of the UI
      window.dispatchEvent(new CustomEvent('reporting-org-updated', { 
        detail: { 
          activityId, 
          newReportingOrgId,
          organizationData: result.data 
        } 
      }));
    } catch (error) {
      console.error('[AIMS] Error updating reporting organization:', error);
      toast.error('Couldn\u2019t update the reporting organization. Check your connection and try again.');
    } finally {
      setSavingReportingOrg(false);
    }
  };

  const fetchMetadata = async (showSkeleton = false) => {
    try {
      // Only show skeleton on first load when we have no data yet
      if (showSkeleton || !data) {
        setLoading(true);
      }
      setError(null);
      
      const response = await apiFetch(`/api/activities/${activityId}/metadata`, {
        cache: 'no-store', // Force fresh data, no caching
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[MetadataTab] API Error:', response.status, errorBody);
        throw new Error(`Failed to fetch metadata: ${response.status} - ${errorBody}`);
      }
      
      const result = await response.json();
      console.log('[MetadataTab] Reporting org data:', {
        reporting_org_id: result.metadata?.reporting_org_id,
        created_by_org_name: result.metadata?.created_by_org_name,
        created_by_org_acronym: result.metadata?.created_by_org_acronym
      });
      setData(result);
      if (activityId) metadataCache.set(activityId, result);
      setLanguage(result.metadata?.language || 'en');
    } catch (err) {
      console.error('[AIMS] Error fetching activity metadata:', err);
      setError('Couldn\u2019t load activity metadata. Try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activityId && activityId !== 'undefined' && activityId !== 'null') {
      fetchMetadata();
    } else {
      setLoading(false);
      setError('No activity ID provided');
    }
  }, [activityId]);

  // Also refresh when the component becomes visible (tab is selected)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activityId) {
        fetchMetadata();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activityId]);

  // Listen for activity-updated event to refresh metadata after import
  useEffect(() => {
    const handleActivityUpdate = (event: CustomEvent) => {
      if (event.detail.activityId === activityId) {
        fetchMetadata();
      }
    };

    window.addEventListener('activity-updated', handleActivityUpdate as EventListener);
    return () => window.removeEventListener('activity-updated', handleActivityUpdate as EventListener);
  }, [activityId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchMetadata}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No activity information is available yet.</AlertDescription>
      </Alert>
    );
  }

  const { metadata, logs, stats } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={fetchMetadata}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Metadata Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {/* Title */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground w-[180px] bg-muted/30 align-top">Title</td>
              <td className="px-4 py-3 text-foreground font-medium">{metadata.title}</td>
            </tr>
            {/* Activity ID (code) */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">Code</td>
              <td className="px-4 py-3">
                <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">{metadata.partner_id || 'Not assigned'}</code>
              </td>
            </tr>
            {/* IATI ID */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">IATI ID</td>
              <td className="px-4 py-3">
                <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">{metadata.iati_identifier || 'Not assigned'}</code>
              </td>
            </tr>
            {/* UUID */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">UUID</td>
              <td className="px-4 py-3">
                <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">{metadata.id}</code>
              </td>
            </tr>
            {/* Activity Status - show code and name */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">Activity Status</td>
              <td className="px-4 py-3 text-foreground">
                {(() => {
                  const statusWord = metadata.activity_status || 'pipeline';
                  const code = ACTIVITY_STATUS_WORD_TO_CODE[statusWord] || statusWord;
                  const statusInfo = getActivityStatusByCode(code);
                  return statusInfo ? (
                    <span className="inline-flex items-center gap-2">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">{statusInfo.code}</code>
                      {statusInfo.name}
                    </span>
                  ) : statusWord;
                })()}
              </td>
            </tr>
            {/* Publication Status */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">Publication Status</td>
              <td className="px-4 py-3 text-foreground capitalize">{metadata.publication_status || 'draft'}</td>
            </tr>
            {/* Submission Status */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">Submission Status</td>
              <td className="px-4 py-3 text-foreground capitalize">{metadata.submission_status || 'pending'}</td>
            </tr>
            {/* Version */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">Version</td>
              <td className="px-4 py-3 text-foreground">{metadata.version || 1}</td>
            </tr>
            {/* Creation */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">Created</td>
              <td className="px-4 py-3 text-foreground">
                {format(new Date(metadata.created_at), 'PPP \'at\' p')}
                <span className="text-muted-foreground ml-2">({formatDistanceToNow(new Date(metadata.created_at), { addSuffix: true })})</span>
              </td>
            </tr>
            {metadata.created_by && (
              <tr>
                <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">Created By</td>
                <td className="px-4 py-3 text-foreground">
                  {metadata.created_by.name}
                  <span className="text-muted-foreground ml-2">{metadata.created_by.role}</span>
                  {metadata.created_by.email && (
                    <span className="text-muted-foreground ml-2">· {metadata.created_by.email}</span>
                  )}
                </td>
              </tr>
            )}
            {/* Last Modified */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">Last Modified</td>
              <td className="px-4 py-3 text-foreground">
                {format(new Date(metadata.updated_at), 'PPP \'at\' p')}
                <span className="text-muted-foreground ml-2">({formatDistanceToNow(new Date(metadata.updated_at), { addSuffix: true })})</span>
              </td>
            </tr>
            {metadata.updated_by && (
              <tr>
                <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">Modified By</td>
                <td className="px-4 py-3 text-foreground">
                  {metadata.updated_by.name}
                  <span className="text-muted-foreground ml-2">{metadata.updated_by.role}</span>
                  {metadata.updated_by.email && (
                    <span className="text-muted-foreground ml-2">· {metadata.updated_by.email}</span>
                  )}
                </td>
              </tr>
            )}
            {/* Sync */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">Sync Status</td>
              <td className="px-4 py-3 text-foreground capitalize">{metadata.sync_status || 'never'}</td>
            </tr>
            {metadata.last_sync_time && (
              <tr>
                <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">Last Sync</td>
                <td className="px-4 py-3 text-foreground">
                  {format(new Date(metadata.last_sync_time), 'PPP \'at\' p')}
                </td>
              </tr>
            )}
            {/* Narrative Language */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">
                <LabelSaveIndicator
                  isSaving={languageAutosave.isSaving}
                  isSaved={languageAutosave.isPersistentlySaved || !!language}
                  hasValue={!!language}
                >
                  Narrative Language
                </LabelSaveIndicator>
              </td>
              <td className="px-4 py-3">
                <div className="max-w-xs">
                  <LanguageSearchableSelect
                    value={language}
                    onValueChange={(value) => {
                      setLanguage(value);
                      languageAutosave.triggerFieldSave(value);
                    }}
                    placeholder="Select language"
                    dropdownId="metadata-language"
                  />
                </div>
              </td>
            </tr>
            {/* Reporting Organization */}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/30 align-top">Reporting Organization</td>
              <td className="px-4 py-3">
                <div className="max-w-md">
                  <LockedOrganizationField
                    label="Reported by"
                    value={metadata.reporting_org_id || ""}
                    onChange={() => {}}
                    organizations={organizations}
                    onSave={handleReportingOrgSave}
                    saving={savingReportingOrg}
                    isSuperUser={true}
                    placeholder="Select reporting organization..."
                    lockTooltip="Click to unlock and change the reporting organization"
                    unlockTooltip="Click to unlock and change the reporting organization"
                    disabled={organizationsLoading}
                  />
                  {(metadata.created_by_org_name || metadata.created_by_org_acronym) && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {metadata.created_by_org_name}
                      {metadata.created_by_org_acronym && metadata.created_by_org_name !== metadata.created_by_org_acronym && (
                        <span> ({metadata.created_by_org_acronym})</span>
                      )}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Activity Log */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Activity Log</span>
          <span className="text-xs text-muted-foreground">({stats.totalLogs} entries)</span>
        </div>
        {logs.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <img src="/images/empty-fingerprint.webp" alt="No activity logs" className="h-32 mx-auto mb-4 opacity-50" />
            <h3 className="text-base font-semibold mb-2">No activity logs</h3>
            <p className="text-muted-foreground">Changes will appear here when the activity is modified.</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="p-4">
              {logs.map((log, index) => (
                <div key={log.id} className="flex gap-3">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted shrink-0">
                      {getActionIcon(log.action)}
                    </div>
                    {index < logs.length - 1 && (
                      <div className="w-px flex-1 bg-border min-h-[16px]" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {getActionDescription(log)}
                      </p>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, yyyy')}
                      </time>
                    </div>
                    {log.details.metadata?.fieldChanged && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Field:</span> {log.details.metadata.fieldChanged}
                        {log.details.metadata.oldValue && log.details.metadata.newValue && (
                          <div className="mt-1 font-mono">
                            <span className="text-destructive">- {JSON.stringify(log.details.metadata.oldValue)}</span>
                            <br />
                            <span className="text-[hsl(var(--success-icon))]">+ {JSON.stringify(log.details.metadata.newValue)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
