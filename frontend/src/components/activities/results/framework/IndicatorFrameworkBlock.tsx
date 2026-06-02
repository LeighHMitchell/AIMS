'use client';

import React from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ResultIndicator, IndicatorPeriod } from '@/types/results';
import {
  getLocalizedNarrative,
  normalizeMeasure,
  isQualitative,
  formatMeasureValue,
  getPeriodAchievement,
  getStatusStyle,
  formatPeriodRange,
  derivePeriodTypeLabel,
} from './frameworkHelpers';

interface IndicatorFrameworkBlockProps {
  indicator: ResultIndicator;
  defaultLanguage?: string;
  editable?: boolean;
  onEditIndicator?: (indicatorId: string) => void;
  onDeleteIndicator?: (indicatorId: string) => void;
  onAddPeriod?: (indicatorId: string) => void;
}

const MEASURE_LABELS: Record<string, string> = {
  unit: 'Unit',
  percentage: 'Percentage',
  qualitative: 'Qualitative',
};

// Muted "Not provided" cell.
const NotProvided = () => <span className="text-muted-foreground/60">Not provided</span>;

export function IndicatorFrameworkBlock({
  indicator,
  defaultLanguage = 'en',
  editable = false,
  onEditIndicator,
  onDeleteIndicator,
  onAddPeriod,
}: IndicatorFrameworkBlockProps) {
  const title = getLocalizedNarrative(indicator.title, defaultLanguage) || 'Untitled indicator';
  const measure = normalizeMeasure(indicator.measure);
  const qualitative = isQualitative(indicator.measure);
  const periods = [...(indicator.periods || [])].sort(
    (a, b) => (a.period_start || '').localeCompare(b.period_start || '')
  );
  const baseline = indicator.baseline;

  // Disaggregation dimension name(s) appended to the indicator title,
  // e.g. "Investment Performance Ratings - Disability equity".
  const dimensionNames = Array.from(
    new Set(
      periods
        .flatMap((p) => [...(p.actual_dimensions || []), ...(p.target_dimensions || [])])
        .map((d) => d?.name)
        .filter((n): n is string => !!n)
    )
  );
  const titleWithDimensions = dimensionNames.length ? `${title} - ${dimensionNames.join(', ')}` : title;

  const renderBaselineCell = (firstRow: boolean) => {
    if (!firstRow) return null; // baseline belongs to the indicator → show once
    if (!baseline || (baseline.value == null && !baseline.iso_date && !baseline.baseline_year)) {
      return <NotProvided />;
    }
    return (
      <div>
        <div>{baseline.value != null ? formatMeasureValue(baseline.value, indicator.measure) : <NotProvided />}</div>
        {(baseline.baseline_year || baseline.iso_date) && (
          <div className="text-helper text-muted-foreground">
            {baseline.baseline_year || (baseline.iso_date ? baseline.iso_date.slice(0, 10) : '')}
          </div>
        )}
      </div>
    );
  };

  const renderTargetCell = (p: IndicatorPeriod) => {
    const comment = getLocalizedNarrative(p.target_comment, defaultLanguage);
    let main: React.ReactNode;
    if (qualitative) {
      main = comment ? <span>{comment}</span> : <NotProvided />;
    } else {
      main = p.target_value != null ? <span>{formatMeasureValue(p.target_value, indicator.measure)}</span> : <NotProvided />;
    }
    return (
      <div>
        {main}
        {!qualitative && comment && <div className="text-helper text-muted-foreground mt-0.5">{comment}</div>}
      </div>
    );
  };

  const renderActualCell = (p: IndicatorPeriod) => {
    const comment = getLocalizedNarrative(p.actual_comment, defaultLanguage);
    let main: React.ReactNode;
    if (qualitative) {
      main = comment ? <span>{comment}</span> : <NotProvided />;
    } else {
      main = p.actual_value != null ? <span className="font-medium">{formatMeasureValue(p.actual_value, indicator.measure)}</span> : <NotProvided />;
    }
    return (
      <div>
        {main}
        {!qualitative && comment && <div className="text-helper text-muted-foreground mt-0.5">{comment}</div>}
      </div>
    );
  };

  const renderPercentCell = (p: IndicatorPeriod) => {
    if (qualitative) return <span className="text-muted-foreground">N/A</span>;
    const pct = getPeriodAchievement(p);
    if (pct == null) return <span className="text-muted-foreground">N/A</span>;
    const style = getStatusStyle(pct);
    return (
      <span className={cn('inline-flex items-center gap-1.5 font-medium', style.textClass)}>
        <span className={cn('h-2 w-2 rounded-full', style.dotClass)} />
        {pct}%
      </span>
    );
  };

  return (
    <div className="group/ind border-t border-border first:border-t-0">
      {/* Indicator header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <span className="inline-block rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Indicator
          </span>
          <div className="mt-1.5 font-medium text-body text-foreground">{titleWithDimensions}</div>
          <div className="text-helper text-muted-foreground">
            {MEASURE_LABELS[measure]}
            {indicator.ascending != null && ` · ${indicator.ascending ? 'Higher is better' : 'Lower is better'}`}
          </div>
        </div>
        {editable && (
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/ind:opacity-100 focus-within:opacity-100 transition-opacity">
            {onAddPeriod && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-helper" onClick={() => onAddPeriod(indicator.id)}>
                <Plus className="h-3.5 w-3.5" /> Period
              </Button>
            )}
            {onEditIndicator && (
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit indicator" onClick={() => onEditIndicator(indicator.id)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            {onDeleteIndicator && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" aria-label="Delete indicator" onClick={() => onDeleteIndicator(indicator.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Period table */}
      {periods.length === 0 ? (
        <div className="px-4 pb-3 text-helper text-muted-foreground/70">No periods reported.</div>
      ) : (
        <div className="px-4 pb-3 overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="text-left text-helper uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="py-1.5 pr-4 font-medium">Baseline</th>
                <th className="py-1.5 pr-4 font-medium">Target</th>
                <th className="py-1.5 pr-4 font-medium">Actual</th>
                <th className="py-1.5 pr-4 font-medium">%</th>
                <th className="py-1.5 font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p, i) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 align-top">
                  <td className="py-2 pr-4">{renderBaselineCell(i === 0)}</td>
                  <td className="py-2 pr-4">{renderTargetCell(p)}</td>
                  <td className="py-2 pr-4">{renderActualCell(p)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{renderPercentCell(p)}</td>
                  <td className="py-2 whitespace-nowrap text-muted-foreground">
                    <div>{formatPeriodRange(p)}</div>
                    {derivePeriodTypeLabel(p) && <div className="text-helper">{derivePeriodTypeLabel(p)}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
