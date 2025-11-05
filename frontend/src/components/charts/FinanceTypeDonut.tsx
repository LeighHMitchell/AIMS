"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Table as TableIcon, PieChart as PieChartIcon } from "lucide-react";
import financeTypes from "@/data/finance-types.json";

interface Transaction {
  transaction_type: string;
  value: number;
  value_usd?: number;
  finance_type?: string;
  currency?: string;
}

interface FinanceTypeDonutProps {
  transactions: Transaction[];
  activityId: string;
  defaultCurrency?: string;
}

const COLOR_PALETTE = [
  "#1e40af", // blue-800
  "#3b82f6", // blue-500
  "#0f172a", // slate-900
  "#475569", // slate-600
  "#64748b", // slate-500
  "#334155", // slate-700
  "#0ea5e9", // sky-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#94a3b8", // slate-400
];

// Format currency in short form with one decimal
function formatCurrencyShort(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '$0.0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(1)}`;
}

export default function FinanceTypeDonut({
  transactions,
  activityId,
  defaultCurrency = "USD",
}: FinanceTypeDonutProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const { chartData, totalValue } = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { chartData: [], totalValue: 0 };
    }

    // Only include actual disbursements and expenditures (no commitments)
    const includedTypes = ["3", "4"]; // Type 3: Disbursement, Type 4: Expenditure

    const totals: Record<string, number> = {};

    transactions.forEach((t) => {
      if (!t.finance_type) return;
      
      // Filter by transaction type - only actual disbursed amounts
      if (!includedTypes.includes(t.transaction_type)) return;

      // Get USD value
      let usdValue = parseFloat(String(t.value_usd)) || 0;
      
      // If transaction is in USD but value_usd is missing, use the original value
      if (!usdValue && t.currency === 'USD' && t.value && Number(t.value) > 0) {
        usdValue = parseFloat(String(t.value)) || 0;
      }

      if (!usdValue || usdValue <= 0) return;

      totals[t.finance_type] = (totals[t.finance_type] || 0) + usdValue;
    });

    // Calculate total value
    const totalAbsolute = Object.values(totals).reduce((sum, val) => sum + val, 0);

    // Convert to array with names and percentages
    const data = Object.entries(totals)
      .map(([code, value]) => {
        const financeTypeInfo = financeTypes.find((ft) => ft.code === code);
        return {
          code,
          name: financeTypeInfo?.name || `Finance Type ${code}`,
          value: value,
          percentage:
            totalAbsolute > 0
              ? Math.round((value / totalAbsolute) * 100 * 10) / 10
              : 0,
        };
      })
      .sort((a, b) => b.value - a.value);

    return { chartData: data, totalValue: totalAbsolute };
  }, [transactions]);

  const handleExport = () => {
    const csvContent = [
      ['Finance Type Code', 'Finance Type Name', 'Amount (USD)', 'Percentage'],
      ...chartData.map((item) => [
        item.code,
        item.name,
        item.value,
        item.percentage
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-type-breakdown-${activityId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (chartData.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-slate-400 text-xs">
        <p>No finance type data</p>
      </div>
    );
  }

  const top5Data = chartData.slice(0, 5);

  return (
    <div className="space-y-2">
      {/* Controls */}
      <div className="flex items-center justify-end px-3">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
            className="h-6 w-6 p-0"
          >
            {viewMode === 'chart' ? <TableIcon className="h-3 w-3" /> : <PieChartIcon className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="h-6 w-6 p-0"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Chart or Table View */}
      {viewMode === 'table' ? (
        <div className="h-24 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-1 text-slate-600 font-medium">Finance Type</th>
                <th className="text-right py-1 text-slate-600 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {top5Data.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-1 text-slate-900">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }}
                      />
                      <span className="break-words">{item.name}</span>
                    </div>
                  </td>
                  <td className="text-right py-1 text-slate-900 font-medium">
                    {formatCurrencyShort(item.value)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="py-1 text-slate-900 font-semibold">Total</td>
                <td className="text-right py-1 text-slate-900 font-semibold">
                  {formatCurrencyShort(top5Data.reduce((sum, item) => sum + item.value, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={top5Data.map((item, idx) => ({
                  ...item,
                  color: COLOR_PALETTE[idx % COLOR_PALETTE.length]
                }))}
                cx="50%"
                cy="50%"
                innerRadius={20}
                outerRadius={40}
                paddingAngle={2}
                dataKey="value"
              >
                {top5Data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                        <p className="text-sm font-semibold text-slate-900 mb-1">
                          {data.name}
                        </p>
                        <p className="text-xs text-slate-600 font-medium mt-1">
                          {formatCurrencyShort(data.value)} ({data.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

