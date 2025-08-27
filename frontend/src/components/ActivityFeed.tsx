import React, { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { getRoleBadgeVariant, getRoleDisplayLabel } from "@/lib/role-badge-utils";
import { ActivityLog } from '@/app/api/activity-logs/route';
import {
  FileText,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  UserPlus,
  UserMinus,
  Plus,
  DollarSign,
  Building2,
  RefreshCw,
  FileUp,
  FileDown,
  AlertCircle,
  Clock,
} from 'lucide-react';

// Icon mapping for different action types
const getActionIcon = (actionType: string, entityType?: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    create: entityType === 'organization' ? <Building2 className="h-4 w-4 text-green-600" /> : 
            entityType === 'user' ? <UserPlus className="h-4 w-4 text-green-600" /> :
            <Plus className="h-4 w-4 text-green-600" />,
    edit: entityType === 'organization' ? <Building2 className="h-4 w-4 text-blue-600" /> :
          entityType === 'user' ? <Edit className="h-4 w-4 text-blue-600" /> :
          <Edit className="h-4 w-4 text-blue-600" />,
    delete: <Trash2 className="h-4 w-4 text-red-600" />,
    submit_validation: <Send className="h-4 w-4 text-purple-600" />,
    validate: <CheckCircle className="h-4 w-4 text-green-600" />,
    reject: <XCircle className="h-4 w-4 text-red-600" />,
    publish: <FileUp className="h-4 w-4 text-green-600" />,
    unpublish: <FileDown className="h-4 w-4 text-orange-600" />,
    add_contact: <UserPlus className="h-4 w-4 text-blue-600" />,
    remove_contact: <UserMinus className="h-4 w-4 text-red-600" />,
    add_transaction: <DollarSign className="h-4 w-4 text-green-600" />,
    edit_transaction: <DollarSign className="h-4 w-4 text-blue-600" />,
    delete_transaction: <DollarSign className="h-4 w-4 text-red-600" />,
    add_partner: <Building2 className="h-4 w-4 text-green-600" />,
    update_partner: <Building2 className="h-4 w-4 text-blue-600" />,
    status_change: <RefreshCw className="h-4 w-4 text-purple-600" />,
    add_tag: <Plus className="h-4 w-4 text-blue-600" />,
    remove_tag: <XCircle className="h-4 w-4 text-orange-600" />,
  };
  return iconMap[actionType] || <AlertCircle className="h-4 w-4 text-gray-600" />;
};

// Generate human-readable action descriptions
const getActionDescription = (log: ActivityLog) => {
  const { actionType, entityType, metadata, activityTitle } = log;

  // Use metadata.details if available for more specific descriptions
  if (metadata?.details && entityType !== 'activity') {
    return metadata.details;
  }

  switch (actionType) {
    case 'create':
      if (entityType === 'organization') {
        return metadata?.details || `created a new organization`;
      } else if (entityType === 'user') {
        return metadata?.details || `created a new user`;
      }
      return `created a new ${entityType}: "${activityTitle || 'Untitled'}"`;
    case 'edit':
      if (entityType === 'organization') {
        return metadata?.details || `updated organization`;
      } else if (entityType === 'user') {
        return metadata?.details || `updated user`;
      }
      if (metadata?.fieldChanged) {
        return `updated ${metadata.fieldChanged} in "${activityTitle || entityType}"`;
      }
      return `edited ${entityType}: "${activityTitle || 'Untitled'}"`;
    case 'delete':
      if (entityType === 'organization' || entityType === 'user') {
        return metadata?.details || `deleted ${entityType}`;
      }
      return `deleted ${entityType}: "${activityTitle || 'Untitled'}"`;
    case 'submit_validation':
      return `submitted "${activityTitle}" for validation`;
    case 'validate':
      return `approved "${activityTitle}"`;
    case 'reject':
      return `rejected "${activityTitle}"${metadata?.details ? `: ${metadata.details}` : ''}`;
    case 'publish':
      return `published "${activityTitle}"`;
    case 'unpublish':
      return `unpublished "${activityTitle}"`;
    case 'add_contact':
      return `added ${metadata?.details || 'a contact'} to "${activityTitle}"`;
    case 'remove_contact':
      return `removed ${metadata?.details || 'a contact'} from "${activityTitle}"`;
    case 'add_transaction':
      return `added ${metadata?.details || 'a transaction'} to "${activityTitle}"`;
    case 'edit_transaction':
      return `edited ${metadata?.details || 'a transaction'} in "${activityTitle}"`;
    case 'delete_transaction':
      return `deleted ${metadata?.details || 'a transaction'} from "${activityTitle}"`;
    case 'add_partner':
      return metadata?.details || 'added a partner organization';
    case 'update_partner':
      return metadata?.details || 'updated a partner organization';
    case 'status_change':
      return `changed status of "${activityTitle}" from ${metadata?.oldValue} to ${metadata?.newValue}`;
    case 'add_tag':
      return metadata?.details || `added a tag to "${activityTitle}"`;
    case 'remove_tag':
      return metadata?.details || `removed a tag from "${activityTitle}"`;
    default:
      return `performed ${actionType} on ${entityType}`;
  }
};

// Removed local getRoleBadgeVariant function - now using unified utility

// Removed local formatRole function - now using unified utility

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
}

export function ActivityFeed({ limit = 20, showHeader = true }: ActivityFeedProps) {
  const router = useRouter();
  const { user } = useUser();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivityLogs();
  }, [user]);

  const fetchActivityLogs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        userRole: user.role || '',
        userId: user.id || '',
        limit: limit.toString(),
      });

      const response = await fetch(`/api/activity-logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }

      const data = await response.json();
      setLogs(data);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchActivityLogs();
  };

  const handleLogClick = (log: ActivityLog) => {
    // Navigate to the relevant entity
    if (log.activityId) {
      router.push(`/activities/${log.activityId}`);
    } else if (log.entityType === 'partner') {
      router.push(`/partners/${log.entityId}`);
    }
  };

  if (loading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle>Latest Activity</CardTitle>
            <CardDescription>System-wide activity log</CardDescription>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle>Latest Activity</CardTitle>
            <CardDescription>System-wide activity log</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Latest Activity</CardTitle>
              <CardDescription>
                {user?.role === 'super_user'
                  ? 'System-wide activity log'
                  : 'Activity related to your organization'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No activity to display</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleLogClick(log)}
              >
                {/* Action Icon */}
                <div className="mt-0.5">{getActionIcon(log.actionType, log.entityType)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {/* Main description */}
                      <p className="text-sm">
                        <span className="font-medium">{log.user?.name || 'Unknown User'}</span>{' '}
                        <span className="text-muted-foreground">
                          {getActionDescription(log)}
                        </span>
                      </p>

                      {/* Additional metadata */}
                      {log.metadata && (log.metadata.oldValue || log.metadata.newValue) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {log.metadata.oldValue && (
                            <span>
                              <span className="line-through">{log.metadata.oldValue}</span>
                              {log.metadata.newValue && ' → '}
                            </span>
                          )}
                          {log.metadata.newValue && (
                            <span className="font-medium text-foreground">
                              {log.metadata.newValue}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Timestamp and role */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        {log.user?.role && (
                          <Badge variant={getRoleBadgeVariant(log.user.role)} className="text-xs h-5">
                            {getRoleDisplayLabel(log.user.role)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Show more button if there might be more logs */}
            {logs.length === limit && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/activity-logs')}
                >
                  View All Activity
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 