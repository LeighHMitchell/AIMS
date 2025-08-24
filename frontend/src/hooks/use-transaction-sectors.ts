import { useState, useEffect, useCallback } from 'react';
import { 
  TransactionSectorLine, 
  TransactionSectorValidation, 
  TransactionSectorLineFormData,
  TransactionSectorsResponse,
  UpdateTransactionSectorsRequest,
  CopyFromActivityRequest
} from '@/types/transaction';
import { toast } from 'sonner';

interface UseTransactionSectorsOptions {
  transactionId: string;
  transactionValue: number;
  transactionCurrency: string;
  activityId: string;
  onSectorsChange?: (sectors: TransactionSectorLine[]) => void;
}

interface UseTransactionSectorsReturn {
  sectorLines: TransactionSectorLine[];
  validation: TransactionSectorValidation | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // CRUD operations
  fetchSectorLines: () => Promise<void>;
  saveSectorLines: (lines: TransactionSectorLineFormData[]) => Promise<boolean>;
  addSectorLine: (sectorCode: string, sectorName: string, percentage: number) => void;
  updateSectorLine: (id: string, updates: Partial<TransactionSectorLineFormData>) => void;
  removeSectorLine: (id: string) => Promise<boolean>;
  
  // Utility operations
  copyFromActivity: (scaleToTransaction?: boolean) => Promise<boolean>;
  distributeEqually: () => void;
  clearAllSectors: () => Promise<boolean>;
  
  // Validation helpers
  canSave: boolean;
  hasUnsavedChanges: boolean;
}

export function useTransactionSectors({
  transactionId,
  transactionValue,
  transactionCurrency,
  activityId,
  onSectorsChange
}: UseTransactionSectorsOptions): UseTransactionSectorsReturn {
  
  const [sectorLines, setSectorLines] = useState<TransactionSectorLine[]>([]);
  const [validation, setValidation] = useState<TransactionSectorValidation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Client-side validation function
  const validateSectorLines = useCallback((lines: TransactionSectorLine[]): TransactionSectorValidation => {
    const errors: string[] = [];
    const totalPercentage = lines.reduce((sum, line) => sum + line.percentage, 0);
    
    if (lines.length === 0) {
      return {
        isValid: true,
        errors: [],
        totalPercentage: 0,
        remainingPercentage: 0,
        totalAmount: 0
      };
    }
    
    // Check percentage sum
    if (Math.abs(totalPercentage - 100) > 0.01) {
      if (totalPercentage > 100) {
        errors.push(`Total allocation exceeds 100% (currently ${totalPercentage.toFixed(1)}%)`);
      } else {
        errors.push(`Total allocation is ${totalPercentage.toFixed(1)}% (must equal 100%)`);
      }
    }
    
    // Check for duplicates
    const seen = new Set<string>();
    lines.forEach(line => {
      const key = `${line.sector_vocabulary}:${line.sector_code}`;
      if (seen.has(key)) {
        errors.push(`Duplicate sector: ${line.sector_code}`);
      }
      seen.add(key);
    });
    
    // Check individual percentages
    lines.forEach(line => {
      if (line.percentage <= 0 || line.percentage > 100) {
        errors.push(`Invalid percentage for sector ${line.sector_code}: ${line.percentage}%`);
      }
    });
    
    const totalAmount = lines.reduce((sum, line) => 
      sum + (transactionValue * line.percentage / 100), 0
    );
    
    return {
      isValid: errors.length === 0 && Math.abs(totalPercentage - 100) <= 0.01,
      errors,
      totalPercentage,
      remainingPercentage: 100 - totalPercentage,
      totalAmount
    };
  }, [transactionValue]);
  
  // Update validation when sector lines change
  useEffect(() => {
    const newValidation = validateSectorLines(sectorLines);
    setValidation(newValidation);
    onSectorsChange?.(sectorLines);
  }, [sectorLines, validateSectorLines, onSectorsChange]);
  
  // Fetch sector lines from API
  const fetchSectorLines = useCallback(async () => {
    if (!transactionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/transactions/${transactionId}/sectors`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch sector lines');
      }
      
      const data: TransactionSectorsResponse = await response.json();
      setSectorLines(data.sector_lines);
      setValidation(data.metadata.validation);
      setHasUnsavedChanges(false);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sector lines';
      setError(errorMessage);
      console.error('Error fetching sector lines:', err);
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);
  
  // Save sector lines to API
  const saveSectorLines = useCallback(async (lines: TransactionSectorLineFormData[]): Promise<boolean> => {
    if (!transactionId) return false;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const requestBody: UpdateTransactionSectorsRequest = {
        sector_lines: lines
      };
      
      const response = await fetch(`/api/transactions/${transactionId}/sectors`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save sector lines');
      }
      
      const data: TransactionSectorsResponse = await response.json();
      setSectorLines(data.sector_lines);
      setValidation(data.metadata.validation);
      setHasUnsavedChanges(false);
      
      toast.success(`Transaction sectors updated successfully`);
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save sector lines';
      setError(errorMessage);
      toast.error(`Failed to save sectors: ${errorMessage}`);
      console.error('Error saving sector lines:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [transactionId]);
  
  // Add a new sector line
  const addSectorLine = useCallback((sectorCode: string, sectorName: string, percentage: number) => {
    const newLine: TransactionSectorLine = {
      id: `temp-${Date.now()}`, // Temporary ID for new lines
      transaction_id: transactionId,
      sector_vocabulary: '1', // Default to DAC 5-digit
      sector_code: sectorCode,
      sector_name: sectorName,
      percentage: percentage,
      amount_minor: Math.round((transactionValue * percentage / 100) * 100),
      sort_order: sectorLines.length
    };
    
    setSectorLines(prev => [...prev, newLine]);
    setHasUnsavedChanges(true);
  }, [transactionId, transactionValue, sectorLines.length]);
  
  // Update an existing sector line
  const updateSectorLine = useCallback((id: string, updates: Partial<TransactionSectorLineFormData>) => {
    setSectorLines(prev => prev.map(line => {
      if (line.id === id) {
        const updatedLine = { ...line, ...updates };
        // Recalculate amount if percentage changed
        if (updates.percentage !== undefined) {
          updatedLine.amount_minor = Math.round((transactionValue * updates.percentage / 100) * 100);
        }
        return updatedLine;
      }
      return line;
    }));
    setHasUnsavedChanges(true);
  }, [transactionValue]);
  
  // Remove a sector line
  const removeSectorLine = useCallback(async (id: string): Promise<boolean> => {
    // If it's a temporary line (not saved yet), just remove from state
    if (id.startsWith('temp-')) {
      setSectorLines(prev => prev.filter(line => line.id !== id));
      setHasUnsavedChanges(true);
      return true;
    }
    
    // If it's a saved line, delete from API
    try {
      const response = await fetch(`/api/transactions/${transactionId}/sectors/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete sector line');
      }
      
      const data = await response.json();
      setSectorLines(data.remaining_lines);
      setValidation(data.validation);
      setHasUnsavedChanges(false);
      
      toast.success('Sector allocation removed');
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove sector';
      setError(errorMessage);
      toast.error(`Failed to remove sector: ${errorMessage}`);
      console.error('Error removing sector line:', err);
      return false;
    }
  }, [transactionId]);
  
  // Copy sectors from parent activity
  const copyFromActivity = useCallback(async (scaleToTransaction: boolean = true): Promise<boolean> => {
    if (!transactionId || !activityId) return false;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const requestBody: CopyFromActivityRequest = {
        activity_id: activityId,
        scale_to_transaction: scaleToTransaction
      };
      
      const response = await fetch(`/api/transactions/${transactionId}/sectors/copy-from-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to copy from activity');
      }
      
      const data: TransactionSectorsResponse = await response.json();
      setSectorLines(data.sector_lines);
      setValidation(data.metadata.validation);
      setHasUnsavedChanges(false);
      
      toast.success(`Copied ${data.sector_lines.length} sector allocations from activity`);
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to copy from activity';
      setError(errorMessage);
      toast.error(`Failed to copy sectors: ${errorMessage}`);
      console.error('Error copying from activity:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [transactionId, activityId]);
  
  // Distribute percentages equally among all sectors
  const distributeEqually = useCallback(() => {
    if (sectorLines.length === 0) return;
    
    const equalPercentage = 100 / sectorLines.length;
    setSectorLines(prev => prev.map(line => ({
      ...line,
      percentage: Math.round(equalPercentage * 100) / 100, // Round to 2 decimal places
      amount_minor: Math.round((transactionValue * equalPercentage / 100) * 100)
    })));
    setHasUnsavedChanges(true);
  }, [sectorLines.length, transactionValue]);
  
  // Clear all sectors
  const clearAllSectors = useCallback(async (): Promise<boolean> => {
    if (!transactionId) return false;
    
    try {
      const response = await fetch(`/api/transactions/${transactionId}/sectors`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear sectors');
      }
      
      setSectorLines([]);
      setValidation({
        isValid: true,
        errors: [],
        totalPercentage: 0,
        remainingPercentage: 0,
        totalAmount: 0
      });
      setHasUnsavedChanges(false);
      
      toast.success('All sector allocations cleared');
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear sectors';
      setError(errorMessage);
      toast.error(`Failed to clear sectors: ${errorMessage}`);
      console.error('Error clearing sectors:', err);
      return false;
    }
  }, [transactionId]);
  
  // Auto-save when sectors change (with debounce)
  useEffect(() => {
    if (!hasUnsavedChanges || sectorLines.length === 0) return;
    
    const timeoutId = setTimeout(async () => {
      const formData: TransactionSectorLineFormData[] = sectorLines.map(line => ({
        id: line.id.startsWith('temp-') ? undefined : line.id,
        sector_vocabulary: line.sector_vocabulary,
        sector_code: line.sector_code,
        sector_name: line.sector_name,
        percentage: line.percentage
      }));
      
      await saveSectorLines(formData);
    }, 2000); // 2 second debounce
    
    return () => clearTimeout(timeoutId);
  }, [sectorLines, hasUnsavedChanges, saveSectorLines]);
  
  // Initial fetch
  useEffect(() => {
    fetchSectorLines();
  }, [fetchSectorLines]);
  
  const canSave = validation?.isValid && hasUnsavedChanges;
  
  return {
    sectorLines,
    validation,
    isLoading,
    isSaving,
    error,
    
    fetchSectorLines,
    saveSectorLines,
    addSectorLine,
    updateSectorLine,
    removeSectorLine,
    
    copyFromActivity,
    distributeEqually,
    clearAllSectors,
    
    canSave,
    hasUnsavedChanges
  };
}

