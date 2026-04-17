"use client"

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { FormattedNumberInput } from './FormattedNumberInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PROCUREMENT_METHODS } from '@/lib/project-bank-utils';
import { DocumentUploadZone } from './DocumentUploadZone';
import { apiFetch } from '@/lib/api-fetch';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import type { LandParcel } from '@/types/land-bank';
import { HelpTooltip } from './HelpTooltip';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

interface StagePrivateInvestmentProps {
  wizard: UseAppraisalWizardReturn;
}

const CHECKLIST_ITEMS = [
  { key: 'investor_identified', label: 'Investor identified' },
  { key: 'procurement_plan_ready', label: 'Procurement plan ready' },
  { key: 'financial_advisory_engaged', label: 'Financial advisory engaged' },
  { key: 'land_secured', label: 'Land secured' },
];

export function StagePrivateInvestment({ wizard }: StagePrivateInvestmentProps) {
  const { formData, updateField, projectId, documents, refreshDocuments, isLocked } = wizard;
  const [landParcels, setLandParcels] = useState<LandParcel[]>([]);

  useEffect(() => {
    async function fetchParcels() {
      try {
        const res = await apiFetch('/api/land-bank/parcels?status=available');
        if (res.ok) setLandParcels(await res.json());
      } catch {}
    }
    fetchParcels();
  }, []);

  // Checklist state stored in private_structuring_data
  const checklist = formData.private_structuring_data?.checklist || {};
  const updateChecklist = (key: string, value: boolean) => {
    updateField('private_structuring_data', {
      ...(formData.private_structuring_data || {}),
      checklist: { ...checklist, [key]: value },
    });
  };

  const completedItems = CHECKLIST_ITEMS.filter(item => checklist[item.key]).length;
  const readinessPercent = Math.round((completedItems / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className={cn('space-y-6', isLocked && 'pointer-events-none opacity-60')}>
      <div>
        <h3 className="text-lg font-semibold mb-1">Private Investment Structuring</h3>
        <p className="text-sm text-muted-foreground">
          Prepare this project for private sector investment — identify investors, procurement approach, and financial arrangements.
        </p>
      </div>

      {/* Investor Details */}
      <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
        <Label className="text-sm font-medium text-foreground">Investor Details</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Private Partner Name <HelpTooltip text="Name of the identified or prospective private investor/consortium." /></label>
            <Input
              value={formData.private_partner_name || ''}
              onChange={e => updateField('private_partner_name', e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. Myanmar Infrastructure Corp."
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Partner Experience <HelpTooltip text="Summary of the partner's relevant project experience and track record." /></label>
            <Input
              value={formData.private_partner_experience || ''}
              onChange={e => updateField('private_partner_experience', e.target.value)}
              className="h-8 text-sm"
              placeholder="Brief description of relevant experience"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Investor Commitments <HelpTooltip text="Details of the investor's financial commitments, equity pledges, or letters of intent." /></label>
            <Textarea
              value={formData.investor_commitments || ''}
              onChange={e => updateField('investor_commitments', e.target.value)}
              rows={2} className="text-sm"
              placeholder="Describe equity commitments, letters of intent, or other financial pledges..."
            />
          </div>
        </div>
      </div>

      {/* Procurement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Procurement Method <HelpTooltip text="The method for selecting the private partner." /></Label>
          <Select value={formData.procurement_method || ''} onValueChange={v => updateField('procurement_method', v)}>
            <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
            <SelectContent>
              {PROCUREMENT_METHODS.map(m => (
                <SelectItem key={m.value} value={m.value}>
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{m.code}</span>
                    <span>{m.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Concession Period (years) <HelpTooltip text="Duration of the concession or operating period for the private partner." /></Label>
          <FormattedNumberInput
            value={formData.concession_period_years ?? null}
            onChange={v => updateField('concession_period_years', v)}
            className="h-8 text-sm"
            placeholder="e.g. 25"
          />
        </div>
      </div>

      <div>
        <Label>Procurement Timeline <HelpTooltip text="Expected procurement schedule and key milestones." /></Label>
        <Textarea
          value={formData.procurement_timeline || ''}
          onChange={e => updateField('procurement_timeline', e.target.value)}
          rows={2} className="text-sm"
          placeholder="Describe the procurement timeline (e.g. EOI Q3 2026, RFP Q4 2026, Award Q1 2027)..."
        />
      </div>

      {/* Financial Structure */}
      <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
        <Label className="text-sm font-medium text-foreground">Financial Structure</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Equity Ratio (%) <HelpTooltip text="The private equity contribution as a percentage of total project cost." /></label>
            <FormattedNumberInput
              value={formData.equity_ratio ?? null}
              onChange={v => updateField('equity_ratio', v)}
              placeholder="e.g. 30"
              decimals={1}
              min={0}
              max={100}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Financial Closure Target <HelpTooltip text="Target date for achieving financial closure with all funding sources confirmed." /></label>
            <DatePicker
              value={formData.financial_closure_target || ''}
              onChange={v => updateField('financial_closure_target', v || null)}
              placeholder="Pick target date"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Security Arrangements <HelpTooltip text="Describe any security or guarantee arrangements (e.g. sovereign guarantees, escrow accounts, step-in rights)." /></label>
            <Textarea
              value={formData.security_arrangements || ''}
              onChange={e => updateField('security_arrangements', e.target.value)}
              rows={2} className="text-sm"
              placeholder="Sovereign guarantees, escrow accounts, step-in rights, etc."
            />
          </div>
        </div>
      </div>

      {/* Land Parcel Selection */}
      <div>
        <Label>Land Parcel (from Land Bank) <HelpTooltip text="Select an available state-owned land parcel to be allocated to this project." /></Label>
        <Select value={formData.land_parcel_id || 'none'} onValueChange={v => updateField('land_parcel_id', v === 'none' ? null : v)}>
          <SelectTrigger><SelectValue placeholder="Select a parcel..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None selected</SelectItem>
            {landParcels.map(p => (
              <SelectItem key={p.id} value={p.id}>
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.parcel_code}</span>
                  <span>{p.name || p.state_region} ({p.size_hectares} ha)</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Readiness Checklist */}
      <div>
        <Label className="mb-2 block">Investment Readiness Checklist <HelpTooltip text="Track key milestones required before private investment can proceed." /></Label>
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map(item => (
            <div key={item.key} className="flex items-center gap-2">
              <Checkbox
                checked={checklist[item.key] || false}
                onCheckedChange={(v) => updateChecklist(item.key, !!v)}
              />
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Readiness</span>
            <span className="text-xs font-medium">{completedItems}/{CHECKLIST_ITEMS.length} ({readinessPercent}%)</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                readinessPercent === 100 ? 'bg-green-500' : readinessPercent >= 50 ? 'bg-amber-500' : 'bg-destructive/10',
              )}
              style={{ width: `${readinessPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Documents */}
      <div>
        <Label className="mb-2 block">Supporting Documents</Label>
        <DocumentUploadZone
          projectId={projectId}
          stage="vgf_assessment"
          documents={documents}
          onDocumentsChange={refreshDocuments}
          acceptedTypes={['proponent_profile', 'funding_request', 'terms_of_reference', 'other']}
        />
      </div>
    </div>
  );
}
