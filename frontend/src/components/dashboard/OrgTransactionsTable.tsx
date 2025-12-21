"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ArrowRight, ArrowUpRight, ArrowDownLeft, DollarSign } from 'lucide-react';

interface OrgTransactionsTableProps {
  organizationId: string;
  limit?: number;
}

interface TransactionRow {
  id: string;
  transactionType: string;
  transactionTypeName: string;
  value: number;
  currency: string;
  transactionDate: string;
  activityId: string;
  activityTitle: string;
  counterpartyOrgName: string;
  status: string;
  isProvider: boolean;
}

// Transaction type labels
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Commitment',
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
};

// Format currency
function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function OrgTransactionsTable({
  organizationId,
  limit = 10,
}: OrgTransactionsTableProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch transactions using the API route with organization filter
        const params = new URLSearchParams({
          organizations: organizationId,
          limit: (limit * 2).toString(), // Fetch more since we'll filter
          sortField: 'transaction_date',
          sortOrder: 'desc',
        });

        const response = await fetch(`/api/transactions?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const data = await response.json();
        const transactionsData = data.data || data || [];

        // Process transactions
        const processedTransactions: TransactionRow[] = transactionsData
          .map((t: any) => {
            const isProvider = t.provider_org_id === organizationId;
            const counterpartyOrgName = isProvider
              ? t.receiver_org_name || 'Unknown Receiver'
              : t.provider_org_name || 'Unknown Provider';

            return {
              id: t.uuid || t.id,
              transactionType: t.transaction_type,
              transactionTypeName: TRANSACTION_TYPE_LABELS[t.transaction_type] || `Type ${t.transaction_type}`,
              value: t.value || 0,
              currency: t.currency || 'USD',
              transactionDate: t.transaction_date,
              activityId: t.activity_id,
              activityTitle: t.activity_title || 'Unknown Activity',
              counterpartyOrgName,
              status: t.status || 'actual',
              isProvider,
            };
          })
          .slice(0, limit);

        setTransactions(processedTransactions);
      } catch (err) {
        console.error('[OrgTransactionsTable] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchTransactions();
    }
  }, [organizationId, limit]);

  const handleRowClick = (activityId: string) => {
    router.push(`/activities/${activityId}?tab=transactions`);
  };

  const handleViewAll = () => {
    router.push('/transactions');
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            My Organisation's Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load transactions: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-slate-600" />
              My Organisation's Transactions
            </CardTitle>
            <CardDescription>
              Transactions where your organization is provider or receiver
            </CardDescription>
          </div>
          {transactions.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleViewAll}>
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No transactions found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow
                  key={transaction.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => handleRowClick(transaction.activityId)}
                >
                  <TableCell>
                    {transaction.isProvider ? (
                      <ArrowUpRight className="h-4 w-4 text-red-500" title="Outgoing" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-green-500" title="Incoming" />
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{transaction.transactionTypeName}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${transaction.isProvider ? 'text-red-600' : 'text-green-600'}`}>
                      {transaction.isProvider ? '-' : '+'}
                      {formatCurrency(transaction.value, transaction.currency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">
                      {transaction.transactionDate ? format(new Date(transaction.transactionDate), 'MMM d, yyyy') : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm truncate max-w-[200px] block" title={transaction.activityTitle}>
                      {transaction.activityTitle}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 truncate max-w-[150px] block" title={transaction.counterpartyOrgName}>
                      {transaction.counterpartyOrgName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.status === 'actual' ? 'default' : 'secondary'}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
