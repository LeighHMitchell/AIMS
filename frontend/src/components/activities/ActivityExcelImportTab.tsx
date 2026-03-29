"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, Info, Loader2, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportPreviewTable, getPreviewStats } from '@/components/excel-import/ImportPreviewTable';
import { TemplateDownloadButton } from '@/components/excel-import/TemplateDownloadButton';
import { cn } from '@/lib/utils';
import { ACTIVITY_IMPORT_FIELDS, ACTIVITY_REPEAT_GROUPS } from '@/lib/excel-import/schemas';
import { processSingleRowImport } from '@/lib/excel-import/import-engine';
import type { PreviewRow } from '@/lib/excel-import/types';
import { apiFetch } from '@/lib/api-fetch';
import { getOrCreateOrganization } from '@/lib/organization-helpers';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ActivityExcelImportTabProps {
  activityId: string | null;
  formData?: Record<string, any>;
  setFormData?: React.Dispatch<React.SetStateAction<any>>;
  handleFieldBlur?: (fieldName: string, value: string) => Promise<void>;
}

// Fields that handleFieldBlur knows about
const BLUR_HANDLED_FIELDS = new Set([
  'title', 'description', 'collaboration_type', 'activity_scope',
  'activity_status', 'planned_start_date', 'planned_end_date',
  'actual_start_date', 'actual_end_date', 'effective_date',
  'acronym',
]);

// Fields that should be saved via /api/activities/field
const FIELD_API_FIELDS = new Set([
  'iati_identifier', 'default_aid_type', 'default_finance_type',
  'default_flow_type', 'default_tied_status', 'humanitarian',
  'capital_spend_percentage', 'budget_status', 'on_budget_percentage',
]);

// Map from our field keys to the API field names
const FIELD_API_MAP: Record<string, string> = {
  iati_identifier: 'iati_identifier',
  default_aid_type: 'default_aid_type',
  default_finance_type: 'default_finance_type',
  default_flow_type: 'default_flow_type',
  default_tied_status: 'default_tied_status',
  humanitarian: 'humanitarian',
  capital_spend_percentage: 'capital_spend_percentage',
  budget_status: 'budget_status',
  on_budget_percentage: 'on_budget_percentage',
};

export function ActivityExcelImportTab({
  activityId,
  formData,
  setFormData,
  handleFieldBlur,
}: ActivityExcelImportTabProps) {
  const [phase, setPhase] = useState<'idle' | 'parsing' | 'preview' | 'applying'>('idle');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [unmatchedColumns, setUnmatchedColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx') {
      setError('Please upload an Excel file (.xlsx). Download the template for the correct format.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }
    setError(null);
    setPhase('parsing');
    try {
      const result = await processSingleRowImport(file, ACTIVITY_IMPORT_FIELDS);
      setPreview(result.preview);
      setUnmatchedColumns(Array.from(result.unmatchedColumns));
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse the Excel file.');
      setPhase('idle');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
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
                status: 'valid' as const,
                message: undefined,
              },
            }
          : row
      )
    );
  }, []);

  const resetImport = useCallback(() => {
    setPhase('idle');
    setPreview([]);
    setUnmatchedColumns([]);
    setError(null);
  }, []);

  const handleApply = useCallback(async () => {
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
    setPhase('applying');
    try {
      await applyImportedValues(resolvedValues);
      resetImport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply imported data.');
      setPhase('preview');
    }
  }, [preview]);

  const applyImportedValues = useCallback(async (resolvedValues: Record<string, string>) => {
    if (!activityId) {
      toast.error('Cannot import: no activity ID. Please save the activity first.');
      return;
    }

    const toastId = toast.loading('Applying imported data...');
    let savedCount = 0;
    let errorCount = 0;

    try {
      // 1. Save scalar fields via handleFieldBlur (if available) or field API
      const allScalarKeys = new Set([...Array.from(BLUR_HANDLED_FIELDS), ...Array.from(FIELD_API_FIELDS)]);
      for (const fieldKey of Array.from(allScalarKeys)) {
        if (resolvedValues[fieldKey] !== undefined) {
          try {
            // Try handleFieldBlur first for fields it knows about
            if (handleFieldBlur && BLUR_HANDLED_FIELDS.has(fieldKey)) {
              if (setFormData) {
                setFormData((prev: any) => ({ ...prev, [fieldKey]: resolvedValues[fieldKey] }));
              }
              await handleFieldBlur(fieldKey, resolvedValues[fieldKey]);
            } else {
              // Fall back to field API
              const apiField = FIELD_API_MAP[fieldKey] || fieldKey;
              await apiFetch('/api/activities/field', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  activityId,
                  field: apiField,
                  value: resolvedValues[fieldKey],
                }),
              });
              if (setFormData) {
                setFormData((prev: any) => ({ ...prev, [fieldKey]: resolvedValues[fieldKey] }));
              }
            }
            savedCount++;
          } catch (err) {
            console.error(`[Excel Import] Failed to save field ${fieldKey}:`, err);
            errorCount++;
          }
        }
      }

      // 3. Save sectors (repeating fields)
      const sectors = extractRepeatingGroup(resolvedValues, 'sector_code', 'sector_percentage', 5);
      if (sectors.length > 0) {
        try {
          const sectorsToImport = sectors.map(s => ({
            sector_code: s.code,
            sector_narrative: '',
            percentage: s.percentage ? parseFloat(s.percentage) : null,
            vocabulary: '1',
          }));

          const response = await apiFetch(`/api/activities/${activityId}/sectors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sectors: sectorsToImport, replace: true }),
          });

          if (response.ok) {
            savedCount += sectors.length;
          } else {
            const err = await response.json();
            console.error('[Excel Import] Sector import failed:', err);
            errorCount += sectors.length;
          }
        } catch (err) {
          console.error('[Excel Import] Sector import error:', err);
          errorCount += sectors.length;
        }
      }

      // 4. Save recipient countries
      const countries = extractRepeatingGroup(resolvedValues, 'country_code', 'country_percentage', 5);
      if (countries.length > 0) {
        try {
          const countriesToSave = countries.map(c => ({
            country_code: c.code,
            percentage: c.percentage ? parseFloat(c.percentage) : null,
          }));

          await apiFetch('/api/activities/field', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activityId,
              field: 'recipient_countries',
              value: countriesToSave,
            }),
          });
          savedCount += countries.length;
        } catch (err) {
          console.error('[Excel Import] Country import error:', err);
          errorCount += countries.length;
        }
      }

      // 5. Save participating organizations
      const orgs = extractRepeatingOrgGroup(resolvedValues, 5);
      if (orgs.length > 0) {
        for (const org of orgs) {
          try {
            // Try to find or create the organization
            const organizationId = await getOrCreateOrganization(supabase, {
              ref: org.ref || undefined,
              name: org.name,
              type: undefined,
            });

            if (organizationId) {
              const roleMap: Record<string, string> = {
                'funding': 'funding',
                'implementing': 'implementing',
                'extending': 'extending',
                'accountable': 'accountable',
              };

              const iatiRoleMap: Record<string, number> = {
                'funding': 1,
                'accountable': 2,
                'extending': 3,
                'implementing': 4,
              };

              await apiFetch(`/api/activities/${activityId}/participating-organizations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  organization_id: organizationId,
                  role_type: roleMap[org.role] || 'implementing',
                  iati_role_code: iatiRoleMap[org.role] || 4,
                  iati_org_ref: org.ref || null,
                }),
              });
              savedCount++;
            } else {
              errorCount++;
            }
          } catch (err) {
            console.error('[Excel Import] Org import error:', err);
            errorCount++;
          }
        }
      }

      // 6. Save contacts
      const contacts = extractRepeatingContactGroup(resolvedValues, 5);
      if (contacts.length > 0) {
        try {
          const contactsToSave = contacts.map(c => ({
            first_name: c.name?.split(' ')[0] || '',
            last_name: c.name?.split(' ').slice(1).join(' ') || '',
            email: c.email || '',
            phone: c.phone || '',
            organisation: c.org || '',
            contact_type: 'general',
          }));

          await apiFetch('/api/activities/field', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activityId,
              field: 'contacts',
              value: contactsToSave,
            }),
          });
          savedCount += contacts.length;
        } catch (err) {
          console.error('[Excel Import] Contact import error:', err);
          errorCount += contacts.length;
        }
      }

      // 7. Save SDG alignment
      const sdgs = extractRepeatingGroup(resolvedValues, 'sdg_goal', 'sdg_percentage', 5, 'sdg_target');
      if (sdgs.length > 0) {
        try {
          const sdgsToSave = sdgs.map(s => ({
            sdg_goal: parseInt(s.code) || 0,
            sdg_target: s.extra || '',
            contribution_percent: s.percentage ? parseFloat(s.percentage) : null,
          }));

          await apiFetch('/api/activities/field', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activityId,
              field: 'sdg_alignment',
              value: sdgsToSave,
            }),
          });
          savedCount += sdgs.length;
        } catch (err) {
          console.error('[Excel Import] SDG import error:', err);
          errorCount += sdgs.length;
        }
      }

      // 8. Save policy markers
      const markers = extractRepeatingGroup(resolvedValues, 'policy_marker_code', 'policy_marker_significance', 5);
      if (markers.length > 0) {
        try {
          const markersToSave = markers.map(m => ({
            policy_marker_code: m.code,
            significance: m.percentage || '0', // percentage field holds significance for policy markers
          }));

          await apiFetch('/api/activities/field', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activityId,
              field: 'policy_markers',
              value: markersToSave,
            }),
          });
          savedCount += markers.length;
        } catch (err) {
          console.error('[Excel Import] Policy marker import error:', err);
          errorCount += markers.length;
        }
      }

      // Show result
      toast.dismiss(toastId);
      if (errorCount === 0) {
        toast.success(`Import complete`, {
          description: `${savedCount} field(s) imported successfully.`,
        });
      } else {
        toast.warning(`Import partially complete`, {
          description: `${savedCount} field(s) imported, ${errorCount} failed. Check the console for details.`,
        });
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Import failed', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    }
  }, [activityId, setFormData, handleFieldBlur]);

  const stats = phase === 'preview' ? getPreviewStats(preview) : null;

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/30">
        <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Import activity data from Excel</p>
          <p>
            Download the template, fill it out, then drag it into the area below.
            You&apos;ll review and adjust imported values before they&apos;re applied.
            Existing field values will be overwritten.
          </p>
        </div>
      </div>

      {/* Template download */}
      <TemplateDownloadButton
        fieldDefs={ACTIVITY_IMPORT_FIELDS}
        area="activity"
        label="Download Activity Template"
        variant="outline"
      />

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!activityId && (
        <p className="text-sm text-muted-foreground">
          Save the activity first before importing from Excel.
        </p>
      )}

      {/* Drop zone — idle state */}
      {phase === 'idle' && activityId && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
            isDragging
              ? 'border-foreground/40 bg-muted/50'
              : 'border-border hover:border-foreground/25'
          )}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
            className="hidden"
          />
          <Upload className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-base font-medium text-muted-foreground mb-1">
            Drop an Excel file here or click to browse
          </p>
          <p className="text-sm text-muted-foreground/60">
            Only .xlsx files are accepted
          </p>
        </div>
      )}

      {/* Parsing */}
      {phase === 'parsing' && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Parsing Excel file...</p>
        </div>
      )}

      {/* Preview */}
      {phase === 'preview' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{stats?.valid} matched</span>
            </div>
            {(stats?.warnings ?? 0) > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{stats?.warnings} needs review</span>
              </div>
            )}
            {(stats?.errors ?? 0) > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{stats?.errors} unmatched</span>
              </div>
            )}
            <span>{stats?.populated} of {preview.length} fields populated</span>
          </div>

          {unmatchedColumns.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Unrecognized columns:</span>{' '}
              {unmatchedColumns.join(', ')}
            </p>
          )}

          <ImportPreviewTable
            preview={preview}
            onValueOverride={handleValueOverride}
            repeatGroups={ACTIVITY_REPEAT_GROUPS}
          />

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={resetImport}>
              Upload Different File
            </Button>
            <Button size="sm" onClick={handleApply} disabled={stats?.populated === 0}>
              Apply Import
            </Button>
          </div>
        </div>
      )}

      {/* Applying */}
      {phase === 'applying' && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Applying imported data...</p>
        </div>
      )}
    </div>
  );
}

// ---------- Helper functions for extracting repeating groups ----------

interface RepeatingItem {
  code: string;
  percentage?: string;
  extra?: string;
}

function extractRepeatingGroup(
  values: Record<string, string>,
  codePrefix: string,
  percentagePrefix: string,
  count: number,
  extraPrefix?: string
): RepeatingItem[] {
  const items: RepeatingItem[] = [];
  for (let i = 1; i <= count; i++) {
    const code = values[`${codePrefix}_${i}`];
    if (code) {
      items.push({
        code,
        percentage: values[`${percentagePrefix}_${i}`],
        extra: extraPrefix ? values[`${extraPrefix}_${i}`] : undefined,
      });
    }
  }
  return items;
}

interface OrgItem {
  name: string;
  role: string;
  ref?: string;
}

function extractRepeatingOrgGroup(values: Record<string, string>, count: number): OrgItem[] {
  const items: OrgItem[] = [];
  for (let i = 1; i <= count; i++) {
    const name = values[`org_name_${i}`];
    if (name) {
      items.push({
        name,
        role: values[`org_role_${i}`] || 'implementing',
        ref: values[`org_ref_${i}`],
      });
    }
  }
  return items;
}

interface ContactItem {
  name?: string;
  email?: string;
  phone?: string;
  org?: string;
}

function extractRepeatingContactGroup(values: Record<string, string>, count: number): ContactItem[] {
  const items: ContactItem[] = [];
  for (let i = 1; i <= count; i++) {
    const name = values[`contact_name_${i}`];
    const email = values[`contact_email_${i}`];
    if (name || email) {
      items.push({
        name,
        email,
        phone: values[`contact_phone_${i}`],
        org: values[`contact_org_${i}`],
      });
    }
  }
  return items;
}
