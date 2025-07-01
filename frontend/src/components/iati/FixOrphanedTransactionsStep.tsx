'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { OrphanTransactionFixModal } from './OrphanTransactionFixModal';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Link2,
  SkipForward
} from 'lucide-react';

interface OrphanedTransaction {
  index: number;
  activityRef: string;
  transaction: any;
}

interface FixOrphanedTransactionsStepProps {
  orphanTransactions: OrphanedTransaction[];
  onComplete: (resolvedTransactions: Record<number, string>, skippedTransactions: number[]) => void;
}

export function FixOrphanedTransactionsStep({
  orphanTransactions,
  onComplete
}: FixOrphanedTransactionsStepProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [resolvedTransactions, setResolvedTransactions] = useState<Record<number, string>>({});
  const [skippedTransactions, setSkippedTransactions] = useState<number[]>([]);

  useEffect(() => {
    // Start with the first orphan transaction
    if (orphanTransactions.length > 0 && currentIndex === 0) {
      setShowModal(true);
    }
  }, [orphanTransactions]);

  const handleFix = (transactionIndex: number, activityId: string) => {
    setResolvedTransactions({
      ...resolvedTransactions,
      [transactionIndex]: activityId
    });
    proceedToNext();
  };

  const handleSkip = (transactionIndex: number) => {
    setSkippedTransactions([...skippedTransactions, transactionIndex]);
    proceedToNext();
  };

  const proceedToNext = () => {
    if (currentIndex < orphanTransactions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All transactions processed
      setShowModal(false);
      onComplete(resolvedTransactions, skippedTransactions);
    }
  };

  const handleSkipAll = () => {
    const remainingIndices = orphanTransactions
      .slice(currentIndex)
      .map(t => t.index);
    setSkippedTransactions([...skippedTransactions, ...remainingIndices]);
    setShowModal(false);
    onComplete(resolvedTransactions, [...skippedTransactions, ...remainingIndices]);
  };

  const progress = (currentIndex / orphanTransactions.length) * 100;
  const currentTransaction = orphanTransactions[currentIndex];
  const resolvedCount = Object.keys(resolvedTransactions).length;
  const skippedCount = skippedTransactions.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
          Fix Orphaned Transactions
        </CardTitle>
        <CardDescription>
          {orphanTransactions.length} transactions reference activities that don't exist. 
          Link them to existing activities or skip them.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{currentIndex + 1} of {orphanTransactions.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-sm font-medium">{resolvedCount}</p>
            <p className="text-xs text-gray-600">Resolved</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <Link2 className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
            <p className="text-sm font-medium">{orphanTransactions.length - resolvedCount - skippedCount}</p>
            <p className="text-xs text-gray-600">Remaining</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <SkipForward className="h-5 w-5 mx-auto mb-1 text-gray-600" />
            <p className="text-sm font-medium">{skippedCount}</p>
            <p className="text-xs text-gray-600">Skipped</p>
          </div>
        </div>

        {/* Orphan List Preview */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Orphaned Transactions</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {orphanTransactions.map((orphan, idx) => {
              const isResolved = orphan.index in resolvedTransactions;
              const isSkipped = skippedTransactions.includes(orphan.index);
              const isCurrent = idx === currentIndex;
              
              return (
                <div
                  key={orphan.index}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    isCurrent ? 'border-primary bg-primary/5' : 
                    isResolved ? 'border-green-200 bg-green-50' : 
                    isSkipped ? 'border-gray-200 bg-gray-50' : 
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Badge className={
                      isResolved ? '' : 
                      isSkipped ? 'bg-secondary text-secondary-foreground' : 
                      'border'
                    }>
                      #{orphan.index + 1}
                    </Badge>
                    <span className="text-sm font-mono">{orphan.activityRef}</span>
                  </div>
                  <div>
                    {isResolved && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {isSkipped && <SkipForward className="h-4 w-4 text-gray-500" />}
                    {isCurrent && !isResolved && !isSkipped && (
                      <ArrowRight className="h-4 w-4 text-primary animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Skip All Option */}
        {currentIndex < orphanTransactions.length && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>You can skip all remaining orphaned transactions if needed.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkipAll}
              >
                Skip All Remaining
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {/* Fix Modal */}
      {currentTransaction && (
        <OrphanTransactionFixModal
          isOpen={showModal}
          orphanedTransaction={currentTransaction}
          onFix={handleFix}
          onSkip={handleSkip}
          onClose={() => setShowModal(false)}
          totalOrphans={orphanTransactions.length}
          currentIndex={currentIndex}
        />
      )}
    </Card>
  );
} 