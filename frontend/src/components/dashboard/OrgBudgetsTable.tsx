"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getSortIcon,
  sortableHeaderClasses,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { StatusRow } from '@/components/ui/status-row';
import { EmptyState } from '@/components/ui/empty-state';
import { FullPagination } from '@/components/ui/full-pagination';
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from '@/lib/pagination';
import { apiFetch } from '@/lib/api-fetch';
import { useDeleteWithUndo } from '@/hooks/useDeleteWithUndo';
import { formatCurrencyCompact } from '@/lib/format';
import type { TableFilterConfig, ReportedByFilter } from '@/types/dashboard';
import { TableRowActionMenu } from './TableRowActionMenu';

interface OrgBudgetsTableProps {
  organizationId: string;
  userId: string;
  filterConfig?: TableFilterConfig;
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
  value_date?: string | null;
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

export function OrgBudgetsTable({ organizationId, userId, filterConfig }: OrgBudgetsTableProps) {
  const router = useRouter();
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState('period_start');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // Driven by the single "Reported by" filter in the parent OrgFinancialTabs
  // header (passed via filterConfig.defaultFilter) — no second dropdown here.
  const reportedBy: ReportedByFilter = filterConfig?.defaultFilter ?? 'my_org';
  const runDelete = useDeleteWithUndo();

  const deleteBudget = (row: BudgetRow) => {
    const label = `${row.currency || ''} ${Number(row.value || 0).toLocaleString()} budget`.trim();
    runDelete({
      id: row.id,
      request: {
        endpoint: '/api/budgets/bulk-delete',
        method: 'DELETE',
        body: { ids: [row.id] },
      },
      label,
      optimisticRemove: () => setBudgets((prev) => prev.filter((b) => b.id !== row.id)),
      restore: () => setBudgets((prev) => (prev.some((b) => b.id === row.id) ? prev : [row, ...prev])),
      onCommit: async () => {
        await fetchBudgets();
      },
    });
  };

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
      // 'all' and 'my_org' show everything (data is already org-scoped)

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


  // Only show the skeleton on the initial load. On a sort/page refetch we keep
  // the existing rows visible so the column just reorders (no full-table flash).
  if (loading && budgets.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-body text-destructive">Failed to load budgets: {error}</p>;
  }

  return (
    <>
      {budgets.length === 0 ? (
        <EmptyState illustration="/images/empty-aqueduct.webp" message="No budgets found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={`min-w-[280px] ${sortableHeaderClasses}`} onClick={() => handleSort('activity_id')}>
                  <div className="flex items-center gap-1">Activity Title {getSortIcon('activity_id', sortField, sortOrder)}</div>
                </TableHead>
                <TableHead className={`min-w-[160px] ${sortableHeaderClasses}`} onClick={() => handleSort('period_start')}>
                  <div className="flex items-center gap-1">Period {getSortIcon('period_start', sortField, sortOrder)}</div>
                </TableHead>
                <TableHead className={sortableHeaderClasses} onClick={() => handleSort('type')}>
                  <div className="flex items-center gap-1">Type {getSortIcon('type', sortField, sortOrder)}</div>
                </TableHead>
                <TableHead className={`min-w-[140px] ${sortableHeaderClasses}`} onClick={() => handleSort('value')}>
                  <div className="flex items-center gap-1">Original Value {getSortIcon('value', sortField, sortOrder)}</div>
                </TableHead>
                <TableHead className={`min-w-[100px] ${sortableHeaderClasses}`} onClick={() => handleSort('value_date')}>
                  <div className="flex items-center gap-1">Value Date {getSortIcon('value_date', sortField, sortOrder)}</div>
                </TableHead>
                <TableHead className="min-w-[120px]">USD Value</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget) => {
                return (
                  <TableRow
                    key={budget.id}
                    className="group/row cursor-pointer hover:bg-muted/50"
                    onClick={() => budget.activity_id && router.push(`/activities/${budget.activity_id}?tab=financials`)}
                  >
                    <TableCell className="min-w-[280px]">
                      <span className="text-body">
                        {budget.activity?.title_narrative || 'Unknown Activity'}{' '}
                        {budget.activity?.iati_identifier && (
                          <code className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded whitespace-nowrap">
                            {budget.activity.iati_identifier}
                          </code>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-body text-muted-foreground whitespace-nowrap">
                        {budget.period_start ? format(new Date(budget.period_start), 'MMM yyyy') : '-'}
                        {' to '}
                        {budget.period_end ? format(new Date(budget.period_end), 'MMM yyyy') : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusRow code={budget.type} label={BUDGET_TYPE_LABELS[budget.type] || `Type ${budget.type}`} className="text-body" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-foreground">
                          <span className="text-helper text-muted-foreground mr-1 font-normal">{budget.currency}</span>
                          {formatCurrencyCompact(budget.value, budget.currency)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-body text-muted-foreground whitespace-nowrap">
                        {budget.value_date ? format(new Date(budget.value_date), 'dd MMM yyyy') : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {budget.value_usd != null ? (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground">
                            <span className="text-helper text-muted-foreground mr-1 font-normal">USD</span>
                            {formatCurrencyCompact(budget.value_usd, 'USD')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-body text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity">
                      <TableRowActionMenu activityId={budget.activity_id} entityType="budget" entityId={budget.id} onDelete={() => deleteBudget(budget)} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <FullPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalCount}
            perPage={pageSize}
            onPageChange={(p) => setPage(p)}
            onPerPageChange={(n) => { setPageSize(n); setPage(1); }}
            perPageOptions={PAGE_SIZE_OPTIONS}
            itemLabel="budgets"
          />
        </>
      )}
    </>
  );
}
