'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { IndicatorBaseline, DocumentLink } from '@/types/results';
import { 
  FileText,
  ExternalLink,
  Info
} from 'lucide-react';

interface BaselineDetailPanelProps {
  baseline?: IndicatorBaseline;
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

export function BaselineDetailPanel({ baseline, className }: BaselineDetailPanelProps) {
  if (!baseline) {
    return (
      <div className={cn("flex items-center justify-center text-slate-400 py-8", className)}>
        <Info className="h-5 w-5 mr-2" />
        No baseline data defined
      </div>
    );
  }

  const comment = getLocalizedString(baseline.comment);
  const hasDocuments = baseline.document_links && baseline.document_links.length > 0;

  return (
    <div className={cn("space-y-4", className)}>

      {/* Comment */}
      {comment && (
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">
              Comment
            </div>
            <p className="text-slate-700">{comment}</p>
          </CardContent>
        </Card>
      )}


      {/* Documents */}
      {hasDocuments && (
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Document Links
            </div>
            <div className="space-y-2">
              {baseline.document_links!.map((doc: DocumentLink) => (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-2 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div>
                      <div className="text-sm font-medium text-slate-700">
                        {getLocalizedString(doc.title) || 'Untitled Document'}
                      </div>
                      {doc.format && (
                        <div className="text-xs text-slate-500">
                          {doc.format}
                        </div>
                      )}
                    </div>
                  </div>
                  <a 
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 p-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state for additional info */}
      {!comment && !hasDocuments && (
        <div className="text-sm text-slate-400 text-center py-4">
          No additional baseline information available
        </div>
      )}
    </div>
  );
}

export default BaselineDetailPanel;
