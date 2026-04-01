"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
import { Wallet, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';

interface OrgBudgetsTableProps {
  organizationId: string;
  userId: string;
}

interface BudgetRow {
  id: string;
  activity_id: string;
  type: number;
  status: number;
  period_start: string;
  period_end: string;
  value: number;
  currency: string;
  value_usd: number | null;
  created_by?: string;
  updated_by?: string;
  activity: {
    id: string;
    title_narrative: string;
    iati_identifier: string | null;
    submission_status: string | null;
    created_by?: string;
    updated_by?: string;
  } | null;
}

const BUDGET_TYPE_LABELS: Record<number, string> = {
  1: 'Original',
  2: 'Revised',
};

const VALIDATION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  validated: { label: 'Validated', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  more_info_requested: { label: 'Info Requested', color: 'bg-orange-100 text-orange-700' },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function OrgBudgetsTable({ organizationId, userId }: OrgBudgetsTableProps) {
  const router = useRouter();
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState('period_start');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [reportedBy, setReportedBy] = useState<'my_org' | 'me'>('my_org');

  const fetchBudgets = useCallback(async () => {
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

      const response = await apiFetch(`/api/budgets/list?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch budgets');

      const data = await response.json();
      let rows: BudgetRow[] = data.budgets || [];

      if (reportedBy === 'me') {
        rows = rows.filter(
          (b) =>
            b.created_by === userId ||
            b.updated_by === userId ||
            b.activity?.created_by === userId ||
            b.activity?.updated_by === userId
        );
      }

      setBudgets(rows);
      setTotalCount(reportedBy === 'me' ? rows.length : (data.total || 0));
    } catch (err) {
      console.error('[OrgBudgetsTable] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, [organizationId, userId, page, pageSize, sortField, sortOrder, reportedBy]);

  useEffect(() => {
    if (organizationId) fetchBudgets();
  }, [fetchBudgets, organizationId]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-slate-400" />;
    return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">Failed to load budgets: {error}</p>;
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-slate-500">Reported by:</span>
        <Select value={reportedBy} onValueChange={(val: 'my_org' | 'me') => { setReportedBy(val); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="my_org">My Organisation</SelectItem>
            <SelectItem value="me">By Me</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {budgets.length === 0 ? (
        <div className="text-center py-8">
          <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No budgets found</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[280px] cursor-pointer select-none" onClick={() => handleSort('activity_id')}>
                  <span className="flex items-center gap-1">Activity <SortIcon field="activity_id" /></span>
                </TableHead>
                <TableHead className="min-w-[160px] cursor-pointer select-none" onClick={() => handleSort('period_start')}>
                  <span className="flex items-center gap-1">Period <SortIcon field="period_start" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('type')}>
                  <span className="flex items-center gap-1">Type <SortIcon field="type" /></span>
                </TableHead>
                <TableHead className="min-w-[140px] cursor-pointer select-none" onClick={() => handleSort('value')}>
                  <span className="flex items-center gap-1">Value <SortIcon field="value" /></span>
                </TableHead>
                <TableHead className="min-w-[120px]">USD Value</TableHead>
                <TableHead>Activity Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget) => {
                const statusInfo = budget.activity?.submission_status
                  ? VALIDATION_STATUS_LABELS[budget.activity.submission_status]
                  : null;
                return (
                  <TableRow
                    key={budget.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => budget.activity_id && router.push(`/activities/${budget.activity_id}?tab=financials`)}
                  >
                    <TableCell className="min-w-[280px]">
                      <span className="text-sm">
                        {budget.activity?.title_narrative || 'Unknown Activity'}{' '}
                        {budget.activity?.iati_identifier && (
                          <code className="text-xs font-mono bg-muted text-gray-600 px-1.5 py-0.5 rounded whitespace-nowrap">
                            {budget.activity.iati_identifier}
                          </code>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600 whitespace-nowrap">
                        {budget.period_start ? format(new Date(budget.period_start), 'MMM yyyy') : '-'}
                        {' — '}
                        {budget.period_end ? format(new Date(budget.period_end), 'MMM yyyy') : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{BUDGET_TYPE_LABELS[budget.type] || `Type ${budget.type}`}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-700">
                          <span className="text-xs text-gray-500 mr-1 font-normal">{budget.currency}</span>
                          {formatCurrency(budget.value)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {budget.value_usd != null ? (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-700">
                            <span className="text-xs text-gray-500 mr-1 font-normal">USD</span>
                            {formatCurrency(budget.value_usd)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {statusInfo ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Rows per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(val) => { setPageSize(parseInt(val)); setPage(1); }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                Page {page} of {Math.max(totalPages, 1)}
              </span>
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
