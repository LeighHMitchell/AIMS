"use client"

import { useMemo, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { FormattedNumberInput } from './FormattedNumberInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { estimateVGF } from '@/lib/eirr-calculator';
import { formatCurrency, PPP_CONTRACT_TYPE_LABELS, PPP_CONTRACT_TYPES, PPP_SUPPORT_MECHANISMS, VGF_MODALITIES, BUDGET_ALLOCATION_STATUSES, PAYMENT_SCHEDULE_TYPES } from '@/lib/project-bank-utils';
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

const CHECKLIST_ITEMS = [
  { key: 'land_identified', label: 'Land parcel identified / reserved' },
  { key: 'dp_consulted', label: 'Development partners consulted' },
  { key: 'budget_allocated', label: 'Budget allocation secured' },
  { key: 'dap_compliant', label: 'Development Assistance Policy (DAP) compliant' },
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
      <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
        <Label className="text-sm font-medium text-foreground">VGF Estimation <HelpTooltip text="Viability Gap Funding — the government subsidy needed to make the project commercially viable at the target FIRR." /></Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Target FIRR (%) <HelpTooltip text="The minimum financial return needed to attract private investment." /></label>
            <FormattedNumberInput
              value={targetFIRR}
              onChange={v => {
                updateField('vgf_calculation_data', { ...(formData.vgf_calculation_data || {}), target_firr: v ?? 10 });
              }}
              decimals={1}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">VGF Amount</label>
            <div className="text-lg font-bold font-mono text-foreground mt-1">
              {vgfResult ? formatCurrency(vgfResult.gap_amount) : '—'}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">VGF as % of CAPEX</label>
            <div className="text-lg font-bold font-mono text-foreground mt-1">
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

      {/* PPP Support Mechanism (FS-3) */}
      <div>
        <Label>PPP Support Mechanism <HelpTooltip text="The government support mechanism for this PPP: VGF (capital subsidy), MRG (revenue guarantee), Availability Payments, or combinations thereof." /></Label>
        <Select value={formData.ppp_support_mechanism || ''} onValueChange={v => updateField('ppp_support_mechanism', v || null)}>
          <SelectTrigger><SelectValue placeholder="Select support mechanism..." /></SelectTrigger>
          <SelectContent>
            {PPP_SUPPORT_MECHANISMS.map(m => (
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

      {/* MRG Fields */}
      {(formData.ppp_support_mechanism === 'mrg' || formData.ppp_support_mechanism === 'combined') && (
        <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
          <Label className="text-sm font-medium text-foreground">Minimum Revenue Guarantee (MRG)</Label>
          <p className="text-xs text-muted-foreground">Government guarantees a minimum annual revenue to the private partner. If actual revenue falls below this threshold, the government pays the shortfall.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Guaranteed Minimum Annual Revenue (USD) <HelpTooltip text="The minimum annual revenue the government guarantees to the private partner." /></label>
              <FormattedNumberInput
                value={formData.mrg_guaranteed_minimum ?? null}
                onChange={v => updateField('mrg_guaranteed_minimum', v)}
                className="h-8 text-sm"
                placeholder="e.g. 5,000,000"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Government Liability Cap (USD) <HelpTooltip text="Maximum cumulative government exposure under the MRG." /></label>
              <FormattedNumberInput
                value={formData.mrg_government_liability_cap ?? null}
                onChange={v => updateField('mrg_government_liability_cap', v)}
                className="h-8 text-sm"
                placeholder="Max total government exposure"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Duration (years) <HelpTooltip text="How many years the MRG remains in effect." /></label>
              <FormattedNumberInput
                value={formData.mrg_duration_years ?? null}
                onChange={v => updateField('mrg_duration_years', v)}
                className="h-8 text-sm"
                placeholder="e.g. 15"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Trigger Conditions <HelpTooltip text="The conditions under which the MRG payment is activated." /></label>
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
        <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
          <Label className="text-sm font-medium text-foreground">Availability Payments</Label>
          <p className="text-xs text-muted-foreground">Government makes regular payments for making infrastructure available, regardless of actual usage. Payments are subject to service quality conditions.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Annual Payment Amount (USD) <HelpTooltip text="The fixed annual payment made by government for infrastructure availability." /></label>
              <FormattedNumberInput
                value={formData.availability_payment_amount ?? null}
                onChange={v => updateField('availability_payment_amount', v)}
                className="h-8 text-sm"
                placeholder="e.g. 2,000,000"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Duration (years) <HelpTooltip text="Length of the availability payment contract period." /></label>
              <FormattedNumberInput
                value={formData.availability_payment_duration_years ?? null}
                onChange={v => updateField('availability_payment_duration_years', v)}
                className="h-8 text-sm"
                placeholder="e.g. 20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Payment Conditions <HelpTooltip text="Conditions under which availability payments are made or deducted." /></label>
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
            {PPP_CONTRACT_TYPES.map(ct => (
              <SelectItem key={ct.value} value={ct.value}>
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{ct.code}</span>
                  <span>{ct.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conditional PPP Contract Detail Fields */}
      {formData.ppp_contract_type && (
        <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
          <Label className="text-sm font-medium text-foreground">
            {PPP_CONTRACT_TYPE_LABELS[formData.ppp_contract_type as string] || 'Contract'} Details
          </Label>

          {(formData.ppp_contract_type === 'bot' || formData.ppp_contract_type === 'bto') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Transfer Date <HelpTooltip text="When asset ownership transfers to the government." /></label>
                <DatePicker
                  value={formData.ppp_contract_details?.transfer_date || ''}
                  onChange={v => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), transfer_date: v || null })}
                  placeholder="Pick transfer date"
                />
              </div>
              {formData.ppp_contract_type === 'bot' && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Concession Period (years) <HelpTooltip text="Duration the private operator runs the facility before transferring to government." /></label>
                    <FormattedNumberInput
                      value={formData.ppp_contract_details?.concession_period_years ?? null}
                      onChange={v => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), concession_period_years: v })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground">Transfer Conditions <HelpTooltip text="Terms and conditions governing the asset transfer." /></label>
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
                  <label className="text-xs text-muted-foreground">Operating Period (years) <HelpTooltip text="Duration the builder operates the asset after transferring ownership." /></label>
                  <FormattedNumberInput
                    value={formData.ppp_contract_details?.operating_period_years ?? null}
                    onChange={v => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), operating_period_years: v })}
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {formData.ppp_contract_type === 'boo' && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Perpetuity Terms <HelpTooltip text="Terms governing indefinite private ownership and operation." /></label>
                <Textarea
                  value={formData.ppp_contract_details?.perpetuity_terms || ''}
                  onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), perpetuity_terms: e.target.value })}
                  rows={2} className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Purchase Option Terms <HelpTooltip text="Government option to acquire the asset at a future date." /></label>
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
                <label className="text-xs text-muted-foreground">Lease Period (years) <HelpTooltip text="Duration of the government lease-back arrangement." /></label>
                <FormattedNumberInput
                  value={formData.ppp_contract_details?.lease_period_years ?? null}
                  onChange={v => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), lease_period_years: v })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Lease Payment Terms <HelpTooltip text="Schedule and conditions for lease payments." /></label>
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
              <label className="text-xs text-muted-foreground">Contract Period (years) <HelpTooltip text="Duration of the operations and maintenance contract." /></label>
              <FormattedNumberInput
                value={formData.ppp_contract_details?.contract_period_years ?? null}
                onChange={v => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), contract_period_years: v })}
                className="h-8 text-sm w-40"
              />
            </div>
          )}

          {formData.ppp_contract_type === 'availability_payment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Service Level KPIs <HelpTooltip text="Key Performance Indicators the private partner must meet to receive full availability payments (e.g. uptime %, response times, safety standards)." /></label>
                <Textarea
                  value={formData.ppp_contract_details?.service_level_kpis || ''}
                  onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), service_level_kpis: e.target.value })}
                  rows={2} className="text-sm" placeholder="Define key performance indicators..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Payment Schedule <HelpTooltip text="How frequently availability payments are made to the private partner." /></label>
                <Select
                  value={formData.ppp_contract_details?.payment_schedule_type || ''}
                  onValueChange={v => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), payment_schedule_type: v })}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_SCHEDULE_TYPES.map(ps => (
                      <SelectItem key={ps.value} value={ps.value}>
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{ps.code}</span>
                          <span>{ps.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Performance Deduction Terms <HelpTooltip text="Rules for reducing availability payments when KPIs are not met (e.g. deduction percentages, grace periods, cure periods)." /></label>
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
                <label className="text-xs text-muted-foreground">Custom Type Description <HelpTooltip text="Describe the non-standard PPP contract type being used." /></label>
                <Input
                  value={formData.ppp_contract_details?.custom_type_description || ''}
                  onChange={e => updateField('ppp_contract_details', { ...(formData.ppp_contract_details || {}), custom_type_description: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Custom Terms <HelpTooltip text="Key contractual terms and conditions for this non-standard arrangement." /></label>
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
        <FormattedNumberInput
          value={formData.equity_ratio ?? null}
          onChange={v => updateField('equity_ratio', v)}
          placeholder="e.g. 25"
          decimals={1}
          min={0}
          max={100}
          className="w-40"
        />
      </div>

      {/* Equity ratio compliance warning */}
      {equityResult && !equityResult.passed && (
        <div className={cn(
          "flex items-start gap-2 p-3 rounded-lg border text-sm",
          equityResult.enforcement === 'enforce'
            ? "bg-destructive/10 border-red-200 text-red-800"
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

      {/* Budget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Budget Allocation Status <HelpTooltip text="Current status of government budget allocation for this project. Indicates whether funds have been requested, approved, or are already in the budget." /></Label>
          <Select value={formData.budget_allocation_status || ''} onValueChange={v => updateField('budget_allocation_status', v)}>
            <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
            <SelectContent>
              {BUDGET_ALLOCATION_STATUSES.map(bs => (
                <SelectItem key={bs.value} value={bs.value}>
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{bs.code}</span>
                    <span>{bs.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Budget Amount (USD) <HelpTooltip text="Total government budget allocated or requested for this project, in US dollars." /></Label>
          <FormattedNumberInput
            value={formData.budget_amount ?? null}
            onChange={v => updateField('budget_amount', v)}
            placeholder="e.g. 10,000,000"
            decimals={2}
          />
        </div>
      </div>

      {/* DAP Compliance */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch
            checked={formData.dap_compliant || false}
            onCheckedChange={v => updateField('dap_compliant', v)}
          />
          <Label>Development Assistance Policy (DAP) Compliant <HelpTooltip text="Whether this project meets the requirements of the national Development Assistance Policy. DAP ensures that development assistance is aligned with national priorities, is transparently managed, and follows proper procurement and environmental safeguards." /></Label>
        </div>
        <Textarea
          value={formData.dap_notes || ''}
          onChange={e => updateField('dap_notes', e.target.value)}
          placeholder="Explain how this project meets DAP requirements, or describe any exceptions..."
          rows={2}
        />
        <div>
          <Label className="mb-2 block text-xs text-muted-foreground">Upload DAP compliance justification or supporting evidence</Label>
          <DocumentUploadZone
            projectId={projectId}
            stage="vgf_assessment"
            documents={documents.filter(d => d.document_type === 'dap_compliance' || d.document_type === 'other')}
            onDocumentsChange={refreshDocuments}
            acceptedTypes={['dap_compliance', 'other']}
          />
        </div>
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
