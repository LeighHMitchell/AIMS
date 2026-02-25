"use client"

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SECTORS, REGIONS } from '@/lib/project-bank-utils';
import { PROJECT_TYPES, SUB_SECTORS } from '@/lib/project-bank-utils';
import { DocumentUploadZone } from './DocumentUploadZone';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';

const SDG_GOALS = Array.from({ length: 17 }, (_, i) => ({
  value: String(i + 1),
  label: `SDG ${i + 1}`,
}));

interface StageIntakeProps {
  wizard: UseAppraisalWizardReturn;
}

export function StageIntake({ wizard }: StageIntakeProps) {
  const { formData, updateField, errors, projectId, documents, refreshDocuments } = wizard;

  const sectorSubSectors = formData.sector ? SUB_SECTORS[formData.sector] || [] : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Project Intake</h3>
        <p className="text-sm text-muted-foreground">Enter basic project information and contact details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Project Name *</Label>
          <Input
            value={formData.name || ''}
            onChange={e => updateField('name', e.target.value)}
            placeholder="e.g. Mandalay–Myitkyina Highway"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <Label>Nominating Ministry *</Label>
          <Input
            value={formData.nominating_ministry || ''}
            onChange={e => updateField('nominating_ministry', e.target.value)}
            placeholder="e.g. Ministry of Construction"
          />
          {errors.nominating_ministry && <p className="text-xs text-red-500 mt-1">{errors.nominating_ministry}</p>}
        </div>

        <div>
          <Label>Contact Officer</Label>
          <Input
            value={formData.contact_officer || ''}
            onChange={e => updateField('contact_officer', e.target.value)}
            placeholder="Full name"
          />
        </div>

        <div>
          <Label>Contact Email</Label>
          <Input
            type="email"
            value={formData.contact_email || ''}
            onChange={e => updateField('contact_email', e.target.value)}
            placeholder="email@gov.mm"
          />
        </div>

        <div>
          <Label>Contact Phone</Label>
          <Input
            value={formData.contact_phone || ''}
            onChange={e => updateField('contact_phone', e.target.value)}
            placeholder="+95..."
          />
        </div>

        <div>
          <Label>Sector *</Label>
          <Select value={formData.sector || ''} onValueChange={v => { updateField('sector', v); updateField('sub_sector', null); }}>
            <SelectTrigger><SelectValue placeholder="Select sector..." /></SelectTrigger>
            <SelectContent>
              {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.sector && <p className="text-xs text-red-500 mt-1">{errors.sector}</p>}
        </div>

        <div>
          <Label>Sub-Sector</Label>
          <Select value={formData.sub_sector || ''} onValueChange={v => updateField('sub_sector', v)} disabled={!sectorSubSectors.length}>
            <SelectTrigger><SelectValue placeholder={sectorSubSectors.length ? 'Select sub-sector...' : 'Select sector first'} /></SelectTrigger>
            <SelectContent>
              {sectorSubSectors.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Region</Label>
          <Select value={formData.region || ''} onValueChange={v => updateField('region', v)}>
            <SelectTrigger><SelectValue placeholder="Select region..." /></SelectTrigger>
            <SelectContent>
              {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Project Type</Label>
          <Select value={formData.project_type || ''} onValueChange={v => updateField('project_type', v)}>
            <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Estimated Cost</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={formData.estimated_cost ?? ''}
              onChange={e => updateField('estimated_cost', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g. 85000000"
              className="flex-1"
            />
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
          <Label>Estimated Start Date</Label>
          <Input
            type="date"
            value={formData.estimated_start_date || ''}
            onChange={e => updateField('estimated_start_date', e.target.value || null)}
          />
        </div>

        <div>
          <Label>Estimated Duration (months)</Label>
          <Input
            type="number"
            value={formData.estimated_duration_months ?? ''}
            onChange={e => updateField('estimated_duration_months', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="e.g. 36"
          />
        </div>

        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={formData.description || ''}
            onChange={e => updateField('description', e.target.value)}
            placeholder="Brief project summary..."
            rows={3}
          />
        </div>

        <div className="md:col-span-2">
          <Label>Objectives</Label>
          <Textarea
            value={formData.objectives || ''}
            onChange={e => updateField('objectives', e.target.value)}
            placeholder="What are the main objectives of this project?"
            rows={2}
          />
        </div>

        <div className="md:col-span-2">
          <Label>Target Beneficiaries</Label>
          <Textarea
            value={formData.target_beneficiaries || ''}
            onChange={e => updateField('target_beneficiaries', e.target.value)}
            placeholder="Who will benefit from this project?"
            rows={2}
          />
        </div>

        <div className="md:col-span-2">
          <Label>SDG Goals</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
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
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    selected
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-background border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40'
                  }`}
                >
                  {sdg.label}
                </button>
              );
            })}
          </div>
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
