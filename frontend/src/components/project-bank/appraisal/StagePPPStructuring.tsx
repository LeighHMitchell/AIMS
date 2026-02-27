"use client"

import { useMemo, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { estimateVGF } from '@/lib/eirr-calculator';
import { formatCurrency, PPP_CONTRACT_TYPE_LABELS, PPP_SUPPORT_MECHANISM_LABELS } from '@/lib/project-bank-utils';
import { DocumentUploadZone } from './DocumentUploadZone';
import { apiFetch } from '@/lib/api-fetch';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import type { LandParcel } from '@/types/land-bank';
import type { PPPContractType } from '@/types/project-bank';
import { HelpTooltip } from './HelpTooltip';
import { DatePicker } from '@/components/ui/date-picker';
import { useComplianceRules } from '@/hooks/use-compliance-rules';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
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
  const { validateEquityRatio } = useComplianceRules();

  // Cost in USD for equity ratio validation
  const costUSD = formData.currency === 'USD' ? formData.estimated_cost :
    formData.currency === 'MMK' ? (formData.estimated_cost || 0) / 2100 :
    formData.estimated_cost;
  const equityResult = validateEquityRatio(formData.equity_ratio ?? null, costUSD ?? null);

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

      {/* PPP Support Mechanism (FS-3) */}
      <div>
        <Label>PPP Support Mechanism <HelpTooltip text="The government support mechanism for this PPP: VGF (capital subsidy), MRG (revenue guarantee), Availability Payments, or combinations thereof." /></Label>
        <Select value={formData.ppp_support_mechanism || ''} onValueChange={v => updateField('ppp_support_mechanism', v || null)}>
          <SelectTrigger><SelectValue placeholder="Select support mechanism..." /></SelectTrigger>
          <SelectContent>
            {Object.entries(PPP_SUPPORT_MECHANISM_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* MRG Fields */}
      {(formData.ppp_support_mechanism === 'mrg' || formData.ppp_support_mechanism === 'combined') && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
          <Label className="text-sm font-medium text-amber-800">Minimum Revenue Guarantee (MRG)</Label>
          <p className="text-xs text-amber-700">Government guarantees a minimum annual revenue to the private partner. If actual revenue falls below this threshold, the government pays the shortfall.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-amber-600">Guaranteed Minimum Annual Revenue (USD)</label>
              <Input
                type="number"
                value={formData.mrg_guaranteed_minimum ?? ''}
                onChange={e => updateField('mrg_guaranteed_minimum', e.target.value ? parseFloat(e.target.value) : null)}
                className="h-8 text-sm"
                placeholder="e.g. 5000000"
              />
            </div>
            <div>
              <label className="text-xs text-amber-600">Government Liability Cap (USD)</label>
              <Input
                type="number"
                value={formData.mrg_government_liability_cap ?? ''}
                onChange={e => updateField('mrg_government_liability_cap', e.target.value ? parseFloat(e.target.value) : null)}
                className="h-8 text-sm"
                placeholder="Max total government exposure"
              />
            </div>
            <div>
              <label className="text-xs text-amber-600">Duration (years)</label>
              <Input
                type="number"
                value={formData.mrg_duration_years ?? ''}
                onChange={e => updateField('mrg_duration_years', e.target.value ? parseInt(e.target.value) : null)}
                className="h-8 text-sm"
                placeholder="e.g. 15"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-amber-600">Trigger Conditions</label>
              <Textarea
                value={formData.mrg_trigger_conditions || ''}
                onChange={e => updateField('mrg_trigger_conditions', e.target.value)}
                rows={2} className="text-sm"
                placeholder="When does the MRG activate? (e.g. actual revenue < 80% of projected revenue)"
              />
            </div>
          </div>
        </div>
      )}

      {/* Availability Payment Fields */}
      {(formData.ppp_support_mechanism === 'availability_payment' || formData.ppp_support_mechanism === 'combined') && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg space-y-3">
          <Label className="text-sm font-medium text-teal-800">Availability Payments</Label>
          <p className="text-xs text-teal-700">Government makes regular payments for making infrastructure available, regardless of actual usage. Payments are subject to service quality conditions.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-teal-600">Annual Payment Amount (USD)</label>
              <Input
                type="number"
                value={formData.availability_payment_amount ?? ''}
                onChange={e => updateField('availability_payment_amount', e.target.value ? parseFloat(e.target.value) : null)}
                className="h-8 text-sm"
                placeholder="e.g. 2000000"
              />
            </div>
            <div>
              <label className="text-xs text-teal-600">Duration (years)</label>
              <Input
                type="number"
                value={formData.availability_payment_duration_years ?? ''}
                onChange={e => updateField('availability_payment_duration_years', e.target.value ? parseInt(e.target.value) : null)}
                className="h-8 text-sm"
                placeholder="e.g. 20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-teal-600">Payment Conditions</label>
              <Textarea
                value={formData.availability_payment_conditions || ''}
                onChange={e => updateField('availability_payment_conditions', e.target.value)}
                rows={2} className="text-sm"
                placeholder="Conditions under which availability payments are made or deducted..."
              />
            </div>
          </div>
        </div>
      )}

      {/* PPP Contract Type */}
      <div>
        <Label>PPP Contract Type <HelpTooltip text="The specific PPP modality for this project per Notification No. 2/2018." /></Label>
        <Select value={formData.ppp_contract_type || ''} onValueChange={v => updateField('ppp_contract_type', v || null)}>
          <SelectTrigger><SelectValue placeholder="Select contract type..." /></SelectTrigger>
          <SelectContent>
            {Object.entries(PPP_CONTRACT_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conditional PPP Contract Detail Fields */}
      {formData.ppp_contract_type && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <Label className="text-sm font-medium text-blue-800">
            {PPP_CONTRACT_TYPE_LABELS[formData.ppp_contract_type as string] || 'Contract'} Details
          </Label>

          {(formData.ppp_contract_type === 'bot' || formData.ppp_contract_type === 'bto') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-blue-600">Transfer Date</label>
                <DatePicker
                  value={formData.ppp_contract_details?.transfer_date || ''}
                  onChange={v => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), transfer_date: v || null })}
                  placeholder="Pick transfer date"
                />
              </div>
              {formData.ppp_contract_type === 'bot' && (
                <>
                  <div>
                    <label className="text-xs text-blue-600">Concession Period (years)</label>
                    <Input
                      type="number"
                      value={formData.ppp_contract_details?.concession_period_years ?? ''}
                      onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), concession_period_years: e.target.value ? Number(e.target.value) : null })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-blue-600">Transfer Conditions</label>
                    <Textarea
                      value={formData.ppp_contract_details?.transfer_conditions || ''}
                      onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), transfer_conditions: e.target.value })}
                      rows={2} className="text-sm"
                    />
                  </div>
                </>
              )}
              {formData.ppp_contract_type === 'bto' && (
                <div>
                  <label className="text-xs text-blue-600">Operating Period (years)</label>
                  <Input
                    type="number"
                    value={formData.ppp_contract_details?.operating_period_years ?? ''}
                    onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), operating_period_years: e.target.value ? Number(e.target.value) : null })}
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {formData.ppp_contract_type === 'boo' && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-blue-600">Perpetuity Terms</label>
                <Textarea
                  value={formData.ppp_contract_details?.perpetuity_terms || ''}
                  onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), perpetuity_terms: e.target.value })}
                  rows={2} className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-blue-600">Purchase Option Terms</label>
                <Textarea
                  value={formData.ppp_contract_details?.purchase_option_terms || ''}
                  onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), purchase_option_terms: e.target.value })}
                  rows={2} className="text-sm"
                />
              </div>
            </div>
          )}

          {formData.ppp_contract_type === 'btl' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-blue-600">Lease Period (years)</label>
                <Input
                  type="number"
                  value={formData.ppp_contract_details?.lease_period_years ?? ''}
                  onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), lease_period_years: e.target.value ? Number(e.target.value) : null })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-blue-600">Lease Payment Terms</label>
                <Textarea
                  value={formData.ppp_contract_details?.lease_payment_terms || ''}
                  onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), lease_payment_terms: e.target.value })}
                  rows={2} className="text-sm"
                />
              </div>
            </div>
          )}

          {formData.ppp_contract_type === 'om' && (
            <div>
              <label className="text-xs text-blue-600">Contract Period (years)</label>
              <Input
                type="number"
                value={formData.ppp_contract_details?.contract_period_years ?? ''}
                onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), contract_period_years: e.target.value ? Number(e.target.value) : null })}
                className="h-8 text-sm w-40"
              />
            </div>
          )}

          {formData.ppp_contract_type === 'availability_payment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-blue-600">Service Level KPIs</label>
                <Textarea
                  value={formData.ppp_contract_details?.service_level_kpis || ''}
                  onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), service_level_kpis: e.target.value })}
                  rows={2} className="text-sm" placeholder="Define key performance indicators..."
                />
              </div>
              <div>
                <label className="text-xs text-blue-600">Payment Schedule</label>
                <Select
                  value={formData.ppp_contract_details?.payment_schedule_type || ''}
                  onValueChange={v => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), payment_schedule_type: v })}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-blue-600">Performance Deduction Terms</label>
                <Textarea
                  value={formData.ppp_contract_details?.performance_deduction_terms || ''}
                  onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), performance_deduction_terms: e.target.value })}
                  rows={2} className="text-sm"
                />
              </div>
            </div>
          )}

          {formData.ppp_contract_type === 'other' && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-blue-600">Custom Type Description</label>
                <Input
                  value={formData.ppp_contract_details?.custom_type_description || ''}
                  onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), custom_type_description: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-blue-600">Custom Terms</label>
                <Textarea
                  value={formData.ppp_contract_details?.custom_terms || ''}
                  onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), custom_terms: e.target.value })}
                  rows={2} className="text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Equity Ratio */}
      <div>
        <Label>Equity Ratio (%) <HelpTooltip text="The private equity contribution as a percentage of total project cost. Per Notification 2/2018: >=30% for projects <=50M USD, >=20% for projects >50M USD." /></Label>
        <Input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={formData.equity_ratio ?? ''}
          onChange={e => updateField('equity_ratio', e.target.value ? parseFloat(e.target.value) : null)}
          placeholder="e.g. 25"
          className="w-40"
        />
      </div>

      {/* Equity ratio compliance warning */}
      {equityResult && !equityResult.passed && (
        <div className={cn(
          "flex items-start gap-2 p-3 rounded-lg border text-sm",
          equityResult.enforcement === 'enforce'
            ? "bg-red-50 border-red-200 text-red-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        )}>
          {equityResult.enforcement === 'enforce' ? (
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span>{equityResult.message}</span>
        </div>
      )}

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
