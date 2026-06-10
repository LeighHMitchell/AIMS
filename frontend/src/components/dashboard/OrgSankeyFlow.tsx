"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitBranch } from 'lucide-react';
import { ResponsiveSankey } from '@nivo/sankey';
import type { OrgSankeyData, SankeyTransactionFilter, SankeyTypeTotal } from '@/types/dashboard';
import { apiFetch } from '@/lib/api-fetch';

interface OrgSankeyFlowProps {
  organizationId: string;
  monthsRange?: number;
}

// Incoming = money received (green); Outgoing = money sent (red); self = slate.
const INCOMING_COLOR = '#22c55e'; // green-500
const OUTGOING_COLOR = '#dc2626'; // red-600 (destructive)
const SELF_COLOR = '#64748b'; // slate-500

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

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

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

// Node datum carried through Nivo (extra fields are preserved on the tooltip node).
interface FlowNode {
  id: string;
  label: string;
  fullName: string;
  acronym?: string;
  nodeColor: string;
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

  // Build a 3-column Sankey: incoming partners (left) → self (centre) →
  // outgoing partners (right). Node ids are prefixed in:/out: so a partner that
  // both sends and receives appears as two distinct nodes (keeps it acyclic).
  const { nodes, links, sankeyHeight } = useMemo(() => {
    if (!data || !selfNode) return { nodes: [] as FlowNode[], links: [], sankeyHeight: 300 };

    const nodeById = new Map(data.nodes.map(n => [n.id, n]));
    const labelFor = (n?: { fullName?: string; name?: string; acronym?: string }) => {
      const full = n?.fullName || n?.name || 'Unknown';
      return n?.acronym ? `${full} (${n.acronym})` : full;
    };

    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();
    data.links.forEach(l => {
      if (l.target === selfNode.id) incoming.set(l.source, (incoming.get(l.source) || 0) + l.value);
      else if (l.source === selfNode.id) outgoing.set(l.target, (outgoing.get(l.target) || 0) + l.value);
    });

    const builtNodes: FlowNode[] = [{
      id: 'self',
      label: truncate(labelFor(selfNode), 34),
      fullName: selfNode.fullName || selfNode.name,
      acronym: selfNode.acronym,
      nodeColor: SELF_COLOR,
    }];
    const builtLinks: { source: string; target: string; value: number }[] = [];

    const topEntries = (m: Map<string, number>) =>
      Array.from(m.entries()).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const incomingTop = topEntries(incoming);
    const outgoingTop = topEntries(outgoing);

    incomingTop.forEach(([pid, value]) => {
      const n = nodeById.get(pid);
      builtNodes.push({
        id: `in:${pid}`,
        label: truncate(labelFor(n), 30),
        fullName: n?.fullName || n?.name || 'Unknown',
        acronym: n?.acronym,
        nodeColor: INCOMING_COLOR,
      });
      builtLinks.push({ source: `in:${pid}`, target: 'self', value });
    });

    outgoingTop.forEach(([pid, value]) => {
      const n = nodeById.get(pid);
      builtNodes.push({
        id: `out:${pid}`,
        label: truncate(labelFor(n), 30),
        fullName: n?.fullName || n?.name || 'Unknown',
        acronym: n?.acronym,
        nodeColor: OUTGOING_COLOR,
      });
      builtLinks.push({ source: 'self', target: `out:${pid}`, value });
    });

    const rows = Math.max(incomingTop.length, outgoingTop.length, 1);
    return { nodes: builtNodes, links: builtLinks, sankeyHeight: Math.max(300, rows * 56) };
  }, [data, selfNode]);

  const hasFlows = links.length > 0;

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
          <Skeleton className="h-[300px] w-full" />
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
          <div className="h-[300px] mt-6 flex items-center justify-center bg-muted">
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
            {/* [&_svg]:max-w-none unsets the global svg max-width in globals.css */}
            <div className="w-full [&_svg]:max-w-none" style={{ height: sankeyHeight, width: '100%' }}>
              <ResponsiveSankey
                data={{ nodes: nodes as any, links: links as any }}
                margin={{ top: 10, right: 200, bottom: 10, left: 200 }}
                align="justify"
                label={(node: any) => node.label ?? node.id}
                colors={(node: any) => node.nodeColor || '#94a3b8'}
                nodeOpacity={1}
                nodeHoverOthersOpacity={0.35}
                nodeThickness={16}
                nodeSpacing={14}
                nodeBorderWidth={0}
                linkOpacity={0.45}
                linkHoverOthersOpacity={0.1}
                linkContract={2}
                enableLinkGradient
                labelPosition="outside"
                labelOrientation="horizontal"
                labelPadding={8}
                labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                animate={false}
                nodeTooltip={({ node }: any) => (
                  <div className="bg-white border border-border shadow-lg text-helper overflow-hidden">
                    <div className="bg-surface-muted px-3 py-1.5 font-semibold text-foreground border-b border-border">
                      {node.fullName}{node.acronym ? ` (${node.acronym})` : ''}
                    </div>
                    <div className="px-3 py-1.5 flex items-center justify-between gap-6">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-medium text-foreground">{formatCurrency(node.value)}</span>
                    </div>
                  </div>
                )}
                linkTooltip={({ link }: any) => (
                  <div className="bg-white border border-border shadow-lg text-helper overflow-hidden">
                    <div className="bg-surface-muted px-3 py-1.5 font-semibold text-foreground border-b border-border flex items-center gap-1.5">
                      <span>{link.source.fullName}{link.source.acronym ? ` (${link.source.acronym})` : ''}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{link.target.fullName}{link.target.acronym ? ` (${link.target.acronym})` : ''}</span>
                    </div>
                    <div className="px-3 py-1.5 flex items-center justify-between gap-6">
                      <span className="text-muted-foreground">Value</span>
                      <span className="font-medium text-foreground">{formatCurrency(link.value)}</span>
                    </div>
                  </div>
                )}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
