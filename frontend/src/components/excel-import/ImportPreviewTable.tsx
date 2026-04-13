"use client";

import React from 'react';
import { Check, AlertTriangle, X, Minus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PreviewRow, CodelistEntry } from '@/lib/excel-import/types';

interface ImportPreviewTableProps {
  preview: PreviewRow[];
  onValueOverride: (fieldKey: string, code: string, name: string) => void;
  repeatGroups?: { key: string; label: string }[];
}

export function ImportPreviewTable({ preview, onValueOverride, repeatGroups }: ImportPreviewTableProps) {
  // Separate scalar fields from repeating fields
  const scalarRows = preview.filter(r => !r.repeatGroup);
  const repeatingRows = preview.filter(r => r.repeatGroup);

  // Group repeating rows by their group key
  const groupedRepeating = new Map<string, PreviewRow[]>();
  repeatingRows.forEach(row => {
    if (!row.repeatGroup) return;
    const existing = groupedRepeating.get(row.repeatGroup) || [];
    existing.push(row);
    groupedRepeating.set(row.repeatGroup, existing);
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted">
          <tr className="bg-muted/50 border-b">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-[30%]">Field Name</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-[30%]">Imported Value</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-[40%]">Mapped Value / Status</th>
          </tr>
        </thead>
        <tbody>
          {/* Scalar fields */}
          {scalarRows.map(row => (
            <PreviewTableRow key={row.fieldKey} row={row} onValueOverride={onValueOverride} />
          ))}

          {/* Repeating field groups */}
          {repeatGroups?.map(group => {
            const rows = groupedRepeating.get(group.key);
            if (!rows) return null;

            // Only show the group if at least one row has data
            const hasData = rows.some(r => r.importedValue.status !== 'empty');
            if (!hasData) return null;

            return (
              <React.Fragment key={group.key}>
                <tr className="bg-muted/30 border-t">
                  <td colSpan={3} className="px-4 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </td>
                </tr>
                {rows.filter(r => r.importedValue.status !== 'empty').map(row => (
                  <PreviewTableRow key={row.fieldKey} row={row} onValueOverride={onValueOverride} />
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PreviewTableRow({
  row,
  onValueOverride,
}: {
  row: PreviewRow;
  onValueOverride: (fieldKey: string, code: string, name: string) => void;
}) {
  const { fieldKey, fieldLabel, importedValue, required } = row;

  return (
    <tr className="border-t hover:bg-muted/20">
      {/* Field Name */}
      <td className="px-4 py-2.5">
        <span className="text-foreground">
          {fieldLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
      </td>

      {/* Imported Value */}
      <td className="px-4 py-2.5">
        {importedValue.raw ? (
          <span className="text-muted-foreground font-mono text-xs">{importedValue.raw}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </td>

      {/* Mapped Value / Status */}
      <td className="px-4 py-2.5">
        <StatusCell
          fieldKey={fieldKey}
          importedValue={importedValue}
          onValueOverride={onValueOverride}
        />
      </td>
    </tr>
  );
}

function StatusCell({
  fieldKey,
  importedValue,
  onValueOverride,
}: {
  fieldKey: string;
  importedValue: PreviewRow['importedValue'];
  onValueOverride: (fieldKey: string, code: string, name: string) => void;
}) {
  switch (importedValue.status) {
    case 'valid':
      return (
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-[hsl(var(--success-icon))] shrink-0" />
          <span className="text-green-700">
            {importedValue.resolvedName
              ? `${importedValue.resolved} - ${importedValue.resolvedName}`
              : importedValue.resolved}
          </span>
        </div>
      );

    case 'warning':
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-amber-600 text-xs">{importedValue.message}</span>
          </div>
          {importedValue.suggestions && importedValue.suggestions.length > 0 && (
            <SuggestionSelect
              fieldKey={fieldKey}
              suggestions={importedValue.suggestions}
              currentCode={importedValue.resolved}
              onSelect={onValueOverride}
            />
          )}
        </div>
      );

    case 'error':
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-red-600 text-xs">{importedValue.message}</span>
          </div>
          {importedValue.suggestions && importedValue.suggestions.length > 0 && (
            <SuggestionSelect
              fieldKey={fieldKey}
              suggestions={importedValue.suggestions}
              onSelect={onValueOverride}
            />
          )}
        </div>
      );

    case 'empty':
      return (
        <div className="flex items-center gap-2">
          <Minus className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          <span className="text-muted-foreground/50 text-xs">No value</span>
        </div>
      );

    default:
      return null;
  }
}

function SuggestionSelect({
  fieldKey,
  suggestions,
  currentCode,
  onSelect,
}: {
  fieldKey: string;
  suggestions: CodelistEntry[];
  currentCode?: string;
  onSelect: (fieldKey: string, code: string, name: string) => void;
}) {
  return (
    <Select
      value={currentCode || ''}
      onValueChange={(val) => {
        const entry = suggestions.find(s => s.code === val);
        if (entry) {
          onSelect(fieldKey, entry.code, entry.name);
        }
      }}
    >
      <SelectTrigger className="h-8 text-xs w-full max-w-[300px]">
        <SelectValue placeholder="Select a match..." />
      </SelectTrigger>
      <SelectContent>
        {suggestions.map(s => (
          <SelectItem key={s.code} value={s.code} className="text-xs">
            {s.code} - {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Summary stats for a preview — used in the modal header.
 */
export function getPreviewStats(preview: PreviewRow[]) {
  let valid = 0;
  let warnings = 0;
  let errors = 0;
  let empty = 0;

  preview.forEach(row => {
    switch (row.importedValue.status) {
      case 'valid': valid++; break;
      case 'warning': warnings++; break;
      case 'error': errors++; break;
      case 'empty': empty++; break;
    }
  });

  const populated = valid + warnings;
  return { valid, warnings, errors, empty, populated };
}
