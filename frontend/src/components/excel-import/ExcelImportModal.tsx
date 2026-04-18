"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ImportPreviewTable, getPreviewStats } from './ImportPreviewTable';
import { TemplateDownloadButton } from './TemplateDownloadButton';
import type { ExcelFieldDefinition, ImportArea, PreviewRow, ExcelImportResult } from '@/lib/excel-import/types';
import { processSingleRowImport } from '@/lib/excel-import/import-engine';

type ModalState = 'idle' | 'parsing' | 'preview' | 'applying';

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldDefs: ExcelFieldDefinition[];
  area: ImportArea;
  onImportComplete: (resolvedValues: Record<string, string>) => Promise<void>;
  repeatGroups?: { key: string; label: string }[];
}

export function ExcelImportModal({
  open,
  onOpenChange,
  fieldDefs,
  area,
  onImportComplete,
  repeatGroups,
}: ExcelImportModalProps) {
  const [state, setState] = useState<ModalState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [unmatchedColumns, setUnmatchedColumns] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setPreview([]);
    setUnmatchedColumns([]);
    setIsDragging(false);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx') {
      setError('Please upload an Excel file (.xlsx). CSV files are not supported — download the template for the correct format.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setError(null);
    setState('parsing');

    try {
      const result = await processSingleRowImport(file, fieldDefs);
      setPreview(result.preview);
      setUnmatchedColumns(result.unmatchedColumns);
      setState('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse the Excel file.');
      setState('idle');
    }
  }, [fieldDefs]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  }, [handleFile]);

  const handleValueOverride = useCallback((fieldKey: string, code: string, name: string) => {
    setPreview(prev =>
      prev.map(row =>
        row.fieldKey === fieldKey
          ? {
              ...row,
              importedValue: {
                ...row.importedValue,
                resolved: code,
                resolvedName: name,
                status: 'valid',
                message: undefined,
              },
            }
          : row
      )
    );
  }, []);

  const handleApply = useCallback(async () => {
    setState('applying');
    try {
      // Extract resolved values from preview
      const resolvedValues: Record<string, string> = {};
      preview.forEach(row => {
        if (
          (row.importedValue.status === 'valid' || row.importedValue.status === 'warning') &&
          row.importedValue.resolved !== undefined
        ) {
          resolvedValues[row.fieldKey] = row.importedValue.resolved;
        }
      });

      await onImportComplete(resolvedValues);
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply imported data.');
      setState('preview');
    }
  }, [preview, onImportComplete, onOpenChange, reset]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) reset();
    onOpenChange(newOpen);
  }, [onOpenChange, reset]);

  const stats = state === 'preview' ? getPreviewStats(preview) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5" />
              Import from Excel
              <Badge variant="outline" className="text-helper font-normal capitalize">
                {area.replace('_', ' ')}
              </Badge>
            </DialogTitle>
          </div>

          {/* Stats badges in preview mode */}
          {stats && (
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-helper">
                <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success-icon))]" />
                <span className="text-green-700">{stats.valid} matched</span>
              </div>
              {stats.warnings > 0 && (
                <div className="flex items-center gap-1.5 text-helper">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-amber-600">{stats.warnings} needs review</span>
                </div>
              )}
              {stats.errors > 0 && (
                <div className="flex items-center gap-1.5 text-helper">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-destructive">{stats.errors} unmatched</span>
                </div>
              )}
              <div className="text-helper text-muted-foreground">
                {stats.populated} of {preview.length} fields populated
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 min-h-0">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {unmatchedColumns.length > 0 && state === 'preview' && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Unrecognized columns:</span>{' '}
                {unmatchedColumns.join(', ')}. These columns were not matched to any field and will be ignored.
              </AlertDescription>
            </Alert>
          )}

          {/* Idle state — drop zone */}
          {state === 'idle' && (
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileInput}
                className="hidden"
              />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-1">
                Drop an Excel file here or click to browse
              </p>
              <p className="text-body text-muted-foreground/70">
                Only .xlsx files are accepted. Download the template below for the correct format.
              </p>
            </div>
          )}

          {/* Parsing state */}
          {state === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Parsing Excel file...</p>
            </div>
          )}

          {/* Preview state */}
          {state === 'preview' && (
            <ImportPreviewTable
              preview={preview}
              onValueOverride={handleValueOverride}
              repeatGroups={repeatGroups}
            />
          )}

          {/* Applying state */}
          {state === 'applying' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Applying imported data...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-4 flex items-center justify-between sm:justify-between">
          <TemplateDownloadButton
            fieldDefs={fieldDefs}
            area={area}
            variant="ghost"
            size="sm"
          />
          <div className="flex items-center gap-2">
            {state === 'preview' && (
              <Button variant="outline" size="sm" onClick={reset}>
                Upload Different File
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            {state === 'preview' && (
              <Button
                size="sm"
                onClick={handleApply}
                disabled={stats?.populated === 0}
              >
                Apply Import
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
