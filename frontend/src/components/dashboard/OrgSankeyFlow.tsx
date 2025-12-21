"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, GitBranch } from 'lucide-react';
import type { OrgSankeyData, SankeyTransactionFilter } from '@/types/dashboard';

interface OrgSankeyFlowProps {
  organizationId: string;
  monthsRange?: number;
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

// Simple horizontal bar representation of flows (simplified Sankey-like visualization)
function FlowBar({
  source,
  target,
  value,
  maxValue,
  isOutgoing,
}: {
  source: string;
  target: string;
  value: number;
  maxValue: number;
  isOutgoing: boolean;
}) {
  const width = Math.max((value / maxValue) * 100, 10); // Min 10% width for visibility

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-[120px] text-xs text-right truncate" title={source}>
        {source}
      </div>
      <div className="flex-1 flex items-center gap-1">
        <div
          className={`h-6 rounded transition-all ${
            isOutgoing ? 'bg-red-200' : 'bg-green-200'
          }`}
          style={{ width: `${width}%` }}
        >
          <div
            className={`h-full rounded ${
              isOutgoing ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: '100%' }}
          />
        </div>
        <ArrowRight className={`h-3 w-3 ${isOutgoing ? 'text-red-500' : 'text-green-500'}`} />
      </div>
      <div className="w-[120px] text-xs truncate" title={target}>
        {target}
      </div>
      <div className={`w-[80px] text-xs text-right font-medium ${isOutgoing ? 'text-red-600' : 'text-green-600'}`}>
        {formatCurrency(value)}
      </div>
    </div>
  );
}

export function OrgSankeyFlow({
  organizationId,
  monthsRange = 12,
}: OrgSankeyFlowProps) {
  const [data, setData] = useState<OrgSankeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<SankeyTransactionFilter>('disbursements');
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

        const response = await fetch(`/api/dashboard/org-sankey?${params.toString()}`);

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

  // Get self node (the user's organization)
  const selfNode = data?.nodes.find(n => n.type === 'self');
  const selfName = selfNode?.name || 'Your Organization';

  // Separate incoming and outgoing links
  const incomingLinks = data?.links.filter(l => l.target === selfNode?.id) || [];
  const outgoingLinks = data?.links.filter(l => l.source === selfNode?.id) || [];

  // Get max value for scaling
  const maxValue = Math.max(
    ...incomingLinks.map(l => l.value),
    ...outgoingLinks.map(l => l.value),
    1
  );

  // Get node name by ID
  const getNodeName = (nodeId: string): string => {
    return data?.nodes.find(n => n.id === nodeId)?.name || 'Unknown';
  };

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
          <Skeleton className="h-[250px] w-full rounded-lg" />
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
            My Organisation's Aid Flows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load flows: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const hasFlows = incomingLinks.length > 0 || outgoingLinks.length > 0;

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-slate-600" />
              My Organisation's Aid Flows
            </CardTitle>
            <CardDescription>
              Indicative transaction flows for {selfName}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={transactionFilter} onValueChange={(v) => setTransactionFilter(v as SankeyTransactionFilter)}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disbursements">Disbursements Only</SelectItem>
                <SelectItem value="all">All Transactions</SelectItem>
              </SelectContent>
            </Select>
            <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v, 10))}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
                <SelectItem value="24">Last 24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasFlows ? (
          <div className="h-[250px] flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="text-center">
              <GitBranch className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No transaction flows found</p>
              <p className="text-xs text-slate-400 mt-1">
                Transactions will appear here once recorded
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium">Total Incoming</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(data?.totalIncoming || 0)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-600 font-medium">Total Outgoing</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(data?.totalOutgoing || 0)}</p>
              </div>
            </div>

            {/* Incoming flows */}
            {incomingLinks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Incoming Flows</h4>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                  {incomingLinks.slice(0, 5).map((link, index) => (
                    <FlowBar
                      key={`in-${index}`}
                      source={getNodeName(link.source)}
                      target={selfName}
                      value={link.value}
                      maxValue={maxValue}
                      isOutgoing={false}
                    />
                  ))}
                  {incomingLinks.length > 5 && (
                    <p className="text-xs text-slate-500 text-center pt-2">
                      +{incomingLinks.length - 5} more flows
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Outgoing flows */}
            {outgoingLinks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Outgoing Flows</h4>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                  {outgoingLinks.slice(0, 5).map((link, index) => (
                    <FlowBar
                      key={`out-${index}`}
                      source={selfName}
                      target={getNodeName(link.target)}
                      value={link.value}
                      maxValue={maxValue}
                      isOutgoing={true}
                    />
                  ))}
                  {outgoingLinks.length > 5 && (
                    <p className="text-xs text-slate-500 text-center pt-2">
                      +{outgoingLinks.length - 5} more flows
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
