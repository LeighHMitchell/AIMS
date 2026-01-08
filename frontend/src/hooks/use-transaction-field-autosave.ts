import { useState, useCallback } from 'react';
import { showFieldSaveSuccess } from '@/lib/toast-manager';

interface TransactionFieldAutosaveOptions {
  transactionId: string;
  fieldName: string;
  userId?: string;
  initialValue?: any;
  debounceMs?: number;
}

export function useTransactionFieldAutosave({
  transactionId,
  fieldName,
  userId,
  initialValue,
  debounceMs = 1000
}: TransactionFieldAutosaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(!!initialValue);
  const [error, setError] = useState<string | null>(null);

  // Debounced save
  const triggerFieldSave = useCallback(async (value: any) => {
    // Skip autosave if no valid transactionId (new transaction not yet saved)
    if (!transactionId || transactionId === '') {
      return;
    }

    setIsSaving(true);
    setError(null);
    setIsSaved(false);
    try {
      const res = await fetch(`/api/data-clinic/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: fieldName, value, userId })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
        setIsSaving(false);
        setIsSaved(false);
        return;
      }
      setIsSaving(false);
      setIsSaved(true);
      
      // Show subtle success feedback for field-level saves
      showFieldSaveSuccess(fieldName);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
      setIsSaving(false);
      setIsSaved(false);
      // Don't show toast for field-level errors - rely on visual indicators
      console.error(`Failed to save ${fieldName}:`, e);
    }
  }, [transactionId, fieldName, userId]);

  return {
    isSaving,
    isSaved,
    error,
    triggerFieldSave
  };
} 