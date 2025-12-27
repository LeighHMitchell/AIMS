'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  IndicatorPeriod, 
  MeasureType, 
  DocumentLink, 
  Dimension, 
  LocationReference 
} from '@/types/results';
import { PeriodTimeline } from './PeriodTimeline';
import { 
  Calendar, 
  MapPin, 
  Layers, 
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Target,
  CheckCircle,
  Info
} from 'lucide-react';

interface PeriodsDetailPanelProps {
  periods?: IndicatorPeriod[];
  measure?: MeasureType;
  className?: string;
}

// Format value based on measure type
const formatValue = (value: number | undefined, measure?: MeasureType): string => {
  if (value === undefined) return '—';
  switch (measure) {
    case 'percentage':
      return `${value}%`;
    case 'currency':
      return `$${value.toLocaleString()}`;
    default:
      return value.toLocaleString();
  }
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

// Format date for display
const formatDate = (dateString?: string): string => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

// Calculate achievement
const calculateAchievement = (actual?: number, target?: number): number | null => {
  if (actual === undefined || target === undefined || target === 0) return null;
  return Math.round((actual / target) * 100);
};

// Get status color
const getStatusColor = (achievement: number | null): string => {
  if (achievement === null) return 'bg-slate-100 text-slate-600';
  if (achievement >= 80) return 'bg-[#e8f0ec] text-[#4a6a5a] border-[#c5d9ce]';
  if (achievement >= 40) return 'bg-[#f5f0e0] text-[#806830] border-[#ddd0a0]';
  return 'bg-[#f5e8e8] text-[#904848] border-[#ddc0c0]';
};

interface PeriodCardProps {
  period: IndicatorPeriod;
  measure?: MeasureType;
}

function PeriodCard({ period, measure }: PeriodCardProps) {
  const [expanded, setExpanded] = useState(false);

  const achievement = calculateAchievement(period.actual_value, period.target_value);
  const targetComment = getLocalizedString(period.target_comment);
  const actualComment = getLocalizedString(period.actual_comment);

  const hasTargetDetails = 
    (period.target_locations && period.target_locations.length > 0) ||
    (period.target_dimensions && period.target_dimensions.length > 0) ||
    (period.target_document_links && period.target_document_links.length > 0) ||
    targetComment;

  const hasActualDetails = 
    (period.actual_locations && period.actual_locations.length > 0) ||
    (period.actual_dimensions && period.actual_dimensions.length > 0) ||
    (period.actual_document_links && period.actual_document_links.length > 0) ||
    actualComment;

  const hasDetails = hasTargetDetails || hasActualDetails;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-700">
            <Calendar className="h-4 w-4 inline mr-2 text-slate-400" />
            {formatDate(period.period_start)} — {formatDate(period.period_end)}
          </CardTitle>
          {achievement !== null && (
            <Badge variant="outline" className={cn("font-medium", getStatusColor(achievement))}>
              {achievement}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Target and Actual values */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-slate-500 uppercase tracking-wide">
              <Target className="h-3 w-3" />
              Target
            </div>
            <div className="text-lg font-semibold text-slate-700">
              {formatValue(period.target_value, measure)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-slate-500 uppercase tracking-wide">
              <CheckCircle className="h-3 w-3" />
              Actual
            </div>
            <div className="text-lg font-semibold text-slate-900">
              {formatValue(period.actual_value, measure)}
            </div>
          </div>
        </div>

        {/* Expand button */}
        {hasDetails && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-slate-500 hover:text-slate-700"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show Details
                </>
              )}
            </Button>

            {/* Expanded details */}
            {expanded && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                {/* Target details */}
                {hasTargetDetails && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      Target Details
                    </div>
                    
                    {targetComment && (
                      <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                        {targetComment}
                      </p>
                    )}

                    {period.target_locations && period.target_locations.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {period.target_locations.map((loc: LocationReference) => (
                          <Badge key={loc.id} variant="outline" className="text-xs">
                            {loc.location_ref}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {period.target_dimensions && period.target_dimensions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <Layers className="h-4 w-4 text-slate-400" />
                        {period.target_dimensions.map((dim: Dimension) => (
                          <Badge key={dim.id} variant="outline" className="text-xs bg-purple-50">
                            {dim.name}: {dim.value}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {period.target_document_links && period.target_document_links.length > 0 && (
                      <div className="space-y-1">
                        {period.target_document_links.map((doc: DocumentLink) => (
                          <a
                            key={doc.id}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <FileText className="h-4 w-4" />
                            {getLocalizedString(doc.title) || 'Document'}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actual details */}
                {hasActualDetails && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      Actual Details
                    </div>
                    
                    {actualComment && (
                      <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                        {actualComment}
                      </p>
                    )}

                    {period.actual_locations && period.actual_locations.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {period.actual_locations.map((loc: LocationReference) => (
                          <Badge key={loc.id} variant="outline" className="text-xs">
                            {loc.location_ref}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {period.actual_dimensions && period.actual_dimensions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <Layers className="h-4 w-4 text-slate-400" />
                        {period.actual_dimensions.map((dim: Dimension) => (
                          <Badge key={dim.id} variant="outline" className="text-xs bg-green-50">
                            {dim.name}: {dim.value}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {period.actual_document_links && period.actual_document_links.length > 0 && (
                      <div className="space-y-1">
                        {period.actual_document_links.map((doc: DocumentLink) => (
                          <a
                            key={doc.id}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <FileText className="h-4 w-4" />
                            {getLocalizedString(doc.title) || 'Document'}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function PeriodsDetailPanel({ periods = [], measure, className }: PeriodsDetailPanelProps) {
  if (!periods || periods.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-slate-400 py-8", className)}>
        <Info className="h-5 w-5 mr-2" />
        No tracking periods defined
      </div>
    );
  }

  // Sort periods by end date
  const sortedPeriods = [...periods].sort((a, b) => 
    new Date(a.period_end).getTime() - new Date(b.period_end).getTime()
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Timeline visualization */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-700">
            Progress Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PeriodTimeline periods={periods} measure={measure} />
        </CardContent>
      </Card>

      {/* Period cards */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">
          Period Details ({periods.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedPeriods.map(period => (
            <PeriodCard key={period.id} period={period} measure={measure} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default PeriodsDetailPanel;












