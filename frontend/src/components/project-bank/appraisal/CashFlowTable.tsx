"use client"

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { CostTableRow } from '@/types/project-bank';
import { cn } from '@/lib/utils';

interface CashFlowTableProps {
  rows: CostTableRow[];
  onChange: (rows: CostTableRow[]) => void;
  columns?: ('capex' | 'opex' | 'revenue')[];
  showNet?: boolean;
  showTotals?: boolean;
  readOnly?: boolean;
  startYear?: number;
  constructionYears?: number;
  operationalYears?: number;
}

const COLUMN_LABELS: Record<string, string> = {
  capex: 'CAPEX',
  opex: 'OPEX',
  revenue: 'Revenue',
};

function formatNum(n: number): string {
  if (!n) return '';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, '')) || 0;
}

export function CashFlowTable({
  rows,
  onChange,
  columns = ['capex', 'opex', 'revenue'],
  showNet = true,
  showTotals = true,
  readOnly = false,
  startYear,
  constructionYears,
  operationalYears,
}: CashFlowTableProps) {
  const [quickEntry, setQuickEntry] = useState(false);
  const [quickTotals, setQuickTotals] = useState({ capex: '', opex: '', revenue: '' });

  const handleCellChange = (idx: number, field: keyof CostTableRow, value: string) => {
    const updated = [...rows];
    if (field === 'year') {
      updated[idx] = { ...updated[idx], year: parseInt(value) || 0 };
    } else {
      updated[idx] = { ...updated[idx], [field]: parseNum(value) };
    }
    onChange(updated);
  };

  const addRow = () => {
    const lastYear = rows.length > 0 ? Math.max(...rows.map(r => r.year)) : (startYear || new Date().getFullYear()) - 1;
    onChange([...rows, { year: lastYear + 1, capex: 0, opex: 0, revenue: 0 }]);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  const generateYears = () => {
    const sy = startYear || new Date().getFullYear();
    const cYears = constructionYears || 2;
    const oYears = operationalYears || 10;
    const total = cYears + oYears;
    const generated: CostTableRow[] = [];

    for (let i = 0; i < total; i++) {
      const existing = rows.find(r => r.year === sy + i);
      generated.push(existing || { year: sy + i, capex: 0, opex: 0, revenue: 0 });
    }
    onChange(generated);
  };

  const applyQuickEntry = () => {
    if (rows.length === 0) return;
    const totalCapex = parseNum(quickTotals.capex);
    const totalOpex = parseNum(quickTotals.opex);
    const totalRevenue = parseNum(quickTotals.revenue);

    const cYears = constructionYears || Math.max(1, Math.floor(rows.length / 4));
    const oYears = rows.length - cYears;

    const updated = rows.map((row, idx) => ({
      ...row,
      capex: idx < cYears ? Math.round(totalCapex / cYears) : 0,
      opex: idx >= cYears ? Math.round(totalOpex / Math.max(1, oYears)) : 0,
      revenue: idx >= cYears ? Math.round(totalRevenue / Math.max(1, oYears)) : 0,
    }));
    onChange(updated);
    setQuickEntry(false);
  };

  // Compute totals
  const totals = rows.reduce(
    (acc, row) => ({
      capex: acc.capex + (row.capex || 0),
      opex: acc.opex + (row.opex || 0),
      revenue: acc.revenue + (row.revenue || 0),
    }),
    { capex: 0, opex: 0, revenue: 0 }
  );

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex items-center gap-2 flex-wrap">
          {(constructionYears || operationalYears) && (
            <Button type="button" variant="outline" size="sm" onClick={generateYears}>
              Generate Years
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuickEntry(!quickEntry)}
          >
            {quickEntry ? 'Manual Entry' : 'Quick Entry'}
          </Button>
        </div>
      )}

      {quickEntry && !readOnly && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <p className="text-xs text-blue-700 font-medium">
            Enter totals — they will be distributed across years automatically.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {columns.map(col => (
              <div key={col}>
                <label className="text-xs text-blue-600 block mb-0.5">Total {COLUMN_LABELS[col]}</label>
                <Input
                  value={quickTotals[col as keyof typeof quickTotals]}
                  onChange={e => setQuickTotals(prev => ({ ...prev, [col]: e.target.value }))}
                  placeholder="0"
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
          <Button type="button" size="sm" onClick={applyQuickEntry}>
            Apply
          </Button>
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-muted">
              <th className="text-left p-2 font-medium text-xs w-20">Year</th>
              {columns.map(col => (
                <th key={col} className="text-right p-2 font-medium text-xs">{COLUMN_LABELS[col]}</th>
              ))}
              {showNet && <th className="text-right p-2 font-medium text-xs">Net</th>}
              {!readOnly && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => {
              const net = (row.revenue || 0) - (row.capex || 0) - (row.opex || 0);
              return (
                <tr key={idx} className="hover:bg-muted/50">
                  <td className="p-1.5">
                    {readOnly ? (
                      <span className="text-sm font-mono">{row.year}</span>
                    ) : (
                      <Input
                        value={row.year}
                        onChange={e => handleCellChange(idx, 'year', e.target.value)}
                        className="h-7 w-20 text-sm font-mono"
                        type="number"
                      />
                    )}
                  </td>
                  {columns.map(col => (
                    <td key={col} className="p-1.5 text-right">
                      {readOnly ? (
                        <span className="font-mono text-sm">{formatNum(row[col as keyof CostTableRow] as number)}</span>
                      ) : (
                        <Input
                          value={row[col as keyof CostTableRow] || ''}
                          onChange={e => handleCellChange(idx, col as keyof CostTableRow, e.target.value)}
                          className="h-7 text-sm text-right font-mono"
                          type="number"
                        />
                      )}
                    </td>
                  ))}
                  {showNet && (
                    <td className={cn(
                      'p-1.5 text-right font-mono text-sm font-medium',
                      net >= 0 ? 'text-green-600' : 'text-red-600',
                    )}>
                      {formatNum(net)}
                    </td>
                  )}
                  {!readOnly && (
                    <td className="p-1.5">
                      <button
                        onClick={() => removeRow(idx)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {showTotals && rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 font-medium bg-muted/30">
                <td className="p-2 text-xs">Total</td>
                {columns.map(col => (
                  <td key={col} className="p-2 text-right font-mono text-sm">
                    {formatNum(totals[col as keyof typeof totals])}
                  </td>
                ))}
                {showNet && (
                  <td className={cn(
                    'p-2 text-right font-mono text-sm',
                    totals.revenue - totals.capex - totals.opex >= 0 ? 'text-green-600' : 'text-red-600',
                  )}>
                    {formatNum(totals.revenue - totals.capex - totals.opex)}
                  </td>
                )}
                {!readOnly && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Year
        </Button>
      )}
    </div>
  );
}
