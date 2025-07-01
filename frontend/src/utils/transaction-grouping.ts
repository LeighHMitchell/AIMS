/**
 * Transaction Grouping Utilities
 * 
 * This module provides utilities for grouping IATI transactions into logical categories
 * for display and analysis purposes.
 */

export type TransactionGroup = 'commitments' | 'disbursements' | 'returns' | 'other'

/**
 * Maps IATI transaction type codes to logical groups
 */
export function getTransactionGroup(typeCode: number | string): TransactionGroup {
  const numericCode = typeof typeCode === 'string' ? parseInt(typeCode, 10) : typeCode
  
  if ([2].includes(numericCode)) return 'commitments'
  if ([3, 4, 7].includes(numericCode)) return 'disbursements'
  if ([5, 6, 8, 9, 11].includes(numericCode)) return 'returns'
  return 'other'
}

/**
 * Transaction type definitions for reference and tooltips
 */
export const TRANSACTION_TYPE_DEFINITIONS = {
  2: 'Outgoing Commitment',
  3: 'Disbursement',
  4: 'Expenditure', 
  5: 'Interest Repayment',
  6: 'Loan Repayment',
  7: 'Reimbursement',
  8: 'Purchase of Equity',
  9: 'Sale of Equity',
  11: 'Credit Guarantee'
} as const

/**
 * Column definitions with descriptions for tooltips
 */
export const TRANSACTION_COLUMNS = {
  commitments: {
    label: 'Commitments',
    description: 'Outgoing Commitments (Type 2)',
    types: [2]
  },
  disbursements: {
    label: 'Disbursements & Spending',
    description: 'Disbursements (Type 3), Expenditures (Type 4), and Reimbursements (Type 7)',
    types: [3, 4, 7]
  },
  returns: {
    label: 'Returns & Financial Instruments',
    description: 'Interest Repayments (Type 5), Loan Repayments (Type 6), Equity transactions (Types 8, 9), and Credit Guarantees (Type 11)',
    types: [5, 6, 8, 9, 11]
  }
} as const

/**
 * Groups transactions by their type category
 */
export function groupTransactionsByType(transactions: any[]): Record<TransactionGroup, any[]> {
  const groups: Record<TransactionGroup, any[]> = {
    commitments: [],
    disbursements: [],
    returns: [],
    other: []
  }

  transactions.forEach(transaction => {
    const group = getTransactionGroup(transaction.transaction_type)
    groups[group].push(transaction)
  })

  return groups
}

/**
 * Calculates totals for each transaction group
 */
export function calculateTransactionGroupTotals(transactions: any[]): Record<TransactionGroup, number> {
  const groups = groupTransactionsByType(transactions)
  
  return {
    commitments: groups.commitments.reduce((sum, t) => sum + (parseFloat(t.value) || 0), 0),
    disbursements: groups.disbursements.reduce((sum, t) => sum + (parseFloat(t.value) || 0), 0),
    returns: groups.returns.reduce((sum, t) => sum + (parseFloat(t.value) || 0), 0),
    other: groups.other.reduce((sum, t) => sum + (parseFloat(t.value) || 0), 0)
  }
}

/**
 * Gets a user-friendly label for a transaction type code
 */
export function getTransactionTypeLabel(typeCode: number | string): string {
  const numericCode = typeof typeCode === 'string' ? parseInt(typeCode, 10) : typeCode
  return TRANSACTION_TYPE_DEFINITIONS[numericCode as keyof typeof TRANSACTION_TYPE_DEFINITIONS] || `Type ${typeCode}`
}