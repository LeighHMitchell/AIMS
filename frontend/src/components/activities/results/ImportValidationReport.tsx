'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CheckCircle,
  AlertCircle, 
  XCircle, 
  FileCode,
  Check
} from 'lucide-react';

interface ImportValidationReportProps {
  summary: {
    results_created: number;
    indicators_created: number;
    baselines_created: number;
    periods_created: number;
    result_references_created: number;
    result_documents_created: number;
    indicator_references_created: number;
    indicator_documents_created: number;
    baseline_locations_created: number;
    baseline_dimensions_created: number;
    baseline_documents_created: number;
    period_target_locations_created: number;
    period_actual_locations_created: number;
    period_target_dimensions_created: number;
    period_actual_dimensions_created: number;
    period_target_documents_created: number;
    period_actual_documents_created: number;
    errors: Array<{ message: string; context?: string; element?: string }>;
    warnings?: Array<{ message: string; element?: string }>;
    coverage: {
      result_elements_found: string[];
      indicator_elements_found: string[];
      baseline_elements_found: string[];
      period_elements_found: string[];
    };
  };
}

export function ImportValidationReport({ summary }: ImportValidationReportProps) {
  // Calculate coverage percentages
  const resultElementsTotal = 5; // type, title, description, reference, document-link
  const indicatorElementsTotal = 7; // title, description, measure, ascending, aggregation-status, reference, document-link
  const baselineElementsTotal = 6; // value, year, iso-date, comment, location, dimension, document-link
  const periodElementsTotal = 10; // start, end, target value/comment/location/dimension/document, actual value/comment/location/dimension/document

  // Defensive defaults — the results-import API response may omit coverage/errors/warnings.
  // Without these guards the report crashes with
  // "undefined is not an object (evaluating 'summary.coverage.result_elements_found')".
  const resultElementsFound = summary?.coverage?.result_elements_found ?? [];
  const indicatorElementsFound = summary?.coverage?.indicator_elements_found ?? [];
  const baselineElementsFound = summary?.coverage?.baseline_elements_found ?? [];
  const periodElementsFound = summary?.coverage?.period_elements_found ?? [];
  const errors = summary?.errors ?? [];
  const warnings = summary?.warnings ?? [];

  const resultCoverage = Math.round((new Set(resultElementsFound).size / resultElementsTotal) * 100);
  const indicatorCoverage = Math.round((new Set(indicatorElementsFound).size / indicatorElementsTotal) * 100);
  const baselineCoverage = Math.round((new Set(baselineElementsFound).size / baselineElementsTotal) * 100);
  const periodCoverage = Math.round((new Set(periodElementsFound).size / periodElementsTotal) * 100);
  const overallCoverage = Math.round((resultCoverage + indicatorCoverage + baselineCoverage + periodCoverage) / 4);

  // Coverage data for table
  const coverageData = [
    {
      category: 'Result Elements',
      coverage: resultCoverage,
      elements: ['title', 'description', 'aggregation-status', 'reference', 'document-link'],
      found: resultElementsFound
    },
    {
      category: 'Indicator Elements',
      coverage: indicatorCoverage,
      elements: ['title', 'description', 'measure', 'ascending', 'aggregation-status', 'reference', 'document-link'],
      found: indicatorElementsFound
    },
    {
      category: 'Baseline Elements',
      coverage: baselineCoverage,
      elements: ['value', 'year', 'iso-date', 'comment', 'location', 'dimension', 'document-link'],
      found: baselineElementsFound
    },
    {
      category: 'Period Elements',
      coverage: periodCoverage,
      elements: ['period-start', 'period-end', 'target/value', 'target/comment', 'target/location', 'target/dimension', 'target/document-link', 'actual/value', 'actual/comment', 'actual/location', 'actual/dimension', 'actual/document-link'],
      found: periodElementsFound
    },
  ];

  return (
    <div className="space-y-6">
      {/* IATI Element Coverage Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-3 border-b border-border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            IATI Element Coverage
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted border-b border-border">
              <TableHead className="border-r border-border">Element Category</TableHead>
              <TableHead className="text-center w-24 border-r border-border">Coverage</TableHead>
              <TableHead>Elements Found</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverageData.map((row, idx) => (
              <TableRow key={idx} className="border-b border-border">
                <TableCell className="font-medium border-r border-border">{row.category}</TableCell>
                <TableCell className="text-center border-r border-border">
                  <span className="font-medium text-foreground">
                    {row.coverage}%
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {row.elements.map(element => {
                      const found = row.found.includes(element);
                      return (
                        <span 
                          key={element}
                          className={`inline-flex items-center text-xs px-2 py-0.5 rounded border ${
                            found 
                              ? 'bg-muted border-border text-foreground' 
                              : 'bg-card border-border text-muted-foreground'
                          }`}
                        >
                          {found && <Check className="h-3 w-3 mr-1" />}
                          <code>{`<${element}>`}</code>
                        </span>
                      );
                    })}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Errors Display */}
      {errors.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Import Errors ({errors.length})
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted border-b border-border">
                <TableHead className="w-12 border-r border-border">#</TableHead>
                <TableHead className="border-r border-border">Error Message</TableHead>
                <TableHead className="w-48">Context</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.map((error, index) => (
                <TableRow key={index} className="border-b border-border">
                  <TableCell className="text-muted-foreground border-r border-border">{index + 1}</TableCell>
                  <TableCell className="font-medium text-foreground border-r border-border">{error.message}</TableCell>
                  <TableCell className="text-body text-muted-foreground">
                    {error.context && <div>Context: {error.context}</div>}
                    {error.element && <div>Element: {error.element}</div>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Warnings Display */}
      {warnings && warnings.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Warnings ({warnings.length})
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted border-b border-border">
                <TableHead className="w-12 border-r border-border">#</TableHead>
                <TableHead className="border-r border-border">Warning Message</TableHead>
                <TableHead className="w-32">Element</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warnings.map((warning, index) => (
                <TableRow key={index} className="border-b border-border">
                  <TableCell className="text-muted-foreground border-r border-border">{index + 1}</TableCell>
                  <TableCell className="text-foreground border-r border-border">{warning.message}</TableCell>
                  <TableCell className="text-body text-muted-foreground">{warning.element || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Success Message */}
      {errors.length === 0 && (
        <Alert className="border-border bg-muted">
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-foreground">
            <p className="font-semibold">Import Completed Successfully!</p>
            <p className="text-body mt-1">
              All results data has been imported with {overallCoverage}% IATI element coverage. 
              Navigate to the Results tab to view and manage the imported data.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

