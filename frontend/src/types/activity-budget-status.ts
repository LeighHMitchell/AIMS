/**
 * Type definitions for Activity Budget Status
 * Allows government users to flag activities as on-budget, off-budget, or partial
 */

/**
 * Budget status values
 */
export type BudgetStatusType = 'on_budget' | 'off_budget' | 'partial' | 'unknown';

/**
 * Activity budget status data
 */
export interface ActivityBudgetStatus {
  budgetStatus: BudgetStatusType;
  onBudgetPercentage?: number; // Required when status is 'partial'
  budgetStatusNotes?: string;
  budgetStatusUpdatedAt?: string;
  budgetStatusUpdatedBy?: string;
}

/**
 * Database row format (snake_case) - matches activities table columns
 */
export interface ActivityBudgetStatusRow {
  budget_status: BudgetStatusType;
  on_budget_percentage?: number;
  budget_status_notes?: string;
  budget_status_updated_at?: string;
  budget_status_updated_by?: string;
}

/**
 * Budget status option for dropdowns
 */
export interface BudgetStatusOption {
  value: BudgetStatusType;
  label: string;
  description: string;
  icon?: string;
}

/**
 * Budget status options with descriptions
 */
export const BUDGET_STATUS_OPTIONS: BudgetStatusOption[] = [
  {
    value: 'on_budget',
    label: 'On Budget',
    description: 'Activity is fully reflected in government budget',
    icon: 'check-circle',
  },
  {
    value: 'off_budget',
    label: 'Off Budget',
    description: 'Activity is not included in government budget',
    icon: 'x-circle',
  },
  {
    value: 'partial',
    label: 'Partial',
    description: 'Activity is partially on government budget',
    icon: 'pie-chart',
  },
  {
    value: 'unknown',
    label: 'Unknown',
    description: 'Budget status has not been determined',
    icon: 'help-circle',
  },
];

/**
 * Budget status color classes for badges and indicators
 */
export const BUDGET_STATUS_COLORS: Record<BudgetStatusType, string> = {
  on_budget: 'bg-green-100 text-green-800 border-green-200',
  off_budget: 'bg-red-100 text-red-800 border-red-200',
  partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200',
};

/**
 * Budget status background colors for charts
 */
export const BUDGET_STATUS_CHART_COLORS: Record<BudgetStatusType, string> = {
  on_budget: '#22c55e', // green-500
  off_budget: '#ef4444', // red-500
  partial: '#eab308', // yellow-500
  unknown: '#9ca3af', // gray-400
};

/**
 * Budget status icon names (Lucide icons)
 */
export const BUDGET_STATUS_ICONS: Record<BudgetStatusType, string> = {
  on_budget: 'CheckCircle2',
  off_budget: 'XCircle',
  partial: 'PieChart',
  unknown: 'HelpCircle',
};

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Get the budget status option by value
 */
export function getBudgetStatusOption(status: BudgetStatusType): BudgetStatusOption {
  return BUDGET_STATUS_OPTIONS.find((opt) => opt.value === status) || BUDGET_STATUS_OPTIONS[3];
}

/**
 * Get display label for budget status
 */
export function getBudgetStatusLabel(status: BudgetStatusType): string {
  return getBudgetStatusOption(status).label;
}

/**
 * Get color classes for budget status
 */
export function getBudgetStatusColor(status: BudgetStatusType): string {
  return BUDGET_STATUS_COLORS[status] || BUDGET_STATUS_COLORS.unknown;
}

/**
 * Calculate the effective on-budget amount for an activity
 * @param totalAmount Total activity amount (disbursements/commitments)
 * @param status Budget status
 * @param percentage On-budget percentage (for partial status)
 * @returns The amount considered "on budget"
 */
export function calculateOnBudgetAmount(
  totalAmount: number,
  status: BudgetStatusType,
  percentage?: number
): number {
  switch (status) {
    case 'on_budget':
      return totalAmount;
    case 'off_budget':
      return 0;
    case 'partial':
      return percentage ? (totalAmount * percentage) / 100 : 0;
    case 'unknown':
    default:
      return 0;
  }
}

/**
 * Validate budget status data
 */
export function validateBudgetStatus(
  status: BudgetStatusType,
  percentage?: number
): { valid: boolean; error?: string } {
  if (status === 'partial') {
    if (percentage === undefined || percentage === null) {
      return { valid: false, error: 'On-budget percentage is required for partial status' };
    }
    if (percentage < 0 || percentage > 100) {
      return { valid: false, error: 'Percentage must be between 0 and 100' };
    }
  }
  return { valid: true };
}

/**
 * Convert activity row fields to ActivityBudgetStatus
 */
export function toActivityBudgetStatus(row: ActivityBudgetStatusRow): ActivityBudgetStatus {
  return {
    budgetStatus: row.budget_status || 'unknown',
    onBudgetPercentage: row.on_budget_percentage,
    budgetStatusNotes: row.budget_status_notes,
    budgetStatusUpdatedAt: row.budget_status_updated_at,
    budgetStatusUpdatedBy: row.budget_status_updated_by,
  };
}

/**
 * Convert ActivityBudgetStatus to row format for updates
 */
export function toActivityBudgetStatusRow(
  data: Partial<ActivityBudgetStatus>
): Partial<ActivityBudgetStatusRow> {
  const row: Partial<ActivityBudgetStatusRow> = {};

  if (data.budgetStatus !== undefined) {
    row.budget_status = data.budgetStatus;
  }
  if (data.onBudgetPercentage !== undefined) {
    row.on_budget_percentage = data.onBudgetPercentage;
  }
  if (data.budgetStatusNotes !== undefined) {
    row.budget_status_notes = data.budgetStatusNotes;
  }
  if (data.budgetStatusUpdatedAt !== undefined) {
    row.budget_status_updated_at = data.budgetStatusUpdatedAt;
  }
  if (data.budgetStatusUpdatedBy !== undefined) {
    row.budget_status_updated_by = data.budgetStatusUpdatedBy;
  }

  return row;
}
