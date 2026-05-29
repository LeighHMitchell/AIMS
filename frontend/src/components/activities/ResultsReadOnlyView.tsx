'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, getSortIcon } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Target,
  AlertCircle,
  BarChart3,
  Table2,
  ChevronDown,
  ChevronRight,
  FileText,
  HelpCircle,
  List,
  Search,
  X
} from 'lucide-react';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useResults } from '@/hooks/use-results';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend,
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ActivityResult, 
  ResultType, 
  RESULT_TYPE_LABELS,
  ResultIndicator,
  MeasureType
} from '@/types/results';

// Import new sub-components
import { 
  IndicatorSparkline, 
  IndicatorDetailTabs,
  DocumentsGalleryTable
} from './results';

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

// Extended indicator row interface with full indicator data for expanded view
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
  // Full indicator data for expanded view
  indicator?: ResultIndicator;
  // Additional fields for new columns
  comment?: string;
  locationRefs?: string[];
  dimensions?: { name: string; value: string }[];
}


export function ResultsReadOnlyView({ 
  activityId, 
  defaultLanguage = 'en',
  className 
}: ResultsReadOnlyViewProps) {
  const [viewMode, setViewMode] = useState<'visualization' | 'table'>('table');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTopTab, setActiveTopTab] = useState<'indicators' | 'references' | 'documents'>('indicators');
  const [searchQuery, setSearchQuery] = useState('');
  type ResultsSortField = 'title' | 'baseline' | 'target' | 'actual';
  const [sortField, setSortField] = useState<ResultsSortField | ''>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const handleResultsSort = (field: ResultsSortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  const { results, loading, error } = useResults(activityId);

  // Toggle row expansion
  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

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

          // Gather location references from baseline and latest period
          const locationRefs: string[] = [];
          if (indicator.baseline?.locations) {
            indicator.baseline.locations.forEach(loc => {
              if (loc.location_ref && !locationRefs.includes(loc.location_ref)) {
                locationRefs.push(loc.location_ref);
              }
            });
          }
          if (latestPeriod?.target_locations) {
            latestPeriod.target_locations.forEach(loc => {
              if (loc.location_ref && !locationRefs.includes(loc.location_ref)) {
                locationRefs.push(loc.location_ref);
              }
            });
          }
          if (latestPeriod?.actual_locations) {
            latestPeriod.actual_locations.forEach(loc => {
              if (loc.location_ref && !locationRefs.includes(loc.location_ref)) {
                locationRefs.push(loc.location_ref);
              }
            });
          }

          // Gather dimensions from baseline
          const dimensions: { name: string; value: string }[] = [];
          if (indicator.baseline?.dimensions) {
            indicator.baseline.dimensions.forEach(dim => {
              dimensions.push({ name: dim.name, value: dim.value });
            });
          }

          // Get combined comment (prefer actual comment, fall back to target comment)
          const commentStr = actualCommentStr || targetCommentStr;

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
            status,
            // Include full indicator for expanded view
            indicator,
            // New fields
            comment: commentStr,
            locationRefs,
            dimensions
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

  // Apply search + sort. Search matches result title, indicator title and comment.
  const sortedIndicatorRows = useMemo(() => {
    let rows = indicatorRows;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r: any) => {
        return (
          (r.resultTitle || '').toLowerCase().includes(q) ||
          (r.indicatorTitle || '').toLowerCase().includes(q) ||
          (r.comment || '').toLowerCase().includes(q)
        );
      });
    }
    if (!sortField) return rows;
    const dir = sortOrder === 'asc' ? 1 : -1;
    const numeric = (v: any) => {
      const n = typeof v === 'string' ? parseFloat(v) : v;
      return typeof n === 'number' && !Number.isNaN(n) ? n : null;
    };
    return [...rows].sort((a: any, b: any) => {
      switch (sortField) {
        case 'title': {
          return ((a.indicatorTitle || a.resultTitle) || '')
            .localeCompare(b.indicatorTitle || b.resultTitle || '') * dir;
        }
        case 'baseline':
        case 'target':
        case 'actual': {
          const an = numeric(a[sortField]);
          const bn = numeric(b[sortField]);
          if (an == null && bn == null) return 0;
          if (an == null) return 1;
          if (bn == null) return -1;
          return (an - bn) * dir;
        }
        default:
          return 0;
      }
    });
  }, [indicatorRows, sortField, sortOrder, searchQuery]);

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

  // Compute chart data for visualization view.
  // Palette mirrors the analytics dashboard: deep slate -> cool steel -> pale slate,
  // with primary scarlet reserved for the lowest achievement bucket as a warning cue.
  const chartData = useMemo(() => {
    // Achievement status pie chart data
    const achievementData = [
      { name: '≥80%', value: summary.high, color: '#4c5568' },
      { name: '40-80%', value: summary.medium, color: '#7b95a7' },
      { name: '<40%', value: summary.low, color: '#dc2625' },
    ].filter(d => d.value > 0);

    // Results by type pie chart data
    const typeCount: Record<string, number> = { output: 0, outcome: 0, impact: 0 };
    if (results) {
      results.forEach((r: ActivityResult) => {
        if (r.type && typeCount[r.type] !== undefined) {
          typeCount[r.type] = typeCount[r.type] + 1;
        }
      });
    }
    const typeData = [
      { name: 'Output', value: typeCount.output, color: '#4c5568' },
      { name: 'Outcome', value: typeCount.outcome, color: '#7b95a7' },
      { name: 'Impact', value: typeCount.impact, color: '#cfd0d5' },
    ].filter(d => d.value > 0);

    return { achievementData, typeData };
  }, [summary, results]);

  // Compute results with their indicators for the cards view
  const resultsWithIndicators = useMemo(() => {
    if (!results || results.length === 0) return [];
    
    return results.map((result: ActivityResult) => {
      const resultTitle = getLocalizedString(result.title, defaultLanguage) || 'Untitled Result';
      
      const indicatorsData = (result.indicators || []).map((indicator: ResultIndicator) => {
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

        const actualValue = latestPeriod?.actual_value;
        const targetValue = latestPeriod?.target_value;
        const achievementPercentage = calculateAchievement(
          typeof actualValue === 'number' ? actualValue : undefined,
          typeof targetValue === 'number' ? targetValue : undefined
        );
        const status = getAchievementStatus(achievementPercentage);

        return {
          id: indicator.id,
          title: indicatorTitle,
          target: targetValue,
          actual: actualValue,
          measure: indicator.measure,
          achievementPercentage,
          status
        };
      });

      return {
        id: result.id,
        title: resultTitle,
        type: result.type,
        indicators: indicatorsData
      };
    });
  }, [results, defaultLanguage]);

  // Count documents for tab badge
  const totalDocs = useMemo(() => {
    let docs = 0;

    results?.forEach(result => {
      docs += result.document_links?.length || 0;

      result.indicators?.forEach(indicator => {
        docs += indicator.document_links?.length || 0;
        docs += indicator.baseline?.document_links?.length || 0;
        
        indicator.periods?.forEach(period => {
          docs += period.target_document_links?.length || 0;
          docs += period.actual_document_links?.length || 0;
        });
      });
    });

    return docs;
  }, [results]);

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="h-48 bg-muted rounded-lg animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
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
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">No results reported</h4>
              <p className="text-muted-foreground">
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
          <h3 className="text-xl font-semibold text-foreground">Results & Indicators</h3>
          <p className="text-body text-muted-foreground mt-1">
            {results.length} result{results.length !== 1 ? 's' : ''} · {indicatorRows.filter(r => r.indicatorTitle !== '(No indicators defined)').length} indicator{indicatorRows.filter(r => r.indicatorTitle !== '(No indicators defined)').length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Single toolbar row: Search (left) + Charts/Table view toggle + Indicators/Documents tabs (right). */}
      <Tabs value={activeTopTab} onValueChange={(v) => setActiveTopTab(v as any)}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="relative w-full max-w-xs">
            {activeTopTab === 'indicators' && (
              <>
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search results, indicators, comments…"
                  className="pl-8 pr-8 h-9"
                  aria-label="Search results"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {activeTopTab === 'indicators' && (
              <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('visualization')}
                  title="Charts"
                  aria-label="Charts"
                  className={cn("h-8 w-8", viewMode === 'visualization' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('table')}
                  title="Table"
                  aria-label="Table"
                  className={cn("h-8 w-8", viewMode === 'table' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
                >
                  <Table2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            <TabsList>
              <TabsTrigger value="indicators" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Indicators
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
                {totalDocs > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-helper">
                    {totalDocs}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="indicators" className="mt-0">
          {/* Visualization View */}
          {viewMode === 'visualization' && (
            <div className="space-y-6">
              {/* Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Achievement Status Pie Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-foreground inline-flex items-center gap-1.5">
                      Indicator Achievement Status
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" aria-label="What does this chart show?" className="text-muted-foreground hover:text-foreground transition-colors">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" className="max-w-xs text-helper leading-relaxed">
                            How many indicators are tracking ahead of, around, or behind their targets — green ≥ 80%, amber 40-80%, red &lt; 40%.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chartData.achievementData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData.achievementData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                            >
                              {chartData.achievementData.map((entry, index) => (
                                <Cell key={`achievement-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                              content={({ active, payload }: any) => {
                                if (!active || !payload?.length) return null;
                                const slice = payload[0].payload;
                                const value = Number(payload[0].value || 0);
                                return (
                                  <ChartTooltipCard
                                    title={slice.name}
                                    minWidth={180}
                                    rows={[{
                                      label: 'Indicators',
                                      value: `${value} indicator${value !== 1 ? 's' : ''}`,
                                      color: slice.color,
                                    }]}
                                  />
                                );
                              }}
                            />
                            <RechartsLegend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No achievement data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Results by Type Pie Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-foreground inline-flex items-center gap-1.5">
                      Results by Type
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" aria-label="What does this chart show?" className="text-muted-foreground hover:text-foreground transition-colors">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" className="max-w-xs text-helper leading-relaxed">
                            Distribution of result statements across IATI result types: Output, Outcome and Impact.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chartData.typeData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData.typeData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                            >
                              {chartData.typeData.map((entry, index) => (
                                <Cell key={`type-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                              content={({ active, payload }: any) => {
                                if (!active || !payload?.length) return null;
                                const slice = payload[0].payload;
                                const value = Number(payload[0].value || 0);
                                return (
                                  <ChartTooltipCard
                                    title={slice.name}
                                    minWidth={180}
                                    rows={[{
                                      label: 'Results',
                                      value: `${value} result${value !== 1 ? 's' : ''}`,
                                      color: slice.color,
                                    }]}
                                  />
                                );
                              }}
                            />
                            <RechartsLegend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No results data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Results Details Cards */}
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-4">Results Details</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {resultsWithIndicators.map((result) => (
                    <Card key={result.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold text-foreground">
                            {result.title}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-helper",
                              result.type === 'output' && "bg-[#f1f4f8] text-[#4c5568] border-[#cfd0d5]",
                              result.type === 'outcome' && "bg-[#e8ecf1] text-[#4c5568] border-[#7b95a7]",
                              result.type === 'impact' && "bg-[#cfd0d5] text-[#4c5568] border-[#7b95a7]"
                            )}
                          >
                            {RESULT_TYPE_LABELS[result.type] || result.type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {result.indicators.length === 0 ? (
                          <p className="text-body text-muted-foreground italic">No indicators defined</p>
                        ) : (
                          result.indicators.map((indicator) => (
                            <div key={indicator.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-body text-foreground font-medium">{indicator.title}</p>
                                {indicator.achievementPercentage !== null && (
                                  <Badge 
                                    variant="outline"
                                    className={cn(
                                      "text-helper font-normal",
                                      indicator.status === 'high' && "bg-[#e8f0ec] text-[#4a6a5a] border-[#c5d9ce]",
                                      indicator.status === 'medium' && "bg-[#f5f0e0] text-[#806830] border-[#ddd0a0]",
                                      indicator.status === 'low' && "bg-[#f5e8e8] text-[#904848] border-[#ddc0c0]"
                                    )}
                                  >
                                    {indicator.achievementPercentage}%
                                  </Badge>
                                )}
                              </div>
                              {/* Progress Bar */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-helper text-muted-foreground">
                                  <span>Target: {formatValue(indicator.target, indicator.measure)}</span>
                                </div>
                                <div className="h-4 rounded-full overflow-hidden bg-muted">
                                  <div 
                                    className={cn(
                                      "h-full transition-all duration-500",
                                      indicator.status === 'high' && "bg-[#6b9080]",
                                      indicator.status === 'medium' && "bg-[#c4a35a]",
                                      indicator.status === 'low' && "bg-[#b87070]",
                                      indicator.status === 'none' && "bg-muted-foreground"
                                    )}
                                    style={{ width: `${Math.min(indicator.achievementPercentage || 0, 100)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-helper text-muted-foreground">
                                  <span>Actual: {formatValue(indicator.actual, indicator.measure)}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Table View with Expandable Rows */}
          {viewMode === 'table' && (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-3 px-4 w-10"></TableHead>
                        <TableHead
                          className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors w-[28%] min-w-[260px]"
                          onClick={() => handleResultsSort('title')}
                        >
                          <div className="flex items-center gap-1">
                            <span>Title</span>
                            {getSortIcon('title', sortField, sortOrder)}
                          </div>
                        </TableHead>
                        <TableHead
                          className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap w-20"
                          onClick={() => handleResultsSort('baseline')}
                        >
                          <div className="flex items-center gap-1">
                            <span>Baseline</span>
                            {getSortIcon('baseline', sortField, sortOrder)}
                          </div>
                        </TableHead>
                        <TableHead
                          className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap w-20"
                          onClick={() => handleResultsSort('target')}
                        >
                          <div className="flex items-center gap-1">
                            <span>Target</span>
                            {getSortIcon('target', sortField, sortOrder)}
                          </div>
                        </TableHead>
                        <TableHead
                          className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap w-20"
                          onClick={() => handleResultsSort('actual')}
                        >
                          <div className="flex items-center gap-1">
                            <span>Actual</span>
                            {getSortIcon('actual', sortField, sortOrder)}
                          </div>
                        </TableHead>
                        <TableHead className="py-3 px-4 w-24 whitespace-nowrap">Trend</TableHead>
                        <TableHead className="py-3 px-4 whitespace-nowrap w-[200px]">Comment</TableHead>
                        <TableHead className="py-3 px-4 whitespace-nowrap w-[140px]">Location Refs</TableHead>
                        <TableHead className="py-3 px-4 whitespace-nowrap w-[180px]">Disaggregation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedIndicatorRows.map((row) => (
                        <React.Fragment key={row.id}>
                          {/* Main row */}
                          <TableRow
                            className={cn(
                              "border-b border-border/40 hover:bg-muted/30 transition-colors",
                              row.indicator && "cursor-pointer",
                            )}
                            onClick={() => row.indicator && toggleRowExpansion(row.id)}
                          >
                            <TableCell className="py-3 px-4">
                              {row.indicator && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowExpansion(row.id);
                                  }}
                                >
                                  {expandedRows.has(row.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{row.resultTitle}</p>
                                {row.indicatorTitle !== '(No indicators defined)' && (
                                  <p className="text-body text-muted-foreground">{row.indicatorTitle}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-foreground">
                              {row.baseline !== undefined ? (
                                <div>
                                  <span>{formatValue(row.baseline, row.measure)}</span>
                                  {row.baselineYear && (
                                    <span className="text-muted-foreground text-helper ml-1">{row.baselineYear}</span>
                                  )}
                                </div>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <div className="space-y-1">
                                <p className="text-foreground">{formatValue(row.target, row.measure)}</p>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <div>
                                <span className="text-foreground">{formatValue(row.actual, row.measure)}</span>
                                {row.achievementPercentage !== null && (
                                  <span className="text-muted-foreground text-helper ml-1">{row.achievementPercentage}%</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              {row.indicator && (
                                <IndicatorSparkline
                                  baseline={row.indicator.baseline}
                                  periods={row.indicator.periods}
                                  width={80}
                                  height={28}
                                />
                              )}
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              {row.comment ? (
                                <p className="text-body text-muted-foreground max-w-[200px] truncate" title={row.comment}>
                                  {row.comment}
                                </p>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              {row.locationRefs && row.locationRefs.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.locationRefs.map((ref, idx) => (
                                    <Badge 
                                      key={idx}
                                      variant="outline" 
                                      className="text-xs font-mono bg-muted text-muted-foreground border-border"
                                    >
                                      {ref}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              {row.dimensions && row.dimensions.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.dimensions.map((dim, idx) => (
                                    <Badge 
                                      key={idx}
                                      variant="outline"
                                      className="text-helper font-normal bg-muted text-foreground border-border"
                                    >
                                      <span className="font-mono bg-muted text-muted-foreground px-1 rounded">{dim.name}</span>
                                      <span className="ml-1">{dim.value}</span>
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>

                          {/* Expanded row with detail tabs */}
                          {expandedRows.has(row.id) && row.indicator && (
                            <TableRow className="bg-muted/40">
                              <TableCell colSpan={9} className="p-0">
                                <div className="p-6 border-t border-border/40">
                                  <IndicatorDetailTabs indicator={row.indicator} />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Documents Gallery Tab */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                Document Links Gallery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentsGalleryTable results={results} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
