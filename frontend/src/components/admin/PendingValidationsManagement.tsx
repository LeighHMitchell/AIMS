"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FileText,
  DollarSign,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  Calendar,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TRANSACTION_TYPE_LABELS } from '@/types/transaction';

interface PendingActivity {
  id: string;
  iati_identifier: string;
  title: string;
  status: string;
  start_date: string | null;
  organization: string | null;
  publication_status: string | null;
  submission_status: string | null;
  updated_at: string;
  validation_status: string | null;
  validation_date: string | null;
  validating_authority: string | null;
}

interface PendingTransaction {
  id: string;
  activity_id: string;
  activity_iati_id: string;
  activity_title: string;
  transaction_type: string;
  transaction_date: string;
  value: number;
  currency: string;
  status: string;
  description: string | null;
  provider_org: string | null;
  receiver_org: string | null;
  organization: string | null;
  updated_at: string;
  validated_by: string | null;
  validated_at: string | null;
}

// Helper to format currency
const formatCurrency = (value: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Helper to format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Helper to get transaction type label
const getTransactionTypeLabel = (type: string) => {
  return TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] || type;
};

// Helper to get activity status badge
const getStatusBadge = (status: string | null) => {
  const statusColors: Record<string, string> = {
    '1': 'bg-gray-100 text-gray-800', // Pipeline/Identification
    '2': 'bg-blue-100 text-blue-800', // Implementation
    '3': 'bg-green-100 text-green-800', // Finalisation
    '4': 'bg-purple-100 text-purple-800', // Closed
    '5': 'bg-red-100 text-red-800', // Cancelled
    '6': 'bg-yellow-100 text-yellow-800', // Suspended
  };
  const statusLabels: Record<string, string> = {
    '1': 'Pipeline',
    '2': 'Implementation',
    '3': 'Finalisation',
    '4': 'Closed',
    '5': 'Cancelled',
    '6': 'Suspended',
  };
  return (
    <Badge className={cn('text-xs', statusColors[status || ''] || 'bg-gray-100 text-gray-800')}>
      {statusLabels[status || ''] || status || 'Unknown'}
    </Badge>
  );
};

// Activity Row Component with validation toggle
const ActivityRow: React.FC<{
  activity: PendingActivity;
  onValidate: (id: string, validated: boolean) => Promise<void>;
  isValidating: boolean;
  onNavigate: (id: string) => void;
}> = ({ activity, onValidate, isValidating, onNavigate }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [localValidated, setLocalValidated] = useState(activity.validation_status === 'validated');

  const handleValidationChange = async (checked: boolean) => {
    setLocalValidated(checked);
    if (checked) {
      setIsRemoving(true);
      await onValidate(activity.id, true);
    } else {
      await onValidate(activity.id, false);
    }
  };

  return (
    <TableRow
      className={cn(
        'transition-all duration-500 cursor-pointer hover:bg-muted/50',
        isRemoving && 'opacity-0 translate-x-4'
      )}
      onClick={() => onNavigate(activity.id)}
    >
      <TableCell className="max-w-[150px]">
        {activity.iati_identifier ? (
          <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded truncate inline-block max-w-full">
            {activity.iati_identifier}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="max-w-[300px]">
        <div className="truncate font-medium">{activity.title || 'Untitled Activity'}</div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm truncate max-w-[150px]">{activity.organization || '-'}</span>
        </div>
      </TableCell>
      <TableCell>
        {formatDate(activity.start_date)}
      </TableCell>
      <TableCell>
        {getStatusBadge(activity.status)}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Switch
                  checked={localValidated}
                  onCheckedChange={handleValidationChange}
                  disabled={isValidating}
                  aria-label="Validate activity"
                />
                <Label className="text-xs text-muted-foreground">
                  {localValidated ? 'Validated' : 'Pending'}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localValidated ? 'Activity is validated' : 'Toggle to validate this activity'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate(activity.id)}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

// Transaction Row Component with validation toggle
const TransactionRow: React.FC<{
  transaction: PendingTransaction;
  onValidate: (id: string, validated: boolean) => Promise<void>;
  isValidating: boolean;
  onNavigate: (activityId: string, transactionId: string) => void;
}> = ({ transaction, onValidate, isValidating, onNavigate }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [localValidated, setLocalValidated] = useState(!!transaction.validated_by);

  const handleValidationChange = async (checked: boolean) => {
    setLocalValidated(checked);
    if (checked) {
      setIsRemoving(true);
      await onValidate(transaction.id, true);
    } else {
      await onValidate(transaction.id, false);
    }
  };

  return (
    <TableRow
      className={cn(
        'transition-all duration-500 cursor-pointer hover:bg-muted/50',
        isRemoving && 'opacity-0 translate-x-4'
      )}
      onClick={() => onNavigate(transaction.activity_id, transaction.id)}
    >
      <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
        {transaction.activity_iati_id || '-'}
      </TableCell>
      <TableCell className="max-w-[200px]">
        <div className="truncate text-sm">{transaction.activity_title || 'Untitled'}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {getTransactionTypeLabel(transaction.transaction_type)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm truncate max-w-[120px]">{transaction.organization || '-'}</span>
        </div>
      </TableCell>
      <TableCell>
        {formatDate(transaction.transaction_date)}
      </TableCell>
      <TableCell className="font-medium text-right">
        {formatCurrency(transaction.value, transaction.currency)}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Switch
                  checked={localValidated}
                  onCheckedChange={handleValidationChange}
                  disabled={isValidating}
                  aria-label="Validate transaction"
                />
                <Label className="text-xs text-muted-foreground">
                  {localValidated ? 'Validated' : 'Pending'}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localValidated ? 'Transaction is validated' : 'Toggle to validate this transaction'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate(transaction.activity_id, transaction.id)}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export function PendingValidationsManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'activities' | 'transactions'>('activities');
  const [activities, setActivities] = useState<PendingActivity[]>([]);
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [counts, setCounts] = useState({ activities: 0, transactions: 0 });
  const [loading, setLoading] = useState(true);
  const [validatingIds, setValidatingIds] = useState<Set<string>>(new Set());

  const fetchPendingValidations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pending-validations?type=all');
      if (!response.ok) {
        throw new Error('Failed to fetch pending validations');
      }
      const data = await response.json();
      setActivities(data.activities || []);
      setTransactions(data.transactions || []);
      setCounts(data.counts || { activities: 0, transactions: 0 });
    } catch (error) {
      console.error('Error fetching pending validations:', error);
      toast.error('Failed to load pending validations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingValidations();
  }, [fetchPendingValidations]);

  const handleValidateActivity = async (id: string, validated: boolean) => {
    setValidatingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch('/api/admin/pending-validations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'activity', id, validated }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate activity');
      }

      if (validated) {
        toast.success('Activity validated successfully');
        // Remove from list after animation
        setTimeout(() => {
          setActivities(prev => prev.filter(a => a.id !== id));
          setCounts(prev => ({ ...prev, activities: Math.max(0, prev.activities - 1) }));
        }, 500);
      } else {
        toast.success('Activity validation removed');
      }
    } catch (error) {
      console.error('Error validating activity:', error);
      toast.error('Failed to validate activity');
    } finally {
      setValidatingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleValidateTransaction = async (id: string, validated: boolean) => {
    setValidatingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch('/api/admin/pending-validations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'transaction', id, validated }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate transaction');
      }

      if (validated) {
        toast.success('Transaction validated successfully');
        // Remove from list after animation
        setTimeout(() => {
          setTransactions(prev => prev.filter(t => t.id !== id));
          setCounts(prev => ({ ...prev, transactions: Math.max(0, prev.transactions - 1) }));
        }, 500);
      } else {
        toast.success('Transaction validation removed');
      }
    } catch (error) {
      console.error('Error validating transaction:', error);
      toast.error('Failed to validate transaction');
    } finally {
      setValidatingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleNavigateToActivity = (activityId: string) => {
    router.push(`/activities/${activityId}?tab=government`);
  };

  const handleNavigateToTransaction = (activityId: string, transactionId: string) => {
    router.push(`/activities/${activityId}?tab=transactions&transaction=${transactionId}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Pending Validations
            </CardTitle>
            <CardDescription>
              Review and validate activities and transactions awaiting government approval
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPendingValidations}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'activities' | 'transactions')}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Activities
              {counts.activities > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {counts.activities}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Transactions
              {counts.transactions > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {counts.transactions}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activities">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm">No activities pending validation</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[150px]">IATI ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead className="w-[100px]">Start Date</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[140px]">Validation</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <ActivityRow
                        key={activity.id}
                        activity={activity}
                        onValidate={handleValidateActivity}
                        isValidating={validatingIds.has(activity.id)}
                        onNavigate={handleNavigateToActivity}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm">No transactions pending validation</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[120px]">Activity ID</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead className="w-[130px]">Type</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead className="w-[120px] text-right">Amount</TableHead>
                      <TableHead className="w-[140px]">Validation</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        onValidate={handleValidateTransaction}
                        isValidating={validatingIds.has(transaction.id)}
                        onNavigate={handleNavigateToTransaction}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
