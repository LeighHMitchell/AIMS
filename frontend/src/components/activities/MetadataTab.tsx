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
import { Separator } from '@/components/ui/separator';
import { LockedOrganizationField } from '@/components/ui/locked-organization-field';
import { useOrganizations } from '@/hooks/use-organizations';
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
      return <Plus className="h-4 w-4 text-gray-600" />;
    case 'edit':
    case 'update':
    case 'updated':
      return <Pencil className="h-4 w-4 text-slate-500 ring-1 ring-slate-300 rounded-sm" />;
    case 'delete':
    case 'deleted':
      return <Trash2 className="h-4 w-4 text-red-500" />;
    case 'publish':
    case 'published':
      return <Upload className="h-4 w-4 text-gray-600" />;
    case 'unpublish':
    case 'unpublished':
      return <Download className="h-4 w-4 text-gray-600" />;
    case 'sync':
    case 'synced':
      return <RefreshCw className="h-4 w-4 text-gray-600" />;
    case 'view':
    case 'viewed':
      return <Eye className="h-4 w-4 text-gray-500" />;
    case 'validate':
    case 'validated':
      return <UserCheck className="h-4 w-4 text-gray-600" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function MetadataTab({ activityId }: MetadataTabProps) {
  const [data, setData] = useState<MetadataResponse | null>(null);
  const [loading, setLoading] = useState(true);
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

      toast.success('Reporting organization updated successfully');
      
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
      toast.error(error instanceof Error ? error.message : 'Failed to update reporting organization');
    } finally {
      setSavingReportingOrg(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[MetadataTab] Fetching metadata for activity ID:', activityId);
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
      console.log('[MetadataTab] Received metadata:', result);
      console.log('[MetadataTab] Reporting org data:', {
        reporting_org_id: result.metadata?.reporting_org_id,
        created_by_org_name: result.metadata?.created_by_org_name,
        created_by_org_acronym: result.metadata?.created_by_org_acronym
      });
      setData(result);
      setLanguage(result.metadata?.language || 'en');
    } catch (err) {
      console.error('[AIMS] Error fetching activity metadata:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metadata');
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
        console.log('[MetadataTab] Tab became visible, refreshing data...');
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
        console.log('[MetadataTab] Activity updated, refreshing metadata...');
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
        <AlertDescription>No metadata available for this activity.</AlertDescription>
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

      {/* Basic Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Creation Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              Creation Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-900">
              {format(new Date(metadata.created_at), 'PPP \'at\' p')}
            </div>
            <div className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(metadata.created_at), { addSuffix: true })}
            </div>
            {metadata.created_by && (
              <div className="pt-2 border-t border-gray-100">
                <div className="text-sm font-medium text-gray-900">Created by</div>
                <div className="text-sm text-gray-900">{metadata.created_by.name}</div>
                <div className="text-xs text-gray-500">{metadata.created_by.role}</div>
                {metadata.created_by.email && (
                  <div className="text-xs text-gray-500">{metadata.created_by.email}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Modified */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              Last Modified
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-900">
              {format(new Date(metadata.updated_at), 'PPP \'at\' p')}
            </div>
            <div className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(metadata.updated_at), { addSuffix: true })}
            </div>
            {metadata.updated_by && (
              <div className="pt-2 border-t border-gray-100">
                <div className="text-sm font-medium text-gray-900">Updated by</div>
                <div className="text-sm text-gray-900">{metadata.updated_by.name}</div>
                <div className="text-xs text-gray-500">{metadata.updated_by.role}</div>
                {metadata.updated_by.email && (
                  <div className="text-xs text-gray-500">{metadata.updated_by.email}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Publication</span>
              <Badge variant={metadata.publication_status === 'published' ? 'default' : 'secondary'}>
                {metadata.publication_status || 'draft'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Submission</span>
              <Badge variant={metadata.submission_status === 'validated' ? 'default' : 'secondary'}>
                {metadata.submission_status || 'pending'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Activity</span>
              <Badge variant="outline">
                {metadata.activity_status || 'planning'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Reporting Organization */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5 text-gray-600" />
              Reporting Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LockedOrganizationField
              label="Reported by"
              value={metadata.reporting_org_id || ""}
              onChange={() => {}} // Handled by onSave
              organizations={organizations}
              onSave={handleReportingOrgSave}
              saving={savingReportingOrg}
              isSuperUser={true} // Keep prop for compatibility, but component now allows all users
              placeholder="Select reporting organization..."
              lockTooltip="Click to unlock and change the reporting organization"
              unlockTooltip="Click to unlock and change the reporting organization"
              disabled={organizationsLoading}
            />
            {(metadata.created_by_org_name || metadata.created_by_org_acronym) && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-600 mb-1">Current Organization</div>
                <div className="text-sm text-gray-900">
                  {metadata.created_by_org_name}
                  {metadata.created_by_org_acronym && metadata.created_by_org_name !== metadata.created_by_org_acronym && (
                    <span className="text-gray-600"> ({metadata.created_by_org_acronym})</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Technical Details */}
      <div className="grid grid-cols-1 gap-6">
        {/* Identifiers & Sync */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-gray-600" />
              Technical Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-600 flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  Activity ID
                </div>
                <div className="text-gray-900 font-mono text-xs break-all">
                  {metadata.partner_id || 'Not assigned'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-600 flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  IATI ID
                </div>
                <div className="text-gray-900 font-mono text-xs break-all">
                  {metadata.iati_identifier || 'Not assigned'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Version</div>
                <div className="text-gray-900">{metadata.version || 1}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Sync Status</div>
                <Badge variant={metadata.sync_status === 'live' ? 'default' : 'secondary'}>
                  {metadata.sync_status || 'never'}
                </Badge>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <LabelSaveIndicator
                isSaving={languageAutosave.isSaving}
                isSaved={languageAutosave.isPersistentlySaved || !!language}
                hasValue={!!language}
                className="mb-2"
              >
                Narrative Language
              </LabelSaveIndicator>
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
            {metadata.last_sync_time && (
              <div>
                <div className="text-sm font-medium text-gray-600">Last Sync</div>
                <div className="text-sm text-gray-900">
                  {format(new Date(metadata.last_sync_time), 'PPP \'at\' p')}
                </div>
              </div>
            )}
          </CardContent>
        </Card>


      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-gray-600" />
            Activity Log
            <Badge variant="outline" className="ml-2">
              {stats.totalLogs} entries
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No activity logs found for this activity.</p>
              <p className="text-sm">Changes will appear here when the activity is modified.</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="p-6 space-y-4">
                {logs.map((log, index) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {getActionDescription(log)}
                        </p>
                        <time className="text-xs text-gray-500">
                          {format(new Date(log.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                        </time>
                      </div>
                      {log.details.metadata?.fieldChanged && (
                        <div className="mt-1 text-xs text-gray-600">
                          <span className="font-medium">Field:</span> {log.details.metadata.fieldChanged}
                          {log.details.metadata.oldValue && log.details.metadata.newValue && (
                            <div className="mt-1">
                              <span className="text-red-600">- {JSON.stringify(log.details.metadata.oldValue)}</span>
                              <br />
                              <span className="text-green-600">+ {JSON.stringify(log.details.metadata.newValue)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    {index < logs.length - 1 && (
                      <div className="absolute left-[18px] mt-8 w-px h-8 bg-gray-200" 
                           style={{ marginLeft: '18px' }} />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
