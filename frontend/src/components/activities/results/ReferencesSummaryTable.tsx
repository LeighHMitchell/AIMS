'use client';

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ActivityResult, ResultReference, REFERENCE_VOCABULARIES } from '@/types/results';
import { Search, ExternalLink, Target, BookOpen } from 'lucide-react';

interface ReferencesSummaryTableProps {
  results: ActivityResult[];
  className?: string;
}

interface AggregatedReference {
  vocabulary: string;
  vocabularyLabel: string;
  code: string;
  vocabularyUri?: string;
  indicatorUri?: string;
  linkedIndicators: {
    indicatorId: string;
    indicatorTitle: string;
    resultTitle: string;
    achievement: number | null;
  }[];
  avgAchievement: number | null;
  entityType: 'result' | 'indicator';
}

// Get vocabulary label from code
const getVocabularyLabel = (code: string): string => {
  return REFERENCE_VOCABULARIES[code as keyof typeof REFERENCE_VOCABULARIES] || `Vocabulary ${code}`;
};

// Calculate indicator achievement
const calculateAchievement = (indicator: any): number | null => {
  const periods = indicator?.periods || [];
  if (periods.length === 0) return null;
  
  const totalActual = periods.reduce((sum: number, p: any) => sum + (p.actual_value || 0), 0);
  const totalTarget = periods.reduce((sum: number, p: any) => sum + (p.target_value || 0), 0);
  
  if (totalTarget === 0) return null;
  return Math.round((totalActual / totalTarget) * 100);
};

// Get localized string from multilingual object
const getLocalizedString = (value: any, lang: string = 'en'): string => {
  if (!value) return '';
  if (typeof value === 'string') {
    if (value.startsWith('{')) {
      try {
        const parsed = JSON.parse(value);
        return parsed[lang] || parsed['en'] || Object.values(parsed)[0] || '';
      } catch {
        return value;
      }
    }
    return value;
  }
  if (typeof value === 'object') {
    return value[lang] || value['en'] || Object.values(value)[0] || '';
  }
  return '';
};

export function ReferencesSummaryTable({ results, className }: ReferencesSummaryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Aggregate references from all results and indicators
  const aggregatedReferences = useMemo(() => {
    const refMap = new Map<string, AggregatedReference>();

    results.forEach(result => {
      const resultTitle = getLocalizedString(result.title);

      // Process result-level references
      if (result.references) {
        result.references.forEach((ref: ResultReference) => {
          const key = `${ref.vocabulary}-${ref.code}`;
          if (!refMap.has(key)) {
            refMap.set(key, {
              vocabulary: ref.vocabulary,
              vocabularyLabel: getVocabularyLabel(ref.vocabulary),
              code: ref.code,
              vocabularyUri: ref.vocabulary_uri,
              linkedIndicators: [],
              avgAchievement: null,
              entityType: 'result'
            });
          }
          // Result references link to all indicators in that result
          const entry = refMap.get(key)!;
          result.indicators?.forEach(indicator => {
            const indicatorTitle = getLocalizedString(indicator.title);
            const achievement = calculateAchievement(indicator);
            entry.linkedIndicators.push({
              indicatorId: indicator.id,
              indicatorTitle: indicatorTitle || 'Untitled Indicator',
              resultTitle: resultTitle || 'Untitled Result',
              achievement
            });
          });
        });
      }

      // Process indicator-level references
      if (result.indicators) {
        result.indicators.forEach(indicator => {
          const indicatorTitle = getLocalizedString(indicator.title);
          const achievement = calculateAchievement(indicator);

          if (indicator.references) {
            indicator.references.forEach((ref: ResultReference) => {
              const key = `${ref.vocabulary}-${ref.code}`;
              if (!refMap.has(key)) {
                refMap.set(key, {
                  vocabulary: ref.vocabulary,
                  vocabularyLabel: getVocabularyLabel(ref.vocabulary),
                  code: ref.code,
                  vocabularyUri: ref.vocabulary_uri,
                  indicatorUri: ref.indicator_uri,
                  linkedIndicators: [],
                  avgAchievement: null,
                  entityType: 'indicator'
                });
              }
              const entry = refMap.get(key)!;
              // Avoid duplicates
              if (!entry.linkedIndicators.some(li => li.indicatorId === indicator.id)) {
                entry.linkedIndicators.push({
                  indicatorId: indicator.id,
                  indicatorTitle: indicatorTitle || 'Untitled Indicator',
                  resultTitle: resultTitle || 'Untitled Result',
                  achievement
                });
              }
            });
          }
        });
      }
    });

    // Calculate average achievement for each reference
    refMap.forEach(ref => {
      const achievements = ref.linkedIndicators
        .map(li => li.achievement)
        .filter((a): a is number => a !== null);
      
      if (achievements.length > 0) {
        ref.avgAchievement = Math.round(
          achievements.reduce((sum, a) => sum + a, 0) / achievements.length
        );
      }
    });

    return Array.from(refMap.values()).sort((a, b) => {
      // Sort by vocabulary first, then by code
      if (a.vocabulary !== b.vocabulary) {
        return a.vocabulary.localeCompare(b.vocabulary);
      }
      return a.code.localeCompare(b.code);
    });
  }, [results]);

  // Filter references based on search
  const filteredReferences = useMemo(() => {
    if (!searchTerm) return aggregatedReferences;
    
    const term = searchTerm.toLowerCase();
    return aggregatedReferences.filter(ref => 
      ref.vocabularyLabel.toLowerCase().includes(term) ||
      ref.code.toLowerCase().includes(term) ||
      ref.linkedIndicators.some(li => 
        li.indicatorTitle.toLowerCase().includes(term) ||
        li.resultTitle.toLowerCase().includes(term)
      )
    );
  }, [aggregatedReferences, searchTerm]);

  // Group by vocabulary for summary stats
  const vocabularySummary = useMemo(() => {
    const summary = new Map<string, { count: number; avgAchievement: number | null }>();
    
    aggregatedReferences.forEach(ref => {
      const existing = summary.get(ref.vocabularyLabel) || { count: 0, avgAchievement: null };
      const achievements: number[] = [];
      
      if (existing.avgAchievement !== null) achievements.push(existing.avgAchievement);
      if (ref.avgAchievement !== null) achievements.push(ref.avgAchievement);
      
      summary.set(ref.vocabularyLabel, {
        count: existing.count + 1,
        avgAchievement: achievements.length > 0 
          ? Math.round(achievements.reduce((a, b) => a + b, 0) / achievements.length)
          : null
      });
    });

    return summary;
  }, [aggregatedReferences]);

  if (aggregatedReferences.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-slate-400", className)}>
        <BookOpen className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No external references</p>
        <p className="text-sm">Results and indicators have no linked frameworks</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {Array.from(vocabularySummary.entries()).map(([label, data]) => (
          <Badge key={label} variant="outline" className="text-sm py-1 px-3">
            {label}: {data.count} reference{data.count !== 1 ? 's' : ''}
            {data.avgAchievement !== null && (
              <span className={cn(
                "ml-2",
                data.avgAchievement >= 80 && "text-[#4a6a5a]",
                data.avgAchievement >= 40 && data.avgAchievement < 80 && "text-[#806830]",
                data.avgAchievement < 40 && "text-[#904848]"
              )}>
                ({data.avgAchievement}% avg)
              </span>
            )}
          </Badge>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search references..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Framework</TableHead>
              <TableHead className="font-semibold">Code</TableHead>
              <TableHead className="font-semibold">Linked Indicators</TableHead>
              <TableHead className="font-semibold text-right">Avg Achievement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReferences.map((ref, index) => (
              <TableRow key={`${ref.vocabulary}-${ref.code}-${index}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">{ref.vocabularyLabel}</span>
                    {ref.vocabularyUri && (
                      <a 
                        href={ref.vocabularyUri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-sm bg-slate-100 px-2 py-0.5 rounded">
                    {ref.code}
                  </code>
                  {ref.indicatorUri && (
                    <a 
                      href={ref.indicatorUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-500 hover:text-blue-600"
                    >
                      <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {ref.linkedIndicators.slice(0, 3).map(li => (
                      <div key={li.indicatorId} className="text-sm">
                        <span className="text-slate-600">{li.resultTitle}</span>
                        <span className="text-slate-400 mx-1">›</span>
                        <span>{li.indicatorTitle}</span>
                      </div>
                    ))}
                    {ref.linkedIndicators.length > 3 && (
                      <div className="text-xs text-slate-400">
                        +{ref.linkedIndicators.length - 3} more
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {ref.avgAchievement !== null ? (
                    <Badge 
                      variant="outline"
                      className={cn(
                        "font-medium",
                        ref.avgAchievement >= 80 && "bg-[#e8f0ec] text-[#4a6a5a] border-[#c5d9ce]",
                        ref.avgAchievement >= 40 && ref.avgAchievement < 80 && "bg-[#f5f0e0] text-[#806830] border-[#ddd0a0]",
                        ref.avgAchievement < 40 && "bg-[#f5e8e8] text-[#904848] border-[#ddc0c0]"
                      )}
                    >
                      {ref.avgAchievement}%
                    </Badge>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredReferences.length === 0 && searchTerm && (
        <div className="text-center py-8 text-slate-400">
          No references match your search
        </div>
      )}
    </div>
  );
}

export default ReferencesSummaryTable;














