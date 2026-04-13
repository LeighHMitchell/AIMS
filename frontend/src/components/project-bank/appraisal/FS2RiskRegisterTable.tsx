"use client"

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { FS2RiskRow } from '@/types/project-bank';

interface FS2RiskRegisterTableProps {
  rows: FS2RiskRow[];
  onChange: (rows: FS2RiskRow[]) => void;
  disabled?: boolean;
}

const RISK_CATEGORIES = [
  'Technical', 'Financial', 'Environmental', 'Social', 'Political',
  'Legal/Regulatory', 'Construction', 'Operational', 'Market/Demand', 'Other',
];

export function FS2RiskRegisterTable({ rows, onChange, disabled }: FS2RiskRegisterTableProps) {
  const addRow = () => {
    onChange([
      ...rows,
      { id: crypto.randomUUID(), category: '', description: '', likelihood: '', impact: '', mitigation: '', owner: '' },
    ]);
  };

  const updateRow = (idx: number, field: keyof FS2RiskRow, value: string) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted">
            <tr className="bg-surface-muted">
              <th className="text-left p-2 font-medium text-xs w-[130px]">Category</th>
              <th className="text-left p-2 font-medium text-xs">Description</th>
              <th className="text-left p-2 font-medium text-xs w-[100px]">Likelihood</th>
              <th className="text-left p-2 font-medium text-xs w-[100px]">Impact</th>
              <th className="text-left p-2 font-medium text-xs">Mitigation</th>
              <th className="text-left p-2 font-medium text-xs w-[120px]">Owner</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => (
              <tr key={row.id}>
                <td className="p-1.5">
                  <select
                    value={row.category}
                    onChange={e => updateRow(idx, 'category', e.target.value)}
                    className="h-7 text-xs border rounded px-1.5 bg-background w-full"
                    disabled={disabled}
                  >
                    <option value="">Select...</option>
                    {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="p-1.5">
                  <Input
                    value={row.description}
                    onChange={e => updateRow(idx, 'description', e.target.value)}
                    className="h-7 text-sm"
                    placeholder="Risk description..."
                    disabled={disabled}
                  />
                </td>
                <td className="p-1.5">
                  <select
                    value={row.likelihood}
                    onChange={e => updateRow(idx, 'likelihood', e.target.value)}
                    className="h-7 text-xs border rounded px-1.5 bg-background w-full"
                    disabled={disabled}
                  >
                    <option value="">—</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </td>
                <td className="p-1.5">
                  <select
                    value={row.impact}
                    onChange={e => updateRow(idx, 'impact', e.target.value)}
                    className="h-7 text-xs border rounded px-1.5 bg-background w-full"
                    disabled={disabled}
                  >
                    <option value="">—</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </td>
                <td className="p-1.5">
                  <Input
                    value={row.mitigation}
                    onChange={e => updateRow(idx, 'mitigation', e.target.value)}
                    className="h-7 text-sm"
                    placeholder="Mitigation strategy..."
                    disabled={disabled}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    value={row.owner}
                    onChange={e => updateRow(idx, 'owner', e.target.value)}
                    className="h-7 text-sm"
                    placeholder="Owner"
                    disabled={disabled}
                  />
                </td>
                <td className="p-1.5">
                  {!disabled && (
                    <button onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-sm text-muted-foreground">
                  No risks added yet. Click "Add Risk" to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="mt-2 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Risk
        </Button>
      )}
    </div>
  );
}
