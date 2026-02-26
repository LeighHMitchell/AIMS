"use client"

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ExternalLink, FileText, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-fetch';
import { determineFullRouting, formatCurrency, APPRAISAL_STAGE_LABELS } from '@/lib/project-bank-utils';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import { cn } from '@/lib/utils';

interface StageRoutingProps {
  wizard: UseAppraisalWizardReturn;
}

export function StageRouting({ wizard }: StageRoutingProps) {
  const router = useRouter();
  const { formData, updateField, projectId, documents, isSaving } = wizard;
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const firrPercent = formData.firr ?? null;
  const eirrPercent = formData.eirr ?? null;
  const ndpAligned = !!formData.ndp_aligned;

  const routing = determineFullRouting(firrPercent, eirrPercent, ndpAligned);

  const COLOR_MAP: Record<string, string> = {
    green: 'bg-green-50 border-green-300',
    blue: 'bg-blue-50 border-blue-300',
    purple: 'bg-purple-50 border-purple-300',
    amber: 'bg-amber-50 border-amber-300',
    red: 'bg-red-50 border-red-300',
  };
  const TEXT_COLOR_MAP: Record<string, string> = {
    green: 'text-green-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  };
  const BADGE_VARIANT_MAP: Record<string, string> = {
    green: 'success',
    blue: 'blue',
    purple: 'purple',
    amber: 'amber',
    red: 'destructive',
  };

  const summaryRows = [
    ['Project', formData.name || '—'],
    ['Ministry', formData.nominating_ministry || '—'],
    ['Sector', `${formData.sector || '—'}${formData.sub_sector ? ` / ${formData.sub_sector}` : ''}`],
    ['Region', formData.region || '—'],
    ['Estimated Cost', formData.estimated_cost ? formatCurrency(formData.estimated_cost, formData.currency) : '—'],
    ['NDP Aligned', ndpAligned ? 'Yes' : 'No'],
    ['FIRR', firrPercent !== null ? `${firrPercent.toFixed(1)}%` : 'Pending'],
    ...(eirrPercent !== null ? [['EIRR', `${eirrPercent.toFixed(1)}%`]] : []),
    ...(formData.vgf_amount ? [['VGF Amount', formatCurrency(formData.vgf_amount, formData.currency)]] : []),
  ];

  const handleSubmit = async () => {
    if (!projectId) return;
    setSubmitting(true);

    try {
      // Determine pathway and status from routing
      let pathway: string | null = null;
      let status = 'nominated';

      if (routing.outcome === 'private_with_state_support') {
        pathway = 'private_supported';
        status = 'approved';
      } else if (routing.outcome === 'private_no_support') {
        pathway = 'private_unsupported';
        status = 'approved';
      } else if (routing.outcome === 'ppp_mechanism') {
        pathway = 'ppp';
        status = 'approved';
      } else if (routing.outcome === 'rejected_not_msdp' || routing.outcome === 'rejected_low_eirr') {
        pathway = null;
        status = 'rejected';
      }

      // Save routing outcome
      await apiFetch(`/api/project-bank/${projectId}/appraisal-stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'dp_consultation',
          data: {
            routing_outcome: routing.outcome,
            status,
            pathway,
            ...(status === 'rejected' ? { rejection_reason: routing.description } : {}),
          },
          advance: 'routing_complete',
        }),
      });

      // Create AIMS activity for PPP/ODA projects
      if (pathway === 'ppp' || pathway === 'oda') {
        try {
          await apiFetch('/api/project-bank/publish-to-aims', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId }),
          });
        } catch {
          // Non-critical
        }
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
        <h3 className="text-xl font-bold">Project Submitted</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          The project has been routed to <strong>{routing.label}</strong>.
        </p>
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button onClick={() => router.push(`/project-bank/${projectId}`)}>
            View Project
          </Button>
          <Button variant="outline" onClick={() => router.push('/project-bank/new')}>
            <Plus className="h-4 w-4 mr-1.5" /> Submit Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Review & Submit</h3>
        <p className="text-sm text-muted-foreground">Review all project details before final submission.</p>
      </div>

      {/* Routing Outcome Badge */}
      <div className={cn('p-5 rounded-lg border-2', COLOR_MAP[routing.color] || COLOR_MAP.blue)}>
        <Badge variant={BADGE_VARIANT_MAP[routing.color] as any} className="mb-2 text-sm">
          {routing.label}
        </Badge>
        <p className="text-sm text-muted-foreground">{routing.description}</p>
      </div>

      {/* Summary */}
      <div className="border rounded-lg divide-y">
        {summaryRows.map(([label, value], i) => (
          <div key={i} className="flex justify-between p-3">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Documents */}
      {documents.length > 0 && (
        <div>
          <Label className="mb-2 block text-sm font-medium">Uploaded Documents ({documents.length})</Label>
          <div className="space-y-1">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{doc.file_name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{doc.upload_stage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="pt-4 border-t">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? 'Submitting...' : 'Submit to Pipeline'}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          This will finalize the appraisal and route the project based on the analysis above.
        </p>
      </div>
    </div>
  );
}
