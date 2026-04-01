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

interface OrgPlannedDisbursementsTableProps {
  organizationId: string;
  userId: string;
}

interface DisbursementRow {
  id: string;
  activity_id: string;
  amount: number;
  currency: string;
  usd_amount: number | null;
  period_start: string;
  period_end: string;
  provider_org_name: string | null;
  provider_org_logo: string | null;
  receiver_org_name: string | null;
  receiver_org_logo: string | null;
  created_by?: string;
  updated_by?: string;
  activity: {
    id: string;
    title_narrative: string;
    iati_identifier: string | null;
  } | null;
}

function getOrgAcronym(name: string | null): string {
  if (!name) return '-';
  // If already short (<=8 chars), show as-is
  if (name.length <= 8) return name;
  // Check if it looks like an acronym is embedded (e.g. "UNDP", "WHO")
  const allCapsMatch = name.match(/\b[A-Z]{2,}\b/);
  if (allCapsMatch) return allCapsMatch[0];
  // Otherwise, take first letters of each word
  const words = name.split(/\s+/).filter(w => w.length > 0 && w[0] !== '(');
  if (words.length >= 2) {
    return words.map(w => w[0].toUpperCase()).join('');
  }
  // Single long word — truncate
  return name.slice(0, 8) + '…';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function OrgPlannedDisbursementsTable({ organizationId, userId }: OrgPlannedDisbursementsTableProps) {
  const router = useRouter();
  const [disbursements, setDisbursements] = useState<DisbursementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState('period_start');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [reportedBy, setReportedBy] = useState<'my_org' | 'me'>('my_org');

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

      const response = await apiFetch(`/api/planned-disbursements/list?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch planned disbursements');

      const data = await response.json();
      let rows: DisbursementRow[] = data.disbursements || [];

      if (reportedBy === 'me') {
        rows = rows.filter(
          (d) => d.created_by === userId || d.updated_by === userId
        );
      }

      setDisbursements(rows);
      setTotalCount(reportedBy === 'me' ? rows.length : (data.total || 0));
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
                  <span className="flex items-center gap-1">Activity <SortIcon field="activity_id" /></span>
                </TableHead>
                <TableHead className="min-w-[160px] cursor-pointer select-none" onClick={() => handleSort('period_start')}>
                  <span className="flex items-center gap-1">Period <SortIcon field="period_start" /></span>
                </TableHead>
                <TableHead className="min-w-[250px]">Provider → Receiver</TableHead>
                <TableHead className="min-w-[140px] cursor-pointer select-none" onClick={() => handleSort('amount')}>
                  <span className="flex items-center gap-1">Value <SortIcon field="amount" /></span>
                </TableHead>
                <TableHead className="min-w-[120px]">USD Value</TableHead>
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
                    <span className="text-sm text-slate-600 whitespace-nowrap">
                      {d.period_start ? format(new Date(d.period_start), 'MMM yyyy') : '-'}
                      {' — '}
                      {d.period_end ? format(new Date(d.period_end), 'MMM yyyy') : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5" title={`${d.provider_org_name || '-'} → ${d.receiver_org_name || '-'}`}>
                      <OrganizationLogo logo={d.provider_org_logo} name={d.provider_org_name || 'Unknown'} size="sm" />
                      <span className="text-sm text-slate-600">
                        {getOrgAcronym(d.provider_org_name)}
                      </span>
                      <span className="text-slate-400">→</span>
                      <OrganizationLogo logo={d.receiver_org_logo} name={d.receiver_org_name || 'Unknown'} size="sm" />
                      <span className="text-sm text-slate-600">
                        {getOrgAcronym(d.receiver_org_name)}
                      </span>
                    </div>
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
