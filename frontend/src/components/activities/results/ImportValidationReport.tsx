'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  FileText, 
  Link2, 
  MapPin, 
  Tag,
  BarChart3,
  Target,
  TrendingUp,
  FileCode
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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

  const resultCoverage = Math.round((new Set(summary.coverage.result_elements_found).size / resultElementsTotal) * 100);
  const indicatorCoverage = Math.round((new Set(summary.coverage.indicator_elements_found).size / indicatorElementsTotal) * 100);
  const baselineCoverage = Math.round((new Set(summary.coverage.baseline_elements_found).size / baselineElementsTotal) * 100);
  const periodCoverage = Math.round((new Set(summary.coverage.period_elements_found).size / periodElementsTotal) * 100);
  const overallCoverage = Math.round((resultCoverage + indicatorCoverage + baselineCoverage + periodCoverage) / 4);

  const totalCreated = summary.results_created + summary.indicators_created + 
                       summary.baselines_created + summary.periods_created +
                       summary.result_references_created + summary.result_documents_created +
                       summary.indicator_references_created + summary.indicator_documents_created +
                       summary.baseline_locations_created + summary.baseline_dimensions_created +
                       summary.baseline_documents_created + summary.period_target_locations_created +
                       summary.period_actual_locations_created + summary.period_target_dimensions_created +
                       summary.period_actual_dimensions_created + summary.period_target_documents_created +
                       summary.period_actual_documents_created;

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Import Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Success/Error Overview */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-gray-600" />
              <span className="text-lg font-semibold">{totalCreated}</span>
              <span className="text-sm text-gray-600">elements created</span>
            </div>
            
            {summary.errors.length > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-gray-600" />
                <span className="text-lg font-semibold">{summary.errors.length}</span>
                <span className="text-sm text-gray-600">errors</span>
              </div>
            )}
            
            {summary.warnings && summary.warnings.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gray-600" />
                <span className="text-lg font-semibold">{summary.warnings.length}</span>
                <span className="text-sm text-gray-600">warnings</span>
              </div>
            )}
          </div>

          {/* Overall Coverage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall IATI Coverage</span>
              <Badge variant={overallCoverage >= 80 ? 'default' : 'outline'}>
                {overallCoverage}%
              </Badge>
            </div>
            <Progress value={overallCoverage} className="h-2" />
          </div>
        </CardContent>
      </Card>



      {/* Element Coverage Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCode className="h-4 w-4" />
            IATI Element Coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Result Level Coverage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Result Elements</span>
              <Badge variant={resultCoverage >= 60 ? 'default' : 'outline'}>
                {resultCoverage}%
              </Badge>
            </div>
            <Progress value={resultCoverage} className="h-2 mb-2" />
            <div className="flex flex-wrap gap-2">
              {['title', 'description', 'aggregation-status', 'reference', 'document-link'].map(element => {
                const found = summary.coverage.result_elements_found.includes(element);
                return (
                  <Badge 
                    key={element} 
                    variant="outline"
                    className="text-xs text-gray-500"
                  >
                    {found && <FileCode className="h-3 w-3 mr-1" />}
                    <span className="font-mono bg-gray-100 px-1 rounded">{`<${element}>`}</span>
                  </Badge>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Indicator Level Coverage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Indicator Elements</span>
              <Badge variant={indicatorCoverage >= 60 ? 'default' : 'outline'}>
                {indicatorCoverage}%
              </Badge>
            </div>
            <Progress value={indicatorCoverage} className="h-2 mb-2" />
            <div className="flex flex-wrap gap-2">
              {['title', 'description', 'measure', 'ascending', 'aggregation-status', 'reference', 'document-link'].map(element => {
                const found = summary.coverage.indicator_elements_found.includes(element);
                return (
                  <Badge 
                    key={element} 
                    variant="outline"
                    className="text-xs text-gray-500"
                  >
                    {found && <FileCode className="h-3 w-3 mr-1" />}
                    <span className="font-mono bg-gray-100 px-1 rounded">{`<${element}>`}</span>
                  </Badge>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Baseline Level Coverage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Baseline Elements</span>
              <Badge variant={baselineCoverage >= 60 ? 'default' : 'outline'}>
                {baselineCoverage}%
              </Badge>
            </div>
            <Progress value={baselineCoverage} className="h-2 mb-2" />
            <div className="flex flex-wrap gap-2">
              {['value', 'year', 'iso-date', 'comment', 'location', 'dimension', 'document-link'].map(element => {
                const found = summary.coverage.baseline_elements_found.includes(element);
                return (
                  <Badge 
                    key={element} 
                    variant="outline"
                    className="text-xs text-gray-500"
                  >
                    {found && <FileCode className="h-3 w-3 mr-1" />}
                    <span className="font-mono bg-gray-100 px-1 rounded">{`<${element}>`}</span>
                  </Badge>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Period Level Coverage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Period Elements</span>
              <Badge variant={periodCoverage >= 60 ? 'default' : 'outline'}>
                {periodCoverage}%
              </Badge>
            </div>
            <Progress value={periodCoverage} className="h-2 mb-2" />
            <div className="flex flex-wrap gap-2">
              {['period-start', 'period-end', 'target/value', 'target/comment', 'target/location', 'target/dimension', 'target/document-link',
                'actual/value', 'actual/comment', 'actual/location', 'actual/dimension', 'actual/document-link'].map(element => {
                const found = summary.coverage.period_elements_found.includes(element);
                const displayElement = element.includes('/') ? element.replace('/', '/') : element;
                return (
                  <Badge 
                    key={element} 
                    variant="outline"
                    className="text-xs text-gray-500"
                  >
                    {found && <FileCode className="h-3 w-3 mr-1" />}
                    <span className="font-mono bg-gray-100 px-1 rounded">{`<${displayElement}>`}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors Display */}
      {summary.errors.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Import Errors ({summary.errors.length})</p>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {summary.errors.map((error, index) => (
                  <div key={index} className="text-sm bg-white bg-opacity-50 p-2 rounded">
                    <div className="font-medium">{error.message}</div>
                    {error.context && (
                      <div className="text-xs text-gray-700">Context: {error.context}</div>
                    )}
                    {error.element && (
                      <div className="text-xs text-gray-700">Element: {error.element}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings Display */}
      {summary.warnings && summary.warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Warnings ({summary.warnings.length})</p>
              <div className="space-y-1">
                {summary.warnings.map((warning, index) => (
                  <div key={index} className="text-sm">
                    {warning.message} {warning.element && `(${warning.element})`}
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {summary.errors.length === 0 && (
        <Alert className="border-gray-200 bg-gray-50">
          <CheckCircle2 className="h-4 w-4 text-gray-600" />
          <AlertDescription className="text-gray-800">
            <p className="font-semibold">Import Completed Successfully!</p>
            <p className="text-sm mt-1">
              All results data has been imported with {overallCoverage}% IATI element coverage. 
              Navigate to the Results tab to view and manage the imported data.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

