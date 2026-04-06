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
import { Banknote, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { OrganizationLogo } from '@/components/ui/organization-logo';
import { apiFetch } from '@/lib/api-fetch';
import type { TableFilterConfig, ReportedByFilter } from '@/types/dashboard';
import { TableRowActionMenu } from './TableRowActionMenu';

interface OrgPlannedDisbursementsTableProps {
  organizationId: string;
  userId: string;
  filterConfig?: TableFilterConfig;
}

interface DisbursementRow {
  id: string;
  activity_id: string;
  amount: number;
  currency: string;
  usd_amount: number | null;
  value_date?: string | null;
  period_start: string;
  period_end: string;
  provider_org_name: string | null;
  provider_org_acronym: string | null;
  provider_org_logo: string | null;
  receiver_org_name: string | null;
  receiver_org_acronym: string | null;
  receiver_org_logo: string | null;
  reporting_org_name: string | null;
  reporting_org_acronym: string | null;
  reporting_org_logo: string | null;
  created_by?: string;
  updated_by?: string;
  activity: {
    id: string;
    title_narrative: string;
    iati_identifier: string | null;
    reporting_org_id?: string | null;
  } | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function OrgPlannedDisbursementsTable({ organizationId, userId, filterConfig }: OrgPlannedDisbursementsTableProps) {
  const router = useRouter();
  const [disbursements, setDisbursements] = useState<DisbursementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState('period_start');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const reportedBy = filterConfig?.defaultFilter ?? 'all';

  const fetchDisbursements = useCallback(async () => {
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

      const response = await apiFetch(`/api/planned-disbursements/list?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch planned disbursements');

      const data = await response.json();
      const rows: DisbursementRow[] = data.disbursements || [];

      setDisbursements(rows);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('[OrgPlannedDisbursementsTable] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load planned disbursements');
    } finally {
      setLoading(false);
    }
  }, [organizationId, userId, page, pageSize, sortField, sortOrder, reportedBy]);

  useEffect(() => {
    if (organizationId) fetchDisbursements();
  }, [fetchDisbursements, organizationId]);

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
    return <p className="text-sm text-red-600">Failed to load planned disbursements: {error}</p>;
  }

  return (
    <>
      {disbursements.length === 0 ? (
        <div className="text-center py-8">
          <Banknote className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No planned disbursements found</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[280px] cursor-pointer select-none" onClick={() => handleSort('activity_id')}>
                  <span className="flex items-center gap-1">Activity Title <SortIcon field="activity_id" /></span>
                </TableHead>
                <TableHead className="min-w-[250px]">Provider → Receiver</TableHead>
                <TableHead className="min-w-[160px] cursor-pointer select-none" onClick={() => handleSort('period_start')}>
                  <span className="flex items-center gap-1">Period <SortIcon field="period_start" /></span>
                </TableHead>
                <TableHead className="min-w-[140px] cursor-pointer select-none" onClick={() => handleSort('amount')}>
                  <span className="flex items-center gap-1">Original Value <SortIcon field="amount" /></span>
                </TableHead>
                <TableHead className="min-w-[100px] cursor-pointer select-none" onClick={() => handleSort('value_date')}>
                  <span className="flex items-center gap-1">Value Date <SortIcon field="value_date" /></span>
                </TableHead>
                <TableHead className="min-w-[120px]">USD Value</TableHead>
                <TableHead className="min-w-[150px]">Reported By</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disbursements.map((d) => (
                <TableRow
                  key={d.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => d.activity_id && router.push(`/activities/${d.activity_id}?tab=financials`)}
                >
                  <TableCell className="min-w-[280px]">
                    <span className="text-sm">
                      {d.activity?.title_narrative || 'Unknown Activity'}{' '}
                      {d.activity?.iati_identifier && (
                        <code className="text-xs font-mono bg-muted text-gray-600 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {d.activity.iati_identifier}
                        </code>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap" title={`${d.provider_org_name || '-'} → ${d.receiver_org_name || '-'}`}>
                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        <OrganizationLogo logo={d.provider_org_logo} name={d.provider_org_name || 'Unknown'} size="sm" />
                        <span className="text-sm text-slate-600 whitespace-nowrap">
                          {d.provider_org_acronym || d.provider_org_name || '-'}
                        </span>
                        <span className="text-slate-400">→</span>
                      </span>
                      <span className="flex items-center gap-1.5 min-w-0">
                        <OrganizationLogo logo={d.receiver_org_logo} name={d.receiver_org_name || 'Unknown'} size="sm" />
                        <span className="text-sm text-slate-600 whitespace-nowrap">
                          {d.receiver_org_acronym || d.receiver_org_name || '-'}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 whitespace-nowrap">
                      {d.period_start ? format(new Date(d.period_start), 'MMM yyyy') : '-'}
                      {' — '}
                      {d.period_end ? format(new Date(d.period_end), 'MMM yyyy') : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-slate-700">
                        <span className="text-xs text-muted-foreground mr-1 font-normal">{d.currency}</span>
                        {formatCurrency(d.amount)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 whitespace-nowrap">
                      {d.value_date ? format(new Date(d.value_date), 'dd MMM yyyy') : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {d.usd_amount != null ? (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-700">
                          <span className="text-xs text-muted-foreground mr-1 font-normal">USD</span>
                          {formatCurrency(d.usd_amount)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5" title={d.reporting_org_name || '-'}>
                      <OrganizationLogo logo={d.reporting_org_logo} name={d.reporting_org_name || 'Unknown'} size="sm" />
                      <span className="text-sm text-slate-600 truncate max-w-[120px]">
                        {d.reporting_org_acronym || d.reporting_org_name || '-'}
                      </span>
                    </div>
                  </TableCell>
                  {(!d.activity?.reporting_org_id || d.activity.reporting_org_id === organizationId) ? (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <TableRowActionMenu activityId={d.activity_id} entityType="planned-disbursement" entityId={d.id} onDelete={() => {/* TODO: implement delete */}} />
                    </TableCell>
                  ) : (
                    <TableCell />
                  )}
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
