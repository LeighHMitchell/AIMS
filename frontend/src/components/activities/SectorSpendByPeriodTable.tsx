'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { ChartDataTable, CodeChip, ChartTableColumn } from '@/components/ui/chart-data-table';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';

interface PeriodCell {
  periodKey: number;
  actualUsd: number;
  imputedUsd: number;
}
interface SectorRow {
  sectorCode: string;
  sectorName: string;
  categoryCode: string;
  categoryName: string;
  byPeriod: PeriodCell[];
  totalActualUsd: number;
  totalImputedUsd: number;
}
interface SpendResponse {
  success: boolean;
  periods: { key: number; label: string }[];
  rows: SectorRow[];
  dataQuality: { actualUsd: number; imputedUsd: number; unallocatedUsd: number; unconvertibleCount: number };
  error?: string;
}

interface Props {
  activityId: string;
  /** 'disbursement' | 'disbursement_expenditure' (default) | 'commitment' */
  basis?: string;
  /** When true, render nothing if there is no spend to show (keeps activity-level tabs clean). */
  hideWhenEmpty?: boolean;
  /** When true, the table body collapses behind a clickable header so it stays out of the way. */
  collapsible?: boolean;
  /** When collapsible, start collapsed (header only) until the user expands it. */
  defaultCollapsed?: boolean;
}

/**
 * Sector spend over time for a single activity: USD per sector per year, with the
 * actual-vs-imputed data-quality split. Complements the value-weighted "Weighted average
 * across transactions" table by showing HOW MUCH went to each sector, WHEN.
 * Uses the shared ChartDataTable so it looks and sorts like every other table in the app.
 */
export function SectorSpendByPeriodTable({ activityId, basis = 'disbursement_expenditure', hideWhenEmpty = false, collapsible = false, defaultCollapsed = false }: Props) {
  const [data, setData] = useState<SpendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(!(collapsible && defaultCollapsed));

  useEffect(() => {
    if (!activityId) return;
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/activities/${activityId}/sector-spend-by-period?basis=${encodeURIComponent(basis)}`)
      .then((r) => r.json())
      .then((d: SpendResponse) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activityId, basis]);

  const periods = data?.periods || [];
  const rows = data?.rows || [];
  const dq = data?.dataQuality;

  const totalUsd = (dq?.actualUsd || 0) + (dq?.imputedUsd || 0);
  const pctActual = totalUsd > 0 ? Math.round(((dq?.actualUsd || 0) / totalUsd) * 100) : 100;

  // Build ChartDataTable rows: one per sector, with a USD column per period.
  const tableRows = useMemo(() =>
    rows.map((r) => {
      const row: Record<string, any> = {
        sector: r.sectorName, // sortable value; rendered with a code chip below
        __code: r.sectorCode,
      };
      periods.forEach((p) => {
        const cell = r.byPeriod.find((c) => c.periodKey === p.key);
        row[p.label] = cell ? cell.actualUsd + cell.imputedUsd : 0;
      });
      return row;
    }),
  [rows, periods]);

  const columns: ChartTableColumn[] = useMemo(() => [
    {
      key: 'sector',
      label: 'Sector',
      align: 'left',
      format: (_v, row) => (
        <span>
          <CodeChip className="mr-2">{(row as any).__code}</CodeChip>
          {(row as any).sector}
        </span>
      ),
    },
    ...periods.map((p) => ({ key: p.label, label: `CY${p.label}`, numeric: true, currency: 'USD' } as ChartTableColumn)),
  ], [periods]);

  // Optionally render nothing when there's no spend to show (avoids clutter on activity-level tabs).
  if (hideWhenEmpty && !loading && rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="flex items-center gap-1 text-body font-medium text-foreground hover:text-foreground/80"
            >
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span>Sector Spend by Year</span>
            </button>
          ) : (
            <span className="text-body font-medium text-foreground">Sector Spend by Year</span>
          )}
          <HelpTextTooltip
            size="sm"
            content="Actual money paid out (disbursements + expenditures), in USD, broken down by sector and year. Built from each transaction's own sector. 'Actual' comes straight from the transactions; 'imputed' means the activity-level sector split was applied where a transaction carried no sector of its own."
          />
        </div>
        {(!collapsible || open) && (
          loading ? (
            <span className="text-helper text-muted-foreground">Loading…</span>
          ) : dq ? (
            <span className="text-helper text-muted-foreground">
              {pctActual}% actual{pctActual < 100 ? ` · ${100 - pctActual}% imputed` : ''}
            </span>
          ) : null
        )}
      </div>

      {(!collapsible || open) && (
        rows.length === 0 ? (
          <div className="rounded-md border px-4 py-6 text-center text-body text-muted-foreground">
            {loading ? 'Calculating sector spend…' : 'No transaction spend with sectors found for this activity yet.'}
          </div>
        ) : (
          <ChartDataTable
            rows={tableRows}
            columns={columns}
            currency="USD"
            totalsColumn
            totalsColumnLabel="Total"
            totalLabel="Total"
            className="border-border shadow-sm"
          />
        )
      )}
    </div>
  );
}

export default SectorSpendByPeriodTable;
