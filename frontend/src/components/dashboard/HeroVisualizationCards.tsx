"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  DollarSign,
  CalendarClock,
  ArrowRightLeft,
  PieChart as PieChartIcon,
  Maximize2,
} from 'lucide-react';

interface BudgetTrendPoint {
  year: number;
  amount: number;
}

interface TransactionTrendPoint {
  month: string;
  count: number;
  amount: number;
}

interface SectorBreakdown {
  code: string;
  name: string;
  percentage: number;
  activityCount: number;
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

// Color palette: Primary Scarlet, Pale Slate, Blue Slate, Cool Steel, Platinum
const DONUT_COLORS = ['#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8', '#dc2625', '#4c5568', '#7b95a7'];
const BAR_COLORS = ['#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8'];

const formatCurrency = (value: number): string => {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

// Expanded Modal for detailed view
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

        const response = await fetch(`/api/dashboard/org-hero-stats?organizationId=${organizationId}`);
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

  // Calculate total budget
  const totalBudget = data?.budgetTrend?.reduce((sum, item) => sum + item.amount, 0) || 0;
  
  // Calculate total planned disbursements
  const totalPlanned = data?.plannedBudgetTrend?.reduce((sum, item) => sum + item.amount, 0) || 0;
  
  // Calculate total transactions
  const totalTransactions = data?.transactionTrend?.reduce((sum, item) => sum + item.count, 0) || 0;
  
  // Calculate total sectors
  const totalSectors = data?.sectorBreakdown?.length || 0;

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
              Total Budgets
            </CardTitle>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalBudget)}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-24">
              {data?.budgetTrend && data.budgetTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.budgetTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Year ${label}`}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {data.budgetTrend.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
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
              Planned Disbursements
            </CardTitle>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalPlanned)}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-24">
              {data?.plannedBudgetTrend && data.plannedBudgetTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.plannedBudgetTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Year ${label}`}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {data.plannedBudgetTrend.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
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

        {/* Card 3: Transactions Over Time */}
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
              Transactions
            </CardTitle>
            <p className="text-lg font-bold text-slate-900">{totalTransactions.toLocaleString()} total</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-24">
              {data?.transactionTrend && data.transactionTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.transactionTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Transactions']}
                      labelFormatter={(label) => `Year ${label}`}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {data.transactionTrend.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No transaction data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Sectors Distribution */}
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
              <PieChartIcon className="h-4 w-4 text-slate-500" />
              Sectors
            </CardTitle>
            <p className="text-lg font-bold text-slate-900">{totalSectors} sectors</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-24 flex items-center justify-center">
              {data?.sectorBreakdown && data.sectorBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.sectorBreakdown}
                      dataKey="activityCount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={40}
                      strokeWidth={1}
                      stroke="#fff"
                    >
                      {data.sectorBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value} activities`, name]}
                      contentStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
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
        title="Total Budgets Over Time"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.budgetTrend || []} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="amount" name="Budget" fill="#dc2625" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ExpandedChartModal>

      <ExpandedChartModal
        open={expandedChart === 'planned'}
        onClose={() => setExpandedChart(null)}
        title="Planned Disbursements Over Time"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.plannedBudgetTrend || []} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="amount" name="Planned Disbursements" fill="#4c5568" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ExpandedChartModal>

      <ExpandedChartModal
        open={expandedChart === 'transactions'}
        onClose={() => setExpandedChart(null)}
        title="Transactions Over Time"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.transactionTrend || []} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number) => [value, 'Transactions']}
              labelFormatter={(label) => `Year ${label}`}
            />
            <Legend />
            <Bar dataKey="count" name="Transaction Count" fill="#7b95a7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ExpandedChartModal>

      <ExpandedChartModal
        open={expandedChart === 'sectors'}
        onClose={() => setExpandedChart(null)}
        title="Sector Distribution"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data?.sectorBreakdown || []}
              dataKey="activityCount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              strokeWidth={2}
              stroke="#fff"
              label={({ name, activityCount }) => `${name}: ${activityCount}`}
              labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
            >
              {(data?.sectorBreakdown || []).map((_, index) => (
                <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, name: string) => [`${value} activities`, name]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ExpandedChartModal>
    </>
  );
}
