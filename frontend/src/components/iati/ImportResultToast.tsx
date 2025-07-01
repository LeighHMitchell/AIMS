'use client';

import React from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, AlertTriangle, FileText, Activity } from 'lucide-react';

interface ImportResult {
  success: boolean;
  activitiesCreated: number;
  activitiesUpdated: number;
  transactionsCreated: number;
  transactionsUpdated: number;
  errors: string[];
  warnings: string[];
  duration: number;
}

export function showImportResult(result: ImportResult) {
  const { 
    success, 
    activitiesCreated, 
    activitiesUpdated, 
    transactionsCreated,
    transactionsUpdated,
    errors,
    warnings,
    duration
  } = result;

  const totalActivities = activitiesCreated + activitiesUpdated;
  const totalTransactions = transactionsCreated + transactionsUpdated;

  if (success) {
    toast.success("Import Successful", {
      description: `Import completed in ${(duration / 1000).toFixed(1)}s`,
      duration: 5000,
    });

    // Show additional details if any
    if (totalActivities > 0) {
      const activityMsg = [
        activitiesCreated > 0 ? `${activitiesCreated} created` : '',
        activitiesUpdated > 0 ? `${activitiesUpdated} updated` : ''
      ].filter(Boolean).join(', ');
      
      toast.info(`Activities: ${activityMsg}`, {
        duration: 4000,
      });
    }

    if (totalTransactions > 0) {
      const transactionMsg = [
        transactionsCreated > 0 ? `${transactionsCreated} created` : '',
        transactionsUpdated > 0 ? `${transactionsUpdated} updated` : ''
      ].filter(Boolean).join(', ');
      
      toast.info(`Transactions: ${transactionMsg}`, {
        duration: 4000,
      });
    }

    if (warnings.length > 0) {
      toast.warning(`${warnings.length} warnings encountered`, {
        description: warnings[0],
        duration: 5000,
      });
    }
  } else {
    toast.error("Import Failed", {
      description: errors[0] || `Import failed with ${errors.length} errors`,
      duration: 7000,
    });
  }
}

export function showImportProgress(message: string) {
  return toast.loading(message, {
    duration: Infinity,
  });
} 