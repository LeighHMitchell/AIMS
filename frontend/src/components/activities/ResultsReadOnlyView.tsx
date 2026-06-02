'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResults } from '@/hooks/use-results';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ResultsFramework } from './results/framework/ResultsFramework';

interface ResultsReadOnlyViewProps {
  activityId: string;
  defaultLanguage?: string;
  className?: string;
}

/**
 * Read-only Results presentation for the activity profile.
 * Uses the shared d-portal-style ResultsFramework (no edit controls), the same
 * component the editor renders — so the two views never diverge.
 */
export function ResultsReadOnlyView({ activityId, defaultLanguage = 'en', className }: ResultsReadOnlyViewProps) {
  const { results, loading, error } = useResults(activityId);

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
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
      <div className={cn('space-y-6', className)}>
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

  const indicatorCount = results.reduce((n, r) => n + (r.indicators?.length || 0), 0);

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h3 className="text-xl font-semibold text-foreground">Results &amp; Indicators</h3>
        <p className="text-body text-muted-foreground mt-1">
          {results.length} result{results.length !== 1 ? 's' : ''} · {indicatorCount} indicator{indicatorCount !== 1 ? 's' : ''}
        </p>
      </div>

      <ResultsFramework results={results} defaultLanguage={defaultLanguage} editable={false} />
    </div>
  );
}
