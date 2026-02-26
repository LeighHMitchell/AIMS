"use client"

import { useMemo, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { estimateVGF } from '@/lib/eirr-calculator';
import { formatCurrency } from '@/lib/project-bank-utils';
import { DocumentUploadZone } from './DocumentUploadZone';
import { apiFetch } from '@/lib/api-fetch';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import type { LandParcel } from '@/types/land-bank';
import { HelpTooltip } from './HelpTooltip';
import { cn } from '@/lib/utils';

interface StagePPPStructuringProps {
  wizard: UseAppraisalWizardReturn;
}

const VGF_MODALITIES = [
  { value: 'capital_grant', label: 'Capital Grant (upfront)' },
  { value: 'annuity', label: 'Annuity Payments' },
  { value: 'interest_subsidy', label: 'Interest Subsidy' },
  { value: 'tax_incentive', label: 'Tax Incentive' },
  { value: 'land_grant', label: 'Land Grant (in-kind)' },
];

const CHECKLIST_ITEMS = [
  { key: 'detailed_fs', label: 'Detailed Feasibility Study completed' },
  { key: 'land_identified', label: 'Land parcel identified / reserved' },
  { key: 'dp_consulted', label: 'Development partners consulted' },
  { key: 'budget_allocated', label: 'Budget allocation secured' },
  { key: 'dap_compliant', label: 'DAP (Development Assistance Policy) compliant' },
  { key: 'risk_allocated', label: 'Risk allocation matrix prepared' },
];

export function StagePPPStructuring({ wizard }: StagePPPStructuringProps) {
  const { formData, updateField, projectId, documents, refreshDocuments } = wizard;
  const [landParcels, setLandParcels] = useState<LandParcel[]>([]);

  // Fetch available land parcels
  useEffect(() => {
    async function fetchParcels() {
      try {
        const res = await apiFetch('/api/land-bank/parcels?status=available');
        if (res.ok) setLandParcels(await res.json());
      } catch {}
    }
    fetchParcels();
  }, []);

  // VGF Estimation
  const targetFIRR = formData.vgf_calculation_data?.target_firr || 10;
  const vgfResult = useMemo(() => {
    if (!formData.cost_table_data?.length) return null;
    return estimateVGF(formData.cost_table_data, targetFIRR, formData.construction_period_years || 3);
  }, [formData.cost_table_data, targetFIRR, formData.construction_period_years]);

  // Save VGF data
  useMemo(() => {
    if (vgfResult) {
      updateField('vgf_amount', vgfResult.gap_amount);
      updateField('vgf_calculated', true);
      updateField('vgf_calculation_data', {
        ...vgfResult,
        target_firr: targetFIRR,
        calculated_at: new Date().toISOString(),
      });
    }
  }, [vgfResult?.gap_amount]);

  // Checklist state stored in vgf_calculation_data
  const checklist = formData.vgf_calculation_data?.checklist || {};
  const updateChecklist = (key: string, value: boolean) => {
    updateField('vgf_calculation_data', {
      ...(formData.vgf_calculation_data || {}),
      checklist: { ...checklist, [key]: value },
    });
  };

  const completedItems = CHECKLIST_ITEMS.filter(item => checklist[item.key]).length;
  const readinessPercent = Math.round((completedItems / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">PPP / VGF Structuring</h3>
        <p className="text-sm text-muted-foreground">
          Estimate the Viability Gap Funding required and prepare for PPP structuring.
        </p>
      </div>

      {/* VGF Estimation */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
        <Label className="text-sm font-medium text-purple-800">VGF Estimation <HelpTooltip text="Viability Gap Funding — the government subsidy needed to make the project commercially viable at the target FIRR." /></Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-purple-600">Target FIRR (%)</label>
            <Input
              type="number"
              step="0.5"
              value={targetFIRR}
              onChange={e => {
                const v = parseFloat(e.target.value) || 10;
                updateField('vgf_calculation_data', { ...(formData.vgf_calculation_data || {}), target_firr: v });
              }}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-purple-600">VGF Amount</label>
            <div className="text-lg font-bold font-mono text-purple-700 mt-1">
              {vgfResult ? formatCurrency(vgfResult.gap_amount) : '—'}
            </div>
          </div>
          <div>
            <label className="text-xs text-purple-600">VGF as % of CAPEX</label>
            <div className="text-lg font-bold font-mono text-purple-700 mt-1">
              {vgfResult ? `${vgfResult.vgf_as_pct_of_capex.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* VGF Modality */}
      <div>
        <Label>VGF Modality <HelpTooltip text="How the viability gap funding will be delivered (capital grant, annuity, interest subsidy, etc.)." /></Label>
        <Select value={formData.vgf_status || ''} onValueChange={v => updateField('vgf_status', v)}>
          <SelectTrigger><SelectValue placeholder="Select modality..." /></SelectTrigger>
          <SelectContent>
            {VGF_MODALITIES.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Land Parcel Selection */}
      <div>
        <Label>Land Parcel (from Land Bank) <HelpTooltip text="Select an available state-owned land parcel to be allocated to this project." /></Label>
        <Select value={formData.land_parcel_id || ''} onValueChange={v => updateField('land_parcel_id', v || null)}>
          <SelectTrigger><SelectValue placeholder="Select a parcel..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">None selected</SelectItem>
            {landParcels.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name || p.parcel_code} — {p.state_region} ({p.size_hectares} ha)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Budget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Budget Allocation Status</Label>
          <Select value={formData.budget_allocation_status || ''} onValueChange={v => updateField('budget_allocation_status', v)}>
            <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not_requested">Not Requested</SelectItem>
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="provisional">Provisional</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Budget Amount</Label>
          <Input
            type="number"
            value={formData.budget_amount ?? ''}
            onChange={e => updateField('budget_amount', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="Government budget allocation"
          />
        </div>
      </div>

      {/* DAP Compliance */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Switch
            checked={formData.dap_compliant || false}
            onCheckedChange={v => updateField('dap_compliant', v)}
          />
          <Label>DAP Compliant</Label>
        </div>
        <Textarea
          value={formData.dap_notes || ''}
          onChange={e => updateField('dap_notes', e.target.value)}
          placeholder="Notes on DAP compliance..."
          rows={2}
        />
      </div>

      {/* Readiness Checklist */}
      <div>
        <Label className="mb-2 block">PPP Readiness Checklist <HelpTooltip text="Track key milestones required before the PPP can be tendered." /></Label>
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

        {/* Readiness bar */}
        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Readiness</span>
            <span className="text-xs font-medium">{completedItems}/{CHECKLIST_ITEMS.length} ({readinessPercent}%)</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                readinessPercent === 100 ? 'bg-green-500' : readinessPercent >= 50 ? 'bg-amber-500' : 'bg-red-400',
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
          acceptedTypes={['vgf_calculation', 'risk_allocation_matrix', 'detailed_fs_report', 'funding_request', 'other']}
        />
      </div>
    </div>
  );
}
