'use client';

import React from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ActivityResult, RESULT_TYPE_LABELS } from '@/types/results';
import { getLocalizedNarrative, normalizeResultType, RESULT_TYPE_BANNER_CLASSES } from './frameworkHelpers';
import { IndicatorFrameworkBlock } from './IndicatorFrameworkBlock';

interface ResultFrameworkCardProps {
  result: ActivityResult;
  defaultLanguage?: string;
  editable?: boolean;
  onEditResult?: (resultId: string) => void;
  onDeleteResult?: (resultId: string) => void;
  onAddIndicator?: (resultId: string) => void;
  onEditIndicator?: (indicatorId: string) => void;
  onDeleteIndicator?: (indicatorId: string) => void;
  onAddPeriod?: (indicatorId: string) => void;
}

export function ResultFrameworkCard({
  result,
  defaultLanguage = 'en',
  editable = false,
  onEditResult,
  onDeleteResult,
  onAddIndicator,
  onEditIndicator,
  onDeleteIndicator,
  onAddPeriod,
}: ResultFrameworkCardProps) {
  const type = normalizeResultType(result.type);
  const title = getLocalizedNarrative(result.title, defaultLanguage) || 'Untitled result';
  const description = getLocalizedNarrative(result.description, defaultLanguage);
  const indicators = result.indicators || [];

  return (
    <div className="group/result overflow-hidden rounded-lg border border-border bg-card">
      {/* Result-type banner — shaded like the app modal headers */}
      <div className={cn('flex items-center justify-between px-4 py-2 border-b border-border', RESULT_TYPE_BANNER_CLASSES[type])}>
        <span className="text-helper font-semibold uppercase tracking-wide">
          {RESULT_TYPE_LABELS[type]}
        </span>
        <span className="text-helper font-semibold uppercase tracking-wide text-muted-foreground">
          Indicator ({indicators.length})
        </span>
      </div>

      {/* Result header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="min-w-0">
          <div className="font-semibold text-body-lg text-foreground">{title}</div>
          {description && <p className="mt-1 text-body text-muted-foreground">{description}</p>}
        </div>
        {editable && (
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/result:opacity-100 focus-within:opacity-100 transition-opacity">
            {onAddIndicator && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-helper" onClick={() => onAddIndicator(result.id)}>
                <Plus className="h-3.5 w-3.5" /> Indicator
              </Button>
            )}
            {onEditResult && (
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit result" onClick={() => onEditResult(result.id)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            {onDeleteResult && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" aria-label="Delete result" onClick={() => onDeleteResult(result.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Indicators */}
      {indicators.length === 0 ? (
        <div className="px-4 py-3 text-helper text-muted-foreground/70">No indicators.</div>
      ) : (
        indicators.map((indicator) => (
          <IndicatorFrameworkBlock
            key={indicator.id}
            indicator={indicator}
            defaultLanguage={defaultLanguage}
            editable={editable}
            onEditIndicator={onEditIndicator}
            onDeleteIndicator={onDeleteIndicator}
            onAddPeriod={onAddPeriod}
          />
        ))
      )}
    </div>
  );
}
