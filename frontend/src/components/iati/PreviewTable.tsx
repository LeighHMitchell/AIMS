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
  Info,
} from 'lucide-react';
import { getSortIcon, sortableHeaderClasses } from '@/components/ui/table';

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

  type ActivitySortField = 'iati_id' | 'title' | 'start_date' | 'end_date';
  type TransactionSortField = 'activity' | 'type' | 'date' | 'value' | 'provider' | 'receiver';
  const [activitySortField, setActivitySortField] = useState<ActivitySortField>('iati_id');
  const [activitySortDir, setActivitySortDir] = useState<'asc' | 'desc'>('asc');
  const [txnSortField, setTxnSortField] = useState<TransactionSortField>('date');
  const [txnSortDir, setTxnSortDir] = useState<'asc' | 'desc'>('desc');

  const handleActivitySort = (field: ActivitySortField) => {
    if (activitySortField === field) {
      setActivitySortDir(activitySortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setActivitySortField(field);
      setActivitySortDir('asc');
    }
  };

  const handleTxnSort = (field: TransactionSortField) => {
    if (txnSortField === field) {
      setTxnSortDir(txnSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setTxnSortField(field);
      setTxnSortDir('asc');
    }
  };

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
    return (transactions || []).filter(transaction => {
      const matchesSearch = !searchTerm ||
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.activityRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.provider_org_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.receiver_org_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = !showIssuesOnly || transaction._hasIssues;

      return matchesSearch && matchesFilter && !transaction._skipImport;
    });
  }, [transactions, searchTerm, showIssuesOnly]);

  // Sort activities
  const sortedActivities = useMemo(() => {
    return [...filteredActivities].sort((a, b) => {
      const dir = activitySortDir === 'asc' ? 1 : -1;
      switch (activitySortField) {
        case 'iati_id':
          return dir * a.iati_id.localeCompare(b.iati_id);
        case 'title':
          return dir * a.title.localeCompare(b.title);
        case 'start_date': {
          const da = a.planned_start_date || a.actual_start_date || '';
          const db = b.planned_start_date || b.actual_start_date || '';
          return dir * da.localeCompare(db);
        }
        case 'end_date': {
          const da = a.planned_end_date || a.actual_end_date || '';
          const db = b.planned_end_date || b.actual_end_date || '';
          return dir * da.localeCompare(db);
        }
        default:
          return 0;
      }
    });
  }, [filteredActivities, activitySortField, activitySortDir]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const dir = txnSortDir === 'asc' ? 1 : -1;
      switch (txnSortField) {
        case 'activity':
          return dir * (a.activityRef || '').localeCompare(b.activityRef || '');
        case 'type':
          return dir * a.transaction_type.localeCompare(b.transaction_type);
        case 'date':
          return dir * (a.transaction_date || '').localeCompare(b.transaction_date || '');
        case 'value':
          return dir * ((a.value || 0) - (b.value || 0));
        case 'provider':
          return dir * (a.provider_org_name || '').localeCompare(b.provider_org_name || '');
        case 'receiver':
          return dir * (a.receiver_org_name || '').localeCompare(b.receiver_org_name || '');
        default:
          return 0;
      }
    });
  }, [filteredTransactions, txnSortField, txnSortDir]);

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
    // IATI Standard v2.03 transaction type labels
    const typeMap: Record<string, string> = {
      '1': 'Incoming Funds',
      '2': 'Outgoing Commitment',
      '3': 'Disbursement',
      '4': 'Expenditure',
      '5': 'Interest Payment',
      '6': 'Loan Repayment',
      '7': 'Reimbursement',
      '8': 'Purchase of Equity',
      '9': 'Sale of Equity',
      '10': 'Credit Guarantee',
      '11': 'Incoming Commitment',
      '12': 'Outgoing Pledge',
      '13': 'Incoming Pledge',
      // Legacy codes
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
                    <summary className="cursor-pointer text-body font-medium">View Details</summary>
                    <ul className="mt-2 space-y-1 text-body">
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
              <span className="text-body font-medium">Activities</span>
              <Badge variant="secondary">{activities.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-body font-medium">Transactions</span>
              <Badge variant="secondary">{(transactions || []).length}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-body font-medium">Issues</span>
              <Badge variant="destructive">
                {(activities || []).filter(a => a._hasIssues).length + 
                 (transactions || []).filter(t => t._hasIssues).length}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-body font-medium">Total Value</span>
              <Badge variant="default">
                {formatCurrency(
                  (transactions || []).reduce((sum, t) => sum + (t.value || 0), 0),
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
                {(transactions || []).filter(t => t._hasIssues).length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1">
                    {(transactions || []).filter(t => t._hasIssues).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activities" className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-body text-muted-foreground">
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
                      <TableHead className={sortableHeaderClasses} onClick={() => handleActivitySort('iati_id')}>
                        <div className="flex items-center gap-1">IATI ID {getSortIcon('iati_id', activitySortField, activitySortDir)}</div>
                      </TableHead>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleActivitySort('title')}>
                        <div className="flex items-center gap-1">Title {getSortIcon('title', activitySortField, activitySortDir)}</div>
                      </TableHead>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleActivitySort('start_date')}>
                        <div className="flex items-center gap-1">Start Date {getSortIcon('start_date', activitySortField, activitySortDir)}</div>
                      </TableHead>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleActivitySort('end_date')}>
                        <div className="flex items-center gap-1">End Date {getSortIcon('end_date', activitySortField, activitySortDir)}</div>
                      </TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedActivities.map((activity, index) => (
                      <TableRow key={index} className={activity._hasIssues ? 'bg-destructive/10' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.activities.has(index)}
                            onCheckedChange={() => handleRowSelect('activities', index)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {activity._isNew && (
                              <Badge variant="outline" className="text-helper">
                                New
                              </Badge>
                            )}
                            {activity._hasIssues ? (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))]" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {activity.iati_id}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-body text-foreground">
                          {activity.title}
                        </TableCell>
                        <TableCell className="text-body text-foreground">
                          {formatDate(activity.planned_start_date || activity.actual_start_date)}
                        </TableCell>
                        <TableCell className="text-body text-foreground">
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
                <p className="text-body text-muted-foreground">
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
                      <TableHead className={sortableHeaderClasses} onClick={() => handleTxnSort('activity')}>
                        <div className="flex items-center gap-1">Activity {getSortIcon('activity', txnSortField, txnSortDir)}</div>
                      </TableHead>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleTxnSort('type')}>
                        <div className="flex items-center gap-1">Type {getSortIcon('type', txnSortField, txnSortDir)}</div>
                      </TableHead>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleTxnSort('date')}>
                        <div className="flex items-center gap-1">Date {getSortIcon('date', txnSortField, txnSortDir)}</div>
                      </TableHead>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleTxnSort('value')}>
                        <div className="flex items-center gap-1">Value {getSortIcon('value', txnSortField, txnSortDir)}</div>
                      </TableHead>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleTxnSort('provider')}>
                        <div className="flex items-center gap-1">Provider {getSortIcon('provider', txnSortField, txnSortDir)}</div>
                      </TableHead>
                      <TableHead className={sortableHeaderClasses} onClick={() => handleTxnSort('receiver')}>
                        <div className="flex items-center gap-1">Receiver {getSortIcon('receiver', txnSortField, txnSortDir)}</div>
                      </TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTransactions.map((transaction, index) => (
                      <TableRow key={index} className={transaction._hasIssues ? 'bg-destructive/10' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.transactions?.has(index)}
                            onCheckedChange={() => handleRowSelect('transactions', index)}
                          />
                        </TableCell>
                        <TableCell>
                          {transaction._hasIssues ? (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))]" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center space-x-1">
                            <span>{transaction.activityRef}</span>
                            {transaction._needsActivityAssignment && (
                              <span className="text-destructive" title="Manual assignment required">
                                <AlertTriangle className="h-3 w-3" />
                              </span>
                            )}
                            {transaction.activity_id && (
                              <Badge variant="outline" className="text-helper bg-green-50">
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
                        <TableCell className="text-body text-foreground">
                          {formatDate(transaction.transaction_date)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(transaction.value, transaction.currency)}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-body text-foreground">
                          {transaction.provider_org_name || '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-body text-foreground">
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