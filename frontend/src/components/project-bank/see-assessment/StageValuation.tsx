"use client"

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SEEDocumentUploadZone } from './SEEDocumentUploadZone';
import type { UseSEEAssessmentWizardReturn } from '@/hooks/use-see-assessment-wizard';

const VALUATION_METHODS = [
  { value: 'dcf', label: 'Discounted Cash Flow (DCF)' },
  { value: 'asset_based', label: 'Asset-Based Valuation' },
  { value: 'market', label: 'Market Comparable' },
  { value: 'other', label: 'Other' },
] as const;

interface StageValuationProps {
  wizard: UseSEEAssessmentWizardReturn;
}

export function StageValuation({ wizard }: StageValuationProps) {
  const { formData, updateField, transferId, documents, refreshDocuments } = wizard;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Valuation</h3>
        <p className="text-sm text-muted-foreground">Enterprise valuation details and supporting documentation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="valuation_amount">Valuation Amount (USD)</Label>
          <Input
            id="valuation_amount"
            type="number"
            value={formData.valuation_amount ?? ''}
            onChange={e => updateField('valuation_amount', e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 150000000"
          />
        </div>

        <div>
          <Label htmlFor="valuation_method">Valuation Method</Label>
          <Select
            value={formData.valuation_method || ''}
            onValueChange={v => updateField('valuation_method', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {VALUATION_METHODS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="valuation_firm">Valuation Firm</Label>
          <Input
            id="valuation_firm"
            value={formData.valuation_firm || ''}
            onChange={e => updateField('valuation_firm', e.target.value)}
            placeholder="e.g. Deloitte Myanmar"
          />
        </div>

        <div>
          <Label htmlFor="valuation_date">Valuation Date</Label>
          <Input
            id="valuation_date"
            type="date"
            value={formData.valuation_date || ''}
            onChange={e => updateField('valuation_date', e.target.value)}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="fixed_asset_register_maintained"
            checked={!!formData.fixed_asset_register_maintained}
            onCheckedChange={v => updateField('fixed_asset_register_maintained', !!v)}
          />
          <Label htmlFor="fixed_asset_register_maintained" className="text-sm">
            Fixed asset register is maintained and up to date
          </Label>
        </div>
      </div>

      <div className="border-t pt-4">
        <Label className="mb-2 block">Valuation Certificate</Label>
        <SEEDocumentUploadZone
          transferId={transferId}
          stage="valuation"
          documentType="valuation_certificate"
          documents={documents}
          onDocumentsChange={refreshDocuments}
        />
      </div>
    </div>
  );
}
