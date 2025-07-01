'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Download,
  Filter,
  ChevronDown,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface Activity {
  id?: string;
  iati_id: string;
  title: string;
  activity_status?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  _isNew?: boolean;
  _hasIssues?: boolean;
}

interface Transaction {
  id?: string;
  activity_id?: string;
  activityRef?: string;
  transaction_type: string;
  value: number;
  currency: string;
  transaction_date: string;
  value_date?: string;
  status?: string;
  provider_org_name?: string;
  receiver_org_name?: string;
  disbursement_channel?: string;
  flow_type?: string;
  finance_type?: string;
  aid_type?: string;
  tied_status?: string;
  description?: string;
  _hasIssues?: boolean;
  _skipImport?: boolean;
  _needsActivityAssignment?: boolean;
}

interface PreviewTableProps {
  activities: Activity[];
  transactions: Transaction[];
  orphanTransactions?: { index: number; activityRef: string; transaction: Transaction }[];
  onEditActivity?: (index: number, activity: Activity) => void;
  onEditTransaction?: (index: number, transaction: Transaction) => void;
  onToggleSkip?: (type: 'activity' | 'transaction', index: number) => void;
  onExportCSV?: (type: 'activities' | 'transactions') => void;
}

export function PreviewTable({
  activities,
  transactions,
  orphanTransactions = [],
  onEditActivity,
  onEditTransaction,
  onToggleSkip,
  onExportCSV
}: PreviewTableProps) {
  const [activeTab, setActiveTab] = useState<'activities' | 'transactions'>('activities');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Record<string, Set<number>>>({
    activities: new Set(),
    transactions: new Set()
  });
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const matchesSearch = !searchTerm || 
        activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.iati_id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = !showIssuesOnly || activity._hasIssues;
      
      return matchesSearch && matchesFilter;
    });
  }, [activities, searchTerm, showIssuesOnly]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = !searchTerm || 
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.activityRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.provider_org_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.receiver_org_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = !showIssuesOnly || transaction._hasIssues;
      
      return matchesSearch && matchesFilter && !transaction._skipImport;
    });
  }, [transactions, searchTerm, showIssuesOnly]);

  const handleSelectAll = (type: 'activities' | 'transactions') => {
    const items = type === 'activities' ? filteredActivities : filteredTransactions;
    const newSelection = new Set(items.map((_, index) => index));
    
    setSelectedRows({
      ...selectedRows,
      [type]: newSelection
    });
  };

  const handleDeselectAll = (type: 'activities' | 'transactions') => {
    setSelectedRows({
      ...selectedRows,
      [type]: new Set()
    });
  };

  const handleRowSelect = (type: 'activities' | 'transactions', index: number) => {
    const newSelection = new Set(selectedRows[type]);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    
    setSelectedRows({
      ...selectedRows,
      [type]: newSelection
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(value);
  };

  const getTransactionTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      '1': 'Incoming Commitment',
      '2': 'Outgoing Commitment',
      '3': 'Disbursement',
      '4': 'Expenditure',
      '11': 'Credit Guarantee',
      'D': 'Disbursement',
      'C': 'Commitment',
      'E': 'Expenditure'
    };
    return typeMap[type] || type;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Preview Import Data</CardTitle>
            <CardDescription>
              Review and edit your data before importing
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIssuesOnly(!showIssuesOnly)}
            >
              {showIssuesOnly ? (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Show All
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Issues Only
                </>
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onExportCSV?.('activities')}>
                  Export Activities as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportCSV?.('transactions')}>
                  Export Transactions as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Orphan Transactions Warning */}
          {orphanTransactions.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <h4 className="font-semibold">
                  {orphanTransactions.length} transaction{orphanTransactions.length > 1 ? 's' : ''} reference missing activities
                </h4>
                <AlertDescription className="mt-1">
                  These transactions will be skipped during import because their referenced activities don't exist in the database or current import file.
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">View Details</summary>
                    <ul className="mt-2 space-y-1 text-sm">
                      {Array.from(new Set(orphanTransactions.map(o => o.activityRef))).map(ref => (
                        <li key={ref} className="flex items-center space-x-2">
                          <span className="text-yellow-600">•</span>
                          <span className="font-mono">{ref}</span>
                          <span className="text-muted-foreground">
                            ({orphanTransactions.filter(o => o.activityRef === ref).length} transaction{orphanTransactions.filter(o => o.activityRef === ref).length > 1 ? 's' : ''})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Activities</span>
              <Badge variant="secondary">{activities.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Transactions</span>
              <Badge variant="secondary">{transactions.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Issues</span>
              <Badge variant="destructive">
                {activities.filter(a => a._hasIssues).length + 
                 transactions.filter(t => t._hasIssues).length}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Total Value</span>
              <Badge variant="default">
                {formatCurrency(
                  transactions.reduce((sum, t) => sum + (t.value || 0), 0),
                  'USD'
                )}
              </Badge>
            </div>
          </div>

          {/* Data Tables */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="activities" className="relative">
                Activities
                {activities.filter(a => a._hasIssues).length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1">
                    {activities.filter(a => a._hasIssues).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="transactions" className="relative">
                Transactions
                {transactions.filter(t => t._hasIssues).length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1">
                    {transactions.filter(t => t._hasIssues).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activities" className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {filteredActivities.length} activities found
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectAll('activities')}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeselectAll('activities')}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-96 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>IATI ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.map((activity, index) => (
                      <TableRow key={index} className={activity._hasIssues ? 'bg-red-50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.activities.has(index)}
                            onCheckedChange={() => handleRowSelect('activities', index)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {activity._isNew && (
                              <Badge variant="outline" className="text-xs">
                                New
                              </Badge>
                            )}
                            {activity._hasIssues ? (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {activity.iati_id}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {activity.title}
                        </TableCell>
                        <TableCell>
                          {formatDate(activity.planned_start_date || activity.actual_start_date)}
                        </TableCell>
                        <TableCell>
                          {formatDate(activity.planned_end_date || activity.actual_end_date)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditActivity?.(index, activity)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {filteredTransactions.length} transactions found
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectAll('transactions')}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeselectAll('transactions')}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-96 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Receiver</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction, index) => (
                      <TableRow key={index} className={transaction._hasIssues ? 'bg-red-50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.transactions.has(index)}
                            onCheckedChange={() => handleRowSelect('transactions', index)}
                          />
                        </TableCell>
                        <TableCell>
                          {transaction._hasIssues ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center space-x-1">
                            <span>{transaction.activityRef}</span>
                            {transaction._needsActivityAssignment && (
                              <span className="text-red-600" title="Manual assignment required">
                                <AlertTriangle className="h-3 w-3" />
                              </span>
                            )}
                            {transaction.activity_id && (
                              <Badge variant="outline" className="text-xs bg-green-50">
                                Assigned
                              </Badge>
                            )}
                            {!transaction.activity_id && !transaction._needsActivityAssignment && 
                             !activities.find(a => a.iati_id === transaction.activityRef) && (
                              <span className="text-yellow-600" title="Activity not found in current import or database">
                                <Info className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getTransactionTypeLabel(transaction.transaction_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(transaction.transaction_date)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(transaction.value, transaction.currency)}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {transaction.provider_org_name || '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {transaction.receiver_org_name || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditTransaction?.(index, transaction)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
} 