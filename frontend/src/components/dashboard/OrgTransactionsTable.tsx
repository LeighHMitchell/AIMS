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
import { OrganizationLogo } from '@/components/ui/organization-logo';

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
  valueUsd?: number;
  transactionDate: string;
  activityId: string;
  activityIatiIdentifier: string | null;
  activityTitle: string;
  providerOrgName: string;
  receiverOrgName: string;
  providerOrgLogo?: string | null;
  receiverOrgLogo?: string | null;
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

// Format currency without symbol
function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
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

            return {
              id: t.uuid || t.id,
              transactionType: t.transaction_type,
              transactionTypeName: TRANSACTION_TYPE_LABELS[t.transaction_type] || `Type ${t.transaction_type}`,
              value: t.value || 0,
              currency: t.currency || 'USD',
              valueUsd: t.value_usd || (t.currency === 'USD' ? t.value : undefined),
              transactionDate: t.transaction_date,
              activityId: t.activity_id,
              activityIatiIdentifier: t.activity?.iati_identifier || null,
              activityTitle: t.activity?.title_narrative || t.activity_title || 'Unknown Activity',
              providerOrgName: t.provider_org_name || 'Unknown',
              receiverOrgName: t.receiver_org_name || 'Unknown',
              providerOrgLogo: t.provider_org_logo,
              receiverOrgLogo: t.receiver_org_logo,
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
                <TableHead className="min-w-[300px]">Activity</TableHead>
                <TableHead className="min-w-[120px]">Date</TableHead>
                <TableHead className="min-w-[120px]">Original Value</TableHead>
                <TableHead className="min-w-[110px]">USD Value</TableHead>
                <TableHead className="min-w-[250px]">Provider → Receiver</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow
                  key={transaction.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(transaction.activityId)}
                >
                  <TableCell className="min-w-[300px]">
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        {transaction.isProvider ? (
                          <ArrowUpRight className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0" title="Outgoing" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0" title="Incoming" />
                        )}
                        <span className="text-sm whitespace-normal break-words">
                          {transaction.activityTitle}
                        </span>
                      </div>
                      <div className="pl-6">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {transaction.activityIatiIdentifier || transaction.activityId}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 whitespace-nowrap">
                      {transaction.transactionDate ? format(new Date(transaction.transactionDate), 'd MMMM yyyy') : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-slate-700">
                        <span className="text-xs text-gray-500 mr-1 font-normal">
                          {transaction.currency}
                        </span>
                        {formatCurrency(transaction.value, transaction.currency)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {transaction.valueUsd != null ? (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-700">
                          <span className="text-xs text-gray-500 mr-1 font-normal">
                            USD
                          </span>
                          {formatCurrency(transaction.valueUsd, 'USD')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5" title={`${transaction.providerOrgName} → ${transaction.receiverOrgName}`}>
                      <OrganizationLogo 
                        logo={transaction.providerOrgLogo} 
                        name={transaction.providerOrgName}
                        size="sm"
                      />
                      <span className="text-sm text-slate-600 truncate max-w-[120px]">
                        {transaction.providerOrgName}
                      </span>
                      <span className="text-slate-400">→</span>
                      <OrganizationLogo 
                        logo={transaction.receiverOrgLogo} 
                        name={transaction.receiverOrgName}
                        size="sm"
                      />
                      <span className="text-sm text-slate-600 truncate max-w-[120px]">
                        {transaction.receiverOrgName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{transaction.transactionTypeName}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-transparent border border-slate-300 text-slate-700">
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
