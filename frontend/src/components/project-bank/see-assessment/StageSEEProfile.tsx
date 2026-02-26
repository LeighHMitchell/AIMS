"use client"

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SECTORS } from '@/lib/project-bank-utils';
import type { UseSEEAssessmentWizardReturn } from '@/hooks/use-see-assessment-wizard';

const MINISTRIES = [
  'Ministry of Planning and Finance',
  'Ministry of Industry',
  'Ministry of Transport and Communications',
  'Ministry of Electricity and Energy',
  'Ministry of Construction',
  'Ministry of Agriculture, Livestock and Irrigation',
  'Ministry of Natural Resources and Environmental Conservation',
  'Ministry of Hotels and Tourism',
  'Ministry of Commerce',
  'Ministry of Education',
  'Ministry of Health',
  'Ministry of Defence',
  'Other',
] as const;

interface StageSEEProfileProps {
  wizard: UseSEEAssessmentWizardReturn;
}

export function StageSEEProfile({ wizard }: StageSEEProfileProps) {
  const { formData, updateField, errors } = wizard;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Enterprise Profile</h3>
        <p className="text-sm text-muted-foreground">Basic information about the State Economic Enterprise.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="see_name">Enterprise Name *</Label>
          <Input
            id="see_name"
            value={formData.see_name || ''}
            onChange={e => updateField('see_name', e.target.value)}
            placeholder="e.g. Myanmar Timber Enterprise"
          />
          {errors.see_name && <p className="text-xs text-red-500 mt-1">{errors.see_name}</p>}
        </div>

        <div>
          <Label htmlFor="see_sector">Sector</Label>
          <Select
            value={formData.see_sector || ''}
            onValueChange={v => updateField('see_sector', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sector" />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="see_ministry">Parent Ministry</Label>
          <Select
            value={formData.see_ministry || ''}
            onValueChange={v => updateField('see_ministry', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ministry" />
            </SelectTrigger>
            <SelectContent>
              {MINISTRIES.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={e => updateField('description', e.target.value)}
            placeholder="Brief description of the enterprise and transfer rationale"
            rows={3}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold mb-3">Current Financial Overview</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="employee_count">Employee Count</Label>
            <Input
              id="employee_count"
              type="number"
              value={formData.employee_count ?? ''}
              onChange={e => updateField('employee_count', e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g. 2500"
            />
          </div>

          <div>
            <Label htmlFor="current_annual_revenue">Current Annual Revenue (USD)</Label>
            <Input
              id="current_annual_revenue"
              type="number"
              value={formData.current_annual_revenue ?? ''}
              onChange={e => updateField('current_annual_revenue', e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g. 50000000"
            />
          </div>

          <div>
            <Label htmlFor="current_annual_expenses">Current Annual Expenses (USD)</Label>
            <Input
              id="current_annual_expenses"
              type="number"
              value={formData.current_annual_expenses ?? ''}
              onChange={e => updateField('current_annual_expenses', e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g. 45000000"
            />
          </div>

          <div>
            <Label htmlFor="total_assets">Total Assets (USD)</Label>
            <Input
              id="total_assets"
              type="number"
              value={formData.total_assets ?? ''}
              onChange={e => updateField('total_assets', e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g. 200000000"
            />
          </div>

          <div>
            <Label htmlFor="total_liabilities">Total Liabilities (USD)</Label>
            <Input
              id="total_liabilities"
              type="number"
              value={formData.total_liabilities ?? ''}
              onChange={e => updateField('total_liabilities', e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g. 80000000"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
