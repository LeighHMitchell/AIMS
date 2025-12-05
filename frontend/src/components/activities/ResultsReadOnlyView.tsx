'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResults } from '@/hooks/use-results';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { 
  ActivityResult, 
  ResultType, 
  RESULT_TYPE_LABELS,
  ResultIndicator,
  MeasureType
} from '@/types/results';

interface ResultsReadOnlyViewProps {
  activityId: string;
  defaultLanguage?: string;
  className?: string;
}

// Helper to extract string from multilingual object
const getLocalizedString = (value: any, defaultLanguage: string = 'en'): string => {
  if (!value) return '';
  
  // If it's a string, check if it's a stringified JSON object
  if (typeof value === 'string') {
    // Try to parse if it looks like JSON
    if (value.startsWith('{') && value.includes('"en"')) {
      try {
        const parsed = JSON.parse(value);
        // Extract from parsed object directly (no recursion)
        if (typeof parsed === 'object' && parsed !== null) {
          return String(parsed[defaultLanguage] || parsed['en'] || Object.values(parsed)[0] || '');
        }
        return value;
      } catch {
        return value;
      }
    }
    return value;
  }
  
  if (typeof value === 'object' && value !== null) {
    // Try the default language first
    if (value[defaultLanguage]) return String(value[defaultLanguage]);
    // Try 'en' as fallback
    if (value['en']) return String(value['en']);
    // Get first available value
    const values = Object.values(value);
    if (values.length > 0 && values[0] !== null && values[0] !== undefined) {
      return String(values[0]);
    }
  }
  return '';
};

// Format date for display
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  } catch {
    return dateString;
  }
};

// Format value based on measure type
const formatValue = (value: number | string | undefined, measure?: MeasureType): string => {
  if (value === undefined || value === null || value === '') return '—';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return String(value);
  
  switch (measure) {
    case 'percentage':
      return `${numValue}%`;
    case 'currency':
      return `$${numValue.toLocaleString()}`;
    case 'unit':
      return numValue.toLocaleString();
    default:
      return numValue.toLocaleString();
  }
};

// Calculate achievement percentage
const calculateAchievement = (actual: number | undefined, target: number | undefined): number | null => {
  if (actual === undefined || target === undefined || target === 0) return null;
  return Math.round((actual / target) * 100);
};

// Get achievement status based on percentage
const getAchievementStatus = (percentage: number | null): 'high' | 'medium' | 'low' | 'none' => {
  if (percentage === null) return 'none';
  if (percentage >= 80) return 'high';
  if (percentage >= 40) return 'medium';
  return 'low';
};

// Flatten results into indicator rows for table display
interface IndicatorRow {
  id: string;
  resultId: string;
  resultTitle: string;
  resultType: ResultType;
  indicatorTitle: string;
  periodStart?: string;
  periodEnd?: string;
  baseline?: number | string;
  baselineYear?: number;
  target?: number | string;
  targetComment?: string;
  actual?: number | string;
  actualComment?: string;
  measure?: MeasureType;
  achievementPercentage: number | null;
  status: 'high' | 'medium' | 'low' | 'none';
}


export function ResultsReadOnlyView({ 
  activityId, 
  defaultLanguage = 'en',
  className 
}: ResultsReadOnlyViewProps) {
  const { results, loading, error } = useResults(activityId);

  // Process results into table rows
  const { indicatorRows, summary } = useMemo(() => {
    const rows: IndicatorRow[] = [];
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let noDataCount = 0;

    if (!results || results.length === 0) {
      return { indicatorRows: [], summary: { high: 0, medium: 0, low: 0, noData: 0, total: 0 } };
    }

    results.forEach((result: ActivityResult) => {
      const resultTitle = getLocalizedString(result.title, defaultLanguage) || 'Untitled Result';

      if (!result.indicators || result.indicators.length === 0) {
        // Add result without indicators
        rows.push({
          id: result.id,
          resultId: result.id,
          resultTitle,
          resultType: result.type,
          indicatorTitle: '(No indicators defined)',
          achievementPercentage: null,
          status: 'none'
        });
        noDataCount++;
      } else {
        result.indicators.forEach((indicator: ResultIndicator) => {
          const indicatorTitle = getLocalizedString(indicator.title, defaultLanguage) || 'Untitled Indicator';

          // Get latest period data
          const periods = indicator.periods || [];
          const latestPeriod = periods.length > 0 
            ? periods.reduce((latest, period) => {
                if (!latest) return period;
                const latestDate = new Date(latest.period_end || '');
                const periodDate = new Date(period.period_end || '');
                return periodDate > latestDate ? period : latest;
              }, periods[0])
            : null;

          // Calculate achievement
          const actualValue = latestPeriod?.actual_value;
          const targetValue = latestPeriod?.target_value;
          const achievementPercentage = calculateAchievement(
            typeof actualValue === 'number' ? actualValue : undefined,
            typeof targetValue === 'number' ? targetValue : undefined
          );
          const status = getAchievementStatus(achievementPercentage);

          // Count for summary
          if (status === 'high') highCount++;
          else if (status === 'medium') mediumCount++;
          else if (status === 'low') lowCount++;
          else noDataCount++;

          // Extract comments safely
          const targetCommentRaw = latestPeriod?.target_comment;
          const actualCommentRaw = latestPeriod?.actual_comment;
          
          let targetCommentStr = '';
          let actualCommentStr = '';
          
          if (targetCommentRaw) {
            if (typeof targetCommentRaw === 'string') {
              targetCommentStr = targetCommentRaw.startsWith('{') ? '' : targetCommentRaw;
            } else if (typeof targetCommentRaw === 'object') {
              targetCommentStr = targetCommentRaw[defaultLanguage] || targetCommentRaw['en'] || '';
            }
          }
          
          if (actualCommentRaw) {
            if (typeof actualCommentRaw === 'string') {
              actualCommentStr = actualCommentRaw.startsWith('{') ? '' : actualCommentRaw;
            } else if (typeof actualCommentRaw === 'object') {
              actualCommentStr = actualCommentRaw[defaultLanguage] || actualCommentRaw['en'] || '';
            }
          }

          rows.push({
            id: indicator.id,
            resultId: result.id,
            resultTitle,
            resultType: result.type,
            indicatorTitle,
            periodStart: latestPeriod?.period_start,
            periodEnd: latestPeriod?.period_end,
            baseline: indicator.baseline?.value,
            baselineYear: indicator.baseline?.baseline_year,
            target: targetValue,
            targetComment: targetCommentStr,
            actual: actualValue,
            actualComment: actualCommentStr,
            measure: indicator.measure,
            achievementPercentage,
            status
          });
        });
      }
    });

    const total = highCount + mediumCount + lowCount + noDataCount;

    return { 
      indicatorRows: rows, 
      summary: { high: highCount, medium: mediumCount, low: lowCount, noData: noDataCount, total } 
    };
  }, [results, defaultLanguage]);

  // Calculate progress bar percentages
  const progressPercentages = useMemo(() => {
    if (summary.total === 0) return { high: 0, medium: 0, low: 0 };
    const withData = summary.total - summary.noData;
    if (withData === 0) return { high: 0, medium: 0, low: 0 };
    
    return {
      high: (summary.high / withData) * 100,
      medium: (summary.medium / withData) * 100,
      low: (summary.low / withData) * 100
    };
  }, [summary]);


  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="h-48 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load results: {error}</AlertDescription>
      </Alert>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card className="border-slate-200">
          <CardContent className="py-12">
            <div className="text-center">
              <Target className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-slate-900 mb-2">No results reported</h4>
              <p className="text-slate-500">
                This activity has not yet reported any results or indicators.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Results & Indicators</h3>
          <p className="text-sm text-slate-500 mt-1">
            {results.length} result{results.length !== 1 ? 's' : ''} · {indicatorRows.filter(r => r.indicatorTitle !== '(No indicators defined)').length} indicator{indicatorRows.filter(r => r.indicatorTitle !== '(No indicators defined)').length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Summary Card - Always visible */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Summary of indicator progress to date
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="h-3 rounded-full overflow-hidden bg-slate-200 flex">
            {progressPercentages.high > 0 && (
              <div 
                className="bg-[#6b9080] h-full transition-all duration-500"
                style={{ width: `${progressPercentages.high}%` }}
              />
            )}
            {progressPercentages.medium > 0 && (
              <div 
                className="bg-[#c4a35a] h-full transition-all duration-500"
                style={{ width: `${progressPercentages.medium}%` }}
              />
            )}
            {progressPercentages.low > 0 && (
              <div 
                className="bg-[#b87070] h-full transition-all duration-500"
                style={{ width: `${progressPercentages.low}%` }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table View */}
      {(
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-900 py-4 px-6">Title</TableHead>
                    <TableHead className="font-semibold text-slate-900 py-4 px-4">From</TableHead>
                    <TableHead className="font-semibold text-slate-900 py-4 px-4">To</TableHead>
                    <TableHead className="font-semibold text-slate-900 py-4 px-4">Baseline</TableHead>
                    <TableHead className="font-semibold text-slate-900 py-4 px-4">Target</TableHead>
                    <TableHead className="font-semibold text-slate-900 py-4 px-4">Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicatorRows.map((row, index) => (
                    <TableRow 
                      key={row.id} 
                      className={cn(
                        "border-b border-slate-100",
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      )}
                    >
                      <TableCell className="py-4 px-6">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">{row.resultTitle}</p>
                          {row.indicatorTitle !== '(No indicators defined)' && (
                            <p className="text-sm text-slate-600">{row.indicatorTitle}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4 text-slate-700">
                        {formatDate(row.periodStart)}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-slate-700">
                        {formatDate(row.periodEnd)}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-slate-700">
                        {row.baseline !== undefined ? (
                          <div>
                            <span>{formatValue(row.baseline, row.measure)}</span>
                            {row.baselineYear && (
                              <span className="text-slate-400 text-xs ml-1">({row.baselineYear})</span>
                            )}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="space-y-1">
                          <p className="text-slate-700">{formatValue(row.target, row.measure)}</p>
                          {row.targetComment && (
                            <p className="text-xs text-slate-500 max-w-xs">{row.targetComment}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-slate-700">{formatValue(row.actual, row.measure)}</p>
                            {row.achievementPercentage !== null && (
                              <Badge 
                                variant="outline"
                                className={cn(
                                  "text-xs font-normal",
                                  row.status === 'high' && "bg-[#e8f0ec] text-[#4a6a5a] border-[#c5d9ce]",
                                  row.status === 'medium' && "bg-[#f5f0e0] text-[#806830] border-[#ddd0a0]",
                                  row.status === 'low' && "bg-[#f5e8e8] text-[#904848] border-[#ddc0c0]"
                                )}
                              >
                                {row.achievementPercentage}%
                              </Badge>
                            )}
                          </div>
                          {row.actualComment && (
                            <p className="text-xs text-slate-500 max-w-md line-clamp-3">{row.actualComment}</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

