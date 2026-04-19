"use client"

import { Input } from '@/components/ui/input';
import { FormattedNumberInput } from './FormattedNumberInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { GOV_PROCUREMENT_METHODS, BUDGET_ALLOCATION_STATUSES } from '@/lib/project-bank-utils';
import { DocumentUploadZone } from './DocumentUploadZone';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import { HelpTooltip } from './HelpTooltip';
import { cn } from '@/lib/utils';

interface StageGovernmentBudgetProps {
  wizard: UseAppraisalWizardReturn;
}

const CHECKLIST_ITEMS = [
  { key: 'budget_requested', label: 'Budget requested' },
  { key: 'agency_confirmed', label: 'Implementation agency confirmed' },
  { key: 'procurement_plan_ready', label: 'Procurement plan ready' },
];

export function StageGovernmentBudget({ wizard }: StageGovernmentBudgetProps) {
  const { formData, updateField, projectId, documents, refreshDocuments, isLocked } = wizard;

  // Checklist state stored in gov_structuring_data
  const checklist = formData.gov_structuring_data?.checklist || {};
  const updateChecklist = (key: string, value: boolean) => {
    updateField('gov_structuring_data', {
      ...(formData.gov_structuring_data || {}),
      checklist: { ...checklist, [key]: value },
    });
  };

  const completedItems = CHECKLIST_ITEMS.filter(item => checklist[item.key]).length;
  const readinessPercent = Math.round((completedItems / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className={cn('space-y-6', isLocked && 'pointer-events-none opacity-60')}>
      <div>
        <h3 className="text-lg font-semibold mb-1">Government Budget Structuring</h3>
        <p className="text-body text-muted-foreground">
          Prepare this project for government budget funding — confirm budget allocation, implementation agency, and procurement approach.
        </p>
      </div>

      {/* Budget Allocation */}
      <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
        <Label className="text-body font-medium text-foreground">Budget Allocation</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-helper text-muted-foreground">Budget Source <HelpTooltip text="The government budget source (e.g. Union Budget, State/Region Budget, Special Fund)." /></label>
            <Input
              value={formData.budget_source || ''}
              onChange={e => updateField('budget_source', e.target.value)}
              className="h-8 text-body"
              placeholder="e.g. Union Budget, State Budget"
            />
          </div>
          <div>
            <label className="text-helper text-muted-foreground">Fiscal Year <HelpTooltip text="The fiscal year in which the budget is allocated." /></label>
            <Input
              value={formData.budget_fiscal_year || ''}
              onChange={e => updateField('budget_fiscal_year', e.target.value)}
              className="h-8 text-body"
              placeholder="e.g. FY 2026-27"
            />
          </div>
          <div>
            <label className="text-helper text-muted-foreground">Budget Allocation Status <HelpTooltip text="Current status of the budget allocation process." /></label>
            <Select value={formData.budget_allocation_status || ''} onValueChange={v => updateField('budget_allocation_status', v)}>
              <SelectTrigger className="h-8 text-body"><SelectValue placeholder="Select status..." /></SelectTrigger>
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
            <label className="text-helper text-muted-foreground">Budget Amount (USD) <HelpTooltip text="Total budget amount requested or allocated." /></label>
            <FormattedNumberInput
              value={formData.budget_amount ?? null}
              onChange={v => updateField('budget_amount', v)}
              placeholder="e.g. 10,000,000"
              decimals={2}
              className="h-8 text-body"
            />
          </div>
          <div>
            <label className="text-helper text-muted-foreground">Annual Operating Cost (USD) <HelpTooltip text="Expected annual operating and maintenance cost once the project is completed." /></label>
            <FormattedNumberInput
              value={formData.annual_operating_cost ?? null}
              onChange={v => updateField('annual_operating_cost', v)}
              placeholder="e.g. 500,000"
              decimals={2}
              className="h-8 text-body"
            />
          </div>
        </div>
      </div>

      {/* Implementation */}
      <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
        <Label className="text-body font-medium text-foreground">Implementation</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 md:col-span-2">
            <Switch
              checked={formData.implementation_agency_confirmed || false}
              onCheckedChange={v => updateField('implementation_agency_confirmed', v)}
            />
            <Label>Implementation Agency Confirmed <HelpTooltip text="Whether the implementing ministry/agency has been confirmed and has capacity." /></Label>
          </div>
          <div>
            <label className="text-helper text-muted-foreground">Implementing Agency <HelpTooltip text="Name of the ministry or agency responsible for implementation." /></label>
            <Input
              value={formData.implementing_agency || ''}
              onChange={e => updateField('implementing_agency', e.target.value)}
              className="h-8 text-body"
              placeholder="e.g. Ministry of Construction"
            />
          </div>
          <div>
            <label className="text-helper text-muted-foreground">Procurement Method <HelpTooltip text="The government procurement method to be used." /></label>
            <Select value={formData.procurement_method_gov || ''} onValueChange={v => updateField('procurement_method_gov', v)}>
              <SelectTrigger className="h-8 text-body"><SelectValue placeholder="Select method..." /></SelectTrigger>
              <SelectContent>
                {GOV_PROCUREMENT_METHODS.map(m => (
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
          <div className="md:col-span-2">
            <label className="text-helper text-muted-foreground">Maintenance Responsibility <HelpTooltip text="Who will be responsible for ongoing maintenance after construction." /></label>
            <Textarea
              value={formData.maintenance_responsibility || ''}
              onChange={e => updateField('maintenance_responsibility', e.target.value)}
              rows={2} className="text-body"
              placeholder="Describe the agency/department responsible for maintenance..."
            />
          </div>
        </div>
      </div>

      {/* Cost Recovery */}
      <div className="space-y-3">
        <Label>Cost Recovery</Label>
        <div>
          <label className="text-helper text-muted-foreground">Cost Recovery Mechanism <HelpTooltip text="How the government intends to recover costs (e.g. user charges, fees, budget allocation)." /></label>
          <Textarea
            value={formData.cost_recovery_mechanism || ''}
            onChange={e => updateField('cost_recovery_mechanism', e.target.value)}
            rows={2} className="text-body"
            placeholder="Describe the cost recovery mechanism..."
          />
        </div>
        <div>
          <label className="text-helper text-muted-foreground">Handover Timeline <HelpTooltip text="Expected timeline for commissioning and handover to the operating agency." /></label>
          <Textarea
            value={formData.handover_timeline || ''}
            onChange={e => updateField('handover_timeline', e.target.value)}
            rows={2} className="text-body"
            placeholder="Describe the expected handover schedule..."
          />
        </div>
      </div>

      {/* Readiness Checklist */}
      <div>
        <Label className="mb-2 block">Budget Readiness Checklist <HelpTooltip text="Track key milestones required before the project can proceed with government budget funding." /></Label>
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map(item => (
            <div key={item.key} className="flex items-center gap-2">
              <Checkbox
                checked={checklist[item.key] || false}
                onCheckedChange={(v) => updateChecklist(item.key, !!v)}
              />
              <span className="text-body">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-helper text-muted-foreground">Readiness</span>
            <span className="text-helper font-medium">{completedItems}/{CHECKLIST_ITEMS.length} ({readinessPercent}%)</span>
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
          acceptedTypes={['budget_estimate', 'dap_compliance', 'terms_of_reference', 'other']}
        />
      </div>
    </div>
  );
}
