"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  DollarSign,
  CalendarClock,
  ArrowRightLeft,
  BarChart3,
  Maximize2,
  HelpCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';

interface BudgetTrendPoint {
  year: number;
  amount: number;
}

interface TransactionTrendPoint {
  month: string;
  count: number;
  amount: number;
  types?: Record<string, number>;
  typeAmounts?: Record<string, number>;
}

// Transaction type labels (IATI Standard v2.03)
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitment',
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

interface SectorBreakdown {
  code: string;
  name: string;
  percentage: number;
  activityCount: number;
  totalBudget: number;
  totalPlannedDisbursements: number;
  totalDisbursements: number;
}

interface HeroStatsData {
  totalActivities: number;
  unpublishedCount: number;
  pendingValidationCount: number;
  validatedCount: number;
  budgetTrend: BudgetTrendPoint[];
  plannedBudgetTrend: BudgetTrendPoint[];
  transactionTrend: TransactionTrendPoint[];
  sectorBreakdown: SectorBreakdown[];
}

interface HeroVisualizationCardsProps {
  organizationId: string;
}

// Color palette
const BAR_COLORS = ['#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8'];
const SECTOR_COLORS = ['#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#8b5cf6', '#059669', '#d97706', '#6366f1'];

const TRANSACTION_TYPE_COLOR_PALETTE = [
  '#dc2625', '#cfd0d5', '#4c5568', '#7b95a7', '#f1f4f8',
];

const getTransactionTypeColor = (_typeCode: string, index: number): string => {
  return TRANSACTION_TYPE_COLOR_PALETTE[index % TRANSACTION_TYPE_COLOR_PALETTE.length];
};

const getUniqueTransactionTypes = (transactionTrend: TransactionTrendPoint[]): string[] => {
  const typeSet = new Set<string>();
  transactionTrend.forEach(point => {
    if (point.typeAmounts) {
      Object.keys(point.typeAmounts).forEach(type => typeSet.add(type));
    } else if (point.types) {
      Object.keys(point.types).forEach(type => typeSet.add(type));
    }
  });
  return Array.from(typeSet).sort((a, b) => parseInt(a) - parseInt(b));
};

const transformDataForValueChart = (
  transactionTrend: TransactionTrendPoint[],
  uniqueTypes: string[]
): any[] => {
  return transactionTrend.map(point => {
    const transformed: any = {
      month: point.month,
      amount: point.amount,
    };
    uniqueTypes.forEach(type => {
      transformed[`type_${type}`] = point.typeAmounts?.[type] || 0;
    });
    return transformed;
  });
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const formatCurrencyFull = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

function ExpandedChartModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="h-80">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChartHelpIcon({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{text}</p>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

export function HeroVisualizationCards({ organizationId }: HeroVisualizationCardsProps) {
  const [data, setData] = useState<HeroStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiFetch(`/api/dashboard/org-hero-stats?organizationId=${organizationId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch hero stats');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('[HeroVisualizationCards] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">Failed to load visualization data: {error}</p>
      </div>
    );
  }

  const totalBudget = data?.budgetTrend?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalPlanned = data?.plannedBudgetTrend?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalTransactionValue = data?.transactionTrend?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalSectors = data?.sectorBreakdown?.length || 0;
  // Calculate total activity count for sector bar width
  const maxSectorActivities = data?.sectorBreakdown ? Math.max(...data.sectorBreakdown.map(s => s.activityCount), 1) : 1;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Budgets Over Time */}
        <Card className="bg-white relative group">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={() => setExpandedChart('budgets')}
          >
            <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
          </Button>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-slate-500" />
              Total Budgets (USD)
              <ChartHelpIcon text="Total budget amounts (converted to USD) across all your organisation's activities, grouped by year based on budget period start date." />
            </CardTitle>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalBudget)}</p>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="h-32">
              {data?.budgetTrend && data.budgetTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.budgetTrend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const point = payload[0].payload as BudgetTrendPoint;
                          return (
                            <div className="bg-white border border-slate-200 rounded shadow-lg text-xs p-0 overflow-hidden">
                              <table className="border-collapse">
                                <thead>
                                  <tr className="bg-slate-50">
                                    <th className="px-3 py-1.5 text-left font-semibold text-slate-700">Year</th>
                                    <th className="px-3 py-1.5 text-right font-semibold text-slate-700">Amount (USD)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="px-3 py-1.5 text-slate-600">{point.year}</td>
                                    <td className="px-3 py-1.5 text-right font-medium">{formatCurrencyFull(point.amount)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#dc2625" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No budget data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Planned Disbursements Over Time */}
        <Card className="bg-white relative group">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={() => setExpandedChart('planned')}
          >
            <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
          </Button>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-slate-500" />
              Planned Disbursements (USD)
              <ChartHelpIcon text="Total planned disbursement amounts (converted to USD) across all your organisation's activities, grouped by year based on period start date." />
            </CardTitle>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalPlanned)}</p>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="h-32">
              {data?.plannedBudgetTrend && data.plannedBudgetTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.plannedBudgetTrend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const point = payload[0].payload as BudgetTrendPoint;
                          return (
                            <div className="bg-white border border-slate-200 rounded shadow-lg text-xs p-0 overflow-hidden">
                              <table className="border-collapse">
                                <thead>
                                  <tr className="bg-slate-50">
                                    <th className="px-3 py-1.5 text-left font-semibold text-slate-700">Year</th>
                                    <th className="px-3 py-1.5 text-right font-semibold text-slate-700">Amount (USD)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="px-3 py-1.5 text-slate-600">{point.year}</td>
                                    <td className="px-3 py-1.5 text-right font-medium">{formatCurrencyFull(point.amount)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#4c5568" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No planned data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Transactions by Type (USD Values) */}
        <Card className="bg-white relative group">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={() => setExpandedChart('transactions')}
          >
            <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
          </Button>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-slate-500" />
              Transactions by Type (USD)
              <ChartHelpIcon text="Total transaction values (converted to USD) by IATI transaction type, grouped by year. Includes all transactions where your organisation is the reporter, provider, or receiver." />
            </CardTitle>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalTransactionValue)}</p>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="h-32">
              {data?.transactionTrend && data.transactionTrend.length > 0 ? (
                (() => {
                  const uniqueTypes = getUniqueTransactionTypes(data.transactionTrend);
                  const hasTypeData = uniqueTypes.length > 0;
                  const lineChartData = hasTypeData
                    ? transformDataForValueChart(data.transactionTrend, uniqueTypes)
                    : data.transactionTrend;

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const dataPoint = data.transactionTrend.find(t => t.month === label);
                              return (
                                <div className="bg-white border border-slate-200 rounded shadow-lg text-xs p-0 overflow-hidden">
                                  <table className="border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50">
                                        <th className="px-3 py-1.5 text-left font-semibold text-slate-700" colSpan={2}>Year {label}</th>
                                      </tr>
                                      <tr className="bg-slate-50">
                                        <th className="px-3 py-1 text-left font-medium text-slate-600">Type</th>
                                        <th className="px-3 py-1 text-right font-medium text-slate-600">USD Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {dataPoint?.typeAmounts && Object.entries(dataPoint.typeAmounts)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([type, amount]) => (
                                          <tr key={type} className="border-t border-slate-100">
                                            <td className="px-3 py-1">
                                              <span className="flex items-center gap-1.5">
                                                <span
                                                  className="w-2 h-2 rounded-full inline-block"
                                                  style={{ backgroundColor: getTransactionTypeColor(type, uniqueTypes.indexOf(type)) }}
                                                />
                                                {TRANSACTION_TYPE_LABELS[type] || `Type ${type}`}
                                              </span>
                                            </td>
                                            <td className="px-3 py-1 text-right font-medium">{formatCurrency(amount)}</td>
                                          </tr>
                                        ))}
                                      <tr className="border-t-2 border-slate-300">
                                        <td className="px-3 py-1.5 font-semibold">Total</td>
                                        <td className="px-3 py-1.5 text-right font-semibold">{formatCurrency(dataPoint?.amount || 0)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {hasTypeData ? (
                          uniqueTypes.map((type, index) => (
                            <Line
                              key={type}
                              type="monotone"
                              dataKey={`type_${type}`}
                              stroke={getTransactionTypeColor(type, index)}
                              strokeWidth={2}
                              dot={false}
                              name={TRANSACTION_TYPE_LABELS[type] || `Type ${type}`}
                            />
                          ))
                        ) : (
                          <Line
                            type="monotone"
                            dataKey="amount"
                            stroke={BAR_COLORS[0]}
                            strokeWidth={2}
                            dot={false}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  );
                })()
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No transaction data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Sectors Distribution - Stacked Horizontal Bar */}
        <Card className="bg-white relative group">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={() => setExpandedChart('sectors')}
          >
            <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
          </Button>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-500" />
              Sectors
              <ChartHelpIcon text="Top-level sector categories (DAC 3-digit) across your organisation's ongoing activities. Hover for financial details including budgets, planned disbursements, and actual disbursements in USD." />
            </CardTitle>
            <p className="text-lg font-bold text-slate-900">{totalSectors} sectors</p>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="h-32 overflow-y-auto">
              {data?.sectorBreakdown && data.sectorBreakdown.length > 0 ? (
                (() => {
                  const totalPlanned = data.sectorBreakdown.reduce((sum, s) => sum + s.totalPlannedDisbursements, 0);
                  return (
                    <TooltipProvider>
                      <div className="space-y-2">
                        {/* Single stacked bar */}
                        <div className="h-5 flex rounded-full overflow-hidden bg-slate-100">
                          {data.sectorBreakdown.map((sector, index) => {
                            const pct = totalPlanned > 0 ? (sector.totalPlannedDisbursements / totalPlanned) * 100 : 0;
                            if (pct === 0) return null;
                            return (
                              <UITooltip key={sector.code}>
                                <TooltipTrigger asChild>
                                  <div
                                    className="h-full cursor-default"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length],
                                    }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="p-0 overflow-hidden">
                                  <div className="bg-white text-xs">
                                    <div className="px-3 py-1.5 bg-slate-50 font-semibold text-slate-700 border-b border-slate-200">
                                      {sector.name} ({sector.code})
                                    </div>
                                    <div className="px-3 py-1 flex justify-between gap-4">
                                      <span className="text-slate-500">Planned Disb. (USD)</span>
                                      <span className="font-medium">{formatCurrency(sector.totalPlannedDisbursements)}</span>
                                    </div>
                                    <div className="px-3 py-1 flex justify-between gap-4">
                                      <span className="text-slate-500">Share</span>
                                      <span className="font-medium">{pct.toFixed(1)}%</span>
                                    </div>
                                    <div className="px-3 py-1 pb-1.5 flex justify-between gap-4">
                                      <span className="text-slate-500">Activities</span>
                                      <span className="font-medium">{sector.activityCount}</span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </UITooltip>
                            );
                          })}
                        </div>
                        {/* Legend */}
                        <div className="space-y-0.5">
                          {data.sectorBreakdown.map((sector, index) => (
                            <div key={sector.code} className="flex items-center gap-1.5 text-[10px]">
                              <div
                                className="w-2 h-2 rounded-sm shrink-0"
                                style={{ backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length] }}
                              />
                              <span className="text-slate-600 truncate flex-1">{sector.name}</span>
                              <span className="text-slate-500 shrink-0">{formatCurrency(sector.totalPlannedDisbursements)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TooltipProvider>
                  );
                })()
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No sector data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expanded Chart Modals */}
      <ExpandedChartModal
        open={expandedChart === 'budgets'}
        onClose={() => setExpandedChart(null)}
        title="Total Budgets Over Time (USD)"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.budgetTrend || []} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const point = payload[0].payload as BudgetTrendPoint;
                  return (
                    <div className="bg-white border border-slate-200 rounded shadow-lg text-sm p-0 overflow-hidden">
                      <table className="border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-3 py-1.5 text-left font-semibold">Year</th>
                            <th className="px-3 py-1.5 text-right font-semibold">Amount (USD)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-1.5">{point.year}</td>
                            <td className="px-3 py-1.5 text-right font-medium">{formatCurrencyFull(point.amount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="amount" name="Budget (USD)" fill="#dc2625" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ExpandedChartModal>

      <ExpandedChartModal
        open={expandedChart === 'planned'}
        onClose={() => setExpandedChart(null)}
        title="Planned Disbursements Over Time (USD)"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.plannedBudgetTrend || []} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const point = payload[0].payload as BudgetTrendPoint;
                  return (
                    <div className="bg-white border border-slate-200 rounded shadow-lg text-sm p-0 overflow-hidden">
                      <table className="border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-3 py-1.5 text-left font-semibold">Year</th>
                            <th className="px-3 py-1.5 text-right font-semibold">Amount (USD)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-1.5">{point.year}</td>
                            <td className="px-3 py-1.5 text-right font-medium">{formatCurrencyFull(point.amount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="amount" name="Planned Disbursements (USD)" fill="#4c5568" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ExpandedChartModal>

      <ExpandedChartModal
        open={expandedChart === 'transactions'}
        onClose={() => setExpandedChart(null)}
        title="Transaction Values by Type Over Time (USD)"
      >
        {(() => {
          const uniqueTypes = data?.transactionTrend ? getUniqueTransactionTypes(data.transactionTrend) : [];
          const hasTypeData = uniqueTypes.length > 0;
          const lineChartData = hasTypeData && data?.transactionTrend
            ? transformDataForValueChart(data.transactionTrend, uniqueTypes)
            : data?.transactionTrend || [];

          return (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length && data?.transactionTrend) {
                      const dataPoint = data.transactionTrend.find(t => t.month === label);
                      return (
                        <div className="bg-white border border-slate-200 rounded shadow-lg text-sm p-0 overflow-hidden">
                          <table className="border-collapse w-full">
                            <thead>
                              <tr className="bg-slate-50">
                                <th className="px-3 py-1.5 text-left font-semibold" colSpan={2}>Year {label}</th>
                              </tr>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-3 py-1 text-left font-medium text-slate-600">Type</th>
                                <th className="px-3 py-1 text-right font-medium text-slate-600">USD Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dataPoint?.typeAmounts && Object.entries(dataPoint.typeAmounts)
                                .sort(([, a], [, b]) => b - a)
                                .map(([type, amount]) => (
                                  <tr key={type} className="border-t border-slate-100">
                                    <td className="px-3 py-1">
                                      <span className="flex items-center gap-2">
                                        <span
                                          className="w-3 h-3 rounded-sm inline-block"
                                          style={{ backgroundColor: getTransactionTypeColor(type, uniqueTypes.indexOf(type)) }}
                                        />
                                        {TRANSACTION_TYPE_LABELS[type] || `Type ${type}`}
                                      </span>
                                    </td>
                                    <td className="px-3 py-1 text-right font-medium">{formatCurrency(amount)}</td>
                                  </tr>
                                ))}
                              <tr className="border-t-2 border-slate-300">
                                <td className="px-3 py-1.5 font-semibold">Total</td>
                                <td className="px-3 py-1.5 text-right font-semibold">{formatCurrency(dataPoint?.amount || 0)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {hasTypeData ? (
                  uniqueTypes.map((type, index) => (
                    <Line
                      key={type}
                      type="monotone"
                      dataKey={`type_${type}`}
                      stroke={getTransactionTypeColor(type, index)}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name={TRANSACTION_TYPE_LABELS[type] || `Type ${type}`}
                    />
                  ))
                ) : (
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#7b95a7"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Transaction Value (USD)"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          );
        })()}
      </ExpandedChartModal>

      <ExpandedChartModal
        open={expandedChart === 'sectors'}
        onClose={() => setExpandedChart(null)}
        title="Sector Distribution"
      >
        <div className="h-full overflow-y-auto pr-2">
          {(() => {
            const sectors = data?.sectorBreakdown || [];
            const totalPlanned = sectors.reduce((sum, s) => sum + s.totalPlannedDisbursements, 0);
            return (
              <TooltipProvider>
                <div className="space-y-4">
                  {/* Single stacked bar */}
                  <div className="h-8 flex rounded-full overflow-hidden bg-slate-100">
                    {sectors.map((sector, index) => {
                      const pct = totalPlanned > 0 ? (sector.totalPlannedDisbursements / totalPlanned) * 100 : 0;
                      if (pct === 0) return null;
                      return (
                        <UITooltip key={sector.code}>
                          <TooltipTrigger asChild>
                            <div
                              className="h-full cursor-default"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length],
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="p-0 overflow-hidden">
                            <div className="bg-white text-sm">
                              <div className="px-3 py-2 bg-slate-50 font-semibold text-slate-700 border-b border-slate-200">
                                {sector.name} ({sector.code})
                              </div>
                              <div className="px-3 py-1.5 flex justify-between gap-6">
                                <span className="text-slate-500">Planned Disb. (USD)</span>
                                <span className="font-medium">{formatCurrencyFull(sector.totalPlannedDisbursements)}</span>
                              </div>
                              <div className="px-3 py-1.5 flex justify-between gap-6">
                                <span className="text-slate-500">Share</span>
                                <span className="font-medium">{pct.toFixed(1)}%</span>
                              </div>
                              <div className="px-3 py-1.5 flex justify-between gap-6">
                                <span className="text-slate-500">Activities</span>
                                <span className="font-medium">{sector.activityCount}</span>
                              </div>
                              <div className="px-3 py-1.5 flex justify-between gap-6">
                                <span className="text-slate-500">Budget (USD)</span>
                                <span className="font-medium">{formatCurrencyFull(sector.totalBudget)}</span>
                              </div>
                              <div className="px-3 py-1.5 pb-2 flex justify-between gap-6">
                                <span className="text-slate-500">Disbursements (USD)</span>
                                <span className="font-medium">{formatCurrencyFull(sector.totalDisbursements)}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </UITooltip>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="space-y-1.5">
                    {sectors.map((sector, index) => (
                      <div key={sector.code} className="flex items-center gap-2 text-sm">
                        <div
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length] }}
                        />
                        <span className="text-slate-700 font-medium flex-1">{sector.name}</span>
                        <span className="text-slate-500 shrink-0">{formatCurrencyFull(sector.totalPlannedDisbursements)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TooltipProvider>
            );
          })()}
        </div>
      </ExpandedChartModal>
    </>
  );
}
