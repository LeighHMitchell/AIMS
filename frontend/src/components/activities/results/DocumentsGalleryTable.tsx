'use client';

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActivityResult, DocumentLink } from '@/types/results';
import { 
  Search, 
  ExternalLink, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  File,
  SlidersHorizontal,
  FolderOpen
} from 'lucide-react';

interface DocumentsGalleryTableProps {
  results: ActivityResult[];
  className?: string;
}

interface FlattenedDocument {
  id: string;
  url: string;
  title: string;
  description?: string;
  format?: string;
  categoryCode?: string;
  languageCode?: string;
  documentDate?: string;
  attachedTo: string;
  attachedToType: 'result' | 'indicator' | 'baseline' | 'period';
  resultTitle: string;
  indicatorTitle?: string;
}

// Document category labels (IATI Document Category codes)
const DOCUMENT_CATEGORIES: Record<string, string> = {
  'A01': 'Pre- and post-project impact appraisal',
  'A02': 'Objectives / Purpose of activity',
  'A03': 'Intended ultimate beneficiaries',
  'A04': 'Conditions',
  'A05': 'Budget',
  'A06': 'Summary information about contract',
  'A07': 'Review of project performance and evaluation',
  'A08': 'Results, outcomes and outputs',
  'A09': 'Memorandum of understanding',
  'A10': 'Tender',
  'A11': 'Contract',
  'A12': 'Activity web page',
  'B01': 'Annual report',
  'B02': 'Institutional Strategy paper',
  'B03': 'Country strategy paper',
  'B04': 'Aid Allocation Policy',
  'B05': 'Procurement Policy and Procedure',
  'B06': 'Institutional Audit Report',
  'B07': 'Country Audit Report',
  'B08': 'Exclusions Policy',
  'B09': 'Institutional Evaluation Report',
  'B10': 'Country Evaluation Report',
  'B11': 'Sector strategy',
  'B12': 'Thematic strategy',
  'B13': 'Country-level Memorandum of Understanding',
  'B14': 'Evaluations policy',
  'B15': 'General Terms and Conditions',
  'B16': 'Organisation web page',
  'B17': 'Country/Region web page',
  'B18': 'Sector web page',
};

// Get icon based on format
const getFormatIcon = (format?: string) => {
  if (!format) return <File className="h-4 w-4" />;
  
  const f = format.toLowerCase();
  if (f.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
  if (f.includes('xls') || f.includes('spreadsheet') || f.includes('csv')) {
    return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  }
  if (f.includes('image') || f.includes('png') || f.includes('jpg') || f.includes('jpeg')) {
    return <FileImage className="h-4 w-4 text-blue-500" />;
  }
  if (f.includes('doc') || f.includes('text') || f.includes('odt')) {
    return <FileText className="h-4 w-4 text-blue-600" />;
  }
  return <File className="h-4 w-4 text-slate-400" />;
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

export function DocumentsGalleryTable({ results, className }: DocumentsGalleryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Flatten all documents from results hierarchy
  const flattenedDocuments = useMemo(() => {
    const docs: FlattenedDocument[] = [];

    results.forEach(result => {
      const resultTitle = getLocalizedString(result.title) || 'Untitled Result';

      // Result-level documents
      if (result.document_links) {
        result.document_links.forEach((doc: DocumentLink) => {
          docs.push({
            id: doc.id,
            url: doc.url,
            title: getLocalizedString(doc.title) || 'Untitled Document',
            description: getLocalizedString(doc.description),
            format: doc.format,
            categoryCode: doc.category_code,
            languageCode: doc.language_code,
            documentDate: doc.document_date,
            attachedTo: resultTitle,
            attachedToType: 'result',
            resultTitle
          });
        });
      }

      // Indicator-level documents
      if (result.indicators) {
        result.indicators.forEach(indicator => {
          const indicatorTitle = getLocalizedString(indicator.title) || 'Untitled Indicator';

          // Indicator documents
          if (indicator.document_links) {
            indicator.document_links.forEach((doc: DocumentLink) => {
              docs.push({
                id: doc.id,
                url: doc.url,
                title: getLocalizedString(doc.title) || 'Untitled Document',
                description: getLocalizedString(doc.description),
                format: doc.format,
                categoryCode: doc.category_code,
                languageCode: doc.language_code,
                documentDate: doc.document_date,
                attachedTo: indicatorTitle,
                attachedToType: 'indicator',
                resultTitle,
                indicatorTitle
              });
            });
          }

          // Baseline documents
          if (indicator.baseline?.document_links) {
            indicator.baseline.document_links.forEach((doc: DocumentLink) => {
              docs.push({
                id: doc.id,
                url: doc.url,
                title: getLocalizedString(doc.title) || 'Untitled Document',
                description: getLocalizedString(doc.description),
                format: doc.format,
                categoryCode: doc.category_code,
                languageCode: doc.language_code,
                documentDate: doc.document_date,
                attachedTo: `${indicatorTitle} (Baseline)`,
                attachedToType: 'baseline',
                resultTitle,
                indicatorTitle
              });
            });
          }

          // Period documents
          if (indicator.periods) {
            indicator.periods.forEach(period => {
              const periodLabel = `${formatDate(period.period_start)} - ${formatDate(period.period_end)}`;
              
              // Target documents
              if (period.target_document_links) {
                period.target_document_links.forEach((doc: DocumentLink) => {
                  docs.push({
                    id: doc.id,
                    url: doc.url,
                    title: getLocalizedString(doc.title) || 'Untitled Document',
                    description: getLocalizedString(doc.description),
                    format: doc.format,
                    categoryCode: doc.category_code,
                    languageCode: doc.language_code,
                    documentDate: doc.document_date,
                    attachedTo: `${indicatorTitle} (${periodLabel} Target)`,
                    attachedToType: 'period',
                    resultTitle,
                    indicatorTitle
                  });
                });
              }

              // Actual documents
              if (period.actual_document_links) {
                period.actual_document_links.forEach((doc: DocumentLink) => {
                  docs.push({
                    id: doc.id,
                    url: doc.url,
                    title: getLocalizedString(doc.title) || 'Untitled Document',
                    description: getLocalizedString(doc.description),
                    format: doc.format,
                    categoryCode: doc.category_code,
                    languageCode: doc.language_code,
                    documentDate: doc.document_date,
                    attachedTo: `${indicatorTitle} (${periodLabel} Actual)`,
                    attachedToType: 'period',
                    resultTitle,
                    indicatorTitle
                  });
                });
              }
            });
          }
        });
      }
    });

    // Sort by date descending
    return docs.sort((a, b) => {
      if (!a.documentDate && !b.documentDate) return 0;
      if (!a.documentDate) return 1;
      if (!b.documentDate) return -1;
      return new Date(b.documentDate).getTime() - new Date(a.documentDate).getTime();
    });
  }, [results]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    flattenedDocuments.forEach(doc => {
      if (doc.categoryCode) cats.add(doc.categoryCode);
    });
    return Array.from(cats).sort();
  }, [flattenedDocuments]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return flattenedDocuments.filter(doc => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          doc.title.toLowerCase().includes(term) ||
          (doc.description?.toLowerCase().includes(term)) ||
          doc.attachedTo.toLowerCase().includes(term) ||
          doc.resultTitle.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && doc.categoryCode !== categoryFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && doc.attachedToType !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [flattenedDocuments, searchTerm, categoryFilter, typeFilter]);

  if (flattenedDocuments.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-slate-400", className)}>
        <FolderOpen className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No documents attached</p>
        <p className="text-sm">Results have no linked documents</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {DOCUMENT_CATEGORIES[cat] || cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Attached to" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="result">Result</SelectItem>
            <SelectItem value="indicator">Indicator</SelectItem>
            <SelectItem value="baseline">Baseline</SelectItem>
            <SelectItem value="period">Period</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold w-[300px]">Document</TableHead>
              <TableHead className="font-semibold">Format</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Attached To</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-start gap-2">
                    {getFormatIcon(doc.format)}
                    <div>
                      <div className="font-medium">{doc.title}</div>
                      {doc.description && (
                        <div className="text-xs text-slate-500 line-clamp-1">
                          {doc.description}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {doc.format ? (
                    <Badge variant="outline" className="text-xs font-normal">
                      {doc.format.split('/').pop()?.toUpperCase() || doc.format}
                    </Badge>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {doc.categoryCode ? (
                    <span className="text-sm" title={DOCUMENT_CATEGORIES[doc.categoryCode]}>
                      {doc.categoryCode}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <Badge 
                      variant="outline" 
                      className="text-xs font-normal mr-2 bg-muted text-muted-foreground border-slate-300 font-mono"
                    >
                      {doc.attachedToType}
                    </Badge>
                    <span className="text-slate-600">{doc.attachedTo}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {formatDate(doc.documentDate)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 w-8 p-0"
                  >
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredDocuments.length === 0 && (searchTerm || categoryFilter !== 'all' || typeFilter !== 'all') && (
        <div className="text-center py-8 text-slate-400">
          No documents match your filters
        </div>
      )}
    </div>
  );
}

export default DocumentsGalleryTable;
