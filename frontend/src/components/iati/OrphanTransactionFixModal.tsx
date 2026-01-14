'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Plus, 
  SkipForward, 
  Link2,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface OrphanedTransaction {
  index: number;
  activityRef: string;
  transaction: {
    transaction_type: string;
    value: number;
    currency: string;
    transaction_date: string;
    description?: string;
    provider_org_name?: string;
    receiver_org_name?: string;
  };
}

interface Activity {
  id: string;
  title: string;
  iati_id: string;
}

interface OrphanTransactionFixModalProps {
  isOpen: boolean;
  orphanedTransaction: OrphanedTransaction | null;
  onFix: (transactionIndex: number, activityId: string) => void;
  onSkip: (transactionIndex: number) => void;
  onClose: () => void;
  totalOrphans: number;
  currentIndex: number;
}

export function OrphanTransactionFixModal({
  isOpen,
  orphanedTransaction,
  onFix,
  onSkip,
  onClose,
  totalOrphans,
  currentIndex
}: OrphanTransactionFixModalProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [isCreatingPlaceholder, setIsCreatingPlaceholder] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch activities on mount
  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  // Reset state when transaction changes
  useEffect(() => {
    if (orphanedTransaction) {
      setSelectedActivityId('');
      setSearchTerm('');
      setError(null);
    }
  }, [orphanedTransaction]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, iati_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  };

  const createPlaceholderActivity = async () => {
    if (!orphanedTransaction) return;

    setIsCreatingPlaceholder(true);
    setError(null);

    try {
      const placeholderActivity = {
        iati_id: orphanedTransaction.activityRef,
        title: `[Placeholder] ${orphanedTransaction.activityRef}`,
        description: `Placeholder activity created during IATI import for orphaned transactions`,
        activity_status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('activities')
        .insert(placeholderActivity)
        .select()
        .single();

      if (error) throw error;

      // Add to activities list
      setActivities([data, ...activities]);
      setSelectedActivityId(data.id);

      // Auto-fix with the new activity
      handleFix(data.id);
    } catch (err) {
      console.error('Error creating placeholder:', err);
      setError('Failed to create placeholder activity');
    } finally {
      setIsCreatingPlaceholder(false);
    }
  };

  const handleFix = (activityId?: string) => {
    const fixActivityId = activityId || selectedActivityId;
    if (!fixActivityId || !orphanedTransaction) return;

    onFix(orphanedTransaction.index, fixActivityId);
  };

  const handleSkip = () => {
    if (!orphanedTransaction) return;
    onSkip(orphanedTransaction.index);
  };

  // Filter activities based on search
  const filteredActivities = activities.filter(activity => {
    const search = searchTerm.toLowerCase();
    return (
      activity.title.toLowerCase().includes(search) ||
      activity.iati_id.toLowerCase().includes(search)
    );
  });

  if (!orphanedTransaction) return null;

  const transaction = orphanedTransaction.transaction;

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Fix Orphaned Transaction</span>
            <Badge className="bg-secondary text-secondary-foreground">
              {currentIndex + 1} of {totalOrphans}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            This transaction references an activity that doesn't exist in the system.
            Link it to an existing activity, create a placeholder, or skip it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Details */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center">
                <Link2 className="h-4 w-4 mr-2" />
                Missing Activity Reference
              </h4>
              <Badge className="bg-destructive text-destructive-foreground font-mono">
                {orphanedTransaction.activityRef}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{new Date(transaction.transaction_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span>{formatCurrency(transaction.value, transaction.currency)}</span>
              </div>
              <div className="col-span-2">
                <Badge className="border">
                  {getTransactionTypeLabel(transaction.transaction_type)}
                </Badge>
              </div>
              {transaction.description && (
                <div className="col-span-2 text-gray-600">
                  {transaction.description}
                </div>
              )}
            </div>
          </div>

          {error && (
            <Alert className="border-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Activity Selection */}
          <div className="space-y-3">
            <Label>Link to Existing Activity</Label>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities by title or IATI ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Activity Dropdown */}
            <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an activity" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredActivities.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No activities found
                  </div>
                ) : (
                  filteredActivities.map(activity => (
                    <SelectItem key={activity.id} value={activity.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{activity.title}</span>
                        <span className="text-xs text-muted-foreground">
                          IATI: {activity.iati_id}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Create Placeholder Option */}
          <div className="border-t pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={createPlaceholderActivity}
              disabled={isCreatingPlaceholder}
            >
              {isCreatingPlaceholder ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating placeholder...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Placeholder Activity
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will create a minimal activity with IATI ID: {orphanedTransaction.activityRef}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleSkip}
          >
            <SkipForward className="h-4 w-4 mr-1" />
            Skip Transaction
          </Button>
          <Button
            onClick={() => handleFix()}
            disabled={!selectedActivityId}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Link & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
 