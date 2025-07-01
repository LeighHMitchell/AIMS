'use client';

import React, { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Link2, 
  CheckCircle, 
  Info,
  Users
} from 'lucide-react';

interface Transaction {
  activityRef?: string;
  activity_id?: string;
  transaction_type: string;
  value: number;
  currency: string;
  transaction_date: string;
  description?: string;
  _needsActivityAssignment?: boolean;
}

interface Activity {
  id: string;
  iati_id: string;
  title: string;
}

interface AssignTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  existingActivities: Activity[];
  newActivities: Array<{ iatiIdentifier: string; title: string }>;
  onComplete: (assignments: Record<number, string>) => void;
}

export function AssignTransactionsModal({
  isOpen,
  onClose,
  transactions,
  existingActivities,
  newActivities,
  onComplete
}: AssignTransactionsModalProps) {
  // Track assignments: transaction index -> activity UUID
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [bulkActivityId, setBulkActivityId] = useState<string>('');

  // Get unlinked transactions
  const unlinkedTransactions = useMemo(() => {
    return transactions
      .map((tx, index) => ({ tx, index }))
      .filter(({ tx }) => tx._needsActivityAssignment);
  }, [transactions]);

  // Combine existing and new activities for dropdown
  const allActivities = useMemo(() => {
    const combined: Array<{ id: string; label: string; isNew?: boolean }> = [];
    
    // Add existing activities
    existingActivities.forEach(activity => {
      combined.push({
        id: activity.id,
        label: `${activity.title} (${activity.iati_id})`
      });
    });
    
    // Add new activities from current import
    newActivities.forEach(activity => {
      combined.push({
        id: `new-${activity.iatiIdentifier}`,
        label: `[NEW] ${activity.title} (${activity.iatiIdentifier})`,
        isNew: true
      });
    });
    
    return combined;
  }, [existingActivities, newActivities]);

  // Handle individual assignment
  const handleAssignment = (transactionIndex: number, activityId: string) => {
    setAssignments(prev => ({
      ...prev,
      [transactionIndex]: activityId
    }));
  };

  // Handle bulk assignment
  const handleBulkAssign = () => {
    if (!bulkActivityId) return;
    
    const newAssignments: Record<number, string> = {};
    unlinkedTransactions.forEach(({ index }) => {
      if (!assignments[index]) {
        newAssignments[index] = bulkActivityId;
      }
    });
    
    setAssignments(prev => ({
      ...prev,
      ...newAssignments
    }));
  };

  // Check if all transactions are assigned
  const allAssigned = unlinkedTransactions.every(({ index }) => assignments[index]);

  // Get transaction type label
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

  // Format currency
  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(value);
  };

  const handleProceed = () => {
    onComplete(assignments);
  };

  if (unlinkedTransactions.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Assign Transactions to Activities
          </DialogTitle>
          <DialogDescription>
            {unlinkedTransactions.length} transaction{unlinkedTransactions.length > 1 ? 's' : ''} need to be assigned to activities before import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              These transactions reference activities that don't exist in the database or current import. 
              You must assign them to existing activities or skip them.
            </AlertDescription>
          </Alert>

          {/* Bulk Assignment */}
          {unlinkedTransactions.length > 1 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Bulk assign all unassigned to:</span>
                  <Select value={bulkActivityId} onValueChange={setBulkActivityId}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select an activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {allActivities.map(activity => (
                        <SelectItem key={activity.id} value={activity.id}>
                          {activity.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleBulkAssign} 
                    disabled={!bulkActivityId}
                    size="sm"
                  >
                    Apply
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transaction List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {unlinkedTransactions.map(({ tx, index }) => (
                <Card key={index} className={assignments[index] ? 'border-green-200' : ''}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* Transaction Info */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getTransactionTypeLabel(tx.transaction_type)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {tx.transaction_date}
                            </span>
                            <span className="font-mono text-sm">
                              {formatCurrency(tx.value, tx.currency)}
                            </span>
                          </div>
                          {tx.description && (
                            <p className="text-sm text-muted-foreground">
                              {tx.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-3 w-3 text-yellow-600" />
                            <span className="text-yellow-600">
                              References missing activity: 
                              <code className="ml-1 font-mono">{tx.activityRef}</code>
                            </span>
                          </div>
                        </div>
                        {assignments[index] && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>

                      {/* Assignment Dropdown */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Assign to:</span>
                        <Select 
                          value={assignments[index] || ''} 
                          onValueChange={(value) => handleAssignment(index, value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select an activity" />
                          </SelectTrigger>
                          <SelectContent>
                            {allActivities.map(activity => (
                              <SelectItem key={activity.id} value={activity.id}>
                                {activity.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Progress Summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              Assigned: {Object.keys(assignments).length} / {unlinkedTransactions.length}
            </span>
            {allAssigned && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                All transactions assigned
              </Badge>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (confirm('Are you sure? Unassigned transactions will be skipped during import.')) {
                onClose();
              }
            }}
          >
            Skip Unassigned
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!allAssigned}
          >
            Continue Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 