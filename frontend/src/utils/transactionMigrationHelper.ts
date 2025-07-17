// Migration helper for transitioning from old transaction types to IATI-compliant codes

import { TransactionType } from '@/types/transaction';

// Map old letter codes to IATI numeric codes
export const LEGACY_TRANSACTION_TYPE_MAP: Record<string, TransactionType> = {
  'C': '2',  // Commitment -> Outgoing Commitment
  'D': '3',  // Disbursement -> Disbursement  
  'E': '4',  // Expenditure -> Expenditure
  'IF': '12', // Incoming Funds -> Incoming Funds
  'IR': '5',  // Interest Repayment -> Interest Repayment
  'LR': '6',  // Loan Repayment -> Loan Repayment
  'QP': '8',  // Purchase of Equity
  'QS': '9',  // Sale of Equity
  'CG': '11', // Credit Guarantee
  'R': '7',   // Reimbursement -> Reimbursement
};

// Reverse map for display purposes
export const TRANSACTION_ACRONYMS: Record<TransactionType, string> = {
  '1': 'IC',   // Incoming Commitment
  '2': 'C',    // Outgoing Commitment
  '3': 'D',    // Disbursement
  '4': 'E',    // Expenditure
  '5': 'IR',   // Interest Repayment
  '6': 'LR',   // Loan Repayment
  '7': 'R',    // Reimbursement
  '8': 'QP',   // Purchase of Equity
  '9': 'QS',   // Sale of Equity
  '11': 'CG',  // Credit Guarantee
  '12': 'IF',  // Incoming Funds
  '13': 'CC',  // Commitment Cancellation
};

// Old constants for backward compatibility
export const TRANSACTION_TYPES = {
  '1': 'Incoming Commitment',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Repayment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '11': 'Credit Guarantee',
  '12': 'Incoming Funds',
  '13': 'Commitment Cancellation'
};

export const TRANSACTION_STATUS = {
  draft: 'Draft',
  submitted: 'Submitted',
  validated: 'Validated',
  rejected: 'Rejected',
  published: 'Published',
  actual: 'Actual'
};

export const TIED_STATUS = {
  '3': 'Partially tied',
  '4': 'Tied',
  '5': 'Untied'
};

export const AID_TYPES = {
  'A01': 'General budget support',
  'A02': 'Sector budget support',
  'B01': 'Core support to NGOs',
  'B02': 'Core contributions to multilateral institutions',
  'B03': 'Contributions to pooled programmes and funds',
  'B04': 'Basket funds/pooled funding',
  'C01': 'Project-type interventions',
  'D01': 'Donor country personnel',
  'D02': 'Other technical assistance',
  'E01': 'Scholarships/training in donor country',
  'E02': 'Imputed student costs',
  'F01': 'Debt relief',
  'G01': 'Administrative costs not included elsewhere',
  'H01': 'Development awareness',
  'H02': 'Refugees in donor countries'
};

export const FLOW_TYPES = {
  '10': 'ODA',
  '20': 'OOF',
  '21': 'Non-export credit OOF',
  '22': 'Officially supported export credits',
  '30': 'Private grants',
  '35': 'Private market',
  '36': 'Private Foreign Direct Investment',
  '37': 'Other private flows at market terms',
  '40': 'Non flow',
  '50': 'Other flows'
}; 