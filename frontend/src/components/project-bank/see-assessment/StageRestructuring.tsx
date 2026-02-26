"use client"

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { SEEDocumentUploadZone } from './SEEDocumentUploadZone';
import type { UseSEEAssessmentWizardReturn } from '@/hooks/use-see-assessment-wizard';

interface StageRestructuringProps {
  wizard: UseSEEAssessmentWizardReturn;
}

export function StageRestructuring({ wizard }: StageRestructuringProps) {
  const { formData, updateField, transferId, documents, refreshDocuments } = wizard;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Restructuring</h3>
        <p className="text-sm text-muted-foreground">Pre-transfer restructuring requirements and compliance checks.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="regulatory_separation_done"
            checked={!!formData.regulatory_separation_done}
            onCheckedChange={v => updateField('regulatory_separation_done', !!v)}
          />
          <Label htmlFor="regulatory_separation_done" className="text-sm">
            Regulatory separation has been completed (separation of regulatory and commercial functions)
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="legislation_review_done"
            checked={!!formData.legislation_review_done}
            onCheckedChange={v => updateField('legislation_review_done', !!v)}
          />
          <Label htmlFor="legislation_review_done" className="text-sm">
            Enabling legislation has been reviewed and amended as necessary
          </Label>
        </div>
      </div>

      <div>
        <Label htmlFor="restructuring_notes">Restructuring Notes</Label>
        <Textarea
          id="restructuring_notes"
          value={formData.restructuring_notes || ''}
          onChange={e => updateField('restructuring_notes', e.target.value)}
          placeholder="Describe any restructuring steps taken or planned — organizational changes, workforce adjustments, financial restructuring, etc."
          rows={5}
        />
      </div>

      <div className="border-t pt-4">
        <Label className="mb-2 block">Restructuring Plan</Label>
        <SEEDocumentUploadZone
          transferId={transferId}
          stage="restructuring"
          documentType="restructuring_plan"
          documents={documents}
          onDocumentsChange={refreshDocuments}
        />
      </div>
    </div>
  );
}
