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
import { ArrowUpRight, ArrowDownLeft, DollarSign, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { OrganizationLogo } from '@/components/ui/organization-logo';
import { TableRowActionMenu } from './TableRowActionMenu';
import { apiFetch } from '@/lib/api-fetch';
import type { TableFilterConfig, ReportedByFilter } from '@/types/dashboard';

interface OrgTransactionsTableProps {
  organizationId: string;
  organizationName?: string;
  userId?: string;
  embedded?: boolean;
  filterConfig?: TableFilterConfig;
}

interface TransactionRow {
  id: string;
  transactionType: string;
  transactionTypeName: string;
  value: number;
  currency: string;
  valueUsd?: number;
  transactionDate: string;
  valueDate?: string | null;
  activityId: string;
  activityIatiIdentifier: string | null;
  activityTitle: string;
  providerOrgName: string;
  providerOrgAcronym?: string | null;
  receiverOrgName: string;
  receiverOrgAcronym?: string | null;
  providerOrgLogo?: string | null;
  receiverOrgLogo?: string | null;
  status: string;
  isProvider: boolean;
  reportedByOrgName: string;
  reportedByOrgLogo?: string | null;
  reportedByOrgAcronym?: string | null;
  isExternallyReported: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
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
  userId,
  embedded = false,
  filterConfig,
}: OrgTransactionsTableProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState('transaction_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const reportedBy = filterConfig?.defaultFilter ?? 'all';

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        organizations: organizationId,
        limit: pageSize.toString(),
        page: page.toString(),
        sortField,
        sortOrder,
      });

      // Pass the reported-by filter to the API for server-side filtering
      if (reportedBy === 'my_org') {
        params.set('reportedByOrg', 'self');
      } else if (reportedBy === 'other_orgs') {
        params.set('reportedByOrg', 'other');
      } else if (reportedBy === 'me' && userId) {
        params.set('reportedByUser', userId);
      }

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
          const reportingOrgName = t.activity?.created_by_org_acronym || t.activity?.created_by_org_name || 'Unknown';
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
            valueDate: t.value_date || null,
            activityId: t.activity_id,
            activityIatiIdentifier: t.activity?.iati_identifier || null,
            activityTitle: t.activity?.title_narrative || t.activity_title || 'Unknown Activity',
            providerOrgName: t.provider_org_name || t.provider_organization?.name || 'Unknown',
            providerOrgAcronym: t.provider_org_acronym || t.provider_organization?.acronym || null,
            receiverOrgName: t.receiver_org_name || t.receiver_organization?.name || 'Unknown',
            receiverOrgAcronym: t.receiver_org_acronym || t.receiver_organization?.acronym || null,
            providerOrgLogo: t.provider_org_logo || t.provider_organization?.logo,
            receiverOrgLogo: t.receiver_org_logo || t.receiver_organization?.logo,
            status: t.status || 'actual',
            isProvider,
            reportedByOrgName: reportingOrgName,
            reportedByOrgLogo: t.reporting_org_logo || null,
            reportedByOrgAcronym: t.reporting_org_acronym || t.activity?.created_by_org_acronym || null,
            isExternallyReported,
            createdBy: t.created_by || null,
            updatedBy: t.updated_by || null,
          };
        });

      setTransactions(processedTransactions);
      setTotalCount(total);
    } catch (err) {
      console.error('[OrgTransactionsTable] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [organizationId, organizationName, userId, page, pageSize, sortField, sortOrder, reportedBy]);

  useEffect(() => {
    if (organizationId) {
      fetchTransactions();
    }
  }, [fetchTransactions, organizationId]);

  const handleRowClick = (activityId: string) => {
    router.push(`/activities/${activityId}?tab=transactions`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />;
    return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const loadingSkeleton = (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );

  const errorContent = (
    <p className="text-body text-destructive">Failed to load transactions: {error}</p>
  );

  const tableContent = loading ? loadingSkeleton : error ? errorContent : transactions.length === 0 ? (
    <div className="text-center py-8">
      <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-3" />
      <p className="text-body text-muted-foreground">No transactions found</p>
    </div>
  ) : (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[280px] cursor-pointer select-none" onClick={() => handleSort('activity_title')}>
              <span className="flex items-center gap-1">Activity Title <SortIcon field="activity_title" /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('transaction_type')}>
              <span className="flex items-center gap-1">Type <SortIcon field="transaction_type" /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
              <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
            </TableHead>
            <TableHead className="min-w-[250px]">Provider → Receiver</TableHead>
            <TableHead className="min-w-[160px] cursor-pointer select-none" onClick={() => handleSort('value')}>
              <span className="flex items-center gap-1">Original Value <SortIcon field="value" /></span>
            </TableHead>
            <TableHead className="min-w-[100px] cursor-pointer select-none" onClick={() => handleSort('value_date')}>
              <span className="flex items-center gap-1">Value Date <SortIcon field="value_date" /></span>
            </TableHead>
            <TableHead className="min-w-[110px] cursor-pointer select-none" onClick={() => handleSort('value_usd')}>
              <span className="flex items-center gap-1">USD Value <SortIcon field="value_usd" /></span>
            </TableHead>
            <TableHead className="min-w-[120px]">Reported By</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(transaction.activityId)}
                  >
                    <TableCell className="min-w-[280px]">
                      <div className="flex items-start gap-2">
                        {transaction.isProvider ? (
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" title="Outgoing" />

                        ) : (
                          <ArrowDownLeft className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" title="Incoming" />
                        )}
                        <span className="text-body">
                          {transaction.activityTitle}{' '}
                          <code className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded whitespace-nowrap">
                            {transaction.activityIatiIdentifier || transaction.activityId}
                          </code>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-body">{transaction.transactionTypeName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-body text-foreground">
                        {capitalizeFirst(transaction.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap" title={`${transaction.providerOrgName} → ${transaction.receiverOrgName}`}>
                        <span className="flex items-center gap-1.5 flex-shrink-0">
                          <OrganizationLogo
                            logo={transaction.providerOrgLogo}
                            name={transaction.providerOrgName}
                            size="sm"
                          />
                          <span className="text-body text-muted-foreground whitespace-nowrap">
                            {transaction.providerOrgAcronym || transaction.providerOrgName}
                          </span>
                          <span className="text-muted-foreground">→</span>
                        </span>
                        <span className="flex items-center gap-1.5 min-w-0">
                          <OrganizationLogo
                            logo={transaction.receiverOrgLogo}
                            name={transaction.receiverOrgName}
                            size="sm"
                          />
                          <span className="text-body text-muted-foreground whitespace-nowrap">
                            {transaction.receiverOrgAcronym || transaction.receiverOrgName}
                          </span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-foreground">
                          <span className="text-helper text-muted-foreground mr-1 font-normal">
                            {transaction.currency}
                          </span>
                          {formatCurrency(transaction.value)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-body text-muted-foreground whitespace-nowrap">
                        {transaction.valueDate ? format(new Date(transaction.valueDate), 'dd MMM yyyy') : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {transaction.valueUsd != null ? (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground">
                            <span className="text-helper text-muted-foreground mr-1 font-normal">
                              USD
                            </span>
                            {formatCurrency(transaction.valueUsd)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-body text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5" title={transaction.reportedByOrgName}>
                        <OrganizationLogo logo={transaction.reportedByOrgLogo} name={transaction.reportedByOrgName} size="sm" />
                        <span className="text-body text-muted-foreground truncate max-w-[120px]">
                          {transaction.reportedByOrgAcronym || transaction.reportedByOrgName}
                        </span>
                      </div>
                    </TableCell>
                    {!transaction.isExternallyReported && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <TableRowActionMenu activityId={transaction.activityId} entityType="transaction" entityId={transaction.id} onDelete={() => {/* TODO: implement delete */}} />
                      </TableCell>
                    )}
                    {transaction.isExternallyReported && <TableCell />}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-body text-muted-foreground">Rows per page:</span>
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
                <span className="text-body text-muted-foreground">
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
  );

  if (embedded) {
    return tableContent;
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          My Organisation&apos;s Transactions
        </CardTitle>
        <CardDescription>
          Transactions where your organization is provider or receiver
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tableContent}
      </CardContent>
    </Card>
  );
}
