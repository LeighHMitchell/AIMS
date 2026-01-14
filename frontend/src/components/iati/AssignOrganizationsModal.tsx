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
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  Building2, 
  CheckCircle, 
  Search,
  ArrowRight
} from 'lucide-react';

interface Transaction {
  provider_org_id?: string;
  provider_org_ref?: string;
  provider_org_name?: string;
  receiver_org_id?: string;
  receiver_org_ref?: string;
  receiver_org_name?: string;
  transaction_type: string;
  value: number;
  currency: string;
  transaction_date: string;
  description?: string;
}

interface Organization {
  id: string;
  name: string;
  organization_ref?: string;
  organization_type?: string;
}

interface OrgAssignment {
  provider_org_id?: string;
  receiver_org_id?: string;
}

interface AssignOrganizationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  organizations: Organization[];
  onComplete: (assignments: Record<number, OrgAssignment>) => void;
}

export function AssignOrganizationsModal({
  isOpen,
  onClose,
  transactions,
  organizations,
  onComplete
}: AssignOrganizationsModalProps) {
  // Track assignments: transaction index -> { provider_org_id, receiver_org_id }
  const [assignments, setAssignments] = useState<Record<number, OrgAssignment>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Get transactions that need organization assignment
  const transactionsNeedingAssignment = useMemo(() => {
    return transactions
      .map((tx, index) => ({ tx, index }))
      .filter(({ tx }) => !tx.provider_org_id || !tx.receiver_org_id);
  }, [transactions]);

  // Filter organizations based on search
  const filteredOrganizations = useMemo(() => {
    if (!searchTerm) return organizations;
    
    const term = searchTerm.toLowerCase();
    return organizations.filter(org => 
      org.name.toLowerCase().includes(term) ||
      org.organization_ref?.toLowerCase().includes(term)
    );
  }, [organizations, searchTerm]);

  // Handle individual assignment
  const handleAssignment = (
    transactionIndex: number, 
    orgType: 'provider' | 'receiver', 
    orgId: string
  ) => {
    setAssignments(prev => ({
      ...prev,
      [transactionIndex]: {
        ...prev[transactionIndex],
        [`${orgType}_org_id`]: orgId
      }
    }));
  };

  // Check if all required organizations are assigned
  const allAssigned = transactionsNeedingAssignment.every(({ tx, index }) => {
    const assignment = assignments[index] || {};
    const hasProvider = tx.provider_org_id || assignment.provider_org_id;
    const hasReceiver = tx.receiver_org_id || assignment.receiver_org_id;
    return hasProvider && hasReceiver;
  });

  // Get transaction type label (IATI Standard v2.03)
  const getTransactionTypeLabel = (type: string) => {
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

  if (transactionsNeedingAssignment.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Assign Organizations to Transactions
          </DialogTitle>
          <DialogDescription>
            {transactionsNeedingAssignment.length} transaction{transactionsNeedingAssignment.length > 1 ? 's' : ''} need organization assignment before import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some transactions are missing provider or receiver organizations. 
              Please assign them from your organization list or skip the transactions.
            </AlertDescription>
          </Alert>

          {/* Organization Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search organizations by name or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Transaction List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {transactionsNeedingAssignment.map(({ tx, index }) => {
                const assignment = assignments[index] || {};
                const needsProvider = !tx.provider_org_id && !assignment.provider_org_id;
                const needsReceiver = !tx.receiver_org_id && !assignment.receiver_org_id;

                return (
                  <Card key={index} className="border-orange-200">
                    <CardContent className="pt-4">
                      <div className="space-y-4">
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
                          </div>
                          {!needsProvider && !needsReceiver && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </div>

                        {/* Organization Assignments */}
                        <div className="space-y-3">
                          {/* Provider Organization */}
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3 text-sm font-medium">Provider:</div>
                            <div className="col-span-9">
                              {tx.provider_org_id ? (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm">{tx.provider_org_name || tx.provider_org_ref}</span>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {tx.provider_org_name && (
                                    <p className="text-sm text-muted-foreground">
                                      IATI: {tx.provider_org_name} {tx.provider_org_ref && `(${tx.provider_org_ref})`}
                                    </p>
                                  )}
                                  <Select 
                                    value={assignment.provider_org_id || ''} 
                                    onValueChange={(value) => handleAssignment(index, 'provider', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select provider organization" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {filteredOrganizations.map(org => (
                                        <SelectItem key={org.id} value={org.id}>
                                          {org.name} {org.organization_ref && `(${org.organization_ref})`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </div>

                          <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />

                          {/* Receiver Organization */}
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3 text-sm font-medium">Receiver:</div>
                            <div className="col-span-9">
                              {tx.receiver_org_id ? (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm">{tx.receiver_org_name || tx.receiver_org_ref}</span>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {tx.receiver_org_name && (
                                    <p className="text-sm text-muted-foreground">
                                      IATI: {tx.receiver_org_name} {tx.receiver_org_ref && `(${tx.receiver_org_ref})`}
                                    </p>
                                  )}
                                  <Select 
                                    value={assignment.receiver_org_id || ''} 
                                    onValueChange={(value) => handleAssignment(index, 'receiver', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select receiver organization" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {filteredOrganizations.map(org => (
                                        <SelectItem key={org.id} value={org.id}>
                                          {org.name} {org.organization_ref && `(${org.organization_ref})`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          {/* Progress Summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              Organizations assigned: {Object.keys(assignments).length} / {transactionsNeedingAssignment.length} transactions
            </span>
            {allAssigned && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                All organizations assigned
              </Badge>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (confirm('Are you sure? Transactions without organizations may fail to import.')) {
                onClose();
              }
            }}
          >
            Skip Assignment
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