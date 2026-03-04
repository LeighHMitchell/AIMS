"use client"

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUploadZone } from './DocumentUploadZone';
import { HelpTooltip } from './HelpTooltip';
import { FieldCheck } from './FieldCheck';
import { DatePicker } from '@/components/ui/date-picker';
import { StageFIRR } from './StageFIRR';
import { StageEIRR } from './StageEIRR';
import { FS2RiskRegisterTable } from './FS2RiskRegisterTable';
import { FS2MilestoneTable } from './FS2MilestoneTable';
import { FormattedNumberInput } from './FormattedNumberInput';
import { FS2AssignmentPanel } from '@/components/project-bank/fs2/FS2AssignmentPanel';
import { apiFetch } from '@/lib/api-fetch';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import type { FS2Tab, FS2Assignment } from '@/types/project-bank';
import { cn } from '@/lib/utils';
import { UserCircle, Calendar, Clock, Check } from 'lucide-react';

function RequiredDot() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" />;
}

interface StageDetailedFSProps {
  wizard: UseAppraisalWizardReturn;
}

export function StageDetailedFS({ wizard }: StageDetailedFSProps) {
  const {
    formData, updateField, errors, projectId, documents, refreshDocuments,
    fs2ActiveTab, setFs2ActiveTab, updateFS2Field, isLocked,
  } = wizard;

  const sd = formData.fs2_study_data || {};

  const { projectStage } = wizard;

  // Load assignment info for the banner
  const [assignment, setAssignment] = useState<FS2Assignment | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  useEffect(() => {
    if (!projectId) { setAssignmentLoading(false); return; }
    async function fetch() {
      try {
        const res = await apiFetch(`/api/project-bank/${projectId}/fs2-assignment`);
        if (res.ok) setAssignment(await res.json());
      } catch { /* no assignment */ }
      finally { setAssignmentLoading(false); }
    }
    fetch();
  }, [projectId]);

  const handleTabChange = (tab: string) => {
    setFs2ActiveTab(tab as FS2Tab);
  };

  // If the project is in fs2_assigned and there's no assignment yet, show the assignment panel
  const needsAssignment = !assignmentLoading && !assignment && projectStage === 'fs2_assigned';

  return (
    <div className={cn('space-y-6', isLocked && 'pointer-events-none opacity-60')}>
      <div>
        <h3 className="text-lg font-semibold mb-1">Detailed Feasibility Study</h3>
        <p className="text-sm text-muted-foreground">
          In-depth analysis covering demand, technical design, financial viability, environmental impact, risk, and implementation planning.
        </p>
      </div>

      {/* Assignment panel — shown when consultant hasn't been assigned yet */}
      {needsAssignment && projectId && (
        <FS2AssignmentPanel
          projectId={projectId}
          feasibilityStage={projectStage}
          onUpdated={() => window.location.reload()}
        />
      )}

      {/* Assignment status banner — compact display once assigned */}
      {assignment && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
          <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-medium">{assignment.assigned_to}</span>
            {assignment.deadline && (
              <span className="text-muted-foreground ml-2">
                <Calendar className="inline h-3 w-3 mr-0.5" />
                Due {new Date(assignment.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {assignment.status === 'completed' && <Check className="h-3 w-3 text-green-600" />}
            {assignment.status === 'in_progress' && <Clock className="h-3 w-3 text-blue-600" />}
            <span className="capitalize text-muted-foreground">{assignment.status.replace(/_/g, ' ')}</span>
          </div>
        </div>
      )}

      {/* FS-2 Document upload */}
      <div>
        <Label className="mb-2 block">
          Detailed Feasibility Study Report & Documents
          <HelpTooltip text="Upload the detailed FS report and supporting documents. A detailed FS report is required for submission." />
        </Label>
        <DocumentUploadZone
          projectId={projectId}
          stage="detailed_fs"
          documents={documents}
          onDocumentsChange={refreshDocuments}
          acceptedTypes={['detailed_fs_report', 'cost_benefit_analysis', 'technical_design', 'environmental_impact_assessment', 'risk_allocation_matrix', 'other']}
        />
      </div>

      {/* 8-Tab Form */}
      <Tabs value={fs2ActiveTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="demand">Demand</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="economic">Economic</TabsTrigger>
          <TabsTrigger value="environmental">Environmental</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="implementation">Implementation</TabsTrigger>
        </TabsList>

        {/* ═══ Tab 1: Study Overview ═══ */}
        <TabsContent value="overview" className="space-y-4 mt-4" id="section-fs2-overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Study Date <RequiredDot /> <HelpTooltip text="When the detailed feasibility study was completed." /></Label>
              <div className="max-w-xs">
                <DatePicker
                  value={sd.study_date || ''}
                  onChange={v => updateFS2Field('study_date', v || null)}
                  placeholder="Pick date"
                />
              </div>
              {errors.study_date && <p className="text-xs text-red-500 mt-1">{errors.study_date}</p>}
            </div>
            <div>
              <Label>Conducted By <RequiredDot /></Label>
              <Select value={sd.conductor_type || ''} onValueChange={v => updateFS2Field('conductor_type', v)} disabled={isLocked}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Consultant</SelectItem>
                  <SelectItem value="company">Consulting Firm / Company</SelectItem>
                </SelectContent>
              </Select>
              {errors.conductor_type && <p className="text-xs text-red-500 mt-1">{errors.conductor_type}</p>}
            </div>
          </div>

          <div>
            <Label>Scope of Study <FieldCheck value={sd.scope} /> <HelpTooltip text="Describe the scope and terms of reference for the detailed study." /></Label>
            <Textarea
              value={sd.scope || ''}
              onChange={e => updateFS2Field('scope', e.target.value)}
              placeholder="Describe the scope and terms of reference..."
              rows={3}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Methodology <FieldCheck value={sd.methodology} /> <HelpTooltip text="Describe the analytical methodology employed in the study." /></Label>
            <Textarea
              value={sd.methodology || ''}
              onChange={e => updateFS2Field('methodology', e.target.value)}
              placeholder="Analytical methodology, data sources, models used..."
              rows={3}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Key Findings <FieldCheck value={sd.key_findings} /> <HelpTooltip text="Summarise the most important findings and conclusions of the study." /></Label>
            <Textarea
              value={sd.key_findings || ''}
              onChange={e => updateFS2Field('key_findings', e.target.value)}
              placeholder="Summarise key findings and conclusions..."
              rows={4}
              disabled={isLocked}
            />
          </div>
        </TabsContent>

        {/* ═══ Tab 2: Demand Analysis ═══ */}
        <TabsContent value="demand" className="space-y-4 mt-4" id="section-fs2-demand">
          <div>
            <Label>Demand Methodology <RequiredDot /> <FieldCheck value={sd.demand_methodology} /> <HelpTooltip text="How was demand estimated? e.g. surveys, traffic counts, population projections." /></Label>
            <Textarea
              value={sd.demand_methodology || ''}
              onChange={e => updateFS2Field('demand_methodology', e.target.value)}
              placeholder="Describe the demand forecasting methodology..."
              rows={3}
              disabled={isLocked}
            />
            {errors.demand_methodology && <p className="text-xs text-red-500 mt-1">{errors.demand_methodology}</p>}
          </div>

          <div>
            <Label>Baseline Demand <FieldCheck value={sd.demand_baseline} /> <HelpTooltip text="Current demand baseline — existing usage or service levels." /></Label>
            <Textarea
              value={sd.demand_baseline || ''}
              onChange={e => updateFS2Field('demand_baseline', e.target.value)}
              placeholder="Describe current baseline demand..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Growth Rate (% p.a.) <FieldCheck value={sd.demand_growth_rate} /> <HelpTooltip text="Expected annual growth in demand." /></Label>
              <Input
                type="number"
                step="0.1"
                value={sd.demand_growth_rate ?? ''}
                onChange={e => updateFS2Field('demand_growth_rate', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 5.0"
                disabled={isLocked}
              />
            </div>
            <div>
              <Label>Market Size <FieldCheck value={sd.market_size} /> <HelpTooltip text="Estimated total addressable market or service area population." /></Label>
              <Input
                value={sd.market_size || ''}
                onChange={e => updateFS2Field('market_size', e.target.value)}
                placeholder="e.g. 2.5 million potential users"
                disabled={isLocked}
              />
            </div>
          </div>

          <div>
            <Label>Forecast Summary <FieldCheck value={sd.forecast_summary} /> <HelpTooltip text="Summary of demand projections over the project life." /></Label>
            <Textarea
              value={sd.forecast_summary || ''}
              onChange={e => updateFS2Field('forecast_summary', e.target.value)}
              placeholder="Projected demand over the project life..."
              rows={3}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Willingness to Pay <FieldCheck value={sd.willingness_to_pay} /> <HelpTooltip text="Findings on users' willingness and ability to pay for services." /></Label>
            <Textarea
              value={sd.willingness_to_pay || ''}
              onChange={e => updateFS2Field('willingness_to_pay', e.target.value)}
              placeholder="Describe willingness-to-pay analysis..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Tariff / Pricing Structure <FieldCheck value={sd.tariff_structure} /> <HelpTooltip text="Proposed tariff or pricing structure and rationale." /></Label>
            <Textarea
              value={sd.tariff_structure || ''}
              onChange={e => updateFS2Field('tariff_structure', e.target.value)}
              placeholder="Proposed pricing/tariff structure..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <DocumentUploadZone
            projectId={projectId}
            stage="detailed_fs_demand"
            documents={documents}
            onDocumentsChange={refreshDocuments}
            acceptedTypes={['market_assessment', 'other']}
          />
        </TabsContent>

        {/* ═══ Tab 3: Technical Analysis ═══ */}
        <TabsContent value="technical" className="space-y-4 mt-4" id="section-fs2-technical">
          <div>
            <Label>Engineering Approach <FieldCheck value={sd.engineering_approach} /> <HelpTooltip text="Describe the proposed engineering approach and design philosophy." /></Label>
            <Textarea
              value={sd.engineering_approach || ''}
              onChange={e => updateFS2Field('engineering_approach', e.target.value)}
              placeholder="Describe the engineering approach..."
              rows={3}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Design Standards <FieldCheck value={sd.design_standards} /> <HelpTooltip text="Which design codes, standards, and specifications apply?" /></Label>
            <Textarea
              value={sd.design_standards || ''}
              onChange={e => updateFS2Field('design_standards', e.target.value)}
              placeholder="Applicable design codes and standards..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Technology Choice <FieldCheck value={sd.technology_choice} /> <HelpTooltip text="Key technology choices, equipment, and materials." /></Label>
            <Textarea
              value={sd.technology_choice || ''}
              onChange={e => updateFS2Field('technology_choice', e.target.value)}
              placeholder="Technology selection and rationale..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Construction Methodology <FieldCheck value={sd.construction_methodology} /> <HelpTooltip text="Proposed construction methods and phasing." /></Label>
            <Textarea
              value={sd.construction_methodology || ''}
              onChange={e => updateFS2Field('construction_methodology', e.target.value)}
              placeholder="Construction methods and phasing..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Technical Specifications <FieldCheck value={sd.technical_specifications} /> <HelpTooltip text="Key technical specifications and design parameters." /></Label>
            <Textarea
              value={sd.technical_specifications || ''}
              onChange={e => updateFS2Field('technical_specifications', e.target.value)}
              placeholder="Key specifications and parameters..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Site Conditions <FieldCheck value={sd.site_conditions} /> <HelpTooltip text="Describe site conditions including geotechnical, topography, access." /></Label>
            <Textarea
              value={sd.site_conditions || ''}
              onChange={e => updateFS2Field('site_conditions', e.target.value)}
              placeholder="Site conditions, geotechnical findings..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <DocumentUploadZone
            projectId={projectId}
            stage="detailed_fs_technical"
            documents={documents}
            onDocumentsChange={refreshDocuments}
            acceptedTypes={['technical_design', 'site_map', 'other']}
          />
        </TabsContent>

        {/* ═══ Tab 4: Financial Analysis ═══ */}
        <TabsContent value="financial" className="space-y-4 mt-4" id="section-fs2-financial">
          <p className="text-sm text-muted-foreground">
            Update the cost breakdown and financing plan. The FIRR calculator below uses the refined cost table data.
          </p>

          {/* Cost breakdown summary fields */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Land Costs <FieldCheck value={sd.cost_land} /></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">USD</span>
                <FormattedNumberInput
                  value={sd.cost_land ?? null}
                  onChange={v => updateFS2Field('cost_land', v)}
                  placeholder="0"
                  decimals={2}
                  className="pl-11"
                />
              </div>
            </div>
            <div>
              <Label>Civil Works <FieldCheck value={sd.cost_civil} /></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">USD</span>
                <FormattedNumberInput
                  value={sd.cost_civil ?? null}
                  onChange={v => updateFS2Field('cost_civil', v)}
                  placeholder="0"
                  decimals={2}
                  className="pl-11"
                />
              </div>
            </div>
            <div>
              <Label>Equipment <FieldCheck value={sd.cost_equipment} /></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">USD</span>
                <FormattedNumberInput
                  value={sd.cost_equipment ?? null}
                  onChange={v => updateFS2Field('cost_equipment', v)}
                  placeholder="0"
                  decimals={2}
                  className="pl-11"
                />
              </div>
            </div>
            <div>
              <Label>Consultancy <FieldCheck value={sd.cost_consultancy} /></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">USD</span>
                <FormattedNumberInput
                  value={sd.cost_consultancy ?? null}
                  onChange={v => updateFS2Field('cost_consultancy', v)}
                  placeholder="0"
                  decimals={2}
                  className="pl-11"
                />
              </div>
            </div>
            <div>
              <Label>Contingency <FieldCheck value={sd.cost_contingency} /></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">USD</span>
                <FormattedNumberInput
                  value={sd.cost_contingency ?? null}
                  onChange={v => updateFS2Field('cost_contingency', v)}
                  placeholder="0"
                  decimals={2}
                  className="pl-11"
                />
              </div>
            </div>
            <div>
              <Label>Other Costs <FieldCheck value={sd.cost_other} /></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">USD</span>
                <FormattedNumberInput
                  value={sd.cost_other ?? null}
                  onChange={v => updateFS2Field('cost_other', v)}
                  placeholder="0"
                  decimals={2}
                  className="pl-11"
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Financing Plan <FieldCheck value={sd.financing_plan} /> <HelpTooltip text="How will the project be financed? e.g. equity, debt, government contribution." /></Label>
            <Textarea
              value={sd.financing_plan || ''}
              onChange={e => updateFS2Field('financing_plan', e.target.value)}
              placeholder="Describe the financing structure..."
              rows={3}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Financial Assumptions <FieldCheck value={sd.financial_assumptions} /> <HelpTooltip text="Key assumptions used in the financial analysis." /></Label>
            <Textarea
              value={sd.financial_assumptions || ''}
              onChange={e => updateFS2Field('financial_assumptions', e.target.value)}
              placeholder="Key assumptions: discount rate, inflation, exchange rate..."
              rows={3}
              disabled={isLocked}
            />
          </div>

          {/* Embedded StageFIRR */}
          <div className="border-t pt-4">
            <StageFIRR wizard={wizard} />
          </div>
        </TabsContent>

        {/* ═══ Tab 5: Economic Analysis ═══ */}
        <TabsContent value="economic" className="space-y-4 mt-4" id="section-fs2-economic">
          <div>
            <Label>Economic Methodology <FieldCheck value={sd.economic_methodology} /> <HelpTooltip text="Methodology for the economic analysis — CBA, shadow pricing approach, etc." /></Label>
            <Textarea
              value={sd.economic_methodology || ''}
              onChange={e => updateFS2Field('economic_methodology', e.target.value)}
              placeholder="Economic analysis methodology..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Externalities <FieldCheck value={sd.externalities} /> <HelpTooltip text="Positive and negative externalities identified." /></Label>
            <Textarea
              value={sd.externalities || ''}
              onChange={e => updateFS2Field('externalities', e.target.value)}
              placeholder="Describe externalities (positive and negative)..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Socio-Economic Benefits <FieldCheck value={sd.socio_economic_benefits} /> <HelpTooltip text="Key social and economic benefits beyond financial returns." /></Label>
            <Textarea
              value={sd.socio_economic_benefits || ''}
              onChange={e => updateFS2Field('socio_economic_benefits', e.target.value)}
              placeholder="Socio-economic benefits: employment, poverty reduction, etc..."
              rows={3}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Shadow Price Notes <FieldCheck value={sd.shadow_price_notes} /> <HelpTooltip text="Notes on shadow prices used or adjustments made to the economic analysis." /></Label>
            <Textarea
              value={sd.shadow_price_notes || ''}
              onChange={e => updateFS2Field('shadow_price_notes', e.target.value)}
              placeholder="Notes on shadow pricing assumptions..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          {/* Embedded StageEIRR */}
          <div className="border-t pt-4">
            <StageEIRR wizard={wizard} />
          </div>
        </TabsContent>

        {/* ═══ Tab 6: Environmental & Social ═══ */}
        <TabsContent value="environmental" className="space-y-4 mt-4" id="section-fs2-environmental">
          <div>
            <Label>EIA Category <FieldCheck value={sd.eia_category} /> <HelpTooltip text="Environmental Impact Assessment category: A (full EIA), B (initial environmental examination), C (no EIA required)." /></Label>
            <Select value={sd.eia_category || ''} onValueChange={v => updateFS2Field('eia_category', v)} disabled={isLocked}>
              <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select category..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Category A — Full Environmental Impact Assessment</SelectItem>
                <SelectItem value="B">Category B — Initial Environmental Examination</SelectItem>
                <SelectItem value="C">Category C — No EIA Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Environmental Findings <FieldCheck value={sd.environmental_findings} /> <HelpTooltip text="Key environmental findings from the assessment." /></Label>
            <Textarea
              value={sd.environmental_findings || ''}
              onChange={e => updateFS2Field('environmental_findings', e.target.value)}
              placeholder="Key environmental findings..."
              rows={3}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Mitigation Measures <FieldCheck value={sd.environmental_mitigation} /> <HelpTooltip text="Proposed environmental mitigation and management measures." /></Label>
            <Textarea
              value={sd.environmental_mitigation || ''}
              onChange={e => updateFS2Field('environmental_mitigation', e.target.value)}
              placeholder="Environmental mitigation measures..."
              rows={3}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Resettlement Plan <FieldCheck value={sd.resettlement_plan} /> <HelpTooltip text="Summary of resettlement action plan if displacement is required." /></Label>
            <Textarea
              value={sd.resettlement_plan || ''}
              onChange={e => updateFS2Field('resettlement_plan', e.target.value)}
              placeholder="Resettlement plan summary (if applicable)..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Grievance Mechanism <FieldCheck value={sd.grievance_mechanism} /> <HelpTooltip text="How will affected parties raise concerns and seek redress?" /></Label>
            <Textarea
              value={sd.grievance_mechanism || ''}
              onChange={e => updateFS2Field('grievance_mechanism', e.target.value)}
              placeholder="Describe the grievance redress mechanism..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <DocumentUploadZone
            projectId={projectId}
            stage="detailed_fs_environmental"
            documents={documents}
            onDocumentsChange={refreshDocuments}
            acceptedTypes={['environmental_impact_assessment', 'social_impact_assessment', 'resettlement_plan', 'other']}
          />
        </TabsContent>

        {/* ═══ Tab 7: Risk Assessment ═══ */}
        <TabsContent value="risk" className="space-y-4 mt-4" id="section-fs2-risk">
          <div>
            <Label className="mb-2 block">Risk Register <HelpTooltip text="Identify and assess key project risks with mitigation strategies." /></Label>
            <FS2RiskRegisterTable
              rows={sd.risk_register || []}
              onChange={rows => updateFS2Field('risk_register', rows)}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Overall Risk Rating <FieldCheck value={sd.overall_risk_rating} /> <HelpTooltip text="Overall risk assessment: low, medium, or high." /></Label>
            <Select value={sd.overall_risk_rating || ''} onValueChange={v => updateFS2Field('overall_risk_rating', v)} disabled={isLocked}>
              <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select rating..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DocumentUploadZone
            projectId={projectId}
            stage="detailed_fs_risk"
            documents={documents}
            onDocumentsChange={refreshDocuments}
            acceptedTypes={['risk_allocation_matrix', 'other']}
          />
        </TabsContent>

        {/* ═══ Tab 8: Implementation ═══ */}
        <TabsContent value="implementation" className="space-y-4 mt-4" id="section-fs2-implementation">
          <div>
            <Label>Procurement Strategy <FieldCheck value={sd.procurement_strategy} /> <HelpTooltip text="Proposed procurement approach and method." /></Label>
            <Textarea
              value={sd.procurement_strategy || ''}
              onChange={e => updateFS2Field('procurement_strategy', e.target.value)}
              placeholder="Procurement strategy and method..."
              rows={3}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Institutional Arrangements <FieldCheck value={sd.institutional_arrangements} /> <HelpTooltip text="Describe the institutional setup for project implementation." /></Label>
            <Textarea
              value={sd.institutional_arrangements || ''}
              onChange={e => updateFS2Field('institutional_arrangements', e.target.value)}
              placeholder="Institutional arrangements and oversight..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label className="mb-2 block">Implementation Milestones <HelpTooltip text="Key phases and milestones for project implementation." /></Label>
            <FS2MilestoneTable
              rows={sd.milestones || []}
              onChange={rows => updateFS2Field('milestones', rows)}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>Capacity Building <FieldCheck value={sd.capacity_building} /> <HelpTooltip text="Training, knowledge transfer, and institutional capacity building required." /></Label>
            <Textarea
              value={sd.capacity_building || ''}
              onChange={e => updateFS2Field('capacity_building', e.target.value)}
              placeholder="Capacity building requirements..."
              rows={2}
              disabled={isLocked}
            />
          </div>

          <div>
            <Label>M&E Framework <FieldCheck value={sd.me_framework} /> <HelpTooltip text="Monitoring and evaluation framework — indicators, reporting, review schedule." /></Label>
            <Textarea
              value={sd.me_framework || ''}
              onChange={e => updateFS2Field('me_framework', e.target.value)}
              placeholder="Monitoring and evaluation framework..."
              rows={3}
              disabled={isLocked}
            />
          </div>
        </TabsContent>
      </Tabs>

      {errors._form && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">{errors._form}</p>
      )}
    </div>
  );
}
