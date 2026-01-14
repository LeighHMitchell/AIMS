// Migration helper for transitioning from old transaction types to IATI-compliant codes (v2.03)

import { TransactionType } from '@/types/transaction';

// Map old letter codes to IATI numeric codes
export const LEGACY_TRANSACTION_TYPE_MAP: Record<string, TransactionType> = {
  'C': '2',   // Commitment -> Outgoing Commitment
  'D': '3',   // Disbursement -> Disbursement
  'E': '4',   // Expenditure -> Expenditure
  'IF': '1',  // Incoming Funds -> Incoming Funds
  'IR': '5',  // Interest Payment (legacy: Interest Repayment)
  'LR': '6',  // Loan Repayment -> Loan Repayment
  'PE': '8',  // Purchase of Equity
  'SE': '9',  // Sale of Equity
  'CG': '10', // Credit Guarantee
  'R': '7',   // Reimbursement -> Reimbursement
  'IC': '11', // Incoming Commitment
  'OP': '12', // Outgoing Pledge
  'IP': '13', // Incoming Pledge
};

// Reverse map for display purposes (IATI Standard v2.03)
export const TRANSACTION_ACRONYMS: Record<TransactionType, string> = {
  '1': 'IF',   // Incoming Funds
  '2': 'C',    // Outgoing Commitment
  '3': 'D',    // Disbursement
  '4': 'E',    // Expenditure
  '5': 'IP',   // Interest Payment
  '6': 'LR',   // Loan Repayment
  '7': 'R',    // Reimbursement
  '8': 'PE',   // Purchase of Equity
  '9': 'SE',   // Sale of Equity
  '10': 'CG',  // Credit Guarantee
  '11': 'IC',  // Incoming Commitment
  '12': 'OP',  // Outgoing Pledge
  '13': 'IP',  // Incoming Pledge
};

// Transaction type labels (IATI Standard v2.03)
export const TRANSACTION_TYPES = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Payment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '10': 'Credit Guarantee',
  '11': 'Incoming Commitment',
  '12': 'Outgoing Pledge',
  '13': 'Incoming Pledge'
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