'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  DollarSign,
  Link2,
  Building2,
  FileWarning,
  Calendar,
  Hash
} from 'lucide-react';

interface ValidationIssue {
  type: 'missing_currency' | 'missing_activity' | 'unmapped_code' | 'missing_org' | 'missing_required' | 'invalid_value';
  severity: 'error' | 'warning';
  count: number;
  details: {
    activityId?: string;
    transactionIndex?: number;
    field?: string;
    value?: any;
    message: string;
  }[];
}

interface ValidationSummaryPanelProps {
  validationIssues: ValidationIssue[];
  summary: {
    totalActivities: number;
    totalTransactions: number;
    validTransactions: number;
    invalidTransactions: number;
    transactionsNeedingAssignment?: number;
    unmappedCodesCount?: number;
  };
  onViewDetails: (issueType: string) => void;
  onProceedToFix?: () => void;
}

const issueTypeConfig = {
  missing_currency: {
    icon: DollarSign,
    title: 'Missing Currency',
    description: 'Transactions without currency attribute',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  missing_activity: {
    icon: Link2,
    title: 'Unlinked Transactions',
    description: 'Transactions referencing non-existent activities',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  unmapped_code: {
    icon: Hash,
    title: 'Unmapped Codes',
    description: 'Codes that may need mapping to system values',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  missing_org: {
    icon: Building2,
    title: 'Missing Organizations',
    description: 'Transactions without provider/receiver organizations',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  missing_required: {
    icon: FileWarning,
    title: 'Missing Required Fields',
    description: 'Transactions missing date or other required fields',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  invalid_value: {
    icon: AlertCircle,
    title: 'Invalid Values',
    description: 'Transactions with invalid or zero values',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
};

export function ValidationSummaryPanel({
  validationIssues,
  summary,
  onViewDetails,
  onProceedToFix
}: ValidationSummaryPanelProps) {
  const errors = validationIssues.filter(issue => issue.severity === 'error');
  const warnings = validationIssues.filter(issue => issue.severity === 'warning');
  const hasErrors = errors.length > 0;
  const successRate = summary.totalTransactions > 0 
    ? Math.round((summary.validTransactions / summary.totalTransactions) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalActivities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTransactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Valid Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                {summary.validTransactions}
              </span>
            </div>
          </CardContent>
        </Card>

        {summary.transactionsNeedingAssignment !== undefined && summary.transactionsNeedingAssignment > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Need Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Link2 className="h-5 w-5 text-orange-600" />
                <span className="text-2xl font-bold text-orange-600">
                  {summary.transactionsNeedingAssignment}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">
                {successRate}%
              </div>
              <div className="flex-1">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${successRate > 80 ? 'bg-green-500' : successRate > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

                {/* Validation Status Alert */}
      {hasErrors ? (
        <Alert className="border-destructive bg-destructive/10 flex items-start">
          <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-1" />
          <div className="ml-2">
            <h4 className="font-semibold text-destructive">Validation Failed</h4>
            <AlertDescription>
              {summary.invalidTransactions} transaction{summary.invalidTransactions !== 1 ? 's' : ''} have errors that must be fixed before import.
              {summary.transactionsNeedingAssignment && summary.transactionsNeedingAssignment > 0 && (
                <div className="mt-1">
                  • {summary.transactionsNeedingAssignment} transaction{summary.transactionsNeedingAssignment !== 1 ? 's' : ''} need activity assignment
                </div>
              )}
              {summary.unmappedCodesCount && summary.unmappedCodesCount > 0 && (
                <div className="mt-1">
                  • {summary.unmappedCodesCount} code{summary.unmappedCodesCount !== 1 ? 's' : ''} need mapping
                </div>
              )}
            </AlertDescription>
          </div>
        </Alert>
      ) : summary.totalTransactions > 0 ? (
        <Alert className="border-green-200 bg-green-50 flex items-start">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
          <div className="ml-2">
            <h4 className="font-semibold">Ready to Import</h4>
            <AlertDescription>
              All transactions passed validation and are ready to be imported.
            </AlertDescription>
          </div>
        </Alert>
      ) : (
        <Alert className="flex items-start">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-1" />
          <div className="ml-2">
            <h4 className="font-semibold">No Transactions Found</h4>
            <AlertDescription>
              The XML file contains no transactions to import.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Issues List */}
      {validationIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Issues</CardTitle>
            <CardDescription>
              Review and fix these issues before importing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {validationIssues.map((issue) => {
              const config = issueTypeConfig[issue.type];
              const Icon = config.icon;

              return (
                <div
                  key={issue.type}
                  className={`flex items-center justify-between p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${config.bgColor}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{config.title}</h4>
                        <Badge className={issue.severity === 'error' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground'}>
                          {issue.count} {issue.count === 1 ? 'issue' : 'issues'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(issue.type)}
                    className="flex items-center space-x-1"
                  >
                    <span>View Details</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        {hasErrors && onProceedToFix && (
          <Button
            onClick={onProceedToFix}
            size="lg"
            className="flex items-center space-x-2"
          >
            <FileWarning className="h-5 w-5" />
            <span>Fix Issues</span>
          </Button>
        )}
        {!hasErrors && summary.validTransactions > 0 && (
          <Button
            variant="default"
            size="lg"
            className="flex items-center space-x-2"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>Proceed to Import</span>
          </Button>
        )}
      </div>
    </div>
  );
} 