"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ArrowRight, ArrowUpRight, ArrowDownLeft, DollarSign, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { OrganizationLogo } from '@/components/ui/organization-logo';
import { apiFetch } from '@/lib/api-fetch';

interface OrgTransactionsTableProps {
  organizationId: string;
  organizationName?: string;
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
  reportedByOrgName: string;
  isExternallyReported: boolean;
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function OrgTransactionsTable({
  organizationId,
  organizationName,
}: OrgTransactionsTableProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExternalOnly, setShowExternalOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        organizations: organizationId,
        limit: pageSize.toString(),
        page: page.toString(),
        sortField: 'transaction_date',
        sortOrder: 'desc',
      });

      const response = await apiFetch(`/api/transactions?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      const transactionsData = data.data || data || [];
      const total = data.total || data.count || transactionsData.length;
      setTotalCount(total);

      const processedTransactions: TransactionRow[] = transactionsData
        .map((t: any) => {
          const isProvider = t.provider_org_id === organizationId;
          const reportingOrgName = t.activity?.created_by_org_name || t.activity?.created_by_org_acronym || 'Unknown';
          // Check if reported by another org (not the current org)
          const isExternallyReported = t.activity?.reporting_org_id
            ? t.activity.reporting_org_id !== organizationId
            : reportingOrgName !== (organizationName || '');

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
            providerOrgName: t.provider_org_name || t.provider_organization?.name || 'Unknown',
            receiverOrgName: t.receiver_org_name || t.receiver_organization?.name || 'Unknown',
            providerOrgLogo: t.provider_org_logo || t.provider_organization?.logo,
            receiverOrgLogo: t.receiver_org_logo || t.receiver_organization?.logo,
            status: t.status || 'actual',
            isProvider,
            reportedByOrgName: reportingOrgName,
            isExternallyReported,
          };
        });

      setTransactions(processedTransactions);
    } catch (err) {
      console.error('[OrgTransactionsTable] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [organizationId, organizationName, page, pageSize]);

  useEffect(() => {
    if (organizationId) {
      fetchTransactions();
    }
  }, [fetchTransactions, organizationId]);

  const handleRowClick = (activityId: string) => {
    router.push(`/activities/${activityId}?tab=transactions`);
  };

  const handleViewAll = () => {
    router.push('/transactions');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const displayedTransactions = showExternalOnly
    ? transactions.filter(t => t.isExternallyReported)
    : transactions;

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
            My Organisation&apos;s Transactions
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
              My Organisation&apos;s Transactions
            </CardTitle>
            <CardDescription>
              Transactions where your organization is provider or receiver
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showExternalOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowExternalOnly(!showExternalOnly);
                setPage(1);
              }}
              title="Show only transactions reported by other organisations"
            >
              <Filter className="h-4 w-4 mr-1" />
              External
            </Button>
            {transactions.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleViewAll}>
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displayedTransactions.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {showExternalOnly ? 'No externally reported transactions found' : 'No transactions found'}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[280px]">Activity</TableHead>
                  <TableHead className="min-w-[120px]">Date</TableHead>
                  <TableHead className="min-w-[120px]">Original Value</TableHead>
                  <TableHead className="min-w-[110px]">USD Value</TableHead>
                  <TableHead className="min-w-[250px]">Provider → Receiver</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[120px]">Reported By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedTransactions.map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(transaction.activityId)}
                  >
                    <TableCell className="min-w-[280px]">
                      <div className="flex items-start gap-2">
                        {transaction.isProvider ? (
                          <ArrowUpRight className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0" title="Outgoing" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0" title="Incoming" />
                        )}
                        <span className="text-sm">
                          {transaction.activityTitle}{' '}
                          <code className="text-xs font-mono bg-muted text-gray-600 px-1.5 py-0.5 rounded whitespace-nowrap">
                            {transaction.activityIatiIdentifier || transaction.activityId}
                          </code>
                        </span>
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
                          {formatCurrency(transaction.value)}
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
                            {formatCurrency(transaction.valueUsd)}
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
                      <span className="text-sm text-slate-700">
                        {capitalizeFirst(transaction.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600 break-words" title={transaction.reportedByOrgName}>
                        {transaction.reportedByOrgName}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Rows per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => {
                    setPageSize(parseInt(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  Page {page} of {Math.max(totalPages, 1)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
