'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ResultIndicator, 
  ResultReference, 
  DocumentLink,
  REFERENCE_VOCABULARIES 
} from '@/types/results';
import { BaselineDetailPanel } from './BaselineDetailPanel';
import { PeriodsDetailPanel } from './PeriodsDetailPanel';
import { DisaggregationChart } from './DisaggregationChart';
import { 
  Database, 
  Calendar, 
  Layers, 
  BookOpen, 
  FileText,
  ExternalLink
} from 'lucide-react';

interface IndicatorDetailTabsProps {
  indicator: ResultIndicator;
  className?: string;
}

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

// Get vocabulary label
const getVocabularyLabel = (code: string): string => {
  return REFERENCE_VOCABULARIES[code as keyof typeof REFERENCE_VOCABULARIES] || `Vocabulary ${code}`;
};

export function IndicatorDetailTabs({ indicator, className }: IndicatorDetailTabsProps) {
  const periodsCount = indicator.periods?.length || 0;
  const refsCount = indicator.references?.length || 0;
  const docsCount = indicator.document_links?.length || 0;
  
  // Check if disaggregation data exists
  const hasDisaggregation = 
    (indicator.baseline?.dimensions && indicator.baseline.dimensions.length > 0) ||
    indicator.periods?.some(p => 
      (p.target_dimensions && p.target_dimensions.length > 0) ||
      (p.actual_dimensions && p.actual_dimensions.length > 0)
    );

  return (
    <Tabs defaultValue="baseline" className={cn("w-full", className)}>
      <TabsList className="grid w-full grid-cols-5 h-auto">
        <TabsTrigger 
          value="baseline" 
          className="flex items-center gap-1.5 text-xs py-2"
        >
          <Database className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Baseline</span>
        </TabsTrigger>
        <TabsTrigger 
          value="periods" 
          className="flex items-center gap-1.5 text-xs py-2"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Periods</span>
          {periodsCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {periodsCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger 
          value="disaggregation" 
          className="flex items-center gap-1.5 text-xs py-2"
          disabled={!hasDisaggregation}
        >
          <Layers className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Disaggregation</span>
        </TabsTrigger>
        <TabsTrigger 
          value="references" 
          className="flex items-center gap-1.5 text-xs py-2"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">References</span>
          {refsCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {refsCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger 
          value="documents" 
          className="flex items-center gap-1.5 text-xs py-2"
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Documents</span>
          {docsCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {docsCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Baseline Tab */}
      <TabsContent value="baseline" className="mt-4">
        <BaselineDetailPanel 
          baseline={indicator.baseline}
        />
      </TabsContent>

      {/* Periods Tab */}
      <TabsContent value="periods" className="mt-4">
        <PeriodsDetailPanel 
          periods={indicator.periods}
          measure={indicator.measure}
        />
      </TabsContent>

      {/* Disaggregation Tab */}
      <TabsContent value="disaggregation" className="mt-4">
        {hasDisaggregation ? (
          <DisaggregationChart
            baseline={indicator.baseline}
            periods={indicator.periods}
            measure={indicator.measure}
          />
        ) : (
          <div className="flex items-center justify-center text-slate-400 py-8">
            <Layers className="h-5 w-5 mr-2" />
            No disaggregation data available
          </div>
        )}
      </TabsContent>

      {/* References Tab */}
      <TabsContent value="references" className="mt-4">
        {refsCount > 0 ? (
          <div className="space-y-3">
            {indicator.references!.map((ref: ResultReference) => (
              <div 
                key={ref.id}
                className="flex items-start justify-between p-3 rounded-md bg-slate-50 border border-slate-100"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getVocabularyLabel(ref.vocabulary)}
                    </Badge>
                    <code className="text-sm bg-white px-2 py-0.5 rounded border">
                      {ref.code}
                    </code>
                  </div>
                  {ref.indicator_uri && (
                    <a 
                      href={ref.indicator_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Indicator URI
                    </a>
                  )}
                  {ref.vocabulary_uri && (
                    <a 
                      href={ref.vocabulary_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Vocabulary URI
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center text-slate-400 py-8">
            <BookOpen className="h-5 w-5 mr-2" />
            No external references linked
          </div>
        )}
      </TabsContent>

      {/* Documents Tab */}
      <TabsContent value="documents" className="mt-4">
        {docsCount > 0 ? (
          <div className="space-y-2">
            {indicator.document_links!.map((doc: DocumentLink) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div>
                    <div className="font-medium text-sm text-slate-700">
                      {getLocalizedString(doc.title) || 'Untitled Document'}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      {doc.format && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          {doc.format.split('/').pop()?.toUpperCase()}
                        </Badge>
                      )}
                      {doc.category_code && (
                        <span>{doc.category_code}</span>
                      )}
                      {doc.document_date && (
                        <span>
                          {new Date(doc.document_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {getLocalizedString(doc.description)}
                      </p>
                    )}
                  </div>
                </div>
                <a 
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 p-2"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center text-slate-400 py-8">
            <FileText className="h-5 w-5 mr-2" />
            No documents attached
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

export default IndicatorDetailTabs;
