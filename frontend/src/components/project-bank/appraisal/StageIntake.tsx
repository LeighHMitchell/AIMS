"use client"

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SECTORS, REGIONS } from '@/lib/project-bank-utils';
import { PROJECT_TYPES, SUB_SECTORS } from '@/lib/project-bank-utils';
import { DocumentUploadZone } from './DocumentUploadZone';
import { HelpTooltip } from './HelpTooltip';
import { DatePicker } from '@/components/ui/date-picker';
import { apiFetch } from '@/lib/api-fetch';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import { cn } from '@/lib/utils';

const SDG_GOALS = Array.from({ length: 17 }, (_, i) => ({
  value: String(i + 1),
  label: `SDG ${i + 1}`,
}));

/** Red dot indicator for required fields */
function RequiredDot() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" />;
}

/** Currency formatter for display */
function formatCurrencyDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '';
  return new Intl.NumberFormat('en-US').format(value);
}

interface StageIntakeProps {
  wizard: UseAppraisalWizardReturn;
}

interface Ministry {
  id: string;
  name: string;
  code?: string;
}

export function StageIntake({ wizard }: StageIntakeProps) {
  const { formData, updateField, errors, projectId, documents, refreshDocuments } = wizard;
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [costDisplay, setCostDisplay] = useState(() => formatCurrencyDisplay(formData.estimated_cost));

  const sectorSubSectors = formData.sector ? SUB_SECTORS[formData.sector] || [] : [];

  // Fetch line ministries
  useEffect(() => {
    async function fetchMinistries() {
      try {
        const res = await apiFetch('/api/line-ministries');
        if (res.ok) setMinistries(await res.json());
      } catch {}
    }
    fetchMinistries();
  }, []);

  // Parse duration into years + months
  const durationMonths = formData.estimated_duration_months ?? null;
  const durationYears = durationMonths !== null ? Math.floor(durationMonths / 12) : '';
  const durationRemainder = durationMonths !== null ? durationMonths % 12 : '';

  const updateDuration = (years: string, months: string) => {
    const y = years === '' ? 0 : parseInt(years) || 0;
    const m = months === '' ? 0 : parseInt(months) || 0;
    const total = y * 12 + m;
    updateField('estimated_duration_months', total > 0 ? total : null);
  };

  const handleCostChange = (value: string) => {
    setCostDisplay(value);
    const raw = parseFloat(value.replace(/,/g, ''));
    updateField('estimated_cost', isNaN(raw) ? null : raw);
  };

  const handleCostBlur = () => {
    setCostDisplay(formatCurrencyDisplay(formData.estimated_cost));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Project Intake</h3>
        <p className="text-sm text-muted-foreground">Enter basic project information and contact details.</p>
      </div>

      {/* ─── General Info ─── */}
      <div id="section-general-info" className="scroll-mt-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Project Name <RequiredDot /> <HelpTooltip text="The official name of the project. Use a clear, descriptive title." /></Label>
            <Input
              value={formData.name || ''}
              onChange={e => updateField('name', e.target.value)}
              placeholder="e.g. Mandalay–Myitkyina Highway"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label>Nominating Ministry <RequiredDot /> <HelpTooltip text="The government ministry responsible for proposing this project." /></Label>
            {ministries.length > 0 ? (
              <Select
                value={formData.nominating_ministry || ''}
                onValueChange={v => updateField('nominating_ministry', v)}
              >
                <SelectTrigger><SelectValue placeholder="Select ministry..." /></SelectTrigger>
                <SelectContent>
                  {ministries.map(m => (
                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={formData.nominating_ministry || ''}
                onChange={e => updateField('nominating_ministry', e.target.value)}
                placeholder="e.g. Ministry of Construction"
              />
            )}
            {errors.nominating_ministry && <p className="text-xs text-red-500 mt-1">{errors.nominating_ministry}</p>}
          </div>

          <div>
            <Label>Project Type <HelpTooltip text="The broad category of this project (infrastructure, social services, etc.)." /></Label>
            <Select value={formData.project_type || ''} onValueChange={v => updateField('project_type', v)}>
              <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Estimated Cost <HelpTooltip text="The total estimated project cost including all phases." /></Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                <Input
                  value={costDisplay}
                  onChange={e => handleCostChange(e.target.value)}
                  onBlur={handleCostBlur}
                  onFocus={() => {
                    // Show raw number on focus for editing
                    if (formData.estimated_cost) setCostDisplay(String(formData.estimated_cost));
                  }}
                  placeholder="e.g. 85,000,000"
                  className="pl-7"
                />
              </div>
              <Select value={formData.currency || 'USD'} onValueChange={v => updateField('currency', v)}>
                <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="MMK">MMK</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Estimated Start Date <HelpTooltip text="When the project is expected to begin." /></Label>
            <DatePicker
              value={formData.estimated_start_date || ''}
              onChange={v => updateField('estimated_start_date', v || null)}
              placeholder="Pick a start date"
            />
          </div>

          <div>
            <Label>Estimated Duration <HelpTooltip text="Total project duration from start to completion." /></Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                min={0}
                value={durationYears}
                onChange={e => updateDuration(e.target.value, String(durationRemainder))}
                placeholder="0"
                className="w-20"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">years</span>
              <Input
                type="number"
                min={0}
                max={11}
                value={durationRemainder}
                onChange={e => updateDuration(String(durationYears), e.target.value)}
                placeholder="0"
                className="w-20"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">months</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <Label>Description <HelpTooltip text="A brief summary of the project scope and purpose." /></Label>
            <Textarea
              value={formData.description || ''}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Brief project summary..."
              rows={3}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Objectives <HelpTooltip text="The specific goals this project aims to achieve." /></Label>
            <Textarea
              value={formData.objectives || ''}
              onChange={e => updateField('objectives', e.target.value)}
              placeholder="What are the main objectives of this project?"
              rows={2}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Target Beneficiaries <HelpTooltip text="Who will benefit from this project and how many people are expected to be impacted." /></Label>
            <Textarea
              value={formData.target_beneficiaries || ''}
              onChange={e => updateField('target_beneficiaries', e.target.value)}
              placeholder="Who will benefit from this project?"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* ─── Contact Officer ─── */}
      <div id="section-contact-officer" className="scroll-mt-20 rounded-lg border border-muted bg-muted/20 p-4 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Officer</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Full Name <HelpTooltip text="The primary contact person for this project." /></Label>
            <Input
              value={formData.contact_officer || ''}
              onChange={e => updateField('contact_officer', e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label>Email <HelpTooltip text="Contact officer's email address." /></Label>
            <Input
              type="email"
              value={formData.contact_email || ''}
              onChange={e => updateField('contact_email', e.target.value)}
              placeholder="email@gov.mm"
            />
          </div>
          <div>
            <Label>Phone <HelpTooltip text="Contact officer's phone number." /></Label>
            <Input
              value={formData.contact_phone || ''}
              onChange={e => updateField('contact_phone', e.target.value)}
              placeholder="+95..."
            />
          </div>
        </div>
      </div>

      {/* ─── Sector / Sub-Sector ─── */}
      <div id="section-sector" className="scroll-mt-20 rounded-lg border border-muted bg-muted/20 p-4 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sector / Sub-Sector</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Sector <RequiredDot /> <HelpTooltip text="The primary development sector this project falls under." /></Label>
            <Select value={formData.sector || ''} onValueChange={v => { updateField('sector', v); updateField('sub_sector', null); }}>
              <SelectTrigger><SelectValue placeholder="Select sector..." /></SelectTrigger>
              <SelectContent>
                {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.sector && <p className="text-xs text-red-500 mt-1">{errors.sector}</p>}
          </div>
          <div>
            <Label>Sub-Sector <HelpTooltip text="A more specific category within the selected sector." /></Label>
            <Select value={formData.sub_sector || ''} onValueChange={v => updateField('sub_sector', v)} disabled={!sectorSubSectors.length}>
              <SelectTrigger><SelectValue placeholder={sectorSubSectors.length ? 'Select sub-sector...' : 'Select sector first'} /></SelectTrigger>
              <SelectContent>
                {sectorSubSectors.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ─── Region / Townships ─── */}
      <div id="section-region" className="scroll-mt-20 rounded-lg border border-muted bg-muted/20 p-4 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Region / Townships</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Region <HelpTooltip text="The state or region where this project will be implemented." /></Label>
            <Select value={formData.region || ''} onValueChange={v => updateField('region', v)}>
              <SelectTrigger><SelectValue placeholder="Select region..." /></SelectTrigger>
              <SelectContent>
                {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ─── SDG Goals ─── */}
      <div className="md:col-span-2">
        <Label>SDG Goals <HelpTooltip text="Select the Sustainable Development Goals this project contributes to." /></Label>
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 mt-2">
          {SDG_GOALS.map(sdg => {
            const selected = (formData.sdg_goals || []).includes(sdg.value);
            return (
              <button
                key={sdg.value}
                type="button"
                onClick={() => {
                  const current = formData.sdg_goals || [];
                  updateField(
                    'sdg_goals',
                    selected ? current.filter((g: string) => g !== sdg.value) : [...current, sdg.value]
                  );
                }}
                className={cn(
                  'relative aspect-square rounded-lg border-2 transition-all hover:scale-105 overflow-hidden',
                  selected
                    ? 'border-gray-800 ring-2 ring-gray-800/20 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
                )}
              >
                <Image
                  src={`/images/sdg/E_SDG_Icons-${sdg.value.padStart(2, '0')}.jpg`}
                  alt={sdg.label}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
                {selected && (
                  <div className="absolute bottom-0.5 right-0.5 bg-gray-800 rounded-full p-0.5">
                    <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Document upload */}
      <div>
        <Label className="mb-2 block">Supporting Documents</Label>
        <DocumentUploadZone
          projectId={projectId}
          stage="intake"
          documents={documents}
          onDocumentsChange={refreshDocuments}
          acceptedTypes={['concept_note', 'project_proposal', 'other']}
        />
      </div>

      {errors._form && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">{errors._form}</p>
      )}
    </div>
  );
}
