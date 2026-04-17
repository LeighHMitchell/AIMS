"use client"

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { FormattedNumberInput } from './FormattedNumberInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ODA_DONOR_TYPES, ODA_FINANCING_TYPES, formatCurrency } from '@/lib/project-bank-utils';
import { DocumentUploadZone } from './DocumentUploadZone';
import { apiFetch } from '@/lib/api-fetch';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import { HelpTooltip } from './HelpTooltip';
import { ArrowRight, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface StageODATransferProps {
  wizard: UseAppraisalWizardReturn;
}

export function StageODATransfer({ wizard }: StageODATransferProps) {
  const { formData, updateField, projectId, documents, refreshDocuments, isLocked } = wizard;
  const router = useRouter();
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const alreadyTransferred = !!formData.aims_activity_id;

  const handleTransfer = async () => {
    if (!projectId || alreadyTransferred) return;
    setTransferring(true);
    setTransferError(null);
    try {
      // Save draft first — abort transfer if save fails
      const saved = await wizard.saveDraft();
      if (!saved) {
        setTransferError('Failed to save project data — please fix errors and try again');
        return;
      }

      const res = await apiFetch('/api/project-bank/publish-to-aims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!res.ok) {
        const err = await res.json();
        setTransferError(err.error || 'Transfer failed');
        return;
      }
      const result = await res.json();
      updateField('aims_activity_id', result.activity_id);
    } catch {
      setTransferError('Network error — please try again');
    } finally {
      setTransferring(false);
    }
  };

  // Total financing
  const grantAmt = formData.oda_grant_amount ?? 0;
  const loanAmt = formData.oda_loan_amount ?? 0;
  const counterpartAmt = formData.oda_counterpart_funding ?? 0;
  const totalFinancing = grantAmt + loanAmt + counterpartAmt;

  return (
    <div className={cn('space-y-6', isLocked && 'pointer-events-none opacity-60')}>
      <div>
        <h3 className="text-lg font-semibold mb-1">AIMS Transfer Preparation</h3>
        <p className="text-sm text-muted-foreground">
          Collect donor and financing details to pre-populate an AIMS activity, then transfer this project to the Aid Information Management System.
        </p>
      </div>

      {/* Development Partner */}
      <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
        <Label className="text-sm font-medium text-foreground">Development Partner</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Donor Type <HelpTooltip text="Type of development partner providing funding." /></label>
            <Select value={formData.oda_donor_type || ''} onValueChange={v => updateField('oda_donor_type', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                {ODA_DONOR_TYPES.map(dt => (
                  <SelectItem key={dt.value} value={dt.value}>
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{dt.code}</span>
                      <span>{dt.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Donor Name <HelpTooltip text="Name of the development partner or funding agency." /></label>
            <Input
              value={formData.oda_donor_name || ''}
              onChange={e => updateField('oda_donor_name', e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. World Bank, JICA, UNDP"
            />
          </div>
        </div>
      </div>

      {/* Financing */}
      <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
        <Label className="text-sm font-medium text-foreground">Financing</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Financing Type <HelpTooltip text="Primary financing instrument for this ODA project." /></label>
            <Select value={formData.oda_financing_type || ''} onValueChange={v => updateField('oda_financing_type', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                {ODA_FINANCING_TYPES.map(ft => (
                  <SelectItem key={ft.value} value={ft.value}>
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{ft.code}</span>
                      <span>{ft.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div />
          <div>
            <label className="text-xs text-muted-foreground">Grant Amount (USD) <HelpTooltip text="Total grant component from the development partner." /></label>
            <FormattedNumberInput
              value={formData.oda_grant_amount ?? null}
              onChange={v => updateField('oda_grant_amount', v)}
              placeholder="e.g. 5,000,000"
              decimals={2}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Loan Amount (USD) <HelpTooltip text="Total concessional loan component." /></label>
            <FormattedNumberInput
              value={formData.oda_loan_amount ?? null}
              onChange={v => updateField('oda_loan_amount', v)}
              placeholder="e.g. 10,000,000"
              decimals={2}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Counterpart Funding (USD) <HelpTooltip text="Government co-financing contribution." /></label>
            <FormattedNumberInput
              value={formData.oda_counterpart_funding ?? null}
              onChange={v => updateField('oda_counterpart_funding', v)}
              placeholder="e.g. 2,000,000"
              decimals={2}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Total Financing</label>
            <div className="text-lg font-bold font-mono text-foreground mt-1">
              {formatCurrency(totalFinancing > 0 ? totalFinancing : null)}
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Conditions / Notes <HelpTooltip text="Any conditionalities, disbursement conditions, or special terms attached to the financing." /></label>
          <Textarea
            value={formData.oda_conditions || ''}
            onChange={e => updateField('oda_conditions', e.target.value)}
            rows={2} className="text-sm"
            placeholder="Describe disbursement conditions, procurement requirements, etc."
          />
        </div>
      </div>

      {/* AIMS Pre-population */}
      <div className="space-y-3">
        <Label>AIMS Activity Details <HelpTooltip text="These fields will pre-populate the AIMS activity when you transfer this project." /></Label>
        <div>
          <label className="text-xs text-muted-foreground">Activity Description</label>
          <Textarea
            value={formData.oda_activity_description || formData.description || ''}
            onChange={e => updateField('oda_activity_description', e.target.value)}
            rows={3} className="text-sm"
            placeholder="Description that will appear in the AIMS activity record..."
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">DAC Sector Code <HelpTooltip text="OECD DAC 5-digit sector code for IATI reporting (e.g. 21010 for Transport Policy)." /></label>
          <Input
            value={formData.oda_iati_sector_code || ''}
            onChange={e => updateField('oda_iati_sector_code', e.target.value)}
            className="h-8 text-sm"
            placeholder="e.g. 21010"
          />
        </div>
      </div>

      {/* AIMS Transfer Review Card */}
      <div className="p-4 border-2 border-dashed border-border rounded-lg space-y-3">
        <Label className="text-sm font-medium text-foreground">Transfer Preview</Label>
        <p className="text-xs text-muted-foreground">The following data will be used to create an AIMS activity record.</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Title:</span>{' '}
            <span className="font-medium">{formData.name || '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Sector:</span>{' '}
            <span className="font-medium">{formData.sector || '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Donor:</span>{' '}
            <span className="font-medium">{formData.oda_donor_name || '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total:</span>{' '}
            <span className="font-medium">{formatCurrency(totalFinancing > 0 ? totalFinancing : null)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Currency:</span>{' '}
            <span className="font-medium">{formData.currency || 'USD'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">DAC Code:</span>{' '}
            <span className="font-medium">{formData.oda_iati_sector_code || '—'}</span>
          </div>
        </div>

        {alreadyTransferred ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success-icon))] shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Transferred to AIMS</p>
              <p className="text-xs text-green-700">This project has been linked to an AIMS activity.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/activities/${formData.aims_activity_id}`)}
              className="gap-1.5 shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View Activity
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={handleTransfer}
              disabled={transferring || !formData.oda_donor_name}
              className="gap-1.5"
            >
              {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Transfer to AIMS
            </Button>
            {!formData.oda_donor_name && (
              <p className="text-xs text-muted-foreground">Enter a donor name to enable transfer.</p>
            )}
            {transferError && (
              <p className="text-xs text-destructive">{transferError}</p>
            )}
          </div>
        )}
      </div>

      {/* Documents */}
      <div>
        <Label className="mb-2 block">Supporting Documents</Label>
        <DocumentUploadZone
          projectId={projectId}
          stage="vgf_assessment"
          documents={documents}
          onDocumentsChange={refreshDocuments}
          acceptedTypes={['funding_request', 'endorsement_letter', 'other']}
        />
      </div>
    </div>
  );
}
