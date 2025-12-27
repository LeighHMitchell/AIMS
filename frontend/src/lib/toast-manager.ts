import { toast } from 'sonner';

// Global state to track active toasts and prevent duplicates
const activeToasts = new Set<string>();
const toastQueue = new Map<string, NodeJS.Timeout>();

// Toast configuration
const TOAST_CONFIG = {
  duration: 5000,
  position: 'top-center' as const,
  closeButton: true,
};

// Transaction-specific toast identifiers
export const TRANSACTION_TOAST_IDS = {
  SUBMIT_SUCCESS: 'transaction-submit-success',
  SUBMIT_ERROR: 'transaction-submit-error',
  VALIDATION_ERROR: 'transaction-validation-error',
  FIELD_SAVE: 'transaction-field-save',
  DUPLICATE_REFERENCE: 'transaction-duplicate-reference',
  AUTO_CREATE: 'transaction-auto-create',
} as const;

type ToastId = typeof TRANSACTION_TOAST_IDS[keyof typeof TRANSACTION_TOAST_IDS];

/**
 * Dismiss any active transaction-related toasts before showing a new one
 */
function dismissActiveToasts(excludeId?: ToastId) {
  activeToasts.forEach(id => {
    if (id !== excludeId) {
      toast.dismiss(id);
      activeToasts.delete(id);
    }
  });
  
  // Clear any queued toasts
  toastQueue.forEach((timeout, id) => {
    if (id !== excludeId) {
      clearTimeout(timeout);
      toastQueue.delete(id);
    }
  });
}

/**
 * Show a transaction success toast, dismissing any conflicting toasts
 */
export function showTransactionSuccess(message: string, options?: { 
  id?: ToastId;
  description?: string;
  dismissOthers?: boolean;
}) {
  const id = options?.id || TRANSACTION_TOAST_IDS.SUBMIT_SUCCESS;
  
  if (options?.dismissOthers !== false) {
    dismissActiveToasts(id);
  }
  
  // Don't show duplicate success messages
  if (activeToasts.has(id)) {
    return;
  }
  
  activeToasts.add(id);
  
  toast.success(message, {
    id,
    description: options?.description,
    ...TOAST_CONFIG,
    onDismiss: () => activeToasts.delete(id),
    onAutoClose: () => activeToasts.delete(id),
  });
}

/**
 * Show a transaction error toast, dismissing any conflicting toasts
 */
export function showTransactionError(message: string, options?: {
  id?: ToastId;
  description?: string;
  dismissOthers?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  const id = options?.id || TRANSACTION_TOAST_IDS.SUBMIT_ERROR;
  
  if (options?.dismissOthers !== false) {
    dismissActiveToasts(id);
  }
  
  // Don't show duplicate error messages
  if (activeToasts.has(id)) {
    return;
  }
  
  activeToasts.add(id);
  
  toast.error(message, {
    id,
    description: options?.description,
    action: options?.action,
    ...TOAST_CONFIG,
    onDismiss: () => activeToasts.delete(id),
    onAutoClose: () => activeToasts.delete(id),
  });
}

/**
 * Show a field-level save success (debounced to prevent spam)
 */
export function showFieldSaveSuccess(fieldName: string, options?: {
  debounceMs?: number;
}) {
  const id = `${TRANSACTION_TOAST_IDS.FIELD_SAVE}-${fieldName}`;
  const debounceMs = options?.debounceMs || 1000;
  
  // Clear any existing timeout for this field
  const existingTimeout = toastQueue.get(id);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }
  
  // Debounce the toast
  const timeout = setTimeout(() => {
    if (!activeToasts.has(TRANSACTION_TOAST_IDS.SUBMIT_SUCCESS) && 
        !activeToasts.has(TRANSACTION_TOAST_IDS.SUBMIT_ERROR)) {
      
      activeToasts.add(id);
      
      toast.success(`${fieldName.replace(/_/g, ' ')} updated`, {
        id,
        duration: 2000, // Shorter duration for field updates
        position: 'top-center',
        onDismiss: () => activeToasts.delete(id),
        onAutoClose: () => activeToasts.delete(id),
      });
    }
    toastQueue.delete(id);
  }, debounceMs);
  
  toastQueue.set(id, timeout);
}

/**
 * Show validation error with suggestion for duplicate reference
 */
export function showValidationError(message: string, options?: {
  isDuplicateReference?: boolean;
  onClearReference?: () => void;
}) {
  const id = TRANSACTION_TOAST_IDS.VALIDATION_ERROR;
  
  dismissActiveToasts();
  activeToasts.add(id);
  
  const action = options?.isDuplicateReference && options?.onClearReference ? {
    label: 'Clear Reference',
    onClick: options.onClearReference,
  } : undefined;
  
  toast.error(message, {
    id,
    description: options?.isDuplicateReference 
      ? 'Click "Clear Reference" to auto-generate a unique reference, or provide a different one.'
      : undefined,
    action,
    ...TOAST_CONFIG,
    onDismiss: () => activeToasts.delete(id),
    onAutoClose: () => activeToasts.delete(id),
  });
}

/**
 * Show auto-creation success (less prominent)
 */
export function showAutoCreateSuccess(message: string) {
  const id = TRANSACTION_TOAST_IDS.AUTO_CREATE;
  
  // Don't show if there are other active toasts
  if (activeToasts.size > 0) {
    return;
  }
  
  activeToasts.add(id);
  
  toast.success(message, {
    id,
    duration: 3000,
    position: 'top-center',
    onDismiss: () => activeToasts.delete(id),
    onAutoClose: () => activeToasts.delete(id),
  });
}

/**
 * Clear all transaction-related toasts
 */
export function clearAllTransactionToasts() {
  dismissActiveToasts();
}

/**
 * Check if a specific toast is currently active
 */
export function isToastActive(id: ToastId): boolean {
  return activeToasts.has(id);
}