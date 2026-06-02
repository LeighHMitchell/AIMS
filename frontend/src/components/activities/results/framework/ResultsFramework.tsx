'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ActivityResult } from '@/types/results';
import { normalizeResultType } from './frameworkHelpers';
import { ResultFrameworkCard } from './ResultFrameworkCard';

interface ResultsFrameworkProps {
  results: ActivityResult[];
  defaultLanguage?: string;
  /** When true, edit affordances render (only if the matching callback is provided). */
  editable?: boolean;
  onEditResult?: (resultId: string) => void;
  onDeleteResult?: (resultId: string) => void;
  onAddIndicator?: (resultId: string) => void;
  onEditIndicator?: (indicatorId: string) => void;
  onDeleteIndicator?: (indicatorId: string) => void;
  onAddPeriod?: (indicatorId: string) => void;
  className?: string;
}

// Output → Outcome → Impact → Other for a logical reading order.
const TYPE_ORDER: Record<string, number> = { output: 0, outcome: 1, impact: 2, other: 3 };

/**
 * Shared, read-only d-portal-style presentation of an activity's results
 * framework. Pure props in / JSX out — no data hooks — so it can be reused by
 * both the activity editor and the public profile without divergence.
 */
export function ResultsFramework({
  results,
  defaultLanguage = 'en',
  editable = false,
  onEditResult,
  onDeleteResult,
  onAddIndicator,
  onEditIndicator,
  onDeleteIndicator,
  onAddPeriod,
  className,
}: ResultsFrameworkProps) {
  const ordered = [...(results || [])].sort(
    (a, b) => (TYPE_ORDER[normalizeResultType(a.type)] ?? 9) - (TYPE_ORDER[normalizeResultType(b.type)] ?? 9)
  );

  return (
    <div className={cn('space-y-4', className)}>
      {ordered.map((result) => (
        <ResultFrameworkCard
          key={result.id}
          result={result}
          defaultLanguage={defaultLanguage}
          editable={editable}
          onEditResult={onEditResult}
          onDeleteResult={onDeleteResult}
          onAddIndicator={onAddIndicator}
          onEditIndicator={onEditIndicator}
          onDeleteIndicator={onDeleteIndicator}
          onAddPeriod={onAddPeriod}
        />
      ))}
    </div>
  );
}
