"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  ExternalLink,
  Clock,
  User,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';

interface ImportLog {
  id: string;
  import_source: string;
  import_file_name?: string;
  import_date: string;
  activity_id?: string;
  iati_identifier?: string;
  activity_title?: string;
  imported_by?: string;
  imported_by_name?: string;
  imported_by_email?: string;
  reporting_org_ref?: string;
  reporting_org_name?: string;
  importing_org_name?: string;
  import_type: string;
  import_status: string;
  transactions_imported: number;
  budgets_imported: number;
  sectors_imported: number;
  locations_imported: number;
  documents_imported: number;
  contacts_imported: number;
  results_imported: number;
  error_message?: string;
  warnings?: string[];
  iati_datastore_url?: string;
}

interface Analytics {
  last7Days: number;
  last1Month: number;
  last3Months: number;
  last6Months: number;
  last12Months: number;
  total: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercent: number;
  successCount: number;
  partialCount: number;
  failedCount: number;
}

interface TopUser {
  id: string;
  name: string;
  email: string;
  count: number;
}

interface TopOrg {
  ref: string;
  name: string;
  count: number;
}

const SOURCE_LABELS: Record<string, string> = {
  xml_upload: 'XML Upload',
  url_import: 'URL Import',
  iati_search: 'IATI Search',
  bulk_import: 'Bulk Import',
  fork: 'Fork',
  merge: 'Merge',
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  success: { icon: CheckCircle, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  partial: { icon: AlertCircle, color: 'text-gray-500', bgColor: 'bg-gray-100' },
  failed: { icon: XCircle, color: 'text-gray-500', bgColor: 'bg-gray-100' },
};

export function IATIImportLogsManagement() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [recentStream, setRecentStream] = useState<ImportLog[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [topOrgs, setTopOrgs] = useState<TopOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stream' | 'users' | 'orgs'>('stream');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterSource !== 'all') params.append('source', filterSource);

      const response = await fetch(`/api/admin/iati-import-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data || []);
        setRecentStream(data.recentStream || []);
        setAnalytics(data.analytics || null);
        setTopUsers(data.topUsers || []);
        setTopOrgs(data.topOrgs || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      } else {
        toast.error('Failed to load import logs');
      }
    } catch (error) {
      console.error('[IATIImportLogs] Fetch error:', error);
      toast.error('Failed to load import logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filterStatus, filterSource]);

  const getTrendIcon = () => {
    if (!analytics) return <Minus className="h-4 w-4 text-gray-500" />;
    switch (analytics.trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-gray-600" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-gray-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendLabel = () => {
    if (!analytics) return 'No data';
    const prefix = analytics.trendPercent >= 0 ? '+' : '';
    return `${prefix}${analytics.trendPercent}% vs previous period`;
  };

  return (
    <div className="space-y-6">
      {/* Header Card with Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                IATI Import Logs
              </CardTitle>
              <CardDescription>
                Monitor IATI data imports, track user activity, and ensure data quality
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Time Period Cards */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Last 7 Days</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analytics?.last7Days || 0}</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Last Month</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analytics?.last1Month || 0}</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Last 3 Months</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analytics?.last3Months || 0}</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Last 6 Months</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analytics?.last6Months || 0}</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Last 12 Months</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analytics?.last12Months || 0}</p>
        </div>

        {/* Trend Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            {getTrendIcon()}
            <span className="text-xs font-medium text-gray-600">Trend</span>
          </div>
          <p className="text-lg font-bold text-gray-900 capitalize">{analytics?.trend || 'N/A'}</p>
          <span className="text-[10px] text-gray-500">{getTrendLabel()}</span>
        </div>
      </div>


      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="stream" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Imports
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Top Users
          </TabsTrigger>
          <TabsTrigger value="orgs" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Top Organisations
          </TabsTrigger>
        </TabsList>

        {/* Recent Imports Stream */}
        <TabsContent value="stream" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="w-48">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-48">
                  <Select value={filterSource} onValueChange={setFilterSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="xml_upload">XML Upload</SelectItem>
                      <SelectItem value="url_import">URL Import</SelectItem>
                      <SelectItem value="iati_search">IATI Search</SelectItem>
                      <SelectItem value="bulk_import">Bulk Import</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Stream */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p>Loading import logs...</p>
                </div>
              ) : recentStream.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="font-medium">No import logs found</p>
                  <p className="text-sm mt-2">Import logs will appear here once IATI imports are made</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Status</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Imported By</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentStream.map((log) => {
                      const statusConfig = STATUS_CONFIG[log.import_status] || STATUS_CONFIG.success;
                      const StatusIcon = statusConfig.icon;

                      return (
                        <TableRow key={log.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${statusConfig.bgColor}`}>
                              <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium truncate max-w-[250px]">
                                {log.activity_title || 'Untitled Activity'}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                {log.iati_identifier || 'No IATI ID'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.imported_by_name || 'Unknown'}</div>
                              {log.imported_by_email && (
                                <div className="text-xs text-gray-500">{log.imported_by_email}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate max-w-[150px]">
                              {log.reporting_org_name || log.importing_org_name || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {SOURCE_LABELS[log.import_source] || log.import_source}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600">
                              {formatDistanceToNow(new Date(log.import_date), { addSuffix: true })}
                            </div>
                            <div className="text-xs text-gray-400">
                              {format(new Date(log.import_date), 'MMM d, yyyy HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {log.activity_id && (
                                <Link href={`/activities/${log.activity_id}`}>
                                  <Button variant="outline" size="sm" title="View Activity">
                                    <Activity className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}
                              {log.iati_datastore_url && (
                                <a href={log.iati_datastore_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm" title="View in IATI Datastore">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} imports
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Top Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Users with Most Imports</CardTitle>
              <CardDescription>Top 10 users by number of IATI imports</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {topUsers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No user data available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Rank</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Imports</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topUsers.map((user, index) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                            {index + 1}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-gray-500">{user.email}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-mono">
                            {user.count}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Organisations Tab */}
        <TabsContent value="orgs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organisations with Most Imports</CardTitle>
              <CardDescription>Top 10 organisations by number of IATI imports</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {topOrgs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No organisation data available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Rank</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Imports</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topOrgs.map((org, index) => (
                      <TableRow key={org.ref}>
                        <TableCell>
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                            {index + 1}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell className="text-gray-500 font-mono text-sm">{org.ref}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-mono">
                            {org.count}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
