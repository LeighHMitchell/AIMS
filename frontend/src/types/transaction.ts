// IATI Transaction Types
export const TRANSACTION_TYPES = {
  "C": "Commitment",
  "D": "Disbursement",
  "E": "Expenditure",
  "IF": "Incoming Funds",
  "IR": "Interest Repayment",
  "LR": "Loan Repayment",
  "R": "Reimbursement",
  "PE": "Purchase of Equity",
  "SE": "Sale of Equity",
  "G": "Credit Guarantee",
  "IC": "Incoming Commitment"
} as const;

// Transaction type acronyms (for display purposes)
export const TRANSACTION_ACRONYMS = {
  "C": "C",
  "D": "D",
  "E": "E",
  "IF": "IF",
  "IR": "IR",
  "LR": "LR",
  "R": "R",
  "PE": "PE",
  "SE": "SE",
  "G": "G",
  "IC": "IC"
} as const;

// Legacy transaction type mapping (for backward compatibility)
export const LEGACY_TRANSACTION_TYPE_MAP: Record<string, keyof typeof TRANSACTION_TYPES> = {
  "1": "IF",  // Incoming Funds
  "2": "C",   // Outgoing Commitment -> Commitment
  "3": "D",   // Disbursement
  "4": "E",   // Expenditure
  "5": "IR",  // Interest Payment -> Interest Repayment
  "6": "LR",  // Loan Repayment
  "7": "R",   // Reimbursement
  "8": "PE",  // Purchase of Equity
  "9": "SE",  // Sale of Equity
  "10": "G",  // Credit Guarantee
  "11": "IC", // Incoming Commitment
  "12": "C",  // Outgoing Pledge -> Commitment
  "13": "IC"  // Incoming Pledge -> Incoming Commitment
};

// IATI Aid Types (sample)
export const AID_TYPES = {
  "A01": "General budget support",
  "A02": "Sector budget support",
  "B01": "Core support to NGOs, other private bodies, PPPs and research institutes",
  "B02": "Core contributions to multilateral institutions",
  "B03": "Contributions to specific-purpose programmes and funds managed by implementing partners",
  "B04": "Basket funds/pooled funding",
  "C01": "Project-type interventions",
  "D01": "Donor country personnel",
  "D02": "Other technical assistance",
  "E01": "Scholarships/training in donor country",
  "E02": "Imputed student costs",
  "F01": "Debt relief",
  "G01": "Administrative costs not included elsewhere",
  "H01": "Development awareness",
  "H02": "Refugees/asylum seekers in donor countries"
} as const;

// IATI Flow Types
export const FLOW_TYPES = {
  "10": "ODA",
  "20": "OOF (Other Official Flows)",
  "30": "Private Grants",
  "35": "Private Market",
  "36": "Private Foreign Direct Investment",
  "37": "Private Other Flows",
  "40": "Non flow",
  "50": "Other flows"
} as const;

// IATI Tied Status
export const TIED_STATUS = {
  "1": "Tied",
  "2": "Partially tied",
  "3": "Untied",
  "4": "Unknown"
} as const;

// Transaction Status
export const TRANSACTION_STATUS = {
  "draft": "Draft",
  "actual": "Actual"
} as const;

export interface Transaction {
  id: string;
  type: keyof typeof TRANSACTION_TYPES;
  value: number;
  currency: string;
  transactionDate: string;
  providerOrg: string;
  receiverOrg: string;
  status: keyof typeof TRANSACTION_STATUS;
  tiedStatus?: keyof typeof TIED_STATUS;
  narrative?: string;
  activityId: string;
  aidType?: keyof typeof AID_TYPES;
  flowType?: keyof typeof FLOW_TYPES;
  createdAt: string;
  updatedAt: string;
} 