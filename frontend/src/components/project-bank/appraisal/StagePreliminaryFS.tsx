"use client"

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { FormattedNumberInput } from './FormattedNumberInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { CashFlowTable } from './CashFlowTable';
import { DocumentUploadZone } from './DocumentUploadZone';
import { HelpTooltip } from './HelpTooltip';
import { FieldCheck } from './FieldCheck';
import { DatePicker } from '@/components/ui/date-picker';
import { StageFIRR } from './StageFIRR';
import { StageMSDPScreening } from './StageMSDPScreening';
import { IMPACT_LEVELS, TECHNICAL_MATURITY_LEVELS, REVENUE_SOURCE_OPTIONS, determineFullRouting } from '@/lib/project-bank-utils';
import { calculateFIRR } from '@/lib/eirr-calculator';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import type { FS1Tab } from '@/types/project-bank';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, ChevronsUpDown } from 'lucide-react';
import Image from 'next/image';

function RequiredDot() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" />;
}

interface StagePreliminaryFSProps {
  wizard: UseAppraisalWizardReturn;
}

export function StagePreliminaryFS({ wizard }: StagePreliminaryFSProps) {
  const { formData, updateField, errors, projectId, documents, refreshDocuments, fs1ActiveTab, setFs1ActiveTab, isLocked } = wizard;

  const startYear = formData.estimated_start_date
    ? new Date(formData.estimated_start_date).getFullYear()
    : new Date().getFullYear();

  // Construction period: free-form years + months with normalized summary
  const [constYearsLocal, setConstYearsLocal] = useState<string>(
    formData.construction_period_years != null ? String(formData.construction_period_years) : ''
  );
  const [constMonthsLocal, setConstMonthsLocal] = useState<string>(
    formData.construction_period_months_remainder != null ? String(formData.construction_period_months_remainder) : ''
  );
  const [opYearsLocal, setOpYearsLocal] = useState<string>(
    formData.operational_period_years != null ? String(formData.operational_period_years) : ''
  );
  const [opMonthsLocal, setOpMonthsLocal] = useState<string>(
    formData.operational_period_months_remainder != null ? String(formData.operational_period_months_remainder) : ''
  );

  const commitOperational = (years: string, months: string) => {
    const y = years === '' ? null : parseInt(years) || 0;
    const m = months === '' ? 0 : parseInt(months) || 0;
    const totalMonths = (y ?? 0) * 12 + m;
    const normYears = Math.floor(totalMonths / 12);
    const normMonths = totalMonths % 12;
    updateField('operational_period_years', totalMonths > 0 ? normYears : y);
    updateField('operational_period_months_remainder', normMonths > 0 ? normMonths : null);
    if (normYears > 0 && formData.construction_period_years) {
      updateField('project_life_years', normYears + formData.construction_period_years);
    }
  };

  const commitConstruction = (years: string, months: string) => {
    const y = years === '' ? null : parseInt(years) || 0;
    const m = months === '' ? 0 : parseInt(months) || 0;
    const totalMonths = (y ?? 0) * 12 + m;
    const normYears = Math.floor(totalMonths / 12);
    const normMonths = totalMonths % 12;
    updateField('construction_period_years', totalMonths > 0 ? normYears : y);
    updateField('construction_period_months_remainder', normMonths > 0 ? normMonths : null);
    if (normYears > 0 && formData.operational_period_years) {
      updateField('project_life_years', normYears + formData.operational_period_years);
    }
  };

  // Routing decision — always visible at bottom regardless of active tab
  const refinedData = formData.firr_cost_table_data || [];
  const firrResult = useMemo(() => {
    if (!refinedData.length) return null;
    return calculateFIRR(refinedData);
  }, [refinedData]);
  const ndpAligned = !!formData.ndp_aligned;
  const hasData = refinedData.some(r => (r.capex || 0) > 0 || (r.opex || 0) > 0 || (r.revenue || 0) > 0);
  const routing = determineFullRouting(firrResult?.firr ?? null, null, ndpAligned, hasData);

  const handleTabChange = (tab: string) => {
    setFs1ActiveTab(tab as FS1Tab);
    if (tab === 'revenue' && !formData.has_revenue_component) {
      updateField('has_revenue_component', true);
    }
  };

  const routingBorderColor = routing.color === 'green' ? 'border-l-green-500'
    : routing.color === 'blue' ? 'border-l-blue-500'
    : routing.color === 'amber' ? 'border-l-amber-500'
    : routing.color === 'red' ? 'border-l-red-500'
    : 'border-l-muted-foreground';

  return (
    <div className={cn('space-y-6', isLocked && 'pointer-events-none opacity-60')}>
      <div>
        <h3 className="text-lg font-semibold mb-1">Preliminary Feasibility Study</h3>
        {formData.project_code && (
          <p className="text-xs text-muted-foreground font-mono mb-1">{formData.project_code}</p>
        )}
        <p className="text-sm text-muted-foreground">Technical assessment, revenue projections, environmental screening, and financial analysis.</p>
      </div>

      {/* Timeline fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Construction Period <RequiredDot /> <HelpTooltip text="How long the construction or setup phase will take. Enter years and months freely — the total is calculated automatically." /></Label>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              min={0}
              value={constYearsLocal}
              onChange={e => {
                setConstYearsLocal(e.target.value);
                commitConstruction(e.target.value, constMonthsLocal);
              }}
              onFocus={e => setTimeout(() => e.target.select(), 0)}
              placeholder="0"
              className="w-16"
              disabled={isLocked}
            />
            <span className="text-xs text-muted-foreground">years</span>
            <Input
              type="number"
              min={0}
              value={constMonthsLocal}
              onChange={e => {
                setConstMonthsLocal(e.target.value);
                commitConstruction(constYearsLocal, e.target.value);
              }}
              onFocus={e => setTimeout(() => e.target.select(), 0)}
              placeholder="0"
              className="w-16"
              disabled={isLocked}
            />
            <span className="text-xs text-muted-foreground">months</span>
          </div>
          {errors.construction_period_years && <p className="text-xs text-red-500 mt-1">{errors.construction_period_years}</p>}
        </div>
        <div>
          <Label>Operational Period <RequiredDot /> <HelpTooltip text="How long the project will operate after construction." /></Label>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              min={0}
              value={opYearsLocal}
              onChange={e => {
                setOpYearsLocal(e.target.value);
                commitOperational(e.target.value, opMonthsLocal);
              }}
              onFocus={e => setTimeout(() => e.target.select(), 0)}
              placeholder="0"
              className="w-16"
              disabled={isLocked}
            />
            <span className="text-xs text-muted-foreground">years</span>
            <Input
              type="number"
              min={0}
              value={opMonthsLocal}
              onChange={e => {
                setOpMonthsLocal(e.target.value);
                commitOperational(opYearsLocal, e.target.value);
              }}
              onFocus={e => setTimeout(() => e.target.select(), 0)}
              placeholder="0"
              className="w-16"
              disabled={isLocked}
            />
            <span className="text-xs text-muted-foreground">months</span>
          </div>
          {errors.operational_period_years && <p className="text-xs text-red-500 mt-1">{errors.operational_period_years}</p>}
        </div>
        <div>
          <Label>Project Life <HelpTooltip text="Total project lifespan — auto-calculated from construction + operational periods." /></Label>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              value={(() => {
                const cY = parseInt(constYearsLocal) || 0;
                const cM = parseInt(constMonthsLocal) || 0;
                const oY = parseInt(opYearsLocal) || 0;
                const oM = parseInt(opMonthsLocal) || 0;
                const total = cY * 12 + cM + oY * 12 + oM;
                return total > 0 ? Math.floor(total / 12) : '';
              })()}
              readOnly
              className="w-16 bg-muted/50"
            />
            <span className="text-xs text-muted-foreground">years</span>
            <Input
              type="number"
              value={(() => {
                const cY = parseInt(constYearsLocal) || 0;
                const cM = parseInt(constMonthsLocal) || 0;
                const oY = parseInt(opYearsLocal) || 0;
                const oM = parseInt(opMonthsLocal) || 0;
                const total = cY * 12 + cM + oY * 12 + oM;
                return total > 0 ? total % 12 : '';
              })()}
              readOnly
              className="w-16 bg-muted/50"
            />
            <span className="text-xs text-muted-foreground">months</span>
          </div>
        </div>
      </div>

      {/* Feasibility Study — conducted by */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Feasibility Study Conducted By</h4>

        {/* Individual vs Company selector */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => !isLocked && updateField('fs_conductor_type', 'individual')}
            disabled={isLocked}
            className={cn(
              'relative flex flex-col justify-end flex-1 h-[160px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden',
              formData.fs_conductor_type === 'individual'
                ? 'ring-border bg-primary/5'
                : 'ring-gray-300 bg-background hover:bg-gray-50',
              isLocked && 'opacity-60 cursor-not-allowed',
            )}
          >
            <Image src="/images/fs-conductor-individual.png" alt="Individual" fill className="object-contain object-top opacity-15 scale-75" />
            {formData.fs_conductor_type === 'individual' && (
              <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white/95 to-transparent p-3 pt-5">
              <h4 className="text-sm font-semibold">Individual</h4>
              <p className="mt-1 text-xs text-muted-foreground">The study was conducted by an individual consultant or specialist</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => !isLocked && updateField('fs_conductor_type', 'company')}
            disabled={isLocked}
            className={cn(
              'relative flex flex-col justify-end flex-1 h-[160px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden',
              formData.fs_conductor_type === 'company'
                ? 'ring-border bg-primary/5'
                : 'ring-gray-300 bg-background hover:bg-gray-50',
              isLocked && 'opacity-60 cursor-not-allowed',
            )}
          >
            <Image src="/images/fs-conductor-company.png" alt="Company / Firm" fill className="object-contain object-top opacity-15 scale-75" />
            {formData.fs_conductor_type === 'company' && (
              <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white/95 to-transparent p-3 pt-5">
              <h4 className="text-sm font-semibold">Company / Firm</h4>
              <p className="mt-1 text-xs text-muted-foreground">The study was conducted by a consulting firm or organisation</p>
            </div>
          </button>
        </div>
        {errors.fs_conductor_type && <p className="text-xs text-red-500">{errors.fs_conductor_type}</p>}

        {/* Individual details */}
        {formData.fs_conductor_type === 'individual' && (
          <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
            <h5 className="text-sm font-medium">Individual Details</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <Input value={formData.fs_conductor_individual_name || ''} onChange={e => updateField('fs_conductor_individual_name', e.target.value)} placeholder="Full name" disabled={isLocked} />
                {errors.fs_conductor_individual_name && <p className="text-xs text-red-500 mt-1">{errors.fs_conductor_individual_name}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Job Title</Label>
                <Input value={formData.fs_conductor_individual_job_title || ''} onChange={e => updateField('fs_conductor_individual_job_title', e.target.value)} placeholder="e.g. Senior Infrastructure Consultant" disabled={isLocked} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Associated Company</Label>
                <Input value={formData.fs_conductor_individual_company || ''} onChange={e => updateField('fs_conductor_individual_company', e.target.value)} placeholder="Company or organisation name" disabled={isLocked} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input type="email" value={formData.fs_conductor_individual_email || ''} onChange={e => updateField('fs_conductor_individual_email', e.target.value)} placeholder="email@example.com" disabled={isLocked} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input value={formData.fs_conductor_individual_phone || ''} onChange={e => updateField('fs_conductor_individual_phone', e.target.value)} placeholder="+95..." disabled={isLocked} />
              </div>
            </div>
          </div>
        )}

        {/* Company details */}
        {formData.fs_conductor_type === 'company' && (
          <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-3">
            <h5 className="text-sm font-medium">Company Details</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Company Name</Label>
                <Input value={formData.fs_conductor_company_name || ''} onChange={e => updateField('fs_conductor_company_name', e.target.value)} placeholder="Company or firm name" disabled={isLocked} />
                {errors.fs_conductor_company_name && <p className="text-xs text-red-500 mt-1">{errors.fs_conductor_company_name}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Contact Person</Label>
                <Input value={formData.fs_conductor_contact_person || ''} onChange={e => updateField('fs_conductor_contact_person', e.target.value)} placeholder="Primary contact name" disabled={isLocked} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Input value={formData.fs_conductor_company_address || ''} onChange={e => updateField('fs_conductor_company_address', e.target.value)} placeholder="Office address" disabled={isLocked} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input type="email" value={formData.fs_conductor_company_email || ''} onChange={e => updateField('fs_conductor_company_email', e.target.value)} placeholder="info@company.com" disabled={isLocked} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input value={formData.fs_conductor_company_phone || ''} onChange={e => updateField('fs_conductor_company_phone', e.target.value)} placeholder="+95..." disabled={isLocked} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Website</Label>
                <Input value={formData.fs_conductor_company_website || ''} onChange={e => updateField('fs_conductor_company_website', e.target.value)} placeholder="https://www.example.com" disabled={isLocked} />
              </div>
            </div>
          </div>
        )}

        <div>
          <Label>Feasibility Study Date <HelpTooltip text="When the feasibility study was completed." /></Label>
          <div className="max-w-xs">
            <DatePicker
              value={formData.preliminary_fs_date || ''}
              onChange={v => updateField('preliminary_fs_date', v || null)}
              placeholder="Pick date"
            />
          </div>
        </div>
      </div>

      {/* Feasibility Study document upload */}
      <div>
        <Label className="mb-2 block">Feasibility Study &amp; Accompanying Documents <HelpTooltip text="Upload the feasibility study report and any supporting documents such as cost estimates, technical drawings, or environmental assessments. You can drag and drop multiple files at once." /></Label>
        <DocumentUploadZone
          projectId={projectId}
          stage="preliminary_fs"
          documents={documents}
          onDocumentsChange={refreshDocuments}
          acceptedTypes={['preliminary_fs_report', 'cost_estimate', 'cost_benefit_analysis', 'other']}
        />
      </div>

      {/* Validation error summary — map error keys to their tabs */}
      {(() => {
        const errorTabMap: Record<string, { tab: FS1Tab; label: string }> = {
          fs_conductor_type: { tab: 'technical', label: 'Technical' },
          fs_conductor_individual_name: { tab: 'technical', label: 'Technical' },
          fs_conductor_company_name: { tab: 'technical', label: 'Technical' },
          cost_table_data: { tab: 'firr', label: 'Financial Analysis' },
          environmental_impact_level: { tab: 'environmental', label: 'Environmental' },
          social_impact_level: { tab: 'environmental', label: 'Environmental' },
        };
        const fieldErrors = Object.keys(errors).filter(k => k !== '_form' && errorTabMap[k]);
        if (fieldErrors.length === 0) return null;
        const tabsWithErrors = Array.from(new Set(fieldErrors.map(k => errorTabMap[k]!.tab)));
        const tabLabels = Array.from(new Set(fieldErrors.map(k => errorTabMap[k]!.label)));
        return (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Please complete required fields before continuing:</p>
              <ul className="mt-1 space-y-0.5">
                {fieldErrors.map(k => (
                  <li key={k}>
                    <button
                      type="button"
                      className="underline hover:text-amber-900"
                      onClick={() => setFs1ActiveTab(errorTabMap[k]!.tab)}
                    >
                      {errors[k]}
                    </button>
                    <span className="text-amber-600 text-xs ml-1">({errorTabMap[k]!.label} tab)</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })()}

      {/* FS-1 Internal Tabs */}
      <Tabs value={fs1ActiveTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="environmental">Environmental</TabsTrigger>
          <TabsTrigger value="msdp">MSDP Alignment</TabsTrigger>
          <TabsTrigger value="firr">Financial Analysis</TabsTrigger>
        </TabsList>

        {/* Technical Tab */}
        <TabsContent value="technical" className="space-y-4 mt-4" id="section-technical">
          <div>
            <Label>Technical Approach <FieldCheck value={formData.technical_approach} /> <HelpTooltip text="Describe the proposed technical approach, construction methods, and key design features." /></Label>
            <Textarea
              value={formData.technical_approach || ''}
              onChange={e => updateField('technical_approach', e.target.value)}
              placeholder="Describe the proposed technical approach..."
              rows={3}
              disabled={isLocked}
            />
          </div>
          <div>
            <Label>Technology / Methodology <FieldCheck value={formData.technology_methodology} /> <HelpTooltip text="Key technologies, equipment, and methodologies to be used." /></Label>
            <Textarea
              value={formData.technology_methodology || ''}
              onChange={e => updateField('technology_methodology', e.target.value)}
              placeholder="Key technologies and methods..."
              rows={2}
              disabled={isLocked}
            />
          </div>
          <div>
            <Label>Technical Risks <FieldCheck value={formData.technical_risks} /> <HelpTooltip text="Key technical risks and proposed mitigation strategies." /></Label>
            <Textarea
              value={formData.technical_risks || ''}
              onChange={e => updateField('technical_risks', e.target.value)}
              placeholder="Key technical risks and mitigations..."
              rows={2}
              disabled={isLocked}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.has_technical_design || false}
              onCheckedChange={v => updateField('has_technical_design', v)}
              disabled={isLocked}
            />
            <Label>Technical design exists <FieldCheck value={formData.has_technical_design} /></Label>
          </div>
          {formData.has_technical_design && (
            <>
              <div>
                <Label>Design Maturity <FieldCheck value={formData.technical_design_maturity} /> <HelpTooltip text="The level of design completion, from concept to construction-ready." /></Label>
                <Select value={formData.technical_design_maturity || ''} onValueChange={v => updateField('technical_design_maturity', v)} disabled={isLocked}>
                  <SelectTrigger><SelectValue placeholder="Select maturity..." /></SelectTrigger>
                  <SelectContent>
                    {TECHNICAL_MATURITY_LEVELS.map(l => (
                      <SelectItem key={l.value} value={l.value}>
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{l.code}</span>
                          <span>{l.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Technical Design Documents</Label>
                <DocumentUploadZone
                  projectId={projectId}
                  stage="preliminary_fs"
                  documents={documents}
                  onDocumentsChange={refreshDocuments}
                  acceptedTypes={['technical_design', 'other']}
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4 mt-4" id="section-revenue">
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.has_revenue_component || false}
              onCheckedChange={v => updateField('has_revenue_component', v)}
              disabled={isLocked}
            />
            <Label>Project has revenue-generating component <FieldCheck value={formData.has_revenue_component} /></Label>
          </div>

          {formData.has_revenue_component && (
            <>
              <div>
                <Label>Revenue Sources <FieldCheck value={formData.revenue_sources} /> <HelpTooltip text="Select all applicable sources of revenue for this project." /></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal" disabled={isLocked}>
                      {(formData.revenue_sources || []).length > 0
                        ? (formData.revenue_sources as string[]).join(', ')
                        : 'Select revenue sources...'}
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-3" align="start">
                    <div className="space-y-2">
                      {REVENUE_SOURCE_OPTIONS.map(option => {
                        const selected = (formData.revenue_sources || []).includes(option);
                        return (
                          <label key={option} className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox
                              checked={selected}
                              onCheckedChange={(checked) => {
                                const current: string[] = formData.revenue_sources || [];
                                if (checked) {
                                  updateField('revenue_sources', [...current, option]);
                                } else {
                                  updateField('revenue_sources', current.filter((s: string) => s !== option));
                                }
                              }}
                            />
                            {option}
                          </label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {(formData.revenue_sources || []).includes('Other') && (
                <div>
                  <Label>Other Revenue Source Description <FieldCheck value={formData.revenue_source_other_description} /></Label>
                  <Textarea
                    value={formData.revenue_source_other_description || ''}
                    onChange={e => updateField('revenue_source_other_description', e.target.value)}
                    placeholder="Describe other revenue sources..."
                    rows={2}
                    disabled={isLocked}
                  />
                </div>
              )}

              <div>
                <Label>Projected Annual Users <FieldCheck value={formData.projected_annual_users} /> <HelpTooltip text="Estimated number of users or beneficiaries per year." /></Label>
                <FormattedNumberInput value={formData.projected_annual_users ?? null} onChange={v => updateField('projected_annual_users', v)} placeholder="e.g. 50,000" />
              </div>
              <div>
                <Label>Market Assessment Summary <FieldCheck value={formData.market_assessment_summary} /> <HelpTooltip text="Summary of demand analysis, market conditions, and revenue projections." /></Label>
                <Textarea
                  value={formData.market_assessment_summary || ''}
                  onChange={e => updateField('market_assessment_summary', e.target.value)}
                  placeholder="Summary of demand analysis and market outlook..."
                  rows={3}
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label className="mb-2 block">Market Assessment Documents</Label>
                <DocumentUploadZone
                  projectId={projectId}
                  stage="preliminary_fs"
                  documents={documents}
                  onDocumentsChange={refreshDocuments}
                  acceptedTypes={['market_assessment', 'other']}
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* Environmental Tab */}
        <TabsContent value="environmental" className="space-y-4 mt-4" id="section-environmental">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Environmental Impact Level <FieldCheck value={formData.environmental_impact_level} /> <HelpTooltip text="The expected level of environmental impact from this project." /></Label>
              <Select value={formData.environmental_impact_level || ''} onValueChange={v => updateField('environmental_impact_level', v)} disabled={isLocked}>
                <SelectTrigger className="text-left"><SelectValue placeholder="Select level..." /></SelectTrigger>
                <SelectContent>
                  {IMPACT_LEVELS.map(l => (
                    <SelectItem key={l.value} value={l.value} triggerLabel={<span className="inline-flex items-center gap-2"><span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{l.code}</span><span>{l.label}</span></span>}>
                      <div className="py-0.5">
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{l.code}</span>
                          <span>{l.label}</span>
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5 ml-7">{l.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.environmental_impact_level && <p className="text-xs text-red-500 mt-1">{errors.environmental_impact_level}</p>}
            </div>
            <div>
              <Label>Social Impact Level <FieldCheck value={formData.social_impact_level} /> <HelpTooltip text="The expected level of social impact, including displacement and community effects." /></Label>
              <Select value={formData.social_impact_level || ''} onValueChange={v => updateField('social_impact_level', v)} disabled={isLocked}>
                <SelectTrigger className="text-left"><SelectValue placeholder="Select level..." /></SelectTrigger>
                <SelectContent>
                  {IMPACT_LEVELS.map(l => (
                    <SelectItem key={l.value} value={l.value} triggerLabel={<span className="inline-flex items-center gap-2"><span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{l.code}</span><span>{l.label}</span></span>}>
                      <div className="py-0.5">
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{l.code}</span>
                          <span>{l.label}</span>
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5 ml-7">{l.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.social_impact_level && <p className="text-xs text-red-500 mt-1">{errors.social_impact_level}</p>}
            </div>
          </div>

          {formData.environmental_impact_level && (
            <div>
              <Label>Environmental Impact Description <FieldCheck value={formData.environmental_impact_description} /> <HelpTooltip text="Describe the expected environmental impacts and proposed mitigation measures." /></Label>
              <Textarea
                value={formData.environmental_impact_description || ''}
                onChange={e => updateField('environmental_impact_description', e.target.value)}
                placeholder="Describe the expected environmental impacts and mitigation measures..."
                rows={3}
                disabled={isLocked}
              />
            </div>
          )}

          {formData.social_impact_level && (
            <div>
              <Label>Social Impact Description <FieldCheck value={formData.social_impact_description} /> <HelpTooltip text="Describe the expected social impacts, affected communities, and mitigation measures." /></Label>
              <Textarea
                value={formData.social_impact_description || ''}
                onChange={e => updateField('social_impact_description', e.target.value)}
                placeholder="Describe the expected social impacts and mitigation measures..."
                rows={3}
                disabled={isLocked}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch checked={formData.land_acquisition_required || false} onCheckedChange={v => updateField('land_acquisition_required', v)} disabled={isLocked} />
            <Label>Land acquisition required <FieldCheck value={formData.land_acquisition_required} /></Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={formData.resettlement_required || false} onCheckedChange={v => updateField('resettlement_required', v)} disabled={isLocked} />
            <Label>Resettlement required <FieldCheck value={formData.resettlement_required} /></Label>
          </div>

          {formData.resettlement_required && (
            <div>
              <Label>Estimated Affected Households <FieldCheck value={formData.estimated_affected_households} /> <HelpTooltip text="Number of households that may need to be resettled." /></Label>
              <FormattedNumberInput value={formData.estimated_affected_households ?? null} onChange={v => updateField('estimated_affected_households', v)} placeholder="e.g. 150" />
            </div>
          )}

          <div>
            <Label className="mb-2 block">Environmental &amp; Social Documents</Label>
            <DocumentUploadZone
              projectId={projectId}
              stage="preliminary_fs"
              documents={documents}
              onDocumentsChange={refreshDocuments}
              acceptedTypes={['environmental_impact_assessment', 'social_impact_assessment', 'land_acquisition_plan', 'resettlement_plan', 'other']}
            />
          </div>
        </TabsContent>

        {/* MSDP Alignment Tab */}
        <TabsContent value="msdp" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Review and update the MSDP alignment for this project. If the project design has evolved since intake, you can revise the alignment here. MSDP-aligned projects with a FIRR below 10% may still qualify for economic analysis.
          </p>
          <StageMSDPScreening wizard={wizard} />
        </TabsContent>

        {/* Financial Analysis Tab — imported component */}
        <TabsContent value="firr" className="mt-4">
          <StageFIRR wizard={wizard} />
        </TabsContent>

      </Tabs>

      {errors._form && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">{errors._form}</p>
      )}
    </div>
  );
}

/** Viability Decision sidebar — rendered by AppraisalWizard outside the Card */
export function ViabilityDecisionSidebar({ wizard }: { wizard: UseAppraisalWizardReturn }) {
  const { formData } = wizard;

  const refinedData = formData.firr_cost_table_data || [];
  const firrResult = useMemo(() => {
    if (!refinedData.length) return null;
    return calculateFIRR(refinedData);
  }, [refinedData]);
  const ndpAligned = !!formData.ndp_aligned;
  const hasData = refinedData.some((r: Record<string, number>) => (r.capex || 0) > 0 || (r.opex || 0) > 0 || (r.revenue || 0) > 0);
  const routing = determineFullRouting(firrResult?.firr ?? null, null, ndpAligned, hasData);

  const routingBorderColor = routing.color === 'green' ? 'border-l-green-500'
    : routing.color === 'blue' ? 'border-l-blue-500'
    : routing.color === 'amber' ? 'border-l-amber-500'
    : routing.color === 'red' ? 'border-l-red-500'
    : 'border-l-muted-foreground';

  return (
    <div className={cn('fixed top-28 right-8 w-[320px] z-50 p-4 rounded-lg border-l-4 border shadow-lg bg-[#f6f5f3] border-[#5f7f7a]/20', routingBorderColor)}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Viability Decision</div>
      <div className="text-sm font-bold mb-1 text-foreground">
        {routing.label}
      </div>
      <div className="text-sm text-muted-foreground">{routing.description}</div>
      <div className="text-xs text-muted-foreground mt-2 italic">{routing.nextSteps}</div>
    </div>
  );
}
