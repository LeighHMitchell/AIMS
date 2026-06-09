"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitBranch } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { OrgSankeyData, SankeyTransactionFilter, SankeyTypeTotal } from '@/types/dashboard';
import { apiFetch } from '@/lib/api-fetch';

interface OrgSankeyFlowProps {
  organizationId: string;
  monthsRange?: number;
}

// Incoming = money received (green); Outgoing = money sent (red/destructive).
const INCOMING_COLOR = '#22c55e'; // green-500
const OUTGOING_COLOR = '#dc2626'; // red-600 (destructive)

// Format currency (compact, e.g. $1.2M)
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

// Full USD format matching the Activity Editor transaction summary hero cards.
const formatUsdFull = (n: number): string =>
  `US$${(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

interface FlowDatum {
  key: string;        // partner org id (stable category key for the Y axis)
  name: string;       // short label (acronym when known)
  fullName: string;   // full organisation name
  acronym?: string;
  incoming: number;   // stored negative → diverges left of the 0 axis
  outgoing: number;   // stored positive → diverges right
  incomingAbs: number;
  outgoingAbs: number;
}

/** Monochrome summary card: a total plus a small per-transaction-type table.
 *  Mirrors the Activity Editor hero-card styling (border / p-6 / text-2xl). */
function FlowSummaryCard({
  title,
  total,
  breakdown,
}: {
  title: string;
  total: number;
  breakdown: SankeyTypeTotal[];
}) {
  return (
    <Card className="border bg-white">
      <CardContent className="p-6">
        <p className="text-body font-medium text-muted-foreground mb-2">{title}</p>
        <p className="text-2xl font-bold text-foreground">{formatUsdFull(total)}</p>
        {breakdown.length > 0 && (
          <table className="w-full mt-4">
            <tbody>
              {breakdown.map((b) => (
                <tr key={b.type} className="border-t border-border">
                  <td className="py-1.5 text-helper text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center bg-muted text-muted-foreground text-[10px] font-mono rounded px-1.5 py-0.5">
                        {b.type}
                      </span>
                      {b.label}
                    </span>
                  </td>
                  <td className="py-1.5 text-right text-helper font-medium text-foreground tabular-nums">
                    {formatUsdFull(b.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

/** Two-line Y-axis tick: full organisation name + acronym (always visible). */
function FlowYAxisTick(props: any) {
  const { x, y, payload, rows } = props;
  const row: FlowDatum | undefined = rows?.find((d: FlowDatum) => d.key === payload.value);
  const name = row?.fullName || String(payload.value);
  const acronym = row?.acronym;
  const MAX = 30;
  const line1 = name.length > MAX ? `${name.slice(0, MAX - 1)}…` : name;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{acronym ? `${name} (${acronym})` : name}</title>
      <text x={-4} y={acronym ? -2 : 4} textAnchor="end" fontSize={11} fill="#334155">{line1}</text>
      {acronym && (
        <text x={-4} y={11} textAnchor="end" fontSize={10} fill="#64748b">{`(${acronym})`}</text>
      )}
    </g>
  );
}

/** Tooltip for the diverging flow bar chart. */
function FlowTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as FlowDatum;
  return (
    <div className="bg-white border border-border shadow-lg text-helper overflow-hidden">
      <div className="bg-surface-muted px-3 py-1.5 font-semibold text-foreground border-b border-border">
        {row.fullName}{row.acronym ? ` (${row.acronym})` : ''}
      </div>
      <div className="px-3 py-1 flex items-center justify-between gap-6">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: INCOMING_COLOR }} />
          Incoming
        </span>
        <span className="font-medium text-foreground">{formatCurrency(row.incomingAbs)}</span>
      </div>
      <div className="px-3 py-1 pb-1.5 flex items-center justify-between gap-6">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: OUTGOING_COLOR }} />
          Outgoing
        </span>
        <span className="font-medium text-foreground">{formatCurrency(row.outgoingAbs)}</span>
      </div>
    </div>
  );
}

export function OrgSankeyFlow({
  organizationId,
  monthsRange = 0, // 0 = all time
}: OrgSankeyFlowProps) {
  const [data, setData] = useState<OrgSankeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<SankeyTransactionFilter>('all');
  const [months, setMonths] = useState(monthsRange);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          organizationId,
          months: months.toString(),
          transactionTypes: transactionFilter,
        });

        const response = await apiFetch(`/api/dashboard/org-sankey?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch flow data');
        }

        const result: OrgSankeyData = await response.json();
        setData(result);
      } catch (err) {
        console.error('[OrgSankeyFlow] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load flow data');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchData();
    }
  }, [organizationId, months, transactionFilter]);

  // The user's organization (centre of the flows)
  const selfNode = data?.nodes.find(n => n.type === 'self');
  const selfName = selfNode?.name || 'Your Organisation';

  // One diverging row per partner org: outgoing to the right (red),
  // incoming to the left (green). Sorted by total throughput, top 10.
  const chartData = useMemo<FlowDatum[]>(() => {
    if (!data || !selfNode) return [];
    const nodeById = new Map(data.nodes.map(n => [n.id, n]));
    const byPartner = new Map<string, { incoming: number; outgoing: number }>();

    data.links.forEach(link => {
      if (link.target === selfNode.id) {
        const e = byPartner.get(link.source) || { incoming: 0, outgoing: 0 };
        e.incoming += link.value;
        byPartner.set(link.source, e);
      } else if (link.source === selfNode.id) {
        const e = byPartner.get(link.target) || { incoming: 0, outgoing: 0 };
        e.outgoing += link.value;
        byPartner.set(link.target, e);
      }
    });

    return Array.from(byPartner.entries())
      .map(([id, e]) => {
        const node = nodeById.get(id);
        return {
          key: id,
          name: node?.name || 'Unknown',
          fullName: node?.fullName || node?.name || 'Unknown',
          acronym: node?.acronym,
          incoming: -e.incoming, // negative → diverges left
          outgoing: e.outgoing, //  positive → diverges right
          incomingAbs: e.incoming,
          outgoingAbs: e.outgoing,
        };
      })
      .sort((a, b) => (b.incomingAbs + b.outgoingAbs) - (a.incomingAbs + a.outgoingAbs))
      .slice(0, 10);
  }, [data, selfNode]);

  const hasFlows = chartData.length > 0;
  const chartHeight = Math.max(220, chartData.length * 52);

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            My Organisation&apos;s Aid Flows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-body text-destructive">Failed to load flows: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
              My Organisation&apos;s Aid Flows
            </CardTitle>
            <CardDescription>
              Indicative transaction flows for {selfName}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={transactionFilter} onValueChange={(v) => setTransactionFilter(v as SankeyTransactionFilter)}>
              <SelectTrigger className="w-[160px] h-8 text-helper">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disbursements">Disbursements Only</SelectItem>
                <SelectItem value="all">All transactions</SelectItem>
              </SelectContent>
            </Select>
            <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v, 10))}>
              <SelectTrigger className="w-[120px] h-8 text-helper">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All time</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
                <SelectItem value="24">Last 24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Two monochrome summary cards (total + per-type breakdown table),
            styled like the Activity Editor transaction summary cards. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FlowSummaryCard title="Total Incoming" total={data?.totalIncoming || 0} breakdown={data?.incomingByType || []} />
          <FlowSummaryCard title="Total Outgoing" total={data?.totalOutgoing || 0} breakdown={data?.outgoingByType || []} />
        </div>

        {!hasFlows ? (
          <div className="h-[250px] mt-6 flex items-center justify-center bg-muted">
            <div className="text-center">
              <GitBranch className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-body text-muted-foreground">No transaction flows found</p>
              <p className="text-helper text-muted-foreground mt-1">
                Transactions will appear here once recorded
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-body font-medium text-foreground">Flows by partner</h4>
              {/* Legend */}
              <div className="flex items-center gap-4 text-helper text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: INCOMING_COLOR }} />
                  Incoming
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: OUTGOING_COLOR }} />
                  Outgoing
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                stackOffset="sign"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                barCategoryGap="20%"
              >
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(Math.abs(Number(v)))}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="key"
                  width={220}
                  interval={0}
                  tick={<FlowYAxisTick rows={chartData} />}
                />
                <RechartsTooltip content={<FlowTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <ReferenceLine x={0} stroke="#94a3b8" />
                <Bar dataKey="incoming" stackId="flow" fill={INCOMING_COLOR} radius={[3, 0, 0, 3]} />
                <Bar dataKey="outgoing" stackId="flow" fill={OUTGOING_COLOR} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
