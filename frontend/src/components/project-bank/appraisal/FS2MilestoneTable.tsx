"use client"

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { FS2MilestoneRow } from '@/types/project-bank';

interface FS2MilestoneTableProps {
  rows: FS2MilestoneRow[];
  onChange: (rows: FS2MilestoneRow[]) => void;
  disabled?: boolean;
}

export function FS2MilestoneTable({ rows, onChange, disabled }: FS2MilestoneTableProps) {
  const addRow = () => {
    onChange([
      ...rows,
      { id: crypto.randomUUID(), phase: '', start_month: '', end_month: '', activities: '' },
    ]);
  };

  const updateRow = (idx: number, field: keyof FS2MilestoneRow, value: string) => {
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
        <table className="w-full text-body">
          <thead className="bg-surface-muted">
            <tr className="bg-surface-muted">
              <th className="text-left p-2 font-medium text-helper w-[180px]">Phase</th>
              <th className="text-left p-2 font-medium text-helper w-[130px]">Start Month</th>
              <th className="text-left p-2 font-medium text-helper w-[130px]">End Month</th>
              <th className="text-left p-2 font-medium text-helper">Key Activities</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => (
              <tr key={row.id}>
                <td className="p-1.5">
                  <Input
                    value={row.phase}
                    onChange={e => updateRow(idx, 'phase', e.target.value)}
                    className="h-7 text-body"
                    placeholder="e.g. Procurement"
                    disabled={disabled}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    type="month"
                    value={row.start_month}
                    onChange={e => updateRow(idx, 'start_month', e.target.value)}
                    className="h-7 text-body"
                    disabled={disabled}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    type="month"
                    value={row.end_month}
                    onChange={e => updateRow(idx, 'end_month', e.target.value)}
                    className="h-7 text-body"
                    disabled={disabled}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    value={row.activities}
                    onChange={e => updateRow(idx, 'activities', e.target.value)}
                    className="h-7 text-body"
                    placeholder="Key activities for this phase..."
                    disabled={disabled}
                  />
                </td>
                <td className="p-1.5">
                  {!disabled && (
                    <button onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-body text-muted-foreground">
                  No milestones added yet. Click "Add Milestone" to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="mt-2 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Milestone
        </Button>
      )}
    </div>
  );
}
