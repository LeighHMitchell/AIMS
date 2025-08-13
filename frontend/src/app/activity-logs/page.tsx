"use client"

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ActivityLog } from '@/app/api/activity-logs/route';
import { useUser } from '@/hooks/useUser';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Download,
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

// Get role badge variant
const getRoleBadgeVariant = (role: string) => {
  if (role === 'super_user') return 'destructive';
  
  // Development Partner colors (blue shades)
  if (role === 'dev_partner_tier_1') return 'dark-blue';
  if (role === 'dev_partner_tier_2') return 'light-blue';
  
  // Government Partner colors (green shades)
  if (role === 'gov_partner_tier_1') return 'dark-green';
  if (role === 'gov_partner_tier_2') return 'light-green';
  
  return 'outline';
};

// Format role for display
const formatRole = (role: string) => {
  const roleMap: Record<string, string> = {
    super_user: 'Super User',
    dev_partner_tier_1: 'Data Submission',
    dev_partner_tier_2: 'Review & Approval',
    gov_partner_tier_1: 'Gov Partner T1',
    gov_partner_tier_2: 'Gov Partner T2',
    orphan: 'Orphan User',
  };
  return roleMap[role] || role;
};

export default function ActivityLogsPage() {
  const { user } = useUser();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');

  useEffect(() => {
    fetchActivityLogs();
  }, [user]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, filterAction, filterEntity]);

  const fetchActivityLogs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        userRole: user.role,
        userId: user.id,
        limit: '500', // Fetch more logs for the full page
      });

      const response = await fetch(`/api/activity-logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }

      const data = await response.json();
      setLogs(data);
      setFilteredLogs(data);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => {
        const description = getActionDescription(log).toLowerCase();
        const userName = (log.user?.name || '').toLowerCase();
        const activityTitle = (log.activityTitle || '').toLowerCase();
        return (
          description.includes(searchTerm.toLowerCase()) ||
          userName.includes(searchTerm.toLowerCase()) ||
          activityTitle.includes(searchTerm.toLowerCase())
        );
      });
    }

    // Action type filter
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.actionType === filterAction);
    }

    // Entity type filter
    if (filterEntity !== 'all') {
      filtered = filtered.filter(log => log.entityType === filterEntity);
    }

    setFilteredLogs(filtered);
  };

  const handleRefresh = () => {
    fetchActivityLogs();
  };

  const exportLogs = () => {
    const dataToExport = filteredLogs.map(log => ({
      'Timestamp': format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      'User': log.user?.name || 'Unknown User',
      'Role': formatRole(log.user?.role || 'unknown'),
      'Action': log.actionType,
      'Entity Type': log.entityType,
      'Description': getActionDescription(log),
      'Activity ID': log.activityId || '',
      'Activity Title': log.activityTitle || '',
    }));

    const headers = Object.keys(dataToExport[0] || {});
    const csv = [
      headers.join(','),
      ...dataToExport.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8 max-w-7xl mx-auto">
          <div className="text-center">Loading activity logs...</div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-8 max-w-7xl mx-auto">
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Activity Logs</h1>
            <p className="text-muted-foreground mt-1">
              {user?.role === 'super_user'
                ? 'System-wide audit trail of all user actions'
                : 'Activity history for your organization'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and filter activity logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="publish">Publish</SelectItem>
                  <SelectItem value="unpublish">Unpublish</SelectItem>
                  <SelectItem value="submit_validation">Submit for Validation</SelectItem>
                  <SelectItem value="validate">Validate</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="add_contact">Add Contact</SelectItem>
                  <SelectItem value="remove_contact">Remove Contact</SelectItem>
                  <SelectItem value="add_transaction">Add Transaction</SelectItem>
                  <SelectItem value="edit_transaction">Edit Transaction</SelectItem>
                  <SelectItem value="delete_transaction">Delete Transaction</SelectItem>
                  <SelectItem value="status_change">Status Change</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="activity">Activities</SelectItem>
                  <SelectItem value="transaction">Transactions</SelectItem>
                  <SelectItem value="contact">Contacts</SelectItem>
                  <SelectItem value="partner">Partners</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-sm text-muted-foreground flex items-center">
                Showing {filteredLogs.length} of {logs.length} logs
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No activity logs found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    {/* Action Icon */}
                    <div className="mt-1">{getActionIcon(log.actionType, log.entityType)}</div>

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
                              {format(new Date(log.timestamp), 'dd MMM yyyy, HH:mm')}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <Badge variant={getRoleBadgeVariant(log.user?.role || 'unknown')} className="text-xs h-5">
                              {formatRole(log.user?.role || 'unknown')}
                            </Badge>
                            {log.activityId && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  Activity ID: {log.activityId}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 