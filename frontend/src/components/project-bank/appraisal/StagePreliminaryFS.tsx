"use client"

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { CashFlowTable } from './CashFlowTable';
import { DocumentUploadZone } from './DocumentUploadZone';
import { HelpTooltip } from './HelpTooltip';
import { DatePicker } from '@/components/ui/date-picker';
import { IMPACT_LEVELS, TECHNICAL_MATURITY_LEVELS } from '@/lib/project-bank-utils';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import type { CostTableRow } from '@/types/project-bank';

function RequiredDot() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" />;
}

interface StagePreliminaryFSProps {
  wizard: UseAppraisalWizardReturn;
}

export function StagePreliminaryFS({ wizard }: StagePreliminaryFSProps) {
  const { formData, updateField, errors, projectId, documents, refreshDocuments } = wizard;
  const [activeTab, setActiveTab] = useState('technical');

  const startYear = formData.estimated_start_date
    ? new Date(formData.estimated_start_date).getFullYear()
    : new Date().getFullYear();

  // Construction period: years + months
  const constYears = formData.construction_period_years ?? '';
  const constMonths = formData.construction_period_months_remainder ?? '';
  const opYears = formData.operational_period_years ?? '';

  const updateConstructionPeriod = (years: string, months: string) => {
    const y = years === '' ? null : parseInt(years) || 0;
    const m = months === '' ? 0 : parseInt(months) || 0;
    updateField('construction_period_years', y);
    updateField('construction_period_months_remainder', m > 0 ? m : null);
    if (y !== null && formData.operational_period_years) {
      updateField('project_life_years', y + formData.operational_period_years);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Preliminary Feasibility Study</h3>
        <p className="text-sm text-muted-foreground">Technical assessment, cost estimates, revenue projections, and environmental screening.</p>
      </div>

      {/* Timeline fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Construction Period <RequiredDot /> <HelpTooltip text="How long the construction or setup phase will take." /></Label>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              min={0}
              value={constYears}
              onChange={e => {
                const v = e.target.value === '' ? null : parseInt(e.target.value) || 0;
                updateField('construction_period_years', v);
                if (v !== null && formData.operational_period_years) {
                  updateField('project_life_years', v + formData.operational_period_years);
                }
              }}
              placeholder="0"
              className="w-16"
            />
            <span className="text-xs text-muted-foreground">yrs</span>
            <Input
              type="number"
              min={0}
              max={11}
              value={constMonths}
              onChange={e => {
                const m = e.target.value === '' ? null : parseInt(e.target.value) || 0;
                updateField('construction_period_months_remainder', m && m > 0 ? m : null);
              }}
              placeholder="0"
              className="w-16"
            />
            <span className="text-xs text-muted-foreground">mos</span>
          </div>
          {errors.construction_period_years && <p className="text-xs text-red-500 mt-1">{errors.construction_period_years}</p>}
        </div>
        <div>
          <Label>Operational Period (years) <RequiredDot /> <HelpTooltip text="How long the project will operate after construction." /></Label>
          <Input
            type="number"
            value={formData.operational_period_years ?? ''}
            onChange={e => {
              const v = e.target.value ? parseInt(e.target.value) : null;
              updateField('operational_period_years', v);
              if (v && formData.construction_period_years) {
                updateField('project_life_years', v + formData.construction_period_years);
              }
            }}
            placeholder="e.g. 20"
          />
          {errors.operational_period_years && <p className="text-xs text-red-500 mt-1">{errors.operational_period_years}</p>}
        </div>
        <div>
          <Label>Project Life (years) <HelpTooltip text="Total project lifespan — auto-calculated from construction + operational periods." /></Label>
          <Input
            type="number"
            value={formData.project_life_years ?? ''}
            readOnly
            className="bg-muted/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>FS Conducted By <HelpTooltip text="The firm or individual who conducted the feasibility study." /></Label>
          <Input
            value={formData.preliminary_fs_conducted_by || ''}
            onChange={e => updateField('preliminary_fs_conducted_by', e.target.value)}
            placeholder="Firm or individual name"
          />
        </div>
        <div>
          <Label>FS Date <HelpTooltip text="When the feasibility study was completed." /></Label>
          <DatePicker
            value={formData.preliminary_fs_date || ''}
            onChange={v => updateField('preliminary_fs_date', v || null)}
            placeholder="Pick FS date"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="costs">Cost Estimates</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="environmental">Environmental</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Technical Tab */}
        <TabsContent value="technical" className="space-y-4 mt-4" id="section-technical">
          <div>
            <Label>Technical Approach <HelpTooltip text="Describe the proposed technical approach, construction methods, and key design features." /></Label>
            <Textarea
              value={formData.technical_approach || ''}
              onChange={e => updateField('technical_approach', e.target.value)}
              placeholder="Describe the proposed technical approach..."
              rows={3}
            />
          </div>
          <div>
            <Label>Technology / Methodology <HelpTooltip text="Key technologies, equipment, and methodologies to be used." /></Label>
            <Textarea
              value={formData.technology_methodology || ''}
              onChange={e => updateField('technology_methodology', e.target.value)}
              placeholder="Key technologies and methods..."
              rows={2}
            />
          </div>
          <div>
            <Label>Technical Risks <HelpTooltip text="Key technical risks and proposed mitigation strategies." /></Label>
            <Textarea
              value={formData.technical_risks || ''}
              onChange={e => updateField('technical_risks', e.target.value)}
              placeholder="Key technical risks and mitigations..."
              rows={2}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.has_technical_design || false}
              onCheckedChange={v => updateField('has_technical_design', v)}
            />
            <Label>Technical design exists</Label>
          </div>
          {formData.has_technical_design && (
            <div>
              <Label>Design Maturity <HelpTooltip text="The level of design completion, from concept to construction-ready." /></Label>
              <Select value={formData.technical_design_maturity || ''} onValueChange={v => updateField('technical_design_maturity', v)}>
                <SelectTrigger><SelectValue placeholder="Select maturity..." /></SelectTrigger>
                <SelectContent>
                  {TECHNICAL_MATURITY_LEVELS.map(l => (
                    <SelectItem key={l.value} value={l.value}>
                      <span className="inline-flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{l.code}</span>
                        <span>{l.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </TabsContent>

        {/* Cost Estimates Tab */}
        <TabsContent value="costs" className="space-y-4 mt-4" id="section-costs">
          <div>
            <Label className="mb-2 block">Year-by-Year Cost & Revenue Table <HelpTooltip text="Enter capital expenditure, operating costs, and projected revenue for each year of the project." /></Label>
            <p className="text-xs text-muted-foreground mb-3">
              Enter CAPEX (capital expenditure), OPEX (operating costs), and projected Revenue for each year.
              Use &ldquo;Generate Years&rdquo; to auto-create rows from your construction/operational periods.
            </p>
            <CashFlowTable
              rows={formData.cost_table_data || []}
              onChange={rows => updateField('cost_table_data', rows)}
              startYear={startYear}
              constructionYears={formData.construction_period_years}
              operationalYears={formData.operational_period_years}
            />
          </div>
          <div>
            <Label>FS Summary Notes <HelpTooltip text="Key findings and conclusions from the feasibility study." /></Label>
            <Textarea
              value={formData.preliminary_fs_summary || ''}
              onChange={e => updateField('preliminary_fs_summary', e.target.value)}
              placeholder="Key findings from the preliminary feasibility study..."
              rows={3}
            />
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4 mt-4" id="section-revenue">
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.has_revenue_component || false}
              onCheckedChange={v => updateField('has_revenue_component', v)}
            />
            <Label>Project has revenue-generating component</Label>
          </div>

          {formData.has_revenue_component && (
            <>
              <div>
                <Label>Revenue Sources <HelpTooltip text="List all sources of revenue (toll fees, user charges, lease income, etc.)." /></Label>
                <Input
                  value={(formData.revenue_sources || []).join(', ')}
                  onChange={e => updateField('revenue_sources', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                  placeholder="e.g. Toll fees, User charges, Lease income"
                />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Projected Annual Users <HelpTooltip text="Estimated number of users or beneficiaries per year." /></Label>
                  <Input
                    type="number"
                    value={formData.projected_annual_users ?? ''}
                    onChange={e => updateField('projected_annual_users', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
                <div>
                  <Label>Projected Annual Revenue <HelpTooltip text="Expected annual revenue once the project is operational." /></Label>
                  <Input
                    type="number"
                    value={formData.projected_annual_revenue ?? ''}
                    onChange={e => updateField('projected_annual_revenue', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div>
                  <Label>Revenue Ramp-up (years) <HelpTooltip text="Years before revenue reaches full projected level." /></Label>
                  <Input
                    type="number"
                    value={formData.revenue_ramp_up_years ?? ''}
                    onChange={e => updateField('revenue_ramp_up_years', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="e.g. 3"
                  />
                </div>
              </div>
              <div>
                <Label>Market Assessment Summary <HelpTooltip text="Summary of demand analysis, market conditions, and revenue projections." /></Label>
                <Textarea
                  value={formData.market_assessment_summary || ''}
                  onChange={e => updateField('market_assessment_summary', e.target.value)}
                  placeholder="Summary of demand analysis and market outlook..."
                  rows={3}
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* Environmental Tab */}
        <TabsContent value="environmental" className="space-y-4 mt-4" id="section-environmental">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Environmental Impact Level <HelpTooltip text="The expected level of environmental impact from this project." /></Label>
              <Select value={formData.environmental_impact_level || ''} onValueChange={v => updateField('environmental_impact_level', v)}>
                <SelectTrigger><SelectValue placeholder="Select level..." /></SelectTrigger>
                <SelectContent>
                  {IMPACT_LEVELS.map(l => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Social Impact Level <HelpTooltip text="The expected level of social impact, including displacement and community effects." /></Label>
              <Select value={formData.social_impact_level || ''} onValueChange={v => updateField('social_impact_level', v)}>
                <SelectTrigger><SelectValue placeholder="Select level..." /></SelectTrigger>
                <SelectContent>
                  {IMPACT_LEVELS.map(l => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={formData.land_acquisition_required || false}
              onCheckedChange={v => updateField('land_acquisition_required', v)}
            />
            <Label>Land acquisition required</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={formData.resettlement_required || false}
              onCheckedChange={v => updateField('resettlement_required', v)}
            />
            <Label>Resettlement required</Label>
          </div>

          {formData.resettlement_required && (
            <div>
              <Label>Estimated Affected Households <HelpTooltip text="Number of households that may need to be resettled." /></Label>
              <Input
                type="number"
                value={formData.estimated_affected_households ?? ''}
                onChange={e => updateField('estimated_affected_households', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <DocumentUploadZone
            projectId={projectId}
            stage="preliminary_fs"
            documents={documents}
            onDocumentsChange={refreshDocuments}
            acceptedTypes={['preliminary_fs_report', 'cost_estimate', 'environmental_screening', 'other']}
          />
        </TabsContent>
      </Tabs>

      {errors._form && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">{errors._form}</p>
      )}
    </div>
  );
}
