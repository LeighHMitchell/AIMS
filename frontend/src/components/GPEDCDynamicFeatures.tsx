'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DynamicFeaturesProps {
  governmentSystemUse: {
    budgetExecutionSystem?: 'yes' | 'no';
    financialReportingSystem?: 'yes' | 'no';
    auditingSystem?: 'yes' | 'no';
    procurementSystem?: 'yes' | 'no';
  };
  finalEvaluationPlanned?: 'yes' | 'no';
  onReasonChange: (field: string, value: string) => void;
  onEvaluationDateChange: (date: string) => void;
  reasons?: {
    budgetExecutionReason?: string;
    financialReportingReason?: string;
    auditingReason?: string;
    procurementReason?: string;
  };
  evaluationDate?: string;
}

export function GPEDCDynamicFeatures({
  governmentSystemUse,
  finalEvaluationPlanned,
  onReasonChange,
  onEvaluationDateChange,
  reasons = {},
  evaluationDate
}: DynamicFeaturesProps) {
  return (
    <>
      {/* Dynamic follow-up questions for government systems */}
      {governmentSystemUse.budgetExecutionSystem === 'no' && (
        <div className="mt-4 ml-6 space-y-2">
          <Label htmlFor="budget-reason" className="text-sm text-muted-foreground">
            Why is the government budget execution system not being used? (Optional)
          </Label>
          <Textarea
            id="budget-reason"
            value={reasons.budgetExecutionReason || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onReasonChange('budgetExecutionReason', e.target.value)}
            placeholder="Please explain..."
            className="min-h-[80px]"
          />
        </div>
      )}

      {governmentSystemUse.financialReportingSystem === 'no' && (
        <div className="mt-4 ml-6 space-y-2">
          <Label htmlFor="financial-reason" className="text-sm text-muted-foreground">
            Why is the government financial reporting system not being used? (Optional)
          </Label>
          <Textarea
            id="financial-reason"
            value={reasons.financialReportingReason || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onReasonChange('financialReportingReason', e.target.value)}
            placeholder="Please explain..."
            className="min-h-[80px]"
          />
        </div>
      )}

      {governmentSystemUse.auditingSystem === 'no' && (
        <div className="mt-4 ml-6 space-y-2">
          <Label htmlFor="audit-reason" className="text-sm text-muted-foreground">
            Why is the government auditing system not being used? (Optional)
          </Label>
          <Textarea
            id="audit-reason"
            value={reasons.auditingReason || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onReasonChange('auditingReason', e.target.value)}
            placeholder="Please explain..."
            className="min-h-[80px]"
          />
        </div>
      )}

      {governmentSystemUse.procurementSystem === 'no' && (
        <div className="mt-4 ml-6 space-y-2">
          <Label htmlFor="procurement-reason" className="text-sm text-muted-foreground">
            Why is the government procurement system not being used? (Optional)
          </Label>
          <Textarea
            id="procurement-reason"
            value={reasons.procurementReason || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onReasonChange('procurementReason', e.target.value)}
            placeholder="Please explain..."
            className="min-h-[80px]"
          />
        </div>
      )}

      {/* Dynamic evaluation date input */}
      {finalEvaluationPlanned === 'yes' && (
        <div className="mt-4 ml-6 space-y-2">
          <Label htmlFor="evaluation-date">
            Planned Evaluation Date
          </Label>
          <Input
            id="evaluation-date"
            type="date"
            value={evaluationDate || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEvaluationDateChange(e.target.value)}
          />
        </div>
      )}
    </>
  );
}