"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HeroCard } from '@/components/ui/hero-card';
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
import type { OrgSankeyData, SankeyTransactionFilter } from '@/types/dashboard';
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
  name: string;
  incoming: number;
  outgoing: number; // stored negative so it diverges left of the 0 axis
  incomingAbs: number;
  outgoingAbs: number;
}

/** Tooltip for the diverging flow bar chart. */
function FlowTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as FlowDatum;
  return (
    <div className="bg-white border border-border shadow-lg text-helper overflow-hidden">
      <div className="bg-surface-muted px-3 py-1.5 font-semibold text-foreground border-b border-border">
        {row.name}
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
    const nameOf = (id: string) => data.nodes.find(n => n.id === id)?.name || 'Unknown';
    const byPartner = new Map<string, { name: string; incoming: number; outgoing: number }>();

    data.links.forEach(link => {
      if (link.target === selfNode.id) {
        const e = byPartner.get(link.source) || { name: nameOf(link.source), incoming: 0, outgoing: 0 };
        e.incoming += link.value;
        byPartner.set(link.source, e);
      } else if (link.source === selfNode.id) {
        const e = byPartner.get(link.target) || { name: nameOf(link.target), incoming: 0, outgoing: 0 };
        e.outgoing += link.value;
        byPartner.set(link.target, e);
      }
    });

    return Array.from(byPartner.values())
      .map(e => ({
        name: e.name,
        incoming: -e.incoming, // negative → diverges left
        outgoing: e.outgoing, //  positive → diverges right
        incomingAbs: e.incoming,
        outgoingAbs: e.outgoing,
      }))
      .sort((a, b) => (b.incomingAbs + b.outgoingAbs) - (a.incomingAbs + a.outgoingAbs))
      .slice(0, 10);
  }, [data, selfNode]);

  const hasFlows = chartData.length > 0;
  const chartHeight = Math.max(220, chartData.length * 48);

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
        {/* Two hero cards: total incoming / total outgoing — same HeroCard
            component as the Activity Editor's transaction summary cards. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <HeroCard title="Total Incoming" value={formatUsdFull(data?.totalIncoming || 0)} variant="success" />
          <HeroCard title="Total Outgoing" value={formatUsdFull(data?.totalOutgoing || 0)} variant="error-text" />
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
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 12 }}
                  interval={0}
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
