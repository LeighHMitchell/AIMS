"use client"

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import type { UseSEEAssessmentWizardReturn } from '@/hooks/use-see-assessment-wizard';
import type { SEETransferFinancial } from '@/types/project-bank';

interface StageFinancialHistoryProps {
  wizard: UseSEEAssessmentWizardReturn;
}

const currentYear = new Date().getFullYear();

function emptyRow(year: number, periodType: 'historical' | 'projected'): SEETransferFinancial {
  return {
    id: `temp-${year}-${periodType}`,
    transfer_id: '',
    year,
    period_type: periodType,
    revenue: null,
    expenses: null,
    net_income: null,
    free_cash_flow: null,
    capex: null,
    depreciation: null,
  };
}

export function StageFinancialHistory({ wizard }: StageFinancialHistoryProps) {
  const { financials, setFinancials } = wizard;

  const historicalRows = financials.filter(f => f.period_type === 'historical').sort((a, b) => a.year - b.year);
  const projectedRows = financials.filter(f => f.period_type === 'projected').sort((a, b) => a.year - b.year);

  const addRow = (periodType: 'historical' | 'projected') => {
    const existing = periodType === 'historical' ? historicalRows : projectedRows;
    const lastYear = existing.length > 0 ? existing[existing.length - 1].year : currentYear - 1;
    const newYear = periodType === 'historical' ? lastYear - 1 : lastYear + 1;
    setFinancials([...financials, emptyRow(periodType === 'historical' ? lastYear + 1 : newYear, periodType)]);
  };

  const updateRow = (index: number, field: keyof SEETransferFinancial, value: any) => {
    const updated = [...financials];
    (updated[index] as any)[field] = value;
    setFinancials(updated);
  };

  const removeRow = (index: number) => {
    setFinancials(financials.filter((_, i) => i !== index));
  };

  const seedDefaults = () => {
    const rows: SEETransferFinancial[] = [];
    // 5 historical years
    for (let i = 4; i >= 0; i--) {
      rows.push(emptyRow(currentYear - 1 - i, 'historical'));
    }
    // 5 projected years
    for (let i = 0; i < 5; i++) {
      rows.push(emptyRow(currentYear + i, 'projected'));
    }
    setFinancials(rows);
  };

  const renderTable = (rows: SEETransferFinancial[], periodType: 'historical' | 'projected') => {
    const globalIndices = rows.map(row => financials.indexOf(row));

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-[80px]">Year</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Revenue</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Expenses</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Net Income</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">FCF</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">CapEx</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Depreciation</th>
              <th className="w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, localIdx) => {
              const globalIdx = globalIndices[localIdx];
              return (
                <tr key={row.id || `${row.year}-${row.period_type}`} className="border-b">
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      value={row.year}
                      onChange={e => updateRow(globalIdx, 'year', Number(e.target.value))}
                      className="h-8 w-[80px] text-xs"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      value={row.revenue ?? ''}
                      onChange={e => updateRow(globalIdx, 'revenue', e.target.value ? Number(e.target.value) : null)}
                      className="h-8 text-xs text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      value={row.expenses ?? ''}
                      onChange={e => updateRow(globalIdx, 'expenses', e.target.value ? Number(e.target.value) : null)}
                      className="h-8 text-xs text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      value={row.net_income ?? ''}
                      onChange={e => updateRow(globalIdx, 'net_income', e.target.value ? Number(e.target.value) : null)}
                      className="h-8 text-xs text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      value={row.free_cash_flow ?? ''}
                      onChange={e => updateRow(globalIdx, 'free_cash_flow', e.target.value ? Number(e.target.value) : null)}
                      className="h-8 text-xs text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      value={row.capex ?? ''}
                      onChange={e => updateRow(globalIdx, 'capex', e.target.value ? Number(e.target.value) : null)}
                      className="h-8 text-xs text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      value={row.depreciation ?? ''}
                      onChange={e => updateRow(globalIdx, 'depreciation', e.target.value ? Number(e.target.value) : null)}
                      className="h-8 text-xs text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() => removeRow(globalIdx)}
                      className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => addRow(periodType)}
          className="mt-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add {periodType === 'historical' ? 'Historical' : 'Projected'} Year
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Financial History</h3>
          <p className="text-sm text-muted-foreground">Enter 5 years of historical data and 5 years of projected financials.</p>
        </div>
        {financials.length === 0 && (
          <Button variant="outline" size="sm" onClick={seedDefaults}>
            Pre-fill Years
          </Button>
        )}
      </div>

      {/* Historical */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-semibold">Historical</h4>
          <Badge variant="gray" className="text-[10px]">{historicalRows.length} years</Badge>
        </div>
        {historicalRows.length > 0 ? (
          renderTable(historicalRows, 'historical')
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
            No historical data. Click &quot;Pre-fill Years&quot; or add rows manually.
          </p>
        )}
      </div>

      {/* Projected */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-semibold">Projected</h4>
          <Badge variant="blue" className="text-[10px]">{projectedRows.length} years</Badge>
        </div>
        {projectedRows.length > 0 ? (
          renderTable(projectedRows, 'projected')
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
            No projected data. Click &quot;Pre-fill Years&quot; or add rows manually.
          </p>
        )}
      </div>
    </div>
  );
}
